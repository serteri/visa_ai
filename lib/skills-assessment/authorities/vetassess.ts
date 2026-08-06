import type { SkillsAssessmentAuthority, LocalizedString } from "../types";

/**
 * Vocational Education and Training Assessment Services (VETASSESS)
 * Source: "Am I Eligible to Apply with My Professional Occupation" + Trade Skills Assessment guides
 * Verified: 2026-08-04
 *
 * Multilanguage support: EN, TR, ZH-Hans
 * VETASSESS has two independent assessment services:
 *   1. Professional & Other Non-Trade — 341 occupations, standard skills assessment
 *   2. Trade Skills Assessment — licensed/non-licensed trades via TSS/OSAP programs
 */
export const vetassessAuthority: SkillsAssessmentAuthority = {
  authorityId: "VETASSESS",
  authorityName: "Vocational Education and Training Assessment Services",
  country: "AU",
  occupations: [],
  lastVerified: "2026-08-04",
  sourceDocument:
    "VETASSESS — Am I Eligible to Apply with My Professional Occupation (fees & document guide) + VETASSESS Pathway 1/Pathway 2 Trade Skills Assessment guides",
  pathways: [],
  validityPeriod: {
    years: 3,
    note: {
      en: "Renewal within 3 years of the original outcome costs a reduced renewal fee; renewal requested outside 3 years requires a full new skills assessment application.",
      tr: "Orijinal sonuçtan 3 yıl içinde yenileme, indirimli yenileme ücreti ile yapılır; 3 yıl sonra yenileme talebi için tam yeni beceri değerlendirmesi gerekir.",
      "zh-Hans": "原始结果3年内续期费用优惠；超过3年续期需提交全新的技能评估申请。",
    },
  },
  services: [
    // ── Service 1: Professional & Other Non-Trade ──────────────────────
    {
      serviceId: "professional-non-trade",
      pathways: [],
      serviceName: {
        en: "Professional & Other Non-Trade Occupations — Full Skills Assessment",
        tr: "Profesyonel ve Diğer Ticaret Dışı Meslekler — Tam Beceri Değerlendirmesi",
        "zh-Hans": "专业及其他非贸易职业 — 完整技能评估",
      },
      appliesTo: {
        en: "341 professional and other non-trade occupations",
        tr: "341 profesyonel ve diğer ticaret dışı meslek",
        "zh-Hans": "341个专业及其他非贸易职业",
      },
      fees: [
        {
          label: {
            en: "Online application (onshore, incl. GST)",
            tr: "Çevrimiçi başvuru (yurtiçi, KDV dahil)",
            "zh-Hans": "在线申请（澳洲境内，含GST）",
          },
          amountAUD: 1205.60,
        },
        {
          label: {
            en: "Online application (offshore, excl. GST)",
            tr: "Çevrimiçi başvuru (yurtdışı, KDV hariç)",
            "zh-Hans": "在线申请（澳洲境外，不含GST）",
          },
          amountAUD: 1096.0,
        },
        {
          label: {
            en: "Priority Processing Fee (onshore, incl. GST)",
            tr: "Öncelikli İşlem Ücreti (yurtiçi, KDV dahil)",
            "zh-Hans": "优先处理费（澳洲境内，含GST）",
          },
          amountAUD: 907.50,
        },
        {
          label: {
            en: "Priority Processing Fee (offshore, excl. GST)",
            tr: "Öncelikli İşlem Ücreti (yurtdışı, KDV hariç)",
            "zh-Hans": "优先处理费（澳洲境外，不含GST）",
          },
          amountAUD: 825.0,
        },
        {
          label: {
            en: "Employment only assessment (onshore, incl. GST)",
            tr: "Yalnızca istihdam değerlendirmesi (yurtiçi, KDV dahil)",
            "zh-Hans": "仅就业评估（澳洲境内，含GST）",
          },
          amountAUD: 669.90,
        },
        {
          label: {
            en: "Employment only assessment (offshore, excl. GST)",
            tr: "Yalnızca istihdam değerlendirmesi (yurtdışı, KDV hariç)",
            "zh-Hans": "仅就业评估（澳洲境外，不含GST）",
          },
          amountAUD: 609.0,
        },
        {
          label: {
            en: "Qualification and employment assessment (onshore, incl. GST)",
            tr: "Nitelik ve istihdam değerlendirmesi (yurtiçi, KDV dahil)",
            "zh-Hans": "资格和就业评估（澳洲境内，含GST）",
          },
          amountAUD: 1004.30,
        },
        {
          label: {
            en: "Qualification and employment assessment (offshore, excl. GST)",
            tr: "Nitelik ve istihdam değerlendirmesi (yurtdışı, KDV hariç)",
            "zh-Hans": "资格和就业评估（澳洲境外，不含GST）",
          },
          amountAUD: 913.0,
        },
      ],
      documentRequirements: [
        {
          en: "Resume / CV (academic studies incl. major projects, plus employment/career history).",
          tr: "Özgeçmiş (akademik çalışmalar dahil büyük projeler, ayrıca iş/kariyer geçmişi).",
          "zh-Hans": "简历/履历（包括学术研究、主要项目，以及工作/职业历史）。",
        },
        {
          en: "One recent (within 6 months) passport-sized colour photograph, not self-taken.",
          tr: "Son 6 ay içinde çekilmiş, selfie olmayan bir adet pasaport boyutunda renkli fotoğraf.",
          "zh-Hans": "一张近期（6个月内）的护照尺寸彩色照片（非自拍）。",
        },
        {
          en: "Proof of identity: 3 ID documents (min. 1 primary; combos: 2 primary + 1 secondary OR 1 primary + 2 secondary).",
          tr: "Kimlik kanıtı: 3 kimlik belgesi (en az 1 birincil; kombinasyonlar: 2 birincil + 1 ikincil VEYA 1 birincil + 2 ikincil).",
          "zh-Hans": "身份证明：3份身份证件（至少1份主要证件；组合方式：2份主要+1份次要或1份主要+2份次要）。",
        },
        {
          en: "Evidence of legal name change if applicable (statutory declarations NOT accepted).",
          tr: "Yasal isim değişikliği kanıtı (varsa) (yeminli beyanlar KABUL EDİLMEZ).",
          "zh-Hans": "法定姓名变更证明（如适用）（不接受法定声明）。",
        },
        {
          en: "Qualification award certificate (or provisional certificate / official statement of completion if not yet issued) plus complete academic transcript.",
          tr: "Nitelik ödül sertifikası (veya geçici sertifika / resmi tamamlama beyanı henüz verilmediyse)艺术artı tam akademik transkript.",
          "zh-Hans": "资格授予证书（或临时证书/未发证时的官方完成声明）加完整学术成绩单。",
        },
        {
          en: "Additional verification required for qualifications from the People's Republic of China (PRC) — see notes.",
          tr: "Çin Halk Cumhuriyeti (PRC) nitelikleri için ek doğrulama gerekir — notlara bakın.",
          "zh-Hans": "中华人民共和国学历需额外验证——详见备注。",
        },
        {
          en: "Statutory declaration permitted only to supplement official employment documentation, never as sole evidence of employment dates or payment.",
          tr: "Yeminli beyan yalnızca resmi istihdam belgelerini tamamlamak için izin verilir, iş tarihleri veya ödeme için tek kanıt olarak hiçbir zaman kabul edilmez.",
          "zh-Hans": "法定声明仅用于补充官方就业文件，永远不能作为就业日期或薪酬的唯一证据。",
        },
      ],
      notes: [
        {
          en: "Qualification must be at the AQF-comparable educational level required for the nominated occupation.",
          tr: "Nitelik, adı geçen meslek için gerekli AQF karşılaştırılabilir eğitim düzeyinde olmalıdır.",
          "zh-Hans": "学历必须达到提名职业所要求的AQF可比教育水平。",
        },
        {
          en: "An Australian Graduate Diploma (or comparable overseas postgraduate diploma) is never treated as comparable to an Australian Bachelor degree, alone or combined with underpinning sub-degree qualifications.",
          tr: "Avustralya Lisansüstü Diploması (veya karşılaştırılabilir yurtdışı lisansüstü diploması) tek başına veya alt derece niteliklerle birleştirildiğinde hiçbir zaman Avustralya Lisans Derecesi ile eşdeğer olarak değerlendirilmez.",
          "zh-Hans": "澳大利亚研究生文凭（或可比的海外研究生文凭），无论单独还是与基础副学位资格结合，均不被视为等同于澳大利亚学士学位。",
        },
        {
          en: "'Highly relevant field of study' is assessed against multiple factors: major/specialisation match, depth and breadth of study, employment outcomes of the qualification in its home country, and course requirements (thesis, major projects, internships).",
          tr: "'Yüksek düzeyde ilişkili çalışma alanı', birden fazla faktöre göre değerlendirilir: ana dal/uzmanlık eşleşmesi, çalışmanın derinliği ve genişliği, niteliğin bulunduğu ülkedeki istihdam sonuçları ve ders gereksinimleri (tez, büyük projeler, stajlar).",
          "zh-Hans": "'高度相关专业领域'根据多个因素评估：专业/方向匹配度、学习的深度和广度、资格在本国的就业成果以及课程要求（论文、大型项目、实习）。",
        },
        {
          en: "Sufficient years of highly relevant employment within the last 5 years can compensate for a qualification that is not in a highly relevant major field of study.",
          tr: "Son 5 yıl içinde yeterli yıl yüksek düzeyde ilişkili istihdam, yüksek düzeyde ilişkili ana dal alanında olmayan bir niteliği telafi edebilir.",
          "zh-Hans": "过去5年内足够的高度相关就业年限可以弥补专业非高度相关的情况。",
        },
      ],
    },
    // ── Service 2: Trade Skills Assessment ──────────────────────────────
    {
      serviceId: "trade-skills-assessment",
      pathways: [],
      serviceName: {
        en: "Trade Skills Assessment",
        tr: "Ticari Beceri Değerlendirmesi",
        "zh-Hans": "贸易技能评估",
      },
      appliesTo: {
        en: "Licensed and non-licensed trade occupations (e.g. Electrician, Plumber, Air-conditioning/Refrigeration Mechanic)",
        tr: "Lisanslı ve lisanssız ticari meslekler (ör. Elektrikçi, Tesisatçı, Klima/Soğutma Mekaniği)",
        "zh-Hans": "持证和非持证贸易职业（如电工、水管工、空调/制冷技工）",
      },
      programs: [
        {
          name: {
            en: "Temporary Skills Shortage (TSS) Skills Assessment Program",
            tr: "Geçici Beceri Kıtlığı (TSS) Beceri Değerlendirmesi Programı",
            "zh-Hans": "临时技能短缺（TSS）技能评估项目",
          },
          purpose: {
            en: "For Skills in Demand visa (temporary work) applications.",
            tr: "Talep Edilen Beceriler Vizesi (geçici çalışma) başvuruları için.",
            "zh-Hans": "用于需求技能签证（临时工作）申请。",
          },
        },
      ],
      fees: [
        {
          label: {
            en: "TSS skills assessment application fee",
            tr: "TSS beceri değerlendirmesi başvuru ücreti",
            "zh-Hans": "TSS技能评估申请费",
          },
          amountAUD: undefined,
          note: "Not stated in source document; confirm via VETASSESS portal.",
        },
      ],
      documentRequirements: [
        {
          en: "Evidence of Australian qualification(s).",
          tr: "Avustralya nitelik(leri) kanıtı.",
          "zh-Hans": "澳洲资格证明。",
        },
        {
          en: "Evidence of work experience — minimum 3 years full-time (or part-time equivalent) at the skill level required.",
          tr: "İş deneyimi kanıtı — gerekli beceri seviyesinde minimum 3 yıl tam zamanlı (veya tam zamanlı eşdeğeri).",
          "zh-Hans": "工作经验证明 — 在所需技能水平上至少3年全职（或同等兼职）。",
        },
      ],
      competencyAssessment: {
        portfolioProjectsMin: 0,
        portfolioProjectsMax: 0,
        interviewDurationMinutes: 120,
        topicAreas: [
          {
            en: "Qualification and work experience evidence review",
            tr: "Nitelik ve iş deneyimi kanıtı incelemesi",
            "zh-Hans": "资格和工作经验证明审查",
          },
          {
            en: "Technical interview",
            tr: "Teknik mülakat",
            "zh-Hans": "技术面试",
          },
        ],
      },
      notes: [
        {
          en: "Outcome for both pathways is a Skills Assessment Result Letter with a 'Suitable' or 'Not Suitable' determination.",
          tr: "Her iki yol için sonuç, 'Uygun' veya 'Uygun Değil' belirlemesi içeren bir Beceri Değerlendirme Sonucu Mektubudur.",
          "zh-Hans": "两条路径的结果均为包含'适合'或'不适合'判定的技能评估结果信。",
        },
        {
          en: "Unsuccessful applicants may apply for reassessment or review.",
          tr: "Başarısız başvurular yeniden değerlendirme veya inceleme için başvurabilir.",
          "zh-Hans": "未通过的申请人可申请重新评估或审查。",
        },
        {
          en: "Technical interview rules: arriving more than 30 minutes late cancels the interview; no reference materials or internet-connected devices allowed; interview is recorded; assessor cannot disclose results on the day.",
          tr: "Teknik mülakat kuralları: 30 dakikadan fazla geç kalınması mülakatı iptal eder; referans materyalleri veya internet bağlantılı cihazlara izin verilmez; mülakat kaydedilir; değerlendirici sonuçları aynı gün açıklayamaz.",
          "zh-Hans": "技术面试规则：迟到超过30分钟取消面试；不允许携带参考资料或联网设备；面试过程录音；评估员不得当场透露结果。",
        },
        {
          en: "Interview may be cancelled if the candidate cannot prove identity, cannot understand/answer questions in English, becomes distressed, appears unwell, becomes angry/violent, or arrives intoxicated/drugged.",
          tr: "Mülakat, aday kimliğini doğrulayamazsa, İngilizce soruları anlayamaz/cevaplayamazsa, strese girerse, hasta görünürse, sinirli/shiddetli olursa veya sarhoş/uyuşturucu etkisi altında gelirse iptal edilebilir.",
          "zh-Hans": "如果申请人无法证明身份、无法理解/回答英语问题、情绪紧张、身体不适、愤怒/暴力或醉酒/吸毒到场，面试可能被取消。",
        },
      ],
    },
  ],
  excludedEvidence: [
    {
      en: "Statutory declarations or affidavits as sole evidence of employment dates or payment (must be supported by official documentation such as tax records, signed contracts, appointment letters, job descriptions).",
      tr: "İş tarihleri veya ödemeler için tek kanıt olarak yeminli beyanlar veya yeminli ifadeler (vergi kayıtları, imzalı sözleşmeler, atama mektupları, iş tanımları gibi resmi belgelerle desteklenmelidir).",
      "zh-Hans": "作为就业日期或薪酬唯一证据的法定声明或宣誓书（必须有税务记录、签署合同、任命信、职位描述等官方文件支持）。",
    },
    {
      en: "Statutory declarations as evidence of legal name change.",
      tr: "Yasal isim değişikliği kanıtı olarak yeminli beyanlar.",
      "zh-Hans": "作为法定姓名变更证据的法定声明。",
    },
  ],
};
