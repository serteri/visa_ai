/**
 * The reference profile from real report LVA-20261001-ASDASDASD (non-personal answers, REVIEW_PERSONAS["ref-asd-qld"]):
 * Software Engineer 261313, 38, onshore in Queensland, Superior English, PhD earned outside Australia, partner without
 * Functional English, skills assessment completed, no experience entered. Real PDF text (production PDF route),
 * en / tr / zh-Hans, created on 1 October 2026:
 *
 *   1. No "proceed to the application" / "your profile is strong": the first next action is the EOI (invitation, nomination).
 *   2. A completed skills assessment propagates: no not-yet-assessed wording anywhere; the fee is left out of the
 *      totals with the reason.
 *   3. The verdict names the single ranking's best pathway; pathways with a different gate status / availability never
 *      share one figure; no "HIGH POTENTIAL" / match percentages in the customer report.
 *   4. A report created on or after every contributing source and deploy shows "Generated <creation date>", in full
 *      (not clipped) in the User Information table.
 *   5. No English test age tied to the visa grant.
 *   6. No "Low - Limited risk indicators" next to a High alert.
 *   7. Specialist education: the points table carries the engine's note (a degree from an Australian institution); no 485 suggestion.
 *   8. "Eligible, but below recent invitation levels" states score, benchmark and gap (190/491 with the nomination).
 *   9. A state not available because of residence (confirmed or not) is in the "not available" table, never among the usable states.
 *
 *   npx tsx scripts/test-reference-report.ts
 */
import type { ReadinessReport } from "../lib/readiness/types";
import { computeEstimatedTotalAud } from "../lib/readiness/financial-roadmap-totals";
import { BANNED_CLAIMS, englishAgeTiedToGrant } from "./test-report-banned-phrases";
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

const CREATED_AT = "2026-10-01T03:12:00.000Z";

/** Wording that only makes sense while the skills assessment is NOT done. */
const NOT_YET_ASSESSED = {
  en: ["Lodge formal skills assessment", "Wait for assessment results", "will be conducted by", "Without assessment", "remain unclear", "has not been completed yet", "not yet completed", "Requires Skills Assessment", "Skills assessment application and language test"],
  tr: ["resmi beceri incelemesi başvurusu", "Değerlendirme sonuçlarını bekleme", "tarafından yürütülecektir", "Değerlendirme olmadan", "net değildir", "henüz yapılmadı", "Değerlendirme gerekli", "Beceri değerlendirmesi başvurusu"],
  "zh-Hans": ["提交正式职业评估", "等待评估结果", "将由", "没有评估结果", "仍不明确", "尚未完成", "需要技能评估", "提交技能评估申请"],
} as const;

async function main() {
  const rendered = await renderPersonaPdfTexts({ ref: REVIEW_PERSONAS["ref-asd-qld"] }, undefined, undefined, CREATED_AT);

  for (const r of rendered) {
    const L = r.locale;
    const text = flat(r.text);
    const report = r.report as ReadinessReport;
    const view = buildReportView({ report, locale: L, profile: { name: "Test Persona", occupation: REVIEW_PERSONAS["ref-asd-qld"].occupation, englishLevel: REVIEW_PERSONAS["ref-asd-qld"].englishLevel }, dateText: "" });
    console.log(`\n==================== ${r.id} [${L}] ====================`);

    // 1.
    const proceed = BANNED_CLAIMS.slice(-7).filter((re) => re.test(text));
    const next = { en: "Submit your EOI now", tr: "EOI'nizi şimdi gönderin", "zh-Hans": "立即提交 EOI" }[L];
    t("1. no 'proceed to the application' / 'profile is strong'; the first next action is the EOI", proceed.length === 0 && squash(text).includes(squash(next)) && squash(view.verdict.nextActions[0] ?? "").includes(squash(next)), proceed.map(String).join(" | "));

    // 2.
    const stale = NOT_YET_ASSESSED[L].filter((p) => text.includes(p));
    t("2. no not-yet-assessed wording (Gantt, timeline, Skills Assessment section, confidence, evidence)", stale.length === 0, stale.join(" | "));
    const total = computeEstimatedTotalAud(report.financialRoadmap)!;
    const reason = { en: "Your skills assessment is already done", tr: "Beceri değerlendirmeniz zaten tamamlandı", "zh-Hans": "您的技能评估已完成" }[L];
    t("2. the skills-assessment fee is left out of the totals and is no cost row; the PDF says once that it is done", total.completedKinds.includes("skills_assessment") && !total.includedKinds.includes("skills_assessment") && squash(text).split(squash(reason)).length - 1 === 1 && !view.costs.rows.some((row) => /Skills Assessment|Beceri Değerlendirmesi|技能评估/.test(row.item)), JSON.stringify(total));

    // 3.
    const entries = report.pathwayRanking?.entries ?? [];
    const best = report.pathwayRanking?.recommendable?.[0] ?? [...entries].sort((a, b) => a.position - b.position)[0]?.subclass;
    const figures = view.verdict.distance.map((d) => `${d.score}|${d.vsMinimum}|${d.vsRecent}`);
    const highPotential = /HIGH POTENTIAL|YÜKSEK POTANSİYEL|Highly Recommended|Viability Ranking/i.test(r.text) || /\b[A-Z]{2,3}\s+\d{1,3}\s?%/.test(r.text);
    t("3. the verdict's best pathway is the single ranking's first recommendable one; 189 / 190 / 491 never share one figure (different score, minimum and recent-level cells); no 'HIGH POTENTIAL' or match percentages", view.verdict.best?.subclass === best && new Set(figures).size === figures.length && !highPotential, `${view.verdict.best?.subclass} vs ${best}; ${figures.join(" / ")}`);
    t("3. ranking order unchanged (the single ranking): the visa blocks follow the report's pathway order", JSON.stringify(view.visas.items.map((b) => b.subclass).filter((v) => ["189", "190", "491"].includes(v))) === JSON.stringify((report.pathwayComparison ?? []).map((p) => p.subclass).filter((v) => ["189", "190", "491"].includes(v))));

    // 4.
    const generated = { en: "Generated 1 October 2026", tr: "Oluşturulma tarihi 1 Ekim 2026", "zh-Hans": "生成日期：2026年10月1日" }[L];
    t("4. created on or after every source and deploy date: 'Generated <creation date>'", squash(text).includes(squash(generated)) && !/Updated to reflect data as of|itibarıyla verilere göre güncellendi|已根据截至/.test(text), text.slice(0, 600));

    // 5.
    t("5. no English test age tied to the visa grant", !englishAgeTiedToGrant(text), englishAgeTiedToGrant(text));

    // 6.
    const limited = /Limited risk indicators|risk göstergeleri sınırlı/.test(text);
    t("6. no 'Low - Limited risk indicators' header next to a High alert", !limited);

    // 7.
    const specRow = report.pointsEstimate?.breakdown.find((b) => /Specialist|Uzmanlık|专业型/.test(b.label));
    const missing = { en: "INFORMATION MISSING", tr: "BİLGİ EKSİK", "zh-Hans": "信息缺失" }[L];
    const g485 = { en: "Consider 485 Graduate Visa Pathway", tr: "485 Graduate Visa Yolunu Değerlendirin", "zh-Hans": "评估485毕业生签证路径" }[L];
    t("7. specialist education: the points table carries the engine's note (a degree from an Australian institution); no 485 suggestion", !!specRow?.note && squash(text).includes(squash(specRow.note)) && !text.includes(missing) && !text.includes(g485), specRow?.note ?? "no row");

    // 8.
    const lab = {
      // 190 is no longer "eligible, but below": no state is available for it without a WA job offer (Next step required).
      en: ["your 65 vs recent 95, 30 points short"],
      tr: ["sizin puanınız 65, son davetler 95; 30 puan eksik"],
      "zh-Hans": ["您的 65 分，近期 95 分，差 30 分"],
    }[L];
    t("8. below-benchmark labels state score, benchmark and gap (189; 190 is a next step because no state is available without a WA job offer)", lab.every((x) => squash(text).includes(squash(x))), lab.filter((x) => !squash(text).includes(squash(x))).join(" | "));

    // 9.
    const tr = report.stateNominationTracker!;
    const act = tr.states.find((s) => s.code === "ACT")!;
    const firstBlocked = tr.states.findIndex((s) => s.residenceBlock);
    const lastAvailable = tr.states.map((s) => !s.residenceBlock && s.isOpen).lastIndexOf(true);
    const usable = new Set(view.states.available.map((a) => a.code));
    const listedAsUnavailable = ["ACT", "TAS"].every((c) => view.states.unavailable.some((u) => u.code === c) && squash(text).includes(squash(view.states.unavailable.find((u) => u.code === c)!.reason)));
    t("9. ACT (residence not confirmed) is 0%, like Tasmania, and no residence-blocked state ranks above an available one; both are in the 'not available' table, never among the usable states", act.residenceBlock === "not_confirmed" && act.score === 0 && tr.states.find((s) => s.code === "TAS")!.score === 0 && (lastAvailable < 0 || firstBlocked > lastAvailable) && listedAsUnavailable && !usable.has("ACT") && !usable.has("TAS"), JSON.stringify([...usable]));
  }

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
