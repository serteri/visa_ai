/**
 * Numbers, amounts and dates of a text, normalised so a translation can be compared with its source whatever the language writes them like
 * ("27 July 2026" = "2026年7月27日" = "27 Temmuz 2026"; "AUD 325" = "325澳元"; "2,050" = "2.050" = "2050"; "1万" = "10,000").
 *
 * The translation check refuses a draft only when the normalised values differ, and says which ones. A language with no entry in DATE_LANGUAGES
 * is checked on numbers and amounts only (its dates are read as numbers), which is stricter on spelling but never lets a changed figure through.
 */

export type ValueKind = "fy" | "date" | "month" | "monthday" | "amount" | "number";
export type Value = { kind: ValueKind; value: string; currency?: string; raw: string };

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};
const MONTHS_TR: Record<string, number> = {
  ocak: 1, şubat: 2, subat: 2, mart: 3, nisan: 4, mayıs: 5, mayis: 5, haziran: 6, temmuz: 7, ağustos: 8, agustos: 8, eylül: 9, eylul: 9, ekim: 10, kasım: 11, kasim: 11, aralık: 12, aralik: 12,
};

/** Per-language month names. The Chinese "N月" form is handled separately. A new language adds its month names here to get date-aware checking. */
export const DATE_LANGUAGES: Record<string, Record<string, number>> = { en: MONTHS, tr: MONTHS_TR, "zh-Hans": {} };

const pad = (n: number | string) => String(n).padStart(2, "0");
const CURRENCY_WORDS: Array<[RegExp, string]> = [
  [/^(?:AUD|A\$|AU\$|澳元|澳币|澳大利亚元|澳大利亚币)$/i, "AUD"],
  [/^(?:USD|US\$|美元)$/i, "USD"],
  [/^(?:CAD|CA\$|C\$|加元)$/i, "CAD"],
  [/^(?:NZD|NZ\$|新西兰元)$/i, "NZD"],
  [/^(?:TRY|TL|₺)$/i, "TRY"],
  [/^(?:EUR|€|欧元)$/i, "EUR"],
  [/^(?:GBP|£|英镑)$/i, "GBP"],
  [/^\$$/, "AUD"],
];
const currencyOf = (s: string): string | undefined => CURRENCY_WORDS.find(([re]) => re.test(s.trim()))?.[1];

/** "2,050" "2.050" "2050" "425,70" "425.70" -> "2050" "425.7"; a Chinese 万 multiplies by 10000. */
export function parseNumber(raw: string, multiplier = 1): string {
  let t = raw.replace(/\s/g, "");
  t = t.replace(/(\d)[.,](?=\d{3}(?!\d))/g, "$1");
  t = t.replace(/(\d),(\d{1,2})(?!\d)/g, "$1.$2");
  const n = Number(t) * multiplier;
  return Number.isFinite(n) ? String(Math.round(n * 1e6) / 1e6) : raw;
}

const NUM = String.raw`\d{1,3}(?:[.,\s]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d+)?`;
const CUR = String.raw`(?:AUD|A\$|AU\$|USD|US\$|CAD|CA\$|C\$|NZD|NZ\$|EUR|GBP|TRY|TL|\$|€|£|₺)`;
const CUR_AFTER = String.raw`(?:AUD|USD|CAD|NZD|EUR|GBP|TRY|TL|澳元|澳币|澳大利亚元|澳大利亚币|美元|加元|新西兰元|欧元|英镑)`;

type Span = { start: number; end: number; v: Value };

function take(text: string, re: RegExp, make: (m: RegExpExecArray) => Value | null): { rest: string; found: Value[] } {
  const found: Value[] = [];
  const rest = text.replace(re, (...args) => {
    const groups = args.slice(0, -2) as string[];
    const m = Object.assign(groups, { index: args[args.length - 2] as number, input: text }) as unknown as RegExpExecArray;
    const v = make(m);
    if (!v) return groups[0];
    found.push(v);
    return " ".repeat(groups[0].length);
  });
  return { rest, found };
}

export function extractValues(input: string, language = "en"): Value[] {
  // Fullwidth digits only (NFKC would also turn the Chinese comma into an ASCII one and glue "325，190" into 325,190).
  let text = input.replace(/[０-９]/g, (c) => String(c.charCodeAt(0) - 0xff10));
  const out: Value[] = [];
  const add = (r: { rest: string; found: Value[] }) => {
    text = r.rest;
    out.push(...r.found);
  };
  const names = { ...MONTHS, ...(DATE_LANGUAGES[language] ?? {}) };
  const monthAlt = Object.keys(names).sort((a, b) => b.length - a.length).join("|");
  const monthOf = (s: string) => names[s.toLowerCase()] ?? MONTHS[s.toLowerCase()];

  // program years: 2026-27, 2026/27, 2026–2027, 2026-27年
  add(take(text, /(?<!\d)(20\d{2})\s*[-–—/]\s*(20)?(\d{2})(?!\d)/g, (m) => ({ kind: "fy", value: `${m[1]}-${m[3]}`, raw: m[0].trim() })));
  // ISO dates
  add(take(text, /(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/g, (m) => ({ kind: "date", value: `${m[1]}-${m[2]}-${m[3]}`, raw: m[0] })));
  // Chinese full dates / month-day / year-month
  add(take(text, /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]/g, (m) => ({ kind: "date", value: `${m[1]}-${pad(m[2])}-${pad(m[3])}`, raw: m[0] })));
  add(take(text, /(\d{4})\s*年\s*(\d{1,2})\s*月/g, (m) => ({ kind: "month", value: `${m[1]}-${pad(m[2])}`, raw: m[0] })));
  add(take(text, /(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]/g, (m) => ({ kind: "monthday", value: `${pad(m[1])}-${pad(m[2])}`, raw: m[0] })));
  // "27 July 2026", "27th of July 2026", "July 27, 2026", "July 2026", "27 July"
  const mon = `(${monthAlt})\\.?`;
  add(take(text, new RegExp(`(?<!\\d)(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${mon}\\s*,?\\s+(\\d{4})(?!\\d)`, "gi"), (m) => (monthOf(m[2]) ? { kind: "date", value: `${m[3]}-${pad(monthOf(m[2]))}-${pad(m[1])}`, raw: m[0] } : null)));
  add(take(text, new RegExp(`${mon}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*,\\s*(\\d{4})(?!\\d)`, "gi"), (m) => (monthOf(m[1]) ? { kind: "date", value: `${m[3]}-${pad(monthOf(m[1]))}-${pad(m[2])}`, raw: m[0] } : null)));
  add(take(text, new RegExp(`${mon}\\s+(\\d{4})(?!\\d)`, "gi"), (m) => (monthOf(m[1]) ? { kind: "month", value: `${m[2]}-${pad(monthOf(m[1]))}`, raw: m[0] } : null)));
  add(take(text, new RegExp(`(?<!\\d)(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${mon}(?![\\p{L}])`, "giu"), (m) => (monthOf(m[2]) ? { kind: "monthday", value: `${pad(monthOf(m[2]))}-${pad(m[1])}`, raw: m[0] } : null)));
  // amounts: "AUD 325", "A$325", "$ 1,200.50", "325 AUD", "325澳元", "1万澳元"
  add(take(text, new RegExp(`(${CUR})\\s*(${NUM})\\s*(万)?`, "gi"), (m) => ({ kind: "amount", value: parseNumber(m[2], m[3] ? 10000 : 1), currency: currencyOf(m[1]), raw: m[0].trim() })));
  add(take(text, new RegExp(`(${NUM})\\s*(万)?\\s*(${CUR_AFTER})`, "gi"), (m) => ({ kind: "amount", value: parseNumber(m[1], m[2] ? 10000 : 1), currency: currencyOf(m[3]), raw: m[0].trim() })));
  // remaining numbers (subclass numbers, counts, durations, points, times, percentages)
  add(take(text, new RegExp(`(?<![\\d.,])(${NUM})\\s*(万)?`, "g"), (m) => ({ kind: "number", value: parseNumber(m[1], m[2] ? 10000 : 1), raw: m[0].trim() })));
  return out;
}

const describe = (v: Value) => {
  switch (v.kind) {
    case "date":
      return `${v.raw} (${v.value})`;
    case "month":
      return `${v.raw} (${v.value})`;
    case "monthday":
      return `${v.raw} (--${v.value})`;
    case "fy":
      return `${v.raw} (${v.value})`;
    case "amount":
      return `${v.raw} (${v.currency ?? "no currency"} ${v.value})`;
    default:
      return v.raw;
  }
};

const compatible = (a: Value, b: Value) => {
  if (a.value !== b.value) return false;
  const money = (v: Value) => v.kind === "amount";
  if (a.kind === b.kind) return a.kind !== "amount" || !a.currency || !b.currency || a.currency === b.currency;
  // a plain figure stands for an amount whose currency word the translation dropped; every other kind must match
  return (money(a) && b.kind === "number") || (money(b) && a.kind === "number");
};

export type ValueComparison = { same: boolean; missing: string[]; extra: string[] };

/** Compares the values of a source and its translation as multisets of normalised values. */
export function compareValues(source: string, translation: string, language = "en"): ValueComparison {
  const src = extractValues(source, "en");
  const dst = extractValues(translation, language);
  const unmatchedDst = [...dst];
  const missing: Value[] = [];
  // exact-kind matches first, so "2026" in a date is not eaten by a plain number
  const order = (a: Value) => (a.kind === "number" ? 1 : 0);
  for (const s of [...src].sort((a, b) => order(a) - order(b))) {
    const i = unmatchedDst.findIndex((d) => compatible(s, d));
    if (i >= 0) unmatchedDst.splice(i, 1);
    else missing.push(s);
  }
  return { same: missing.length === 0 && unmatchedDst.length === 0, missing: missing.map(describe), extra: unmatchedDst.map(describe) };
}

export function describeDifference(c: ValueComparison): string {
  const parts: string[] = [];
  if (c.missing.length) parts.push(`missing or changed in the draft: ${c.missing.join("; ")}`);
  if (c.extra.length) parts.push(`not in the source: ${c.extra.join("; ")}`);
  return parts.join(". ");
}
