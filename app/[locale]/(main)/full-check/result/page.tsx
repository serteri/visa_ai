import { notFound, redirect } from "next/navigation";

import { getUserReportById } from "@/src/lib/user-reports";
import type { FullCheckQuickPreview } from "../actions";
import { ResultView } from "./result-view";

type FullCheckResultPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ reportId?: string; admin_bypass?: string }>;
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

  // Visual-only admin bypass -- lets the founder inspect a still-locked
  // report's data without paying, but requires the same server-side
  // ADMIN_SECRET already used by resetUserReportLimit (actions.ts), not a
  // bare ?admin_bypass=true boolean anyone could append to any report URL
  // to skip payment entirely. Never mutates is_unlocked.
  const adminSecret = process.env.ADMIN_SECRET?.trim();
  const isAdminBypass = Boolean(
    adminSecret && query.admin_bypass?.trim() === adminSecret
  );

  return (
    <ResultView
      locale={locale}
      reportId={record.id}
      isUnlocked={record.isUnlocked}
      isAdminBypass={isAdminBypass}
      report={record.report}
      previewData={(record.previewData as FullCheckQuickPreview | null) ?? null}
      fullName={record.fullName ?? undefined}
      email={record.email}
    />
  );
}
