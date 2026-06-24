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
