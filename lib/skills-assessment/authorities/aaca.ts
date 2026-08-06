import type { SkillsAssessmentAuthority, LocalizedString } from "../types";

/**
 * Architects Accreditation Council of Australia (AACA)
 * Source: AACA OQA Applicants Guide, October 2025
 * Verified: 2025-10-01
 *
 * Multilanguage support: EN, TR, ZH-Hans
 */
export const aacaAuthority: SkillsAssessmentAuthority = {
  authorityId: "AACA",
  authorityName: "Architects Accreditation Council of Australia",
  country: "AU",
    occupations: [
    { anzscoCode: "232111", oscaCode: "241131", title: "Architect" },
  ],
  lastVerified: "2025-10-01",
  sourceDocument: "AACA OQA Applicants Guide, October 2025",
  englishRequirements: [
    {
      test: "IELTS Academic (incl. One Skill Retake)",
      minimumScore: "Overall band 6.5",
    },
    {
      test: "PTE Academic",
      minimumScore: "Overall score 61",
    },
    {
      test: "Cambridge English (C1 Advanced / CAE)",
      minimumScore: "Overall score 176",
    },
    {
      test: "TOEFL iBT",
      minimumScore: "Overall score 85",
    },
    {
      test: "OET",
      minimumScore: "N/A",
      note: "Listed as accepted but primarily designed for health professionals.",
    },
    {
      test: "Employer letter (AU residents only)",
      minimumScore: "N/A",
      note:
        "Only valid if the applicant currently resides in Australia and the letter confirms professional-level English from a current architectural employer.",
    },
  ],
  validityPeriod: {
    years: 3,
    note: {
      en: "Skilled Migration Assessment is valid for 3 years from date of issue, including the discontinued provisional Stage 1 assessment.",
      tr: "Beceri Değerlendirmesi, verilme tarihinden itibaren 3 yıl geçerlidir.",
      "zh-Hans": "技能评估自签发之日起3年内有效，包括已停用的临时Stage 1评估。",
    },
  },
  fraudPolicy: {
    en: "Submission of fraudulent documents results in immediate rejection, a lifetime ban from applying for any AACA assessment, and reporting to relevant authorities.",
    tr: "Sahte belge sunulması halinde derhal red, ömür boyu yasak ve ilgili makamlara bildirim yapılır.",
    "zh-Hans": "提交虚假文件将导致立即拒绝、终身禁止申请，并向相关部门报告。",
  },
  pathways: [
    {
      pathwayId: "OQA",
      name: {
        en: "Overseas Qualifications Assessment (OQA)",
        tr: "Yurtdışı Nitelik Değerlendirmesi (OQA)",
        "zh-Hans": "海外资格评估 (OQA)",
      },
      requiresPriorAssessment: false,
      minWorkExperienceMonths: 6,
      qualificationDurationRequirement: {
        en: "5-year full-time equivalent (10 semesters) coursework degree in architecture; research-only qualifications not eligible; a 4-year qualification may be accepted if it permits registration as an Architect in the home country",
        tr: "5 yıllık tam zamanlı eşdeğer (10 yarıyıl) mimarlık ders programı; yalnızca araştırma nitelikleri uygun değildir; 4 yıllık nitelik, ülkesinde mimar olarak kaydolmaya izin veriyorsa kabul edilebilir",
        "zh-Hans": "5年全日制等效（10学期）建筑学课程学位；纯研究资格不合格；如果该4年资格允许在母国注册为建筑师则可被接受",
      },
      fees: [
        { label: { en: "OQA — New Applicants", tr: "OQA — Yeni Başvurular", "zh-Hans": "OQA — 新申请人" }, amountAUD: 4900 },
        {
          label: { en: "OQA — Stage 2 only (legacy Stage 1 holders pre-1 March 2022)", tr: "OQA — Yalnızca Aşama 2 (1 Mart 2022 öncesi)", "zh-Hans": "OQA — 仅限第二阶段（2022年3月1日前）" },
          amountAUD: 3000,
        },
        { label: { en: "2nd Competency Assessment Interview", tr: "2. Yeterlilik Değerlendirme Görüşmesi", "zh-Hans": "第二次能力评估面试" }, amountAUD: 0 },
        {
          label: { en: "Renewal of OQA Skilled Migration Assessment", tr: "OQA Beceri Değerlendirmesi Yenileme", "zh-Hans": "OQA 技能评估续签" },
          amountAUD: 440,
        },
      ],
      processingTimeWeeks: { standard: 7, ifIncomplete: 12 },
      documentRequirements: [
        {
          en: "Scanned original certificate (colour, 300 dpi min, original language + certified English translation if needed).",
          tr: "Orijinal sertifikanın taranmış renkli kopyası (min. 300 dpi).",
          "zh-Hans": "原始证书扫描件（彩色，至少300 dpi）。",
        },
        {
          en: "Scanned original academic transcripts.",
          tr: "Orijinal akademik not dökümlerinin taranmış kopyası.",
          "zh-Hans": "原始学术成绩单扫描件。",
        },
        {
          en: "Statutory Declaration Form (witnessed).",
          tr: "Yeminli Beyan Formu.",
          "zh-Hans": "法定声明表（需见证）。",
        },
        {
          en: "English language proficiency evidence (if program not delivered in English).",
          tr: "İngilizce dil yeterliliği kanıtı (program İngilizce yürütülmediyse).",
          "zh-Hans": "英语能力证明（如课程非英语授课）。",
        },
        {
          en: "Reference letter confirming min. 6 months post-graduate paid architectural work experience.",
          tr: "Mezuniyet sonrası en az 6 ay ücretli mimarlık iş deneyimini onaylayan referans mektubu.",
          "zh-Hans": "确认毕业后至少6个月有薪建筑工作经验的推荐信。",
        },
        {
          en: "CV/Resume listing academic and professional project experience.",
          tr: "Akademik ve mesleki proje deneyimini listeleyen CV/Özgeçmiş.",
          "zh-Hans": "列出学术和专业项目经历的简历。",
        },
        {
          en: "Evidence of registration as an Architect (if applicable).",
          tr: "Mimar olarak kayıt kanıtı (varsa).",
          "zh-Hans": "建筑师注册证明（如适用）。",
        },
        {
          en: "Evidence of name change (if applicable).",
          tr: "İsim değişikliği kanıtı (varsa).",
          "zh-Hans": "姓名变更证明（如适用）。",
        },
        {
          en: "Form 956 (Department of Home Affairs) if using a migration agent.",
          tr: "Göçmenlik aracısı kullanıyorsanız 956 Numaralı Form.",
          "zh-Hans": "如使用移民代理，需提交956表格。",
        },
        {
          en: "Scanned ID documents (1 photo ID + 2 of: passport, driver's licence, national ID, visa, birth certificate, etc.).",
          tr: "Kimlik belgelerinin taranmış kopyaları (1 fotoğraf + 2 belge: pasaport, ehliyet, ulusal kimlik vb.).",
          "zh-Hans": "身份证件扫描件（1张照片 + 2种证件：护照、驾照、国民身份证等）。",
        },
        {
          en: "Payment of application fee.",
          tr: "Başvuru ücretinin ödenmesi.",
          "zh-Hans": "缴纳申请费。",
        },
      ],
      notes: [
        {
          en: "Since March 2022, OQA is a single comprehensive step (previously two stages: Stage 1 qualification assessment, Stage 2 competency assessment).",
          tr: "Mart 2022'den bu yana OQA tek kapsamlı bir adımdır (önceki iki aşamalı süreç kaldırılmıştır).",
          "zh-Hans": "自2022年3月起，OQA为单一步骤（此前为两个阶段）。",
        },
        {
          en: "Skilled Migration Assessments can ONLY be issued to applicants who have completed BOTH Stage 1 and Stage 2 (post-March 2022 requirement).",
          tr: "Beceri Değerlendirmesi yalnızca Aşama 1 VE Aşama 2'yi tamamlamış başvuranlara verilebilir.",
          "zh-Hans": "技能评估仅发放给同时完成第一阶段和第二阶段的申请人。",
        },
        {
          en: "Priority/expedited processing for an additional fee is NOT available since 18 March 2024.",
          tr: "18 Mart 2024'ten itibaren öncelikli işleneck hizmeti sunulmamaktadır.",
          "zh-Hans": "自2024年3月18日起不再提供优先处理服务。",
        },
        {
          en: "At least 1 'complex project' required in portfolio — single dwelling residential and interior fit-out projects do NOT qualify as complex.",
          tr: "Portföyde en az 1 'karmaşık proje' gereklidir — tek konut ve iç mekan projeleri karmaşık olarak değerlendirilmez.",
          "zh-Hans": "作品集中至少需要1个复杂项目——单户住宅和室内装修项目不符合复杂项目要求。",
        },
        {
          en: "Application fees are NON-REFUNDABLE, including when the outcome is 'Not Suitable'.",
          tr: "Başvuru ücretleri geri ödemez.",
          "zh-Hans": "申请费用不可退还。",
        },
        {
          en: "Card surcharge: 1.49% for Australian cards, 2.9% for international cards.",
          tr: "Kart ek ücreti: Avustralya kartları için %1.49, uluslararası kartlar için %2.9.",
          "zh-Hans": "刷卡附加费：澳大利亚卡1.49%，国际卡2.9%。",
        },
      ],
    },
    {
      pathwayId: "VERIFICATION_ACCREDITED",
      name: {
        en: "Verification of Australian Accredited Architecture Qualification",
        tr: "Avustralya Akredite Mimari Nitelik Doğrulaması",
        "zh-Hans": "澳大利亚认证建筑资格验证",
      },
      eligibleFor: ["AU", "NZ", "HK", "SG"],
      requiresPriorAssessment: false,
      fees: [
        { label: { en: "See AACA Verification website for current fee schedule", tr: "AACA web sitesinden güncel ücret tarifesine bakınız", "zh-Hans": "请查看AACA验证网站的现行费用表" }, amountAUD: undefined },
      ],
      documentRequirements: [
        {
          en: "Proof that qualification is on AACA's accredited qualifications list.",
          tr: "Niteliğin AACA'nın akredite nitelikler listesinde olduğunu gösteren kanıt.",
          "zh-Hans": "证明资格在AACA认证资格名单上。",
        },
      ],
      notes: [
        {
          en: "No OQA required if the qualification is on the accredited list (AU, NZ, or Hong Kong Master of Architecture programs).",
          tr: "Niteliğin akredite listede olması durumunda OQA gerekmez.",
          "zh-Hans": "如资格在认证名单上则无需OQA。",
        },
      ],
    },
    {
      pathwayId: "UK_ARB_MRA",
      name: {
        en: "UK/AUS Mutual Recognition Agreement (RIBA Part 1 & 2)",
        tr: "İngiltere/Avustralya Karşılıklı Tanıma Anlaşması (RIBA Part 1 & 2)",
        "zh-Hans": "英国/澳大利亚互认协议（RIBA Part 1 & 2）",
      },
      eligibleFor: ["UK"],
      requiresPriorAssessment: false,
      fees: [
        { label: { en: "Refer to AACA UK/AUS Mutual Recognition Agreement page", tr: "AACA UK/AUS Mutual Recognition Agreement sayfasına bakınız", "zh-Hans": "请查看AACA英澳互认协议页面" }, amountAUD: undefined },
      ],
      documentRequirements: [
        {
          en: "Evidence of completed UK ARB-prescribed Part 1 and Part 2 qualifications.",
          tr: "İngiltere ARB tarafından onaylanmış Part 1 ve Part 2 niteliklerinin tamamlandığına dair kanıt.",
          "zh-Hans": "完成英国ARB规定的第一部分和第二部分资格的证明。",
        },
      ],
      notes: [
        {
          en: "Separate mutual recognition pathway, distinct from standard OQA.",
          tr: "Standart OQA'dan ayrı bir karşılıklı tanıma yoludur.",
          "zh-Hans": "独立于标准OQA的互认路径。",
        },
      ],
    },
    {
      pathwayId: "EPA",
      name: {
        en: "Experienced Practitioner Assessment (EPA)",
        tr: "Deneyimli Uygulayıcı Değerlendirmesi (EPA)",
        "zh-Hans": "经验从业者评估 (EPA)",
      },
      requiresPriorAssessment: false,
      minWorkExperienceYears: 10,
      fees: [
        { label: { en: "EPA — Local", tr: "EPA — Yurtiçi", "zh-Hans": "EPA — 本地" }, amountAUD: 3650 },
        { label: { en: "EPA — Overseas", tr: "EPA — Yurtdışı", "zh-Hans": "EPA — 海外" }, amountAUD: 4990 },
        {
          label: { en: "EPA — Overseas Modified (previously OQA-assessed applicants)", tr: "EPA — Yurtdışı Değiştirilmiş (daha önce OQA değerlendirmesi alanlar)", "zh-Hans": "EPA — 海外修改版（此前通过OQA评估的申请人）" },
          amountAUD: 3780,
        },
      ],
      processingTimeWeeks: { standard: 15 },
      documentRequirements: [
        {
          en: "Same core document set as OQA (see OQA pathway), plus evidence of Principal Decision-Maker role on complex projects.",
          tr: "OQA ile aynı temel belge seti + karmaşık projelerde Baş Karar Verici rol kanıtı.",
          "zh-Hans": "与OQA相同的核心文件集，加上复杂项目中首席决策者角色的证明。",
        },
      ],
      competencyAssessment: {
        portfolioProjectsMin: 3,
        portfolioProjectsMax: 4,
        interviewDurationMinutes: 90,
      },
      notes: [
        {
          en: "REVISED July 2025: minimum experience increased from 7 to 10 years; complex projects in portfolio must be no older than 15 years (previously 10); interview extended from 60 to 90 minutes.",
          tr: "Temmuz 2025'te güncellendi: minimum deneyim 7 yıldan 10 yıla artırıldı; portföydeki karmaşık projeler 15 yıldan eski olmamalı; mülakat 60 dakikadan 90 dakikaya uzatıldı.",
          "zh-Hans": "2025年7月修订：最低经验要求从7年提高到10年；作品集中的复杂项目不得超过15年；面试延长至90分钟。",
        },
        {
          en: "Bypasses the Architectural Practice Examination (APE) entirely — direct pathway to state/territory registration.",
          tr: "Mimari Uygulama Sınavını (APE) tamamen atlar — eyalet/eyalet kaydına doğrudan yol.",
          "zh-Hans": "完全绕过建筑实践考试（APE）——直通州/领地注册。",
        },
      ],
    },
  ],
};
