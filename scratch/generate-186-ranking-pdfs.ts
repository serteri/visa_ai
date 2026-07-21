import { writeFile } from "node:fs/promises";
import { runReadinessEngine } from "@/src/lib/readiness-engine";
import { generateReadinessPDF } from "@/lib/readiness/generate-pdf";
import type { ReadinessInput } from "@/lib/readiness/types";

async function generate(label: string, filename: string, input: ReadinessInput) {
  const report = runReadinessEngine(input);
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
  await writeFile(`/tmp/claude-0/-home-user-visa-ai/d85c2284-7846-5bad-8abb-f00daa175bf7/scratchpad/${filename}`, pdfBytes);
  console.log(`${label}: wrote ${filename} (${pdfBytes.length} bytes), detectedSubclasses=`, report.detectedSubclasses);
  console.log(
    "rankedPathways:",
    report.rankedPathways?.map((rp) => ({
      subclass: rp.subclass,
      isGateBased: rp.isGateBased,
      isHardIneligible: rp.isHardIneligible,
      qualitativeTier: rp.qualitativeTier,
    }))
  );
}

async function main() {
  // Scenario A: 186 possible (TRT viable), plus 500/482 possible, plus 485
  // (via checkbox+dropdown) also NOT hard-ineligible (age 28, under the 35
  // cap) — isolates the "485 stays out of the new gate-based ranking path"
  // claim from the separate, pre-existing "485 hard-ineligible" sweep.
  await generate("186 possible + 500/482 possible + 485 possible-but-excluded", "test-186-500-482-485-ranking.pdf", {
    locale: "en",
    country: "AU",
    mainGoal: "I'm an international student, my employer also wants to sponsor me permanently via employer nomination",
    currentCountry: "Australia",
    passportCountry: "India",
    age: "28",
    occupation: "Software Engineer",
    englishLevel: "Superior",
    qualificationLevel: "Bachelor's Degree",
    annualSalaryAud: 95000,
    sponsorOrFamily: "Employer sponsor",
    preferredPathway: "186",
    nominationStream: "trt",
    yearsInSponsoredPosition: 3,
    hasGraduateVisaPathwayIntent: true,
  });

  // Scenario B: 186 hard-ineligible via TRT tenure gate (1 year < 2 required)
  // — must show as a red ineligible row, NOT silently dropped, NOT duplicated.
  await generate("186 hard-ineligible (TRT tenure below threshold)", "test-186-ineligible-ranking.pdf", {
    locale: "en",
    country: "AU",
    mainGoal: "Permanent residency via employer nomination",
    currentCountry: "Australia",
    passportCountry: "India",
    age: "38",
    occupation: "Software Engineer",
    englishLevel: "Superior",
    qualificationLevel: "Bachelor's Degree",
    annualSalaryAud: 95000,
    sponsorOrFamily: "Employer sponsor",
    preferredPathway: "186",
    nominationStream: "trt",
    yearsInSponsoredPosition: 1,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
