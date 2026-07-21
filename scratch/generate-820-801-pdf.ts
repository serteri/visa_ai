import { writeFile } from "node:fs/promises";
import { runReadinessEngine } from "@/src/lib/readiness-engine";
import { generateReadinessPDF } from "@/lib/readiness/generate-pdf";
import type { ReadinessInput } from "@/lib/readiness/types";

async function main() {
  const input: ReadinessInput = {
    locale: "en",
    country: "AU",
    mainGoal: "My partner is an Australian citizen, we are engaged",
    currentCountry: "Australia",
    passportCountry: "India",
    age: "30",
    occupation: "Accountant",
    englishLevel: "Superior",
    qualificationLevel: "Bachelor's Degree",
    preferredPathway: "820_801",
  };
  const report = runReadinessEngine(input);
  console.log("detectedSubclasses:", report.detectedSubclasses);
  console.log(
    "pathwayComparison:",
    report.pathwayComparison.map((p) => `${p.subclass}: ${p.visaName}`)
  );
  console.log("rankedPathways:", report.rankedPathways);

  const pdfBytes = await generateReadinessPDF({
    report,
    locale: "en",
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
      biggestConcern: input.biggestConcern,
    },
  });
  await writeFile(
    "/tmp/claude-0/-home-user-visa-ai/d85c2284-7846-5bad-8abb-f00daa175bf7/scratchpad/test-820-801-out-of-scope.pdf",
    pdfBytes
  );
  console.log(`wrote PDF (${pdfBytes.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
