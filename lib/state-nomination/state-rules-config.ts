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

// Legacy values ("Open for Offshore" | "High Demand" | "Closed" | "Onshore
// Only") kept alongside the current admin-panel vocabulary -- see the doc
// comment on StateNominationStatus in lib/readiness/types.ts.
export type StateRuleStatus =
  | "Open for Offshore"
  | "High Demand"
  | "Closed"
  | "Onshore Only"
  | "Open (Onshore & Offshore)"
  | "Open (Onshore Only)"
  | "Open (Offshore Only)"
  | "Suspended / Closed";

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
  TAS: {
    code: "TAS",
    name: "Tasmania",
    status: "Open (Onshore & Offshore)",
    note: "Migration Tasmania ranks Registrations of Interest (ROI) into a Gold/Green/Orange-Plus/Orange/Red pass system across four onshore pathways (Skilled Employment, Skilled Graduate, Established Resident, Business Operator) plus a narrow Overseas Applicant (health/education job-offer) pathway -- the general offshore-only 491 pathway is currently paused for the 2026-27 program year.",
    offshoreQuotaPressure: "medium",
    aiSummary:
      "Migration Tasmania nominates for subclass 190 (+5 DHA points) and subclass 491 (+15 DHA points), on top of the Department of Home Affairs baseline requirements: under 45, an occupation on the relevant skilled occupation list, a valid positive skills assessment, at least Competent English, and at least 65 points on the DHA points test. Beyond that DHA baseline, Tasmania has its own nomination pathways, each with its own minimum requirements: Tasmanian Skilled Employment (TSE, for people already working in Tasmania in a role matching their skills assessment), Tasmanian Skilled Graduate (TSG, for Tasmanian tertiary graduates), Tasmanian Established Resident (TER, for long-term Tasmanian residents including remote workers and business owners), Tasmanian Business Operator (TBO, 491 only, for people who have run a profitable Tasmanian business for 12+ months), and a narrow Overseas Applicant pathway for people offshore with a genuine health/education-sector Tasmanian job offer. A general offshore-only 491 pathway (no Tasmanian job offer or ties) exists but Migration Tasmania is NOT issuing invitations under it for the 2026-27 program year. Meeting a pathway's minimum requirements only allows you to register interest -- it does not guarantee nomination, since Registrations of Interest (ROI) are ranked competitively into five tiers (Gold, Green, Orange-Plus, Orange, Red) based on priority attributes like wage level, length of Tasmanian employment/residence, and English level, and only the most competitive ROIs in each program year are invited to apply.",
    keyFacts: [
      "DHA baseline for state nomination: under 45, skills-assessed occupation on the relevant list, valid positive skills assessment, at least Competent English, at least 65 DHA points.",
      "Priority income level (needed for Gold/Green/Orange-Plus tiers): $57,000/year or $28.85/hour base rate, excluding overtime, penalties, bonuses or casual loading.",
      "Higher wage tiers used in priority scoring: $71,480/yr ($36.17/hr), $79,423/yr ($40.19/hr) -- the Temporary Skilled Migration Income Threshold -- and $106,600/yr ($53.95/hr).",
      "Five pass tiers ranked by priority attributes: Gold (1000 pts, immediate nomination), Green (500/300/250 pts, invited within ~6 months), Orange-Plus (30-100 pts, high priority within the Orange band), Orange (lower point attributes), Red (does not meet minimum requirements, cannot apply).",
      "Tasmanian Skilled Employment (TSE): requires 6-15 months (subclass 190) or 9-12 months (subclass 491) working in Tasmania at 20+ hrs/week, generally in a role matching the skills assessment, at or above the priority income level for the higher tiers.",
      "Tasmanian Skilled Graduate (TSG): all skills assessments eligible; requires a CRICOS-registered Tasmanian course (92 weeks min for 190, 40 weeks for 491), full-time on-site study, and 1-2 years living in Tasmania depending on subclass.",
      "Tasmanian Established Resident (TER): requires 2-3 years living in Tasmania (max 50% of total Australian residence elsewhere) plus qualifying employment, remote work (190 only), or a profitable Tasmanian business.",
      "Tasmanian Business Operator (TBO, 491 only): 12+ months operating a Tasmanian business, in profit after paying yourself at least 85% of the Temporary Skilled Migration Income Threshold (currently $67,509).",
      "Overseas Applicant (Health/Education job-offer) pathway: automatic Gold Pass for skills-assessed teachers, health/allied-health/medical/nursing professionals (ANZSCO 241/251/252/253/254) with a genuine 30+ hr/week Tasmanian job offer in a matching role.",
      "General offshore-only subclass 491 pathway is currently NOT open -- Migration Tasmania is not issuing invitations under it for the 2026-27 program year.",
      "Nomination application fee: AU$387 (plus 10% GST), non-refundable. Once invited, applicants have 28 days to apply for nomination and, once nominated, 60 days to apply for the visa.",
      "2-year commitment to live and work in Tasmania after nomination approval is mandatory across all pathways; subclass 491 nominees can never later be renominated for subclass 190.",
      "Mandatory documents across all pathways include: passport bio page, SkillSelect EOI, skills assessment (<=3 years old), English test (<=3 years old), 10-year CV, travel/arrival evidence, Tasmanian residence evidence, and bank statements showing Tasmanian living expenses.",
    ],
    lastVerified: "2026-08-31",
    sourceDocument: "data/knowledge/State Immigrations/TAS/Migration Tasmania-Skilled Migration.pdf",
  },
};

export function getStateRule(code: string): StateRuleConfig | undefined {
  return STATE_RULES[code];
}
