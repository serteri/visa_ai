/**
 * Builds src/data/occupation-slug-redirects.json: what the proxy needs to answer every occupation URL that was ever published.
 *
 *   slugs   ANZSCO code -> the CURRENT canonical slug, for every occupation that has a page now (getUniqueOccupations());
 *   known   every other 6-digit code that was ever in the occupation dataset (including its git history) (an "nec"
 *           code, a code that is not mapped to a skilled visa, a code removed or renumbered): it has no page, but a URL for it may
 *           be indexed (the sitemap listed every dataset row until non-eligible rows were filtered out).
 *
 * The proxy then does:  a slug with the right code but different words -> 301 to the canonical slug;
 *                       a known code with no page -> 301 to the ANZSCO finder (the occupation index);
 *                       a code that never existed -> 404.
 *
 *   npx tsx scripts/build-occupation-redirects.ts          writes the file
 *   npx tsx scripts/build-occupation-redirects.ts --check  exits 1 when the committed file is stale (test-occupation-redirects.ts)
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

import { buildOccupationSlug, getUniqueOccupations } from "../lib/occupations/seo";

const OUT = "src/data/occupation-slug-redirects.json";
// The sitemap (and so every indexed URL) was built from the occupation dataset only; the ANZSCO list supplied titles, never URLs.
const DATASETS = ["src/data/occupations.json"];

function codesIn(json: unknown): string[] {
  const rows: unknown[] = Array.isArray(json) ? json : Array.isArray((json as { occupations?: unknown[] })?.occupations) ? (json as { occupations: unknown[] }).occupations : [];
  return rows.flatMap((r) => {
    const row = r as { anzsco_code?: unknown; code?: unknown };
    const code = String(row?.anzsco_code ?? row?.code ?? "");
    return /^\d{6}$/.test(code) ? [code] : [];
  });
}

function historicalCodes(): Set<string> {
  const out = new Set<string>();
  for (const file of DATASETS) {
    for (const c of codesIn(JSON.parse(readFileSync(file, "utf8")))) out.add(c);
    let commits: string[] = [];
    try {
      commits = execFileSync("git", ["log", "--format=%H", "--", file], { encoding: "utf8", maxBuffer: 1 << 26 }).split("\n").filter(Boolean);
    } catch {
      console.warn(`git history of ${file} not available; using the current file only`);
    }
    for (const hash of commits) {
      try {
        const raw = execFileSync("git", ["show", `${hash}:${file}`], { encoding: "utf8", maxBuffer: 1 << 28 });
        for (const c of codesIn(JSON.parse(raw))) out.add(c);
      } catch {
        // the file did not exist (or was not JSON) in that commit
      }
    }
  }
  return out;
}

export function buildRedirectData(): { slugs: Record<string, string>; known: string[]; indexPath: string } {
  const slugs: Record<string, string> = {};
  for (const o of getUniqueOccupations()) slugs[o.anzsco_code] = buildOccupationSlug(o);
  const known = [...historicalCodes()].filter((c) => !slugs[c]).sort();
  return { slugs: Object.fromEntries(Object.entries(slugs).sort(([a], [b]) => a.localeCompare(b))), known, indexPath: "/tools/anzsco-finder" };
}

if (process.argv[1]?.endsWith("build-occupation-redirects.ts")) {
  const data = buildRedirectData();
  const text = `${JSON.stringify(data)}\n`;
  if (process.argv.includes("--check")) {
    const current = readFileSync(OUT, "utf8");
    const a = JSON.parse(current) as typeof data;
    const same = JSON.stringify(a.slugs) === JSON.stringify(data.slugs) && Object.keys(a.slugs).length > 0 && data.known.every((c) => new Set(a.known).has(c));
    console.log(same ? "occupation redirect data is current" : "occupation redirect data is STALE -- run: npx tsx scripts/build-occupation-redirects.ts");
    process.exit(same ? 0 : 1);
  }
  writeFileSync(OUT, text);
  console.log(`wrote ${OUT}: ${Object.keys(data.slugs).length} current slugs, ${data.known.length} known codes without a page`);
}
