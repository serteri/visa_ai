import type { SkillsAssessmentAuthority, LocalizedString } from "../types";

/**
 * Engineers Australia (The Institution of Engineers Australia)
 * Source: Engineers Australia — Prepare your Migration Skills Assessment application
 *         (official guide) + EA web content
 * Verified: 2026-08-04
 *
 * NOTE: The source PDF (175 pages) is mostly the accredited-program list.
 * Fees and processing times are NOT listed — marked as null.
 * English requirements changed for tests taken on/after 7 August 2025.
 *
 * Multilanguage support: EN, TR, ZH-Hans
 */
export const engineersAustraliaAuthority: SkillsAssessmentAuthority = {
  authorityId: "EA",
  authorityName: "Engineers Australia (The Institution of Engineers Australia)",
  country: "AU",
  lastVerified: "2026-08-04",
  sourceDocument:
    "Engineers Australia — Prepare your Migration Skills Assessment application (official guide) + EA web content",
  notes: [
    {
      en: "Engineers Australia is the largest Australian assessing authority by occupation count (27+ engineering occupations across 4 categories).",
      tr: "Engineers Australia, meslek sayısı bakımından en büyük Avustralya değerlendirme kurumudur (4 kategoride 27+ mühendislik mesleği).",
      "zh-Hans": "Engineers Australia是澳大利亚按职业数量计算最大的评估机构（4个类别27+个工程职业）。",
    },
    {
      en: "Assessment outcome is a 'Skill Level' (Professional Engineer / Engineering Technologist / Engineering Associate), NOT a occupation-specific pass/fail.",
      tr: "Değerlendirme sonucu bir 'Beceri Seviyesi'dir (Profesyonel Mühendis / Mühendislik Teknoloğu / Mühendislik Asistanı), mesleğe özgü geçti/kaldı DEĞİLDİR.",
      "zh-Hans": "评估结果是'技能等级'（专业工程师/工程技师/工程助理），而非特定职业的通过/未通过。",
    },
    {
      en: "The Competency Demonstration Report (CDR) pathway is the most common for overseas-qualified engineers.",
      tr: "Yetkinlik Gösterim Raporu (CDR) yolu, yurtdışında eğitim alan mühendisler için en yaygın olandır.",
      "zh-Hans": "能力展示报告（CDR）途径是海外学历工程师最常见的选择。",
    },
  ],
  englishRequirements: [
    {
      test: "IELTS (General or Academic, incl. One Skill Retake)",
      minimumScore: "6 all bands",
      note: "Same threshold pre and post 7 Aug 2025. See TOEFL/PTE/Cambridge/LANGUAGECERT/MET/CELPIP for changed thresholds post 7 Aug 2025.",
    },
    {
      test: "TOEFL iBT",
      minimumScore:
        "Pre 7 Aug 2025: 12/13/21/18 (L/R/W/S); Post 7 Aug 2025: 16/16/19/19",
    },
    {
      test: "PTE Academic",
      minimumScore:
        "Pre 7 Aug 2025: 50 all; Post 7 Aug 2025: 47/48/51/54 (L/R/W/S)",
    },
    {
      test: "Cambridge C1 Advanced",
      minimumScore: "169 all bands (both periods)",
    },
    {
      test: "LANGUAGECERT Academic Test",
      minimumScore: "57/60/64/70 (L/R/W/S), post 7 Aug 2025 table only",
    },
    {
      test: "Michigan English Test (MET)",
      minimumScore: "56/55/57/48 (L/R/W/S), post 7 Aug 2025 table only",
    },
    {
      test: "CELPIP General",
      minimumScore: "7 all bands, post 7 Aug 2025 table only",
    },
  ],
  englishExemptions: [
    "Graduated from an Australian institution with two academic years of study (min. 92 weeks) at a CRICOS-registered institution, AQF level 6 or above.",
    "Citizen and valid passport holder of UK, USA, Canada, New Zealand, or Republic of Ireland.",
  ],
  englishTestValidity: {
    en: "Test must be taken within 3 years before lodging and remain valid/verifiable during assessment.",
    tr: "Test, başvurudan önce 3 yıl içinde yapılmış olmalı ve değerlendirme sırasında geçerli/doğrulanabilir kalmalıdır.",
    "zh-Hans": "考试必须在申请前3年内进行，并在评估期间保持有效/可验证。",
  },
  validityPeriod: {
    years: 3,
    note: {
      en: "The Department of Home Affairs requires a valid skills assessment outcome at time of invitation. An updated outcome letter service is available if the original assessment is more than 3 years old.",
      tr: "İçişleri Bakanlığı, davet sırasında geçerli bir beceri değerlendirme sonucu gerektirir. Orijinal değerlendirme 3 yıldan eskiyse güncellenmiş sonuç mektubu hizmeti mevcuttur.",
      "zh-Hans": "内政部要求在邀请时具有有效的技能评估结果。如果原始评估超过3年，可提供更新结果信服务。",
    },
  },
  fraudPolicy: {
    en: "Plagiarism (including career episodes or summary statements written by a third party) results in immediate application rejection and a 12, 24, or 36-month ban on reapplying. Engineers Australia may impose or extend a ban at any stage and may report details to the Department of Home Affairs.",
    tr: "İntihal (üçüncü taraf tarafından yazılan kariyer bölümleri veya özet ifadeler dahil), derhal başvuru reddi ve 12, 24 veya 36 aylık yeniden başvuru yasağı ile sonuçlanır. Engineers Australia her aşamada yasak uygulayabilir veya uzatabilir ve detayları İçişleri Bakanlığı'na bildirebilir.",
    "zh-Hans": "抄袭（包括由第三方撰写的职业片段或总结陈述）将导致立即拒绝申请，并禁止12、24或36个月内重新申请。Engineers Australia可在任何阶段实施或延长禁令，并可向内政部报告详情。",
  },
  // Occupations: 27 engineering roles across 233xxx/312xxx/133211 series.
  // Mapped from occupations.json where authority === "Engineers Australia".
  occupations: [
    { anzscoCode: "233911", title: "Aeronautical Engineer" },
    { anzscoCode: "233912", title: "Agricultural Engineer" },
    { anzscoCode: "233913", title: "Biomedical Engineer" },
    { anzscoCode: "233111", title: "Chemical Engineer" },
    { anzscoCode: "233211", title: "Civil Engineer" },
    { anzscoCode: "312211", title: "Civil Engineering Draftsperson" },
    { anzscoCode: "233311", title: "Electrical Engineer" },
    { anzscoCode: "312311", title: "Electrical Engineering Draftsperson" },
    { anzscoCode: "312312", title: "Electrical Engineering Technician" },
    { anzscoCode: "312412", title: "Electronic Engineering Technician" },
    { anzscoCode: "233411", title: "Electronics Engineer" },
    { anzscoCode: "312411", title: "Electronic Engineering Draftsperson" },
    { anzscoCode: "133211", title: "Engineering Manager" },
    { anzscoCode: "233999", title: "Engineering Professionals nec" },
    { anzscoCode: "233914", title: "Engineering Technologist" },
    { anzscoCode: "233915", title: "Environmental Engineer" },
    { anzscoCode: "233212", title: "Geotechnical Engineer" },
    { anzscoCode: "233511", title: "Industrial Engineer" },
    { anzscoCode: "233112", title: "Materials Engineer" },
    { anzscoCode: "233512", title: "Mechanical Engineer" },
    { anzscoCode: "312511", title: "Mechanical Engineering Draftsperson" },
    { anzscoCode: "312512", title: "Mechanical Engineering Technician" },
    { anzscoCode: "233612", title: "Petroleum Engineer" },
    { anzscoCode: "233916", title: "Naval Architect" },
    { anzscoCode: "233214", title: "Structural Engineer" },
    { anzscoCode: "263311", title: "Telecommunications Engineer" },
    { anzscoCode: "263312", title: "Telecommunications Network Engineer" },
  ],
  // ── Occupational Categories ──────────────────────────────────────────
  occupationalCategories: [
    {
      name: "Professional Engineer",
      qualification:
        "Four-year professional engineering degree accredited or recognised by Engineers Australia, or comparable overseas qualification, or a degree accredited under the Washington Accord.",
      skillFocus:
        "Overall systems, developing and applying new engineering practices, leadership and management, holistic problem-solving.",
    },
    {
      name: "Engineering Technologist",
      qualification:
        "Three-year engineering technology degree accredited or recognised by Engineers Australia, or comparable overseas qualification, or a degree accredited under the Sydney Accord.",
      skillFocus:
        "System interactions, modifying and adapting established engineering practices, advancing engineering technology.",
    },
    {
      name: "Engineering Associate",
      qualification:
        "Two-year advanced diploma or associate degree in engineering, accredited or recognised by Engineers Australia, or comparable overseas qualification, or a degree accredited under the Dublin Accord.",
      skillFocus:
        "Specific system elements, working within codes, applying established practices and procedures.",
    },
    {
      name: "Engineering Manager",
      qualification:
        "Bachelor of Engineering degree or comparable qualification in a related field, plus relevant experience.",
      skillFocus:
        "Formulating, implementing and monitoring engineering strategies and plans; directing engineering operations.",
      notes: [
        {
          en: "ANZSCO occupation under the Managers group, not an Engineers Australia membership occupational category.",
          tr: "ANZSCO mesleği Yöneticiler grubu altındadır, Engineers Australia üyeliği meslek kategorisi değildir.",
          "zh-Hans": "ANZSCO职业属于管理组，不是Engineers Australia会员职业类别。",
        },
        {
          en: "A positive outcome does not grant automatic Engineers Australia membership.",
          tr: "Olumlu sonuç otomatik Engineers Australia üyeliği vermez.",
          "zh-Hans": "积极结果不自动授予Engineers Australia会员资格。",
        },
        {
          en: "Relevant Skilled Employment Assessment is mandatory for this category.",
          tr: "Bu kategori için İlgili Becerili İstihdam Değerlendirmesi zorunludur.",
          "zh-Hans": "此类别必须进行相关技能就业评估。",
        },
      ],
    },
  ],
  pathways: [
    // ── Pathway 1: Australian Qualification ──────────────────────────────
    {
      pathwayId: "AU_QUALIFICATION",
      name: {
        en: "Australian Qualification Pathway (accredited)",
        tr: "Avustralya Yeterlilik Yolu (akredite)",
        "zh-Hans": "澳大利亚资格途径（认证）",
      },
      eligibleFor: [
        {
          en: "Program accredited by Engineers Australia",
          tr: "Engineers Australia tarafından akredite program",
          "zh-Hans": "经Engineers Australia认证的课程",
        },
        {
          en: "Program started during or after the accreditation commencement year",
          tr: "Program akreditasyon başlangıç yılı sırasında veya sonrasında başlamış",
          "zh-Hans": "课程在认证起始年或之后开始",
        },
      ],
      requiresPriorAssessment: false,
      fees: [
        {
          label: { en: "Application fee", tr: "Başvuru ücreti", "zh-Hans": "申请费" },
          amountAUD: undefined,
          note: {
            en: "Not stated in source document; confirm current fee schedule on Engineers Australia website.",
            tr: "Kaynak belgede belirtilmemiş; güncel ücret tarifesini Engineers Australia web sitesinden doğrulayın.",
            "zh-Hans": "源文件未注明；请在Engineers Australia网站确认当前费用表。",
          },
        },
      ],
      documentRequirements: [
        {
          en: "High-resolution colour scan of valid passport bio data page.",
          tr: "Geçerli pasaport biyografik sayfasının yüksek çözünürlüklü renkli taraması.",
          "zh-Hans": "有效护照个人信息页的高分辨率彩色扫描。",
        },
        {
          en: "Change of name documents (if applicable).",
          tr: "İsim değişikliği belgeleri (varsa).",
          "zh-Hans": "姓名变更文件（如适用）。",
        },
        {
          en: "Recent high-resolution colour passport-sized photograph.",
          tr: "Yakın tarihli yüksek çözünürlüklü renkli pasaport boyutu fotoğraf.",
          "zh-Hans": "近期高分辨率彩色护照尺寸照片。",
        },
        {
          en: "Detailed CV.",
          tr: "Detaylı CV.",
          "zh-Hans": "详细简历。",
        },
        {
          en: "Evidence of English language competency (unless exempt).",
          tr: "İngilizce yeterlilik kanıtı (muaf değilse).",
          "zh-Hans": "英语能力证明（除非豁免）。",
        },
        {
          en: "High-resolution colour scan of qualifications incl. degree certificate/testamur.",
          tr: "Derece sertifikası/testamur dahil yeterliliklerin yüksek çözünürlüklü renkli taraması.",
          "zh-Hans": "包括学位证书/毕业证在内的资格高分辨率彩色扫描。",
        },
        {
          en: "High-resolution colour scan of academic transcripts, with official English translation if applicable.",
          tr: "Akademik transkriptlerin yüksek çözünürlüklü renkli taraması, uygulanabilirse resmi İngilizce çeviri ile.",
          "zh-Hans": "学术成绩单的高分辨率彩色扫描，如适用附官方英语翻译。",
        },
      ],
      notes: [
        {
          en: "From 1 September 2024, only qualifications accredited by Engineers Australia are eligible for this pathway for Advanced Diploma/Associate Degree holders.",
          tr: "1 Eylül 2024'ten itibaren, yalnızca Engineers Australia tarafından akredite yeterlilikler bu yol için İleri Diplomalı/Önlisans Derecesi sahipleri için uygundur.",
          "zh-Hans": "自2024年9月1日起，只有经Engineers Australia认证的资格才有资格通过此途径申请高级文凭/副学士学位持有者。",
        },
      ],
    },
    // ── Pathway 2: Washington Accord ─────────────────────────────────────
    {
      pathwayId: "WASHINGTON_ACCORD",
      name: {
        en: "Washington Accord Pathway (accredited, Professional Engineer level)",
        tr: "Washington Accord Yolu (akredite, Profesyonel Mühendis seviyesi)",
        "zh-Hans": "华盛顿协议途径（认证，专业工程师级别）",
      },
      eligibleFor: [
        {
          en: "Accredited qualification from a Washington Accord signatory country",
          tr: "Washington Accord imzacı ülkeden akredite yeterlilik",
          "zh-Hans": "来自华盛顿协议签署国的认证资格",
        },
        {
          en: "French engineering degree under the CTI agreement",
          tr: "CTI anlaşması kapsamında Fransız mühendislik derecesi",
          "zh-Hans": "CTI协议下的法国工程学位",
        },
        {
          en: "Spanish Master of Industrial Engineering registered by CGCOII",
          tr: "CGCOII tarafından kayıtlı İspanyol Endüstri Mühendisliği Yüksek Lisansı",
          "zh-Hans": "CGCOII注册的西班牙工业工程硕士",
        },
        {
          en: "Spanish Master of Civil Engineering with CICCP registration evidence",
          tr: "CICCP kayıt kanıtlı İspanyol İnşaat Mühendisliği Yüksek Lisansı",
          "zh-Hans": "有CICCP注册证明的西班牙土木工程硕士",
        },
      ],
      requiresPriorAssessment: false,
      fees: [
        {
          label: { en: "Application fee", tr: "Başvuru ücreti", "zh-Hans": "申请费" },
          amountAUD: undefined,
          note: {
            en: "Not stated in source document.",
            tr: "Kaynak belgede belirtilmemiş.",
            "zh-Hans": "源文件未注明。",
          },
        },
      ],
      documentRequirements: [
        {
          en: "Same as Australian Qualification Pathway document list.",
          tr: "Avustralya Yeterlilik Yolu belge listesiyle aynı.",
          "zh-Hans": "与澳大利亚资格途径文件清单相同。",
        },
      ],
    },
    // ── Pathway 3: Sydney Accord ────────────────────────────────────────
    {
      pathwayId: "SYDNEY_ACCORD",
      name: {
        en: "Sydney Accord Pathway (accredited, Engineering Technologist level)",
        tr: "Sydney Accord Yolu (akredite, Mühendislik Teknoloğu seviyesi)",
        "zh-Hans": "悉尼协议途径（认证，工程技师级别）",
      },
      eligibleFor: [
        {
          en: "Accredited qualification from a Sydney Accord signatory country",
          tr: "Sydney Accord imzacı ülkeden akredite yeterlilik",
          "zh-Hans": "来自悉尼协议签署国的认证资格",
        },
      ],
      requiresPriorAssessment: false,
      fees: [
        {
          label: { en: "Application fee", tr: "Başvuru ücreti", "zh-Hans": "申请费" },
          amountAUD: undefined,
          note: {
            en: "Not stated in source document.",
            tr: "Kaynak belgede belirtilmemiş.",
            "zh-Hans": "源文件未注明。",
          },
        },
      ],
      documentRequirements: [
        {
          en: "Same as Australian Qualification Pathway document list.",
          tr: "Avustralya Yeterlilik Yolu belge listesiyle aynı.",
          "zh-Hans": "与澳大利亚资格途径文件清单相同。",
        },
      ],
    },
    // ── Pathway 4: Dublin Accord ────────────────────────────────────────
    {
      pathwayId: "DUBLIN_ACCORD",
      name: {
        en: "Dublin Accord Pathway (accredited, Engineering Associate level)",
        tr: "Dublin Accord Yolu (akredite, Mühendislik Asistanı seviyesi)",
        "zh-Hans": "都柏林协议途径（认证，工程助理级别）",
      },
      eligibleFor: [
        {
          en: "Accredited qualification from a Dublin Accord signatory country",
          tr: "Dublin Accord imzacı ülkeden akredite yeterlilik",
          "zh-Hans": "来自都柏林协议签署国的认证资格",
        },
      ],
      requiresPriorAssessment: false,
      fees: [
        {
          label: { en: "Application fee", tr: "Başvuru ücreti", "zh-Hans": "申请费" },
          amountAUD: undefined,
          note: {
            en: "Not stated in source document.",
            tr: "Kaynak belgede belirtilmemiş.",
            "zh-Hans": "源文件未注明。",
          },
        },
      ],
      documentRequirements: [
        {
          en: "Same as Australian Qualification Pathway document list.",
          tr: "Avustralya Yeterlilik Yolu belge listesiyle aynı.",
          "zh-Hans": "与澳大利亚资格途径文件清单相同。",
        },
      ],
    },
    // ── Pathway 5: CDR ─────────────────────────────────────────────────
    {
      pathwayId: "CDR",
      name: {
        en: "Competency Demonstration Report (CDR) Pathway",
        tr: "Yetkinlik Gösterim Raporu (CDR) Yolu",
        "zh-Hans": "能力展示报告（CDR）途径",
      },
      eligibleFor: [
        {
          en: "Provisionally-accredited Australian qualification",
          tr: "Geçici akredite Avustralya yeterliliği",
          "zh-Hans": "临时认证的澳大利亚资格",
        },
        {
          en: "Non-accredited engineering qualification",
          tr: "Akredite olmayan mühendislik yeterliliği",
          "zh-Hans": "非认证工程资格",
        },
        {
          en: "Accredited qualification but seeking assessment in a different occupation than the degree title",
          tr: "Akredite yeterlilik ancak derece başlığından farklı bir meslek için değerlendirme isteniyor",
          "zh-Hans": "认证资格但寻求评估与学位名称不同的职业",
        },
        {
          en: "Qualification(s) demonstrating underpinning knowledge aligned with the nominated occupation",
          tr: "Aday gösterilen meslekle uyumlu temel bilgileri gösteren yeterlilik(ler)",
          "zh-Hans": "证明与提名职业一致的基础知识的资格",
        },
        {
          en: "Engineering Manager nomination with evidence of relevant skilled employment",
          tr: "İlgili becerili istihdam kanıtı ile Mühendislik Yöneticisi adaylığı",
          "zh-Hans": "有相关技能就业证明的工程经理提名",
        },
      ],
      requiresPriorAssessment: false,
      minAcademicLevel: "AQF Level 6 (Advanced Diploma / Associate Degree) minimum",
      fees: [
        {
          label: { en: "Application fee", tr: "Başvuru ücreti", "zh-Hans": "申请费" },
          amountAUD: undefined,
          note: {
            en: "Not stated in source document.",
            tr: "Kaynak belgede belirtilmemiş.",
            "zh-Hans": "源文件未注明。",
          },
        },
      ],
      documentRequirements: [
        {
          en: "High-resolution colour scan of valid passport bio data page.",
          tr: "Geçerli pasaport biyografik sayfasının yüksek çözünürlüklü renkli taraması.",
          "zh-Hans": "有效护照个人信息页的高分辨率彩色扫描。",
        },
        {
          en: "Change of name documents (if applicable).",
          tr: "İsim değişikliği belgeleri (varsa).",
          "zh-Hans": "姓名变更文件（如适用）。",
        },
        {
          en: "Recent high-resolution colour passport-sized photograph.",
          tr: "Yakın tarihli yüksek çözünürlüklü renkli pasaport boyutu fotoğraf.",
          "zh-Hans": "近期高分辨率彩色护照尺寸照片。",
        },
        {
          en: "Detailed CV.",
          tr: "Detaylı CV.",
          "zh-Hans": "详细简历。",
        },
        {
          en: "Evidence of English language competency (unless exempt).",
          tr: "İngilizce yeterlilik kanıtı (muaf değilse).",
          "zh-Hans": "英语能力证明（除非豁免）。",
        },
        {
          en: "Degree certificate/testamur (colour scan, with translation if applicable).",
          tr: "Derece sertifikası/testamur (renkli tarama, varsa çeviri ile).",
          "zh-Hans": "学位证书/毕业证（彩色扫描，如适用附翻译）。",
        },
        {
          en: "Licensure/registration certificate (if applicable).",
          tr: "Lisans/kayıt sertifikası (varsa).",
          "zh-Hans": "执照/注册证书（如适用）。",
        },
        {
          en: "Academic transcripts (colour scan, with translation if applicable).",
          tr: "Akademik transkriptler (renkli tarama, varsa çeviri ile).",
          "zh-Hans": "学术成绩单（彩色扫描，如适用附翻译）。",
        },
        {
          en: "Written statement of continuing professional development (CPD).",
          tr: "Sürekli mesleki gelişim (CPD) yazılı beyanı.",
          "zh-Hans": "持续专业发展（CPD）书面声明。",
        },
        {
          en: "Three career episodes.",
          tr: "Üç kariyer bölümü.",
          "zh-Hans": "三篇职业片段。",
        },
        {
          en: "Summary statement (occupational-category-specific template).",
          tr: "Özet ifade (meslek kategorisine özgü şablon).",
          "zh-Hans": "总结陈述（职业类别特定模板）。",
        },
      ],
      competencyAssessment: {
        portfolioProjectsMin: 3,
        portfolioProjectsMax: 3,
        interviewDurationMinutes: 0,
        topicAreas: [
          {
            en: "Career Episode 1 — personal engineering activity",
            tr: "Kariyer Bölümü 1 — kişisel mühendislik faaliyeti",
            "zh-Hans": "职业片段1——个人工程活动",
          },
          {
            en: "Career Episode 2 — personal engineering activity",
            tr: "Kariyer Bölümü 2 — kişisel mühendislik faaliyeti",
            "zh-Hans": "职业片段2——个人工程活动",
          },
          {
            en: "Career Episode 3 — personal engineering activity",
            tr: "Kariyer Bölümü 3 — kişisel mühendislik faaliyeti",
            "zh-Hans": "职业片段3——个人工程活动",
          },
          {
            en: "Summary Statement — cross-reference to 16 stage-1 competency elements",
            tr: "Özet İfade — 16 aşama-1 yetkinlik unsuruna çapraz referans",
            "zh-Hans": "总结陈述——交叉引用16个阶段1能力要素",
          },
        ],
      },
      notes: [
        {
          en: "Must demonstrate all 16 stage-1 competency elements at least once across the three career episodes.",
          tr: "Üç kariyer bölümünde 16 aşama-1 yetkinlik unsurlarının tamamını en az bir kez göstermelidir.",
          "zh-Hans": "必须在三篇职业片段中至少展示一次所有16个阶段1能力要素。",
        },
        {
          en: "Each paragraph in a career episode is numbered for cross-referencing in the summary statement.",
          tr: "Kariyer bölümündeki her paragraf, özet ifadede çapraz referans için numaralandırılır.",
          "zh-Hans": "职业片段中的每个段落都编号，以便在总结陈述中交叉引用。",
        },
        {
          en: "Employer reference letter required if career episodes are employment-based.",
          tr: "Kariyer bölümleri istihdam tabanlıysa işveren referans mektubu gerekir.",
          "zh-Hans": "如果职业片段基于就业，则需要雇主推荐信。",
        },
        {
          en: "31 engineering occupations available in the CDR dropdown, as determined by the Australian government (ANZSCO). Choosing an occupation auto-populates skill level, ANZSCO code, and occupational category.",
          tr: "Avustralya hükümeti (ANZSCO) tarafından belirlenen CDR açılır menüsünde 31 mühendislik mesleği mevcuttur. Bir meslek seçmek beceri seviyesini, ANZSCO kodunu ve meslek kategorisini otomatik doldurur.",
          "zh-Hans": "CDR下拉菜单中有31个工程职业，由澳大利亚政府（ANZSCO）确定。选择职业会自动填充技能等级、ANZSCO代码和职业类别。",
        },
      ],
    },
  ],
  // ── Additional Assessment Services ────────────────────────────────────
  additionalAssessmentServices: [
    {
      name: "Overseas PhD qualification assessment",
      additionalDocuments: [
        "Thesis abstract.",
        "List of doctoral examiners with contact details and profile link.",
        "List of publications during/after doctoral program with links.",
      ],
    },
    {
      name: "Relevant Skilled Employment Assessment",
      mandatoryFor: ["Engineering Manager occupational category"],
      employeeDocuments: {
        primary: [
          "Reference letter on company letterhead: employment type, pay rate, employment period, job title, issuing manager/HR endorsement with contact details, company stamp if applicable, letter date, at least 5 main engineering duties.",
        ],
        secondary: [
          "Income tax/superannuation/social security/retirement contribution statements, OR work/residence permit or employment contract.",
        ],
      },
      selfEmployedDocuments: [
        "Client/contractor letters.",
        "Original invoices.",
        "Organisational chart.",
        "Business registration certificate.",
        "Business tax report.",
        "Bank statements.",
        "Optional: payroll tax receipts, personal income tax return, social security/pension contributions, business financial report, compliance letter.",
      ],
    },
    {
      name: "Updated outcome letter",
      when:
        "Original assessment outcome older than 3 years, or to update title/name/address",
      documentRequirements: [
        "Valid passport bio data page.",
        "Recent passport photo.",
        "Detailed CV.",
      ],
    },
  ],
  // ── Excluded Evidence ─────────────────────────────────────────────────
  excludedEvidence: [
    {
      en: "Statutory declarations and affidavits.",
      tr: "Yeminli beyanlar ve ikrarnameler.",
      "zh-Hans": "法定声明和宣誓书。",
    },
    {
      en: "Bank statements and payslips as secondary employment documents.",
      tr: "İkincil istihdam belgeleri olarak banka ekstreleri ve maaş bordroları.",
      "zh-Hans": "作为次要就业文件的银行对账单和工资单。",
    },
    {
      en: "Work experience claimed before qualification completion.",
      tr: "Yeterlilik tamamlanmadan önce iddia edilen iş deneyimi.",
      "zh-Hans": "声称资格完成前的工作经验。",
    },
    {
      en: "Research/teaching assistant work during PhD/MPhil as relevant skilled employment.",
      tr: "Doktora/MPhil sırasında araştırma/öğretim asistanlığı ilgili becerili istihdam olarak.",
      "zh-Hans": "博士/硕士期间的研究/教学助理工作作为相关技能就业。",
    },
    {
      en: "Lecturer/demonstrator/tutor roles as relevant skilled employment (different ANZSCO classification).",
      tr: "İlgili becerili istihdam olarak öğretim görevlisi/gösterici/özel ders rolleri (farklı ANZSCO sınıflandırması).",
      "zh-Hans": "作为相关技能就业的讲师/演示员/辅导员角色（不同的ANZSCO分类）。",
    },
  ],
};
