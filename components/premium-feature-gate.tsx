"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Lock, Mail, Phone, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { sendGAEvent } from "@next/third-parties/google";

import {
  type FullCheckQuickPreview,
  type PremiumUnlockState,
  unlockPremiumReport,
} from "@/app/[locale]/(main)/full-check/actions";
import type { ReadinessReport } from "@/lib/readiness/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TermsGate, TermsGateLink } from "@/components/terms-gate";

const initialUnlockState: PremiumUnlockState = { status: "idle" };

function trackGaEvent(name: string, params?: Record<string, string | number | boolean | null | undefined>) {
  if (typeof window === "undefined") return;
  const gaId = process.env.NEXT_PUBLIC_GA_ID?.trim();
  if (!gaId) return;
  if (!Array.isArray((window as { dataLayer?: Object[] }).dataLayer)) return;

  sendGAEvent("event", name, params ?? {});
}

export function PremiumFeatureGate({
  locale,
  reportId,
  preview,
  defaultEmail,
  defaultName,
  onUnlocked,
}: {
  locale: string;
  reportId: string;
  preview: FullCheckQuickPreview;
  defaultEmail?: string;
  defaultName?: string;
  onUnlocked: (payload: { report: ReadinessReport; email?: string; name?: string; isUnlocked?: boolean }) => void;
}) {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const [showModal, setShowModal] = useState(false);

  // Lock background scroll while the modal is open -- Radix's Dialog does
  // this automatically, but this modal is a hand-rolled overlay, not that
  // component. Locks both <html> and <body>: document.scrollingElement is
  // <html> in this app (confirmed live -- this page has no wrapper with its
  // own overflow-y-auto), so locking only body.style.overflow was a no-op
  // and the page kept scrolling underneath the "locked" modal. Resets
  // unconditionally to "" (not a captured "previous" value) on both close
  // and unmount, so this can never leave the page permanently locked even
  // if some earlier run left it in an unexpected state -- "" is always the
  // correct at-rest value here, since this is the only place in the app
  // that touches either element's overflow.
  useEffect(() => {
    if (!showModal) {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      return;
    }
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [showModal]);
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const trackedUnlockReportIdRef = useRef<string | null>(null);

  const [unlockState, unlockAction, unlockPending] = useActionState(
    unlockPremiumReport,
    initialUnlockState
  );

  useEffect(() => {
    if (unlockState.status === "success" && unlockState.report) {
      if (trackedUnlockReportIdRef.current !== reportId) {
        trackGaEvent("report_unlocked", {
          report_id: reportId,
          locale,
          source: "unlock_success",
        });
        trackedUnlockReportIdRef.current = reportId;
      }

      setShowModal(false);
      onUnlocked({
        report: unlockState.report,
        email: unlockState.userInput?.email,
        name: unlockState.userInput?.name,
        isUnlocked: true,
      });
    }

    // Handle checkout redirect (free-promo success or Stripe session URL --
    // see app/api/checkout/route.ts). The server action can't call
    // next/navigation's redirect() itself here (its outer try/catch would
    // swallow the NEXT_REDIRECT it throws), so it hands the URL back in
    // state and this effect forces the navigation on the client instead.
    if (unlockState.status === "redirect" && unlockState.redirectUrl) {
      window.location.href = unlockState.redirectUrl;
    }
  }, [locale, onUnlocked, reportId, unlockState]);

  // Legal gate: blocks the unlock action entirely -- no lead data is sent and
  // no payment/report unlock proceeds -- until Terms/data-processing consent
  // is given. preventDefault() here stops React 19's form `action` from firing.
  function handleUnlockSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!isTermsAccepted) {
      e.preventDefault();
      setTermsError(true);
      return;
    }
    setTermsError(false);
  }

  const termsLabel = isTr ? (
    <>
      <TermsGateLink>Kullanım Koşullarını</TermsGateLink> ve veri işleme politikalarını
      okudum, onaylıyorum. (Dijital ürünlerde iade yapılmaz.)
    </>
  ) : isZh ? (
    <>
      我已阅读并同意<TermsGateLink>服务条款</TermsGateLink>
      和数据处理政策。（数字产品不支持退款。）
    </>
  ) : (
    <>
      I agree to the <TermsGateLink>Terms of Service</TermsGateLink> and data processing
      policies. (No refunds on digital products.)
    </>
  );
  const termsErrorText = isTr
    ? "Lütfen devam etmek için yasal koşulları onaylayın."
    : isZh
      ? "请接受法律条款以继续。"
      : "Please accept the legal terms to proceed.";

  return (
    <section className="space-y-5">
      <Card className="border-emerald-200 bg-white shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">
              {isTr ? "Quick Pathway Check Sonucu" : isZh ? "快速路径评估结果" : "Quick Pathway Check Result"}
            </CardTitle>
            <Badge variant="secondary">{isTr ? "Ücretsiz görünüm" : isZh ? "免费预览" : "Free preview"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              {isTr ? "Temel puan" : isZh ? "基础分" : "Base points"}
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-800">
              {preview.estimatedPoints ?? "-"}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              {isTr ? "Muhtemel vize yolları" : isZh ? "可能签证路径" : "Likely visa pathways"}
            </p>
            <div className="grid gap-2">
              {preview.pathways.map((item) => (
                <div key={`${item.subclass}-${item.visaName}`} className="rounded-md border border-slate-200 bg-white shadow-sm px-3 py-2">
                  <p className="text-sm font-medium">{item.visaName} ({item.subclass})</p>
                  <p className="text-xs text-muted-foreground">{item.reason}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border-dashed border-primary/40 bg-background">
        <CardHeader className="opacity-45 blur-[1.6px]">
          <CardTitle>{isTr ? "Premium bölümler" : isZh ? "高级内容模块" : "Premium sections"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 opacity-45 blur-[1.6px]">
          {(isTr
            ? [
                "Stratejik Gantt Tablosu",
                "Mali Yol Haritası",
                "Belge Düzeyinde Ayrıntı",
                "Vize Yolu Rekabet Analizi",
                "Acil Eylem Planı",
              ]
            : isZh
            ? [
                "战略甘特图",
                "财务路线图",
                "文件级具体性",
                "路径阻力分析",
                "立即行动计划",
              ]
            : [
                "Strategic Gantt Chart",
                "Financial Roadmap",
                "Document-Level Specificity",
                "Pathway Friction Analysis",
                "Immediate Action Plan",
              ]
          ).map((title) => (
            <div key={title} className="rounded-md border px-3 py-2 text-sm">
              {title}
            </div>
          ))}
        </CardContent>

        <div className="absolute inset-0 flex items-center justify-center bg-background/70 p-4 backdrop-blur-[3px]">
          <div className="w-full max-w-md rounded-2xl border border-primary/20 bg-card/95 p-5 shadow-2xl ring-1 ring-primary/15">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Lock className="size-3.5" />
              <span>{isTr ? "Premium Access" : isZh ? "高级访问" : "Premium Access"}</span>
            </div>

            <h3 className="text-xl font-bold tracking-tight">
              {isTr ? "Unlock Full Report" : isZh ? "解锁完整报告" : "Unlock Full Report"}
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              {isTr
                ? "Detaylı rapor, stratejik tablo ve PDF teslimini açın."
                : isZh
                  ? "解锁完整分析、高级图表与 PDF 交付。"
                  : "Unlock full analysis, premium sections, and PDF delivery."}
            </p>

            <div className="mt-4 rounded-xl border border-border/70 bg-background/70 p-3">
              <div className="flex items-end justify-between gap-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {isTr ? "Premium Rapor" : isZh ? "高级报告" : "Premium Report"}
                </p>
                <p className="text-lg font-bold text-primary">19.99 AUD + GST</p>
              </div>
            </div>

            <Button
              size="lg"
              className="mt-4 h-12 w-full text-base"
              onClick={() => setShowModal(true)}
            >
              <Sparkles className="size-4" />
              {isTr ? "Unlock Your Full Readiness Report" : isZh ? "解锁完整准备度报告" : "Unlock Your Full Readiness Report"}
            </Button>

            <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
              <div className="flex items-center gap-1.5 rounded-md border border-border/60 bg-background/70 px-2 py-1.5">
                <ShieldCheck className="size-3.5 text-primary" />
                <span>{isTr ? "Secure Checkout" : isZh ? "Secure Checkout" : "Secure Checkout"}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-md border border-border/60 bg-background/70 px-2 py-1.5">
                <Zap className="size-3.5 text-primary" />
                <span>{isTr ? "Anında Erişim" : isZh ? "即时访问" : "Instant Access"}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-md border border-border/60 bg-background/70 px-2 py-1.5">
                <Lock className="size-3.5 text-primary" />
                <span>{isTr ? "Data Encrypted" : isZh ? "Data Encrypted" : "Data Encrypted"}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {showModal && typeof document !== "undefined" && createPortal(
        // Portaled directly to document.body instead of rendering in place.
        // This overlay is `fixed`, which positions relative to the nearest
        // ancestor with a transform/filter/perspective/will-change/contain
        // property instead of the viewport if one exists -- and adjusting
        // this overlay's own flex/overflow classes alone (twice now, see
        // git history on this block) didn't fix reports of the modal
        // opening somewhere unreachable, which is exactly the symptom of a
        // hijacked containing block, not a centering/overflow bug. A portal
        // sidesteps this entirely: as a direct child of <body>, there are no
        // report-content ancestors left for it to inherit a transform from.
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <Card className="relative w-full max-w-lg my-auto shadow-2xl">
            <CardHeader className="space-y-2">
              <CardTitle>{isTr ? "Raporu aç" : isZh ? "解锁报告" : "Unlock report"}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {isTr
                  ? "Ödeme sonrası premium raporunuz açılır ve size güvenli bir indirme bağlantısı e-posta ile gönderilir."
                  : isZh
                    ? "支付完成后，您的高级报告将被解锁，并通过邮件向您发送安全下载链接。"
                  : "After payment, your premium report is unlocked and a secure download link is emailed to you."}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <form action={unlockAction} onSubmit={handleUnlockSubmit} className="space-y-4">
                <input type="hidden" name="reportId" value={reportId} />

                <div className="space-y-2">
                  <Label htmlFor="unlock-full-name">{isTr ? "Ad soyad" : isZh ? "姓名" : "Full name"}</Label>
                  <Input id="unlock-full-name" name="fullName" defaultValue={defaultName ?? ""} className="h-12 rounded-xl" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unlock-email">{isTr ? "E-posta" : isZh ? "邮箱" : "Email"}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
                    <Input
                      id="unlock-email"
                      name="email"
                      type="email"
                      defaultValue={defaultEmail ?? ""}
                      className="h-12 rounded-xl pl-9"
                      required
                    />
                  </div>
                  {unlockState.errors?.email && (
                    <p className="text-xs text-red-600">{unlockState.errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unlock-phone">{isTr ? "Telefon" : isZh ? "电话" : "Phone"}</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
                    <Input id="unlock-phone" name="phone" className="h-12 rounded-xl pl-9" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unlock-method">{isTr ? "Açma yöntemi" : isZh ? "解锁方式" : "Unlock method"}</Label>
                  {/* Free Beta has ended -- payment is now the only unlock
                      method. Still sent as a real form field (rather than
                      hardcoded server-side) so unlockPremiumReportInternal's
                      existing unlockMethod handling doesn't need to change. */}
                  <input type="hidden" name="unlockMethod" value="payment" />
                  <div className="h-12 flex items-center rounded-xl border border-primary/30 bg-primary/5 px-3 text-sm font-medium text-primary">
                    {isTr ? "🔓 Ödeme ile aç (19.99 AUD + GST)" : isZh ? "🔓 支付解锁 (19.99 AUD + GST)" : "🔓 Unlock with Payment (19.99 AUD + GST)"}
                  </div>
                </div>

                {unlockState.status === "error" && unlockState.message && (
                  <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {unlockState.message}
                  </p>
                )}

                <TermsGate
                  isTermsAccepted={isTermsAccepted}
                  termsError={termsError}
                  onToggle={(checked) => {
                    setIsTermsAccepted(checked);
                    if (checked) setTermsError(false);
                  }}
                  label={termsLabel}
                  errorText={termsErrorText}
                />

                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="h-12 flex-1 rounded-xl" onClick={() => setShowModal(false)}>
                    {isTr ? "İptal" : isZh ? "取消" : "Cancel"}
                  </Button>
                  <Button type="submit" className="h-12 flex-1 rounded-xl" disabled={unlockPending}>
                    {unlockPending
                      ? isTr ? "İşleniyor..." : isZh ? "处理中..." : "Processing..."
                      : isTr ? "Raporu aç" : isZh ? "解锁报告" : "Unlock report"}
                  </Button>
                </div>

                <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                  <div className="flex items-center gap-1.5 rounded-md border border-border/60 px-2 py-1.5">
                    <ShieldCheck className="size-3.5 text-primary" />
                    <span>Secure Checkout</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-md border border-border/60 px-2 py-1.5">
                    <CheckCircle2 className="size-3.5 text-primary" />
                    <span>Secure Download Link</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-md border border-border/60 px-2 py-1.5">
                    <Lock className="size-3.5 text-primary" />
                    <span>Data Encrypted</span>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>,
        document.body
      )}
    </section>
  );
}
