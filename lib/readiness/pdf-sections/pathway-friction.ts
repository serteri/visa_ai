import type { PDFContext, PDFSection } from "../pdf-types";

/**
 * Renders the Pathway Friction section.
 *
 * Categorizes pathways into:
 * - Hard ineligible (regulatory barriers)
 * - Below points threshold (score too low)
 * - Routine friction (normal challenges)
 *
 * Each category gets its own visual treatment (red alerts, amber warnings,
 * or standard body text).
 *
 * Extracted from the original monolith (lines 4066-4097) with multi-language
 * support for section labels.
 */
export const drawPathwayFriction: PDFSection = (ctx: PDFContext): void => {
  const {
    report,
    text,
    effectiveLocale,
    addHeading,
    addSmallText,
    addBody,
    addCriticalAlertText,
  } = ctx;

  if (report.pathwayFriction.length === 0) return;

  addHeading(text.pathwayFriction);
  addSmallText(text.pathwayFrictionIntro, 0);

  // Categorize friction items
  const trueHardIneligibleFriction = report.pathwayFriction.filter(
    (item) => item.isHardIneligible && !item.isPointsThresholdOnly,
  );
  const pointsThresholdFriction = report.pathwayFriction.filter(
    (item) => item.isHardIneligible && item.isPointsThresholdOnly,
  );
  const routineFriction = report.pathwayFriction.filter(
    (item) => !item.isHardIneligible,
  );

  // Hard Gate (regulatory barriers)
  if (trueHardIneligibleFriction.length > 0) {
    addCriticalAlertText(text.criticalComplianceAlertLabel);
    trueHardIneligibleFriction.forEach((item) => {
      addCriticalAlertText(`${item.pathway}: ${item.explanation}`, 4);
    });
    ctx.yPosition += 1;
  }

  // Below points threshold (score too low)
  if (pointsThresholdFriction.length > 0) {
    addCriticalAlertText(text.belowPointsThreshold, 0, ctx.COLORS.riskMedium);
    pointsThresholdFriction.forEach((item) => {
      addCriticalAlertText(`${item.pathway}: ${item.explanation}`, 4, ctx.COLORS.riskMedium);
    });
    ctx.yPosition += 1;
  }

  // Routine friction (normal challenges)
  routineFriction.forEach((item) => {
    addBody(`${item.pathway}: ${item.frictionType}`);
    addSmallText(item.explanation, 4);
  });

  ctx.yPosition += 3;
};
