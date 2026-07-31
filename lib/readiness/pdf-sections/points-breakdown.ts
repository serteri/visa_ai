import type { PDFContext, PDFSection } from "../pdf-types";

/**
 * Renders the Points Breakdown table with total score and minimum threshold.
 *
 * Shows a category-by-category breakdown of the applicant's points estimate,
 * including a total row and occupation note if present.
 *
 * Expanded from the original monolith (lines 3773-3819) with multi-language
 * support for section labels and closing advice.
 */
export const drawPointsBreakdown: PDFSection = (ctx: PDFContext): void => {
  const {
    report,
    text,
    effectiveLocale,
    doc,
    margin,
    COLORS,
    FONTS,
    addHeading,
    addSmallText,
    addBody,
    addPremiumKeyValueContainer,
    drawTable,
    safeText,
    cleanNum,
    ensurePageSpace,
    setBaseFont,
    setBoldFont,
    lineHeight,
  } = ctx;

  if (report.pointsEstimate && report.pointsEstimate.breakdown.length > 0) {
    addHeading(text.pointsBreakdownTable);
    addSmallText(text.pointsBreakdownIntro, 0);

    const breakdownRows = report.pointsEstimate.breakdown;
    drawTable(
      [
        effectiveLocale === "tr" ? "Kategori" : effectiveLocale === "zh-Hans" ? "类别" : text.category,
        effectiveLocale === "tr" ? "Kazanılan" : effectiveLocale === "zh-Hans" ? "已得分" : text.pointsEarned,
        effectiveLocale === "tr" ? "Maks." : effectiveLocale === "zh-Hans" ? "最高" : text.maxPoints,
        effectiveLocale === "tr" ? "Not" : effectiveLocale === "zh-Hans" ? "备注" : text.note,
      ],
      breakdownRows.map((item) => [
        item.label,
        String(item.points),
        item.max !== undefined ? String(item.max) : "—",
        item.note ?? "",
      ]),
      [0.24, 0.14, 0.14, 0.48],
    );

    // Total score row
    const total = report.pointsEstimate.estimatedPoints;
    if (total !== undefined) {
      setBoldFont();
      doc.setFontSize(FONTS.body);
      doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      ensurePageSpace(lineHeight + 2);
      doc.text(
        safeText(
          `${effectiveLocale === "tr" ? "Toplam" : effectiveLocale === "zh-Hans" ? "总分" : text.totalRow}: ${total} pts (65 ${effectiveLocale === "tr" ? "minimum" : effectiveLocale === "zh-Hans" ? "最低要求" : text.minimumRequired})`,
        ),
        margin,
        ctx.yPosition,
      );
      ctx.yPosition += lineHeight + 2;
      setBaseFont();
    }

    // Occupation note
    if (report.pointsEstimate.occupationNote) {
      addSmallText(cleanNum(report.pointsEstimate.occupationNote), 0);
    }
    ctx.yPosition += 2;
  } else {
    // Fallback: show primary limiting factor as key-value container
    addPremiumKeyValueContainer(
      text.primaryLimitingFactor,
      [
        [text.primaryLimitingFactor, report.primaryLimitingFactor.label],
        [text.realityCheck, report.primaryLimitingFactor.explanation],
      ],
      COLORS.riskMedium,
    );
  }

  // Position changers (factors that could improve score)
  if (report.positionChangers.length > 0) {
    addHeading(text.positionChangers);
    report.positionChangers.forEach((item) => {
      addBody(item.label);
      addSmallText(item.explanation, 4);
    });
    ctx.yPosition += 3;
  }
};
