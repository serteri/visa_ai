import type { Locale } from "@/lib/readiness/types";

/**
 * Which date a report shows. "recomputed": the current engine changed the stored content (lib/reports/refresh-
 * report.ts), so the report says "Last updated <that date>"; otherwise it shows its original generation date.
 */
export type ReportContentStamp = { recomputed: boolean; generatedAt?: string; updatedAt?: string };

export function formatReportDate(locale: Locale | string, iso: string): string {
  const tag = locale === "tr" ? "tr-TR" : locale === "zh-Hans" ? "zh-CN" : "en-AU";
  return new Intl.DateTimeFormat(tag, { timeZone: "Australia/Brisbane", year: "numeric", month: "long", day: "numeric" }).format(new Date(iso));
}

/** The one stamp used by the result page and the PDF cover, so both always say the same thing. */
export function reportDateStamp(locale: Locale | string, stamp: ReportContentStamp | undefined): { label: string; date: string; text: string } | null {
  if (!stamp) return null;
  const iso = stamp.recomputed ? stamp.updatedAt : stamp.generatedAt;
  if (!iso) return null;
  const label = stamp.recomputed
    ? locale === "tr" ? "Son güncelleme" : locale === "zh-Hans" ? "最后更新" : "Last updated"
    : locale === "tr" ? "Oluşturulma tarihi" : locale === "zh-Hans" ? "生成日期" : "Generated";
  const date = formatReportDate(locale, iso);
  return { label, date, text: locale === "zh-Hans" ? `${label}：${date}` : `${label} ${date}` };
}
