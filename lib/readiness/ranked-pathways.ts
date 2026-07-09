import type { ConfidenceLevel, Locale, PathwayComparison, QualitativeFitTier, RankedPathway, ReadinessReport } from "./types";

type RankedPathwayInput = {
  age?: string;
  currentCountry?: string;
  locale?: Locale;
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

const CA_PATHWAY_LABELS: Record<string, string> = {
  CEC: "Canadian Experience Class (CEC)",
  FSW: "Federal Skilled Worker (FSW)",
  FSTP: "Federal Skilled Trades (FSTP)",
  PNP: "Provincial Nominee Program (PNP)",
  AIP: "Atlantic Immigration Program (AIP)",
  FAMILY_SPONSORSHIP: "Family Sponsorship",
};

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
    const preliminaryNote = buildPreliminaryNote(report.assessmentState.missingFieldLabels, locale);
    const raw = pathways
      .filter((p) => p.subclass && CA_PATHWAY_LABELS[p.subclass])
      .map((p) => ({
        subclass: p.subclass as RankedPathway["subclass"],
        visaLabel: CA_PATHWAY_LABELS[p.subclass] ?? p.visaName ?? p.subclass,
        qualitativeTier: confidenceToQualitativeTier(p.confidenceLevel),
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
        visaLabel: CA_PATHWAY_LABELS[p.subclass] ?? p.visaName ?? p.subclass,
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
 * Reads assessmentState.canShowNumericRanking (the single source of truth
 * computed once in the base engine) so this section can never disagree with
 * the Executive Summary about whether enough data exists for a real number.
 */
function calculateQualitativeRankedPathways(report: ReadinessReport, locale: Locale): RankedPathway[] {
  const preliminaryNote = buildPreliminaryNote(report.assessmentState.missingFieldLabels, locale);
  const getPathwayConfidence = (subclass: "189" | "190" | "491") =>
    report.pathwayComparison.find((pathway) => pathway.subclass === subclass)?.confidenceLevel;

  const raw: Array<Omit<RankedPathway, "recommendationTag">> = (["189", "190", "491"] as const).map(
    (subclass) => ({
      subclass,
      visaLabel: `${subclass} Visa`,
      qualitativeTier: confidenceToQualitativeTier(getPathwayConfidence(subclass)),
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

export function calculateRankedPathways(
  report: ReadinessReport,
  input: RankedPathwayInput
): RankedPathway[] {
  if (!report.assessmentState.canShowNumericRanking) {
    return calculateQualitativeRankedPathways(report, input.locale ?? "en");
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
      visaLabel: "189 Visa",
      matchPercentage: score189,
      pointsSignal: pointsEstimate,
    },
    {
      subclass: "190",
      visaLabel: "190 Visa",
      matchPercentage: score190,
      pointsSignal: pointsEstimate,
    },
    {
      subclass: "491",
      visaLabel: "491 Visa",
      matchPercentage: score491,
      pointsSignal: pointsSignal491,
    },
  ];

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
