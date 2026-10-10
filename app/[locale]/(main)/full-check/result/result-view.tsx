"use client";

import { Download, ShieldAlert } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PremiumFeatureGate } from "@/components/premium-feature-gate";
import type { ReportHeader } from "@/lib/reports/report-header";

type ResultViewProps = {
  locale: string;
  reportId: string;
  isUnlocked: boolean;
  /** An admin session looking at a report that is not unlocked. */
  isAdminBypass: boolean;
  /** The PDF route link with the report's access token (issued by the server page); null for a visitor whose report is not unlocked. */
  downloadHref: string | null;
  /** The only report-derived data on this page: title, name, date, target visa (lib/reports/report-header.ts). */
  header: ReportHeader;
  fullName?: string;
  email: string;
  /** Server-side paid-checkout flag (lib/readiness/paid-checkout.ts); anything but true is the free beta. */
  paidCheckoutEnabled?: boolean;
};

/**
 * The result page shows no report content, for any user (owner, admin, free beta): a header, then either the PDF download (after payment) or the
 * purchase button (before). The report sections, tables, points, fees, states and requirements are in the PDF only.
 */
export function ResultView({ locale, reportId, isUnlocked, isAdminBypass, downloadHref, header, fullName, email, paidCheckoutEnabled = true }: ResultViewProps) {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const downloadText = isTr ? "PDF'yi indir" : isZh ? "下载 PDF" : "Download PDF";
  const emailedText = isTr ? "Size ayrıca bir bağlantı e-postayla gönderdik" : isZh ? "我们也已将链接发送到您的邮箱" : "We also emailed you a link";

  if (!isUnlocked) {
    return (
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-10">
        {isAdminBypass && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <ShieldAlert className="size-4 shrink-0" />
            <p>{isTr ? "Admin oturumu -- bu rapor henüz açılmadı." : isZh ? "管理员会话 -- 此报告尚未解锁。" : "Admin session -- this report has not been unlocked."}</p>
          </div>
        )}
        <PremiumFeatureGate
          paidCheckoutEnabled={paidCheckoutEnabled}
          locale={locale}
          reportId={reportId}
          header={header}
          defaultEmail={email}
          defaultName={fullName}
          onUnlocked={() => {
            window.location.reload();
          }}
        />
        {isAdminBypass && downloadHref ? (
          <a href={downloadHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-[#53917E] underline" data-testid="admin-pdf-link">
            <Download className="size-4" />
            {downloadText} (admin)
          </a>
        ) : null}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-10" data-result-page="minimal">
      <Card data-section="cover">
        <CardHeader className="space-y-1">
          <CardTitle>{header.title}</CardTitle>
          {header.name ? <p className="text-base font-medium">{header.name}</p> : null}
          <p className="text-xs text-muted-foreground" data-report-date-stamp>
            {header.dateText}
          </p>
          <p className="text-sm font-semibold" data-target-line>
            {header.targetLine}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-base font-semibold" data-report-ready>
            {header.readyLine}
          </p>
          {downloadHref ? (
            <a
              href={downloadHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-[#53917E] px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:opacity-90"
              data-testid="download-pdf"
            >
              <Download className="size-4" />
              {downloadText}
            </a>
          ) : null}
          <p className="text-xs text-slate-700" data-emailed-link>
            {emailedText}
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
