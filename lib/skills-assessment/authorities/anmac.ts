import type { AuthorityFee, SkillsAssessmentAuthority, SkillsAssessmentPathway } from "../types";
import { ANMAC_ASSESSMENT_PROCESS, ANMAC_FEES_SOURCE, anmacFee } from "@/lib/health-registration/anmac-fees";

/**
 * Australian Nursing and Midwifery Accreditation Council (ANMAC)
 *
 * Fees and wait times come from src/data/health-registration/anmac-fees.json, extracted by
 * scripts/generate-anmac-fees.ts from data/knowledge/Skill Assessments/Anmac/Anmac.pdf (Ahpra / NMBA pages on
 * internationally qualified nurses and midwives, plus Anmac's skills-assessment pages): Full skills assessment
 * AUD 595, Modified skills assessment AUD 395, each with "Current wait time for assessment to start: 6–8 weeks".
 * The document states no completion time, so no processingTimeWeeks is set. This replaces the earlier unsourced
 * placeholder (AUD 1,000, 12-week estimate).
 *
 * The report picks the assessment per applicant via resolveAnmacAssessment (lib/health-registration/anmac-fees.ts);
 * the pathways below are the same data in registry form. The Direct care skills assessment (AUD 545, ANZSCO
 * 423312/423313 only) is not listed: neither code is an ANMAC occupation here.
 *
 * Occupation codes sourced from src/data/occupations.json's own ANMAC attribution (15 occupations).
 */
function registryPathway(pathwayId: string, name: SkillsAssessmentPathway["name"], feeId: string, documentRequirements: SkillsAssessmentPathway["documentRequirements"]): SkillsAssessmentPathway {
  const fee = anmacFee(feeId);
  const wait = fee.waitTimeToStart!;
  const waitNote = {
    en: `Current wait time for assessment to start: ${wait.minWeeks}–${wait.maxWeeks} weeks (Anmac.pdf p.${wait.page}); the document gives no completion time.`,
    tr: `Değerlendirmenin başlaması için güncel bekleme süresi: ${wait.minWeeks}–${wait.maxWeeks} hafta (Anmac.pdf s.${wait.page}); belge tamamlanma süresi vermiyor.`,
    "zh-Hans": `评估开始前的当前等待时间：${wait.minWeeks}–${wait.maxWeeks} 周（Anmac.pdf 第 ${wait.page} 页）；文件未给出完成时间。`,
  };
  return {
    pathwayId,
    name,
    eligibleFor: [fee.appliesTo],
    requiresPriorAssessment: false,
    fees: [
      {
        label: { en: `Anmac ${fee.item}`, tr: `Anmac ${fee.item}`, "zh-Hans": `Anmac ${fee.item}` },
        amountAUD: fee.amountAud,
        note: `Anmac.pdf p.${fee.page} (fee stated as AUD ${fee.amountAud}; no effective date)`,
      } satisfies AuthorityFee,
    ],
    documentRequirements,
    notes: [waitNote],
  };
}

const IDENTITY = {
  en: "Proof of identity: passport bio-data page, a passport-style photograph taken in the last 6 months, two additional forms of identification, and change-of-name documents if applicable.",
  tr: "Kimlik kanıtı: pasaportun kimlik sayfası, son 6 ayda çekilmiş vesikalık fotoğraf, iki ek kimlik belgesi ve varsa isim değişikliği belgeleri.",
  "zh-Hans": "身份证明：护照资料页、近 6 个月内拍摄的护照式照片、另外两种身份证明文件，以及（如适用）更名文件。",
};

export const anmacAuthority: SkillsAssessmentAuthority = {
  authorityId: "ANMAC",
  authorityName: "Australian Nursing and Midwifery Accreditation Council",
  country: "AU",
  role: "Skills assessment only -- ANMAC does not provide migration advice, and a positive assessment does not itself grant registration to practise (see AHPRA/Nursing and Midwifery Board of Australia for registration).",
  lastVerified: ANMAC_FEES_SOURCE.extractedDate,
  sourceDocument: `Anmac.pdf (${ANMAC_FEES_SOURCE.title}; no effective date stated)`,
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
  notes: [ANMAC_ASSESSMENT_PROCESS],
  pathways: [
    registryPathway(
      "FULL_SKILLS_ASSESSMENT",
      { en: "Full skills assessment", tr: "Full beceri değerlendirmesi", "zh-Hans": "完整技能评估（Full skills assessment）" },
      "anmac_full_skills_assessment",
      [
        IDENTITY,
        {
          en: "Graduation certificates and transcripts for all relevant qualifications, and evidence of theory and practice hours if not on the transcript.",
          tr: "İlgili tüm nitelikler için mezuniyet belgeleri ve transkriptler; transkriptte yoksa teori ve uygulama saatlerinin kanıtı.",
          "zh-Hans": "所有相关学历的毕业证书和成绩单；如成绩单未列明，需提供理论和实践学时证明。",
        },
        {
          en: "Verification of registration or a certificate of good standing sent to Anmac directly by the overseas regulatory authority.",
          tr: "Yurt dışındaki düzenleyici kurum tarafından doğrudan Anmac'e gönderilen kayıt doğrulaması veya iyi durum belgesi (certificate of good standing).",
          "zh-Hans": "由海外监管机构直接发送给 Anmac 的注册核实或良好信誉证明（certificate of good standing）。",
        },
        {
          en: "At least 3 months (260 hours) of paid employment in the last 5 years aligned with your nominated ANZSCO code, with a professional reference letter for each period.",
          tr: "Son 5 yılda aday gösterdiğiniz ANZSCO koduyla uyumlu en az 3 ay (260 saat) ücretli çalışma; her dönem için profesyonel referans mektubu.",
          "zh-Hans": "过去 5 年内与所提名 ANZSCO 代码相符的至少 3 个月（260 小时）带薪工作经历，每段经历附专业推荐信。",
        },
        {
          en: "English test results (IELTS, OET, PTE Academic, TOEFL iBT or Cambridge C1/C2) less than two years old meeting Anmac's minimum scores (e.g. IELTS Academic overall 7, with 7 in listening, reading and speaking and 6.5 in writing).",
          tr: "Anmac'in asgari puanlarını karşılayan, iki yıldan eski olmayan İngilizce test sonuçları (IELTS, OET, PTE Academic, TOEFL iBT veya Cambridge C1/C2) (ör. IELTS Academic genel 7; dinleme, okuma ve konuşmada 7, yazmada 6,5).",
          "zh-Hans": "不超过两年、达到 Anmac 最低分数要求的英语考试成绩（IELTS、OET、PTE Academic、TOEFL iBT 或 Cambridge C1/C2）（例如 IELTS 学术类总分 7，听、读、说各 7，写作 6.5）。",
        },
      ],
    ),
    registryPathway(
      "MODIFIED_SKILLS_ASSESSMENT",
      { en: "Modified skills assessment", tr: "Modified beceri değerlendirmesi", "zh-Hans": "修改版技能评估（Modified skills assessment）" },
      "anmac_modified_skills_assessment",
      [
        IDENTITY,
        {
          en: "Graduation certificates and transcripts showing commencement and completion dates, plus any pre-registration exam, adaptation or bridging documents.",
          tr: "Başlangıç ve bitiş tarihlerini gösteren mezuniyet belgeleri ve transkriptler; varsa kayıt öncesi sınav, uyum veya köprü programı belgeleri.",
          "zh-Hans": "显示入学和毕业日期的毕业证书和成绩单，以及任何注册前考试、适应或衔接课程文件。",
        },
        {
          en: "Current NMBA/Ahpra, NCNZ or MCNZ registration (Anmac verifies it directly). No English test is required for this assessment.",
          tr: "Güncel NMBA/Ahpra, NCNZ veya MCNZ kaydı (Anmac doğrudan doğrular). Bu değerlendirme için İngilizce testi gerekmez.",
          "zh-Hans": "目前有效的 NMBA/Ahpra、NCNZ 或 MCNZ 注册（由 Anmac 直接核实）。此评估无需英语考试成绩。",
        },
      ],
    ),
  ],
};
