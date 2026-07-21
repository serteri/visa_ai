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
}

async function main() {
  // Scenario: 485 detected via checkbox intent + explicit dropdown selection,
  // and 482 detected as a possible (non-ineligible) gate-based pathway — both
  // should appear correctly in the Visa Viability Ranking section of the PDF.
  await generate("485 + 482 both possible", "test-485-482-ranking.pdf", {
    locale: "en",
    country: "AU",
    mainGoal: "I'm an international student in Australia, my employer also wants to sponsor me",
    currentCountry: "Australia",
    passportCountry: "India",
    age: "26",
    occupation: "Software Engineer",
    englishLevel: "Superior",
    qualificationLevel: "Bachelor's Degree",
    sponsorOrFamily: "Employer sponsor",
    preferredPathway: "485",
    hasGraduateVisaPathwayIntent: true,
  });

  // Scenario: 482 hard-ineligible (below CSIT) — must NOT show a duplicate
  // gate-based row; must still show the existing red ineligible row.
  await generate("482 hard-ineligible", "test-482-ineligible-ranking.pdf", {
    locale: "en",
    country: "AU",
    mainGoal: "My employer wants to sponsor me",
    currentCountry: "Philippines",
    passportCountry: "Philippines",
    age: "33",
    occupation: "Chef",
    englishLevel: "Competent",
    sponsorOrFamily: "Employer sponsor",
    annualSalaryAud: 55000,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
