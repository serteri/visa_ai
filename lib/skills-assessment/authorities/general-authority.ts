import type { SkillsAssessmentAuthority } from "../types";

/**
 * VETASSESS / General Professional Authority -- universal catch-all for any
 * occupation that doesn't match a specific modeled authority (ACS, EA, TRA,
 * ANMAC, AHPRA, CPA, AACA, ...). VETASSESS is named specifically because it's
 * the real-world default: it assesses the largest single bucket of skilled
 * occupations in Australia (341 professional occupations per the audit note
 * in occupation-authority-map.ts) that don't have a dedicated authority.
 *
 * Deliberately has no occupations[] entries -- it's matched programmatically
 * as the last-resort fallback in getAssessingAuthority(), not by ANZSCO code
 * or keyword, so every occupation resolves to *something* and the Financial
 * Roadmap table never renders a blank/generic row.
 *
 * Fee and processing-time figures are REASONABLE PLACEHOLDER estimates (not
 * sourced from a verified current VETASSESS fee schedule) -- see the note on
 * anmac.ts/ahpra.ts for the same caveat. Replace with confirmed figures once
 * verified against vetassess.com.au.
 */
export const generalAuthority: SkillsAssessmentAuthority = {
  authorityId: "GENERAL",
  authorityName: "VETASSESS / General Professional Authority",
  country: "AU",
  role: "Skills assessment only -- does not provide migration advice. This is a fallback estimate; the applicant's actual assessing authority depends on their specific ANZSCO occupation code and should be confirmed via the official Skills Assessing Authority list before lodging.",
  // lastVerified reflects when this fallback entry was added, NOT that the
  // fee/processing-time figures were checked against a live VETASSESS
  // source -- see the file-level comment above.
  lastVerified: "2026-08-19",
  sourceDocument: "VETASSESS General Skills Assessment (figures below are estimates pending verification against vetassess.com.au)",
  occupations: [],
  notes: [
    {
      en: "VETASSESS is the default assessing authority for most professional and general occupations that don't have their own dedicated authority (e.g. teachers, social workers, managers, and many other skilled professions).",
      tr: "VETASSESS, kendi özel değerlendirme kurumu bulunmayan çoğu profesyonel ve genel meslek için (ör. öğretmenler, sosyal çalışmacılar, yöneticiler ve diğer birçok nitelikli meslek) varsayılan değerlendirme kurumudur.",
      "zh-Hans": "VETASSESS是大多数没有专属评估机构的专业及一般职业（例如教师、社会工作者、管理人员及其他众多技术职业）的默认评估机构。",
    },
  ],
  pathways: [
    {
      pathwayId: "GENERAL_SKILLS_ASSESSMENT",
      name: {
        en: "General Skills Assessment",
        tr: "Genel Beceri Değerlendirmesi",
        "zh-Hans": "通用技能评估",
      },
      requiresPriorAssessment: false,
      fees: [
        {
          label: { en: "General Skills Assessment (estimate)", tr: "Genel Beceri Değerlendirmesi (tahmini)", "zh-Hans": "通用技能评估（估算）" },
          amountAUD: 950,
        },
      ],
      processingTimeWeeks: {
        standard: 16,
        note: {
          en: "Estimate only -- standard range is commonly cited as 12-16 weeks, but varies by occupation and application volume. Verify current processing times against vetassess.com.au before relying on this figure.",
          tr: "Yalnızca tahmindir -- standart aralık genellikle 12-16 hafta olarak belirtilir, ancak mesleğe ve başvuru yoğunluğuna göre değişir. Bu rakama güvenmeden önce güncel işlem sürelerini vetassess.com.au üzerinden doğrulayın.",
          "zh-Hans": "仅为估算——标准范围通常为12-16周，但因职业和申请量而异。在依赖此数字之前，请在vetassess.com.au上核实当前处理时间。",
        },
      },
      documentRequirements: [
        {
          en: "Proof of identity (passport, name-change evidence if applicable).",
          tr: "Kimlik kanıtı (pasaport, varsa isim değişikliği kanıtı).",
          "zh-Hans": "身份证明（护照，如适用需提供姓名变更证明）。",
        },
        {
          en: "Qualification certificate(s) and full academic transcript(s).",
          tr: "Nitelik sertifikası/sertifikaları ve tam akademik transkript(ler).",
          "zh-Hans": "学历证书及完整学术成绩单。",
        },
        {
          en: "Employment reference letter(s) on company letterhead detailing duties, dates, and hours worked.",
          tr: "Görev, tarih ve çalışma saatlerini detaylandıran şirket antetli iş referans mektup(lar)ı.",
          "zh-Hans": "公司抬头的工作推荐信，详细说明职责、日期和工作时长。",
        },
      ],
      notes: [
        {
          en: "This is a fallback estimate. Confirm your actual assessing authority against the official Skills Assessing Authority list for your specific ANZSCO occupation code before relying on these figures.",
          tr: "Bu bir yedek tahmindir. Bu rakamlara güvenmeden önce, gerçek değerlendirme kurumunuzu spesifik ANZSCO meslek kodunuz için resmi Beceri Değerlendirme Kurumu listesinden doğrulayın.",
          "zh-Hans": "这是一个备用估算。在依赖这些数字之前，请根据您的具体ANZSCO职业代码，通过官方技能评估机构名单确认您的实际评估机构。",
        },
      ],
    },
  ],
};
