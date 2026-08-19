/**
 * Authoritative, hand-verified state nomination facts parsed from the raw
 * source documents in data/knowledge/State Immigrations/{CODE}/. This is a
 * deliberately small, high-confidence override layer on top of the
 * heuristic dataset in src/data/state-nomination-status.json -- that JSON
 * still owns the full state list and drives the score formula, but the
 * `status` and `note` fields for any state covered here should come from
 * this file instead, since it reflects the actual current program state
 * (open/closed, allocation, fees) rather than a generic estimate.
 *
 * Two consumers:
 *  - lib/readiness/state-nomination.ts (PDF State Nomination Matrix): reads
 *    `status` (overrides the JSON row's status, and therefore the score
 *    formula) and `note` (prepended into the state's requirements/note
 *    column).
 *  - lib/ai/retrieve-state-context.ts (AI Assistant RAG): reads the full
 *    object, including `aiSummary` and `keyFacts`, as grounded context for
 *    state-nomination questions.
 *
 * Add a new entry here whenever a state's source document is parsed;
 * states not listed here fall back entirely to the JSON dataset.
 */

export type StateRuleStatus = "Open for Offshore" | "High Demand" | "Closed" | "Onshore Only";

export interface StateRuleConfig {
  code: string;
  name: string;
  status: StateRuleStatus;
  /** Short, PDF-table-friendly note -- prepended into the state's requirements/note column. */
  note: string;
  offshoreQuotaPressure: "low" | "medium" | "high" | "closed";
  /** Longer prose paragraph for AI Assistant grounding -- not shown in the PDF. */
  aiSummary: string;
  /** Bullet facts (fees, thresholds, streams) for the AI Assistant to quote directly. */
  keyFacts: string[];
  lastVerified: string;
  sourceDocument: string;
}

export const STATE_RULES: Record<string, StateRuleConfig> = {
  ACT: {
    code: "ACT",
    name: "Australian Capital Territory",
    status: "High Demand",
    note: "ACT nomination runs through the merit-ranked Canberra Matrix, not a simple points cutoff -- the 2025-26 allocation is 800 places for subclass 190 and 800 for subclass 491, and demand for the program consistently exceeds this allocation.",
    offshoreQuotaPressure: "high",
    aiSummary:
      "The ACT Government nominates for subclass 491 (provisional) and subclass 190 (permanent) via a merit-based points system called the Canberra Matrix, not a first-come-first-served or simple-threshold process. The 2025-26 allocation is 800 places for subclass 190 and 800 for subclass 491; the ACT has not yet received its 2026-27 allocation. Applicants must first lodge a SkillSelect EOI, then submit a Canberra Matrix; only the highest-ranked Matrix submissions in each occupation are invited, and invitations are not guaranteed even if eligibility criteria are met. The National Innovation Visa (subclass 858) nomination process is not currently open.",
    keyFacts: [
      "Two nomination pathways: Skilled Work Regional (subclass 491, provisional) and Skilled Nominated (subclass 190, permanent).",
      "2025-26 allocation: 800 places for subclass 190 and 800 places for subclass 491.",
      "General pathway requires the nominated occupation to be on the ACT Nominated Migration Program Occupation List; Doctorate Streamlined and Small Business Owner pathways are exempt from that list requirement.",
      "English requirement: Competent for subclass 491; Proficient or Superior for subclass 190, unless the occupation is Chef (ANZSCO 351311) or has an ANZSCO skill level of 3-5, in which case Competent applies.",
      "Two-year commitment to live and work in Canberra after visa grant is mandatory for both subclasses.",
      "Canberra Matrix submissions lapse automatically after 6 months without an invitation (extendable to 12 months on update).",
      "Application fees (incl. GST): Canberra Matrix submission AUD 27.50; subclass 190 nomination AUD 357.50; subclass 491 nomination AUD 357.50.",
      "Once invited, applicants have 60 days to apply for the visa before the ACT nomination offer lapses.",
    ],
    lastVerified: "2026-08-19",
    sourceDocument: "data/knowledge/State Immigrations/ACT/ACT Migration.pdf",
  },
  NT: {
    code: "NT",
    name: "Northern Territory",
    status: "Closed",
    note: "The Northern Territory's 2025-26 General Skilled Migration nomination allocation has been fully exhausted. Applications already in the queue are still assessed, and will be considered for nomination once the 2026-27 allocation is received, but new applicants should treat NT nomination as closed for the remainder of the current program year.",
    offshoreQuotaPressure: "closed",
    aiSummary:
      "The Northern Territory Government's 2025-26 General Skilled Migration (subclass 491 and subclass 190) nomination allocation has been fully exhausted. New applications that meet nomination requirements are queued and will only be considered for nomination once the 2026-27 allocation is confirmed by the Australian Government -- there is no guaranteed timeline for that reopening. When the program is open, offshore applicants are generally only considered for subclass 491 (not 190), and must have a full skills assessment in an occupation on the Northern Territory Offshore Migration Occupations List (NTOMOL) under the NT Priority Occupation stream, or qualify under the NT Job Offer or NT Family streams instead. All nominees commit to living and working in the NT for at least 3 years from visa grant, and the NT Government does not issue release letters to transfer elsewhere.",
    keyFacts: [
      "2025-26 GSM nomination allocation is fully exhausted; further nominations paused until the 2026-27 allocation is confirmed.",
      "Minimum points test score required: 65 (Department of Home Affairs points test).",
      "Age cap: under 45 years at time of nomination.",
      "Offshore applicants are generally only considered for subclass 491, via one of three streams: NT Priority Occupation (occupation on NTOMOL), NT Job Offer (verifiable NT job offer), or NT Family (eligible relative resident in the NT for 12+ months).",
      "Offshore Priority Occupation stream requires at least 2 years post-qualification work experience in the nominated occupation within the last 5 years.",
      "3-year commitment to live and work in the NT from visa grant is mandatory for all nominees.",
      "Minimum settlement funds guidance: AU$35,000 (individual applicant) up to AU$65,000 (applicant + spouse + 2 children).",
      "Nomination application fee: AU$300 (plus GST where applicable), non-refundable, per application.",
      "Once nominated, applicants have 60 days to apply for the relevant visa before the nomination lapses.",
    ],
    lastVerified: "2026-08-19",
    sourceDocument: "data/knowledge/State Immigrations/NT/NT Government visa nomination.pdf",
  },
};

export function getStateRule(code: string): StateRuleConfig | undefined {
  return STATE_RULES[code];
}
