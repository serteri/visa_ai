import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";

import type { ReadinessReport } from "@/lib/readiness/types";
import type { RetrievedVisaContext } from "@/lib/ai/retrieve-visa-context";
import type { RetrievedStateContext } from "@/lib/ai/retrieve-state-context";
import { premiumStrategySchema, type PremiumStrategyResult } from "@/lib/ai/strategy-schema";
import { textMatchesBlockedLanguage } from "@/lib/readiness/report-invariants";

const STRATEGY_MODEL_ID = "gpt-4o-mini";

export type PremiumStrategyRagContext = {
  visaContext: RetrievedVisaContext;
  stateContext: RetrievedStateContext;
};

/**
 * Injection point for the model call, so callers (tests) can stub the LLM
 * without touching the network/API key. Defaults to the real OpenAI call.
 */
export type StrategyGenerateFn = (args: { system: string; prompt: string }) => Promise<PremiumStrategyResult>;

async function defaultGenerateFn({ system, prompt }: { system: string; prompt: string }): Promise<PremiumStrategyResult> {
  const { object } = await generateObject({
    model: openai.chat(STRATEGY_MODEL_ID),
    schema: premiumStrategySchema,
    system,
    prompt,
  });
  return object;
}

/** Every free-text field the model can populate -- what the blocked-language scan and fallback substitution operate over. */
function collectNarrativeStrings(result: PremiumStrategyResult): Array<{ text: string; path: string }> {
  const entries: Array<{ text: string; path: string }> = [
    { text: result.executiveSummary, path: "executiveSummary" },
    { text: result.timelineEstimate, path: "timelineEstimate" },
  ];
  result.topRecommendedPathways.forEach((pathway, i) => {
    entries.push({ text: pathway.reason, path: `topRecommendedPathways[${i}].reason` });
  });
  result.pointsBoosterStrategy.forEach((step, i) => {
    entries.push({ text: step.action, path: `pointsBoosterStrategy[${i}].action` });
  });
  return entries;
}

function findBlockedLanguageViolations(result: PremiumStrategyResult): string[] {
  return collectNarrativeStrings(result)
    .filter(({ text }) => textMatchesBlockedLanguage(text))
    .map(({ path, text }) => `${path}: "${text}"`);
}

/** AU-only terms that must never appear in a CA report, and vice versa -- catches LLM country-context drift despite the system prompt's explicit country rule. */
const AU_ONLY_TERMS = /\b(subclass\s*(189|190|491|482|186|485|500)|\b(189|190|491|482|186)\b|ANZSCO|\bDHA\b|Skills Assessment|Department of Home Affairs)\b/i;
const CA_ONLY_TERMS = /\b(CRS score|Express Entry|\bCEC\b|\bFSW\b|\bFSTP\b|\bNOC\b|\bIRCC\b|\bECA\b|CELPIP)\b/i;

function findCountryMismatchViolations(result: PremiumStrategyResult, country: "AU" | "CA"): string[] {
  const wrongCountryPattern = country === "CA" ? AU_ONLY_TERMS : CA_ONLY_TERMS;
  return collectNarrativeStrings(result)
    .filter(({ text }) => wrongCountryPattern.test(text))
    .map(({ path, text }) => `${path}: "${text}"`);
}

/** A job offer/LMIA-related booster step claiming nonzero CRS points -- IRCC removed arranged-employment CRS bonus points effective 2025-03-25 (see EmployerSponsorshipSignal in types.ts and the CA system prompt's CRITICAL CRS FACT above). Not a text-pattern match -- checks the numeric pointsGained field, which collectNarrativeStrings/textMatchesBlockedLanguage can't see. */
const JOB_OFFER_TERMS = /\b(job offer|LMIA|arranged employment)\b/i;

function findJobOfferPointsViolations(result: PremiumStrategyResult, country: "AU" | "CA"): string[] {
  if (country !== "CA") return [];
  return result.pointsBoosterStrategy
    .filter((step) => JOB_OFFER_TERMS.test(step.action) && step.pointsGained > 0)
    .map((step) => `pointsBoosterStrategy: "${step.action}" claims +${step.pointsGained} CRS points for a job offer/LMIA, but IRCC removed this bonus effective 2025-03-25`);
}

/**
 * Deterministically zeroes any job-offer/LMIA CRS point claim for CA
 * reports, regardless of retry outcome -- this is a known, confirmed fact
 * (not a subjective wording judgment like blocked-language), so it doesn't
 * need a model round-trip to resolve: always applied as a final pass.
 */
function sanitizeJobOfferPoints(result: PremiumStrategyResult, country: "AU" | "CA"): PremiumStrategyResult {
  if (country !== "CA") return result;
  const violating = findJobOfferPointsViolations(result, country);
  if (violating.length === 0) return result;
  console.error("[report_invariant_violation] generatePremiumStrategy: zeroing job-offer/LMIA CRS point claim (IRCC removed this bonus 2025-03-25)", violating);
  return {
    ...result,
    pointsBoosterStrategy: result.pointsBoosterStrategy.map((step) =>
      JOB_OFFER_TERMS.test(step.action) && step.pointsGained > 0
        ? { ...step, pointsGained: 0, action: `${step.action} (note: IRCC removed CRS bonus points for job offers/arranged employment effective March 25, 2025 -- this no longer adds points)` }
        : step
    ),
  };
}

const BLOCKED_REASON_LABELS: Record<string, string> = {
  age: "the applicant does not meet the age requirement",
  skills_assessment: "a positive Skills Assessment has not yet been obtained",
  english: "the applicant's English test result does not meet the required level",
  points: "the applicant's points score is below the invitation threshold",
};

/**
 * Static, pre-written blocked-status text -- used only when the model still
 * produces encouraging/"proceed" language after one corrective retry. Never
 * sent to the user is the original violating text; this replaces it
 * per-field so the rest of the (non-violating) narrative is preserved.
 */
function fallbackText(path: string, eoiIneligibilityReason: string | null | undefined): string {
  const reasonLabel = BLOCKED_REASON_LABELS[eoiIneligibilityReason ?? ""] ?? "a blocking eligibility requirement has not been met";
  if (path === "executiveSummary") {
    return `Progress on this pathway is currently blocked because ${reasonLabel}. Resolve this requirement before taking further steps; this report does not recommend proceeding to application at this time.`;
  }
  if (path === "timelineEstimate") {
    return `Timeline unavailable while EOI lodgement is blocked (${reasonLabel}).`;
  }
  if (path.startsWith("topRecommendedPathways")) {
    return `This pathway's viability cannot be confirmed until the blocking requirement is resolved (${reasonLabel}).`;
  }
  return `Not available while EOI lodgement is blocked (${reasonLabel}).`;
}

/** Generic fallback for a field that still references the wrong country's terminology after the corrective retry. */
function countryMismatchFallbackText(path: string): string {
  if (path === "executiveSummary") {
    return "A detailed strategy summary is not available for this section right now -- see the deterministic sections of this report for your points, eligibility, and pathway comparison.";
  }
  if (path === "timelineEstimate") {
    return "Timeline unavailable for this section.";
  }
  if (path.startsWith("topRecommendedPathways")) {
    return "Detail unavailable for this recommendation.";
  }
  return "Not available.";
}

/**
 * Replaces only the violating narrative fields with static fallback text,
 * leaving every other field (including non-violating narrative strings)
 * untouched.
 */
function applyFallback(
  result: PremiumStrategyResult,
  violatingPaths: Set<string>,
  fallbackFor: (path: string) => string
): PremiumStrategyResult {
  const next: PremiumStrategyResult = {
    ...result,
    topRecommendedPathways: result.topRecommendedPathways.map((p) => ({ ...p })),
    pointsBoosterStrategy: result.pointsBoosterStrategy.map((s) => ({ ...s })),
  };

  if (violatingPaths.has("executiveSummary")) {
    next.executiveSummary = fallbackFor("executiveSummary");
  }
  if (violatingPaths.has("timelineEstimate")) {
    next.timelineEstimate = fallbackFor("timelineEstimate");
  }
  next.topRecommendedPathways.forEach((pathway, i) => {
    const path = `topRecommendedPathways[${i}].reason`;
    if (violatingPaths.has(path)) {
      pathway.reason = fallbackFor(path);
    }
  });
  next.pointsBoosterStrategy.forEach((step, i) => {
    const path = `pointsBoosterStrategy[${i}].action`;
    if (violatingPaths.has(path)) {
      step.action = fallbackFor(path);
    }
  });

  return next;
}

/**
 * The deterministicReport's numbers/eligibility/hard-gate findings are
 * treated as ground truth -- this layer only narrates and contextualizes
 * them, it never recomputes or contradicts them. Locale is interpolated
 * directly into the prompt (not just requested as a "preference") because
 * generateObject has no separate language parameter -- the model has to be
 * told explicitly, in-band, which language every string field must be
 * written in.
 */
function buildSystemPrompt(locale: string, country: "AU" | "CA"): string {
  const isCA = country === "CA";
  return [
    isCA
      ? "You are a senior Canadian immigration strategist specializing in Express Entry (CEC/FSW/FSTP) and Provincial Nominee Programs (PNP)."
      : "You are a senior Australian immigration strategist.",
    "The data inside 'deterministicReport' is an ABSOLUTE MATHEMATICAL FACT -- never alter, recompute, override, or contradict any point value, eligibility flag, or hard-gate result it contains.",
    "Your job is to use 'deterministicReport' plus 'ragContext' to produce candidate-specific strategy: concrete next steps, ranked state/pathway recommendations, and a points-booster roadmap.",
    isCA
      ? "CRITICAL COUNTRY RULE: this report is for CANADA. Only reference Canadian programs and terminology: CEC, FSW, FSTP, PNP, CRS score, Express Entry, ECA, NOC codes, IRCC. NEVER mention Australian visa subclasses (189, 190, 491, 482, 186, 485, 500), ANZSCO codes, DHA, Skills Assessment, or any other Australian-specific term -- Canada has no equivalent to 'Skills Assessment' (the closest analog is an ECA, which is a different concept). For candidates blocked by the hard gate (no valid language test result), do not present CEC/FSW/FSTP as viable -- state plainly that a valid language test result (IELTS General, CELPIP, or TEF/TCF Canada) is required before creating an Express Entry profile. CRITICAL CRS FACT: IRCC removed CRS bonus points for arranged employment (job offers) effective March 25, 2025 -- do NOT claim a job offer, LMIA-backed offer, or arranged employment adds any CRS points (e.g. '+50' or '+200') in pointsBoosterStrategy or anywhere else; a job offer is not currently a points-earning factor under Express Entry."
      : "For candidates blocked by a hard gate (age 45 or older, missing Skills Assessment, or no valid/current English test), do not present the blocked pathway (189/190/491) as viable -- instead recommend realistic alternative routes consistent with the deterministic report's own hard-gate findings (e.g. employer sponsorship, retesting English, partner pathways, other visa subclasses). NEVER mention Canadian terminology (CRS, Express Entry, CEC/FSW/FSTP, NOC, IRCC, ECA) in an Australian report.",
    `CRITICAL LANGUAGE RULE: the user's requested language code is '${locale}'. Every piece of text you return in the JSON output (executiveSummary, reason, nextSteps, action, timelineEstimate -- all of it) MUST be written entirely in '${locale}'. Do not mix languages and do not default to English unless '${locale}' is 'en'.`,
  ].join(" ");
}

/**
 * Premium AI Strategy layer: sits on top of the deterministic ReadinessReport
 * (lib/readiness/engine.ts) without altering it. Called from full-check's
 * actions.ts right after runReadinessEngine, with RAG context retrieved via
 * the existing retrieveVisaContext/retrieveStateContext utilities. Result is
 * merged into ReadinessReport.aiStrategy before the report is persisted.
 */
export async function generatePremiumStrategy(
  deterministicReport: ReadinessReport,
  ragContext: PremiumStrategyRagContext,
  locale: string,
  generateFn: StrategyGenerateFn = defaultGenerateFn
): Promise<PremiumStrategyResult> {
  const country = deterministicReport.country === "CA" ? "CA" : "AU";
  const result = await generatePremiumStrategyInternal(deterministicReport, ragContext, locale, generateFn, country);
  return sanitizeJobOfferPoints(result, country);
}

async function generatePremiumStrategyInternal(
  deterministicReport: ReadinessReport,
  ragContext: PremiumStrategyRagContext,
  locale: string,
  generateFn: StrategyGenerateFn,
  country: "AU" | "CA"
): Promise<PremiumStrategyResult> {
  const system = buildSystemPrompt(locale, country);
  const prompt = JSON.stringify({ deterministicReport, ragContext, locale });

  let result = await generateFn({ system, prompt });

  const isEoiEligible = deterministicReport.assessmentState.isEoiEligible;
  const eoiIneligibilityReason = deterministicReport.assessmentState.eoiIneligibilityReason;

  // Two independent violation classes, checked every time (not just when
  // blocked): blocked-language only matters while !isEoiEligible, but a
  // country-context mismatch (e.g. the model reverting to its AU-strategist
  // default and mentioning "subclass 189" in a CA report -- see the system
  // prompt's explicit country rule above) is wrong regardless of EOI status.
  let blockedViolations = isEoiEligible ? [] : findBlockedLanguageViolations(result);
  let countryViolations = findCountryMismatchViolations(result, country);
  if (blockedViolations.length === 0 && countryViolations.length === 0) return result;

  // One corrective retry with a combined, specific correction. Per-request
  // LLM drift can still happen even though the upstream deterministic
  // fields and system prompt are now structurally consistent -- this is
  // NOT the same class of bug as the pointsSignal/recommendation drift
  // fixed upstream, so it needs its own (non-log-only) handling.
  console.error(
    "[llm_text_invariant_violation] generatePremiumStrategy: violation(s) on first attempt, retrying with correction",
    { blockedViolations, countryViolations }
  );
  const correctionParts: string[] = [];
  if (blockedViolations.length > 0) {
    correctionParts.push(
      `The applicant's EOI lodgement is currently BLOCKED (reason: ${eoiIneligibilityReason ?? "unspecified"}). You previously used encouraging or "proceed"/"apply now"/"strong fit" language, which is STRICTLY PROHIBITED while blocked. State plainly that progress is blocked and why, and do not imply the applicant should proceed to application.`
    );
  }
  if (countryViolations.length > 0) {
    correctionParts.push(
      `This report is for ${country === "CA" ? "CANADA" : "AUSTRALIA"}. You previously mentioned ${country === "CA" ? "Australian visa subclasses, ANZSCO, or Skills Assessment terminology" : "Canadian CRS/Express Entry/CEC/FSW/FSTP/NOC/IRCC/ECA terminology"}, which does not apply here. Rewrite using only ${country === "CA" ? "Canadian Express Entry" : "Australian"} terminology.`
    );
  }
  const correctionSystem = `${system} CORRECTION: ${correctionParts.join(" ")} Rewrite your entire response accordingly.`;
  result = await generateFn({ system: correctionSystem, prompt });

  blockedViolations = isEoiEligible ? [] : findBlockedLanguageViolations(result);
  countryViolations = findCountryMismatchViolations(result, country);
  if (blockedViolations.length === 0 && countryViolations.length === 0) return result;

  // Still violating after the retry -- replace only the offending fields
  // with static fallback text. The original violating text is never
  // returned to the caller/user. Blocked-language violations take priority
  // per field (more specific, actionable text) when a field trips both.
  console.error(
    "[llm_text_invariant_violation] generatePremiumStrategy: still violating after retry, applying static fallback",
    { blockedViolations, countryViolations }
  );
  const blockedPaths = new Set(blockedViolations.map((v) => v.split(":")[0]));
  const countryPaths = new Set(countryViolations.map((v) => v.split(":")[0]));
  const allPaths = new Set([...blockedPaths, ...countryPaths]);
  return applyFallback(result, allPaths, (path) =>
    blockedPaths.has(path) ? fallbackText(path, eoiIneligibilityReason) : countryMismatchFallbackText(path)
  );
}
