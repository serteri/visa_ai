import type { SkillsAssessmentAuthority, LocalizedString } from "../types";

/**
 * Australian Dental Council Limited (ADC)
 * Source: ADC Skills Assessment overview (ADC website content)
 * Verified: 2026-08-04
 *
 * Multilanguage support: EN, TR, ZH-Hans
 * NOTE: Fee schedule, processing times, and English requirements are NOT listed
 * in the source document — marked as null. Do not fabricate values.
 */
export const adcAuthority: SkillsAssessmentAuthority = {
  authorityId: "ADC",
  authorityName: "Australian Dental Council Limited",
  country: "AU",
  lastVerified: "2026-08-04",
  sourceDocument:
    "Australian Dental Council Limited — Skills Assessment overview (ADC website content)",
  englishRequirements: [],
  validityPeriod: {
    years: 3,
    note: {
      en: "Skills assessment is valid for three years from the date of issue, per the Department of Home Affairs. A lapsed assessment can be reissued by ADC on request; an administrative fee applies.",
      tr: "Beceri değerlendirmesi, DHA'ya göre verilme tarihinden itibaren 3 yıl geçerlidir. Süresi dolan değerlendirme ADC tarafından yeniden verilebilir; idari ücret uygulanır.",
      "zh-Hans": "技能评估自签发之日起3年内有效（依据内政部规定）。过期评估可根据申请由ADC重新签发，需支付行政费用。",
    },
  },
  occupations: [
    { anzscoCode: "252311", title: "Dental Specialist" },
    { anzscoCode: "252312", title: "Dentist" },
  ],
  pathways: [
    // ── Pathway 1: Skills Assessment Only ──────────────────────────────
    {
      pathwayId: "SKILLS_ASSESSMENT_ONLY",
      name: {
        en: "Skills Assessment (no registration required)",
        tr: "Beceri Değerlendirmesi (kayıt gerekmez)",
        "zh-Hans": "技能评估（无需注册）",
      },
      eligibleFor: ["AU", "NZ", "UK", "IE", "CA"],
      requiresPriorAssessment: false,
      fees: [
        {
          label: { en: "Skills assessment application fee", tr: "Beceri değerlendirmesi başvuru ücreti", "zh-Hans": "技能评估申请费" },
          amountAUD: undefined,
          note: "Not stated in source document; confirm current fee via ADC Connect portal at time of application.",
        },
      ],
      documentRequirements: [
        {
          en: "Current passport.",
          tr: "Güncel pasaport.",
          "zh-Hans": "当前护照。",
        },
        {
          en: "Recent passport photo (meeting Australian passport photo guidelines, .jpg or .png).",
          tr: "Güncel pasaport fotoğrafı (Avustralya pasaport fotoğrafı yönergelerine uygun).",
          "zh-Hans": "近期护照照片（符合澳大利亚护照照片指南，.jpg或.png格式）。",
        },
        {
          en: "Evidence of change of name (if applicable).",
          tr: "İsim değişikliği kanıtı (varsa).",
          "zh-Hans": "姓名变更证明（如适用）。",
        },
        {
          en: "Dental qualification, official certificate, or testamur.",
          tr: "Diş hekimliği niteliği, resmi sertifika veya testamur.",
          "zh-Hans": "牙科资格、官方证书或毕业证书。",
        },
        {
          en: "Academic transcript.",
          tr: "Akademik transkript.",
          "zh-Hans": "学术成绩单。",
        },
        {
          en: "Internship certificate (if completed as part of qualification).",
          tr: "Staj sertifikası (niteliğin parçası olarak tamamlandıysa).",
          "zh-Hans": "实习证书（如作为资格的一部分完成）。",
        },
        {
          en: "Evidence of registration or licence to practise dentistry.",
          tr: "Diş hekimliği uygulama izni veya lisans kanıtı.",
          "zh-Hans": "牙科执业注册或许可证明。",
        },
        {
          en: "Two written professional references.",
          tr: "İki yazılı mesleki referans.",
          "zh-Hans": "两封书面专业推荐信。",
        },
        {
          en: "Evidence of practice or work history as a registered or licensed dentist.",
          tr: "Kayıtlı veya lisanslı diş hekimliği olarak uygulama veya iş deneyimi kanıtı.",
          "zh-Hans": "作为注册或持照牙医的执业或工作历史证明。",
        },
        {
          en: "Certificate/letter of good standing sent directly to ADC by the regulating body (valid 3 months from issue if received before submission).",
          tr: "Düzenleyici kurum tarafından ADC'ye doğrudan gönderilen iyi durum sertifikası/mektubu (başvuru öncesi alındıysa verilme tarihinden itibaren 3 ay geçerli).",
          "zh-Hans": "由监管机构直接寄送至ADC的良好信誉证书/信函（如在提交前收到，自签发之日起3个月内有效）。",
        },
        {
          en: "Official English translation for any non-English documents.",
          tr: "İngilizce olmayan belgeler için resmi İngilizce çeviri.",
          "zh-Hans": "所有非英语文件的官方英语翻译件。",
        },
      ],
      notes: [
        {
          en: "Applicants confirm registration type and application type at the start of the application on ADC Connect.",
          tr: "Başvurular, ADC Connect'te başvuru başında kayıt türü ve başvuru türünü onaylar.",
          "zh-Hans": "申请人在ADC Connect上开始申请时确认注册类型和申请类型。",
        },
        {
          en: "For dentists, application type options are: initial assessment for registration, skills assessment, or both.",
          tr: "Diş hekimleri için başvuru türü seçenekleri: kayıt için ilk değerlendirmesi, beceri değerlendirmesi veya her ikisi.",
          "zh-Hans": "对于牙科医生，申请类型选项为：注册初始评估、技能评估或两者兼有。",
        },
      ],
    },

    // ── Pathway 2: Registration + Skills Assessment ────────────────────
    {
      pathwayId: "REGISTRATION_AND_SKILLS",
      name: {
        en: "Registration and Skills Assessment (Dental Practitioner Assessment)",
        tr: "Kayıt ve Beceri Değerlendirmesi (Diş Hekimliği Uygulayıcı Değerlendirmesi)",
        "zh-Hans": "注册与技能评估（牙科执业者评估）",
      },
      requiresPriorAssessment: true,
      fees: [
        {
          label: { en: "Dental practitioner assessment process fee", tr: "Diş hekimliği uygulayıcı değerlendirme süreci ücreti", "zh-Hans": "牙科执业者评估流程费" },
          amountAUD: undefined,
        },
        {
          label: {
            en: "Subsequent migration skills assessment (post-registration-assessment)",
            tr: "Sonraki göçmenlik beceri değerlendirmesi (kayıt değerlendirmesi sonrası)",
            "zh-Hans": "后续移民技能评估（注册评估后）",
          },
          amountAUD: 0,
          note: "No additional charge — offered once the dental practitioner assessment process is complete, if required for migration purposes.",
        },
      ],
      documentRequirements: [
        {
          en: "Same core document set as Skills Assessment Only pathway (see above).",
          tr: "Beceri Değerlendirmesi Yalnızca pathway ile aynı temel belge seti (yukarıya bakın).",
          "zh-Hans": "与技能评估唯一路径相同的核心文件集（见上文）。",
        },
        {
          en: "Must select 'registration only' application type on ADC Connect if not eligible for the direct skills-assessment pathway.",
          tr: "Doğrudan beceri değerlendirmesi yoluna uygun değilse ADC Connect'te 'yalnızca kayıt' başvuru türü seçilmelidir.",
          "zh-Hans": "如不符合直接技能评估路径的资格，必须在ADC Connect上选择'仅注册'申请类型。",
        },
      ],
      notes: [
        {
          en: "Further detail on this pathway sits with the Dental Board of Australia registration process, not solely with ADC.",
          tr: "Bu yolun daha fazla ayrıntısı yalnızca ADC ile değil, Diş Hekimliği Kurulu ile ilgilidir.",
          "zh-Hans": "此路径的更多细节涉及澳大利亚牙科委员会的注册流程，而非仅由ADC负责。",
        },
      ],
    },
  ],
};
