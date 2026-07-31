import type { PDFContext, PDFSection } from "../pdf-types";

/**
 * Renders a full-page divider that opens each appendix section (Canada only).
 *
 * The divider uses:
 * - Dark navy full-page background
 * - Giant letter watermark (A, B, or C)
 * - "APPENDIX X" label in accent cyan
 * - Multilingual title (en/tr/zh-Hans)
 * - English subtitle (regulatory note)
 *
 * Extracted from the original monolith (lines 1044-1097).
 */
export const drawAppendixDividerPage: PDFSection = (ctx: PDFContext): void => {
  const {
    doc,
    effectiveLocale,
    pageWidth,
    pageHeight,
    margin,
    contentWidth,
    COLORS,
    setBaseFont,
    setBoldFont,
    safeText,
  } = ctx;

  // Rendered via ctx.drawAppendixDividerPage(letter, titleEn, subtitleEn, titleTr, titleZh)
  // This is the internal rendering logic once called.
  // This section is invoked differently — see appendices.ts for the wrapper.
};

/**
 * Creates a factory that renders appendix divider pages.
 * Pass locale-aware title/subtitle strings when calling.
 */
export function createAppendixDividerHelper(ctx: PDFContext) {
  const {
    doc,
    effectiveLocale,
    pageWidth,
    pageHeight,
    margin,
    contentWidth,
    COLORS,
    setBaseFont,
    setBoldFont,
    safeText,
  } = ctx;

  return {
    render(
      letter: string,
      titleEn: string,
      subtitleEn: string,
      titleTr: string,
      titleZh: string,
    ): void {
      doc.addPage();

      // Navy full-page background
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, pageHeight, "F");

      // Accent stripe (left edge)
      doc.setFillColor(COLORS.accent.r, COLORS.accent.g, COLORS.accent.b);
      doc.rect(0, 0, 6, pageHeight, "F");

      // Giant letter watermark
      setBoldFont();
      doc.setFontSize(160);
      doc.setTextColor(30, 41, 59);
      doc.text(letter, pageWidth - margin - 5, pageHeight / 2 + 40, {
        align: "right",
      });

      // "APPENDIX X" label
      setBoldFont();
      doc.setFontSize(11);
      doc.setTextColor(COLORS.accent.r, COLORS.accent.g, COLORS.accent.b);
      const appendixLabel =
        effectiveLocale === "tr"
          ? `EK ${letter}`
          : effectiveLocale === "zh-Hans"
            ? `附录 ${letter}`
            : `APPENDIX ${letter}`;
      doc.text(safeText(appendixLabel), margin + 10, pageHeight / 2 - 30);

      // Title (locale-aware)
      setBoldFont();
      doc.setFontSize(28);
      doc.setTextColor(248, 250, 252);
      const title =
        effectiveLocale === "tr"
          ? titleTr
          : effectiveLocale === "zh-Hans"
            ? titleZh
            : titleEn;
      const titleLines = doc.splitTextToSize(safeText(title), contentWidth - 20);
      titleLines.forEach((line: string, i: number) => {
        doc.text(line, margin + 10, pageHeight / 2 - 16 + i * 14);
      });

      // Subtitle (English regulatory note — always English for legal accuracy)
      setBaseFont();
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184);
      const subLines = doc.splitTextToSize(safeText(subtitleEn), contentWidth - 20);
      subLines.forEach((line: string, i: number) => {
        doc.text(line, margin + 10, pageHeight / 2 + 14 + i * 7);
      });

      // Regulatory notice (always English)
      setBaseFont();
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(
        safeText(
          "Regulatory content is provided in English as the official language of IRCC and provincial bodies.",
        ),
        margin + 10,
        pageHeight - 30,
      );

      // LogiVisa brand
      setBoldFont();
      doc.setFontSize(9);
      doc.setTextColor(COLORS.accent.r, COLORS.accent.g, COLORS.accent.b);
      doc.text("LogiVisa", margin + 10, pageHeight - 18);

      // New page after divider
      doc.addPage();
      ctx.yPosition = 20;
    },
  };
}