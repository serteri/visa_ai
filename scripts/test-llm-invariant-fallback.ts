/**
 * Verifies the retry-then-fallback path in generatePremiumStrategy
 * (lib/ai/generate-premium-strategy.ts): when the LLM's narrative output
 * uses encouraging/"proceed" language while the deterministic report's EOI
 * status is blocked, the function must retry once with a corrective prompt,
 * and if the retry still violates, replace only the offending fields with
 * static fallback text -- never returning the original violating text.
 *
 * Uses runReadinessEngine (deterministic, no DB/LLM calls) to get a real
 * blocked ReadinessReport, then stubs the model call via generatePremiumStrategy's
 * injectable generateFn parameter -- no network/API key required.
 *
 * Usage: npx tsx scripts/test-llm-invariant-fallback.ts
 */
import { runReadinessEngine } from "../lib/readiness/engine";
import { runReadinessEngine as runCaReadinessEngine } from "../src/lib/readiness-engine";
import { generatePremiumStrategy, type StrategyGenerateFn } from "../lib/ai/generate-premium-strategy";
import { textMatchesBlockedLanguage } from "../lib/readiness/report-invariants";
import type { ReadinessInput } from "../lib/readiness/types";
import type { PremiumStrategyResult } from "../lib/ai/strategy-schema";

function makeResult(
  executiveSummary: string,
  reason = "This state has recently opened nominations for this occupation."
): PremiumStrategyResult {
  return {
    executiveSummary,
    topRecommendedPathways: [{ state: "NSW", subclass: "190", reason, nextSteps: ["Gather documents"] }],
    pointsBoosterStrategy: [{ action: "Retake English test", pointsGained: 10, difficulty: "Medium" }],
    timelineEstimate: "3-6 months",
  };
}

async function main() {
  // A profile that meets the points threshold but has no skills assessment
  // -- the same "blocked but numerically fine" scenario the upstream fix
  // targeted, so isEoiEligible is false with eoiIneligibilityReason
  // "skills_assessment".
  const input: ReadinessInput = {
    locale: "en",
    country: "AU",
    mainGoal: "Skilled migration through 189, 190 or 491",
    currentCountry: "India",
    passportCountry: "India",
    age: "36",
    occupation: "Software Engineer 261313",
    occupationConfirmed: "no",
    englishLevel: "superior",
    offshoreExperienceYears: 8,
    preferredPathway: "189",
    migrationGoals: ["direct_pr"],
  };

  const report = runReadinessEngine(input);
  console.log("assessmentState.isEoiEligible:", report.assessmentState.isEoiEligible);
  console.log("assessmentState.eoiIneligibilityReason:", report.assessmentState.eoiIneligibilityReason);

  if (report.assessmentState.isEoiEligible) {
    console.error("FAIL: test fixture is not actually blocked -- adjust the input profile.");
    process.exitCode = 1;
    return;
  }

  let callCount = 0;

  // Case 1: first attempt violates, retry also violates -> must fall back.
  const alwaysViolating: StrategyGenerateFn = async () => {
    callCount++;
    return makeResult(
      "Great news — your profile is strong! You can proceed directly to the application process.",
      "Your profile is strong for this state."
    );
  };

  callCount = 0;
  const fallbackResult = await generatePremiumStrategy(
    report,
    { visaContext: [], stateContext: [] },
    "en",
    alwaysViolating
  );

  console.log("\n[Case 1: always-violating stub]");
  console.log("Model calls made:", callCount, "(expected 2: initial + 1 retry)");
  console.log("Final executiveSummary:", fallbackResult.executiveSummary);
  console.log("Final topRecommendedPathways[0].reason:", fallbackResult.topRecommendedPathways[0].reason);

  const allFinalText = [
    fallbackResult.executiveSummary,
    fallbackResult.timelineEstimate,
    ...fallbackResult.topRecommendedPathways.map((p) => p.reason),
    ...fallbackResult.pointsBoosterStrategy.map((s) => s.action),
  ];
  const stillViolating = allFinalText.filter((t) => textMatchesBlockedLanguage(t));

  let ok = true;
  if (callCount !== 2) {
    console.error("FAIL: expected exactly 2 model calls (initial + 1 retry), got", callCount);
    ok = false;
  }
  if (stillViolating.length > 0) {
    console.error("FAIL: final rendered result still contains blocked-language matches:", stillViolating);
    ok = false;
  }
  if (!fallbackResult.executiveSummary.includes("blocked")) {
    console.error("FAIL: expected fallback executiveSummary to explain the blocked status.");
    ok = false;
  }

  // Case 2: first attempt violates, retry is clean -> must return the
  // corrected (retried) text as-is, no fallback substitution, exactly 2 calls.
  let case2CallCount = 0;
  const violatesOnceThenClean: StrategyGenerateFn = async () => {
    case2CallCount++;
    if (case2CallCount === 1) {
      return makeResult("Your profile is strong! Apply now.");
    }
    return makeResult("Progress is currently blocked because a positive Skills Assessment has not been obtained.");
  };

  const correctedResult = await generatePremiumStrategy(
    report,
    { visaContext: [], stateContext: [] },
    "en",
    violatesOnceThenClean
  );

  console.log("\n[Case 2: violates once, clean on retry]");
  console.log("Model calls made:", case2CallCount, "(expected 2)");
  console.log("Final executiveSummary:", correctedResult.executiveSummary);

  if (case2CallCount !== 2) {
    console.error("FAIL: expected exactly 2 model calls, got", case2CallCount);
    ok = false;
  }
  if (textMatchesBlockedLanguage(correctedResult.executiveSummary)) {
    console.error("FAIL: corrected retry text still violates.");
    ok = false;
  }
  if (!correctedResult.executiveSummary.includes("Skills Assessment")) {
    console.error("FAIL: expected the retried (non-fallback) text to be returned as-is.");
    ok = false;
  }

  // Case 3: clean on first attempt -> exactly 1 call, no retry needed.
  let case3CallCount = 0;
  const cleanFirstTry: StrategyGenerateFn = async () => {
    case3CallCount++;
    return makeResult("Progress is currently blocked because a positive Skills Assessment has not been obtained.");
  };
  await generatePremiumStrategy(report, { visaContext: [], stateContext: [] }, "en", cleanFirstTry);
  console.log("\n[Case 3: clean on first attempt]");
  console.log("Model calls made:", case3CallCount, "(expected 1)");
  if (case3CallCount !== 1) {
    console.error("FAIL: expected exactly 1 model call when the first attempt is already clean, got", case3CallCount);
    ok = false;
  }

  // Case 4: country mismatch -- a CA report, model hallucinates AU
  // terminology (the exact bug found via real end-to-end testing: the
  // system prompt used to unconditionally say "Australian immigration
  // strategist" regardless of report.country). Must retry-then-fallback
  // the same way blocked-language does, even though this CA profile is
  // NOT blocked (isEoiEligible: true) -- country mismatch is checked
  // unconditionally, not just when blocked.
  const caReport = runCaReadinessEngine({
    locale: "en",
    country: "CA",
    age: "29",
    occupation: "Software Engineer",
    englishLevel: "clb9",
    offshoreExperienceYears: 5,
  });
  console.log("\nCA report isEoiEligible:", caReport.assessmentState.isEoiEligible, "(expected true -- not a blocked-language test)");

  let case4CallCount = 0;
  const hallucinatesAuTerms: StrategyGenerateFn = async () => {
    case4CallCount++;
    return makeResult(
      "You have the potential to pursue pathways to Australian immigration, particularly through subclass 189.",
      "Consider ANZSCO code review for this pathway."
    );
  };
  const countryFixedResult = await generatePremiumStrategy(
    caReport,
    { visaContext: [], stateContext: [] },
    "en",
    hallucinatesAuTerms
  );
  console.log("\n[Case 4: CA report, AU-hallucination stub]");
  console.log("Model calls made:", case4CallCount, "(expected 2: initial + 1 retry)");
  console.log("Final executiveSummary:", countryFixedResult.executiveSummary);
  console.log("Final topRecommendedPathways[0].reason:", countryFixedResult.topRecommendedPathways[0].reason);

  const finalCaText = [countryFixedResult.executiveSummary, ...countryFixedResult.topRecommendedPathways.map((p) => p.reason)];
  const auTermsLeaked = finalCaText.some((t) => /subclass 189|ANZSCO|Australian/i.test(t));
  if (case4CallCount !== 2) {
    console.error("FAIL: expected exactly 2 model calls (initial + 1 retry), got", case4CallCount);
    ok = false;
  }
  if (auTermsLeaked) {
    console.error("FAIL: final CA report still contains AU terminology:", finalCaText);
    ok = false;
  }

  console.log("\n" + (ok ? "ALL CASES PASSED" : "SOME CASES FAILED"));
  if (!ok) process.exitCode = 1;
}

main().catch((err) => {
  console.error("test-llm-invariant-fallback crashed:", err);
  process.exitCode = 1;
});
