import type { SkillsAssessmentAuthority, LocalizedString } from "../types";

/**
 * Civil Aviation Safety Authority (CASA)
 * Source: Civil Aviation Safety Authority — Skills Assessment for Migration
 * Verified: 2026-08-05
 *
 * CASA assesses only pilot occupations. Unique requirements:
 * - Australian flight crew licence (CPL or ATPL) mandatory
 * - Overseas pilots must convert licences in Australia (requires travel)
 * - Aviation English Language Proficiency (AELP) Level 4 — NOT IELTS/PTE
 * - Minimum 5 years of flying for work immediately prior to application
 *
 * Multilanguage support: EN, TR, ZH-Hans
 */
export const casaAustraliaAuthority: SkillsAssessmentAuthority = {
  authorityId: "CASA",
  authorityName: "Civil Aviation Safety Authority",
  country: "AU",
  role: "Skills assessment only — CASA does not provide migration advice.",
    occupations: [
    { anzscoCode: "231111", title: "Aeroplane Pilot" },
    { anzscoCode: "231113", title: "Flying Instructor" },
    { anzscoCode: "231114", title: "Helicopter Pilot" },
  ],
  lastVerified: "2026-08-05",
  sourceDocument: "Civil Aviation Safety Authority — Skills Assessment for Migration",
  notes: [
    {
      en: "CASA assesses only pilot occupations — not engineers, technicians, or other aviation roles.",
      tr: "CASA yalnızca pilot mesleklerini değerlendirir — mühendisler, teknisyenler veya diğer havacılık rolleri değil.",
      "zh-Hans": "CASA仅评估飞行员职业——不包括工程师、技术员或其他航空角色。",
    },
    {
      en: "Overseas pilots MUST convert their licences first, which requires travelling to Australia for medicals, exams, and a flight test.",
      tr: "Yurtdışı pilotlar ÖNCE lisanslarını dönüştürmek ZORUNDADIR, bu da sağlık muayeneleri, sınavlar ve uçuş testi için Avustralya'ya seyahat gerektirir.",
      "zh-Hans": "海外飞行员必须先转换执照，这需要前往澳大利亚进行体检、考试和飞行测试。",
    },
    {
      en: "Aviation English Language Proficiency (AELP) Level 4 is the mandatory English requirement — standard IELTS/PTE are NOT accepted.",
      tr: "Havacılık İngilizce Yeterliliği (AELP) Seviye 4 zorunlu İngilizce gereksinimidir — standart IELTS/PTE KABUL EDİLMEZ.",
      "zh-Hans": "航空英语语言能力（AELP）4级是强制性英语要求——不接受标准IELTS/PTE。",
    },
    {
      en: "Form 79 must be submitted through the myCASA online portal.",
      tr: "Form 79 myCASA çevrimiçi portalı üzerinden gönderilmelidir.",
      "zh-Hans": "表格79必须通过myCASA在线门户提交。",
    },
  ],
  fraudPolicy: {
    en: "General fraudulent information guidelines apply. Applications must be strictly supported by certified true copies and verified logbooks.",
    tr: "Genel sahte bilgi yönergeleri uygulanır. Başvurular kesinlikle onaylı gerçek kopyalar ve doğrulanmış logbooklarla desteklenmelidir.",
    "zh-Hans": "适用一般虚假信息准则。申请必须严格由认证的真实副本和经核实的飞行日志支持。",
  },
  validityPeriod: {
    years: 3,
    note: {
      en: "Standard validity for skills assessments. Logbooks and medical checks must be current at time of application.",
      tr: "Beceri değerlendirmeleri için standart geçerlilik. Logbooklar ve sağlık kontrolleri başvuru sırasında güncel olmalıdır.",
      "zh-Hans": "技能评估的标准有效期。飞行日志和体检必须在申请时有效。",
    },
  },
  englishRequirements: [
    {
      test: "Aviation English Language Proficiency (AELP)",
      minimumScore: "Level 4 (Minimum)",
      note: "Standard IELTS/PTE are NOT accepted. AELP Level 4 is the mandatory aviation-specific English requirement.",
    },
  ],
  englishExemptions: [],
  englishTestValidity: {
    en: "AELP must be current at time of application.",
    tr: "AELP başvuru sırasında geçerli olmalıdır.",
    "zh-Hans": "AELP必须在申请时有效。",
  },
  pathways: [
    // ── Pathway: Pilot Skills Assessment (Form 79) ────────────────────
    {
      pathwayId: "PILOT_SKILLS_ASSESSMENT",
      name: {
        en: "Pilot Skills Assessment (Form 79)",
        tr: "Pilot Beceri Değerlendirmesi (Form 79)",
        "zh-Hans": "飞行员技能评估（表格79）",
      },
      occupation: "ALL",
      eligibleFor: [
        {
          en: "Pilots applying for a visa under the skilled occupations list (SOL) or Employer Nomination Scheme occupation list (ENSOL)",
          tr: "Becerili meslekler listesi (SOL) veya İşveren Adaylık Düzeni meslek listesi (ENSOL) kapsamında vize başvurusu yapan pilotlar",
          "zh-Hans": "根据技术职业列表（SOL）或雇主提名计划职业列表（ENSOL）申请签证的飞行员",
        },
      ],
      requiresPriorAssessment: false,
      fees: [
        {
          label: { en: "Skills Assessment (Form 79)", tr: "Beceri Değerlendirmesi (Form 79)", "zh-Hans": "技能评估（表格79）" },
          amountAUD: 100,
          note: {
            en: "This is the base fee. Converting overseas qualifications, medicals, exams, or flight tests will incur additional significant costs.",
            tr: "Bu temel ücrettir. Yurtdışı yeterliliklerinin dönüştürülmesi, sağlık muayeneleri, sınavlar veya uçuş testleri ek önemli maliyetler doğuracaktır.",
            "zh-Hans": "这是基本费用。转换海外资格、体检、考试或飞行测试将产生额外的大量费用。",
          },
        },
      ],
      processingTimeWeeks: {
        standard: 3,
        note: {
          en: "Usually takes around 14 business days to process applications. Incomplete forms are sent back and not processed.",
          tr: "Başvuruların işlenmesi genellikle yaklaşık 14 iş günü sürer. Eksik formlar geri gönderilir ve işlenmez.",
          "zh-Hans": "通常需要约14个工作日处理申请。不完整的表格将被退回且不予处理。",
        },
      },
      documentRequirements: [
        {
          en: "Form 79 — Skills assessment for the purpose of migration application (submitted via myCASA).",
          tr: "Form 79 — Göçmenlik başvurusu amacıyla beceri değerlendirmesi (myCASA üzerinden gönderilir).",
          "zh-Hans": "表格79——移民申请目的的技能评估（通过myCASA提交）。",
        },
        {
          en: "Evidence of at least 5 years flying for work immediately to the date of submission.",
          tr: "Gönderim tarihine kadar en az 5 yıl iş için uçuş kanıtı.",
          "zh-Hans": "提交日期前至少5年工作飞行经验的证明。",
        },
        {
          en: "Written evidence of work (e.g., referees or statement of service letters from previous Aviation employers).",
          tr: "Yazılı iş kanıtı (örn. referanslar veya önceki havacılık işverenlerinden hizmet mektubu).",
          "zh-Hans": "书面工作证明（如推荐信或以前航空雇主的服务证明信）。",
        },
        {
          en: "Certified true copies of logbook openings showing evidence of flying in previous jobs.",
          tr: "Önceki işlerde uçuş kanıtı gösteren logbook açılışlarının onaylı gerçek kopyaları.",
          "zh-Hans": "显示以前工作中飞行证据的飞行日志开页认证真实副本。",
        },
        {
          en: "Last completed logbook page of flying experience.",
          tr: "Uçuş deneyiminin son tamamlanan logbook sayfası.",
          "zh-Hans": "最后完成的飞行经验日志页。",
        },
        {
          en: "English translations by NAATI (in Australia) or verified by Australian Embassy/Consulate (overseas) for non-English documents.",
          tr: "İngilizce olmayan belgeler için NAATI (Avustralya'da) veya Avustralya Büyükelçiliği/Konsolosluğu (yurtdışında) tarafından doğrulanmış İngilizce çeviriler.",
          "zh-Hans": "非英语文件需由NAATI（澳大利亚境内）或澳大利亚大使馆/领事馆（海外）认证的英语翻译。",
        },
        {
          en: "Third-party release of information section must be completed if using an agent.",
          tr: "Vekil kullanılıyorsa üçüncü taraf bilgi serbest bırakma bölümü doldurulmalıdır.",
          "zh-Hans": "如使用代理，必须填写第三方信息释放部分。",
        },
      ],
      notes: [
        {
          en: "Applications must be submitted securely through the myCASA online portal.",
          tr: "Başvurular myCASA çevrimiçi portalı üzerinden güvenli bir şekilde gönderilmelidir.",
          "zh-Hans": "申请必须通过myCASA在线门户安全提交。",
        },
        {
          en: "Overseas pilots MUST convert their licences first, which requires travelling to Australia.",
          tr: "Yurtdışı pilotlar ÖNCE lisanslarını dönüştürmek ZORUNDADIR, bu da Avustralya'ya seyahat gerektirir.",
          "zh-Hans": "海外飞行员必须先转换执照，这需要前往澳大利亚。",
        },
        {
          en: "Licence conversion involves: medical examination, written exams, and flight test — all conducted in Australia.",
          tr: "Lisans dönüşümü şunları içerir: sağlık muayenesi, yazılı sınavlar ve uçuş testi — tümü Avustralya'da yapılır.",
          "zh-Hans": "执照转换包括：体检、笔试和飞行测试——均在澳大利亚进行。",
        },
        {
          en: "5 years of flying experience must be IMMEDIATELY PRIOR to application submission — no gaps allowed.",
          tr: "5 yıllık uçuş deneyimi başvuru gönderiminden HEMEN ÖNCE olmalıdır — boşluk kabul edilmez.",
          "zh-Hans": "5年飞行经验必须在申请提交之前连续——不允许有间断。",
        },
      ],
    },
  ],
};
