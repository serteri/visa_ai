import "dotenv/config";

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { chromium, type BrowserContext, type Download, type Page } from "playwright";
import { PDFParse } from "pdf-parse";

type LocaleCase = {
  label: string;
  locale: "tr" | "zh-Hans";
  occupationQuery: string;
  currentCountry: string;
  passportCountry: string;
  mainGoal: string;
  englishOption: string;
  educationOption: string;
  sponsorOption: string;
  unlockButton: RegExp;
  rankingHeading: string;
  expectedOnScreenSubclasses: string[];
  expectedPdfStrings: string[];
};

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";
const adminEmail = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((value) => value.trim())
  .find(Boolean);

if (!adminEmail) {
  throw new Error("ADMIN_EMAILS is required for premium render verification.");
}

const cases: LocaleCase[] = [
  {
    label: "turkish",
    locale: "tr",
    occupationQuery: "Yazılım Mühendisi",
    currentCountry: "Türkiye",
    passportCountry: "Türkiye",
    mainGoal: "Yazılım mühendisi olarak Avustralya nitelikli göç hazırlığımı değerlendirin.",
    englishOption: "Superior (örn. IELTS 8.0, PTE 79)",
    educationOption: "Lisans Derecesi",
    sponsorOption: "Bekar / Bağımlı Yok",
    unlockButton: /Raporu aç|Unlock report/i,
    rankingHeading: "Vize Sans Siralamasi",
    expectedOnScreenSubclasses: [
      "189 Yetenekli Bagimsiz",
      "190 Eyalet Adaylikli",
      "491 Bolgesel Nitelikli",
    ],
    expectedPdfStrings: [
      "189 Vizesi",
      "190 Vizesi",
      "491 Vizesi",
      "Vize Başvurusu ve İşlem",
    ],
  },
  {
    label: "chinese",
    locale: "zh-Hans",
    occupationQuery: "软件工程师",
    currentCountry: "中国",
    passportCountry: "中国",
    mainGoal: "请评估我作为软件工程师申请澳大利亚技术移民的准备度。",
    englishOption: "Superior（如 IELTS 8.0，PTE 79）",
    educationOption: "学士学位",
    sponsorOption: "单身 / 无受养人",
    unlockButton: /解锁报告|Unlock report/i,
    rankingHeading: "签证可行性排序",
    expectedOnScreenSubclasses: [
      "189 独立技术移民",
      "190 州担保技术移民",
      "491 偏远地区技术移民",
    ],
    expectedPdfStrings: [
      "189 签证",
      "190 签证",
      "491 签证",
      "签证递交与审理",
    ],
  },
];

async function chooseSelectOption(page: Page, triggerSelector: string, optionText: string) {
  await page.locator(triggerSelector).click();
  await page.getByRole("option", { name: optionText, exact: true }).click();
}

async function saveDownload(download: Download, prefix: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), `${prefix}-`));
  const suggested = download.suggestedFilename();
  const target = path.join(dir, suggested);
  await download.saveAs(target);
  return target;
}

async function extractPdfText(filePath: string): Promise<string> {
  const bytes = await fs.readFile(filePath);
  const parser = new PDFParse({ data: Buffer.from(bytes) });
  const text = await parser.getText();
  await parser.destroy();
  return text.text;
}

async function fillCoreForm(page: Page, testCase: LocaleCase, fullName: string) {
  await page.fill("#waitlist-full-name", fullName);
  await page.fill("#waitlist-email", adminEmail!);
  await page.fill("#waitlist-current-country", testCase.currentCountry);
  await page.fill("#waitlist-main-goal", testCase.mainGoal);
  await page.fill("#waitlist-passport-country", testCase.passportCountry);
  await page.fill("#waitlist-age", "31");
  await page.fill("#waitlist-occupation", testCase.occupationQuery);
  await page.locator("li", { hasText: "261313" }).first().click();

  await chooseSelectOption(page, "#waitlist-english", testCase.englishOption);
  await chooseSelectOption(page, "#waitlist-education", testCase.educationOption);
  await chooseSelectOption(page, "#waitlist-sponsor", testCase.sponsorOption);
  await page.fill("#waitlist-salary-aud", "120000");
  await page.fill("#waitlist-offshore-experience-years", "6");
  await page.fill("#waitlist-onshore-experience-years", "0");
  await page.check('input[type="checkbox"]');
}

async function unlockPremium(page: Page, testCase: LocaleCase) {
  await page.getByRole("button", { name: /Unlock Your Full Readiness Report|解锁完整准备度报告/i }).click();
  const modal = page.locator("form", { has: page.locator('input[name="reportId"]') }).last();
  await modal.locator('input[type="checkbox"]').check();
  await modal.getByRole("button", { name: testCase.unlockButton }).click();
}

async function runCase(context: BrowserContext, testCase: LocaleCase) {
  const page = await context.newPage();
  const timestamp = Date.now();
  const fullName = `Premium Render ${testCase.label} ${timestamp}`;

  await page.goto(`${BASE_URL}/${testCase.locale}/full-check`, { waitUntil: "networkidle" });
  await fillCoreForm(page, testCase, fullName);
  await page.getByRole("button", { name: /Generate your FREE readiness report|Ücretsiz hazırlık raporunuzu oluşturun|生成免费准备度报告/i }).click();

  await page.waitForSelector("text=/Quick Pathway Check Result|Quick Pathway Check Sonucu|快速路径评估结果/i", { timeout: 120000 });
  await unlockPremium(page, testCase);

  await page.waitForSelector(`text=${testCase.rankingHeading}`, { timeout: 120000 });
  await page.waitForSelector("text=/Full visa readiness report|Tam vize hazırlık raporu|完整签证准备度报告/i", { timeout: 120000 });

  const bodyText = await page.locator("body").innerText();
  const rankingSnippets = testCase.expectedOnScreenSubclasses.map((label) => ({
    label,
    present: bodyText.includes(label),
  }));

  const preliminaryLeak = /Preliminary signal only|Yalnizca on sinyal|仅初步信号/.test(bodyText);

  const downloadPromise = page.waitForEvent("download", { timeout: 120000 });
  await page.getByRole("button", { name: /Download PDF|PDF indir|下载 PDF/i }).click();
  const download = await downloadPromise;
  const pdfPath = await saveDownload(download, `premium-${testCase.label}`);
  const pdfText = await extractPdfText(pdfPath);

  const pdfChecks = testCase.expectedPdfStrings.map((text) => ({
    text,
    present: pdfText.includes(text),
  }));

  await page.close();

  return {
    label: testCase.label,
    locale: testCase.locale,
    onScreen: {
      rankingHeadingFound: bodyText.includes(testCase.rankingHeading),
      subclasses: rankingSnippets,
      hasPreliminaryLeak: preliminaryLeak,
    },
    pdf: {
      downloadedFile: pdfPath,
      checks: pdfChecks,
    },
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });

  try {
    const results = [];
    for (const testCase of cases) {
      results.push(await runCase(context, testCase));
    }
    console.log(JSON.stringify(results, null, 2));
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});