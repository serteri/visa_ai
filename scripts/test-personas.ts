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
import { checkReportInvariants } from "../lib/readiness/report-invariants";
import { prisma } from "../lib/prisma";

type Persona = {
  id: "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J";
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
  {
    // Reproduces the original sample-PDF scenario reported as drift/contradiction:
    // points threshold met, but EOI lodgement blocked on a missing Skills
    // Assessment. Verifies the report-invariants fix end-to-end (real
    // DB-backed state intelligence + live generatePremiumStrategy call).
    id: "D",
    label: "Blocked-but-strong (Software Engineer, 30, Superior English, PhD, no Skills Assessment, 70 pts)",
    input: {
      locale: "en",
      country: "AU",
      mainGoal: "Skilled migration through 189, 190 or 491",
      currentCountry: "India",
      passportCountry: "India",
      age: "30",
      occupation: "Software Engineer 261313",
      occupationConfirmed: "no",
      englishLevel: "superior",
      qualificationLevel: "PhD/Doctorate",
      isQualificationRecognized: true,
      offshoreExperienceYears: 10,
      onshoreExperienceYears: 3,
      preferredState: "NSW",
      preferredPathway: "189",
      migrationGoals: ["direct_pr"],
    },
  },
  {
    // CA parity check, eligible baseline: real CLB test provided, no hard
    // gate triggered. Confirms the language-test hard gate (engine.ts's
    // buildCanadaPointsEstimate) doesn't false-positive on a normal profile.
    // ECA explicitly obtained ("yes" to Step3Language's CA-relabeled
    // "Did you obtain an ECA?" question) -- verifies the ECA status fix
    // (pdf-personalized-content.ts's ecaObtained, wired from
    // userInputSummary.isAustralianQualification) shows "Completed", not
    // the previous always-"Not Done" bug.
    id: "E",
    label: "CA eligible baseline (CLB9, real language test, ECA obtained)",
    input: {
      locale: "en",
      country: "CA",
      mainGoal: "Express Entry (CEC/FSW/FSTP)",
      currentCountry: "Nigeria",
      passportCountry: "Nigeria",
      age: "29",
      occupation: "Software Engineer",
      englishLevel: "clb9",
      offshoreExperienceYears: 5,
      qualificationAwardedInAustralia: true,
      migrationGoals: ["direct_pr"],
    },
  },
  {
    // CA hard-gate check: no language test submitted ("none") -- the ONE
    // CA EOI hard gate now modeled (buildCanadaPointsEstimate in engine.ts),
    // since every Express Entry stream (CEC/FSW/FSTP) requires an official
    // CLB-mapped test result to create a profile at all. Confirms
    // isEoiEligible now actually goes false for a real CA input (previously
    // hardcoded true unconditionally), and that the cover-page badge
    // (getEligibilityBadgeState, reads isEoiEligible directly -- independent
    // of canShowNumericRanking) reflects it. Note: canShowNumericRanking is
    // ALSO false for this profile (no real English evidence), so
    // rankedPathways takes the qualitative fallback branch rather than the
    // numeric branch's eoiBlocked gate -- that gate is separately confirmed
    // via a synthetic-report unit check since no real CA input can be both
    // "sufficient data" and "blocked" simultaneously with only this one gate
    // modeled (see engine.ts's buildCanadaPointsEstimate comment for why
    // age/points/ECA/experience gates were deliberately NOT added).
    // ECA explicitly NOT obtained ("no") -- pairs with Persona E to cover
    // both ECA states. Also still the language-test-blocked persona.
    id: "F",
    label: "CA blocked (no language test submitted, ECA not obtained)",
    input: {
      locale: "en",
      country: "CA",
      mainGoal: "Express Entry (CEC/FSW/FSTP)",
      currentCountry: "Nigeria",
      passportCountry: "Nigeria",
      age: "29",
      occupation: "Software Engineer",
      englishLevel: "none",
      offshoreExperienceYears: 5,
      qualificationAwardedInAustralia: false,
      migrationGoals: ["direct_pr"],
    },
  },
  {
    // AU Employer Sponsorship module, qualifying: salary above CSIT
    // (CURRENT_CSIT.value, lib/readiness/constants.ts -- AUD 79,423 as of
    // this session). Confirms the 482->186 section renders with a met
    // CSIT check and no CA terminology leakage.
    id: "G",
    label: "AU Employer Sponsorship, qualifying (salary above CSIT)",
    input: {
      locale: "en",
      country: "AU",
      mainGoal: "Employer Sponsorship",
      currentCountry: "India",
      passportCountry: "India",
      age: "32",
      occupation: "Software Engineer 261313",
      occupationConfirmed: "yes",
      englishLevel: "competent",
      annualSalaryAud: 95000,
      migrationGoals: ["employer_sponsorship"],
    },
  },
  {
    // AU Employer Sponsorship module, non-qualifying: salary below CSIT.
    id: "H",
    label: "AU Employer Sponsorship, non-qualifying (salary below CSIT)",
    input: {
      locale: "en",
      country: "AU",
      mainGoal: "Employer Sponsorship",
      currentCountry: "India",
      passportCountry: "India",
      age: "32",
      occupation: "Software Engineer 261313",
      occupationConfirmed: "yes",
      englishLevel: "competent",
      annualSalaryAud: 60000,
      migrationGoals: ["employer_sponsorship"],
    },
  },
  {
    // CA Employer-Linked Pathways placeholder: confirms the honest
    // "not yet modeled" section renders (no invented LMIA/job-offer
    // eligibility, no AU terminology) when a CA user selects the same
    // "Employer Sponsorship" migration goal.
    id: "I",
    label: "CA Employer-Linked Pathways placeholder",
    input: {
      locale: "en",
      country: "CA",
      mainGoal: "Employer-linked pathways",
      currentCountry: "Philippines",
      passportCountry: "Philippines",
      age: "31",
      occupation: "Software Engineer",
      englishLevel: "clb8",
      offshoreExperienceYears: 4,
      migrationGoals: ["employer_sponsorship"],
    },
  },
  {
    // Accountant (221111) test: verifies that the removed hardcoded "90"
    // competitive threshold is also gone from Accountant reports (which
    // shared the ["221111", "261313"] heuristic in readiness-engine.ts).
    // Uses 75 points to verify clean, single-benchmark reporting (95 per-round
    // benchmark only).
    id: "J",
    label: "Accountant (221111, 75 pts, Proficient English, 5 yrs offshore)",
    input: {
      locale: "en",
      country: "AU",
      mainGoal: "Skilled migration through 189, 190 or 491",
      currentCountry: "India",
      passportCountry: "India",
      age: "30",
      occupation: "Accountant (General) 221111",
      occupationConfirmed: "yes",
      englishLevel: "proficient",
      qualificationLevel: "Bachelor's Degree",
      isQualificationRecognized: true,
      offshoreExperienceYears: 5,
      preferredState: "NSW",
      preferredPathway: "189",
      migrationGoals: ["direct_pr"],
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
      isAustralianQualification: persona.input.qualificationAwardedInAustralia,
    },
  });

  const outputPath = path.join(OUTPUT_DIR, `persona-${persona.id}.pdf`);
  writeFileSync(outputPath, Buffer.from(pdfBytes));
  console.log(`PDF written: ${outputPath} (${pdfBytes.byteLength} bytes)`);

  console.log("assessmentState.isEoiEligible:", report.assessmentState.isEoiEligible);
  console.log("assessmentState.eoiIneligibilityReason:", report.assessmentState.eoiIneligibilityReason);
  console.log("assessmentState.pathwayPoints:", report.assessmentState.pathwayPoints);
  console.log("assessmentState.referenceBenchmarks:", report.assessmentState.referenceBenchmarks);
  console.log(
    "rankedPathways (189/190/491):",
    (report.rankedPathways ?? [])
      .filter((p) => ["189", "190", "491"].includes(p.subclass))
      .map((p) => ({ subclass: p.subclass, pointsSignal: p.pointsSignal, tag: p.recommendationTag }))
  );
  if (report.aiStrategy) {
    console.log("aiStrategy.executiveSummary:", report.aiStrategy.executiveSummary);
  }

  const violations = checkReportInvariants(report);
  console.log(`checkReportInvariants: ${violations.length === 0 ? "NONE" : violations.length + " violation(s)"}`);
  if (violations.length > 0) {
    console.log(violations);
  }
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Optional PERSONA_FILTER=D env var to run a single persona during
  // debugging without re-running the whole (LLM-call-costing) suite.
  const filterId = process.env.PERSONA_FILTER;
  const personas = filterId ? PERSONAS.filter((p) => p.id === filterId) : PERSONAS;

  for (const persona of personas) {
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
