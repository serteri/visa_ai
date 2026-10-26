/**
 * SEO Sprint 4: /tools/points-calculator/australia owns the Australia / 189 / 190 / 491 points-calculator intent with factually accurate, source-backed,
 * localised copy, while the hub keeps the Australia-and-Canada intent. The calculator logic and analytics are unchanged.
 *
 *   npx tsx scripts/test-points-calculator-seo.tsx
 */
import "./lib/stub-request-context";

import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { SessionProvider } from "next-auth/react";

import { LanguageProvider } from "../contexts/language-context";
import { getTranslations } from "../lib/i18n/get-translations";
import type { Locale } from "../lib/i18n/config";
import { findBannedPhrases } from "../lib/seo/banned-phrases";

let failures = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  if (cond) console.log(`  ✅ ${msg}`);
  else { failures++; console.error(`  ❌ ${msg}${detail ? ` -- ${detail}` : ""}`); }
};
const text = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, " ").trim();
const AU = "/tools/points-calculator/australia";
const HUB = "/tools/points-calculator";
const ALT = (path: string) => ({ en: `https://www.logivisa.com${path}`, tr: `https://www.logivisa.com/tr${path}`, "zh-Hans": `https://www.logivisa.com/zh-Hans${path}`, "x-default": `https://www.logivisa.com${path}` });

async function main() {
  const au = await import("../app/[locale]/(main)/tools/points-calculator/australia/page");
  const hub = await import("../app/[locale]/(main)/tools/points-calculator/page");
  const meta = async (m: { generateMetadata: (a: { params: Promise<{ locale: string }> }) => Promise<unknown> }, locale: string) => (await m.generateMetadata({ params: Promise.resolve({ locale }) })) as { title: string; description: string; robots?: unknown; alternates: { canonical: string; languages: Record<string, string> } };
  const renderAu = async (locale: Locale) => {
    const translations = await getTranslations(locale);
    return renderToStaticMarkup(<LanguageProvider initialLocale={locale} initialTranslations={translations}><SessionProvider session={null}>{await au.default({ params: Promise.resolve({ locale }) })}</SessionProvider></LanguageProvider>);
  };
  const renderHub = async (locale: string) => renderToStaticMarkup(await hub.default({ params: Promise.resolve({ locale }) }));

  const en = await renderAu("en");
  const t = text(en);
  const m = await meta(au, "en");
  const hm = await meta(hub, "en");
  const hubHtml = await renderHub("en");

  console.log("\n1. Australia-specific title, H1 and description (distinct from the hub)");
  check(m.title === "Australia Visa Points Calculator 2026 | 189, 190 & 491", "title: 'Australia Visa Points Calculator 2026 | 189, 190 & 491' ('PR' is left out so the title cannot read as a permanent-residence verdict)", String(m.title));
  check(/<h1[^>]*>\s*Australia Visa Points Calculator 2026\s*<\/h1>/.test(en) && (en.match(/<h1\b/g) ?? []).length === 1, "one H1: 'Australia Visa Points Calculator 2026'");
  for (const x of ["age", "English", "skilled employment", "education", "partner", "Australian study", "nomination", "189, 190, 491", "estimate", "does not determine an invitation or visa outcome"]) check(m.description.includes(x), `description mentions: ${x}`);
  const hubH1 = hubHtml.match(/<h1[^>]*>([^<]*)<\/h1>/)?.[1];
  check(hubH1 === "Immigration Points Calculator Hub" && hm.title === "Visa Points Calculator Hub 2026 | Australia & Canada" && hm.title !== m.title && hm.description !== m.description, "hub and Australia page: titles, H1s and descriptions are distinct", `${hubH1} / ${hm.title}`);
  check(/Australia and Canada/i.test(hm.description) && /189, 190, 491/.test(hm.description), "the hub description keeps the Australia & Canada intent and names the Australian test");
  check(!/\b(eligib|guarantee|best|chances|recommend|prediction)\b/i.test(`${m.title} ${m.description}`), "no eligibility / guarantee / prediction wording in the title or description");

  console.log("\n2. indexable, self-canonical, reciprocal hreflang, sitemap");
  check((m.robots as { index?: boolean } | undefined)?.index !== false && (hm.robots as { index?: boolean } | undefined)?.index !== false, "both pages stay indexable (no noindex, no redirect)");
  check(m.alternates.canonical === `https://www.logivisa.com${AU}` && JSON.stringify(m.alternates.languages) === JSON.stringify(ALT(AU)), "Australia: self-canonical with the unchanged EN / TR / zh-Hans / x-default set");
  check(hm.alternates.canonical === `https://www.logivisa.com${HUB}` && JSON.stringify(hm.alternates.languages) === JSON.stringify(ALT(HUB)), "hub: self-canonical with its own hreflang set");
  const { buildSitemap } = await import("../app/sitemap");
  const urls = buildSitemap().map((e) => e.url);
  check(["", "/tr", "/zh-Hans"].every((p) => urls.includes(`https://www.logivisa.com${p}${AU}`) && urls.includes(`https://www.logivisa.com${p}${HUB}`)), "both pages are in the sitemap for all three locales");

  console.log("\n3. the calculator comes first and is intact");
  check(en.indexOf('id="age"') > -1 && en.indexOf('id="age"') < en.indexOf("data-points-seo"), "the interactive calculator renders before the SEO sections");
  check(/<h1[^>]*>[^<]*<\/h1>\s*<p[^>]*data-points-intro/.test(en) && t.indexOf("This calculator adds the published points factors") < t.indexOf("Select visa subclass") + 5000, "a concise visible intro sits directly under the H1");
  check(["189", "190", "491"].every((s) => en.includes(`>${s}<`)) && /Select visa subclass/.test(t) && /Your total points summary/.test(t), "the subclass selector (189 / 190 / 491) and the points summary still render");
  const clientSrc = readFileSync("app/[locale]/(main)/tools/points-calculator/points-calculator-client.tsx", "utf8");
  check(/trackEvent\("calculator_start", \{ calculator: "australia_points"/.test(clientSrc) && /trackEvent\("calculator_complete", \{ calculator: "australia_points"/.test(clientSrc), "calculator_start and calculator_complete are preserved");
  const pts = (name: string) => [...clientSrc.matchAll(new RegExp(`${name}_VALUES = \\[([\\s\\S]*?)\\] as const`, "g"))][0]?.[1].match(/points: (\d+)/g)?.map((x) => Number(x.slice(8))).join(",");
  check(pts("AGE") === "25,30,25,15" && pts("ENGLISH") === "0,10,20" && pts("OVERSEAS_EXP") === "0,5,10,15" && pts("AUS_EXP") === "0,5,10,15,20" && pts("EDUCATION") === "20,15,10" && pts("PARTNER") === "10,10,5,0", "the points tables are unchanged (age 25/30/25/15, English 0/10/20, overseas 0-15, Australian 0-20, education 20/15/10, partner 10/10/5/0)");
  check(/Math\.min\(expRaw, 20\)/.test(clientSrc) && /specialistEdu = form\.specialistEdu === true \? 10/.test(clientSrc) && /naati = form\.naati === true \? 5/.test(clientSrc) && /regionalStudy = form\.regionalStudy === true \? 5/.test(clientSrc) && /professionalYear = form\.professionalYear === true \? 5/.test(clientSrc) && /subclass === "190"\s*\? 5\s*: form\.subclass === "491"\s*\? 15/.test(clientSrc), "the 20-point employment cap and the 10 / 5 / 5 / 5 factors and the 190 = 5, 491 = 15 nomination points are unchanged");

  console.log("\n4. factual corrections");
  check(/65 points is the published points threshold/.test(t) && /does not guarantee an invitation/.test(t), "65 is described as the published threshold, and meeting it does not guarantee an invitation");
  check(!/minimum score to submit an EOI/i.test(t), "no 'minimum score to submit an EOI'");
  check(/expects a skills assessment for the nominated occupation before the EOI is submitted/.test(t) && !/before your skills assessment is complete|without a positive skills assessment|Yes — you can submit an EOI/i.test(t), "a skills assessment is required before the EOI is submitted (the old 'submit first' answer is gone)");
  check(/up to 2 years/.test(t) && /unless another event removes it/.test(t), "the EOI two-year statement");
  check(!/\bmonthly\b|second or third week|third week|every month|once a month/i.test(t), "no monthly invitation-round claim and no 'second or third week'");
  check(/periodically runs invitation rounds/.test(t), "Home Affairs 'periodically' runs invitation rounds for 189 (no fixed frequency)");
  check(!/85\s*[–-]\s*95|75\s*[–-]\s*90|never been enough|lower thresholds|typically 75|cutoff for most/i.test(t), "no fixed generic cutoff ranges, no 'never enough', no '491 invites at lower thresholds'");
  check(/no generic cutoff range/.test(t) && /no personal probability/.test(t), "the page states it gives no personal probability and no generic cutoff range");
  check(/State and territory agencies consider EOIs and decide whether to nominate; a nomination in SkillSelect triggers an invitation/.test(t) && /not the same national ranking process/.test(t), "190 and nominated 491 are described as state / territory nomination, not the 189 national ranking process");
  check(!/fastest way|usually in the second|you will be invited|likely to be invited|your chances|will get an invitation/i.test(t), "no invitation prediction and no 'fastest way to increase your score'");
  check(!/you are eligible|you qualify|eligible for (189|190|491)|you will get (a|the) visa/i.test(t) && /does not decide an invitation or visa outcome|decide an invitation or visa outcome/.test(t), "no personal visa verdict; the calculator is stated not to decide the outcome");
  check(!/\binvitation round on \d|next round|next invitation round/i.test(t), "no hard-coded invitation-round date");

  console.log("\n5. content: 189 / 190 / 491, factors, 65 points, EOI, 491 query");
  check(t.includes("How points differ for 189, 190 and 491") && /No state or territory nomination points/.test(t) && /contributes 5 points when it applies/.test(t) && /contributes 15 points according to the published points table/.test(t) && /adds nomination points only when you select that factor/.test(t), "189 / 190 / 491 section: no nomination points / 5 / 15, only when the factor is selected");
  check(/as a 491 visa points calculator/.test(t) && /nomination points only when you select/.test(t), "'491 visa points calculator' is served in visible text, with nomination separate");
  for (const f of ["Age", "English language", "Skilled employment outside Australia", "Skilled employment in Australia", "Educational qualifications", "Australian study requirement", "Specialist educational qualification", "Credentialled community language", "Study in regional Australia", "Partner skills", "Professional Year in Australia", "Nomination or sponsorship"]) check(t.includes(`${f}:`), `factor summary: ${f}`);
  check(t.includes("Is 65 points enough for an Australian skilled visa?") && /outcomes can vary between rounds and occupations/.test(t) && /states and territories control their own nomination processes/.test(t), "'Is 65 points enough' section");
  check(t.includes("Points calculator vs SkillSelect EOI") && /only a calculator/.test(t) && /does not submit an EOI/.test(t) && /Australian Government's SkillSelect/.test(t) && /indicative points score/.test(t), "'Points calculator vs SkillSelect EOI' section, and LogiVisa does not submit EOIs");

  console.log("\n6. FAQ: visible, sourced, and exactly the schema");
  const faqs = ["What is the Australian skilled migration points test?", "What is the minimum points threshold for 189, 190 and 491?", "Does 65 points guarantee an invitation?", "How many points does subclass 190 nomination add?", "How many points does subclass 491 nomination add?", "Do I need a skills assessment before submitting an EOI?", "How long does an EOI stay active?", "Can my points change after I submit an EOI?", "Does this calculator decide whether I will get a visa?", "Does the calculator include subclass 482 or 186?"];
  check(faqs.every((q) => t.includes(q)), "all ten FAQ questions are visible in the page HTML (not hidden behind a toggle)");
  const ld = JSON.parse(en.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)!.map((x) => x.replace(/<\/?script[^>]*>/g, ""))[0]) as { "@type": string; mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }> };
  const { getPointsCalcSeoContent } = await import("../lib/seo/points-calculator-content");
  const visible = getPointsCalcSeoContent("en").faqs;
  check(ld["@type"] === "FAQPage" && ld.mainEntity.length === visible.length && ld.mainEntity.every((q, i) => q.name === visible[i].q && q.acceptedAnswer.text === visible[i].a && t.includes(q.name) && t.includes(q.acceptedAnswer.text)), "the FAQPage schema is exactly the visible FAQs (questions and answers)");
  check(!/AggregateRating|"review"|"Rating"|Offer|GovernmentService/.test(en.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g)!.join("")), "no ratings, offers or government-document schema");

  console.log("\n7. links, sources, CTA");
  for (const [href, label] of [["/occupations", "occupations"], ["/tools/skills-assessment", "Skills Assessment Finder"], ["/tools/anzsco-finder", "ANZSCO Finder"], ["/tools/visa-comparison", "Visa comparison"], ["/tools/state-nomination", "State nomination"], ["/tools/invitation-rounds", "Invitation rounds"], ["/visas/189", "189"], ["/visas/190", "190"], ["/visas/491", "491"], ["/full-check", "Assessment"]] as const) check(en.includes(`href="${href}"`), `links to ${label}: ${href}`);
  for (const url of ["skilled-independent-189/points-table", "skillselect/expression-of-interest", "skillselect/invitation-rounds", "skilled-independent-189/points-tested", "skilled-nominated-190", "skilled-work-regional-provisional-491"]) check(en.includes(`https://immi.homeaffairs.gov.au/visas/${url.includes("skillselect") ? "working-in-australia/" : "getting-a-visa/visa-listing/"}${url}`), `official source link: ${url}`);
  check(/Checked 26 October 2026/.test(t), "a checked date is shown");
  check(t.includes("Create a structured report based on the information you enter.") && t.includes("Start Assessment") && !/predict|success rate|improve your score/i.test(t.split("Create a structured report")[0].slice(-200)), "the neutral Assessment CTA only");
  check(en.includes("data-official-source") && en.includes("data-assessment-entry=\"points_calculator_australia\"") && en.includes('data-tool-destination="visa_comparison"'), "the existing analytics attributes (official source, assessment entry, tool destination) are on the new links");

  console.log("\n8. no banned wording; TR and zh-Hans are localized without English blocks");
  const copy = JSON.stringify(getPointsCalcSeoContent("en")) ;
  check(findBannedPhrases(copy).length === 0, "English copy carries no banned wording", findBannedPhrases(copy).join(", "));
  for (const [loc, h1, thresholdWord] of [["tr", "Avustralya Vize Puan Hesaplayıcı 2026", "65 puan"], ["zh-Hans", "澳大利亚签证积分计算器 2026", "65 分"]] as const) {
    const html = await renderAu(loc);
    const x = text(html);
    const mm = await meta(au, loc);
    check(new RegExp(`<h1[^>]*>\\s*${h1}\\s*</h1>`).test(html) && mm.title.startsWith(h1.replace(" 2026", "")), `${loc}: localized H1 and title`, mm.title);
    check(x.includes(thresholdWord) && x.includes("SkillSelect") && x.includes("189") && x.includes("491"), `${loc}: the threshold, SkillSelect and the subclasses are present`);
    check(!/How points differ|What contributes to the score|Is 65 points enough|Points calculator vs SkillSelect|Frequently asked|Create a structured report|Official sources|Related research/.test(x), `${loc}: no English headings or CTA leak in`);
    check(findBannedPhrases(JSON.stringify(getPointsCalcSeoContent(loc))).length === 0, `${loc}: no banned wording`, findBannedPhrases(JSON.stringify(getPointsCalcSeoContent(loc))).join(", "));
    check(!/aylık olarak|aylık (davet|raund)|ikinci veya üçüncü haftada|每月举行|每月一次|第二或第三周|85-95|75-90|85–95/.test(x), `${loc}: no monthly-round or fixed-cutoff claims`);
    check(mm.alternates.canonical === `https://www.logivisa.com/${loc}${AU}` && JSON.stringify(mm.alternates.languages) === JSON.stringify(ALT(AU)), `${loc}: canonical and hreflang are unchanged`);
    check(mm.description !== m.description && !/Adds the published points/.test(mm.description), `${loc}: a real translated meta description`);
    const hmm = await meta(hub, loc);
    check(hmm.title !== hm.title && hmm.description !== hm.description, `${loc}: the hub metadata is localized too`);
    const ldx = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)!.map((s) => s.replace(/<\/?script[^>]*>/g, ""))[0]) as { mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }> };
    const vis = getPointsCalcSeoContent(loc).faqs;
    check(ldx.mainEntity.length === vis.length && ldx.mainEntity.every((q, i) => q.name === vis[i].q && x.includes(q.name) && x.includes(q.acceptedAnswer.text)), `${loc}: the FAQ schema matches the visible FAQs`);
  }

  console.log("\n9. Australia-specific navigation points at the Australia route");
  const read = (f: string) => readFileSync(f, "utf8");
  check(/href="\/tools\/points-calculator\/australia" locale=\{locale\}>\{tx\("Puan Hesapla \(AUS\)"/.test(read("components/landing/header.tsx")), "the landing header's '(AUS)' link goes to /tools/points-calculator/australia");
  check(/points-calculator\/australia/.test(read("app/[locale]/(main)/tools/visa-comparison/VisaComparisonClient.tsx")) && /points-calculator\/australia/.test(read("app/[locale]/(main)/tools/english-points/EnglishPointsClient.tsx")) && /points-calculator\/australia/.test(read("lib/guides/research-guides.ts")), "visa comparison, English points and the Australian guides link to the Australia calculator");
  check(/points-calculator\/australia/.test(hubHtml) && /points-calculator\/canada/.test(hubHtml), "the hub still links to both country calculators");
  check(/publicPath\(locale, `\/tools\/points-calculator`\)/.test(read("components/header.tsx")), "the generic site navigation may still point to the hub");

  if (failures) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
  console.log("\nAll checks passed");
}
main().catch((e) => { console.error(e); process.exit(1); });
