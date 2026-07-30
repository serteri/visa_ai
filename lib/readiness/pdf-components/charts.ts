import type { PDFContext, ColorRGB } from "../pdf-types";

/**
 * Chart components for the PDF generator.
 *
 * Renders data visualizations:
 * - drawCrsBarChart: CA CRS cutoffs bar chart (last 6 draws)
 *
 * Each chart is a self-contained card with:
 * - Header strip
 * - Data visualization
 * - Optional footer notes
 *
 * Extracted from the original monolith (lines 2544-2637).
 */

export function createChartHelpers(ctx: PDFContext) {
  const {
    doc,
    margin,
    contentWidth,
    COLORS,
    setBaseFont,
    setBoldFont,
    safeText,
    effectiveLocale,
    ensurePageSpace,
  } = ctx;

  return {
    /**
     * Renders a horizontal bar chart of recent CRS cutoffs by category
     * (Canada only). Uses approximate IRCC averages for the last 6 draws.
     */
    drawCrsBarChart(): void {
      if (ctx.report.country !== "CA") return;

      const boxH = 102;
      ensurePageSpace(boxH + 8);
      const topY = ctx.yPosition;

      // Card background
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.35);
      doc.roundedRect(margin, topY, contentWidth, boxH, 2.5, 2.5, "FD");

      // Header strip
      doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      doc.roundedRect(margin, topY, contentWidth, 12, 2.5, 2.5, "F");
      doc.rect(margin, topY + 6, contentWidth, 6, "F");

      setBoldFont();
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      const chartTitle =
        effectiveLocale === "tr"
          ? "Son CRS Kesim Puanı Trendleri"
          : effectiveLocale === "zh-Hans"
            ? "近期CRS录取分数线趋势"
            : "Recent CRS Cutoff Trends";
      doc.text(safeText(chartTitle), margin + 5, topY + 8.5);

      setBaseFont();
      doc.setFontSize(6.5);
      doc.setTextColor(200, 218, 255);
      const chartSub =
        effectiveLocale === "tr"
          ? "Kategori bazında yaklaşık son 6 çekim (IRCC verilerine dayanır)"
          : effectiveLocale === "zh-Hans"
            ? "各类别近6次抽签近似值（基于IRCC数据）"
            : "Approx. category cutoffs — last 6 draws (based on IRCC data)";
      doc.text(safeText(chartSub), margin + 5, topY + 15);

      // Bar chart data — approximate real values from recent IRCC draws
      const categories: Array<{ label: string; score: number; color: ColorRGB }> = [
        {
          label:
            effectiveLocale === "tr"
              ? "Genel Havuz"
              : effectiveLocale === "zh-Hans"
                ? "综合池"
                : "General Pool",
          score: 489,
          color: { r: 59, g: 130, b: 246 },
        },
        {
          label:
            effectiveLocale === "tr"
              ? "Sağlık Çalışanları"
              : effectiveLocale === "zh-Hans"
                ? "医疗保健类"
                : "Healthcare Workers",
          score: 441,
          color: { r: 16, g: 185, b: 129 },
        },
        {
          label:
            effectiveLocale === "tr"
              ? "Fransızca Yetkinlik"
              : effectiveLocale === "zh-Hans"
                ? "法语能力"
                : "French Language",
          score: 388,
          color: { r: 139, g: 92, b: 246 },
        },
        {
          label:
            effectiveLocale === "tr"
              ? "Meslekler (Vasıflı)"
              : effectiveLocale === "zh-Hans"
                ? "技术工种"
                : "Trade Occupations",
          score: 362,
          color: { r: 245, g: 158, b: 11 },
        },
        {
          label:
            effectiveLocale === "tr"
              ? "Tarım & Gıda"
              : effectiveLocale === "zh-Hans"
                ? "农业及食品"
                : "Agriculture & Agri-food",
          score: 328,
          color: { r: 107, g: 114, b: 128 },
        },
      ];

      const labelW = 50;
      const valueW = 18;
      const barAreaX = margin + labelW + 5;
      const barAreaW = contentWidth - labelW - valueW - 12;
      const minScore = 280;
      const maxScore = 540;
      const rowH = 13;
      const barH = 7;

      // Y-axis reference lines (light grid)
      [400, 450, 500].forEach((ref) => {
        const xRef = barAreaX + (barAreaW * (ref - minScore)) / (maxScore - minScore);
        doc.setDrawColor(230, 235, 245);
        doc.setLineWidth(0.2);
        doc.line(xRef, topY + 18, xRef, topY + 18 + categories.length * rowH);
        doc.setFontSize(5.5);
        setBaseFont();
        doc.setTextColor(180, 190, 210);
        doc.text(String(ref), xRef, topY + 17, { align: "center" });
      });

      categories.forEach((cat, i) => {
        const rowY = topY + 19 + i * rowH;
        const barFrac = Math.max(0.02, Math.min(1, (cat.score - minScore) / (maxScore - minScore)));
        const barW = barAreaW * barFrac;

        // Row label
        setBaseFont();
        doc.setFontSize(6.8);
        doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
        const labelLines = doc.splitTextToSize(safeText(cat.label), labelW - 4);
        doc.text(labelLines[0] ?? "", margin + 4, rowY + barH - 0.5);

        // Bar track
        doc.setFillColor(236, 240, 248);
        doc.roundedRect(barAreaX, rowY, barAreaW, barH, 1, 1, "F");

        // Bar fill
        doc.setFillColor(cat.color.r, cat.color.g, cat.color.b);
        doc.roundedRect(barAreaX, rowY, barW, barH, 1, 1, "F");

        // Score label
        setBoldFont();
        doc.setFontSize(7.2);
        doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
        doc.text(String(cat.score), barAreaX + barAreaW + 3, rowY + barH - 0.5);
      });

      // Footer note
      setBaseFont();
      doc.setFontSize(6);
      doc.setTextColor(COLORS.lightText.r, COLORS.lightText.g, COLORS.lightText.b);
      const footerNote =
        effectiveLocale === "tr"
          ? "* PNP adaylığı +600 CRS puan ekleyerek rekabeti pratik olarak ortadan kaldırır. Veriler yaklaşık IRCC ortalamalarına dayanır."
          : effectiveLocale === "zh-Hans"
            ? "* 省提名可+600分，实际消除积分竞争。数据为基于IRCC的近似平均值。"
            : "* PNP nomination adds +600 CRS, effectively eliminating the points competition. Values are approximate IRCC averages.";

      const noteLines = doc.splitTextToSize(safeText(footerNote), contentWidth - 10);
      noteLines.slice(0, 2).forEach((line: string, i: number) => {
        doc.text(line, margin + 5, topY + boxH - 7 + i * 4);
      });

      doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
      doc.setLineWidth(0.3);
      ctx.yPosition = topY + boxH + 6;
    },

    /**
     * Placeholder for PNP heatmap. Full implementation stays in main file
     * until we extract it.
     */
    drawPnpHeatmap(): void {
      // TODO: Extract from monolith lines ~2640-2780
    },

    /**
     * Placeholder for state nomination radar.
     */
    drawStateRadar(): void {
      // TODO: Extract from monolith lines ~3373-3464
    },

    /**
     * Placeholder for Gantt timeline.
     */
    drawGanttTimeline(): void {
      // TODO: Extract from monolith lines ~2180-2276
    },
  };
}
