/**
 * Edge-case persona test script: runs three deliberately different mock
 * profiles end-to-end through the real production pipeline --
 * runReadinessEngine (deterministic scoring/eligibility) -> RAG retrieval
 * (retrieveVisaContext/retrieveStateContext) -> generatePremiumStrategy
 * (RAG + LLM structured-output advisory layer) -> generateReadinessPDF --
 * and writes each resulting PDF to temp_tests/ for manual inspection.
 *
 * Personas:
 *   A. Hard-Gate Fail: age 45+, no valid English test -- must be blocked
 *      regardless of any other point sources (see engine.ts's DHA hard
 *      gates and internal-lead-tier.ts's age/English gate).
 *   B. Borderline: mid-career, Competent English, modest experience --
 *      exercises the ~65-point threshold boundary.
 *   C. State Mismatch: strong profile but an occupation/state combination
 *      unlikely to have a clean match (Art Director x NT) -- exercises the
 *      state-nomination/occupation-list "no match" path.
 *
 * Usage: npx tsx scripts/test-personas.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { generateReadinessPDF } from "../lib/readiness/generate-pdf";
import type { ReadinessInput } from "../lib/readiness/types";
import { runReadinessEngine } from "../src/lib/readiness-engine";
import { getStateIntelligenceMap, getStateOccupationMatches } from "../lib/state-intelligence";
import { retrieveVisaContext } from "../lib/ai/retrieve-visa-context";
import { retrieveStateContext } from "../lib/ai/retrieve-state-context";
import { generatePremiumStrategy } from "../lib/ai/generate-premium-strategy";
import { prisma } from "../lib/prisma";

type Persona = {
  id: "A" | "B" | "C";
  label: string;
  input: ReadinessInput;
};

const PERSONAS: Persona[] = [
  {
    id: "A",
    label: "Hard-Gate Fail (45+, no English)",
    input: {
      locale: "en",
      country: "AU",
      mainGoal: "Skilled migration through 189, 190 or 491",
      currentCountry: "India",
      passportCountry: "India",
      age: "50",
      occupation: "Software Engineer 261313",
      occupationConfirmed: "yes",
      englishLevel: "none",
      preferredState: "VIC",
      preferredPathway: "190",
      migrationGoals: ["direct_pr"],
    },
  },
  {
    id: "B",
    label: "Borderline (~65 points)",
    input: {
      locale: "en",
      country: "AU",
      mainGoal: "Skilled migration through 189, 190 or 491",
      currentCountry: "Philippines",
      passportCountry: "Philippines",
      age: "36",
      occupation: "Registered Nurse 254411",
      occupationConfirmed: "yes",
      englishLevel: "competent",
      offshoreExperienceYears: 2,
      onshoreExperienceYears: 1,
      preferredState: "QLD",
      preferredPathway: "190",
      migrationGoals: ["direct_pr"],
    },
  },
  {
    id: "C",
    label: "State Mismatch (Art Director x NT)",
    input: {
      locale: "en",
      country: "AU",
      mainGoal: "Skilled migration through 189, 190 or 491",
      currentCountry: "United Kingdom",
      passportCountry: "United Kingdom",
      age: "28",
      occupation: "Art Director",
      occupationConfirmed: "yes",
      englishLevel: "proficient",
      offshoreExperienceYears: 4,
      preferredState: "NT",
      preferredPathway: "491",
      migrationGoals: ["regional"],
    },
  },
];

const OUTPUT_DIR = path.join(process.cwd(), "temp_tests");

async function runPersona(persona: Persona): Promise<void> {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`Persona ${persona.id}: ${persona.label}`);
  console.log("=".repeat(70));

  const [stateIntelligence, stateOccupationMatches] = await Promise.all([
    getStateIntelligenceMap(),
    getStateOccupationMatches(persona.input.occupation),
  ]);

  const report = runReadinessEngine({
    ...persona.input,
    stateIntelligence,
    stateOccupationMatches,
  });

  // Same hard-gate-derived signal the CRM tier gate reads -- see
  // lib/readiness/internal-lead-tier.ts and lib/readiness/engine.ts's
  // DHA hard gates comment block.
  const eoiEligible = report.pointsEstimate?.isEoiEligible ?? false;
  const ineligibilityReason = report.pointsEstimate?.eoiIneligibilityReason ?? null;
  const hardGatesFailed: string[] = [];
  if (!eoiEligible && ineligibilityReason) {
    hardGatesFailed.push(ineligibilityReason);
  }

  const totalPoints = report.pointsEstimate?.estimatedPoints ?? report.assessmentState.estimatedPoints ?? 0;

  console.log("Hard gates failed:", hardGatesFailed.length > 0 ? hardGatesFailed.join(", ") : "none");
  console.log("Total Points:", totalPoints);

  // RAG context -- same query-signal construction full-check/actions.ts
  // uses to build strategyQueryText for generatePremiumStrategy.
  const strategyQueryText = [persona.input.occupation, persona.input.preferredState, ...(report.detectedSubclasses ?? [])]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(" ");

  const [ragVisaContext, ragStateContext] = await Promise.all([
    retrieveVisaContext({ message: strategyQueryText }),
    retrieveStateContext(strategyQueryText),
  ]);

  try {
    const aiStrategy = await generatePremiumStrategy(
      report,
      { visaContext: ragVisaContext, stateContext: ragStateContext },
      "en"
    );
    report.aiStrategy = aiStrategy;
    console.log("AI Executive Summary:", aiStrategy.executiveSummary);
  } catch (err) {
    console.error(`Persona ${persona.id}: generatePremiumStrategy failed (continuing without aiStrategy):`, err);
  }

  const pdfBytes = await generateReadinessPDF({
    report,
    locale: "en",
    saveToFile: false,
    userInputSummary: {
      name: `Persona ${persona.id}`,
      email: "qa@example.com",
      mainGoal: persona.input.mainGoal,
      currentCountry: persona.input.currentCountry,
      passportCountry: persona.input.passportCountry,
      age: persona.input.age,
      occupation: persona.input.occupation,
      englishLevel: persona.input.englishLevel,
    },
  });

  const outputPath = path.join(OUTPUT_DIR, `persona-${persona.id}.pdf`);
  writeFileSync(outputPath, Buffer.from(pdfBytes));
  console.log(`PDF written: ${outputPath} (${pdfBytes.byteLength} bytes)`);
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const persona of PERSONAS) {
    await runPersona(persona);
  }

  console.log(`\nAll personas complete. PDFs written to ${OUTPUT_DIR}`);
}

main()
  .catch((err) => {
    console.error("test-personas crashed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
