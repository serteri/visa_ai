import { PDFParse } from "pdf-parse";

import { generateReadinessPDF } from "@/lib/readiness/generate-pdf";
import { runReadinessEngine } from "@/src/lib/readiness-engine";

type LocaleCase = {
  label: string;
  locale: "en" | "tr" | "zh-Hans";
  currentCountry: string;
  passportCountry: string;
  occupation: string;
  mainGoal: string;
  expectedFoundation: string;
};

const cases: LocaleCase[] = [
  {
    label: "english",
    locale: "en",
    currentCountry: "Turkey",
    passportCountry: "Turkey",
    occupation: "Software Engineer",
    mainGoal: "Skilled migration to Australia",
    expectedFoundation: "Profile Foundation & English",
  },
  {
    label: "turkish",
    locale: "tr",
    currentCountry: "Türkiye",
    passportCountry: "Türkiye",
    occupation: "Yazılım Mühendisi",
    mainGoal: "Avustralya'ya nitelikli göç",
    expectedFoundation: "Profil Temeli ve Dil",
  },
  {
    label: "chinese",
    locale: "zh-Hans",
    currentCountry: "中国",
    passportCountry: "中国",
    occupation: "软件工程师",
    mainGoal: "澳大利亚技术移民",
    expectedFoundation: "档案基础与英语",
  },
];

async function extractText(pdfBytes: Uint8Array): Promise<string> {
  const parser = new PDFParse({ data: Buffer.from(pdfBytes) });
  const text = await parser.getText();
  await parser.destroy();
  return text.text;
}

async function main() {
  const results = [];

  for (const testCase of cases) {
    const report = runReadinessEngine({
      locale: testCase.locale,
      country: "AU",
      mainGoal: testCase.mainGoal,
      currentCountry: testCase.currentCountry,
      passportCountry: testCase.passportCountry,
      age: "31",
      occupation: testCase.occupation,
      englishLevel: "superior",
      qualificationLevel: "Bachelor's Degree",
      annualSalaryAud: 120000,
      sponsorOrFamily: "single",
      timeline: "12+ months",
    });

    const pdfBytes = await generateReadinessPDF({
      report,
      locale: testCase.locale,
      userInputSummary: {
        occupation: testCase.occupation,
        age: "31",
        englishLevel: "superior",
        currentCountry: testCase.currentCountry,
      },
    });

    const text = await extractText(pdfBytes);
    const lower = text.toLowerCase();

    results.push({
      label: testCase.label,
      locale: testCase.locale,
      occupationEligibility: report.assessmentState?.occupationEligibility,
      probes: {
        hasExpectedFoundation: text.includes(testCase.expectedFoundation),
        hasEnglishReferenceLeak: testCase.locale === "en" ? text.includes("Reference data only") : text.includes("Reference data only"),
        hasEnglishGanttLeak: testCase.locale === "en" ? text.includes("Profile Foundation & English") : text.includes("Profile Foundation & English"),
        hasEnglishHistoryLeak: testCase.locale === "en" ? text.includes("Historical Invitation Trends") : text.includes("Historical Invitation Trends"),
      },
      asciiTokenHits:
        testCase.locale === "tr"
          ? ["goc", "danisin", "teskil", "yazilim", "mihendisi", "degerlendirme", "ingilizce"].filter((token) => lower.includes(token))
          : [],
    });
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});