import type { Locale, FinancialRoadmapItem } from "../types";
import { computeEstimatedTotalAud, findFinancialRoadmapItem } from "../financial-roadmap-totals";

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
 * Optional assessment authority data for dynamic FAQ content.
 */
interface AssessmentAuthorityData {
  authorityId?: string;
  authorityName?: string;
  authorityNote?: string;
}

/**
 * Generates PERSONALIZED FAQ based on the user's specific situation.
 * Questions adapt to their occupation, country, and current status.
 * If an assessingAuthority is provided, answers include authority-specific details.
 */
export function getPersonalizedFaq(
  locale: Locale,
  country: Country,
  profile: UserProfile,
  estimatedPoints: number,
  threshold: number,
  skillsAssessmentDone: boolean,
  assessingAuthority?: AssessmentAuthorityData | null,
  /**
   * Canonical assessmentState.isEoiEligible. CA has no "Skills Assessment"
   * concept and no fixed CRS pass/fail threshold (see engine.ts's
   * buildCanadaPointsEstimate) -- for CA this is the ONLY meaningful
   * blocking signal (the language-test gate). Optional for AU backward
   * compatibility, where it falls back to skillsAssessmentDone.
   */
  isEoiEligible?: boolean,
  /**
   * The report's own Financial Roadmap line items. When present for AU
   * (tagged with `kind`), the cost-question answer below reads the VAC,
   * skills-assessment fee, and English-test cost -- and the "Total" -- from
   * these SAME figures instead of maintaining its own separately hardcoded
   * numbers, so this section can never drift out of sync with the
   * Financial Roadmap section shown elsewhere in the same report (Phase 1
   * report consistency fix, items D1/D2/D3).
   */
  financialRoadmap?: FinancialRoadmapItem[],
): {
  title: string;
  items: Array<{ question: string; answer: string }>;
} {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const isCA = country === "CA";
  const gap = threshold - estimatedPoints;
  const requirementMet = isCA ? (isEoiEligible ?? true) : skillsAssessmentDone;

  const items: Array<{ question: string; answer: string }> = [];

  // ── Occupation-specific question ──────────────────────────────────────
  if (profile.occupation) {
    // Build dynamic answer using assessingAuthority data when available
    const authorityName = assessingAuthority?.authorityName ?? null;
    const authorityNote = assessingAuthority?.authorityNote ?? null;
    let answerEn = `Assessment for ${profile.occupation}`;
    if (authorityName) {
      answerEn += ` is handled by ${authorityName}.`;
    } else {
      answerEn += ` is done by the relevant assessing authority.`;
    }
    if (authorityNote) {
      answerEn += ` ${authorityNote}`;
    } else {
      answerEn += ` The process typically takes 8-12 weeks. Required documents include employment reference letters, qualification certificates, and passport.`;
    }

    let answerTr = `${profile.occupation} mesleği`;
    if (authorityName) {
      answerTr += ` değerlendirmesi ${authorityName} tarafından yürütülür.`;
    } else {
      answerTr += ` için değerlendirmeyi ilgili kurum yapar.`;
    }
    if (authorityNote) {
      answerTr += ` ${authorityNote}`;
    } else {
      answerTr += ` Değerlendirme süreci 8-12 hafta sürer. Gerekli belgeler: iş deneyimi mektupları, diploma, pasaport.`;
    }

    let answerZh = `${profile.occupation}职业`;
    if (authorityName) {
      answerZh += `的评估由${authorityName}完成。`;
    } else {
      answerZh += `的评估由相关机构完成。`;
    }
    if (authorityNote) {
      answerZh += `${authorityNote}`;
    } else {
      answerZh += `评估过程需要8-12周。所需文件：工作经验证明信、学位证书、护照。`;
    }

    items.push({
      question: isCA
        ? (isTr
            ? `${profile.occupation} mesleği için ECA değerlendirmesi nasıl yapılır?`
            : isZh
              ? `如何为${profile.occupation}职业进行 ECA 认证？`
              : `How do I get an ECA for ${profile.occupation}?`)
        : (isTr
            ? `${profile.occupation} mesleği için beceri değerlendirmesi nasıl yapılır?`
            : isZh
              ? `如何为${profile.occupation}职业进行技能评估？`
              : `How do I get a skills assessment for ${profile.occupation}?`),
      answer: isCA
        ? (isTr
            ? "Kanada Express Entry için yurtdışı eğitim belgelerinizin ECA (Eğitim Denkliği) değerlendirmesi gereklidir. WES (World Education Services) en yaygın kullanılan değerlendirme kuruluşudur."
            : isZh
              ? "加拿大 Express Entry 需要对海外学历进行 ECA（教育资历评估）认证。WES（世界教育服务）是最常用的评估机构。"
              : "For Canada Express Entry, your foreign education documents require an ECA (Educational Credential Assessment). WES (World Education Services) is the most commonly used assessment body.")
        : (isTr ? answerTr : isZh ? answerZh : answerEn),
    });
  }

  // ── Points-specific question ──────────────────────────────────────────
  // CA has no fixed CRS pass/fail threshold -- invitation cutoffs vary by
  // draw, so a "you are N points below 65" framing does not apply.
  if (isCA) {
    items.push({
      question: isTr
        ? "CRS puanımı nasıl artırabilirim?"
        : isZh
          ? "我该如何提高 CRS 分数？"
          : "How can I improve my CRS score?",
      answer: isTr
        ? "En hızlı yollar: 1) Dil seviyenizi yükseltin (CLB 9+ önemli puan ekler), 2) PNP eyalet adaylığı alın (+600 puan), 3) Kanada iş deneyimi kazanın, 4) İkinci resmi dilde (Fransızca) yeterlilik kazanın."
        : isZh
          ? "最快的方法：1）提高语言水平（CLB 9 及以上可大幅加分），2）获得 PNP 省提名（+600分），3）积累加拿大工作经验，4）掌握第二官方语言（法语）。"
          : "Fastest ways: 1) Improve your language score (CLB 9+ adds significant points), 2) Get a PNP provincial nomination (+600 points), 3) Gain Canadian work experience, 4) Gain proficiency in the second official language (French).",
    });
  } else if (gap > 0) {
    items.push({
      question: isTr
        ? `Puanım yetersiz (${estimatedPoints}/${threshold}). Ne yapmalıyım?`
        : isZh
          ? `我的积分不足（${estimatedPoints}/${threshold}）。我该怎么办？`
          : `My points are insufficient (${estimatedPoints}/${threshold}). What should I do?`,
      answer: isTr
        ? `${gap} puanlık kapatılacak. En hızlı yollar: 1) Dil seviyenizi yükseltin (+20 puan), 2) Eyalet adaylığı alın, 3) Daha fazla iş deneyimi edinin.`
        : isZh
          ? `您需要弥补${gap}分的差距。最快的方法：1）提高语言分数（+20分），2）获得州提名，3）增加工作经验。`
          : `You need to close a ${gap}-point gap. Fastest ways: 1) Improve English (+20 pts), 2) Get state nomination, 3) Gain more work experience.`,
    });
  }

  // ── Blocking-requirement question (Skills Assessment for AU, language
  // test for CA -- CA has no "Skills Assessment" concept) ───────────────
  if (!requirementMet) {
    items.push({
      question: isCA
        ? (isTr
            ? "Geçerli bir dil testi sonucu olmadan Express Entry profili oluşturabilir miyim?"
            : isZh
              ? "没有有效的语言考试成绩可以创建 Express Entry 档案吗？"
              : "Can I create an Express Entry profile without a valid language test result?")
        : (isTr
            ? "Beceri değerlendirmesi yapmadan başvuru yapabilir miyim?"
            : isZh
              ? "不进行技能评估可以提交申请吗？"
              : "Can I apply without a skills assessment?"),
      answer: isCA
        ? (isTr
            ? "Hayır, CEC/FSW/FSTP dahil hiçbir Express Entry programı için geçerli bir dil testi sonucu (IELTS General, CELPIP veya TEF Canada) olmadan profil oluşturamazsınız. Bu zorunlu bir adımdır."
            : isZh
              ? "不可以，无论是 CEC、FSW 还是 FSTP，任何 Express Entry 项目都要求提供有效的语言考试成绩（IELTS General、CELPIP 或 TEF Canada）才能创建档案。这是必要步骤。"
              : "No, you cannot create a profile for any Express Entry program (CEC, FSW, or FSTP) without a valid language test result (IELTS General, CELPIP, or TEF Canada). This is mandatory.")
        : (isTr
            ? "Hayır, beceri değerlendirmesi olmadan Avustralya skilled migration başvurusu yapamazsınız. Bu zorunlu bir adımdır."
            : isZh
              ? "不可以，没有技能评估结果无法提交澳大利亚技术移民申请。这是必要步骤。"
              : "No, you cannot apply for Australian skilled migration without a skills assessment. This is mandatory."),
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
  // AU: reads the VAC, skills-assessment fee, English-test cost and total
  // directly from the report's own Financial Roadmap (financialRoadmap
  // param) instead of separately hardcoded figures, so this answer can
  // never disagree with the Financial Roadmap section shown elsewhere in
  // the same report. Falls back to a locale/authority-agnostic sentence
  // (no invented numbers) only if the Financial Roadmap data isn't
  // available to this call for some reason.
  const roadmap = financialRoadmap ?? [];
  const vacItem = findFinancialRoadmapItem(roadmap, "vac");
  const skillsItem = findFinancialRoadmapItem(roadmap, "skills_assessment");
  const englishItem = findFinancialRoadmapItem(roadmap, "english_test");
  const total = computeEstimatedTotalAud(roadmap);

  items.push({
    question: isTr
      ? "Başvuru sürecinin toplam maliyeti nedir?"
      : isZh
        ? "申请流程的总费用是多少？"
        : "What is the total cost of the application process?",
    answer:
      country === "AU"
        ? vacItem && skillsItem && englishItem && total
          ? isTr
              ? `Beceri değerlendirmesi (${skillsItem.category.replace(/^Beceri Değerlendirmesi\s*—?\s*/, "") || "ilgili kurum"}): ${skillsItem.amountLabel}. Dil testi: ${englishItem.amountLabel}. Başvuru ücreti (VAC): ${vacItem.amountLabel}. Tahmini toplam (ana başvurucu): AUD ${total.min.toLocaleString("tr-TR")}-${total.max.toLocaleString("tr-TR")}.`
            : isZh
              ? `技能评估（${skillsItem.category.replace(/^Skills Assessment\s*—?\s*/, "") || "相关机构"}）：${skillsItem.amountLabel}。语言考试：${englishItem.amountLabel}。申请费（VAC）：${vacItem.amountLabel}。预计总计（主申请人）：AUD ${total.min.toLocaleString("en-AU")}-${total.max.toLocaleString("en-AU")}。`
              : `Skills assessment (${skillsItem.category.replace(/^Skills Assessment\s*—?\s*/, "") || "relevant authority"}): ${skillsItem.amountLabel}. Language test: ${englishItem.amountLabel}. Application fee (VAC): ${vacItem.amountLabel}. Estimated total (primary applicant): AUD ${total.min.toLocaleString("en-AU")}-${total.max.toLocaleString("en-AU")}.`
          : isTr
            ? "Toplam maliyet; beceri değerlendirmesi ücretiniz, dil testi ve resmi başvuru ücretine (VAC) bağlıdır -- bu Tahmini Maliyet Yol Haritası bölümünde ayrıntılı olarak gösterilmiştir."
            : isZh
              ? "总费用取决于您的技能评估费用、语言考试费用和官方申请费（VAC）——详见本报告的费用路线图部分。"
              : "Total cost depends on your skills-assessment fee, language test, and the official application fee (VAC) -- see the Financial Roadmap section of this report for the full breakdown."
        : isTr
          ? "ECA: 200-300 CAD. Dil testi: 300-400 CAD. Başvuru ücreti: 1365 CAD. Toplam: 2000-3000 CAD."
          : isZh
            ? "ECA：200-300加元。语言考试：300-400加元。申请费：1365加元。总计：2000-3000加元。"
            : "ECA: CAD 200-300. Language test: CAD 300-400. Application fee: CAD 1,365. Total: CAD 2,000-3,000.",
  });

  // ── Partner question ──────────────────────────────────────────────────
  items.push({
    question: isTr
      ? "Partnerim de başvuruya dahil edilebilir mi?"
      : isZh
        ? "我的伴侣可以一起申请吗？"
        : "Can my partner be included in the application?",
    answer: isTr
      ? "Evet, partneriniz ana başvuruya ek olarak dahil edilebilir. Ek belgeler (ilişki kanıtları) ve ücret gerekir."
      : isZh
        ? "可以，伴侣可以作为副申请人加入。需要额外材料（关系证明）和费用。"
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
      ? `İşvereninizden imzalı mektup gerekir. Mektup ${isCA ? "NOC" : "ANZSCO"} kodu, görev tanımlarını, çalışma süresini ve maaşı içermelidir.`
      : isZh
        ? `需要雇主签署的证明信。信中需包含${isCA ? "NOC" : "ANZSCO"}代码、职责描述、工作时间和薪资。`
        : `You need a signed letter from your employer. It must include ${isCA ? "NOC" : "ANZSCO"} code, duty descriptions, duration, and salary.`,
  });

  // ── Points Booster Question (AU only -- CA's equivalent "How can I
  // improve my CRS score?" item above already covers this) ─────────────
  if (!isCA && gap > 0) {
    items.push({
      question: isTr
        ? "Puanlarımı hızlıca artırabilir miyim?"
        : isZh
          ? "我能快速提高积分吗？"
          : "Can I quickly boost my points?",
      answer: isTr
        ? "Evet! En hızlı yollar: 1) Dil puanınızı yükseltin (+20-40 puan), 2) Eyalet adaylığı alın (+5 puan), 3) Ek iş deneyimi edinin (+5-15 puan)."
        : isZh
          ? "可以！最快的方法：1）提高语言分数（+20-40分），2）获得州提名（+5分），3）增加工作经验（+5-15分）。"
          : "Yes! Fastest ways: 1) Improve English (+20-40 pts), 2) Get state nomination (+5 pts), 3) Gain more work experience (+5-15 pts).",
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
