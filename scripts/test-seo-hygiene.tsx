/**
 * SEO hygiene after the 21 October indexation audit (docs/indexation-audit-2026-10-21.md):
 *   - English public links are prefixless, /tr/... and /zh-Hans/... keep their prefix (no internal link goes through an /en/... redirect)
 *   - /guide stays a real English product page; /tr/guide and /zh-Hans/guide permanently redirect to it; no fake localized copies in the sitemap
 *   - the occupation canonical / hreflang behaviour, the unknown-slug 404 and the retired-code redirects are unchanged
 *
 *   npx tsx scripts/test-seo-hygiene.tsx
 */
import "./lib/stub-request-context";

import { existsSync, readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { LandingFooter } from "../components/landing/footer";
import { occupationRedirectFor } from "../lib/occupations/redirects";
import { languageAlternates, pageAlternates, publicPath, publicUrl } from "../lib/seo/urls";

let failures = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  if (cond) console.log(`  ✅ ${msg}`);
  else { failures++; console.error(`  ❌ ${msg}${detail ? ` -- ${detail}` : ""}`); }
};

const hrefs = (html: string) => [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));

async function main() {
  console.log("\n1. the link helper: English prefixless, the other locales prefixed");
  check(publicPath("en", "/guides/x") === "/guides/x" && publicPath("en", "/tools/anzsco-finder") === "/tools/anzsco-finder" && publicPath("en", "/occupations/261313-software-engineer") === "/occupations/261313-software-engineer" && publicPath("en", "/visas/189") === "/visas/189", "English: /guides, /tools, /occupations, /visas are prefixless");
  check(publicPath("en", "/") === "/", "English home is /");
  check(publicPath("tr", "/guides/x") === "/tr/guides/x" && publicPath("tr", "/") === "/tr" && publicPath("tr", "/visas/189") === "/tr/visas/189", "Turkish links use /tr/...");
  check(publicPath("zh-Hans", "/guides/x") === "/zh-Hans/guides/x" && publicPath("zh-Hans", "/") === "/zh-Hans" && publicPath("zh-Hans", "/tools/skills-assessment") === "/zh-Hans/tools/skills-assessment", "Simplified Chinese links use /zh-Hans/...");
  check(!/^\/en(\/|$)/.test(publicPath("en", "/anything")), "no English public path starts with /en");

  console.log("\n2. the shared navigation components build their links with the helper");
  for (const [loc, prefix] of [["en", ""], ["tr", "/tr"], ["zh-Hans", "/zh-Hans"]] as const) {
    const links = hrefs(renderToStaticMarkup(createElement(LandingFooter, { locale: loc })));
    const internal = links.filter((h) => h.startsWith("/"));
    check(internal.length >= 6, `${loc}: the footer renders its internal links`, String(internal.length));
    check(internal.every((h) => (loc === "en" ? !/^\/(en|tr|zh-Hans)(\/|$)/.test(h) : h === prefix || h.startsWith(`${prefix}/`))), `${loc}: every footer link is ${loc === "en" ? "prefixless" : `under ${prefix}`}`, internal.join(" "));
  }
  const NAV_FILES = [
    "components/header.tsx", "components/landing/header.tsx", "components/landing/footer.tsx", "components/ChatQuickResult.tsx",
    "app/[locale]/(main)/guides/page.tsx", "app/[locale]/(main)/guides/[slug]/page.tsx", "app/[locale]/(main)/guides/FinalGuideCta.tsx",
    "app/[locale]/(main)/visas/canada/page.tsx", "app/[locale]/(main)/visas/australia/page.tsx", "app/[locale]/(main)/visas/[subclass]/page.tsx",
    "app/[locale]/(main)/visas/atlantic-immigration-program/page.tsx", "app/[locale]/(main)/visas/canada-family-sponsorship/page.tsx",
    "app/[locale]/(main)/tools/points-calculator/page.tsx", "app/[locale]/(main)/tools/points-calculator/points-calculator-client.tsx",
    "app/[locale]/(main)/tools/english-points/EnglishPointsClient.tsx", "app/[locale]/(main)/tools/skills-assessment/SkillsAssessmentClient.tsx",
    "app/[locale]/(main)/tools/visa-comparison/VisaComparisonClient.tsx", "app/[locale]/(main)/tools/document-checklist-2026/DocumentChecklist2026.tsx",
    "app/[locale]/(main)/tools/document-checklist-2026/DocumentChecklist2026Localized.tsx", "app/[locale]/(main)/points-calculator/page.tsx",
    "app/[locale]/(main)/occupation-checker/page.tsx",
  ];
  for (const f of NAV_FILES) {
    // The guide renderer's "{locale}" placeholder replacement is the one deliberate template; it is not a link.
    const src = readFileSync(f, "utf8").split("\n").filter((l) => !l.includes("rawHref.replace")).join("\n");
    check(!/`\/\$\{locale\}[^`]*`/.test(src) && /publicPath/.test(src), `${f}: no raw \`/\${locale}...\` link; uses publicPath`);
  }
  const header = readFileSync("components/header.tsx", "utf8");
  check(/publicPath\(locale, "\/"\)/.test(header) && /publicPath\(locale, `\/visas\/australia`\)/.test(header) && /publicPath\(locale, `\/full-check`\)/.test(header), "the main header's home, Australia visas and Assessment links use publicPath");
  check(/locale === "en" \? "" : `\/\$\{locale\}`/.test(readFileSync("app/[locale]/(main)/guides/[slug]/page.tsx", "utf8")), "the guide-content {locale} placeholder becomes empty for English (not '/' and not '/en')");

  console.log("\n3. /guide stays a real page; its /tr and /zh-Hans copies redirect to it");
  check(existsSync("app/[locale]/(main)/guide/page.tsx"), "/guide is a real page");
  const nextConfig = (await import("../next.config")).default as { redirects?: () => Promise<Array<{ source: string; destination: string; permanent?: boolean }>> };
  const redirects = (await nextConfig.redirects?.()) ?? [];
  const find = (s: string) => redirects.find((r) => r.source === s);
  check(find("/tr/guide")?.destination === "/guide" && find("/tr/guide")?.permanent === true, "/tr/guide permanently redirects to /guide");
  check(find("/zh-Hans/guide")?.destination === "/guide" && find("/zh-Hans/guide")?.permanent === true, "/zh-Hans/guide permanently redirects to /guide");
  check(!redirects.some((r) => r.source === "/guide" || r.source === "/guide/") && !redirects.some((r) => r.destination === "/guides" && /guide$/.test(r.source)), "/guide itself is not redirected, and not to /guides (a different product)");
  check(find("/en")?.destination === "/" && find("/en/:path+")?.destination === "/:path*" && redirects.filter((r) => /\/guides?$/.test(r.source)).length === 2, "the /en redirects are unchanged and only the two localized /guide redirects were added");
  const guidePage = readFileSync("app/[locale]/(main)/guide/page.tsx", "utf8");
  check(/alternates: \{ canonical: publicUrl\("en", "\/guide"\) \}/.test(guidePage) && !/languages/.test(guidePage), "/guide declares a self-canonical and no hreflang alternates");
  check(/DownloadForm/.test(guidePage) && /getCachedGuideDownloadStats/.test(guidePage) && /remainingDownloads/.test(guidePage), "the product flow (free-copies counter, download form) is untouched");

  console.log("\n4. the sitemap");
  const { buildSitemap } = await import("../app/sitemap");
  const sm = buildSitemap();
  const urls = sm.map((e) => e.url);
  check(urls.filter((u) => u === "https://www.logivisa.com/guide").length === 1, "/guide is listed exactly once");
  check(!urls.includes("https://www.logivisa.com/tr/guide") && !urls.includes("https://www.logivisa.com/zh-Hans/guide"), "/tr/guide and /zh-Hans/guide are not listed");
  const guideEntry = sm.find((e) => e.url === "https://www.logivisa.com/guide");
  check(!!guideEntry && !guideEntry.alternates, "the /guide entry carries no hreflang alternates");
  check(!urls.some((u) => /\/en(\/|$)/.test(u.replace("https://www.logivisa.com", ""))), "no /en/... URL is listed");
  check(!urls.some((u) => u.includes("/_next/") || u.includes("?") || u.includes("dpl=")), "no /_next/, query or ?dpl= URL is listed");
  check(new Set(urls).size === urls.length, "no duplicate URL");
  const occ = sm.filter((e) => /\/occupations\/\d{6}/.test(e.url));
  check(occ.length > 1500, "the occupation pages are still listed in all three locales", String(occ.length));
  const sample = occ.find((e) => e.url.startsWith("https://www.logivisa.com/tr/"))!;
  const langs = (sample.alternates as { languages?: Record<string, string> }).languages ?? {};
  check(Object.keys(langs).sort().join() === "en,tr,x-default,zh-Hans" && langs.tr === sample.url, "an occupation entry keeps its reciprocal hreflang set (self locale = its own URL)");
  check(urls.includes("https://www.logivisa.com/guides/chef-vs-cook-australia") && urls.includes("https://www.logivisa.com/tools/visa-comparison/189-vs-190"), "the research guides and comparison pages are still listed");

  console.log("\n5. the occupation canonical / hreflang, unknown-slug 404 and retired redirects are unchanged");
  const a = pageAlternates("tr", "/occupations/232313-jewellery-designer");
  check(a.canonical === "https://www.logivisa.com/tr/occupations/232313-jewellery-designer" && a.languages.en === "https://www.logivisa.com/occupations/232313-jewellery-designer" && a.languages["zh-Hans"] === "https://www.logivisa.com/zh-Hans/occupations/232313-jewellery-designer" && a.languages["x-default"] === a.languages.en, "a TR occupation page: self-canonical, reciprocal hreflang, x-default = English");
  check(JSON.stringify(Object.keys(languageAlternates("/x")).sort()) === JSON.stringify(["en", "tr", "x-default", "zh-Hans"]) && publicUrl("en", "/") === "https://www.logivisa.com", "the hreflang helper still emits en, tr, zh-Hans and x-default");
  const occPage = readFileSync("app/[locale]/(main)/occupations/[id]/page.tsx", "utf8");
  check(/alternates: pageAlternates\(locale, path\)/.test(occPage) && /richness\.tier === "thin"/.test(occPage) && /notFound\(\)/.test(occPage), "the occupation page still uses pageAlternates, noindexes the thin tier and calls notFound() for unknown slugs");
  check(occupationRedirectFor("/occupations/254315-enrolled-nurse-developmental-disability")?.to === "/occupations/group/2" && occupationRedirectFor("/occupations/254315-enrolled-nurse-developmental-disability")?.status === 301, "a retired code still 301s to its major-group page");
  check(occupationRedirectFor("/tr/occupations/231312-tour-guide")?.to === "/tr/occupations/group/2" && occupationRedirectFor("/zh-Hans/occupations/231312-tour-guide")?.to === "/zh-Hans/occupations/group/2", "...keeping the locale prefix");
  check(occupationRedirectFor("/occupations/999999-fake-job") === null, "a code that never existed has no redirect (the page answers 404)");
  check(occupationRedirectFor("/occupations/261313-wrong-slug")?.to === "/occupations/261313-software-engineer", "a wrong-words slug with a valid code still 301s to the canonical slug");

  if (failures) { console.error(`\n❌ ${failures} check(s) failed`); process.exit(1); }
  console.log("\n✅ ALL CHECKS PASSED");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
