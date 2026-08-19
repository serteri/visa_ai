import type { SkillsAssessmentAuthority } from "../types";

/**
 * Australian Health Practitioner Regulation Agency (AHPRA)
 *
 * Fee and processing-time figures below are REASONABLE PLACEHOLDER estimates
 * (not sourced from a verified current AHPRA/Medical Board fee schedule) --
 * added so the Financial Roadmap has real numbers to show instead of a
 * blank/generic row for medical occupations, not as a substitute for
 * checking ahpra.gov.au / medicalboard.gov.au before this is treated as
 * authoritative. Replace with confirmed figures once verified.
 *
 * Occupation codes sourced from src/data/occupations.json's own AHPRA/
 * Medical Board attribution (29 occupations -- specialist physicians,
 * surgeons, GPs and related medical roles).
 */
export const ahpraAuthority: SkillsAssessmentAuthority = {
  authorityId: "AHPRA",
  authorityName: "Australian Health Practitioner Regulation Agency",
  country: "AU",
  role: "Registration authority, working with the Medical Board of Australia -- AHPRA does not provide migration advice. For most specialist medical occupations, assessment is via the relevant specialist medical college, with AHPRA/Medical Board handling registration.",
  // lastVerified reflects when this placeholder entry was added, NOT that
  // the fee/processing-time figures were checked against a live AHPRA
  // source -- see the file-level comment above.
  lastVerified: "2026-08-19",
  sourceDocument: "AHPRA / Medical Board of Australia guidelines (figures below are estimates pending verification against ahpra.gov.au)",
  occupations: [
    { anzscoCode: "134211", title: "Medical Administrator" },
    { anzscoCode: "253917", title: "Diagnostic and Interventional Radiologist" },
    { anzscoCode: "253912", title: "Emergency Medicine Specialist" },
    { anzscoCode: "253111", title: "General Practitioner" },
    { anzscoCode: "253999", title: "Medical Practitioners nec" },
    { anzscoCode: "253513", title: "Neurosurgeon" },
    { anzscoCode: "253911", title: "Dermatologist" },
    { anzscoCode: "253913", title: "Obstetrician and Gynaecologist" },
    { anzscoCode: "253914", title: "Ophthalmologist" },
    { anzscoCode: "253512", title: "Cardiothoracic Surgeon" },
    { anzscoCode: "253515", title: "Otorhinolaryngologist" },
    { anzscoCode: "253516", title: "Paediatric Surgeon" },
    { anzscoCode: "253517", title: "Plastic and Reconstructive Surgeon" },
    { anzscoCode: "253411", title: "Psychiatrist" },
    { anzscoCode: "253211", title: "Anaesthetist" },
    { anzscoCode: "253112", title: "Resident Medical Officer" },
    { anzscoCode: "253312", title: "Cardiologist" },
    { anzscoCode: "253313", title: "Clinical Haematologist" },
    { anzscoCode: "253314", title: "Medical Oncologist" },
    { anzscoCode: "253315", title: "Endocrinologist" },
    { anzscoCode: "253316", title: "Gastroenterologist" },
    { anzscoCode: "253317", title: "Intensive Care Specialist" },
    { anzscoCode: "253318", title: "Neurologist" },
    { anzscoCode: "253321", title: "Paediatrician" },
    { anzscoCode: "253322", title: "Renal Medicine Specialist" },
    { anzscoCode: "253323", title: "Rheumatologist" },
    { anzscoCode: "253324", title: "Thoracic Medicine Specialist" },
    { anzscoCode: "253511", title: "Surgeon (General)" },
    { anzscoCode: "253514", title: "Orthopaedic Surgeon" },
  ],
  notes: [
    {
      en: "Most specialist medical occupations are assessed by the relevant specialist medical college (e.g. RACGP for General Practitioners, RACS for surgeons) before AHPRA/Medical Board registration -- this is a more involved, multi-step process than a single desktop skills assessment.",
      tr: "Çoğu uzman tıp mesleği, AHPRA/Tıp Kurulu kaydından önce ilgili uzmanlık tıp kolej tarafından değerlendirilir (ör. Pratisyen Hekimler için RACGP, cerrahlar için RACS) -- bu, tek bir masaüstü beceri değerlendirmesinden daha karmaşık, çok adımlı bir süreçtir.",
      "zh-Hans": "大多数专科医疗职业在AHPRA/医学委员会注册之前，由相关专科医学院进行评估（例如全科医生的RACGP、外科医生的RACS）——这是一个比单一桌面技能评估更复杂的多步骤流程。",
    },
  ],
  pathways: [
    {
      pathwayId: "SPECIALIST_ASSESSMENT_REGISTRATION",
      name: {
        en: "Specialist Assessment & Registration Pathway",
        tr: "Uzmanlık Değerlendirmesi ve Kayıt Yolu",
        "zh-Hans": "专科评估与注册路径",
      },
      requiresPriorAssessment: false,
      fees: [
        {
          label: { en: "Specialist College Assessment (estimate)", tr: "Uzmanlık Koleji Değerlendirmesi (tahmini)", "zh-Hans": "专科医学院评估（估算）" },
          amountAUD: 2500,
        },
        {
          label: { en: "AHPRA Registration Fee (estimate)", tr: "AHPRA Kayıt Ücreti (tahmini)", "zh-Hans": "AHPRA注册费（估算）" },
          amountAUD: 850,
        },
      ],
      processingTimeWeeks: {
        standard: 26,
        note: {
          en: "Estimate only -- specialist medical assessment pathways commonly take 6+ months and vary significantly by college and specialty. Verify current timelines with the relevant specialist college and ahpra.gov.au before relying on this figure.",
          tr: "Yalnızca tahmindir -- uzmanlık tıp değerlendirme yolları genellikle 6+ ay sürer ve kolej/uzmanlığa göre önemli ölçüde değişir. Bu rakama güvenmeden önce güncel süreleri ilgili uzmanlık koleji ve ahpra.gov.au üzerinden doğrulayın.",
          "zh-Hans": "仅为估算——专科医学评估路径通常需要6个月以上，且因学院和专科而有显著差异。在依赖此数字之前，请向相关专科医学院和ahpra.gov.au核实当前时间表。",
        },
      },
      documentRequirements: [
        {
          en: "Proof of identity and medical qualification (primary medical degree certificate and transcript).",
          tr: "Kimlik kanıtı ve tıp niteliği (temel tıp diploması sertifikası ve transkript).",
          "zh-Hans": "身份证明及医学学历（基础医学学位证书及成绩单）。",
        },
        {
          en: "Evidence of current medical registration/licence in the country of practice, with no restrictions or conditions.",
          tr: "Çalışılan ülkede kısıtlama veya koşul olmaksızın güncel tıbbi kayıt/lisans kanıtı.",
          "zh-Hans": "在执业国家目前医疗注册/执照的证明，无限制或附加条件。",
        },
        {
          en: "English language test evidence meeting the Medical Board's registration standard (typically a higher threshold than general skilled migration).",
          tr: "Tıp Kurulu'nun kayıt standardını karşılayan İngilizce dil testi kanıtı (genellikle genel becerili göçten daha yüksek bir eşik).",
          "zh-Hans": "符合医学委员会注册标准的英语语言考试证明（通常高于一般技术移民的门槛）。",
        },
        {
          en: "Specialist qualification/fellowship evidence and detailed employment/training history, as required by the relevant specialist college.",
          tr: "İlgili uzmanlık koleji tarafından talep edilen uzmanlık niteliği/üyelik kanıtı ve ayrıntılı istihdam/eğitim geçmişi.",
          "zh-Hans": "相关专科医学院要求的专科资格/院士证明及详细的工作/培训经历。",
        },
      ],
      notes: [
        {
          en: "This is a two-stage process: specialist college assessment of qualifications/experience, followed by AHPRA/Medical Board registration. A positive skilled-migration points outcome does not itself confer the right to practise medicine in Australia.",
          tr: "Bu iki aşamalı bir süreçtir: niteliklerin/deneyimin uzmanlık koleji tarafından değerlendirilmesi, ardından AHPRA/Tıp Kurulu kaydı. Olumlu bir becerili göç puan sonucu, Avustralya'da tıp uygulama hakkını kendiliğinden vermez.",
          "zh-Hans": "这是一个两阶段流程：专科医学院对学历/经验进行评估，随后进行AHPRA/医学委员会注册。技术移民积分结果为正并不代表自动获得在澳大利亚行医的权利。",
        },
      ],
    },
  ],
};
