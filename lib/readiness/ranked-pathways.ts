import type {
  AssessmentState,
  ConfidenceLevel,
  Locale,
  PathwayComparison,
  QualitativeFitTier,
  RankedPathway,
  ReadinessReport,
} from "./types";

type RankedPathwayInput = {
  age?: string;
  currentCountry?: string;
  locale?: Locale;
};

const AU_RANKED_VISA_LABELS: Record<"189" | "190" | "491", Record<Locale, string>> = {
  "189": { en: "189 Visa", tr: "189 Vizesi", "zh-Hans": "189 签证" },
  "190": { en: "190 Visa", tr: "190 Vizesi", "zh-Hans": "190 签证" },
  "491": { en: "491 Visa", tr: "491 Vizesi", "zh-Hans": "491 签证" },
};

function clampPercentage(value: number): number {
  return Math.max(0, Math.min(98, Math.round(value)));
}

function parseAgeNumber(age?: string): number | undefined {
  if (!age) return undefined;
  const match = age.match(/\d+/);
  if (!match) return undefined;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isLikelyOffshore(currentCountry?: string): boolean {
  if (!currentCountry) return false;
  const normalized = currentCountry.trim().toLowerCase();
  if (!normalized) return false;
  return !normalized.includes("australia") && !normalized.includes("australya") && normalized !== "au";
}

function confidenceToBaseScore(level?: ConfidenceLevel): number {
  if (level === "high") return 74;
  if (level === "medium") return 61;
  if (level === "low") return 47;
  return 55;
}

const CA_PATHWAY_LABELS: Record<string, Record<Locale, string>> = {
  CEC: {
    en: "Canadian Experience Class (CEC)",
    tr: "Canadian Experience Class (CEC)",
    "zh-Hans": "加拿大经验类 (CEC)",
  },
  FSW: {
    en: "Federal Skilled Worker (FSW)",
    tr: "Federal Skilled Worker (FSW)",
    "zh-Hans": "联邦技术工人类 (FSW)",
  },
  FSTP: {
    en: "Federal Skilled Trades (FSTP)",
    tr: "Federal Skilled Trades (FSTP)",
    "zh-Hans": "联邦技工类 (FSTP)",
  },
  PNP: {
    en: "Provincial Nominee Program (PNP)",
    tr: "Provincial Nominee Program (PNP)",
    "zh-Hans": "省提名计划 (PNP)",
  },
  AIP: {
    en: "Atlantic Immigration Program (AIP)",
    tr: "Atlantic Immigration Program (AIP)",
    "zh-Hans": "大西洋移民计划 (AIP)",
  },
  FAMILY_SPONSORSHIP: {
    en: "Family Sponsorship",
    tr: "Aile Sponsorluğu",
    "zh-Hans": "家庭担保",
  },
};

function getLocalizedPathwayLabel(subclass: string, locale: Locale, fallback?: string): string {
  if (subclass in AU_RANKED_VISA_LABELS) {
    return AU_RANKED_VISA_LABELS[subclass as keyof typeof AU_RANKED_VISA_LABELS][locale];
  }

  const localizedCaLabel = CA_PATHWAY_LABELS[subclass];
  if (localizedCaLabel) return localizedCaLabel[locale];
  return fallback ?? subclass;
}

function confidenceToCaScore(level?: ConfidenceLevel): number {
  if (level === "high") return 72;
  if (level === "medium") return 58;
  if (level === "low") return 38;
  return 45;
}

export function buildCaRankedPathways(
  report: ReadinessReport,
  locale: Locale = "en"
): RankedPathway[] {
  const pathways: PathwayComparison[] = report.pathwayComparison ?? [];
  if (pathways.length === 0) return [];

  if (!report.assessmentState.canShowNumericRanking) {
    const { note: preliminaryNote, forcedTier } = resolveQualitativeNote(report.assessmentState, locale);
    const raw = pathways
      .filter((p) => p.subclass && CA_PATHWAY_LABELS[p.subclass])
      .map((p) => ({
        subclass: p.subclass as RankedPathway["subclass"],
        visaLabel: getLocalizedPathwayLabel(p.subclass, locale, p.visaName ?? p.subclass),
        qualitativeTier: forcedTier ?? confidenceToQualitativeTier(p.confidenceLevel),
        isPreliminaryOnly: true,
        preliminaryNote,
      }));
    const sorted = [...raw].sort(
      (a, b) => qualitativeTierRank(b.qualitativeTier) - qualitativeTierRank(a.qualitativeTier)
    );
    return sorted.map((item) => ({ ...item, recommendationTag: "🔍 Preliminary Signal Only" as const }));
  }

  const crsSignal = report.pointsEstimate?.estimatedPoints ?? 0;

  const raw = pathways
    .filter((p) => p.subclass && CA_PATHWAY_LABELS[p.subclass])
    .map((p) => {
      const base = confidenceToCaScore(p.confidenceLevel);
      return {
        subclass: p.subclass as RankedPathway["subclass"],
        visaLabel: getLocalizedPathwayLabel(p.subclass, locale, p.visaName ?? p.subclass),
        matchPercentage: clampPercentage(base),
        pointsSignal: crsSignal,
      };
    });

  if (raw.length === 0) return [];

  const sorted = [...raw].sort((a, b) => b.matchPercentage! - a.matchPercentage!);
  return sorted.map((item, index) => ({
    ...item,
    recommendationTag:
      index === 0
        ? "🌟 Highly Recommended Pathway"
        : index === 1
          ? "⚖️ Alternative Option"
          : "⚠️ High Risk / Low Probability",
  }));
}

function confidenceToQualitativeTier(level?: ConfidenceLevel): QualitativeFitTier {
  if (level === "high") return "Potential fit";
  if (level === "medium") return "Unclear fit";
  return "Unlikely fit";
}

function qualitativeTierRank(tier: QualitativeFitTier): number {
  if (tier === "Potential fit") return 2;
  if (tier === "Unclear fit") return 1;
  return 0;
}

function buildPreliminaryNote(missingFieldLabels: string[], locale: Locale = "en"): string {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  if (missingFieldLabels.length === 0) {
    return isTr
      ? "Yalnızca ön sinyal — bu yol için puan hesaplanamıyor. Ek profil bilgisi sağlayın."
      : isZh
        ? "仅初步信号——该路径的分数暂无法计算。请提供更多档案信息。"
        : "Preliminary signal only — points cannot be calculated for this pathway. Provide additional profile details.";
  }
  const missing = missingFieldLabels.join(isZh ? "、" : ", ");
  return isTr
    ? `Yalnızca ön sinyal — ${missing} sağlanana kadar puan hesaplanamaz.`
    : isZh
      ? `仅初步信号——在提供${missing}之前无法计算分数。`
      : `Preliminary signal only — points cannot be calculated until ${missing} are provided.`;
}

/**
 * Picks the correct user-facing message for a gated (non-numeric) pathway.
 * "ineligible" and "unverified" occupation findings are distinct facts and
 * must not collapse into the generic "missing profile fields" message:
 * - ineligible: a real occupation-dataset match was found and confirmed
 *   NOT relevant to 189/190/491 — the pathway is genuinely unlikely to fit.
 * - unverified (occupation was typed but not found in the dataset): we
 *   simply don't know either way — the pathway's fit is unclear, not ruled
 *   out.
 * - otherwise: fall back to the generic missing-fields explanation (covers
 *   the case where occupation itself was never entered, and CA reports
 *   which are exempt from this AU-specific occupation-eligibility check).
 */
function resolveQualitativeNote(
  assessmentState: AssessmentState,
  locale: Locale
): { note: string; forcedTier?: QualitativeFitTier } {
  if (assessmentState.occupationEligibility === "ineligible") {
    return { note: assessmentState.occupationEligibilityReason, forcedTier: "Unlikely fit" };
  }
  if (assessmentState.occupationEligibility === "unverified" && assessmentState.fieldsPresent.occupation) {
    return { note: assessmentState.occupationEligibilityReason, forcedTier: "Unclear fit" };
  }
  return { note: buildPreliminaryNote(assessmentState.missingFieldLabels, locale) };
}

/**
 * Reads assessmentState.canShowNumericRanking (the single source of truth
 * computed once in the base engine) so this section can never disagree with
 * the Executive Summary about whether enough data exists for a real number.
 */
function calculateQualitativeRankedPathways(report: ReadinessReport, locale: Locale): RankedPathway[] {
  const { note: preliminaryNote, forcedTier } = resolveQualitativeNote(report.assessmentState, locale);
  const getPathwayConfidence = (subclass: "189" | "190" | "491") =>
    report.pathwayComparison.find((pathway) => pathway.subclass === subclass)?.confidenceLevel;

  const raw: Array<Omit<RankedPathway, "recommendationTag">> = (["189", "190", "491"] as const).map(
    (subclass) => ({
      subclass,
      visaLabel: getLocalizedPathwayLabel(subclass, locale, `${subclass} Visa`),
      qualitativeTier: forcedTier ?? confidenceToQualitativeTier(getPathwayConfidence(subclass)),
      isPreliminaryOnly: true,
      preliminaryNote,
    })
  );

  const sorted = [...raw].sort(
    (a, b) => qualitativeTierRank(b.qualitativeTier!) - qualitativeTierRank(a.qualitativeTier!)
  );

  return sorted.map((item) => ({
    ...item,
    recommendationTag: "🔍 Preliminary Signal Only" as const,
  }));
}

const GATE_BASED_SUBCLASSES = ["500", "482"] as const;

/**
 * 500 and 482 are structurally gate/eligibility-based (a study-intent or
 * employer-sponsorship threshold, never a competitive points test), unlike
 * 189/190/491 which are points-tested and only fall back to a qualitative
 * tier when data happens to be missing. So these are always represented as
 * a qualitative tier — never a fabricated matchPercentage — regardless of
 * assessmentState.canShowNumericRanking, which governs the skilled/points
 * lane only.
 *
 * Hard-ineligible cases (e.g. 482's CSIT salary gate) are deliberately
 * excluded here: those are already surfaced by generate-pdf.ts's
 * buildIneligiblePathwayEntries, which scans pathwayComparison directly for
 * relevance === "ineligible" across 482/485/189/190/491. Including them
 * here too would just produce a duplicate row (the two get de-duplicated by
 * subclass) — cleaner to leave that case fully owned by the existing sweep.
 */
function buildGateBasedRankedPathways(report: ReadinessReport, locale: Locale): RankedPathway[] {
  const raw: Array<Omit<RankedPathway, "recommendationTag">> = report.pathwayComparison
    .filter(
      (p): p is PathwayComparison & { subclass: (typeof GATE_BASED_SUBCLASSES)[number] } =>
        (GATE_BASED_SUBCLASSES as readonly string[]).includes(p.subclass) && p.relevance !== "ineligible"
    )
    .map((p) => ({
      subclass: p.subclass,
      visaLabel: getLocalizedPathwayLabel(p.subclass, locale, p.visaName ?? p.subclass),
      qualitativeTier: confidenceToQualitativeTier(p.confidenceLevel),
      isPreliminaryOnly: true,
      isGateBased: true,
      preliminaryNote: p.reason,
    }));

  const sorted = [...raw].sort(
    (a, b) => qualitativeTierRank(b.qualitativeTier!) - qualitativeTierRank(a.qualitativeTier!)
  );

  return sorted.map((item) => ({
    ...item,
    recommendationTag: "🔍 Preliminary Signal Only" as const,
  }));
}

export function calculateRankedPathways(
  report: ReadinessReport,
  input: RankedPathwayInput
): RankedPathway[] {
  const locale = input.locale ?? "en";
  const gateBasedPathways = buildGateBasedRankedPathways(report, locale);
  const detectedSubclasses = report.detectedSubclasses ?? report.pathwayComparison.map((pathway) => pathway.subclass);
  const skilledDetected = detectedSubclasses.some((subclass) =>
    ["189", "190", "491"].includes(subclass)
  );

  if (!report.assessmentState.canShowNumericRanking || !skilledDetected) {
    return [...calculateQualitativeRankedPathways(report, locale), ...gateBasedPathways];
  }

  const pointsEstimate =
    report.pointsEstimate?.estimatedPoints ??
    report.pointsBoosterSimulator?.currentEstimate ??
    65;

  const getPathwayConfidence = (subclass: "189" | "190" | "491") =>
    report.pathwayComparison.find((pathway) => pathway.subclass === subclass)?.confidenceLevel;

  const scoreFromSignals = (subclass: "189" | "190" | "491", subclassBias = 0): number => {
    const confidenceBase = confidenceToBaseScore(getPathwayConfidence(subclass));
    const pointsDelta = Math.max(-10, Math.min(30, pointsEstimate - 65));
    return clampPercentage(confidenceBase + pointsDelta + subclassBias);
  };

  let score189 = scoreFromSignals("189", 0);
  let score190 = scoreFromSignals("190", 3);
  let score491 = scoreFromSignals("491", 6);

  const age = parseAgeNumber(input.age);
  if (typeof age === "number" && age > 39) {
    score189 = Math.min(score189, 15);
  }

  if (isLikelyOffshore(input.currentCountry)) {
    score190 = clampPercentage(score190 - 15);
  }

  const pointsSignal491 = pointsEstimate + 15;
  const baselineCompetitive = Math.max(score189, score190);
  score491 = clampPercentage(Math.max(score491 + 8, baselineCompetitive * 1.2));

  const raw: Array<Omit<RankedPathway, "recommendationTag">> = [
    {
      subclass: "189",
      visaLabel: getLocalizedPathwayLabel("189", input.locale ?? "en", "189 Visa"),
      matchPercentage: score189,
      pointsSignal: pointsEstimate,
    },
    {
      subclass: "190",
      visaLabel: getLocalizedPathwayLabel("190", input.locale ?? "en", "190 Visa"),
      matchPercentage: score190,
      pointsSignal: pointsEstimate,
    },
    {
      subclass: "491",
      visaLabel: getLocalizedPathwayLabel("491", input.locale ?? "en", "491 Visa"),
      matchPercentage: score491,
      pointsSignal: pointsSignal491,
    },
  ];

  const sorted = [...raw].sort((a, b) => b.matchPercentage! - a.matchPercentage!);
  const numericRanked: RankedPathway[] = sorted.map((item, index) => ({
    ...item,
    recommendationTag:
      index === 0
        ? "🌟 Highly Recommended Pathway"
        : index === 1
          ? "⚖️ Alternative Option"
          : "⚠️ High Risk / Low Probability",
  }));

  return [...numericRanked, ...gateBasedPathways];
}
