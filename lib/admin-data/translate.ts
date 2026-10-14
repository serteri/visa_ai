import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

import type { TranslationEntry } from "./types";

/**
 * The "Draft translation" button (docs/admin-data-design.md A.6). The model drafts; the draft is stored as `reviewed: false` and is never shown to
 * customers (D5) until the admin has read it and marked it reviewed. The model is only asked to translate; the numbers it returns are checked
 * against the source, so a draft that changes a figure, a date or a subclass number is refused instead of shown.
 */

export type Translator = (text: string, to: "tr" | "zh-Hans") => Promise<string>;

const LANGUAGE = { tr: "Turkish", "zh-Hans": "Simplified Chinese" } as const;

export function translationModelId(env: Record<string, string | undefined> = process.env): string {
  return env.ADMIN_TRANSLATION_MODEL?.trim() || "gpt-4.1";
}

export const openAiTranslator: Translator = async (text, to) => {
  const { text: out } = await generateText({
    model: openai(translationModelId()),
    system: `You translate short passages of published Australian migration-program information into ${LANGUAGE[to]}. Keep every number, date, fee, subclass number, program name, place name and quoted label exactly as written. Do not add, remove, explain or soften anything. Output only the translation.`,
    prompt: text,
    temperature: 0,
  });
  return out.trim();
};

/** Digits as figures: a thousands separator (2,050 / 2.050) is dropped and a decimal comma (425,70) is read as a point, so a Turkish number format is not a "change". */
const numbersOf = (t: string): string[] =>
  (t.replace(/(\d)[.,](?=\d{3}(?!\d))/g, "$1").replace(/(\d),(\d{1,2})(?!\d)/g, "$1.$2").match(/\d+(?:\.\d+)?/g) ?? []).sort();

/** True when the translation carries exactly the numbers of the source (a figure changed or dropped is refused). */
export function numbersPreserved(source: string, translation: string): boolean {
  const a = numbersOf(source);
  const b = numbersOf(translation);
  return a.length === b.length && a.every((n, i) => n === b[i]);
}

export type DraftResult = { ok: true; entry: TranslationEntry } | { ok: false; error: string };

export async function draftTranslation(text: string, to: "tr" | "zh-Hans", translate: Translator = openAiTranslator, at: Date = new Date()): Promise<DraftResult> {
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
  if (!numbersPreserved(source, out)) return { ok: false, error: "The draft changed a number, date or fee, so it was refused. Translate it by hand or try again." };
  return { ok: true, entry: { text: out.trim(), reviewed: false, origin: "machine_draft", draftedAt: at.toISOString() } };
}
