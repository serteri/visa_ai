/**
 * The reference profile from real report LVA-20261001-ASDASDASD (non-personal answers, REVIEW_PERSONAS["ref-asd-qld"]):
 * Software Engineer 261313, 38, onshore in Queensland, Superior English, PhD earned outside Australia, partner without
 * Functional English, skills assessment completed, no experience entered. Real PDF text (production PDF route),
 * en / tr / zh-Hans, created on 1 October 2026, for the 491 target:
 *
 *   1. No "proceed to the application" / "your profile is strong"; no next actions, no verdict.
 *   2. A completed skills assessment propagates: no not-yet-assessed wording anywhere; the fee is left out of the
 *      totals with the reason, and is no cost row.
 *   3. No "HIGH POTENTIAL" / match percentages / ranking; the points totals show each subclass's own figure and the
 *      published reference points side by side, without a "short" / "above" comparison.
 *   4. A report created on or after every contributing source and deploy shows "Generated <creation date>".
 *   5. No English test age tied to the visa grant.
 *   6. No "Low - Limited risk indicators" next to a High alert.
 *   7. Specialist education: the points table carries the engine's note (a degree from an Australian institution); no 485 suggestion.
 *   8. The published invitation score for 189 is shown as data (with its date), not as a gap.
 *   9. State and territory information: all eight, in a fixed order, none described as unavailable to the applicant.
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
  const persona = { ...REVIEW_PERSONAS["ref-asd-qld"], targetVisa: "491", preferredPathway: "491" };
  const rendered = await renderPersonaPdfTexts({ ref: persona }, undefined, undefined, CREATED_AT);

  for (const r of rendered) {
    const L = r.locale;
    const text = flat(r.text);
    const report = r.report as ReadinessReport;
    const view = buildReportView({ report, locale: L, profile: { name: "Test Persona", occupation: persona.occupation, occupationRaw: persona.occupation, englishLevel: persona.englishLevel }, dateText: "" });
    console.log(`\n==================== ${r.id} [${L}] ====================`);

    // 1.
    const proceed = BANNED_CLAIMS.slice(-7).filter((re) => re.test(text));
    const nextActions = { en: /Your next 3 actions|Submit your EOI now|fastest way/i, tr: /Sonraki 3 adımınız|EOI'nizi şimdi gönderin|en hızlı yol/i, "zh-Hans": /您的下一步|立即提交 EOI|最快方式/ }[L];
    t("1. no 'proceed to the application' / 'profile is strong'; no next actions or verdict", proceed.length === 0 && !nextActions.test(text));

    // 2.
    const stale = NOT_YET_ASSESSED[L].filter((p) => text.includes(p));
    t("2. no not-yet-assessed wording", stale.length === 0, stale.join(" | "));
    const total = computeEstimatedTotalAud(report.financialRoadmap)!;
    const reason = { en: "Your skills assessment is already done", tr: "Beceri değerlendirmeniz zaten tamamlandı", "zh-Hans": "您的技能评估已完成" }[L];
    t("2. the skills-assessment fee is left out of the totals and is no cost row; the PDF says once that it is done", total.completedKinds.includes("skills_assessment") && !total.includedKinds.includes("skills_assessment") && squash(text).split(squash(reason)).length - 1 === 1 && !view.costs.rows.some((row) => row.item === report.financialRoadmap.find((i) => i.kind === "skills_assessment")?.category));

    // 3.
    const highPotential = /HIGH POTENTIAL|YÜKSEK POTANSİYEL|Highly Recommended|Viability Ranking/i.test(r.text) || /\b[A-Z]{2,3}\s+\d{1,3}\s?%/.test(r.text);
    const shortOrAbove = /\d+ points? short|\d+ puan eksik|差 \d+ 分|\d+ above|üstünde/.test(text);
    t("3. no 'HIGH POTENTIAL' / match percentages / ranking, no 'short' or 'above' comparison; one row per points-tested subclass of the target", !highPotential && !shortOrAbove && view.points.totals.length === 1 && view.points.totals[0][0].includes("491"));

    // 4.
    const generated = { en: "Generated 1 October 2026", tr: "Oluşturulma tarihi 1 Ekim 2026", "zh-Hans": "生成日期：2026年10月1日" }[L];
    t("4. created on or after every source and deploy date: 'Generated <creation date>'", squash(text).includes(squash(generated)) && !/Updated to reflect data as of|itibarıyla verilere göre güncellendi|已根据截至/.test(text));

    // 5.
    t("5. no English test age tied to the visa grant", !englishAgeTiedToGrant(text), englishAgeTiedToGrant(text));

    // 6.
    const limited = /Limited risk indicators|risk göstergeleri sınırlı/.test(text);
    t("6. no 'Low - Limited risk indicators' header next to a High alert", !limited);

    // 7.
    const specRow = report.pointsEstimate?.breakdown.find((b) => /Specialist|Uzmanlık|专业型/.test(b.label));
    const missing = { en: "INFORMATION MISSING", tr: "BİLGİ EKSİK", "zh-Hans": "信息缺失" }[L];
    const g485 = { en: "Consider 485 Graduate Visa Pathway", tr: "485 Graduate Visa Yolunu Değerlendirin", "zh-Hans": "评估485毕业生签证路径" }[L];
    t("7. specialist education: the points table carries the engine's note (a degree from an Australian institution); no 485 suggestion", !!specRow?.note && squash(text).includes(squash(specRow.note.slice(0, 40))) && !text.includes(missing) && !text.includes(g485));

    // 8.
    const row189 = report.pathwayScores?.["189"];
    const v491 = report.pathwayScores?.["491"];
    t("8. the published invitation score is data with its date (491 shown with the target); 189 is in the Pathway table as a published fact", !!v491 && view.points.totals[0][5].startsWith(String(v491.benchmark)) && (!row189 || view.others.rows.some((x) => x[0].includes("189"))));

    // 9.
    const rows = view.states.rows;
    t("9. state and territory information: all eight, fixed order, none described as unavailable to the applicant", rows.length === 8 && rows.every((x, i, a) => i === 0 || a[i - 1][0] < x[0]) && !/not available to you|size açık olmayan|对您不开放/i.test(text));
  }

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
