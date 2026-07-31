import type { PDFContext, PDFSection } from "../pdf-types";

/**
 * Renders the Financial Roadmap section with expanded context.
 *
 * Shows a detailed table of all costs associated with the immigration
 * process, plus an explanatory intro and closing notes.
 *
 * Expanded from the original monolith (lines 4011-4019) with additional
 * context and multi-language support.
 */
export const drawFinancialRoadmap: PDFSection = (ctx: PDFContext): void => {
  const {
    report,
    text,
    effectiveLocale,
    addSectionHeading,
    addHeading,
    addSmallText,
    addBody,
    drawTable,
    cleanNum,
    yPosition,
  } = ctx;

  if (report.financialRoadmap.length === 0) return;

  addSectionHeading("", text.financialRoadmap);

  // Expanded intro with context
  const introText = effectiveLocale === "tr"
    ? "Aşağıda vize başvuru sürecinde beklenen tüm mali kalemler listelenmektedir. Tutarlar yaklaşık değerlerdir ve değişiklik gösterebilir."
    : effectiveLocale === "zh-Hans"
      ? "以下列出了签证申请过程中预计的所有费用项目。金额为近似值，可能会有变动。"
      : "Below is a comprehensive breakdown of all expected costs throughout the immigration process. Amounts are estimates and may vary.";

  addSmallText(introText, 0);
  addSmallText(text.financialRoadmapIntro, 0);
  ctx.yPosition += 2;

  // Cost table
  const headers = [
    effectiveLocale === "tr" ? "Kategori" : effectiveLocale === "zh-Hans" ? "类别" : text.category,
    effectiveLocale === "tr" ? "Tutar" : effectiveLocale === "zh-Hans" ? "金额" : text.amount,
    effectiveLocale === "tr" ? "Not" : effectiveLocale === "zh-Hans" ? "备注" : text.note,
  ];

  drawTable(
    headers,
    report.financialRoadmap.map((item) => [
      cleanNum(item.category),
      cleanNum(item.amountLabel),
      cleanNum(item.explanation),
    ]),
    [0.28, 0.2, 0.52],
  );

  // Closing note with advice
  const closingNote = effectiveLocale === "tr"
    ? "Not: Yukarıdaki tutarlar yaklaşık değerlerdir. Güncel ücretler için ilgili kurumların resmi web sitelerini kontrol edin. Bütçenizi her zaman %10-15 fazlasıyla planlayın."
    : effectiveLocale === "zh-Hans"
      ? "注意：以上金额为近似值。请查阅相关机构官方网站获取最新费用。建议预算预留10-15%的额外资金。"
      : "Note: Amounts above are estimates. Check official websites of relevant authorities for current fees. Always budget 10-15% above the estimated total.";

  addSmallText(closingNote, 2);
  ctx.yPosition += 3;
};
