import { pointsClosureOf } from "@/lib/readiness/engine";
import { nominationBonusFor, type PathwaySubclass } from "@/lib/readiness/pathway-scores";
import type { Locale, ReadinessInput, ReadinessReport } from "@/lib/readiness/types";
import { closurePlanText, pathwayStatusLabel } from "@/lib/readiness/visa-gates";
import { POINTS_TABLES } from "@/lib/points/calculate-australia-points";

/**
 * The opening of a personalised answer, taken from the report engine and nothing else: the current points, the status
 * per visa in the engine's own labels, the score WITH the nomination 190 / 491 require, and the engine's points-gap
 * plan (what closes the gap and roughly how long) with the highest score the visitor's own actions can reach. The
 * chat shows this text at the top of the answer itself (so it is exact and in the visitor's language) and gives the
 * model the same facts to build on -- the model may expand, never contradict or replace.
 */

const THRESHOLD = POINTS_TABLES.minimumThreshold;
const T = (l: Locale, en: string, tr: string, zh: string) => (l === "tr" ? tr : l === "zh-Hans" ? zh : en);

export type PlanFacts = {
  points: number;
  potential?: number;
  /** visa -> the engine's status key and its label in the answer's language. */
  statuses: Record<string, { status: string; label: string; steps: string[] }>;
  /** 189 / 190 / 491: the score the 65-point minimum is compared with (nomination included for 190 / 491). */
  scores: Partial<Record<PathwaySubclass, { base: number; bonus: number; total: number; short: number }>>;
  /** Highest score the visitor's own actions can reach (before any nomination), when the engine can compute it. */
  ceiling?: number;
};

export type PlanSummary = { lead: string; facts: PlanFacts };

export function buildPlanSummary(reportJson: unknown, inputJson: unknown, locale: Locale): PlanSummary | null {
  if (!reportJson || typeof reportJson !== "object") return null;
  const report = reportJson as Partial<ReadinessReport>;
  const input = { ...((inputJson && typeof inputJson === "object" ? inputJson : {}) as Partial<ReadinessInput>), locale } as ReadinessInput;
  const pe = report.pointsEstimate;
  if (!pe || typeof pe.estimatedPoints !== "number") return null;

  const points = pe.estimatedPoints;
  const potential = typeof pe.potentialPoints === "number" && pe.potentialPoints !== points ? pe.potentialPoints : undefined;
  const own = potential ?? points;

  const statuses: PlanFacts["statuses"] = {};
  for (const [visa, g] of Object.entries(report.visaGates ?? {})) {
    if (g && typeof g.status === "string") statuses[visa] = { status: g.status, label: pathwayStatusLabel(g, locale), steps: Array.isArray(g.steps) ? g.steps.map(String) : [] };
  }

  const scores: PlanFacts["scores"] = {};
  for (const v of ["189", "190", "491"] as const) {
    const bonus = nominationBonusFor(v);
    scores[v] = { base: own, bonus, total: own + bonus, short: Math.max(0, THRESHOLD - (own + bonus)) };
  }

  let closure: ReturnType<typeof pointsClosureOf>;
  try {
    closure = pointsClosureOf(pe, input, locale);
  } catch {
    closure = undefined;
  }
  const ceiling = closure ? closure.baseTotal + closure.gain : undefined;

  const visas = ["189", "190", "491"].filter((v) => statuses[v]);
  if (/^(500|485)$/.test(String(input.currentVisaSubclass ?? "")) && statuses["485"]) visas.push("485");

  const sep = locale === "zh-Hans" ? "；" : "; ";
  const stop = locale === "zh-Hans" ? "。" : ".";
  const byVisa = visas.map((v) => `${v} – ${statuses[v].label}`).join(sep);
  const s1 = T(
    locale,
    `Your estimate is ${points} points${potential !== undefined ? ` (${potential} with a positive skills assessment)` : ""}${byVisa ? `; by visa: ${byVisa}` : ""}.`,
    `Tahmini puanınız ${points}${potential !== undefined ? ` (olumlu beceri değerlendirmesiyle ${potential})` : ""}${byVisa ? `; vize bazında: ${byVisa}` : ""}.`,
    `您的预估分数是 ${points} 分${potential !== undefined ? `（获得正面技能评估后为 ${potential} 分）` : ""}${byVisa ? `；按签证：${byVisa}` : ""}。`,
  );

  const arithmetic = (["189", "190", "491"] as const)
    .filter((v) => statuses[v])
    .map((v) => {
      const s = scores[v]!;
      const sum = s.bonus > 0 ? `${s.base} + ${s.bonus} = ${s.total}` : `${s.total}`;
      const verdict = s.short > 0
        ? T(locale, `${s.short} short of ${THRESHOLD}`, `${THRESHOLD} için ${s.short} puan eksik`, `距 ${THRESHOLD} 分差 ${s.short} 分`)
        : T(locale, `meets ${THRESHOLD}`, `${THRESHOLD} puanı karşılıyor`, `达到 ${THRESHOLD} 分`);
      return `${v}: ${sum} (${verdict})`;
    });
  const s2 = arithmetic.length
    ? `${T(locale, "With the nomination each visa requires", "Her vizenin gerektirdiği adaylıkla", "计入各签证所需的提名后")}${locale === "zh-Hans" ? "：" : ": "}${arithmetic.join(sep)}${stop}`
    : "";

  const plans: string[] = [];
  const seen = new Set<string>();
  if (closure) {
    for (const v of ["189", "190", "491"] as const) {
      const s = scores[v]!;
      if (!statuses[v] || s.short <= 0) continue;
      const plan = closure.plan(s.short);
      if (!plan) continue;
      const text = closurePlanText(plan, s.short, locale);
      if (seen.has(text)) continue;
      seen.add(text);
      plans.push(`${v}: ${text}`);
    }
  }
  const anyShort = (["189", "190", "491"] as const).some((v) => statuses[v] && scores[v]!.short > 0);
  const ceilingText =
    anyShort && ceiling !== undefined
      ? T(locale, `the highest score your own actions can reach before any nomination is ${ceiling}`, `kendi adımlarınızla adaylık öncesinde ulaşabileceğiniz en yüksek puan ${ceiling}`, `仅靠您自己的行动（不含提名）能达到的最高分是 ${ceiling}`)
      : "";
  const s3Parts = [plans.length ? plans.join(sep) : "", ceilingText].filter(Boolean);
  const s3 = s3Parts.length ? `${T(locale, "Closing the gap", "Açığı kapatma", "补足差距")}${locale === "zh-Hans" ? "：" : " — "}${s3Parts.join(sep)}${stop}` : "";

  const lead = [s1, s2, s3].filter(Boolean).join(" ");
  return { lead, facts: { points, ...(potential !== undefined ? { potential } : {}), statuses, scores, ...(ceiling !== undefined ? { ceiling } : {}) } };
}

/**
 * When the opening summary is shown. It opens the FIRST answer of a conversation and is shown again only when the saved
 * profile has changed since it was last shown, or when the visitor asks about their position; any other answer may refer
 * back to it briefly but must not repeat it. "Last shown" is read from the conversation itself: the answer that carried
 * the summary also carries a `data-lead` part with the profile's fingerprint (lib/chat/corrected-stream.ts), and the
 * client sends the whole conversation back with every message.
 */

/** FNV-1a of the profile summary and its source: stable across languages and requests, changes when the saved profile does. */
export function profileFingerprint(profile: { summary: string; source: string }): string {
  let h = 0x811c9dc5;
  for (const ch of `${profile.source}\n${profile.summary}`) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** The fingerprint carried by the most recent assistant answer that showed the summary, or undefined (none shown yet). */
export function lastShownLeadFingerprint(messages: ReadonlyArray<{ role: string; parts: ReadonlyArray<{ type: string; data?: unknown }> }>): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role !== "assistant") continue;
    for (const part of messages[i].parts) {
      const fp = part.type === "data-lead" ? (part.data as { fp?: unknown } | undefined)?.fp : undefined;
      if (typeof fp === "string") return fp;
    }
  }
  return undefined;
}

/** The visitor asks where they stand (their score, status, eligibility, chances, situation) -- English / Turkish / Chinese. */
const ASKS_POSITION = new RegExp(
  [
    "\\bwhere (?:do|am) i stand\\b",
    "\\bmy (?:current )?(?:position|standing|status|score|points|situation|eligibility|chances|profile)\\b",
    "\\bam i eligible\\b",
    "\\bhow (?:am i|do i) (?:doing|look)\\b",
    "\\b(?:summar(?:y|ise|ize)|recap) (?:of )?my\\b",
    "durumum|konumum|neredeyim|puanım|puanim|skorum|uygun muyum|şansım",
    "我的(?:情况|位置|处境|分数|得分|积分|状态|资格|条件|机会|档案)|我(?:符合|有资格)|我现在(?:在哪|处于)",
  ].join("|"),
  "iu",
);
export const asksAboutPosition = (text: string): boolean => ASKS_POSITION.test(text);

export function shouldShowLead(opts: { fingerprint: string; lastShown: string | undefined; userText: string }): boolean {
  return opts.lastShown !== opts.fingerprint || asksAboutPosition(opts.userText);
}
