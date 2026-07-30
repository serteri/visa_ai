import type { PDFContext, PDFSection } from "../pdf-types";

/**
 * Renders the glossary section of the PDF report.
 *
 * Lists key immigration terms with their definitions, using the same
 * confidence/friction/strength vocab that the rest of the report uses.
 * All labels are locale-aware via the text object.
 *
 * Extracted from the original monolith (lines 2023-2046).
 */
export const drawGlossary: PDFSection = (ctx: PDFContext): void => {
  const { text, effectiveLocale, addHeading, addBody, addSmallText } = ctx;

  addHeading(text.glossaryTitle);
  addSmallText(text.glossaryIntro, 0);
  ctx.yPosition += 2;

  const entries: Array<[string, string]> = [
    [text.glossaryTermConfidence, text.definitionConfidence],
    [text.glossaryTermStrength, text.definitionStrength],
    [text.glossaryTermFriction, text.definitionFriction],
    [text.glossaryTermSignalConfidence, text.definitionSignalConfidence],
    [text.glossaryTermEvidenceLoad, text.definitionEvidenceLoad],
    [text.glossaryTermEvidenceStatus, text.definitionEvidenceStatus],
    [text.glossaryTermPointsGap, text.definitionPointsGap],
    [text.glossaryTermHardGate, text.definitionHardGate],
  ];

  entries.forEach(([term, definition]) => {
    addBody(term);
    addSmallText(definition, 4);
    ctx.yPosition += 1;
  });

  ctx.yPosition += 3;
};
