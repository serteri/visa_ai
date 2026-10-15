import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

import { languageEnglishName } from "./locales";
import type { TranslationEntry } from "./types";
import { compareValues, describeDifference } from "./value-normalise";

/**
 * The "Draft translation" button (docs/admin-data-design.md A.6). The model drafts; the draft is stored as `reviewed: false` and is never shown to
 * customers (D5) until the admin has read it and marked it reviewed. The model is only asked to translate; the numbers it returns are checked
 * against the source, so a draft that changes a figure, a date or a subclass number is refused instead of shown.
 */

export type Translator = (text: string, to: string) => Promise<string>;

export function translationModelId(env: Record<string, string | undefined> = process.env): string {
  return env.ADMIN_TRANSLATION_MODEL?.trim() || "gpt-4.1";
}

export const openAiTranslator: Translator = async (text, to) => {
  const { text: out } = await generateText({
    model: openai(translationModelId()),
    system: `You translate short passages of published Australian migration-program information into ${languageEnglishName(to)}. Keep every number, date, fee, subclass number, program name, place name and quoted label exactly as written. Do not add, remove, explain or soften anything. Output only the translation.`,
    prompt: text,
    temperature: 0,
  });
  return out.trim();
};

/**
 * Whether the translation carries the numbers, amounts and dates of the source, compared as normalised values (lib/admin-data/value-normalise.ts):
 * "27 July 2026" and "2026年7月27日" are the same date, "AUD 325" and "325澳元" the same amount. `difference` says exactly which value differs.
 */
export function checkValuesPreserved(source: string, translation: string, language = "en"): { ok: true } | { ok: false; difference: string } {
  const c = compareValues(source, translation, language);
  return c.same ? { ok: true } : { ok: false, difference: describeDifference(c) };
}

/** True when the translation carries exactly the values of the source. */
export function numbersPreserved(source: string, translation: string, language = "en"): boolean {
  return checkValuesPreserved(source, translation, language).ok;
}

export type DraftResult = { ok: true; entry: TranslationEntry } | { ok: false; error: string };

export async function draftTranslation(text: string, to: string, translate: Translator = openAiTranslator, at: Date = new Date()): Promise<DraftResult> {
  const source = text.trim();
  if (!source) return { ok: false, error: "There is no English text to translate." };
  if (source.length > 4000) return { ok: false, error: "The text is too long to draft in one go (4000 characters)." };
  let out: string;
  try {
    out = await translate(source, to);
  } catch (e) {
    return { ok: false, error: `The translation service failed: ${e instanceof Error ? e.message.slice(0, 160) : "unknown error"}` };
  }
  if (!out.trim()) return { ok: false, error: "The translation service returned nothing." };
  const check = checkValuesPreserved(source, out, to);
  if (!check.ok) return { ok: false, error: `The draft changed a number, date or fee, so it was refused (${check.difference}). Translate it by hand or try again.` };
  return { ok: true, entry: { text: out.trim(), reviewed: false, origin: "machine_draft", draftedAt: at.toISOString() } };
}
