/**
 * State stream conditions, friction causes, ready-profile timeline, completed-assessment wording, living-cost city.
 * The reference profile of real report LVA-20261003-XYZ (non-personal answers; personas ref-xyz-qld / ref-xyz-wa-job in
 * scripts/render-persona-pdfs.ts): Software Engineer 261313, 28, in Queensland, Superior English, PhD outside Australia,
 * partner without Functional English, skills assessment completed, no experience, no employer sponsor. Real engine and
 * real PDF text (production PDF route), en / tr / zh-Hans.
 *
 *   1. WA lists the occupation, but its 190 General stream needs a six-month WA employment contract: with no WA job
 *      recorded WA is NOT available for 190 ("Requires a WA job offer") yet stays available for 491; with a WA job offer
 *      WA stays available for 190. The 190 gate / label, friction, ranking label, reality check, open-state lists and
 *      the AI strategy inputs all follow.
 *   2. The friction legend states the actual cause of each level (the nomination-availability floor when points meet the
 *      benchmark) and never shows the "1-15 points below" text for a pathway whose score meets it.
 *   3. A ready profile (assessment done, English >= Competent, points >= 65) starts with "Submit your EOI now".
 *   4. A completed assessment: no "How do I get a skills assessment" FAQ, no "Skills assessment timing can influence"
 *      checklist item -- outcome-letter validity guidance instead.
 *   5. Living cost uses the capital of the applicant's state (Brisbane for QLD), labelled as based on that state.
 */
import "./lib/stub-request-context";

process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/d?sslmode=disable"; // never connects

import { frictionLegendLines } from "../lib/readiness/friction-legend";
import { frictionCauseText, frictionFromScore, frictionWithAvailability } from "../lib/readiness/pathway-scores";
import { deterministicRecommendations, findRecommendationViolations } from "../lib/readiness/pathway-recommendations";
import type { Locale, ReadinessInput, ReadinessReport } from "../lib/readiness/types";
import { streamConditionBlock } from "../lib/state-nomination/stream-conditions";
import { REVIEW_PERSONAS, renderPersonaPdfTexts } from "./render-persona-pdfs";
import { runReadinessEngine } from "../src/lib/readiness-engine";

let failures = 0;
const t = (label: string, cond: boolean, detail = "") => {
  if (cond) console.log(`  ✅ ${label}`);
  else {
    failures++;
    console.error(`  ❌ ${label}${detail ? ` -- ${detail}` : ""}`);
  }
};
const section = (s: string) => console.log(`\n==================== ${s} ====================`);
const flat = (s: string) => s.replace(/\s+/g, " ");
const squash = (s: string) => s.replace(/\s+/g, "");
const has = (text: string, needle: string) => squash(text).includes(squash(needle));
const LOCALES: Locale[] = ["en", "tr", "zh-Hans"];

const REASON: Record<Locale, string> = { en: "Requires a WA job offer", tr: "Batı Avustralya'da iş teklifi gerektirir", "zh-Hans": "需要西澳工作录用" };

const base = REVIEW_PERSONAS["ref-xyz-qld"] as ReadinessInput;
const withWaJob = REVIEW_PERSONAS["ref-xyz-wa-job"] as ReadinessInput;
const run = (input: ReadinessInput, locale: Locale) => runReadinessEngine({ ...input, locale }) as ReadinessReport;
const reasonCited = (r: ReadinessReport) => r.stateNominationTracker!.states.find((s) => s.code === "WA")!;

async function main() {
  section("1. state stream conditions affect availability");
  for (const L of LOCALES) {
    const r = run(base, L);
    const tr = r.stateNominationTracker!;
    const wa = reasonCited(r);
    t(`[${L}] reference: 190 availability is empty, 491 is WA (WA is open and lists the occupation, but 190 needs a WA job)`, JSON.stringify(tr.nominationAvailability) === JSON.stringify({ "190": [], "491": ["WA"] }), JSON.stringify(tr.nominationAvailability));
    t(`[${L}] WA unavailable for 190 with the reason "${REASON[L]}", not for 491`, wa.unavailableFor?.["190"]?.reason === REASON[L] && wa.unavailableFor?.["491"] === undefined && wa.isOpen === true, JSON.stringify(wa.unavailableFor));
    t(`[${L}] the open-states list is split: conditionBlocked 190 = WA with the reason, 491 = none`, JSON.stringify(tr.conditionBlocked?.["190"]?.map((b) => [b.code, b.reason])) === JSON.stringify([["WA", REASON[L]]]) && tr.conditionBlocked?.["491"]?.length === 0);
    t(`[${L}] WA state summary and requirements carry the sourced condition (six-month WA contract) and the reason`, wa.summary.includes(REASON[L]) && wa.requirements.some((x) => /six months|altı ay|六个月/.test(x)), wa.summary);

    const g190 = r.visaGates!["190"];
    t(`[${L}] 190 gate: "Next step required" with the WA job step; 491 / 189 unaffected`, g190.status === "next_step_required" && g190.notMet.some((g) => g.id === "190.nomination" && g.kind === "actionable") && g190.steps.some((s) => /Western Australian job offer|Batı Avustralya'da bir iş teklifi|西澳工作录用/.test(s)) && r.visaGates!["491"].status === "eligible" && r.visaGates!["189"].status === "eligible", JSON.stringify(g190.steps));
    const fr190 = r.frictionAnalysis.find((f) => f.pathway === "190")!;
    const fr491 = r.frictionAnalysis.find((f) => f.pathway === "491")!;
    t(`[${L}] friction: 190 is HIGH (no state available), 491 MEDIUM (one state), same in the strength comparison`, fr190.frictionScore === "HIGH" && fr491.frictionScore === "MEDIUM" && r.pathwayStrengthComparison.find((p) => p.subclass === "190")!.friction === "high" && r.pathwayStrengthComparison.find((p) => p.subclass === "491")!.friction === "medium");
    t(`[${L}] reality check names the reason instead of "no state lists your occupation"`, fr190.realityCheck.includes(REASON[L]) && !/currently has your occupation on its 190 list|hiçbir eyalet veya bölge, bulunduğunuz|没有任何州或领地在其 190/.test(fr190.realityCheck), fr190.realityCheck);
    const ranked = r.rankedPathways!.filter((p) => ["189", "190", "491"].includes(p.subclass));
    t(`[${L}] ranking label: 190 is never an "Alternative Option" while no state is available for it`, ranked.find((p) => p.subclass === "190")!.recommendationTag === "⚠️ High Risk / Low Probability", JSON.stringify(ranked.map((p) => [p.subclass, p.recommendationTag])));

    // AI strategy inputs: the deterministic recommendations and the validator.
    const recs = deterministicRecommendations(r, L);
    const rec190 = recs.find((x) => x.subclass === "190");
    t(`[${L}] AI inputs: the 190 recommendation (if any) is conditional on the WA job step; 491 recommends WA`, (!rec190 || (rec190.reason.includes(REASON[L]) || /Western Australian job offer|Batı Avustralya'da bir iş teklifi|西澳工作录用/.test(rec190.reason))) && recs.find((x) => x.subclass === "491")?.state === "Western Australia", JSON.stringify(recs.map((x) => [x.subclass, x.state])));
    const wrong = findRecommendationViolations(
      { executiveSummary: "", topRecommendedPathways: [{ state: "Western Australia", subclass: "190", reason: "x", nextSteps: [] }], pointsBoosterStrategy: [], nextSteps: [] } as never,
      { ...r, pathwayRanking: { ...r.pathwayRanking!, recommendable: [...r.pathwayRanking!.recommendable, "190"] }, visaGates: { ...r.visaGates!, "190": { ...r.visaGates!["190"], status: "eligible", notMet: [], steps: [] } } } as ReadinessReport,
    );
    t(`[${L}] AI validator: recommending WA for 190 as a ready pathway is a violation (not available on the applicant's answers)`, wrong.some((v) => /not available for subclass 190/.test(v.message)), JSON.stringify(wrong));
  }

  {
    const r = run(withWaJob, "en");
    const tr = r.stateNominationTracker!;
    t("with a WA job offer (employer sponsorship + preferred state WA): WA stays available for 190 and 491", JSON.stringify(tr.nominationAvailability) === JSON.stringify({ "190": ["WA"], "491": ["WA"] }) && reasonCited(r).unavailableFor === undefined && tr.conditionBlocked?.["190"].length === 0, JSON.stringify(tr.nominationAvailability));
    t("... and the 190 gate is no longer held by the nomination (eligible, below recent invitation levels)", r.visaGates!["190"].status === "eligible" && !r.visaGates!["190"].notMet.some((g) => g.id === "190.nomination"), r.visaGates!["190"].status);
    const viaEmploymentState = run({ ...base, preferredState: undefined, employerSponsorship: "sponsored_482", employmentState: "WA" }, "en").stateNominationTracker!.nominationAvailability;
    t("a sponsored 482 with the job's state recorded as WA counts as a WA job", JSON.stringify(viaEmploymentState) === JSON.stringify({ "190": ["WA"], "491": ["WA"] }));
    const elsewhere = run({ ...base, employerSponsorship: "job_offer", preferredState: "QLD" }, "en").stateNominationTracker!.nominationAvailability;
    t("a job offer in another state (preferred state QLD) is not a WA job: WA stays out for 190", JSON.stringify(elsewhere) === JSON.stringify({ "190": [], "491": ["WA"] }));
    const noOffer = run({ ...base, preferredState: "WA" }, "en").stateNominationTracker!.nominationAvailability;
    t("preferring WA without a job offer or sponsor is not a WA job", JSON.stringify(noOffer) === JSON.stringify({ "190": [], "491": ["WA"] }));
    // Unit: the rule, from the sourced WA data.
    const unit = (input: Partial<ReadinessInput>, sub: "190" | "491", code = "261313") => streamConditionBlock(input, "WA", code, sub, "en");
    t("rule: General stream occupation (Schedule 2): 190 blocked without a job, 491 not", unit({}, "190")?.kind === "employment" && unit({}, "491") === undefined);
    t("rule: WA study recorded (Graduate stream on the list) satisfies 190 instead of a job", unit({ qualificationAwardedInAustralia: true, studyState: "WA" }, "190") === undefined);
    t("rule: study in another state does not", unit({ qualificationAwardedInAustralia: true, studyState: "NSW" }, "190")?.kind === "employment");
    t("rule: a state other than WA, or an occupation not on WA's lists, is never blocked here", streamConditionBlock({}, "NSW", "261313", "190", "en") === undefined && unit({}, "190", "999999") === undefined);
    // An occupation on WA's Graduate stream only (no General stream): 491 and 190 both need WA study.
    const gradOnly = unit({}, "491", "134311");
    t("rule: a Graduate-stream-only occupation needs WA study for 190 / 491 (reason: Requires two years of study in WA)", gradOnly === undefined || gradOnly.reason === "Requires two years of study in WA");
  }

  section("2. friction legend states the actual cause");
  {
    for (const L of LOCALES) {
      const r = run(base, L);
      const entries = r.frictionAnalysis.map((f) => ({ subclass: f.pathway, visa: f.pathway, level: f.frictionScore }));
      const lines = frictionLegendLines(entries, r, L);
      const l491 = lines.find((x) => x.startsWith("491 –"))!;
      const cause491 = { en: "points meet the recent benchmark; only one state is currently open to you (WA)", tr: "puanlar yakın dönem referansını karşılıyor; şu anda size yalnızca bir eyalet açık (WA)", "zh-Hans": "分数已达到近期参考分；目前仅有一个州对您开放（WA）" }[L];
      t(`[${L}] 491 (score above its benchmark, one open state): "${cause491}"`, l491.includes(cause491), l491);
      t(`[${L}] 491's line never shows the "points below the benchmark" band text`, !/1-15 points below|1–15 puan altında|低 1–15 分|1-15 puan/.test(l491) && !/points below|puan altında|分/.test(l491.replace(cause491, "")) , l491);
      const l190 = lines.find((x) => x.startsWith("190 –"))!;
      t(`[${L}] 190 (10 points short, no state available): says both causes`, /10/.test(l190) && (l190.includes("no state or territory is currently open to you for 190") || l190.includes("şu anda 190 için size açık hiçbir eyalet veya bölge yok") || l190.includes("目前没有任何州或领地对您开放 190")), l190);
    }
    // Unit: the cause function over the cases.
    const r = run(base, "en");
    const s491 = r.pathwayScores!["491"];
    t("cause: points level equals final level -> null (the band definition states it)", frictionCauseText(s491, frictionFromScore(s491), ["WA", "TAS", "ACT"], "en") === null);
    t("cause: points met, one state -> MEDIUM floor sentence; none -> HIGH floor sentence", frictionWithAvailability(s491, ["WA"]) === "MEDIUM" && frictionCauseText(s491, "MEDIUM", ["WA"], "en") === "points meet the recent benchmark; only one state is currently open to you (WA)" && frictionCauseText(s491, "HIGH", [], "en") === "points meet the recent benchmark; no state or territory is currently open to you for 491");
    t("cause: 189 and a not-assessed level never get an availability cause", frictionCauseText(r.pathwayScores!["189"], "HIGH", [], "en") === null && frictionCauseText(s491, "NOT_ASSESSED", [], "en") === null);
  }

  section("3-5. real PDF text: timeline, FAQ and checklist, living cost");
  const rendered = await renderPersonaPdfTexts(
    {
      ref: base,
      waJob: withWaJob,
      // Needs steps: the skills assessment is still to do -> the existing timeline.
      needsSteps: { ...base, occupationConfirmed: "no" },
      // Assessment done but below 65 points -> the existing timeline too.
      lowPoints: { ...base, age: "46", qualificationLevel: "Diploma", englishLevel: "competent", sponsorOrFamily: "Single / No Dependants" },
    },
    undefined,
    undefined,
    "2026-10-03T03:00:00.000Z",
  );
  const pick = (id: string, L: Locale) => rendered.find((x) => x.id === id && x.locale === L)!;
  for (const L of LOCALES) {
    const ref = flat(pick("ref", L).text);
    const refReport = pick("ref", L).report as ReadinessReport;
    const waJob = flat(pick("waJob", L).text);
    const submit = { en: "Submit your EOI now", tr: "EOI'nizi şimdi gönderin", "zh-Hans": "立即提交 EOI" }[L];
    const month1 = { en: "Month 1Submit your EOI now", tr: "Ay 1EOI'nizi şimdi gönderin", "zh-Hans": "第1个月立即提交 EOI" }[L];
    // 1 in the PDF.
    t(`[${L}] PDF: 190 state reason "${REASON[L]}" and the sourced WA condition appear; WA-job persona has neither`, has(ref, REASON[L]) && !has(waJob, REASON[L]), "");
    // 2 in the PDF: the plain availability statement in "States you can use" (no friction wording).
    const note491 = { en: "Only one state is open to you for 491 (WA), so nomination is the main hurdle.", tr: "491 için size yalnızca bir eyalet açık (WA); bu yüzden asıl engel adaylık.", "zh-Hans": "目前仅有一个州对您开放 491（WA），因此主要障碍是获得提名。" }[L];
    const note190 = { en: "No state is open to you for 190, so nomination is the main hurdle.", tr: "190 için size açık bir eyalet yok; bu yüzden asıl engel adaylık.", "zh-Hans": "目前没有任何州对您开放 190，因此主要障碍是获得提名。" }[L];
    t(`[${L}] PDF states section: 491 has one open state (WA) and 190 none, in plain words ("nomination is the main hurdle")`, has(ref, note491) && has(ref, note190), "");
    // 3.
    const gantt = refReport.premiumSections.strategicGanttChart;
    t(`[${L}] ready profile: the Gantt starts with "${submit}" in quarter 1, then nomination applications; the assessment is not a future quarter`, gantt.steps[0].title === submit && /1/.test(gantt.steps[0].window) && gantt.steps[1].window === gantt.steps[0].window && !gantt.steps.some((s) => /Skills Assessment Completed|Beceri Değerlendirmesi Tamamlandı|技能评估已完成/.test(s.title)), JSON.stringify(gantt.steps.map((s) => [s.title, s.window])));
    t(`[${L}] ready profile: the action plan starts with "${month1}" (month 1), then the nomination applications`, has(ref, month1) && !has(ref, { en: "Month 1-2Skills assessment already completed", tr: "Ay 1-2Beceri değerlendirmesi zaten tamamlandı", "zh-Hans": "第1-2个月技能评估已完成" }[L]));
    const needs = flat(pick("needsSteps", L).text);
    const low = flat(pick("lowPoints", L).text);
    t(`[${L}] profiles that still need steps keep the existing timeline (no "${submit}")`, !has(needs, month1) && !has(low, month1) && !(pick("needsSteps", L).report as ReadinessReport).premiumSections.strategicGanttChart.steps.some((s) => s.title === submit) && !(pick("lowPoints", L).report as ReadinessReport).premiumSections.strategicGanttChart.steps.some((s) => s.title === submit));
    // 4.
    const stale = { en: ["How do I get a skills assessment", "Skills assessment timing can influence"], tr: ["beceri değerlendirmesi nasıl yapılır", "Beceri incelemesi zamanlaması"], "zh-Hans": ["进行技能评估？", "技能评估时间点可能影响"] }[L];
    t(`[${L}] completed assessment: no "how do I get one" FAQ and no "timing can influence" checklist item`, stale.every((x) => !has(ref, x)), stale.filter((x) => has(ref, x)).join(" | "));
    // The outcome-letter item is the one profile-specific lodgement item that stays (appendix, "Before you lodge").
    const guidance = { en: ["Skills assessment outcome letter", "keep it valid"], tr: ["Beceri değerlendirmesi sonuç mektubu", "geçerli tutun"], "zh-Hans": ["技能评估结果信", "保持有效"] }[L];
    t(`[${L}] completed assessment: outcome-letter validity guidance in the appendix (before you lodge)`, guidance.every((x) => has(ref, x)), guidance.filter((x) => !has(ref, x)).join(" | "));
    const original = { en: "Month 1-2Skills assessment application and language test", tr: "Ay 1-2Beceri değerlendirmesi başvurusu ve dil testi", "zh-Hans": "第1-2个月提交技能评估申请和语言考试" }[L];
    t(`[${L}] a profile that has NOT completed the assessment still gets the original plan, and no outcome-letter item`, has(needs, original) && !has(needs, guidance[0]));
    // 5.
    const living = { en: "Brisbane (based on your state: Queensland)", tr: "Brisbane (yaşadığınız eyalete göre: Queensland)", "zh-Hans": "布里斯班（根据您居住的州：昆士兰州）" }[L];
    t(`[${L}] living cost: Brisbane for a QLD resident, labelled as based on the applicant's state, not the Sydney example`, has(ref, living) && !/Sydney|悉尼/.test(ref.slice(ref.search(/Living Cost|Yaşam Maliyeti|生活成本/) >= 0 ? ref.search(/Living Cost|Yaşam Maliyeti|生活成本/) : 0, (ref.search(/Living Cost|Yaşam Maliyeti|生活成本/) >= 0 ? ref.search(/Living Cost|Yaşam Maliyeti|生活成本/) : 0) + 400)), refReport.premiumSections.livingCostProjection.city);
  }
  {
    // A state without a city in the living-cost dataset keeps the example label; an explicit city wins.
    const act = run({ ...base, residenceState: "ACT" }, "en").premiumSections.livingCostProjection.city;
    const melbourne = run({ ...base, residenceState: "QLD", preferredCity: "Melbourne" }, "en").premiumSections.livingCostProjection.city;
    const nsw = run({ ...base, residenceState: "NSW" }, "en").premiumSections.livingCostProjection.city;
    t("living cost: NSW -> Sydney (based on your state); ACT (no dataset city) keeps the example label; a chosen city wins", nsw === "Sydney (based on your state: New South Wales)" && /example city/.test(act) && melbourne === "Melbourne", JSON.stringify({ nsw, act, melbourne }));
  }

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
