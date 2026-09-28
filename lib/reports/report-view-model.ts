import type { PointsBoosterScenario, ReadinessReport, StateNominationStatus } from "@/lib/readiness/types";

export type StateRow = { code: string; name: string; status: StateNominationStatus; score: number };

/** The State Nomination Tracker rows, in report order -- shown identically on the result page and in the PDF. */
export function stateRows(report: ReadinessReport): StateRow[] {
  return (report.stateNominationTracker?.states ?? []).map((s) => ({ code: s.code, name: s.name, status: s.status, score: s.score }));
}

/**
 * The Points Booster Simulator rows the PDF table renders (a row needs a points change or a new total) -- the result
 * page shows exactly these.
 */
export function boosterRows(report: ReadinessReport): PointsBoosterScenario[] {
  return (report.pointsBoosterSimulator?.scenarios ?? []).filter(
    (s) => Number.isFinite(s.estimatedChange) || Number.isFinite(s.resultingEstimate)
  );
}
