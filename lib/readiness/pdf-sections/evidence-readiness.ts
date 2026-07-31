import type { PDFContext, PDFSection } from "../pdf-types";

/**
 * Renders the Evidence Readiness Snapshot section.
 *
 * Lists each evidence category with its status (provided/missing/unclear)
 * and a brief explanation.
 *
 * Extracted from the original monolith (lines 3969-3976) with multi-language
 * support.
 */
export const drawEvidenceReadiness: PDFSection = (ctx: PDFContext): void => {
  const { report, text, addHeading, addBody, addSmallText } = ctx;

  if (report.evidenceReadiness.length === 0) return;

  addHeading(text.evidenceReadiness);
  report.evidenceReadiness.forEach((item) => {
    addBody(`${item.category}: ${ctx.formatEvidenceStatus(item.status)}`);
    addSmallText(item.explanation, 4);
  });
  ctx.yPosition += 3;
};
