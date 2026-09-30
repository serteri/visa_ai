/**
 * How a failed hard gate can be resolved (no dataset imports: also read by scripts/generate-visa-gates.ts).
 *  actionable  the applicant can fix it by their own action (assessment, English test, more time, more points)
 *  structural  it cannot be fixed by a step (age, occupation list, salary threshold, visa held, location, ...)
 * Only gates that are evaluated from the intake and can fail appear here; anything absent is structural.
 * A pathway whose failures are all actionable is "Next step required"; any structural failure is "Not eligible now".
 */
export type GateFailureKind = "actionable" | "structural";

const ACTIONABLE = [
  // By the nature of the requirement, not by visa: a skills assessment or an English test/level is something the
  // applicant can do, on every visa that has one.
  "189.skills_assessment", "190.skills_assessment", "491.skills_assessment", "186DE.skills_assessment", "482CS.skills_assessment",
  "189.english", "190.english", "491.english", "186DE.english", "186TRT.english", "482CS.english", "485.english",
  "189.points", "190.points", "491.points",
  "186DE.experience", "482CS.experience", "186TRT.sponsored_employment",
];

export function gateFailureKind(id: string): GateFailureKind {
  return ACTIONABLE.includes(id) ? "actionable" : "structural";
}

/** Thresholds the sources do not state, so no figure is applied and a human has to verify them. */
export const NEEDS_HUMAN_VERIFICATION = [
  {
    id: "186TRT.income_threshold",
    item: "186 Temporary Residence Transition income threshold",
    note: "The Home Affairs documents state no separate TRT threshold, so none is applied. The report only says the employer's nomination must meet the salary requirements, with no figure.",
  },
] as const;
