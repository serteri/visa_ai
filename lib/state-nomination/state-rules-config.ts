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
 * All 8 AU states/territories are covered here as of the 2026-09-22
 * rebuild (previously only ACT/NT/TAS were). The admin-entered State
 * Nomination Config in the production database still takes priority over
 * both this file and the JSON at read time -- see
 * lib/state-intelligence.ts's getStateNominationConfigMap -- so a
 * discrepancy between this file and the live admin panel does not
 * self-correct; it needs a human to update the admin panel (or this file,
 * if the document is what's actually wrong).
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
      "The ACT Government nominates for subclass 491 (provisional) and subclass 190 (permanent) via a merit-based points system called the Canberra Matrix, not a first-come-first-served or simple-threshold process. The 2025-26 allocation is 800 places for subclass 190 and 800 for subclass 491; the ACT has not yet received its 2026-27 allocation. Applicants must first lodge a SkillSelect EOI, then submit a Canberra Matrix; only the highest-ranked Matrix submissions in each occupation are invited, and invitations are not guaranteed even if eligibility criteria are met. Relevant work experience requirements vary by pathway: at least 1 year full-time post-graduate experience in the nominated occupation within the last 5 years for some pathways, at least 3 years for others. The National Innovation Visa (subclass 858) nomination process is not currently open.",
    keyFacts: [
      "Two nomination pathways: Skilled Work Regional (subclass 491, provisional) and Skilled Nominated (subclass 190, permanent).",
      "2025-26 allocation: 800 places for subclass 190 and 800 places for subclass 491.",
      "General pathway requires the nominated occupation to be on the ACT Nominated Migration Program Occupation List; Doctorate Streamlined and Small Business Owner pathways are exempt from that list requirement.",
      "Work experience: at least 1 year full-time post-graduate relevant experience in the last 5 years for some pathways, at least 3 years for others (varies by pathway).",
      "English requirement: Competent for subclass 491; Proficient or Superior for subclass 190, unless the occupation is Chef (ANZSCO 351311) or has an ANZSCO skill level of 3-5, in which case Competent applies.",
      "Two-year commitment to live and work in Canberra after visa grant is mandatory for both subclasses.",
      "Canberra Matrix submissions lapse automatically after 6 months without an invitation (extendable to 12 months on update).",
      "Application fees (incl. GST): Canberra Matrix submission AUD 27.50; subclass 190 nomination AUD 357.50; subclass 491 nomination AUD 357.50.",
      "Once invited, applicants have 60 days to apply for the visa before the ACT nomination offer lapses.",
    ],
    lastVerified: "2026-09-22",
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
    lastVerified: "2026-09-22",
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
    lastVerified: "2026-09-22",
    sourceDocument: "data/knowledge/State Immigrations/TAS/Migration Tasmania-Skilled Migration.pdf",
  },
  NSW: {
    code: "NSW",
    name: "New South Wales",
    status: "Suspended / Closed",
    note: "New South Wales' Skilled Nominated (190) and Skilled Work Regional (491) programs are both closed for the current program year -- an 'Important Notice: Closure' banner on both program documents states all 2025-26 nomination places have been fully allocated. Already-submitted applications continue to be assessed; updated 2026-27 settings are not yet published.",
    offshoreQuotaPressure: "closed",
    aiSummary:
      "Investment NSW's Skilled Nominated (subclass 190) and Skilled Work Regional (subclass 491) programs are both closed for the 2025-26 program year -- an 'Important Notice: Closure' banner on both program pages states all available nomination places have been fully allocated. Applications already submitted continue to be assessed and finalised once new nomination places are allocated; updated eligibility settings for the next program year had not been published as of 16 August 2026. NSW nomination is invitation-only (candidates cannot apply directly) via a selection-based process from SkillSelect EOIs whose occupation falls within an ANZSCO unit group on the NSW Skills List (190) or NSW Regional Skills List (491); NSW explicitly discourages relying solely on an NSW invitation given how competitive the program is even when open. Subclass 491 offers three pathways: currently-employed-with-a-regional-NSW-employer (6 months' qualifying employment paid at least the TSMIT/CSIT rate), invited-by-Investment-NSW, and recent-regional-NSW-graduate.",
    keyFacts: [
      "Both the Skilled Nominated (190) and Skilled Work Regional (491) programs are closed for the 2025-26 program year -- all available nomination places have been fully allocated.",
      "Applications already submitted continue to be assessed; updated eligibility settings for the next program year are not yet published.",
      "Invitation-only: candidates cannot apply directly for NSW nomination.",
      "Occupation must fall within an ANZSCO unit group on the NSW Skills List (subclass 190) or the NSW Regional Skills List (subclass 491).",
      "Subclass 190 residency basis: working 20+ hrs/week in NSW in the nominated occupation, OR 6+ months continuous NSW residence, OR 6+ months continuous offshore residence.",
      "Subclass 491 has three pathways: Pathway 1 (6+ months' current regional-NSW employment paid at least the TSMIT/CSIT rate), Pathway 2 (Investment NSW invitation, ANZSCO unit group on the NSW Regional Skills List), Pathway 3 (recent graduate of a regional NSW institution).",
      "Invitations, once issued, must be responded to within 14 days; nomination assessment typically takes about six weeks after payment.",
      "No nomination fee figure is published in either program document -- NOT VERIFIABLE from data/knowledge.",
    ],
    lastVerified: "2026-09-22",
    sourceDocument:
      "data/knowledge/State Immigrations/NSW/Skilled Nominated visa (Subclass 190)/Skilled Nominated visa (Subclass 190).pdf; data/knowledge/State Immigrations/NSW/Skilled Work Regional visa (subclass 491)/Skilled Work Regional visa (subclass 491) NSW.pdf",
  },
  // Victoria: closure confirmed 2026-09-23 directly against liveinmelbourne.vic.gov.au ("Victoria's 2025-26
  // skilled visa nomination program is closed, and all places have been filled. Information about the
  // 2026-27 program will be published when available."). The data/knowledge/State Immigrations/Victoria
  // documents predate that announcement and are stale on program status; the eligibility facts below
  // (free ROI, DHA baseline, no separate state list) come from them and describe the program when open.
  // `status`/`offshoreQuotaPressure` are deliberately left as they were -- the admin panel's
  // "Suspended / Closed" takes priority at read time (see getStateNominationConfigMap).
  VIC: {
    code: "VIC",
    name: "Victoria",
    status: "Open (Onshore & Offshore)",
    note: "Victoria's 2025-26 skilled visa nomination program (subclasses 190 and 491) is closed -- Live in Melbourne states all places have been filled. Information about the 2026-27 program has not yet been published.",
    offshoreQuotaPressure: "medium",
    aiSummary:
      "Victoria's 2025-26 skilled visa nomination program is closed: the official Live in Melbourne site (liveinmelbourne.vic.gov.au) states that all places have been filled and that information about the 2026-27 program will be published when available. No new Registrations of Interest can be selected for Victorian nomination until 2026-27 settings are announced. When the program is open, Victoria nominates for subclass 190 (permanent) and subclass 491 (provisional, regional) through a free Registration of Interest (ROI) on the Live in Melbourne portal, with only the Department of Home Affairs visa fee payable later. Both onshore and offshore applicants have been eligible: offshore applicants for 491 were not required to claim earnings in their ROI, and subclass 190 applicants living overseas had to commit to living in Victoria; subclass 190 had no minimum work experience or hours-of-work requirement. Basic DHA-aligned eligibility applies (under 45, Competent English, valid skills assessment on the Australian Government's own eligible skilled occupation list -- Victoria does not maintain its own separate list, unlike NSW/SA/WA) and at least 65 points. These when-open settings come from 2025-26 program documents and may change for 2026-27.",
    keyFacts: [
      "The 2025-26 Victorian skilled visa nomination program (subclasses 190 and 491) is closed -- all places have been filled (confirmed on liveinmelbourne.vic.gov.au).",
      "Information about the 2026-27 program has not yet been published.",
      "When open: Registration of Interest (ROI) and nomination are free of charge -- only the Department of Home Affairs visa fee applies.",
      "When open: subclass 190 has no minimum work experience or hours-of-work requirement.",
      "When open: subclass 491 offshore applicants are not required to claim earnings in their ROI; onshore applicants must be living and working in regional Victoria.",
      "Occupation must be on the Australian Government's own eligible skilled occupation list -- Victoria does not maintain a separate state list (unlike NSW/SA/WA).",
      "DHA baseline applies: under 45, at least Competent English, valid skills assessment, at least 65 points.",
    ],
    lastVerified: "2026-09-23",
    sourceDocument: "Confirmed directly against liveinmelbourne.vic.gov.au (2026-09-23)",
  },
  QLD: {
    code: "QLD",
    name: "Queensland",
    status: "Suspended / Closed",
    note: "Queensland's 2025-26 State Nominated Migration Program (SNMP) Registrations of Interest are closed across every pathway (offshore skilled workers, building/construction, university graduates, small business owners, and the National Innovation Visa) -- updated 2026-27 settings and an opening date have not yet been published.",
    offshoreQuotaPressure: "closed",
    aiSummary:
      "Migration Queensland's State Nominated Migration Program (SNMP) covers subclass 190 (permanent) and subclass 491 (provisional, regional) nomination, plus a small-business-owner 491 pathway and the National Innovation Visa (subclass 858). Every one of these pathways carries the same repeated notice: 'Queensland's Registrations of Interest (ROIs) for the 2025-26 State Nominated Migration Program (SNMP) are now closed,' with updated settings and an opening date for 2026-27 not yet published. Residency/employment eligibility (when open) is not experience-in-years based but a recent local-residency test: 6 months living and working in regional Queensland at 20+ hrs/week in the nominated (or a closely ANZSCO-related) occupation for subclass 491, or 9 months in Queensland generally for subclass 190, in each case completed after finishing the relevant qualification. No nomination-fee figure is published in this document.",
    keyFacts: [
      "Registrations of Interest for the 2025-26 State Nominated Migration Program (SNMP) are closed across all pathways: general offshore, building & construction, university graduates, small business owners, and the National Innovation Visa (subclass 858).",
      "2026-27 program settings, eligibility criteria and an opening date have not yet been published.",
      "Covers subclass 190 (permanent) and subclass 491 (provisional, regional); a dedicated pathway nominates small business owners in regional Queensland for subclass 491 only.",
      "Residency/employment test when open: 6 months living and working in regional Queensland (491) or 9 months in Queensland (190), at 20+ hrs/week, after completing the relevant qualification, in the nominated occupation or one sharing its first 3 ANZSCO digits.",
      "Small Business Owner pathway: ROIs closed for 2025-26; businesses purchased after 19 September 2025 are not eligible under Pathway 2 at all.",
      "No nomination fee figure is published in this document -- NOT VERIFIABLE from data/knowledge.",
    ],
    lastVerified: "2026-09-22",
    sourceDocument: "data/knowledge/State Immigrations/Queensland/Skilled visa options (Queensland)/Skilled visa options (Queensland).pdf",
  },
  SA: {
    code: "SA",
    name: "South Australia",
    status: "Open (Onshore & Offshore)",
    note: "South Australia's Skilled & Business Migration invites Registrations of Interest / EOIs on an ongoing basis throughout 2025-26 for both subclass 190 and 491, prioritising Building & Construction, Defence, Education, Engineering, Health and Manufacturing; no allocation-exhausted or closure notice appears anywhere in the source documents.",
    offshoreQuotaPressure: "high",
    aiSummary:
      "South Australia's Skilled & Business Migration nominates for subclass 190 (5 extra DHA points) and subclass 491 (15 extra DHA points) via Registration of Interest (onshore) or SkillSelect EOI alone (offshore). Invitations 'will be sent on an ongoing basis throughout 2025-26'; the nomination process is described as 'highly competitive' since the Australian Government caps SA's nomination places each year, and only the most competitive ROIs/EOIs are invited (assessed on English proficiency, years of skilled experience, qualification level, salary, and employer). For 2025-26, SA prioritises the Building & Construction, Defence, Education, Engineering, Health and Manufacturing sectors for subclass 190 eligibility; other sectors are generally directed to subclass 491, or may still be considered if high-ranking. A separate Skilled Employment in South Australia stream (onshore only) requires 12+ months' SA residence and 12+ months' current full-time (30+ hrs/week) employment in an occupation sharing the nominated occupation's ANZSCO Sub Major Group. No closure, suspension, or allocation-exhausted notice appears anywhere across SA's nomination, subclass 190, or subclass 491 documents. No nomination-fee figure is published, only that 'application fees paid are not refundable.'",
    keyFacts: [
      "Covers subclass 190 (5 extra DHA points) and subclass 491 (15 extra DHA points); invitations sent on an ongoing basis throughout 2025-26.",
      "2025-26 priority sectors for subclass 190 eligibility: Building & Construction, Defence, Education, Engineering, Health, Manufacturing -- other sectors are generally directed to subclass 491 (or considered if high-ranking).",
      "Nomination is described as 'highly competitive'; ranking factors include English proficiency, years of skilled experience, qualification level, salary and employer assessment.",
      "Skilled Employment in South Australia stream (onshore only): 12+ months SA residence AND 12+ months current full-time (30+ hrs/week) employment in the same ANZSCO Sub Major Group as the nominated occupation.",
      "Occupation must be on the South Australian Skilled Occupation List and eligible for the relevant subclass.",
      "No allocation-exhausted, closure, or suspension notice appears in the nomination, subclass 190, or subclass 491 documents.",
      "No nomination fee figure is published -- only that 'application fees paid are not refundable' -- NOT VERIFIABLE from data/knowledge.",
    ],
    lastVerified: "2026-09-22",
    sourceDocument:
      "data/knowledge/State Immigrations/SA/State nomination South Australia/State nomination South Australia.pdf; data/knowledge/State Immigrations/SA/Skilled Nominated Visa (subclass 190)SA/Skilled Nominated Visa (subclass 190)SA.pdf; data/knowledge/State Immigrations/SA/Skilled Work Regional (Provisional) Visa (subclass 491) SA/Skilled Work Regional (Provisional) Visa (subclass 491) SA.pdf",
  },
  WA: {
    code: "WA",
    name: "Western Australia",
    status: "Open (Onshore & Offshore)",
    note: "Western Australia is actively issuing invitations under the 2025-26 State Nominated Migration Program (SNMP) -- the newest documents in this folder (dated 22 August 2026) record invitation activity for skilled-trade occupations as recently as 16 May 2026, with 8,162 invitations issued across all streams to date this program year.",
    offshoreQuotaPressure: "medium",
    aiSummary:
      "Western Australia's State Nominated Migration Program (SNMP) covers a General stream (WASMOL Schedule 1 and 2 occupation lists) and a Graduate stream (Graduate Occupation List, GOL) for subclass 190 and subclass 491. Both onshore (WA-resident) and offshore (interstate or overseas) candidates are eligible, though EOIs are ranked with WA residents first, then priority-industry occupations (building & construction, healthcare & social assistance, hospitality & tourism, education & training), then all other sectors, then highest EOI points, then oldest submission date -- so offshore candidates in non-priority occupations face the most competition. Minimum work experience: at least 1 year of Australian or overseas work experience in the nominated (or closely related) occupation within the last 10 years, at the time of invitation. The nomination application fee is a non-refundable AUD $200. Invitations are anticipated monthly; this folder's freshest documents (dated 22 August 2026, versus 16 August 2026 for the main program PDF) record actual invitation activity through at least 16 May 2026 for General stream trades (e.g. Electrician (General), 65 points, invited 16/05/2026) and cumulative 2025-26 invitations of 8,162 across General and Graduate streams as of the most recent data point in the 'Invitations issued' chart (through March 2026, with a small number trickling into April/May).",
    keyFacts: [
      "Covers subclass 190 and subclass 491 via a General stream (WASMOL Schedule 1/2 occupation lists) and a Graduate stream (Graduate Occupation List, GOL).",
      "Both onshore (WA-resident) and offshore (interstate/overseas) candidates are eligible; ranking prioritises WA residents, then priority-industry occupations (building & construction, healthcare & social assistance, hospitality & tourism, education & training), then all other sectors, then EOI points, then submission date.",
      "Minimum work experience: at least 1 year of Australian OR overseas work experience in the nominated (or closely related) occupation within the last 10 years.",
      "Nomination application fee: AUD $200, non-refundable; applicants have 28 calendar days to lodge the application once invited.",
      "Invitations are anticipated monthly; freshest documents in this folder (22 Aug 2026) record actual invitation activity through 16/05/2026 for General-stream trades (e.g. Electrician (General), 65 points).",
      "2025-26 program-to-date total: 8,162 invitations issued across General and Graduate streams, General/Graduate x 190/491 (per the 'Invitations issued' chart, latest full month March 2026).",
      "If an EOI seeks nomination for both subclass 190 and 491, WA generally invites for subclass 491 first (typically a higher EOI points score).",
    ],
    lastVerified: "2026-09-22",
    sourceDocument:
      "data/knowledge/State Immigrations/Western Australia/State Nominated Migration Program/State Nominated Migration Program Western Australia.pdf; data/knowledge/State Immigrations/Western Australia/Last invited expression of interest - Priority trade occupations - May 2026.pdf; data/knowledge/State Immigrations/Western Australia/2025—26 program year — Invitations issued.png",
  },
};

export function getStateRule(code: string): StateRuleConfig | undefined {
  return STATE_RULES[code];
}
