import type { ReadinessInput } from "./types";

/**
 * English evidence only counts as "provided" when a real proficiency tier is
 * on file. The intake sends englishLevel="none" for "no test / expired" --
 * a non-empty string, so a bare `Boolean(input.englishLevel)` check treats
 * it as truthy and mislabels these profiles as "Provided". englishLevel is
 * the single source of truth for this (the redundant "English test taken?"
 * field was removed from the intake form and schema); every builder
 * (Evidence Readiness, Pathway Comparison, Confidence Explanation,
 * AssessmentState.fieldsPresent) must read this instead of re-deriving its
 * own truthy check.
 */
export function hasRealEnglishEvidence(input: ReadinessInput): boolean {
  const level = (input.englishLevel ?? "").trim().toLowerCase();
  return level !== "" && level !== "none";
}
