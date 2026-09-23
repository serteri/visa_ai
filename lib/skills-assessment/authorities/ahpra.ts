import type { AuthorityFee, SkillsAssessmentAuthority, SkillsAssessmentPathway } from "../types";
import {
  IMG_PATHWAYS_SOURCE,
  MEDICAL_REGISTRATION_PROCESS,
  resolveMedicalRegistration,
  type MedicalRegistrationFees,
} from "@/lib/health-registration/img-pathways";

/**
 * Australian Health Practitioner Regulation Agency (AHPRA) / Medical Board of Australia
 *
 * Fees come from src/data/health-registration/img-pathways.json, extracted by scripts/generate-img-pathways.ts
 * from the Medical Board / Ahpra document "Pathways to registration for international medical graduates"
 * (its "Schedule of fees effective 1 August 2026"). Only the Medical Board application and registration fees
 * carry an amount. The AMC, ECFMG, specialist-college, CPD-home and assessment fees are listed with the
 * document's own deferral text and NO amount -- the document publishes none (provenance.json marks them
 * "needs human verification"). This replaces the earlier unsourced placeholders (AUD 2,500 college
 * assessment + AUD 850 registration, 26-week processing estimate).
 *
 * The report picks the pathway per applicant via resolveMedicalRegistration (lib/health-registration/
 * img-pathways.ts); the pathways below are the same data in registry form.
 *
 * Occupation codes sourced from src/data/occupations.json's own AHPRA/Medical Board attribution
 * (29 occupations -- specialist physicians, surgeons, GPs and related medical roles).
 */
function registryPathway(pathwayId: string, name: SkillsAssessmentPathway["name"], fees: MedicalRegistrationFees): SkillsAssessmentPathway {
  const effective = IMG_PATHWAYS_SOURCE.feeScheduleEffectiveDate;
  const boardFee = (row: MedicalRegistrationFees["applicationFee"]): AuthorityFee => ({
    label: row.item,
    amountAUD: row.nationalFeeAud,
    note: `Medical Board of Australia schedule of fees effective ${effective}${row.nswRebateOrSurchargeAud ? `; NSW principal place of practice: AUD ${row.nswFeeAud}` : ""}`,
  });
  return {
    pathwayId,
    name,
    requiresPriorAssessment: false,
    fees: [
      boardFee(fees.applicationFee),
      boardFee(fees.registrationFee),
      // No amountAUD on purpose: the source document gives none.
      ...fees.deferredFees.map((f): AuthorityFee => ({ label: f.organisation, note: f.text })),
    ],
    documentRequirements: [
      {
        en: "Primary source verification (PSV) of your primary (and specialist, if relevant) medical qualifications, arranged through an AMC candidate account and an ECFMG MyIntealth/EPIC portfolio.",
        tr: "Temel (ve varsa uzmanlık) tıp niteliklerinizin birincil kaynak doğrulaması (PSV); AMC aday hesabı ve ECFMG MyIntealth/EPIC portföyü üzerinden yapılır.",
        "zh-Hans": "通过 AMC 候选人账户和 ECFMG MyIntealth/EPIC 档案，对您的基础（及适用时的专科）医学资格进行原始来源核验（PSV）。",
      },
      {
        en: "A primary qualification in medicine and surgery from a training institution recognised by both the AMC and the World Directory of Medical Schools (WDOMS).",
        tr: "Hem AMC hem de World Directory of Medical Schools (WDOMS) tarafından tanınan bir kurumdan alınmış temel tıp ve cerrahi niteliği.",
        "zh-Hans": "由同时获 AMC 和《世界医学院名录》（WDOMS）认可的院校颁发的医学与外科基础学历。",
      },
      {
        en: "Evidence meeting the Medical Board's registration standards at application: English language, recency of practice and criminal history.",
        tr: "Başvuruda Tıp Kurulu kayıt standartlarını karşılayan kanıtlar: İngilizce dil, uygulama güncelliği ve sabıka geçmişi.",
        "zh-Hans": "申请时符合医学委员会注册标准的证明：英语语言、近期执业经历及犯罪记录。",
      },
      {
        en: "A supervised practice plan and a Board-approved supervisor and position (all pathways described here start with a period of supervised practice).",
        tr: "Denetimli uygulama planı ile Kurul onaylı bir denetçi ve pozisyon (buradaki tüm yollar bir denetimli uygulama dönemiyle başlar).",
        "zh-Hans": "督导执业计划，以及经医学委员会批准的督导人和职位（此处所述各路径均以一段督导执业开始）。",
      },
    ],
    notes: [MEDICAL_REGISTRATION_PROCESS],
  };
}

export const ahpraAuthority: SkillsAssessmentAuthority = {
  authorityId: "AHPRA",
  authorityName: "Australian Health Practitioner Regulation Agency",
  country: "AU",
  role: "Registration authority, working with the Medical Board of Australia -- AHPRA does not provide migration advice. Overseas-trained doctors register through one of the Board's pathways: the AMC verifies qualifications (PSV); specialists are either on the Expedited Specialist pathway list or assessed for comparability by their specialist college; non-specialists use the Competent Authority or Standard pathway.",
  lastVerified: IMG_PATHWAYS_SOURCE.extractedDate,
  sourceDocument: `Medical Board of Australia / Ahpra, "${IMG_PATHWAYS_SOURCE.title}" (schedule of fees effective ${IMG_PATHWAYS_SOURCE.feeScheduleEffectiveDate})`,
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
  notes: [MEDICAL_REGISTRATION_PROCESS],
  pathways: [
    registryPathway(
      "SPECIALIST_RECOGNITION",
      { en: "Specialist pathway – specialist recognition", tr: "Uzman Yolu – uzmanlık tanıma", "zh-Hans": "专科通道 – 专科认可" },
      resolveMedicalRegistration({ anzscoCode: "253513" }),
    ),
    registryPathway(
      "EXPEDITED_SPECIALIST",
      { en: "Expedited Specialist pathway", tr: "Hızlandırılmış Uzman Yolu", "zh-Hans": "快速专科通道" },
      resolveMedicalRegistration({ anzscoCode: "253111" }),
    ),
    registryPathway(
      "STANDARD",
      { en: "Standard pathway", tr: "Standart Yol", "zh-Hans": "标准通道" },
      resolveMedicalRegistration({ anzscoCode: "253112" }),
    ),
  ],
};
