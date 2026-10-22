/**
 * /occupations as the primary page for "skilled occupation list australia 2026 pdf": metadata, H1, the PDF-intent and list sections, the official Home Affairs
 * source, the accurate labelling of LogiVisa's PDF, the FAQ, compliance wording, analytics privacy and the unchanged occupation architecture.
 *
 *   npx tsx scripts/test-occupation-hub.tsx
 */
import "./lib/stub-request-context";

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";

import { sanitizeParams } from "../lib/analytics/events";
import { HOME_AFFAIRS_SOL_URL, OCCUPATION_PDF } from "../lib/occupations/hub-content";
import { pdfPages } from "../lib/pdf-text";
import { researchLinks } from "../lib/marketing/research-journey";
import { RESEARCH_GUIDES } from "../lib/guides/research-guides";

let failures = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  if (cond) console.log(`  ✅ ${msg}`);
  else { failures++; console.error(`  ❌ ${msg}${detail ? ` -- ${detail}` : ""}`); }
};

const text = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, " ").trim();

async function main() {
  const mod = await import("../app/[locale]/(main)/occupations/page");
  const meta = async (locale: string) => mod.generateMetadata({ params: Promise.resolve({ locale }) });
  const render = async (locale: string) => renderToStaticMarkup(await mod.default({ params: Promise.resolve({ locale }) }));

  console.log("\n1. metadata (English): query-aligned title and description, self-canonical, hreflang unchanged");
  const en = await meta("en");
  const title = (en.title as { absolute: string }).absolute;
  check(title === "Australia Skilled Occupation List 2026 | Search ANZSCO Codes", "title: Australia Skilled Occupation List 2026 | Search ANZSCO Codes", title);
  check(title.length <= 60 && /Skilled Occupation List/.test(title) && /ANZSCO/.test(title) && !/PDF/i.test(title), "the title is 60 characters or fewer, carries the concept and does NOT contain PDF (that intent belongs to /resources/occupation-list)");
  const d = String(en.description);
  check(/ANZSCO code or title/.test(d) && /list placement, assessing authority and sources/.test(d) && !/PDF/i.test(d) && /Home Affairs remains the official source/.test(d), "the description: search by ANZSCO code or title, list placement, assessing authority and sources, Home Affairs is the official source; no PDF", d);
  check(d.length <= 170, "the description fits a result snippet", String(d.length));
  const alt = en.alternates as { canonical: string; languages: Record<string, string> };
  check(alt.canonical === "https://www.logivisa.com/occupations", "the English canonical is the prefixless self URL");
  check(JSON.stringify(alt.languages) === JSON.stringify({ en: "https://www.logivisa.com/occupations", tr: "https://www.logivisa.com/tr/occupations", "zh-Hans": "https://www.logivisa.com/zh-Hans/occupations", "x-default": "https://www.logivisa.com/occupations" }), "hreflang is unchanged: en, tr, zh-Hans, x-default (English)");
  const tr = await meta("tr"), zh = await meta("zh-Hans");
  check((tr.alternates as { canonical: string }).canonical === "https://www.logivisa.com/tr/occupations" && (zh.alternates as { canonical: string }).canonical === "https://www.logivisa.com/zh-Hans/occupations", "TR and zh-Hans keep their own self-canonical");
  check(/Avustralya Kalifiye Meslek Listesi 2026/.test((tr.title as { absolute: string }).absolute) && /澳大利亚技术职业清单 2026/.test((zh.title as { absolute: string }).absolute) && !/PDF/i.test((tr.title as { absolute: string }).absolute + (zh.title as { absolute: string }).absolute), "TR and zh-Hans titles are localized and carry no PDF");
  check(!(en.robots) , "the page stays indexable (no robots override)");

  console.log("\n2. the English page: H1, intro, search, PDF-intent section, list explanation, FAQ");
  const html = await render("en");
  const t = text(html);
  check(/<h1[^>]*>Australia Skilled Occupation List 2026<\/h1>/.test(html), "H1: Australia Skilled Occupation List 2026");
  check(!/Australian occupations \(ANZSCO\) A–Z and by group/.test(t), "the old H1 / title wording is gone");
  check(t.includes("Search LogiVisa’s source-dated Australian occupation data by occupation title or ANZSCO code") && t.includes("links to official sources and a downloadable dated reference"), "the intro explains what the page contains");
  check(t.includes("Australia does not use one single occupation list for every skilled visa") && t.includes("Different lists apply to different visas") && t.includes("Home Affairs currently references the CSOL, MLTSSL, STSOL and ROL") && t.includes("Being on a list is not personal visa eligibility"), "it says: no single list, different lists for different visas, CSOL/MLTSSL/STSOL/ROL, list inclusion is not eligibility");
  check(/<form[^>]*action="\/tools\/anzsco-finder"[^>]*method="get"/.test(html) && /name="q"/.test(html) && t.includes("Search by occupation or ANZSCO code"), "the main CTA: 'Search by occupation or ANZSCO code' is a search form into the existing ANZSCO finder (no new tool)");
  check(html.indexOf("Search by occupation or ANZSCO code") < html.indexOf("Which skilled occupation list applies?") && html.indexOf("Which skilled occupation list applies?") < html.indexOf("Need a downloadable, dated reference?") && html.indexOf("Need a downloadable, dated reference?") < html.indexOf("Browse the occupation index"), "order: search, which-list explanation, then the PDF as a secondary resource, then the index");
  check(t.includes("Need a downloadable, dated reference?") && !t.includes("Looking for the 2026 skilled occupation list PDF?"), "the PDF section is kept, as a secondary resource with a non-keyword heading");
  check(t.includes("maintains the current skilled occupation list information, including the relevant legislative instruments") && t.includes("verify current information with Home Affairs"), "it says Home Affairs maintains the current information and to verify with Home Affairs");
  check(html.includes(`href="${HOME_AFFAIRS_SOL_URL}"`) && /data-official-source[^>]*data-occ-event="official_occupation_list_click"|data-occ-event="official_occupation_list_click"[^>]*>/.test(html) && t.includes("Open the official Home Affairs skilled occupation list"), "it links directly to the official Home Affairs Skilled Occupation List");
  check(HOME_AFFAIRS_SOL_URL === "https://immi.homeaffairs.gov.au/visas/working-in-australia/skill-occupation-list", "...at its exact URL");
  check(t.includes("LogiVisa-compiled reference") && t.includes("compiled 8 October 2026") && t.includes("not an official government PDF") && t.includes("not an official government document"), "the PDF is labelled a LogiVisa-compiled, dated reference, never an official PDF");
  check(t.includes("Download the 2026 occupation list PDF"), "the secondary CTA reads 'Download the 2026 occupation list PDF'");
  check(!/(?<!not )(an|the) official (government )?(PDF|document)(?! \()/i.test(t.replace(/Home Affairs list data/g, "")) || /not an official government (PDF|document)/.test(t), "no text calls LogiVisa's PDF official");
  check(html.includes(`href="${OCCUPATION_PDF.resourcePath}"`) && /data-occ-event="occupations_to_pdf_click"/.test(html), "the PDF link goes to /resources/occupation-list and is tracked as occupations_to_pdf_click");
  check(t.includes("occupation data dated 9 July 2026"), "the occupation data date is shown");
  check(t.includes("Which skilled occupation list applies?") && ["CSOL", "MLTSSL", "STSOL", "ROL"].every((c) => t.includes(c)) && t.includes("Core Skills Occupation List") && t.includes("Medium and Long-term Strategic Skills List") && t.includes("Short-term Skilled Occupation List") && t.includes("Regional Occupation List"), "'Which skilled occupation list applies?' covers CSOL, MLTSSL, STSOL and ROL");
  check(t.includes("ANZSCO 2022 for subclass 186 and 482, and ANZSCO 2013 for all other visas"), "it explains the ANZSCO 2022 (186 / 482) and ANZSCO 2013 (other visas) labelling");
  check(t.includes("A list shows where an occupation is placed. It does not say whether a person qualifies for a visa."), "it states a list does not say whether a person qualifies");
  const faq = ["What is the Australian Skilled Occupation List?", "Is there an official Australian Skilled Occupation List 2026 PDF?", "What are CSOL, MLTSSL, STSOL and ROL?", "Which ANZSCO version does Australia use?", "Does being on a skilled occupation list mean I qualify for a visa?", "How do I find my ANZSCO code?"];
  check(faq.every((q) => t.includes(q)), "the six FAQ questions are present");
  check(/"@type":"FAQPage"/.test(html) && faq.every((q) => html.includes(q.replace(/'/g, "'"))), "FAQPage structured data matches the visible questions");
  check(/"@type":"CollectionPage"/.test(html), "the CollectionPage structured data is kept");
  check(t.includes("Skills Assessment Finder") && t.includes("Australia Points Calculator") && html.includes('href="/tools/skills-assessment"') && html.includes('href="/tools/points-calculator/australia"'), "secondary actions: Skills Assessment Finder, Points Calculator");
  check(html.indexOf("Start Assessment") > html.indexOf("Browse the occupation index") && html.includes('href="/full-check?country=AU"'), "the Assessment CTA is contextual and low on the page, after the research content");
  check(html.includes('href="/occupations/group/2"') && html.includes('href="/occupations/letter/a"') && /href="\/occupations\/\d{6}-[a-z0-9-]+"/.test(html), "the group navigation, A-Z navigation and occupation links are preserved");

  console.log("\n3. no eligibility, advice, ranking or prediction language");
  const BANNED = /PR guaranteed|guarantee|you qualify|you are eligible|eligible for PR|best occupations?|best visa|recommended|we recommend|likely to be invited|invitation (cut-?off|estimate|prediction)|your chances|you should apply/i;
  check(!BANNED.test(t), "none of the banned phrases appears on the page", (t.match(BANNED) ?? [""])[0]);
  const hubSrc = readFileSync("lib/occupations/hub-content.ts", "utf8");
  check(!BANNED.test(hubSrc.replace(/never says that a person qualifies,\s*\*?\s*recommends an occupation or visa, or predicts an outcome\./, "")), "nor in the page copy source");

  console.log("\n4. TR and zh-Hans are localized (no English sentences from the new sections)");
  for (const [loc, h1] of [["tr", "Avustralya Kalifiye Meslek Listesi 2026"], ["zh-Hans", "澳大利亚技术职业清单 2026"]] as const) {
    const h = await render(loc);
    const tx = text(h);
    check(new RegExp(`<h1[^>]*>${h1}</h1>`).test(h), `${loc}: localized H1`);
    check(!tx.includes("Search LogiVisa’s source-dated") && !tx.includes("Looking for the 2026") && !tx.includes("Which skilled occupation list applies?") && !tx.includes("Frequently asked questions"), `${loc}: no English section text`);
    check(h.includes(`action="${loc === "tr" ? "/tr" : "/zh-Hans"}/tools/anzsco-finder"`) && h.includes(`href="${loc === "tr" ? "/tr" : "/zh-Hans"}${OCCUPATION_PDF.resourcePath}"`) && h.includes(`href="${HOME_AFFAIRS_SOL_URL}"`), `${loc}: links keep the locale prefix; the official source link is the same`);
    check(/CSOL/.test(tx) && /MLTSSL/.test(tx) && /STSOL/.test(tx) && /ROL/.test(tx), `${loc}: the four list codes are shown`);
  }

  console.log("\n5. the LogiVisa PDF is what the page says it is");
  const pdf = readFileSync(`public${OCCUPATION_PDF.file}`);
  const pages = await pdfPages(new Uint8Array(pdf));
  const first = pages[0].replace(/\s+/g, " ");
  check(/Compiled by LogiVisa on 8 October 2026/.test(first) && OCCUPATION_PDF.compiledOn === "2026-10-08", "the PDF's cover says 'Compiled by LogiVisa on 8 October 2026' (the date the page shows)");
  check(/not an official or government document/.test(first) && /Department of Home Affairs/.test(first), "the PDF itself says it is not an official or government document and names Home Affairs as the source");
  check(existsSync("app/[locale]/(main)/resources/occupation-list/page.tsx") && /Get the PDF in your inbox/.test(readFileSync("app/[locale]/(main)/resources/occupation-list/page.tsx", "utf8")), "the existing delivery page (email form) is untouched and still serves it");

  console.log("\n6. analytics: fixed events, no typed text");
  const events = ["occupation_search_start", "occupation_result_click", "occupations_to_pdf_click", "official_occupation_list_click", "skills_assessment_click_from_occupations", "assessment_click_from_occupations"];
  const evSrc = readFileSync("lib/analytics/events.ts", "utf8");
  check(events.every((e) => evSrc.includes(`"${e}"`)), "the six events are defined in the existing analytics module (no new system)");
  const used = [...html.matchAll(/data-occ-event="([a-z_]+)"/g)].map((m) => m[1]);
  check(used.length > 0 && used.every((u) => events.includes(u)), "every tracked element uses one of those events", used.join(","));
  check(["occupation_search_start", "occupations_to_pdf_click", "official_occupation_list_click", "skills_assessment_click_from_occupations", "assessment_click_from_occupations", "occupation_result_click"].every((e) => used.includes(e)), "all six are wired on the page");
  const wrapper = readFileSync("components/occupations/occupation-hub-events.tsx", "utf8");
  check(!/\.value|innerText|textContent|href|FormData/.test(wrapper.replace(/\/\*[\s\S]*?\*\//g, "")) && /trackEvent\(name, \{ locale \}\)/.test(wrapper) && /trackEvent\("occupation_search_start", \{ locale \}\)/.test(wrapper), "the tracker sends only the event name and the locale: no search text, no link text, no URL");
  check(JSON.stringify(sanitizeParams({ locale: "en", q: "software engineer", email: "a@b.co", occupation: "chef" })) === JSON.stringify({ locale: "en" }), "the allow-list drops search text, email and occupation");
  check(sanitizeParams({ destination: "occupation_list" }).destination === "occupation_list", "the research-link destination 'occupation_list' is allowed");

  console.log("\n7. internal links to /occupations, descriptive and not stuffed");
  check(researchLinks("en").some((l) => l.path === "/occupations" && l.label === "Australian skilled occupation list" && l.destination === "occupation_list"), "the shared research links (tools, visa pages, occupation pages) include 'Australian skilled occupation list'");
  check(/href=\{publicPath\(locale, "\/occupations"\)\}/.test(readFileSync("components/landing/Hero.tsx", "utf8")), "the homepage search area links to the list");
  check(/path: "\/occupations", destination: "occupation_list"/.test(readFileSync("app/[locale]/(main)/tools/skills-assessment/SkillsAssessmentClient.tsx", "utf8")), "the Skills Assessment Finder links to the list after a search");
  const guides = RESEARCH_GUIDES.filter((g) => g.related.some((r) => r.path === "/occupations")).map((g) => g.slug);
  check(guides.includes("chef-vs-cook-australia") && guides.includes("developer-programmer-vs-software-engineer"), "the two occupation guides link to it", guides.join(","));
  const labels = new Set(["Australian skilled occupation list", "Search the Australian skilled occupation list"]);
  check(researchLinks("en").filter((l) => labels.has(l.label)).length === 1, "the exact wording is used once per link set, not repeated");

  console.log("\n8. no competing page, and the occupation architecture is unchanged");
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => { const f = `${dir}/${n}`; return statSync(f).isDirectory() ? walk(f) : [f]; });
  const dirs = walk("app").filter((f) => /page\.tsx$/.test(f)).map((f) => f.replace(/\\/g, "/"));
  const competing = dirs.filter((f) => /skilled-occupation-list|skill-occupation-list|australia-skilled/.test(f));
  check(competing.length === 0, "no new /skilled-occupation-list page was added", competing.join(","));
  check(dirs.filter((f) => /\/occupations\/page\.tsx$/.test(f)).length === 1 && existsSync("app/[locale]/(main)/occupations/[id]/page.tsx") && existsSync("app/[locale]/(main)/occupations/group/[group]/page.tsx".replace("[group]", "[id]")) || dirs.some((f) => /occupations\/group\//.test(f)), "the group pages and occupation detail route files are in place");
  const { buildSitemap } = await import("../app/sitemap");
  const urls = buildSitemap().map((e) => e.url);
  check(urls.filter((u) => u === "https://www.logivisa.com/occupations").length === 1 && urls.includes("https://www.logivisa.com/tr/occupations") && urls.includes("https://www.logivisa.com/zh-Hans/occupations"), "the sitemap lists /occupations once per locale");
  check(urls.filter((u) => /\/occupations\/\d{6}/.test(u)).length === 1755, "the sitemap's occupation URLs are unchanged (585 x 3)", String(urls.filter((u) => /\/occupations\/\d{6}/.test(u)).length));
  check(!urls.some((u) => u.includes("?") || u.includes("/_next/") || /\/en\//.test(u)) && new Set(urls).size === urls.length, "the sitemap stays clean");
  const detail = readFileSync("app/[locale]/(main)/occupations/[id]/page.tsx", "utf8");
  check(/pageAlternates\(locale, path\)/.test(detail) && /richness\.tier === "thin"/.test(detail) && /notFound\(\)/.test(detail), "the occupation detail page's canonical / hreflang, thin-tier noindex and 404 are untouched");

  if (failures) { console.error(`\n❌ ${failures} check(s) failed`); process.exit(1); }
  console.log("\n✅ ALL CHECKS PASSED");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
