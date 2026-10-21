/**
 * Deep regression on the FINAL RENDERED PDF TEXT (the production PDF route, scripts/render-persona-pdfs.ts), not on an intermediate model:
 *
 *   - a Canada report carries no Australian-only concept (subclasses, Home Affairs, SkillSelect, ANZSCO, states, assessing authorities, AUD,
 *     the Australian points table / 65-point threshold, state nomination, MARA / migration-agent wording) in en / tr / zh-Hans;
 *   - a Canada report carries the Canadian program content it should (programs selected, CRS, provinces, IRCC, CAD fees, RCIC disclaimer);
 *   - an Australian report keeps its visas, authorities and states and carries no Canadian program content;
 *   - the sample reports are synthetic ("Sample Applicant", SAMPLE-REPORT).
 *
 *   npx tsx scripts/test-canada-report.ts
 */
import "./lib/stub-request-context";

import { readFileSync } from "node:fs";

import { renderCountrySamples } from "./render-country-samples";
import { CA_SAMPLE_PROFILE } from "./render-country-samples";
import { buildReportView } from "../lib/reports/report-view";
import { sectionStrings } from "../lib/reports/report-blocks";
import { BANNED_INFORMATION_PAGE_PHRASES } from "../lib/seo/banned-phrases";
import { SAMPLE_APPLICANT_NAME } from "../lib/reports/sample";
import type { ReadinessReport } from "../lib/readiness/types";

let failures = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  if (cond) console.log(`  ✅ ${msg}`);
  else {
    failures++;
    console.error(`  ❌ ${msg}${detail ? ` -- ${detail}` : ""}`);
  }
};
const hits = (text: string, re: RegExp) => Array.from(new Set(text.match(new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`)) ?? []));

/** Terms a Canada report must never contain. Word boundaries keep "TRA" out of "TRAnsfer" and "ACS" out of other words. */
const AUSTRALIAN: Array<[string, RegExp]> = [
  ["a subclass", /\bsubclass(es)?\b/i],
  ["visa 189 / 190 / 491 / 482 / 186 / 485 / 820", /\b(189|190|491|482|186|485|820)\b/],
  ["Student visa 500", /\b(student visa|subclass 500)\b/i],
  ["Temporary Graduate", /temporary graduate/i],
  ["Home Affairs", /home affairs/i],
  ["SkillSelect", /skillselect/i],
  ["ANZSCO", /anzsco/i],
  ["an Australian state or territory", /(australian capital territory|new south wales|queensland|victoria\b|south australia|western australia|tasmania|northern territory)/i],
  ["TRA", /\bTRA\b/],
  ["ACS", /\bACS\b/],
  ["Engineers Australia / VETASSESS", /(engineers australia|vetassess)/i],
  ["Australia / Australian / AUD", /(australia|australian|\bAUD\b|avustralya|澳大利亚)/i],
  ["state nomination", /state (nomination|and territory)/i],
  ["the Australian points table", /(points-table|points table|points threshold|minimum for a points-tested)/i],
  ["EOI STATUS / old strategy wording", /(EOI STATUS|Migration Strategy|virtually guarantees|executable route)/i],
  ["a migration agent / MARA", /(migration agent|\bMARA\b)/i],
  ["Invitation history", /invitation history/i],
];
/** Terms an Australian report must never contain. */
const CANADIAN: Array<[string, RegExp]> = [
  ["Express Entry / CRS / IRCC", /(express entry|\bCRS\b|\bIRCC\b)/i],
  ["a Canadian program", /(canadian experience|federal skilled|provincial nominee|atlantic immigration|family sponsorship)/i],
  ["NOC / TEER / CLB", /\b(NOC|TEER|CLB)\b/],
  ["RCIC / CAD", /(\bRCIC\b|\bCAD\b)/],
];

async function main() {
  process.env.DATABASE_URL ||= "postgresql://u:p@localhost:5432/d?sslmode=disable";

  console.log("1. the Canada report, rendered (en)");
  const all = await renderCountrySamples(undefined, ["en", "tr", "zh-Hans"]);
  const pick = (id: string, locale: string) => all.find((r) => r.id === id && r.locale === locale)!;
  const au = pick("au", "en");
  const ca = pick("ca", "en");
  const T = ca.text;
  check(T.length > 5000, "a Canada PDF was produced", `${T.length} characters`);
  for (const [name, re] of AUSTRALIAN) check(hits(T, re).length === 0, `no ${name}`, hits(T, re).join(" | "));
  for (const [what, re] of [
    ["the selected programs (FSW, CEC) named", /Federal Skilled Worker Program \(FSW\)[\s\S]*Canadian Experience Class \(CEC\)|Canadian Experience Class \(CEC\)[\s\S]*Federal Skilled Worker Program \(FSW\)/],
    ["the Express Entry trades program", /Federal Skilled Trades Program \(FSTP\)/],
    ["the Provincial Nominee Program (non-Express Entry)", /Provincial Nominee Program \(non-Express Entry process\)/],
    ["the Comprehensive Ranking System section", /Comprehensive Ranking System \(CRS\)/],
    ["the Provincial and territorial programs section", /Provincial and territorial programs/],
    ["Ontario, British Columbia and Alberta streams", /Ontario Workforce Priority Stream[\s\S]*BC PNP[\s\S]*Alberta Opportunity Stream/],
    ["the Quebec federal-stage note", /Certificat de sélection du Québec/],
    ["IRCC as the source", /Immigration, Refugees and Citizenship Canada \(IRCC\)/],
    ["the verified CAD fee", /CAD 1,590/],
    ["the NOC 2021 code and TEER", /21232[\s\S]*TEER 1/],
    ["the Canadian disclaimer (RCIC) on the cover and in the footer", /licensed immigration consultant \(RCIC\)/],
    ["Not applicable wording for programs without a CRS", /Not applicable/],
    ["a selected-program marker", /Your selected program/],
  ] as const) check(re.test(T), `has ${what}`);
  check(!/Calculated for you[\s\S]{0,40}Core human capital: total[^\n]*No data available/.test(T) && !/No data available/.test(T), "no empty table cell prints 'No data available'");
  check(!/\b6[05]\b[^\n]*(minimum|threshold)|minimum[^\n]*\b6[05]\b/i.test(T), "no 65-point (or 60) Australian threshold");
  check(!/minimum met|threshold met/i.test(T), "no threshold is ever 'met'");
  check(!/\binvitation (cut-?off|estimate)s?\b[^\n]*\d{3}/i.test(T), "no invitation cut-off estimate is invented");

  console.log("\n2. the Canada report is English-only: no part-translated paid report (tr / zh-Hans)");
  for (const r of [pick("ca", "tr"), pick("ca", "zh-Hans")]) {
    for (const [name, re] of AUSTRALIAN) check(hits(r.text, re).length === 0, `${r.locale}: no ${name}`, hits(r.text, re).join(" | "));
    check(r.text === T, `${r.locale}: the Canada PDF text is identical to the English one (the whole report is English)`, `${r.text.length} vs ${T.length} characters`);
    check(!/[\u3400-\u9fff]/.test(r.text) && !/[ğĞşŞıİ]/.test(r.text), `${r.locale}: no Chinese characters and no Turkish letters anywhere in the PDF`);
    check(/Professional summary/.test(r.text) && !/Profesyonel özet|专业摘要|Kanada Göçmenlik|加拿大移民信息报告/.test(r.text), `${r.locale}: the headings are the English ones`);
  }
  check(!/lib\/reports\/canada\/locale/.test("") && /CA_REPORT_LOCALE/.test(readFileSync("lib/readiness/generate-pdf.ts", "utf8")), "the PDF route forces the Canada report's language");
  const step1src = readFileSync("app/[locale]/(main)/full-check/step-1-personal.tsx", "utf8");
  check(/data-testid="canada-english-only"/.test(step1src) && /CANADA_ENGLISH_ONLY_NOTICE/.test(step1src), "the Assessment says the Canada report is English when Canada is chosen in another language");
  const loc = await import("../lib/reports/canada/locale");
  check(loc.CANADA_ENGLISH_ONLY_NOTICE.tr.length > 20 && loc.CANADA_ENGLISH_ONLY_NOTICE["zh-Hans"].length > 10 && JSON.stringify(loc.CA_REPORT_LOCALES) === '["en"]', "the notice exists in tr and zh-Hans; the Canada report's languages are [en]");

  console.log("\n3. the Canada report's sections (the view the PDF draws)");
  const view = buildReportView({ report: ca.report as ReadinessReport, locale: "en", profile: { name: SAMPLE_APPLICANT_NAME, occupation: "Software developers and programmers", occupationRaw: "Software developers and programmers (21232)", preferredPathway: CA_SAMPLE_PROFILE.preferredPathway }, dateText: "" });
  const ids = view.sections.map((s) => s.id);
  check(["summary", "details", "visas", "points", "provinces", "costs", "process", "documents", "sources"].every((id) => ids.includes(id)), "Canada sections: summary, details, program information, CRS, provinces, costs, process, documents, sources", ids.join(","));
  check(!ids.some((id) => ["states", "stateDetail", "pointsExamples", "invitations", "glance"].includes(id)), "no Australian-only section (states, state detail, points examples, invitations, glance)");
  check(view.sections.every((s) => sectionStrings(s).every((t) => t.trim().length > 0)) && view.sections.every((s) => s.blocks.length > 0), "no blank section and no empty string");
  const noSel = buildReportView({ report: ca.report as ReadinessReport, locale: "en", profile: { name: SAMPLE_APPLICANT_NAME, occupationRaw: "Software developers and programmers (21232)" }, dateText: "" });
  check(!JSON.stringify(noSel).includes("Your selected program"), "no program is marked when none was selected");

  console.log("\n4. the Australia report is unchanged in content");
  const A = au.text;
  for (const [what, re] of [
    ["the selected visa (190)", /subclass 190/i],
    ["Home Affairs", /Home Affairs/],
    ["the state and territory section with every jurisdiction", /State and territory programs[\s\S]*New South Wales[\s\S]*Queensland/],
    ["the Australian points section", /Points/],
    ["an Australian assessing authority", /(ACS|Engineers Australia|VETASSESS|TRA)/],
    ["the Australian disclaimer", /not a registered migration agent/i],
  ] as const) check(re.test(A), `Australia has ${what}`);
  for (const [name, re] of CANADIAN) check(hits(A, re).length === 0, `Australia: no ${name}`, hits(A, re).join(" | "));
  check(!/RCIC/.test(A), "Australia: no RCIC wording");

  console.log("\n5. the sample reports are synthetic");
  for (const [label, text] of [["Australia", A], ["Canada", T]] as const) {
    check(text.includes(SAMPLE_APPLICANT_NAME) && text.includes("SAMPLE-REPORT") && !/@(?!logivisa)/.test(text.replace(/hello@logivisa\.com/g, "")), `${label}: Sample Applicant, SAMPLE-REPORT, no personal e-mail`);
  }

  console.log("\n6. the CRS in the rendered report");
  const PT = pick("ca-partial", "en").text;
  check(/CRS score calculated from your answers/.test(T) && /calculated CRS score of 507/.test(T) && /507 of 1200/.test(T), "every CRS question answered: the report states a calculated CRS score (507 of 1200)");
  check(!/No CRS score is shown/.test(T) && !/partial figure/.test(T), "...and carries no partial-figure wording");
  check(/No CRS score is shown/.test(PT) && /not a CRS score and not an estimate of one/.test(PT) && /Factors not calculated/.test(PT), "a CRS question not answered: 'No CRS score is shown', the partial sum is 'not a CRS score', and the factors not calculated are listed");
  check(!/CRS score calculated from your answers/.test(PT) && !/calculated CRS score of/.test(PT) && !/ of 1200\b/.test(PT.replace(/published maximum of 1200/g, "")), "...and nowhere claims a CRS score");
  check(/Canadian work experience/.test(PT) && /Skill transferability factors/.test(PT), "...naming the factors that depend on the missing answers");
  check(!/Not applicable until age and language/.test(T + PT), "no stale 'age and language only' wording");

  console.log("\n7. provincial coverage wording");
  for (const [name, text] of [["complete", T], ["partial", PT]] as const) {
    check(/Programs currently covered in LogiVisa's verified data/.test(text) && /not included in the current dataset/.test(text), `${name}: the section says what is covered and that other provinces and territories are not included`);
    check(/not a complete list of Canada's provincial and territorial programs/.test(text), `${name}: it says it is not a complete list`);
    check(!/\ball (provinces|provincial)\b|every province|across Canada/i.test(text), `${name}: nothing implies Canada-wide coverage`);
  }
  check(!/eligibility results below/i.test(T), "no wording that refers to results this report does not contain");

  console.log("\n8. official source URLs for AIP and Family Sponsorship");
  const details = (await import("../src/data/visa-details.json")).default as Array<Record<string, unknown>>;
  const AIP_URL = "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration.html";
  const FAMILY_URL = "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship/spouse-partner-children.html";
  const aipEntries = details.filter((d) => d.id === "canada-atlantic-immigration-program");
  const famEntries = details.filter((d) => d.id === "canada-family-sponsorship");
  check(aipEntries.length > 0 && aipEntries.every((d) => d.officialUrl === AIP_URL), "every Atlantic Immigration Program record carries the exact IRCC program URL");
  check(famEntries.length === 1 && famEntries[0].officialUrl === FAMILY_URL, "the Family Sponsorship record carries the exact IRCC program URL");
  for (const u of [AIP_URL, FAMILY_URL]) {
    const url = new URL(u);
    check(url.protocol === "https:" && url.hostname === "www.canada.ca" && url.pathname.startsWith("/en/immigration-refugees-citizenship/services/immigrate-canada/") && url.pathname !== "/en/immigration-refugees-citizenship.html", `${u.split("immigrate-canada/")[1]}: an https www.canada.ca IRCC program page, not the IRCC home page`);
  }
  const flat = T.replace(/\s+/g, ""); // the PDF wraps long URLs across lines
  check(flat.includes(`Officialsource${AIP_URL}`), "the report's Atlantic Immigration Program block cites the exact program URL");
  check(flat.includes(`Officialsource${FAMILY_URL}`), "the report's Family Sponsorship block cites the exact program URL");
  check(flat.split(AIP_URL).length > 2 && flat.split(FAMILY_URL).length > 2, "both URLs appear twice: in the program block and in the Sources table");
  check(!/Officialsourcehttps:\/\/www\.canada\.ca\/en\/immigration-refugees-citizenship\.html/.test(flat), "no program block cites the IRCC home page");
  const builderSrc = readFileSync("lib/reports/canada/build-canada-view.ts", "utf8");
  check(!/https:\/\/www\.canada\.ca\/en\/immigration-refugees-citizenship\.html/.test(builderSrc) && !builderSrc.includes(AIP_URL) && !builderSrc.includes(FAMILY_URL), "the URLs live in the program data, not in the report model");

  console.log("\n9. banned wording in the authored Canada sections");
  const authored = view.sections.filter((s) => ["summary", "details", "points"].includes(s.id)).flatMap(sectionStrings).join("\n");
  const banned = BANNED_INFORMATION_PAGE_PHRASES.filter((p) => p.re.test(authored)).map((p) => p.id);
  check(banned.length === 0, "no eligibility, recommendation, chance or directive wording in the Canada summary, applicant information or CRS sections", banned.join(", "));
  check(!/\b(likely|suitable|strongest|recommended|virtually guarantees|you should|you must)\b/i.test(T) && !/\b(you are|you may be) (not )?eligible\b/i.test(T), "no outcome language anywhere in the Canada PDF (a province's published condition may say who is not eligible; the report never says it of the applicant)");

  console.log("\n10. wiring");
  const pdf = readFileSync("lib/readiness/generate-pdf.ts", "utf8");
  check(/const useRestructuredReport = !report\.partnerSponsorshipAssessment;/.test(pdf), "the PDF route draws a Canada report from the country model, not the old advisory flow");
  const view2 = readFileSync("lib/reports/report-view.ts", "utf8");
  check(/args\.report\.country === "CA"\) return buildCanadaReportView\(args\)/.test(view2) && !/isCA/.test(view2), "buildReportView dispatches by country; the Australian builder has no Canada branches");
  const builder = readFileSync("lib/reports/canada/build-canada-view.ts", "utf8");
  check(!/from "\.\.\/(report-visas|report-points|report-states|report-costs|report-misc|report-summary)"/.test(builder), "the Canada model imports none of the Australian content builders");
  check(!/assessmentState|pathwayScores|financialRoadmap|premiumSections|stateNominationTracker/.test(builder), "the Canada model reads none of the engine's shared (Australia-shaped) fields");

  if (failures) { console.error(`\n❌ ${failures} check(s) failed`); process.exit(1); }
  console.log("\n✅ ALL CHECKS PASSED");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
