import type { PDFContext, PDFSection } from "../pdf-types";

/**
 * Renders the Report Overview section with:
 * - Title and advisory intro
 * - Two-column card layout (User Info + Executive Summary)
 * - Dynamic confidence badge (HIGH/LOW)
 *
 * Expanded from the original monolith (lines 1894-2015) with multi-language
 * support for all labels.
 */
export const drawReportOverview: PDFSection = (ctx: PDFContext): void => {
  const {
    report,
    text,
    locale,
    effectiveLocale,
    userInputSummary,
    doc,
    margin,
    contentWidth,
    COLORS,
    addSmallText,
    setBaseFont,
    setBoldFont,
    safeText,
    ensurePageSpace,
    clipToWidth,
  } = ctx;

  const reportDate = new Intl.DateTimeFormat(locale, {
    timeZone: "Australia/Brisbane",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(new Date());

  const rawEng = userInputSummary.englishLevel;
  const resolvedEnglishLevel =
    !rawEng ||
    rawEng.trim() === "" ||
    rawEng.toLowerCase() === "none" ||
    rawEng.toLowerCase() === "unset"
      ? text.notProvided
      : rawEng;

  // Left column: User info rows
  const rawLeftRows: Array<[string, string | undefined]> = [
    [text.generatedDate, reportDate],
    [text.nameLabel, userInputSummary.name],
    [text.occupationLabel, userInputSummary.occupation],
    [text.ageLabel, userInputSummary.age],
    [text.currentCountryLabel, userInputSummary.currentCountry],
    [text.englishLevelLabel, resolvedEnglishLevel],
    [text.goalLabel, userInputSummary.mainGoal],
  ];
  const leftRows = rawLeftRows.filter(
    (row): row is [string, string] => Boolean(row[1]),
  );

  // Layout constants
  const colGap = 8;
  const leftW = 68;
  const rightW = contentWidth - leftW - colGap;
  const summaryLines = report.executiveSummary.flatMap((item) =>
    doc.splitTextToSize(safeText(item), rightW - 12),
  );
  const leftHeight = Math.max(54, 16 + leftRows.length * 8);
  const rightHeight = Math.max(54, 18 + summaryLines.length * 4.3);
  const boxHeight = Math.max(leftHeight, rightHeight);
  ensurePageSpace(boxHeight + 18);

  // Title
  setBoldFont();
  doc.setFontSize(17);
  doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.text(safeText(text.title), margin, ctx.yPosition);
  ctx.yPosition += 8;
  addSmallText(text.advisoryIntro, 0);
  ctx.yPosition += 3;

  // Two-column card
  const cardY = ctx.yPosition;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, cardY, leftW, boxHeight, 2, 2, "FD");
  doc.roundedRect(margin + leftW + colGap, cardY, rightW, boxHeight, 2, 2, "FD");

  // Header strips
  doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.roundedRect(margin, cardY, leftW, 10, 2, 2, "F");
  doc.roundedRect(margin + leftW + colGap, cardY, rightW, 10, 2, 2, "F");

  setBoldFont();
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(safeText(text.userInfo), margin + 4, cardY + 6.5);
  doc.text(
    safeText(text.executiveSummary),
    margin + leftW + colGap + 4,
    cardY + 6.5,
  );

  // Left column: user info rows
  let rowY = cardY + 17;
  leftRows.forEach(([label, value]) => {
    setBoldFont();
    doc.setFontSize(7.6);
    doc.setTextColor(COLORS.lightText.r, COLORS.lightText.g, COLORS.lightText.b);
    doc.text(safeText(label), margin + 4, rowY);
    setBaseFont();
    doc.setFontSize(8.2);
    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
    doc.text(
      safeText(clipToWidth(String(value), leftW - 31)),
      margin + 30,
      rowY,
    );
    rowY += 8;
  });

  // Right column: executive summary
  let summaryY = cardY + 17;
  report.executiveSummary.slice(0, 5).forEach((item) => {
    const lines = doc.splitTextToSize(safeText(item), rightW - 14);
    doc.setFillColor(COLORS.accent.r, COLORS.accent.g, COLORS.accent.b);
    doc.circle(margin + leftW + colGap + 5, summaryY - 1.4, 0.9, "F");
    setBaseFont();
    doc.setFontSize(8.2);
    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
    doc.text(lines, margin + leftW + colGap + 9, summaryY, {
      lineHeightFactor: 1.18,
    });
    summaryY += lines.length * 4.3 + 3;
  });

  ctx.yPosition = cardY + boxHeight + 8;

  // Confidence badge
  if (report.confidenceScore) {
    const isHigh = report.confidenceScore === "HIGH";
    const confLabel =
      effectiveLocale === "tr"
        ? isHigh
          ? "Güven: YÜKSEK"
          : "Güven: DÜŞÜK"
        : effectiveLocale === "zh-Hans"
          ? isHigh
            ? "置信度：高"
            : "置信度：低"
          : isHigh
            ? "Confidence: HIGH"
            : "Confidence: LOW";

    const confDesc =
      effectiveLocale === "tr"
        ? isHigh
          ? "Tüm kritik profil alanları sağlandı. Bu analiz kişiselleştirilmiştir."
          : "Kritik profil verileri eksik. Bu analiz kişiselleştirilemiyor."
        : effectiveLocale === "zh-Hans"
          ? isHigh
            ? "所有关键档案字段均已提供。此分析已个性化。"
            : "关键档案数据缺失。此分析无法个性化。"
          : isHigh
            ? "All critical profile fields are present. This analysis is personalized."
            : "Vital profile data is missing. This analysis cannot be personalized.";

    ensurePageSpace(12);
    doc.setFillColor(
      isHigh ? 240 : 254,
      isHigh ? 253 : 242,
      isHigh ? 244 : 242,
    );
    doc.setDrawColor(
      isHigh ? 22 : 220,
      isHigh ? 163 : 38,
      isHigh ? 74 : 38,
    );
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, ctx.yPosition, contentWidth, 10, 1.5, 1.5, "FD");

    setBoldFont();
    doc.setFontSize(8.5);
    doc.setTextColor(
      isHigh ? 21 : 185,
      isHigh ? 128 : 28,
      isHigh ? 61 : 28,
    );
    doc.text(safeText(confLabel), margin + 4, ctx.yPosition + 4);
    setBaseFont();
    doc.setFontSize(7.5);
    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
    doc.text(safeText(confDesc), margin + 50, ctx.yPosition + 4);

    ctx.yPosition += 13;
    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
    doc.setLineWidth(0.3);
  }
};
