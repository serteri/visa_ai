/**
 * The ONLY report-derived data the website shows (result page, the form's answer, the server-action responses): the report title, the applicant's name,
 * the generated date, the target visa the visitor chose, and one "ready" line. No section, table, points, fee, state or requirement ever reaches the
 * browser; the PDF is the only place the content appears (scripts/test-result-page-minimal.ts).
 */
import { targetVisaName, targetVisaOf } from "@/lib/readiness/target-visa";
import type { Locale, ReadinessReport } from "@/lib/readiness/types";
import { formatReportDate } from "@/lib/reports/report-date-stamp";
import { T } from "@/lib/reports/report-text";
import { toDisplayCase } from "@/lib/reports/report-view";

export type ReportHeader = {
  title: string;
  /** The applicant's name ("" when none was given). */
  name: string;
  /** "Generated <date>" (the report's creation date, same wording as the PDF cover). */
  dateText: string;
  /** "Target visa: <the visa the visitor chose>". */
  targetLine: string;
  /** "Your Visa Information Report is ready". */
  readyLine: string;
};

export function buildReportHeader(args: { report: Pick<ReadinessReport, "targetVisa">; locale: Locale; fullName?: string | null; createdAt?: string | Date | null;
  /** The report's own date stamp text, when the caller has it ("Updated to reflect data as of ..." / "Generated ...", the PDF cover's text); default: "Generated <createdAt>". */
  dateText?: string | null;
}): ReportHeader {
  const l = args.locale;
  const iso = args.createdAt ? new Date(args.createdAt).toISOString() : new Date().toISOString();
  const date = formatReportDate(l, iso);
  const target = targetVisaOf({ targetVisa: args.report.targetVisa });
  return {
    title: T(l, "LogiVisa Visa Information Report", "LogiVisa Vize Bilgi Raporu", "LogiVisa 签证信息报告"),
    name: args.fullName ? toDisplayCase(args.fullName) : "",
    dateText: args.dateText || (l === "tr" ? `Oluşturulma tarihi ${date}` : l === "zh-Hans" ? `生成日期：${date}` : `Generated ${date}`),
    targetLine: `${T(l, "Target visa", "Hedef vize", "目标签证")}: ${targetVisaName(target, l)}`,
    readyLine: T(l, "Your Visa Information Report is ready", "Vize Bilgi Raporunuz hazır", "您的签证信息报告已生成"),
  };
}

/** After payment on the result page. */
export const downloadLabel = (l: Locale) => T(l, "Download PDF", "PDF'yi indir", "下载 PDF");
export const emailedLine = (l: Locale) => T(l, "We also emailed you a link", "Size ayrıca bir bağlantı e-postayla gönderdik", "我们也已将链接发送到您的邮箱");
