import { PDFParse } from "pdf-parse";

import { generateReadinessPDF } from "@/lib/readiness/generate-pdf";
import { runReadinessEngine } from "@/src/lib/readiness-engine";

type ReadinessInput = Parameters<typeof runReadinessEngine>[0];

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let index = 0;
  while (true) {
    const next = haystack.indexOf(needle, index);
    if (next === -1) return count;
    count += 1;
    index = next + needle.length;
  }
}

async function main() {
  const input: ReadinessInput = {
    locale: "en",
    country: "AU",
    mainGoal: "Skilled migration to Australia",
    currentCountry: "Turkey",
    passportCountry: "Turkey",
    age: "36",
    occupation: "Software Engineer",
    englishLevel: "competent",
    qualificationLevel: "Bachelor's Degree",
    annualSalaryAud: 85000,
    sponsorOrFamily: "no",
    occupationConfirmed: "yes",
    offshoreExperienceYears: 0,
    onshoreExperienceYears: 0,
  };

  const report = runReadinessEngine(input);

  console.log("=== assessmentState ===");
  console.log(JSON.stringify(report.assessmentState, null, 2));
  console.log("=== missingInformation ===");
  console.log(JSON.stringify(report.missingInformation, null, 2));
  console.log("=== executiveSummary ===");
  console.log(JSON.stringify(report.executiveSummary, null, 2));
  console.log("=== pathwayComparison (189/190/491 reasons) ===");
  for (const p of report.pathwayComparison) {
    if (["189", "190", "491"].includes(p.subclass)) {
      console.log(p.subclass, "|", p.relevance, "|", p.reason);
    }
  }

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
  let text: string;
  try {
    text = (await parser.getText()).text.replace(/\s+/g, " ");
  } finally {
    await parser.destroy();
  }

  const mathProjection = "Mathematical Projection";
  const totalPoints = "Ineligible: Total Points:";
  const danglingEmploymentRegex = /invitation\.\s*Employment(?!\s+experience)/g;
  const fullShortCaveat = "Employment experience not provided — see Evidence Readiness section for details.";

  console.log("=== TEXT COUNTS ===");
  console.log("Mathematical Projection count:", countOccurrences(text, mathProjection));
  console.log("Ineligible: Total Points count:", countOccurrences(text, totalPoints));
  console.log("Full short caveat count:", countOccurrences(text, fullShortCaveat));

  const danglingMatches = [...text.matchAll(danglingEmploymentRegex)];
  console.log("Dangling 'Employment' truncation matches:", danglingMatches.length);
  for (const m of danglingMatches) {
    const idx = m.index ?? 0;
    console.log("  ...", text.slice(Math.max(0, idx - 80), idx + 40), "...");
  }

  console.log("Contains 'Current country' in missing information:", report.missingInformation?.includes("Current country"));

  require("fs").writeFileSync("scratch/pdf-full-text-repro.txt", text, "utf-8");
  console.log("Full text written to scratch/pdf-full-text-repro.txt");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
