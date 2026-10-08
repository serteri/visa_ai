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
import { PREMIUM_PRICE_DISPLAY } from "@/lib/pricing";
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
  paidCheckoutEnabled = false,
}: {
  locale: string;
  reportId: string;
  preview: FullCheckQuickPreview;
  defaultEmail?: string;
  defaultName?: string;
  onUnlocked: (payload: { report: ReadinessReport; email?: string; name?: string; isUnlocked?: boolean; accessToken?: string }) => void;
  /**
   * The server-side READINESS_REPORT_PAID_CHECKOUT_ENABLED flag (lib/readiness/paid-checkout.ts), passed down by the
   * page. Anything but an explicit true means free beta: no price, no payment wording, no checkout events.
   */
  paidCheckoutEnabled?: boolean;
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
        accessToken: unlockState.accessToken,
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

    // Fires right as the form action (unlockAction -> /api/checkout ->
    // Stripe redirect) is about to run -- the earliest point at which the
    // user has actually committed to checkout, as opposed to just opening
    // the modal (setShowModal(true) above, which many visitors abandon).
    if (paidCheckoutEnabled) {
      trackGaEvent("checkout_initiated", {
        report_id: reportId,
        product_type: "premium",
      });
    }
  }

  const termsLabel = isTr ? (
    <>
      <TermsGateLink>Kullanım Koşullarını</TermsGateLink> ve veri işleme politikalarını
      okudum, onaylıyorum.{paidCheckoutEnabled ? " (Dijital ürünlerde iade yapılmaz.)" : ""}
    </>
  ) : isZh ? (
    <>
      我已阅读并同意<TermsGateLink>服务条款</TermsGateLink>
      和数据处理政策。{paidCheckoutEnabled ? "（数字产品不支持退款。）" : ""}
    </>
  ) : (
    <>
      I agree to the <TermsGateLink>Terms of Service</TermsGateLink> and data processing
      policies.{paidCheckoutEnabled ? " (No refunds on digital products.)" : ""}
    </>
  );
  const termsErrorText = isTr
    ? "Lütfen devam etmek için yasal koşulları onaylayın."
    : isZh
      ? "请接受法律条款以继续。"
      : "Please accept the legal terms to proceed.";

  const productName = isTr ? "Vize Bilgi Raporu" : isZh ? "签证信息报告" : "Visa Information Report";
  const price = isTr ? PREMIUM_PRICE_DISPLAY.tr : isZh ? PREMIUM_PRICE_DISPLAY["zh-Hans"] : PREMIUM_PRICE_DISPLAY.en;

  return (
    <section className="space-y-5" data-report-preview>
      {/* Pre-payment preview: the visitor's own details, the points total from their entries and the section titles. Nothing else is in the page. */}
      <Card className="border-emerald-200 bg-white shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">{preview.title}</CardTitle>
            <Badge variant="secondary">{isTr ? "Ön izleme" : isZh ? "预览" : "Preview"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2" data-preview-details>
            <p className="text-sm font-medium text-foreground">{preview.detailsTitle}</p>
            <ul className="list-disc space-y-1 pl-5 text-xs text-slate-700">
              {preview.details.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          {preview.pointsLine ? (
            <div className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3" data-preview-points>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900">{preview.pointsTitle}</p>
              <p className="mt-1 text-xl font-bold text-emerald-950">{preview.pointsLine}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-dashed border-primary/40 bg-background">
        <CardHeader>
          <CardTitle className="text-base">{preview.sectionsTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {preview.sectionTitles.length > 0 && (
            <ul className="grid gap-2" data-preview-sections>
              {preview.sectionTitles.map((title) => (
                <li key={title} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-slate-800">
                  <Lock className="size-3.5 shrink-0 text-slate-600" aria-hidden="true" />
                  {title}
                </li>
              ))}
            </ul>
          )}

          <div className="rounded-2xl border border-primary/20 bg-card p-5 shadow-sm">
            <h3 className="text-xl font-bold tracking-tight">
              {paidCheckoutEnabled
                ? isTr ? `${productName}'nu aç` : isZh ? `解锁${productName}` : `Unlock the ${productName}`
                : isTr ? `${productName}'nu aç` : isZh ? `打开${productName}` : `Open the ${productName}`}
            </h3>
            <p className="mt-1 text-sm text-slate-700">
              {paidCheckoutEnabled
                ? isTr
                  ? "Tek seferlik ödemeyle tam raporu ekranda açın ve PDF olarak indirin. Güvenli bağlantı e-postayla da gönderilir."
                  : isZh
                    ? "一次付款即可在屏幕上打开完整报告并下载 PDF。安全链接也会通过邮件发送给您。"
                    : "Pay once to open the full report on screen and download it as a PDF. A secure link is also emailed to you."
                : isTr
                  ? "Bu rapor için ödeme alınmaz."
                  : isZh
                    ? "此报告不收取费用。"
                    : "No payment is taken for this report."}
            </p>

            {paidCheckoutEnabled && (
              <div className="mt-4 flex items-end justify-between gap-3 rounded-xl border border-border/70 bg-background p-3">
                <p className="text-xs uppercase tracking-wide text-slate-700">{productName}</p>
                <p className="text-lg font-bold text-primary" data-report-price>{price}</p>
              </div>
            )}

            <Button size="lg" className="mt-4 h-12 w-full text-base" onClick={() => setShowModal(true)}>
              <Sparkles className="size-4" />
              {paidCheckoutEnabled
                ? isTr ? `${productName}'nu aç` : isZh ? `解锁${productName}` : `Unlock your ${productName}`
                : isTr ? `${productName}'nu aç` : isZh ? `打开${productName}` : `Open your ${productName}`}
            </Button>

            <div className="mt-3 grid gap-2 text-xs text-slate-700 sm:grid-cols-3">
              {paidCheckoutEnabled && (
                <div className="flex items-center gap-1.5 rounded-md border border-border/60 px-2 py-1.5">
                  <ShieldCheck className="size-3.5 text-primary" />
                  <span>{isTr ? "Güvenli ödeme" : isZh ? "安全支付" : "Secure Checkout"}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 rounded-md border border-border/60 px-2 py-1.5">
                <Zap className="size-3.5 text-primary" />
                <span>{isTr ? "Anında Erişim" : isZh ? "即时访问" : "Instant Access"}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-md border border-border/60 px-2 py-1.5">
                <Lock className="size-3.5 text-primary" />
                <span>{isTr ? "Şifreli veri" : isZh ? "数据加密" : "Data Encrypted"}</span>
              </div>
            </div>
          </div>
        </CardContent>
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
              <CardTitle>{isTr ? "Vize Bilgi Raporunu aç" : isZh ? "解锁签证信息报告" : "Unlock the Visa Information Report"}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {paidCheckoutEnabled
                  ? isTr
                    ? "Ödemeden sonra rapor ekranda açılır, PDF olarak indirebilirsiniz ve güvenli bağlantı e-postayla gönderilir."
                    : isZh
                      ? "付款后，报告会在屏幕上打开，您可下载 PDF，安全链接也会通过邮件发送。"
                      : "After payment the report opens on screen, you can download it as a PDF, and a secure link is emailed to you."
                  : isTr
                    ? "Rapor bu tarayıcıda hemen açılır; güvenli bağlantı raporun oluşturulduğu e-posta adresine de gönderilir. Ödeme alınmaz."
                    : isZh
                      ? "报告会在此浏览器中立即打开；安全链接也会发送到创建报告时使用的邮箱。不收取费用。"
                      : "The report opens here in this browser right away, and the secure link is also emailed to the address the report was created with. No payment is taken."}
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
                  <input type="hidden" name="unlockMethod" value={paidCheckoutEnabled ? "payment" : "beta_free"} />
                  <div className="h-12 flex items-center rounded-xl border border-primary/30 bg-primary/5 px-3 text-sm font-medium text-primary">
                    {!paidCheckoutEnabled
                      ? isTr ? "🔓 Ödeme gerekmez" : isZh ? "🔓 无需付款" : "🔓 No payment needed"
                      : isTr
                        ? `🔓 Ödeme ile aç (${PREMIUM_PRICE_DISPLAY.tr})`
                        : isZh
                          ? `🔓 支付解锁 (${PREMIUM_PRICE_DISPLAY["zh-Hans"]})`
                          : `🔓 Unlock with Payment (${PREMIUM_PRICE_DISPLAY.en})`}
                  </div>
                </div>

                {unlockState.status === "success" && !unlockState.report && unlockState.message && (
                  <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    {unlockState.message}
                  </p>
                )}

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
                  <Button type="submit" className="h-12 flex-1 rounded-xl" disabled={unlockPending || (unlockState.status === "success" && !unlockState.report)}>
                    {unlockPending
                      ? isTr ? "İşleniyor..." : isZh ? "处理中..." : "Processing..."
                      : paidCheckoutEnabled ? (isTr ? "Ödemeye geç" : isZh ? "前往付款" : "Continue to payment") : (isTr ? "Raporu aç" : isZh ? "打开报告" : "Open report")}
                  </Button>
                </div>

                <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                  <div className="flex items-center gap-1.5 rounded-md border border-border/60 px-2 py-1.5">
                    <ShieldCheck className="size-3.5 text-primary" />
                    <span>{paidCheckoutEnabled ? (isTr ? "Güvenli ödeme" : isZh ? "安全支付" : "Secure Checkout") : (isTr ? "Ödeme yok" : isZh ? "无需付款" : "No payment")}</span>
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
