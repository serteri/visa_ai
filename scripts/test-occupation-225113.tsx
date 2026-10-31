/**
 * SEO Sprint 3: ANZSCO 225113 Marketing Specialist is an occupation-first, source-backed research page in EN / TR / zh-Hans, and 225113 can never
 * render as Market Research Analyst (that is 225112).
 *
 *   npx tsx scripts/test-occupation-225113.tsx
 */
import "./lib/stub-request-context";

import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";

let failures = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  if (cond) console.log(`  ✅ ${msg}`);
  else { failures++; console.error(`  ❌ ${msg}${detail ? ` -- ${detail}` : ""}`); }
};
const text = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, " ").trim();
const SLUG = "225113-marketing-specialist";
const ALT = (path: string) => ({ en: `https://www.logivisa.com${path}`, tr: `https://www.logivisa.com/tr${path}`, "zh-Hans": `https://www.logivisa.com/zh-Hans${path}`, "x-default": `https://www.logivisa.com${path}` });

async function main() {
  console.log("\n1. source of truth: 225113 = Marketing Specialist (never Market Research Analyst)");
  const { findOccupationById, getUniqueOccupations } = await import("../lib/occupations/seo");
  const rec = findOccupationById(SLUG);
  check(rec?.anzsco_code === "225113" && rec?.occupation_name === "Marketing Specialist", "the dataset the page reads (src/data/occupations.json) names 225113 Marketing Specialist", JSON.stringify(rec?.occupation_name));
  const uniq = getUniqueOccupations();
  check(uniq.find((o) => o.anzsco_code === "225112")?.occupation_name === "Market Research Analyst" && uniq.find((o) => o.anzsco_code === "225111")?.occupation_name === "Advertising Specialist" && uniq.find((o) => o.anzsco_code === "225114")?.occupation_name === "Content Creator (Marketing)", "225111 Advertising Specialist, 225112 Market Research Analyst and 225114 Content Creator (Marketing) are unchanged");
  const list = JSON.parse(readFileSync("public/skilled-occupation-list.json", "utf8")) as Array<{ anzsco_code: string; occupation_en: string }>;
  check(list.find((r) => r.anzsco_code === "225113")?.occupation_en === "Marketing Specialist", "the published list JSON (public/skilled-occupation-list.json) agrees");
  const row = readFileSync("public/Skilled Occupation List.md", "utf8").split("\n").find((l) => /\b225113\b/.test(l)) ?? "";
  check(row.startsWith("| Marketing Specialist |") && /STSOL;CSOL/.test(row) && /subclass 186\\\) \\- Direct Entry/.test(row) && /subclass 482\\\) \\- Core Skills/.test(row), "the Home Affairs list row held in the repo names Marketing Specialist on STSOL;CSOL, with 482 (Core Skills) and 186 (Direct Entry)");

  const page = await import("../app/[locale]/(main)/occupations/[id]/page");
  const render = async (locale: string) => renderToStaticMarkup(await page.default({ params: Promise.resolve({ locale, id: SLUG }) }));
  const meta = async (locale: string) => (await page.generateMetadata({ params: Promise.resolve({ locale, id: SLUG }) })) as { title: string; description: string; robots?: unknown; alternates: { canonical: string; languages: Record<string, string> } };

  const en = await render("en");
  const t = text(en);
  const m = await meta("en");
  const noMra = (h: string) => !/Occupation title\s*Market Research Analyst|ANZSCO 225113\s*Market Research Analyst|Market Research Analyst\s*\(ANZSCO 225113\)/.test(text(h));

  console.log("\n2. title, description and H1 are occupation-first and never say Market Research Analyst for 225113");
  check(m.title === "Marketing Specialist ANZSCO 225113 | Skills Assessment", "title: 'Marketing Specialist ANZSCO 225113 | Skills Assessment' (the longer VETASSESS variant would be 64+ characters before the site suffix)", String(m.title));
  check(/ANZSCO 225113/.test(m.description) && /VETASSESS/.test(m.description) && /occupation description/.test(m.description) && /occupation-list/.test(m.description), "description names ANZSCO 225113, VETASSESS, the occupation description and occupation-list placement");
  check(!/eligib|guaranteed|best visa|likely invitation|PR chances|Can I get PR/i.test(`${m.title} ${m.description}`), "no eligibility / PR-chance / guarantee / best-visa wording in title or description");
  check(/<h1[^>]*>\s*Marketing Specialist \(ANZSCO 225113\)\s*<\/h1>/.test(en) && !/Visa Options for/i.test(en), "H1 is 'Marketing Specialist (ANZSCO 225113)'");
  check(noMra(en) && /Occupation title\s*Marketing Specialist/.test(t), "225113 never renders as Market Research Analyst; the identity table says 'Marketing Specialist'");
  check(!/Market Research Analyst/.test(m.title) && !/Market Research Analyst/.test(m.description), "Market Research Analyst is not in the title or description");

  console.log("\n3. content");
  check(t.includes("At a glance") && /ANZSCO code\s*225113/.test(t) && /Group B/.test(t) && /AQF Bachelor degree or higher/.test(t) && /ANZSCO skill level\s*1\b/.test(t) && /Assessing authority\s*VETASSESS/.test(t), "At a glance: 225113, Marketing Specialist, skill level 1, VETASSESS, Group B, AQF Bachelor degree or higher");
  check(/Core Skills Occupation List/.test(t) && !/Consolidated Sponsored/i.test(t), "CSOL expands to 'Core Skills Occupation List' and never to the legacy 'Consolidated Sponsored Occupation List'");
  check(/identifies market opportunities and advises on the development, coordination and implementation of plans for pricing and promoting an organisation's goods and services/.test(t) && /makes no determination about any individual/.test(t), "intro: the occupation-specific description and 'no determination about any individual'");
  check(t.includes("Roles considered suitable under ANZSCO 225113") && ["Marketing Consultant", "Marketing Coordinator", "Marketing Officer", "Brand Manager", "Category Manager", "Product Manager", "Sales Promotion Officer"].every((x) => t.includes(x)), "suitable roles section lists the seven VETASSESS titles");
  check(t.includes("Roles VETASSESS does not consider under ANZSCO 225113") && ["Market Research Analyst", "Advertising Specialist", "Sales and Marketing Manager", "Technical Sales Representatives", "Sales Workers"].every((x) => t.includes(x)) && /classified elsewhere in ANZSCO/.test(t), "not-considered section lists the five occupations as 'classified elsewhere in ANZSCO'");
  check(!/cannot migrate|can't migrate|not eligible|cannot receive a skills assessment/i.test(t), "the not-considered occupations are never framed as 'cannot migrate' or 'cannot be assessed'");
  check(t.includes("Marketing Specialist skills assessment — VETASSESS") && /Group B/.test(t) && /VETASSESS considers both the qualification and the employment/.test(t) && en.includes('href="/tools/skills-assessment?q=225113"') && en.includes("https://www.vetassess.com.au/check-my-occupation/professional-occupations/marketing-specialist"), "VETASSESS section: Group B, qualification and employment, links to the Skills Assessment Finder (q=225113) and the official VETASSESS page");
  check(/Pathway 1: a Bachelor degree or higher in a highly relevant field[^.]*at least 1 year/.test(t) && /Pathway 2:[^.]*additional highly relevant qualification at AQF Diploma level or above[^.]*at least 2 years/.test(t) && /Pathway 3:[^.]*at least 3 years/.test(t) && /Pathway 4:[^.]*at least 6 years[^.]*at least 1 year of highly relevant employment within the last 5 years/.test(t) && /20 hours a week/.test(t), "the four pathways are summarised (1 year / 2 years / 3 years / 6 years, 20+ hours a week)");
  check(/does not say which pathway applies to any individual/.test(t), "the page does not tell an individual which pathway applies");
  check(["Marketing", "Advertising", "Business Communications", "Public Relations"].every((x) => new RegExp(`<li>${x}</li>`).test(en)) && /Business Management and Business and Commerce qualifications may be considered case by case/.test(t) && /does not say whether any particular qualification will be accepted/.test(t), "highly relevant fields (Marketing, Advertising, Business Communications, Public Relations) and the case-by-case note, with no acceptance promise");
  check(/front-line retail setting/.test(t) && /not accepted as Marketing Specialist employment/.test(t) && /not a visa decision/.test(t), "front-line retail / transactional employment note, framed as VETASSESS information");
  check(t.includes("Typical duties (paraphrased)") && /Develop marketing objectives, policies and programs/.test(t) && /Advise on digital marketing, including SEO, social media and analytics/.test(t) && !/Apply relevant technical or specialised knowledge|apply advanced technical|comply with professional standards/i.test(t), "Marketing Specialist-specific duties replace the generic ones");
  check(t.includes("Marketing Specialist vs Advertising Specialist vs Market Research Analyst") && /broader marketing scope, including product, pricing, promotion, selling and distribution/.test(t) && /focuses mainly on advertising planning, campaigns, content placement and production/.test(t) && /quantitative and qualitative research, consumer behaviour, trends and market analysis/.test(t) && /better than another/.test(t) && en.includes('href="/occupations/225111-advertising-specialist"') && en.includes('href="/occupations/225112-market-research-analyst"'), "comparison with Advertising Specialist and Market Research Analyst, with links to 225111 and 225112 and no 'better' claim");
  check(t.includes("Published occupation-list placement") && /Marketing Specialist appears on CSOL, STSOL/.test(t) && /These lists are used in published visa-program rules/.test(t) && /Other requirements still apply\./.test(t) && /subclasses 190, 491, 482, 186, 407, 489, 494/.test(t) && /Direct Entry|186/.test(t) && en.includes("https://immi.homeaffairs.gov.au") && /9 July 2026/.test(t), "list placement: neutral wording, the subclasses the Home Affairs row names (incl. 186), source and date");
  check(/Subclass 186 information/.test(t) && en.includes('href="/visas/186_direct_entry"') && en.includes('href="/visas/190"') && en.includes('href="/visas/491"') && en.includes('href="/visas/482"'), "related visa research links 190, 491, 482 and 186 (Direct Entry) from the verified mapping");
  check(!/Subclasses mapped to those lists \(LogiVisa mapping\)/.test(t), "the generic derived-subclass row (which omits 186) is not shown beside the verified list");
  check(t.includes("Related visa research") && !t.includes("Visa Options") && t.includes("State and territory nomination research") && en.includes('href="/tools/state-nomination"') && en.includes('href="/tools/anzsco-finder'), "'Related visa research', 'State and territory nomination research' and an ANZSCO Finder link");
  check(/Search ANZSCO occupations/.test(t) && en.includes('href="/occupations"') && en.includes('href="/full-check"'), "links to /occupations and the Assessment");
  for (const label of ["Check skills assessment information", "Search ANZSCO occupations", "View related visa research", "State nomination research"]) check(t.includes(label), `primary CTA: ${label}`);
  check(t.includes("Start Assessment") && t.includes("Create a structured report based on the information you enter."), "lower CTA 'Start Assessment' with neutral copy");

  console.log("\n4. no eligibility verdicts, invitation predictions or legacy wording");
  const legacy = /AI-Powered|AI Duty Match|Run AI Match|PR readiness|Check Your PR Eligibility|Full State Matching|Ready to Find Your Visa Pathway|State Sponsorship Radar|Live data is currently being updated|Visa Options|personali[sz]ed pathway/i;
  check(!legacy.test(t), "none of the legacy eligibility / AI-match / readiness / radar wording renders");
  check(!/you (are|may be) eligible|you qualify for|will be invited|likely to be invited|best state|best visa|guaranteed|can get (a )?190|eligible for 491|PR pathway available/i.test(t), "no eligibility verdicts, invitation predictions or 'best visa / best state' wording");
  check(/does not decide an individual's visa, nomination, sponsorship or permanent residence outcome/.test(t), "FAQ states that list inclusion does not decide an individual's visa, nomination, sponsorship or permanent residence outcome");
  check(!/Can Marketing Specialists get PR/i.test(t), "no 'Can Marketing Specialists get PR?' question");
  check(!/Canada Assessment|Canada report/i.test(t), "no Canada call to action");

  console.log("\n5. FAQ");
  const faqs = ["What is ANZSCO 225113?", "Who assesses Marketing Specialist?", "Is Marketing Consultant included under 225113?", "Is Marketing Coordinator included?", "Is Brand Manager included?", "What qualification level does VETASSESS reference?", "What fields of study are highly relevant?", "How is Marketing Specialist different from Advertising Specialist?", "How is it different from Market Research Analyst?", "Which published occupation lists include Marketing Specialist?", "Is Marketing Specialist used in Australian skilled visa programs?", "Does being on an occupation list mean I get permanent residence?", "Do the 482 and 186 visas restrict Marketing Specialist beyond the skills assessment?"];
  check(faqs.every((q) => t.includes(q)), "all thirteen FAQ questions render");
  const ld = [...en.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((x) => x[1]).join("\n");
  check(/"@type":"FAQPage"/.test(ld) && (ld.match(/"@type":"Question"/g) ?? []).length === 13 && faqs.every((q) => ld.includes(JSON.stringify(q).slice(1, -1))), "FAQPage schema carries exactly the thirteen visibly rendered questions");
  check(!/AggregateRating|"review"|"Rating"|"EligibilityRequirement"|GovernmentService|GovernmentOrganization/.test(ld), "no ratings, eligibility or government-document schema");

  console.log("\n6. indexable, canonical and hreflang unchanged, sitemap");
  check((m.robots as { index?: boolean } | undefined)?.index === true, "indexable");
  check(m.alternates.canonical === `https://www.logivisa.com/occupations/${SLUG}` && JSON.stringify(m.alternates.languages) === JSON.stringify(ALT(`/occupations/${SLUG}`)), "self-canonical with the unchanged hreflang set");
  const { buildSitemap } = await import("../app/sitemap");
  const urls = buildSitemap().map((e) => e.url);
  check(["", "/tr", "/zh-Hans"].every((p) => urls.includes(`https://www.logivisa.com${p}/occupations/${SLUG}`)), "in the sitemap for all three locales");

  console.log("\n7. TR and zh-Hans are localized without English blocks");
  for (const [loc, glance, marker, localName] of [["tr", "Bir bakışta", /Marketing Specialist beceri değerlendirmesi — VETASSESS/, "Pazarlama Uzmanı"], ["zh-Hans", "概览", /Marketing Specialist 技能评估 — VETASSESS/, "市场营销专家"]] as const) {
    const h = await render(loc);
    const x = text(h.replace(/<span lang="en"[\s\S]*?<\/span><\/span>/g, " "));
    const mm = await meta(loc);
    check(x.includes(glance) && marker.test(x), `${loc}: sections are localized`);
    check(x.includes("VETASSESS") && /<h1[^>]*>\s*Marketing Specialist \(ANZSCO 225113\)\s*<\/h1>/.test(h) && ["Marketing Consultant", "Brand Manager", "Sales Promotion Officer", "Advertising Specialist", "Market Research Analyst"].every((r) => x.includes(r)), `${loc}: VETASSESS, the H1 and the official role names stay in English`);
    check(!/At a glance|Roles considered suitable|Typical duties|Published occupation-list placement|Related visa research|Frequently asked|Start Assessment|Create a structured report|Pathway 1:|front-line retail|Which published occupation lists/.test(x), `${loc}: no English headings, CTAs, pathway or FAQ text leak in`);
    check(!legacy.test(x) && !/Consolidated Sponsored/i.test(x), `${loc}: no legacy wording`);
    check(noMra(h) && h.includes(`<dd class="text-slate-600">${localName}</dd>`) && !/<dd[^>]*>(Market Research Analyst|Pazar Araştırma[^<]*|市场研究[^<]*)<\/dd>/.test(h), `${loc}: 225113 never renders as Market Research Analyst (the Occupation row is the localized Marketing Specialist, ${localName})`);
    check(mm.alternates.canonical === `https://www.logivisa.com/${loc}/occupations/${SLUG}` && JSON.stringify(mm.alternates.languages) === JSON.stringify(ALT(`/occupations/${SLUG}`)), `${loc}: canonical (locale-prefixed) and the hreflang set are unchanged`);
    check(!/eligib/i.test(`${mm.title} ${mm.description}`) && /225113/.test(mm.title) && /VETASSESS/.test(mm.description), `${loc}: title and description are occupation-first`);
  }

  console.log("\n8. shared architecture: 149311 and 225113 use the same renderer; other occupations are unchanged");
  const r149 = renderToStaticMarkup(await page.default({ params: Promise.resolve({ locale: "en", id: "149311-conference-and-event-organiser" }) }));
  check(r149.includes('data-occupation-research="149311"') && r149.includes('data-occupation-faq="149311"') && en.includes('data-occupation-research="225113"') && en.includes('data-occupation-faq="225113"'), "149311 and 225113 both render through OccupationResearch");
  const src = readFileSync("components/occupations/occupation-research.tsx", "utf8");
  check(!/149311|225113|_149311|_225113/.test(src), "the renderer holds no occupation-specific code or constants");
  const other = renderToStaticMarkup(await page.default({ params: Promise.resolve({ locale: "en", id: "351311-chef" }) }));
  check(!other.includes("data-occupation-research") && other.includes("Continue your research"), "a different occupation keeps the generic template");

  console.log("\n9. visa-specific caveats (subclass 482 and 186 instruments) are shown, sourced, and kept apart from the VETASSESS exclusion");
  const cav = await import("../lib/occupations/research-225113");
  check(JSON.stringify(cav.CAVEAT_NUMBERS_225113) === "[6,11]", "the caveat mapping for 225113 is circumstances 6 and 11 (item 84 of both instruments)");
  check(cav.INSTRUMENT_482_225113.lin === "LIN 24/089" && cav.INSTRUMENT_482_225113.compilation === "3" && cav.INSTRUMENT_482_225113.compilationDate === "2025-11-07" && /^https:\/\/www\.legislation\.gov\.au\/F2024L01620\//.test(cav.INSTRUMENT_482_225113.url), "482 source: LIN 24/089, Compilation No. 3 (7 November 2025), legislation.gov.au F2024L01620");
  check(cav.INSTRUMENT_186_225113.lin === "LIN 24/093" && cav.INSTRUMENT_186_225113.compilation === "4" && cav.INSTRUMENT_186_225113.compilationDate === "2026-03-28" && /^https:\/\/www\.legislation\.gov\.au\/F2024L01618\//.test(cav.INSTRUMENT_186_225113.url), "186 source: LIN 24/093, Compilation No. 4 (28 March 2026), legislation.gov.au F2024L01618");
  check(cav.CIRCUMSTANCE_WORDING_225113[6].join(" ") === "The position: (a) is based in a front-line retail setting; or (b) predominantly involves direct client transactional interaction on a regular basis; or (c) predominantly involves selling educational courses to individual students; or (d) is based in a call centre and does not require a significant technical knowledge of products." && cav.CIRCUMSTANCE_WORDING_225113[11].join(" ") === "The position is in a business that has an annual turnover of less than AUD1,000,000.", "circumstances 6 and 11 carry the instruments' own wording, unaltered");
  check(cav.LEGISLATION_225113_CHECKED === "2026-10-31" && t.includes("Checked 31 October 2026") , "the check date is stated on the page");
  check(t.includes("Visa-specific occupation caveats: subclass 482 and 186 instruments") && t.includes("Circumstance 6") && t.includes("Circumstance 11") && t.includes("annual turnover of less than AUD1,000,000") && t.includes("front-line retail setting; or"), "EN: the section shows circumstances 6 and 11");
  check(/data-official-source="true" href="https:\/\/www\.legislation\.gov\.au\/F2024L01620\/latest\/text"/.test(en) && /data-official-source="true" href="https:\/\/www\.legislation\.gov\.au\/F2024L01618\/latest\/text"/.test(en) && t.includes("(LIN 24/089), Compilation No. 3, 2025-11-07") && t.includes("(LIN 24/093), Compilation No. 4, 2026-03-28"), "both instruments are cited with their compilation dates and linked to legislation.gov.au");
  check(t.includes("This is separate from the VETASSESS skills assessment above") && t.includes("How this differs from the VETASSESS employment exclusion") && t.includes("It decides what employment VETASSESS counts") && t.includes("are made separately; a result under one does not settle the other"), "skills assessment vs visa instrument: the two are kept distinct");
  check(t.includes("This is VETASSESS assessment information, not a visa decision"), "the existing VETASSESS exclusion paragraph is unchanged");
  check(t.includes("ANZSCO as the ABS classification in force on 23 November 2022") && t.includes("ANZSCO 2013 classification for other visas"), "the ANZSCO version distinction is stated");
  const cavText = t.slice(t.indexOf("Visa-specific occupation caveats"), t.indexOf("Related visa research"));
  check(!/\b(you (are|will be) (not )?eligible|ineligible|you (can|cannot|can't)|will be refused|will be granted|guarantee|recommend|should apply|best visa)/i.test(cavText) && /does not decide whether any position or person is affected/.test(cavText), "no eligibility verdict, outcome claim or recommendation: the section says it does not decide whether a position or person is affected");
  check(!/\b(competitor|visaenvoy|widen\.com|migrationrepublic|rmaustralia)/i.test(en), "no competitor site is cited");
  const pageSrc = readFileSync("app/[locale]/(main)/occupations/[id]/page.tsx", "utf8");
  check(/export const revalidate = false;/.test(pageSrc) && !/export const revalidate = [1-9]/.test(pageSrc) && !/unstable_cache|revalidateTag|revalidatePath/.test(readFileSync("lib/occupations/research-225113.ts", "utf8") + readFileSync("components/occupations/occupation-research.tsx", "utf8")), "no ISR: the occupation page is still build-time static and the new section adds no cache or revalidation");
  for (const [loc, heading, lead] of [["tr", "Vizeye özgü meslek kısıtları: 482 ve 186 alt sınıfı düzenlemeleri", "Koşul 6"], ["zh-Hans", "签证专属职业限制：482 和 186 子类法律文书", "情形 6"]] as const) {
    const h = await render(loc);
    const x = text(h);
    const out = text(h.replace(/<span lang="en"[\s\S]*?<\/span><\/span>/g, " "));
    check(x.includes(heading) && x.includes(lead) && /LIN 24\/089/.test(x) && /LIN 24\/093/.test(x) && x.includes("AUD1,000,000"), `${loc}: the section is localized and keeps the instrument names, LIN numbers and amounts intact`);
    check(!/front-line retail setting|annual turnover of less than|predominantly involves/.test(out) && /lang="en"/.test(h) && x.includes("front-line retail setting; or"), `${loc}: the instruments' official English wording appears only in lang="en" blocks`);
    check(/<h1[^>]*>\s*Marketing Specialist \(ANZSCO 225113\)\s*<\/h1>/.test(h) && x.includes("VETASSESS"), `${loc}: the H1 and the VETASSESS content are unchanged`);
  }

  if (failures) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
  console.log("\nAll checks passed");
}
main().catch((e) => { console.error(e); process.exit(1); });
