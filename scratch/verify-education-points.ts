import { PDFParse } from "pdf-parse";

import { generateReadinessPDF } from "@/lib/readiness/generate-pdf";
import type { ReadinessInput } from "@/lib/readiness/types";
import { runReadinessEngine } from "@/src/lib/readiness-engine";

function print(label: string, value: unknown) {
  console.log(label, JSON.stringify(value, null, 2));
}

function makeBaseInput(): ReadinessInput {
  return {
    locale: "en",
    country: "AU",
    mainGoal: "Skilled migration to Australia",
    currentCountry: "Turkey",
    passportCountry: "Turkey",
    age: "30",
    occupation: "Software Engineer",
    englishLevel: "competent",
    occupationConfirmed: "yes",
    annualSalaryAud: 85000,
    sponsorOrFamily: "Single / No Dependants",
  };
}

async function extractPdfText(reportInput: ReadinessInput) {
  const report = runReadinessEngine(reportInput);
  const pdfBytes = await generateReadinessPDF({
    report,
    locale: "en",
    saveToFile: false,
    userInputSummary: {
      name: "Test User",
      email: "test@example.com",
      occupation: reportInput.occupation,
      age: reportInput.age,
      currentCountry: reportInput.currentCountry,
      passportCountry: reportInput.passportCountry,
      englishLevel: reportInput.englishLevel,
      mainGoal: reportInput.mainGoal,
      sponsorOrFamily: reportInput.sponsorOrFamily,
    },
  });

  const parser = new PDFParse({ data: pdfBytes });
  try {
    const textResult = await parser.getText();
    return textResult.text;
  } finally {
    await parser.destroy();
  }
}

function summarizeCase(input: ReadinessInput) {
  const report = runReadinessEngine(input);
  return {
    estimatedPoints: report.pointsEstimate?.estimatedPoints,
    breakdown: report.pointsEstimate?.breakdown,
    pointsBoosterCurrentEstimate: report.pointsBoosterSimulator?.currentEstimate,
    pointsBoosterNote: report.pointsBoosterSimulator?.note,
  };
}

async function main() {
  const case1 = summarizeCase({
    ...makeBaseInput(),
    qualificationLevel: "Bachelor's Degree",
    qualificationAwardedInAustralia: false,
  });

  const case2Input: ReadinessInput = {
    ...makeBaseInput(),
    qualificationLevel: "Master's Degree (Research)",
    qualificationAwardedInAustralia: true,
    qualificationRegionalAustralia: false,
    specialistEducationStemResponse: "yes",
  };
  const case2 = summarizeCase(case2Input);

  const case3 = summarizeCase({
    ...makeBaseInput(),
    qualificationLevel: "Master's Degree (Research)",
    qualificationAwardedInAustralia: true,
    qualificationRegionalAustralia: false,
    specialistEducationStemResponse: "not_sure",
  });

  const case4Input: ReadinessInput = {
    ...makeBaseInput(),
    qualificationLevel: "PhD/Doctorate",
    qualificationAwardedInAustralia: true,
    qualificationRegionalAustralia: true,
  };
  const case4 = summarizeCase(case4Input);

  const pdfText = await extractPdfText(case4Input);
  const pdfTextNormalized = pdfText.replace(/\s+/g, " ");
  const pdfHasAustralianOriginDisclaimer =
    pdfTextNormalized.includes("substantive visa or Bridging A/B visa") &&
    pdfTextNormalized.includes("designated regional campus rather than by distance education");

  print("CASE_1", case1);
  print("CASE_2", case2);
  print("CASE_3", case3);
  print("CASE_4", {
    ...case4,
    specialistQuestionShouldRender: true,
    pdfHasAustralianOriginDisclaimer,
    pdfDisclaimerExcerptStart: pdfText.includes("Australian-origin points note")
      ? pdfText.slice(pdfText.indexOf("Australian-origin points note"), pdfText.indexOf("Australian-origin points note") + 420)
      : null,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});