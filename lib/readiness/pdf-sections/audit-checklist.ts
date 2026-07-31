import type { PDFContext, PDFSection } from "../pdf-types";

/**
 * Renders the "Audit-Ready Document Checklist" section.
 *
 * Groups documents by category, with checkboxes [ ] for each item.
 * Critical items are highlighted in red, non-critical in navy.
 *
 * Extracted from the original monolith (lines 2277-2318).
 */
export const drawAuditChecklistBox: PDFSection = (ctx: PDFContext): void => {
  const {
    report,
    text,
    doc,
    margin,
    contentWidth,
    COLORS,
    FONTS,
    addSectionHeading,
    addSmallText,
    setBaseFont,
    setBoldFont,
    safeText,
    ensurePageSpace,
  } = ctx;

  if (!report.documentChecklist || report.documentChecklist.length === 0) return;

  addSectionHeading("", text.auditReadyChecklist);
  addSmallText(text.auditReadyChecklistIntro, 0);
  ctx.yPosition += 2;

  report.documentChecklist.forEach((category) => {
    const isCritical = category.category.toUpperCase() === "CRITICAL";
    const itemCount = Math.max(1, category.items.length);
    const boxHeight = 8 + itemCount * 5;
    ensurePageSpace(boxHeight + 6);

    doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
    doc.setLineWidth(0.25);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, ctx.yPosition, contentWidth, boxHeight, 1.2, 1.2, "FD");

    setBoldFont();
    doc.setFontSize(FONTS.subheading);
    if (isCritical) {
      doc.setTextColor(COLORS.riskHigh.r, COLORS.riskHigh.g, COLORS.riskHigh.b);
    } else {
      doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    }
    doc.text(safeText(category.category), margin + 2, ctx.yPosition + 5);

    setBaseFont();
    doc.setFontSize(FONTS.body);
    category.items.forEach((item, idx) => {
      if (isCritical) {
        doc.setTextColor(COLORS.riskHigh.r, COLORS.riskHigh.g, COLORS.riskHigh.b);
      } else {
        doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
      }
      doc.text(safeText(`[ ] ${item}`), margin + 4, ctx.yPosition + 10 + idx * 5);
    });

    ctx.yPosition += boxHeight + 4;
  });
};