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
 * rebuild (previously only ACT/NT/TAS were). ACT, NSW, NT, QLD, SA, TAS and WA were refreshed on 2026-10-13 from the official
 * pages (dated snapshots under data/knowledge/State Immigrations/<STATE>/2026-27/); NT and TAS rest on facts the project owner
 * confirmed on the official pages that day (those sites blocked the automated fetch), and VIC was not re-fetched. The admin-entered State
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
  | "Suspended / Closed"
  | "Check official page";

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
    note: "ACT nomination runs through the merit-ranked Canberra Matrix, not a simple points cutoff -- the ACT's 2026-27 allocation has not yet been confirmed by the Australian Government (2025-26 was 800 places for subclass 190 and 800 for subclass 491, all used), the first 2026-27 invitation round is scheduled for the week starting 12 October 2026 (subclass 190 only), and demand consistently exceeds the allocation.",
    offshoreQuotaPressure: "high",
    aiSummary:
      "The ACT Government nominates for subclass 491 (provisional) and subclass 190 (permanent) via a merit-based points system called the Canberra Matrix, not a first-come-first-served or simple-threshold process. The ACT's 2026-27 allocation of nomination places has not yet been confirmed by the Australian Government (ACT Migration home page, 13 October 2026); the 2025-26 allocation was 800 places for subclass 190 and 800 for subclass 491 and none remained at 30 June 2026. The first 2026-27 invitation round is scheduled for the week starting 12 October 2026 (subclass 190 only); the tentative later rounds are the weeks starting 25 January 2027, 22 March 2027 and 24 May 2027, and all dates can change without notice. Applicants submit a Canberra Matrix (fee AUD 27.50 incl. GST) and only the highest-ranked Matrix in each occupation are invited; invitations are not guaranteed even if eligibility criteria are met. Pathways: the General pathway (occupation on the ACT Nominated Migration Program Occupation List, last updated 10 October 2025), Doctorate Streamlined, and Small Business Owner. Canberra residents need 6 months' Canberra residence and 26 weeks' employment (30+ hours a week in at least 26 of the 30 weeks before submission) for subclass 190, or 3 months' residence and 13 weeks' employment (15+ hours a week in at least 13 of the 15 weeks) for subclass 491. Overseas applicants need at least 3 years (subclass 190) or 1 year (subclass 491) of full-time post-graduate work experience in the nominated occupation within the last 5 years. The National Innovation Visa (subclass 858) nomination process is not open.",
    keyFacts: [
      "Checked against the ACT Migration pages (www.act.gov.au/migration) on 13 October 2026.",
      "2026-27 allocation: not yet confirmed by the Australian Government. 2025-26 allocation was 800 places for subclass 190 and 800 for subclass 491; total allocation remaining at 30 June 2026 was 0.",
      "2026-27 invitation rounds (tentative, may change without notice): week starting 12 October 2026 (subclass 190 only), 25 January 2027, 22 March 2027, 24 May 2027.",
      "Latest published round (11 June 2026): Critical Skill Occupations -- 66 invitations for subclass 190 to Canberra residents, none to overseas applicants; Doctorate Streamlined -- 8 (190) and 5 (491); Small Business Owners -- 3 (190, minimum Matrix score 110).",
      "Two nomination pathways: Skilled Work Regional (subclass 491, provisional) and Skilled Nominated (subclass 190, permanent).",
      "General pathway requires the nominated occupation to be on the ACT Nominated Migration Program Occupation List (last updated 10 October 2025); Doctorate Streamlined and Small Business Owner pathways are exempt from that list requirement.",
      "Canberra residents: 190 needs 6 months' Canberra residence and 26 weeks' employment (30+ hrs/week in at least 26 of the 30 weeks before submission); 491 needs 3 months' residence and 13 weeks' employment (15+ hrs/week in at least 13 of the 15 weeks).",
      "Overseas applicants: at least 3 years (subclass 190) or 1 year (subclass 491) of full-time post-graduate work experience in the nominated occupation in the last 5 years; must not have lived in Australia for the last 12 months.",
      "English requirement: Competent for subclass 491 (unless the assessing authority requires higher); Proficient or Superior for subclass 190, unless the occupation is Chef (ANZSCO 351311) or has an ANZSCO skill level of 3-5.",
      "Mandatory two-year commitment to live and work in Canberra after visa grant (overseas applicants: from arrival), for both subclasses.",
      "Canberra Matrix fee must be paid within 7 days of submission or it lapses; a Matrix lapses after 6 months without an invitation (extended by 6 months on update, maximum 12 months).",
      "Application fees (incl. GST, page updated 27 July 2026): Canberra Matrix submission AUD 27.50; subclass 190 nomination AUD 357.50; subclass 491 nomination AUD 357.50.",
      "Once invited, applicants have 14 days to submit the nomination application; once nominated they have 60 days to apply for the visa before the nomination offer expires.",
      "National Innovation Visa (subclass 858): the ACT nomination process is not yet open.",
    ],
    lastVerified: "2026-10-13",
    sourceDocument:
      "data/knowledge/State Immigrations/ACT/2026-27/ACT Home - updates (fetched 2026-10-13).md; data/knowledge/State Immigrations/ACT/2026-27/ACT Canberra Matrix invitation rounds (fetched 2026-10-13).md; data/knowledge/State Immigrations/ACT/2026-27/ACT Migration application fees (fetched 2026-10-13).md; data/knowledge/State Immigrations/ACT/2026-27/ACT 190 Canberra resident eligibility (fetched 2026-10-13).md; data/knowledge/State Immigrations/ACT/2026-27/ACT 491 Canberra resident eligibility (fetched 2026-10-13).md",
  },
  NT: {
    code: "NT",
    name: "Northern Territory",
    // The enum has no value for "closed with an exception"; "Suspended / Closed" keeps the NT out of the open count and
    // scores it as closed. The exact wording of the status and of the exception is in the note below.
    status: "Suspended / Closed",
    note: "Closed to new applications (2026-27), with a narrow onshore 491 exception. The NT's 2026-27 program is closed to new applications (\"sufficient applications received\") for subclass 190 and all offshore streams. The exception is subclass 491 for onshore applicants who meet the NT Graduate or NT Resident criteria and have a visa deadline before 30 September 2027: a substantive visa expiring on or before 30 September 2027 and not eligible for subclass 485; turning 45 on or before 30 September 2027; or 491 points falling below 65 because of a birthday on or before 30 September 2027.",
    offshoreQuotaPressure: "closed",
    aiSummary:
      "Northern Territory nomination: Closed to new applications (2026-27), with a narrow onshore 491 exception. The NT's 2026-27 program is closed to new applications (\"sufficient applications received\") for subclass 190 and for all offshore streams. The only exception is subclass 491 for onshore applicants who meet the NT Graduate or NT Resident criteria and have a visa deadline before 30 September 2027, meaning one of: a substantive visa expiring on or before 30 September 2027 and not eligible for subclass 485; turning 45 on or before 30 September 2027; or 491 points falling below 65 because of a birthday on or before 30 September 2027. Everyone else (including all offshore applicants and all subclass 190 applicants) cannot currently apply. This status was confirmed by the project owner on the official Northern Territory page on 13 October 2026 (the page could not be fetched automatically); the NT's 2026-27 fees and stream details have not been re-confirmed.",
    keyFacts: [
      "Status (2026-27): Closed to new applications, with a narrow onshore 491 exception -- confirmed on the official Northern Territory page on 13 October 2026.",
      "Closed to new applications (\"sufficient applications received\") for subclass 190 and all offshore streams.",
      "Exception: subclass 491 for onshore applicants meeting the NT Graduate or NT Resident criteria with a visa deadline before 30 September 2027.",
      "Visa deadline means: a substantive visa expiring on or before 30 September 2027 and not eligible for subclass 485; turning 45 on or before 30 September 2027; or 491 points falling below 65 because of a birthday on or before 30 September 2027.",
      "The Northern Territory is not counted as open in the nomination-availability count.",
      "2026-27 NT fees and stream conditions have not been re-confirmed; check the official Northern Territory page before relying on any earlier NT figure.",
    ],
    lastVerified: "2026-10-13",
    sourceDocument:
      "data/knowledge/State Immigrations/NT/2026-27/NT user-confirmed status (checked 2026-10-13).md; data/knowledge/State Immigrations/NT/NT Government visa nomination.pdf",
  },
  TAS: {
    code: "TAS",
    name: "Tasmania",
    // The Overseas Skilled Occupation Profiles (491) pathway has no invitations planned for 2026-27; only the narrow
    // health/education job-offer pathway (subclass 190) stays open offshore, so the status is onshore-only rather
    // than "Onshore & Offshore".
    status: "Open (Onshore Only)",
    note: "Migration Tasmania's 2026-27 program opened to new Registrations of Interest (ROI) on 17 August 2026 with 2,050 allocations (1,250 for subclass 190 and 800 for subclass 491) and weekly invitations from 20 August 2026. ROIs are ranked into a Gold/Green/Orange-Plus/Orange/Red pass system across four onshore pathways (Skilled Employment, Skilled Graduate, Established Resident, Business Operator); offshore, only the Overseas Applicant (health or education sector job offer) pathway remains for subclass 190, and no invitations are planned for the subclass 491 Overseas Skilled Occupation Profiles pathway in 2026-27.",
    offshoreQuotaPressure: "medium",
    aiSummary:
      "Migration Tasmania nominates for subclass 190 (+5 DHA points) and subclass 491 (+15 DHA points), on top of the Department of Home Affairs baseline requirements: under 45, an occupation on the relevant skilled occupation list, a valid positive skills assessment, at least Competent English, and at least 65 points on the DHA points test. The 2026-27 program opened to new Registrations of Interest (ROI) on 17 August 2026 with 2,050 allocations (1,250 for subclass 190 and 800 for subclass 491), with invitations issued weekly from 20 August 2026; the nomination service fee is AUD 387 (AUD 425.70 incl. GST) and there is no ROI fee (confirmed by the project owner on the official Migration Tasmania pages on 13 October 2026). Beyond the DHA baseline, Tasmania has its own nomination pathways, each with its own minimum requirements: Tasmanian Skilled Employment (TSE, for people already working in Tasmania in a role matching their skills assessment), Tasmanian Skilled Graduate (TSG, for Tasmanian tertiary graduates), Tasmanian Established Resident (TER, for long-term Tasmanian residents including remote workers and business owners), Tasmanian Business Operator (TBO, 491 only, for people who have run a profitable Tasmanian business for 12+ months), and for people offshore the Overseas Applicant -- Health or Education Sector Job Offer pathway, which remains available for subclass 190. The subclass 491 Overseas Skilled Occupation Profiles pathway has no invitations planned for 2026-27. The TSE Gold attribute now requires at least 30 hours per week in at least one job, and the priority income level is unchanged at AUD 57,000 a year or AUD 28.85 an hour. Meeting a pathway's minimum requirements only allows you to register interest -- it does not guarantee nomination, since ROIs are ranked competitively into five tiers (Gold, Green, Orange-Plus, Orange, Red) based on priority attributes like wage level, length of Tasmanian employment/residence, and English level, and only the most competitive ROIs in each program year are invited to apply.",
    keyFacts: [
      "Confirmed by the project owner on the official Migration Tasmania pages on 13 October 2026 (the site could not be fetched automatically); pathway details below that are not restated in that confirmation come from the earlier Migration Tasmania document.",
      "2026-27 program opened to new ROIs on 17 August 2026; weekly invitations from 20 August 2026.",
      "2026-27 allocations: 2,050 in total -- 1,250 for subclass 190 and 800 for subclass 491.",
      "Nomination service fee AUD 387 (AUD 425.70 incl. GST); there is no ROI fee.",
      "Subclass 491 Overseas Skilled Occupation Profiles pathway: no invitations planned for 2026-27.",
      "Overseas Applicant -- Health or Education Sector Job Offer pathway remains available for subclass 190.",
      "Tasmanian Skilled Employment (TSE) Gold attribute now requires at least 30 hours per week in at least one job.",
      "Priority income level (needed for Gold/Green/Orange-Plus tiers) unchanged: AUD 57,000/year or AUD 28.85/hour.",
      "Application Gateway: https://apply.migration.tas.gov.au",
      "DHA baseline for state nomination: under 45, skills-assessed occupation on the relevant list, valid positive skills assessment, at least Competent English, at least 65 DHA points.",
      "Five pass tiers ranked by priority attributes: Gold (1000 pts, immediate nomination), Green (500/300/250 pts, invited within ~6 months), Orange-Plus (30-100 pts, high priority within the Orange band), Orange (lower point attributes), Red (does not meet minimum requirements, cannot apply).",
      "Tasmanian Skilled Employment (TSE): requires 6-15 months (subclass 190) or 9-12 months (subclass 491) working in Tasmania at 20+ hrs/week, generally in a role matching the skills assessment, at or above the priority income level for the higher tiers.",
      "Tasmanian Skilled Graduate (TSG): all skills assessments eligible; requires a CRICOS-registered Tasmanian course (92 weeks min for 190, 40 weeks for 491), full-time on-site study, and 1-2 years living in Tasmania depending on subclass.",
      "Tasmanian Established Resident (TER): requires 2-3 years living in Tasmania (max 50% of total Australian residence elsewhere) plus qualifying employment, remote work (190 only), or a profitable Tasmanian business.",
      "Tasmanian Business Operator (TBO, 491 only): 12+ months operating a Tasmanian business, in profit after paying yourself at least 85% of the Temporary Skilled Migration Income Threshold.",
      "Mandatory documents across all pathways include: passport bio page, SkillSelect EOI, skills assessment (<=3 years old), English test (<=3 years old), 10-year CV, travel/arrival evidence, Tasmanian residence evidence, and bank statements showing Tasmanian living expenses (earlier Migration Tasmania document).",
      "Overseas Applicant (Health/Education job-offer) pathway: automatic Gold Pass for skills-assessed teachers, health/allied-health/medical/nursing professionals (ANZSCO 241/251/252/253/254) with a genuine 30+ hr/week Tasmanian job offer in a matching role.",
      "Once invited, applicants have 28 days to apply for nomination and, once nominated, 60 days to apply for the visa.",
      "2-year commitment to live and work in Tasmania after nomination approval is mandatory across all pathways; subclass 491 nominees can never later be renominated for subclass 190.",
    ],
    lastVerified: "2026-10-13",
    sourceDocument:
      "data/knowledge/State Immigrations/TAS/2026-27/TAS user-confirmed program settings (checked 2026-10-13).md; data/knowledge/State Immigrations/TAS/Migration Tasmania-Skilled Migration.pdf",
  },
  NSW: {
    code: "NSW",
    name: "New South Wales",
    status: "Suspended / Closed",
    note: "New South Wales' Skilled Nominated (190) and Skilled Work Regional (491) pages both carry a notice that applications are closed for the current program year because all available nomination places have been fully allocated (the notice does not name the program year). Already-submitted applications continue to be assessed; NSW is reviewing its program settings and eligibility criteria for the next program year and had not published new settings on 13 October 2026.",
    offshoreQuotaPressure: "closed",
    aiSummary:
      "Investment NSW's Skilled Nominated (subclass 190) and Skilled Work Regional (subclass 491) pages both carry an 'Important Notice' that applications are closed for the current program year because all available nomination places have been fully allocated (the notice does not name the program year). Applications already submitted continue to be assessed and finalised once new nomination places are allocated by the Department of Home Affairs; NSW is reviewing the program settings and eligibility criteria for the next program year, and no updated settings had been published on 13 October 2026. NSW nomination is invitation-only (candidates cannot apply directly): invitation rounds run through the financial year with no announced dates, from SkillSelect EOIs whose occupation falls within an ANZSCO unit group on the NSW Skills List (190) or NSW Regional Skills List (491), and the highest-ranking EOIs in each unit group are invited on factors such as age, English, education, points and years of skilled work experience (the date an EOI is submitted does not affect the outcome). NSW explicitly discourages relying solely on an NSW invitation given how competitive the program is even when open. Subclass 491 offers three pathways: currently-employed-with-a-regional-NSW-employer (6 months' qualifying employment paid at least the TSMIT/CSIT rate), invited-by-Investment-NSW, and recent-regional-NSW-graduate.",
    keyFacts: [
      "Checked against the NSW Government pages on 13 October 2026.",
      "Both the Skilled Nominated (190) and Skilled Work Regional (491) pages state applications are closed for the current program year -- all available nomination places have been fully allocated (the notice does not name the program year).",
      "Applications already submitted continue to be assessed; NSW is reviewing program settings and eligibility criteria for the next program year and has not published them.",
      "Invitation-only: candidates cannot apply directly for NSW nomination. Invitation rounds have no announced dates; the date an EOI is submitted does not affect the outcome.",
      "Occupation must fall within an ANZSCO unit group on the NSW Skills List (subclass 190) or the NSW Regional Skills List (subclass 491).",
      "Subclass 190 residency basis: working 20+ hrs/week in NSW in the nominated occupation, OR 6+ months continuous NSW residence, OR 6+ months continuous offshore residence.",
      "Subclass 491 has three pathways: Pathway 1 (6+ months' current regional-NSW employment paid at least the TSMIT/CSIT rate), Pathway 2 (Investment NSW invitation, ANZSCO unit group on the NSW Regional Skills List; working in NSW, or 3+ months continuous NSW or offshore residence), Pathway 3 (graduate of a regional NSW institution within the last 2 years, same residency basis as Pathway 2).",
      "Invitations, once issued, must be responded to within 14 days (not extended); nomination assessment typically takes about six weeks.",
      "No nomination fee figure is published on these pages.",
    ],
    lastVerified: "2026-10-13",
    sourceDocument:
      "data/knowledge/State Immigrations/NSW/2026-27/NSW Skilled Nominated visa (subclass 190) (fetched 2026-10-13).md; data/knowledge/State Immigrations/NSW/2026-27/NSW Skilled Work Regional visa (subclass 491) (fetched 2026-10-13).md; data/knowledge/State Immigrations/NSW/2026-27/NSW Skills Lists (fetched 2026-10-13).md",
  },
  // Victoria: closure confirmed 2026-09-23 directly against liveinmelbourne.vic.gov.au ("Victoria's 2025-26
  // skilled visa nomination program is closed, and all places have been filled. Information about the
  // 2026-27 program will be published when available."). The data/knowledge/State Immigrations/Victoria
  // documents predate that announcement and are stale on program status; the eligibility facts below
  // (free ROI, DHA baseline, no separate state list) come from them and describe the program when open.
  // `status`/`offshoreQuotaPressure` match the admin panel's "Suspended / Closed" (which still takes priority
  // at read time, see getStateNominationConfigMap), so the fallback used when the admin config can't be read
  // (CI, a DB failure) agrees with this note instead of scoring Victoria as open.
  VIC: {
    code: "VIC",
    name: "Victoria",
    status: "Suspended / Closed",
    note: "Victoria's 2025-26 skilled visa nomination program (subclasses 190 and 491) is closed -- Live in Melbourne states all places have been filled. Information about the 2026-27 program has not yet been published.",
    offshoreQuotaPressure: "closed",
    aiSummary:
      "Victoria's 2025-26 skilled visa nomination program is closed: the official Live in Melbourne site (liveinmelbourne.vic.gov.au) states that all places have been filled and that information about the 2026-27 program will be published when available. No new Registrations of Interest can be selected for Victorian nomination until 2026-27 settings are announced. When the program is open, Victoria nominates for subclass 190 (permanent) and subclass 491 (provisional, regional) through a free Registration of Interest (ROI) on the Live in Melbourne portal, with only the Department of Home Affairs visa fee payable later. Both onshore and offshore applicants have been eligible: offshore applicants for 491 were not required to claim earnings in their ROI, and subclass 190 applicants living overseas had to commit to living in Victoria; subclass 190 had no minimum work experience or hours-of-work requirement. Basic DHA-aligned eligibility applies (under 45, Competent English, valid skills assessment on the Australian Government's own eligible skilled occupation list -- Victoria does not maintain its own separate list, unlike NSW/SA/WA) and at least 65 points. These when-open settings come from 2025-26 program documents and may change for 2026-27.",
    keyFacts: [
      "These settings come from the 2025-26 program documents. Check the official Victoria page for current settings.",
      "The 2025-26 Victorian skilled visa nomination program (subclasses 190 and 491) is closed -- all places have been filled (confirmed on liveinmelbourne.vic.gov.au).",
      "Information about the 2026-27 program has not yet been published.",
      "When open: Registration of Interest (ROI) and nomination are free of charge -- only the Department of Home Affairs visa fee applies.",
      "When open: subclass 190 has no minimum work experience or hours-of-work requirement.",
      "When open: subclass 491 offshore applicants are not required to claim earnings in their ROI; onshore applicants must be living and working in regional Victoria.",
      "Occupation must be on the Australian Government's own eligible skilled occupation list -- Victoria does not maintain a separate state list (unlike NSW/SA/WA).",
      "DHA baseline applies: under 45, at least Competent English, valid skills assessment, at least 65 points.",
    ],
    lastVerified: "2026-10-11",
    sourceDocument: "Confirmed directly against liveinmelbourne.vic.gov.au (2026-10-11)",
  },
  QLD: {
    code: "QLD",
    name: "Queensland",
    status: "Suspended / Closed",
    note: "Queensland's Registrations of Interest (ROIs) for the 2025-26 State Nominated Migration Program (SNMP) are closed. The 2026-27 eligibility requirements and opening date had not been published on the Migration Queensland website on 13 October 2026, and the 2026-27 application fees for subclass 190 and 491 are listed as 'to be advised'.",
    offshoreQuotaPressure: "closed",
    aiSummary:
      "Migration Queensland's State Nominated Migration Program (SNMP) covers subclass 190 (permanent) and subclass 491 (provisional, regional) nomination, including a small-business-owner 491 pathway that is only available within Australia. The Migration Queensland onshore page states: 'Queensland's Registrations of Interest (ROIs) for the 2025-26 State Nominated Migration Program (SNMP) are now closed', and that updates on the SNMP program settings, including eligibility requirements and the opening date, will be published in due course (checked 13 October 2026). The 2026-27 program year has therefore not opened and its settings are not published; the application fee for subclass 190, subclass 491 and the 491 Small Business Owners pathway is listed as 'To be advised'. The onshore page still shows the 2025-26 minimum requirements, which may change for 2026-27: occupation on the Queensland Onshore Skills List, at least 65 points, at least Competent English, and a recent local-residency test of 6 months living and working in regional Queensland (subclass 491) or 9 months in Queensland (subclass 190) at 20+ hours a week, after the qualification, in the nominated occupation or one sharing its first 3 ANZSCO digits; a commitment to live and work in regional Queensland for 3 years after a 491 grant or in Queensland for 2 years after a 190 grant. Holders or applicants of a 491 or 489 visa cannot be nominated for subclass 190.",
    keyFacts: [
      "Checked against the Migration Queensland pages on 13 October 2026; the 2025-26 SNMP ROIs are closed.",
      "2026-27 program settings, eligibility criteria and opening date have not yet been published.",
      "2026-27 application fees for subclass 190, subclass 491 and the 491 Small Business Owners pathway are listed as 'To be advised'.",
      "Covers subclass 190 (permanent) and subclass 491 (provisional, regional); the Small Business Owners pathway nominates for subclass 491 only and is only available within Australia.",
      "Minimum requirements shown on the onshore page (2025-26 settings, may change for 2026-27): occupation on the Queensland Onshore Skills List, at least 65 points, at least Competent English.",
      "Residency/employment test shown on the onshore page: 6 months living and working in regional Queensland (491) or 9 months in Queensland (190), at 20+ hrs/week, after completing the qualification, in the nominated occupation or one sharing its first 3 ANZSCO digits.",
      "Commitment shown on the onshore page: live and work in regional Queensland for 3 years after a 491 grant, or in Queensland for 2 years after a 190 grant.",
      "Holders or applicants of a subclass 491 or 489 visa cannot be nominated for subclass 190.",
    ],
    lastVerified: "2026-10-13",
    sourceDocument:
      "data/knowledge/State Immigrations/Queensland/2026-27/QLD Skilled workers living in Queensland (onshore) (fetched 2026-10-13).md; data/knowledge/State Immigrations/Queensland/2026-27/QLD Application fees (fetched 2026-10-13).md",
  },
  SA: {
    code: "SA",
    name: "South Australia",
    // SA's last published statement (29 May 2026) closed ROIs for 2025-26 and says intake resumes when the 2026-27
    // program commences; nothing for 2026-27 had been published by 13 October 2026. Not counted as open.
    status: "Suspended / Closed",
    note: "South Australia's Skilled & Business Migration closed Registrations of Interest (ROIs) at 9am on 2 June 2026 for the 2025-26 program year and says it will resume accepting ROIs from all eligible candidates when the 2026-27 program commences. No 2026-27 program information had been published on 13 October 2026; the stream pages still describe the 2025-26 settings.",
    offshoreQuotaPressure: "closed",
    aiSummary:
      "South Australia's Skilled & Business Migration (SBM) nominates for subclass 190 and subclass 491 through four streams: South Australian Graduates, Skilled Employment in South Australia, Outer Regional Skilled Employment (all onshore, via a Registration of Interest on the Skilled and Business Migration portal) and Offshore (selected from a SkillSelect EOI, no ROI). SA's news notice of 29 May 2026 states that ROIs for the SA Skilled Migration State Nomination Program closed at 9am on 2 June 2026 for the 2025-26 program year, that the last formal invitation round was on 21 May 2026, and that SBM 'will resume accepting ROIs from all eligible candidates when the 2026-27 program commences', with further 2026-27 information to be published when available. As of 13 October 2026 SA had not published 2026-27 settings: the stream pages still say invitations are sent 'throughout 2025-26' and the news list has no later nomination notice, so SA is not treated as open. The settings the stream pages show (2025-26, may change): subclass 190 and 491 nomination fee AUD 394 each and no ROI fee; applicants must be under 45 at approval, have a positive skills assessment, at least Competent English and at least 65 points including state nomination points, with South Australia as first preferred state in the EOI; 2025-26 priority sectors Building & construction, Defence, Education, Engineering, Health and Manufacturing (priority-sector candidates with a 190-eligible occupation may be invited for 190, others generally for 491). Stream conditions: Graduates -- qualification completed in SA (75% in SA, 1 year resident during study), 6 months' SA residence and 6 months' full-time (30+ hrs/week) work; Skilled Employment in SA -- 12 months' SA residence and 12 months' full-time (30+ hrs/week) work; Outer Regional -- 9 months living and working in outer regional SA full-time; Offshore -- at least 3 years of skilled work in the last 5 years (construction/trades occupations on the listed codes need 1 year in the last 3), 14 days to apply once invited.",
    keyFacts: [
      "Checked against the Move to South Australia pages (migration.sa.gov.au) on 13 October 2026.",
      "News notice 29 May 2026: ROIs for the 2025-26 program year closed 9am Tuesday 2 June 2026; last formal invitation round 21 May 2026; SBM will resume accepting ROIs from all eligible candidates when the 2026-27 program commences.",
      "No 2026-27 program settings, allocation or opening date had been published on 13 October 2026; the stream pages still describe 2025-26 (invitations 'throughout 2025-26').",
      "Nomination fee (Skilled Migration page): AUD 394 for subclass 190 and AUD 394 for subclass 491; Registration of Interest: nil. The page does not state the program year or GST treatment.",
      "Four streams: South Australian Graduates, Skilled Employment in South Australia, Outer Regional Skilled Employment (onshore, ROI required) and Offshore (selected from SkillSelect EOI, no ROI).",
      "Eligibility on the onshore streams (2025-26 settings): active SkillSelect EOI with SA as first preference, under 45, positive skills assessment, at least Competent English, at least 65 points including state nomination points, occupation on the SA Skilled Occupation List.",
      "Residence and work (2025-26 settings): Graduates 6 months' SA residence and 6 months' full-time (30+ hrs/week) work, with 75% of the qualification completed in SA; Skilled Employment in SA 12 months' residence and 12 months' full-time work; Outer Regional 9 months living and working full-time in outer regional SA.",
      "Offshore stream (2025-26 settings): at least 3 years' skilled work experience in the last 5 years (listed construction/trades occupations: 1 year in the last 3); once invited, 14 days to apply.",
      "2025-26 priority sectors for subclass 190: Building & construction, Defence, Education, Engineering, Health, Manufacturing -- other sectors are generally directed to subclass 491 (or considered if high-ranking).",
      "Nomination is competitive; ranking factors include English proficiency, years of skilled experience, qualification level, salary and employer assessment.",
    ],
    lastVerified: "2026-10-13",
    sourceDocument:
      "data/knowledge/State Immigrations/SA/2026-27/SA News - ROIs closing 2 June 2026 (fetched 2026-10-13).md; data/knowledge/State Immigrations/SA/2026-27/SA Skilled Migration (nomination streams and fees) (fetched 2026-10-13).md; data/knowledge/State Immigrations/SA/2026-27/SA Skilled Employment in South Australia stream (fetched 2026-10-13).md; data/knowledge/State Immigrations/SA/2026-27/SA South Australian Graduates stream (fetched 2026-10-13).md; data/knowledge/State Immigrations/SA/2026-27/SA Outer Regional Skilled Employment stream (fetched 2026-10-13).md; data/knowledge/State Immigrations/SA/2026-27/SA Offshore stream (fetched 2026-10-13).md",
  },
  WA: {
    code: "WA",
    name: "Western Australia",
    // WA's program page still shows only 2025-26 settings and its latest SNMP news is dated 8 December 2025; the 2026-27
    // intake cannot be confirmed from the site, so the status is "Check official page" (not counted as open).
    status: "Check official page",
    note: "Western Australia's State Nominated Migration Program page still shows only the 2025-26 program and no 2026-27 settings or intake have been published; its latest program news is dated 8 December 2025. The last invitations shown were issued on 20 May 2026 for priority trade occupations: 167 General stream (WASMOL Schedule 2) and 42 Graduate stream, all for subclass 190 and none for subclass 491. Whether WA is inviting in 2026-27 is not confirmed here -- check the official page.",
    offshoreQuotaPressure: "medium",
    aiSummary:
      "Western Australia's State Nominated Migration Program (SNMP) covers a General stream (WASMOL Schedule 1 and 2 occupation lists) and a Graduate stream (Graduate Occupation List, GOL) for subclass 190 and subclass 491. On 13 October 2026 the WA program page still showed only the 2025-26 program and WA had published no 2026-27 settings, allocation or intake; the latest SNMP news item is dated 8 December 2025, so whether WA is inviting in 2026-27 is not confirmed (in 2025 WA paused the program from 1 July 2025 pending Home Affairs confirmation of places and published the 2025-26 criteria on 29 October 2025). The most recent invitations shown on the page were issued on 20 May 2026 for priority trade occupations: 0 for General stream WASMOL Schedule 1, 167 for WASMOL Schedule 2, 5 for Graduate stream higher education and 37 for Graduate stream vocational education and training, all for subclass 190 and none for subclass 491. Under the 2025-26 rules both onshore (WA-resident) and offshore (interstate or overseas) candidates are eligible, though EOIs are ranked with WA residents first, then priority-industry occupations (building & construction, healthcare & social assistance, hospitality & tourism, education & training), then all other sectors, then highest EOI points, then oldest submission date -- so offshore candidates in non-priority occupations face the most competition. The nomination application fee is a non-refundable AUD 200 and applicants have 28 calendar days to lodge once invited. If an EOI seeks nomination for both subclasses, WA generally invites for subclass 491 first.",
    keyFacts: [
      "Checked against the Migration WA State Nominated Migration Program page and news list (migration.wa.gov.au) on 13 October 2026.",
      "The page still shows only the 2025-26 program; no 2026-27 settings, allocation, fees or opening have been published, and the latest SNMP news item is dated 8 December 2025. Whether WA is inviting in 2026-27 is not confirmed -- check the official page.",
      "Latest invitations shown (issued 20 May 2026, priority trade occupations): General stream WASMOL Schedule 1: 0; WASMOL Schedule 2: 167; Graduate stream higher education: 5; Graduate stream VET: 37 -- all subclass 190, none subclass 491.",
      "Covers subclass 190 (+5 DHA points) and subclass 491 (+15 DHA points) via a General stream (WASMOL Schedule 1/2 occupation lists) and a Graduate stream (Graduate Occupation List, GOL).",
      "2025-26 rules: both onshore (WA-resident) and offshore (interstate/overseas) candidates are eligible; ranking prioritises WA residents, then priority-industry occupations (building & construction, healthcare & social assistance, hospitality & tourism, education & training), then all other sectors, then EOI points, then submission date.",
      "2025-26 rules: at least 1 year of Australian OR overseas work experience in the nominated (or closely related) occupation within the last 10 years.",
      "Nomination application fee (2025-26 page): AUD 200, non-refundable; applicants have 28 calendar days to lodge the application once invited.",
      "Invitations were anticipated monthly in 2025-26. 2025-26 program-to-date total: 8,162 invitations issued across General and Graduate streams (per the saved 'Invitations issued' chart, latest full month March 2026).",
      "If an EOI seeks nomination for both subclass 190 and 491, WA generally invites for subclass 491 first (typically a higher EOI points score).",
    ],
    lastVerified: "2026-10-13",
    sourceDocument:
      "data/knowledge/State Immigrations/Western Australia/2026-27/WA State Nominated Migration Program (fetched 2026-10-13).md; data/knowledge/State Immigrations/Western Australia/2026-27/WA News list (fetched 2026-10-13).md; data/knowledge/State Immigrations/Western Australia/Last invited expression of interest - Priority trade occupations - May 2026.pdf; data/knowledge/State Immigrations/Western Australia/2025—26 program year — Invitations issued.png",
  },
};

export function getStateRule(code: string): StateRuleConfig | undefined {
  return STATE_RULES[code];
}
