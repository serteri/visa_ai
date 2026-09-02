import { z } from "zod";

/**
 * Structured-output schema for the Premium AI Strategy layer (see
 * lib/ai/generate-premium-strategy.ts). This is a narrative/advisory layer
 * on top of the deterministic ReadinessReport -- it never recomputes points
 * or eligibility, only explains and contextualizes what the deterministic
 * engine already decided.
 */
export const premiumStrategySchema = z.object({
  executiveSummary: z.string(),
  topRecommendedPathways: z.array(
    z.object({
      state: z.string(),
      subclass: z.string(),
      reason: z.string(),
      nextSteps: z.array(z.string()),
    })
  ),
  pointsBoosterStrategy: z.array(
    z.object({
      action: z.string(),
      pointsGained: z.number(),
      difficulty: z.enum(["Low", "Medium", "High"]),
    })
  ),
  timelineEstimate: z.string(),
});

export type PremiumStrategyResult = z.infer<typeof premiumStrategySchema>;
