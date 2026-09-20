import type { Locale, PointsActionPlan } from "../types";
import { getPointsLevers } from "../points-action-text";

type ViabilityInput = {
  occupationTitle?: string;
  calculatedPoints: number;
  cutoffScore: number;
  roundDate: string;
  totalInvited: number;
  gap: number;
  viability: "strong" | "viable" | "borderline" | "below_threshold";
  hasSkillsAssessment: boolean;
  /** AU: the engine's action plan -- language is only suggested when it can still add points. */
  pointsActionPlan?: PointsActionPlan;
  englishLevel?: string;
};

/**
 * Generates a "Viability Insights" section comparing the user's calculated
 * points against the most recent DHA invitation round cutoff for their
 * occupation.
 */
export function getViabilityInsights(
  locale: Locale,
  input: ViabilityInput,
): {
  title: string;
  summary: string;
  details: string[];
  recommendation: string;
} {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const occ = input.occupationTitle || (isTr ? "mesleğiniz" : isZh ? "您的职业" : "your occupation");

  // Title
  const title = isTr
    ? "Davet Geçmişine Göre Uygunluk Analizi"
    : isZh
      ? "基于邀请历史的可行性分析"
      : "Viability Insights (Based on Invitation History)";

  // Summary
  const summary = isTr
    ? `${input.calculatedPoints} puan hesapladınız. ${occ} mesleğindeki en son davet turu için minimum puan ${input.cutoffScore} idi.`
    : isZh
      ? `您的计算积分为${input.calculatedPoints}分。最近一轮${occ}邀请的最低分数线为${input.cutoffScore}分。`
      : `Your calculated score is ${input.calculatedPoints}. The most recent invitation round for ${occ} required a minimum of ${input.cutoffScore} points.`;

  // Details
  const details: string[] = [];
  const gapAbs = Math.abs(input.gap);

  if (input.gap >= 0) {
    details.push(
      isTr
        ? `✅ Puanınız tarihsel kesim puanının ${gapAbs} puan üzerindedir.`
        : isZh
          ? `✅ 您的积分高于历史分数线${gapAbs}分。`
          : `✅ Your score is ${gapAbs} points ABOVE the historical cutoff.`
    );
  } else {
    details.push(
      isTr
        ? `❌ Puanınız tarihsel kesim puanının ${gapAbs} puan altındadır.`
        : isZh
          ? `❌ 您的积分低于历史分数线${gapAbs}分。`
          : `❌ Your score is ${gapAbs} points BELOW the historical cutoff.`
    );
  }

  details.push(
    isTr
      ? `Son davet turu: ${input.roundDate} — ${input.totalInvited.toLocaleString("tr-TR")} davet gönderildi.`
      : isZh
        ? `最近邀请轮次：${input.roundDate} — 发出${input.totalInvited.toLocaleString()}份邀请。`
        : `Last round: ${input.roundDate} — ${input.totalInvited.toLocaleString()} invitations issued.`
  );

  if (input.viability === "strong") {
    details.push(
      isTr
        ? `Güçlü sinyal: Profiliniz tarihsel davet kalıplarına göre güçlü bir konumda.`
        : isZh
          ? `强势信号：根据历史邀请模式，您的档案处于有利位置。`
          : `Strong signal: Your profile is well-positioned based on historical invitation patterns.`
    );
  } else if (input.viability === "borderline") {
    details.push(
      isTr
        ? `Sınırda: Profiliniz kesim puanına yakın. Puan artışı önemli bir avantaj sağlayabilir.`
        : isZh
          ? `临界状态：您的档案接近分数线。提高积分可带来显著优势。`
          : `Borderline: Your profile is near the cutoff. Improving your score could make a significant difference.`
    );
  } else if (input.viability === "below_threshold") {
    details.push(
      isTr
        ? `Puan artışı gerekli: Tarihsel davet kalıplarına göre daha yüksek puana ihtiyacınız var.`
        : isZh
          ? `需要提分：根据历史邀请模式，您需要更高的积分。`
          : `Score improvement needed: Based on historical invitation patterns, you need a higher score.`
    );
  }

  // Recommendation
  const languageCanHelp = getPointsLevers(input.pointsActionPlan, input.englishLevel).englishGain !== null;
  let recommendation: string;
  if (input.viability === "strong") {
    recommendation = isTr
      ? "Profilinizi güçlendirmeye devam edin ve EOI'nizi hazırlayın."
      : isZh
        ? "继续加强您的档案并准备递交EOI。"
        : "Continue strengthening your profile and prepare your EOI.";
  } else if (input.viability === "viable") {
    recommendation = isTr
      ? (languageCanHelp ? "Profiliniz rekabetçi. Puan artışı için dil veya eyalet adaylığını değerlendirin." : "Profiliniz rekabetçi. Puan artışı için eyalet adaylığını değerlendirin.")
      : isZh
        ? (languageCanHelp ? "您的档案具有竞争力。考虑通过语言或州提名来提高积分。" : "您的档案具有竞争力。考虑通过州提名来提高积分。")
        : (languageCanHelp ? "Your profile is competitive. Consider improving your score through language or state nomination." : "Your profile is competitive. Consider improving your score through state nomination.");
  } else {
    recommendation = isTr
      ? (languageCanHelp ? "En hızlı puan artışı yolları: dil seviyenizi yükseltin veya bölgesel yolları (491) değerlendirin." : "En hızlı puan artışı yolu: bölgesel yolları (491) değerlendirin.")
      : isZh
        ? (languageCanHelp ? "最快的提分途径：提高语言分数或考虑偏远地区路径（491）。" : "最快的提分途径：考虑偏远地区路径（491）。")
        : (languageCanHelp ? "Fastest ways to improve: upgrade your English score or consider regional pathways (491)." : "Fastest way to improve: consider regional pathways (491).");
  }

  return { title, summary, details, recommendation };
}
