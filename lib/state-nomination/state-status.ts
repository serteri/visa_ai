import type { StateRuleStatus } from "./state-rules-config";

/**
 * THE state-status precedence, shared by the report (lib/readiness/state-nomination.ts) and the AI assistant
 * (lib/ai/retrieve-state-context.ts) so the two never disagree:
 *
 *   1. the admin panel's status (StateNominationConfig) -- unless the hand-verified rule (state-rules-config.ts) was
 *      verified on a LATER day than the admin row was last saved; then the newer verification wins;
 *   2. the scraper's status (StateIntelligence), for display;
 *   3. the hand-verified rule;
 *   4. the static heuristic dataset (report only).
 */
export const KNOWN_STATE_STATUSES: readonly StateRuleStatus[] = [
  "Open for Offshore",
  "High Demand",
  "Closed",
  "Onshore Only",
  "Open (Onshore & Offshore)",
  "Open (Onshore Only)",
  "Open (Offshore Only)",
  "Suspended / Closed",
];

export function asKnownStateStatus(value: string | undefined | null): StateRuleStatus | undefined {
  return KNOWN_STATE_STATUSES.find((known) => known === value);
}

/** True when the admin row was saved on or after the day the rule was verified (or either date is unknown). */
export function adminStatusStillCurrent(adminUpdatedAt: string | undefined, ruleLastVerified: string | undefined): boolean {
  if (!adminUpdatedAt || !ruleLastVerified) return true;
  const admin = new Date(adminUpdatedAt).getTime();
  const rule = new Date(`${ruleLastVerified}T00:00:00Z`).getTime();
  if (Number.isNaN(admin) || Number.isNaN(rule)) return true;
  return admin >= rule;
}

/** The admin status when it still applies (see adminStatusStillCurrent), else undefined. */
export function currentAdminStatus(
  admin: { status?: string | null; updatedAt?: string } | undefined,
  rule: { lastVerified?: string } | undefined
): StateRuleStatus | undefined {
  if (!admin) return undefined;
  return adminStatusStillCurrent(admin.updatedAt, rule?.lastVerified) ? asKnownStateStatus(admin.status) : undefined;
}

/** The status shown to the customer: admin (if current) -> scraper -> rule -> fallback. */
export function resolveDisplayStatus(args: {
  admin?: { status?: string | null; updatedAt?: string };
  rule?: { status: StateRuleStatus; lastVerified?: string };
  intelStatus?: string | null;
  fallback?: StateRuleStatus;
}): StateRuleStatus | undefined {
  return currentAdminStatus(args.admin, args.rule) ?? asKnownStateStatus(args.intelStatus) ?? args.rule?.status ?? args.fallback;
}
