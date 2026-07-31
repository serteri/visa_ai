import type { PDFContext, PDFSection } from "../pdf-types";

/**
 * Renders the State Signal Radar chart.
 *
 * Shows a radar/spider chart visualization of state nomination scores,
 * with color-coded chips below showing each state's match level.
 *
 * Extracted from the original monolith (lines 3373-3463) with multi-language
 * support for section labels.
 */
export const drawStateRadar: PDFSection = (ctx: PDFContext): void => {
  const {
    report,
    text,
    effectiveLocale,
    doc,
    margin,
    contentWidth,
    COLORS,
    FONTS,
    addHeading,
    setBaseFont,
    setBoldFont,
    safeText,
    ensurePageSpace,
  } = ctx;

  const states = report.stateNominationTracker?.states ?? [];
  if (states.length === 0) return;

  ensurePageSpace(142);
  addHeading(
    report.country === "CA" ? text.stateRadarCanada : text.stateRadar,
  );

  const topY = ctx.yPosition;
  const boxHeight = 124;

  // Card background
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.roundedRect(margin, topY, contentWidth, boxHeight, 2.5, 2.5, "FD");
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin + 4, topY + 4, contentWidth - 8, 14, 2, 2, "F");

  // Subtitle
  setBaseFont();
  doc.setFontSize(FONTS.small);
  doc.setTextColor(COLORS.lightText.r, COLORS.lightText.g, COLORS.lightText.b);
  doc.text(
    doc.splitTextToSize(safeText(text.stateRadarSubtitle), contentWidth - 16),
    margin + 8,
    topY + 12,
  );

  // Radar chart
  const centerX = margin + contentWidth / 2;
  const centerY = topY + 58;
  const radius = 34;
  const ringColor = { r: 203, g: 213, b: 225 };
  doc.setDrawColor(ringColor.r, ringColor.g, ringColor.b);
  doc.setLineWidth(0.25);
  [0.33, 0.66, 1].forEach((scale) => {
    doc.circle(centerX, centerY, radius * scale, "S");
  });

  const radarStates = states.slice(0, 8);
  const points = radarStates.map((state, index) => {
    const angle = -Math.PI / 2 + (index / radarStates.length) * Math.PI * 2;
    const scoreRadius = radius * Math.max(0.05, Math.min(1, state.score / 100));
    const outerX = centerX + Math.cos(angle) * radius;
    const outerY = centerY + Math.sin(angle) * radius;
    const pointX = centerX + Math.cos(angle) * scoreRadius;
    const pointY = centerY + Math.sin(angle) * scoreRadius;

    // Axis line
    doc.setDrawColor(ringColor.r, ringColor.g, ringColor.b);
    doc.line(centerX, centerY, outerX, outerY);

    // State code label
    setBoldFont();
    doc.setFontSize(7.2);
    doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    doc.text(safeText(state.code), outerX, outerY, {
      align: outerX < centerX ? "right" : "left",
    });

    return { x: pointX, y: pointY };
  });

  // Polygon connecting data points
  if (points.length > 1) {
    doc.setDrawColor(COLORS.accent.r, COLORS.accent.g, COLORS.accent.b);
    doc.setLineWidth(1);
    points.forEach((point, index) => {
      const next = points[(index + 1) % points.length];
      doc.line(point.x, point.y, next.x, next.y);
    });
    points.forEach((point) => {
      doc.setFillColor(COLORS.accent.r, COLORS.accent.g, COLORS.accent.b);
      doc.circle(point.x, point.y, 1.7, "F");
    });
  }

  // State chips (color-coded badges below radar)
  const chipTop = topY + 98;
  const chipWidth = (contentWidth - 18) / 4;
  states.slice(0, 8).forEach((state, index) => {
    const color =
      state.matchLevel === "high"
        ? COLORS.riskLow
        : state.matchLevel === "medium"
          ? COLORS.riskMedium
          : COLORS.riskHigh;
    const col = index % 4;
    const row = Math.floor(index / 4);
    const x = margin + 6 + col * (chipWidth + 2);
    const y = chipTop + row * 10;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, chipWidth, 7.5, 1.2, 1.2, "FD");
    doc.setFillColor(color.r, color.g, color.b);
    doc.roundedRect(x + 2, y + 2.1, 13, 3.3, 0.8, 0.8, "F");
    setBoldFont();
    doc.setFontSize(6.5);
    doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    doc.text(safeText(state.code), x + 18, y + 5.2);
    setBaseFont();
    doc.setTextColor(COLORS.lightText.r, COLORS.lightText.g, COLORS.lightText.b);
    doc.text(safeText(`${String(state.score)}%`), x + chipWidth - 4, y + 5.2, {
      align: "right",
    });
  });

  ctx.yPosition = topY + boxHeight + 6;
};
