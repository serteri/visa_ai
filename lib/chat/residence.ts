import { STATE_NAMES, stateResidenceRule } from "@/lib/state-nomination/residence-rules";
import { isOffshore } from "@/lib/readiness/state-nomination";
import type { ReadinessInput } from "@/lib/readiness/types";

/**
 * Where the visitor lives, and which other states the report does NOT count as available to them because of it.
 * Same rule as the State Nomination Tracker's residenceCheck (lib/readiness/state-nomination.ts): for an applicant
 * living in Australia, a state whose sourced onshore rule requires living in it -- or whose rule is not stated --
 * is not available from another state; a state whose sourced facts admit applicants from other states (WA) is.
 */
export type ResidenceBlockedState = { code: string; name: string; requirement: "required" | "not_confirmed"; subclasses?: Array<"190" | "491"> };
export type ResidenceFacts = { home: string; homeName: string; blocked: ResidenceBlockedState[] };

export function residenceFacts(input: Partial<ReadinessInput> | undefined): ResidenceFacts | undefined {
  const home = input?.residenceState;
  if (!input || !home || !STATE_NAMES[home] || isOffshore(input.currentCountry)) return undefined;
  const blocked: ResidenceBlockedState[] = [];
  for (const code of Object.keys(STATE_NAMES)) {
    if (code === home) continue;
    const rule = stateResidenceRule(code);
    if (rule.requirement === "not_required") continue;
    blocked.push({ code, name: STATE_NAMES[code][0], requirement: rule.requirement, ...(rule.subclasses ? { subclasses: rule.subclasses } : {}) });
  }
  return { home, homeName: STATE_NAMES[home][0], blocked };
}

/** Lines for the visitor's profile block. */
export function residenceLines(facts: ResidenceFacts | undefined): string[] {
  if (!facts) return [];
  const rows = facts.blocked.map((b) =>
    b.requirement === "required"
      ? `${b.name} (onshore pathways require living in ${b.name}${b.subclasses?.length === 1 ? `, subclass ${b.subclasses[0]} only; the other subclass's rule is not confirmed` : ""})`
      : `${b.name} (residence rule for applicants living in another state not confirmed)`,
  );
  return [
    `State of residence: ${facts.homeName} (${facts.home}), applying from inside Australia.`,
    ...(rows.length ? [`Not counted as available from ${facts.homeName} because of residence (the report's rule; do not suggest these states' onshore pathways as an option for the visitor): ${rows.join("; ")}`] : []),
  ];
}
