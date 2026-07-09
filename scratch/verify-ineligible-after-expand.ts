import { runReadinessEngine } from "@/src/lib/readiness-engine";
import { generateReadinessPDF } from "@/lib/readiness/generate-pdf";
import { PDFParse } from "pdf-parse";

async function main() {
  const input = {
    locale: "en" as const,
    country: "AU" as const,
    currentCountry: "Australia",
    age: "30",
    occupation: "Member of Parliament",
    englishLevel: "Proficient",
    qualificationLevel: "Bachelor's Degree" as const,
    offshoreExperienceYears: 3,
    onshoreExperienceYears: 1,
    timeline: "6-12 months",
  };

  const report = runReadinessEngine(input);

  console.log("occupationEligibility", report.assessmentState?.occupationEligibility);
  console.log("canShowNumericRanking", report.assessmentState?.canShowNumericRanking);
  console.log("detectedSubclasses", JSON.stringify(report.detectedSubclasses));
  console.log("pathwayComparison", JSON.stringify(report.pathwayComparison));
  console.log("rankedPathways", JSON.stringify(report.rankedPathways));

  const pdfBytes = await generateReadinessPDF({
    report,
    locale: "en",
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

  const hasIneligiblePhrase = text.text.includes(
    "does not appear to be on the relevant skilled occupation list"
  );
  const hasUnverifiedPhrase = text.text.includes(
    "could not verify this occupation against our occupation database"
  );

  console.log("pdf_has_ineligible_phrase", hasIneligiblePhrase);
  console.log("pdf_has_unverified_phrase", hasUnverifiedPhrase);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
