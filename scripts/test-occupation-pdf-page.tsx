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
import { LeadMagnetForm } from "../components/LeadMagnetForm";
import { handlePdfDownload, type PdfDownloadDeps } from "../lib/pdf-download/handle";
import { pdfPages } from "../lib/pdf-text";
import { PDF_SLUGS } from "../lib/lead-magnets";
import { OCCUPATION_PDF } from "../lib/occupations/hub-content";

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
  check(t.includes("What the 2026 occupation list PDF contains") && ["ANZSCO code and occupation title", "List placement: CSOL, MLTSSL, STSOL and ROL", "The visa subclasses associated with the published lists", "Assessing authority", "The compilation date and the sources, printed on the cover"].every((x) => t.includes(x)), "'What the 2026 occupation list PDF contains' still makes clear: ANZSCO code, occupation title, list placement, relevant visa subclasses, assessing authority and the compilation / source date");
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


  console.log("\n7. conversion polish: an email-only form with accurate privacy and consent wording");
  const noTags = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, " ");
  check(!/name="phone"/.test(html) && !/lmf-phone/.test(html) && !/Phone Number|Telefon Numarası|手机号/.test(html), "the phone field is absent");
  check(!/combobox|Country code|Ülke kodu|国家区号|<select/.test(html), "there is no country-code selector");
  check(/name="full_name"/.test(html) && /name="email"/.test(html) && /type="checkbox"/.test(html) && /Send PDF to My Email/.test(html), "the form is Full Name, Email, the acknowledgement checkbox and 'Send PDF to My Email'");
  check(!/Your details are used only for this download|not shared with third parties|data processing policies|I agree to the/.test(html), "the 'not shared with third parties' claim and the old consent wording are gone");
  const privacyLine = /We use your details to deliver the requested PDF\. See our <a [^>]*href="\/legal"[^>]*>privacy information<\/a>\./.test(html);
  check(privacyLine, "privacy line: 'We use your details to deliver the requested PDF. See our privacy information.' with 'privacy information' linking to /legal");
  check(/I acknowledge the <a [^>]*href="\/legal"[^>]*>privacy information<\/a> and\s*<a [^>]*href="\/terms"[^>]*>Terms of Service<\/a>\./.test(html), "acknowledgement: 'I acknowledge the privacy information and Terms of Service.' with links to /legal and /terms");
  check(/<a [^>]*href="\/legal"/.test(html) && /<a [^>]*href="\/terms"/.test(html), "a privacy-information link and a Terms of Service link exist");
  check(!/newsletter|marketing|subscribe|promotional|special offers|updates and offers/i.test(t), "no marketing-consent or newsletter language was introduced");
  check(!/urgent|hurry|limited time|only \d+ left|countdown|instant/i.test(t), "no urgency, scarcity or 'instant' claims");
  const value = "The PDF gives you one reference table covering 690 occupation entries, with each entry’s ANZSCO code, list placement, relevant visa subclasses, assessing authority and source date.";
  check(t.includes(value), "the value-proposition sentence is present");
  // The numbers are verified against the file itself, not copied from the cover.
  const pdfBytes = await pdfPages(new Uint8Array(readFileSync(`public${OCCUPATION_PDF.file}`)));
  const coverCount = Number((pdfBytes[0].replace(/\s+/g, " ").match(/(\d+) occupations/) ?? [])[1]);
  const renderedCodes = pdfBytes.slice(1).flatMap((pg) => pg.match(/(?<!\d)\d{6}(?!\d)/g) ?? []);
  const sourceRows = JSON.parse(readFileSync("public/skilled-occupation-list.json", "utf8")) as Array<{ anzsco_code: string; occupation_en: string }>;
  check(renderedCodes.length === coverCount, "PDF rendered rows == the count printed on the PDF cover", `${renderedCodes.length} vs ${coverCount}`);
  check(sourceRows.length === renderedCodes.length && JSON.stringify([...sourceRows.map((r) => r.anzsco_code)].sort()) === JSON.stringify([...renderedCodes].sort()), "...and == the rows of the source dataset the PDF is generated from (same codes)", `${sourceRows.length}`);
  check(coverCount === OCCUPATION_PDF.entryCount && new Set(sourceRows.map((r) => r.occupation_en)).size === OCCUPATION_PDF.entryCount, "the landing-page figure (690 entries) is that count, and every entry has a distinct title");
  check(new Set(renderedCodes).size === OCCUPATION_PDF.distinctCodes, "the distinct-code figure (684) matches the PDF's codes", String(new Set(renderedCodes).size));
  const { indexableEntries } = await import("../lib/occupations/index-data");
  check(t.includes(`The PDF contains ${OCCUPATION_PDF.entryCount} occupation entries (${OCCUPATION_PDF.distinctCodes} distinct ANZSCO codes`) && t.includes(`The online occupation index currently has ${indexableEntries("en").length} searchable occupation pages.`) && indexableEntries("en").length === 585, "the page states 690 entries (684 distinct codes) and, separately, the 585 searchable online pages");
  check(t.includes("compiled 8 October 2026") && t.includes("not an official government PDF") && t.includes("current Home Affairs information remains authoritative") && t.includes("compiled by LogiVisa from official sources"), "the disclaimer concept is intact (LogiVisa-compiled, dated, official sources, not an official PDF, Home Affairs authoritative)");
  for (const loc of ["tr", "zh-Hans"] as const) {
    const h = await render(pdf, loc);
    check(!/name="phone"/.test(h) && !/combobox/.test(h) && h.includes(`href="/${loc}/legal"`) && h.includes(`href="/${loc}/terms"`), `${loc}: no phone field; the privacy and terms links keep the locale prefix`);
    check(!/I acknowledge|We use your details|Send PDF to My Email/.test(noTags(h)), `${loc}: the new wording is localized`);
  }

  console.log("\n8. the form submits with a name and an email only, and the delivery path is intact");
  const formSrc = readFileSync("components/LeadMagnetForm.tsx", "utf8");
  check(/\.\.\.\(emailOnly \? \{\} : \{ phone:/.test(formSrc), "the email-only form leaves phone out of its submission");
  check(/phone\?: string;/.test(readFileSync("lib/lead-magnet-client.ts", "utf8")), "the submission type makes phone optional");
  const ledger: Array<{ full_name: string; email: string; phone: string; slug: string }> = [];
  const sends: Array<{ email: string; slug: string }> = [];
  const after: Array<{ delivered: boolean }> = [];
  const deps: PdfDownloadDeps = {
    isExcludedEmail: () => false,
    countByIpAndSlug: async () => 0,
    countRealTotal: async () => 0,
    insertLedgerRow: async (row) => { ledger.push(row); return "led-1"; },
    deleteLedgerRow: async () => undefined,
    isSuppressed: () => false,
    sendDelivery: async (p) => { sends.push({ email: p.email, slug: p.slug }); return { sent: true } as never; },
    afterResponse: (task) => { after.push({ delivered: task.delivered }); },
  };
  const body = { full_name: "Sample Applicant", email: "Sample.Applicant@example.com", slug: PDF_SLUGS.occupation, locale: "en", category: "2026 Skilled Occupation List", termsAcceptedAt: new Date().toISOString() };
  check(!("phone" in body), "the posted body has no phone");
  const res = await handlePdfDownload({ body, ip: "203.0.113.9" }, deps);
  check(res.status === 200 && res.json.success === true && res.json.delivered === true, "name + email only: the server accepts it and reports the email as delivered", JSON.stringify(res.json));
  check(sends.length === 1 && sends[0].email === "sample.applicant@example.com" && sends[0].slug === PDF_SLUGS.occupation, "the PDF delivery email is sent for the occupation-list PDF");
  check(ledger.length === 1 && ledger[0].phone === "" && after.length === 1 && after[0].delivered === true, "the lead is recorded with an empty phone and the follow-up task runs");
  const nameless = await handlePdfDownload({ body: { ...body, full_name: "" }, ip: "203.0.113.10" }, deps);
  check(nameless.status === 400, "a missing name is still rejected (validation unchanged)");
  const defaultHtml = renderToStaticMarkup(<LeadMagnetForm locale="en" documentId="csol-2026" documentName="x" />);
  check(/name="phone"/.test(defaultHtml) && /Phone Number \(Optional\)/.test(defaultHtml) && /Your details are used only for this download/.test(defaultHtml) && /Send to My Email/.test(defaultHtml) && !/Send PDF to My Email/.test(defaultHtml), "every other lead form keeps its phone field and wording (the change is opt-in)");
  check(!/phone/i.test(readFileSync("components/occupations/occupation-pdf-events.tsx", "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "")), "no phone reference exists in the page's analytics");

  if (failures) { console.error(`\n❌ ${failures} check(s) failed`); process.exit(1); }
  console.log("\n✅ ALL CHECKS PASSED");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
