import { generalAuthority } from "./authorities/general-authority";

/**
 * Fuzzy occupation-title -> assessing-authority matching.
 *
 * This is the FALLBACK path, used when the precise ANZSCO-code lookup
 * (getSkillsAssessmentAuthority in index.ts, which matches against each
 * authority's own occupations[] array) doesn't find a match -- most
 * commonly because the occupation string has no code attached at all
 * (e.g. a bare "Software Engineer" instead of "Software Engineer 261313").
 *
 * getAssessingAuthority() always returns a match: a specific authority via
 * keyword matching, or generalAuthority (VETASSESS / General Professional
 * Authority) as the universal last resort, so the Financial Roadmap table
 * never renders a blank/generic row for any occupation. Callers check
 * `isGeneralFallback` to choose between a "your assessment will be
 * conducted by X" sentence and a softer "will likely be handled by a
 * general authority" one -- see lib/readiness/pdf-content/
 * skills-assessment-status.ts and personalized-guide.ts.
 */

export type AssessingAuthorityMatch = {
  authorityId: string;
  authorityName: string;
  /** True when this is the generalAuthority catch-all, not a specific keyword match. */
  isGeneralFallback: boolean;
};

/**
 * Ordered so more specific keywords are checked before broader ones that
 * would otherwise shadow them -- e.g. "software engineer" must resolve to
 * ACS, not EA, so "software"/"developer"/"programmer" are listed before the
 * generic "engineer" keyword.
 */
const AUTHORITY_KEYWORDS: Array<{ keywords: string[]; match: Omit<AssessingAuthorityMatch, "isGeneralFallback"> }> = [
  {
    keywords: ["software", "developer", "programmer", "web design", "ict", "cyber security", "data scientist", "database", "network engineer", "systems analyst", "it support", "information technology"],
    match: { authorityId: "ACS", authorityName: "Australian Computer Society (ACS)" },
  },
  {
    keywords: ["chef", "cook", "mechanic", "electrician", "plumber", "carpenter", "hairdresser", "baker", "butcher", "welder", "bricklayer", "cabinetmaker", "boilermaker", "toolmaker", "fitter", "joiner"],
    match: { authorityId: "TRA", authorityName: "Trades Recognition Australia (TRA)" },
  },
  {
    keywords: ["nurse", "nursing", "midwife", "midwifery"],
    match: { authorityId: "ANMAC", authorityName: "Australian Nursing and Midwifery Accreditation Council (ANMAC)" },
  },
  {
    keywords: ["doctor", "physician", "surgeon", "medical practitioner", "general practitioner", "psychiatrist", "anaesthetist", "paediatrician", "dentist"],
    match: { authorityId: "AHPRA", authorityName: "Australian Health Practitioner Regulation Agency (AHPRA)" },
  },
  {
    keywords: ["account", "auditor", "bookkeeper", "tax agent"],
    match: { authorityId: "CPA", authorityName: "CPA Australia" },
  },
  {
    keywords: ["engineer", "engineering"],
    match: { authorityId: "EA", authorityName: "Engineers Australia (EA)" },
  },
  {
    keywords: ["architect"],
    match: { authorityId: "AACA", authorityName: "Architects Accreditation Council of Australia (AACA)" },
  },
];

/**
 * Normalizes a free-text occupation title for keyword matching:
 * lowercases, strips a leading/trailing ANZSCO code (e.g. "261313 - Software
 * Engineer" or "Software Engineer 261313" -> "software engineer"), and
 * trims whitespace/stray punctuation left behind by the strip.
 */
function normalizeOccupationTitle(occupationTitle: string): string {
  return occupationTitle
    .toLowerCase()
    .replace(/^\s*\d{4,6}\s*[-–—]?\s*/, "") // leading code, optionally followed by a dash
    .replace(/\s*\d{4,6}\s*$/, "") // trailing code
    .replace(/[()]/g, " ")
    .trim();
}

/**
 * Resolves an assessing authority from a free-text occupation title via
 * fuzzy keyword matching, falling back to generalAuthority (VETASSESS /
 * General Professional Authority) when nothing more specific matches --
 * this always returns a usable match, never null, so occupations outside
 * IT/Health/Engineering/Accounting/Trades (teachers, social workers,
 * managers, and everything else) still get a real, personalized sentence
 * and a non-empty Financial Roadmap row instead of a generic placeholder.
 */
export function getAssessingAuthority(occupationTitle: string | undefined): AssessingAuthorityMatch {
  const normalized = occupationTitle ? normalizeOccupationTitle(occupationTitle) : "";

  if (normalized) {
    for (const { keywords, match } of AUTHORITY_KEYWORDS) {
      if (keywords.some((keyword) => normalized.includes(keyword))) {
        return { ...match, isGeneralFallback: false };
      }
    }
  }

  return {
    authorityId: generalAuthority.authorityId,
    authorityName: generalAuthority.authorityName,
    isGeneralFallback: true,
  };
}
