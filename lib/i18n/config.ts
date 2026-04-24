export const activeLocales = ["en", "tr"] as const;
export const comingSoonLocales = ["hi", "pa", "zh", "ar", "es", "vi", "ne"] as const;

export type Locale = (typeof activeLocales)[number];

export const defaultLocale: Locale = "en";

export function isValidLocale(locale: unknown): locale is Locale {
  return activeLocales.includes(locale as Locale);
}

export const localeLabels: Record<Locale, string> = {
  en: "English",
  tr: "Türkçe",
};
