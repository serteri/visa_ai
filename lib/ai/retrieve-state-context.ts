import { STATE_RULES, type StateRuleConfig } from "@/lib/state-nomination/state-rules-config";

export type RetrievedStateContext = StateRuleConfig[];

const STATE_NAME_ALIASES: Record<string, string> = {
  act: "ACT",
  "australian capital territory": "ACT",
  canberra: "ACT",
  nt: "NT",
  "northern territory": "NT",
  darwin: "NT",
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
 * retrieve-visa-context.ts's pattern for visa subclasses. Only states covered
 * by the hand-verified lib/state-nomination/state-rules-config.ts are
 * returned -- when a message mentions a state that isn't in STATE_RULES yet,
 * this returns an empty array rather than falling back to the generic JSON
 * heatmap dataset, since that dataset is a heuristic estimate not meant to be
 * quoted to users as fact.
 *
 * When no specific state is mentioned but the message is clearly asking about
 * state nomination in general (190/491/"state nomination" keywords), all
 * currently-verified states are returned so the assistant can compare them.
 */
export function retrieveStateContext(message: string): RetrievedStateContext {
  const lower = normalize(message);
  const detectedCodes = detectStateCodes(message);

  if (detectedCodes.length > 0) {
    return detectedCodes
      .map((code) => STATE_RULES[code])
      .filter((rule): rule is StateRuleConfig => Boolean(rule));
  }

  const asksGeneralStateNomination =
    hasWord(lower, "190") ||
    hasWord(lower, "491") ||
    lower.includes("state nomination") ||
    lower.includes("state sponsorship") ||
    lower.includes("eyalet");

  if (asksGeneralStateNomination) {
    return Object.values(STATE_RULES);
  }

  return [];
}
