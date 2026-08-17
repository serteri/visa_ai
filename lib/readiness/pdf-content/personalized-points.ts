import type { Locale } from "../types";

interface PointCategory {
  label: string;
  points: number;
  max: number;
  note?: string;
}

/**
 * Generates a PERSONALIZED points breakdown showing:
 * - User's name
 * - All point categories with earned vs maximum
 * - Total score vs threshold
 * - Gap analysis with improvement suggestions
 */
export function getPersonalizedPointsBreakdown(
  locale: Locale,
  country: "AU" | "CA",
  userName: string,
  estimatedPoints: number,
  breakdown: PointCategory[],
  threshold: number,
  skillsAssessmentDone: boolean | string = false,
): {
  title: string;
  userName: string;
  summary: string;
  categories: Array<{
    label: string;
    earned: number;
    max: number;
    percentage: number;
    status: "excellent" | "good" | "needs_improvement" | "missing";
    suggestion?: string;
  }>;
  totalLine: string;
  gapAnalysis: string;
  improvementTips: string[];
  additionalStrategies: string[];
} {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const gap = threshold - estimatedPoints;
  const isAssessmentDone = skillsAssessmentDone === true || skillsAssessmentDone === "yes";

  // ── Title ─────────────────────────────────────────────────────────────
  const title = isTr
    ? `${userName} — Puan Dökümünüz`
    : isZh
      ? `${userName} — 您的积分明细`
      : `${userName} — Your Points Breakdown`;

  // ── Summary ───────────────────────────────────────────────────────────
  const summary = isTr
    ? `${userName}, tahmini toplam puanınız ${estimatedPoints} puandır. Hedef: ${threshold} puan. ${gap > 0 ? `${gap} puana ihtiyacınız var.` : 'Puan barajını aştınız!'}`
    : isZh
      ? `${userName}，您的预估总分为${estimatedPoints}分。目标：${threshold}分。${gap > 0 ? `您还需要${gap}分。` : '您已超过积分门槛！'}`
      : `${userName}, your estimated total is ${estimatedPoints} points. Target: ${threshold} points. ${gap > 0 ? `You need ${gap} more points.` : 'You have exceeded the points threshold!'}`;

  // ── Categories ────────────────────────────────────────────────────────
  const categories = breakdown.map((cat) => {
    const percentage = cat.max > 0 ? Math.round((cat.points / cat.max) * 100) : 0;
    let status: "excellent" | "good" | "needs_improvement" | "missing";
    let suggestion: string | undefined;

    if (cat.points === 0) {
      status = "missing";
      suggestion = isTr
        ? `${cat.label} kategorisinde hiç puan yok. Bu alanı güçlendirin.`
        : isZh
          ? `${cat.label}类别未获得任何积分。建议加强此方面。`
          : `No points in ${cat.label}. This area needs attention.`;
    } else if (percentage >= 80) {
      status = "excellent";
    } else if (percentage >= 50) {
      status = "good";
    } else {
      status = "needs_improvement";
      suggestion = isTr
        ? `${cat.label}: ${cat.points}/${cat.max} puan. Daha fazla puan kazanmak için ${cat.max - cat.points} puan daha var.`
        : isZh
          ? `${cat.label}：${cat.points}/${cat.max}分。还有${cat.max - cat.points}分可以争取。`
          : `${cat.label}: ${cat.points}/${cat.max} pts. ${cat.max - cat.points} more points available.`;
    }

    return {
      label: cat.label,
      earned: cat.points,
      max: cat.max,
      percentage,
      status,
      suggestion,
    };
  });

  // ── Total Line ────────────────────────────────────────────────────────
  const totalLine = isTr
    ? `TOPLAM: ${estimatedPoints} / ${threshold} puan`
    : isZh
      ? `总分：${estimatedPoints} / ${threshold} 分`
      : `TOTAL: ${estimatedPoints} / ${threshold} points`;

  // ── Gap Analysis ──────────────────────────────────────────────────────
  const gapAnalysis = gap > 0
    ? (isTr
        ? `${userName}, ${gap} puanlık bir fark var. En hızlı artırma yolları dil seviyenizi yükseltmek veya eyalet adaylığı almaktır.`
        : isZh
          ? `${userName}，您还差${gap}分。最快的方式是提高语言分数或获得州提名。`
          : `${userName}, you have a ${gap}-point gap. The fastest ways to improve are upgrading your English score or obtaining state nomination.`)
    // Hard gate, matching lib/readiness/pdf-content/personalized-overview.ts:
    // a score at/above threshold is not itself a green light without a
    // positive Skills Assessment -- DHA won't accept an EOI at any score
    // without one, so the congratulatory line would be legally false here.
    : !isAssessmentDone
      ? (isTr
          ? `${userName}, potansiyel puanınız barajı aşıyor. Ancak bu puanları resmi olarak talep edip başvuru yapabilmek için olumlu bir Beceri Değerlendirmesi zorunludur.`
          : isZh
            ? `${userName}，您的潜在积分已超过门槛。但是，要正式主张这些积分并提交申请，必须获得积极的技能评估结果。`
            : `${userName}, your potential score exceeds the threshold. However, a positive Skills Assessment is mandatory to officially claim these points and lodge an application.`)
      : (isTr
          ? `${userName}, puan barajını aştınız! Şimdi başvuru sürecine odaklanabilirsiniz.`
          : isZh
            ? `${userName}，您已超过积分门槛！现在可以专注于申请流程。`
            : `${userName}, you have exceeded the points threshold! You can now focus on the application process.`);

  // ── Improvement Tips ──────────────────────────────────────────────────
  const improvementTips: string[] = [];

  const englishCat = categories.find((c) => c.label.toLowerCase().includes("english") || c.label.toLowerCase().includes("dil") || c.label.toLowerCase().includes("语言"));
  if (englishCat && englishCat.status !== "excellent") {
    improvementTips.push(
      isTr ? "Dil puanınızı yükseltin: Superior (IELTS 8.0) +20 puan ekler."
        : isZh ? "提高语言分数：优秀级别（雅思8.0）可获得+20分加分。"
        : "Improve English: Superior level (IELTS 8.0) adds +20 points.",
    );
  }

  if (country === "AU") {
    improvementTips.push(
      isTr ? "Eyalet adaylığı: Subclass 190 +5 puan, 491 +15 puan ekler."
        : isZh ? "州提名：190子类别+5分，491子类别+15分加分。"
        : "State nomination: Subclass 190 adds +5, 491 adds +15 points.",
    );
  }

  if (country === "CA") {
    improvementTips.push(
      isTr ? "PNP adaylığı: +600 CRS puanı ekler (neredeyse garanti davet)."
        : isZh ? "省提名：可获得+600 CRS积分（几乎确保获邀）。"
        : "Provincial nomination: Adds +600 CRS points (virtually guarantees invitation).",
    );
  }

  // ── Additional Improvement Strategies ─────────────────────────────────
  const additionalStrategies = isTr
    ? [
        "NAATI sertifikası: +5 puan (çift dil kanıtı)",
        "Profesyonel yıl programı: +5 puan (Avustralya'da eğitim)",
        "Bölgesel çalışma/yaşama: +5-15 puan",
        "İş teklifi: +5-15 puan (LMIA ile)",
        "Yüksek lisans/doktora: +10-20 puan",
      ]
    : isZh
      ? [
          "NAATI证书：+5分（双语证明）",
          "职业年项目：+5分（澳大利亚学习）",
          "偏远地区学习/居住：+5-15分",
          "工作邀请：+5-15分（需LMIA）",
          "硕士/博士学位：+10-20分",
        ]
      : [
          "NAATI certification: +5 pts (bilingual evidence)",
          "Professional Year program: +5 pts (Australian study)",
          "Regional study/living: +5-15 pts",
          "Job offer: +5-15 pts (with LMIA)",
          "Masters/PhD degree: +10-20 pts",
        ];

  return {
    title,
    userName,
    summary,
    categories,
    totalLine,
    gapAnalysis,
    improvementTips,
    additionalStrategies,
  };
}
