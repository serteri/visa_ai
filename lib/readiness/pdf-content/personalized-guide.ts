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
  assessingAuthority?: string,
): {
  title: string;
  userName: string;
  personalSummary: string;
  currentStatus: string;
  nextSteps: Array<{ priority: "high" | "medium" | "low"; title: string; detail: string }>;
  timelineEstimate: string;
  detailedTimeline: string[];
  documentChecklist: string[];
  costEstimate: string[];
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
    const occupationLabel = profile.occupation || (isTr ? "mesleğiniz" : isZh ? "您的职业" : "your occupation");
    nextSteps.push({
      priority: "high",
      title: isTr ? "Beceri Değerlendirmesi Yapın" : isZh ? "完成技能评估" : "Complete Skills Assessment",
      // Names the real authority when resolved (exact ANZSCO match or fuzzy
      // title match -- see getAssessingAuthority in occupation-authority-
      // map.ts) instead of the generic "identify your assessing authority"
      // instruction, which reads as unhelpful boilerplate when the report
      // already knows the answer.
      detail: assessingAuthority
        ? (isTr
            ? `${name}, ${occupationLabel} için beceri değerlendirmesi henüz yapılmamış. Bu, vize başvurusunun zorunlu bir adımıdır. Değerlendirmeniz ${assessingAuthority} tarafından yürütülecektir -- hemen başvurun.`
            : isZh
              ? `${name}，您的职业（${occupationLabel}）尚未完成技能评估。这是签证申请的必要步骤。您的评估将由${assessingAuthority}进行——请立即申请。`
              : `${name}, skills assessment for ${occupationLabel} has not been completed yet. This is a mandatory step for your visa application. Your assessment will be conducted by ${assessingAuthority} -- apply immediately.`)
        : (isTr
            ? `${name}, ${occupationLabel} için beceri değerlendirmesi henüz yapılmamış. Bu, vize başvurusunun zorunlu bir adımıdır. İlk adımınız, resmi mevzuat aracından size özel değerlendirme kurumunu belirlemektir.`
            : isZh
              ? `${name}，您的职业（${occupationLabel}）尚未完成技能评估。这是签证申请的必要步骤。您的首要步骤是通过官方立法文件确定您的具体评估机构。`
              : `${name}, skills assessment for ${occupationLabel} has not been completed yet. This is a mandatory step for your visa application. Your first step is identifying your specific assessing authority from the official legislative instrument.`),
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

  // ── Detailed Timeline ─────────────────────────────────────────────────
  // Step 1 assumes Skills Assessment still needs to be lodged -- if the user
  // already declared it done, that step is dynamically replaced instead of
  // telling them to do something they've already completed.
  const skillsAssessmentStepTr = skillsAssessmentDone
    ? "Ay 1-2: Beceri değerlendirmesi zaten tamamlandı — doğrudan EOI oluşturmaya geçin"
    : "Ay 1-2: Beceri değerlendirmesi başvurusu ve dil testi";
  const skillsAssessmentStepZh = skillsAssessmentDone
    ? "第1-2个月：技能评估已完成——可直接进入创建EOI阶段"
    : "第1-2个月：提交技能评估申请和语言考试";
  const skillsAssessmentStepEn = skillsAssessmentDone
    ? "Month 1-2: Skills assessment already completed — proceed directly to EOI creation"
    : "Month 1-2: Skills assessment application and language test";

  const detailedTimeline = isTr
    ? [
        skillsAssessmentStepTr,
        "Ay 3-4: Değerlendirme sonuçlarını bekleme, EOI oluşturma",
        "Ay 5-8: Davet beklemesi (puanınıza bağlı)",
        "Ay 9-10: Başvuru hazırlığı ve belge toplama",
        "Ay 11-12: Başvuru sunma",
        "Ay 13-24: Değerlendirme süreci ve sonuç",
      ]
    : isZh
      ? [
          skillsAssessmentStepZh,
          "第3-4个月：等待评估结果，创建EOI",
          "第5-8个月：等待邀请（取决于积分）",
          "第9-10个月：准备申请材料",
          "第11-12个月：提交申请",
          "第13-24个月：审核过程和结果",
        ]
      : [
          skillsAssessmentStepEn,
          "Month 3-4: Wait for assessment results, create EOI",
          "Month 5-8: Wait for invitation (depends on your points)",
          "Month 9-10: Prepare application and gather documents",
          "Month 11-12: Lodge application",
          "Month 13-24: Assessment process and decision",
        ];

  // ── Document Checklist ────────────────────────────────────────────────
  const documentChecklist = isTr
    ? [
        "✅ Pasaport (geçerli)",
        "✅ Dil testi sonuçları",
        skillsAssessmentDone ? "✅ Beceri değerlendirmesi" : "❌ Beceri değerlendirmesi (gerekli)",
        "✅ İş deneyimi mektupları",
        "✅ Eğitim belgeleri",
        "⬜ Polis sabıka kayıtları",
        "⬜ Sağlık muayene raporu (davet sonrası)",
        profile.englishLevel ? "✅ Dil kanıtı" : "❌ Dil kanıtı (gerekli)",
      ]
    : isZh
      ? [
          "✅ 有效护照",
          "✅ 语言测试成绩",
          skillsAssessmentDone ? "✅ 技能评估" : "❌ 技能评估（必要）",
          "✅ 工作经验证明信",
          "✅ 学历文件",
          "⬜ 无犯罪记录证明",
          "⬜ 体检报告（获邀后）",
          profile.englishLevel ? "✅ 语言证明" : "❌ 语言证明（必要）",
        ]
      : [
          "✅ Valid passport",
          "✅ Language test results",
          skillsAssessmentDone ? "✅ Skills assessment" : "❌ Skills assessment (required)",
          "✅ Employment reference letters",
          "✅ Educational documents",
          "⬜ Police clearances",
          "⬜ Health examination (after invitation)",
          profile.englishLevel ? "✅ English evidence" : "❌ English evidence (required)",
        ];

  // ── Cost Estimate ─────────────────────────────────────────────────────
  const costEstimate = country === "AU"
    ? (isTr
        ? [
            "Beceri değerlendirmesi: AUD 500-1,200",
            "Dil testi: AUD 400-550",
            "Başvuru ücreti: AUD 4,640 (başvuran)",
            "Ek partner/çocuk: AUD 2,320 kişi başı",
            "Sağlık muayenesi: AUD 400-600",
            "Toplam tahmini: AUD 6,000-8,000",
          ]
        : isZh
          ? [
              "技能评估：500-1200澳元",
              "语言考试：400-550澳元",
              "申请费：4640澳元（主申请人）",
              "随行伴侣/子女：每人2320澳元",
              "体检：400-600澳元",
              "预计总计：6000-8000澳元",
            ]
          : [
              "Skills assessment: AUD 500-1,200",
              "Language test: AUD 400-550",
              "Application fee: AUD 4,640 (primary)",
              "Additional partner/child: AUD 2,320 each",
              "Health examination: AUD 400-600",
              "Estimated total: AUD 6,000-8,000",
            ])
    : (isTr
        ? [
            "ECA değerlendirmesi: CAD 200-300",
            "Dil testi: CAD 300-400",
            "Başvuru ücreti: CAD 1,365 (başvuran)",
            "Ek partner/çocuk: CAD 1,365 kişi başı",
            "Sağlık muayenesi: CAD 300-450",
            "Toplam tahmini: CAD 2,500-4,000",
          ]
        : isZh
          ? [
              "ECA认证：200-300加元",
              "语言考试：300-400加元",
              "申请费：1365加元（主申请人）",
              "随行伴侣/子女：每人1365加元",
              "体检：300-450加元",
              "预计总计：2500-4000加元",
            ]
          : [
              "ECA assessment: CAD 200-300",
              "Language test: CAD 300-400",
              "Application fee: CAD 1,365 (primary)",
              "Additional partner/child: CAD 1,365 each",
              "Health examination: CAD 300-450",
              "Estimated total: CAD 2,500-4,000",
            ]);

  return {
    title: isTr ? "Kişisel Başvuru Rehberiniz" : isZh ? "您的个人申请指南" : "Your Personalized Application Guide",
    userName: name,
    personalSummary: currentStatus,
    currentStatus: skillsAssessmentStatus,
    nextSteps,
    timelineEstimate,
    detailedTimeline,
    documentChecklist,
    costEstimate,
  };
}
