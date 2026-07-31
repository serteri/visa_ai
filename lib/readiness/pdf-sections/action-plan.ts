import type { PDFContext, PDFSection } from "../pdf-types";

/**
 * Renders the "Immediate Action Plan" section.
 *
 * A numbered, alert-styled list of suggested next steps from the report.
 * Uses the success-tone alert collection for green accent color.
 *
 * Extracted from the original monolith (lines 2819-2831).
 */
export const drawImmediateActionPlan: PDFSection = (ctx: PDFContext): void => {
  const { report, text, drawAlertCollection } = ctx;

  if (!report.suggestedNextSteps || report.suggestedNextSteps.length === 0) return;

  drawAlertCollection(
    text.yourImmediateActionPlan,
    text.nextStepBoxIntro,
    report.suggestedNextSteps.map((step, idx) => ({
      label: `${idx + 1}. ${text.important}`,
      body: step,
    })),
    "success",
  );
};