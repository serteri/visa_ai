import type { PDFContext, PDFSection } from "../pdf-types";

/**
 * Renders the Progression Pathways section.
 *
 * Shows primary and alternative visa progression routes for the applicant,
 * with explanations for each pathway.
 *
 * Extracted from the original monolith (lines 4021-4064) with multi-language
 * support for section labels and pathway descriptions.
 */
export const drawProgressionPathways: PDFSection = (ctx: PDFContext): void => {
  const {
    report,
    text,
    effectiveLocale,
    addHeading,
    addSmallText,
    addBody,
  } = ctx;

  if (report.progressionPathways.length === 0) return;

  addHeading(text.progressionPathways);
  addSmallText(text.progressionPathwaysIntro, 0);

  const primaryPathways = report.progressionPathways.filter((p) => !p.isAlternative);
  const alternativePathways = report.progressionPathways.filter((p) => p.isAlternative);

  // Primary pathways
  if (primaryPathways.length > 0) {
    addSmallText(
      effectiveLocale === "tr"
        ? "Profiliniz için en uygun birincil geçiş yolları:"
        : effectiveLocale === "zh-Hans"
          ? "为您推荐的主要过渡路径："
          : "Primary progression pathways for your profile:",
      0,
    );
    primaryPathways.forEach((item) => {
      addBody(`${item.label}: ${item.from} -> ${item.to}`);
      addSmallText(item.explanation, 4);
    });
    ctx.yPosition += 1;
  }

  // Alternative pathways
  if (alternativePathways.length > 0) {
    if (primaryPathways.length > 0) {
      ctx.yPosition += 2;
    }
    addSmallText(
      effectiveLocale === "tr"
        ? "Diğer olası veya alternatif geçiş yolları:"
        : effectiveLocale === "zh-Hans"
          ? "其他可能的替代或候选过渡路径："
          : "Other potential or alternative progression pathways:",
      0,
    );
    alternativePathways.forEach((item) => {
      addBody(`${item.label}: ${item.from} -> ${item.to}`);
      addSmallText(item.explanation, 4);
    });
  }

  ctx.yPosition += 3;
};
