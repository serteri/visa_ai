"use client";

import { Download, ShieldAlert } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PremiumFeatureGate } from "@/components/premium-feature-gate";
import type { ReportHeader } from "@/lib/reports/report-header";
import { ProfessionalHelp, ResearchLinks } from "@/components/research-links";
import { researchLinks, researchText } from "@/lib/marketing/research-journey";

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
  country?: string;
};

/**
 * The result page shows no report content, for any user (owner, admin, free beta): a header, then either the PDF download (after payment) or the
 * purchase button (before). The report sections, tables, points, fees, states and requirements are in the PDF only.
 */
export function ResultView({ locale, reportId, isUnlocked, isAdminBypass, downloadHref, header, fullName, email, paidCheckoutEnabled = true, country = "AU" }: ResultViewProps) {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const downloadText = isTr ? "PDF'yi indir" : isZh ? "下载 PDF" : "Download PDF";
  const emailedText = isTr ? "Bu sayfaya dönmek için güvenli rapor bağlantınızı saklayın." : isZh ? "请保留安全报告链接，以便返回此页面。" : "Keep your secure report link to return to this page.";
  const text = (en: string, tr: string, zh: string) => researchText(locale, en, tr, zh);
  const continuation = country === "AU" ? (
    <div data-assessment-continuation className="space-y-6">
      <ResearchLinks
        locale={locale}
        links={[
          ...researchLinks(locale),
          { label: text("State nomination data", "Eyalet adaylık verileri", "州提名数据"), path: "/tools/state-nomination", destination: "state_nomination" },
        ]}
      />
      <ProfessionalHelp locale={locale} />
    </div>
  ) : null;
  const readingGuide = (
    <aside data-report-reading-guide className="rounded-xl border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-600">
      <h2 className="font-semibold text-slate-900">{text("How to read your report", "Raporunuzu nasıl okuyacaksınız?", "如何阅读报告")}</h2>
      <dl className="mt-4 space-y-3">
        {[
          [text("Your entries", "Girdileriniz", "您的填写"), text("The details section records what you supplied and what was not provided. These are not verified facts.", "Bilgiler bölümü girdiklerinizi ve belirtilmeyenleri kaydeder. Bunlar doğrulanmış bilgiler değildir.", "个人信息部分记录已填写及未提供的内容。这些内容未经核实。")],
          [text("General research information", "Genel araştırma bilgileri", "一般研究信息"), text("Visa information and any points arithmetic are research references, not an individual assessment or recommendation.", "Vize bilgileri ve puan aritmetiği araştırma kaynaklarıdır; bireysel değerlendirme veya öneri değildir.", "签证信息及积分计算用于研究参考，不构成个人评估或推荐。")],
          [text("Sources and dates", "Kaynaklar ve tarihler", "来源与日期"), text("Follow the original references in the PDF and check the current published information.", "PDF'deki asıl kaynakları takip edin ve güncel yayımlanmış bilgileri kontrol edin.", "请查阅 PDF 中的原始参考资料并核实最新公开信息。")],
          [text("Professional verification", "Profesyonel doğrulama", "专业核实"), text("Occupation fit, evidence, assessment requirements and individual visa questions need verification by the appropriate authority or an authorised professional.", "Meslek eşleşmesi, belgeler, değerlendirme koşulları ve kişisel vize soruları ilgili kurum veya yetkili uzman tarafından doğrulanmalıdır.", "职业匹配、证明材料、评估要求及个人签证问题需由相关机构或获授权专业人士核实。")],
        ].map(([label, description]) => <div key={label}><dt className="font-medium text-slate-900">{label}</dt><dd>{description}</dd></div>)}
      </dl>
    </aside>
  );

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
        {readingGuide}
        {continuation}
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
      {readingGuide}
      {continuation}
    </main>
  );
}
