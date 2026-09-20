import { PATHWAY_SUBCLASSES, type PathwayBlockReason, type PathwayScore, type PathwayScoreSet, type PathwaySubclass } from "./pathway-scores";

/**
 * THE one ranking of the points-tested pathways (189 / 190 / 491), derived only
 * from the PathwayScoreSet. The Visa Viability Ranking, the Signal Snapshot, the
 * lodgement checklist, the Reality Check order and the LLM's recommendations all
 * read this -- nothing else orders pathways or assigns a "fit" label.
 *
 * Fit (unblocked pathways only):
 *   potential_fit  base score is at or above the recent benchmark
 *   unclear_fit    below it on the base score, but at/above it if nominated,
 *                  or there is no benchmark for the occupation
 *   unlikely_fit   below the benchmark even if nominated
 * A blocked pathway is "blocked", whatever its score.
 *
 * Order: unblocked before blocked; then fit; then the smaller base gap to the
 * benchmark (unknown last); then the fixed order 189, 190, 491.
 */
export type PathwayFit = "blocked" | "potential_fit" | "unclear_fit" | "unlikely_fit";

export type RankedPathwayEntry = {
  subclass: PathwaySubclass;
  /** 1 = best. */
  position: number;
  fit: PathwayFit;
  blockReason: PathwayBlockReason | null;
  /** Unblocked and not "unlikely": the only pathways any section may recommend. */
  recommendable: boolean;
  score: PathwayScore;
};

export type PathwayRanking = {
  entries: RankedPathwayEntry[];
  /** True when every pathway is blocked. */
  allBlocked: boolean;
  /** The block reason when every pathway shares the same one, else null. */
  commonBlockReason: PathwayBlockReason | null;
  /** Recommendable subclasses in ranking order. */
  recommendable: PathwaySubclass[];
};

const FIT_RANK: Record<PathwayFit, number> = { potential_fit: 3, unclear_fit: 2, unlikely_fit: 1, blocked: 0 };

function fitOf(score: PathwayScore): PathwayFit {
  if (score.isBlocked) return "blocked";
  if (score.gapBase !== null && score.gapBase <= 0) return "potential_fit";
  if (score.gapIfNominated === null || score.gapIfNominated <= 0) return "unclear_fit";
  return "unlikely_fit";
}

export function rankPathways(scores: PathwayScoreSet): PathwayRanking {
  const items = PATHWAY_SUBCLASSES.map((subclass) => ({ score: scores[subclass], fit: fitOf(scores[subclass]) }));
  items.sort((a, b) => {
    const blockedDiff = Number(a.fit === "blocked") - Number(b.fit === "blocked");
    if (blockedDiff !== 0) return blockedDiff;
    const fitDiff = FIT_RANK[b.fit] - FIT_RANK[a.fit];
    if (fitDiff !== 0) return fitDiff;
    const ga = a.score.gapBase ?? Number.POSITIVE_INFINITY;
    const gb = b.score.gapBase ?? Number.POSITIVE_INFINITY;
    if (ga !== gb) return ga - gb;
    return PATHWAY_SUBCLASSES.indexOf(a.score.subclass) - PATHWAY_SUBCLASSES.indexOf(b.score.subclass);
  });
  const entries: RankedPathwayEntry[] = items.map((item, i) => ({
    subclass: item.score.subclass,
    position: i + 1,
    fit: item.fit,
    blockReason: item.score.blockReason,
    recommendable: item.fit === "potential_fit" || item.fit === "unclear_fit",
    score: item.score,
  }));
  const allBlocked = entries.every((e) => e.fit === "blocked");
  const reasons = new Set(entries.map((e) => e.blockReason));
  return {
    entries,
    allBlocked,
    commonBlockReason: allBlocked && reasons.size === 1 ? entries[0].blockReason : null,
    recommendable: entries.filter((e) => e.recommendable).map((e) => e.subclass),
  };
}

/** Position of a subclass in the ranking (1-based), or null when it is not ranked. */
export function rankPosition(ranking: PathwayRanking, subclass: string): number | null {
  return ranking.entries.find((e) => e.subclass === subclass)?.position ?? null;
}

/**
 * Orders items so that the points-tested pathways (189/190/491) follow the ranking, with everything
 * else (482, 186, 820 ...) after them in its original order. Used by every section that lists pathways.
 */
export function orderBySkilledRanking<T>(items: readonly T[], subclassOf: (item: T) => string, ranking: PathwayRanking | undefined): T[] {
  if (!ranking) return [...items];
  const pos = (item: T): number => rankPosition(ranking, subclassOf(item)) ?? Number.POSITIVE_INFINITY;
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const pa = pos(a.item);
      const pb = pos(b.item);
      if (pa !== pb) return pa - pb;
      return a.index - b.index;
    })
    .map((x) => x.item);
}
