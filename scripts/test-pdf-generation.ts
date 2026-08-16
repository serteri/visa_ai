/**
 * One-off verification script for the recent state-nomination rules /
 * occupation-mapping / [object Object] fixes. Runs one realistic,
 * below-threshold AU profile through the real production pipeline
 * (runReadinessEngine + getStateIntelligenceMap/getStateOccupationMatches,
 * same as app/[locale]/(main)/full-check/actions.ts) and writes the PDF to
 * test-output.pdf in the project root for manual inspection.
 *
 * Test profile: Serter, 36 (Age band -> 25 pts), Software Engineer
 * (ANZSCO 261313), Proficient English (10 pts), currently in Turkey
 * (offshore), Turkish passport. No other point-earning fields set
 * (experience/qualification/partner/regional bonuses all omitted) so the
 * total lands at the expected 25 + 10 = 35 points, below the ~65-80
 * competitive thresholds used across state minimumPoints -- this is
 * specifically to exercise state-nomination rule 2 (on-list-but-under-
 * points) for whichever states have Software Engineer on their synced
 * occupation list, and rule 1 (not-on-list) for the ones that don't.
 *
 * Usage: npx tsx scripts/test-pdf-generation.ts
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";

import { generateReadinessPDF } from "../lib/readiness/generate-pdf";
import type { ReadinessInput } from "../lib/readiness/types";
import { runReadinessEngine } from "../src/lib/readiness-engine";
import { getStateIntelligenceMap, getStateOccupationMatches } from "../lib/state-intelligence";
import { prisma } from "../lib/prisma";

const testInput: ReadinessInput = {
  locale: "en",
  country: "AU",
  mainGoal: "Skilled migration through 189, 190 or 491 with a competitive points profile",
  currentCountry: "Turkey",
  passportCountry: "Turkey",
  age: "36",
  occupation: "Software Engineer 261313",
  occupationConfirmed: "yes",
  englishLevel: "proficient",
  englishTestTaken: "yes",
  preferredPathway: "190",
  migrationGoals: ["direct_pr"],
};

async function main() {
  const [stateIntelligence, stateOccupationMatches] = await Promise.all([
    getStateIntelligenceMap(),
    getStateOccupationMatches(testInput.occupation),
  ]);

  const report = runReadinessEngine({ ...testInput, stateIntelligence, stateOccupationMatches });

  console.log("Estimated points:", report.assessmentState.estimatedPoints);
  console.log("Occupation eligibility:", report.assessmentState.occupationEligibility);
  console.log("\nState Nomination Tracker:");
  if (report.stateNominationTracker?.eligibilityBlocked) {
    console.log("  BLOCKED:", report.stateNominationTracker.blockedReason);
  } else {
    for (const state of report.stateNominationTracker?.states ?? []) {
      console.log(`  ${state.code} (${state.status}) score=${state.score} matchLevel=${state.matchLevel}`);
      console.log(`    note: ${state.requirements[0] ?? state.summary}`);
    }
  }

  const pdfBytes = await generateReadinessPDF({
    report,
    locale: "en",
    saveToFile: false,
    userInputSummary: {
      name: "Serter",
      email: "qa@example.com",
      mainGoal: testInput.mainGoal,
      currentCountry: testInput.currentCountry,
      passportCountry: testInput.passportCountry,
      age: testInput.age,
      occupation: testInput.occupation,
      englishLevel: testInput.englishLevel,
    },
  });

  const outputPath = path.join(process.cwd(), "test-output.pdf");
  await writeFile(outputPath, Buffer.from(pdfBytes));
  console.log(`\nPDF written: ${outputPath} (${pdfBytes.byteLength} bytes)`);
}

main()
  .catch((err) => {
    console.error("test-pdf-generation crashed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
