/**
 * Intent separation: /occupations owns search / browse / ANZSCO intent, /resources/occupation-list owns the PDF intent. Both stay indexable and
 * self-canonical; neither canonicalizes to the other; they link to each other with different anchors.
 *
 *   npx tsx scripts/test-occupation-pdf-page.tsx
 */
import "./lib/stub-request-context";

import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";

import { sanitizeParams } from "../lib/analytics/events";

let failures = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  if (cond) console.log(`  ✅ ${msg}`);
  else { failures++; console.error(`  ❌ ${msg}${detail ? ` -- ${detail}` : ""}`); }
};
const text = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, " ").trim();
const ALT = (path: string) => ({ en: `https://www.logivisa.com${path}`, tr: `https://www.logivisa.com/tr${path}`, "zh-Hans": `https://www.logivisa.com/zh-Hans${path}`, "x-default": `https://www.logivisa.com${path}` });

async function main() {
  const hub = await import("../app/[locale]/(main)/occupations/page");
  const pdf = await import("../app/[locale]/(main)/resources/occupation-list/page");
  const meta = async (m: { generateMetadata: (a: { params: Promise<{ locale: string }> }) => Promise<unknown> }, locale: string) => (await m.generateMetadata({ params: Promise.resolve({ locale }) })) as { title: unknown; description: string; alternates: { canonical: string; languages: Record<string, string> }; robots?: unknown };
  const render = async (m: { default: (a: { params: Promise<{ locale: string }> }) => Promise<React.ReactElement> | React.ReactElement }, locale: string) => renderToStaticMarkup(await m.default({ params: Promise.resolve({ locale }) }));
  const titleOf = (x: { title: unknown }) => (typeof x.title === "string" ? x.title : (x.title as { absolute: string }).absolute);

  console.log("\n1. /occupations: indexable, self-canonical, no PDF in the title, H1 unchanged");
  const hm = await meta(hub, "en");
  check(hm.alternates.canonical === "https://www.logivisa.com/occupations" && JSON.stringify(hm.alternates.languages) === JSON.stringify(ALT("/occupations")), "self-canonical (prefixless) with the unchanged hreflang set");
  check(hm.robots === undefined, "indexable (no robots override)");
  check(titleOf(hm) === "Australia Skilled Occupation List 2026 | Search ANZSCO Codes" && !/PDF/i.test(titleOf(hm)), "title is 'Australia Skilled Occupation List 2026 | Search ANZSCO Codes' and does not contain PDF");
  const hubHtml = await render(hub, "en");
  check(/<h1[^>]*>Australia Skilled Occupation List 2026<\/h1>/.test(hubHtml), "the H1 remains 'Australia Skilled Occupation List 2026'");

  console.log("\n2. /resources/occupation-list: indexable, self-canonical, PDF in the title and H1, honest labelling");
  for (const [loc, prefix] of [["en", ""], ["tr", "/tr"], ["zh-Hans", "/zh-Hans"]] as const) {
    const pm = await meta(pdf, loc);
    check(pm.alternates.canonical === `https://www.logivisa.com${prefix}/resources/occupation-list` && JSON.stringify(pm.alternates.languages) === JSON.stringify(ALT("/resources/occupation-list")), `${loc}: self-canonical with reciprocal hreflang (en, tr, zh-Hans, x-default)`);
    check(pm.robots === undefined, `${loc}: indexable`);
    check(/PDF/.test(titleOf(pm)), `${loc}: the title contains PDF`, titleOf(pm));
  }
  const pm = await meta(pdf, "en");
  check(titleOf(pm) === "Australian Skilled Occupation List 2026 PDF", "English title: 'Australian Skilled Occupation List 2026 PDF' (the site adds ' | LogiVisa')");
  check(/not an official government PDF/i.test(pm.description) && /LogiVisa-compiled/.test(pm.description), "the description says LogiVisa-compiled and not an official government PDF");
  const html = await render(pdf, "en");
  const t = text(html);
  check(/<h1[^>]*>\s*Australian Skilled Occupation List 2026 PDF\s*<\/h1>/.test(html), "the H1 contains PDF: 'Australian Skilled Occupation List 2026 PDF'");
  check(t.includes("A dated reference compiled by LogiVisa from official sources") && t.includes("compiled 8 October 2026") && t.includes("It is not an official government PDF") && t.includes("current Home Affairs information remains authoritative"), "the intro: dated, LogiVisa-compiled, from official sources, not an official government PDF, Home Affairs authoritative");
  check(t.includes("LogiVisa-compiled reference"), "the badge reads 'LogiVisa-compiled reference'");
  check(!/Official Occupation List|Official Skilled Occupation List|Official Government Document|Published directly by the Australian Department/i.test(html), "no wording calls it an official list or government document");
  check(t.includes("What the 2026 occupation list PDF contains") && ["ANZSCO code", "Occupation title", "List placement (CSOL, MLTSSL, STSOL, ROL)", "The visa subclasses associated with the published lists", "Assessing authority", "The compilation date and the sources, printed on the cover"].every((x) => t.includes(x)), "'What the 2026 occupation list PDF contains' lists code, title, list placement, subclasses, assessing authority and the compilation / source date");
  check(html.indexOf("Get the PDF in your inbox") < html.indexOf("What the 2026 occupation list PDF contains"), "the contents section comes immediately after the lead form");
  check(/name="email"/.test(html) && /name="full_name"/.test(html) && /documentId|csol-2026|Get the PDF/.test(html), "the email delivery form is still there");
  check(/documentId="csol-2026"/.test(readFileSync("app/[locale]/(main)/resources/occupation-list/page.tsx", "utf8")), "...and still submits for the same document (csol-2026)");
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  check(ld.length === 1 && /"@type":"WebPage"/.test(ld[0]) && !/DownloadAction|GovernmentOrganization|Legislation|"Dataset"|FAQPage/.test(ld[0]), "the only structured data is a plain WebPage (no DownloadAction, no government / legislation types)");
  const wordsLen = t.split(" ").length;
  check(wordsLen < 600, "the page stays short: it is a lead page, not an occupation database", String(wordsLen));

  console.log("\n3. no canonical relationship; one clear primary intent each");
  const hc = hm.alternates.canonical, pc = pm.alternates.canonical;
  check(hc !== pc && !pc.endsWith("/occupations") && !hc.includes("resources"), "neither page canonicalizes to the other");
  check(!/PDF/i.test(titleOf(hm)) && !/PDF/i.test(String(hm.description)) && !/<h1[^>]*>[^<]*PDF/.test(hubHtml), "/occupations: no PDF in title, description or H1 (search / browse / ANZSCO intent)");
  check(/PDF/.test(titleOf(pm)) && !/ANZSCO/.test(titleOf(pm)) && !/Search/.test(titleOf(pm)), "/resources/occupation-list: PDF in title, no search / ANZSCO wording (PDF intent)");
  check(/<h2[^>]*>\s*Search by occupation or ANZSCO code/.test(hubHtml) && !/<h2[^>]*>[^<]*Search by occupation/.test(html), "the search form lives on /occupations only");

  console.log("\n4. reciprocal links with different anchors");
  const hubLinks = [...hubHtml.matchAll(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({ href: m[1], label: text(m[2]) }));
  const pdfLinks = [...html.matchAll(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({ href: m[1], label: text(m[2]) }));
  const toPdf = hubLinks.find((l) => l.href === "/resources/occupation-list");
  const toHub = pdfLinks.find((l) => l.href === "/occupations");
  check(toPdf?.label === "Download the 2026 occupation list PDF", "/occupations -> /resources/occupation-list with 'Download the 2026 occupation list PDF'", toPdf?.label);
  check(toHub?.label === "Search occupations online", "/resources/occupation-list -> /occupations with 'Search occupations online'", toHub?.label);
  check(toPdf!.label !== toHub!.label && !/PDF/.test(toHub!.label) && /PDF/.test(toPdf!.label), "the anchors distinguish the intents");
  check(/data-occ-event="occupations_to_pdf_click"/.test(hubHtml) && /data-pdf-event="occupation_pdf_to_search_click"/.test(html), "each link carries its own tracking attribute");
  for (const loc of ["tr", "zh-Hans"] as const) {
    const h = await render(hub, loc), p = await render(pdf, loc);
    check(h.includes(`href="/${loc}/resources/occupation-list"`) && p.includes(`href="/${loc}/occupations"`), `${loc}: the cross-links keep the locale prefix`);
  }

  console.log("\n5. analytics: four fixed events, never form values");
  const evSrc = readFileSync("lib/analytics/events.ts", "utf8");
  check(["occupation_pdf_lead_start", "occupation_pdf_submit", "occupation_pdf_to_search_click", "occupations_to_pdf_click"].every((e) => evSrc.includes(`"${e}"`)), "occupation_pdf_lead_start, occupation_pdf_submit, occupation_pdf_to_search_click and occupations_to_pdf_click are defined in the existing module");
  const w = readFileSync("components/occupations/occupation-pdf-events.tsx", "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "");
  check(/trackEvent\("occupation_pdf_lead_start", \{ locale \}\)/.test(w) && /trackEvent\("occupation_pdf_submit", \{ locale \}\)/.test(w) && /trackEvent\("occupation_pdf_to_search_click", \{ locale \}\)/.test(w), "the tracker sends only the event name and the locale");
  check(!/\.value|FormData|full_name|email|phone|innerText|textContent|elements\[/.test(w), "it never reads a field value, a name, an email or a phone number");
  check(JSON.stringify(sanitizeParams({ locale: "en", full_name: "Jane Citizen", email: "jane@example.com", phone: "0400000000" })) === JSON.stringify({ locale: "en" }), "even if passed, name, email and phone are dropped by the allow-list");
  const hubWrapper = readFileSync("components/occupations/occupation-hub-events.tsx", "utf8");
  check(/"occupations_to_pdf_click"/.test(hubWrapper), "/occupations tracks its PDF link as occupations_to_pdf_click");

  console.log("\n6. sitemap and occupation architecture");
  const { buildSitemap } = await import("../app/sitemap");
  const sm = buildSitemap();
  const urls = sm.map((e) => e.url);
  for (const u of ["https://www.logivisa.com/resources/occupation-list", "https://www.logivisa.com/tr/resources/occupation-list", "https://www.logivisa.com/zh-Hans/resources/occupation-list", "https://www.logivisa.com/occupations", "https://www.logivisa.com/tr/occupations", "https://www.logivisa.com/zh-Hans/occupations"]) check(urls.filter((x) => x === u).length === 1, `${u} is listed once`);
  check(new Set(urls).size === urls.length && !urls.some((u) => u.includes("?") || u.includes("/_next/") || /\/en(\/|$)/.test(u.replace("https://www.logivisa.com", ""))), "the sitemap stays clean (no duplicates, queries, /_next/ or /en/)");
  check(urls.filter((u) => /\/occupations\/\d{6}/.test(u)).length === 1755 && urls.includes("https://www.logivisa.com/guide") && !urls.includes("https://www.logivisa.com/tr/guide"), "occupation detail URLs (585 x 3) and the /guide entry are unchanged");
  const detail = readFileSync("app/[locale]/(main)/occupations/[id]/page.tsx", "utf8");
  check(/pageAlternates\(locale, path\)/.test(detail) && /richness\.tier === "thin"/.test(detail) && /notFound\(\)/.test(detail), "the occupation detail page is untouched (canonical / hreflang, thin noindex, 404)");

  if (failures) { console.error(`\n❌ ${failures} check(s) failed`); process.exit(1); }
  console.log("\n✅ ALL CHECKS PASSED");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
