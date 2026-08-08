import type { Locale } from "./types";

/**
 * Single source of truth for "which documents does subclass X require" —
 * consumed by BOTH the interactive checklist tool
 * (lib/i18n/checklist-content.ts, /tools/document-checklist-2026) and the
 * PDF report's document checklist section (./document-checklists.ts).
 *
 * Before this file existed, the two had separately hand-maintained lists
 * that drifted out of sync — e.g. subclass 482 was missing "English
 * evidence" and "Health insurance" in the interactive tool even though the
 * PDF already listed them. Adding a new document requirement now only
 * needs to happen here once.
 *
 * Scope note: 189/190/491/482/485/186 are modeled here. 500/820/801 have
 * entries in document-checklists.ts's PDF-only literal strings but are not
 * yet part of this canonical inventory or the interactive tool (tracked
 * separately as a follow-up).
 *
 * 189 sourcing note: the partner/dependant/character items (relationship
 * status evidence, partner documents, dependant under/over-18 documents,
 * overseas police certificates, Form 80/1221, military records) were added
 * from the official DHA "Skilled Independent visa (subclass 189) --
 * Points-tested stream" document guide, pasted in full by the user.
 * `relevantWhen` on these items drives the interactive tool's
 * partner/dependants/overseas-residence questionnaire, which dims (never
 * hides) items that don't apply based on the user's answers. TODO:
 * full-check's ReadinessInput could feed this questionnaire automatically
 * if it ever gains structured partner/dependant/residence-history fields --
 * out of scope for now, see visa-checklist-questionnaire in
 * DocumentChecklist2026Localized.tsx.
 *
 * 186 (Employer Nomination Scheme) sourcing note: DHA's own pages
 * (immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/employer-nomination-scheme-186
 * and its /direct-entry-stream sub-page) return HTTP 403 to automated
 * fetches, so the 186 entries below are corroborated via search-engine
 * snippets of those same DHA pages plus cross-referencing multiple
 * registered-migration-agent summaries, and checked for consistency
 * against this app's own existing engine.ts constants
 * (TRT_186_MIN_SPONSORED_YEARS = 2, DIRECT_ENTRY_186_MAX_AGE = 45) --
 * both matched independently, giving reasonable confidence. The CSIT
 * salary figure is deliberately NOT hardcoded here (third-party sources
 * disagreed on the exact 1 July 2026 number, ranging AUD 76,515-79,499);
 * the tip text points users to confirm the current figure rather than
 * risk stating a wrong one, matching this app's existing pattern for
 * other periodically-indexed thresholds (see lib/readiness/generate-pdf.ts's
 * VAC "should be verified before lodgement" wording). If this ever needs
 * re-verifying (e.g. after a threshold date change), start from:
 * https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/employer-nomination-scheme-186
 * https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/employer-nomination-scheme-186/direct-entry-stream
 */

export type DocInventorySubclass = "189" | "190" | "491" | "482" | "485" | "186";

export type CanonicalDocItem = {
  id: string;
  /** Matches the category keys already translated in
   *  lib/i18n/checklist-content.ts's per-locale `categories` map
   *  ("Identity", "Skills", "English", "Nomination", "Health", "Employer",
   *  "Finance", "Education", "Registration"). */
  category: string;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
  required: boolean;
  expiryTracking: boolean;
  expiryMonths?: number;
  warningMonths?: number;
  tips: Record<Locale, string>;
  apostilleRequired: boolean;
  naatiRequired: boolean;
  /** Optional conditional-relevance flags consumed by the interactive
   *  tool's questionnaire (partner/dependants/overseas-residence) to dim
   *  items that don't apply to the user's situation instead of hiding
   *  them. Omit for items that are always relevant regardless of answers. */
  relevantWhen?: {
    partner?: boolean;
    dependantsUnder18?: boolean;
    dependantsOver18?: boolean;
    overseasResidence?: boolean;
  };
};

export const DOCUMENT_INVENTORY: Record<DocInventorySubclass, CanonicalDocItem[]> = {
  "189": [
    {
      id: "passport",
      category: "Identity",
      name: { en: "Valid passport", tr: "Geçerli pasaport", "zh-Hans": "有效护照" },
      description: {
        en: "Biometric page and any visa pages",
        tr: "Biyometrik sayfa ve vize sayfaları",
        "zh-Hans": "个人信息页和所有签证页",
      },
      required: true,
      expiryTracking: true,
      expiryMonths: 120,
      warningMonths: 6,
      tips: {
        en: "Keep a clean scanned copy of the bio page and all stamped pages.",
        tr: "Pasaport biyometrik sayfanızın ve damgalı sayfaların net kopyasını saklayın.",
        "zh-Hans": "保存护照信息页和盖章页的清晰扫描件。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "birth_certificate",
      category: "Identity",
      name: { en: "Birth certificate", tr: "Doğum belgesi", "zh-Hans": "出生证明" },
      description: {
        en: "Certified copy of your birth record",
        tr: "Doğum kaydınızın onaylı kopyası",
        "zh-Hans": "经认证的出生记录副本",
      },
      required: true,
      expiryTracking: false,
      tips: {
        en: "Use the version that matches your passport and civil records.",
        tr: "Pasaport ve medeni kayıtlarınızla uyumlu sürümü kullanın.",
        "zh-Hans": "使用与护照和民事记录一致的版本。",
      },
      apostilleRequired: true,
      naatiRequired: true,
    },
    {
      id: "english_test",
      category: "English",
      name: { en: "English test result", tr: "İngilizce test sonucu", "zh-Hans": "英语考试成绩" },
      description: {
        en: "IELTS, PTE, TOEFL or OET result report",
        tr: "IELTS, PTE, TOEFL veya OET sonuç raporu",
        "zh-Hans": "IELTS、PTE、TOEFL或OET成绩报告",
      },
      required: true,
      expiryTracking: true,
      expiryMonths: 36,
      warningMonths: 6,
      tips: {
        en: "Use the result you can prove at invitation and lodgement time.",
        tr: "Davet ve lodgement aşamasında kanıtlayabildiğiniz sonucu kullanın.",
        "zh-Hans": "使用你在邀请和递交时都能证明的成绩。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "skills_assessment",
      category: "Skills",
      name: { en: "Positive skills assessment", tr: "Olumlu beceri değerlendirmesi", "zh-Hans": "正面技能评估" },
      description: {
        en: "Outcome letter from the correct assessing authority",
        tr: "Doğru değerlendirme kurumundan sonuç mektubu",
        "zh-Hans": "来自正确评估机构的结果信",
      },
      required: true,
      expiryTracking: true,
      expiryMonths: 36,
      warningMonths: 6,
      tips: {
        en: "The assessment must match your nominated ANZSCO occupation.",
        tr: "Değerlendirme, aday gösterdiğiniz ANZSCO mesleğiyle eşleşmelidir.",
        "zh-Hans": "评估必须与你提名的ANZSCO职业一致。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "employment_ref",
      category: "Skills",
      name: { en: "Employer references", tr: "İşveren referansları", "zh-Hans": "雇主推荐信" },
      description: {
        en: "Duty, date and hours evidence from past employers",
        tr: "Önceki işverenlerden görev, tarih ve saat kanıtı",
        "zh-Hans": "证明职责、日期和工作时长的文件",
      },
      required: true,
      expiryTracking: false,
      tips: {
        en: "References should match the duties used in your points claim.",
        tr: "Referanslar, puan iddianızdaki görevlerle uyumlu olmalı.",
        "zh-Hans": "推荐信应与积分声明中的职责相一致。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "cv",
      category: "Skills",
      name: { en: "CV / resume", tr: "CV / özgeçmiş", "zh-Hans": "简历 / 履历" },
      description: {
        en: "Current role history and skill summary",
        tr: "Güncel rol geçmişi ve beceri özeti",
        "zh-Hans": "当前工作经历和技能总结",
      },
      required: true,
      expiryTracking: false,
      tips: {
        en: "Keep the chronology identical to your references.",
        tr: "Kronoloji referanslarınızla aynı olmalı.",
        "zh-Hans": "时间顺序应与你的推荐信一致。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "police_check",
      category: "Health",
      name: { en: "Australian Federal Police (AFP) national certificate", tr: "Avustralya Federal Polisi (AFP) ulusal sertifikası", "zh-Hans": "澳大利亚联邦警察（AFP）全国证明" },
      description: {
        en: "AFP national police certificate covering full disclosure of your criminal history, valid for 12 months from issue",
        tr: "Sabıka geçmişinizin tam açıklamasını içeren, verildiği tarihten itibaren 12 ay geçerli AFP ulusal adli sicil sertifikası",
        "zh-Hans": "涵盖完整犯罪记录披露的AFP全国无犯罪证明，自签发起12个月内有效",
      },
      required: true,
      expiryTracking: true,
      expiryMonths: 12,
      warningMonths: 3,
      tips: {
        en: "Only the AFP national certificate is accepted for Australia -- a state/territory police check is not sufficient. Order it after invitation so it stays valid at lodgement.",
        tr: "Avustralya için yalnızca AFP ulusal sertifikası kabul edilir — eyalet/bölge polis kaydı yeterli değildir. Lodgement sırasında geçerli kalması için davetten sonra sipariş edin.",
        "zh-Hans": "在澳大利亚境内只接受AFP全国证明——州/领地警方证明不被接受。请在收到邀请后再申请，以确保递交时仍然有效。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "overseas_police_certificates",
      category: "Health",
      name: { en: "Overseas police certificates", tr: "Yurt dışı adli sicil sertifikaları", "zh-Hans": "海外无犯罪记录证明" },
      description: {
        en: "A police certificate from every country you lived in for a total of 12 months or more (in one or more visits) in the last 10 years, since turning 16",
        tr: "16 yaşından bu yana, son 10 yıl içinde toplam 12 ay veya daha fazla (bir veya birden çok ziyarette) yaşadığınız her ülkeden adli sicil sertifikası",
        "zh-Hans": "自16岁以来，过去10年内您在任何国家累计居住满12个月或以上（一次或多次累加），均需提供该国的无犯罪记录证明",
      },
      required: false,
      expiryTracking: true,
      expiryMonths: 12,
      warningMonths: 3,
      relevantWhen: { overseasResidence: true },
      tips: {
        en: "The 12-month threshold can be made up of separate stays that add up, not just one continuous period -- check each country's issuing process early as some take months.",
        tr: "12 aylık eşik tek bir sürekli dönem olmak zorunda değildir, ayrı ayrı sürelerin toplamı olabilir — bazı ülkelerin süreci aylar sürebileceğinden erken başlayın.",
        "zh-Hans": "12个月的门槛可以由多次分开的居住时间累加而成，不一定是连续一段——部分国家办理需数月，请尽早申请。",
      },
      apostilleRequired: false,
      naatiRequired: true,
    },
    {
      id: "character_forms",
      category: "Health",
      name: { en: "Form 80 and Form 1221", tr: "Form 80 ve Form 1221", "zh-Hans": "Form 80 及 Form 1221" },
      description: {
        en: "Personal particulars for character assessment (Form 80) and additional personal particulars for travel/residence history (Form 1221), if requested by the department",
        tr: "Karakter değerlendirmesi için kişisel bilgiler (Form 80) ve seyahat/ikamet geçmişi için ek kişisel bilgiler (Form 1221) -- bakanlık talep ederse",
        "zh-Hans": "用于品格评估的个人信息表（Form 80）以及旅行/居住历史的补充个人信息表（Form 1221）——如内政部要求提供",
      },
      required: true,
      expiryTracking: false,
      tips: {
        en: "These forms ask for a full 10-year travel and address history -- start compiling dates and addresses early, they are commonly requested.",
        tr: "Bu formlar 10 yıllık tam seyahat ve adres geçmişi ister — tarih ve adresleri erkenden toplamaya başlayın, sıkça talep edilirler.",
        "zh-Hans": "这些表格要求提供完整10年的旅行和住址记录——请尽早整理日期与地址，这类表格经常被要求提交。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "military_records",
      category: "Health",
      name: { en: "Military service records", tr: "Askerlik hizmet kayıtları", "zh-Hans": "兵役记录" },
      description: {
        en: "Discharge papers or service record if you have served in any country's armed forces",
        tr: "Herhangi bir ülkenin silahlı kuvvetlerinde hizmet ettiyseniz terhis belgesi veya hizmet kaydı",
        "zh-Hans": "如曾在任何国家的军队服役，需提供退伍文件或服役记录",
      },
      required: false,
      expiryTracking: false,
      tips: {
        en: "Only applicable if you have military service history -- not needed otherwise.",
        tr: "Sadece askerlik geçmişiniz varsa geçerlidir — aksi halde gerekmez.",
        "zh-Hans": "仅适用于有服役经历者——否则无需提供。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "relationship_status_evidence",
      category: "Identity",
      name: { en: "Relationship status evidence", tr: "Medeni durum kanıtı", "zh-Hans": "婚姻/关系状态证明" },
      description: {
        en: "Marriage, divorce, death or separation certificates if you are, or have been, married or in a de facto relationship",
        tr: "Evli veya evli olmuş ya da de facto ilişki içindeyseniz evlilik, boşanma, ölüm veya ayrılık belgeleri",
        "zh-Hans": "如您已婚、曾结婚或处于事实伴侣关系，需提供结婚、离婚、死亡或分居证明",
      },
      required: true,
      expiryTracking: false,
      tips: {
        en: "This covers your own marital history and is separate from whether a partner is included in this application.",
        tr: "Bu, kendi medeni durum geçmişinizi kapsar ve bu başvuruya bir partnerin dahil olup olmamasından ayrıdır.",
        "zh-Hans": "这涉及您自身的婚姻历史，与本次申请是否包含伴侣无关。",
      },
      apostilleRequired: true,
      naatiRequired: true,
    },
    {
      id: "partner_documents",
      category: "Identity",
      name: { en: "Partner identity, character & relationship evidence", tr: "Partner kimlik, karakter ve ilişki kanıtı", "zh-Hans": "伴侣身份、品格及关系证明" },
      description: {
        en: "Partner's passport, police certificates, and evidence of a genuine relationship (joint bank accounts, lease, correspondence) if your partner is included in the application",
        tr: "Partneriniz başvuruya dahilse partnerinizin pasaportu, adli sicil kayıtları ve gerçek bir ilişkiyi gösteren kanıtlar (ortak banka hesabı, kira sözleşmesi, yazışmalar)",
        "zh-Hans": "如伴侣包含在申请中，需提供伴侣护照、无犯罪记录证明及真实关系证据（联名银行账户、租约、往来通信等）",
      },
      required: false,
      expiryTracking: false,
      relevantWhen: { partner: true },
      tips: {
        en: "Not applicable if you are applying without a partner, or your partner is not being included in this application.",
        tr: "Partnersiz başvuruyorsanız veya partneriniz bu başvuruya dahil değilse gerekmez.",
        "zh-Hans": "如您单独申请或伴侣未包含在本次申请中，则无需提供。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "partner_english_evidence",
      category: "English",
      name: { en: "Partner functional English evidence", tr: "Partner fonksiyonel İngilizce kanıtı", "zh-Hans": "伴侣功能性英语证明" },
      description: {
        en: "Evidence of your partner's functional English, or exemption evidence if they are a passport holder of UK, US, Canada, NZ or Ireland",
        tr: "Partnerinizin fonksiyonel İngilizcesine dair kanıt, ya da İngiltere, ABD, Kanada, Yeni Zelanda veya İrlanda pasaportu sahibiyse muafiyet kanıtı",
        "zh-Hans": "伴侣功能性英语能力的证明，若持有英国、美国、加拿大、新西兰或爱尔兰护照则提供豁免证明",
      },
      required: false,
      expiryTracking: false,
      relevantWhen: { partner: true },
      tips: {
        en: "Not applicable if you are applying without a partner, or your partner is not being included in this application.",
        tr: "Partnersiz başvuruyorsanız veya partneriniz bu başvuruya dahil değilse gerekmez.",
        "zh-Hans": "如您单独申请或伴侣未包含在本次申请中，则无需提供。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "dependant_under18_documents",
      category: "Identity",
      name: { en: "Dependent child documents (under 18)", tr: "Bağımlı çocuk belgeleri (18 yaş altı)", "zh-Hans": "受抚养子女文件（18岁以下）" },
      description: {
        en: "Birth certificate or family/household register, adoption papers if applicable, for each dependent child under 18 included in the application",
        tr: "Başvuruya dahil edilen 18 yaş altındaki her bağımlı çocuk için doğum belgesi veya aile/hane kayıt defteri, varsa evlat edinme belgeleri",
        "zh-Hans": "为申请中包含的每位18岁以下受抚养子女提供出生证明或户口簿，如适用还需提供领养文件",
      },
      required: false,
      expiryTracking: false,
      relevantWhen: { dependantsUnder18: true },
      tips: {
        en: "Not applicable if you have no dependent children under 18 included in this application.",
        tr: "Bu başvuruya dahil 18 yaş altı bağımlı çocuğunuz yoksa gerekmez.",
        "zh-Hans": "如本次申请不包含18岁以下受抚养子女，则无需提供。",
      },
      apostilleRequired: true,
      naatiRequired: true,
    },
    {
      id: "dependant_under18_consent",
      category: "Identity",
      name: { en: "Parental consent for dependent children (under 18)", tr: "18 yaş altı bağımlı çocuklar için veli izni", "zh-Hans": "18岁以下受抚养子女的监护人同意书" },
      description: {
        en: "Form 1229 or a statutory declaration/court order showing consent from anyone else with parental responsibility, for each dependent child under 18",
        tr: "18 yaş altındaki her bağımlı çocuk için Form 1229 veya velayet hakkı olan diğer kişilerden izni gösteren yeminli beyan/mahkeme kararı",
        "zh-Hans": "为每位18岁以下受抚养子女提供Form 1229，或显示其他监护人同意的法定声明/法院令" ,
      },
      required: false,
      expiryTracking: false,
      relevantWhen: { dependantsUnder18: true },
      tips: {
        en: "Not applicable if you have no dependent children under 18 included in this application.",
        tr: "Bu başvuruya dahil 18 yaş altı bağımlı çocuğunuz yoksa gerekmez.",
        "zh-Hans": "如本次申请不包含18岁以下受抚养子女，则无需提供。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "dependant_over18_documents",
      category: "Identity",
      name: { en: "Dependent child documents (18 or over)", tr: "Bağımlı çocuk belgeleri (18 yaş ve üstü)", "zh-Hans": "受抚养子女文件（18岁及以上）" },
      description: {
        en: "Form 47A and evidence of financial and other dependency (and a medical report if the dependant is 23 or over), for each dependent child aged 18+ included in the application",
        tr: "Başvuruya dahil 18 yaş ve üstü her bağımlı çocuk için Form 47A ve mali/diğer bağımlılık kanıtı (bağımlı 23 yaş veya üstündeyse tıbbi rapor)",
        "zh-Hans": "为申请中包含的每位18岁及以上受抚养子女提供Form 47A及经济等方面的抚养关系证明（若受抚养人23岁及以上还需提供体检报告）",
      },
      required: false,
      expiryTracking: false,
      relevantWhen: { dependantsOver18: true },
      tips: {
        en: "Not applicable if you have no dependent children aged 18 or over included in this application.",
        tr: "Bu başvuruya dahil 18 yaş veya üstü bağımlı çocuğunuz yoksa gerekmez.",
        "zh-Hans": "如本次申请不包含18岁及以上受抚养子女，则无需提供。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
  ],
  "190": [
    {
      id: "passport",
      category: "Identity",
      name: { en: "Valid passport", tr: "Geçerli pasaport", "zh-Hans": "有效护照" },
      description: {
        en: "Biometric page and any visa pages",
        tr: "Biyometrik sayfa ve vize sayfaları",
        "zh-Hans": "个人信息页和所有签证页",
      },
      required: true,
      expiryTracking: true,
      expiryMonths: 120,
      warningMonths: 6,
      tips: {
        en: "Keep a clean scanned copy of the bio page and all stamped pages.",
        tr: "Pasaport biyometrik sayfanızın ve damgalı sayfaların net kopyasını saklayın.",
        "zh-Hans": "保存护照信息页和盖章页的清晰扫描件。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "skills_assessment",
      category: "Skills",
      name: { en: "Positive skills assessment", tr: "Olumlu beceri değerlendirmesi", "zh-Hans": "正面技能评估" },
      description: {
        en: "Outcome letter from the correct assessing authority",
        tr: "Doğru değerlendirme kurumundan sonuç mektubu",
        "zh-Hans": "来自正确评估机构的结果信",
      },
      required: true,
      expiryTracking: true,
      expiryMonths: 36,
      warningMonths: 6,
      tips: {
        en: "The assessment must match your nominated ANZSCO occupation.",
        tr: "Değerlendirme, aday gösterdiğiniz ANZSCO mesleğiyle eşleşmelidir.",
        "zh-Hans": "评估必须与你提名的ANZSCO职业一致。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "employment_ref",
      category: "Skills",
      name: { en: "Employer references", tr: "İşveren referansları", "zh-Hans": "雇主推荐信" },
      description: {
        en: "Duty, date and hours evidence from past employers",
        tr: "Önceki işverenlerden görev, tarih ve saat kanıtı",
        "zh-Hans": "证明职责、日期和工作时长的文件",
      },
      required: true,
      expiryTracking: false,
      tips: {
        en: "References should match the duties used in your points claim.",
        tr: "Referanslar, puan iddianızdaki görevlerle uyumlu olmalı.",
        "zh-Hans": "推荐信应与积分声明中的职责相一致。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "state_nomination",
      category: "Nomination",
      name: { en: "State nomination invitation", tr: "Eyalet adaylık onayı", "zh-Hans": "州提名批准" },
      description: {
        en: "Nomination approval from the relevant state or territory",
        tr: "İlgili eyalet veya bölgeden gelen adaylık mektubu",
        "zh-Hans": "来自相关州或领地的提名信",
      },
      required: true,
      expiryTracking: true,
      expiryMonths: 24,
      warningMonths: 3,
      tips: {
        en: "Update your EOI after the nomination is approved.",
        tr: "Adaylık onaylandıktan sonra EOI'nizi güncelleyin.",
        "zh-Hans": "提名获批后要更新EOI。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "english_test",
      category: "English",
      name: { en: "English test result", tr: "İngilizce test sonucu", "zh-Hans": "英语考试成绩" },
      description: {
        en: "IELTS, PTE, TOEFL or OET result report",
        tr: "IELTS, PTE, TOEFL veya OET sonuç raporu",
        "zh-Hans": "IELTS、PTE、TOEFL或OET成绩报告",
      },
      required: true,
      expiryTracking: true,
      expiryMonths: 36,
      warningMonths: 6,
      tips: {
        en: "Use the result you can prove at invitation and lodgement time.",
        tr: "Davet ve lodgement aşamasında kanıtlayabildiğiniz sonucu kullanın.",
        "zh-Hans": "使用你在邀请和递交时都能证明的成绩。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "police_check",
      category: "Health",
      name: { en: "Police clearances", tr: "Adli sicil kayıtları", "zh-Hans": "无犯罪记录证明" },
      description: {
        en: "Country clearances for all required jurisdictions",
        tr: "Gerekli tüm ülkelerden alınmış kayıtlar",
        "zh-Hans": "所有必需司法辖区的证明",
      },
      required: true,
      expiryTracking: true,
      expiryMonths: 12,
      warningMonths: 3,
      tips: {
        en: "Order these after invitation so they remain valid at lodgement.",
        tr: "Lodgement sırasında geçerli kalması için davetten sonra alın.",
        "zh-Hans": "最好在收到邀请后再办理，以确保递交时有效。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "residence_proof",
      category: "Nomination",
      name: { en: "State residency evidence", tr: "Eyalet ikamet kanıtı", "zh-Hans": "州居住证明" },
      description: {
        en: "Documents proving current residence or commitment to the state",
        tr: "Mevcut ikamet, kira veya iş kanıtı",
        "zh-Hans": "当前住址、租约或工作证明",
      },
      required: false,
      expiryTracking: false,
      tips: {
        en: "Some states want local address, lease or employment evidence.",
        tr: "Bazı eyaletler yerel adres veya iş kanıtı ister.",
        "zh-Hans": "有些州会要求本地地址或工作证明。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
  ],
  "491": [
    {
      id: "passport",
      category: "Identity",
      name: { en: "Valid passport", tr: "Geçerli pasaport", "zh-Hans": "有效护照" },
      description: {
        en: "Biometric page and any visa pages",
        tr: "Biyometrik sayfa ve vize sayfaları",
        "zh-Hans": "个人信息页和所有签证页",
      },
      required: true,
      expiryTracking: true,
      expiryMonths: 120,
      warningMonths: 6,
      tips: {
        en: "Keep a clean scanned copy of the bio page and all stamped pages.",
        tr: "Pasaport biyometrik sayfanızın ve damgalı sayfaların net kopyasını saklayın.",
        "zh-Hans": "保存护照信息页和盖章页的清晰扫描件。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "skills_assessment",
      category: "Skills",
      name: { en: "Positive skills assessment", tr: "Olumlu beceri değerlendirmesi", "zh-Hans": "正面技能评估" },
      description: {
        en: "Outcome letter from the correct assessing authority",
        tr: "Doğru değerlendirme kurumundan sonuç mektubu",
        "zh-Hans": "来自正确评估机构的结果信",
      },
      required: true,
      expiryTracking: true,
      expiryMonths: 36,
      warningMonths: 6,
      tips: {
        en: "The assessment must match your nominated ANZSCO occupation.",
        tr: "Değerlendirme, aday gösterdiğiniz ANZSCO mesleğiyle eşleşmelidir.",
        "zh-Hans": "评估必须与你提名的ANZSCO职业一致。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "employment_ref",
      category: "Skills",
      name: { en: "Employer references", tr: "İşveren referansları", "zh-Hans": "雇主推荐信" },
      description: {
        en: "Duty, date and hours evidence from past employers",
        tr: "Önceki işverenlerden görev, tarih ve saat kanıtı",
        "zh-Hans": "证明职责、日期和工作时长的文件",
      },
      required: true,
      expiryTracking: false,
      tips: {
        en: "References should match the duties used in your points claim.",
        tr: "Referanslar, puan iddianızdaki görevlerle uyumlu olmalı.",
        "zh-Hans": "推荐信应与积分声明中的职责相一致。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "regional_commitment",
      category: "Nomination",
      name: { en: "Regional commitment evidence", tr: "Bölgesel yaşam taahhüdü", "zh-Hans": "区域居住承诺" },
      description: {
        en: "Evidence you can live and work in regional Australia",
        tr: "Bölgesel Avustralya'da yaşayabileceğinizi gösteren kanıt",
        "zh-Hans": "证明你可以在澳洲偏远地区生活和工作的材料",
      },
      required: true,
      expiryTracking: false,
      tips: {
        en: "Provide a genuine plan for the regional area you will live in.",
        tr: "Yaşayacağınız bölge için gerçekçi plan sunun.",
        "zh-Hans": "为你打算居住的地区提供真实计划。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "english_test",
      category: "English",
      name: { en: "English test result", tr: "İngilizce test sonucu", "zh-Hans": "英语考试成绩" },
      description: {
        en: "IELTS, PTE, TOEFL or OET result report",
        tr: "IELTS, PTE, TOEFL veya OET sonuç raporu",
        "zh-Hans": "IELTS、PTE、TOEFL或OET成绩报告",
      },
      required: true,
      expiryTracking: true,
      expiryMonths: 36,
      warningMonths: 6,
      tips: {
        en: "Use the result you can prove at invitation and lodgement time.",
        tr: "Davet ve lodgement aşamasında kanıtlayabildiğiniz sonucu kullanın.",
        "zh-Hans": "使用你在邀请和递交时都能证明的成绩。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "police_check",
      category: "Health",
      name: { en: "Police clearances", tr: "Adli sicil kayıtları", "zh-Hans": "无犯罪记录证明" },
      description: {
        en: "Country clearances for all required jurisdictions",
        tr: "Gerekli tüm ülkelerden alınmış kayıtlar",
        "zh-Hans": "所有必需司法辖区的证明",
      },
      required: true,
      expiryTracking: true,
      expiryMonths: 12,
      warningMonths: 3,
      tips: {
        en: "Order these after invitation so they remain valid at lodgement.",
        tr: "Lodgement sırasında geçerli kalması için davetten sonra alın.",
        "zh-Hans": "最好在收到邀请后再办理，以确保递交时有效。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "regional_address",
      category: "Nomination",
      name: { en: "Regional address evidence", tr: "Bölgesel adres kanıtı", "zh-Hans": "区域地址证明" },
      description: {
        en: "Lease, utility bill or address plan for the regional area",
        tr: "Bölgesel alan için kira, fatura veya adres planı",
        "zh-Hans": "偏远地区的租约、水电单或地址计划",
      },
      required: false,
      expiryTracking: false,
      tips: {
        en: "Useful for state nomination and settlement planning.",
        tr: "Eyalet adaylığı ve yerleşim planlaması için faydalıdır.",
        "zh-Hans": "对州提名和安置规划都很有帮助。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
  ],
  "482": [
    {
      id: "passport",
      category: "Identity",
      name: { en: "Valid passport", tr: "Geçerli pasaport", "zh-Hans": "有效护照" },
      description: {
        en: "Biometric page and any visa pages",
        tr: "Biyometrik sayfa ve vize sayfaları",
        "zh-Hans": "个人信息页和所有签证页",
      },
      required: true,
      expiryTracking: true,
      expiryMonths: 120,
      warningMonths: 6,
      tips: {
        en: "Keep a clean scanned copy of the bio page and all stamped pages.",
        tr: "Pasaport biyometrik sayfanızın ve damgalı sayfaların net kopyasını saklayın.",
        "zh-Hans": "保存护照信息页和盖章页的清晰扫描件。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "employer_nomination",
      category: "Employer",
      name: { en: "Employer nomination approval", tr: "İşveren adaylık onayı", "zh-Hans": "雇主提名批准" },
      description: {
        en: "Approved nomination from the sponsoring employer",
        tr: "Sponsor işverenden onaylı nomination",
        "zh-Hans": "担保雇主批准的提名文件",
      },
      required: true,
      expiryTracking: false,
      tips: {
        en: "The sponsor must hold an approved standard business sponsorship where required.",
        tr: "Sponsor gerekli durumlarda onaylı iş sponsorluğu sahibi olmalıdır.",
        "zh-Hans": "如适用，担保人必须拥有有效的标准商业担保资格。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "employment_contract",
      category: "Employer",
      name: { en: "Employment contract", tr: "İş sözleşmesi", "zh-Hans": "雇佣合同" },
      description: {
        en: "Signed contract with salary and duties",
        tr: "Maaş ve görevleri içeren imzalı sözleşme",
        "zh-Hans": "包含工资和职责的签字合同",
      },
      required: true,
      expiryTracking: false,
      tips: {
        en: "Salary must meet the relevant threshold and the role must be genuine.",
        tr: "Maaş ilgili eşiği karşılamalı ve rol gerçek olmalıdır.",
        "zh-Hans": "工资必须达到相应门槛，职位也必须真实。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "skills_assessment_optional",
      category: "Skills",
      name: { en: "Skills assessment if required", tr: "Gerekirse beceri değerlendirmesi", "zh-Hans": "如需要则提供技能评估" },
      description: {
        en: "Some occupations need a formal assessment",
        tr: "Bazı meslekler için zorunlu olabilir",
        "zh-Hans": "某些职业需要正式评估",
      },
      required: false,
      expiryTracking: true,
      expiryMonths: 36,
      warningMonths: 6,
      tips: {
        en: "Check the occupation list before lodging.",
        tr: "Lodgement öncesi meslek listesini kontrol edin.",
        "zh-Hans": "递交前先查看职业清单。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "salary_evidence",
      category: "Finance",
      name: { en: "Salary evidence", tr: "Maaş kanıtı", "zh-Hans": "工资证明" },
      description: {
        en: "Offer letter or payslips showing market salary",
        tr: "Piyasa maaşını gösteren teklif mektubu veya bordro",
        "zh-Hans": "显示市场工资的 offer 或工资单",
      },
      required: true,
      expiryTracking: false,
      tips: {
        en: "Show that the package meets the current threshold.",
        tr: "Paketin güncel eşiği karşıladığını gösterin.",
        "zh-Hans": "证明套餐薪资达到最新门槛。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    // Previously missing from the interactive tool even though the PDF
    // report's document-checklists.ts already listed both -- the exact
    // wording below is copied from that file to unify the two.
    {
      id: "english_evidence",
      category: "English",
      name: { en: "English evidence", tr: "İngilizce kanıtı", "zh-Hans": "英语能力证明" },
      description: {
        en: "Evidence of functional or competent English ability",
        tr: "Fonksiyonel veya yeterli İngilizce yeterliliğinizi gösteren kanıt",
        "zh-Hans": "证明您具备功能性或合格英语能力的材料",
      },
      required: true,
      expiryTracking: true,
      expiryMonths: 36,
      warningMonths: 6,
      tips: {
        en: "Confirm the required English level for your nominated occupation with the sponsoring employer.",
        tr: "Sponsor işvereninizle aday gösterilen mesleğiniz için gereken İngilizce seviyesini teyit edin.",
        "zh-Hans": "请与担保雇主确认您提名职业所需的英语水平。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "health_insurance",
      category: "Health",
      name: { en: "Health insurance", tr: "Sağlık sigortası", "zh-Hans": "健康保险" },
      description: {
        en: "Adequate health insurance cover for the visa period",
        tr: "Vize süresi boyunca yeterli sağlık sigortası kapsamı",
        "zh-Hans": "涵盖签证期间的充分健康保险",
      },
      required: true,
      expiryTracking: true,
      expiryMonths: 12,
      warningMonths: 2,
      tips: {
        en: "Cover should span your intended stay and meet visa condition requirements.",
        tr: "Kapsam, planladığınız kalış süresini ve vize koşullarını karşılamalıdır.",
        "zh-Hans": "保险应覆盖您计划的停留期限，并满足签证条件要求。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "police_check",
      category: "Health",
      name: { en: "Police clearances", tr: "Adli sicil kayıtları", "zh-Hans": "无犯罪记录证明" },
      description: {
        en: "Country clearances for all required jurisdictions",
        tr: "Gerekli tüm ülkelerden alınmış kayıtlar",
        "zh-Hans": "所有必需司法辖区的证明",
      },
      required: true,
      expiryTracking: true,
      expiryMonths: 12,
      warningMonths: 3,
      tips: {
        en: "Order these after invitation so they remain valid at lodgement.",
        tr: "Lodgement sırasında geçerli kalması için davetten sonra alın.",
        "zh-Hans": "最好在收到邀请后再办理，以确保递交时有效。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
  ],
  "485": [
    {
      id: "passport",
      category: "Identity",
      name: { en: "Valid passport", tr: "Geçerli pasaport", "zh-Hans": "有效护照" },
      description: {
        en: "Biometric page and any visa pages",
        tr: "Biyometrik sayfa ve vize sayfaları",
        "zh-Hans": "个人信息页和所有签证页",
      },
      required: true,
      expiryTracking: true,
      expiryMonths: 120,
      warningMonths: 6,
      tips: {
        en: "Keep a clean scanned copy of the bio page and all stamped pages.",
        tr: "Pasaport biyometrik sayfanızın ve damgalı sayfaların net kopyasını saklayın.",
        "zh-Hans": "保存护照信息页和盖章页的清晰扫描件。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "degree",
      category: "Education",
      name: { en: "Australian degree or qualification", tr: "Avustralya diploması veya yeterliliği", "zh-Hans": "澳大利亚学位或资格" },
      description: {
        en: "Award letter and completion evidence",
        tr: "Ödül mektubu ve tamamlanma kanıtı",
        "zh-Hans": "奖项信和完成证明",
      },
      required: true,
      expiryTracking: false,
      tips: {
        en: "Use the qualification linked to your recent studies.",
        tr: "Son eğitiminizle bağlantılı yeterliliği kullanın.",
        "zh-Hans": "使用与你近期学习相关的资格。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "transcript",
      category: "Education",
      name: { en: "Official transcript", tr: "Resmi transkript", "zh-Hans": "正式成绩单" },
      description: {
        en: "Mailed or sealed transcript from the provider",
        tr: "Sağlayıcıdan mühürlü veya resmi transkript",
        "zh-Hans": "学校盖章或官方成绩单",
      },
      required: true,
      expiryTracking: false,
      tips: {
        en: "Ensure the transcript shows completion and course dates.",
        tr: "Transkript tamamlanma ve eğitim tarihlerini göstermeli.",
        "zh-Hans": "成绩单应显示完成情况和课程日期。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "coe",
      category: "Registration",
      name: { en: "Confirmation of Enrolment (CoE)", tr: "Kayıt Onay Belgesi (CoE)", "zh-Hans": "入学确认书 (CoE)" },
      description: {
        en: "Enrollment record for the completed course",
        tr: "Tamamlanan kurs için kayıt belgesi",
        "zh-Hans": "已完成课程的注册记录",
      },
      required: true,
      expiryTracking: false,
      tips: {
        en: "Keep your final CoE or completion confirmation if available.",
        tr: "Son CoE veya tamamlanma onayını saklayın.",
        "zh-Hans": "保留最终CoE或完成确认信。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "oshc",
      category: "Health",
      name: { en: "Health insurance", tr: "Sağlık sigortası", "zh-Hans": "健康保险" },
      description: {
        en: "OSHC or relevant student cover for the stay",
        tr: "OSHC veya uygun öğrenci kapsamı",
        "zh-Hans": "OSHC 或相应的学生保险",
      },
      required: true,
      expiryTracking: true,
      expiryMonths: 24,
      warningMonths: 3,
      tips: {
        en: "Coverage should span the full visa period.",
        tr: "Kapsam vize süresinin tamamını kapsamalıdır.",
        "zh-Hans": "保险应覆盖整个签证期限。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "english_test",
      category: "English",
      name: { en: "English test result", tr: "İngilizce test sonucu", "zh-Hans": "英语考试成绩" },
      description: {
        en: "IELTS, PTE, TOEFL or OET result report",
        tr: "IELTS, PTE, TOEFL veya OET sonuç raporu",
        "zh-Hans": "IELTS、PTE、TOEFL或OET成绩报告",
      },
      required: true,
      expiryTracking: true,
      expiryMonths: 36,
      warningMonths: 6,
      tips: {
        en: "Use the result you can prove at invitation and lodgement time.",
        tr: "Davet ve lodgement aşamasında kanıtlayabildiğiniz sonucu kullanın.",
        "zh-Hans": "使用你在邀请和递交时都能证明的成绩。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "police_check",
      category: "Health",
      name: { en: "Police clearances", tr: "Adli sicil kayıtları", "zh-Hans": "无犯罪记录证明" },
      description: {
        en: "Country clearances for all required jurisdictions",
        tr: "Gerekli tüm ülkelerden alınmış kayıtlar",
        "zh-Hans": "所有必需司法辖区的证明",
      },
      required: true,
      expiryTracking: true,
      expiryMonths: 12,
      warningMonths: 3,
      tips: {
        en: "Order these after invitation so they remain valid at lodgement.",
        tr: "Lodgement sırasında geçerli kalması için davetten sonra alın.",
        "zh-Hans": "最好在收到邀请后再办理，以确保递交时有效。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
  ],
  // 186 (Employer Nomination Scheme) has two streams with different
  // document requirements -- TRT and Direct Entry -- but the interactive
  // tool has no stream-selector UI. Shared items (identity, English,
  // employer nomination/contract, health & character) are `required:
  // true`; the 4 stream-specific items are `required: false` and their
  // name/description/tips explicitly state which stream they belong to,
  // the same pattern already used for 190/491's optional
  // residence/regional-address items above.
  "186": [
    {
      id: "passport",
      category: "Identity",
      name: { en: "Valid passport", tr: "Geçerli pasaport", "zh-Hans": "有效护照" },
      description: {
        en: "Biometric page and any visa pages",
        tr: "Biyometrik sayfa ve vize sayfaları",
        "zh-Hans": "个人信息页和所有签证页",
      },
      required: true,
      expiryTracking: true,
      expiryMonths: 120,
      warningMonths: 6,
      tips: {
        en: "Keep a clean scanned copy of the bio page and all stamped pages.",
        tr: "Pasaport biyometrik sayfanızın ve damgalı sayfaların net kopyasını saklayın.",
        "zh-Hans": "保存护照信息页和盖章页的清晰扫描件。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "english_evidence",
      category: "English",
      name: { en: "English evidence", tr: "İngilizce kanıtı", "zh-Hans": "英语能力证明" },
      description: {
        en: "Competent English test result or exemption evidence",
        tr: "Yeterli (Competent) İngilizce test sonucu veya muafiyet kanıtı",
        "zh-Hans": "合格（Competent）英语考试成绩或豁免证明",
      },
      required: true,
      expiryTracking: true,
      expiryMonths: 36,
      warningMonths: 6,
      tips: {
        en: "Passport-country or salary-based exemptions may apply -- confirm with your employer/agent before booking a test.",
        tr: "Pasaport ülkesi veya maaş bazlı muafiyetler geçerli olabilir — test rezervasyonu öncesi işvereninize/danışmanınıza danışın.",
        "zh-Hans": "护照国籍或薪资相关的豁免可能适用——预约考试前请与雇主/代理确认。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "employer_nomination",
      category: "Employer",
      name: { en: "Employer nomination approval", tr: "İşveren adaylık onayı", "zh-Hans": "雇主提名批准" },
      description: {
        en: "Approved ENS nomination from the sponsoring employer",
        tr: "Sponsor işverenden onaylı ENS nomination'ı",
        "zh-Hans": "担保雇主的已批准ENS提名",
      },
      required: true,
      expiryTracking: false,
      tips: {
        en: "The nominated occupation must be on the relevant eligible list and the position genuine.",
        tr: "Aday gösterilen meslek ilgili uygun meslek listesinde olmalı ve pozisyon gerçek olmalıdır.",
        "zh-Hans": "提名职业须在相关合格清单上，且该职位必须真实存在。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "employment_contract",
      category: "Finance",
      name: {
        en: "Employment contract & salary evidence",
        tr: "İş sözleşmesi ve maaş kanıtı",
        "zh-Hans": "雇佣合同与工资证明",
      },
      description: {
        en: "Signed contract showing duties, hours and salary meeting the Core Skills Income Threshold (CSIT)",
        tr: "Görev, saat ve Temel Beceri Gelir Eşiği'ni (CSIT) karşılayan maaşı gösteren imzalı sözleşme",
        "zh-Hans": "显示职责、工时及达到核心技能收入门槛（CSIT）薪资的签字合同",
      },
      required: true,
      expiryTracking: false,
      tips: {
        en: "Confirm the current CSIT figure with your employer/agent -- it is indexed periodically.",
        tr: "Güncel CSIT rakamını işvereninize/danışmanınıza danışarak teyit edin — periyodik olarak güncellenir.",
        "zh-Hans": "请与雇主/代理确认最新CSIT数额——该数额会定期调整。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "direct_entry_skills_assessment",
      category: "Skills",
      name: {
        en: "Direct Entry: positive skills assessment (Direct Entry stream only)",
        tr: "Direct Entry: olumlu beceri değerlendirmesi (sadece Direct Entry akışı)",
        "zh-Hans": "Direct Entry：正面技能评估（仅限Direct Entry通道）",
      },
      description: {
        en: "Outcome letter from the relevant assessing authority for the nominated occupation, unless exempt",
        tr: "Muaf değilseniz, aday gösterilen meslek için ilgili değerlendirme kurumundan sonuç mektubu",
        "zh-Hans": "如不符合豁免条件，需提供相关评估机构针对提名职业出具的结果信",
      },
      required: false,
      expiryTracking: true,
      expiryMonths: 36,
      warningMonths: 6,
      tips: {
        en: "An exemption may apply if you've worked 2 of the last 3 years with the nominating employer in the occupation on a subclass 444/461 visa -- confirm exemption eligibility before assuming it applies.",
        tr: "444/461 vizesiyle aynı işverende aynı meslekte son 3 yılın 2 yılında çalıştıysanız muafiyet uygulanabilir — muafiyetin geçerli olduğunu varsaymadan önce teyit edin.",
        "zh-Hans": "若您持444/461签证在提名职业上为该雇主工作了过去3年中的2年，可能符合豁免条件——在假设适用前请先确认豁免资格。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "direct_entry_age_evidence",
      category: "Identity",
      name: {
        en: "Direct Entry: age evidence / exemption documentation (Direct Entry stream only)",
        tr: "Direct Entry: yaş kanıtı / muafiyet belgeleri (sadece Direct Entry akışı)",
        "zh-Hans": "Direct Entry：年龄证明/豁免文件（仅限Direct Entry通道）",
      },
      description: {
        en: "Passport/birth certificate confirming age under 45, or supporting evidence for an age exemption (e.g. senior academic, high-income earner, eligible 444/461 visa holder)",
        tr: "45 yaşın altında olduğunuzu doğrulayan pasaport/doğum belgesi veya yaş muafiyeti için destekleyici kanıt (ör. kıdemli akademisyen, yüksek gelirli, uygun 444/461 vize sahibi)",
        "zh-Hans": "证明未满45周岁的护照/出生证明，或年龄豁免的支持材料（如高级学者、高收入者、符合条件的444/461签证持有人）",
      },
      required: false,
      expiryTracking: false,
      tips: {
        en: "Age exemptions are narrow and evidence-heavy -- confirm eligibility with a registered migration agent before relying on one.",
        tr: "Yaş muafiyetleri dar kapsamlı ve kanıt yoğunludur — bir muafiyete güvenmeden önce kayıtlı bir göç danışmanıyla uygunluğu teyit edin.",
        "zh-Hans": "年龄豁免适用范围窄且举证要求高——在依赖豁免前请与注册移民代理确认资格。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "trt_employment_evidence",
      category: "Stream",
      name: {
        en: "TRT: 2-of-3-years full-time work evidence (TRT stream only)",
        tr: "TRT: son 3 yılda 2 yıl tam zamanlı çalışma kanıtı (sadece TRT akışı)",
        "zh-Hans": "TRT：近3年内2年全职工作证明（仅限TRT通道）",
      },
      description: {
        en: "Payslips, PAYG summaries/group certificates and super contribution records showing at least 2 years full-time work with the nominating employer within the last 3 years",
        tr: "Sponsor işverenle son 3 yıl içinde en az 2 yıl tam zamanlı çalışıldığını gösteren bordrolar, PAYG özetleri/grup sertifikaları ve emeklilik (super) katkı kayıtları",
        "zh-Hans": "显示在过去3年内与担保雇主全职工作至少2年的工资单、PAYG汇总/团体证明及养老金（super）缴纳记录",
      },
      required: false,
      expiryTracking: false,
      tips: {
        en: "Only required if applying via the Temporary Residence Transition (TRT) stream -- not needed for Direct Entry.",
        tr: "Sadece Temporary Residence Transition (TRT) akışı için gereklidir — Direct Entry için gerekmez.",
        "zh-Hans": "仅在通过临时居民过渡（TRT）通道申请时需要——Direct Entry通道不需要。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "trt_prior_visa_evidence",
      category: "Stream",
      name: {
        en: "TRT: evidence of holding subclass 457/482 with the nominating employer (TRT stream only)",
        tr: "TRT: sponsor işveren altında 457/482 vizesi tutulduğuna dair kanıt (sadece TRT akışı)",
        "zh-Hans": "TRT：持有457/482签证并受雇于提名雇主的证明（仅限TRT通道）",
      },
      description: {
        en: "Visa grant notice(s) showing the primary 457 or 482 visa held while working for the current nominating employer",
        tr: "Mevcut sponsor işveren altında çalışırken tutulan ana 457 veya 482 vizesini gösteren vize onay bildirimi/bildirimleri",
        "zh-Hans": "显示在为当前提名雇主工作期间持有主申请人457或482签证的签证批准通知",
      },
      required: false,
      expiryTracking: false,
      tips: {
        en: "The nominating employer must be the same business that sponsored the 457/482 visa.",
        tr: "Aday gösteren işveren, 457/482 vizesini sponsor eden işletmeyle aynı olmalıdır.",
        "zh-Hans": "提名雇主必须与担保457/482签证的企业为同一雇主。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "labour_agreement_evidence",
      category: "Stream",
      name: {
        en: "Labour Agreement: approved agreement evidence (Labour Agreement stream only)",
        tr: "Labour Agreement: onaylı anlaşma kanıtı (sadece Labour Agreement akışı)",
        "zh-Hans": "Labour Agreement：已批准的协议证据（仅限Labour Agreement通道）",
      },
      description: {
        en: "Copy of the approved labour agreement or DAMA head agreement, and evidence that the nominated occupation is covered under the agreement",
        tr: "Onaylı labour agreement veya DAMA ana anlaşması kopyası ve aday gösterilen mesleğin anlaşma kapsamında olduğuna dair kanıt",
        "zh-Hans": "已批准的劳工协议或DAMA总协议副本，以及提名职业在协议覆盖范围内的证据",
      },
      required: false,
      expiryTracking: false,
      tips: {
        en: "The employer must hold an approved labour agreement and the nominated occupation must be listed as eligible under it.",
        tr: "İşverenin onaylı bir labour agreement'ı olmalı ve aday gösterilen meslek bu kapsamda uygun listede olmalıdır.",
        "zh-Hans": "雇主须持有已批准的劳工协议，且提名职业须在该协议的合格清单上。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
    {
      id: "police_check",
      category: "Health",
      name: { en: "Police clearances", tr: "Adli sicil kayıtları", "zh-Hans": "无犯罪记录证明" },
      description: {
        en: "Country clearances for all required jurisdictions",
        tr: "Gerekli tüm ülkelerden alınmış kayıtlar",
        "zh-Hans": "所有必需司法辖区的证明",
      },
      required: true,
      expiryTracking: true,
      expiryMonths: 12,
      warningMonths: 3,
      tips: {
        en: "Order these after invitation so they remain valid at lodgement.",
        tr: "Lodgement sırasında geçerli kalması için davetten sonra alın.",
        "zh-Hans": "最好在收到邀请后再办理，以确保递交时有效。",
      },
      apostilleRequired: false,
      naatiRequired: false,
    },
  ],
};

export function getCanonicalDocName(
  subclass: DocInventorySubclass,
  id: string,
  locale: Locale
): string {
  const item = DOCUMENT_INVENTORY[subclass].find((doc) => doc.id === id);
  if (!item) {
    throw new Error(`document-inventory: unknown doc id "${id}" for subclass ${subclass}`);
  }
  return item.name[locale];
}
