import { runReadinessEngine } from "@/src/lib/readiness-engine";
import { generateReadinessPDF } from "@/lib/readiness/generate-pdf";
import { writeFile } from "node:fs/promises";
import path from "node:path";

async function run() {
  const report = runReadinessEngine({
    locale: "zh-Hans",
    mainGoal: "提升技术移民竞争力并尽快递交",
    currentCountry: "澳大利亚",
    passportCountry: "中国",
    age: "31",
    occupation: "软件工程师（261313）",
    englishLevel: "高级英语",
    englishTestTaken: "yes",
    occupationConfirmed: "yes",
    estimatedBudgetRange: "15000-25000 澳元",
    timeline: "0-6",
    sponsorOrFamily: "已婚",
    preferredPathway: "190",
    biggestConcern: "邀请竞争力",
    offshoreExperienceYears: 5,
    onshoreExperienceYears: 1,
    regionalWilling: true,
  });

  const pdfBytes = await generateReadinessPDF({
    report,
    locale: "zh-Hans",
    saveToFile: false,
    userInputSummary: {
      name: "Wei Chen",
      email: "wei.chen@example.com",
      mainGoal: "提升技术移民竞争力并尽快递交",
      currentCountry: "澳大利亚",
      passportCountry: "中国",
      age: "31",
      occupation: "软件工程师（261313）",
      englishLevel: "高级英语",
      sponsorOrFamily: "已婚",
      biggestConcern: "邀请竞争力",
    },
  });
  const outputPath = path.join(process.cwd(), "wei-chen-zh-full-readiness-report.pdf");
  await writeFile(outputPath, pdfBytes);

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
        outputPath,
      },
      null,
      2
    )
  );

  if (pdfBytes.byteLength < 1000) {
    throw new Error("PDF output is unexpectedly small.");
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
