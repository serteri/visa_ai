import type { PDFContext } from "../pdf-types";

/**
 * Renders a greyed-out chart placeholder when critical profile data is missing.
 *
 * Shows:
 * - Muted header strip with section title
 * - Fake greyed bars mimicking a chart skeleton
 * - "DATA NEEDED" badge
 * - Unlock instruction text
 *
 * Extracted from the original monolith (lines 2477-2542) with multi-language
 * support for badge and instruction text.
 */
export function createVisualPlaceholderHelper(ctx: PDFContext) {
  const {
    doc,
    margin,
    contentWidth,
    effectiveLocale,
    COLORS,
    setBaseFont,
    setBoldFont,
    safeText,
    ensurePageSpace,
  } = ctx;

  return {
    drawVisualPlaceholder(sectionTitle: string): void {
      const boxH = 72;
      ensurePageSpace(boxH + 8);
      const topY = ctx.yPosition;

      // Greyed outer box
      doc.setFillColor(247, 248, 250);
      doc.setDrawColor(210, 214, 222);
      doc.setLineWidth(0.5);
      doc.roundedRect(margin, topY, contentWidth, boxH, 2.5, 2.5, "FD");

      // Header strip (muted)
      doc.setFillColor(210, 214, 222);
      doc.roundedRect(margin, topY, contentWidth, 12, 2.5, 2.5, "F");
      doc.rect(margin, topY + 6, contentWidth, 6, "F");
      setBoldFont();
      doc.setFontSize(9);
      doc.setTextColor(120, 128, 145);
      doc.text(safeText(sectionTitle), margin + 5, topY + 8.5);

      // Fake greyed bars
      const barAreaX = margin + 52;
      const barAreaW = contentWidth - 68;
      const barH = 5.5;
      const fakeBars = [0.82, 0.61, 0.47, 0.36, 0.27];
      fakeBars.forEach((w, i) => {
        const barY = topY + 16 + i * 9;
        doc.setFillColor(220, 222, 228);
        doc.roundedRect(margin + 4, barY, 44, barH, 1, 1, "F");
        doc.setFillColor(228, 230, 236);
        doc.roundedRect(barAreaX, barY, barAreaW, barH, 1, 1, "F");
        doc.setFillColor(215, 218, 226);
        doc.roundedRect(barAreaX, barY, barAreaW * w, barH, 1, 1, "F");
      });

      // "DATA NEEDED" badge
      const badgeW = 60;
      const badgeH = 13;
      const badgeX = margin + (contentWidth - badgeW) / 2;
      const badgeY = topY + 28;
      doc.setFillColor(99, 102, 241);
      doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 2.5, 2.5, "F");
      setBoldFont();
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      const dataNeededLabel =
        effectiveLocale === "tr"
          ? "VERİ GEREKLİ"
          : effectiveLocale === "zh-Hans"
            ? "需要数据"
            : "DATA NEEDED";
      doc.text(safeText(dataNeededLabel), margin + contentWidth / 2, badgeY + 9, {
        align: "center",
      });

      // Unlock instruction
      setBaseFont();
      doc.setFontSize(7);
      doc.setTextColor(130, 138, 155);
      const unlockMsg =
        effectiveLocale === "tr"
          ? "Bu grafiği etkinleştirmek için başvuru formunuzu tamamlayın."
          : effectiveLocale === "zh-Hans"
            ? "请补充申请表中的关键字段以解锁此图表。"
            : "Complete your intake form to unlock this chart.";
      const unlockLines = doc.splitTextToSize(safeText(unlockMsg), contentWidth - 16);
      unlockLines.slice(0, 2).forEach((line: string, i: number) => {
        doc.text(line, margin + contentWidth / 2, topY + boxH - 8 + i * 4.5, {
          align: "center",
        });
      });

      ctx.yPosition = topY + boxH + 6;
    },
  };
}
