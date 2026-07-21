export const activeCountries = ["AU", "CA"] as const;

export type SupportedCountry = (typeof activeCountries)[number];

export const defaultCountry: SupportedCountry = "AU";

export function isSupportedCountry(value: unknown): value is SupportedCountry {
  return activeCountries.includes(value as SupportedCountry);
}

export const countryLabels: Record<SupportedCountry, { en: string; tr: string; "zh-Hans": string }> = {
  AU: { en: "Australia", tr: "Avustralya", "zh-Hans": "澳大利亚" },
  CA: { en: "Canada", tr: "Kanada", "zh-Hans": "加拿大" },
};

// Static, per-country regulatory-compliance trust badge. Not tied to any
// "selected country" UI state — rendered as one badge per activeCountries
// entry so adding a country here automatically adds its badge everywhere
// this is mapped over.
export const countryComplianceBadge: Record<SupportedCountry, { en: string; tr: string; "zh-Hans": string }> = {
  AU: {
    en: "MARA Compliance Checked",
    tr: "MARA Uyum Kontrolünden Geçmiştir",
    "zh-Hans": "已通过 MARA 合规审查",
  },
  CA: {
    en: "RCIC Compliance Checked",
    tr: "RCIC Uyum Kontrolünden Geçmiştir",
    "zh-Hans": "已通过 RCIC 合规审查",
  },
};

export type VisaPathwayOption = {
  value: string;
  label: { en: string; tr: string; "zh-Hans": string };
  /**
   * Optional optgroup label this option nests under (e.g. "Express Entry"
   * for CEC/FSW/FSTP). Options without a group render as flat top-level
   * <option> elements, same as today's AU list.
   */
  group?: { en: string; tr: string; "zh-Hans": string };
};

// Per-country list of visa pathway options for the full-check
// "which pathway should this report focus on" select. Keyed off
// activeCountries the same way countryLabels/countryComplianceBadge are,
// so the form just renders countryVisaPathways[selectedCountry] instead
// of hardcoding a second dropdown for each country.
//
// CA option `value`s are slugs that match the corresponding visa-details.json
// entry / detail page route (e.g. "canada-family-sponsorship",
// "atlantic-immigration-program") rather than bare codes, so the readiness
// engine and any future detail-page link can resolve the selection directly.
export const countryVisaPathways: Record<SupportedCountry, VisaPathwayOption[]> = {
  AU: [
    { value: "500", label: { en: "Student visa 500", tr: "Öğrenci Vizesi 500", "zh-Hans": "500 学生签证" } },
    { value: "485", label: { en: "Temporary Graduate visa 485", tr: "Geçici Mezun Vizesi 485", "zh-Hans": "485 临时毕业生签证" } },
    { value: "482", label: { en: "Skills in Demand visa 482", tr: "Skills in Demand Vizesi 482", "zh-Hans": "482 紧缺技能签证" } },
    { value: "189", label: { en: "Skilled Independent visa 189", tr: "Skilled Independent Vizesi 189", "zh-Hans": "189 独立技术移民" } },
    { value: "190", label: { en: "Skilled Nominated visa 190", tr: "Skilled Nominated Vizesi 190", "zh-Hans": "190 州担保技术移民" } },
    { value: "491", label: { en: "Skilled Work Regional visa 491", tr: "Skilled Work Regional Vizesi 491", "zh-Hans": "491 偶远地区技术签证" } },
    { value: "820_801", label: { en: "Partner visa 820/801", tr: "Partner Vizesi 820/801", "zh-Hans": "820/801 境内配偶签证" } },
    { value: "186", label: { en: "Employer Nomination Scheme visa 186", tr: "İşveren Aday Gösterme Programı Vizesi 186", "zh-Hans": "186 雇主提名签证" } },
  ],
  CA: [
    {
      value: "canada-express-entry-cec",
      label: {
        en: "Canadian Experience Class (CEC) - For skilled workers with eligible Canadian work experience",
        tr: "Canadian Experience Class (CEC) - Uygun Kanada iş deneyimi olan vasıflı işçiler için",
        "zh-Hans": "加拿大经验类 (CEC) - 适用于拥有合格加拿大工作经验的技术工人",
      },
      group: { en: "Express Entry", tr: "Express Entry", "zh-Hans": "快速通道 (Express Entry)" },
    },
    {
      value: "canada-express-entry-fsw",
      label: {
        en: "Federal Skilled Worker (FSW) - For skilled workers with eligible foreign or Canadian work experience",
        tr: "Federal Skilled Worker (FSW) - Uygun yurt dışı veya Kanada iş deneyimi olan vasıflı işçiler için",
        "zh-Hans": "联邦技术工人类 (FSW) - 适用于拥有合格境外或加拿大工作经验的技术工人",
      },
      group: { en: "Express Entry", tr: "Express Entry", "zh-Hans": "快速通道 (Express Entry)" },
    },
    {
      value: "canada-express-entry-fstp",
      label: {
        en: "Federal Skilled Trades (FSTP) - For skilled workers who are qualified in a skilled trade",
        tr: "Federal Skilled Trades (FSTP) - Vasıflı bir meslekte yeterliliği olan işçiler için",
        "zh-Hans": "联邦技工类 (FSTP) - 适用于具备技术工种资质的技术工人",
      },
      group: { en: "Express Entry", tr: "Express Entry", "zh-Hans": "快速通道 (Express Entry)" },
    },
    {
      value: "canada-pnp-non-express-entry",
      label: {
        en: "Provincial Nominee Program (Non-Express Entry Process)",
        tr: "Provincial Nominee Program (Express Entry Dışı Süreç)",
        "zh-Hans": "省提名计划（非快速通道流程）",
      },
      group: { en: "Provincial Nominee Program (PNP)", tr: "Provincial Nominee Program (PNP)", "zh-Hans": "省提名计划 (PNP)" },
    },
    {
      value: "atlantic-immigration-program",
      label: {
        en: "Atlantic Immigration Program (AIP) - Skilled Workers & International Graduates",
        tr: "Atlantic Immigration Program (AIP) - Vasıflı İşçiler ve Uluslararası Mezunlar",
        "zh-Hans": "大西洋移民计划 (AIP) - 技术工人与国际毕业生",
      },
      group: { en: "Atlantic Immigration Program (AIP)", tr: "Atlantic Immigration Program (AIP)", "zh-Hans": "大西洋移民计划 (AIP)" },
    },
    {
      value: "canada-family-sponsorship",
      label: {
        en: "Sponsor your spouse, partner or child to become a permanent resident",
        tr: "Eşinizi, partnerinizi veya çocuğunuzu kalıcı oturum için sponsor olun",
        "zh-Hans": "为您的配偶、伴侣或子女申请担保以成为永久居民",
      },
      group: { en: "Family Sponsorship", tr: "Family Sponsorship", "zh-Hans": "家庭担保" },
    },
  ],
};
