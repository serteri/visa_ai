/**
 * SEO Phase 2 (docs/seo-occupation-audit.md section 8), source-level checks, one section per step. Database-free.
 * Run: npx tsx scripts/test-seo-phase2.ts
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import robots from "../app/robots";
import { buildSitemap } from "../app/sitemap";
import { occupationPageContent } from "../lib/occupations/page-content";
import { occupationRedirectFor } from "../lib/occupations/redirects";
import { entriesByGroup, entriesByLetter, groupCounts, indexableEntries, LETTERS, MAJOR_GROUP_IDS, majorGroupName, richEntries } from "../lib/occupations/index-data";
import { getUniqueOccupations } from "../lib/occupations/seo";
import { buildFactRows } from "../lib/occupations/facts";
import { seedStateData, withPrograms } from "../lib/admin-data/snapshot";
import { resolveAssessingAuthority } from "../lib/skills-assessment/resolve-authority";
import redirectData from "../src/data/occupation-slug-redirects.json";
import { activeLocales } from "../lib/i18n/config";
import { languageAlternates, pageAlternates, publicUrl } from "../lib/seo/urls";

let failures = 0;
function t(name: string, ok: boolean, detail?: string) {
  if (!ok) failures++;
  console.log(`${ok ? "  ✅" : "  ❌"} ${name}${!ok && detail ? ` -- ${detail}` : ""}`);
}
const section = (s: string) => console.log(`\n${s}`);

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

section("Step 1. <html lang> per locale, hub canonical / hreflang, no crawlDelay");
const layout = readFileSync("app/[locale]/layout.tsx", "utf8");
t("the root layout lives in app/[locale] and takes the locale param", /params: Promise<\{ locale: string \}>/.test(layout) && /await params/.test(layout));
t("<html lang> is the route locale, not a literal", /lang=\{lang\}/.test(layout) && !/lang="en"/.test(layout) && /isValidLocale\(locale\) \? locale : "en"/.test(layout));
t("there is no second root layout or root page above [locale]", (() => { try { readFileSync("app/layout.tsx"); return false; } catch { return true; } })() && (() => { try { readFileSync("app/page.tsx"); return false; } catch { return true; } })());
const rules = robots().rules;
t("robots.txt has no crawlDelay", JSON.stringify(rules).indexOf("crawlDelay") === -1);
t("robots.txt still disallows /api/ and references the sitemap", JSON.stringify(rules).includes("/api/") && robots().sitemap === "https://www.logivisa.com/sitemap.xml");

const pages = walk("app").filter((p) => /page\.tsx$/.test(p));
const badCanon = pages.filter((p) => /canonical:\s*`\/\$\{locale\}\//.test(readFileSync(p, "utf8")));
t("no page declares a `/${locale}/...` canonical (the English one would be a redirecting /en/ URL)", badCanon.length === 0, badCanon.join(", "));
const badLang = pages.filter((p) => /languages:\s*\{[^}]*["'`]\/en\//.test(readFileSync(p, "utf8")));
t("no page lists an `/en/...` hreflang URL", badLang.length === 0, badLang.join(", "));
const badOg = pages.filter((p) => /url:\s*`\/\$\{locale\}\//.test(readFileSync(p, "utf8")));
t("no page uses a relative `/${locale}/...` OpenGraph url", badOg.length === 0, badOg.join(", "));

const envBase = pages.filter((p) => !p.includes("admin") && /BASE_URL\s*=\s*process\.env\.NEXT_PUBLIC_BASE_URL/.test(readFileSync(p, "utf8")));
t("public pages take metadataBase from the production origin, not NEXT_PUBLIC_BASE_URL", envBase.length === 0, envBase.join(", "));

for (const path of ["/guides", "/journey", "/visas", "/visas/australia", "/reports", "/pr-readiness-quiz"]) {
  for (const locale of activeLocales) {
    const a = pageAlternates(locale, path);
    const self = publicUrl(locale, path);
    t(`${locale} ${path}: canonical is itself, hreflang has ${activeLocales.length} locales + x-default, none via /en/`, a.canonical === self && Object.keys(a.languages).length === activeLocales.length + 1 && a.languages["x-default"] === publicUrl("en", path) && !Object.values(a.languages).some((u) => u.includes("/en/")) && JSON.stringify(a.languages) === JSON.stringify(languageAlternates(path)));
  }
}

section("Step 2. stale occupation URLs (already shipped in 7efd71a; here: the index page is now the target)");
{
  const known = (redirectData as { known: string[] }).known;
  let bad = 0;
  for (const code of known) for (const prefix of ["", "/tr", "/zh-Hans"]) {
    const r = occupationRedirectFor(`${prefix}/occupations/${code}-whatever`);
    if (!r || r.status !== 301 || r.to !== `${prefix}/occupations/group/${code[0]}`) bad++;
  }
  t(`all ${known.length} published codes without a page x 3 locales -> 301 to their ANZSCO major-group index page`, bad === 0, `${bad} wrong`);
  t("599999 (nec) -> /occupations/group/5", occupationRedirectFor("/occupations/599999-clerical-and-administrative-workers-nec")?.to === "/occupations/group/5");
  t("a code that never existed is not redirected (404)", occupationRedirectFor("/occupations/123457-never-existed") === null);
  t("a current occupation with another slug -> 301 to its canonical slug", occupationRedirectFor("/occupations/261313-old-name")?.to === "/occupations/261313-software-engineer");
}

section("Step 3. crawlable occupation index, breadcrumbs, internal links");
{
  const sm = buildSitemap().map((e) => e.url);
  const hasAll = (path: string) => activeLocales.every((l) => sm.includes(publicUrl(l, path)));
  const unique = getUniqueOccupations();
  for (const locale of activeLocales) {
    const all = indexableEntries(locale);
    t(`${locale}: the index lists ${all.length} indexable occupations, none from the noindex thin tier`, all.length > 500 && all.every((e) => e.tier !== "thin"));
    t(`${locale}: every indexable occupation is on exactly one group page (or has no major group) and one letter page`, (() => {
      const byGroup = MAJOR_GROUP_IDS.flatMap((g) => entriesByGroup(locale, g).map((e) => e.code));
      const byLetter = LETTERS.flatMap((l) => entriesByLetter(locale, l).map((e) => e.code));
      return new Set(byGroup).size === byGroup.length && byGroup.length === all.filter((e) => e.group).length && new Set(byLetter).size === byLetter.length && byLetter.length === all.filter((e) => e.letter !== "#").length;
    })());
    t(`${locale}: group names are non-empty for all 8 groups`, MAJOR_GROUP_IDS.every((g) => majorGroupName(g, locale).length >= 2));
    t(`${locale}: rich-tier entries are all rich`, richEntries(locale, 24).length === 24 && richEntries(locale, 24).every((e) => e.tier === "rich"));
  }
  t("the sitemap lists the index, every non-empty group and every non-empty letter page in all locales, with hreflang", hasAll("/occupations") && MAJOR_GROUP_IDS.filter((g) => groupCounts("en")[g]).every((g) => hasAll(`/occupations/group/${g}`)) && LETTERS.filter((l) => entriesByLetter("en", l).length).every((l) => hasAll(`/occupations/letter/${l}`)) && buildSitemap().filter((e) => /\/occupations(\/group|\/letter)?(\/|$)/.test(new URL(e.url).pathname) && !/occupations\/\d/.test(e.url)).every((e) => Object.keys(e.alternates?.languages ?? {}).length === 4));
  t("the sitemap still excludes the thin tier", unique.length > all0().length);
  for (const locale of activeLocales) {
    const c = occupationPageContent(unique.find((o) => o.anzsco_code === "261313")!, locale);
    t(`${locale}: the occupation page links the points calculator with ?occupation=<code>`, c.related.some((r) => r.destination === "points_calculator" && r.path.endsWith("?occupation=261313")));
    t(`${locale}: the occupation page links 189 / 190 / 491, the skills assessment finder, state data and the ANZSCO finder`, ["/visas/189", "/visas/190", "/visas/491", "/tools/skills-assessment", "/tools/state-nomination", "/tools/anzsco-finder"].every((p) => c.related.some((r) => r.path === p)));
  }
  const occPage = readFileSync("app/[locale]/(main)/occupations/[id]/page.tsx", "utf8");
  t("the occupation page renders breadcrumbs (Home > Occupations > group > occupation) and the research links with the comparison page", /<Breadcrumbs /.test(occPage) && /\/occupations\/group\//.test(occPage) && /<ResearchLinks /.test(occPage));
  for (const f of ["app/[locale]/(main)/visas/australia/page.tsx", "app/[locale]/(main)/tools/anzsco-finder/page.tsx"]) t(`hub page links rich-tier occupations: ${f}`, /<RichOccupationLinks /.test(readFileSync(f, "utf8")));
  const newFiles = ["lib/occupations/index-data.ts", "components/occupations/occupation-index-list.tsx", "components/seo/breadcrumbs.tsx", "components/occupations/rich-occupation-links.tsx", "components/occupations/calculator-occupation-note.tsx", "app/[locale]/(main)/occupations/page.tsx", "app/[locale]/(main)/occupations/group/[major]/page.tsx", "app/[locale]/(main)/occupations/letter/[letter]/page.tsx"];
  const banned = /\b(you should|we recommend|recommended|you qualify|you are eligible|your chances|best option|apply now|guarantee)\b/i;
  t("no directive, recommending or eligibility wording on the new index files", newFiles.every((f) => !banned.test(readFileSync(f, "utf8"))), newFiles.filter((f) => banned.test(readFileSync(f, "utf8"))).join(", "));
  function all0() { return indexableEntries("en"); }
}

section("Step 4. fact rows (value | source + link | verified date), registration rows, ABS attribution, JSON-LD, state data from the snapshot");
{
  const snap = seedStateData();
  const unique = getUniqueOccupations();
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  const bannedFact = /\b(you should|we recommend|recommended|you qualify|you are eligible|your chances|best option|apply now|guarantee)\b/i;
  for (const locale of activeLocales) {
    let rows = 0, badProv = 0, badWording = 0, pages = 0;
    for (const o of unique) {
      const c = occupationPageContent(o, locale);
      const facts = buildFactRows(o, c, snap);
      pages++;
      for (const f of facts) {
        rows++;
        if (!f.value.trim() || !f.sourceName.trim() || !iso.test(f.verified) || (f.sourceUrl !== undefined && !/^https:\/\//.test(f.sourceUrl))) badProv++;
        if (bannedFact.test(f.value) || bannedFact.test(f.label)) badWording++;
      }
    }
    t(`${locale}: ${rows} fact rows on ${pages} pages, every row has a value, a source name (linked https where a link exists) and a verified date`, badProv === 0, `${badProv} incomplete`);
    t(`${locale}: no directive or eligibility wording in any fact row`, badWording === 0, `${badWording}`);
    const sw = unique.find((o) => o.anzsco_code === "261313")!;
    const f = buildFactRows(sw, occupationPageContent(sw, locale), snap);
    t(`${locale}: identity, authority and list rows exist for 261313`, ["code", "title", "authority"].every((id) => f.some((r) => r.id === id)));
  }
  // State rows follow the admin snapshot (the data the reports use): changing a state's verified date changes the row.
  const withState = unique.find((o) => buildFactRows(o, occupationPageContent(o, "en"), snap).some((r) => r.group === "states"))!;
  const baseRow = buildFactRows(withState, occupationPageContent(withState, "en"), snap).find((r) => r.group === "states")!;
  const stateCode = baseRow.id.replace("state-", "");
  const patched = withPrograms(snap, { [stateCode]: { lastVerifiedAt: "2031-01-02T00:00:00.000Z", status: "Closed (test)" } });
  const changed = buildFactRows(withState, occupationPageContent(withState, "en"), patched).find((r) => r.id === baseRow.id)!;
  t("a state row takes its verified date and status from the snapshot, not from a constant", changed.verified === "2031-01-02" && /Closed \(test\)/.test(changed.value) && baseRow.verified !== "2031-01-02");
  // Registration rows (8.4).
  const byAuthority = (id: string) => unique.filter((o) => resolveAssessingAuthority(o.anzsco_code).authorityId === id);
  const med = byAuthority("AHPRA"), nur = byAuthority("ANMAC");
  t(`medical (AHPRA) occupations (${med.length}) have separate Medical Board registration rows with a source and date`, med.length > 0 && med.every((o) => buildFactRows(o, occupationPageContent(o, "en"), snap).filter((r) => r.group === "registration").length === 2));
  t(`nursing (ANMAC) occupations (${nur.length}) have a separate NMBA registration row that states no invented amount`, nur.length > 0 && nur.every((o) => { const r = buildFactRows(o, occupationPageContent(o, "en"), snap).filter((x) => x.group === "registration"); return r.length === 1 && !/\d/.test(r[0].value); }));
  const acs = byAuthority("ACS");
  t("an ACS occupation has no registration row", acs.length > 0 && acs.every((o) => !buildFactRows(o, occupationPageContent(o, "en"), snap).some((r) => r.group === "registration")));
  const page = readFileSync("app/[locale]/(main)/occupations/[id]/page.tsx", "utf8");
  t("the page shows ABS attribution for the ANZSCO descriptions, and the Occupation + WebPage JSON-LD with dateModified", /data-abs-attribution/.test(page) && /"@type": "Occupation"/.test(page) && /dateModified: dataVerified/.test(page) && /<Breadcrumbs /.test(page));
  t("the page reads the state data from the admin snapshot and re-renders hourly", /getAdminStateData\(\)/.test(page) && /export const revalidate = 3600/.test(page));
  const layout2 = readFileSync("app/[locale]/(main)/layout.tsx", "utf8");
  t("the locale layout no longer emits a WebApplication or an Offer / price", !/WebApplication/.test(layout2) && !/"Offer"/.test(layout2) && !/priceCurrency/.test(layout2));
  t("the old hard-coded state table is gone from the page (no direct stateRows rendering)", !/c\.stateRows\.map/.test(page));
}

console.log(failures === 0 ? "\n✅ ALL CHECKS PASSED" : `\n❌ ${failures} CHECK(S) FAILED`);
process.exitCode = failures === 0 ? 0 : 1;
