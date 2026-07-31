import type { Locale } from "../types";

type Country = "AU" | "CA";

interface UserProfile {
  name?: string;
  occupation?: string;
  age?: string;
  englishLevel?: string;
  mainGoal?: string;
  currentCountry?: string;
}

/**
 * Generates PERSONALIZED FAQ based on the user's specific situation.
 * Questions adapt to their occupation, country, and current status.
 */
export function getPersonalizedFaq(
  locale: Locale,
  country: Country,
  profile: UserProfile,
  estimatedPoints: number,
  threshold: number,
  skillsAssessmentDone: boolean,
): {
  title: string;
  items: Array<{ question: string; answer: string }>;
} {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const gap = threshold - estimatedPoints;

  const items: Array<{ question: string; answer: string }> = [];

  // ── Occupation-specific question ──────────────────────────────────────
  if (profile.occupation) {
    items.push({
      question: isTr
        ? `${profile.occupation} mesleği için beceri değerlendirmesi nasıl yapılır?`
        : isZh
          ? `如何为${profile.occupation}职业进行技能评估？`
          : `How do I get a skills assessment for ${profile.occupation}?`,
      answer: isTr
        ? `${profile.occupation} mesleği için değerlendirmeyi ilgili kurum yapar. Değerlendirme süreci 8-12 hafta sürer. Gerekli belgeler: iş deneyimi mektupları, diploma, pasaport.`
        : isZh
          ? `${profile.occupation}职业的评估由相关机构完成。评估过程需要8-12周。所需文件：工作经验证明信、学位证书、护照。`
          : `Assessment for ${profile.occupation} is done by the relevant authority. The process takes 8-12 weeks. Required documents: employment letters, degree, passport.`,
    });
  }

  // ── Points-specific question ──────────────────────────────────────────
  if (gap > 0) {
    items.push({
      question: isTr
        ? `Puanım yetersiz (${estimatedPoints}/${threshold}). Ne yapmalıyım?`
        : isZh
          ? `我的积分不足（${estimatedPoints}/${threshold}）。我该怎么办？`
          : `My points are insufficient (${estimatedPoints}/${threshold}). What should I do?`,
      answer: isTr
        ? `${gap} puanlık kapatılacak. En hızlı yollar: 1) Dil seviyenizi yükseltin (+20 puan), 2) ${country === 'AU' ? 'Eyalet adaylığı' : 'PNP adaylığı'} alın, 3) ${country === 'CA' ? 'Kanada iş deneyimi' : 'Daha fazla iş deneyimi'} edinin.`
        : isZh
          ? `您需要弥补${gap}分的差距。最快的方法：1）提高语言分数（+20分），2）获得${country === 'AU' ? '州提名' : 'PNP省提名'}，3）增加${country === 'CA' ? '加拿大' : ''}工作经验。`
          : `You need to close a ${gap}-point gap. Fastest ways: 1) Improve English (+20 pts), 2) Get ${country === 'AU' ? 'state' : 'provincial'} nomination, 3) Gain ${country === 'CA' ? 'Canadian' : ''} work experience.`,
    });
  }

  // ── Skills assessment question ────────────────────────────────────────
  if (!skillsAssessmentDone) {
    items.push({
      question: isTr
        ? "Beceri değerlendirmesi yapmadan başvuru yapabilir miyim?"
        : isZh
          ? "不进行技能评估可以提交申请吗？"
          : "Can I apply without a skills assessment?",
      answer: isTr
        ? "Hayır, beceri değerlendirmesi olmadan ${country === 'AU' ? 'Avustralya' : 'Kanada'} skilled migration başvurusu yapamazsınız. Bu zorunlu bir adımdır."
        : isZh
          ? "不可以，没有技能评估结果无法提交${country === 'AU' ? '澳大利亚' : '加拿大'}技术移民申请。这是必要步骤。"
          : "No, you cannot apply for ${country === 'AU' ? 'Australian' : 'Canadian'} skilled migration without a skills assessment. This is mandatory.",
    });
  }

  // ── Timeline question ─────────────────────────────────────────────────
  items.push({
    question: isTr
      ? "Başvuru süreci ne kadar sürer?"
      : isZh
        ? "申请流程需要多长时间？"
        : "How long does the application process take?",
    answer: isTr
      ? country === 'AU'
        ? "Profilinizden başvuruya 6-12 ay, başvurudan karara 6-12 ay. Toplam: 12-24 ay."
        : "Profilinizden ITA'ya 1-12 ay, ITA'dan karara 6 ay. Toplam: 6-18 ay."
      : isZh
        ? country === 'AU'
          ? "从建档到提交申请6-12个月，从申请到审核结果6-12个月。总计：12-24个月。"
          : "从建档到获邀1-12个月，从获邀到审核结果6个月。总计：6-18个月。"
        : country === 'AU'
          ? "Profile to application: 6-12 months, application to decision: 6-12 months. Total: 12-24 months."
          : "Profile to ITA: 1-12 months, ITA to decision: 6 months. Total: 6-18 months.",
  });

  // ── Cost question ─────────────────────────────────────────────────────
  items.push({
    question: isTr
      ? "Başvuru sürecinin toplam maliyeti nedir?"
      : isZh
        ? "申请流程的总费用是多少？"
        : "What is the total cost of the application process?",
    answer: isTr
      ? country === 'AU'
        ? "Beceri değerlendirmesi: 500-1200 AUD. Dil testi: 400-550 AUD. Başvuru ücreti: 4640 AUD. Toplam: 6000-7000 AUD."
        : "ECA: 200-300 CAD. Dil testi: 300-400 CAD. Başvuru ücreti: 1365 CAD. Toplam: 2000-3000 CAD."
      : isZh
        ? country === 'AU'
          ? "技能评估：500-1200澳元。语言考试：400-550澳元。申请费：4640澳元。总计：6000-7000澳元。"
          : "ECA：200-300加元。语言考试：300-400加元。申请费：1365加元。总计：2000-3000加元。"
        : country === 'AU'
          ? "Skills assessment: AUD 500-1,200. Language test: AUD 400-550. Application fee: AUD 4,640. Total: AUD 6,000-7,000."
          : "ECA: CAD 200-300. Language test: CAD 300-400. Application fee: CAD 1,365. Total: CAD 2,000-3,000.",
  });

  // ── Partner question ──────────────────────────────────────────────────
  items.push({
    question: isTr
      ? "Eşim/partnerim de başvuruya dahil edilebilir mi?"
      : isZh
        ? "我的配偶/伴侣可以一起申请吗？"
        : "Can my spouse/partner be included in the application?",
    answer: isTr
      ? "Evet, partneriniz ana başvuruya ek olarak dahil edilebilir. Ek belgeler (ilişki kanıtları) ve ücret gerekir."
      : isZh
        ? "可以，配偶/伴侣可以作为副申请人加入。需要额外材料（关系证明）和费用。"
        : "Yes, your partner can be included as a secondary applicant. Additional documents (relationship evidence) and fees apply.",
  });

  // ── Work Experience Question ──────────────────────────────────────────
  items.push({
    question: isTr
      ? "İş deneyimim nasıl doğrulanır?"
      : isZh
        ? "工作经验如何验证？"
        : "How is my work experience verified?",
    answer: isTr
      ? "İşvereninizden imzalı mektup gerekir. Mektup ANZSCO/NOC kodu, görev tanımlarını, çalışma süresini ve maaşı içermelidir."
      : isZh
        ? "需要雇主签署的证明信。信中需包含ANZSCO/NOC代码、职责描述、工作时间和薪资。"
        : "You need a signed letter from your employer. It must include ANZSCO/NOC code, duty descriptions, duration, and salary.",
  });

  // ── Points Booster Question ───────────────────────────────────────────
  if (gap > 0) {
    items.push({
      question: isTr
        ? "Puanlarımı hızlıca artırabilir miyim?"
        : isZh
          ? "我能快速提高积分吗？"
          : "Can I quickly boost my points?",
      answer: isTr
        ? "Evet! En hızlı yollar: 1) Dil puanınızı yükseltin (+20-40 puan), 2) Eyalet/PNP adaylığı alın (+5/+600 puan), 3) Ek iş deneyimi edinin (+5-15 puan)."
        : isZh
          ? "可以！最快的方法：1）提高语言分数（+20-40分），2）获得州/PNP提名（+5/+600分），3）增加工作经验（+5-15分）。"
          : "Yes! Fastest ways: 1) Improve English (+20-40 pts), 2) Get state/PNP nomination (+5/+600 pts), 3) Gain more work experience (+5-15 pts).",
    });
  }

  // ── Bridging Visa Question ────────────────────────────────────────────
  if (country === "AU") {
    items.push({
      question: isTr
        ? "Bridging visa alabilir miyim?"
        : isZh
          ? "我可以获得过桥签证吗？"
          : "Can I get a bridging visa?",
      answer: isTr
        ? "Evet, Avustralya'dayken başvurursanız Bridging Visa A alırsınız. Bu, mevcut vizeniz bittikten sonra çalışmaya devam etmenizi sağlar."
        : isZh
          ? "可以，如果您在澳大利亚境内申请，可以获得过桥签证A。这可以让您在当前签证到期后继续工作。"
          : "Yes, if you apply while in Australia, you get a Bridging Visa A. This allows you to continue working after your current visa expires.",
    });
  }

  // ── Provincial Nomination Question ────────────────────────────────────
  if (country === "CA") {
    items.push({
      question: isTr
        ? "PNP adaylığı için hangi eyaletler uygun?"
        : isZh
          ? "哪些省份适合PNP提名？"
          : "Which provinces are suitable for PNP nomination?",
      answer: isTr
        ? "Her eyaletin kendi kriterleri vardır. Ontario, BC, Alberta en popüler olanlardır. Profilinize en uygun eyaleti belirlemek için danışmanınıza danışın."
        : isZh
          ? "每个省有自己的标准。安大略省、BC省、阿尔伯塔省是最受欢迎的。请咨询顾问确定最适合您档案的省份。"
          : "Each province has its own criteria. Ontario, BC, and Alberta are the most popular. Consult an advisor to determine the best province for your profile.",
    });
  }

  // ── Appeal Question ───────────────────────────────────────────────────
  items.push({
    question: isTr
      ? "Başvurum reddedilirse ne yapabilirim?"
      : isZh
        ? "如果申请被拒，我该怎么办？"
        : "What if my application is refused?",
    answer: isTr
      ? "Reddetme mektubundaki nedenlere göre hareket edin. Temyiz (merit review) veya idari inceleme yolları mevcuttur. Profesyonel yardım almanız önerilir."
      : isZh
        ? "请根据拒签信中的原因采取行动。有行政复审或司法审查途径。建议寻求专业帮助。"
        : "Act on the reasons stated in your refusal letter. Merit review and judicial review options are available. Professional help is recommended.",
  });

  // ── Processing Time Question ──────────────────────────────────────────
  items.push({
    question: isTr
      ? "Başvuru süresini hızlandırabilir miyim?"
      : isZh
        ? "我能加快申请进度吗？"
        : "Can I speed up the processing time?",
    answer: isTr
      ? "Maalesef başvuru hızlandırılamaz. Ancak eksiksiz ve doğru belgeler sunarak gecikmeleri önleyebilirsiniz."
      : isZh
        ? "很遗憾，申请无法加速。但提交完整准确的文件可以避免延误。"
        : "Unfortunately, processing cannot be expedited. However, submitting complete and accurate documents prevents delays.",
  });

  return {
    title: isTr ? "Sizin İçin Önemli Sorular" : isZh ? "对您重要的问题" : "Questions Relevant to You",
    items,
  };
}
