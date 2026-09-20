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
  /** Core kinds present in the roadmap that contributed a real amount to min/max. */
  includedKinds: ReadonlyArray<NonNullable<FinancialRoadmapItem["kind"]>>;
  /**
   * Core kinds that don't appear in this report's roadmap at all (e.g.
   * "skills_assessment" for a partner-pathway report, which never generates
   * one) -- the total sums whatever core items ARE present and this list
   * names what's left out, so a total is never silently omitted just
   * because one line item doesn't apply to this pathway.
   */
  excludedKinds: ReadonlyArray<NonNullable<FinancialRoadmapItem["kind"]>>;
  /** Core kinds whose figure is flagged `estimated` (pending verification) and is included in min/max. */
  estimatedKinds: ReadonlyArray<NonNullable<FinancialRoadmapItem["kind"]>>;
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
  const includedKinds: NonNullable<FinancialRoadmapItem["kind"]>[] = [];
  const estimatedKinds: NonNullable<FinancialRoadmapItem["kind"]>[] = [];

  let min = 0;
  let max = 0;
  for (const { kind, item } of present) {
    if (typeof item.amountMin === "number" && typeof item.amountMax === "number") {
      min += item.amountMin;
      max += item.amountMax;
      includedKinds.push(kind);
      if (item.estimated === true) estimatedKinds.push(kind);
    } else {
      missingAmountKinds.push(kind);
    }
  }
  return {
    min,
    max,
    complete: missingAmountKinds.length === 0 && excludedKinds.length === 0,
    includedKinds,
    estimatedKinds,
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
  vac_additional: { en: "the partner/child charges", tr: "partner/çocuk ücretleri", zh: "随行伴侣/子女的费用" },
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
  if (notApplicable.length) parts.push(`${notApplicable.join(", ")} (does not apply to this profile)`);
  if (notYetKnown.length) parts.push(`${notYetKnown.join(", ")} (amount not yet known)`);
  return ` (This total leaves out ${parts.join("; ")}.)`;
}

/**
 * The one place the "Estimated total" line is worded. The personalized FAQ,
 * the Application Guide and the Financial Roadmap section all call this with
 * the same computeEstimatedTotalAud() result, so the three sections cannot
 * drift apart in figure or wording. `terminal` is punctuation placed right
 * after the range (before any excluded-items note).
 */
export function formatEstimatedTotalLine(
  total: FinancialRoadmapTotal,
  locale: "en" | "tr" | "zh-Hans",
  terminal = ""
): string {
  const numLocale = locale === "tr" ? "tr-TR" : "en-AU";
  const range = `AUD ${total.min.toLocaleString(numLocale)}-${total.max.toLocaleString(numLocale)}`;
  const gaps = total.complete ? "" : describeTotalGaps(total, locale);
  const estimated =
    total.estimatedKinds.length > 0
      ? locale === "tr"
        ? ` (${total.estimatedKinds.map((k) => KIND_NOUN[k].tr).join(", ")}: ${estimateQualifier(locale)})`
        : locale === "zh-Hans"
          ? `（${total.estimatedKinds.map((k) => KIND_NOUN[k].zh).join("、")}：${estimateQualifier(locale)}）`
          : ` (${total.estimatedKinds.map((k) => KIND_NOUN[k].en).join(", ")}: ${estimateQualifier(locale)})`
      : "";
  const label =
    locale === "tr"
      ? total.complete ? "Tahmini toplam (ana başvurucu): " : "Tahmini toplam (ana başvurucu, en az): "
      : locale === "zh-Hans"
        ? total.complete ? "预计总计（主申请人）：" : "预计总计（主申请人，最低金额）："
        : total.complete ? "Estimated total (primary applicant): " : "Estimated total (primary applicant, minimum): ";
  return `${label}${range}${estimated}${terminal}${gaps}`;
}

const KIND_NOUN: Record<NonNullable<FinancialRoadmapItem["kind"]>, { en: string; tr: string; zh: string }> = {
  vac: { en: "visa application charge", tr: "vize başvuru ücreti", zh: "签证申请费" },
  skills_assessment: { en: "skills assessment", tr: "beceri değerlendirmesi", zh: "技能评估" },
  english_test: { en: "language test", tr: "dil testi", zh: "语言考试" },
  medical: { en: "health examination", tr: "sağlık muayenesi", zh: "体检" },
  police: { en: "police clearance", tr: "polis kaydı belgesi", zh: "无犯罪证明" },
  vac_additional: { en: "partner/child charges", tr: "partner/çocuk ücretleri", zh: "随行伴侣/子女的费用" },
};

/**
 * Names what the Estimated total covers and what it leaves out, for the
 * Financial Roadmap's total row. "Included" is exactly total.includedKinds;
 * "not included" is whichever core items didn't contribute a number plus the
 * costs the total never covers (partner/child charges and any second
 * instalment, NAATI translation, migration agent/lawyer fees).
 */
export function describeTotalScope(
  total: FinancialRoadmapTotal,
  locale: "en" | "tr" | "zh-Hans"
): { included: string; notIncluded: string } {
  const lang = locale === "tr" ? "tr" : locale === "zh-Hans" ? "zh" : "en";
  const sep = lang === "zh" ? "、" : ", ";
  const included = total.includedKinds.map((k) => KIND_NOUN[k][lang]);
  const leftOut = [...total.excludedKinds, ...total.missingAmountKinds].map((k) => KIND_NOUN[k][lang]);
  const fixedExtras =
    lang === "tr"
      ? ["partner/çocuk ücretleri ve varsa ikinci taksit", "NAATI onaylı çeviri", "göçmenlik danışmanı veya avukat ücretleri"]
      : lang === "zh"
        ? ["随行伴侣/子女的费用及可能的第二期费用", "NAATI 认证翻译", "移民代理或律师费用"]
        : ["partner/child charges and any second instalment", "NAATI-certified translation", "migration agent or lawyer fees"];
  const notIncluded = [...leftOut, ...fixedExtras];
  return lang === "tr"
    ? { included: `Bu toplama dahil: ${included.join(sep)}.`, notIncluded: `Dahil değil: ${notIncluded.join(sep)}.` }
    : lang === "zh"
      ? { included: `此总计包含：${included.join(sep)}。`, notIncluded: `不包含：${notIncluded.join(sep)}。` }
      : { included: `Included in this total: ${included.join(sep)}.`, notIncluded: `Not included: ${notIncluded.join(sep)}.` };
}

/** The one qualifier every figure taken from an authority fee flagged `estimated` carries. */
export function estimateQualifier(locale: "en" | "tr" | "zh-Hans"): string {
  return locale === "tr" ? "doğrulama bekleyen tahmin" : locale === "zh-Hans" ? "估算，待核实" : "estimate pending verification";
}
