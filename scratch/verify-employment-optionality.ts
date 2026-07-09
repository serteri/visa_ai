import { PDFParse } from "pdf-parse";

import { generateReadinessPDF } from "@/lib/readiness/generate-pdf";
import type { ReadinessInput } from "@/lib/readiness/types";
import { runReadinessEngine } from "@/src/lib/readiness-engine";

function print(label: string, value: unknown) {
  console.log(label, JSON.stringify(value, null, 2));
}

function buildBaseInput(): ReadinessInput {
  return {
    locale: "en",
    country: "AU",
    mainGoal: "Skilled migration to Australia",
    currentCountry: "Turkey",
    passportCountry: "Turkey",
    age: "36",
    occupation: "Software Engineer",
    englishLevel: "competent",
    qualificationLevel: "Bachelor's Degree",
    occupationConfirmed: "yes",
    sponsorOrFamily: "Single / No Dependants",
    annualSalaryAud: 85000,
  };
}

async function extractPdfText(input: ReadinessInput) {
  const report = runReadinessEngine(input);
  const pdfBytes = await generateReadinessPDF({
    report,
    locale: "en",
    saveToFile: false,
    userInputSummary: {
      name: "Test User",
      email: "test@example.com",
      mainGoal: input.mainGoal,
      currentCountry: input.currentCountry,
      passportCountry: input.passportCountry,
      age: input.age,
      occupation: input.occupation,
      englishLevel: input.englishLevel,
      sponsorOrFamily: input.sponsorOrFamily,
    },
  });

  const parser = new PDFParse({ data: pdfBytes });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

function summarizeReport(input: ReadinessInput) {
  const report = runReadinessEngine(input);
  const checklistBlocked = report.lodgementReadyChecklist?.items.find((item) => item.priority === "blocked");
  const employmentEvidenceItem = report.evidenceReadiness.find((item) => item.category.includes("Employment experience signal"));
  const ineligibleReasons = report.pathwayComparison
    .filter((pathway) => pathway.relevance === "ineligible")
    .map((pathway) => ({ subclass: pathway.subclass, reason: pathway.reason }));

  return {
    estimatedPoints: report.pointsEstimate?.estimatedPoints,
    assessmentState: report.assessmentState,
    employmentDataProvided: report.assessmentState.employmentDataProvided,
    employmentDataConfirmed: report.assessmentState.employmentDataConfirmed,
    ineligibleReasons,
    stateTrackerBlockedReason: report.stateNominationTracker?.blockedReason,
    checklistBlockedDetail: checklistBlocked?.detail,
    pointsBoosterNote: report.pointsBoosterSimulator?.note,
    employmentEvidenceCaveat: employmentEvidenceItem?.explanation,
  };
}

function containsEmploymentCaveat(text: string): boolean {
  const normalized = text.replace(/\s+/g, " ");
  return (
    normalized.includes("Employment experience not provided") ||
    normalized.includes("Australian employment experience not provided") ||
    normalized.includes("Overseas employment experience not provided")
  );
}

function getEmploymentCaveatExcerpt(text: string): string | null {
  const marker = [
    "Employment experience not provided",
    "Australian employment experience not provided",
    "Overseas employment experience not provided",
  ].find((item) => text.includes(item));
  if (!marker) return null;
  const start = text.indexOf(marker);
  return text.slice(start, start + 420);
}

async function main() {
  const case1Input = buildBaseInput();
  const case2Input: ReadinessInput = {
    ...buildBaseInput(),
    offshoreExperienceYears: 8,
  };
  const case3Input: ReadinessInput = {
    ...buildBaseInput(),
    offshoreExperienceYears: 8,
    onshoreExperienceYears: 8,
  };

  const case1 = summarizeReport(case1Input);
  const case2 = summarizeReport(case2Input);
  const case3 = summarizeReport(case3Input);

  const case1Pdf = await extractPdfText(case1Input);
  const case2Pdf = await extractPdfText(case2Input);
  const case3Pdf = await extractPdfText(case3Input);

  print("CASE_1", {
    ...case1,
    pdfHasEmploymentCaveat: containsEmploymentCaveat(case1Pdf),
    pdfCaveatExcerpt: getEmploymentCaveatExcerpt(case1Pdf),
  });

  print("CASE_2", {
    ...case2,
    pdfHasEmploymentCaveat: containsEmploymentCaveat(case2Pdf),
    pdfCaveatExcerpt: getEmploymentCaveatExcerpt(case2Pdf),
  });

  print("CASE_3", {
    ...case3,
    pdfHasEmploymentCaveat: containsEmploymentCaveat(case3Pdf),
    pdfCaveatExcerpt: getEmploymentCaveatExcerpt(case3Pdf),
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});