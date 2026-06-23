// Country-agnostic shape that UI/report code can render without knowing
// which country's scoring rules produced it.

export type PointsCalculationBreakdownEntry = {
  label: string;
  points: number;
  note?: string;
};

export type PointsCalculationResult = {
  country: "AU" | "CA";
  configVersion: string;
  totalScore: number;
  passThreshold: number;
  meetsThreshold: boolean;
  breakdown: PointsCalculationBreakdownEntry[];
};

export function fromAustraliaResult(
  result: import("@/lib/points/types").AustraliaPointsResult,
  subclass: "189" | "190" | "491",
): PointsCalculationResult {
  const totalByCsubclass = { "189": result.total189, "190": result.total190, "491": result.total491 };
  const total = totalByCsubclass[subclass];
  return {
    country: "AU",
    configVersion: "static", // AU points test is not yet config-versioned, see lib/points/calculate-australia-points.ts
    totalScore: total,
    passThreshold: result.minimumThreshold,
    meetsThreshold: total >= result.minimumThreshold,
    breakdown: [
      { label: "age", points: result.breakdown.age },
      { label: "english", points: result.breakdown.english },
      { label: "employment", points: result.breakdown.employmentCombinedAfterCap },
      { label: "education", points: result.breakdown.education },
      { label: "bonus", points: result.breakdown.bonus.total },
      { label: "partner", points: result.breakdown.partner },
    ],
  };
}

export function fromCanadaResult(
  result: import("@/lib/points/canada-types").CanadaCRSResult,
): PointsCalculationResult {
  return {
    country: "CA",
    configVersion: result.configVersion,
    totalScore: result.totalScore,
    passThreshold: 0, // Express Entry has no fixed pass mark; ranking is relative to draw cutoffs (eoi-rounds style data, not yet sourced for CA)
    meetsThreshold: false,
    breakdown: [
      { label: "coreHumanCapital", points: result.breakdown.coreHumanCapital.total },
      { label: "spouseFactors", points: result.breakdown.spouseFactors.total },
      { label: "skillTransferability", points: result.breakdown.skillTransferability.total },
      { label: "additionalPoints", points: result.breakdown.additionalPoints.total },
    ],
  };
}
