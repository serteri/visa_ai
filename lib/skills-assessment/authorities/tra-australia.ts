import type { SkillsAssessmentAuthority, LocalizedString } from "../types";

/**
 * Trades Recognition Australia (TRA)
 * Source: TRA — Migration Skills Assessment Program Guidelines (July 2026)
 * Verified: 2026-08-05
 *
 * TRA covers 133 trade occupations. This module includes the most common ones.
 * Licensed occupations (Electrician, Plumber, Air-con Mechanic) MUST go through
 * OSAP for permanent migration — not just MSA.
 *
 * Key rule: "12 months in last 3 years" — this is a strict requirement
 * that must be prominently displayed in the report.
 *
 * Multilanguage support: EN, TR, ZH-Hans
 */
export const traAustraliaAuthority: SkillsAssessmentAuthority = {
  authorityId: "TRA",
  authorityName: "Trades Recognition Australia",
  country: "AU",
  role: "Skills assessment only — TRA does not provide migration advice.",
    occupations: [
    { anzscoCode: "351311", title: "Chef" },
    { anzscoCode: "351411", title: "Cook" },
    { anzscoCode: "331212", title: "Carpenter" },
    { anzscoCode: "341111", title: "Electrician (General)" },
    { anzscoCode: "334111", title: "Plumber (General)" },
    { anzscoCode: "321211", title: "Motor Mechanic (General)" },
    { anzscoCode: "334112", title: "Airconditioning and Mechanical Services Plumber" },
    { anzscoCode: "393211", title: "Apparel Cutter" },
    { anzscoCode: "362511", title: "Arborist" },
    { anzscoCode: "351111", title: "Baker" },
    { anzscoCode: "331111", title: "Bricklayer" },
    { anzscoCode: "821111", title: "Builder's Labourer" },
    { anzscoCode: "351211", title: "Butcher or Smallgoods Maker" },
    { anzscoCode: "394111", title: "Cabinetmaker" },
    { anzscoCode: "394112", title: "Cabinet Maker" },
    { anzscoCode: "331211", title: "Carpenter and Joiner" },
    { anzscoCode: "399211", title: "Chemical Plant Operator" },
    { anzscoCode: "393212", title: "Clothing Patternmaker" },
    { anzscoCode: "411213", title: "Dental Technician" },
    { anzscoCode: "321212", title: "Diesel Motor Mechanic" },
    { anzscoCode: "399111", title: "Boat Builder and Repairer" },
    { anzscoCode: "334113", title: "Drainer" },
    { anzscoCode: "393213", title: "Dressmaker or Tailor" },
    { anzscoCode: "342211", title: "Electrical Linesworker" },
    { anzscoCode: "341113", title: "Lift Mechanic" },
    { anzscoCode: "341112", title: "Electrician (Special Class)" },
    { anzscoCode: "342312", title: "Communications Operator" },
    { anzscoCode: "342313", title: "Electronic Equipment Trades Worker" },
    { anzscoCode: "342314", title: "Electronic Instrument Trades Worker (General)" },
    { anzscoCode: "342315", title: "Electronic Instrument Trades Worker (Special Class)" },
    { anzscoCode: "342311", title: "Business Machine Mechanic" },
    { anzscoCode: "323411", title: "Engineering Patternmaker" },
    { anzscoCode: "323311", title: "Engraver" },
    { anzscoCode: "333211", title: "Fibrous Plasterer" },
    { anzscoCode: "399918", title: "Fire Protection Equipment Technician" },
    { anzscoCode: "323111", title: "Aircraft Maintenance Engineer (Avionics)" },
    { anzscoCode: "323211", title: "Fitter (General)" },
    { anzscoCode: "323112", title: "Aircraft Maintenance Engineer (Mechanical)" },
    { anzscoCode: "323212", title: "Fitter and Turner" },
    { anzscoCode: "323113", title: "Aircraft Maintenance Engineer (Structures)" },
    { anzscoCode: "323213", title: "Fitter-Welder" },
    { anzscoCode: "362111", title: "Florist" },
    { anzscoCode: "394211", title: "Furniture Finisher" },
    { anzscoCode: "362211", title: "Gardener (General)" },
    { anzscoCode: "399212", title: "Gas or Petroleum Operator" },
    { anzscoCode: "334114", title: "Gasfitter" },
    { anzscoCode: "333111", title: "Glazier" },
    { anzscoCode: "392211", title: "Graphic Pre-press Trades Worker" },
    { anzscoCode: "362311", title: "Greenkeeper" },
    { anzscoCode: "323312", title: "Gunsmith" },
    { anzscoCode: "361112", title: "Horse Trainer" },
    { anzscoCode: "362212", title: "Landscape Gardener" },
    { anzscoCode: "399513", title: "Light Technician" },
    { anzscoCode: "323313", title: "Locksmith" },
    { anzscoCode: "843112", title: "Logging Assistant" },
    { anzscoCode: "391111", title: "Hairdresser" },
    { anzscoCode: "323214", title: "Metal Machinist (First Class)" },
    { anzscoCode: "321111", title: "Automotive Electrician" },
    { anzscoCode: "321213", title: "Motorcycle Mechanic" },
    { anzscoCode: "313213", title: "Telecommunications Network Planner" },
    { anzscoCode: "399913", title: "Optical Dispenser (Aus) \\ Dispensing Optician (NZ)" },
    { anzscoCode: "332211", title: "Painter" },
    { anzscoCode: "332299", title: "Painting Trades Workers nec" },
    { anzscoCode: "322113", title: "Farrier" },
    { anzscoCode: "322111", title: "Blacksmith" },
    { anzscoCode: "351112", title: "Pastrycook" },
    { anzscoCode: "332111", title: "Floor Finisher" },
    { anzscoCode: "334117", title: "Fire Protection Plumber" },
    { anzscoCode: "399213", title: "Power Generation Plant Operator" },
    { anzscoCode: "399214", title: "Power Generation Plant Operator" },
    { anzscoCode: "323314", title: "Precision Instrument Maker and Repairer" },
    { anzscoCode: "322312", title: "Pressure Welder" },
    { anzscoCode: "392212", title: "Print Finisher" },
    { anzscoCode: "392213", title: "Printer" },
    { anzscoCode: "392311", title: "Printing Machinist" },
    { anzscoCode: "392214", title: "Printing Machinist" },
    { anzscoCode: "342411", title: "Cabler (Data and Telecommunications)" },
    { anzscoCode: "821611", title: "Railway Track Worker" },
    { anzscoCode: "242211", title: "Vocational Education Teacher" },
    { anzscoCode: "334115", title: "Roof Plumber" },
    { anzscoCode: "333311", title: "Roof Tiler" },
    { anzscoCode: "323315", title: "Saw Doctor" },
    { anzscoCode: "393111", title: "Canvas Goods Fabricator" },
    { anzscoCode: "321214", title: "Small Engine Mechanic" },
    { anzscoCode: "333212", title: "Renderer (Solid Plaster)" },
    { anzscoCode: "331112", title: "Stonemason" },
    { anzscoCode: "342412", title: "Telecommunications Cable Jointer" },
    { anzscoCode: "313214", title: "Telecommunications Technical Officer or Technologist" },
    { anzscoCode: "342414", title: "Telecommunications Technician" },
    { anzscoCode: "323215", title: "Textile, Clothing and Footwear Mechanic" },
    { anzscoCode: "323412", title: "Toolmaker" },
    { anzscoCode: "393311", title: "Upholsterer" },
    { anzscoCode: "324211", title: "Vehicle Body Builder" },
    { anzscoCode: "322112", title: "Electroplater" },
    { anzscoCode: "324311", title: "Vehicle Painter" },
    { anzscoCode: "324212", title: "Vehicle Trimmer" },
    { anzscoCode: "333411", title: "Wall and Floor Tiler" },
    { anzscoCode: "322313", title: "Welder (First Class)" },
    { anzscoCode: "394113", title: "Furniture Maker" },
  ],
  lastVerified: "2026-08-05",
  sourceDocument:
    "Trades Recognition Australia — Migration Skills Assessment Program Guidelines (July 2026)",
  notes: [
    {
      en: "TRA covers 133 trade occupations. This module includes the 6 most common; the rest are matched from the occupations registry.",
      tr: "TRA, 133 ticaret mesleğini kapsar. Bu modül en yaygın 6 mesleği içerir; geri kalanlar meslek kayıt defterinden eşleştirilir.",
      "zh-Hans": "TRA涵盖133个技工职业。本模块包含最常见的6个；其余从职业注册表中匹配。",
    },
    {
      en: "Licensed occupations (Electrician 341111, Plumber 334111, Air-con Mechanic 342111) MUST go through OSAP for permanent migration.",
      tr: "Lisanslı meslekler (Elektrikçi 341111, Tesisçi 334111, Klima Mekaniği 342111) kalıcı göç için OSAP'tan GEÇMEK ZORUNDADIR.",
      "zh-Hans": "持牌职业（电工341111、水管工334111、空调技师342111）永久移民必须通过OSAP。",
    },
    {
      en: "CRITICAL: '12 months in last 3 years' rule — applicants must have at least 12 months full-time (or equivalent) work in the nominated occupation within the 3 years immediately prior to application.",
      tr: "KRİTİK: 'Son 3 yılda 12 ay' kuralı — başvuru sahipleri, başvuru öncesindeki 3 yıl içinde aday gösterilen meslekte en az 12 ay tam zamanlı (veya eşdeğeri) çalışmış olmalıdır.",
      "zh-Hans": "关键：'近3年内12个月'规则——申请人必须在申请前3年内在提名职业中至少有12个月全职（或同等）工作经验。",
    },
  ],
  fraudPolicy: {
    en: "Penalties apply under the Crimes Act 1914 and the Criminal Code Act 1995 for making false or misleading statements. TRA may refuse subsequent applications for up to three years if bogus documents or false/misleading information is provided, and overturn existing successful outcomes.",
    tr: "Yanlış veya yanıltıcı beyanlar için Crimes Act 1914 ve Criminal Code Act 1995 kapsamında cezalar uygulanır. TRA, sahte belge veya yanlış/yanıltıcı bilgi sağlanırsa sonraki başvuruları üç yıla kadar reddedebilir ve mevcut başarılı sonuçları iptal edebilir.",
    "zh-Hans": "根据《1914年犯罪法》和《1995年刑法典》，做出虚假或误导性陈述将受到处罚。如果提供伪造文件或虚假/误导性信息，TRA可拒绝后续申请长达三年，并推翻现有的成功结果。",
  },
  validityPeriod: {
    years: 3,
    note: {
      en: "Standard validity for TRA skills assessments is typically 3 years from the date of issue.",
      tr: "TRA beceri değerlendirmeleri için standart geçerlilik süresi genellikle veriliş tarihinden itibaren 3 yıldır.",
      "zh-Hans": "TRA技能评估的标准有效期通常为签发之日起3年。",
    },
  },
  englishRequirements: [
    {
      test: "Not Directly Assessed by TRA",
      minimumScore:
        "TRA does not conduct English testing as part of the MSA/OSAP process, but English requirements will apply for the visa application with DHA.",
    },
  ],
  pathways: [
    // ── Pathway 1: Migration Skills Assessment (MSA) ──────────────────
    {
      pathwayId: "MSA",
      name: {
        en: "Migration Skills Assessment (MSA)",
        tr: "Göçmenlik Beceri Değerlendirmesi (MSA)",
        "zh-Hans": "移民技能评估（MSA）",
      },
      occupation: "ALL",
      eligibleFor: [
        {
          en: "Applicants for skilled migration in occupations/countries not required to be assessed under OSAP",
          tr: "OSAP kapsamında değerlendirilmesi gerekmeyen meslekler/ülkeler için becerili göç başvuru sahipleri",
          "zh-Hans": "无需在OSAP下评估的职业/国家的技术移民申请人",
        },
      ],
      requiresPriorAssessment: false,
      fees: [
        { label: { en: "Migration Skills Assessment", tr: "Göçmenlik Beceri Değerlendirmesi", "zh-Hans": "移民技能评估" }, amountAUD: 795 },
        { label: { en: "Migration Skills Assessment Review", tr: "Göçmenlik Beceri Değerlendirmesi İncelemesi", "zh-Hans": "移民技能评估复审" }, amountAUD: 610 },
      ],
      processingTimeWeeks: {
        standard: 24,
        note: {
          en: "Average processing time is 120 days (24 weeks) after all required documentary evidence is provided.",
          tr: "Ortalama işleme süresi, tüm gerekli belgesel kanıtlar sağlandıktan sonra 120 gündür (24 hafta).",
          "zh-Hans": "平均处理时间为提供所有所需文件证据后120天（24周）。",
        },
      },
      documentRequirements: [
        {
          en: "Passport identification page (colour scan, min 150 dpi, max 10MB).",
          tr: "Pasaport kimlik sayfası (renkli tarama, minimum 150 dpi, maksimum 10MB).",
          "zh-Hans": "护照身份页（彩色扫描，最低150 dpi，最大10MB）。",
        },
        {
          en: "Proof of qualification(s) and full academic transcripts (short courses/unpaid work do not count).",
          tr: "Yeterlilik kanıtı ve tam akademik transkriptler (kısa kurslar/ücretsiz çalışma sayılmaz).",
          "zh-Hans": "资格证明和完整学术成绩单（短期课程/无薪工作不计入）。",
        },
        {
          en: "Apprenticeship documents (contract, journal, etc.) if applicable.",
          tr: "Varsa çıraklık belgeleri (sözleşme, günlük vb.).",
          "zh-Hans": "如适用，学徒文件（合同、日志等）。",
        },
        {
          en: "Employer Template form for each employment period.",
          tr: "Her çalışma dönemi için İşveren Şablon formu.",
          "zh-Hans": "每个就业期间的雇主模板表格。",
        },
        {
          en: "Pay evidence: At least two sources required (e.g., Notice of Assessment, 3 payslips, Superannuation documents, Bank statements). For self-employed: At least three sources (Business Registration, Tax Returns, Invoices).",
          tr: "Ödeme kanıtı: En az iki kaynak gerekli (örn. Değerlendirme Bildirimi, 3 maaş bordrosu, Emeklilik belgeleri, Banka ekstreleri). Serbest çalışanlar için: En az üç kaynak (İş Kaydı, Vergi Beyannameleri, Faturalar).",
          "zh-Hans": "工资证明：至少需要两种来源（如评税通知、3份工资单、养老金文件、银行对账单）。自雇人士：至少三种来源（营业执照、纳税申报表、发票）。",
        },
        {
          en: "NAATI certified translations for documents not in English.",
          tr: "İngilizce olmayan belgeler için NAATI onaylı çeviriler.",
          "zh-Hans": "非英语文件的NAATI认证翻译。",
        },
      ],
      notes: [
        {
          en: "CRITICAL PRIVACY RULE: Applicants MUST delete or obscure sensitive information such as their Tax File Number (TFN) or bank account details/transactions not related to salary deposits before submitting.",
          tr: "KRİTİK GİZLİLİK KURALI: Başvuru sahipleri, göndermeden önce Vergi Dosya Numarası (TFN) veya maaş yatırmalarıyla ilgili olmayan banka hesap bilgileri/işlemleri gibi hassas bilgileri silmek veya gizlemek ZORUNDADIR.",
          "zh-Hans": "关键隐私规则：申请人必须在提交前删除或遮盖敏感信息，如税号（TFN）或与工资存款无关的银行账户详情/交易。",
        },
      ],
    },
    // ── Pathway 2: OSAP ────────────────────────────────────────────────
    {
      pathwayId: "OSAP",
      name: {
        en: "Offshore Skills Assessment Program (OSAP)",
        tr: "Yurtdışı Beceri Değerlendirme Programı (OSAP)",
        "zh-Hans": "离岸技能评估计划（OSAP）",
      },
      occupation: "ALL",
      eligibleFor: [
        {
          en: "Mandatory for licensed occupations (Electrician, Plumber, Air-conditioning Mechanic) applying for permanent migration",
          tr: "Kalıcı göç için başvuran lisanslı meslekler (Elektrikçi, Tesisçi, Klima Mekaniği) için zorunlu",
          "zh-Hans": "持牌职业（电工、水管工、空调技师）申请永久移民必须",
        },
        {
          en: "Applicants holding passports from nominated countries for specific occupations (e.g., Chef, Fitter, Mechanic)",
          tr: "Belirli meslekler için belirlenen ülkelerden pasaport sahibi başvuru sahipleri (örn. Aşçı, Torna, Mekanik)",
          "zh-Hans": "持有特定职业指定国家护照的申请人（如厨师、钳工、技工）",
        },
      ],
      requiresPriorAssessment: false,
      fees: [
        { label: { en: "Pathway 1: Documentary Evidence", tr: "Yol 1: Belgesel Kanıt", "zh-Hans": "途径1：文件证据" }, amountAUD: 1120 },
        { label: { en: "Pathway 1: Technical Interview", tr: "Yol 1: Teknik Mülakat", "zh-Hans": "途径1：技术面试" }, amountAUD: 2000 },
        { label: { en: "Pathway 1: Practical Assessment (if required)", tr: "Yol 1: Pratik Değerlendirme (gerekirse)", "zh-Hans": "途径1：实操评估（如需要）" }, amountAUD: 2200 },
        { label: { en: "Pathway 1 Total Max", tr: "Yol 1 Toplam Maks", "zh-Hans": "途径1总计最高" }, amountAUD: 5320 },
        { label: { en: "Pathway 2: Documentary Evidence", tr: "Yol 2: Belgesel Kanıt", "zh-Hans": "途径2：文件证据" }, amountAUD: 1120 },
        { label: { en: "Pathway 2: Technical Interview", tr: "Yol 2: Teknik Mülakat", "zh-Hans": "途径2：技术面试" }, amountAUD: 900 },
        { label: { en: "Pathway 2 Total Max", tr: "Yol 2 Toplam Maks", "zh-Hans": "途径2总计最高" }, amountAUD: 2020 },
      ],
      processingTimeWeeks: {
        standard: 15,
        note: {
          en: "Processed within 15 weeks (approx 75 business days) of submission.",
          tr: "Gönderimden sonraki 15 hafta içinde işlenir (yaklaşık 75 iş günü).",
          "zh-Hans": "提交后15周内处理（约75个工作日）。",
        },
      },
      documentRequirements: [
        {
          en: "Documents are guided by the chosen RTO.",
          tr: "Belgeler seçilen RTO tarafından yönlendirilir.",
          "zh-Hans": "文件由所选RTO指导。",
        },
        {
          en: "Must obtain a unique RTO Assessment Payment Identifier Code for each step.",
          tr: "Her adım için benzersiz bir RTO Değerlendirme Ödeme Tanımlayıcı Kodu alınmalıdır.",
          "zh-Hans": "必须为每个步骤获取唯一的RTO评估支付标识码。",
        },
      ],
      notes: [
        {
          en: "Requires contacting a TRA-approved RTO directly via the RTO Finder before paying through the TRA Online Portal.",
          tr: "TRA Online Portal üzerinden ödeme yapmadan önce TRA onaylı bir RTO ile RTO Bulucu aracılığıyla doğrudan iletişim kurmak gerekir.",
          "zh-Hans": "需要通过RTO查找器直接联系TRA批准的RTO，然后再通过TRA在线门户付款。",
        },
        {
          en: "Pathway 1: For applicants WITHOUT a relevant Australian VET qualification.",
          tr: "Yol 1: İlgili bir Avustralya VET yeterliliği OLMAYAN başvuru sahipleri için.",
          "zh-Hans": "途径1：适用于没有相关澳洲VET资格的申请人。",
        },
        {
          en: "Pathway 2: For applicants WITH a relevant Australian VET qualification or current Australian occupation licence.",
          tr: "Yol 2: İlgili bir Avustralya VET yeterliliği veya geçerli Avustralya meslek lisansı OLAN başvuru sahipleri için.",
          "zh-Hans": "途径2：适用于拥有相关澳洲VET资格或当前澳洲职业执照的申请人。",
        },
      ],
    },
  ],
  // ── Licensed occupations that MUST go through OSAP ──────────────────
  licensedOccupations: [
    "Electrician (General) - 341111",
    "Electrician (Special Class) - 341112",
    "Plumber (General) - 334111",
    "Air-conditioning and Refrigeration Mechanic - 342111",
  ],
};
