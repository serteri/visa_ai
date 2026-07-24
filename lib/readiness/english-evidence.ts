import type { ReadinessInput } from "./types";

/**
 * English evidence only counts as "provided" when a real proficiency tier is
 * on file. The intake sends englishLevel="none" for "no test / expired", and
 * englishTestTaken can be "no" — both are non-empty strings, so a bare
 * `Boolean(input.englishLevel)` check treats them as truthy and mislabels
 * these profiles as "Provided". This is the single source of truth every
 * builder (Evidence Readiness, Pathway Comparison, Confidence Explanation,
 * AssessmentState.fieldsPresent) must read instead of re-deriving its own
 * truthy check.
 */
export function hasRealEnglishEvidence(input: ReadinessInput): boolean {
  const level = (input.englishLevel ?? "").trim().toLowerCase();
  if (level === "competent" || level === "proficient" || level === "superior") return true;
  if (level === "none" || level === "") return false;
  return input.englishTestTaken === "yes";
}
