import type { PDFContext, PDFSection } from "../pdf-types";

/**
 * Renders the Family Living Costs section (Canada only).
 *
 * Shows monthly living cost projections for both single adults and
 * families-of-3, side-by-side in a comparison table.
 *
 * Extracted from the original monolith (lines 2780-2817).
 */
export const drawFamilyLivingCosts: PDFSection = (ctx: PDFContext): void => {
  const { report, text, addSectionHeading, drawTable, addSmallText, cleanNum } = ctx;

  if (report.country !== "CA") return;

  const single = report.premiumSections?.livingCostProjection;
  const family = report.livingCostFamily;
  if (!single && !family) return;

  addSectionHeading("", text.livingCostProjection);

  const rows: string[][] = [];
  if (single) {
    rows.push([
      text.livingCostSingle,
      cleanNum(`${single.currency} ${single.monthly.rent}`),
      cleanNum(`${single.currency} ${single.monthly.groceries}`),
      cleanNum(`${single.currency} ${single.monthly.transport}`),
      cleanNum(`${single.currency} ${single.monthly.total}`),
    ]);
  }
  if (family) {
    rows.push([
      text.livingCostFamily,
      cleanNum(`${family.currency} ${family.monthly.rent}`),
      cleanNum(`${family.currency} ${family.monthly.groceries}`),
      cleanNum(`${family.currency} ${family.monthly.transport}`),
      cleanNum(`${family.currency} ${family.monthly.total}`),
    ]);
  }

  const headers = [
    text.livingCostProfileLabel,
    text.monthlyRent,
    text.monthlyGroceries,
    text.monthlyTransport,
    text.monthlyTotal,
  ];

  drawTable(headers, rows, [0.22, 0.19, 0.19, 0.19, 0.21]);
  addSmallText(text.livingCostBothNote, 2);
  ctx.yPosition += 3;
};
