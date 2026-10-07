/**
 * The information-first report (lib/reports/report-view.ts, lib/readiness/pdf-report-v2.ts): real PDF text from the
 * production PDF route in en / tr / zh-Hans, for the reference profiles with a 491 target, a 189 target and "Not sure",
 * plus the other targets in English.
 *
 *   1. 8-10 pages; the parts in order: target, points (points-tested visas and "Not sure"), other visas / Pathway
 *      Overview, state and territory information (190 / 491 / Not sure), process (a target), costs, appendix;
 *   2. the Target visa decides the primary subject: its requirement map (published requirement | what you entered |
 *      source | status in {provided, not provided, cannot determine, not applicable}); "Not sure": no map, the Pathway
 *      Overview lists the visas in the fixed order 500, 485, 482, 189, 190, 491, 820/801, 186 with the same columns;
 *   3. provenance: every fact row carries a source (and a date where the data has one); every supplied fact a label;
 *   4. no verdict, ranking, recommendation, "next actions", "fastest way", "best pathway", signal / confidence / friction;
 *   5. hidden-cost rule: a completed skills assessment does not hide a registration step that is separate from it
 *      (AHPRA, nursing registration), which stays with a note;
 *   6. what the view says is what the PDF says.
 *
 *   npx tsx scripts/test-report-structure.ts
 */
import "./lib/stub-request-context";

process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://u:p@localhost:5432/d?sslmode=disable"; // never connects

import type { ReadinessInput, ReadinessReport } from "../lib/readiness/types";
import { buildReportView } from "../lib/reports/report-view";
import { targetVisaOf, type TargetVisa } from "../lib/readiness/target-visa";
import { runReadinessEngine } from "../src/lib/readiness-engine";
import { REVIEW_PERSONAS, renderPersonaPdfTexts } from "./render-persona-pdfs";

let failures = 0;
const t = (label: string, cond: boolean, detail = "") => {
  if (cond) console.log(`  ✅ ${label}`);
  else {
    failures++;
    console.error(`  ❌ ${label}${detail ? ` -- ${detail}` : ""}`);
  }
};
const flat = (s: string) => s.replace(/\s+/g, " ");
const squash = (s: string) => s.replace(/\s+/g, "");
const count = (hay: string, needle: string) => (needle ? squash(hay).split(squash(needle)).length - 1 : 0);

type L = "en" | "tr" | "zh-Hans";

/** What the report no longer says: verdicts, rankings, recommendations, plans, and the old analysis vocabulary. */
export const REMOVED_WORDING: Record<L, RegExp> = {
  en: /\b(?:confidence|friction|signal|signals|evidence load|best pathway|fastest way|your next \d|next steps?|action plan|top recommended|recommended pathway|not eligible now|eligible now|eligible to pursue|next step required|you qualify)\b|\bstrength\b|compliance-driven|readiness|Match\s*\d+\s*%/i,
  tr: /(?<![\p{L}])(?:güven|rekabet düzeyi|sinyal\p{L}*|kanıt yükü|en iyi (?:yol|vize)|en hızlı yol|sonraki \d adım\p{L}*|eylem planı|şu anda uygun değil|uygun görünüyor)(?![\p{L}])|hazırlık değerlendirmesi/iu,
  "zh-Hans": /置信度|竞争激烈度|信号|证据负荷|最佳(?:路径|签证)|最快方式|下一步（三项）|行动计划|目前不符合条件|准备度/,
};

const PERSONA_IDS = ["real-b0d20f74-inputs", "ref-xyz-qld", "ref-xyz-wa-job", "reference-se-au"] as const;
const MAIN_TARGETS: TargetVisa[] = ["491", "189", "not_sure"];
// 820/801 has its own partner report (no points, no relationship scoring): covered by test-partner-and-ai-removal.
const OTHER_TARGETS: TargetVisa[] = ["190", "482", "186", "485", "500"];
const FIXED_ORDER = ["500", "485", "482", "189", "190", "491", "820", "186"];
const STATUSES = ["provided", "not_provided", "cannot_determine", "not_applicable"];

const lineIndex = (text: string, title: string) => text.split("\n").findIndex((l) => l.trim() === title);

function withTarget(input: ReadinessInput, target: TargetVisa): ReadinessInput {
  return { ...input, targetVisa: target, preferredPathway: target === "not_sure" ? undefined : target };
}

async function main() {
  console.log("1. real PDFs: 491 / 189 / Not sure x 4 profiles x 3 locales");
  const personas: Record<string, ReadinessInput> = {};
  for (const id of PERSONA_IDS) for (const tv of MAIN_TARGETS) personas[`${id}|${tv}`] = withTarget(REVIEW_PERSONAS[id], tv);
  for (const tv of OTHER_TARGETS) personas[`ref-xyz-qld|${tv}`] = withTarget(REVIEW_PERSONAS["ref-xyz-qld"], tv);
  // One call only: the PDF route binds to the first in-memory database it sees.
  const allRendered = await renderPersonaPdfTexts(personas, ["en", "tr", "zh-Hans"]);
  const rendered = allRendered.filter((r) => MAIN_TARGETS.includes(r.id.split("|")[1] as TargetVisa));

  for (const r of rendered) {
    const [pid, tv] = r.id.split("|") as [string, TargetVisa];
    const L = r.locale as L;
    const text = r.text;
    const f = flat(text);
    const report = r.report as ReadinessReport;
    const persona = REVIEW_PERSONAS[pid as (typeof PERSONA_IDS)[number]];
    const view = buildReportView({ report, locale: L, profile: { name: "Test Persona", occupation: persona.occupation, occupationRaw: persona.occupation, englishLevel: persona.englishLevel }, dateText: "" });
    console.log(`\n==================== ${pid} -> ${tv} [${L}] ====================`);

    t("the report carries the Target visa and the entered facts", report.targetVisa === tv && Array.isArray(report.suppliedFacts) && report.suppliedFacts.length > 5);
    t("the view's target is the report's", view.targetVisa === tv && view.isNotSure === (tv === "not_sure"));

    // pages and order
    const pages = Number([...text.matchAll(/(\d+) \/ (\d+)/g)].pop()?.[2] ?? 0);
    t(`8-10 pages (${pages})`, pages >= 8 && pages <= 10);
    const pointsApplicable = tv === "491" || tv === "189" || tv === "not_sure";
    const statesApplicable = tv === "491" || tv === "not_sure";
    const order: Array<[string, boolean]> = [
      [view.titles.target, true],
      [view.titles.points, pointsApplicable],
      [view.others.title, true],
      [view.titles.states, statesApplicable],
      [view.titles.process, tv !== "not_sure"],
      [view.titles.costs, true],
      [view.titles.appendix, true],
    ];
    const at = order.filter(([, expected]) => expected).map(([title]) => lineIndex(text, title));
    t(`sections in order: ${order.filter(([, e]) => e).map(([title]) => title).join(" > ")}`, at.every((i) => i >= 0) && at.every((i, k) => k === 0 || i > at[k - 1]), at.join(","));
    t("sections that do not apply are absent", (pointsApplicable || lineIndex(text, view.titles.points) < 0) && (statesApplicable || lineIndex(text, view.titles.states) < 0) && (tv !== "not_sure" || lineIndex(text, view.titles.process) < 0));
    t("view and PDF agree on which sections exist", view.points.applicable === pointsApplicable && view.states.applicable === statesApplicable && view.process.applicable === (tv !== "not_sure"));

    // cover
    t("cover: the target visa line", squash(f).includes(squash(view.cover.targetLine)), view.cover.targetLine);
    t("cover: the information-only notice", squash(f).includes(squash(view.cover.notice)));

    // removed wording
    const banned = REMOVED_WORDING[L].exec(f);
    t("no verdict / ranking / recommendation / next-actions / readiness wording", !banned, banned ? `"...${f.slice(Math.max(0, banned.index - 40), banned.index + 60)}..."` : "");
    t("no state match percentages, no ranking of states", !/\b[A-Z]{2,3}\s+\d{1,3}\s?%/.test(f) && !/Top (?:Recommended|2)/i.test(f));

    // labels
    t("supplied facts are labelled", view.target.supplied.length > 5 && view.target.supplied.every(([, v, tag]) => (v === (L === "en" ? "Not provided" : v) || tag === view.tags.supplied || tag === view.tags.unknown) && tag.length > 0) && squash(f).includes(squash(view.tags.supplied)));
    t("a fact the visitor did not enter is labelled Unknown, never a default", view.target.supplied.every(([, v, tag]) => (tag === view.tags.unknown) === (v === (L === "tr" ? "Girilmedi" : L === "zh-Hans" ? "未提供" : "Not provided"))));
    if (view.points.applicable) t("points: the calculation label is stated", squash(f).includes(squash(view.tags.calculation)) && squash(f).includes(squash(view.tags.published_program)));

    // requirement map / overview
    if (tv === "not_sure") {
      t("Not sure: no requirement map; the Pathway Overview is the section", view.target.requirements.length === 0 && view.others.title === (L === "tr" ? "Vize Yolu Genel Bakışı" : L === "zh-Hans" ? "路径概览" : "Pathway Overview"));
      t("Not sure: eight rows in the fixed order 500, 485, 482, 189, 190, 491, 820/801, 186", view.others.rows.length === 8);
      const firsts = view.others.rows.map((row) => row[0]);
      const idx = (code: string) => firsts.findIndex((n) => n.includes(code));
      t("  order by position", [500, 485, 482, 189, 190, 491, 820, 186].every((c, i, arr) => idx(String(c)) === i), firsts.join(" | "));
      t("  189 / 190 / 491 are separate rows", idx("189") !== idx("190") && idx("190") !== idx("491"));
    } else {
      t("a requirement map for the target visa", view.target.requirements.length >= 3);
      t("every requirement row: published requirement, what you entered, a source, a status of the four", view.target.requirements.every((q) => q.requirement && q.entered && q.source.length > 5 && STATUSES.includes(q.status) && q.statusLabel));
      t("the four status labels are explained in the report", squash(f).includes(squash(view.target.statusLegend.slice(0, 60))));
      t("the target is not among the other visas", !view.others.rows.some((row) => row[0].includes(`subclass ${tv === "820_801" ? "820" : tv}`) || row[0].includes(` ${tv}`)) && view.others.rows.length === 7);
    }
    t("the other visas keep the fixed order (no ordering by the applicant's data)", (() => {
      const nums = view.others.rows.map((row) => FIXED_ORDER.find((c) => row[0].includes(c)) ?? "?");
      return nums.every((n, i) => i === 0 || FIXED_ORDER.indexOf(n) > FIXED_ORDER.indexOf(nums[i - 1]));
    })());
    t("every other-visa row has the same columns and a source", view.others.rows.every((row) => row.length === view.others.headers.length && row[row.length - 1].length > 3 && row[row.length - 1] !== "—"));

    // states
    if (view.states.applicable) {
      t("states: all eight, fixed order (by code), each with a source and a checked date", view.states.rows.length === 8 && view.states.rows.every((row, i, a) => i === 0 || a[i - 1][0] < row[0]) && view.states.rows.every((row) => /20\d\d-\d\d-\d\d/.test(row[3])));
      t("states: no state is dropped or marked unavailable to the applicant", !/not available to you|size açık olmayan|对您不开放|Available to you/i.test(f));
    }
    // process
    if (view.process.applicable) t("process: every step has a source; no date or 'week 1'", view.process.rows.length >= 4 && view.process.rows.every((row) => row[2].length > 3) && !/Weeks? \d|Hafta \d|第 ?\d+ ?周/i.test(f));

    // costs
    const total = view.costs.totalLines[0];
    t("the estimated total is stated once", !total || count(f, total) === 1, total ? `${count(f, total)}x` : "");
    const living = report.premiumSections?.livingCostProjection;
    const livingKnown = !!living && /[(（]/.test(living.city);
    t("living cost: one line, only with a known state of residence", livingKnown ? count(f, view.costs.livingLine) === 1 : view.costs.livingLine === "");
    t("every cost row has a source", view.costs.rows.every((row) => row.source.length > 3));

    // view == PDF
    const firstCells = [...view.target.requirements.map((q) => q.requirement), ...view.others.rows.map((x) => x[0]), ...view.states.rows.map((x) => x[0]), ...view.process.rows.map((x) => x[0]), ...view.costs.rows.map((x) => x.item)];
    const missing = firstCells.filter((c) => !squash(f).includes(squash(c.split(/[ (（]/)[0].slice(0, 10) || c.slice(0, 6))));
    t("the PDF prints every row's first cell (requirements, other visas, states, process, costs)", missing.length === 0, missing.slice(0, 3).join(" | "));
    t("appendix: documents, resources, sources, disclaimer once", view.appendix.documents.length > 0 && view.appendix.resources.length > 0 && view.appendix.sources.length > 0 && count(f, view.appendix.disclaimer.slice(0, 80)) === 1);
  }

  console.log("\n2. the other targets (English)");
  const renderedOthers = allRendered.filter((r) => OTHER_TARGETS.includes(r.id.split("|")[1] as TargetVisa) && r.locale === "en");
  for (const r of renderedOthers) {
    const tv = r.id.split("|")[1] as TargetVisa;
    const report = r.report as ReadinessReport;
    const view = buildReportView({ report, locale: "en", profile: { occupation: REVIEW_PERSONAS["ref-xyz-qld"].occupation, occupationRaw: REVIEW_PERSONAS["ref-xyz-qld"].occupation }, dateText: "" });
    const pages = Number([...r.text.matchAll(/(\d+) \/ (\d+)/g)].pop()?.[2] ?? 0);
    console.log(`\n-------------------- target ${tv} (${pages} pages) --------------------`);
    t("a requirement map, a process, no points section for a visa without a points test", view.targetVisa === tv && view.target.requirements.length >= 2 && view.process.applicable && view.points.applicable === (tv === "190"));
    t("6-10 pages", pages >= 6 && pages <= 10);
    t("no verdict wording", !REMOVED_WORDING.en.test(flat(r.text)));
    t("every requirement has a source and a status of the four", view.target.requirements.every((q) => q.source.length > 5 && STATUSES.includes(q.status)));
  }

  console.log("\n3. hidden-cost rule: registration that is separate from the skills assessment stays visible");
  const doctor: ReadinessInput = { ...REVIEW_PERSONAS["ref-xyz-qld"], occupation: "General Practitioner 253111", occupationConfirmed: "yes", targetVisa: "491", preferredPathway: "491", locale: "en" };
  const nurse: ReadinessInput = { ...REVIEW_PERSONAS["ref-xyz-qld"], occupation: "Registered Nurse (Medical) 254418", occupationConfirmed: "yes", targetVisa: "491", preferredPathway: "491", locale: "en" };
  for (const [name, input] of [["doctor (AHPRA)", doctor], ["nurse (ANMAC + registration)", nurse]] as const) {
    for (const loc of ["en", "tr", "zh-Hans"] as const) {
      const rep = runReadinessEngine({ ...input, locale: loc });
      const v = buildReportView({ report: rep, locale: loc, profile: { occupation: input.occupation, occupationRaw: input.occupation }, dateText: "" });
      const skills = rep.financialRoadmap.find((i) => i.kind === "skills_assessment");
      const registrationRow = rep.financialRoadmap.find((i, idx) => i.kind === undefined && i.estimateType === "variable" && rep.financialRoadmap[idx - 1]?.kind === "skills_assessment");
      const independentNote = v.costs.notes.some((n) => /separate from the skills assessment|beceri değerlendirmesinden ayrıdır|独立于技能评估/.test(n));
      t(`${name} [${loc}]: assessment marked done, yet the registration cost stays with a note that it is separate`, !!skills && independentNote && (name.startsWith("doctor") ? v.costs.rows.some((row) => row.item === skills!.category) : !!registrationRow && v.costs.rows.some((row) => row.item === registrationRow!.category)), `${v.costs.rows.map((x) => x.item).join(" | ")}`);
    }
  }

  console.log("\n4. an older stored report (no target) reads as Not sure");
  const old = runReadinessEngine({ ...REVIEW_PERSONAS["ref-xyz-qld"], locale: "en" });
  const stripped = { ...old, targetVisa: undefined, suppliedFacts: undefined } as ReadinessReport;
  const vOld = buildReportView({ report: stripped, locale: "en", profile: { occupation: "x" }, dateText: "" });
  t("no targetVisa -> Not sure, the overview, and no crash", vOld.isNotSure && vOld.others.rows.length === 8 && targetVisaOf({}) === "not_sure" && targetVisaOf({ preferredPathway: "820/801" }) === "820_801");

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
