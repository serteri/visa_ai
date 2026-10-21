/**
 * The agent-ready report upgrade, on REAL generated PDF text (the production PDF route, via scripts/render-persona-pdfs.ts) for the
 * synthetic agent-sample profile in en / tr / zh-Hans:
 *   - Professional Summary: present, after the cover, built from the supplied facts, missing values explicit, no verdict wording
 *   - no invitation estimate / trend-based level anywhere; no repository filenames or internal process wording in the sources
 *   - points scenarios only in the appendix "Published points-table examples", with the arithmetic-only sentence
 *   - sample identity: "Sample Applicant", report ID SAMPLE-REPORT, no customer-looking ID, no personal data
 *   - country routing: an Australian report carries no Canada content and a Canadian report carries no Australian visa content;
 *     the Assessment form always shows the destination selector (Australia and Canada)
 *
 *   npx tsx scripts/test-agent-ready-report.ts
 */
import "./lib/stub-request-context";

import { readFileSync } from "node:fs";

import { BANNED_INFORMATION_PAGE_PHRASES } from "../lib/seo/banned-phrases";
import { buildReportView } from "../lib/reports/report-view";
import { reportSectionTitle } from "../lib/reports/report-section-titles";
import { blockStrings } from "../lib/reports/report-blocks";
import { longDate, publicConditionText, publicDocumentTitle } from "../lib/reports/public-sources";
import { isSampleApplicant, SAMPLE_APPLICANT_NAME, SAMPLE_REPORT_ID } from "../lib/reports/sample";
import type { Locale, ReadinessInput } from "../lib/readiness/types";
import { renderPersonaPdfTexts } from "./render-persona-pdfs";
import { AGENT_SAMPLE_PROFILE } from "./render-agent-sample";

let failures = 0;
const ok = (m: string) => console.log(`  ✅ ${m}`);
const check = (cond: boolean, m: string, detail = "") => {
  if (cond) ok(m);
  else {
    failures++;
    console.error(`  ❌ ${m}${detail ? ` -- ${detail}` : ""}`);
  }
};

const LOCALES: Locale[] = ["en", "tr", "zh-Hans"];

async function main() {
  process.env.DATABASE_URL ||= "postgresql://u:p@localhost:5432/d?sslmode=disable";
  const rendered = await renderPersonaPdfTexts({ agentSample: AGENT_SAMPLE_PROFILE }, LOCALES, undefined, "2026-10-21T00:00:00Z", undefined, SAMPLE_APPLICANT_NAME);

  console.log("\n1. Sample identity");
  check(isSampleApplicant(SAMPLE_APPLICANT_NAME) && SAMPLE_REPORT_ID === "SAMPLE-REPORT" && SAMPLE_APPLICANT_NAME === "Sample Applicant", "the synthetic name and ID constants");
  for (const r of rendered) {
    check(r.text.includes("Sample Applicant") && r.text.includes("SAMPLE-REPORT"), `${r.locale}: name Sample Applicant and report ID SAMPLE-REPORT`);
    check(!/LVA-\d{8}-/.test(r.text), `${r.locale}: no customer-looking report ID`);
    check(!/Serter|iyigunlu|@[a-z0-9-]+\.[a-z]{2,}/i.test(r.text.replace(/support@logivisa\.com|[a-z0-9.-]+@logivisa\.com/gi, "")), `${r.locale}: no real name or email`);
  }
  const real = isSampleApplicant("Jane Citizen");
  check(!real, "a real customer name never prints the sample ID");

  for (const r of rendered) {
    console.log(`\n2. ${r.locale}: Professional summary`);
    const t = r.text;
    const iSummary = t.indexOf(reportSectionTitle("summary", r.locale));
    const iDetails = t.indexOf(reportSectionTitle("details", r.locale));
    const iGlance = t.indexOf(reportSectionTitle("glance", r.locale));
    check(iSummary > 0 && iDetails > iSummary && iGlance > iDetails, "the summary section follows the cover and precedes applicant information and At a glance");
    const view = buildReportView({ report: r.report as never, locale: r.locale, profile: { name: SAMPLE_APPLICANT_NAME, occupation: "Software Engineer", occupationRaw: "Software Engineer (261313)", age: "28", englishLevel: "superior", currentCountry: "AU", mainGoal: AGENT_SAMPLE_PROFILE.mainGoal }, dateText: "21 October 2026", asOf: new Date("2026-10-21T00:00:00Z") });
    const summary = view.sections.find((s) => s.id === "summary");
    check(!!summary && view.sections[0].id === "summary", "summary is the first section of the view");
    const text = (summary?.blocks ?? []).flatMap(blockStrings).join("\n");
    check(/261313/.test(text) && /\b28\b/.test(text), "facts come from the supplied data (occupation code, age)");
    check(/Employment|Çalışma|工作经历/.test(text) && /Partner|伴侣/.test(text), "values that were not entered are listed explicitly (employment, partner)");
    check(!/Annual salary: .*\d/.test(text) && !/AUD [\d,]+ per year entered/.test(text), "no value is invented for a missing field");
    const verdict = BANNED_INFORMATION_PAGE_PHRASES.filter((p) => p.re.test(text)).map((p) => p.id);
    check(verdict.length === 0, "no eligibility, recommendation, chance or directive wording in the summary", verdict.join(", "));
    check(!/\b(not eligible|likely|suitable|strongest|best visa|recommended visa)\b/i.test(text), "no outcome language in the summary");
    check(summary!.blocks.flatMap(blockStrings).join("").length < 4200, "the summary stays about one page");
  }

  for (const r of rendered) {
    console.log(`\n3. ${r.locale}: estimates, sources, points`);
    const t = r.text;
    check(!/Recent invitation level|Son davet seviyesi|近期邀请分|Estimate from our trend data|Trend verilerimizden tahmin|根据我们趋势数据的估算/.test(t), "no trend-based invitation estimate anywhere");
    check(!/invitation[^.\n]{0,40}estimate|estimated invitation|predicted cut-?off|cutoff estimate/i.test(t), "no estimated invitation score or cutoff");
    check(!/\.(md|xlsx|csv|json)\b/i.test(t) && !/\(fetched \d{4}/.test(t), "no repository filename or snapshot stamp");
    check(!/project owner|could not be fetched automatically|user-confirmed|our trend data|data file/i.test(t), "no internal process wording");
    check(!/scenario|Senaryo|情景/.test(t.split(reportSectionTitle("pointsExamples", r.locale))[0]), "points scenarios do not appear before the appendix");
    if (t.includes(reportSectionTitle("pointsExamples", r.locale))) check(/arithmetic|aritmetik|算术/.test(t.split(reportSectionTitle("pointsExamples", r.locale))[1].slice(0, 600)), "the appendix opens with the arithmetic-only sentence");
    // Final Australia polish: no over-specific universal process claims, no professional-service price, no "advice" section title.
    const flat = t.replace(/\s+/g, " ");
    check(!/Sources and advice|Kaynaklar ve danışmanlık|来源与咨询/.test(t), "no 'Sources and advice' heading");
    check(t.includes(reportSectionTitle("sources", r.locale)) && reportSectionTitle("sources", r.locale) === ({ en: "Sources and important notes", tr: "Kaynaklar ve önemli notlar", "zh-Hans": "来源与重要说明" } as Record<string, string>)[r.locale], "the sources section carries the new heading");
    check(!/3,000\s*[–-]\s*\$?10,000|3\.000\s*[–-]\s*10\.000|3,000\s*[–-]\s*10,000|3000\s*[–-]\s*10000/.test(flat) && !/Registered Migration Agent \(RMA\) or Immigration Lawyer|Kayıtlı Göçmenlik Danışmanı \(RMA\)|注册移民代理（RMA）或移民律师/.test(flat), "no professional-service (migration agent / lawyer) price estimate");
    check(!/15 business days|15 iş günü|15 个工作日|4-12 weeks|4–12 weeks|4-12 hafta|4–12 周|4-12 周/.test(flat), "no universal police-certificate processing time");
    check(!/(valid|geçerli|有效)[^.]{0,30}12 months|12 ay(?:\s|\.)[^.]{0,20}geçerli|chest monitoring|6-12 months longer/i.test(flat), "no universal health-examination validity or chest-monitoring figure");
    check(!/Test Results \(Less than \d+ years old\)|Sınav sonucu \(\d+ yıldan eski olmamalı\)|语言成绩（\d+ 年内）/.test(flat), "the documents table gives no unsourced English-test validity figure");
    check(!/6\+ months validity|en az 6 ay geçerli|有效期至少 6 个月/.test(flat), "no universal passport validity figure");
    const STATE_FRAMING: Record<string, RegExp> = {
      en: /The entries below record what the official source stated on the date checked/,
      tr: /Aşağıdaki kayıtlar, resmî kaynağın kontrol tarihinde ne belirttiğini yansıtır\. Programın güncel durumuna ilişkin bir beyan olarak okunmamalıdır\./,
      "zh-Hans": /以下条目记录的是官方来源在核对日期当天的表述，不应被视为对项目当前状态的说明。/,
    };
    check(STATE_FRAMING[r.locale].test(flat), `${r.locale}: the state-framing sentence is in the report's own language`);
    if (r.locale !== "en") check(!/The entries below record|date checked, and is not a statement of current status/.test(flat), `${r.locale}: no English state-framing sentence`);
    if (r.locale === "en") {
      check(/vary by issuing authority and country/.test(flat), "police-certificate timing is stated neutrally (varies by authority and country)");
      check(/Valid passport \/ travel document, subject to the requirements applying to the application/.test(flat), "the passport line is neutral");
      check(/as recorded in the source checked on \d{1,2} \w+ \d{4}/.test(flat) && /Program status \(source checked \d{1,2} \w+ \d{4}\)/.test(flat), "state conditions and status are tied to the date the source was checked");
      check(!/is scheduled for|has not yet been confirmed/.test(flat) && /was recorded as scheduled for/.test(flat), "a scheduled round in a dated source is not written as a current upcoming event");
      check(!/\b1 further published details?\b[^.]*\bare listed/.test(flat), "'1 further published detail' agrees in number");
      check(/The entries below record what the official source stated on the date checked\. They should not be read as a statement of current program status\./.test(flat), "the state section says entries record the source as checked, not current status");
    }
    if (r.locale === "en") {
      check(/Checked/.test(t) && /\d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December) \d{4}/.test(t), "sources show long checked dates");
      check(/ACT Government — /.test(t.replace(/\s+/g, " ")) && /NSW Government — /.test(t.replace(/\s+/g, " ")), "state sources are shown as organisation — page title");
      check(/Program status/.test(t) && /Key published conditions/.test(t) && /Official source/.test(t), "each state uses the same card: status, list status, key conditions, data checked, official source");
      for (const code of ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"]) check(new RegExp(`\\(${code}\\)`).test(t), `${code} is present in the state section`);
    }
  }

  console.log("\n4. Source helpers");
  check(publicDocumentTitle("NSW Skilled Nominated visa (subclass 190) (fetched 2026-10-13).md", "NSW") === "Skilled Nominated visa (subclass 190)", "snapshot name -> page title");
  check(publicDocumentTitle("NT user-confirmed status (checked 2026-10-13).md", "NT") === "Program status", "user-confirmed -> neutral title");
  check(longDate("2026-10-13", "en") === "13 October 2026", "long date");
  check(!/project owner/.test(publicConditionText("Fee AUD 387. Confirmed by the project owner on 13 October 2026.")), "internal confirmation wording is neutralised");

  console.log("\n5. Country routing");
  const au = rendered[0];
  check(!/Canada|Canadian|Express Entry|IRCC|\bNOC\b|\bCRS\b/.test(au.text), "an Australian report carries no Canada content");
  const caInput = { locale: "en", country: "CA", currentCountry: "IN", passportCountry: "IN", age: "29", occupation: "Software developers and programmers (21232)", nocCode: "21232", nocTeer: 1, englishLevel: "CLB 9", qualificationLevel: "Master's Degree (Research)", migrationGoals: ["direct_pr"], mainGoal: "Researching Canadian immigration information" } as unknown as ReadinessInput;
  const { runReadinessEngine } = await import("../src/lib/readiness-engine");
  const caReport = runReadinessEngine(caInput);
  check(caReport.country === "CA", "a Canada input produces a Canada report (the engine routes on the destination)");
  const caView = buildReportView({ report: caReport, locale: "en", profile: { name: SAMPLE_APPLICANT_NAME, occupation: "Software developers", occupationRaw: "Software developers and programmers (21232)" }, dateText: "" });
  check(!caView.sections.some((s) => s.id === "states" || s.id === "stateDetail" || s.id === "pointsExamples" || s.id === "invitations"), "a Canadian report has none of the Australian-only sections (states, state detail, points examples, invitations)");
  const caWording = caView.sections.flatMap((s) => s.blocks.flatMap(blockStrings)).join(" ");
  check(caView.sections.some((s) => s.id === "summary") && !/subclass|Home Affairs|SkillSelect|ANZSCO|Australia/i.test(caWording), "a Canadian report has its own Professional Summary and no Australian wording anywhere (deep check: scripts/test-canada-report.ts)");
  // The Canada report is built by the Canada model (lib/reports/canada); generation stays gated server-side until CANADA_REPORT_ENABLED is turned on.
  const step1 = readFileSync("app/[locale]/(main)/full-check/step-1-personal.tsx", "utf8");
  const form = readFileSync("app/[locale]/(main)/full-check/full-check-waitlist-form.tsx", "utf8");
  check(!/\{!canadaReportEnabled && <input[^>]*value="AU"/.test(step1) && !/\{canadaReportEnabled && \(\s*<div className="space-y-2">/.test(step1), "the destination selector is never hidden behind the Canada flag");
  check(/Which country are you researching for immigration\?/.test(step1) && !/Which country is this report for/.test(step1), "the selector reads 'Which country are you researching for immigration?'");
  check(!/canadaReportEnabled \? "" : "AU"/.test(form), "the form's destination is not forced to AU when Canada generation is off");
  const actions = readFileSync("app/[locale]/(main)/full-check/actions.ts", "utf8");
  check(/targetCountry === "CA" && !isCanadaReportEnabled\(\)/.test(actions), "the server refuses a Canada request while Canada is off");

  if (failures) {
    console.error(`\n❌ ${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\n✅ ALL CHECKS PASSED");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
