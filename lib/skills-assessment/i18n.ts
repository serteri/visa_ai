/**
 * Multilanguage support for Skills Assessment Authority data.
 *
 * Provides:
 * 1. LocalizedString type — either a plain string (EN-only) or a localized object
 * 2. resolveLocalized() function — resolves the correct translation at render time
 * 3. Translation helpers for the Financial Roadmap and PDF generators
 */

export type Locale = "en" | "tr" | "zh-Hans";

/**
 * A string that may be localized. Accepts either:
 * - A plain string (backward-compatible, assumed to be English)
 * - A localized object with { en, tr, zh } keys
 */
export type LocalizedString =
  | string
  | { en: string; tr: string; "zh-Hans": string };

/**
 * Resolves a LocalizedString to a plain string for the given locale.
 *
 * If the value is a plain string, it's returned as-is (assumed EN).
 * If it's a localized object, the matching locale key is returned.
 * Falls back to "en" if the requested locale is not available.
 */
export function resolveLocalized(
  value: LocalizedString | undefined | null,
  locale: Locale = "en",
): string {
  if (!value) return "";
  if (typeof value === "string") return value;

  // value is { en: ..., tr: ..., "zh-Hans": ... }
  if (locale === "tr" && value.tr) return value.tr;
  if (locale === "zh-Hans" && value["zh-Hans"]) return value["zh-Hans"];
  return value.en;
}

/**
 * Resolves an array of LocalizedString items to plain strings.
 */
export function resolveLocalizedArray(
  items: LocalizedString[] | undefined | null,
  locale: Locale = "en",
): string[] {
  if (!items) return [];
  return items.map((item) => resolveLocalized(item, locale));
}

/**
 * Helper to create a localized object from EN text.
 * Use this when adding new content to authority files.
 */
export function loc(en: string, tr?: string, zh?: string): LocalizedString {
  if (tr && zh) return { en, tr, "zh-Hans": zh };
  return en; // plain string if translations not provided
}
