import type { SkillsAssessmentAuthority, LocalizedString } from "../types";
import { AIMS_FEES_SOURCE, AIMS_PROCESSING, AIMS_PROCESSING_LABEL, aimsFee, aimsRegistryFees } from "../aims-fees";

/**
 * Australian Institute of Medical Scientists (AIMS)
 * Source: AIMS "Qualification and Skills Assessments for Migration" -- web pages, the current individual guidelines
 * (GAPSQ v18.4 03/2026 for 234611/311213, GAPSQP v12.4 03/2026 for 311216), the employer-requested guidelines
 * (GEAPSQ v7.0) and the application forms, in data/knowledge/Skill Assessments/Australian Institute of Medical Scientists/.
 * Fees: src/data/skills-assessment/aims-fees.json (scripts/generate-aims-fees.ts; fee table p.18-19): outside Australia
 * excl. GST / within Australia incl. GST, tagged applicantLocation so the report quotes the applicant's.
 * Occupations: the Home Affairs skilled occupation list names AIMS for 234611, 311213 and 311216.
 * Verified: 2026-09-26
 *
 * Multilanguage support: EN, TR, ZH-Hans
 */
export const aimsAuthority: SkillsAssessmentAuthority = {
  authorityId: "AIMS",
  authorityName:
    "Australian Institute of Medical Scientists (AIMS) / Australian Institute of Medical and Clinical Scientists",
  country: "AU",
    occupations: [
    { anzscoCode: "234611", title: "Medical Laboratory Scientist" },
    { anzscoCode: "311213", title: "Medical Laboratory Technician" },
    { anzscoCode: "311216", title: "Pathology Collector" },
  ],
  assessmentContext: {
    en: "AIMS assesses individual applicants (skills and qualifications assessment for migration) and, separately, employer-requested assessments -- the latter 'not for individuals'. The report quotes the individual assessment.",
    tr: "AIMS bireysel başvuru sahiplerini (göç için beceri ve nitelik değerlendirmesi) ve ayrıca işveren talepli değerlendirmeleri yapar -- ikincisi 'bireyler için değil'. Rapor bireysel değerlendirmeyi gösterir.",
    "zh-Hans": "AIMS 为个人申请人进行（移民技能和资格）评估，另有雇主申请的评估——后者“不适用于个人”。报告显示的是个人评估。",
  },
  lastVerified: "2026-09-26",
  sourceDocument: AIMS_FEES_SOURCE.title,
  fraudPolicy: {
    en: "Application rejected and applicant banned from submitting further AIMS applications for 2 years from the date of notification of suspected fraudulent documents.",
    tr: "Başvuru reddedilir ve başvuru sahibi, şüpheli sahte belgelerin bildirim tarihinden itibaren 2 yıl boyunca başka AIMS başvurusu yapmaktan yasaklanır.",
    "zh-Hans": "申请将被拒绝，申请人自可疑欺诈文件通知之日起2年内禁止提交进一步的AIMS申请。",
  },
  validityPeriod: {
    years: 3,
    note: {
      en: "Valid for 3 years from the date of the original Stage 1 Skills Assessment Results Letter. Amendment (not renewal) is possible only with evidence of experience/qualifications obtained BEFORE the original assessment date; evidence obtained after requires a brand new full application and fee.",
      tr: "Orijinal Aşama 1 Beceri Değerlendirme Sonuç Mektubunun tarihinden itibaren 3 yıl geçerlidir. Düzeltme (yenileme değil) yalnızca orijinal değerlendirme tarihinden ÖNCE edinilen deneyim/nitelik kanıtıyla mümkündür; sonrasında edinilen kanıtlar için tamamen yeni bir başvuru ve ücret gerekir.",
      "zh-Hans": "自原始第一阶段技能评估结果信之日起3年内有效。修正（非续期）仅在提供原评估日期之前获得的经验/资格证据时可能；之后获得的证据需要全新的完整申请和费用。",
    },
  },
  processingTime: {
    standardWeeks: AIMS_PROCESSING.employerRequested.weeks,
    note: {
      en: `Individual applicants: AIMS aims to complete assessments within ${AIMS_PROCESSING.individual.months} months of receipt; document verification may extend it (pp.${AIMS_PROCESSING.individual.pages.join(", ")}). Employer-requested assessments: up to ${AIMS_PROCESSING.employerRequested.weeks} weeks (p.${AIMS_PROCESSING.employerRequested.page}).`,
      tr: `Bireysel başvurular: AIMS değerlendirmeleri alındıktan sonra ${AIMS_PROCESSING.individual.months} ay içinde tamamlamayı hedefler; belge doğrulaması uzatabilir (s.${AIMS_PROCESSING.individual.pages.join(", ")}). İşveren talepli değerlendirmeler: ${AIMS_PROCESSING.employerRequested.weeks} haftaya kadar (s.${AIMS_PROCESSING.employerRequested.page}).`,
      "zh-Hans": `个人申请：AIMS 力争在收到后 ${AIMS_PROCESSING.individual.months} 个月内完成评估，文件核实可能延长（第 ${AIMS_PROCESSING.individual.pages.join("、")} 页）。雇主申请的评估：最长 ${AIMS_PROCESSING.employerRequested.weeks} 周（第 ${AIMS_PROCESSING.employerRequested.page} 页）。`,
    },
  },
  reviewAndAppeal: {
    review: {
      feeAUD: 0,
      windowMonths: 1,
      note: {
        en: "Written request via email within 1 month of receiving the Stage 1 Skills Assessment Results Letter. Conducted by the same committee that made the original assessment. Free of charge.",
        tr: "Aşama 1 Beceri Değerlendirme Sonuç Mektubunu aldıktan sonra 1 ay içinde e-posta ile yazılı talep. Orijinal değerlendirmeyi yapan komite tarafından yürütülür. Ücretsizdir.",
        "zh-Hans": "在收到第一阶段技能评估结果信后1个月内通过电子邮件提出书面请求。由做出原始评估的委员会进行。免费。",
      },
    },
    appeal: {
      windowMonths: 1,
      note: {
        en: `Written request within 1 month of receiving the Stage 1 AIMS Review Results Letter. Conducted by a different committee than the original assessment. Fee: AUD ${aimsFee("aims_appeal").outsideAustraliaExclGstAud} outside Australia / AUD ${aimsFee("aims_appeal").withinAustraliaInclGstAud} within Australia incl. GST (p.${aimsFee("aims_appeal").page}).`,
        tr: `Aşama 1 AIMS İnceleme Sonuç Mektubunu aldıktan sonra 1 ay içinde yazılı talep. Orijinal değerlendirmeden farklı bir komite tarafından yürütülür. Ücret: Avustralya dışında AUD ${aimsFee("aims_appeal").outsideAustraliaExclGstAud} / Avustralya içinde KDV dahil AUD ${aimsFee("aims_appeal").withinAustraliaInclGstAud} (s.${aimsFee("aims_appeal").page}).`,
        "zh-Hans": `在收到第一阶段AIMS审查结果信后1个月内提出书面请求。由与原始评估不同的委员会进行。费用：澳洲境外 AUD ${aimsFee("aims_appeal").outsideAustraliaExclGstAud} / 澳洲境内含 GST AUD ${aimsFee("aims_appeal").withinAustraliaInclGstAud}（第 ${aimsFee("aims_appeal").page} 页）。`,
      },
    },
  },
  fees: aimsRegistryFees("aims_assessment_mls_mlt", { en: "Skills and qualifications assessment", tr: "Beceri ve nitelik değerlendirmesi", "zh-Hans": "技能和资格评估" }),
  englishRequirements: [
    {
      test: "IELTS (Academic or General Training)",
      minimumScore: "7.0 all 4 components",
    },
    {
      test: "TOEFL iBT",
      minimumScore: "24 listening / 24 reading / 27 writing / 23 speaking (total ≥98)",
    },
    {
      test: "PTE Academic",
      minimumScore:
        "65 all 4 components; must be submitted online directly by the test-taker to AIMS",
    },
    {
      test: "Occupational English Test (OET)",
      minimumScore:
        "Grade B or ≥350 each component; must have been completed in Medicine, Nursing, Dentistry, Pharmacy, or Veterinary Science to be considered relevant by AIMS",
    },
    {
      test: "Cambridge C1 Advanced",
      minimumScore: "185 all 4 components",
    },
  ],
  englishTestValidity: {
    en: "Must be received by AIMS, with the skills assessment application, within 3 years of the test date. No exemptions of any kind — mandatory for all applicants.",
    tr: "Beceri değerlendirme başvurusuyla birlikte, test tarihinden itibaren 3 yıl içinde AIMS tarafından alınmalıdır. Hiçbir muafiyet yoktur — tüm başvurular için zorunludur.",
    "zh-Hans": "必须在测试日期后3年内与技能评估申请一起由AIMS收到。没有任何豁免——对所有申请人都是强制性的。",
  },
  englishExemptions: [],
  pathways: [
    // ── MLS Option 1: AIMS Accredited Degree ───────────────────────────
    {
      pathwayId: "MLS_OPTION_1",
      occupation: "Medical Laboratory Scientist — ANZSCO 234611",
      name: {
        en: "Option 1 — AIMS Accredited Degree",
        tr: "Seçenek 1 — AIMS Akredite Derece",
        "zh-Hans": "选项1 — AIMS认证学位",
      },
      eligibleFor: [
        {
          en: "Completed an AIMS-accredited bachelor's or master's program (see AIMS Accredited University Programs list)",
          tr: "AIMS akredite lisans veya yüksek lisans programı tamamlanmış olmalı (AIMS Akredite Üniversite Programları listesine bakın)",
          "zh-Hans": "完成AIMS认证的学士或硕士课程（见AIMS认证大学课程列表）",
        },
      ],
      examRequired: false,
      fees: aimsRegistryFees("aims_assessment_mls_mlt", { en: "Assessment fee", tr: "Değerlendirme ücreti", "zh-Hans": "评估费" }),
      processingTimeWeeks: { standard: AIMS_PROCESSING.individual.months * 4, label: AIMS_PROCESSING_LABEL },
      documentRequirements: [],
      notes: [
        {
          en: "Applicant's units must comply with the AIMS-accredited subject pathway held on file at the university — verify with the program co-ordinator if uncertain.",
          tr: "Başvuranın dersleri, üniversitede kayıtlı AIMS akredite ders yoluna uygun olmalıdır — emin değilseniz program koordinatörüyle doğrulayın.",
          "zh-Hans": "申请人的课程必须符合大学存档的AIMS认证科目路径——如有疑问请与项目协调员核实。",
        },
      ],
    },
    // ── MLS Option 2: Acceptable Science Degree + Professional Exam ─────
    {
      pathwayId: "MLS_OPTION_2",
      occupation: "Medical Laboratory Scientist — ANZSCO 234611",
      name: {
        en: "Option 2 — Acceptable Science Degree + Professional Examination",
        tr: "Seçenek 2 — Kabul Edilebilir Bilim Derecesi + Mesleki Sınav",
        "zh-Hans": "选项2 — 合格科学学位 + 专业考试",
      },
      eligibleFor: [
        {
          en: "AQF level 7/8/9 science degree covering AIMS foundation subjects plus advanced studies in ≥2 professional disciplines",
          tr: "AIMS temel derslerini kapsayan AQF 7/8/9 bilim derecesi + ≥2 mesleki disiplinde ileri düzey çalışmalar",
          "zh-Hans": "涵盖AIMS基础科目的AQF 7/8/9级科学学位，加上≥2个专业学科的高级研究",
        },
        {
          en: "Minimum 2 years full-time postgraduate professional experience in a medical pathology laboratory, at least 1 year within the 5 years immediately prior to application",
          tr: "Tıbbi patoloji laboratuvarında minimum 2 yıl tam zamanlı lisansüstü mesleki deneyim, başvurudan hemen önceki 5 yıl içinde en az 1 yıl",
          "zh-Hans": "在医学病理实验室至少2年全职研究生专业经验，申请前5年内至少1年",
        },
      ],
      examRequired: true,
      examDetails: {
        name: {
          en: "AIMS Medical Laboratory Scientist Professional Examination",
          tr: "AIMS Tıbbi Laboratuvar Bilimcisi Mesleki Sınavı",
          "zh-Hans": "AIMS医学实验室科学家专业考试",
        },
        format: {
          en: "150 single-response MCQ, 3 hours, online remote-proctored",
          tr: "150 tek yanıt MCQ, 3 saat, çevrimiçi uzaktan gözetimli",
          "zh-Hans": "150道单选题MCQ，3小时，在线远程监考",
        },
        sittings: {
          en: "Twice yearly — March and September",
          tr: "Yılda iki kez — Mart ve Eylül",
          "zh-Hans": "每年两次 — 三月和九月",
        },
        sections: [
          { discipline: "Anatomical Pathology", questions: 14, mustPass: true },
          { discipline: "Chemical Pathology", questions: 30, mustPass: true },
          { discipline: "Genomic Pathology", questions: 16, mustPass: false },
          { discipline: "Haematology", questions: 30, mustPass: true },
          { discipline: "Immunopathology", questions: 14, mustPass: false },
          { discipline: "Medical Microbiology", questions: 26, mustPass: true },
          { discipline: "Transfusion Science", questions: 20, mustPass: true },
        ],
        passRequirement: {
          en: "≥80/150 correct overall AND ≥50% in each asterisked (must-pass) discipline",
          tr: "Toplamda ≥80/150 doğru VE yıldızlı (geçmek zorunlu) her disiplinde ≥%50",
          "zh-Hans": "总分≥80/150且每个标星（必须通过）学科≥50%",
        },
      },
      fallback: {
        en: "Applicants who don't qualify to sit, or who fail, may instead be assessed as suitable for Medical Laboratory Technician (ANZSCO 311213).",
        tr: "Sınava giremeyen veya başarısız olan başvurular, Tıbbi Laboratuvar Teknisyeni (ANZSCO 311213) için uygun değerlendirilebilir.",
        "zh-Hans": "不符合考试资格或考试未通过的申请人，可作为医学实验室技术员（ANZSCO 311213）被评估。",
      },
      fees: [...aimsRegistryFees("aims_assessment_mls_mlt", { en: "Assessment fee", tr: "Değerlendirme ücreti", "zh-Hans": "评估费" }), ...aimsRegistryFees("aims_exam_mls", { en: "Professional Examination", tr: "Mesleki Sınav", "zh-Hans": "专业考试" })],
      processingTimeWeeks: { standard: AIMS_PROCESSING.individual.months * 4, label: AIMS_PROCESSING_LABEL },
      documentRequirements: [],
      notes: [
        {
          en: "Purely research-environment postgraduate employment is not favourably considered — must be in a medical pathology laboratory context relating to human disease.",
          tr: "Yalnızca araştırma ortamında lisansüstü istihdam olumlu değerlendirilmez — tıbbi patoloji laboratuvarı bağlamında ve insan hastalığı ile ilgili olmalıdır.",
          "zh-Hans": "纯研究环境的研究生就业不被认可——必须在与人类疾病相关的医学病理实验室环境中。",
        },
      ],
    },
    // ── MLS Option 3: Overseas Qualification + Special Exam ────────────
    {
      pathwayId: "MLS_OPTION_3",
      occupation: "Medical Laboratory Scientist — ANZSCO 234611",
      name: {
        en: "Option 3 — Overseas Qualification + Special Professional Examination",
        tr: "Seçenek 3 — Yurtdışı Niteliği + Özel Mesleki Sınav",
        "zh-Hans": "选项3 — 海外资格 + 特殊专业考试",
      },
      eligibleFor: [
        {
          en: "Qualifications from outside Australia + current unrestricted professional registration/certification in an ILAC-MRA signatory country",
          tr: "Avustralya dışından nitelikler + ILAC-MRA imzacı ülkede mevcut kısıtlanmamış profesyonel kayıt/sertifikasyon",
          "zh-Hans": "澳大利亚以外的资格+在ILAC-MRA签署国拥有当前无限制的专业注册/认证",
        },
      ],
      examRequired: true,
      examDetails: {
        name: {
          en: "AIMS Medical Laboratory Scientist Special Professional Examination",
          tr: "AIMS Tıbbi Laboratuvar Bilimcisi Özel Mesleki Sınavı",
          "zh-Hans": "AIMS医学实验室科学家特殊专业考试",
        },
        format: {
          en: "50 single-response MCQ covering quality systems/general principles, 1.5 hours, online remote-proctored",
          tr: "Kalite sistemleri/genel ilkeleri kapsayan 50 tek yanıt MCQ, 1,5 saat, çevrimiçi uzaktan gözetimli",
          "zh-Hans": "涵盖质量体系/一般原则的50道单选题MCQ，1.5小时，在线远程监考",
        },
        sittings: {
          en: "Twice yearly — March and September",
          tr: "Yılda iki kez — Mart ve Eylül",
          "zh-Hans": "每年两次 — 三月和九月",
        },
        topics: [
          { en: "Laboratory accreditation", tr: "Laboratuvar akreditasyonu", "zh-Hans": "实验室认证" },
          { en: "Quality control/assurance/systems", tr: "Kalite kontrol/güvence/sistemler", "zh-Hans": "质量控制/保证/系统" },
          { en: "Pre-analytic factors", tr: "Ön-analitik faktörler", "zh-Hans": "分析前因素" },
          { en: "Laboratory operations regulations", tr: "Laboratuvar operasyon düzenlemeleri", "zh-Hans": "实验室操作规程" },
          { en: "Ethics", tr: "Etik", "zh-Hans": "伦理" },
          { en: "Patient information integrity", tr: "Hasta bilgi bütünlüğü", "zh-Hans": "患者信息完整性" },
        ],
        passRequirement: {
          en: "≥50%",
          tr: "≥%50",
          "zh-Hans": "≥50%",
        },
      },
      fees: [
        ...aimsRegistryFees("aims_assessment_mls_mlt", { en: "Assessment fee", tr: "Değerlendirme ücreti", "zh-Hans": "评估费" }),
        {
          label: { en: "Special Professional Examination", tr: "Özel Mesleki Sınav", "zh-Hans": "特别专业考试" },
          amountAUD: undefined,
          note: { en: "needs human verification -- not in the AIMS fee table (p.18-19)", tr: "insan doğrulaması gerekir -- AIMS ücret tablosunda yok (s.18-19)", "zh-Hans": "需人工核实——不在 AIMS 费用表中（第 18-19 页）" },
        },
      ],
      processingTimeWeeks: { standard: AIMS_PROCESSING.individual.months * 4, label: AIMS_PROCESSING_LABEL },
      documentRequirements: [],
    },
    // ── MLT Option 1: Diploma + Work Experience ─────────────────────────
    {
      pathwayId: "MLT_OPTION_1",
      occupation: "Medical Laboratory Technician — ANZSCO 311213",
      name: {
        en: "Option 1 — Diploma + Work Experience",
        tr: "Seçenek 1 — Diploma + İş Deneyimi",
        "zh-Hans": "选项1 — 文凭 + 工作经验",
      },
      eligibleFor: [
        {
          en: "AQF level 5 or 6 diploma in medical laboratory technology (or comparable qualification from outside Australia)",
          tr: "AQF seviye 5 veya 6 tıbbi laboratuvar teknolojisi diploması (veya Avustralya dışından karşılaştırılabilir nitelik)",
          "zh-Hans": "AQF 5级或6级医学实验室技术文凭（或澳大利亚以外的可比资格）",
        },
        {
          en: "Minimum 2 years full-time professional experience in a medical pathology laboratory, at least 1 year within the 5 years immediately prior to application",
          tr: "Tıbbi patoloji laboratuvarında minimum 2 yıl tam zamanlı mesleki deneyim, başvurudan hemen önceki 5 yıl içinde en az 1 yıl",
          "zh-Hans": "在医学病理实验室至少2年全职专业经验，申请前5年内至少1年",
        },
      ],
      examRequired: false,
      fees: aimsRegistryFees("aims_assessment_mls_mlt", { en: "Assessment fee", tr: "Değerlendirme ücreti", "zh-Hans": "评估费" }),
      processingTimeWeeks: { standard: AIMS_PROCESSING.individual.months * 4, label: AIMS_PROCESSING_LABEL },
      documentRequirements: [],
      notes: [
        {
          en: "Purely research-environment employment is not favourably considered — must be in a medical pathology laboratory context relating to human disease.",
          tr: "Yalnızca araştırma ortamında istihdam olumlu değerlendirilmez — tıbbi patoloji laboratuvarı bağlamında ve insan hastalığı ile ilgili olmalıdır.",
          "zh-Hans": "纯研究环境的就业不被认可——必须在与人类疾病相关的医学病理实验室环境中。",
        },
      ],
    },
    // ── MLT Option 2: Overseas Certification ────────────────────────────
    {
      pathwayId: "MLT_OPTION_2",
      occupation: "Medical Laboratory Technician — ANZSCO 311213",
      name: {
        en: "Option 2 — Overseas Certification",
        tr: "Seçenek 2 — Yurtdışı Sertifikasyonu",
        "zh-Hans": "选项2 — 海外认证",
      },
      eligibleFor: [
        {
          en: "Current unrestricted professional registration/certification as a medical laboratory technician/technologist in an ILAC-MRA signatory country",
          tr: "ILAC-MRA imzacı ülkede tıbbi laboratuvar teknisyeni/teknolog olarak mevcut kısıtlanmamış profesyonel kayıt/sertifikasyon",
          "zh-Hans": "在ILAC-MRA签署国作为医学实验室技术员/技术专家的当前无限制专业注册/认证",
        },
      ],
      examRequired: false,
      fees: aimsRegistryFees("aims_assessment_mls_mlt", { en: "Assessment fee", tr: "Değerlendirme ücreti", "zh-Hans": "评估费" }),
      processingTimeWeeks: { standard: AIMS_PROCESSING.individual.months * 4, label: AIMS_PROCESSING_LABEL },
      documentRequirements: [],
    },
    // ── Pathology Collector / Phlebotomist (311216) ────────────────────
    {
      pathwayId: "PC_ASSESSMENT",
      occupation: "Pathology Collector — ANZSCO 311216",
      name: {
        en: "Pathology Collector / Phlebotomist — skills and qualifications assessment",
        tr: "Patoloji Numune Toplayıcı / Flebotomist — beceri ve nitelik değerlendirmesi",
        "zh-Hans": "病理采样员 / 抽血员——技能和资格评估",
      },
      eligibleFor: [
        {
          en: "As set out in AIMS's Pathology Collector / Phlebotomist guidelines (GAPSQP v12.4); in Australia the minimum primary qualification is a Certificate III in Pathology Collection (HLT37215) and current first aid certification (p.81).",
          tr: "AIMS'in Patoloji Numune Toplayıcı / Flebotomist kılavuzunda (GAPSQP v12.4) belirtildiği gibi; Avustralya'da asgari temel nitelik Certificate III in Pathology Collection (HLT37215) ve geçerli ilk yardım sertifikasıdır (s.81).",
          "zh-Hans": "按 AIMS 病理采样员 / 抽血员指南（GAPSQP v12.4）；在澳洲，最低基本资格为 Certificate III in Pathology Collection（HLT37215）及有效的急救证书（第 81 页）。",
        },
      ],
      examRequired: false,
      fees: aimsRegistryFees("aims_assessment_pathology_collector", { en: "Assessment fee", tr: "Değerlendirme ücreti", "zh-Hans": "评估费" }),
      processingTimeWeeks: { standard: AIMS_PROCESSING.individual.months * 4, label: AIMS_PROCESSING_LABEL },
      documentRequirements: [],
    },
  ],
};
