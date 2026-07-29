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
 * Scope note: only the 5 subclasses the interactive tool currently
 * supports (189/190/491/482/485) are modeled here. 186 has no entry
 * anywhere in the app yet (tracked separately). 500/820/801 have entries
 * in document-checklists.ts's PDF-only literal strings but are not yet
 * part of this canonical inventory or the interactive tool.
 */

export type DocInventorySubclass = "189" | "190" | "491" | "482" | "485";

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
