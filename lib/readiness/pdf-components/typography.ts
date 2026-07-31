import type { PDFContext, ColorRGB } from "../pdf-types";

/**
 * Typography helpers for the PDF generator.
 *
 * These were extracted from the original monolith (lines 1747-1853 and
 * scattered throughout). They handle text rendering with proper spacing,
 * line wrapping, and indentation.
 *
 * All functions mutate ctx.yPosition as they render.
 */

export function createTypographyHelpers(ctx: PDFContext) {
  const {
    doc,
    margin,
    contentWidth,
    lineHeight,
    COLORS,
    FONTS,
    setBaseFont,
    setBoldFont,
    safeText,
    ensurePageSpace,
  } = ctx;

  return {
    addTitle(title: string): void {
      setBaseFont();
      doc.setFontSize(FONTS.title);
      doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
      doc.text(safeText(title), margin, ctx.yPosition);
      ctx.yPosition += 15;
    },

    addHeading(heading: string): void {
      // Delegates to addSectionHeading (which is in another helper module)
      ctx.addSectionHeading("", heading);
    },

    addBody(text: string, indent = 0): void {
      setBaseFont();
      doc.setFontSize(FONTS.body);
      doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
      const x = margin + indent;
      const lines = doc.splitTextToSize(safeText(text), contentWidth - indent);
      lines.forEach((line: string) => {
        ensurePageSpace(lineHeight + 1);
        setBaseFont();
        doc.text(safeText(line), x, ctx.yPosition);
        ctx.yPosition += lineHeight;
      });
    },

    addSmallText(text: string, indent = 0): void {
      setBaseFont();
      doc.setFontSize(FONTS.small);
      doc.setTextColor(COLORS.lightText.r, COLORS.lightText.g, COLORS.lightText.b);
      const x = margin + indent;
      const lines = doc.splitTextToSize(safeText(text), contentWidth - indent);
      lines.forEach((line: string) => {
        ensurePageSpace(lineHeight + 1);
        setBaseFont();
        doc.text(safeText(line), x, ctx.yPosition);
        ctx.yPosition += lineHeight;
      });
    },

    addCriticalAlertText(
      value: string,
      indent = 0,
      color: ColorRGB = COLORS.riskHigh,
    ): void {
      setBoldFont();
      doc.setFontSize(FONTS.small);
      doc.setTextColor(color.r, color.g, color.b);
      const x = margin + indent;
      const lines = doc.splitTextToSize(safeText(value), contentWidth - indent);
      lines.forEach((line: string) => {
        ensurePageSpace(lineHeight + 1);
        setBoldFont();
        doc.text(safeText(line), x, ctx.yPosition);
        ctx.yPosition += lineHeight;
      });
      setBaseFont();
    },

    addBulletPoints(items: string[]): void {
      items.forEach((item) => {
        ensurePageSpace(lineHeight + 2);
        setBaseFont();
        doc.setFontSize(FONTS.body);
        doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
        const lines = doc.splitTextToSize(safeText(item), contentWidth - 8);
        doc.text("-", margin + 2, ctx.yPosition);
        lines.forEach((line: string) => {
          ensurePageSpace(lineHeight + 1);
          setBaseFont();
          doc.text(safeText(line), margin + 8, ctx.yPosition);
          ctx.yPosition += lineHeight;
        });
      });
    },

    /**
     * Draws a thin horizontal separator line and advances the cursor.
     */
    drawSeparator(): void {
      ensurePageSpace(6);
      doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
      doc.setLineWidth(0.35);
      doc.line(margin, ctx.yPosition, pageWidth - margin, ctx.yPosition);
      ctx.yPosition += 5;
    },

    /**
     * Renders a ribbon-style section heading (navy background, white text).
     * Calls drawSeparator() first for consistent spacing.
     */
    addSectionHeading(_symbol: string, heading: string): void {
      // @ts-expect-error — drawSeparator is defined in this same factory
      this.drawSeparator();
      ensurePageSpace(13);
      doc.setFillColor(22, 78, 99);
      doc.roundedRect(margin, ctx.yPosition - 5, contentWidth, 10, 1.5, 1.5, "F");
      setBoldFont();
      doc.setFontSize(FONTS.heading);
      doc.setTextColor(255, 255, 255);
      doc.text(safeText(heading), margin + 4, ctx.yPosition + 1.5);
      doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
      setBaseFont();
      ctx.yPosition += 9;
    },
  };
}
