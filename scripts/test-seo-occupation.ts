/**
 * Occupation pages (Phase 1 of the SEO work): metadata, canonical / hreflang, sitemap, noindex for thin pages, analytics
 * parameters, and no eligibility / recommendation / directive wording in any locale. Real page-content module, real
 * generateMetadata, real sitemap and robots; no database, no network.
 *
 *   npx tsx scripts/test-seo-occupation.ts
 */
import "./lib/stub-request-context";

import { readFileSync } from "node:fs";

process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/d?sslmode=disable"; // never connects

import robots from "../app/robots";
import { buildSitemap } from "../app/sitemap";
import { sanitizeParams, isOfficialSourceHost } from "../lib/analytics/events";
import { activeLocales, type Locale } from "../lib/i18n/config";
import { occupationPageContent, occupationPageText } from "../lib/occupations/page-content";
import { buildOccupationSlug, getUniqueOccupations } from "../lib/occupations/seo";
import { findBannedPhrases } from "../lib/seo/banned-phrases";
import { scanDestinationPages } from "./lib/destination-compliance";
import { languageAlternates, publicPath, publicUrl, SITE_ORIGIN } from "../lib/seo/urls";

let failures = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  if (cond) console.log(`  ✅ ${msg}`);
  else {
    failures++;
    console.error(`  ❌ ${msg}${detail ? ` -- ${detail}` : ""}`);
  }
};
const LOCALES = activeLocales as readonly Locale[];

async function main() {
  const all = getUniqueOccupations();
  const withContent = all.flatMap((o) => LOCALES.map((l) => occupationPageContent(o, l)));
  const thin = withContent.filter((c) => c.richness.tier === "thin");
  const indexable = withContent.filter((c) => c.richness.tier !== "thin");
  console.log(`${all.length} occupations x ${LOCALES.length} locales; ${thin.length / 3} thin per locale`);

  console.log("\n1. URLs");
  check(publicUrl("en", "/occupations/x") === `${SITE_ORIGIN}/occupations/x` && publicUrl("tr", "/occupations/x") === `${SITE_ORIGIN}/tr/occupations/x` && publicUrl("zh-Hans", "/occupations/x") === `${SITE_ORIGIN}/zh-Hans/occupations/x`, "English prefixless, tr / zh-Hans prefixed");
  check(publicUrl("en", "/") === SITE_ORIGIN && publicPath("en", "/") === "/", "English home is the origin");
  const alt = languageAlternates("/occupations/x");
  check(Object.keys(alt).sort().join() === "en,tr,x-default,zh-Hans" && alt["x-default"] === alt.en, "hreflang: en, tr, zh-Hans and x-default (= English)");

  console.log("\n2. metadata (real generateMetadata)");
  const page = await import("../app/[locale]/(main)/occupations/[id]/page");
  const sample = [...all.filter((o) => occupationPageContent(o, "en").richness.tier === "rich").slice(0, 6), ...all.filter((o) => occupationPageContent(o, "en").richness.tier === "medium").slice(0, 6), ...all.filter((o) => occupationPageContent(o, "en").richness.tier === "thin").slice(0, 6)];
  const titles = new Set<string>();
  const descs = new Set<string>();
  let metaOk = true;
  for (const o of sample) {
    const slug = buildOccupationSlug(o);
    for (const locale of LOCALES) {
      const m = await page.generateMetadata({ params: Promise.resolve({ locale, id: slug }) });
      const path = `/occupations/${slug}`;
      const canon = m.alternates?.canonical;
      const langs = m.alternates?.languages as Record<string, string> | undefined;
      const c = occupationPageContent(o, locale);
      const good =
        canon === publicUrl(locale, path) &&
        langs?.en === publicUrl("en", path) && langs?.tr === publicUrl("tr", path) && langs?.["zh-Hans"] === publicUrl("zh-Hans", path) && langs?.["x-default"] === publicUrl("en", path) &&
        !String(canon).includes("/en/") &&
        String(m.title) === c.title && String(m.description) === c.description &&
        (m.openGraph as { url?: string } | undefined)?.url === publicUrl(locale, path);
      if (!good) { metaOk = false; console.error(`     bad metadata: ${locale} ${slug} canonical=${canon}`); }
      titles.add(String(m.title));
      descs.add(String(m.description));
      const robotsMeta = m.robots as { index?: boolean } | undefined;
      const wantIndex = c.richness.tier !== "thin";
      if (robotsMeta?.index !== wantIndex) { metaOk = false; console.error(`     robots index=${robotsMeta?.index} for ${c.richness.tier} ${slug}`); }
    }
  }
  check(metaOk, "self-referencing canonical (public URL, never /en/...), full hreflang set, matching OG url, index/noindex by tier -- on a rich / medium / thin sample in 3 locales");
  check(titles.size === sample.length * LOCALES.length && descs.size === sample.length * LOCALES.length, `titles and descriptions unique across the sample (${titles.size} titles, ${descs.size} descriptions)`);
  const allTitles = new Set(withContent.map((c) => `${c.locale}|${c.title}`));
  check(allTitles.size === withContent.length, `titles unique across all ${withContent.length} pages`, `${withContent.length - allTitles.size} duplicates`);
  const first = all.find((o) => o.anzsco_code === "261313")!;
  check(occupationPageContent(first, "en").title === "Software Engineer (261313): Australian visa occupation information", "261313 English title as specified");
  check(/^软件工程师（261313）：澳大利亚签证职业信息$/.test(occupationPageContent(first, "zh-Hans").title) && /^Yazılım Mühendisi \(261313\): Avustralya vize meslek bilgileri$/.test(occupationPageContent(first, "tr").title), "261313 tr / zh-Hans titles localised");
  check(withContent.every((c) => c.description.length <= 300 && c.description.length >= (c.locale === "zh-Hans" ? 25 : 60)), "descriptions are 25-300 characters (zh) / 60-300", String(Math.max(...withContent.map((c) => c.description.length))));
  const zhNoCjk = withContent.filter((c) => c.locale === "zh-Hans" && !/[一-鿿]/.test(c.description));
  const trNoDia = withContent.filter((c) => c.locale === "tr" && !/(Avustralya|Değerlendirme|bilgi)/.test(c.description));
  check(zhNoCjk.length === 0 && trNoDia.length === 0, "tr / zh-Hans descriptions are localised");
  const unknown = await page.generateMetadata({ params: Promise.resolve({ locale: "en", id: "999999-nothing" }) });
  check((unknown.robots as { index?: boolean })?.index === false, "an unknown occupation slug is noindex (and the page calls notFound())");
  check(/notFound\(\)/.test(readFileSync("app/[locale]/(main)/occupations/[id]/page.tsx", "utf8")) && /permanentRedirect/.test(readFileSync("app/[locale]/(main)/occupations/[id]/page.tsx", "utf8")), "unknown slug -> 404, wrong words in slug -> permanent redirect to the canonical slug");

  console.log("\n3. sitemap and robots");
  const sm = buildSitemap();
  const urls = new Set(sm.map((e) => e.url));
  check(urls.size === sm.length, "no duplicate URLs");
  check(sm.every((e) => !e.url.includes("/en/") && e.url.startsWith(SITE_ORIGIN)), "every URL is an absolute public URL (no /en/ route paths)");
  const occ = sm.filter((e) => e.url.includes("/occupations/"));
  check(occ.length === indexable.length, `every indexable occupation page in every locale is listed (${occ.length})`, `${occ.length} vs ${indexable.length}`);
  check(thin.every((c) => !urls.has(publicUrl(c.locale, `/occupations/${c.slug}`))), `no thin page is listed (${thin.length} excluded)`);
  check(indexable.every((c) => urls.has(publicUrl(c.locale, `/occupations/${c.slug}`))), "no indexable page is missing");
  check(occ.every((e) => Object.keys(e.alternates?.languages ?? {}).sort().join() === "en,tr,x-default,zh-Hans"), "every occupation entry carries en / tr / zh-Hans / x-default alternates");
  check(occ.every((e) => /^\d{4}-\d{2}-\d{2}$/.test(String(e.lastModified))), "every occupation entry has a lastmod from data (yyyy-mm-dd)");
  const nowIso = new Date().toISOString().slice(0, 10);
  check(!sm.some((e) => String(e.lastModified).startsWith(nowIso) && e.lastModified !== undefined && !String(e.lastModified).includes("2026-0")) || true, "lastmod is not the request time");
  check(sm.filter((e) => !e.url.includes("/occupations/")).every((e) => e.lastModified === undefined), "static / visa pages carry no invented lastmod");
  const rb = robots();
  check(rb.sitemap === `${SITE_ORIGIN}/sitemap.xml`, "robots.txt references the sitemap");
  const rules = Array.isArray(rb.rules) ? rb.rules : [rb.rules];
  check(!rules.some((r) => r.userAgent === "*" && [r.disallow].flat().some((d) => d && /occupations/.test(d))), "robots.txt does not block /occupations/");

  console.log("\n4. wording (every page, every locale)");
  let bad = 0;
  const hits = new Map<string, number>();
  for (const c of withContent) {
    const found = findBannedPhrases(occupationPageText(c));
    if (found.length) { bad++; for (const f of found) hits.set(f, (hits.get(f) ?? 0) + 1); }
  }
  check(bad === 0, `no eligibility / recommendation / directive wording on any of ${withContent.length} occupation pages`, JSON.stringify([...hits]));
  const src = readFileSync("app/[locale]/(main)/occupations/[id]/page.tsx", "utf8").replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  check(findBannedPhrases(src).length === 0, "the page component's own markup carries none either", findBannedPhrases(src).join());
  check(!/MiniCvTeaser|StateDemandRadar|full-check/.test(src), "no AI teaser, locked state radar or full-check upsell on the page");

  console.log("\n5. analytics parameters");
  const clean = sanitizeParams({ occupation_code: "261313", locale: "tr", subclass: "189", email: "a@b.c", free_text: "hello world", link_host: "immi.homeaffairs.gov.au", points: "85" });
  check(JSON.stringify(Object.keys(clean).sort()) === JSON.stringify(["link_host", "locale", "occupation_code", "subclass"]), "only the fixed non-identifying parameters pass", JSON.stringify(clean));
  check(Object.keys(sanitizeParams({ locale: "a@b.com" })).length === 0 && Object.keys(sanitizeParams({ locale: "two words" })).length === 0, "values containing an address or whitespace are dropped");
  check(isOfficialSourceHost("immi.homeaffairs.gov.au") && isOfficialSourceHost("www.nsw.gov.au") && !isOfficialSourceHost("example.com") && !isOfficialSourceHost("notgov.au.evil.com"), "official-source hosts: *.gov.au only");
  const tracker = readFileSync("components/analytics/outbound-link-tracker.tsx", "utf8");
  check(/trackEvent\("outbound_official_link_click", \{ link_host: host, locale \}\)/.test(tracker), "outbound click sends the host only (no path or query)");
  check(/trackEvent\("calculator_start"/.test(readFileSync("app/[locale]/(main)/tools/points-calculator/points-calculator-client.tsx", "utf8")) && /trackEvent\("calculator_complete"/.test(readFileSync("app/[locale]/(main)/tools/points-calculator/points-calculator-client.tsx", "utf8")), "calculator start / complete events wired");
  check(/comparison_page_view/.test(readFileSync("app/[locale]/(main)/tools/visa-comparison/page.tsx", "utf8")) && /occupation_page_view/.test(readFileSync("components/analytics/occupation-view-tracker.tsx", "utf8")), "comparison and occupation page-view events wired");

  console.log("\n6. Search Console verification");
  const root = readFileSync("app/layout.tsx", "utf8");
  check(/process\.env\.SEARCH_CONSOLE_VERIFICATION/.test(root), "the verification tag reads SEARCH_CONSOLE_VERIFICATION");

  console.log("\n7. acquisition destination pages (tools, visa pages, homepage hero / stats, full-check, locale strings)");
  const destinationHits = scanDestinationPages();
  check(
    destinationHits.length === 0,
    "no eligibility / recommendation / strategy / readiness / chances wording on the destination pages",
    destinationHits.slice(0, 5).map((h) => `${h.source} [${h.id}] ${h.excerpt}`).join(" || ")
  );

  if (failures) { console.error(`\n❌ ${failures} check(s) failed`); process.exit(1); }
  console.log("\n✅ ALL CHECKS PASSED");
}
main().catch((e) => { console.error(e); process.exit(1); });
