import type { SkillsAssessmentAuthority, LocalizedString } from "../types";

/**
 * CPA Australia Ltd
 * Source: CPA Australia — Migration to Australia (official web content)
 * Verified: 2026-08-04
 *
 * CPA Australia is one of three assessing authorities for accounting occupations
 * (alongside CA ANZ and IPA). This module models only CPA Australia.
 *
 * Multilanguage support: EN, TR, ZH-Hans
 */
export const cpaAustraliaAuthority: SkillsAssessmentAuthority = {
  authorityId: "CPA",
  authorityName: "CPA Australia Ltd",
  country: "AU",
    occupations: [
    { anzscoCode: "221111", title: "Accountant (General)" },
    { anzscoCode: "221212", title: "Corporate Treasurer" },
    { anzscoCode: "221213", title: "External Auditor" },
    { anzscoCode: "132211", title: "Finance Manager" },
    { anzscoCode: "221112", title: "Management Accountant" },
    { anzscoCode: "221113", title: "Taxation Accountant" },
  ],
  lastVerified: "2026-08-04",
  sourceDocument:
    "CPA Australia Ltd — Migration to Australia (official CPA Australia web content)",
  fraudPolicy: {
    en: "CPA Australia may refuse an application without refund and report it to the Department of Home Affairs if fraudulent or misleading information is suspected, in either the qualification or skilled employment assessment. Altered references or additional information will not be accepted once an outcome has been determined.",
    tr: "CPA Australia, yeterlilik veya becerili istihdam değerlendirmesinde sahte veya yanıltıcı bilgi şüphesi durumunda başvuruyu iade olmadan reddedebilir ve İçişleri Bakanlığı'na bildirebilir. Sonuç belirlendikten sonra değiştirilmiş referanslar veya ek bilgiler kabul edilmez.",
    "zh-Hans": "如果怀疑在资格或技能就业评估中存在欺诈或误导性信息，CPA Australia可拒绝申请且不予退款，并向内政部报告。结果确定后，不接受更改的推荐信或额外信息。",
  },
  validityPeriod: {
    years: 3,
    note: {
      en: "Application valid for 3 years from the initial assessment outcome date. Updates, additional-ANZSCO assessments, skilled employment assessments, or reviews do NOT reset the expiry date. After expiry, a new application is required.",
      tr: "Başvuru, ilk değerlendirme sonucu tarihinden itibaren 3 yıl geçerlidir. Güncellemeler, ek ANZSCO değerlendirmeleri, becerili istihdam değerlendirmeleri veya incelemeler son kullanma tarihini SIFIRLAMAZ. Süre dolduktan sonra yeni başvuru gerekir.",
      "zh-Hans": "申请自初始评估结果日起3年内有效。更新、额外ANZSCO评估、技能就业评估或复审不会重置到期日。到期后需重新申请。",
    },
  },
  notes: [
    {
      en: "CPA Australia is one of three authorised assessing authorities for accounting occupations (alongside CA ANZ and IPA). This module models only CPA Australia.",
      tr: "CPA Australia, muhasebe meslekleri için üç yetkili değerlendirme kurumundan biridir (CA ANZ ve IPA ile birlikte). Bu modül yalnızca CPA Australia'yı modellemektedir.",
      "zh-Hans": "CPA Australia是会计职业的三个授权评估机构之一（与CA ANZ和IPA并列）。本模块仅涵盖CPA Australia。",
    },
    {
      en: "PRC (Chinese) qualification verification is recommended via VETASSESS — CPA Australia suggests applicants use VETASSESS for Chinese Degree Verification, and reports must be sent directly to migrationupload@cpaaustralia.com.au.",
      tr: "ÇHC (Çin) yeterlilik doğrulaması için VETASSESS önerilir — CPA Australia, Çin Derece Doğrulaması için başvuru sahiplerinin VETASSESS kullanmasını önerir ve raporların doğrudan migrationupload@cpaaustralia.com.au adresine gönderilmesi gerekir.",
      "zh-Hans": "建议通过VETASSESS进行中国学历验证——CPA Australia建议申请人使用VETASSESS进行中国学位验证，报告必须直接发送至migrationupload@cpaaustralia.com.au。",
    },
  ],
  // ── Occupation Competency Mapping ───────────────────────────────────
  occupationCompetencyMapping: {
    note: "Each ANZSCO occupation requires a specific set of mandatory competencies for the educational-knowledge component of qualification assessment.",
    sharedCompetencies: [
      "Accounting Systems and Processes",
      "Economics",
      "Financial Accounting and Reporting",
      "Finance and Financial Management",
      "Management Accounting",
      "Quantitative Methods",
    ],
    byOccupation: {
      "Accountant (General) - 221111": [
        "Accounting Systems and Processes",
        "Economics",
        "Financial Accounting and Reporting",
        "Finance and Financial Management",
        "Management Accounting",
        "Quantitative Methods",
      ],
      "Corporate Treasurer - 221212": [
        "Business Law",
        "Economics",
        "Financial Accounting and Reporting",
        "Finance and Financial Management",
        "Management Accounting",
        "Quantitative Methods",
      ],
      "Finance Manager - 132211": [
        "Business Law",
        "Economics",
        "Financial Accounting and Reporting",
        "Finance and Financial Management",
        "Management Accounting",
        "Quantitative Methods",
      ],
      "Management Accountant - 221112": [
        "Accounting Systems and Processes",
        "Business Law",
        "Financial Accounting and Reporting",
        "Finance and Financial Management",
        "Management Accounting",
        "Quantitative Methods",
      ],
      "Taxation Accountant - 221113": [
        "Australian Taxation Law (must specifically cover Australian tax law)",
        "Financial Accounting and Reporting",
        "Finance and Financial Management",
        "Management Accounting",
        "Quantitative Methods",
      ],
      "External Auditor - 221213": [
        "Accounting Systems and Processes",
        "Audit and Assurance",
        "Economics",
        "Financial Accounting and Reporting",
        "Finance and Financial Management",
        "Quantitative Methods",
      ],
    },
  },
  englishRequirements: [
    {
      test: "Cambridge C1 Advanced",
      minimumScore:
        "Pre 7 Aug 2025: 185 all bands; Post 7 Aug 2025: 175/179/193/194 (L/R/W/S)",
    },
    {
      test: "IELTS Academic",
      minimumScore: "7.0 all bands",
      note: "Only Academic version accepted; OSR accepted for assessment but may not be accepted by DHA for some visa subclasses.",
    },
    {
      test: "PTE Academic",
      minimumScore:
        "Pre 7 Aug 2025: 65 all; Post 7 Aug 2025: 58/59/69/76 (L/R/W/S)",
    },
    {
      test: "TOEFL iBT",
      minimumScore:
        "Pre 7 Aug 2025: 24/24/27/23 (L/R/W/S); Post 7 Aug 2025: 22/22/26/24",
      note: "Tests taken 26 Jul 2023–5 May 2024 NOT accepted (unapproved test period).",
    },
    {
      test: "Michigan English Test (MET)",
      minimumScore: "61/63/74/59 (L/R/W/S)",
      note: "Only accepted for tests taken on/after 7 Aug 2025.",
    },
    {
      test: "LANGUAGECERT Academic",
      minimumScore: "67/71/78/82 (L/R/W/S)",
      note: "Only accepted for tests taken on/after 7 Aug 2025.",
    },
    {
      test: "CELPIP General",
      minimumScore: "9/8/10/8 (L/R/W/S)",
      note: "Only accepted for tests taken on/after 7 Aug 2025.",
    },
    {
      test: "Accounting Professional Year Program (PYP)",
      minimumScore: "N/A",
      note: "Completion certificate + transcript accepted in lieu of a language test; no expiry/validity period applies to this route.",
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
    en: "3 years from test date; must remain within validity at the time the qualification assessment outcome is issued, including for any update, review, or additional-ANZSCO request. 'At-home'/online test versions are never accepted.",
    tr: "Test tarihinden itibaren 3 yıl; yeterlilik değerlendirme sonucu verildiği sırada, herhangi bir güncelleme, inceleme veya ek ANZSCO talebi dahil, geçerlilik içinde kalmalıdır. 'Evde'/çevrimiçi test versiyonları asla kabul edilmez.",
    "zh-Hans": "自考试之日起3年；在资格评估结果签发时必须仍在有效期内，包括任何更新、复审或额外ANZSCO请求。'居家'/在线考试版本概不接受。",
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
      eligibleFor: [
        {
          en: "All applicants seeking a CPA Australia skills assessment for a listed ANZSCO occupation",
          tr: "Listelenmiş ANZSCO meslekleri için CPA Australia beceri değerlendirmesi isteyen tüm başvuru sahipleri",
          "zh-Hans": "所有为列出的ANZSCO职业申请CPA Australia技能评估的申请人",
        },
      ],
      requiresPriorAssessment: false,
      fees: [
        { label: { en: "Qualification assessment (onshore)", tr: "Yeterlilik değerlendirmesi (yerli)", "zh-Hans": "资格评估（境内）" }, amountAUD: 565 },
        { label: { en: "Qualification assessment (offshore)", tr: "Yeterlilik değerlendirmesi (yabancı)", "zh-Hans": "资格评估（境外）" }, amountAUD: 514 },
        {
          label: { en: "Qualification assessment (Singapore)", tr: "Yeterlilik değerlendirmesi (Singapur)", "zh-Hans": "资格评估（新加坡）" },
          amountAUD: 560,
          note: {
            en: "Plus 9% Singapore GST for payments on/after 1 Jan 2024.",
            tr: "1 Ocak 2024 ve sonrasında ödemeler için %9 Singapur GST eklenir.",
            "zh-Hans": "2024年1月1日及之后付款需加收9%新加坡消费税。",
          },
        },
        { label: { en: "Fast Track qualification assessment (onshore)", tr: "Hızlı Yeterlilik değerlendirmesi (yerli)", "zh-Hans": "快速资格评估（境内）" }, amountAUD: 675 },
        { label: { en: "Fast Track qualification assessment (offshore)", tr: "Hızlı Yeterlilik değerlendirmesi (yabancı)", "zh-Hans": "快速资格评估（境外）" }, amountAUD: 614 },
        { label: { en: "Fast Track qualification assessment (Singapore)", tr: "Hızlı Yeterlilik değerlendirmesi (Singapur)", "zh-Hans": "快速资格评估（新加坡）" }, amountAUD: 669 },
        {
          label: { en: "Qualification assessment — Additional ANZSCO (onshore)", tr: "Yeterlilik değerlendirmesi — Ek ANZSCO (yerli)", "zh-Hans": "资格评估——额外ANZSCO（境内）" },
          amountAUD: 260,
        },
        {
          label: { en: "Qualification assessment — Additional ANZSCO (offshore)", tr: "Yeterlilik değerlendirmesi — Ek ANZSCO (yabancı)", "zh-Hans": "资格评估——额外ANZSCO（境外）" },
          amountAUD: 236,
        },
        {
          label: { en: "Qualification assessment — Additional ANZSCO (Singapore)", tr: "Yeterlilik değerlendirmesi — Ek ANZSCO (Singapur)", "zh-Hans": "资格评估——额外ANZSCO（新加坡）" },
          amountAUD: 257,
        },
        { label: { en: "Fast Track — Additional ANZSCO (onshore)", tr: "Hızlı — Ek ANZSCO (yerli)", "zh-Hans": "快速——额外ANZSCO（境内）" }, amountAUD: 310 },
        { label: { en: "Fast Track — Additional ANZSCO (offshore)", tr: "Hızlı — Ek ANZSCO (yabancı)", "zh-Hans": "快速——额外ANZSCO（境外）" }, amountAUD: 282 },
        { label: { en: "Fast Track — Additional ANZSCO (Singapore)", tr: "Hızlı — Ek ANZSCO (Singapur)", "zh-Hans": "快速——额外ANZSCO（新加坡）" }, amountAUD: 307 },
        {
          label: { en: "Qualification assessment — Update (onshore)", tr: "Yeterlilik değerlendirmesi — Güncelleme (yerli)", "zh-Hans": "资格评估——更新（境内）" },
          amountAUD: 185,
        },
        {
          label: { en: "Qualification assessment — Update (offshore)", tr: "Yeterlilik değerlendirmesi — Güncelleme (yabancı)", "zh-Hans": "资格评估——更新（境外）" },
          amountAUD: 168,
        },
        {
          label: { en: "Qualification assessment — Update (Singapore)", tr: "Yeterlilik değerlendirmesi — Güncelleme (Singapur)", "zh-Hans": "资格评估——更新（新加坡）" },
          amountAUD: 183,
        },
        { label: { en: "Review (onshore)", tr: "İnceleme (yerli)", "zh-Hans": "复审（境内）" }, amountAUD: 185 },
        { label: { en: "Review (offshore)", tr: "İnceleme (yabancı)", "zh-Hans": "复审（境外）" }, amountAUD: 168 },
        { label: { en: "Review (Singapore)", tr: "İnceleme (Singapur)", "zh-Hans": "复审（新加坡）" }, amountAUD: 183 },
        {
          label: { en: "Administration fee (withdrawal before work commenced, onshore)", tr: "İdari ücret (iş başlamadan önce geri çekilme, yerli)", "zh-Hans": "行政费（工作开始前撤回，境内）" },
          amountAUD: 85,
        },
        { label: { en: "Administration fee (offshore)", tr: "İdari ücret (yabancı)", "zh-Hans": "行政费（境外）" }, amountAUD: 77 },
        { label: { en: "Administration fee (Singapore)", tr: "İdari ücret (Singapur)", "zh-Hans": "行政费（新加坡）" }, amountAUD: 84 },
      ],
      processingTimeWeeks: {
        standard: 2,
        ifIncomplete: 12,
        note: {
          en: "Fast Track applies only to Qualification Assessment and Qualification Assessment — Additional ANZSCO. Excludes weekends, public holidays, and year-end office closure.",
          tr: "Hızlı İşlem yalnızca Yeterlilik Değerlendirmesi ve Yeterlilik Değerlendirmesi — Ek ANZSCO için geçerlidir. Hafta sonları, resmi tatiller ve yıl sonu ofis kapanışını içermez.",
          "zh-Hans": "快速处理仅适用于资格评估和资格评估——额外ANZSCO。不包括周末、公共假期和年末办公室关闭。",
        },
      },
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
          en: "Official syllabus for non-CPA-accredited qualifications (or statutory declaration in exceptional circumstances).",
          tr: "CPA akredite olmayan yeterlilikler için resmi müfredat (veya istisnai durumlarda yeminli beyan).",
          "zh-Hans": "非CPA认可资格的正式课程大纲（或在特殊情况下法定声明）。",
        },
        {
          en: "Chinese Degree Verification for PRC qualifications — verification body must send reports directly to CPA Australia.",
          tr: "ÇHC yeterlilikleri için Çin Derece Doğrulaması — doğrulama kurumu raporları doğrudan CPA Australia'ya göndermelidir.",
          "zh-Hans": "中国学历验证——验证机构必须将报告直接发送给CPA Australia。",
        },
        {
          en: "Third-party authorisation form if a migration agent is managing the application.",
          tr: "Göçmenlik danışmanı başvuruyu yönetiyorsa üçüncü taraf yetkilendirme formu.",
          "zh-Hans": "如移民代理管理申请，需第三方授权表格。",
        },
      ],
      notes: [
        {
          en: "Accredited course search tool available to check if a qualification is pre-recognised (skips syllabus submission requirement).",
          tr: "Bir yeterliliğin önceden tanınıp tanınmadığını kontrol etmek için akredite kurs arama aracı mevcuttur (müfredat gönderme gereksinimini atlar).",
          "zh-Hans": "可使用认证课程搜索工具检查资格是否已预先认可（跳过课程大纲提交要求）。",
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
      eligibleFor: [
        {
          en: "Applicants who have received a 'Suitable' qualification assessment outcome for their nominated ANZSCO code",
          tr: "Aday gösterilen ANZSCO kodu için 'Uygun' yeterlilik değerlendirme sonucu alan başvuru sahipleri",
          "zh-Hans": "已为其提名ANZSCO代码获得'合适'资格评估结果的申请人",
        },
      ],
      requiresPriorAssessment: true,
      fees: [
        { label: { en: "Skilled employment assessment (onshore)", tr: "Becerili istihdam değerlendirmesi (yerli)", "zh-Hans": "技能就业评估（境内）" }, amountAUD: 260 },
        { label: { en: "Skilled employment assessment (offshore)", tr: "Becerili istihdam değerlendirmesi (yabancı)", "zh-Hans": "技能就业评估（境外）" }, amountAUD: 236 },
        { label: { en: "Skilled employment assessment (Singapore)", tr: "Becerili istihdam değerlendirmesi (Singapur)", "zh-Hans": "技能就业评估（新加坡）" }, amountAUD: 257 },
        {
          label: { en: "Combined — Qualification + skilled employment (onshore)", tr: "Kombine — Yeterlilik + becerili istihdam (yerli)", "zh-Hans": "联合——资格+技能就业（境内）" },
          amountAUD: 620,
        },
        {
          label: { en: "Combined — Qualification + skilled employment (offshore)", tr: "Kombine — Yeterlilik + becerili istihdam (yabancı)", "zh-Hans": "联合——资格+技能就业（境外）" },
          amountAUD: 564,
        },
        {
          label: { en: "Combined — Qualification + skilled employment (Singapore)", tr: "Kombine — Yeterlilik + becerili istihdam (Singapur)", "zh-Hans": "联合——资格+技能就业（新加坡）" },
          amountAUD: 615,
        },
        {
          label: { en: "Combined — Qualification + skilled employment, Additional ANZSCO (onshore)", tr: "Kombine — Yeterlilik + becerili istihdam, Ek ANZSCO (yerli)", "zh-Hans": "联合——资格+技能就业，额外ANZSCO（境内）" },
          amountAUD: 350,
        },
        {
          label: { en: "Combined — Additional ANZSCO (offshore)", tr: "Kombine — Ek ANZSCO (yabancı)", "zh-Hans": "联合——额外ANZSCO（境外）" },
          amountAUD: 318,
        },
        {
          label: { en: "Combined — Additional ANZSCO (Singapore)", tr: "Kombine — Ek ANZSCO (Singapur)", "zh-Hans": "联合——额外ANZSCO（新加坡）" },
          amountAUD: 347,
        },
        {
          label: { en: "Skilled employment assessment — Update (onshore)", tr: "Becerili istihdam değerlendirmesi — Güncelleme (yerli)", "zh-Hans": "技能就业评估——更新（境内）" },
          amountAUD: 185,
        },
        {
          label: { en: "Skilled employment assessment — Update (offshore)", tr: "Becerili istihdam değerlendirmesi — Güncelleme (yabancı)", "zh-Hans": "技能就业评估——更新（境外）" },
          amountAUD: 168,
        },
        {
          label: { en: "Skilled employment assessment — Update (Singapore)", tr: "Becerili istihdam değerlendirmesi — Güncelleme (Singapur)", "zh-Hans": "技能就业评估——更新（新加坡）" },
          amountAUD: 183,
        },
      ],
      documentRequirements: [
        {
          en: "Employer testimonial per role (letterhead with full business contact details; signed by a person at a higher level than the applicant, with direct work contact details; complete DD/MM/YYYY start-end dates per role; specific duties in the employer's own words — no generic/ABS-copied descriptions; employment terms, weekly hours, annual salary).",
          tr: "Her pozisyon için işveren referans mektubu (tam iş iletişim bilgileri olan antetli kağıt; başvuru sahibinden daha üst düzeyde, doğrudan iş iletişim bilgileri olan bir kişi tarafından imzalanmış; her pozisyon için tam GG/AA/YYYY başlangıç-bitiş tarihleri; işverenin kendi kelimeleriyle belirli görevler — genel/ABS'ten kopyalanmış açıklamalar yok; çalışma şartları, haftalık saatler, yıllık maaş).",
          "zh-Hans": "每个职位的雇主证明信（有完整业务联系方式的抬头纸；由比申请人级别更高且有直接工作联系方式的人签署；每个职位的完整DD/MM/YYYY开始-结束日期；雇主用自己的话描述的具体职责——不得使用通用/ABS复制的描述；雇佣条款、每周工时、年薪）。",
        },
        {
          en: "Minimum 3 pay slips per claimed role (start, middle, end of role ideally).",
          tr: "İddia edilen her pozisyon için en az 3 maaş bordrosu (tercihen başlangıç, orta, bitiş).",
          "zh-Hans": "每个声称职位至少3份工资单（最好为开始、中期、结束）。",
        },
        {
          en: "Self-employed: testimonial on official letterhead + statutory declaration of truthfulness, business registration, practising certificate, tax returns (first/middle/final year), 2+ client references.",
          tr: "Serbest çalışan: resmi antetli kağıtta referans mektubu + doğruluk yeminli beyanı, iş kaydı, çalışma sertifikası, vergi beyannameleri (ilk/orta/son yıl), 2+ müşteri referansı.",
          "zh-Hans": "自雇：正式抬头纸上的证明信+真实性法定声明、营业执照、执业证书、纳税申报表（第一/中间/最后一年）、2份以上客户推荐信。",
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
          en: "Statutory declaration may substitute an employer testimonial only if a letterhead reference is genuinely unobtainable, and must still include all standard testimonial content.",
          tr: "Yeminli beyan, yalnızca antetli kağıt referansı gerçekten elde edilemiyorsa işveren referans mektubunun yerine geçebilir ve yine de tüm standart referans içeriğini içermelidir.",
          "zh-Hans": "只有在确实无法获得抬头纸推荐信的情况下，法定声明才能代替雇主证明信，且仍需包含所有标准证明内容。",
        },
      ],
    },
  ],
};
