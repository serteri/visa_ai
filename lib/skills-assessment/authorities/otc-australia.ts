import type { SkillsAssessmentAuthority, LocalizedString } from "../types";

/**
 * Occupational Therapy Council of Australia Ltd (OTC)
 * Source: OTC Assessment for Migration & Pathways to Evidence English
 *         Language Proficiency (June/April 2026)
 * Verified: 2026-08-05
 *
 * OTC covers only one occupation: Occupational Therapist (252411).
 * Unique: Desktop Assessment only — ALL documents must be JPEG colour
 * photographs. NO SCANS accepted. Identity verified via unscheduled video call.
 *
 * Multilanguage support: EN, TR, ZH-Hans
 */
export const otcAustraliaAuthority: SkillsAssessmentAuthority = {
  authorityId: "OTC",
  authorityName: "Occupational Therapy Council of Australia Ltd",
  country: "AU",
  role: "Skills assessment only — OTC does not provide migration advice.",
  occupations: [
    { anzscoCode: "252411", title: "Occupational Therapist" },
  ],
  lastVerified: "2026-08-05",
  sourceDocument:
    "OTC Assessment for Migration & Pathways to Evidence English Language Proficiency (June/April 2026)",
  notes: [
    {
      en: "OTC covers only one occupation: Occupational Therapist (ANZSCO 252411).",
      tr: "OTC yalnızca bir mesleği kapsar: Mesleki Terapist (ANZSCO 252411).",
      "zh-Hans": "OTC仅涵盖一个职业：职业治疗师（ANZSCO 252411）。",
    },
    {
      en: "Qualifications MUST be approved by the World Federation of Occupational Therapy (WFOT) at the time of graduation (no retrospective approval).",
      tr: "Yeterlilikler mezuniyet sırasında Dünya Mesleki Terapi Federasyonu (WFOT) tarafından onaylanmış OLMALIDIR (geçmişe dönük onay yok).",
      "zh-Hans": "资格必须在毕业时获得世界职业治疗联合会（WFOT）批准（不接受追溯批准）。",
    },
    {
      en: "ALL documents must be submitted as high-resolution JPEG colour photographs. NO SCANS ACCEPTED.",
      tr: "TÜM belgeler yüksek çözünürlüklü JPEG renkli fotoğraf olarak gönderilmelidir. TARAMA KABUL EDİLMEZ.",
      "zh-Hans": "所有文件必须以高分辨率JPEG彩色照片形式提交。不接受扫描件。",
    },
    {
      en: "Identity verification is done via an unscheduled video call — applicants must be prepared.",
      tr: "Kimlik doğrulama planlanmamış bir video görüşmesi ile yapılır — başvuru sahipleri hazır olmalıdır.",
      "zh-Hans": "身份验证通过计划外的视频通话进行——申请人必须做好准备。",
    },
  ],
  fraudPolicy: {
    en: "If documents are suspected as fraudulent, they will be provided to the Department of Home Affairs (DoHA) for investigation. The assessment will be paused until DoHA advises.",
    tr: "Belgelerin sahte olduğundan şüphelenilirse, soruşturma için İçişleri Bakanlığı'na (DoHA) sağlanacaktır. Değerlendirme, DoHA bildirene kadar duraklatılır.",
    "zh-Hans": "如果怀疑文件造假，将提供给内政部（DoHA）进行调查。评估将暂停，直到DoHA通知。",
  },
  validityPeriod: {
    years: 3,
    note: {
      en: "The outcome from this assessment is valid for three years. A new application and fee of A$800 is required if the outcome expires.",
      tr: "Bu değerlendirme sonucu 3 yıl geçerlidir. Sonuç süresi dolarsa yeni başvuru ve 800 Avustralya Doları ücret gerekir.",
      "zh-Hans": "评估结果3年内有效。如果结果过期，需要重新申请并支付800澳元费用。",
    },
  },
  englishRequirements: [
    {
      test: "IELTS (Academic)",
      minimumScore: "7.0 overall (min 7.0 in L/R/S, 6.5 in W)",
      validityYears: 2,
    },
    {
      test: "PTE (Academic)",
      minimumScore: "58/59/69/76 (L/R/W/S)",
      validityYears: 2,
    },
    {
      test: "OET",
      minimumScore: "Min 350 in L/W, min 360 in R/S",
      validityYears: 2,
    },
    {
      test: "TOEFL iBT",
      minimumScore: "91 overall (min 22 L/R, 23 W, 24 S)",
      validityYears: 2,
    },
    {
      test: "Cambridge (C1 Advanced)",
      minimumScore: "178 overall (min 175 L, 179 R, 180 W, 194 S)",
      validityYears: 2,
    },
  ],
  englishExemptions: [
    "Applicants with education pathways completed solely in English from recognised countries (e.g., UK, USA, Canada, NZ, Ireland, South Africa, etc.) meeting specific criteria (Combined, School, or Advanced education pathways).",
  ],
  englishTestValidity: {
    en: "Tests must be obtained within 2 years before lodging the application, OR more than 2 years if continuously working as an OT or continuously enrolled in a Board-approved program.",
    tr: "Testler başvurudan önceki 2 yıl içinde alınmış olmalıdır, VEYA OT olarak sürekli çalışılıyorsa veya Kurul onaylı bir programa sürekli kayıtlıysa 2 yıldan fazla olabilir.",
    "zh-Hans": "考试必须在申请前2年内获得，或者如果连续担任OT或连续注册委员会批准的课程，则可超过2年。",
  },
  pathways: [
    {
      pathwayId: "DESKTOP_ASSESSMENT_MIGRATION",
      name: {
        en: "Desktop Assessment for Migration",
        tr: "Göçmenlik için Masaüstü Değerlendirmesi",
        "zh-Hans": "移民桌面评估",
      },
      occupation: "252411",
      eligibleFor: [
        {
          en: "Occupational therapists wanting to apply for skilled migration (ANZSCO 252411)",
          tr: "Becerili göç başvurusu yapmak isteyen mesleki terapistler (ANZSCO 252411)",
          "zh-Hans": "希望申请技术移民的职业治疗师（ANZSCO 252411）",
        },
      ],
      requiresPriorAssessment: false,
      fees: [
        {
          label: { en: "Application for Assessment for Migration", tr: "Göçmenlik Değerlendirmesi Başvurusu", "zh-Hans": "移民评估申请" },
          amountAUD: 800,
        },
      ],
      processingTimeWeeks: {
        standard: 5,
        note: {
          en: "Standard desktop assessments generally take 4-6 weeks once all correct JPEG files and payments are received.",
          tr: "Standart masaüstü değerlendirmeleri, tüm doğru JPEG dosyaları ve ödemeler alındıktan sonra genellikle 4-6 hafta sürer.",
          "zh-Hans": "标准桌面评估通常在收到所有正确的JPEG文件和付款后需要4-6周。",
        },
      },
      documentRequirements: [
        {
          en: "Completed application form (PDF or Word).",
          tr: "Tamamlanmış başvuru formu (PDF veya Word).",
          "zh-Hans": "填好的申请表（PDF或Word）。",
        },
        {
          en: "Proof of payment receipt.",
          tr: "Ödeme makbuz kanıtı.",
          "zh-Hans": "付款收据证明。",
        },
        {
          en: "Birth certificate, Passport, additional photo ID, recent facial photograph (no older than 1 month).",
          tr: "Doğum sertifikası, Pasaport, ek fotoğraflı kimlik, güncel yüz fotoğrafı (1 aydan eski değil).",
          "zh-Hans": "出生证明、护照、额外带照片身份证、近期面部照片（不超过1个月）。",
        },
        {
          en: "Testamur/letter of completion and full academic transcript.",
          tr: "Testamur/tamamlama mektubu ve tam akademik transkript.",
          "zh-Hans": "毕业证书/完成信和完整学术成绩单。",
        },
        {
          en: "English test result statement OR evidence of education in a recognised country.",
          tr: "İngilizce test sonucu beyanı VEYA tanınan bir ülkede eğitim kanıtı.",
          "zh-Hans": "英语测试成绩单或在认可国家接受教育的证明。",
        },
        {
          en: "NAATI accredited translations for non-English documents.",
          tr: "İngilizce olmayan belgeler için NAATI onaylı çeviriler.",
          "zh-Hans": "非英语文件的NAATI认证翻译。",
        },
      ],
      notes: [
        {
          en: "CRITICAL: ALL documents MUST be submitted as high-resolution JPEG colour photographs. NO SCANS WILL BE ACCEPTED.",
          tr: "KRİTİK: TÜM belgeler yüksek çözünürlüklü JPEG renkli fotoğraf olarak gönderilmelidir. TARAMA KABUL EDİLMEZ.",
          "zh-Hans": "关键：所有文件必须以高分辨率JPEG彩色照片形式提交。不接受扫描件。",
        },
        {
          en: "To verify identity, the OTC will contact the practitioner via a brief unscheduled video call.",
          tr: "Kimliği doğrulamak için, OTC uygulayıcıyı kısa bir planlanmamış video görüşmesi ile iletişime geçecektir.",
          "zh-Hans": "为验证身份，OTC将通过简短的计划外视频通话联系从业者。",
        },
        {
          en: "Applications are submitted via email to migration@otcouncil.com.au.",
          tr: "Başvurular migration@otcouncil.com.au adresine e-posta ile gönderilir.",
          "zh-Hans": "申请通过电子邮件发送至migration@otcouncil.com.au。",
        },
      ],
    },
  ],
};
