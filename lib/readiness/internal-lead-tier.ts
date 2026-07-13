import type { AssessmentState, ReadinessInput } from "./types";
import { getSpecialistEducationSignals } from "./education-signals";

export type InternalLeadTier = "Hot" | "Warm" | "Cold";

/**
 * Points-based internal lead tier for agent follow-up — distinct from
 * leadScore/leadTier (buildLeadQuality), which scores form-completeness/
 * intent and has nothing to do with DHA points or occupation eligibility.
 *
 * Hot: estimatedPoints >= 65 AND occupationEligibility === "eligible".
 * Warm: occupationEligibility === "eligible" AND estimatedPoints 55-64 AND
 *   at least one of the two "could plausibly still close the gap" signals
 *   is unconfirmed: employment years (assessmentState.employmentDataConfirmed)
 *   or, when applicable, the STEM specialist-education bonus question.
 * Cold: everything else. No internal email is sent for Cold.
 */
export function computeInternalLeadTier(
  input: ReadinessInput,
  assessmentState: AssessmentState
): InternalLeadTier {
  const points = assessmentState.estimatedPoints;
  const occupationEligible = assessmentState.occupationEligibility === "eligible";

  if (!occupationEligible || points === undefined) return "Cold";

  if (points >= 65) return "Hot";

  if (points >= 55) {
    const employmentUnconfirmed = !assessmentState.employmentDataConfirmed;
    const stemSignals = getSpecialistEducationSignals(input);
    const educationUnconfirmed = stemSignals.unconfirmed;
    if (employmentUnconfirmed || educationUnconfirmed) return "Warm";
  }

  return "Cold";
}
