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
