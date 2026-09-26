import { notFound, redirect } from "next/navigation";

import { getUserReportById } from "@/src/lib/user-reports";
import { canAccessReport, reportAccessToken, reportPdfPath } from "@/lib/reports/report-access";
import { getReportRequester } from "@/lib/reports/report-access-server";
import type { FullCheckQuickPreview } from "../actions";
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
  return (
    <ResultView
      locale={locale}
      reportId={record.id}
      isUnlocked={record.isUnlocked}
      isAdminBypass={requester.isAdmin && !record.isUnlocked}
      downloadHref={record.isUnlocked ? reportPdfPath(record.id, accessToken) : null}
      report={record.report}
      previewData={(record.previewData as FullCheckQuickPreview | null) ?? null}
      fullName={record.fullName ?? undefined}
      email={record.email}
    />
  );
}
