import type { Locale } from "./config";

const translations: Record<Locale, Record<string, string>> = {} as Record<
  Locale,
  Record<string, string>
>;

async function loadTranslation(locale: Locale): Promise<Record<string, string>> {
  if (translations[locale]) {
    return translations[locale];
  }

  try {
    const module = await import(`../../public/locales/${locale}.json`);
    translations[locale] = module.default || module;
    return translations[locale];
  } catch (error) {
    console.error(`Failed to load translations for locale: ${locale}`, error);
    return {};
  }
}

export async function getTranslations(locale: Locale): Promise<Record<string, string>> {
  return loadTranslation(locale);
}

export function t(
  translations: Record<string, string>,
  key: string,
  defaultValue?: string
): string {
  return translations[key] || defaultValue || key;
}
