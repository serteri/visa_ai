"use client";

import { Download, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PremiumFeatureGate } from "@/components/premium-feature-gate";
import type { FullCheckQuickPreview } from "../actions";
import type { ReadinessReport } from "@/lib/readiness/types";

type ResultViewProps = {
  locale: string;
  reportId: string;
  isUnlocked: boolean;
  isAdminBypass: boolean;
  report: ReadinessReport;
  previewData: FullCheckQuickPreview | null;
  fullName?: string;
  email: string;
};

export function ResultView({
  locale,
  reportId,
  isUnlocked,
  isAdminBypass,
  report,
  previewData,
  fullName,
  email,
}: ResultViewProps) {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const showFullView = isUnlocked || isAdminBypass;

  const estimatedPoints =
    report.pointsBoosterSimulator?.currentEstimate ?? report.pointsEstimate?.estimatedPoints;
  const pathways = report.pathwayComparison?.slice(0, 5) ?? [];

  if (showFullView) {
    return (
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        {isAdminBypass && !isUnlocked && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <ShieldAlert className="size-4 shrink-0" />
            <p>
              {isTr ? (
                <>Admin önizlemesi -- bu rapor henüz ödenmedi/açılmadı. Veriler yalnızca inceleme amaçlıdır; rapor gerçekten açılana kadar PDF indirme kullanılamaz.</>
              ) : isZh ? (
                <>管理员预览 -- 此报告尚未付款/解锁。数据仅供查看；在报告真正解锁之前无法下载 PDF。</>
              ) : (
                <>Admin preview -- this report has <strong>not</strong> been paid/unlocked. Data is
                shown for inspection only; PDF download is not available until it&rsquo;s actually
                unlocked.</>
              )}
            </p>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>
                {isTr ? "Tam Hazırlık Raporunuz" : isZh ? "您的完整准备度报告" : "Your Full Readiness Report"}
              </CardTitle>
              <Badge variant="secondary">
                {isTr ? "Premium" : isZh ? "高级版" : "Premium"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-slate-200 bg-white shadow-sm px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {isTr ? "Tahmini puan" : isZh ? "预估积分" : "Estimated points"}
              </p>
              <p className="mt-1 text-2xl font-bold text-emerald-700">{estimatedPoints ?? "-"}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">
                {isTr ? "Vize yolu karşılaştırması" : isZh ? "签证路径比较" : "Pathway comparison"}
              </p>
              <div className="grid gap-2">
                {pathways.map((item) => (
                  <div key={`${item.subclass}-${item.visaName}`} className="rounded-md border border-slate-200 bg-white shadow-sm px-3 py-2">
                    <p className="text-sm font-medium">{item.visaName} ({item.subclass})</p>
                    <p className="text-xs text-muted-foreground">{item.reason}</p>
                  </div>
                ))}
              </div>
            </div>

            {isUnlocked ? (
              <a
                href={`/api/reports/${reportId}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#53917E] px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:opacity-90"
              >
                <Download className="size-4" />
                {isTr ? "Raporu İndir" : isZh ? "下载报告" : "Download Report"}
              </a>
            ) : (
              <Button disabled className="opacity-60">
                <Download className="size-4" />
                {isTr ? "Rapor kilitli" : isZh ? "报告已锁定" : "Report is locked"}
              </Button>
            )}
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <PremiumFeatureGate
        locale={locale}
        reportId={reportId}
        preview={
          previewData ?? {
            estimatedPoints,
            pathways: pathways.map((p) => ({
              subclass: p.subclass,
              visaName: p.visaName,
              confidenceLevel: p.confidenceLevel,
              reason: p.reason,
            })),
          }
        }
        defaultEmail={email}
        defaultName={fullName}
        onUnlocked={() => {
          window.location.reload();
        }}
      />
    </main>
  );
}
