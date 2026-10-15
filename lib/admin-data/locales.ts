import { activeLocales } from "@/lib/i18n/config";
import { getLanguage } from "@/lib/languages";

/**
 * The languages the admin data is translated into: the site's supported locales (lib/i18n/config.ts activeLocales) without English, which is the
 * source text. The admin translation fields, the "Draft translation" action, the validation, the audit and the translation check all read this list,
 * so a language added to the site appears in the admin with no change here (docs/adding-a-language.md).
 */
export const ADMIN_TRANSLATION_LOCALES: readonly string[] = activeLocales.filter((l) => l !== "en");

export const isAdminTranslationLocale = (code: string): boolean => ADMIN_TRANSLATION_LOCALES.includes(code);

/** The language's name in English, for the translation prompt. */
export const languageEnglishName = (code: string): string => getLanguage(code)?.label ?? code;

/** The language's name in itself, for the admin labels. */
export const languageNativeName = (code: string): string => getLanguage(code)?.localLabel ?? code;
