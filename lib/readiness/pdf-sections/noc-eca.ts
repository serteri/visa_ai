import type { PDFContext, PDFSection } from "../pdf-types";

/**
 * Renders the NOC / TEER / ECA section (Canada only).
 *
 * Shows occupation classification, NOC code, eligible pathways,
 * and ECA (Educational Credential Assessment) requirements.
 *
 * Extracted from the original monolith (lines 2430-2472).
 */
export const drawNocEcaSection: PDFSection = (ctx: PDFContext): void => {
  const {
    report,
    text,
    effectiveLocale,
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

  const occ = report.occupationIndication;

  addSectionHeading("", text.nocEcaSection);

  if (!occ) {
    setBaseFont();
    doc.setFontSize(FONTS.small);
    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
    ensurePageSpace(8);

    const placeholder =
      effectiveLocale === "tr"
        ? "Meslek: [Seçim Bekleniyor] — Detaylı NOC görev tanımları ve ECA gereksinimlerini görüntülemek için lütfen başvuru formundaki NOC aramasını tamamlayın."
        : effectiveLocale === "zh-Hans"
          ? "职业：[待选] — 请在申请表中完成 NOC 查找，以解锁详细的 NOC 职责说明和 ECA 要求。"
          : "Occupation: [Pending Selection] — Please complete the NOC lookup in the intake form to unlock detailed NOC-specific duties and ECA requirements.";

    const wrapped = doc.splitTextToSize(safeText(placeholder), contentWidth);
    wrapped.forEach((line: string) => {
      doc.text(line, margin, ctx.yPosition);
      ctx.yPosition += 4.5;
    });
    ctx.yPosition += 3;
    return;
  }

  if (occ.occupation) {
    setBoldFont();
    doc.setFontSize(FONTS.body);
    doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    ensurePageSpace(8);
    doc.text(safeText(occ.occupation), margin, ctx.yPosition);
    ctx.yPosition += 5;
  }

  if (occ.matches.length > 0) {
    setBaseFont();
    doc.setFontSize(FONTS.small);
    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
    occ.matches.forEach((m) => {
      ensurePageSpace(5);
      doc.text(
        safeText(
          `• ${m.title} — ${
            effectiveLocale === "tr"
              ? "Uygun yollar"
              : effectiveLocale === "zh-Hans"
                ? "符合条件的途径"
                : "Eligible pathways"
          }: ${m.relevantVisas.join(", ")}`,
        ),
        margin + 2,
        ctx.yPosition,
      );
      ctx.yPosition += 4.5;
    });
  }

  addSmallText(occ.note, 2);
  ctx.yPosition += 3;
};