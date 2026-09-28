import type { Locale } from "../types";
import { NOMINATION_BONUS, type PathwaySubclass } from "../pathway-scores";

export type InvitationBenchmark = { subclass: string; points: number };

/** The score compared with a subclass's benchmark: 190 / 491 include the nomination that visa requires. */
export function comparisonScoreFor(subclass: string, estimatedPoints: number): number {
  return estimatedPoints + (NOMINATION_BONUS[subclass as PathwaySubclass] ?? 0);
}

/**
 * AU: 65 is only the legal minimum to lodge an EOI; invitations have recently needed more. Every place that says a
 * score meets or exceeds 65 appends this sentence, which lists each subclass's recent invitation benchmark and how
 * far the score is from it. For 190 and 491 the score includes the nomination those visas require, and says so.
 */
export function benchmarkGapSentence(locale: Locale, estimatedPoints: number, benchmarks: readonly InvitationBenchmark[] | undefined): string {
  if (!benchmarks || benchmarks.length === 0) return "";
  const sorted = [...benchmarks].sort((a, b) => Number(a.subclass) - Number(b.subclass));
  const parts = sorted.map(({ subclass, points }) => {
    const score = comparisonScoreFor(subclass, estimatedPoints);
    const gap = points - score;
    const withNom = score !== estimatedPoints;
    if (locale === "tr") {
      const status = gap > 0 ? `${gap} puan eksik` : "karşılanıyor";
      return withNom ? `${subclass}: ${points} (zorunlu adaylıkla puanınız ${score}: ${status})` : `${subclass}: ${points} (${status})`;
    }
    if (locale === "zh-Hans") {
      const status = gap > 0 ? `差 ${gap} 分` : "已达到";
      return withNom ? `${subclass}：${points} 分（计入必需提名后您的分数为 ${score}：${status}）` : `${subclass}：${points} 分（${status}）`;
    }
    const status = gap > 0 ? `${gap} points short` : "met";
    return withNom ? `${subclass}: ${points} (with its required nomination your score is ${score}: ${status})` : `${subclass}: ${points} (${status})`;
  });
  if (locale === "tr") return `Yakın dönem davet referans puanları -- ${parts.join("; ")}.`;
  if (locale === "zh-Hans") return `近期邀请参考分——${parts.join("；")}。`;
  return `Recent invitation benchmarks -- ${parts.join("; ")}.`;
}

/** Points still needed to reach the closest recent benchmark (0 when at/above; undefined without benchmarks). */
export function closestBenchmarkGap(estimatedPoints: number, benchmarks: readonly InvitationBenchmark[] | undefined): number | undefined {
  if (!benchmarks || benchmarks.length === 0) return undefined;
  return Math.max(0, Math.min(...benchmarks.map((b) => b.points - comparisonScoreFor(b.subclass, estimatedPoints))));
}
