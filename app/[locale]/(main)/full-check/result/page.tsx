import { notFound, redirect } from "next/navigation";

import { getUserReportById } from "@/src/lib/user-reports";
import { canAccessReport, reportAccessToken, reportPdfPath } from "@/lib/reports/report-access";
import { getReportRequester } from "@/lib/reports/report-access-server";
import { refreshStoredReport } from "@/lib/reports/refresh-report";
import { reportDateStamp } from "@/lib/reports/report-date-stamp";
import { buildReportHeader } from "@/lib/reports/report-header";
import { isPaidReportCheckoutEnabled } from "@/lib/readiness/paid-checkout";
import { ReportAccessRequired } from "./report-access-required";
import { ResultView } from "./result-view";

export const dynamic = "force-dynamic";

type FullCheckResultPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ reportId?: string; t?: string }>;
};

export default async function FullCheckResultPage({
  params,
  searchParams,
}: FullCheckResultPageProps) {
  const { locale } = await params;
  const query = await searchParams;
  const reportId = query.reportId?.trim();

  // No reportId at all means there's nothing to look up -- send the visitor
  // to start a new check. This is NOT the bug being fixed: the bug was
  // redirecting AWAY from a valid reportId regardless of its unlock state.
  if (!reportId) {
    redirect(`/${locale}/full-check`);
  }

  const record = await getUserReportById(reportId);
  if (!record) {
    notFound();
  }

  // The report (and its owner's email) reaches the browser only for an authorized requester: an admin session, the
  // report's access token (?t=, in the emailed link), or a signed-in owner -- lib/reports/report-access.ts. The old
  // ?admin_bypass=<ADMIN_SECRET> query parameter (a secret in a URL) is replaced by the admin session.
  const requester = await getReportRequester();
  const token = query.t?.trim();
  if (!canAccessReport({ requester, reportId: record.id, reportEmail: record.email, token })) {
    return <ReportAccessRequired locale={locale} reportId={record.id} />;
  }

  const accessToken = token || reportAccessToken(record.id);
  const viewLocale = locale === "tr" ? "tr" : locale === "zh-Hans" ? "zh-Hans" : "en";
  // The website shows no report content, for anyone (owner, admin, free-beta): only this header. The report itself is never read into the page; the PDF
  // (lib/reports/report-header.ts, scripts/test-result-page-minimal.ts) is the only place it appears.
  // The same refresh as the PDF, only to get the same date stamp as the PDF cover; the refreshed report itself is not used again.
  const refreshed = await refreshStoredReport(record.report, record.input, { generatedAt: record.createdAt });
  const header = buildReportHeader({ report: refreshed.report, locale: viewLocale, fullName: record.fullName, createdAt: record.createdAt, dateText: reportDateStamp(viewLocale, refreshed.stamp)?.text });
  return (
    <ResultView
      locale={locale}
      reportId={record.id}
      isUnlocked={record.isUnlocked}
      isAdminBypass={requester.isAdmin && !record.isUnlocked}
      downloadHref={record.isUnlocked || requester.isAdmin ? reportPdfPath(record.id, accessToken) : null}
      header={header}
      fullName={record.fullName ?? undefined}
      email={record.email}
      paidCheckoutEnabled={isPaidReportCheckoutEnabled()}
    />
  );
}
