import { SKILLED_OCCUPATIONS } from "@/lib/occupations/skilled-occupations";

type OccupationCheckInput = {
  occupation: string;
};

type OccupationMatch = {
  title: string;
  list: string;
  relevantVisas: string[];
  confidence: "exact" | "partial";
};

export type OccupationCheckResult = {
  query: string;
  matches: OccupationMatch[];
};

export function checkOccupation(input: OccupationCheckInput): OccupationCheckResult {
  const query = input.occupation.trim();
  const normalisedQuery = query.toLowerCase();

  if (!normalisedQuery) {
    return { query, matches: [] };
  }

  const exactMatches: OccupationMatch[] = SKILLED_OCCUPATIONS.filter(
    (item) => item.title.toLowerCase() === normalisedQuery
  ).map((item) => ({
    title: item.title,
    list: item.list,
    relevantVisas: item.relevantVisas,
    confidence: "exact" as const,
  }));

  const exactTitles = new Set(exactMatches.map((item) => item.title.toLowerCase()));

  const partialMatches: OccupationMatch[] = SKILLED_OCCUPATIONS.filter((item) => {
    const title = item.title.toLowerCase();
    return !exactTitles.has(title) && title.includes(normalisedQuery);
  }).map((item) => ({
    title: item.title,
    list: item.list,
    relevantVisas: item.relevantVisas,
    confidence: "partial" as const,
  }));

  return {
    query,
    matches: [...exactMatches, ...partialMatches].slice(0, 10),
  };
}
