import type { Locale } from "../types";

type Country = "AU" | "CA";

interface UserProfile {
  name?: string;
  occupation?: string;
  age?: string;
  englishLevel?: string;
  mainGoal?: string;
  currentCountry?: string;
  hasGraduateVisaPathwayIntent?: boolean;
  qualificationLevel?: string;
}

/**
 * Generates a PERSONALIZED application guide based on the user's actual profile.
 * This is NOT generic content — it adapts to their specific situation.
 */
export function getPersonalizedApplicationGuide(
  locale: Locale,
  country: Country,
  profile: UserProfile,
  skillsAssessmentDone: boolean,
  pointsEstimate?: number,
): {
  title: string;
  userName: string;
  personalSummary: string;
  currentStatus: string;
  nextSteps: Array<{ priority: "high" | "medium" | "low"; title: string; detail: string }>;
  timelineEstimate: string;
} {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const name = profile.name || (isTr ? "Değerli Başvuru Sahibi" : isZh ? "尊敬的申请人" : "Applicant");

  // ── Skills Assessment Status ──────────────────────────────────────────
  const skillsAssessmentStatus = skillsAssessmentDone
    ? (isTr ? "✅ Tamamlandı" : isZh ? "✅ 已完成" : "✅ Completed")
    : (isTr ? "❌ Yapılmadı" : isZh ? "❌ 未完成" : "❌ Not Done");

  // ── Current Status Summary ────────────────────────────────────────────
  const currentStatus = isTr
    ? `${name}, mevcut profilinize göre durumunuz:\n\n` +
      `Meslek: ${profile.occupation || 'Belirtilmedi'}\n` +
      `Beceri Değerlendirmesi: ${skillsAssessmentStatus}\n` +
      `Tahmini Puan: ${pointsEstimate !== undefined ? `${pointsEstimate} pts` : 'Hesaplanamadı'}\n` +
      `Yaş: ${profile.age || 'Belirtilmedi'}\n` +
      `Dil Seviyesi: ${profile.englishLevel || 'Belirtilmedi'}`
    : isZh
      ? `${name}，根据您当前的档案，您的状态如下：\n\n` +
        `职业：${profile.occupation || '未填写'}\n` +
        `技能评估：${skillsAssessmentStatus}\n` +
        `预估积分：${pointsEstimate !== undefined ? `${pointsEstimate} 分` : '无法计算'}\n` +
        `年龄：${profile.age || '未填写'}\n` +
        `语言水平：${profile.englishLevel || '未填写'}`
      : `${name}, based on your current profile, here is your status:\n\n` +
        `Occupation: ${profile.occupation || 'Not specified'}\n` +
        `Skills Assessment: ${skillsAssessmentStatus}\n` +
        `Estimated Points: ${pointsEstimate !== undefined ? `${pointsEstimate} pts` : 'Cannot calculate'}\n` +
        `Age: ${profile.age || 'Not specified'}\n` +
        `English Level: ${profile.englishLevel || 'Not specified'}`;

  // ── Personalized Next Steps ───────────────────────────────────────────
  const nextSteps: Array<{ priority: "high" | "medium" | "low"; title: string; detail: string }> = [];

  if (!skillsAssessmentDone) {
    nextSteps.push({
      priority: "high",
      title: isTr ? "Beceri Değerlendirmesi Yapın" : isZh ? "完成技能评估" : "Complete Skills Assessment",
      detail: isTr
        ? `${profile.occupation || 'Mesleğiniz'} için beceri değerlendirmesi henüz yapılmamış. Bu, vize başvurusunun zorunlu bir adımıdır. Değerlendirme kurumunu belirleyin ve hemen başvurun.`
        : isZh
          ? `您选择的职业（${profile.occupation || '未指定'}）尚未完成技能评估。这是签证申请的必要步骤。请立即确定评估机构并提交申请。`
          : `Skills assessment for ${profile.occupation || 'your occupation'} has not been completed yet. This is a mandatory step for your visa application. Identify your assessing authority and apply immediately.`,
    });
  }

  if (pointsEstimate !== undefined && pointsEstimate < 65) {
    const gap = 65 - pointsEstimate;
    nextSteps.push({
      priority: "high",
      title: isTr ? `Puan Barajını Aşın (${gap} puan eksik)` : isZh ? `达到积分门槛（差${gap}分）` : `Reach Points Threshold (${gap} pts short)`,
      detail: isTr
        ? `Mevcut tahmini puanınız ${pointsEstimate}, asgari 65 barajının ${gap} puan altında. Puanınızı artırmak için dil seviyenizi yükseltin veya eyalet adaylığı alın.`
        : isZh
          ? `您当前的预估积分为${pointsEstimate}分，距离最低65分门槛还差${gap}分。建议提高语言分数或获得州提名来增加积分。`
          : `Your estimated score is ${pointsEstimate} points, ${gap} points below the minimum threshold of 65. Consider improving your English score or obtaining state nomination to boost your points.`,
    });
  }

  if (profile.englishLevel && !profile.englishLevel.toLowerCase().includes("superior") && !profile.englishLevel.toLowerCase().includes("advanced")) {
    nextSteps.push({
      priority: "medium",
      title: isTr ? "Dil Seviyenizi Yükseltin" : isZh ? "提高语言分数" : "Improve English Score",
      detail: isTr
        ? "Dil seviyenizi 'Superior' (IELTS 8.0 / PTE 79) seviyesine çıkarmak +20 puan kazandırabilir. Bu, puan barajını aşmada en etkili yoldur."
        : isZh
          ? "将语言水平提高到'优秀'级别（雅思8.0 / PTE 79）可获得+20分加分。这是突破积分门槛最有效的方式。"
          : "Upgrading your English to Superior level (IELTS 8.0 / PTE 79) can earn you +20 points. This is the most effective way to bridge the points gap.",
    });
  }

  if (country === "AU" && !profile.hasGraduateVisaPathwayIntent) {
    nextSteps.push({
      priority: "medium",
      title: isTr ? "485 Graduate Visa Yolunu Değerlendirin" : isZh ? "评估485毕业生签证路径" : "Consider 485 Graduate Visa Pathway",
      detail: isTr
        ? "Eğer Avustralya'da eğitim gördüyseniz, 485 Graduate Visa bir geçiş yolu olabilir. Bu size Avustralya'da çalışma deneyimi kazandırır ve puan ekler."
        : isZh
          ? "如果您在澳大利亚学习过，485毕业生签证可能是一条过渡路径。这可以让您获得澳大利亚工作经验并增加积分。"
          : "If you studied in Australia, the 485 Graduate Visa could be a pathway. It gives you Australian work experience which adds points.",
    });
  }

  nextSteps.push({
    priority: "low",
    title: isTr ? "Belgelerinizi Hazırlayın" : isZh ? "准备文件" : "Prepare Your Documents",
    detail: isTr
      ? "Şimdi tüm belgelerinizi toplamaya başlayın: pasaport, dil testi sonuçları, iş deneyimi mektupları, eğitim belgeleri, polis kayıtları."
      : isZh
        ? "现在开始收集所有文件：护照、语言测试成绩、工作经验证明信、学历文件、无犯罪记录证明。"
        : "Start gathering all documents now: passport, language test results, employment reference letters, educational documents, police clearances.",
  });

  // ── Timeline Estimate ─────────────────────────────────────────────────
  const timelineEstimate = isTr
    ? "Tahmini süre: Profilden başvuruya 6-12 ay, başvurudan karara 6-12 ay. Toplam: 12-24 ay."
    : isZh
      ? "预计时间：从建档到提交申请6-12个月，从申请到审核结果6-12个月。总计：12-24个月。"
      : "Estimated timeline: Profile to application 6-12 months, application to decision 6-12 months. Total: 12-24 months.";

  return {
    title: isTr ? "Kişisel Başvuru Rehberiniz" : isZh ? "您的个人申请指南" : "Your Personalized Application Guide",
    userName: name,
    personalSummary: currentStatus,
    currentStatus: skillsAssessmentStatus,
    nextSteps,
    timelineEstimate,
  };
}
