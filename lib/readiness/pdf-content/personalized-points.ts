import type { Locale, PointsActionPlan } from "../types";

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
  /**
   * Canonical assessmentState.isEoiEligible. CA has no "Skills Assessment"
   * concept and no fixed CRS pass/fail threshold (see engine.ts's
   * buildCanadaPointsEstimate) -- for CA this is the ONLY meaningful
   * blocking signal (the language-test gate), so it's required to render
   * correct CA copy. Optional for AU backward compatibility, where it
   * falls back to skillsAssessmentDone.
   */
  isEoiEligible?: boolean,
  /**
   * AU: the engine's deterministic action list (report.pointsEstimate.actionPlan).
   * Tips and gap analysis are built ONLY from it; absent on reports stored before
   * it existed, in which case no points tips are shown rather than guessed ones.
   */
  actionPlan?: PointsActionPlan,
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
  const isCA = country === "CA";
  const gap = threshold - estimatedPoints;
  const isAssessmentDone = skillsAssessmentDone === true || skillsAssessmentDone === "yes";
  // CA: isEoiEligible IS the whole story (language-test gate). AU: the
  // specific skills-assessment signal, same as before.
  const requirementMet = isCA ? (isEoiEligible ?? true) : isAssessmentDone;

  // ── Title ─────────────────────────────────────────────────────────────
  const title = isTr
    ? `${userName} — Puan Dökümünüz`
    : isZh
      ? `${userName} — 您的积分明细`
      : `${userName} — Your Points Breakdown`;

  // ── Summary ───────────────────────────────────────────────────────────
  // CA has no fixed CRS pass/fail threshold -- invitation cutoffs vary by
  // draw (see Historical Invitation Trends elsewhere in the report), so the
  // AU "Target: 65 points" / threshold-exceeded framing does not apply.
  const summary = isCA
    ? (isTr
        ? `${userName}, tahmini toplam CRS puanınız ${estimatedPoints}. Express Entry'de sabit bir asgari puan yoktur -- davet eşikleri her turda değişir. ${
            requirementMet
              ? "Dil testi gereksinimini karşıladınız."
              : "Ancak profil oluşturmadan önce geçerli bir dil testi sonucu zorunludur."
          }`
        : isZh
          ? `${userName}，您的预估 CRS 总分为 ${estimatedPoints} 分。Express Entry 没有固定的最低分数——邀请门槛因每轮抽签而异。${
              requirementMet ? "您已满足语言测试要求。" : "但在创建档案之前，必须提供有效的语言考试成绩。"
            }`
          : `${userName}, your estimated total CRS score is ${estimatedPoints}. Express Entry has no fixed minimum score -- invitation cutoffs vary by draw. ${
              requirementMet
                ? "You meet the language test requirement."
                : "However, a valid language test result is required before creating a profile."
            }`)
    : (isTr
        ? `${userName}, tahmini toplam puanınız ${estimatedPoints} puandır. Hedef: ${threshold} puan. ${
            gap > 0
              ? `${gap} puana ihtiyacınız var.`
              : isAssessmentDone
                ? gap === 0 ? "Puan barajını karşıladınız!" : "Puan barajını aştınız!"
                : "Potansiyel baraj aşıldı. Zorunlu Beceri Değerlendirmesi gereklidir."
          }`
        : isZh
          ? `${userName}，您的预估总分为${estimatedPoints}分。目标：${threshold}分。${
              gap > 0
                ? `您还需要${gap}分。`
                : isAssessmentDone
                  ? gap === 0 ? "您已达到积分门槛！" : "您已超过积分门槛！"
                  : "已达到潜在门槛。必须完成强制性技能评估。"
            }`
          : `${userName}, your estimated total is ${estimatedPoints} points. Target: ${threshold} points. ${
              gap > 0
                ? `You need ${gap} more points.`
                : isAssessmentDone
                  ? gap === 0 ? "You have met the points threshold!" : "You have exceeded the points threshold!"
                  : "Potential threshold reached. Mandatory Skills Assessment required."
            }`);

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
  // CA: no fixed target to compare against -- show the estimate on its own
  // rather than "estimatedPoints / 65", which would misrepresent 65 as a
  // real CA pass/fail line.
  const totalLine = isCA
    ? (isTr
        ? `TOPLAM: ${estimatedPoints} CRS puanı`
        : isZh
          ? `总分：${estimatedPoints} CRS 分`
          : `TOTAL: ${estimatedPoints} CRS points`)
    : (isTr
        ? `TOPLAM: ${estimatedPoints} / ${threshold} puan`
        : isZh
          ? `总分：${estimatedPoints} / ${threshold} 分`
          : `TOTAL: ${estimatedPoints} / ${threshold} points`);

  // ── Gap Analysis ──────────────────────────────────────────────────────
  const gapAnalysis = isCA
    ? (requirementMet
        ? (isTr
            ? `${userName}, dil testi gereksinimini karşıladınız. Şimdi Express Entry havuz sıralamanızı güçlendirmeye odaklanabilirsiniz.`
            : isZh
              ? `${userName}，您已满足语言测试要求。现在可以专注于提升您的 Express Entry 分数池排名。`
              : `${userName}, you meet the language test requirement. You can now focus on strengthening your Express Entry pool ranking.`)
        : (isTr
            ? `${userName}, Express Entry profili oluşturmadan önce geçerli bir dil testi sonucu zorunludur.`
            : isZh
              ? `${userName}，在创建 Express Entry 档案之前，必须提供有效的语言考试成绩。`
              : `${userName}, a valid language test result is required before creating an Express Entry profile.`))
    : (gap > 0
        ? (() => {
            // Built from the engine's action list only: English (or any other
            // factor) is named only when it can still add points.
            const top = (actionPlan?.actions ?? []).slice(0, 2).map((a) => `${a.label} (+${a.gain})`);
            if (!actionPlan) {
              return isTr
                ? `${userName}, ${gap} puanlık bir fark var.`
                : isZh
                  ? `${userName}，您还差${gap}分。`
                  : `${userName}, you have a ${gap}-point gap.`;
            }
            if (top.length === 0) {
              return isTr
                ? `${userName}, ${gap} puanlık bir fark var; puan tablosunda şu anda artırabileceğiniz başka bir faktör görünmüyor.`
                : isZh
                  ? `${userName}，您还差${gap}分；积分表中目前没有其他可以提高的因素。`
                  : `${userName}, you have a ${gap}-point gap; no other points-table factor can currently be improved.`;
            }
            return isTr
              ? `${userName}, ${gap} puanlık bir fark var. Şu anda mevcut en büyük artışlar: ${top.join("; ")}.`
              : isZh
                ? `${userName}，您还差${gap}分。目前可获得的最大加分：${top.join("；")}。`
                : `${userName}, you have a ${gap}-point gap. The largest gains currently available: ${top.join("; ")}.`;
          })()
        // Hard gate: a score at/above threshold is not itself a green light
        // without a positive Skills Assessment -- DHA won't accept an EOI at
        // any score without one, so the congratulatory line would be legally
        // false here.
        : !isAssessmentDone
          ? (isTr
              ? `${userName}, potansiyel puanınız barajı ${gap === 0 ? "karşılıyor" : "aşıyor"}. Ancak bu puanları resmi olarak talep edip başvuru yapabilmek için olumlu bir Beceri Değerlendirmesi zorunludur.`
              : isZh
                ? `${userName}，您的潜在积分已${gap === 0 ? "达到" : "超过"}门槛。但是，要正式主张这些积分并提交申请，必须获得积极的技能评估结果。`
                : `${userName}, your potential score ${gap === 0 ? "meets" : "exceeds"} the threshold. However, a positive Skills Assessment is mandatory to officially claim these points and lodge an application.`)
          : (isTr
              ? `${userName}, puan barajını ${gap === 0 ? "karşıladınız" : "aştınız"}! Şimdi başvuru sürecine odaklanabilirsiniz.`
              : isZh
                ? `${userName}，您已${gap === 0 ? "达到" : "超过"}积分门槛！现在可以专注于申请流程。`
                : `${userName}, you have ${gap === 0 ? "met" : "exceeded"} the points threshold! You can now focus on the application process.`));

  // ── Improvement Tips ──────────────────────────────────────────────────
  const improvementTips: string[] = [];

  // CA: unchanged (CLB-based wording; AU actions below do not apply).
  if (isCA) {
    const englishCat = categories.find((c) => c.label.toLowerCase().includes("english") || c.label.toLowerCase().includes("dil") || c.label.toLowerCase().includes("语言"));
    if (englishCat && englishCat.status !== "excellent") {
      improvementTips.push(
        isTr ? "Dil puanınızı yükseltin: CLB 9+ önemli CRS puanı ekler."
          : isZh ? "提高语言分数：CLB 9 及以上可显著增加 CRS 积分。"
          : "Improve your language score: CLB 9+ adds significant CRS points.",
      );
    }
  }

  // AU: one tip per action the engine says can still raise THIS applicant's
  // score, with the engine's own gain. Factors at their maximum, already
  // claimed or not applicable (e.g. English at Superior, a PhD, a single
  // applicant's partner points) never appear.
  if (country === "AU") {
    for (const action of actionPlan?.actions ?? []) {
      improvementTips.push(
        isTr ? `${action.label}: +${action.gain} puan`
          : isZh ? `${action.label}：+${action.gain}分`
          : `${action.label}: +${action.gain} pts`,
      );
    }
  }

  if (country === "CA") {
    improvementTips.push(
      isTr ? "PNP adaylığı: +600 CRS puanı ekler (neredeyse garanti davet)."
        : isZh ? "省提名：可获得+600 CRS积分（几乎确保获邀）。"
        : "Provincial nomination: Adds +600 CRS points (virtually guarantees invitation).",
    );
  }

  // ── Additional Improvement Strategies ─────────────────────────────────
  // AU-only concepts (NAATI, Professional Year, "Australian study") have no
  // CA equivalent -- CA gets its own grounded CRS-booster list instead of a
  // country ternary on the same AU-shaped items.
  const additionalStrategies: string[] = country === "AU"
    ? []
    : (isTr
        ? [
            "İkinci dil (Fransızca): CLB 7+ ile eşleştirilmiş güçlü İngilizce +50 CRS ikidillilik bonusu sağlar",
            "ECA (Eğitim Denkliği): Yurt dışı eğitim puanlarını talep etmek için gereklidir",
            "Kanada iş deneyimi: CEC uygunluğu sağlar ve önemli CRS puanı ekler",
            "Eş/partner faktörleri: Eşin dili ve eğitimi ek CRS puanı sağlayabilir",
            "Yüksek lisans/doktora: Eğitim kategorisinde ek puan sağlar",
          ]
        : isZh
          ? [
              "第二语言（法语）：与 CLB 7+ 英语搭配可获得 +50 分双语加分",
              "ECA（学历认证）：申领海外学历积分的必要条件",
              "加拿大工作经验：符合 CEC 资格并大幅增加 CRS 积分",
              "配偶因素：配偶的语言和学历可提供额外 CRS 积分",
              "硕士/博士学位：在教育类别中提供额外积分",
            ]
          : [
              "Second official language (French): CLB 7+ paired with strong English earns a +50 CRS bilingual bonus",
              "ECA (Educational Credential Assessment): required to claim points for foreign education",
              "Canadian work experience: unlocks CEC eligibility and adds significant CRS points",
              "Spouse/partner factors: your spouse's language and education can add further CRS points",
              "Master's/PhD degree: adds points in the education category",
            ]);

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
