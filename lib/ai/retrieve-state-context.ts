import { getAdminStateData } from "@/lib/admin-data/loader";
import { localizedText } from "@/lib/admin-data/localized";
import type { AdminStateData, DataLocale } from "@/lib/admin-data/types";
import type { StateRuleConfig } from "@/lib/state-nomination/state-rules-config";

export type RetrievedStateContext = StateRuleConfig[];

/**
 * The state's rule in the shape the assistant uses, from the admin's data (lib/admin-data): the status, note and conditions the admin saved,
 * with the note in the answer's language when its translation has been reviewed (English otherwise). The admin row is the data: there is no
 * other source to merge it with.
 */
function ruleFor(data: AdminStateData, code: string, locale: DataLocale): StateRuleConfig | undefined {
  const rule = data.rules[code];
  if (!rule) return undefined;
  return {
    code: rule.code,
    name: rule.name,
    status: rule.status,
    note: localizedText(rule.notes, locale),
    offshoreQuotaPressure: rule.offshoreQuotaPressure,
    aiSummary: rule.aiSummary,
    keyFacts: rule.keyFactFields.map((f) => localizedText(f, locale)),
    lastVerified: rule.lastVerified,
    sourceDocument: rule.sourceDocument,
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
 * Retrieves grounded state-nomination context for the AI Assistant, mirroring retrieve-visa-context.ts's pattern for visa subclasses, from
 * the admin's state data. When no specific state is mentioned but the message is clearly asking about state nomination in general
 * (190/491/"state nomination" keywords), all states are returned so the assistant can compare them.
 */
export async function retrieveStateContext(message: string, locale: DataLocale = "en", data?: AdminStateData): Promise<RetrievedStateContext> {
  const lower = normalize(message);
  const detectedCodes = detectStateCodes(message);

  const asksGeneralStateNomination =
    hasWord(lower, "190") ||
    hasWord(lower, "491") ||
    lower.includes("state nomination") ||
    lower.includes("state sponsorship") ||
    lower.includes("eyalet");

  if (detectedCodes.length === 0 && !asksGeneralStateNomination) return [];

  const snapshot = data ?? (await getAdminStateData());
  const codes = detectedCodes.length > 0 ? detectedCodes : Object.keys(snapshot.rules);
  return codes.map((code) => ruleFor(snapshot, code, locale)).filter((rule): rule is StateRuleConfig => Boolean(rule));
}
