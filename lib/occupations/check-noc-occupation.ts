import nocList from "@/src/data/countries/ca/noc-list.json";
import { isFSTPEligibleOccupation } from "@/lib/readiness/noc-fstp-groups";

type NocEntry = {
  code: string;
  title: string;
  teer: number;
  majorGroup: string;
  minorGroup: string;
  duties: string[];
};

const NOC_LIST = nocList as NocEntry[];

export type NocMatch = {
  code: string;
  title: string;
  teer: number;
  isFstpEligibleGroup: boolean;
  /** Up to 3 key duties from the official NOC 2021 unit group definition. */
  duties: string[];
};

export type NocCheckResult = {
  query: string;
  matches: NocMatch[];
  /** True when the occupation was not found because NOC compilation is incomplete (not because it doesn't exist). */
  partialCoverageGap: boolean;
};

export function checkNocOccupation(input: { occupation: string; nocCode?: string }): NocCheckResult {
  // Exact code match from autocomplete selection — skip fuzzy search entirely.
  if (input.nocCode) {
    const direct = NOC_LIST.find((e) => e.code === input.nocCode);
    if (direct) {
      return {
        query: input.occupation || direct.title,
        matches: [{ code: direct.code, title: direct.title, teer: direct.teer, isFstpEligibleGroup: isFSTPEligibleOccupation(direct.code), duties: direct.duties.slice(0, 3) }],
        partialCoverageGap: false,
      };
    }
  }

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
    isFstpEligibleGroup: isFSTPEligibleOccupation(e.code),
    duties: e.duties.slice(0, 3),
  }));

  return {
    query,
    matches,
    partialCoverageGap: matches.length === 0,
  };
}
