import type { AssessmentState, ConfidenceLevel, PathwayComparison } from "./types";

/**
 * THE one confidence computation. The Structured Pathway Comparison table and the Signal Snapshot both show
 * the value returned here.
 *
 *  - Each pathway's own level is first capped by the data-completeness level (sufficient = High, partial =
 *    Medium, minimal = Low); a missing skills assessment caps it at Medium.
 *  - Overall confidence = the LOWEST level among the pathways shown.
 *  - Every pathway then shows that overall level, so no row can read higher than the Snapshot.
 */
const RANK: Record<ConfidenceLevel, number> = { low: 0, medium: 1, high: 2 };
const BY_RANK: ConfidenceLevel[] = ["low", "medium", "high"];

export function confidenceCap(assessmentState: AssessmentState, country: "AU" | "CA" = "AU"): ConfidenceLevel {
  let cap: ConfidenceLevel =
    assessmentState.dataCompletenessLevel === "sufficient" ? "high" : assessmentState.dataCompletenessLevel === "partial" ? "medium" : "low";
  if (country === "AU" && !assessmentState.fieldsPresent.skillsAssessment && RANK[cap] > RANK.medium) cap = "medium";
  return cap;
}

export function computeConfidence(
  pathways: readonly PathwayComparison[],
  assessmentState: AssessmentState,
  country: "AU" | "CA" = "AU"
): ConfidenceLevel {
  const cap = confidenceCap(assessmentState, country);
  if (pathways.length === 0) return cap;
  const lowest = Math.min(...pathways.map((p) => Math.min(RANK[p.confidenceLevel], RANK[cap])));
  return BY_RANK[lowest];
}
