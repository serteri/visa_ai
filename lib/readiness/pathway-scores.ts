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
  /**
   * The score to compare with the subclass's invitation benchmark. For 190 and 491 the nomination (+5 / +15) is a
   * precondition of the visa, not an optional booster, so it is included; 189 has none (= baseScore).
   */
  comparisonScore?: number;
  /** benchmark - comparisonScore (<= 0: at or above the benchmark); null without a benchmark. */
  comparisonGap?: number | null;
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
      comparisonScore: estimatedPoints + bonus,
      comparisonGap: benchmark === null ? null : benchmark - (estimatedPoints + bonus),
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

/** comparisonScore / comparisonGap, derived for scores saved before those fields existed (stored reports). */
export function comparisonOf(score: PathwayScore): { comparisonScore: number; comparisonGap: number | null } {
  const comparisonScore = score.comparisonScore ?? score.baseScore + score.nominationBonus;
  const comparisonGap = score.comparisonGap !== undefined ? score.comparisonGap : score.benchmark === null ? null : score.benchmark - comparisonScore;
  return { comparisonScore, comparisonGap };
}

function requiredNomination(subclass: PathwaySubclass, locale: Locale): string {
  return subclass === "190"
    ? T(locale, "the state nomination required for 190", "190 için zorunlu eyalet adaylığıyla", "加上 190 必需的州提名后")
    : T(
        locale,
        "the regional nomination or sponsorship required for 491",
        "491 için zorunlu bölgesel adaylık veya sponsorlukla",
        "加上 491 必需的偏远地区提名或担保后"
      );
}

/**
 * The one sentence every section uses to state a pathway's score against the benchmark. For 190 and 491 the
 * comparison uses the score WITH the nomination that visa requires (comparisonScore) and says so: "Score now 70;
 * with the regional nomination or sponsorship required for 491, your score is 85 -- above the recent 491 benchmark
 * of 75 (2026-04-30)." 189 compares the current score.
 */
export function describePathwayScore(score: PathwayScore, locale: Locale): string {
  const { subclass, baseScore, benchmark, benchmarkAsOf } = score;
  const { comparisonScore, comparisonGap } = comparisonOf(score);
  const asOf = benchmarkAsOf ? ` (${benchmarkAsOf})` : "";
  const versus = (() => {
    if (benchmark === null || comparisonGap === null) {
      return T(
        locale,
        "no recent invitation benchmark is available for this occupation",
        "bu meslek için yakın dönem davet referansı bulunmuyor",
        "该职业暂无近期邀请参考分"
      );
    }
    if (comparisonGap < 0) {
      return T(
        locale,
        `above the recent ${subclass} benchmark of ${benchmark}${asOf}`,
        `yakın dönem ${subclass} referansı ${benchmark}${asOf} üzerinde`,
        `高于近期 ${subclass} 参考分 ${benchmark}${asOf}`
      );
    }
    if (comparisonGap === 0) {
      return T(
        locale,
        `equal to the recent ${subclass} benchmark of ${benchmark}${asOf}`,
        `yakın dönem ${subclass} referansı ${benchmark}${asOf} ile eşit`,
        `等于近期 ${subclass} 参考分 ${benchmark}${asOf}`
      );
    }
    return T(
      locale,
      `${comparisonGap} points below the recent ${subclass} benchmark of ${benchmark}${asOf}`,
      `yakın dönem ${subclass} referansı ${benchmark}${asOf} değerinin ${comparisonGap} puan altında`,
      `比近期 ${subclass} 参考分 ${benchmark}${asOf} 低 ${comparisonGap} 分`
    );
  })();

  if (score.nominationBonus === 0) {
    return T(locale, `Score now ${baseScore} -- ${versus}.`, `Şu anki puan ${baseScore} -- ${versus}.`, `当前分数 ${baseScore}——${versus}。`);
  }
  return T(
    locale,
    `Score now ${baseScore}; with ${requiredNomination(subclass, locale)}, your score is ${comparisonScore} -- ${versus}.`,
    `Şu anki puan ${baseScore}; ${requiredNomination(subclass, locale)} puanınız ${comparisonScore} -- ${versus}.`,
    `当前分数 ${baseScore}；${requiredNomination(subclass, locale)}为 ${comparisonScore} 分——${versus}。`
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
 * THE friction thresholds -- the only place they are defined. Friction is measured on the points the
 * applicant is SHORT of the recent invitation benchmark on the pathway's comparison score (comparisonGap: the
 * current score, plus the nomination 190 / 491 require):
 *
 *   gapBase <= 0        LOW       at or above the benchmark
 *   1  ..  15           MEDIUM    moderate gap
 *   16 ..  25           HIGH      meaningful gap
 *   more than 25        EXTREME   substantial gap
 *
 * (MEDIUM covers the whole "small to moderate" range: with four levels there is no separate "low-medium",
 * and LOW is reserved for "meets the benchmark" as its definition says.)
 */
export const FRICTION_MAX_GAP = { LOW: 0, MEDIUM: 15, HIGH: 25 } as const;

export type FrictionLevel = "LOW" | "MEDIUM" | "HIGH" | "EXTREME" | "NOT_ASSESSED";

/**
 * A level exists ONLY when a benchmark and a score gap both exist, otherwise the pathway is "not assessed"
 * (never a default). Nothing else -- no static per-pathway table, no experience-deduction bump -- changes it.
 */
export function frictionFromScore(score: PathwayScore | undefined): FrictionLevel {
  const gap = score ? comparisonOf(score).comparisonGap : null;
  // Points short of the benchmark on the pathway's comparison score (190/491 include their required nomination).
  if (!score || score.benchmark === null || gap === null) return "NOT_ASSESSED";
  if (gap <= FRICTION_MAX_GAP.LOW) return "LOW";
  if (gap <= FRICTION_MAX_GAP.MEDIUM) return "MEDIUM";
  if (gap <= FRICTION_MAX_GAP.HIGH) return "HIGH";
  return "EXTREME";
}

/** Lower-case form used by PathwayStrengthComparison.friction. */
export function frictionKey(level: FrictionLevel): "low" | "medium" | "high" | "extreme" | "not_assessed" {
  return level === "NOT_ASSESSED" ? "not_assessed" : (level.toLowerCase() as "low" | "medium" | "high" | "extreme");
}
