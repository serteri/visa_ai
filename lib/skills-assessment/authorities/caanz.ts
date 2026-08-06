import type { SkillsAssessmentAuthority, LocalizedString } from "../types";

/**
 * Chartered Accountants Australia and New Zealand (CA ANZ)
 * Source: CA ANZ Migration Skills Assessment — PDF (22 pages)
 * Verified: 2026-08-04
 *
 * Fee schedule effective 1 July 2026 — "current" values below.
 * Previous fees (pre-1 Jul 2026) are retained as `previousFeeAUD` for historical reference.
 *
 * Multilanguage support: EN, TR, ZH-Hans
 */
export const caanzAuthority: SkillsAssessmentAuthority = {
  authorityId: "CA-ANZ",
  authorityName: "Chartered Accountants Australia and New Zealand",
  country: "AU",
  role: "Skills assessment only — CA ANZ does not provide migration advice and does not advise on visa eligibility.",
    occupations: [
    { anzscoCode: "221111", title: "Accountant (General)" },
    { anzscoCode: "221112", title: "Management Accountant" },
    { anzscoCode: "221113", title: "Taxation Accountant" },
    { anzscoCode: "221212", title: "Corporate Treasurer" },
    { anzscoCode: "221213", title: "External Auditor" },
    { anzscoCode: "132211", title: "Finance Manager" },
  ],
  lastVerified: "2026-08-04",
  sourceDocument:
    "Chartered Accountants Australia and New Zealand — Migration Skills Assessment (PDF, 22 pages)",
  notes: [
    {
      en: "CA ANZ full members pay $0 for all assessment services (noted in fee schedule).",
      tr: "CA ANZ tam üyeleri tüm değerlendirme hizmetleri için $0 öder (ücret tarifesinde belirtilmiştir).",
      "zh-Hans": "CA ANZ正式会员所有评估服务费用为$0（费用表中注明）。",
    },
    {
      en: "Provisional assessment was discontinued effective 1 July 2024.",
      tr: "Geçici değerlendirme 1 Temmuz 2024 tarihinden itibaren sonlandırılmıştır.",
      "zh-Hans": "临时评估已于2024年7月1日起终止。",
    },
    {
      en: "CA ANZ is one of three authorised assessing authorities for accounting occupations (alongside CPA Australia and IPA).",
      tr: "CA ANZ, muhasebe meslekleri için üç yetkili değerlendirme kurumundan biridir (CPA Australia ve IPA ile birlikte).",
      "zh-Hans": "CA ANZ是会计职业的三个授权评估机构之一（与CPA Australia和IPA并列）。",
    },
  ],
  pathways: [
    {
      pathwayId: "qualification-assessment",
      name: {
        en: "Qualification Assessment",
        tr: "Yeterlilik Değerlendirmesi",
        "zh-Hans": "资格评估",
      },
      occupation: "ALL",
      requiresPriorAssessment: false,
      eligibleFor: [
        {
          en: "All applicants seeking a CA ANZ skills assessment for a listed ANZSCO occupation",
          tr: "Listelenmiş ANZSCO meslekleri için CA ANZ beceri değerlendirmesi isteyen tüm başvuru sahipleri",
          "zh-Hans": "所有为列出的ANZSCO职业申请CA ANZ技能评估的申请人",
        },
      ],
      fees: [
        { label: { en: "Qualification assessment (onshore)", tr: "Yeterlilik değerlendirmesi (yerli)", "zh-Hans": "资格评估（境内）" }, amountAUD: 565 },
        { label: { en: "Qualification assessment (offshore)", tr: "Yeterlilik değerlendirmesi (yabancı)", "zh-Hans": "资格评估（境外）" }, amountAUD: 514 },
        { label: { en: "Qualification assessment (Singapore)", tr: "Yeterlilik değerlendirmesi (Singapur)", "zh-Hans": "资格评估（新加坡）" }, amountAUD: 560 },
        { label: { en: "Fast Track qualification assessment (onshore)", tr: "Hızlı Yeterlilik değerlendirmesi (yerli)", "zh-Hans": "快速资格评估（境内）" }, amountAUD: 675 },
        { label: { en: "Fast Track qualification assessment (offshore)", tr: "Hızlı Yeterlilik değerlendirmesi (yabancı)", "zh-Hans": "快速资格评估（境外）" }, amountAUD: 614 },
        { label: { en: "Fast Track qualification assessment (Singapore)", tr: "Hızlı Yeterlilik değerlendirmesi (Singapur)", "zh-Hans": "快速资格评估（新加坡）" }, amountAUD: 669 },
      ],
      documentRequirements: [
        {
          en: "Passport (photo page) or national ID card.",
          tr: "Pasaport (fotoğraflı sayfa) veya ulusal kimlik kartı.",
          "zh-Hans": "护照（照片页）或国民身份证。",
        },
        {
          en: "Official name-change document if applicable.",
          tr: "Varsa resmi isim değişikliği belgesi.",
          "zh-Hans": "如适用，正式更名文件。",
        },
        {
          en: "English language proficiency evidence (unless exempt): PYP certificate + transcript OR recognised test result.",
          tr: "İngilizce yeterlilik kanıtı (muaf değilse): PYP sertifikası + transkript VEYA tanınan test sonucu.",
          "zh-Hans": "英语能力证明（除非豁免）：PYP证书+成绩单或认可的测试成绩。",
        },
        {
          en: "Official academic award/degree certificates.",
          tr: "Resmi akademik ödül/lisans derecesi sertifikaları.",
          "zh-Hans": "正式学术奖项/学位证书。",
        },
        {
          en: "Official academic transcripts, including prior-study transcripts if exemptions were granted.",
          tr: "Resmi akademik transkriptler, muafiyet verildiyse önceki eğitim transkriptleri dahil.",
          "zh-Hans": "正式学术成绩单，如获得豁免则包括先前学习的成绩单。",
        },
        {
          en: "Official translations (with originals) for non-English academic documents.",
          tr: "İngilizce olmayan akademik belgeler için resmi çeviriler (orijinalleriyle birlikte).",
          "zh-Hans": "非英语学术文件的正式翻译（附原件）。",
        },
        {
          en: "Professional body membership certificate + exam results/marksheets, if applicable.",
          tr: "Varsa, profesyonel kurum üyelik sertifikası + sınav sonuçları/karneler.",
          "zh-Hans": "如适用，专业机构会员证书+考试成绩/成绩单。",
        },
        {
          en: "Official syllabus for non-accredited qualifications (or statutory declaration in exceptional circumstances).",
          tr: "Akredite edilmemiş yeterlilikler için resmi müfredat (veya istisnai durumlarda yeminli beyan).",
          "zh-Hans": "非认可资格的正式课程大纲（或在特殊情况下法定声明）。",
        },
        {
          en: "Chinese Degree Verification for PRC qualifications — verification body must send reports directly to CA ANZ.",
          tr: "ÇHC yeterlilikleri için Çin Derece Doğrulaması — doğrulama kurumu raporları doğrudan CA ANZ'a göndermelidir.",
          "zh-Hans": "中国学历验证——验证机构必须将报告直接发送给CA ANZ。",
        },
      ],
      notes: [
        {
          en: "Accredited course search tool available to check if a qualification is pre-recognised.",
          tr: "Bir yeterliliğin önceden tanınıp tanınmadığını kontrol etmek için akredite kurs arama aracı mevcuttur.",
          "zh-Hans": "可使用认证课程搜索工具检查资格是否已预先认可。",
        },
        {
          en: "AQF Level 7+ equivalence required; CEP/UK ENIC reference for overseas comparability.",
          tr: "AQF Seviye 7+ denkliği gerekli; yurt dışı karşılaştırılabilirliği için CEP/UK ENIC referansı.",
          "zh-Hans": "需要AQF 7级以上同等学历；海外可比性参考CEP/UK ENIC。",
        },
      ],
    },
    {
      pathwayId: "employment-assessment",
      name: {
        en: "Skilled Employment Assessment",
        tr: "Becerili İstihdam Değerlendirmesi",
        "zh-Hans": "技能就业评估",
      },
      occupation: "ALL",
      requiresPriorAssessment: true,
      prerequisite: "qualification-assessment",
      fallback: {
        en: "Cannot be assessed without a 'Suitable' qualification assessment outcome.",
        tr: "'Uygun' yeterlilik değerlendirme sonucu olmadan değerlendirilemez.",
        "zh-Hans": "没有'合适'的资格评估结果无法进行评估。",
      },
      fees: [
        { label: { en: "Employment only (onshore)", tr: "Yalnızca istihdam (yerli)", "zh-Hans": "仅就业（境内）" }, amountAUD: 260 },
        { label: { en: "Employment only (offshore)", tr: "Yalnızca istihdam (yabancı)", "zh-Hans": "仅就业（境外）" }, amountAUD: 236 },
        { label: { en: "Employment only (Singapore)", tr: "Yalnızca istihdam (Singapur)", "zh-Hans": "仅就业（新加坡）" }, amountAUD: 257 },
      ],
      documentRequirements: [
        {
          en: "Employer testimonial per role: letterhead, full contact details, signature from higher-level person, DD/MM/YYYY dates, specific duties, employment terms, weekly hours, annual salary.",
          tr: "Her pozisyon için işveren referans mektubu: antetli kağıt, tam iletişim bilgileri, üst düzey kişinin imzası, GG/AA/YYYY tarihleri, belirli görevler, çalışma şartları, haftalık saatler, yıllık maaş.",
          "zh-Hans": "每个职位的雇主证明信：抬头纸、完整联系方式、上级签字、DD/MM/YYYY日期、具体职责、雇佣条款、每周工时、年薪。",
        },
        {
          en: "Minimum 3 pay slips per role (start, middle, end of role ideally).",
          tr: "Her pozisyon için en az 3 maaş bordrosu (tercihen başlangıç, orta, bitiş).",
          "zh-Hans": "每个职位至少3份工资单（最好为开始、中期、结束）。",
        },
        {
          en: "Self-employed: testimonial + statutory declaration + business registration + practising certificate + tax returns + 2+ client references.",
          tr: "Serbest çalışan: referans mektubu + yeminli beyan + iş kaydı + çalışma sertifikası + vergi beyannameleri + 2+ müşteri referansı.",
          "zh-Hans": "自雇：证明信+法定声明+营业执照+执业证书+纳税申报表+2份以上客户推荐信。",
        },
      ],
      notes: [
        {
          en: "CVs/resumes are NOT accepted as employment evidence.",
          tr: "CV/özgeçmişler istihdam kanıtı olarak KABUL EDİLMEZ.",
          "zh-Hans": "简历/履历不作为就业证明接受。",
        },
        {
          en: "No new/altered references accepted after an outcome has been determined.",
          tr: "Sonuç belirlendikten sonra yeni/değiştirilmiş referanslar kabul edilmez.",
          "zh-Hans": "结果确定后不接受新的/更改的推荐信。",
        },
        {
          en: "Employment must be within 10 years, minimum 1 year, minimum 20 hours/week, paid and continuous.",
          tr: "İstihdam son 10 yıl içinde, en az 1 yıl, hafta en az 20 saat, ücretli ve sürekli olmalıdır.",
          "zh-Hans": "就业必须在10年内，至少1年，每周至少20小时，有薪且连续。",
        },
        {
          en: "At least 12 months in the most recent 12-month period.",
          tr: "En son 12 aylık dönemde en az 12 ay.",
          "zh-Hans": "最近12个月内至少有12个月。",
        },
      ],
    },
    {
      pathwayId: "combined",
      name: {
        en: "Combined Qualification + Skilled Employment Assessment",
        tr: "Kombine Yeterlilik + Becerili İstihdam Değerlendirmesi",
        "zh-Hans": "联合资格+技能就业评估",
      },
      occupation: "ALL",
      requiresPriorAssessment: false,
      fees: [
        { label: { en: "Combined (onshore)", tr: "Kombine (yerli)", "zh-Hans": "联合（境内）" }, amountAUD: 620 },
        { label: { en: "Combined (offshore)", tr: "Kombine (yabancı)", "zh-Hans": "联合（境外）" }, amountAUD: 564 },
        { label: { en: "Combined (Singapore)", tr: "Kombine (Singapur)", "zh-Hans": "联合（新加坡）" }, amountAUD: 615 },
        { label: { en: "Additional ANZSCO (onshore)", tr: "Ek ANZSCO (yerli)", "zh-Hans": "额外ANZSCO（境内）" }, amountAUD: 350 },
        { label: { en: "Additional ANZSCO (offshore)", tr: "Ek ANZSCO (yabancı)", "zh-Hans": "额外ANZSCO（境外）" }, amountAUD: 318 },
        { label: { en: "Additional ANZSCO (Singapore)", tr: "Ek ANZSCO (Singapur)", "zh-Hans": "额外ANZSCO（新加坡）" }, amountAUD: 347 },
      ],
      documentRequirements: [
        {
          en: "All documents from Qualification Assessment pathway.",
          tr: "Yeterlilik Değerlendirmesi yolundaki tüm belgeler.",
          "zh-Hans": "资格评估路径的所有文件。",
        },
        {
          en: "All documents from Skilled Employment Assessment pathway.",
          tr: "Becerili İstihdam Değerlendirmesi yolundaki tüm belgeler.",
          "zh-Hans": "技能就业评估路径的所有文件。",
        },
      ],
      notes: [
        {
          en: "If qualification outcome is 'Not Suitable', the employment assessment is automatically determined as 'Not Suitable' — no separate employment outcome is issued.",
          tr: "Yeterlilik sonucu 'Uygun Değil' ise, istihdam değerlendirmesi otomatik olarak 'Uygun Değil' olarak belirlenir — ayrı bir istihdam sonucu verilmez.",
          "zh-Hans": "如果资格结果为'不合适'，就业评估将自动判定为'不合适'——不会发出单独的就业结果。",
        },
      ],
    },
  ],
  englishRequirements: [
    {
      test: "IELTS Academic",
      minimumScore: "7.0 all bands",
      validityYears: 3,
    },
    {
      test: "PTE Academic",
      minimumScore: "Pre-7 Aug 2025: 65 all; Post-7 Aug 2025: 58/59/69/76 (L/R/W/S)",
      validityYears: 3,
    },
    {
      test: "TOEFL iBT",
      minimumScore: "Pre-7 Aug 2025: 24/24/27/23 (L/R/W/S); Post-7 Aug 2025: 22/22/26/24",
      validityYears: 3,
    },
    {
      test: "Cambridge C1 Advanced",
      minimumScore: "Pre-7 Aug 2025: 185 all bands; Post-7 Aug 2025: 175/179/193/194 (L/R/W/S)",
      validityYears: 3,
    },
    {
      test: "CELPIP General",
      minimumScore: "9/8/10/8 (L/R/W/S)",
      validityYears: 3,
    },
    {
      test: "LANGUAGECERT Academic",
      minimumScore: "67/71/78/82 (L/R/W/S)",
      validityYears: 3,
    },
    {
      test: "MET",
      minimumScore: "61/63/74/59 (L/R/W/S)",
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
    en: "3 years from test date. Online/at-home test versions are NOT accepted.",
    tr: "Test tarihinden itibaren 3 yıl. Online/evde test versiyonları KABUL EDİLMEZ.",
    "zh-Hans": "自考试之日起3年。在线/居家考试版本不接受。",
  },
  assessmentContext: {
    en: "CA ANZ is one of three authorised accounting assessing authorities (alongside CPA Australia and IPA). The source document covers migration skills assessment only — CA ANZ does not provide migration advice.",
    tr: "CA ANZ, üç yetkili muhasebe değerlendirme kurumundan biridir (CPA Australia ve IPA ile birlikte). Kaynak belge yalnızca göçmenlik beceri değerlendirmesini kapsar — CA ANZ göçmenlik danışmanlığı sağlamaz.",
    "zh-Hans": "CA ANZ是三个授权会计评估机构之一（与CPA Australia和IPA并列）。源文件仅涵盖移民技能评估——CA ANZ不提供移民建议。",
  },
  competencyMatrix: {
    columns: ["221111", "221112", "132211", "221212", "221113", "221213"],
    rows: [
      { area: "Accounting Systems & Processes", status: ["Mandatory", "Mandatory", "Mandatory", null, null, null], _needsVerification: false },
      { area: "Financial Accounting & Reporting", status: ["Mandatory", "Mandatory", "Mandatory", null, null, null], _needsVerification: false },
      { area: "Management Accounting", status: ["Mandatory", "Mandatory", "Mandatory", null, null, null], _needsVerification: false },
      { area: "Finance & Financial Management", status: ["Mandatory", "Mandatory", "Mandatory", null, null, null], _needsVerification: false },
      { area: "Economics", status: ["Mandatory", "Mandatory", "Mandatory", null, null, null], _needsVerification: false },
      { area: "Quantitative Methods", status: ["Mandatory", "Mandatory", "Mandatory", null, null, null], _needsVerification: false },
      { area: "Business Law", status: ["Optional", "Optional", "Optional", null, null, null], _needsVerification: false },
      { area: "Taxation Law", status: ["Optional", "Optional", "Optional", null, null, null], _needsVerification: false },
      { area: "Audit & Assurance", status: ["Optional", "Optional", "Optional", null, null, null], _needsVerification: false },
    ],
  },
  feesSchedule: [
    { type: "Qualification assessment (onshore)", currentFeeAUD: 565, previousFeeAUD: 540, processingTime: "10 business days", effectiveDate: "2026-07-01" },
    { type: "Qualification assessment (offshore)", currentFeeAUD: 514, previousFeeAUD: 491, effectiveDate: "2026-07-01" },
    { type: "Qualification assessment (Singapore)", currentFeeAUD: 560, previousFeeAUD: 535, effectiveDate: "2026-07-01" },
    { type: "Fast Track qualification assessment (onshore)", currentFeeAUD: 675, previousFeeAUD: 645, processingTime: "5 business days", effectiveDate: "2026-07-01" },
    { type: "Fast Track qualification assessment (offshore)", currentFeeAUD: 614, previousFeeAUD: 589, effectiveDate: "2026-07-01" },
    { type: "Fast Track qualification assessment (Singapore)", currentFeeAUD: 669, previousFeeAUD: 640, effectiveDate: "2026-07-01" },
    { type: "Employment only (onshore)", currentFeeAUD: 260, previousFeeAUD: 248, processingTime: "10 business days", effectiveDate: "2026-07-01" },
    { type: "Employment only (offshore)", currentFeeAUD: 236, previousFeeAUD: 225, effectiveDate: "2026-07-01" },
    { type: "Employment only (Singapore)", currentFeeAUD: 257, previousFeeAUD: 246, effectiveDate: "2026-07-01" },
    { type: "Combined qual+employment (onshore)", currentFeeAUD: 620, previousFeeAUD: 590, processingTime: "10 business days", effectiveDate: "2026-07-01" },
    { type: "Combined qual+employment (offshore)", currentFeeAUD: 564, previousFeeAUD: 537, effectiveDate: "2026-07-01" },
    { type: "Combined qual+employment (Singapore)", currentFeeAUD: 615, previousFeeAUD: 586, effectiveDate: "2026-07-01" },
    { type: "Additional ANZSCO — Qual (onshore)", currentFeeAUD: 260, previousFeeAUD: 248, effectiveDate: "2026-07-01" },
    { type: "Additional ANZSCO — Qual (offshore)", currentFeeAUD: 236, previousFeeAUD: 225, effectiveDate: "2026-07-01" },
    { type: "Additional ANZSCO — Qual (Singapore)", currentFeeAUD: 257, previousFeeAUD: 246, effectiveDate: "2026-07-01" },
    { type: "Additional ANZSCO — Combined (onshore)", currentFeeAUD: 350, previousFeeAUD: 333, effectiveDate: "2026-07-01" },
    { type: "Additional ANZSCO — Combined (offshore)", currentFeeAUD: 318, previousFeeAUD: 303, effectiveDate: "2026-07-01" },
    { type: "Additional ANZSCO — Combined (Singapore)", currentFeeAUD: 347, previousFeeAUD: 331, effectiveDate: "2026-07-01" },
    { type: "Update — Qual (onshore)", currentFeeAUD: 185, previousFeeAUD: 176, effectiveDate: "2026-07-01" },
    { type: "Update — Qual (offshore)", currentFeeAUD: 168, previousFeeAUD: 160, effectiveDate: "2026-07-01" },
    { type: "Update — Qual (Singapore)", currentFeeAUD: 183, previousFeeAUD: 174, effectiveDate: "2026-07-01" },
    { type: "Review — single (onshore)", currentFeeAUD: 185, previousFeeAUD: 176, effectiveDate: "2026-07-01" },
    { type: "Review — single (offshore)", currentFeeAUD: 168, previousFeeAUD: 160, effectiveDate: "2026-07-01" },
    { type: "Review — single (Singapore)", currentFeeAUD: 183, previousFeeAUD: 174, effectiveDate: "2026-07-01" },
    { type: "Update — Employment (onshore)", currentFeeAUD: 185, previousFeeAUD: 176, effectiveDate: "2026-07-01" },
    { type: "Update — Employment (offshore)", currentFeeAUD: 168, previousFeeAUD: 160, effectiveDate: "2026-07-01" },
    { type: "Update — Employment (Singapore)", currentFeeAUD: 183, previousFeeAUD: 174, effectiveDate: "2026-07-01" },
    { type: "Reissue of Outcome Letter", currentFeeAUD: 0, previousFeeAUD: 0, note: "Free of charge", effectiveDate: "2026-07-01" },
    { type: "Withdrawal administration fee", currentFeeAUD: 85, previousFeeAUD: 81, effectiveDate: "2026-07-01" },
  ],
  processingNotes: {
    initialReviewDays: 10,
    additionalInfoResponseDays: 20,
    holdPeriodMonths: { before20260101: 6, from20260101: 4 },
    urgentProcessing: {
      available: true,
      criteria: [
        "Visa expiry within 20 business days",
        "Formal invitation deadline from Department of Home Affairs",
        "Age limit approaching (within 12 months of turning 45)",
      ],
    },
  },
  outcomeAndValidity: {
    validityYears: 3,
    reassessmentWindowDays: 60,
    reissueFee: "Free of charge",
  },
  reviewAppealFraud: {
    internalReview: {
      windowDays: 28,
      newDocumentsAccepted: false,
    },
    externalAppeal: {
      windowDays: 28,
      tribunal: "Administrative Review Tribunal (ART)",
    },
    fraudPolicy: {
      responseWindowDays: 20,
      banYears: 3,
      feeRefunded: false,
    },
  },
  discontinuedPrograms: [
    {
      name: "Accounting Professional Year Program (APYP)",
      closureDate: "2026-05-01",
      note: "Former participants may still be eligible for 5 points under the points test, but the points system is under review by Home Affairs.",
    },
  ],
  requiredDocuments: {
    identity: [
      "Passport (photo page).",
      "Name change evidence (statutory declaration or official document).",
      "Recent passport photo.",
    ],
    englishProficiencyEvidence: [
      "Official language test result (IELTS Academic, PTE, TOEFL, Cambridge, CELPIP, LANGUAGECERT, MET) OR",
      "Accounting Professional Year Program (APYP) completion certificate + transcript (accepted in lieu of a language test).",
    ],
    educationalQualifications: [
      "Official degree certificate/testamur or statement of completion.",
      "Official academic transcripts.",
      "My eQuals verification link (AU qualifications) sent to CA ANZ.",
    ],
    professionalMembership: [
      "Professional body membership certificate (if applicable).",
      "Exam results/marksheets.",
      "Good-standing letter (less than 3 months old at time of submission).",
    ],
    translations: [
      "Original + certified translation for non-English documents.",
      "Certified translator must be NAATI-accredited (AU) or equivalent (overseas).",
    ],
    syllabusOrCourseDescription: [
      "Required for non-accredited degree programs.",
    ],
    chineseQualificationVerification: [
      "Separate verification service required for PRC qualifications.",
      "CA ANZ recommends VETASSESS for this verification.",
    ],
    skilledEmploymentDocuments: [
      "Reference letter: letterhead, full contact details, signature from higher-level person, DD/MM/YYYY dates, specific duties, employment terms, weekly hours, annual salary.",
      "Minimum 3 pay slips per role (start, middle, end of role ideally).",
      "Alternative documents: tax records, bank statements, employment contracts.",
      "Statutory declaration: may supplement but cannot substitute a reference letter.",
    ],
    selfEmployedDocuments: [
      "Client/contractor letters.",
      "Business registration certificate.",
      "Tax returns (first/middle/final year).",
      "Statutory declaration of truthfulness.",
      "2+ client references.",
    ],
    scanningRequirements: {
      format: ["PDF", "JPEG", "PNG"],
      maxSizeMB: 20,
      dpi: 600,
      noEncryption: true,
    },
  },
};
