import type { ConfidenceLevel, RankedPathway, ReadinessReport } from "./types";

type RankedPathwayInput = {
  age?: string;
  currentCountry?: string;
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

export function calculateRankedPathways(
  report: ReadinessReport,
  input: RankedPathwayInput
): RankedPathway[] {
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

  const sorted = [...raw].sort((a, b) => b.matchPercentage - a.matchPercentage);
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
