import type { Locale } from "../types";

export type InvitationBenchmark = { subclass: string; points: number };

/**
 * AU: 65 is only the legal minimum to lodge an EOI; invitations have recently needed more. Every place that says a
 * score meets or exceeds 65 appends this sentence, which lists each subclass's recent invitation benchmark and how
 * far the current estimate is from it -- never "meets the threshold" on its own.
 */
export function benchmarkGapSentence(locale: Locale, estimatedPoints: number, benchmarks: readonly InvitationBenchmark[] | undefined): string {
  if (!benchmarks || benchmarks.length === 0) return "";
  const sorted = [...benchmarks].sort((a, b) => Number(a.subclass) - Number(b.subclass));
  const parts = sorted.map(({ subclass, points }) => {
    const gap = points - estimatedPoints;
    if (locale === "tr") return `${subclass}: ${points} (${gap > 0 ? `${gap} puan eksik` : "karşılanıyor"})`;
    if (locale === "zh-Hans") return `${subclass}：${points} 分（${gap > 0 ? `差 ${gap} 分` : "已达到"}）`;
    return `${subclass}: ${points} (${gap > 0 ? `${gap} points short` : "met"})`;
  });
  if (locale === "tr") return `Yakın dönem davet referans puanları -- ${parts.join("; ")}.`;
  if (locale === "zh-Hans") return `近期邀请参考分——${parts.join("；")}。`;
  return `Recent invitation benchmarks -- ${parts.join("; ")}.`;
}

/** Points still needed to reach the LOWEST recent benchmark (0 when at/above it; undefined without benchmarks). */
export function closestBenchmarkGap(estimatedPoints: number, benchmarks: readonly InvitationBenchmark[] | undefined): number | undefined {
  if (!benchmarks || benchmarks.length === 0) return undefined;
  return Math.max(0, Math.min(...benchmarks.map((b) => b.points)) - estimatedPoints);
}
