/**
 * What a visitor sees BEFORE the report is unlocked: their own details, the points total calculated from their entries, and the titles of the
 * sections the full report contains. Nothing else: no visa, state, fee, scenario or requirement content. It is built on the server and is
 * the only report-derived data that reaches the browser (page source, server-action response) for a locked report; the report itself and the
 * full view are never passed to the client until the report is unlocked.
 */
import type { Locale, ReadinessReport } from "@/lib/readiness/types";
import type { ReportView } from "@/lib/reports/report-view";
import { T, factLabel, tagsFor } from "@/lib/reports/report-text";

export type ReportPreview = {
  title: string;
  detailsTitle: string;
  details: string[];
  pointsTitle: string | null;
  pointsLine: string | null;
  sectionsTitle: string;
  sectionTitles: string[];
  /** The visitor's own points total, for the one-number summary (null when the points table is not applicable). */
  estimatedPoints: number | null;
};

export const previewTitle = (l: Locale) => T(l, "Visa Information Report: preview", "Vize Bilgi Raporu: ön izleme", "签证信息报告：预览");

/** From the full view: the details section's own lines, the points total line and the section titles. The view is discarded by the caller. */
export function buildReportPreview(view: ReportView, estimatedPoints: number | null): ReportPreview {
  const l = view.locale;
  const details = view.sections.find((s) => s.id === "details");
  const detailLines = (details?.blocks ?? []).flatMap((b, i) => (b.kind === "lines" ? b.lines : b.kind === "text" && i === 0 ? [b.text] : []));
  const points = view.sections.find((s) => s.id === "points");
  const pointsLine = points?.blocks.find((b) => b.kind === "text")?.text ?? null;
  return {
    title: previewTitle(l),
    detailsTitle: details?.title ?? T(l, "Your details", "Bilgileriniz", "您的信息"),
    details: detailLines,
    pointsTitle: points?.title ?? null,
    pointsLine: pointsLine && pointsLine.length > 0 ? pointsLine : null,
    sectionsTitle: T(l, "The full report contains these sections", "Tam rapor şu bölümleri içerir", "完整报告包含以下部分"),
    sectionTitles: view.sections.map((s) => s.title),
    estimatedPoints,
  };
}

/** For reports that have no restructured view (partner visas): the entered facts and the section list is not shown. */
export function buildBasicPreview(report: ReadinessReport, locale: Locale): ReportPreview {
  const tags = tagsFor(locale);
  const facts = (report.suppliedFacts ?? []).map((f) => `${factLabel(f.field, locale)}: ${f.value ?? T(locale, "Not provided", "Girilmedi", "未提供")}  [${f.value === null ? tags.unknown : tags.supplied}]`);
  return {
    title: previewTitle(locale),
    detailsTitle: T(locale, "Your details", "Bilgileriniz", "您的信息"),
    details: facts,
    pointsTitle: null,
    pointsLine: null,
    sectionsTitle: T(locale, "The full report contains these sections", "Tam rapor şu bölümleri içerir", "完整报告包含以下部分"),
    sectionTitles: [],
    estimatedPoints: report.pointsEstimate?.estimatedPoints ?? null,
  };
}
