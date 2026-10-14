import { pointsClosureOf, pointsIfEnglishMetOf } from "@/lib/readiness/engine";
import { nominationBonusFor, type PathwaySubclass } from "@/lib/readiness/pathway-scores";
import type { Locale, ReadinessInput, ReadinessReport } from "@/lib/readiness/types";
import { closurePlanText, evaluateVisaGates, pathwayStatusLabel } from "@/lib/readiness/visa-gates";
import type { PathwayGates } from "@/lib/readiness/visa-gate-text";
import { POINTS_TABLES } from "@/lib/points/calculate-australia-points";

/**
 * The opening of a personalised answer, taken from the report engine and nothing else: the current points, the status
 * per visa in the engine's own labels, the score WITH the nomination 190 / 491 require, and the engine's points-gap
 * plan (what closes the gap and roughly how long) with the highest score the visitor's own actions can reach. The
 * chat shows this text at the top of the answer itself (so it is exact and in the visitor's language) and gives the
 * model the same facts to build on -- the model may expand, never contradict or replace.
 */

const THRESHOLD = POINTS_TABLES.minimumThreshold;
/** The Department of Home Affairs pages for the points-tested visas: the published requirements the recap points to. */
const PUBLISHED_PAGES: ReadonlyArray<readonly [string, string]> = [
  ["189", "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-independent-189"],
  ["190", "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-nominated-190"],
  ["491", "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-work-regional-provisional-491"],
];
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
  /** 189 / 190 / 491: the recent invitation benchmark the same total is compared with (null: none for this occupation). */
  benchmarks?: Partial<Record<PathwaySubclass, { total: number; benchmark: number | null; asOf?: string }>>;
  /** 189 / 190 / 491: the CURRENT score (nomination included, before a positive skills assessment): a gap quoted from it is also right. */
  currentTotals?: Partial<Record<PathwaySubclass, number>>;
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

  // The gates are re-evaluated in the answer's language from the stored report's own numbers (points, closure plan, benchmarks,
  // state availability), so the status labels AND the engine's step texts ("Complete a positive skills assessment with ACS",
  // "Raise your points from 60 to at least 65 ...") are in the conversation language, not the language the report was saved in.
  const stored = (report.visaGates ?? {}) as Record<string, PathwayGates>;
  const gates = localizedGates(report, input, locale) ?? stored;
  const statuses: PlanFacts["statuses"] = {};
  for (const [visa, g] of Object.entries(gates)) {
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
  const colon = locale === "zh-Hans" ? "：" : ": ";

  // Entered details, as the engine read them: occupation, age, current visa / country, and the points each entry carries.
  const entered: string[] = [];
  const occ = String(input.occupation ?? report.occupationIndication?.occupation ?? "").trim();
  if (occ) entered.push(T(locale, `occupation ${occ}`, `meslek ${occ}`, `职业 ${occ}`));
  if (input.age) entered.push(T(locale, `age ${input.age}`, `yaş ${input.age}`, `年龄 ${input.age}`));
  if (input.currentCountry) entered.push(T(locale, `current country ${input.currentCountry}`, `bulunduğunuz ülke ${input.currentCountry}`, `当前所在国家 ${input.currentCountry}`));
  const rows = (pe.breakdown ?? []).filter((b) => b && typeof b.points === "number" && b.status !== "not_assessed").map((b) => `${b.label} ${b.points}${typeof b.max === "number" ? `/${b.max}` : ""}`);

  // Points per subclass, side by side with the published figures: the nomination points 190 (+5) and 491 (+15) add, the published
  // minimum, and the recent invitation level with its date. Arithmetic and published figures only.
  const benchmarks: NonNullable<PlanFacts["benchmarks"]> = {};
  const perSubclass = (["189", "190", "491"] as const)
    .filter((v) => statuses[v])
    .map((v) => {
      const sc = scores[v]!;
      const ps = report.pathwayScores?.[v];
      const benchmark = typeof ps?.benchmark === "number" ? ps.benchmark : null;
      benchmarks[v] = { total: sc.total, benchmark, ...(ps?.benchmarkAsOf ? { asOf: ps.benchmarkAsOf } : {}) };
      const sum = sc.bonus > 0 ? `${sc.base} + ${sc.bonus} = ${sc.total}` : `${sc.total}`;
      const published = T(locale, `published minimum ${THRESHOLD}`, `yayımlanmış asgari ${THRESHOLD}`, `公布的最低分 ${THRESHOLD}`);
      const recent =
        benchmark === null
          ? ""
          : T(
              locale,
              `; recent invitation level ${benchmark}${ps?.benchmarkAsOf ? ` (${ps.benchmarkAsOf})` : ""}`,
              `; son davet seviyesi ${benchmark}${ps?.benchmarkAsOf ? ` (${ps.benchmarkAsOf})` : ""}`,
              `；近期邀请水平 ${benchmark}${ps?.benchmarkAsOf ? `（${ps.benchmarkAsOf}）` : ""}`,
            );
      const figure = potential !== undefined
        ? T(locale, "your figure with those points", "bu puanlarla sizin rakamınız", "含上述分数的您的数字")
        : T(locale, "your figure", "sizin rakamınız", "您的数字");
      return `${v}${colon}${figure} ${sum}${locale === "zh-Hans" ? "；" : "; "}${published}${recent}`;
    });

  const head = T(locale, "Profile recap (from the details you entered; information only)", "Profil özeti (girdiğiniz bilgilerden; yalnızca bilgi)", "资料回顾（根据您填写的信息；仅供参考信息）");
  const lines = [
    `${head}${colon.trim() === ":" ? ":" : "："}`,
    entered.length ? T(locale, `Entered: ${entered.join(sep)}.`, `Girilen: ${entered.join(sep)}.`, `已填写：${entered.join(sep)}。`) : "",
    rows.length ? T(locale, `Points from your entries: ${points} (${rows.join(sep)}).`, `Girişlerinizden puan: ${points} (${rows.join(sep)}).`, `根据您的填写得到的分数：${points}（${rows.join(sep)}）。`) : T(locale, `Points from your entries: ${points}.`, `Girişlerinizden puan: ${points}.`, `根据您的填写得到的分数：${points}。`),
    potential !== undefined ? T(locale, `With the qualification and experience points a positive skills assessment lets you claim: ${potential}.`, `Olumlu beceri değerlendirmesiyle talep edilebilen nitelik ve deneyim puanlarıyla: ${potential}.`, `加上正面技能评估后可申报的学历和工作经验分数：${potential}。`) : "",
    ...perSubclass,
    T(locale, "Published requirements:", "Yayımlanmış şartlar:", "已公布的要求：") + ` ${PUBLISHED_PAGES.map(([v, url]) => `${v} – ${url}`).join(" | ")}`,
  ].filter(Boolean);
  const lead = lines.join("\n");
  return { lead, facts: { points, ...(potential !== undefined ? { potential } : {}), statuses, scores, benchmarks, currentTotals: { "189": points + nominationBonusFor("189"), "190": points + nominationBonusFor("190"), "491": points + nominationBonusFor("491") }, ...(ceiling !== undefined ? { ceiling } : {}) } };
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

/**
 * The question is about the visitor's own points, eligibility, chances or PR pathways (en / tr / zh-Hans). A question about
 * a specific process ("482'den 186'ya kaç yılda geçerim?", "how long does the 190 take?") is not: it gets no summary
 * (the facts still go to the model).
 */
const TOPIC_PROFILE = new RegExp(
  [
    "\\b(?:points?|score|scores|eligib\\w*|chances?|qualif\\w*|pathways?|PR|permanent residen\\w*|which visa|best visa|visa options|my options)\\b|\\bcan i (?:get|apply|qualify)\\b|\\bwhat (?:visa|visas|can i do)\\b",
    "(?<![\\p{L}\\p{N}])(?:puan\\p{L}*|skor\\p{L}*|uygun\\p{L}*|şans\\p{L}*|oturum\\p{L}*|PR|hangi vize\\p{L}*|yol(?:lar)?(?:ım)?|seçenek\\p{L}*|başvurabilir\\p{L}*|hak kazan\\p{L}*)(?![\\p{L}\\p{N}])",
    "积分|分数|得分|资格|机会|永居|永久居留|(?<![\\p{L}])PR(?![\\p{L}])|哪个签证|哪种签证|路径|选择|能否|可以申请|能申请",
  ].join("|"),
  "iu",
);
export const asksAboutProfileTopics = (text: string): boolean => asksAboutPosition(text) || TOPIC_PROFILE.test(text);

export function shouldShowLead(opts: { fingerprint: string; lastShown: string | undefined; userText: string }): boolean {
  // Once per conversation, for the first question about the visitor's profile.
  if (!asksAboutProfileTopics(opts.userText)) return false;
  return opts.lastShown === undefined;
}

function localizedGates(report: Partial<ReadinessReport>, input: ReadinessInput, locale: Locale): Record<string, PathwayGates> | undefined {
  try {
    const pe = report.pointsEstimate;
    if (!pe) return undefined;
    const closure = pointsClosureOf(pe, input, locale);
    const tracker = report.stateNominationTracker;
    const nomination =
      tracker && !tracker.eligibilityBlocked && tracker.nominationAvailability && tracker.conditionBlocked
        ? {
            "190": { open: tracker.nominationAvailability["190"].length, blocked: tracker.conditionBlocked["190"] },
            "491": { open: tracker.nominationAvailability["491"].length, blocked: tracker.conditionBlocked["491"] },
          }
        : undefined;
    const scores = report.pathwayScores;
    const evaluated = evaluateVisaGates(
      input,
      {
        estimatedPoints: pe.estimatedPoints,
        potentialPoints: pe.potentialPoints,
        boosterGain: closure?.gain,
        pointsIfEnglishMet: pointsIfEnglishMetOf(input, locale),
        closurePlan: closure?.plan,
        nomination,
        invitation: scores
          ? Object.fromEntries((["189", "190", "491"] as const).map((v) => [v, { score: scores[v].comparisonScore ?? scores[v].baseScore, benchmark: scores[v].benchmark }]))
          : undefined,
      },
      locale,
    );
    // Only trust the re-evaluation when it reproduces the stored statuses (same engine, same inputs).
    for (const [v, g] of Object.entries(report.visaGates ?? {})) if (evaluated[v] && evaluated[v].status !== g.status) return undefined;
    return evaluated;
  } catch {
    return undefined;
  }
}
