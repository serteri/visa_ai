import { runReadinessEngine } from "@/src/lib/readiness-engine";
import { generateReadinessPDF } from "@/lib/readiness/generate-pdf";

function run() {
  const report = runReadinessEngine({
    locale: "zh-Hans",
    mainGoal: "提升技术移民竞争力并尽快递交",
    currentCountry: "Australia",
    passportCountry: "China",
    age: "31",
    occupation: "Software Engineer (261313)",
    englishLevel: "Superior",
    englishTestTaken: "yes",
    occupationConfirmed: "yes",
    estimatedBudgetRange: "15000-25000 AUD",
    timeline: "0-6",
    sponsorOrFamily: "married",
    preferredPathway: "190",
    biggestConcern: "Invitation competitiveness",
    offshoreExperienceYears: 5,
    onshoreExperienceYears: 1,
    regionalWilling: true,
  });

  const pdfBytes = generateReadinessPDF({
    report,
    locale: "zh-Hans",
    saveToFile: false,
    userInputSummary: {
      name: "Wei Chen",
      email: "wei.chen@example.com",
      mainGoal: "提升技术移民竞争力并尽快递交",
      currentCountry: "Australia",
      passportCountry: "China",
      age: "31",
      occupation: "Software Engineer (261313)",
      englishLevel: "Superior",
      sponsorOrFamily: "married",
      biggestConcern: "Invitation competitiveness",
    },
  });

  const frictionLabels = report.frictionAnalysis.map((f) => ({
    pathway: f.pathway,
    score: f.frictionScore,
    realityCheck: f.realityCheck,
  }));

  console.log("=== ZH REPORT SUMMARY ===");
  console.log(
    JSON.stringify(
      {
        candidate: "Wei Chen",
        locale: "zh-Hans",
        quickPathways: report.pathwayComparison.slice(0, 3).map((p) => ({
          subclass: p.subclass,
          confidence: p.confidenceLevel,
        })),
        friction: frictionLabels,
        nextSteps: report.suggestedNextSteps,
        checklistPreview: report.documentChecklist.slice(0, 2),
        pdfBytes: pdfBytes.byteLength,
      },
      null,
      2
    )
  );

  if (pdfBytes.byteLength < 1000) {
    throw new Error("PDF output is unexpectedly small.");
  }
}

run();
