import type { PDFContext, ColorRGB } from "../pdf-types";

/**
 * Premium container components for the PDF generator.
 *
 * These create visually-rich boxes with borders, accent bars, and structured
 * content. Extracted from the original monolith (lines 1820-1892).
 *
 * All functions mutate ctx.yPosition as they render.
 */

export function createContainerHelpers(ctx: PDFContext) {
  const {
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

  return {
    /**
     * Renders a premium bullet-point container with a title, accent left bar,
     * and circled bullets. Used for executive summaries, key points, etc.
     */
    addPremiumBulletContainer(
      title: string,
      items: string[],
      accent: ColorRGB = COLORS.accent,
    ): void {
      if (items.length === 0) return;

      const lineGroups = items.map((item) =>
        doc.splitTextToSize(safeText(item), contentWidth - 18),
      );
      const boxHeight = Math.max(
        24,
        13 + lineGroups.reduce((sum, lines) => sum + lines.length * 4.4 + 2, 0),
      );
      ensurePageSpace(boxHeight + 8);

      const topY = ctx.yPosition;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, topY, contentWidth, boxHeight, 2, 2, "FD");
      doc.setFillColor(accent.r, accent.g, accent.b);
      doc.rect(margin, topY, 2.8, boxHeight, "F");

      setBoldFont();
      doc.setFontSize(FONTS.subheading);
      doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      doc.text(safeText(title), margin + 7, topY + 7.5);

      let cursorY = topY + 14;
      lineGroups.forEach((lines) => {
        doc.setFillColor(accent.r, accent.g, accent.b);
        doc.circle(margin + 8, cursorY - 1.3, 1, "F");
        setBaseFont();
        doc.setFontSize(FONTS.small);
        doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
        doc.text(lines, margin + 12, cursorY);
        cursorY += lines.length * 4.4 + 2;
      });

      ctx.yPosition = topY + boxHeight + 5;
    },

    /**
     * Renders a premium key-value container with a title banner and two-column
     * layout. Used for signal snapshots, metadata, and structured data.
     */
    addPremiumKeyValueContainer(
      title: string,
      rows: Array<[string, string]>,
      accent: ColorRGB = COLORS.accent,
    ): void {
      if (rows.length === 0) return;

      const preparedRows = rows.map(([label, value]) => ({
        label,
        lines: doc.splitTextToSize(safeText(value), contentWidth - 58),
      }));
      const boxHeight = Math.max(
        24,
        13 + preparedRows.reduce((sum, row) => sum + Math.max(7, row.lines.length * 4.5 + 2), 0),
      );
      ensurePageSpace(boxHeight + 8);

      const topY = ctx.yPosition;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, topY, contentWidth, boxHeight, 2, 2, "FD");
      doc.setFillColor(236, 254, 255);
      doc.roundedRect(margin + 3, topY + 3, contentWidth - 6, 8, 1.3, 1.3, "F");

      setBoldFont();
      doc.setFontSize(FONTS.subheading);
      doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      doc.text(safeText(title), margin + 7, topY + 8.5);

      let cursorY = topY + 17;
      preparedRows.forEach((row) => {
        setBoldFont();
        doc.setFontSize(FONTS.small);
        doc.setTextColor(accent.r, accent.g, accent.b);
        doc.text(safeText(row.label), margin + 7, cursorY);

        setBaseFont();
        doc.setFontSize(FONTS.small);
        doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
        doc.text(row.lines, margin + 55, cursorY);
        cursorY += Math.max(7, row.lines.length * 4.5 + 2);
      });

      ctx.yPosition = topY + boxHeight + 5;
    },
  };
}
