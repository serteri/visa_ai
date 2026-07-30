import type { PDFContext, Alert } from "../pdf-types";

/**
 * Alert and warning box components for the PDF generator.
 *
 * These render colored alert boxes with titles, borders, and accent bars.
 * Used for risk indicators, critical compliance alerts, and informational notices.
 *
 * Extracted from the original monolith (lines 2048-2098 and scattered).
 */

export function createAlertHelpers(ctx: PDFContext) {
  const {
    doc,
    margin,
    contentWidth,
    COLORS,
    setBaseFont,
    setBoldFont,
    safeText,
    ensurePageSpace,
    addHeading,
    addSmallText,
  } = ctx;

  return {
    /**
     * Draws a collection of alert boxes (risk indicators, compliance warnings, etc.).
     *
     * @param title - Section heading
     * @param intro - Introduction text
     * @param items - Array of alerts with label, body, and severity level
     * @param tone - Visual tone: "risk" (red/amber) or "info" (neutral)
     */
    drawAlertCollection(
      title: string,
      intro: string,
      items: Alert[],
      tone: "risk" | "info",
    ): void {
      if (items.length === 0) return;
      addHeading(title);
      addSmallText(intro, 0);
      ctx.yPosition += 2;

      items.forEach((item) => {
        // Determine colors based on tone and level
        const accent =
          tone === "info"
            ? COLORS.accent
            : item.level === "high"
              ? COLORS.riskHigh
              : item.level === "medium"
                ? COLORS.riskMedium
                : COLORS.riskLow;

        const fill =
          tone === "info"
            ? { r: 236, g: 254, b: 255 } // light cyan
            : item.level === "high"
              ? { r: 254, g: 242, b: 242 } // light red
              : item.level === "medium"
                ? { r: 255, g: 251, b: 235 } // light amber
                : { r: 240, g: 253, b: 244 }; // light green

        const bodyLines = doc.splitTextToSize(safeText(item.body), contentWidth - 18);
        const boxHeight = Math.max(18, 12 + bodyLines.length * 4.4);
        ensurePageSpace(boxHeight + 4);

        // Draw box with accent left bar
        doc.setFillColor(fill.r, fill.g, fill.b);
        doc.setDrawColor(accent.r, accent.g, accent.b);
        doc.setLineWidth(0.25);
        doc.roundedRect(margin, ctx.yPosition, contentWidth, boxHeight, 2, 2, "FD");
        doc.setFillColor(accent.r, accent.g, accent.b);
        doc.rect(margin, ctx.yPosition, 2.5, boxHeight, "F");

        // Title
        setBoldFont();
        doc.setFontSize(9);
        doc.setTextColor(accent.r, accent.g, accent.b);
        doc.text(safeText(item.label), margin + 7, ctx.yPosition + 7);

        // Body
        setBaseFont();
        doc.setFontSize(8.5);
        doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
        doc.text(bodyLines, margin + 7, ctx.yPosition + 13, { lineHeightFactor: 1.18 });
        ctx.yPosition += boxHeight + 4;
      });
    },

    /**
     * Draws an "Action Required" box prompting user to fill missing data fields.
     * Used when critical input is missing for personalized sections.
     */
    drawActionRequiredBox(sectionLabel: string, requiredFields: string[]): void {
      const boxHeight = 28 + requiredFields.length * 5;
      ensurePageSpace(boxHeight + 6);

      const topY = ctx.yPosition;
      doc.setFillColor(254, 242, 242);
      doc.setDrawColor(COLORS.riskHigh.r, COLORS.riskHigh.g, COLORS.riskHigh.b);
      doc.setLineWidth(0.4);
      doc.roundedRect(margin, topY, contentWidth, boxHeight, 2, 2, "FD");
      doc.setFillColor(COLORS.riskHigh.r, COLORS.riskHigh.g, COLORS.riskHigh.b);
      doc.rect(margin, topY, 3, boxHeight, "F");

      setBoldFont();
      doc.setFontSize(10);
      doc.setTextColor(COLORS.riskHigh.r, COLORS.riskHigh.g, COLORS.riskHigh.b);
      doc.text(`⚠ Action Required: ${safeText(sectionLabel)}`, margin + 8, topY + 8);

      setBaseFont();
      doc.setFontSize(8.5);
      doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
      doc.text(
        doc.splitTextToSize(
          "This section cannot be personalized without additional data. Please provide:",
          contentWidth - 16,
        ),
        margin + 8,
        topY + 16,
      );

      let cursorY = topY + 22;
      requiredFields.forEach((field) => {
        doc.text(`• ${safeText(field)}`, margin + 12, cursorY);
        cursorY += 5;
      });

      ctx.yPosition = topY + boxHeight + 6;
    },

    /**
     * Draws a "Missing Information" box listing data gaps in the user's input.
     */
    drawMissingInfoBox(): void {
      if (!ctx.report.missingInformation || ctx.report.missingInformation.length === 0) return;

      ensurePageSpace(18);
      addHeading(ctx.text.missingInformation || "Missing Information");
      addSmallText(
        "The following details would improve the accuracy of this assessment:",
        0,
      );
      ctx.yPosition += 2;

      ctx.report.missingInformation.forEach((item) => {
        setBaseFont();
        doc.setFontSize(8.5);
        doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
        const lines = doc.splitTextToSize(safeText(item), contentWidth - 12);
        ensurePageSpace(5 + lines.length * 4.4);
        doc.text("−", margin + 2, ctx.yPosition);
        doc.text(lines, margin + 8, ctx.yPosition);
        ctx.yPosition += 5 + (lines.length - 1) * 4.4;
      });

      ctx.yPosition += 3;
    },

    /**
     * Draws a "Sparse Data Disclaimer" notice when critical input fields are absent.
     */
    drawSparseDataDisclaimer(): void {
      if (!ctx.report.sparseDataDisclaimer) return;

      ensurePageSpace(16);
      const boxHeight = 14;
      doc.setFillColor(255, 251, 235);
      doc.setDrawColor(COLORS.riskMedium.r, COLORS.riskMedium.g, COLORS.riskMedium.b);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, ctx.yPosition, contentWidth, boxHeight, 2, 2, "FD");

      setBaseFont();
      doc.setFontSize(8);
      doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
      const lines = doc.splitTextToSize(
        safeText(ctx.report.sparseDataDisclaimer),
        contentWidth - 12,
      );
      doc.text(lines, margin + 6, ctx.yPosition + 6);
      ctx.yPosition += boxHeight + 5;
    },
  };
}
