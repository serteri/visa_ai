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
};

// Per-country list of visa pathway options for the full-check
// "which pathway should this report focus on" select. Keyed off
// activeCountries the same way countryLabels/countryComplianceBadge are,
// so the form just renders countryVisaPathways[selectedCountry] instead
// of hardcoding a second dropdown for each country.
export const countryVisaPathways: Record<SupportedCountry, VisaPathwayOption[]> = {
  AU: [
    { value: "500", label: { en: "Student visa 500", tr: "Öğrenci Vizesi 500", "zh-Hans": "500 学生签证" } },
    { value: "485", label: { en: "Temporary Graduate visa 485", tr: "Geçici Mezun Vizesi 485", "zh-Hans": "485 临时毕业生签证" } },
    { value: "482", label: { en: "Skills in Demand visa 482", tr: "Skills in Demand Vizesi 482", "zh-Hans": "482 紧缺技能签证" } },
    { value: "189", label: { en: "Skilled Independent visa 189", tr: "Skilled Independent Vizesi 189", "zh-Hans": "189 独立技术移民" } },
    { value: "190", label: { en: "Skilled Nominated visa 190", tr: "Skilled Nominated Vizesi 190", "zh-Hans": "190 州担保技术移民" } },
    { value: "491", label: { en: "Skilled Work Regional visa 491", tr: "Skilled Work Regional Vizesi 491", "zh-Hans": "491 偶远地区技术签证" } },
    { value: "820_801", label: { en: "Partner visa 820/801", tr: "Partner Vizesi 820/801", "zh-Hans": "820/801 境内配偶签证" } },
  ],
  CA: [
    { value: "CEC", label: { en: "Canadian Experience Class (CEC)", tr: "Canadian Experience Class (CEC)", "zh-Hans": "加拿大经验类 (CEC)" } },
    { value: "FSW", label: { en: "Federal Skilled Worker (FSW)", tr: "Federal Skilled Worker (FSW)", "zh-Hans": "联邦技术工人类 (FSW)" } },
    { value: "FSTP", label: { en: "Federal Skilled Trades (FSTP)", tr: "Federal Skilled Trades (FSTP)", "zh-Hans": "联邦技工类 (FSTP)" } },
    { value: "PNP", label: { en: "Provincial Nominee Program (PNP)", tr: "Provincial Nominee Program (PNP)", "zh-Hans": "省提名计划 (PNP)" } },
  ],
};
