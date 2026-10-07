"use client";

import { Download, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PremiumFeatureGate } from "@/components/premium-feature-gate";
import type { FullCheckQuickPreview } from "../actions";
import type { ReadinessReport } from "@/lib/readiness/types";
import { boosterRows, stateRows } from "@/lib/reports/report-view-model";
import { gateSectionTitle, gateSummaryText, reportedGateVisas } from "@/lib/readiness/visa-gate-text";
import type { ReportView } from "@/lib/reports/report-view";

type ResultViewProps = {
  locale: string;
  reportId: string;
  isUnlocked: boolean;
  isAdminBypass: boolean;
  /** The PDF route link with the report's access token (issued by the server page); null while locked. */
  downloadHref: string | null;
  report: ReadinessReport;
  previewData: FullCheckQuickPreview | null;
  fullName?: string;
  email: string;
  /** "Last updated <date>" when the content was recomputed, otherwise "Generated <date>" (same text as the PDF). */
  dateStamp?: string | null;
  /**
   * The restructured customer report (lib/reports/report-view.ts), the same data the PDF is drawn from; null for the
   * reports that keep their own layout (Canada, partner visas).
   */
  view?: ReportView | null;
  /** Server-side paid-checkout flag (lib/readiness/paid-checkout.ts); anything but true is the free beta. */
  paidCheckoutEnabled?: boolean;
};

export function ResultView({
  locale,
  reportId,
  isUnlocked,
  isAdminBypass,
  downloadHref,
  report,
  previewData,
  fullName,
  email,
  dateStamp,
  view,
  paidCheckoutEnabled = false,
}: ResultViewProps) {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const showFullView = isUnlocked || isAdminBypass;

  const estimatedPoints =
    report.pointsBoosterSimulator?.currentEstimate ?? report.pointsEstimate?.estimatedPoints;
  const pathways = report.pathwayComparison?.slice(0, 5) ?? [];
  const states = stateRows(report);
  const booster = boosterRows(report);

  if (showFullView && view) {
    return <RestructuredReport view={view} locale={locale} isUnlocked={isUnlocked} isAdminBypass={isAdminBypass} downloadHref={downloadHref} dateStamp={dateStamp} />;
  }

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
                {paidCheckoutEnabled ? (isTr ? "Premium" : isZh ? "高级版" : "Premium") : isTr ? "Ücretsiz beta" : isZh ? "免费测试版" : "Free beta"}
              </Badge>
            </div>
            {dateStamp ? (
              <p className="text-xs text-muted-foreground" data-report-date-stamp>
                {dateStamp}
              </p>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            {report.visaGates ? (
              <div className="space-y-2 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm" data-visa-gates>
                <p className="font-semibold">{gateSectionTitle(locale === "tr" ? "tr" : locale === "zh-Hans" ? "zh-Hans" : "en")}</p>
                <ul className="list-disc space-y-1 pl-5 text-xs">
                  {reportedGateVisas(report.pathwayComparison ?? []).map((v) =>
                    report.visaGates?.[v] ? (
                      <li key={v} data-gate-visa={v} data-gate-status={report.visaGates[v].status}>
                        {gateSummaryText(report.visaGates[v], locale === "tr" ? "tr" : locale === "zh-Hans" ? "zh-Hans" : "en")}
                      </li>
                    ) : null
                  )}
                </ul>
              </div>
            ) : null}
            {report.twoTierStatus ? (
              <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm" data-two-tier>
                <p className="font-semibold">{report.twoTierStatus.heading}</p>
                <p data-two-tier-tier1>
                  <span className="font-medium">{report.twoTierStatus.tier1Label}:</span> {report.twoTierStatus.tier1}
                </p>
                <p data-two-tier-tier2>
                  <span className="font-medium">{report.twoTierStatus.tier2Label}:</span> {report.twoTierStatus.tier2}
                </p>
                <p className="text-xs text-muted-foreground">{report.twoTierStatus.explanation}</p>
                <ul className="list-disc space-y-1 pl-5 text-xs">
                  {report.twoTierStatus.comparisons.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            ) : null}
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

            {states.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {isTr ? "Eyalet adaylığı takibi" : isZh ? "州担保追踪" : "State nomination tracker"}
                </p>
                <div className="overflow-hidden rounded-md border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">{isTr ? "Eyalet" : isZh ? "州" : "State"}</th>
                        <th className="px-3 py-2">{isTr ? "Durum" : isZh ? "状态" : "Status"}</th>
                        <th className="px-3 py-2 text-right">{isTr ? "Uyum" : isZh ? "匹配度" : "Match"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {states.map((st) => (
                        <tr key={st.code} className="border-t border-slate-100" data-state-code={st.code} data-state-status={st.status} data-state-score={st.score}>
                          <td className="px-3 py-2">{st.code} -- {st.name}</td>
                          <td className="px-3 py-2">{st.status}</td>
                          <td className="px-3 py-2 text-right">{st.score}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {booster.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {isTr ? "Puan Artırma Simülatörü" : isZh ? "积分提升模拟器" : "Points Booster Simulator"}
                </p>
                <div className="overflow-hidden rounded-md border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">{isTr ? "Senaryo" : isZh ? "情景" : "Scenario"}</th>
                        <th className="px-3 py-2 text-right">{isTr ? "Puan değişimi" : isZh ? "分数变化" : "Points change"}</th>
                        <th className="px-3 py-2 text-right">{isTr ? "Yeni toplam" : isZh ? "新总分" : "New total"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {booster.map((row, i) => (
                        <tr
                          key={`${i}-${row.label}`}
                          className={`border-t border-slate-100 ${row.isCombined ? "bg-emerald-50/40" : ""}`}
                          data-booster-label={row.label}
                          data-booster-change={Number.isFinite(row.estimatedChange) ? row.estimatedChange : ""}
                          data-booster-total={Number.isFinite(row.resultingEstimate) ? row.resultingEstimate : ""}
                        >
                          <td className="px-3 py-2">{row.label}{row.isCombined ? " ★" : ""}</td>
                          <td className="px-3 py-2 text-right">
                            {Number.isFinite(row.estimatedChange) ? (row.estimatedChange >= 0 ? `+${row.estimatedChange}` : `${row.estimatedChange}`) : "—"}
                          </td>
                          <td className="px-3 py-2 text-right">{Number.isFinite(row.resultingEstimate) ? row.resultingEstimate : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {isUnlocked && downloadHref ? (
              <a
                href={downloadHref}
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
        paidCheckoutEnabled={paidCheckoutEnabled}
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


/** The parts of the information-first report (lib/reports/report-view.ts), in the PDF's order and with the PDF's text. */
function RestructuredReport({
  view,
  locale,
  isUnlocked,
  isAdminBypass,
  downloadHref,
  dateStamp,
}: {
  view: ReportView;
  locale: string;
  isUnlocked: boolean;
  isAdminBypass: boolean;
  downloadHref: string | null;
  dateStamp?: string | null;
}) {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const t = view.target;
  const p = view.points;
  const th = "px-3 py-2";
  const table = (headers: string[], rows: string[][], attrs?: (row: string[]) => Record<string, string>) => (
    <div className="overflow-x-auto rounded-md border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs text-muted-foreground">
          <tr>
            {headers.map((h) => (
              <th key={h} className={th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${i}-${row[0]}`} className="border-t border-slate-100 align-top" {...(attrs ? attrs(row) : {})}>
              {row.map((cell, j) => (
                <td key={j} className={th}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10" data-report-structure="v3" data-target-visa={view.targetVisa}>
      {isAdminBypass && !isUnlocked && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <ShieldAlert className="size-4 shrink-0" />
          <p>
            {isTr
              ? "Admin önizlemesi -- bu rapor henüz açılmadı. Veriler yalnızca inceleme amaçlıdır."
              : isZh
                ? "管理员预览 -- 此报告尚未解锁。数据仅供查看。"
                : "Admin preview -- this report has not been unlocked. Data is shown for inspection only."}
          </p>
        </div>
      )}

      <Card data-section="cover">
        <CardHeader>
          <CardTitle>{view.cover.name || view.cover.title}</CardTitle>
          <p className="text-sm text-muted-foreground">{view.cover.subtitle}</p>
          <p className="text-xs text-muted-foreground">
            <span data-report-date-stamp>{dateStamp ?? view.cover.dateText}</span>
            {view.cover.occupation ? ` · ${view.cover.occupation}` : ""}
          </p>
          <p className="text-base font-semibold" data-target-line>
            {view.cover.targetLine}
          </p>
          <p className="text-xs text-muted-foreground">{view.cover.notice}</p>
        </CardHeader>
      </Card>

      <Card data-section="target">
        <CardHeader>
          <CardTitle>{view.titles.target}</CardTitle>
          <p className="text-sm font-medium">{t.subjectLine}</p>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="space-y-2">
            <p className="font-medium">{t.suppliedTitle}</p>
            {table([...t.suppliedHeaders], t.supplied.map((r) => [...r]))}
          </div>
          {t.requirements.length > 0 ? (
            <div className="space-y-2">
              <p className="font-medium">{t.requirementsTitle}</p>
              {table([...t.requirementsHeaders], t.requirements.map((r) => [r.requirement, r.entered, r.source, r.statusLabel]), (r) => ({ "data-requirement-status": r[3] }))}
              <p className="text-xs text-muted-foreground">{t.statusLegend}</p>
            </div>
          ) : t.notApplicableNote ? (
            <p className="text-xs text-muted-foreground">{t.notApplicableNote}</p>
          ) : null}
          <div className="space-y-1">
            <p className="font-medium">{t.notProvidedTitle}</p>
            {t.notProvided.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-xs">
                {t.notProvided.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs">{t.notProvidedNone}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {p.applicable && (
        <Card data-section="points">
          <CardHeader>
            <CardTitle>{view.titles.points}</CardTitle>
            <p className="text-xs text-muted-foreground">{p.intro}</p>
            {p.stageNote ? <p className="text-xs text-muted-foreground">{p.stageNote}</p> : null}
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {table([...p.headers], p.rows)}
            {p.totals.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium">{p.totalsTitle}</p>
                {table(p.totalsHeaders, p.totals)}
                <p className="text-xs text-muted-foreground">{p.totalsNote}</p>
              </div>
            )}
            {p.scenarios.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium">{p.scenariosTitle}</p>
                {table([...p.scenariosHeaders], p.scenarios.map((s) => [...s]))}
                <p className="text-xs text-muted-foreground">{p.scenariosNote}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card data-section="others">
        <CardHeader>
          <CardTitle>{view.others.title}</CardTitle>
          <p className="text-xs text-muted-foreground">{view.others.intro}</p>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {table(view.others.headers, view.others.rows, (r) => ({ "data-overview-visa": r[0] }))}
          <p className="text-xs text-muted-foreground">{view.others.note}</p>
        </CardContent>
      </Card>

      {view.states.applicable && (
        <Card data-section="states">
          <CardHeader>
            <CardTitle>{view.states.title}</CardTitle>
            <p className="text-xs text-muted-foreground">{view.states.intro}</p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {table(view.states.headers, view.states.rows, (r) => ({ "data-state-row": r[0] }))}
            <p className="text-xs text-muted-foreground">{view.states.note}</p>
          </CardContent>
        </Card>
      )}

      {view.process.applicable && (
        <Card data-section="process">
          <CardHeader>
            <CardTitle>{view.process.title}</CardTitle>
            <p className="text-xs text-muted-foreground">{view.process.intro}</p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">{table([...view.process.headers], view.process.rows.map((r) => [...r]))}</CardContent>
        </Card>
      )}

      <Card data-section="costs">
        <CardHeader>
          <CardTitle>{view.titles.costs}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {view.costs.rows.length > 0 &&
            table([...view.costs.headers], view.costs.rows.map((r) => [r.item, r.amount, r.included ? view.costs.yes : view.costs.no, r.source]))}
          {view.costs.totalLines.map((l) => (
            <p key={l} className="text-xs text-muted-foreground">
              {l}
            </p>
          ))}
          {view.costs.note ? <p className="text-xs text-muted-foreground">{view.costs.note}</p> : null}
          {view.costs.notes.map((n) => (
            <p key={n} className="text-xs text-muted-foreground" data-cost-note>
              {n}
            </p>
          ))}
          {view.costs.skillsDoneNote ? <p className="text-xs text-muted-foreground">{view.costs.skillsDoneNote}</p> : null}
          {view.costs.livingLine ? <p className="text-xs text-muted-foreground">{view.costs.livingLine}</p> : null}
        </CardContent>
      </Card>

      <Card data-section="appendix">
        <CardHeader>
          <CardTitle>{view.titles.appendix}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {view.appendix.documents.length > 0 && (
            <div>
              <p className="font-medium">{view.appendix.documentsTitle}</p>
              <ul className="list-disc space-y-1 pl-5 text-xs">
                {view.appendix.documents.map((d) => (
                  <li key={d.category}>
                    {d.category}: {d.items}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {view.appendix.resources.length > 0 && (
            <div>
              <p className="font-medium">{view.appendix.resourcesTitle}</p>
              {view.appendix.resources.map((g) => (
                <div key={g.heading} className="text-xs">
                  <p className="mt-1 font-medium">{g.heading}</p>
                  <ul className="list-disc pl-5">
                    {g.links.map((l) => (
                      <li key={l.url}>
                        <a href={l.url} target="_blank" rel="noopener noreferrer" className="underline">
                          {l.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          {view.appendix.sources.length > 0 && (
            <div>
              <p className="font-medium">{view.appendix.sourcesTitle}</p>
              <ul className="list-disc space-y-1 pl-5 text-xs">
                {view.appendix.sources.map((src) => (
                  <li key={src}>{src}</li>
                ))}
              </ul>
            </div>
          )}
          {view.appendix.disclaimer ? (
            <div>
              <p className="font-medium">{view.appendix.disclaimerTitle}</p>
              <p className="text-xs text-muted-foreground">{view.appendix.disclaimer}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {isUnlocked && downloadHref ? (
        <a
          href={downloadHref}
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
    </main>
  );
}
