import { STATE_RULES, type StateRuleConfig, type StateRuleStatus } from "@/lib/state-nomination/state-rules-config";
import { getStateNominationConfigMap } from "@/lib/state-intelligence";

export type RetrievedStateContext = StateRuleConfig[];

const KNOWN_STATUSES: readonly StateRuleStatus[] = [
  "Open for Offshore",
  "High Demand",
  "Closed",
  "Onshore Only",
  "Open (Onshore & Offshore)",
  "Open (Onshore Only)",
  "Open (Offshore Only)",
  "Suspended / Closed",
];

function asKnownStatus(value: string | undefined): StateRuleStatus | undefined {
  return KNOWN_STATUSES.find((known) => known === value);
}

/**
 * Merges the admin-managed StateNominationConfig table (top priority --
 * see prisma/schema.prisma and app/[locale]/(main)/admin/states) over the
 * static STATE_RULES entry for a state. Only status/note are overridden;
 * the longer aiSummary/keyFacts prose still comes from state-rules-config
 * since the admin panel doesn't manage that. If a state has an admin
 * config row but no STATE_RULES entry, a minimal config-only record is
 * still returned so the assistant isn't silently blind to it.
 */
function applyAdminOverride(
  code: string,
  base: StateRuleConfig | undefined,
  admin: { status?: string; customAiNote?: string | null } | undefined
): StateRuleConfig | undefined {
  if (!admin) return base;

  const status = asKnownStatus(admin.status) ?? base?.status;
  if (!status) return base;

  return {
    code,
    name: base?.name ?? code,
    status,
    note: admin.customAiNote?.trim() || base?.note || `${code} status was manually set by an admin.`,
    offshoreQuotaPressure:
      status === "Closed" || status === "Suspended / Closed" ? "closed" : (base?.offshoreQuotaPressure ?? "medium"),
    aiSummary: base?.aiSummary ?? `${code} nomination status: ${status} (admin-set).`,
    keyFacts: base?.keyFacts ?? [],
    lastVerified: base?.lastVerified ?? new Date().toISOString().slice(0, 10),
    sourceDocument: base?.sourceDocument ?? "Admin panel override (StateNominationConfig)",
  };
}

// Covers all 8 states/territories the JSON heatmap dataset knows about (see
// src/data/state-nomination-status.json), not just ACT/NT -- an admin
// override (StateNominationConfig) can apply to any of them, so detection
// shouldn't be limited to the two states STATE_RULES currently has static
// prose for.
const STATE_NAME_ALIASES: Record<string, string> = {
  nsw: "NSW",
  "new south wales": "NSW",
  sydney: "NSW",
  vic: "VIC",
  victoria: "VIC",
  melbourne: "VIC",
  wa: "WA",
  "western australia": "WA",
  perth: "WA",
  sa: "SA",
  "south australia": "SA",
  adelaide: "SA",
  qld: "QLD",
  queensland: "QLD",
  brisbane: "QLD",
  act: "ACT",
  "australian capital territory": "ACT",
  canberra: "ACT",
  nt: "NT",
  "northern territory": "NT",
  darwin: "NT",
  tas: "TAS",
  tasmania: "TAS",
  hobart: "TAS",
};

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

function hasWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

function detectStateCodes(message: string): string[] {
  const lower = normalize(message);
  const codes = new Set<string>();

  for (const [alias, code] of Object.entries(STATE_NAME_ALIASES)) {
    if (alias.includes(" ") ? lower.includes(alias) : hasWord(lower, alias)) {
      codes.add(code);
    }
  }

  return Array.from(codes);
}

/**
 * Retrieves grounded state-nomination context for the AI Assistant, mirroring
 * retrieve-visa-context.ts's pattern for visa subclasses. Base coverage is
 * the hand-verified lib/state-nomination/state-rules-config.ts (currently
 * ACT/NT) -- when a message mentions a state that isn't in STATE_RULES and
 * has no admin override either, this returns nothing for that state rather
 * than falling back to the generic JSON heatmap dataset, since that dataset
 * is a heuristic estimate not meant to be quoted to users as fact.
 *
 * The admin-managed StateNominationConfig table (see
 * lib/state-intelligence.ts's getStateNominationConfigMap and
 * app/[locale]/(main)/admin/states) is layered on top of STATE_RULES for
 * every detected state, so an admin closing a state is reflected in the AI
 * Assistant's answer immediately -- including for states outside ACT/NT
 * that have no static prose at all, via applyAdminOverride's fallback.
 *
 * When no specific state is mentioned but the message is clearly asking
 * about state nomination in general (190/491/"state nomination" keywords),
 * all currently-verified states (STATE_RULES ∪ admin-configured states) are
 * returned so the assistant can compare them.
 */
export async function retrieveStateContext(message: string): Promise<RetrievedStateContext> {
  const lower = normalize(message);
  const detectedCodes = detectStateCodes(message);

  const asksGeneralStateNomination =
    hasWord(lower, "190") ||
    hasWord(lower, "491") ||
    lower.includes("state nomination") ||
    lower.includes("state sponsorship") ||
    lower.includes("eyalet");

  if (detectedCodes.length === 0 && !asksGeneralStateNomination) return [];

  const adminConfig = await getStateNominationConfigMap();

  const codes =
    detectedCodes.length > 0
      ? detectedCodes
      : Array.from(new Set([...Object.keys(STATE_RULES), ...Object.keys(adminConfig)]));

  return codes
    .map((code) => applyAdminOverride(code, STATE_RULES[code], adminConfig[code]))
    .filter((rule): rule is StateRuleConfig => Boolean(rule));
}
