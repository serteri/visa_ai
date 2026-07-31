import type { PDFContext, PDFSection } from "../pdf-types";

/**
 * Renders the State Nomination Tracker table.
 *
 * Lists all states/provinces with their nomination status,
 * match percentage, and requirements notes. Uses color-coded
 * percentage cells (green/amber/red) via drawTable's getCellColor.
 *
 * Extracted from the original monolith (lines 3465-3497).
 */
export const drawStateNominationTable: PDFSection = (ctx: PDFContext): void => {
  const {
    report,
    text,
    addHeading,
    addSmallText,
    drawTable,
    drawPartialDataWarning,
  } = ctx;

  const states = report.stateNominationTracker?.states ?? [];
  if (states.length === 0) return;

  addHeading(
    report.country === "CA"
      ? text.stateNominationTrackerCanada
      : text.stateNominationTracker,
  );
  drawPartialDataWarning();
  addSmallText(
    report.country === "CA"
      ? (report.stateNominationTracker?.note ?? "")
      : text.stateTrackerIntro,
    0,
  );
  ctx.yPosition += 2;

  drawTable(
    [text.stateCode, text.stateStatus, text.stateMatch, text.note],
    states.map((state) => {
      const note = state.requirements.slice(0, 2).join("; ") || state.summary;
      return [
        state.name ? `${state.code} ${state.name}` : state.code,
        state.status,
        `${String(state.score)}%`,
        note,
      ];
    }),
    [0.15, 0.27, 0.13, 0.45],
    (rowIndex: number, colIndex: number) => {
      if (colIndex !== 2) return null;
      const state = states[rowIndex];
      return state ? stateMatchColor(state.matchLevel, ctx.COLORS) : null;
    },
  );

  if (report.stateNominationTracker?.note) {
    addSmallText(report.stateNominationTracker.note, 2);
    ctx.yPosition += 2;
  }
};

function stateMatchColor(
  matchLevel: "high" | "medium" | "low",
  COLORS: { riskHigh: { r: number; g: number; b: number }; riskMedium: { r: number; g: number; b: number }; riskLow: { r: number; g: number; b: number } },
) {
  if (matchLevel === "high") return COLORS.riskLow;
  if (matchLevel === "medium") return COLORS.riskMedium;
  return COLORS.riskHigh;
}