import type { SkillsAssessmentAuthority, LocalizedString } from "../types";

/**
 * Institute of Public Accountants Ltd (IPA)
 * Source: IPA — Migration to Australia (official evaluation document)
 * Verified: 2026-08-05
 *
 * IPA covers the same 6 accounting occupations as CPA Australia and CA ANZ.
 * In the authority registry, IPA is registered but CPA Australia and CA ANZ
 * are prioritised (CPA first, CA ANZ second) per project requirements.
 * IPA serves as the third option for accounting skills assessment.
 *
 * Multilanguage support: EN, TR, ZH-Hans
 */
export const ipaAustraliaAuthority: SkillsAssessmentAuthority = {
  authorityId: "IPA",
  authorityName: "Institute of Public Accountants Ltd",
  country: "AU",
  role: "Skills assessment only — IPA does not provide migration advice.",
    occupations: [
    { anzscoCode: "221111", title: "Accountant (General)" },
    { anzscoCode: "221213", title: "External Auditor" },
    { anzscoCode: "221112", title: "Management Accountant" },
    { anzscoCode: "221113", title: "Taxation Accountant" },
    { anzscoCode: "132211", title: "Finance Manager" },
    { anzscoCode: "221212", title: "Corporate Treasurer" },
  ],
  lastVerified: "2026-08-05",
  sourceDocument: "Institute of Public Accountants Ltd — Migration to Australia",
  notes: [
    {
      en: "IPA covers the same 6 accounting occupations as CPA Australia and CA ANZ.",
      tr: "IPA, CPA Australia ve CA ANZ ile aynı 6 muhasebe mesleğini kapsar.",
      "zh-Hans": "IPA涵盖与CPA Australia和CA ANZ相同的6个会计职业。",
    },
    {
      en: "Qualification must be equivalent to a relevant Australian Bachelor degree or higher.",
      tr: "Yeterlilik, ilgili bir Avustralya lisans derecesine veya üstüne eşdeğer olmalıdır.",
      "zh-Hans": "资格必须等同于相关澳大利亚学士学位或以上。",
    },
    {
      en: "A full 12-16 unit Master of Professional Accounting without exemptions from an accredited Australian University is accepted as equivalent to a Bachelor.",
      tr: "Akredite bir Avustralya üniversitesinden muafiyetsiz tam 12-16 birim Mesleki Muhasebe Yüksek Lisansı, Lisansa eşdeğer olarak kabul edilir.",
      "zh-Hans": "来自认可的澳大利亚大学的完整12-16学分的专业会计硕士（无豁免）被接受为等同于学士学位。",
    },
  ],
  fraudPolicy: {
    en: "If false or fraudulent information is identified, IPA will issue an unsuitable outcome letter, report the matter to DHA, and may impose a temporary ban on future skills assessment applications. To prevent fraud, IPA will not accept altered references at any time after the initial application is lodged or an outcome is provided. Job duties copied directly from the ABS website are not acceptable.",
    tr: "Yanlış veya sahte bilgi tespit edilirse, IPA uygunsuz sonuç mektubu düzenleyecek, konuyu DHA'ya bildirecek ve gelecekteki beceri değerlendirme başvurularına geçici yasak uygulayabilir. Sahtekarlığı önlemek için IPA, ilk başvuru yapıldıktan veya sonuç verildikten sonra hiçbir zaman değiştirilmiş referansları kabul etmeyecektir. ABS web sitesinden doğrudan kopyalanan iş görevleri kabul edilemez.",
    "zh-Hans": "如果发现虚假或欺诈信息，IPA将发出不合适的结果信，向内政部报告此事，并可能对未来的技能评估申请实施临时禁令。为防止欺诈，IPA在初次申请提交或提供结果后任何时候都不会接受更改的推荐信。直接从ABS网站复制的工作职责不予接受。",
  },
  validityPeriod: {
    years: 3,
    note: {
      en: "English tests are accepted if undertaken within the past three years. Validity of the assessment outcome letter aligns with standard DHA migration rules (typically 3 years).",
      tr: "İngilizce testleri son üç yıl içinde yapıldıysa kabul edilir. Değerlendirme sonucu mektubunun geçerliliği standart DHA göç kurallarıyla uyumludur (genellikle 3 yıl).",
      "zh-Hans": "英语考试在过去三年内完成则可接受。评估结果信的有效期与标准内政部移民规则一致（通常为3年）。",
    },
  },
  occupationCompetencyMapping: {
    note: "To meet educational standards, the qualification must include adequate coverage of the required core competency areas.",
    sharedCompetencies: [
      "Basic Accounting",
      "Cost & Management Accounting",
      "Financial Accounting & Reporting",
      "Financial Management",
      "Business Law (including Corporate Law)",
      "Economics",
      "Statistics",
    ],
    byOccupation: {
      "Accountant (General) - 221111": [
        "Basic Accounting",
        "Cost & Management Accounting",
        "Financial Accounting & Reporting",
        "Financial Management",
        "Business Law (including Corporate Law)",
        "Economics",
        "Statistics",
      ],
      "Management Accountant - 221112": [
        "Basic Accounting",
        "Cost & Management Accounting",
        "Financial Accounting & Reporting",
        "Financial Management",
        "Business Law (including Corporate Law)",
        "Economics",
        "Statistics",
      ],
      "Finance Manager - 132211": [
        "Basic Accounting",
        "Cost & Management Accounting",
        "Financial Accounting & Reporting",
        "Financial Management",
        "Business Law (including Corporate Law)",
        "Economics",
        "Statistics",
      ],
      "Corporate Treasurer - 221212": [
        "Basic Accounting",
        "Cost & Management Accounting",
        "Financial Accounting & Reporting",
        "Financial Management",
        "Business Law (including Corporate Law)",
        "Economics",
        "Statistics",
      ],
      "Taxation Accountant - 221113": [
        "Basic Accounting",
        "Cost & Management Accounting",
        "Financial Accounting & Reporting",
        "Financial Management",
        "Business Law (including Corporate Law)",
        "Economics",
        "Statistics",
        "Tax Law (Australian Tax Law)",
      ],
      "External Auditor - 221213": [
        "Basic Accounting",
        "Cost & Management Accounting",
        "Financial Accounting & Reporting",
        "Financial Management",
        "Business Law (including Corporate Law)",
        "Economics",
        "Statistics",
        "Auditing & Assurance",
      ],
    },
  },
  englishRequirements: [
    {
      test: "IELTS Academic",
      minimumScore: "7.0 all bands",
      note: "OSR accepted from May 2023; must provide both standard report and OSR result.",
      validityYears: 3,
    },
    {
      test: "PTE Academic",
      minimumScore: "58/59/69/76 (L/R/W/S) for tests taken from 7 Aug 2025 onwards",
      validityYears: 3,
    },
    {
      test: "TOEFL iBT",
      minimumScore: "22/22/26/24 (L/R/W/S)",
      note: "Tests taken between 26 July 2023 and 4 May 2024 are NOT acceptable.",
      validityYears: 3,
    },
    {
      test: "Cambridge C1 Advanced",
      minimumScore: "175/179/193/194 (L/R/W/S) for tests taken from 7 Aug 2025 onwards",
      validityYears: 3,
    },
    {
      test: "CELPIP General",
      minimumScore: "9/8/10/8 (L/R/W/S) for tests taken from 7 Aug 2025 onwards",
      validityYears: 3,
    },
    {
      test: "Michigan English Test (MET)",
      minimumScore: "61/63/74/59 (L/R/W/S) for tests taken from 7 Aug 2025 onwards",
      validityYears: 3,
    },
    {
      test: "LANGUAGECERT Academic",
      minimumScore: "67/71/78/82 (L/R/W/S) for tests taken from 7 Aug 2025 onwards",
      validityYears: 3,
    },
  ],
  englishExemptions: [
    "Passport holder of Canada",
    "Passport holder of New Zealand",
    "Passport holder of the Republic of Ireland",
    "Passport holder of the United Kingdom",
    "Passport holder of the United States of America",
  ],
  englishTestValidity: {
    en: "Within the past three years if the score reports can be verified with the providers.",
    tr: "Son üç yıl içinde, puan raporları sağlayıcılarla doğrulanabiliyorsa.",
    "zh-Hans": "在过去三年内，如果成绩报告可以与提供者验证。",
  },
  pathways: [
    // ── Pathway 1: Qualification Assessment ────────────────────────────
    {
      pathwayId: "QUALIFICATION_ASSESSMENT",
      name: {
        en: "Qualification Assessment",
        tr: "Yeterlilik Değerlendirmesi",
        "zh-Hans": "资格评估",
      },
      occupation: "ALL",
      eligibleFor: [
        {
          en: "Applicants seeking to migrate to Australia as an accounting professional under GSM",
          tr: "GSM kapsamında muhasebe uzmanı olarak Avustralya'ya göç etmek isteyen başvuru sahipleri",
          "zh-Hans": "希望在GSM下作为会计专业人士移民澳大利亚的申请人",
        },
      ],
      requiresPriorAssessment: false,
      fees: [
        { label: { en: "Standard Qualification Assessment", tr: "Standart Yeterlilik Değerlendirmesi", "zh-Hans": "标准资格评估" }, amountAUD: 595 },
        { label: { en: "Priority Qualification Assessment", tr: "Öncelikli Yeterlilik Değerlendirmesi", "zh-Hans": "优先资格评估" }, amountAUD: 795 },
        { label: { en: "Qualification reassessment within 12 months", tr: "12 ay içinde yeterlilik yeniden değerlendirmesi", "zh-Hans": "12个月内资格重新评估" }, amountAUD: 235 },
        { label: { en: "Qualification reassessment over 12 months", tr: "12 ay sonrası yeterlilik yeniden değerlendirmesi", "zh-Hans": "超过12个月资格重新评估" }, amountAUD: 595 },
        { label: { en: "Priority reassessment", tr: "Öncelikli yeniden değerlendirme", "zh-Hans": "优先重新评估" }, amountAUD: 795 },
        { label: { en: "Review", tr: "İnceleme", "zh-Hans": "复审" }, amountAUD: 235 },
        { label: { en: "Standard GSM upgrade", tr: "Standart GSM yükseltme", "zh-Hans": "标准GSM升级" }, amountAUD: 180 },
        { label: { en: "Priority GSM upgrade", tr: "Öncelikli GSM yükseltme", "zh-Hans": "优先GSM升级" }, amountAUD: 550 },
        { label: { en: "Administration Fee / Replacement Letter", tr: "İdari Ücret / Yenileme Mektubu", "zh-Hans": "行政费/补发信函" }, amountAUD: 90 },
      ],
      processingTimeWeeks: {
        standard: 1.5,
        ifIncomplete: 12,
        note: {
          en: "Standard is 7 business days; Priority guarantees a response within 1-2 business days.",
          tr: "Standart 7 iş günüdür; Öncelikli, 1-2 iş günü içinde yanıt garanti eder.",
          "zh-Hans": "标准为7个工作日；优先保证1-2个工作日内回复。",
        },
      },
      documentRequirements: [
        {
          en: "Passport ID page (clear, high-quality colour copy).",
          tr: "Pasaport kimlik sayfası (net, yüksek kaliteli renkli kopya).",
          "zh-Hans": "护照身份页（清晰、高质量的彩色副本）。",
        },
        {
          en: "University Degree Certificates or official completion letter.",
          tr: "Üniversite Derece Sertifikaları veya resmi tamamlama mektubu.",
          "zh-Hans": "大学学位证书或官方完成信。",
        },
        {
          en: "Official academic transcripts or mark sheets showing individual grades.",
          tr: "Bireysel notları gösteren resmi akademik transkriptler veya not dökümleri.",
          "zh-Hans": "显示各科成绩的正式学术成绩单或成绩表。",
        },
        {
          en: "Official syllabus details/subject outlines (required for non-Australian universities).",
          tr: "Resmi müfredat ayrıntıları/ders özetleri (Avustralyalı olmayan üniversiteler için gereklidir).",
          "zh-Hans": "官方课程大纲/科目概要（非澳大利亚大学需要）。",
        },
        {
          en: "Valid English language test results.",
          tr: "Geçerli İngilizce dil testi sonuçları.",
          "zh-Hans": "有效的英语语言测试成绩。",
        },
        {
          en: "Secondary/High School certificates and mark sheets (ONLY if degree was completed from a Subcontinental country) — conditional.",
          tr: "Ortaokul/Lise sertifikaları ve not dökümleri (YALNIZCA derece bir Alt Kıta ülkesinden tamamlandıysa) — koşullu.",
          "zh-Hans": "中学/高中证书和成绩单（仅当学位在次大陆国家完成时）——有条件。",
        },
        {
          en: "Marriage certificate or formal evidence of name change (if applicable).",
          tr: "Evlilik cüzdanı veya resmi isim değişikliği kanıtı (varsa).",
          "zh-Hans": "结婚证书或正式姓名变更证明（如适用）。",
        },
        {
          en: "NAATI certified translations for any document not in English.",
          tr: "İngilizce olmayan tüm belgeler için NAATI onaylı çeviriler.",
          "zh-Hans": "所有非英语文件的NAATI认证翻译。",
        },
      ],
      notes: [
        {
          en: "Certification is not required at this stage as DHA conducts further checks.",
          tr: "DHA ek kontroller yaptığı için bu aşamada onay gerekmez.",
          "zh-Hans": "此阶段不需要认证，因为内政部会进行进一步检查。",
        },
        {
          en: "Priority service expedites processing but does not guarantee a successful outcome.",
          tr: "Öncelikli hizmet işlemeyi hızlandırır ancak başarılı bir sonucu garanti etmez.",
          "zh-Hans": "优先服务可加快处理速度，但不保证成功结果。",
        },
      ],
    },
    // ── Pathway 2: Skilled Employment Assessment ────────────────────────
    {
      pathwayId: "SKILLED_EMPLOYMENT_ASSESSMENT",
      name: {
        en: "Skilled Employment Assessment",
        tr: "Becerili İstihdam Değerlendirmesi",
        "zh-Hans": "技能就业评估",
      },
      occupation: "ALL",
      eligibleFor: [
        {
          en: "Applicants who hold a successful qualifications assessment outcome from IPA",
          tr: "IPA'dan başarılı yeterlilik değerlendirme sonucu olan başvuru sahipleri",
          "zh-Hans": "持有IPA成功资格评估结果的申请人",
        },
      ],
      requiresPriorAssessment: true,
      prerequisite: "QUALIFICATION_ASSESSMENT",
      fees: [
        { label: { en: "Skilled Employment (Standard)", tr: "Becerili İstihdam (Standart)", "zh-Hans": "技能就业（标准）" }, amountAUD: 300 },
        { label: { en: "Priority Skilled Employment", tr: "Öncelikli Becerili İstihdam", "zh-Hans": "优先技能就业" }, amountAUD: 795 },
      ],
      processingTimeWeeks: {
        standard: 1.5,
        ifIncomplete: 12,
        note: {
          en: "Applications are placed in the queue based on the date of the Qualification Assessment outcome letter.",
          tr: "Başvurular, Yeterlilik Değerlendirmesi sonuç mektubunun tarihine göre sıraya alınır.",
          "zh-Hans": "申请根据资格评估结果信的日期排队。",
        },
      },
      documentRequirements: [
        {
          en: "References on company or government department letterhead.",
          tr: "Şirket veya devlet dairesi antetli kağıdında referanslar.",
          "zh-Hans": "公司或政府部门抬头纸上的推荐信。",
        },
        {
          en: "Contracts of Employment.",
          tr: "İş Sözleşmeleri.",
          "zh-Hans": "雇佣合同。",
        },
        {
          en: "Tax Returns.",
          tr: "Vergi Beyannameleri.",
          "zh-Hans": "纳税申报表。",
        },
        {
          en: "Payslips.",
          tr: "Maaş bordroları.",
          "zh-Hans": "工资单。",
        },
      ],
      notes: [
        {
          en: "IPA does not reassess or review skilled employment outcomes after a decision has been made.",
          tr: "IPA, karar verildikten sonra becerili istihdam sonuçlarını yeniden değerlendirmez veya incelemez.",
          "zh-Hans": "IPA在做出决定后不重新评估或复审技能就业结果。",
        },
        {
          en: "Altered references will not be accepted at any time after initial lodgement.",
          tr: "İlk gönderimden sonra hiçbir zaman değiştirilmiş referanslar kabul edilmeyecektir.",
          "zh-Hans": "初次提交后的任何时候都不接受更改的推荐信。",
        },
      ],
    },
  ],
};
