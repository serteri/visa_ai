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
  /**
   * Core kinds that don't appear in this report's roadmap at all (e.g.
   * "skills_assessment" for a partner-pathway report, which never generates
   * one) -- the total sums whatever core items ARE present and this list
   * names what's left out, so a total is never silently omitted just
   * because one line item doesn't apply to this pathway.
   */
  excludedKinds: ReadonlyArray<NonNullable<FinancialRoadmapItem["kind"]>>;
  /**
   * Core kinds that ARE present but had no numeric amountMin/amountMax
   * (e.g. VAC when the fee subclass wasn't detected) -- summed as 0 and
   * named here so callers can label the total "from AUD X" / "excluding Y"
   * rather than pretending the figure is exact.
   */
  missingAmountKinds: ReadonlyArray<NonNullable<FinancialRoadmapItem["kind"]>>;
};

/**
 * Sums the min/max of whichever core Financial Roadmap items are actually
 * present by `kind`, so the FAQ, the Application Guide, and the Financial
 * Roadmap section itself all quote one total instead of three independently
 * hardcoded ranges (Phase 1 report consistency fix, item D3).
 *
 * Returns null only if NONE of the core items are present in this report at
 * all. A missing individual item (e.g. no "skills_assessment" item on a
 * partner-pathway report, which never generates one) does NOT null out the
 * whole total -- it's summed from whatever core items exist and reported in
 * excludedKinds/missingAmountKinds so callers can render a total that's
 * explicit about what it does and doesn't include, per Phase 2a item A3.
 */
export function computeEstimatedTotalAud(
  financialRoadmap: readonly FinancialRoadmapItem[]
): FinancialRoadmapTotal | null {
  const found = TOTAL_KINDS.map((kind) => ({
    kind,
    item: financialRoadmap.find((i) => i.kind === kind),
  }));
  const present = found.filter((f): f is { kind: NonNullable<FinancialRoadmapItem["kind"]>; item: FinancialRoadmapItem } => Boolean(f.item));
  if (present.length === 0) return null;

  const excludedKinds = found.filter((f) => !f.item).map((f) => f.kind);
  const missingAmountKinds: NonNullable<FinancialRoadmapItem["kind"]>[] = [];

  let min = 0;
  let max = 0;
  for (const { kind, item } of present) {
    if (typeof item.amountMin === "number" && typeof item.amountMax === "number") {
      min += item.amountMin;
      max += item.amountMax;
    } else {
      missingAmountKinds.push(kind);
    }
  }
  return {
    min,
    max,
    complete: missingAmountKinds.length === 0 && excludedKinds.length === 0,
    excludedKinds,
    missingAmountKinds,
  };
}

/** Finds one core item by kind, e.g. to quote the VAC or skills-assessment figure alone. */
export function findFinancialRoadmapItem(
  financialRoadmap: readonly FinancialRoadmapItem[],
  kind: NonNullable<FinancialRoadmapItem["kind"]>
): FinancialRoadmapItem | undefined {
  return financialRoadmap.find((item) => item.kind === kind);
}

const KIND_LABEL: Record<NonNullable<FinancialRoadmapItem["kind"]>, { en: string; tr: string; zh: string }> = {
  vac: { en: "the visa application charge", tr: "vize başvuru ücreti", zh: "签证申请费" },
  skills_assessment: { en: "the skills assessment", tr: "beceri değerlendirmesi", zh: "技能评估" },
  english_test: { en: "the language test", tr: "dil testi", zh: "语言考试" },
  medical: { en: "the health examination", tr: "sağlık muayenesi", zh: "体检" },
  police: { en: "the police clearance", tr: "polis kaydı belgesi", zh: "无犯罪证明" },
};

/**
 * Renders the "excluding X, Y" / "not yet known: X" suffix that names what a
 * partial total leaves out, per Phase 2a item A3 ("never silently drop the
 * total"). Returns "" when the total is complete (nothing to name).
 */
export function describeTotalGaps(total: FinancialRoadmapTotal, locale: "en" | "tr" | "zh-Hans"): string {
  const lang = locale === "tr" ? "tr" : locale === "zh-Hans" ? "zh" : "en";
  const notApplicable = total.excludedKinds.map((k) => KIND_LABEL[k][lang]);
  const notYetKnown = total.missingAmountKinds.map((k) => KIND_LABEL[k][lang]);
  if (notApplicable.length === 0 && notYetKnown.length === 0) return "";

  const parts: string[] = [];
  if (lang === "tr") {
    if (notApplicable.length) parts.push(`bu profil için geçerli değil: ${notApplicable.join(", ")}`);
    if (notYetKnown.length) parts.push(`henüz bilinmiyor: ${notYetKnown.join(", ")}`);
    return ` (Bu toplam ${parts.join("; ")}.)`;
  }
  if (lang === "zh") {
    if (notApplicable.length) parts.push(`不适用于该档案：${notApplicable.join("、")}`);
    if (notYetKnown.length) parts.push(`金额尚未确定：${notYetKnown.join("、")}`);
    return `（此总计${parts.join("；")}。）`;
  }
  if (notApplicable.length) parts.push(`does not apply to this profile: ${notApplicable.join(", ")}`);
  if (notYetKnown.length) parts.push(`not yet known: ${notYetKnown.join(", ")}`);
  return ` (This total excludes what ${parts.join("; ")}.)`;
}
