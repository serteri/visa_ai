/**
 * The reference profile from real report LVA-20261001-ASDASDASD (non-personal answers, REVIEW_PERSONAS["ref-asd-qld"]):
 * Software Engineer 261313, 38, onshore in Queensland, Superior English, PhD earned outside Australia, partner without
 * Functional English, skills assessment completed, no experience entered. Real PDF text (production PDF route),
 * en / tr / zh-Hans, created on 1 October 2026:
 *
 *   1. No "proceed to the application" / "your profile is strong": the next step is an EOI (invitation, nomination).
 *   2. A completed skills assessment propagates: no not-yet-assessed wording anywhere; the fee is left out of the
 *      totals with the reason.
 *   3. Visa Viability Ranking: never "HIGH POTENTIAL" and "High Risk" on one row; pathways with a different gate status
 *      / friction / availability never share one figure and label; the ranking order is unchanged.
 *   4. A report created on or after every contributing source and deploy shows "Generated <creation date>", in full
 *      (not clipped) in the User Information table.
 *   5. No English test age tied to the visa grant.
 *   6. No "Low - Limited risk indicators" next to a High alert.
 *   7. Specialist education: "Not eligible — requires a degree from an Australian institution"; no 485 suggestion.
 *   8. "Eligible, but below recent invitation levels" states score, benchmark and gap (190/491 with the nomination).
 *   9. A state not available because of residence (confirmed or not) is 0% and never ranks above an available state.
 *
 *   npx tsx scripts/test-reference-report.ts
 */
import type { ReadinessReport } from "../lib/readiness/types";
import { computeEstimatedTotalAud } from "../lib/readiness/financial-roadmap-totals";
import { BANNED_CLAIMS, englishAgeTiedToGrant } from "./test-report-banned-phrases";
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
    console.log(`\n==================== ${r.id} [${L}] ====================`);

    // 1.
    const proceed = BANNED_CLAIMS.slice(-7).filter((re) => re.test(text));
    const next = { en: "your next step is submitting an EOI", tr: "bir sonraki adımınız EOI vermektir", "zh-Hans": "您的下一步是递交 EOI" }[L];
    t("1. no 'proceed to the application' / 'profile is strong'; the key finding names the EOI as the next step", proceed.length === 0 && text.includes(next), proceed.map(String).join(" | "));

    // 2.
    const stale = NOT_YET_ASSESSED[L].filter((p) => text.includes(p));
    t("2. no not-yet-assessed wording (Gantt, timeline, Skills Assessment section, confidence, evidence)", stale.length === 0, stale.join(" | "));
    const total = computeEstimatedTotalAud(report.financialRoadmap)!;
    const reason = { en: "is already completed, so its fee is not included", tr: "zaten tamamlandığı için ücreti dahil edilmedi", "zh-Hans": "已完成，其费用不计入总计" }[L];
    t("2. the skills-assessment fee is left out of the totals, and the PDF says why", total.completedKinds.includes("skills_assessment") && !total.includedKinds.includes("skills_assessment") && squash(text).includes(squash(reason)), JSON.stringify(total));

    // 3.
    const rows = report.rankedPathways?.filter((p) => ["189", "190", "491"].includes(p.subclass)) ?? [];
    const badgeTag = rows.map((p) => p.recommendationTag);
    const conflict = /HIGH POTENTIAL[^\n]*\n[^\n]*High Risk/.test(r.text) || /YÜKSEK POTANSİYEL[^\n]*\n[^\n]*Yüksek Risk/.test(r.text);
    const pct = rows.map((p) => p.matchPercentage);
    t("3. no row is 'HIGH POTENTIAL' and 'High Risk' at once; 491 / 190 / 189 (different friction) have different figures; 190 has no state available without a WA job offer, so it is high risk like 189", !conflict && new Set(pct).size === rows.length && badgeTag[0] === "🌟 Highly Recommended Pathway" && badgeTag.slice(1).every((x) => x === "⚠️ High Risk / Low Probability"), JSON.stringify(rows.map((p) => [p.subclass, p.matchPercentage, p.recommendationTag])));
    t("3. ranking order unchanged (the single ranking)", JSON.stringify(rows.map((p) => p.subclass)) === JSON.stringify(report.pathwayRanking?.entries.map((e) => e.subclass)));

    // 4.
    const generated = { en: "Generated 1 October 2026", tr: "Oluşturulma tarihi 1 Ekim 2026", "zh-Hans": "生成日期：2026年10月1日" }[L];
    t("4. created on or after every source and deploy date: 'Generated <creation date>'", squash(text).includes(squash(generated)) && !/Updated to reflect data as of|itibarıyla verilere göre güncellendi|已根据截至/.test(text), text.slice(0, 600));

    // 5.
    t("5. no English test age tied to the visa grant", !englishAgeTiedToGrant(text), englishAgeTiedToGrant(text));

    // 6.
    const limited = /Limited risk indicators|risk göstergeleri sınırlı/.test(text);
    t("6. no 'Low - Limited risk indicators' header next to a High alert", !limited);

    // 7.
    const spec = { en: "NOT ELIGIBLE — REQUIRES A DEGREE FROM AN AUSTRALIAN INSTITUTION", tr: "Uygun değil — Avustralya'daki bir kurumdan derece gerekir", "zh-Hans": "不符合条件——需持有澳大利亚院校的学位" }[L];
    const missing = { en: "INFORMATION MISSING", tr: "BİLGİ EKSİK", "zh-Hans": "信息缺失" }[L];
    const g485 = { en: "Consider 485 Graduate Visa Pathway", tr: "485 Graduate Visa Yolunu Değerlendirin", "zh-Hans": "评估485毕业生签证路径" }[L];
    // The PDF badge upper-cases with the default (non-Turkish) rules, so both sides are compared that way.
    t("7. specialist education 'Not eligible — requires a degree from an Australian institution'; no 485 suggestion", squash(text.toUpperCase()).includes(squash(spec.toUpperCase())) && !text.includes(missing) && !text.includes(g485));

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
    t("9. ACT (residence not confirmed) is 0%, like Tasmania, and no residence-blocked state ranks above an available one", act.residenceBlock === "not_confirmed" && act.score === 0 && tr.states.find((s) => s.code === "TAS")!.score === 0 && (lastAvailable < 0 || firstBlocked > lastAvailable) && /ACT 0%/.test(text), JSON.stringify(tr.states.map((s) => [s.code, s.score, s.residenceBlock ?? ""])));
  }

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
