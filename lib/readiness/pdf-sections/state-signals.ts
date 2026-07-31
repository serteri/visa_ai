import type { PDFContext, PDFSection } from "../pdf-types";

/**
 * State Nomination signal components: Top Recommended States,
 * Blocked Notice, and Partial Data Warning.
 *
 * Extracted from the original monolith (lines 3277-3371).
 */

// ── State color helper ──────────────────────────────────────────────────────
function stateMatchColor(
  matchLevel: "high" | "medium" | "low",
  COLORS: { riskHigh: { r: number; g: number; b: number }; riskMedium: { r: number; g: number; b: number }; riskLow: { r: number; g: number; b: number } },
) {
  if (matchLevel === "high") return COLORS.riskLow;
  if (matchLevel === "medium") return COLORS.riskMedium;
  return COLORS.riskHigh;
}

/**
 * Renders the "Blocked Notice" when state nomination is ineligible.
 */
export const drawStateNominationBlockedNotice: PDFSection = (ctx: PDFContext): void => {
  const { report, text, addHeading, addBody } = ctx;
  if (!report.stateNominationTracker?.eligibilityBlocked) return;
  addHeading(
    report.country === "CA"
      ? text.stateNominationTrackerCanada
      : text.stateNominationTracker,
  );
  addBody(report.stateNominationTracker.blockedReason ?? "");
  ctx.yPosition += 3;
};

/**
 * Renders the "Top Recommended States" card list.
 */
export const drawTopRecommendedStates: PDFSection = (ctx: PDFContext): void => {
  const {
    report,
    text,
    doc,
    margin,
    contentWidth,
    COLORS,
    FONTS,
    addHeading,
    addSmallText,
    setBaseFont,
    setBoldFont,
    safeText,
    ensurePageSpace,
  } = ctx;

  const topStates = report.stateNominationTracker?.topRecommendedStates ?? [];
  if (topStates.length === 0) return;

  addHeading(
    report.country === "CA"
      ? text.topRecommendedStatesCanada
      : text.topRecommendedStates,
  );
  ensurePageSpace(32);

  topStates.forEach((state, index) => {
    const rowHeight = 14;
    ensurePageSpace(rowHeight + 2);

    const topY = ctx.yPosition;
    const color = stateMatchColor(state.matchLevel, COLORS);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
    doc.setLineWidth(0.25);
    doc.roundedRect(margin, topY, contentWidth, rowHeight, 1.2, 1.2, "FD");

    doc.setFillColor(color.r, color.g, color.b);
    doc.circle(margin + 4, topY + 5, 1.5, "F");

    setBoldFont();
    doc.setFontSize(FONTS.body);
    doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    doc.text(
      safeText(`${index + 1}. ${state.code} - ${state.name} (${state.status})`),
      margin + 7.5,
      topY + 5.3,
    );

    setBaseFont();
    doc.setFontSize(FONTS.small);
    doc.setTextColor(COLORS.lightText.r, COLORS.lightText.g, COLORS.lightText.b);
    doc.text(safeText(state.summary), margin + 7.5, topY + 9.5, {
      maxWidth: contentWidth - 10,
    });

    ctx.yPosition += rowHeight + 2;
  });

  if (report.stateNominationTracker?.note) {
    addSmallText(report.stateNominationTracker.note, 4);
    ctx.yPosition += 2;
  }
};

/**
 * Renders a prominent amber warning banner when state scores
 * were computed with incomplete profile data.
 */
export const drawPartialDataWarning: PDFSection = (ctx: PDFContext): void => {
  const {
    report,
    text,
    doc,
    margin,
    contentWidth,
    COLORS,
    FONTS,
    setBaseFont,
    setBoldFont,
    safeText,
    ensurePageSpace,
  } = ctx;

  const warning = report.stateNominationTracker?.partialDataWarning;
  if (!warning) return;

  setBoldFont();
  doc.setFontSize(FONTS.body);
  const messageLines = doc.splitTextToSize(
    safeText(`⚠ ${warning.message}`),
    contentWidth - 12,
  );

  setBaseFont();
  doc.setFontSize(FONTS.small);
  const fieldsLine = `${text.stateRadarMissingFieldsPrefix} ${warning.missingFieldLabels.join(", ")}`;
  const fieldsLines = doc.splitTextToSize(safeText(fieldsLine), contentWidth - 12);

  const boxHeight =
    6 + messageLines.length * 5.2 + fieldsLines.length * 4.4 + 4;
  ensurePageSpace(boxHeight + 4);
  const boxTop = ctx.yPosition;

  doc.setFillColor(255, 247, 230);
  doc.setDrawColor(COLORS.riskMedium.r, COLORS.riskMedium.g, COLORS.riskMedium.b);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, boxTop, contentWidth, boxHeight, 2, 2, "FD");

  let ly = boxTop + 6.5;
  setBoldFont();
  doc.setFontSize(FONTS.body);
  doc.setTextColor(COLORS.riskMedium.r, COLORS.riskMedium.g, COLORS.riskMedium.b);
  messageLines.forEach((line: string) => {
    doc.text(line, margin + 6, ly);
    ly += 5.2;
  });

  setBaseFont();
  doc.setFontSize(FONTS.small);
  doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
  fieldsLines.forEach((line: string) => {
    doc.text(safeText(line), margin + 6, ly);
    ly += 4.4;
  });

  ctx.yPosition = boxTop + boxHeight + 5;
};