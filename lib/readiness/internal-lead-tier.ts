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
 *
 * Hard gate: DHA age (45+) and English ("none"/no valid test) cutoffs
 * disqualify an EOI outright regardless of the summed points total --
 * points-estimate.ts already zeroes estimatedPoints when English fails,
 * but NOT when age fails (age just scores 0 for that one row), so a
 * 45+ applicant with strong English/education/experience could otherwise
 * still sum to 65+ and read as "Hot" despite being ineligible to lodge.
 */
export function computeInternalLeadTier(
  input: ReadinessInput,
  assessmentState: AssessmentState
): InternalLeadTier {
  const points = assessmentState.estimatedPoints;
  const occupationEligible = assessmentState.occupationEligibility === "eligible";

  const numericAge = input.age ? parseInt(input.age, 10) : undefined;
  const isOverAgeLimit = numericAge !== undefined && !isNaN(numericAge) && numericAge >= 45;
  const englishLevelRaw = (input.englishLevel ?? "").trim().toLowerCase();
  const hasNoValidEnglish = englishLevelRaw === "none";

  if (isOverAgeLimit || hasNoValidEnglish) return "Cold";

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
