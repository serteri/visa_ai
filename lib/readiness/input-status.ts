import type { InputStatus, PartnerAnswer, ReadinessInput, SkillsAssessmentAnswer } from "./types";

/**
 * What the visitor actually told us, factor by factor (pure; no defaults). The report states "Information entered" /
 * "Not provided" from this -- a blank answer is never turned into "No", "0 years" or a status.
 */

const norm = (s: string | undefined) => (s ?? "").trim().toLowerCase();

/** The skills-assessment answer: only an explicit "yes" / "no"; anything else (blank, unanswered) is "unknown". */
export function skillsAssessmentAnswerOf(input: Pick<ReadinessInput, "occupationConfirmed">): SkillsAssessmentAnswer {
  const v = norm(input.occupationConfirmed);
  return v === "yes" ? "yes" : v === "no" ? "no" : "unknown";
}

/** The partner answer, from the intake's partner select (older stored values included); blank is "unknown". */
export function partnerAnswerOf(sponsorOrFamily: string | undefined): PartnerAnswer {
  const v = (sponsorOrFamily ?? "").trim();
  if (v === "Single / No Dependants" || v === "Single / No Spouse") return "single";
  if (v === "Partner with Competent English and positive Skills Assessment") return "skilled";
  if (v === "Partner with Competent English only") return "competent_english";
  if (v === "Partner / Dependants WITHOUT Functional English" || v === "Spouse without functional English") return "no_functional_english";
  return "unknown";
}

export function buildInputStatus(input: ReadinessInput): InputStatus {
  const entered = (v: unknown) => (v !== undefined && v !== null && String(v).trim() !== "" ? ("entered" as const) : ("not_entered" as const));
  return {
    skillsAssessment: skillsAssessmentAnswerOf(input),
    overseasEmployment: input.offshoreExperienceYears !== undefined ? "entered" : "not_entered",
    australianEmployment: input.onshoreExperienceYears !== undefined ? "entered" : "not_entered",
    partner: partnerAnswerOf(input.sponsorOrFamily),
    english: entered(input.englishLevel),
    education: entered(input.qualificationLevel),
    age: entered(input.age),
  };
}
