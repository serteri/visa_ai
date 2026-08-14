"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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
  isFreeActive = true,
  remainingSpots = 0,
  onUnlocked,
}: {
  locale: string;
  reportId: string;
  preview: FullCheckQuickPreview;
  defaultEmail?: string;
  defaultName?: string;
  isFreeActive?: boolean;
  remainingSpots?: number;
  onUnlocked: (payload: { report: ReadinessReport; email?: string; name?: string; isUnlocked?: boolean }) => void;
}) {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const [showModal, setShowModal] = useState(false);
  const [unlockMethod, setUnlockMethod] = useState<"lead_capture" | "payment">(
    isFreeActive ? "lead_capture" : "payment"
  );

  // Lock background scroll while the modal is open -- Radix's Dialog does
  // this automatically, but this modal is a hand-rolled overlay, not that
  // component. Without it the page behind stays scrollable while the
  // overlay is also independently scrollable, which can make the modal
  // feel like it "jumps" relative to the page instead of staying put.
  useEffect(() => {
    if (!showModal) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
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

    // Handle Stripe redirect
    if (
      unlockState.status === "error" &&
      unlockState.message?.startsWith("STRIPE_REDIRECT:")
    ) {
      const url = unlockState.message.replace("STRIPE_REDIRECT:", "");
      window.location.href = url;
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
      <Card className="border-emerald-200 bg-emerald-50/70">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">
              {isTr ? "Quick Pathway Check Sonucu" : isZh ? "快速路径评估结果" : "Quick Pathway Check Result"}
            </CardTitle>
            <Badge variant="secondary">{isTr ? "Ücretsiz görünüm" : isZh ? "免费预览" : "Free preview"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-emerald-300/60 bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              {isTr ? "Temel puan" : isZh ? "基础分" : "Base points"}
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-900">
              {preview.estimatedPoints ?? "-"}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              {isTr ? "Muhtemel vize yolları" : isZh ? "可能签证路径" : "Likely visa pathways"}
            </p>
            <div className="grid gap-2">
              {preview.pathways.map((item) => (
                <div key={`${item.subclass}-${item.visaName}`} className="rounded-md border bg-white px-3 py-2">
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
              {isFreeActive ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {isTr ? "Özel Erken Erişim" : isZh ? "独家抢先体验" : "Exclusive Early Access"}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground line-through">$49</p>
                      <p className="text-lg font-bold text-emerald-600">
                        {isTr ? "Ücretsiz" : isZh ? "免费" : "Free"}
                      </p>
                    </div>
                  </div>
                  {remainingSpots > 0 && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                      <p className="text-xs font-semibold text-amber-800 text-center">
                        {isTr
                          ? `🔥 Yalnızca ${remainingSpots} ücretsiz kontenjan kaldı!`
                          : isZh
                            ? `🔥 仅剩 ${remainingSpots} 个免费名额！`
                            : `🔥 Only ${remainingSpots} free spots remaining!`}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-end justify-between gap-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {isTr ? "Premium Rapor" : isZh ? "高级报告" : "Premium Report"}
                  </p>
                  <p className="text-lg font-bold text-primary">$49</p>
                </div>
              )}
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
                <span>{isTr ? "Instant PDF Delivery" : isZh ? "Instant PDF Delivery" : "Instant PDF Delivery"}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-md border border-border/60 bg-background/70 px-2 py-1.5">
                <Lock className="size-3.5 text-primary" />
                <span>{isTr ? "Data Encrypted" : isZh ? "Data Encrypted" : "Data Encrypted"}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 pt-8 sm:items-center sm:pt-4">
          {/*
            items-start + overflow-y-auto (not just items-center) so a
            modal taller than the viewport scrolls into view instead of
            overflowing above y=0 with no way to reach the top of it --
            items-center alone visually centers short content fine, but
            on shorter/mobile viewports this form (name/email/phone/
            unlock method/terms/submit) can exceed viewport height, and a
            plain "items-center justify-center" with no scroll clips the
            unreachable overflow. sm:items-center restores true vertical
            centering once there's a screen wide enough to usually fit it.
          */}
          <Card className="w-full max-w-lg">
            <CardHeader className="space-y-2">
              <CardTitle>{isTr ? "Raporu aç" : isZh ? "解锁报告" : "Unlock report"}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {isTr
                  ? "Ödeme veya iletişim formu sonrası premium raporunuz açılır ve PDF e-posta ile gönderilir."
                  : isZh
                    ? "完成支付或提交联系方式后，将解锁高级报告并自动通过邮箱发送 PDF。"
                  : "After payment or lead form submission, your premium report is unlocked and the PDF is emailed automatically."}
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
                  {isFreeActive ? (
                    <select
                      id="unlock-method"
                      name="unlockMethod"
                      value={unlockMethod}
                      onChange={(event) => setUnlockMethod(event.target.value === "payment" ? "payment" : "lead_capture")}
                      className="h-12 w-full rounded-xl border border-border bg-card px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                    >
                      <option value="lead_capture">{isTr ? "Form ile aç (Ücretsiz)" : isZh ? "提交线索表单免费解锁" : "Unlock for FREE (lead capture form)"}</option>
                      <option value="payment">{isTr ? "Ödeme ile aç ($49)" : isZh ? "支付解锁（$49）" : "Unlock with payment ($49)"}</option>
                    </select>
                  ) : (
                    <>
                      <input type="hidden" name="unlockMethod" value="payment" />
                      <div className="h-12 flex items-center rounded-xl border border-primary/30 bg-primary/5 px-3 text-sm font-medium text-primary">
                        {isTr ? "🔓 Ödeme ile aç ($49)" : isZh ? "🔓 支付解锁 ($49)" : "🔓 Unlock with Payment ($49)"}
                      </div>
                    </>
                  )}
                </div>

                {unlockState.status === "error" && unlockState.message && !unlockState.message.startsWith("STRIPE_REDIRECT:") && (
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
                    <span>Instant PDF Delivery</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-md border border-border/60 px-2 py-1.5">
                    <Lock className="size-3.5 text-primary" />
                    <span>Data Encrypted</span>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
