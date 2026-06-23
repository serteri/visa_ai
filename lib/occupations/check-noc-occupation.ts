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

// FSTP eligibility is gated on these major/minor groups (see express-entry.json
// programs.FSTP.workExperience.nocGroups). Coverage for these is complete;
// general TEER 1 professional occupations outside major groups 00/10/11/13/20/21
// are not yet compiled, see noc-list.json progress notes.
const FSTP_MAJOR_GROUPS = ["72", "73", "82", "83", "92", "93"];
const FSTP_EXTRA_CODES = ["62200", "63200", "63201", "63202"];

export type NocMatch = {
  code: string;
  title: string;
  teer: number;
  isFstpEligibleGroup: boolean;
};

export type NocCheckResult = {
  query: string;
  matches: NocMatch[];
  /** True when the occupation was not found because NOC compilation is incomplete (not because it doesn't exist). */
  partialCoverageGap: boolean;
};

function isFstpGroup(entry: NocEntry): boolean {
  return FSTP_MAJOR_GROUPS.includes(entry.majorGroup) || FSTP_EXTRA_CODES.includes(entry.code);
}

export function checkNocOccupation(input: { occupation: string }): NocCheckResult {
  const query = input.occupation.trim();
  const normalisedQuery = query.toLowerCase();

  if (!normalisedQuery) {
    return { query, matches: [], partialCoverageGap: false };
  }

  const exact = NOC_LIST.filter((e) => e.title.toLowerCase() === normalisedQuery);
  const exactTitles = new Set(exact.map((e) => e.title.toLowerCase()));
  const partial = NOC_LIST.filter(
    (e) => !exactTitles.has(e.title.toLowerCase()) && e.title.toLowerCase().includes(normalisedQuery)
  );

  const matches = [...exact, ...partial].slice(0, 10).map((e) => ({
    code: e.code,
    title: e.title,
    teer: e.teer,
    isFstpEligibleGroup: isFstpGroup(e),
  }));

  return {
    query,
    matches,
    partialCoverageGap: matches.length === 0,
  };
}
