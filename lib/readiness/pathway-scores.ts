import { calculateAustraliaPoints } from "@/lib/points/calculate-australia-points";
import type { AustraliaPointsInput } from "@/lib/points/types";
import type { Locale } from "./types";

/**
 * THE one place a per-pathway score (189 / 190 / 491) is computed.
 *
 * Every section of the report -- Reality Check, Historical Invitation Trends,
 * Points Booster Simulator, State Nomination tips, Signal Snapshot, the Visa
 * Viability Ranking, the lodgement checklist and the LLM input -- reads the
 * PathwayScoreSet built here and never subtracts or adds points itself.
 *
 *  - baseScore: the engine's own estimate (pointsEstimate.estimatedPoints).
 *  - nominationBonus: taken from the engine's points table (a state
 *    nomination is worth +5 on 190, a regional nomination +15 on 491) -- the
 *    difference between two runs of calculateAustraliaPoints, not a typed-in number.
 *  - scoreIfNominated: base + bonus. It is CONDITIONAL: the applicant does
 *    not have it, so it must never be shown as their current score.
 *  - benchmark: the dated snapshot in src/data/visa-trends.json
 *    (last_invited_point), null when the occupation has no snapshot.
 *  - gapBase / gapIfNominated: benchmark - score, i.e. how many points SHORT
 *    of the benchmark (<= 0 means the score is at or above it).
 */

export type PathwaySubclass = "189" | "190" | "491";

export type PathwayBlockReason = "age" | "skills_assessment" | "english" | "points" | "occupation";

export type PathwayScore = {
  subclass: PathwaySubclass;
  baseScore: number;
  nominationBonus: number;
  scoreIfNominated: number;
  benchmark: number | null;
  /** ISO date of the snapshot the benchmark comes from. */
  benchmarkAsOf?: string;
  gapBase: number | null;
  gapIfNominated: number | null;
  isBlocked: boolean;
  blockReason: PathwayBlockReason | null;
};

export type PathwayScoreSet = Record<PathwaySubclass, PathwayScore>;

export const PATHWAY_SUBCLASSES: readonly PathwaySubclass[] = ["189", "190", "491"];

const ZERO_INPUT: AustraliaPointsInput = {
  age: "25_32",
  english: "competent",
  overseasEmployment: "lt3",
  australianEmployment: "lt1",
  education: "none_or_unsure",
  specialistEducation: false,
  australianStudyRequirement: false,
  professionalYear: false,
  credentialledCommunityLanguage: false,
  regionalStudy: false,
  partner: "none_or_unsure",
  hasStateNomination190: false,
  hasNominationOrSponsorship491: false,
};

/** Nomination bonus per subclass, read from the engine's points table. */
export const NOMINATION_BONUS: Readonly<Record<PathwaySubclass, number>> = (() => {
  const base = calculateAustraliaPoints(ZERO_INPUT).total189;
  return {
    "189": 0,
    "190": calculateAustraliaPoints({ ...ZERO_INPUT, hasStateNomination190: true }).total190 - base,
    "491": calculateAustraliaPoints({ ...ZERO_INPUT, hasNominationOrSponsorship491: true }).total491 - base,
  };
})();

export function nominationBonusFor(subclass: PathwaySubclass): number {
  return NOMINATION_BONUS[subclass];
}

export type TrendBenchmarks = {
  asOf?: string;
  values: Partial<Record<PathwaySubclass, number>>;
};

export function computePathwayScores(args: {
  /** pointsEstimate.estimatedPoints */
  estimatedPoints: number;
  benchmarks?: TrendBenchmarks | null;
  /** assessmentState.eoiIneligibilityReason (null/undefined when EOI is not blocked). */
  eoiBlockReason?: "age" | "skills_assessment" | "english" | "points" | null;
  /** Subclasses the occupation is on a list for; null/undefined = unknown (not blocking). */
  occupationEligibleSubclasses?: readonly string[] | null;
}): PathwayScoreSet {
  const { estimatedPoints, benchmarks, eoiBlockReason, occupationEligibleSubclasses } = args;
  const out = {} as PathwayScoreSet;
  for (const subclass of PATHWAY_SUBCLASSES) {
    const bonus = NOMINATION_BONUS[subclass];
    const benchmark = benchmarks?.values[subclass] ?? null;
    let blockReason: PathwayBlockReason | null = eoiBlockReason ?? null;
    if (!blockReason && occupationEligibleSubclasses && !occupationEligibleSubclasses.includes(subclass)) {
      blockReason = "occupation";
    }
    out[subclass] = {
      subclass,
      baseScore: estimatedPoints,
      nominationBonus: bonus,
      scoreIfNominated: estimatedPoints + bonus,
      benchmark,
      benchmarkAsOf: benchmarks?.asOf,
      gapBase: benchmark === null ? null : benchmark - estimatedPoints,
      gapIfNominated: benchmark === null ? null : benchmark - (estimatedPoints + bonus),
      isBlocked: blockReason !== null,
      blockReason,
    };
  }
  return out;
}

const T = (locale: Locale, en: string, tr: string, zh: string) => (locale === "tr" ? tr : locale === "zh-Hans" ? zh : en);

/** The one label for a block, used identically in every section. */
export function blockedLabel(reason: PathwayBlockReason, locale: Locale): string {
  switch (reason) {
    case "skills_assessment":
      return T(locale, "Blocked: skills assessment", "Engelli: beceri değerlendirmesi", "受阻：技能评估");
    case "age":
      return T(locale, "Blocked: age limit", "Engelli: yaş sınırı", "受阻：年龄限制");
    case "english":
      return T(locale, "Blocked: English requirement", "Engelli: İngilizce şartı", "受阻：英语要求");
    case "points":
      return T(locale, "Blocked: below 65 points", "Engelli: 65 puanın altında", "受阻：低于65分");
    case "occupation":
      return T(locale, "Blocked: occupation not eligible", "Engelli: meslek uygun değil", "受阻：职业不符合");
  }
}

function nominationKind(subclass: PathwaySubclass, locale: Locale): string {
  return subclass === "190"
    ? T(locale, "a state nomination", "eyalet adaylığı", "州提名")
    : T(locale, "a regional nomination", "bölgesel adaylık", "偏远地区提名");
}

/**
 * The one sentence every section uses to state a pathway's score against the
 * benchmark. Shows BOTH numbers wherever a nomination bonus applies, and always
 * marks the higher one conditional ("only if ... is secured (not secured)").
 */
export function describePathwayScore(score: PathwayScore, locale: Locale): string {
  const { subclass, baseScore, scoreIfNominated, benchmark, gapBase, gapIfNominated, benchmarkAsOf } = score;
  const bench = (() => {
    if (benchmark === null || gapBase === null) {
      return T(
        locale,
        "no recent invitation benchmark is available for this occupation",
        "bu meslek için yakın dönem davet referansı bulunmuyor",
        "该职业暂无近期邀请参考分"
      );
    }
    const asOf = benchmarkAsOf ? ` (${benchmarkAsOf})` : "";
    const short = (n: number) =>
      n > 0
        ? T(locale, `${n} points below`, `${n} puan altında`, `低 ${n} 分`)
        : T(locale, "at or above", "eşit veya üzerinde", "已达到或高于");
    if (score.nominationBonus === 0) {
      return T(
        locale,
        `recent ${subclass} benchmark ${benchmark}${asOf}: ${short(gapBase)}`,
        `yakın dönem ${subclass} referansı ${benchmark}${asOf}: ${short(gapBase)}`,
        `近期 ${subclass} 参考分 ${benchmark}${asOf}：${short(gapBase)}`
      );
    }
    // Already at/above the benchmark on the current score: nothing conditional left to add.
    if (gapBase <= 0) {
      return T(
        locale,
        `recent ${subclass} benchmark ${benchmark}${asOf}: base ${short(gapBase)}`,
        `yakın dönem ${subclass} referansı ${benchmark}${asOf}: temel puan ${short(gapBase)}`,
        `近期 ${subclass} 参考分 ${benchmark}${asOf}：基础分${short(gapBase)}`
      );
    }
    return T(
      locale,
      `recent ${subclass} benchmark ${benchmark}${asOf}: base ${short(gapBase)}; ${short(gapIfNominated ?? gapBase)} only if nominated`,
      `yakın dönem ${subclass} referansı ${benchmark}${asOf}: temel puan ${short(gapBase)}; yalnızca aday gösterilirseniz ${short(gapIfNominated ?? gapBase)}`,
      `近期 ${subclass} 参考分 ${benchmark}${asOf}：基础分${short(gapBase)}；仅在获得提名时${short(gapIfNominated ?? gapBase)}`
    );
  })();

  if (score.nominationBonus === 0) {
    return T(
      locale,
      `Score now ${baseScore}; ${bench}.`,
      `Şu anki puan ${baseScore}; ${bench}.`,
      `当前分数 ${baseScore}；${bench}。`
    );
  }
  return T(
    locale,
    `Score now ${baseScore}; ${scoreIfNominated} only if ${nominationKind(subclass, locale)} is secured (not secured); ${bench}.`,
    `Şu anki puan ${baseScore}; ${scoreIfNominated} yalnızca ${nominationKind(subclass, locale)} alınırsa geçerlidir (henüz alınmadı); ${bench}.`,
    `当前分数 ${baseScore}；仅在获得${nominationKind(subclass, locale)}后为 ${scoreIfNominated}（尚未获得）；${bench}。`
  );
}

/** "(skills assessment missing)" style phrase for the Signal Snapshot status sentence. */
export function blockedReasonPhrase(reason: PathwayBlockReason, locale: Locale): string {
  switch (reason) {
    case "skills_assessment":
      return T(locale, "skills assessment missing", "beceri değerlendirmesi eksik", "缺少技能评估");
    case "age":
      return T(locale, "age limit exceeded", "yaş sınırı aşıldı", "超过年龄上限");
    case "english":
      return T(locale, "English requirement not met", "İngilizce şartı karşılanmadı", "未满足英语要求");
    case "points":
      return T(locale, "below the 65-point minimum", "65 puan asgari şartının altında", "低于65分最低要求");
    case "occupation":
      return T(locale, "occupation not eligible", "meslek uygun değil", "职业不符合资格");
  }
}

/**
 * Friction is measured against the invitation benchmark: a level exists ONLY when a benchmark and a score
 * gap both exist, otherwise the pathway is "not assessed" (never a default LOW/MEDIUM/HIGH/EXTREME).
 * Measured on the CURRENT (base) score -- an unsecured nomination bonus never lowers it.
 */
export function frictionFromScore(score: PathwayScore | undefined): "LOW" | "MEDIUM" | "HIGH" | "EXTREME" | "NOT_ASSESSED" {
  if (!score || score.benchmark === null || score.gapBase === null) return "NOT_ASSESSED";
  const gap = -score.gapBase; // current score minus benchmark (negative = short)
  if (gap < -10) return "EXTREME";
  if (gap >= 0) return "LOW";
  if (gap <= -6) return "HIGH";
  return "MEDIUM";
}
