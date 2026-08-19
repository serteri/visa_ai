import type { SkillsAssessmentAuthority } from "../types";

/**
 * Australian Nursing and Midwifery Accreditation Council (ANMAC)
 *
 * Fee and processing-time figures below are REASONABLE PLACEHOLDER estimates
 * (not sourced from a verified current ANMAC fee schedule) -- added so the
 * Financial Roadmap has real numbers to show instead of a blank/generic row
 * for nursing occupations, not as a substitute for checking anmac.org.au
 * before this is treated as authoritative. Replace with confirmed figures
 * once verified; lastVerified is left absent deliberately (unverified).
 *
 * Occupation codes sourced from src/data/occupations.json's own ANMAC
 * attribution (15 occupations).
 */
export const anmacAuthority: SkillsAssessmentAuthority = {
  authorityId: "ANMAC",
  authorityName: "Australian Nursing and Midwifery Accreditation Council",
  country: "AU",
  role: "Skills assessment only -- ANMAC does not provide migration advice, and a positive assessment does not itself grant registration to practise (see AHPRA/Nursing and Midwifery Board of Australia for registration).",
  // lastVerified reflects when this placeholder entry was added, NOT that
  // the fee/processing-time figures were checked against a live ANMAC
  // source -- see the file-level comment above.
  lastVerified: "2026-08-19",
  sourceDocument: "ANMAC Skills Assessment guidelines (figures below are estimates pending verification against anmac.org.au)",
  occupations: [
    { anzscoCode: "411411", title: "Enrolled Nurse" },
    { anzscoCode: "254311", title: "Nurse Manager" },
    { anzscoCode: "254211", title: "Nurse Educator" },
    { anzscoCode: "254212", title: "Nurse Researcher" },
    { anzscoCode: "254411", title: "Nurse Practitioner" },
    { anzscoCode: "254412", title: "Registered Nurse (Aged Care)" },
    { anzscoCode: "254413", title: "Registered Nurse (Child and Family Health)" },
    { anzscoCode: "254414", title: "Registered Nurse (Community Health)" },
    { anzscoCode: "254415", title: "Registered Nurse (Critical Care and Emergency)" },
    { anzscoCode: "254416", title: "Registered Nurse (Developmental Disability)" },
    { anzscoCode: "254418", title: "Registered Nurse (Medical)" },
    { anzscoCode: "254422", title: "Registered Nurse (Mental Health)" },
    { anzscoCode: "254425", title: "Registered Nurse (Paediatrics)" },
    { anzscoCode: "254423", title: "Registered Nurse (Perioperative)" },
    { anzscoCode: "254499", title: "Registered Nurses nec" },
  ],
  notes: [
    {
      en: "A positive ANMAC skills assessment confirms your qualification is comparable to an Australian nursing/midwifery qualification -- it is a separate step from AHPRA registration, which is required before you can practise in Australia.",
      tr: "Olumlu bir ANMAC beceri değerlendirmesi, niteliğinizin bir Avustralya hemşirelik/ebelik niteliğiyle karşılaştırılabilir olduğunu doğrular -- bu, Avustralya'da çalışabilmeniz için gereken AHPRA kaydından ayrı bir adımdır.",
      "zh-Hans": "积极的ANMAC技能评估确认您的学历与澳大利亚护理/助产学历相当——这与AHPRA注册是分开的步骤，AHPRA注册是您在澳大利亚执业前所必需的。",
    },
  ],
  pathways: [
    {
      pathwayId: "SKILLS_ASSESSMENT_MIGRATION",
      name: {
        en: "Skills Assessment for Migration",
        tr: "Göçmenlik için Beceri Değerlendirmesi",
        "zh-Hans": "移民技能评估",
      },
      requiresPriorAssessment: false,
      fees: [
        {
          label: { en: "Skills Assessment Application (estimate)", tr: "Beceri Değerlendirmesi Başvurusu (tahmini)", "zh-Hans": "技能评估申请（估算）" },
          amountAUD: 1000,
        },
      ],
      processingTimeWeeks: {
        standard: 12,
        note: {
          en: "Estimate only -- verify current processing times against anmac.org.au before relying on this figure.",
          tr: "Yalnızca tahmindir -- bu rakama güvenmeden önce güncel işlem sürelerini anmac.org.au üzerinden doğrulayın.",
          "zh-Hans": "仅为估算——在依赖此数字之前，请在anmac.org.au上核实当前处理时间。",
        },
      },
      documentRequirements: [
        {
          en: "Proof of identity (passport, name-change evidence if applicable).",
          tr: "Kimlik kanıtı (pasaport, varsa isim değişikliği kanıtı).",
          "zh-Hans": "身份证明（护照，如适用需提供姓名变更证明）。",
        },
        {
          en: "Nursing/midwifery qualification certificate and full academic transcript.",
          tr: "Hemşirelik/ebelik nitelik sertifikası ve tam akademik transkript.",
          "zh-Hans": "护理/助产学历证书及完整学术成绩单。",
        },
        {
          en: "Evidence of current registration/licence to practise in the country of qualification.",
          tr: "Nitelik alınan ülkede güncel çalışma kaydı/lisansı kanıtı.",
          "zh-Hans": "在获得学历的国家目前注册/执业许可的证明。",
        },
        {
          en: "English language test evidence meeting the registration standard.",
          tr: "Kayıt standardını karşılayan İngilizce dil testi kanıtı.",
          "zh-Hans": "符合注册标准的英语语言考试证明。",
        },
      ],
      notes: [
        {
          en: "This pathway assesses qualifications only. Registration to practise is a separate application to the Nursing and Midwifery Board of Australia via AHPRA.",
          tr: "Bu yol yalnızca nitelikleri değerlendirir. Çalışma kaydı, AHPRA aracılığıyla Hemşirelik ve Ebelik Kurulu'na yapılan ayrı bir başvurudur.",
          "zh-Hans": "此路径仅评估学历。执业注册是通过AHPRA向澳大利亚护理和助产委员会提交的单独申请。",
        },
      ],
    },
  ],
};
