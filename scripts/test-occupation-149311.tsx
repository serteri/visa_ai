/**
 * SEO Sprint 2: ANZSCO 149311 Conference and Event Organiser is an occupation-first, source-backed research page in EN / TR / zh-Hans.
 *
 *   npx tsx scripts/test-occupation-149311.tsx
 */
import "./lib/stub-request-context";

import { renderToStaticMarkup } from "react-dom/server";

let failures = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  if (cond) console.log(`  ✅ ${msg}`);
  else { failures++; console.error(`  ❌ ${msg}${detail ? ` -- ${detail}` : ""}`); }
};
const text = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, " ").trim();
const SLUG = "149311-conference-and-event-organiser";
const ALT = (path: string) => ({ en: `https://www.logivisa.com${path}`, tr: `https://www.logivisa.com/tr${path}`, "zh-Hans": `https://www.logivisa.com/zh-Hans${path}`, "x-default": `https://www.logivisa.com${path}` });

async function main() {
  const page = await import("../app/[locale]/(main)/occupations/[id]/page");
  const render = async (locale: string) => renderToStaticMarkup(await page.default({ params: Promise.resolve({ locale, id: SLUG }) }));
  const meta = async (locale: string) => (await page.generateMetadata({ params: Promise.resolve({ locale, id: SLUG }) })) as { title: string; description: string; robots?: unknown; alternates: { canonical: string; languages: Record<string, string> } };

  const en = await render("en");
  const t = text(en);
  const m = await meta("en");

  console.log("\n1. title, meta description and H1 are occupation-first");
  check(m.title === "Conference and Event Organiser ANZSCO 149311 | Skills Assessment", "title: 'Conference and Event Organiser ANZSCO 149311 | Skills Assessment'", String(m.title));
  check(/ANZSCO 149311/.test(m.description) && /VETASSESS/.test(m.description) && /occupation description/.test(m.description) && /occupation-list/.test(m.description) && /sourced research/.test(m.description), "description names ANZSCO 149311, VETASSESS, the occupation description, occupation-list placement and sourced research");
  check(!/eligib|guaranteed|best visa|likely invitation/i.test(`${m.title} ${m.description}`), "no eligibility / guarantee / best-visa / invitation wording in title or description");
  check(/<h1[^>]*>\s*Conference and Event Organiser \(ANZSCO 149311\)\s*<\/h1>/.test(en) && !/Visa Options for/i.test(en), "H1 is 'Conference and Event Organiser (ANZSCO 149311)'");

  console.log("\n2. legacy and AI wording is absent");
  const legacy = /AI-Powered|AI Duty Match|Run AI Match|PR readiness|Check Your PR Eligibility|Full State Matching|Ready to Find Your Visa Pathway|State Sponsorship Radar|Live data is currently being updated|Visa Options|personalised pathway|personalized pathway/i;
  check(!legacy.test(t), "none of the legacy eligibility / AI-match / readiness / radar wording renders");
  check(!/canada/i.test(t.replace(/Canada Assessment/g, "")) || !/Canada Assessment|Canada report/i.test(t), "no Canada Assessment call to action");
  check(!/\byou are eligible\b|will be invited|likely to be invited|best state|guaranteed/i.test(t), "no eligibility verdicts, invitation predictions or 'best state' wording");

  console.log("\n3. content");
  check(t.includes("At a glance") && t.includes("149311") && t.includes("VETASSESS") && /Group C/.test(t) && /AQF Diploma or higher/.test(t), "At a glance shows ANZSCO 149311, VETASSESS, Group C and AQF Diploma or higher");
  check(t.includes("Roles considered suitable under ANZSCO 149311") && ["Event Manager or Planner", "Exhibition Organiser", "Wedding Coordinator"].every((x) => t.includes(x)), "suitable roles section lists the three VETASSESS titles");
  check(t.includes("Roles VETASSESS does not consider under ANZSCO 149311") && ["Marketing Specialist", "Public Relations Professional", "Food and Beverage Manager", "Personal Assistant", "Venue Sales Manager", "Event Sales Manager", "Venue Banquet Manager"].every((x) => t.includes(x)) && /classified elsewhere in ANZSCO or are not at the required skill level/.test(t) && !/are classified elsewhere and/.test(t), "not-considered roles section lists the seven roles with VETASSESS's both-possibilities wording");
  check(!/cannot migrate|can't migrate|not eligible/i.test(t), "the not-considered roles are never framed as 'cannot migrate'");
  check(t.includes("Skills assessment — VETASSESS") && /does not make a skills assessment determination/.test(t) && en.includes('href="/tools/skills-assessment?q=149311"') && en.includes("https://www.vetassess.com.au/check-my-occupation/professional-occupations/conference-and-event-organiser"), "VETASSESS section links the Skills Assessment Finder and the official VETASSESS page and makes no determination");
  check(t.includes("Typical duties (paraphrased)") && /Plan and coordinate venues, suppliers, catering/.test(t) && !/Perform Conference and Event Organiser duties requiring|Apply relevant technical or specialised knowledge/.test(t), "occupation-specific duties replace the generic ones");
  check(t.includes("Published occupation-list placement") && /ANZSCO 149311 appears on [A-Z, ]+, which are used by published visa and program contexts including subclasses[^.]*\. Other visa requirements still apply\./.test(t) && /dataset 9 July 2026|2026/.test(t) && en.includes("https://immi.homeaffairs.gov.au"), "list placement is phrased as published information with source, date and the Home Affairs link");
  check(t.includes("Related visa research") && !t.includes("Visa Options") && t.includes("State and territory nomination research") && en.includes('href="/tools/state-nomination"'), "'Related visa research' and 'State and territory nomination research' (linking the State Nomination tool)");
  for (const label of ["Check skills assessment information", "Search ANZSCO occupations", "View related visa research", "State nomination research"]) check(t.includes(label), `primary CTA: ${label}`);
  check(t.includes("Start Assessment") && t.includes("Create a structured report based on the information you enter.") && en.includes('href="/full-check"'), "lower secondary CTA 'Start Assessment' with neutral copy");
  const faqs = ["What is ANZSCO 149311?", "Who assesses it?", "Is Event Manager included?", "Is Wedding Coordinator included?", "Is Marketing Specialist the same occupation?", "What qualification does VETASSESS reference?", "Which occupation lists include 149311?", "Does list inclusion mean I qualify?"];
  check(faqs.every((q) => t.includes(q)), "all eight FAQ questions render");
  check(/Sources:\s*VETASSESS/.test(t) && /Checked 22 October 2026/.test(t), "FAQ sources and check date are shown");
  const ld = [...en.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((x) => x[1]).join("\n");
  check(/"@type":"FAQPage"/.test(ld) && (ld.match(/"@type":"Question"/g) ?? []).length === 8, "FAQPage schema with eight questions");
  check(!/AggregateRating|"review"|"Rating"|"EligibilityRequirement"|GovernmentService|GovernmentOrganization/.test(ld), "no ratings, eligibility or government-document schema");

  console.log("\n4. indexable, canonical and hreflang unchanged, sitemap");
  check((m.robots as { index?: boolean } | undefined)?.index === true, "indexable");
  check(m.alternates.canonical === `https://www.logivisa.com/occupations/${SLUG}` && JSON.stringify(m.alternates.languages) === JSON.stringify(ALT(`/occupations/${SLUG}`)), "self-canonical with the unchanged hreflang set");
  const { buildSitemap } = await import("../app/sitemap");
  const urls = buildSitemap().map((e) => e.url);
  check(["", "/tr", "/zh-Hans"].every((p) => urls.includes(`https://www.logivisa.com${p}/occupations/${SLUG}`)), "in the sitemap for all three locales");

  console.log("\n5. TR and zh-Hans are localized without English blocks");
  for (const [loc, h1Sample, marker] of [["tr", "Bir bakışta", /Beceri değerlendirmesi — VETASSESS/], ["zh-Hans", "概览", /技能评估 — VETASSESS/]] as const) {
    const h = await render(loc);
    const x = text(h);
    const mm = await meta(loc);
    check(x.includes(h1Sample) && marker.test(x), `${loc}: sections are localized`);
    check(x.includes("VETASSESS") && /<h1[^>]*>\s*Conference and Event Organiser \(ANZSCO 149311\)\s*<\/h1>/.test(h) && x.includes("Event Manager or Planner"), `${loc}: VETASSESS, the H1 and the VETASSESS role names stay in English`);
    check(!/At a glance|Roles considered suitable|Typical duties|Published occupation-list placement|Related visa research|Frequently asked|Start Assessment|Create a structured report|Which occupation lists include/.test(x), `${loc}: no English headings, CTAs or FAQ text leak in`);
    check(!legacy.test(x), `${loc}: no legacy wording`);
    check(mm.alternates.canonical === `https://www.logivisa.com/${loc}/occupations/${SLUG}` && JSON.stringify(mm.alternates.languages) === JSON.stringify(ALT(`/occupations/${SLUG}`)), `${loc}: canonical (locale-prefixed) and the hreflang set are unchanged`);
    check(!/eligib/i.test(`${mm.title} ${mm.description}`) && /149311/.test(mm.title) && /VETASSESS/.test(mm.description), `${loc}: title and description are occupation-first`);
  }

  console.log("\n6. other occupations are unchanged");
  const other = renderToStaticMarkup(await page.default({ params: Promise.resolve({ locale: "en", id: "351311-chef" }) }));
  check(!other.includes("data-occupation-research") && other.includes("Continue your research"), "a different occupation keeps the generic template");

  if (failures) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
  console.log("\nAll checks passed");
}
main().catch((e) => { console.error(e); process.exit(1); });
