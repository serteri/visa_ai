import "dotenv/config";

import { chromium, type Page } from "playwright";

import { prisma } from "@/lib/prisma";

type LocaleCase = {
  label: string;
  locale: "en" | "tr" | "zh-Hans";
  occupationQuery: string;
  currentCountry: string;
  passportCountry: string;
  mainGoal: string;
};

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";
function resolveAdminEmail(): string {
  const candidate = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim())
    .find(Boolean);

  if (!candidate) {
    throw new Error("ADMIN_EMAILS is required for submission verification.");
  }

  return candidate;
}

const adminEmail = resolveAdminEmail();

const cases: LocaleCase[] = [
  {
    label: "english",
    locale: "en",
    occupationQuery: "Software Engineer",
    currentCountry: "Turkey",
    passportCountry: "Turkey",
    mainGoal: "Assess my Australia skilled migration readiness as a software engineer.",
  },
  {
    label: "turkish",
    locale: "tr",
    occupationQuery: "Yazılım Mühendisi",
    currentCountry: "Türkiye",
    passportCountry: "Türkiye",
    mainGoal: "Yazılım mühendisi olarak Avustralya nitelikli göç hazırlığımı değerlendirin.",
  },
  {
    label: "chinese",
    locale: "zh-Hans",
    occupationQuery: "软件工程师",
    currentCountry: "中国",
    passportCountry: "中国",
    mainGoal: "请评估我作为软件工程师申请澳大利亚技术移民的准备度。",
  },
];

async function chooseSelectOption(page: Page, triggerSelector: string, optionText: string) {
  await page.locator(triggerSelector).click();
  await page.getByRole("option", { name: optionText, exact: true }).click();
}

async function waitForReport(fullName: string) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const report = await prisma.userReport.findFirst({
      where: { fullName, source: "full_check" },
      orderBy: { createdAt: "desc" },
    });

    if (report) return report;

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Timed out waiting for report row for ${fullName}`);
}

async function runCase(browser: import("playwright").Browser, testCase: LocaleCase) {
  const page = await browser.newPage();
  const timestamp = Date.now();
  const fullName = `Locale Smoke ${testCase.label} ${timestamp}`;

  await page.goto(`${BASE_URL}/${testCase.locale}/full-check`, { waitUntil: "networkidle" });

  await page.fill("#waitlist-full-name", fullName);
  await page.fill("#waitlist-email", adminEmail);
  await page.fill("#waitlist-current-country", testCase.currentCountry);
  await page.fill("#waitlist-main-goal", testCase.mainGoal);
  await page.fill("#waitlist-passport-country", testCase.passportCountry);
  await page.fill("#waitlist-age", "31");
  await page.fill("#waitlist-occupation", testCase.occupationQuery);
  await page.locator("li", { hasText: "261313" }).first().click();

  const hiddenOccupationValue = await page.locator('input[name="occupation"]').inputValue();

  await chooseSelectOption(
    page,
    "#waitlist-english",
    testCase.locale === "tr"
      ? "Superior (örn. IELTS 8.0, PTE 79)"
      : testCase.locale === "zh-Hans"
        ? "Superior（如 IELTS 8.0，PTE 79）"
        : "Superior (e.g., IELTS 8.0, PTE 79)"
  );
  await chooseSelectOption(
    page,
    "#waitlist-education",
    testCase.locale === "tr"
      ? "Lisans Derecesi"
      : testCase.locale === "zh-Hans"
        ? "学士学位"
        : "Bachelor's Degree"
  );
  await chooseSelectOption(
    page,
    "#waitlist-sponsor",
    testCase.locale === "tr"
      ? "Bekar / Bağımlı Yok"
      : testCase.locale === "zh-Hans"
        ? "单身 / 无受养人"
        : "Single / No Dependants"
  );
  await page.fill("#waitlist-salary-aud", "120000");
  await page.fill("#waitlist-offshore-experience-years", "6");
  await page.fill("#waitlist-onshore-experience-years", "0");
  await page.check('input[type="checkbox"]');

  await page.getByRole("button", { name: /report|rapor|报告/i }).click();
  await page.waitForTimeout(2500);

  const errorBanners = await page.locator("p.rounded-md.border.border-red-200").allTextContents();
  const fieldErrors = await page.locator("p.text-xs.text-red-600").allTextContents();

  if (errorBanners.length > 0 || fieldErrors.length > 0) {
    await page.close();
    return {
      label: testCase.label,
      locale: testCase.locale,
      selectedDisplay: testCase.occupationQuery,
      submittedOccupationValue: hiddenOccupationValue,
      validationErrors: [...errorBanners, ...fieldErrors].filter(Boolean),
    };
  }

  const successCopy = page.getByText(/Quick results are ready|Hızlı sonuçlar hazır|快速结果已生成/i);
  const hasSuccessCopy = await successCopy.isVisible().catch(() => false);

  if (!hasSuccessCopy) {
    const bodyText = await page.locator("body").innerText();
    await page.close();
    return {
      label: testCase.label,
      locale: testCase.locale,
      selectedDisplay: testCase.occupationQuery,
      submittedOccupationValue: hiddenOccupationValue,
      validationErrors: [bodyText.slice(0, 1500)],
    };
  }

  const reportRow = await waitForReport(fullName);
  const reportJson = reportRow.reportJson as Record<string, unknown>;
  const inputJson = reportRow.inputJson as Record<string, unknown>;
  const assessmentState = (reportJson.assessmentState ?? {}) as Record<string, unknown>;

  await page.close();

  return {
    label: testCase.label,
    locale: testCase.locale,
    selectedDisplay: testCase.occupationQuery,
    submittedOccupationValue: hiddenOccupationValue,
    storedInputOccupation: inputJson.occupation,
    occupationEligibility: assessmentState.occupationEligibility,
    occupationEligibilityReason: assessmentState.occupationEligibilityReason,
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  try {
    const results = [];
    for (const testCase of cases) {
      results.push(await runCase(browser, testCase));
    }

    console.log(JSON.stringify(results, null, 2));
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});