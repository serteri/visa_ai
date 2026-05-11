import { writeFile } from "node:fs/promises";
import path from "node:path";

import { generateReadinessPDF } from "@/lib/readiness/generate-pdf";
import type { Locale, ReadinessInput, ReadinessReport } from "@/lib/readiness/types";
import { runReadinessEngine } from "@/src/lib/readiness-engine";

const locales: Locale[] = ["en", "tr", "zh-Hans"];

const localeInputs: Record<Locale, ReadinessInput> = {
  en: {
    locale: "en",
    mainGoal: "Skilled migration through 189, 190 or 491 with a competitive points profile",
    currentCountry: "Australia",
    passportCountry: "Turkey",
    age: "30",
    occupation: "Software Engineer 261313",
    englishLevel: "PTE 79+ Superior English",
    englishTestTaken: "yes",
    occupationConfirmed: "yes",
    estimatedBudgetRange: "15000-25000",
    timeline: "0-6 months",
    sponsorOrFamily: "No employer sponsor, open to regional nomination",
    preferredPathway: "190",
    biggestConcern: "State nomination competitiveness",
    qualificationLevel: "Bachelor",
    offshoreExperienceYears: 5,
    onshoreExperienceYears: 1,
    regionalWilling: true,
    educationRelevance: "relevant",
  },
  tr: {
    locale: "tr",
    mainGoal: "189, 190 veya 491 uzerinden guclu puan profiliyle nitelikli goc",
    currentCountry: "Avustralya",
    passportCountry: "Turkiye",
    age: "30",
    occupation: "Software Engineer 261313",
    englishLevel: "PTE 79+ Superior English",
    englishTestTaken: "yes",
    occupationConfirmed: "yes",
    estimatedBudgetRange: "15000-25000",
    timeline: "0-6 months",
    sponsorOrFamily: "Isveren sponsoru yok, regional nomination uygun",
    preferredPathway: "190",
    biggestConcern: "Eyalet adayligi rekabeti",
    qualificationLevel: "Bachelor",
    offshoreExperienceYears: 5,
    onshoreExperienceYears: 1,
    regionalWilling: true,
    educationRelevance: "relevant",
  },
  "zh-Hans": {
    locale: "zh-Hans",
    mainGoal: "通过 189、190 或 491 技术移民路径，以有竞争力的分数递交",
    currentCountry: "澳大利亚",
    passportCountry: "土耳其",
    age: "30",
    occupation: "Software Engineer 261313",
    englishLevel: "PTE 79+ Superior English",
    englishTestTaken: "yes",
    occupationConfirmed: "yes",
    estimatedBudgetRange: "15000-25000",
    timeline: "0-6 months",
    sponsorOrFamily: "无雇主担保，愿意考虑偏远地区州担保",
    preferredPathway: "190",
    biggestConcern: "州担保竞争力",
    qualificationLevel: "Bachelor",
    offshoreExperienceYears: 5,
    onshoreExperienceYears: 1,
    regionalWilling: true,
    educationRelevance: "relevant",
  },
};

const outputNames: Record<Locale, string> = {
  en: "test-output-en.pdf",
  tr: "test-output-tr.pdf",
  "zh-Hans": "test-output-zh.pdf",
};

function reportVisibleText(report: ReadinessReport): string {
  return [
    ...report.executiveSummary,
    report.signalSnapshot.strongest,
    ...report.signalSnapshot.secondary,
    report.primaryLimitingFactor.label,
    report.primaryLimitingFactor.explanation,
    report.confidenceExplanation,
    ...report.documentChecklist.flatMap((category) => [category.category, ...category.items]),
    ...(report.lodgementReadyChecklist?.items.flatMap((item) => [item.title, item.detail]) ?? []),
  ].join("\n");
}

function phrase(locale: Locale, en: string, tr: string, zh: string): string {
  if (locale === "tr") return tr;
  if (locale === "zh-Hans") return zh;
  return en;
}

function applyMockPoints(report: ReadinessReport, locale: Locale, points: number): ReadinessReport {
  const updated = { ...report };
  updated.pointsEstimate = report.pointsEstimate
    ? {
        ...report.pointsEstimate,
        estimatedPoints: points,
        note: phrase(
          locale,
          `Mock QA profile normalized to an ${points}-point skilled migration signal.`,
          `QA test profili ${points} puanlik nitelikli goc sinyaline sabitlendi.`,
          `QA 测试档案已标准化为 ${points} 分技术移民信号。`
        ),
      }
    : undefined;

  if (updated.pointsBoosterSimulator) {
    updated.pointsBoosterSimulator = {
      ...updated.pointsBoosterSimulator,
      currentEstimate: points,
    };
  }

  updated.executiveSummary = [
    phrase(
      locale,
      "This report compares 189, 190 and 491 in one view, with a high-potential skilled migration score profile.",
      "Bu rapor 189, 190 ve 491 yollarini tek gorunumde, yuksek potansiyelli nitelikli goc puan profiliyle karsilastirir.",
      "本报告在同一视图中比较 189、190 和 491，并使用高潜力技术移民分数档案。"
    ),
    phrase(
      locale,
      `The current points signal is ${points}; this supports a stronger relative position for points-tested pathways.`,
      `Mevcut puan sinyali ${points}; bu, puan testli yollar icin daha guclu bir goreli konumu destekler.`,
      `当前加分信号为 ${points}；这支持打分制路径中更强的相对位置。`
    ),
    phrase(
      locale,
      "Skills assessment, nomination context, sponsorship details, and evidence preparation can materially change the pathway strength comparison.",
      "Beceri degerlendirmesi, adaylik baglami, sponsor bilgisi ve belge hazirligi yol gucu karsilastirmasini onemli olcude degistirebilir.",
      "职业评估、州担保背景、担保信息与材料准备度等细节，可能明显改变路径强度比较。"
    ),
  ];

  updated.primaryLimitingFactor = {
    ...updated.primaryLimitingFactor,
    label: phrase(
      locale,
      "State nomination and evidence packaging",
      "Eyalet adayligi ve belge paketi",
      "州担保与材料组合"
    ),
    explanation: phrase(
      locale,
      `The ${points}-point profile is competitive, so the main variable is how state signals and lodgement-ready evidence are packaged.`,
      `${points} puanlik profil rekabetcidir; ana degisken eyalet sinyalleri ve lodgement-ready belge paketinin nasil hazirlandigidir.`,
      `${points} 分档案具备竞争力，因此主要变量是州担保信号与可递交材料如何组合。`
    ),
  };

  updated.confidenceExplanation = phrase(
    locale,
    `Confidence is stronger because the mock QA profile includes age, Superior English, Software Engineer 261313, and an ${points}-point signal. This is general information only.`,
    `Guven daha gucludur; QA profili yas, Superior English, Software Engineer 261313 ve ${points} puan sinyali icerir. Bu yalnizca genel bilgidir.`,
    `置信度较强，因为 QA 档案包含年龄、高英语分、Software Engineer 261313 以及 ${points} 分信号。本内容仅为一般信息。`
  );

  return updated;
}

function assertLanguageIsolation(locale: Locale, text: string) {
  const commonForbidden = [
    /partial points signal/i,
    /Internal signal/i,
    /partial points picture/i,
  ];

  const localeForbidden: Record<Locale, RegExp[]> = {
    en: [/[\u4e00-\u9fff]/, /[ğıİşŞçÇöÖüÜ]/],
    tr: [/[\u4e00-\u9fff]/, /The current points signal/i, /Confidence is/i, /State nomination signals visualized/i],
    "zh-Hans": [/G[uü]ven/i, /Birincil/i, /Kismi|Kısmi/i, /Confidence is/i, /This report compares/i],
  };

  const failed = [...commonForbidden, ...localeForbidden[locale]].find((pattern) => pattern.test(text));
  if (failed) {
    throw new Error(`Language isolation failed for ${locale}: matched ${failed}`);
  }
}

function printReport(locale: Locale, report: ReadinessReport, pdfPath: string, pdfBytes: Uint8Array) {
  const stateScores = report.stateNominationTracker?.states
    .map((state) => `${state.code} ${state.score}%`)
    .join(", ");

  console.log(`\n=== ${locale} WEB REPORT TEXT ===`);
  console.log("Executive Summary:");
  report.executiveSummary.forEach((item) => console.log(`- ${item}`));
  console.log(`Signal: ${report.signalSnapshot.strongest}`);
  console.log(`Primary Gap: ${report.primaryLimitingFactor.label}`);
  console.log(`Confidence: ${report.confidenceExplanation}`);
  console.log("Document Checklist Preview:");
  report.documentChecklist.slice(0, 3).forEach((category) => {
    console.log(`- ${category.category}: ${category.items.slice(0, 3).join(" | ")}`);
  });
  console.log(`State Radar Data: ${stateScores}`);
  console.log(`PDF: ${pdfPath} (${pdfBytes.byteLength} bytes)`);
}

async function main() {
  for (const locale of locales) {
    const input = localeInputs[locale];
    const report = applyMockPoints(runReadinessEngine(input), locale, 80);
    const visibleText = reportVisibleText(report);
    assertLanguageIsolation(locale, visibleText);

    const pdfBytes = await generateReadinessPDF({
      report,
      locale,
      saveToFile: false,
      userInputSummary: {
        name: locale === "zh-Hans" ? "Wei Chen" : "Ahmet Yilmaz",
        email: "qa@example.com",
        mainGoal: input.mainGoal,
        currentCountry: input.currentCountry,
        passportCountry: input.passportCountry,
        age: input.age,
        occupation: input.occupation,
        englishLevel: input.englishLevel,
        sponsorOrFamily: input.sponsorOrFamily,
        biggestConcern: input.biggestConcern,
      },
    });

    if (pdfBytes.byteLength < 20_000) {
      throw new Error(`PDF for ${locale} is unexpectedly small: ${pdfBytes.byteLength} bytes`);
    }

    const pdfPath = path.join(process.cwd(), outputNames[locale]);
    await writeFile(pdfPath, Buffer.from(pdfBytes));
    printReport(locale, report, pdfPath, pdfBytes);
  }

  console.log("\nAll locale reports generated and visible text isolation checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
