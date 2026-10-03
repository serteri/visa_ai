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
   * Tier 2 of the two-tier status: the score as if the skills assessment were positive (pointsEstimate
   * .potentialPoints). Equals baseScore once an assessment is on file.
   */
  potentialScore?: number;
  /**
   * The score to compare with the subclass's invitation benchmark (from potentialScore, so a pathway blocked only by
   * the skills assessment still gets a realistic roadmap). For 190 and 491 the nomination (+5 / +15) is a
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
  /** pointsEstimate.potentialPoints (Tier 2); defaults to estimatedPoints. */
  potentialPoints?: number;
  benchmarks?: TrendBenchmarks | null;
  /** assessmentState.eoiIneligibilityReason (null/undefined when EOI is not blocked). */
  eoiBlockReason?: "age" | "skills_assessment" | "english" | "points" | null;
  /** Subclasses the occupation is on a list for; null/undefined = unknown (not blocking). */
  occupationEligibleSubclasses?: readonly string[] | null;
}): PathwayScoreSet {
  const { estimatedPoints, benchmarks, eoiBlockReason, occupationEligibleSubclasses } = args;
  const potential = args.potentialPoints ?? estimatedPoints;
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
      potentialScore: potential,
      comparisonScore: potential + bonus,
      comparisonGap: benchmark === null ? null : benchmark - (potential + bonus),
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
  const comparisonScore = score.comparisonScore ?? (score.potentialScore ?? score.baseScore) + score.nominationBonus;
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

  // Tier 2: when a missing skills assessment holds points back, the comparison starts from the potential score.
  const potential = score.potentialScore;
  const now =
    potential !== undefined && potential !== baseScore
      ? T(
          locale,
          `Score now ${baseScore}; potential score with a positive skills assessment ${potential}`,
          `Şu anki puan ${baseScore}; olumlu beceri değerlendirmesiyle potansiyel puan ${potential}`,
          `当前分数 ${baseScore}；获得正面技能评估后的潜在分数 ${potential}`
        )
      : T(locale, `Score now ${baseScore}`, `Şu anki puan ${baseScore}`, `当前分数 ${baseScore}`);
  if (score.nominationBonus === 0) {
    return T(locale, `${now} -- ${versus}.`, `${now} -- ${versus}.`, `${now}——${versus}。`);
  }
  return T(
    locale,
    `${now}; with ${requiredNomination(subclass, locale)}, your score is ${comparisonScore} -- ${versus}.`,
    `${now}; ${requiredNomination(subclass, locale)} puanınız ${comparisonScore} -- ${versus}.`,
    `${now}；${requiredNomination(subclass, locale)}为 ${comparisonScore} 分——${versus}。`
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

const FRICTION_ORDER: FrictionLevel[] = ["LOW", "MEDIUM", "HIGH", "EXTREME"];

/**
 * 190 / 491 friction = the points level (frictionFromScore) raised by nomination availability: the states where the
 * occupation is on that subclass's list AND the program is open for the applicant's location (StateNominationTracker
 * .nominationAvailability). None -> at least HIGH; one or two -> at least MEDIUM (never LOW). 189 and an unknown
 * availability (tracker blocked) keep the points level.
 */
export function frictionWithAvailability(score: PathwayScore | undefined, openStates: readonly string[] | undefined): FrictionLevel {
  const level = frictionFromScore(score);
  if (!score || score.subclass === "189" || !openStates) return level;
  const floor: FrictionLevel | null = openStates.length === 0 ? "HIGH" : openStates.length <= 2 ? "MEDIUM" : null;
  if (!floor) return level;
  if (level === "NOT_ASSESSED") return openStates.length === 0 ? "HIGH" : level;
  return FRICTION_ORDER.indexOf(level) >= FRICTION_ORDER.indexOf(floor) ? level : floor;
}

/**
 * The actual cause of a 190 / 491 friction level when it comes from the nomination-availability floor (frictionWithAvailability)
 * rather than from the points gap: "points meet the recent benchmark; only one state is currently open to you". Null when
 * the level is the points level (the band definition then states the cause) or cannot be determined.
 */
export function frictionCauseText(score: PathwayScore | undefined, level: FrictionLevel, openStates: readonly string[] | undefined, locale: Locale): string | null {
  if (!score || score.subclass === "189" || !openStates || level === "NOT_ASSESSED") return null;
  const pointsLevel = frictionFromScore(score);
  if (pointsLevel === level) return null;
  const gap = comparisonOf(score).comparisonGap;
  const n = openStates.length;
  const list = openStates.join(", ");
  const points =
    gap === null || gap <= 0
      ? T(locale, "points meet the recent benchmark", "puanlar yakın dönem referansını karşılıyor", "分数已达到近期参考分")
      : T(locale, `your score is ${gap} point${gap === 1 ? "" : "s"} below the recent benchmark`, `puanınız yakın dönem referansının ${gap} puan altında`, `您的分数比近期参考分低 ${gap} 分`);
  const availability =
    n === 0
      ? T(locale, `no state or territory is currently open to you for ${score.subclass}`, `şu anda ${score.subclass} için size açık hiçbir eyalet veya bölge yok`, `目前没有任何州或领地对您开放 ${score.subclass}`)
      : n === 1
        ? T(locale, `only one state is currently open to you (${list})`, `şu anda size yalnızca bir eyalet açık (${list})`, `目前仅有一个州对您开放（${list}）`)
        : T(locale, `only two states are currently open to you (${list})`, `şu anda size yalnızca iki eyalet açık (${list})`, `目前仅有两个州对您开放（${list}）`);
  return `${points}${locale === "zh-Hans" ? "；" : "; "}${availability}`;
}

/**
 * The plain statement of nomination availability for a 190 / 491 reality check. Points met -> "Points are not your
 * barrier for 491; securing a nomination is." Always names the states open for the occupation and location, or says
 * that none are.
 */
export function nominationAvailabilitySentence(
  score: PathwayScore,
  openStates: readonly string[],
  locale: Locale,
  /** Open states on the occupation's list left out for this subclass because a stream condition (employment / study in the state) is unmet. */
  blocked: ReadonlyArray<{ code: string; reason: string }> = [],
): string {
  const base = availabilityCore(score, openStates, locale, blocked.length > 0);
  if (blocked.length === 0) return base;
  const list = blocked.map((b) => `${b.code} (${b.reason})`).join(", ");
  return `${base} ${T(locale, `Not available to you for ${score.subclass} on your answers: ${list}.`, `Yanıtlarınıza göre ${score.subclass} için size açık olmayanlar: ${list}.`, `根据您的答案，${score.subclass} 不可用的州：${list}。`)}`;
}

function availabilityCore(score: PathwayScore, openStates: readonly string[], locale: Locale, hasBlocked: boolean): string {
  const sub = score.subclass;
  const gap = comparisonOf(score).comparisonGap;
  const pointsMet = gap !== null && gap <= 0;
  const list = openStates.join(", ");
  if (openStates.length === 0 && hasBlocked) {
    return T(
      locale,
      `No state is currently available to you for ${sub}: the states that list your occupation and are open to your location have a stream condition your answers do not meet -- without a nomination, ${sub} is not available${pointsMet ? ", even though your points meet the benchmark" : ""}.`,
      `Şu anda ${sub} için size açık bir eyalet yok: mesleğinizi listeleyen ve bulunduğunuz yere açık eyaletlerin, yanıtlarınızın karşılamadığı bir akış şartı var -- adaylık olmadan ${sub} mümkün değil${pointsMet ? ", puanınız referansı karşılasa da" : ""}.`,
      `目前没有任何州对您开放 ${sub}：列有您职业且对您所在地开放的州，其类别条件与您的答案不符——没有提名就无法申请 ${sub}${pointsMet ? "，即使您的分数已达到参考分" : ""}。`
    );
  }
  if (openStates.length === 0) {
    return T(
      locale,
      `No state or territory currently has your occupation on its ${sub} list with a program open to applicants in your location -- without a nomination, ${sub} is not available${pointsMet ? ", even though your points meet the benchmark" : ""}.`,
      `Şu anda hiçbir eyalet veya bölge, bulunduğunuz yerdeki başvuru sahiplerine açık bir programda mesleğinizi ${sub} listesinde bulundurmuyor -- adaylık olmadan ${sub} mümkün değil${pointsMet ? ", puanınız referansı karşılasa bile" : ""}.`,
      `目前没有任何州或领地在其 ${sub} 清单中列有您的职业且项目对您所在地的申请人开放——没有提名就无法申请 ${sub}${pointsMet ? "，即使您的分数已达到参考分" : ""}。`
    );
  }
  if (pointsMet) {
    return T(
      locale,
      `Points are not your barrier for ${sub}; securing a nomination is. Currently open for your occupation and location: ${list}.`,
      `${sub} için engeliniz puan değil, adaylık almak. Şu anda mesleğiniz ve bulunduğunuz yer için açık olanlar: ${list}.`,
      `${sub} 的障碍不在分数，而在于获得提名。目前对您的职业和所在地开放的：${list}。`
    );
  }
  return T(
    locale,
    `Currently open for your occupation and location for ${sub}: ${list}.`,
    `${sub} için şu anda mesleğiniz ve bulunduğunuz yer için açık olanlar: ${list}.`,
    `目前对您的职业和所在地开放 ${sub} 提名的：${list}。`
  );
}

/** Lower-case form used by PathwayStrengthComparison.friction. */
export function frictionKey(level: FrictionLevel): "low" | "medium" | "high" | "extreme" | "not_assessed" {
  return level === "NOT_ASSESSED" ? "not_assessed" : (level.toLowerCase() as "low" | "medium" | "high" | "extreme");
}
