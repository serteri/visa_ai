"use client";

import { useActionState, useEffect, useState } from "react";
import { Lock, Mail, Phone, Sparkles } from "lucide-react";

import {
  type FullCheckQuickPreview,
  type PremiumUnlockState,
  unlockPremiumReport,
} from "@/app/[locale]/full-check/actions";
import type { ReadinessReport } from "@/lib/readiness/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialUnlockState: PremiumUnlockState = { status: "idle" };

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
  onUnlocked: (payload: { report: ReadinessReport; email?: string; name?: string }) => void;
}) {
  const isTr = locale === "tr";
  const [showModal, setShowModal] = useState(false);
  const [unlockMethod, setUnlockMethod] = useState<"lead_capture" | "payment">("lead_capture");

  const [unlockState, unlockAction, unlockPending] = useActionState(
    unlockPremiumReport,
    initialUnlockState
  );

  useEffect(() => {
    if (unlockState.status === "success" && unlockState.report) {
      setShowModal(false);
      onUnlocked({
        report: unlockState.report,
        email: unlockState.userInput?.email,
        name: unlockState.userInput?.name,
      });
    }
  }, [unlockState, onUnlocked]);

  return (
    <section className="space-y-5">
      <Card className="border-emerald-200 bg-emerald-50/70">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">
              {isTr ? "Quick Pathway Check Sonucu" : "Quick Pathway Check Result"}
            </CardTitle>
            <Badge variant="secondary">{isTr ? "Ücretsiz görünüm" : "Free preview"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-emerald-300/60 bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              {isTr ? "Temel puan" : "Base points"}
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-900">
              {preview.estimatedPoints ?? "-"}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              {isTr ? "Muhtemel vize yolları" : "Likely visa pathways"}
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
          <CardTitle>{isTr ? "Premium bölümler" : "Premium sections"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 opacity-45 blur-[1.6px]">
          {[
            "Strategic Gantt Chart",
            "Financial Roadmap",
            "Document-Level Specificity",
            "Pathway Friction Analysis",
            "Immediate Action Plan",
          ].map((title) => (
            <div key={title} className="rounded-md border px-3 py-2 text-sm">
              {title}
            </div>
          ))}
        </CardContent>

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/70 p-4 backdrop-blur-[2px]">
          <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-card px-4 py-2 text-sm font-semibold shadow-sm">
            <Lock className="size-4 text-primary" />
            <span>{isTr ? "Kilidi aç" : "Unlock premium"}</span>
          </div>

          <Button size="lg" className="text-base" onClick={() => setShowModal(true)}>
            <Sparkles className="size-4" />
            {isTr ? "Unlock Your Full Readiness Report" : "Unlock Your Full Readiness Report"}
          </Button>

          <p className="text-sm text-muted-foreground">
            {isTr ? "$29 Tek rapor ücreti" : "$29 for a Single Report"}
          </p>
        </div>
      </Card>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="space-y-2">
              <CardTitle>{isTr ? "Raporu aç" : "Unlock report"}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {isTr
                  ? "Ödeme veya iletişim formu sonrası premium raporunuz açılır ve PDF e-posta ile gönderilir."
                  : "After payment or lead form submission, your premium report is unlocked and the PDF is emailed automatically."}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <form action={unlockAction} className="space-y-4">
                <input type="hidden" name="reportId" value={reportId} />

                <div className="space-y-2">
                  <Label htmlFor="unlock-full-name">{isTr ? "Ad soyad" : "Full name"}</Label>
                  <Input id="unlock-full-name" name="fullName" defaultValue={defaultName ?? ""} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unlock-email">{isTr ? "E-posta" : "Email"}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
                    <Input
                      id="unlock-email"
                      name="email"
                      type="email"
                      defaultValue={defaultEmail ?? ""}
                      className="pl-9"
                      required
                    />
                  </div>
                  {unlockState.errors?.email && (
                    <p className="text-xs text-red-600">{unlockState.errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unlock-phone">{isTr ? "Telefon" : "Phone"}</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
                    <Input id="unlock-phone" name="phone" className="pl-9" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unlock-method">{isTr ? "Açma yöntemi" : "Unlock method"}</Label>
                  <select
                    id="unlock-method"
                    name="unlockMethod"
                    value={unlockMethod}
                    onChange={(event) => setUnlockMethod(event.target.value === "payment" ? "payment" : "lead_capture")}
                    className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  >
                    <option value="lead_capture">{isTr ? "Form ile aç (Lead Capture)" : "Unlock with lead capture form"}</option>
                    <option value="payment">{isTr ? "Ödeme ile aç ($29)" : "Unlock with payment ($29)"}</option>
                  </select>
                </div>

                {unlockState.status === "error" && unlockState.message && (
                  <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {unlockState.message}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setShowModal(false)}>
                    {isTr ? "İptal" : "Cancel"}
                  </Button>
                  <Button type="submit" className="flex-1" disabled={unlockPending}>
                    {unlockPending
                      ? isTr ? "İşleniyor..." : "Processing..."
                      : isTr ? "Raporu aç" : "Unlock report"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
