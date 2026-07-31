import type { PDFContext, PDFSection } from "../pdf-types";

/**
 * Renders the "Lodgement-Ready Checklist" section.
 *
 * Each item is a card with:
 * - Checkbox (empty square)
 * - Priority badge (urgent/important/ready/blocked)
 * - Title and detail text
 * - Color-coded by priority (red/amber/gray/green)
 *
 * Extracted from the original monolith (lines 3499-3564).
 */
export const drawLodgementReadyChecklist: PDFSection = (ctx: PDFContext): void => {
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

  const checklist = report.lodgementReadyChecklist?.items ?? [];
  if (checklist.length === 0) return;

  addHeading(text.lodgementReadyChecklist);
  addSmallText(text.lodgementReadyChecklistIntro, 0);

  checklist.forEach((item) => {
    const detailLines = doc.splitTextToSize(
      safeText(item.detail),
      contentWidth - 34,
    );
    const boxHeight = Math.max(16, 10 + detailLines.length * 4.4);
    ensurePageSpace(boxHeight + 4);
    const topY = ctx.yPosition;

    // Card background
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
    doc.setLineWidth(0.25);
    doc.roundedRect(margin, topY, contentWidth, boxHeight, 1.8, 1.8, "FD");

    // Priority color
    const color =
      item.priority === "urgent"
        ? COLORS.riskHigh
        : item.priority === "important"
          ? COLORS.riskMedium
          : item.priority === "blocked"
            ? COLORS.border
            : COLORS.riskLow;

    const priorityLabel =
      item.priority === "urgent"
        ? text.urgent
        : item.priority === "important"
          ? text.important
          : item.priority === "blocked"
            ? text.blocked
            : text.ready;

    // Checkbox
    doc.setDrawColor(156, 163, 175);
    doc.setLineWidth(0.35);
    doc.roundedRect(margin + 3, topY + 3.2, 4.2, 4.2, 0.6, 0.6, "S");

    // Priority badge
    doc.setFillColor(color.r, color.g, color.b);
    doc.roundedRect(margin + 10, topY + 2.8, 17, 5.2, 1.2, 1.2, "F");

    setBoldFont();
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(safeText(priorityLabel), margin + 12, topY + 6.3);

    // Title
    setBoldFont();
    doc.setFontSize(FONTS.body);
    doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    doc.text(safeText(item.title), margin + 30, topY + 6.5);

    // Detail
    setBaseFont();
    doc.setFontSize(FONTS.small);
    doc.setTextColor(COLORS.lightText.r, COLORS.lightText.g, COLORS.lightText.b);
    doc.text(detailLines, margin + 30, topY + 11.2);

    ctx.yPosition += boxHeight + 3;
  });

  if (report.lodgementReadyChecklist?.note) {
    addSmallText(report.lodgementReadyChecklist.note, 4);
    ctx.yPosition += 2;
  }
};