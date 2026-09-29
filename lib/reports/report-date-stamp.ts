import type { Locale } from "@/lib/readiness/types";

/**
 * Which date a report shows. "recomputed": the current engine changed the stored content (lib/reports/refresh-
 * report.ts), so the report says "Updated to reflect data as of <dataAsOf>" -- the latest dated source behind the
 * change (lib/reports/content-dates.ts), stable across views; otherwise its original generation date.
 */
export type ReportContentStamp = { recomputed: boolean; generatedAt?: string; dataAsOf?: string; dataSources?: string[] };

export function formatReportDate(locale: Locale | string, iso: string): string {
  const tag = locale === "tr" ? "tr-TR" : locale === "zh-Hans" ? "zh-CN" : "en-AU";
  return new Intl.DateTimeFormat(tag, { timeZone: "Australia/Brisbane", year: "numeric", month: "long", day: "numeric" }).format(new Date(iso));
}

/** The one stamp used by the result page and the PDF cover, so both always say the same thing. */
export function reportDateStamp(locale: Locale | string, stamp: ReportContentStamp | undefined): { label: string; date: string; text: string } | null {
  if (!stamp) return null;
  const iso = stamp.recomputed ? stamp.dataAsOf : stamp.generatedAt;
  if (!iso) return null;
  // A date-only ISO string ("2026-09-22") is a calendar date: formatted as such, not shifted by a time zone.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? formatReportDate(locale, `${iso}T12:00:00+10:00`) : formatReportDate(locale, iso);
  if (stamp.recomputed) {
    const label = locale === "tr" ? "Güncelleme" : locale === "zh-Hans" ? "更新" : "Updated";
    const text =
      locale === "tr"
        ? `${date} itibarıyla verilere göre güncellendi`
        : locale === "zh-Hans"
          ? `已根据截至${date}的数据更新`
          : `Updated to reflect data as of ${date}`;
    return { label, date, text };
  }
  const label = locale === "tr" ? "Oluşturulma tarihi" : locale === "zh-Hans" ? "生成日期" : "Generated";
  return { label, date, text: locale === "zh-Hans" ? `${label}：${date}` : `${label} ${date}` };
}
