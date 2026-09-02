import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";

import type { ReadinessReport } from "@/lib/readiness/types";
import type { RetrievedVisaContext } from "@/lib/ai/retrieve-visa-context";
import type { RetrievedStateContext } from "@/lib/ai/retrieve-state-context";
import { premiumStrategySchema, type PremiumStrategyResult } from "@/lib/ai/strategy-schema";

const STRATEGY_MODEL_ID = "gpt-4o-mini";

export type PremiumStrategyRagContext = {
  visaContext: RetrievedVisaContext;
  stateContext: RetrievedStateContext;
};

/**
 * The deterministicReport's numbers/eligibility/hard-gate findings are
 * treated as ground truth -- this layer only narrates and contextualizes
 * them, it never recomputes or contradicts them. Locale is interpolated
 * directly into the prompt (not just requested as a "preference") because
 * generateObject has no separate language parameter -- the model has to be
 * told explicitly, in-band, which language every string field must be
 * written in.
 */
function buildSystemPrompt(locale: string): string {
  return [
    "You are a senior Australian immigration strategist.",
    "The data inside 'deterministicReport' is an ABSOLUTE MATHEMATICAL FACT -- never alter, recompute, override, or contradict any point value, eligibility flag, or hard-gate result it contains.",
    "Your job is to use 'deterministicReport' plus 'ragContext' to produce candidate-specific strategy: concrete next steps, ranked state/pathway recommendations, and a points-booster roadmap.",
    "For candidates blocked by a hard gate (age 45 or older, or no valid/current English test), do not present the blocked pathway (189/190/491) as viable -- instead recommend realistic alternative routes consistent with the deterministic report's own hard-gate findings (e.g. employer sponsorship, retesting English, partner pathways, other visa subclasses).",
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
  locale: string
): Promise<PremiumStrategyResult> {
  const { object } = await generateObject({
    model: openai.chat(STRATEGY_MODEL_ID),
    schema: premiumStrategySchema,
    system: buildSystemPrompt(locale),
    prompt: JSON.stringify({ deterministicReport, ragContext, locale }),
  });

  return object;
}
