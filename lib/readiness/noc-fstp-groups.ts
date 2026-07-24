// Federal Skilled Trades Program (FSTP) NOC 2021 eligibility groups.
// Source: canada.ca — "Who can apply: Federal Skilled Trades Program"
// https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/eligibility/federal-skilled-trades.html
// last verified: 2026-07-24 — ministerial instructions can change the eligible
// NOC list; re-verify against the live IRCC page before trusting this for a
// production decision, and re-run this file's derivation if noc-list.json
// is regenerated.
//
// Rather than a second, hand-typed NOC code list that can silently drift out
// of sync, this derives the eligible code set from the SAME NOC 2021 dataset
// (`src/data/countries/ca/noc-list.json`) already used by
// `lib/occupations/check-noc-occupation.ts` for occupation lookups — one
// source of truth for "what NOC code is this", a separate explicit rule set
// here for "which of those codes count for FSTP".

import nocList from "@/src/data/countries/ca/noc-list.json";

type NocEntry = {
  code: string;
  title: string;
  teer: number;
  majorGroup: string;
  minorGroup: string;
  duties: string[];
};

const NOC_LIST = nocList as NocEntry[];

/** Major groups eligible for FSTP work experience, subject to the sub-major exclusions below. */
export const FSTP_MAJOR_GROUPS = ["72", "73", "82", "83", "92", "93"] as const;

/**
 * Sub-major groups EXCLUDED even though their parent major group is
 * FSTP-eligible:
 * - 726: Transportation officers and controllers (TEER 2 — FSW/CEC-eligible,
 *   but explicitly carved out of the FSTP trades list).
 * - 932: Aircraft assemblers and aircraft assembly inspectors.
 */
export const EXCLUDED_SUB_MAJOR_GROUPS: ReadonlySet<string> = new Set(["726", "932"]);

/**
 * Codes added to the FSTP list by exception, outside the FSTP_MAJOR_GROUPS
 * ranges above ("chefs and cooks" on the official FSTP page):
 * - 62200 Chefs (TEER 2, majorGroup 62 — not itself an FSTP major group)
 * - 63200 Cooks (TEER 3, majorGroup 63 minorGroup 632 — not itself an FSTP major group)
 * This does NOT extend to the rest of minor group 632 in noc-list.json
 * (butchers, bakers, hairstylists, estheticians, shoe repairers,
 * upholsterers) — those are separate NOC 2021 trades not on the FSTP list.
 */
export const ADDITIONAL_INCLUDED_CODES: ReadonlySet<string> = new Set(["62200", "63200"]);

function isFstpMajorGroup(majorGroup: string): majorGroup is (typeof FSTP_MAJOR_GROUPS)[number] {
  return (FSTP_MAJOR_GROUPS as readonly string[]).includes(majorGroup);
}

/** Precomputed once at module load: every NOC 2021 code in the dataset that qualifies for FSTP work experience. */
const FSTP_ELIGIBLE_CODES: ReadonlySet<string> = (() => {
  const codes = new Set<string>();
  for (const entry of NOC_LIST) {
    if (isFstpMajorGroup(entry.majorGroup) && !EXCLUDED_SUB_MAJOR_GROUPS.has(entry.minorGroup)) {
      codes.add(entry.code);
    }
  }
  for (const code of ADDITIONAL_INCLUDED_CODES) codes.add(code);
  return codes;
})();

/**
 * Code-based FSTP eligibility check (never free-text keyword matching, per
 * the same principle used for ANZSCO skilled-list membership).
 *
 *   if nocCode in ADDITIONAL_INCLUDED_CODES → true
 *   if majorGroup(nocCode) in FSTP_MAJOR_GROUPS:
 *       if subMajorGroup(nocCode) in EXCLUDED_SUB_MAJOR_GROUPS → false
 *       else → true
 *   else → false
 */
export function isFSTPEligibleOccupation(nocCode: string): boolean {
  return FSTP_ELIGIBLE_CODES.has(nocCode);
}

/** Exposed for tests / diagnostics — do not mutate. */
export function getFSTPEligibleCodes(): ReadonlySet<string> {
  return FSTP_ELIGIBLE_CODES;
}
