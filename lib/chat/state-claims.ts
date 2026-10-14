import versions from "@/src/data/knowledge-versions.json";
import { STATE_NAMES, stateResidenceRule } from "@/lib/state-nomination/residence-rules";
import { localizedText } from "@/lib/admin-data/localized";
import { seedStateData } from "@/lib/admin-data/snapshot";
import type { AdminStateData } from "@/lib/admin-data/types";
import type { Locale } from "@/lib/readiness/types";

import { statesNamedIn } from "./answer-check";
import { bannedIn, contentTokens, tokenize, type AnswerPass, type Rewrite } from "./information-only";

/**
 * State information in the chat comes from the structured state data (lib/state-nomination/state-rules-config.ts: status, note,
 * published conditions, date checked) and nowhere else. This pass enforces it on the finished answer:
 *   - a sentence that names a state is kept only if it cites that state's OWN current source, or is supported (words and numbers) by a
 *     single published statement of that state; a sentence that cites another state's source, an archived / older document than the
 *     state's current data, or no source at all, is dropped;
 *   - a sentence that names a state and talks about its status (open / closed / 2026-27 / invitations / allocation) is always dropped:
 *     status is quoted from the structured data, never paraphrased;
 *   - the structured data (translated) of the states the visitor asked about or the answer discussed is appended, with each state's
 *     published residence condition next to what the visitor entered, as two facts and no conclusion.
 */

const PATHS = ((versions as unknown as { paths?: Record<string, string> }).paths ?? {}) as Record<string, string>;
const FOLDER_STATE: Record<string, string> = { ACT: "ACT", NSW: "NSW", NT: "NT", Queensland: "QLD", SA: "SA", TAS: "TAS", Victoria: "VIC", "Western Australia": "WA" };

export type SourceInfo = { state?: string; archived: boolean; path?: string };

/** Which state a cited document belongs to (from its path under data/knowledge), and whether it sits in an archive folder. */
export function sourceInfo(filename: string | undefined): SourceInfo {
  const path = filename ? PATHS[filename] : undefined;
  if (!path) return { archived: false };
  const folder = path.match(/^State Immigrations\/([^/]+)\//)?.[1];
  return { ...(folder && FOLDER_STATE[folder] ? { state: FOLDER_STATE[folder] } : {}), archived: /(?:^|\/)_archive\//i.test(path), path };
}

/** True when the document is current for the state's data: in the 2026-27 folder, listed as the rule's source, or an occupation list. */
export function isCurrentFor(code: string, filename: string, info: SourceInfo, data: AdminStateData = seedStateData()): boolean {
  if (info.archived) return false;
  const rule = data.rules[code];
  if (/\/2026-27\//.test(info.path ?? "")) return true;
  if (rule?.sourceDocument.includes(filename)) return true;
  return /\.(?:xlsx|csv)$/i.test(filename);
}

const STATUS_WORDS = new RegExp(
  [
    "(?<![\\p{L}\\p{N}])(?:open|opens|opened|opening|closed|closes|closure|suspended|paused|pause|accepting|accepts|intake|allocations?|invitations?|invites?|invited|rounds?|reopen\\w*|2025-26|2026-27)(?![\\p{L}\\p{N}])",
    "açık|kapalı|kapandı|kapanmış|askıya|kontenjan|davet|dolmuş|\\bdolu\\b",
    "开放|关闭|暂停|名额|邀请|已满",
  ].join("|"),
  "iu",
);
const MARKER = /\[(S\d+)\]/g;
const idsIn = (s: string) => Array.from(s.matchAll(MARKER), (m) => m[1]);
const NUMBERS = (tokens: Set<string>) => [...tokens].filter((t) => /^\d/.test(t));

type Variant = { tokens: Set<string> };
const variantCache = new WeakMap<AdminStateData, Map<string, Variant[]>>();
/** The published statements of one state (note and conditions, in English and in the answer's language) as token sets. */
function variantsOf(code: string, locale: Locale, data: AdminStateData): Variant[] {
  let perData = variantCache.get(data);
  if (!perData) variantCache.set(data, (perData = new Map()));
  const key = `${code}|${locale}`;
  const hit = perData.get(key);
  if (hit) return hit;
  const rule = data.rules[code];
  const texts = rule ? [rule.note, localizedText(rule.notes, locale), ...rule.keyFactFields.flatMap((f) => [f.en, localizedText(f, locale)])] : [];
  const out = texts.map((t) => ({ tokens: contentTokens(t) }));
  perData.set(key, out);
  return out;
}

/** The sentence says (nearly) nothing beyond one published statement of the state: most of its words and every number are in that single statement. */
export function supportedByState(sentence: string, code: string, locale: Locale, data: AdminStateData = seedStateData()): boolean {
  const s = contentTokens(sentence.replace(MARKER, " "));
  if (s.size < 4 && NUMBERS(s).length === 0) return true; // a heading or a bare name
  const numbers = NUMBERS(s);
  return variantsOf(code, locale, data).some((v) => {
    let shared = 0;
    for (const t of s) if (v.tokens.has(t)) shared++;
    return shared / s.size >= 0.6 && numbers.every((n) => v.tokens.has(n));
  });
}

export type StateClaimsCtx = {
  locale: Locale;
  /** The visitor's latest message. */
  userText: string;
  /** Citation id -> source file name (premium answers); absent on the free path. */
  sources?: Record<string, string>;
  /** The state the visitor entered as where they live (onshore profile), when there is one. */
  home?: string;
  /** The admin's state data (getAdminStateData()); the bundled seed when omitted. */
  data?: AdminStateData;
};

type Verdict = { keep: true } | { keep: false; reason: "status" | "stale_source" | "no_own_source" };

function judge(sentence: string, codes: string[], ctx: StateClaimsCtx): Verdict {
  if (STATUS_WORDS.test(sentence)) return { keep: false, reason: "status" };
  const cited = idsIn(sentence).map((id) => ({ file: ctx.sources?.[id], info: sourceInfo(ctx.sources?.[id]) }));
  for (const code of codes) {
    const own = cited.filter((c) => c.info.state === code);
    if (own.some((c) => !isCurrentFor(code, c.file ?? "", c.info, ctx.data))) return { keep: false, reason: "stale_source" };
    if (own.length > 0) continue;
    if (supportedByState(sentence, code, ctx.locale, ctx.data)) continue;
    return { keep: false, reason: "no_own_source" };
  }
  return { keep: true };
}

const T = (l: Locale, en: string, tr: string, zh: string) => (l === "tr" ? tr : l === "zh-Hans" ? zh : en);
const li = (l: Locale) => (l === "tr" ? 1 : l === "zh-Hans" ? 2 : 0);

export const STATE_BLOCK_HEADER: Record<Locale, string> = {
  en: "Published state information (each state's data-checked date is shown):",
  tr: "Yayımlanmış eyalet bilgisi (her eyaletin veri kontrol tarihi gösterilir):",
  "zh-Hans": "已公布的州信息（显示各州的数据核对日期）：",
};

const PROVENANCE = /^(?:Checked against|Confirmed by|Confirmed on|These settings come from|Status \(2026-27\)|Checked on)/i;
const PRIORITY = /month|week|hour|resid|employ|work|study|english|points|fee|allocation|AUD|\byears?\b|stream|pathway|requirement|ROI|invitation|round|closed|open|exception/i;

const GENERIC_STATE_QUESTION = /\b(?:which|what) (?:state|territory|states)\b|\bstates?\b.*\b(?:sponsor|nominate|nomination)\b|hangi eyalet|eyalet(?:ler)?|哪个州|哪些州|各州|州担保|州提名/iu;

const clean = (text: string, locale: Locale) => bannedIn(text, locale).length === 0;

/** The structured data of one state, translated: name, checked date, note, and (for the states the visitor named) the published conditions. */
function blockFor(code: string, locale: Locale, withConditions: boolean, home: string | undefined, data: AdminStateData): string[] {
  const rule = data.rules[code];
  if (!rule) return [];
  const name = STATE_NAMES[code]?.[li(locale)] ?? rule.name;
  const lines: string[] = [];
  const note = localizedText(rule.notes, locale);
  if (clean(note, locale)) lines.push(`- ${name} (${code}), ${T(locale, "data checked", "veri kontrol tarihi", "数据核对日期")} ${rule.lastVerified}: ${note}`);
  else lines.push(`- ${name} (${code}), ${T(locale, "data checked", "veri kontrol tarihi", "数据核对日期")} ${rule.lastVerified}.`);
  if (withConditions) {
    const facts = rule.keyFactFields.filter((f) => !PROVENANCE.test(f.en)).sort((a, b) => Number(PRIORITY.test(b.en)) - Number(PRIORITY.test(a.en))).slice(0, 8);
    for (const f of facts) {
      const text = localizedText(f, locale);
      if (clean(text, locale)) lines.push(`  • ${text}`);
    }
  }
  // The residence condition next to what the visitor entered: two facts, no conclusion.
  if (home && home !== code && STATE_NAMES[home]) {
    const r = stateResidenceRule(code, data);
    if (r.requirement !== "not_required") {
      const homeName = STATE_NAMES[home][li(locale)];
      const published =
        r.requirement === "required" && r.factField
          ? localizedText(r.factField, locale)
          : T(locale, "no residence condition for applicants living in another state is stated in the published sources", "yayımlanmış kaynaklarda başka eyalette yaşayan başvuru sahipleri için bir ikamet koşulu belirtilmemiştir", "已公布的资料中未说明对居住在其他州的申请人的居住条件");
      if (clean(published, locale)) {
        lines.push(`  • ${T(locale, "Published residence/employment condition", "Yayımlanmış ikamet/çalışma koşulu", "已公布的居住/就业条件")}: ${published} | ${T(locale, "You entered", "Girdiğiniz", "您填写的居住地")}: ${homeName}.`);
      }
    }
  }
  return lines;
}

/**
 * The pass (see the file comment). `ctx.sources` maps citation ids to file names; `ctx.home` is where the visitor entered that they live.
 */
export function stateClaimsPass(ctx: StateClaimsCtx): AnswerPass {
  return (text) => {
    if (text.includes(STATE_BLOCK_HEADER[ctx.locale])) return { text, rewrites: [] };
    const rewrites: Rewrite[] = [];
    const named = new Set<string>();
    const kept = text.split("\n").map((line) => {
      if (!line.trim()) return line;
      let rebuilt = "";
      let pending = "";
      for (const [sentence, space] of tokenize(line)) {
        const codes = sentence.trim() ? statesNamedIn(sentence) : [];
        if (codes.length === 0) {
          rebuilt += pending + sentence;
          pending = space;
          continue;
        }
        codes.forEach((c) => named.add(c));
        const verdict = judge(sentence, codes, ctx);
        if (verdict.keep) {
          rebuilt += pending + sentence;
          pending = space;
        } else rewrites.push({ id: "state_claim", sentence: sentence.trim(), action: "dropped", replacement: verdict.reason });
      }
      return rebuilt;
    });
    let out = kept.filter((l, i) => l.trim() || !(i > 0 && !kept[i - 1].trim())).join("\n").replace(/\n{3,}/g, "\n\n").trim();

    const asked = statesNamedIn(ctx.userText);
    let scope = [...new Set([...asked, ...named])];
    const data = ctx.data ?? seedStateData();
    if (scope.length === 0 && GENERIC_STATE_QUESTION.test(ctx.userText)) scope = Object.keys(data.rules);
    if (scope.length > 0) {
      const order = Object.keys(data.rules);
      const lines = [STATE_BLOCK_HEADER[ctx.locale], ...order.filter((c) => scope.includes(c)).flatMap((c) => blockFor(c, ctx.locale, asked.includes(c), ctx.home, data))];
      out = `${out}${out ? "\n\n" : ""}${lines.join("\n")}`;
    }
    return { text: out, rewrites };
  };
}
