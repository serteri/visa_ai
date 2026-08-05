import type { SkillsAssessmentAuthority, LocalizedString } from "../types";

/**
 * Australian Computer Society (ACS)
 * Source: ACS Migration Skills Assessment — official guide
 * Fee increase effective 3 November 2025
 * Verified: 2025-11-03
 *
 * Multilanguage support: EN, TR, ZH-Hans
 * Largest occupation set of any authority (35 ICT/CS/Cyber Security roles).
 */
export const acsAuthority: SkillsAssessmentAuthority = {
  authorityId: "ACS",
  authorityName: "Australian Computer Society",
  country: "AU",
  lastVerified: "2025-11-03",
  sourceDocument:
    "ACS Migration Skills Assessment — official guide, fee increase effective 3 November 2025",
  notes: [
    {
      en: "ACS assessments are underpinned by SFIA (Skills Framework for the Information Age).",
      tr: "ACS değerlendirmeleri SFIA (Bilgi Çağı için Beceri Çerçevesi) üzerine kuruludur.",
      "zh-Hans": "ACS评估基于SFIA（信息时代技能框架）。",
    },
    {
      en: "A complimentary 12-month ACS membership is included with every Migration Skills Assessment.",
      tr: "Her Göçmenlik Beceri Değerlendirmesi ile birlikte ücretsiz 12 aylık ACS üyeliği dahildir.",
      "zh-Hans": "每次移民技能评估均附赠12个月ACS会员资格。",
    },
    {
      en: "ACS supports the Designated Area Migration Agreement (DAMA).",
      tr: "ACS, Belirlenmiş Alan Göç Anlaşmasını (DAMA) destekler.",
      "zh-Hans": "ACS支持指定区域移民协议（DAMA）。",
    },
  ],
  occupations: [
    // Data Science
    { anzscoCode: "224999", title: "Information and Organisation Professionals nec" },
    { anzscoCode: "224114", title: "Data Analyst" },
    { anzscoCode: "224115", title: "Data Scientist" },
    // ICT Managers (1351)
    { anzscoCode: "135111", title: "Chief Information Officer" },
    { anzscoCode: "135112", title: "ICT Project Manager" },
    { anzscoCode: "135199", title: "ICT Managers nec" },
    // ICT Trainers (2232)
    { anzscoCode: "223211", title: "ICT Trainer" },
    // ICT Business and Systems Analysts (2611)
    { anzscoCode: "261111", title: "ICT Business Analyst" },
    { anzscoCode: "261112", title: "Systems Analyst" },
    // Multimedia Specialists and Web Developers (2612)
    { anzscoCode: "261211", title: "Multimedia Specialist" },
    { anzscoCode: "261212", title: "Web Developer" },
    // Software and Applications Programmers (2613)
    { anzscoCode: "261311", title: "Analyst Programmer" },
    { anzscoCode: "261312", title: "Developer Programmer" },
    { anzscoCode: "261313", title: "Software Engineer" },
    { anzscoCode: "261314", title: "Software Tester" },
    { anzscoCode: "261316", title: "DevOps Engineer" },
    { anzscoCode: "261399", title: "Software and Application Programmer nec" },
    // Database and Systems Administrators (2621)
    { anzscoCode: "262111", title: "Database Administrator" },
    { anzscoCode: "262113", title: "Systems Administrator" },
    // ICT Security
    { anzscoCode: "262112", title: "ICT Security Specialist" },
    // Computer Network Professionals (2631)
    { anzscoCode: "263111", title: "Computer Network and Systems Engineer" },
    { anzscoCode: "263112", title: "Network Administrator" },
    { anzscoCode: "263113", title: "Network Analyst" },
    // ICT Support and Test Engineers (2632)
    { anzscoCode: "263211", title: "ICT Quality Assurance Engineer" },
    { anzscoCode: "263212", title: "ICT Support Engineer" },
    { anzscoCode: "263213", title: "ICT Systems Test Engineer" },
    { anzscoCode: "263299", title: "ICT Support and Test Engineer nec" },
    // ICT Support Technicians (3131)
    { anzscoCode: "313113", title: "Web Administrator" },
    // Cyber Security Occupations
    { anzscoCode: "261315", title: "Cyber Security Engineer" },
    { anzscoCode: "261317", title: "Penetration Tester" },
    { anzscoCode: "262114", title: "Cyber Governance Risk and Compliance Specialist" },
    { anzscoCode: "262115", title: "Cyber Security Advice and Assessment Specialist" },
    { anzscoCode: "262116", title: "Cyber Security Analyst" },
    { anzscoCode: "262117", title: "Cyber Security Architect" },
    { anzscoCode: "262118", title: "Cyber Security Operations Coordinator" },
  ],
  pathways: [
    // ── Pathway 1: Post Australian Study ──────────────────────────────
    {
      pathwayId: "POST_AU_STUDY",
      name: {
        en: "Post Australian Study",
        tr: "Avustralya Eğitimi Sonrası",
        "zh-Hans": "澳洲留学后评估",
      },
      eligibleFor: ["AU"],
      minWorkExperienceMonths: 12,
      qualificationDurationRequirement: {
        en: "Australian bachelor's degree or higher, IT/Data Science major, closely related to nominated occupation + ANZSCO code",
        tr: "Avustralya'da lisans veya üzeri, BT/Veri Bilimi dalı, ilgili meslek ile yakından ilişkili",
        "zh-Hans": "澳洲学士学位或以上，IT/数据科学专业，与提名职业密切相关",
      },
      fees: [{ label: { en: "Post Australian Study Assessment", tr: "Avustralya Eğitimi Sonrası Değerlendirme", "zh-Hans": "澳洲留学后评估" }, amountAUD: 1136 }],
      documentRequirements: [
        {
          en: "Two forms of photo identification (one must be current passport) plus evidence of name change if applicable.",
          tr: "İki adet fotoğraflı kimlik (biri güncel pasaport) + isim değişikliği kanıtı (varsa).",
          "zh-Hans": "两种身份证件（一种必须是有效护照）加姓名变更证明（如适用）。",
        },
        {
          en: "Australian Completion Letter or Award Certificate + Academic Transcript (colour scan of original).",
          tr: "Avustralya Tamamlama Mektubu veya Ödül Sertifikası + Akademik Transkript (orijinalin renkli taraması).",
          "zh-Hans": "澳洲完成信或学位证书 + 学术成绩单（原件彩色扫描）。",
        },
        {
          en: "Employment reference letter(s) on company letterhead, OR a 4-part Statutory Declaration set with two forms of payslip evidence (one for start of employment, one for end) if no reference letter is available.",
          tr: "Şirket antetli iş referans mektubu VEYA referans mektubu yoksa 4 parçalı yeminli beyan seti ile iki maaş kanıtı.",
          "zh-Hans": "公司抬头的工作推荐信，或4部分法定声明书加两种工资证明。",
        },
        {
          en: "Optional: Vendor Certification evidence (DevOps and Cyber Security occupation codes only).",
          tr: "Opsiyonel: Satıcı Sertifikası kanıtı (yalnızca DevOps ve Siber Güvenlik meslek kodları için).",
          "zh-Hans": "可选：供应商认证证明（仅适用于DevOps和网络安全职业代码）。",
        },
      ],
      notes: [
        {
          en: "ACS does NOT assess eligibility for the Australian Study Requirement (ASR) — this is determined separately by Home Affairs.",
          tr: "ACS, Avustralya Eğitim Gereksinimi (ASR) uygunluğunu DEĞERLENDİRMEZ — bu ayrı olarak Home Affairs tarafından belirlenir.",
          "zh-Hans": "ACS不评估澳大利亚学习要求（ASR）的资格——这由内政部另行确定。",
        },
      ],
    },

    // ── Pathway 2: General Skills Assessment ──────────────────────────
    {
      pathwayId: "GENERAL_SKILLS",
      name: {
        en: "General Skills Assessment",
        tr: "Genel Beceri Değerlendirmesi",
        "zh-Hans": "通用技能评估",
      },
      requiresPriorAssessment: false,
      fees: [{ label: { en: "General Skills Assessment", tr: "Genel Beceri Değerlendirmesi", "zh-Hans": "通用技能评估" }, amountAUD: 1498 }],
      processingTimeWeeks: { standard: 12 },
      documentRequirements: [
        {
          en: "Two forms of photo identification plus evidence of name change if applicable.",
          tr: "İki adet fotoğraflı kimlik + isim değişikliği kanıtı (varsa).",
          "zh-Hans": "两种身份证件加姓名变更证明（如适用）。",
        },
        {
          en: "Any AU or overseas IT qualification (Award Certificate/Testamur + Transcript; AU qualification also requires Completion Letter).",
          tr: "Herhangi bir AU veya yurtdışı BT niteliği (Sertifika + Transkript; AU niteliği ayrıca Tamamlama Mektubu gerektirir).",
          "zh-Hans": "任何澳洲或海外IT资格（证书/毕业证书+成绩单；澳洲资格还需要完成信）。",
        },
        {
          en: "Employment reference letter(s) on company letterhead, OR a 4-part Statutory Declaration set with two forms of payslip evidence if no reference letter is available.",
          tr: "Şirket antetli iş referans mektubu VEYA referans mektubu yoksa 4 parçalı yeminli beyan seti ile maaş kanıtı.",
          "zh-Hans": "公司抬头的工作推荐信，或无推荐信时4部分法定声明加工资证明。",
        },
        {
          en: "Optional: Vendor Certification evidence (DevOps and Cyber Security occupation codes only).",
          tr: "Opsiyonel: Satıcı Sertifikası kanıtı (yalnızca DevOps ve Siber Güvenlik kodları için).",
          "zh-Hans": "可选：供应商认证（仅DevOps和网络安全代码）。",
        },
      ],
      notes: [
        {
          en: "ACS supports the Designated Area Migration Agreement (DAMA).",
          tr: "ACS, Belirlenmiş Alan Göç Anlaşmasını (DAMA) destekler.",
          "zh-Hans": "ACS支持指定区域移民协议（DAMA）。",
        },
        {
          en: "Eligibility depends on qualification level, IT content, and relevance — see occupation-specific matrix below.",
          tr: "Uygunluk nitelik düzeyi, BT içeriği ve ilgililiğe bağlıdır — aşağıdaki mesleğe özel matrise bakın.",
          "zh-Hans": "资格取决于学历水平、IT内容和相关性——见下方职业特定矩阵。",
        },
        {
          en: "For IT roles (ANZSCO 2611–2632, 3131): Bachelor+ Major/Closely related = 2yr recent or 4yr any; Minor/Not closely related requires more.",
          tr: "BT rolleri için: Lisans+ Ana/Başlıca İlişkili = son 2 yıl veya herhangi 4 yıl; Yan Dal/İlişkili Değil daha fazlasını gerektirir.",
          "zh-Hans": "IT岗位：学士+主修/密切相关=近2年或任意4年；辅修/非相关需要更多。",
        },
        {
          en: "For Data Science roles (224114, 224115, 224999): Bachelor+ Major in Data Science = 2yr recent or 4yr any; Bachelor+ Major in ICT/CompSci/Math/Stats/Engineering = 4yr any.",
          tr: "Veri Bilimi rolleri: Lisans+ Veri Bilimi Ana Dalı = son 2 yıl veya herhangi 4 yıl; Lisans+ BT/Bilgisayar Matematik/İstatistik/Mühendislik = herhangi 4 yıl.",
          "zh-Hans": "数据科学岗位：学士+数据科学主修=近2年或任意4年；学士+IT/计算机/数学/统计/工程主修=任意4年。",
        },
      ],
    },

    // ── Pathway 3: Recognition of Prior Learning (RPL) ────────────────
    {
      pathwayId: "RPL",
      name: {
        en: "Recognition of Prior Learning (RPL)",
        tr: "Önceki Öğrenmenin Tanınması (RPL)",
        "zh-Hans": "先前学习认可 (RPL)",
      },
      minWorkExperienceYears: 6,
      fees: [{ label: { en: "RPL Assessment", tr: "RPL Değerlendirmesi", "zh-Hans": "RPL评估" }, amountAUD: 625 }],
      processingTimeWeeks: { standard: 12 },
      documentRequirements: [
        {
          en: "Two forms of photo identification plus evidence of name change if applicable.",
          tr: "İki adet fotoğraflı kimlik + isim değişikliği kanıtı.",
          "zh-Hans": "两种身份证件加姓名变更证明。",
        },
        {
          en: "Two RPL Project Reports (within ACS RPL form) — one from within the last 2 years, one from within the last 4 years; for non-project-based roles, detailed work experience and challenges encountered.",
          tr: "İki RPL Proje Raporu — biri son 2 yıl, diğeri son 4 yıl içinden; proje dışı roller için ayrıntılı iş deneyimi ve karşılaşılan zorluklar.",
          "zh-Hans": "两份RPL项目报告——一份来自最近2年，一份来自最近4年；非项目型角色需提供详细工作经历和遇到的挑战。",
        },
        {
          en: "Professional Currency Evidence — at least 2 different forms showing currency/skills in nominated ANZSCO code.",
          tr: "Mesleki Günceleme Kanıtı — belirlenen ANZSCO kodunda güncelliği/göstergenliği gösteren en az 2 farklı form.",
          "zh-Hans": "专业时效证明——至少2种不同形式证明在提名ANZSCO代码领域的专业时效/技能。",
        },
        {
          en: "Employment reference letter(s) on company letterhead, OR a 4-part Statutory Declaration set with two forms of payslip evidence.",
          tr: "Şirket antetli iş referans mektubu VEYA 4 parçalı yeminli beyan seti ile maaş kanıtı.",
          "zh-Hans": "公司抬头工作推荐信，或4部分法定声明加工资证明。",
        },
        {
          en: "Optional: Vendor Certification evidence (DevOps and Cyber Security occupation codes only).",
          tr: "Opsiyonel: Satıcı Sertifikası kanıtı (yalnızca DevOps ve Siber Güvenlik kodları için).",
          "zh-Hans": "可选：供应商认证证明（仅DevOps和网络安全代码）。",
        },
      ],
      notes: [
        {
          en: "No tertiary qualification is assessed — this pathway is for applicants who do not hold a relevant IT qualification.",
          tr: "Tersiyer nitelik değerlendirilmez — bu yol ilgili BT niteliği olmayan başvurular içindir.",
          "zh-Hans": "不评估高等学历——此路径适用于没有相关IT资格的申请人。",
        },
        {
          en: "At least 6 years of relevant IT work experience required, with the most recent 2 years being active.",
          tr: "En az 6 yıl ilgili BT iş deneyimi gereklidir, son 2 yıl aktif olmalıdır.",
          "zh-Hans": "至少需要6年相关IT工作经验，最近2年必须在职。",
        },
      ],
    },

    // ── Pathway 4a: Qualification Only — TG 485 ──────────────────────
    {
      pathwayId: "QUALIFICATION_ONLY_TG485",
      name: {
        en: "Qualification Only — Temporary Graduate (Post-Vocational Education Work stream)",
        tr: "Yalnızca Nitelik — Geçici Mezun (Mesleki Eğitim Sonrası Çalışma Akışı)",
        "zh-Hans": "仅资格评估——临时毕业（职业后工作流）",
      },
      eligibleFor: ["AU"],
      fees: [{ label: { en: "Qualification Only Assessment", tr: "Yalnızca Nitelik Değerlendirmesi", "zh-Hans": "仅资格评估" }, amountAUD: 625 }],
      processingTimeWeeks: { standard: 12 },
      documentRequirements: [
        {
          en: "Two forms of photo identification plus evidence of name change if applicable.",
          tr: "İki adet fotoğraflı kimlik + isim değişikliği kanıtı.",
          "zh-Hans": "两种身份证件加姓名变更证明。",
        },
        {
          en: "AU Diploma or Associate Degree (Completion Letter/Award Certificate + Transcript).",
          tr: "Avustralya Diploma veya Önlisans Derecesi (Tamamlama Mektubu + Transkript).",
          "zh-Hans": "澳洲文凭或副学士学位（完成信+成绩单）。",
        },
      ],
      notes: [
        {
          en: "ACS does NOT assess eligibility for the Temporary Graduate visa (TGSR) — this is determined by Home Affairs.",
          tr: "ACS, Geçici Mezun Vizesi uygunluğunu DEĞERLENDİRMEZ — bu Home Affairs tarafından belirlenir.",
          "zh-Hans": "ACS不评估临时毕业签证（TGSR）资格——这由内政部另行确定。",
        },
        {
          en: "The qualification must be a Diploma or Associate Degree from an AU institution, in a closely related IT/Data Science/Cyber Security major.",
          tr: "Niteliğin AU kurumundan Diploma veya Önlisans Derecesi, ilgili BT/Veri Bilimi/Siber Güvenlik dalında olması gerekir.",
          "zh-Hans": "资格必须是来自澳洲院校的文凭或副学士学位，且IT/数据科学/网络安全专业密切相关。",
        },
        {
          en: "The nominated occupation must appear on the subclass 485 Medium and Long-term Strategic Skills List (MLTSSL).",
          tr: "Adı geçen meslek 485 alt sınıfı için Orta ve Uzun Vadeli Stratejik Beceriler Listesinde (MLTSSL) yer almalıdır.",
          "zh-Hans": "提名职业必须出现在485子类中期和长期战略技能清单（MLTSSL）上。",
        },
      ],
    },

    // ── Pathway 4b: Qualification Only — PY Enrolment ────────────────
    {
      pathwayId: "QUALIFICATION_ONLY_PY",
      name: {
        en: "Qualification Only — Professional Year Program Enrolment",
        tr: "Yalnızca Nitelik — Mesleki Yıl Programı Kaydı",
        "zh-Hans": "仅资格评估——专业年计划注册",
      },
      eligibleFor: ["AU"],
      fees: [{ label: { en: "Qualification Only Assessment", tr: "Yalnızca Nitelik Değerlendirmesi", "zh-Hans": "仅资格评估" }, amountAUD: 625 }],
      processingTimeWeeks: { standard: 12 },
      documentRequirements: [
        {
          en: "Two forms of photo identification plus evidence of name change if applicable.",
          tr: "İki adet fotoğraflı kimlik + isim değişikliği kanıtı.",
          "zh-Hans": "两种身份证件加姓名变更证明。",
        },
        {
          en: "AU Bachelor's degree or higher (Completion Letter/Award Certificate + Transcript).",
          tr: "Avustralya Lisans veya üzeri (Tamamlama Mektubu + Transkript).",
          "zh-Hans": "澳洲学士学位或以上（完成信+成绩单）。",
        },
      ],
      notes: [
        {
          en: "Purpose: ICT content assessment for Professional Year Program enrolment.",
          tr: "Amaç: Mesleki Yıl Programı kaydı için BT içeriği değerlendirmesi.",
          "zh-Hans": "目的：为专业年计划注册进行ICT内容评估。",
        },
        {
          en: "The qualification must be a Bachelor's degree or higher from an AU institution.",
          tr: "Niteliğin AU kurumundan Lisans veya üzeri derece olması gerekir.",
          "zh-Hans": "资格必须是来自澳洲院校的学士学位或以上。",
        },
      ],
    },
  ],
};
