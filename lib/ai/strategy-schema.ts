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
      /**
       * AU: the id of an action in deterministicReport.pointsEstimate.actionPlan.
       * pointsGained / difficulty must equal the engine's values; only `reason`
       * and `difficultyExplanation` are the model's own wording (everything else
       * is overwritten from the engine after validation). CA: null.
       */
      actionId: z.string().nullable(),
      action: z.string(),
      pointsGained: z.number(),
      difficulty: z.enum(["Low", "Medium", "High"]),
      reason: z.string().nullable(),
      difficultyExplanation: z.string().nullable(),
    })
  ),
  timelineEstimate: z.string(),
});

export type PremiumStrategyResult = Omit<z.infer<typeof premiumStrategySchema>, "pointsBoosterStrategy"> & {
  /**
   * Older stored reports predate actionId/reason/difficultyExplanation, so they
   * are optional on the stored type (the model is still asked for all of them).
   */
  pointsBoosterStrategy: Array<
    Omit<z.infer<typeof premiumStrategySchema>["pointsBoosterStrategy"][number], "actionId" | "reason" | "difficultyExplanation"> & {
      actionId?: string | null;
      reason?: string | null;
      difficultyExplanation?: string | null;
    }
  >;
  /** AU: steps with no points value that unlock points (e.g. the skills assessment), from the engine. */
  enablingSteps?: Array<{ id: string; label: string; reason: string }>;
};
