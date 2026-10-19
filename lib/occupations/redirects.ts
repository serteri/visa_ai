import data from "@/src/data/occupation-slug-redirects.json";

/**
 * Every occupation URL that was ever published, answered correctly (data: scripts/build-occupation-redirects.ts):
 *   - a slug whose code has a page now, but with other words (a renamed occupation, an old slug) -> 301 to the canonical slug;
 *   - a code that was in the dataset (a code with no page now: "nec", not mapped to a skilled visa, removed / renumbered) -> 301 to
 *     the ANZSCO major-group index page for its first digit (/occupations/group/<1-8>), else the ANZSCO finder;
 *   - a code that never existed -> no redirect (the page returns 404).
 * Used by proxy.ts (a real 301 before rendering) and by the occupation page (the same answer if the proxy was bypassed).
 */
const SLUGS = (data as { slugs: Record<string, string> }).slugs;
const KNOWN = new Set((data as { known: string[] }).known);
const INDEX_PATH = (data as { indexPath: string }).indexPath;

const OCCUPATION_URL = /^\/(?:(tr|zh-Hans)\/)?occupations\/([^/]+)\/?$/;

/**
 * The three hand-written calculator pages (/tools/points-calculator/<slug>) held hard-coded invitation cutoffs and were retired: each answers a real 301
 * to the occupation page for the same code. (Slug in the old URL -> current canonical occupation slug.)
 */
export const RETIRED_CALCULATOR_PAGES: Record<string, string> = {
  "software-engineer": "261313",
  "registered-nurse": "254412",
  "civil-engineer": "233211",
};
const CALCULATOR_URL = /^\/(?:(tr|zh-Hans)\/)?tools\/points-calculator\/([^/]+)\/?$/;

export type OccupationRedirect = { status: 301; to: string; reason: "canonical_slug" | "code_without_page" | "retired_calculator_page" };

export function occupationRedirectFor(pathname: string): OccupationRedirect | null {
  const calc = pathname.match(CALCULATOR_URL);
  if (calc) {
    const code = RETIRED_CALCULATOR_PAGES[calc[2]];
    const slug = code ? SLUGS[code] : undefined;
    return slug ? { status: 301, to: `${calc[1] ? `/${calc[1]}` : ""}/occupations/${slug}`, reason: "retired_calculator_page" } : null;
  }
  const m = pathname.match(OCCUPATION_URL);
  if (!m) return null;
  const prefix = m[1] ? `/${m[1]}` : "";
  let id = m[2];
  try {
    id = decodeURIComponent(id);
  } catch {
    return null;
  }
  const code = id.match(/^(\d{6})(?![\d])/)?.[1];
  if (!code) return null;
  const slug = SLUGS[code];
  if (slug) return id === slug ? null : { status: 301, to: `${prefix}/occupations/${slug}`, reason: "canonical_slug" };
  // The ANZSCO major-group index page (first digit 1-8) is the closest page that exists; any other code goes to the finder.
  if (KNOWN.has(code)) return { status: 301, to: /^[1-8]/.test(code) ? `${prefix}/occupations/group/${code[0]}` : `${prefix}${INDEX_PATH}`, reason: "code_without_page" };
  return null;
}
