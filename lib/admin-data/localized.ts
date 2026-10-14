import type { DataLocale, LocalizedField, TranslationEntry } from "./types";

/** The text in the reader's language: English always; a translation only when it has been reviewed (D5) -- otherwise English. */
export function localizedText(field: LocalizedField | null | undefined, locale: DataLocale): string {
  if (!field) return "";
  if (locale === "en") return field.en;
  const t = field[locale];
  return t && t.reviewed && t.text.trim() ? t.text : field.en;
}

export const field = (en: string): LocalizedField => ({ en });

/** A translation carried over from the code (what customers already saw before the admin panel): reviewed, with that provenance. */
export function carriedOver(text: string): TranslationEntry {
  return { text, reviewed: true, origin: "carried_over" };
}

/** True when a language has text that is not reviewed yet (the admin has something to read). */
export function hasUnreviewed(field: LocalizedField | null | undefined): boolean {
  return (["tr", "zh-Hans"] as const).some((l) => Boolean(field?.[l] && !field[l]!.reviewed && field[l]!.text.trim()));
}

export function setTranslation(f: LocalizedField, locale: Exclude<DataLocale, "en">, entry: TranslationEntry | null): LocalizedField {
  const next: LocalizedField = { ...f };
  if (entry === null) delete next[locale];
  else next[locale] = entry;
  return next;
}
