import { POINTS_TABLES } from "@/lib/points/calculate-australia-points";
import type { Locale } from "@/lib/readiness/types";

import { tokenize, type AnswerPass, type Rewrite } from "./information-only";
import type { PlanFacts } from "./plan-summary";

/**
 * Points arithmetic is the engine's, never the model's. The chat gives the model the engine's per-subclass figures (figuresBlock) and
 * requires it to quote them; an answer that prints any other points figure is rewritten: the sentence is replaced by the engine
 * arithmetic line (once), and the visitor's own stated figure is shown next to the entries whenever the two differ.
 */

const T = (l: Locale, en: string, tr: string, zh: string) => (l === "tr" ? tr : l === "zh-Hans" ? zh : en);

const SUBS = ["189", "190", "491"] as const;

/** The figures the engine produced for this profile, as numbers. */
export function engineFigureSet(facts: PlanFacts): Set<number> {
  const out = new Set<number>([facts.points, 65]);
  if (facts.potential !== undefined) out.add(facts.potential);
  if (facts.ceiling !== undefined) out.add(facts.ceiling);
  for (const s of SUBS) {
    const sc = facts.scores[s];
    if (sc) [sc.base, sc.bonus, sc.total, sc.short].forEach((n) => out.add(n));
    const cur = facts.currentTotals?.[s];
    if (cur !== undefined) out.add(cur);
    const b = facts.benchmarks?.[s];
    if (b) {
      out.add(b.total);
      if (b.benchmark !== null) out.add(b.benchmark);
    }
  }
  return out;
}

/** Every value of the published points table (age, English, employment, education, partner, bonuses): a table value is a published figure. */
function publishedTableValues(): Set<number> {
  const out = new Set<number>();
  const walk = (v: unknown) => {
    if (typeof v === "number") out.add(v);
    else if (v && typeof v === "object") Object.values(v as Record<string, unknown>).forEach(walk);
  };
  walk(POINTS_TABLES);
  return out;
}
const TABLE_VALUES = publishedTableValues();

/** One line of the engine's arithmetic for the saved entries, per subclass, with the published minimum. */
export function arithmeticLine(facts: PlanFacts, locale: Locale): string {
  const parts = SUBS.flatMap((s) => {
    const sc = facts.scores[s];
    if (!sc) return [];
    return [sc.bonus > 0 ? `${s}: ${sc.base} + ${sc.bonus} = ${sc.total}` : `${s}: ${sc.base}`];
  });
  const body = parts.join("; ");
  return T(
    locale,
    `Arithmetic from the entries in your saved profile (points per subclass; the published minimum is 65): ${body}.`,
    `Kayıtlı profilinizdeki girişlerden aritmetik (alt sınıf başına puan; yayımlanmış asgari puan 65): ${body}.`,
    `根据您已保存资料中填写内容的算术（每个子类的分数；公布的最低分为 65）：${body}。`,
  );
}

/** The block the model gets: the engine's figures to quote, and the rule that it never computes points. */
export function figuresBlock(facts: PlanFacts, locale: Locale): string {
  return [
    "block-6 (ENGINE POINTS for the visitor's saved entries -- quote these exactly; NEVER compute, add up, round or adjust points yourself, and never print a points figure that is not listed here or stated by the visitor):",
    `- ${arithmeticLine(facts, "en")}`,
    `- Entries total (before nomination points): ${facts.points}.`,
    ...(locale !== "en" ? [`- (${arithmeticLine(facts, locale)})`] : []),
  ].join("\n");
}

const POINT_WORD = "(?:points?|pts|puan\\p{L}*|分(?:数)?)";
/** A points figure: a number next to a points word, or after "figure / score / total" (en / tr / zh). */
const FIGURE = new RegExp(
  [
    `(?<![\\p{L}\\d.,+])(\\d{2,3})(?![\\d.,]\\d)\\s*(?:\\+\\s*)?${POINT_WORD}`,
    `(?:your figure|your score|your total|puanınız|puanınız|toplam(?:ınız)?|您的(?:分数|总分|得分)|你的(?:分数|总分|得分)|分数(?:为|是)?)\\s*[:：=]?\\s*(\\d{2,3})(?![\\d.,]\\d)`,
    `(?:including nomination points?|aday gösterme puanı(?:yla| dahil)?|含提名分)[^\\d]{0,12}(\\d{2,3})`,
    `(\\d{2,3})\\s*\\((?:including|incl\\.?|with)[^)]{0,30}nomination`,
  ].join("|"),
  "giu",
);

/** The figures a sentence prints as points, in the 40-200 range where a total (not a table value) lives. */
export function pointsFiguresIn(sentence: string): number[] {
  const out: number[] = [];
  for (const m of sentence.matchAll(FIGURE)) {
    const n = Number(m.slice(1).find((g) => g !== undefined));
    if (n >= 40 && n <= 200) out.push(n);
  }
  return out;
}

/** A figure presented as "your figure / your score / including nomination points": the visitor's stated figure is not allowed there. */
const LABELLED = /your (?:figure|score|total)|puanınız|toplam(?:ınız)?|aday gösterme puanı|您的(?:分数|总分|得分)|你的(?:分数|总分|得分)|分数(?:为|是)|including nomination|含提名分/iu;

/** The engine figures that belong to one subclass (its base, bonus, total, shortfall, current total and benchmark). */
function subclassFigures(facts: PlanFacts, sub: (typeof SUBS)[number]): Set<number> {
  const out = new Set<number>();
  const sc = facts.scores[sub];
  if (sc) [sc.base, sc.bonus, sc.total, sc.short].forEach((n) => out.add(n));
  const cur = facts.currentTotals?.[sub];
  if (cur !== undefined) out.add(cur);
  const b = facts.benchmarks?.[sub];
  if (b) {
    out.add(b.total);
    if (b.benchmark !== null) out.add(b.benchmark);
  }
  return out;
}

/**
 * The pass: a sentence that prints a points figure which is neither one of the engine's figures for the subclass it is about, nor a
 * published table value, nor (when it is not presented as "your figure") the visitor's own stated figure is replaced -- the first by
 * the engine arithmetic line, the others dropped.
 */
export function pointsGuardPass(facts: PlanFacts, locale: Locale, stated: number[] = []): AnswerPass {
  const globals = new Set<number>([facts.points, 65, ...(facts.potential !== undefined ? [facts.potential] : []), ...(facts.ceiling !== undefined ? [facts.ceiling] : []), ...TABLE_VALUES]);
  const perSub = Object.fromEntries(SUBS.map((s) => [s, subclassFigures(facts, s)])) as Record<(typeof SUBS)[number], Set<number>>;
  return (text) => {
    const rewrites: Rewrite[] = [];
    let replaced = false;
    const bad = (sentence: string): boolean => {
      const figures = pointsFiguresIn(sentence);
      if (figures.length === 0) return false;
      const mentioned = SUBS.filter((s) => new RegExp(`(?<![\\d.,])${s}(?!\\d)`).test(sentence));
      const forSub = new Set<number>();
      for (const s of mentioned.length > 0 ? mentioned : SUBS) perSub[s].forEach((n) => forSub.add(n));
      const labelled = LABELLED.test(sentence);
      return figures.some((n) => !globals.has(n) && !forSub.has(n) && !(!labelled && stated.includes(n))) || (mentioned.length === 1 && labelled && figures.some((n) => !perSub[mentioned[0]].has(n) && !globals.has(n)));
    };
    const lines = text.split("\n").map((line) => {
      if (!line.trim()) return line;
      let rebuilt = "";
      let pending = "";
      for (const [sentence, space] of tokenize(line)) {
        if (!sentence.trim() || !bad(sentence)) {
          rebuilt += pending + sentence;
          pending = space;
          continue;
        }
        if (!replaced) {
          replaced = true;
          const line2 = arithmeticLine(facts, locale);
          rewrites.push({ id: "points_figure", sentence: sentence.trim(), action: "replaced", replacement: line2 });
          rebuilt += pending + line2;
          pending = space;
        } else rewrites.push({ id: "points_figure", sentence: sentence.trim(), action: "dropped" });
      }
      return rebuilt;
    });
    return { text: lines.filter((l, i) => l.trim() || !(i > 0 && !lines[i - 1].trim())).join("\n").replace(/\n{3,}/g, "\n\n").trim(), rewrites };
  };
}

/** The most recent points figure the visitor states in the conversation ("I have 75 points", "75 puanım var", "我有75分"), newest message first. */
export function statedPoints(userTexts: readonly string[]): number | undefined {
  const STATED = new RegExp(
    [
      "\\b(?:i have|i got|i am on|i'm on|i scored|i reached|my (?:score|total|points?)(?: is| are| =)?|with|at)\\s*(?:about |around |roughly )?(\\d{2,3})\\b(?!\\s*(?:years?|months?|weeks?|days?|%|aud|\\$))",
      "\\b(\\d{2,3})\\s*(?:points?|pts)\\b",
      "(?<![\\p{L}\\d])(\\d{2,3})\\s*puan",
      "puan\\p{L}*\\s*[:=]?\\s*(\\d{2,3})(?!\\d)",
      "(\\d{2,3})\\s*分",
      "(?:分数|得分|总分|积分)\\s*(?:是|为|有|[:：])?\\s*(\\d{2,3})",
    ].join("|"),
    "giu",
  );
  for (let i = userTexts.length - 1; i >= 0; i--) {
    let last: number | undefined;
    for (const m of userTexts[i].matchAll(STATED)) {
      const n = Number(m.slice(1).find((g) => g !== undefined));
      if (n >= 30 && n <= 200) last = n;
    }
    if (last !== undefined) return last;
  }
  return undefined;
}

/** Shown whenever the visitor's stated figure differs from the entries: both figures, and which one the arithmetic uses. */
export function statedFigureNote(stated: number, facts: PlanFacts, locale: Locale): string | null {
  if (stated === facts.points) return null;
  return T(
    locale,
    `You stated ${stated} points; the entries in your saved profile add up to ${facts.points} points (before nomination points). The arithmetic in this answer uses ${facts.points}, from the entries.`,
    `Belirttiğiniz puan: ${stated}; kayıtlı profilinizdeki girişlerin toplamı: ${facts.points} puan (aday gösterme puanı hariç). Bu yanıttaki aritmetik, girişlerden gelen ${facts.points} değerini kullanır.`,
    `您提到的分数是 ${stated} 分；您已保存资料中的填写内容合计 ${facts.points} 分（不含提名分）。本回答中的算术使用来自填写内容的 ${facts.points} 分。`,
  );
}
