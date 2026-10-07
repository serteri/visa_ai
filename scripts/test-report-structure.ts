/**
 * The rich information report (lib/reports/report-view.ts, lib/readiness/pdf-report-v2.ts): real PDF text from the production PDF
 * route in en / tr / zh-Hans, for four profiles with a 491 target, a 189 target and "Not sure", plus the other targets in English.
 *
 *   1. structure: the sections in the fixed order (details, points, visas, states, invitations, costs, process, documents,
 *      sources); every section title is printed in the PDF in that order; page count stays within the guard;
 *   2. fixed ordering independent of user data: different profiles give the same section ids, the same visa blocks in the same
 *      order (the target first, then the fixed order), the same eight states in the same order;
 *   3. every fact row has a source: requirement rows, state blocks (source + checked date), invitation rows, process rows,
 *      document rows, general points, charges (verified date);
 *   4. no verdict, ranking, recommendation, "next step", "ready", "chances", "probability", "match %", "you should", imperative
 *      wording in the report's own voice, in the view and the PDF, all locales (published source wording is not rewritten: the
 *      scan is on the report's own phrases and on statements about the applicant);
 *   5. numbers unchanged: points rows, totals, charges equal the engine's and the data files';
 *   6. no section repeats another's content (a long string printed in two sections);
 *   7. hidden-cost rule: a registration step that is separate from the skills assessment stays visible with a note;
 *   8. what the view says is what the PDF says (visa headings, states, section titles).
 *
 *   npx tsx scripts/test-report-structure.ts
 */
import "./lib/stub-request-context";

process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://u:p@localhost:5432/d?sslmode=disable"; // never connects

import visaFees from "../src/data/visa-fees.json";
import type { ReadinessInput, ReadinessReport } from "../lib/readiness/types";
import { buildReportView, type ReportView } from "../lib/reports/report-view";
import { sectionStrings } from "../lib/reports/report-blocks";
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

type L = "en" | "tr" | "zh-Hans";

/**
 * The report's own voice must never select, rank, score, recommend, conclude or instruct. Source wording ("eligible relative",
 * "eligible degree", a state's "not eligible under Pathway 2") is published text and stays as published, so "eligible" is banned
 * only where the report says it about the applicant.
 */
export const BANNED: Record<L, RegExp> = {
  en: /\b(?:best|recommended|recommendation|recommends?|next steps?|ready to|readiness|chances?|probability|verdict|you should|consider|top states?|viability|confidence|friction|signals?|strengths?|calculate your visa chances|match \d+|\d+ ?% match|you (?:are|may be|might be|appear to be|qualify|meet)\b[^.]{0,40}\beligible|not eligible now|eligible now|eligible to pursue|your next \d|action plan|gap analysis|AI strategy|EOI status)\b/i,
  tr: /(?<![\p{L}])(?:en iyi|önerilen|öneri|sonraki adım\p{L}*|hazır olma|şans\p{L}*|olasılık\p{L}*|yapmalısınız|güven düzeyi|sinyal\p{L}*|vize şansınızı hesaplayın|eylem planı|şu anda uygun değil|uygun görünüyor|karar özeti)(?![\p{L}])/iu,
  "zh-Hans": /最佳|推荐|您应|您需要|下一步|准备就绪|机会|概率|置信度|信号|行动计划|目前不符合条件|符合条件的签证|计算您的签证|匹配度/,
};

const PERSONA_IDS = ["real-b0d20f74-inputs", "ref-xyz-qld", "ref-xyz-wa-job", "reference-se-au"] as const;
const MAIN_TARGETS: TargetVisa[] = ["491", "189", "not_sure"];
const OTHER_TARGETS: TargetVisa[] = ["190", "482", "186", "485", "500"];
const SECTION_IDS = ["details", "points", "visas", "states", "invitations", "costs", "process", "documents", "sources"];
const FIXED_VISA_ORDER = ["500", "485", "482", "Direct Entry", "Temporary Residence Transition", "189", "190", "491", "820"];
const STATE_ORDER = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];

function withTarget(input: ReadinessInput, target: TargetVisa): ReadinessInput {
  return { ...input, targetVisa: target, preferredPathway: target === "not_sure" ? undefined : target };
}

const profileOf = (input: ReadinessInput) => ({ name: "Test Persona", occupation: input.occupation, occupationRaw: input.occupation, englishLevel: input.englishLevel });
const headings = (v: ReportView) => (v.sections.find((s) => s.id === "visas")?.blocks ?? []).flatMap((b) => (b.kind === "heading" ? [b] : []));
const stateHeadings = (v: ReportView) => (v.sections.find((s) => s.id === "states")?.blocks ?? []).flatMap((b) => (b.kind === "heading" ? [b.text] : []));
const allStrings = (v: ReportView) => v.sections.flatMap(sectionStrings);

async function main() {
  console.log("1. real PDFs: 491 / 189 / Not sure x 4 profiles x 3 locales");
  const personas: Record<string, ReadinessInput> = {};
  for (const id of PERSONA_IDS) for (const tv of MAIN_TARGETS) personas[`${id}|${tv}`] = withTarget(REVIEW_PERSONAS[id], tv);
  for (const tv of OTHER_TARGETS) personas[`ref-xyz-qld|${tv}`] = withTarget(REVIEW_PERSONAS["ref-xyz-qld"], tv);
  // One call only: the PDF route binds to the first in-memory database it sees.
  const allRendered = await renderPersonaPdfTexts(personas, ["en", "tr", "zh-Hans"]);
  const views = new Map<string, ReportView>();
  const pageCounts: string[] = [];

  for (const r of allRendered.filter((x) => MAIN_TARGETS.includes(x.id.split("|")[1] as TargetVisa))) {
    const [pid, tv] = r.id.split("|") as [string, TargetVisa];
    const L = r.locale as L;
    const f = flat(r.text);
    const report = r.report as ReadinessReport;
    const persona = REVIEW_PERSONAS[pid as (typeof PERSONA_IDS)[number]];
    const view = buildReportView({ report, locale: L, profile: profileOf(persona), dateText: "" });
    views.set(`${pid}|${tv}|${L}`, view);
    const pages = Number([...r.text.matchAll(/(\d+) \/ (\d+)/g)].pop()?.[2] ?? 0);
    if (pid === "ref-xyz-qld" || pid === "reference-se-au") pageCounts.push(`${pid} ${tv} ${L}: ${pages}`);
    console.log(`\n==================== ${pid} -> ${tv} [${L}] ====================`);

    t("the report carries the Target visa and the entered facts", report.targetVisa === tv && Array.isArray(report.suppliedFacts) && report.suppliedFacts.length > 5);
    t("the view's target is the report's", view.targetVisa === tv && view.isNotSure === (tv === "not_sure"));

    // structure
    const ids = view.sections.map((s) => s.id);
    t(`sections in the fixed order: ${ids.join(" > ")}`, JSON.stringify(ids) === JSON.stringify(SECTION_IDS), ids.join(","));
    const lines = r.text.split("\n").map((x) => x.trim());
    const at = view.sections.map((s) => lines.findIndex((x) => x === s.title));
    t("the PDF prints every section title, in order", at.every((i) => i >= 0) && at.every((i, k) => k === 0 || i > at[k - 1]), at.join(","));
    t(`page count within the guard (${pages}; target 14-18, guard 14-22)`, pages >= 14 && pages <= 22);
    t("cover: the subtitle and the target line", squash(f).includes(squash(view.cover.subtitle)) && squash(f).includes(squash(view.cover.targetLine)));
    t("cover: the information-only notice", squash(f).includes(squash(view.cover.notice)));

    // the selected visa is first and marked; the rest keep the fixed order
    const hs = headings(view);
    const marked = hs.filter((h) => h.marked);
    t("the selected visa is marked 'Your selected visa'", tv === "not_sure" ? marked.length === 0 : marked.length >= 1);
    t("nine visa blocks (186 as two streams)", hs.length === 9, String(hs.length));
    const rest = hs.filter((h) => !h.marked).map((h) => FIXED_VISA_ORDER.find((c) => h.text.includes(c)) ?? "?");
    t("the other visa blocks keep the fixed order", rest.every((n, i) => i === 0 || FIXED_VISA_ORDER.indexOf(n) > FIXED_VISA_ORDER.indexOf(rest[i - 1])), rest.join(","));
    if (tv !== "not_sure") t("the selected visa is the first block", hs[0].marked !== undefined);
    t("the PDF prints every visa heading", hs.every((h) => squash(f).includes(squash(h.text.slice(0, 24)))));

    // states: all eight, fixed order, source and date
    const sh = stateHeadings(view);
    t("states: all eight in the fixed order", STATE_ORDER.every((c, i) => sh[i]?.includes(`(${c})`)) && sh.length === 8, sh.join(" | "));
    const stateBlocks = view.sections.find((s) => s.id === "states")!.blocks.filter((b) => b.kind === "kv");
    t("states: each block has a source and a data-checked date", stateBlocks.length === 8 && stateBlocks.every((b) => b.kind === "kv" && b.rows.some(([, v]) => /20\d\d-\d\d-\d\d/.test(v)) && b.rows.some(([k, v]) => /Source|Kaynak|来源/.test(k) && v.length > 3 && v !== "—")));
    t("states: none described as unavailable to the applicant", !/not available to you|size açık olmayan|对您不开放|Available to you/i.test(f));

    // provenance
    const visasSection = view.sections.find((s) => s.id === "visas")!;
    const reqTables = visasSection.blocks.filter((b) => b.kind === "table");
    t("every visa requirement row: requirement, what you entered, a source, a status", reqTables.length >= 7 && reqTables.every((b) => b.kind === "table" && b.rows.every((row) => row[0] && row[1] && row[2].length > 5 && row[3])), String(reqTables.length));
    const inv = view.sections.find((s) => s.id === "invitations")!.blocks.find((b) => b.kind === "table");
    t("invitation rows: every cell filled (date, source)", !!inv && inv.kind === "table" && inv.rows.length >= 1 && inv.rows.every((row) => row.every((c) => c.length > 0)));
    const process = view.sections.find((s) => s.id === "process")!.blocks.filter((b) => b.kind === "table");
    t("process: every step has a source; no personal dated plan", process.length >= 5 && process.every((b) => b.kind === "table" && b.rows.every((row) => row[2].length > 3)) && !/Weeks? \d|Hafta \d|第 ?\d+ ?周/i.test(f));
    const costTables = view.sections.find((s) => s.id === "costs")!.blocks.filter((b) => b.kind === "table");
    t("costs: government charges carry a verified date, the other items a source, sums are 'sum of published charges'", costTables.length >= 3 && costTables[0].kind === "table" && costTables[0].rows.every((row) => row[row.length - 1].length > 3) && /sums? of published|yayımlanmış ücret toplamları|已公布费用/i.test(allStrings(view).join(" ")));
    const docs = view.sections.find((s) => s.id === "documents")!.blocks.filter((b) => b.kind === "table");
    t("documents and general points: every row has a source", docs.length >= 2 && docs.every((b) => b.kind === "table" && b.rows.every((row) => row[row.length - 1].length > 2)));
    const src = view.sections.find((s) => s.id === "sources")!.blocks.find((b) => b.kind === "table");
    t("the sources register: every row has a date", !!src && src.kind === "table" && src.rows.length >= 10 && src.rows.every((row) => /20\d\d|—/.test(row[2])));
    const joinedAll = allStrings(view).join(" ");
    t("the advice statement names a registered migration agent or an Australian legal practitioner", /migration agent|göçmenlik danışmanı|移民代理/i.test(joinedAll) && /legal practitioner|hukuk uzmanı|法律人士/i.test(joinedAll));

    // removed wording, view and PDF
    const bannedView = allStrings(view).map((s) => BANNED[L].exec(s)).find(Boolean);
    t("no verdict / ranking / recommendation / next-step / readiness wording in the view", !bannedView, bannedView ? bannedView[0] : "");
    const bannedPdf = BANNED[L].exec(f);
    t("no verdict / ranking / recommendation / next-step / readiness wording in the PDF", !bannedPdf, bannedPdf ? `"...${f.slice(Math.max(0, bannedPdf.index - 40), bannedPdf.index + 60)}..."` : "");
    t("no match percentages, no ranking of states", !/\b[A-Z]{2,3}\s+\d{1,3}\s?%/.test(f) && !/Top (?:Recommended|2)/i.test(f));
    t("no radar, EOI status or AI strategy remnants", !/AI Strategy|EOI Status|Radar|HIGH POTENTIAL|Viability/i.test(f));

    // no section repeats another's content
    // The sources register repeats citations by definition, and a visa's name is a label that costs and process rows reuse.
    const labels = new Set(hs.map((h) => squash(h.text)));
    const owner = new Map<string, string>();
    const repeats: string[] = [];
    for (const s of view.sections.filter((x) => x.id !== "sources")) {
      for (const str of sectionStrings(s)) {
        const key = squash(str);
        if (key.length < 70 || labels.has(key)) continue;
        const o = owner.get(key);
        if (o && o !== s.id) repeats.push(`${o}/${s.id}: ${str.slice(0, 50)}`);
        if (!o) owner.set(key, s.id);
      }
    }
    t("no long string appears in two sections", repeats.length === 0, repeats.slice(0, 3).join(" | "));

    // numbers unchanged
    const points = view.sections.find((s) => s.id === "points");
    t("the points section is present", !!points);
    if (points) {
      const tables = points.blocks.filter((b) => b.kind === "table");
      const breakdown = tables[0];
      const rows = report.pointsEstimate?.breakdown ?? [];
      t("points rows equal the engine's breakdown", breakdown.kind === "table" && breakdown.rows.length === rows.length && rows.every((b, i) => b.status === "not_assessed" || breakdown.rows[i][1] === String(b.points)));
      const s189 = report.pathwayScores?.["189"];
      t("the totals table carries the engine's 189 number", tables[1].kind === "table" && !!s189 && tables[1].rows.flat().join(" ").includes(String(s189.baseScore)));
    }
    const fees = (visaFees as unknown as { visas: Record<string, { vac: { main: number } }> }).visas;
    const gov = costTables[0];
    t("government charges equal the fee data (189, 491)", gov.kind === "table" && gov.rows.some((row) => row[0].includes("189") && row[1].replace(/[^\d]/g, "") === String(fees["189"].vac.main)) && gov.rows.some((row) => row[0].includes("491") && row[1].replace(/[^\d]/g, "") === String(fees["491"].vac.main)));
  }

  console.log("\n2. fixed ordering independent of user data");
  for (const tv of MAIN_TARGETS) {
    for (const L of ["en", "tr", "zh-Hans"] as const) {
      const sig = (v: ReportView) => JSON.stringify({ ids: v.sections.map((s) => s.id), visas: headings(v).map((h) => h.text), states: stateHeadings(v), scen: v.sections.find((s) => s.id === "points")?.blocks.filter((b) => b.kind === "heading").map((b) => (b.kind === "heading" ? b.text : "")) });
      const sigs = PERSONA_IDS.map((p) => sig(views.get(`${p}|${tv}|${L}`)!));
      t(`[${tv} ${L}] four different profiles: the same sections, visa blocks, states and scenario groups in the same order`, sigs.every((x) => x === sigs[0]));
    }
  }
  const nsA = views.get("ref-xyz-qld|not_sure|en")!;
  t("Not sure: the visas are in exactly the fixed order", FIXED_VISA_ORDER.every((c, i) => headings(nsA)[i].text.includes(c)));
  const t491 = headings(views.get("ref-xyz-qld|491|en")!).map((h) => h.text);
  const t189 = headings(views.get("ref-xyz-qld|189|en")!).map((h) => h.text);
  const notSure = headings(nsA).map((h) => h.text);
  t("the target moves to the front; the order of the others is unchanged", t491[0] === notSure.find((x) => x.includes("(subclass 491)")) && t189[0] === notSure.find((x) => x.includes("(subclass 189)")) && JSON.stringify(t491.slice(1)) === JSON.stringify(notSure.filter((x) => x !== t491[0])));

  console.log("\n3. the other targets (English)");
  for (const r of allRendered.filter((x) => OTHER_TARGETS.includes(x.id.split("|")[1] as TargetVisa) && x.locale === "en")) {
    const tv = r.id.split("|")[1] as TargetVisa;
    const view = buildReportView({ report: r.report as ReadinessReport, locale: "en", profile: profileOf(REVIEW_PERSONAS["ref-xyz-qld"]), dateText: "" });
    const pages = Number([...r.text.matchAll(/(\d+) \/ (\d+)/g)].pop()?.[2] ?? 0);
    console.log(`\n-------------------- target ${tv} (${pages} pages) --------------------`);
    t("all sections; the target's block first and marked", view.targetVisa === tv && view.sections.map((s) => s.id).includes("visas") && !!headings(view)[0].marked);
    t(`14-22 pages (${pages})`, pages >= 14 && pages <= 22);
    t("no verdict wording", !BANNED.en.test(flat(r.text)));
  }

  console.log("\n4. hidden-cost rule: registration that is separate from the skills assessment stays visible");
  const doctor: ReadinessInput = { ...REVIEW_PERSONAS["ref-xyz-qld"], occupation: "General Practitioner 253111", occupationConfirmed: "yes", targetVisa: "491", preferredPathway: "491", locale: "en" };
  const nurse: ReadinessInput = { ...REVIEW_PERSONAS["ref-xyz-qld"], occupation: "Registered Nurse (Medical) 254418", occupationConfirmed: "yes", targetVisa: "491", preferredPathway: "491", locale: "en" };
  for (const [name, input] of [["doctor (AHPRA)", doctor], ["nurse (ANMAC + registration)", nurse]] as const) {
    for (const loc of ["en", "tr", "zh-Hans"] as const) {
      const rep = runReadinessEngine({ ...input, locale: loc });
      const v = buildReportView({ report: rep, locale: loc, profile: profileOf(input), dateText: "" });
      const joined = v.sections.find((s) => s.id === "costs")!.blocks.flatMap((b) => (b.kind === "text" ? [b.text] : [])).join(" ");
      t(`${name} [${loc}]: the registration step is listed with a note that it is separate from the assessment`, /separate from the skills assessment|beceri değerlendirmesinden ayrıdır|独立于技能评估/.test(joined));
    }
  }

  console.log("\n5. an older stored report (no target) reads as Not sure");
  const old = runReadinessEngine({ ...REVIEW_PERSONAS["ref-xyz-qld"], locale: "en" });
  const stripped = { ...old, targetVisa: undefined, suppliedFacts: undefined } as ReadinessReport;
  const vOld = buildReportView({ report: stripped, locale: "en", profile: { occupation: "x" }, dateText: "" });
  t("no targetVisa -> Not sure, nine visa blocks in the fixed order, and no crash", vOld.isNotSure && headings(vOld).length === 9 && targetVisaOf({}) === "not_sure" && targetVisaOf({ preferredPathway: "820/801" }) === "820_801");

  console.log(`\nPage counts: ${pageCounts.join("; ")}`);
  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
