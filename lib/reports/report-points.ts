/**
 * The points calculation and every scenario as arithmetic: "if this factor applied, the total would be N". Single-factor scenarios and
 * every valid combined scenario the engine lists, with the total under 189, 190 (+5 nomination) and 491 (+15 nomination). Mathematical
 * scenarios only: nothing says what anyone should do, and nothing is ordered by the applicant's data (the engine's own order of
 * the published points-table factors is kept).
 */
import { POINTS_TESTED } from "@/lib/readiness/target-visa";
import type { PointsAction, PointsBoosterScenario, ReadinessReport } from "@/lib/readiness/types";
import type { Locale } from "@/lib/readiness/types";
import { T } from "./report-text";

export type ScenarioRow = { label: string; added: string; totals: [string, string, string] };

export type PointsInfo = {
  applicable: boolean;
  breakdownHeaders: [string, string, string, string];
  breakdown: string[][];
  totalLine: string;
  totalsHeaders: string[];
  totals: string[][];
  singlesTitle: string;
  scenarioHeaders: string[];
  singles: string[][];
  combinedTitle: string;
  combined: string[][];
  note: string;
  stageNote: string;
};

const NOMINATION_IDS = new Set(["regional_nomination_491", "state_nomination_190"]);

/** The neutral name of a scenario factor (the engine words them as actions: "Obtain ...", "Reach ..."). */
function neutralName(a: Pick<PointsAction, "id" | "label">, l: Locale): string {
  const conditional = / \(conditional\)|\(koşullu\)|（有条件）|koşullu\)/.test(a.label) || /conditional|koşullu|有条件/.test(a.label);
  const years = a.label.match(/(\d+)\s*(?:years?|yıl|年)/)?.[1];
  switch (a.id as string) {
    case "english_upgrade":
      return T(l, "English test result at Superior level", "Superior düzeyinde İngilizce sınav sonucu", "英语成绩达到 Superior 级");
    case "education":
      return /PhD|Doktora|博士/.test(a.label) ? T(l, "Doctorate (PhD)", "Doktora (PhD)", "博士学位") : T(l, "The next qualification level in the points table", "Puan tablosundaki bir sonraki eğitim düzeyi", "积分表中的下一学历等级");
    case "partner_skills":
      return T(l, "Partner with Competent English and a positive skills assessment", "Competent İngilizceli ve olumlu beceri değerlendirmeli partner", "伴侣具备胜任英语且技能评估为正面");
    case "partner_english":
      return T(l, "Partner with Competent English only", "Yalnızca Competent İngilizceli partner", "伴侣仅具备胜任英语");
    case "community_language":
      return T(l, "NAATI credentialled community language (CCL)", "NAATI toplum dili (CCL) sertifikası", "NAATI 社区语言（CCL）认证");
    case "professional_year":
      return T(l, "Australian Professional Year", "Avustralya Mesleki Yıl (Professional Year)", "澳大利亚职业年（Professional Year）");
    case "overseas_employment":
      return T(l, `${years} years of skilled overseas employment`, `Yurt dışında ${years} yıl nitelikli istihdam`, `海外技术工作经验 ${years} 年`);
    case "australian_employment":
      return T(l, `${years} years of skilled Australian employment`, `Avustralya'da ${years} yıl nitelikli istihdam`, `澳大利亚技术工作经验 ${years} 年`);
    case "australian_study":
      return T(l, `Australian qualification (at least 2 academic years of study in Australia)${conditional ? ", conditional" : ""}`, `Avustralya'da yeterlilik (Avustralya'da en az 2 akademik yıl eğitim)${conditional ? ", koşullu" : ""}`, `澳大利亚学历（在澳大利亚至少学习 2 个学年）${conditional ? "，有条件" : ""}`);
    case "regional_study":
      return T(l, "Study at a designated regional campus in Australia", "Avustralya'da belirlenmiş bölgesel kampüste eğitim", "在澳大利亚指定的偏远地区校区学习");
    case "specialist_education":
      return T(l, "Specialist education (STEM doctorate or research masters from an Australian institution), conditional", "Uzmanlık eğitimi (Avustralya kurumundan STEM doktora veya araştırma yüksek lisansı), koşullu", "专业型学位（澳大利亚院校的 STEM 博士或研究型硕士），有条件");
    case "regional_nomination_491":
      return T(l, "Nomination or eligible relative sponsorship (subclass 491)", "Adaylık veya uygun akraba sponsorluğu (subclass 491)", "提名或符合条件的亲属担保（491 子类）");
    case "state_nomination_190":
      return T(l, "State or territory nomination (subclass 190)", "Eyalet veya bölge adaylığı (subclass 190)", "州或领地提名（190 子类）");
    default:
      return "";
  }
}

const SKILLS_PART = /^(?:Positive skills assessment|Olumlu beceri değerlendirmesi|获得正面技能评估)/;

function neutralCombined(s: PointsBoosterScenario, actions: PointsAction[], l: Locale): string | null {
  const byLabel = new Map(actions.map((a) => [a.label, neutralName(a, l)]));
  const out: string[] = [];
  for (const raw of s.label.split(" + ")) {
    const part = raw.trim();
    const hit = byLabel.get(part) || (SKILLS_PART.test(part) ? T(l, "Positive skills assessment (employment points counted)", "Olumlu beceri değerlendirmesi (istihdam puanları sayılır)", "正面技能评估（计入工作经验分）") : "");
    if (!hit) return null;
    out.push(hit);
  }
  return [...new Set(out)].join(" + ");
}

export function buildPointsInfo(report: ReadinessReport, l: Locale): PointsInfo {
  const pe = report.pointsEstimate;
  const applicable = report.country !== "CA" && !!pe && (pe.breakdown?.length ?? 0) > 0;
  const base = pe?.estimatedPoints;
  const breakdown = (pe?.breakdown ?? []).map((b) =>
    // A factor the visitor entered nothing for is "not assessed", never a 0.
    b.status === "not_assessed"
      ? [b.label, T(l, "not assessed", "değerlendirilmedi", "未评估"), b.max !== undefined ? String(b.max) : "", b.note || "—"]
      : [b.label, String(b.points), b.max !== undefined ? String(b.max) : "", b.max !== undefined && b.points >= b.max ? "—" : b.note || "—"],
  );
  const bonus: Record<string, number> = { "189": 0, "190": 5, "491": 15 };
  const scores = report.pathwayScores;
  const nomBonus = (sub: "189" | "190" | "491") => scores?.[sub]?.nominationBonus ?? bonus[sub];
  const totals = (POINTS_TESTED as readonly ("189" | "190" | "491")[]).map((sub) => [
    T(l, `Subclass ${sub}`, `Subclass ${sub}`, `${sub} 子类`),
    base === undefined ? "—" : String(base),
    sub === "189" ? "—" : `+${nomBonus(sub)}`,
    base === undefined ? "—" : String(base + nomBonus(sub)),
    "65",
  ]);

  const actions: PointsAction[] = pe?.actionPlan?.actions ?? [];
  const cell = (n: number | undefined, sub: "189" | "190" | "491", includesNomination: boolean) => (n === undefined ? "—" : String(n + (includesNomination ? 0 : nomBonus(sub))));
  const singles: string[][] = [];
  for (const a of actions) {
    if (NOMINATION_IDS.has(a.id as string)) continue;
    const label = neutralName(a, l);
    if (!label || base === undefined) continue;
    singles.push([label, `+${a.gain}`, cell(base + a.gain, "189", false), cell(base + a.gain, "190", false), cell(base + a.gain, "491", false)]);
  }
  if (pe?.potentialPoints !== undefined && base !== undefined && pe.potentialPoints !== base) {
    const gain = pe.potentialPoints - base;
    singles.push([T(l, "Positive skills assessment (employment points counted)", "Olumlu beceri değerlendirmesi (istihdam puanları sayılır)", "正面技能评估（计入工作经验分）"), `+${gain}`, cell(pe.potentialPoints, "189", false), cell(pe.potentialPoints, "190", false), cell(pe.potentialPoints, "491", false)]);
  }

  const combined: string[][] = [];
  for (const s of report.pointsBoosterSimulator?.scenarios ?? []) {
    if (!s.isCombined || s.requiredNominationFor || !Number.isFinite(s.resultingEstimate)) continue;
    const label = neutralCombined(s, actions, l);
    if (!label) continue;
    const total = s.resultingEstimate as number;
    const only = s.onlyForSubclass;
    const cols = (["189", "190", "491"] as const).map((sub) => (only ? (only === sub ? String(total) : "—") : cell(total, sub, false)));
    combined.push([label, `+${s.estimatedChange}`, ...cols]);
  }

  const stage = report.country === "CA" ? undefined : report.applicationStage;
  return {
    applicable,
    breakdownHeaders: [T(l, "Category", "Kategori", "类别"), T(l, "Points", "Puan", "分数"), T(l, "Max", "En çok", "上限"), T(l, "Note", "Not", "说明")],
    breakdown,
    totalLine: base === undefined ? "" : T(l, `Total from your entries: ${base} points`, `Girdiklerinizden toplam: ${base} puan`, `根据您的填写合计：${base} 分`),
    totalsHeaders: [T(l, "Visa", "Vize", "签证"), T(l, "From your entries", "Girdiklerinizden", "根据您的填写"), T(l, "Nomination points", "Adaylık puanı", "提名加分"), T(l, "Total incl. nomination", "Adaylık dahil toplam", "含提名总分"), T(l, "Published minimum", "Yayımlanmış asgari", "已公布最低分")],
    totals,
    singlesTitle: T(l, "Single-factor scenarios", "Tek faktörlü senaryolar", "单一因素情景"),
    scenarioHeaders: [T(l, "If this applied", "Bu geçerli olsaydı", "若适用"), T(l, "Points added", "Eklenen puan", "增加的积分"), T(l, "Total, 189", "Toplam, 189", "总分，189"), T(l, "Total, 190 (+5)", "Toplam, 190 (+5)", "总分，190（+5）"), T(l, "Total, 491 (+15)", "Toplam, 491 (+15)", "总分，491（+15）")],
    singles,
    combinedTitle: T(l, "Combined scenarios", "Birleşik senaryolar", "组合情景"),
    combined,
    note: T(l, "Mathematical scenarios only: each row adds the points of the published points table to the total from your entries. They describe arithmetic, not any course of action.", "Yalnızca matematiksel senaryolar: her satır, yayımlanmış puan tablosundaki puanları girdiklerinizden elde edilen toplama ekler. Aritmetiği anlatır, herhangi bir eylem biçimini değil.", "仅为数学情景：每一行把已公布积分表中的分数加到您填写所得总分上。它们只描述算术，不涉及任何行动方案。"),
    stageNote: stage === "invited" ? T(l, "You told us you have been invited or nominated; the points above are those you entered.", "Davet aldığınızı veya aday gösterildiğinizi belirttiniz; yukarıdaki puanlar girdiğiniz bilgilere dayanır.", "您表示已获邀请或提名；上述积分基于您填写的信息。") : stage === "eoi_submitted" ? T(l, "You told us an EOI is submitted; the points above are those you entered now.", "Bir EOI sunduğunuzu belirttiniz; yukarıdaki puanlar şimdi girdiğiniz bilgilere dayanır.", "您表示已提交 EOI；上述积分基于您现在填写的信息。") : "",
  };
}
