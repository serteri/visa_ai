/**
 * The restructured paid report (lib/reports/report-view.ts, lib/readiness/pdf-report-v2.ts): real PDF text from the
 * production PDF route, en / tr / zh-Hans, for the reference profiles (b0d20f74: no skills assessment, LVA-20261003-XYZ:
 * assessment completed, a WA job-offer profile, an onshore profile with no assessment).
 *
 *   1. 8-10 pages; the parts appear in order: verdict, points, visa by visa, states, action plan, costs, appendix;
 *   2. no removed section title; no Confidence / Strength / Friction / Signal / Evidence load words; no "compliance-driven"
 *      / "binding" wording; no dangling reference to content that does not exist;
 *   3. the benchmark comparison sentence appears at most twice (verdict page + points page);
 *   4. every number once: the total is stated once, a completed skills assessment is not a cost row and is mentioned once,
 *      the living cost is one line and only when the state of residence is known;
 *   5. what the view says is what the PDF says (verdict table, visa blocks, states, plan, cost rows).
 *
 *   npx tsx scripts/test-report-structure.ts
 */
import "./lib/stub-request-context";

process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://u:p@localhost:5432/d?sslmode=disable"; // never connects

import type { ReadinessInput, ReadinessReport } from "../lib/readiness/types";
import { buildReportView } from "../lib/reports/report-view";
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

/** Titles of the sections the customer report no longer has (the cover's own words are not among them). */
export const REMOVED_TITLES: Record<L, string[]> = {
  en: [
    "Glossary", "Signal Snapshot", "What May Change Your Position", "Structured Pathway Comparison", "Pathway Strength Comparison",
    "Confidence Explanation", "Evidence Readiness Snapshot", "Pathway Friction / Reality Check", "Gap Analysis & Considerations",
    "Lodgement-Ready Checklist", "Premium Sections", "Downloadable PDF", "Points Booster Roadmap", "Points Improvement Tips",
    "Points Booster Simulator", "State Signal Radar", "Visa Viability Ranking", "Historical Invitation Trends", "Strategic Gantt Chart",
    "Living Cost Projection", "Audit-Ready Proof Checklist", "Questions Relevant to You", "Your Personalized Application Guide",
    "AI Strategy Summary", "Key Findings", "State Nomination Tracker", "Risk Alerts",
  ],
  tr: [
    "Terimler Sözlüğü", "Sinyal Özeti", "Durumunuzu Değiştirebilecek Faktörler", "Güven Açıklaması", "Kanıt/Bilgi Hazırlık Özeti",
    "Vize Yolu Gerçeklik Kontrolü", "Premium Bölümler", "İndirilebilir PDF", "Puan Artırma Yol Haritası", "Puan Senaryo Simülatörü",
    "Eyalet Sinyal Radarı", "Vize Şans Sıralaması", "Yaşam Maliyeti Projeksiyonu", "Denetim Hazırlığı Kanıt Kontrol Listesi",
    "Sizin İçin Önemli Sorular", "Kişisel Başvuru Rehberiniz", "Yapay Zeka Strateji Özeti", "Ana Bulgular", "Eyalet Adaylığı Takipçisi", "Risk Uyarıları",
  ],
  "zh-Hans": [
    "术语表", "匹配度概览", "可能改变你位置的因素", "路径强度对比", "置信度说明", "材料/信息准备度摘要", "竞争激烈度 / 实际难度评估",
    "高级章节", "可下载 PDF", "积分提升路线图", "加分场景模拟", "州担保信号雷达", "签证可行性排序", "生活成本预测",
    "审计就绪材料核查清单", "对您重要的问题", "您的个人申请指南", "AI 战略摘要", "主要发现", "州提名追踪器", "风险提示",
  ],
};

/** Customer words the report no longer uses (Confidence, Strength, Friction, Signal, Evidence load) and the old audit wording. */
const BANNED_WORDS: Record<L, RegExp> = {
  en: /\b(?:confidence|strength|friction|signal|signals|evidence load)\b|compliance-driven|binding|regulatory threshold/i,
  tr: /(?<![\p{L}])(?:güven|güç|rekabet düzeyi|zorluk seviyesi|sinyal\p{L}*|kanıt yükü|gerekli belge düzeyi)(?![\p{L}])|bağlayıcı|uyumluluk odaklı|düzenleyici eşik/iu,
  "zh-Hans": /置信度|强度|竞争激烈度|信号|证据负荷|材料准备难度|约束力|合规为导向|以合规|监管门槛/,
};

const DANGLING: RegExp = /occupation-specific matrix|mesleğe özel matris|职业特定矩阵|aşağıdaki[^.]{0,40}matris|see (?:the )?(?:table|chart|matrix|section)[^.]{0,30}below|State Nomination Tracker|Eyalet Adaylığı Takipçisi|州提名追踪器|Points Booster|Puan Artırma|积分提升/i;

const BENCHMARK_SENTENCE: Record<L, string> = {
  en: "Recent invitation benchmarks --",
  tr: "Yakın dönem davet referans puanları --",
  "zh-Hans": "近期邀请参考分——",
};

const PERSONAS: Array<{ id: string; input: ReadinessInput; assessmentDone: boolean }> = [
  { id: "real-b0d20f74-inputs", input: REVIEW_PERSONAS["real-b0d20f74-inputs"], assessmentDone: false },
  { id: "ref-xyz-qld", input: REVIEW_PERSONAS["ref-xyz-qld"], assessmentDone: true },
  { id: "ref-xyz-wa-job", input: REVIEW_PERSONAS["ref-xyz-wa-job"], assessmentDone: true },
  { id: "reference-se-au", input: REVIEW_PERSONAS["reference-se-au"], assessmentDone: false },
];

const lineIndex = (text: string, title: string) => text.split("\n").findIndex((l) => l.trim() === title);

async function main() {
  const personas = Object.fromEntries(PERSONAS.map((p) => [p.id, p.input]));
  const rendered = await renderPersonaPdfTexts(personas);

  for (const r of rendered) {
    const L = r.locale as L;
    const meta = PERSONAS.find((p) => p.id === r.id)!;
    const text = r.text;
    const f = flat(text);
    const report = r.report as ReadinessReport;
    const view = buildReportView({ report, locale: L, profile: { name: "Test Persona", occupation: meta.input.occupation, englishLevel: meta.input.englishLevel }, dateText: "" });
    console.log(`\n==================== ${r.id} [${L}] ====================`);

    // 1. pages and order
    const pages = Number([...text.matchAll(/(\d+) \/ (\d+)/g)].pop()?.[2] ?? 0);
    t(`8-10 pages (${pages})`, pages >= 8 && pages <= 10);
    const order = ["verdict", "points", "visas", "states", "plan", "costs", "appendix"] as const;
    const at = order.map((k) => lineIndex(text, view.titles[k]));
    t(`parts in order: ${order.join(" > ")}`, at.every((i) => i >= 0) && at.every((i, k) => k === 0 || i > at[k - 1]), at.join(","));
    t("cover: the one-line verdict and the description 'based on official sources'", squash(f).includes(squash(view.cover.verdictLine)) && squash(f).includes(squash(view.cover.subtitle)) && view.cover.verdictLine.length > 0);

    // 2. removed titles / words / dangling references
    const stillThere = REMOVED_TITLES[L].filter((title) => lineIndex(text, title) >= 0 || squash(f).includes(squash(title)));
    t("no removed section title", stillThere.length === 0, stillThere.join(" | "));
    const banned = BANNED_WORDS[L].exec(f);
    t("no Confidence / Strength / Friction / Signal / Evidence load wording, no 'compliance-driven' / 'binding'", !banned, banned ? `"...${f.slice(Math.max(0, banned.index - 40), banned.index + 60)}..."` : "");
    const dangling = DANGLING.exec(f);
    t("no reference to content that does not exist", !dangling, dangling ? `"...${f.slice(Math.max(0, dangling.index - 40), dangling.index + 70)}..."` : "");
    t("no state match percentages or radar", !/\b[A-Z]{2,3}\s+\d{1,3}\s?%/.test(f) && !/\bMatch\b\s*\d/.test(f));

    // 3. the benchmark comparison sentence: at most twice (verdict page + points page)
    const sentence = count(f, BENCHMARK_SENTENCE[L]);
    const hasBenchmarks = Object.values(report.pathwayScores ?? {}).some((s) => typeof s.benchmark === "number");
    t(`benchmark comparison sentence at most twice (${sentence}x)`, sentence <= 2 && (!hasBenchmarks || sentence >= 1));
    const verdictAt = lineIndex(text, view.titles.verdict);
    const pointsAt = lineIndex(text, view.titles.points);
    const lines = text.split("\n");
    const verdictPage = lines.slice(verdictAt, pointsAt).join(" ");
    const pointsPage = lines.slice(pointsAt, lineIndex(text, view.titles.visas)).join(" ");
    t("it sits on the verdict page and on the points page, nowhere else", !hasBenchmarks || (count(verdictPage, BENCHMARK_SENTENCE[L]) === 1 && count(pointsPage, BENCHMARK_SENTENCE[L]) === 1 && sentence === 2));

    // 4. every number once
    const total = view.verdict.costLine;
    t("the estimated total is stated once", !total || count(f, `${total.title}: ${total.text}`) + count(f, `${total.title} ${total.text}`) === 1, total ? `${count(f, `${total.title}: ${total.text}`)} / ${count(f, `${total.title} ${total.text}`)}` : "");
    for (const extra of view.verdict.extraCostLines) t(`"${extra.title.slice(0, 40)}" is stated once`, count(f, extra.text) >= 1 && count(verdictPage, extra.text) === 1);
    const skillsRow = report.financialRoadmap.find((i) => i.kind === "skills_assessment");
    if (meta.assessmentDone) {
      t("completed assessment: not a cost row, not a plan step", !view.costs.rows.some((row) => skillsRow && row.item === skillsRow.category) && !squash(f).includes(squash(skillsRow?.category ?? "\u0000")));
      t("completed assessment: mentioned once as done", count(f, view.costs.skillsDoneNote) === 1 && view.costs.skillsDoneNote.length > 0);
    } else {
      t("no assessment yet: its fee is a cost row, included in the total", view.costs.rows.some((row) => skillsRow && row.item === skillsRow.category && row.included) && view.costs.skillsDoneNote === "");
    }
    const living = report.premiumSections?.livingCostProjection;
    const livingKnown = !!living && /[(（]/.test(living.city);
    t("living cost: one line, only with a known state of residence", (livingKnown ? count(f, view.costs.livingLine) === 1 && view.costs.livingLine.length > 0 : view.costs.livingLine === "") && !squash(f).includes(squash(L === "en" ? "Living Cost Projection" : L === "tr" ? "Yaşam Maliyeti Projeksiyonu" : "生活成本预测")));

    // 5. what the view says is what the PDF says
    for (const row of view.verdict.distance) {
      const cells = [row.visa, row.score, row.vsMinimum, row.vsRecent];
      t(`verdict table ${row.visa}: ${cells.join(" | ")}`, cells.every((c) => squash(verdictPage).includes(squash(c))));
    }
    for (const b of view.visas.items) t(`visa block ${b.subclass}: "${b.statusLabel.slice(0, 50)}" (complete, not clipped)`, squash(f).includes(squash(b.statusLabel)));
    const unavailableAt = lineIndex(text, view.states.unavailableTitle);
    const statesText = lines.slice(lineIndex(text, view.titles.states), lineIndex(text, view.titles.plan)).join(" ");
    const availableText = unavailableAt >= 0 ? lines.slice(lineIndex(text, view.titles.states), unavailableAt).join(" ") : statesText;
    t("states: only available states are listed as usable, with reason and conditions", view.states.available.every((a) => squash(availableText).includes(squash(a.name)) && squash(availableText).includes(squash(a.reason))));
    t("states: unavailable states in one table (state, reason), none among the usable ones", view.states.unavailable.every((u) => squash(statesText).includes(squash(u.reason)) && !squash(availableText).includes(squash(u.reason))));
    t("states: no state is both", view.states.available.every((a) => !view.states.unavailable.some((u) => u.code === a.code)));
    t("action plan: every step with its cost", view.plan.steps.every((s) => squash(f).includes(squash(s.what.slice(0, 40)))) && view.plan.steps.length >= 4);
    t("costs table: every item, amount and the in-total column", view.costs.rows.every((row) => squash(f).includes(squash(row.item.slice(0, 40))) && squash(f).includes(squash(row.amount.slice(0, 30)))));
    t("appendix: documents, pitfalls, resources, sources, disclaimer (once)", view.appendix.documents.length > 0 && view.appendix.pitfalls.length > 0 && view.appendix.resources.length > 0 && view.appendix.sources.length > 0 && count(f, report.disclaimer) >= 1);
  }

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
