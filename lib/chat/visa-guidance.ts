import { calculateAustraliaPoints } from "@/lib/points/calculate-australia-points";
import type { AustraliaPointsInput } from "@/lib/points/types";
import type { ReadinessInput } from "@/lib/readiness/types";
import { evaluateVisaGates } from "@/lib/readiness/visa-gates";

/**
 * Visa-aware guidance for the AI assistant. A visitor on a Student visa (subclass 500) -- from the quick profile card
 * or the question itself -- gets the points factors tied to Australian study and the 485 gates, from the same points
 * table and gate matrix the report uses (never written by hand), so the answer covers them and cannot misstate them.
 */

const STUDENT_VISA_MENTION = /\b500\b|student visa|öğrenci vize|ogrenci vize|学生签证/i;

export function isStudentVisaContext(currentVisa: string | undefined, question: string): boolean {
  return currentVisa === "500" || STUDENT_VISA_MENTION.test(question);
}

const BASE: AustraliaPointsInput = {
  age: "45_plus",
  english: "competent",
  overseasEmployment: "lt3",
  australianEmployment: "lt1",
  education: "none_or_unsure",
  partner: "none_or_unsure",
} as AustraliaPointsInput;
const gain = (patch: Partial<AustraliaPointsInput>) => calculateAustraliaPoints({ ...BASE, ...patch }).total189 - calculateAustraliaPoints(BASE).total189;

/** The student-visa guidance block (block-4): what the answer must cover for a subclass 500 holder. */
export function buildStudentVisaGuidance(profileInput?: Partial<ReadinessInput>): string {
  const gates485 = evaluateVisaGates({ locale: "en", country: "AU", ...(profileInput ?? {}) } as ReadinessInput, {}, "en")["485"];
  const gateLines = gates485.gates.map((g) =>
    profileInput ? `- ${g.label}: ${g.status === "met" ? "met" : g.status === "not_met" ? `NOT met (${g.reason})` : `not known yet (${g.reason})`}` : `- ${g.label}`
  );
  return [
    "block-4 (internal: never name or quote it) -- the visitor is on (or asks about) a Student visa (subclass 500). The answer MUST cover both parts below, using these figures exactly:",
    "Points factors tied to Australian study (the report's points table):",
    `- Australian study requirement: +${gain({ australianStudyRequirement: true })} for a qualification needing at least 2 academic years of study in Australia.`,
    `- Study in regional Australia: +${gain({ regionalStudy: true })}, on top of the Australian study requirement, for study at a regional campus.`,
    `- Professional Year: +${gain({ professionalYear: true })} for completing an Australian Professional Year (offered for accounting, ICT and engineering occupations).`,
    `- Specialist education: +${gain({ specialistEducation: true })} for an Australian research masters or doctorate in a STEM field (mention only where relevant to the visitor's study).`,
    "- Australian skilled employment after graduating also earns points once it is assessed as skilled employment (see the points table in block-1).",
    "Temporary Graduate visa (subclass 485, Post-Higher Education Work stream) -- the report's gate matrix:",
    ...gateLines,
    "- Timing: apply within 6 months of the degree being awarded, while in Australia, with an English result from the last 12 months.",
  ].join("\n");
}
