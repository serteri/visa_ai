import type { FinancialRoadmapItem } from "./types";

/**
 * The Financial Roadmap line items that make up the "Estimated total" the
 * personalized FAQ and Application Guide quote -- matches what those two
 * sections' cost breakdown always meant to cover (VAC, skills assessment,
 * English test, medical, police), not the whole roadmap (NAATI translation
 * and RMA/lawyer fees are optional/variable and were never part of either
 * section's old hardcoded total either).
 */
const TOTAL_KINDS: ReadonlyArray<NonNullable<FinancialRoadmapItem["kind"]>> = [
  "vac",
  "skills_assessment",
  "english_test",
  "medical",
  "police",
];

export type FinancialRoadmapTotal = {
  min: number;
  max: number;
  /** True only if every core item resolved to a real number. */
  complete: boolean;
};

/**
 * Sums the min/max of the core Financial Roadmap items by `kind`, so the
 * FAQ, the Application Guide, and the Financial Roadmap section itself all
 * quote one total instead of three independently hardcoded ranges (Phase 1
 * report consistency fix, item D3). Returns null if none of the core items
 * are present in this report at all (e.g. a partner-pathway report with no
 * points-tested Financial Roadmap items).
 */
export function computeEstimatedTotalAud(
  financialRoadmap: readonly FinancialRoadmapItem[]
): FinancialRoadmapTotal | null {
  const found = TOTAL_KINDS.map((kind) =>
    financialRoadmap.find((item) => item.kind === kind)
  );
  const present = found.filter((item): item is FinancialRoadmapItem => Boolean(item));
  if (present.length === 0) return null;

  let min = 0;
  let max = 0;
  let complete = true;
  for (const item of present) {
    if (typeof item.amountMin === "number" && typeof item.amountMax === "number") {
      min += item.amountMin;
      max += item.amountMax;
    } else {
      complete = false;
    }
  }
  return { min, max, complete: complete && present.length === TOTAL_KINDS.length };
}

/** Finds one core item by kind, e.g. to quote the VAC or skills-assessment figure alone. */
export function findFinancialRoadmapItem(
  financialRoadmap: readonly FinancialRoadmapItem[],
  kind: NonNullable<FinancialRoadmapItem["kind"]>
): FinancialRoadmapItem | undefined {
  return financialRoadmap.find((item) => item.kind === kind);
}
