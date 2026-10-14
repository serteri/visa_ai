import data from "@/src/data/occupation-slug-redirects.json";

/**
 * Every occupation URL that was ever published, answered correctly (data: scripts/build-occupation-redirects.ts):
 *   - a slug whose code has a page now, but with other words (a renamed occupation, an old slug) -> 301 to the canonical slug;
 *   - a code that was in the dataset (a code with no page now: "nec", not mapped to a skilled visa, removed / renumbered) -> 301 to
 *     the ANZSCO finder, the occupation index;
 *   - a code that never existed -> no redirect (the page returns 404).
 * Used by proxy.ts (a real 301 before rendering) and by the occupation page (the same answer if the proxy was bypassed).
 */
const SLUGS = (data as { slugs: Record<string, string> }).slugs;
const KNOWN = new Set((data as { known: string[] }).known);
const INDEX_PATH = (data as { indexPath: string }).indexPath;

const OCCUPATION_URL = /^\/(?:(tr|zh-Hans)\/)?occupations\/([^/]+)\/?$/;

export type OccupationRedirect = { status: 301; to: string; reason: "canonical_slug" | "code_without_page" };

export function occupationRedirectFor(pathname: string): OccupationRedirect | null {
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
  if (KNOWN.has(code)) return { status: 301, to: `${prefix}${INDEX_PATH}`, reason: "code_without_page" };
  return null;
}
