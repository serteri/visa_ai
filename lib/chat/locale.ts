import type { Locale } from "@/lib/readiness/types";

/** The language of the answer, when the client did not say: Chinese characters, then Turkish letters/words, else English. */
export function detectAnswerLocale(text: string): Locale {
  if (/[一-鿿]/.test(text)) return "zh-Hans";
  if (/[çğıöşüÇĞİÖŞÜ]|\b(vize|vizesi|için|olarak|gerekir|başvuru|nedir|nasıl|neden|mı|mi|mu|mü|ve|bir|ama|puan|puanım|yılında|yaşında)\b/i.test(text)) return "tr";
  return "en";
}

const ENGLISH_WORDS = /\b(?:the|what|how|can|could|should|would|do|does|is|are|am|my|i|for|to|of|and|with|visa|options?|which|when|where|why|need|get|apply)\b/gi;
/** At least two distinct English function words: a message in English, not just a number or a subclass. */
export function looksEnglish(text: string): boolean {
  return new Set(Array.from(text.matchAll(ENGLISH_WORDS), (m) => m[0].toLowerCase())).size >= 2;
}

