import { PDFParse } from "pdf-parse";

import { generateReadinessPDF } from "@/lib/readiness/generate-pdf";
import { runReadinessEngine } from "@/src/lib/readiness-engine";

async function main() {
  const input = {
    locale: "tr" as const,
    country: "AU" as const,
    mainGoal: "Avustralya'ya nitelikli göç",
    currentCountry: "Türkiye",
    passportCountry: "Türkiye",
    age: "31",
    occupation: "Yazılım Mühendisi",
    englishLevel: "superior",
    qualificationLevel: "Bachelor's Degree" as const,
    annualSalaryAud: 120000,
    sponsorOrFamily: "single",
    timeline: "12+ months",
  };

  const report = runReadinessEngine(input);

  const pdfBytes = await generateReadinessPDF({
    report,
    locale: "tr",
    userInputSummary: {
      occupation: input.occupation,
      age: input.age,
      englishLevel: input.englishLevel,
      currentCountry: input.currentCountry,
    },
  });

  const parser = new PDFParse({ data: Buffer.from(pdfBytes) });
  const text = await parser.getText();
  await parser.destroy();

  const haystack = text.text;

  const probes = {
    hasEnglishRefOnlyLine: haystack.includes("Reference data only"),
    hasEnglishGanttFoundation: haystack.includes("Profile Foundation & English"),
    hasEnglishGanttSkills: haystack.includes("Skills Validation"),
    hasEnglishHistoricalHeader: haystack.includes("Historical Invitation Trends"),
    hasTurkishGanttFoundation: haystack.includes("Profil Temeli ve İngilizce"),
    hasTurkishHistoricalHeader: haystack.includes("Tarihsel Davet Eğilimleri"),
  };

  const asciiTokenHits = [
    "goc",
    "danisin",
    "teskil",
    "yazilim",
    "mihendisi",
    "degerlendirme",
    "ingilizce",
  ].filter((token) => haystack.toLowerCase().includes(token));

  console.log(JSON.stringify({
    eligibility: report.assessmentState?.occupationEligibility,
    probes,
    asciiTokenHits,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
