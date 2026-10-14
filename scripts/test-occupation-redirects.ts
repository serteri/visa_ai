/**
 * Occupation URLs that were published and now returned 404 (e.g. /occupations/599999-clerical-and-administrative-workers-nec).
 * Over the full list (lib/occupations/redirects.ts, data built by scripts/build-occupation-redirects.ts):
 *   - every URL in the current sitemap answers directly (no redirect);
 *   - every current code with other words in its slug (old / renamed slug) -> 301 to the canonical slug;
 *   - every code that was ever in the occupation dataset (git history included) but has no page now -> 301 to the ANZSCO finder;
 *   - only a code that never existed stays a 404; locale prefixes (tr, zh-Hans) are kept; the proxy sends a real 301 and keeps the query.
 *
 *   npx tsx scripts/test-occupation-redirects.ts
 */
import { readFileSync } from "node:fs";

import { buildRedirectData } from "./build-occupation-redirects";
import { occupationRedirectFor } from "../lib/occupations/redirects";
import { buildOccupationSlug, getUniqueOccupations } from "../lib/occupations/seo";
import { buildSitemap } from "../app/sitemap";
import data from "../src/data/occupation-slug-redirects.json";

let failures = 0;
const t = (label: string, cond: boolean, detail = "") => {
  if (cond) console.log(`  ✅ ${label}`);
  else {
    failures++;
    console.error(`  ❌ ${label}${detail ? ` -- ${detail}` : ""}`);
  }
};

const PREFIXES = ["", "/tr", "/zh-Hans"];
const current = getUniqueOccupations();
const slugs = (data as { slugs: Record<string, string> }).slugs;
const known = (data as { known: string[] }).known;
const INDEX = (data as { indexPath: string }).indexPath;

console.log("the committed data is current");
{
  const fresh = buildRedirectData();
  t("slugs: exactly the occupations that have a page now", JSON.stringify(fresh.slugs) === JSON.stringify(slugs) && Object.keys(slugs).length === current.length, `${Object.keys(slugs).length} vs ${current.length}`);
  t("known: every code ever in the occupation dataset (git history included) without a page is listed", fresh.known.every((c) => known.includes(c)) && fresh.known.length === known.length, `${fresh.known.length} vs ${known.length}`);
  t("no code is both current and known", known.every((c) => !slugs[c]));
}

console.log(`every sitemap occupation URL answers directly (${current.length} codes x 3 locales)`);
{
  const urls = buildSitemap().map((e) => new URL(e.url).pathname).filter((p) => /\/occupations\//.test(p));
  const redirected = urls.filter((p) => occupationRedirectFor(p) !== null);
  t(`${urls.length} sitemap occupation URLs, none of them redirected`, urls.length > 100 && redirected.length === 0, redirected.slice(0, 3).join(", "));
}

console.log("an old / renamed slug with the right code -> 301 to the canonical slug");
{
  let bad = 0;
  for (const o of current) {
    const canonical = buildOccupationSlug(o);
    for (const prefix of PREFIXES) {
      const direct = occupationRedirectFor(`${prefix}/occupations/${canonical}`);
      const bare = occupationRedirectFor(`${prefix}/occupations/${o.anzsco_code}`);
      const renamed = occupationRedirectFor(`${prefix}/occupations/${o.anzsco_code}-some-old-name`);
      if (direct !== null || bare?.to !== `${prefix}/occupations/${canonical}` || renamed?.to !== `${prefix}/occupations/${canonical}` || bare.status !== 301 || renamed.status !== 301) bad++;
    }
  }
  t(`all ${current.length} current occupations x 3 locales: canonical answers, other words / bare code -> 301 canonical`, bad === 0, `${bad} wrong`);
}

console.log("a code that was published and has no page now -> 301 to the ANZSCO finder");
{
  let bad = 0;
  for (const code of known) {
    for (const prefix of PREFIXES) {
      const r = occupationRedirectFor(`${prefix}/occupations/${code}-whatever-it-was-called`);
      if (!r || r.status !== 301 || r.to !== `${prefix}${INDEX}`) bad++;
    }
  }
  t(`all ${known.length} codes without a page x 3 locales -> 301 ${INDEX}`, bad === 0, `${bad} wrong`);
  const example = occupationRedirectFor("/occupations/599999-clerical-and-administrative-workers-nec");
  t("the reported URL (599999 nec) -> 301 to the ANZSCO finder", example?.status === 301 && example.to === INDEX, JSON.stringify(example));
  t("the Turkish and Chinese versions keep their locale", occupationRedirectFor("/tr/occupations/599999-x")?.to === `/tr${INDEX}` && occupationRedirectFor("/zh-Hans/occupations/599999-x")?.to === `/zh-Hans${INDEX}`);
}

console.log("only a slug that never existed stays a 404");
{
  const never = ["000000-nothing", "999998-never-existed", "abc", "12345-short", "occupation", "1234567-too-long"];
  t("never-existed codes and malformed ids: no redirect", never.every((id) => occupationRedirectFor(`/occupations/${id}`) === null), never.filter((id) => occupationRedirectFor(`/occupations/${id}`) !== null).join(", "));
  t("other paths are untouched", occupationRedirectFor("/occupations") === null && occupationRedirectFor("/visas/190") === null && occupationRedirectFor("/occupations/261313-software-engineer/extra") === null);
}

console.log("wiring");
{
  const proxy = readFileSync("proxy.ts", "utf8");
  t("proxy.ts sends a real 301 (not the 307 default) and keeps the query string", /occupationRedirectFor\(pathname\)/.test(proxy) && /NextResponse\.redirect\(redirectUrl, occupationRedirect\.status\)/.test(proxy) && /redirectUrl\.search = searchParams\.toString\(\)/.test(proxy.slice(proxy.indexOf("occupationRedirectFor(pathname)"))));
  const page = readFileSync("app/[locale]/(main)/occupations/[id]/page.tsx", "utf8");
  const at = page.indexOf("occupationRedirectFor(publicPath");
  t("the occupation page answers the same way if the proxy was bypassed, and 404s only after that", at > 0 && /if \(moved\) permanentRedirect\(moved\.to\);\s*notFound\(\);/.test(page.slice(at)));
}

console.log(failures === 0 ? "\nAll checks passed" : `\n${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
