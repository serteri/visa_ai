"use client";

import { useActionState, useEffect, useState } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  type FullCheckWaitlistState,
  submitFullCheckWaitlist,
} from "@/app/[locale]/full-check/actions";
import { PremiumFeatureGate } from "@/components/premium-feature-gate";
import { generateReadinessPDF } from "@/lib/readiness/generate-pdf";
import type { ReadinessReport } from "@/lib/readiness/types";

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600">{message}</p>;
}

function ReportSection({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-primary">-</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function PathwayDetailCard({
  title,
  confidenceLabel,
  confidenceExplanation,
  summary,
  keyRequirements,
  pathwayRisks,
  isTr,
}: {
  title: string;
  confidenceLabel: string;
  confidenceExplanation: string;
  summary: string;
  keyRequirements: string[];
  pathwayRisks: string[];
  isTr: boolean;
}) {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base">{title}</CardTitle>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            {isTr ? "Güven:" : "Confidence:"} {confidenceLabel}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{summary}</p>
        <p className="text-xs text-muted-foreground">{confidenceExplanation}</p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-2">
          <p className="font-medium">{isTr ? "Ana Gereklilikler" : "Key Requirements"}</p>
          <ul className="space-y-2 text-muted-foreground">
            {keyRequirements.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-primary">-</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-2">
          <p className="font-medium">{isTr ? "Yola Özgü Riskler" : "Pathway-Specific Risks"}</p>
          <ul className="space-y-2 text-muted-foreground">
            {pathwayRisks.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-primary">-</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function LockedSection({ title, isTr }: { title: string; isTr: boolean }) {
  return (
    <Card className="relative overflow-hidden border-dashed">
      <CardHeader className="opacity-45 blur-[1px]">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="opacity-45 blur-[1px]">
        <p className="text-sm text-muted-foreground">
          {isTr
            ? "Bu bölüm ilgili ayrıntılar sağlandığında oluşturulan raporda yer alır."
            : "This section is included in the generated report when relevant details are provided."}
        </p>
      </CardContent>
      <div className="absolute inset-0 flex items-center justify-center bg-background/65 p-4 backdrop-blur-[1px]">
        <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-2 text-sm font-medium shadow-sm">
          <Download className="size-4 text-primary" />
          <span>{isTr ? "Kilitli" : "Locked"}</span>
        </div>
      </div>
    </Card>
  );
}

export function FullCheckWaitlistForm({
  locale,
  initialValues = {},
}: {
  locale: string;
  initialValues?: {
    visaInterest?: string;
    currentCountry?: string;
    mainGoal?: string;
    source?: string;
  };
}) {
  const isTr = locale === "tr";
  const initialState: FullCheckWaitlistState = {
    status: "idle",
  };

  const [state, formAction, isPending] = useActionState(
    submitFullCheckWaitlist,
    initialState
  );
  const [unlockedReport, setUnlockedReport] = useState<ReadinessReport | null>(null);
  const [unlockedName, setUnlockedName] = useState<string | undefined>(undefined);
  const [unlockedEmail, setUnlockedEmail] = useState<string | undefined>(undefined);

  useEffect(() => {
    setUnlockedReport(null);
    setUnlockedName(undefined);
    setUnlockedEmail(undefined);
  }, [state.reportId]);

  const report = unlockedReport;

  function handleDownloadPDF() {
    if (!report) return;

    generateReadinessPDF({
      report,
      locale: locale === "tr" ? "tr" : "en",
      userInputSummary: {
        ...(state.userInput || {}),
        name: unlockedName ?? state.userInput?.name,
        email: unlockedEmail ?? state.userInput?.email,
      },
    });
  }

  function getConfidenceLabel(level: "low" | "medium" | "high") {
    if (isTr) {
      return level === "high" ? "Yüksek" : level === "medium" ? "Orta" : "Düşük";
    }

    return level === "high" ? "High" : level === "medium" ? "Medium" : "Low";
  }

  function getDifficultyLabel(level: "low" | "medium" | "high") {
    if (isTr) {
      return level === "high" ? "Yüksek" : level === "medium" ? "Orta" : "Düşük";
    }

    return level === "high" ? "High" : level === "medium" ? "Medium" : "Low";
  }

  function getStrengthLabel(level: "limited" | "moderate" | "strong") {
    if (isTr) {
      return level === "strong" ? "Daha güçlü sinyal" : level === "moderate" ? "Orta sinyal" : "Sınırlı sinyal";
    }

    return level === "strong" ? "Stronger signal" : level === "moderate" ? "Moderate signal" : "Limited signal";
  }

  function getSignalConfidenceLabel(level: "limited" | "moderate" | "stronger") {
    if (isTr) {
      return level === "stronger" ? "Daha güçlü" : level === "moderate" ? "Orta" : "Sınırlı";
    }

    return level === "stronger" ? "Stronger" : level === "moderate" ? "Moderate" : "Limited";
  }

  function getEvidenceLoadLabel(level: "low" | "medium" | "high") {
    if (isTr) {
      return level === "high" ? "Yüksek" : level === "medium" ? "Orta" : "Düşük";
    }
    return level === "high" ? "High" : level === "medium" ? "Medium" : "Low";
  }

  function getRelativePositionClass(pos: "stronger_signal" | "moderate_signal" | "limited_signal") {
    if (pos === "stronger_signal") return "bg-emerald-100 text-emerald-800";
    if (pos === "moderate_signal") return "bg-amber-100 text-amber-800";
    return "bg-slate-100 text-slate-700";
  }

  function getEvidenceStatusClass(status: "provided" | "missing" | "unclear" | "typically_required") {
    if (status === "provided") return "bg-emerald-100 text-emerald-800";
    if (status === "missing") return "bg-red-100 text-red-700";
    if (status === "unclear") return "bg-amber-100 text-amber-800";
    return "bg-slate-100 text-slate-600";
  }

  function getEvidenceStatusLabel(status: "provided" | "missing" | "unclear" | "typically_required") {
    if (isTr) {
      if (status === "provided") return "Sağlandı";
      if (status === "missing") return "Eksik";
      if (status === "unclear") return "Net değil";
      return "Tipik gereklilik";
    }
    if (status === "provided") return "Provided";
    if (status === "missing") return "Missing";
    if (status === "unclear") return "Unclear";
    return "Typically required";
  }

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4" noValidate>
        <input type="hidden" name="preferredLanguage" value={locale} />
        <input type="hidden" name="source" value={initialValues.source ?? "full_check"} />

        <div className="space-y-2">
          <Label htmlFor="waitlist-full-name">{isTr ? "Ad soyad" : "Full name"}</Label>
          <Input
            id="waitlist-full-name"
            name="fullName"
            autoComplete="name"
            placeholder={isTr ? "Adınız" : "Your name"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="waitlist-email">{isTr ? "E-posta adresi" : "Email address"}</Label>
          <Input
            id="waitlist-email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
          <ErrorText message={state.errors?.email} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="waitlist-visa-interest">
            {isTr ? "Bu rapor hangi vize yoluna odaklanmalı?" : "Which visa pathway should this report focus on?"}
          </Label>
          <select
            id="waitlist-visa-interest"
            name="visaInterest"
            defaultValue={initialValues.visaInterest ?? ""}
            className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <option value="">{isTr ? "Tüm yollar / Emin değilim" : "All pathways / Not sure"}</option>
            <option value="500">{isTr ? "Öğrenci Vizesi 500" : "Student visa 500"}</option>
            <option value="485">{isTr ? "Geçici Mezun Vizesi 485" : "Temporary Graduate visa 485"}</option>
            <option value="482">{isTr ? "Skills in Demand Vizesi 482" : "Skills in Demand visa 482"}</option>
            <option value="189">{isTr ? "Skilled Independent Vizesi 189" : "Skilled Independent visa 189"}</option>
            <option value="190">{isTr ? "Skilled Nominated Vizesi 190" : "Skilled Nominated visa 190"}</option>
            <option value="491">{isTr ? "Skilled Work Regional Vizesi 491" : "Skilled Work Regional visa 491"}</option>
            <option value="820_801">{isTr ? "Partner Vizesi 820/801" : "Partner visa 820/801"}</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="waitlist-current-country">{isTr ? "Bulunduğunuz ülke" : "Current country"}</Label>
          <Input
            id="waitlist-current-country"
            name="currentCountry"
            defaultValue={initialValues.currentCountry ?? ""}
            autoComplete="country-name"
            placeholder={isTr ? "Avustralya, Türkiye, Hindistan veya başka bir ülke" : "Australia, Turkiye, India, or elsewhere"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="waitlist-main-goal">{isTr ? "Ana hedef" : "Main goal"}</Label>
          <Textarea
            id="waitlist-main-goal"
            name="mainGoal"
            defaultValue={initialValues.mainGoal ?? ""}
            placeholder={isTr ? "Raporun hangi konuda yardımcı olmasını istediğinizi belirtin" : "Tell us what you want the report to help with"}
            rows={3}
            required
          />
          <ErrorText message={state.errors?.mainGoal} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="waitlist-passport-country">{isTr ? "Pasaport ülkesi" : "Passport country"}</Label>
            <Input
              id="waitlist-passport-country"
              name="passportCountry"
              required
              placeholder={isTr ? "Ülke adı" : "Country name"}
            />
            <ErrorText message={state.errors?.passportCountry} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="waitlist-age">{isTr ? "Yaş" : "Age"}</Label>
            <Input
              id="waitlist-age"
              name="age"
              type="number"
              required
              placeholder={isTr ? "Örn: 28" : "E.g., 28"}
            />
            <ErrorText message={state.errors?.age} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="waitlist-occupation">{isTr ? "Meslek" : "Occupation"}</Label>
          <Input
            id="waitlist-occupation"
            name="occupation"
            placeholder={isTr ? "Örn: Yazılım Mühendisi" : "E.g., Software Engineer"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="waitlist-english">{isTr ? "İngilizce seviyesi" : "English level"}</Label>
          <Input
            id="waitlist-english"
            name="englishLevel"
            placeholder={isTr ? "Örn: IELTS 7.0 veya Yüksek" : "E.g., IELTS 7.0 or Proficient"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="waitlist-sponsor">{isTr ? "Sponsor veya aile durumu" : "Sponsor or family status"}</Label>
          <Input
            id="waitlist-sponsor"
            name="sponsorOrFamily"
            placeholder={isTr ? "Örn: İşveren sponsor, Partner veya Aile" : "E.g., Employer sponsor, Partner, or Family"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="waitlist-concern">{isTr ? "En büyük endişe" : "Biggest concern"}</Label>
          <Input
            id="waitlist-concern"
            name="biggestConcern"
            placeholder={isTr ? "Örn: Belgeler, Puan, Dil testi" : "E.g., Documents, Points, English test"}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="waitlist-english-test-taken">
              {isTr ? "İngilizce testi alındı mı? (opsiyonel)" : "English test taken? (optional)"}
            </Label>
            <select
              id="waitlist-english-test-taken"
              name="englishTestTaken"
              defaultValue=""
              className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <option value="">{isTr ? "Belirtmek istemiyorum" : "Prefer not to say"}</option>
              <option value="yes">{isTr ? "Evet" : "Yes"}</option>
              <option value="no">{isTr ? "Hayır" : "No"}</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="waitlist-occupation-confirmed">
              {isTr ? "Meslek bilgisi net mi? (opsiyonel)" : "Occupation confirmed? (optional)"}
            </Label>
            <select
              id="waitlist-occupation-confirmed"
              name="occupationConfirmed"
              defaultValue=""
              className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <option value="">{isTr ? "Belirtmek istemiyorum" : "Prefer not to say"}</option>
              <option value="yes">{isTr ? "Evet" : "Yes"}</option>
              <option value="no">{isTr ? "Hayır" : "No"}</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="waitlist-budget-range">
              {isTr ? "Tahmini bütçe aralığı (opsiyonel)" : "Estimated budget range (optional)"}
            </Label>
            <Input
              id="waitlist-budget-range"
              name="estimatedBudgetRange"
              placeholder={isTr ? "Örn: 10k-20k AUD" : "E.g., 10k-20k AUD"}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="waitlist-timeline">
              {isTr ? "Zamanlama (opsiyonel)" : "Timeline (optional)"}
            </Label>
            <select
              id="waitlist-timeline"
              name="timeline"
              defaultValue=""
              className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <option value="">{isTr ? "Belirtmek istemiyorum" : "Prefer not to say"}</option>
              <option value="0-6">{isTr ? "0-6 ay" : "0-6 months"}</option>
              <option value="6-12">{isTr ? "6-12 ay" : "6-12 months"}</option>
              <option value="12+">{isTr ? "12+ ay" : "12+ months"}</option>
            </select>
          </div>
        </div>

        {state.status === "success" && state.message && (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {state.message}
          </p>
        )}

        {state.status === "error" && state.message && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.message}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending
            ? isTr ? "Oluşturuluyor..." : "Generating..."
            : isTr ? "Hazırlık raporunuzu oluşturun" : "Generate your readiness report"}
        </Button>
      </form>

      {state.status === "success" && state.preview && state.reportId && !report && (
        <PremiumFeatureGate
          locale={locale}
          reportId={state.reportId}
          preview={state.preview}
          defaultEmail={state.userInput?.email}
          defaultName={state.userInput?.name}
          onUnlocked={({ report: unlocked, email, name }) => {
            setUnlockedReport(unlocked);
            setUnlockedEmail(email);
            setUnlockedName(name);
          }}
        />
      )}

      {state.status === "success" && report && (
        <section className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-xl font-bold">
              {isTr ? "Tam vize hazırlık raporu" : "Full visa readiness report"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isTr
                ? "Bu rapor yapısal bilgiye ve kişisel duruma bağlıdır. Kayıtlı bir göç danışmanı ile yapılan görüşme ek inceleme sağlar."
                : "This report is based on structured information and personal circumstances. A consultation with a registered migration agent provides additional review."}
            </p>
          </div>

          <div className="space-y-3">
            {report.executiveSummary.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {isTr ? "Yönetici Özeti" : "Executive Summary"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {report.executiveSummary.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="text-primary">-</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <Card className="border-primary/40 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-base">
                  {isTr ? "Sinyal Özeti" : "Signal Snapshot"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-md border border-primary/20 bg-background/80 p-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      {isTr ? "En güçlü sinyal" : "Strongest signal"}
                    </p>
                    <p className="mt-1 font-medium">{report.signalSnapshot.strongest}</p>
                  </div>
                  <div className="rounded-md border border-primary/20 bg-background/80 p-3 sm:col-span-2">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      {isTr ? "İkincil sinyaller" : "Secondary signals"}
                    </p>
                    <p className="mt-1 font-medium">
                      {report.signalSnapshot.secondary.length > 0
                        ? report.signalSnapshot.secondary.join(", ")
                        : isTr ? "Belirgin ikincil sinyal yok" : "No clear secondary signal"}
                    </p>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {isTr ? "Güven:" : "Confidence:"}{" "}
                    {getSignalConfidenceLabel(report.signalSnapshot.confidenceLabel)}
                  </span>{" "}
                  — {report.signalSnapshot.confidenceExplanation}
                </p>
              </CardContent>
            </Card>

            <Card className="border-amber-300 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-base text-amber-950">
                  {isTr ? "Birincil Sınırlayıcı Faktör" : "Primary Limiting Factor"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-amber-900">
                <p className="font-semibold">{report.primaryLimitingFactor.label}</p>
                <p>{report.primaryLimitingFactor.explanation}</p>
              </CardContent>
            </Card>

            {report.positionChangers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {isTr ? "Durumunuzu Değiştirebilecek Faktörler" : "What May Change Your Position"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {report.positionChangers.map((item) => (
                      <li key={`${item.label}-${item.explanation}`} className="flex gap-2">
                        <span className="text-primary">-</span>
                        <span>
                          <span className="font-medium text-foreground">{item.label}:</span>{" "}
                          {item.explanation}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {report.pathwayStrengthComparison.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {isTr ? "Vize Yolu Karşılaştırması" : "Pathway Strength Comparison"}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {isTr
                      ? "Her yolun sinyal gücü, zorluk seviyesi ve belge durumu sağlanan bilgilere göre değerlendirilmiştir."
                      : "Signal strength, friction level, and evidence status for each pathway based on provided information."}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {report.pathwayStrengthComparison.map((item) => (
                    <div key={`${item.subclass}-${item.visaName}-strength`} className="rounded-md border border-border/60 p-4 space-y-3 text-sm">
                      {/* Header row */}
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{item.visaName} ({item.subclass})</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.typicalPath}</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-xs">
                          <span className={`rounded-full px-2.5 py-0.5 font-medium ${getRelativePositionClass(item.relativePosition)}`}>
                            {getStrengthLabel(item.strength)}
                          </span>
                          <span className="rounded-full bg-muted px-2.5 py-0.5 text-muted-foreground">
                            {isTr ? "Zorluk seviyesi:" : "Friction:"} {getDifficultyLabel(item.friction)}
                          </span>
                          <span className="rounded-full bg-muted px-2.5 py-0.5 text-muted-foreground">
                            {isTr ? "Gerekli belge düzeyi:" : "Evidence load:"} {getEvidenceLoadLabel(item.evidenceLoad)}
                          </span>
                        </div>
                      </div>
                      {/* Signal reasons and limiting factors */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <p className="font-medium text-xs mb-1">{isTr ? "Sinyal nedenleri" : "Signal reasons"}</p>
                          <ul className="space-y-0.5">
                            {item.signalReasons.map((reason) => (
                              <li key={reason} className="flex gap-1.5 text-muted-foreground text-xs">
                                <span className="text-emerald-500 mt-px shrink-0">–</span>
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium text-xs mb-1">{isTr ? "Sınırlayıcı faktörler" : "Limiting factors"}</p>
                          <ul className="space-y-0.5">
                            {item.limitingFactors.map((factor) => (
                              <li key={factor} className="flex gap-1.5 text-muted-foreground text-xs">
                                <span className="text-amber-500 mt-px shrink-0">–</span>
                                <span>{factor}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      {/* Evidence status chips */}
                      <div>
                        <p className="font-medium text-xs mb-1.5">{isTr ? "Kanıt durumu" : "Evidence status"}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {item.evidenceStatus.map((ev) => (
                            <span
                              key={ev.label}
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getEvidenceStatusClass(ev.status)}`}
                            >
                              {ev.label}: {getEvidenceStatusLabel(ev.status)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {isTr ? "Güven Açıklaması" : "Confidence Explanation"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{report.confidenceExplanation}</p>
              </CardContent>
            </Card>

          </div>

          {report.evidenceReadiness.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {isTr ? "Kanıt/Bilgi Hazırlık Özeti" : "Evidence Readiness Snapshot"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.evidenceReadiness.map((item) => (
                  <div key={item.category} className="rounded-md border border-border/70 p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{item.category}</p>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                        {item.status === "provided"
                          ? isTr ? "Sağlandı" : "Provided"
                          : item.status === "missing"
                            ? isTr ? "Eksik" : "Missing"
                            : item.status === "typically_required"
                              ? isTr ? "Tipik olarak gerekir" : "Typically required"
                              : isTr ? "Net değil" : "Unclear"}
                      </span>
                    </div>
                    <p className="mt-2 text-muted-foreground">{item.explanation}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {report.pointsBoosterSimulator && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {isTr ? "Puan Senaryo Simülatörü" : "Points Booster Simulator"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.pointsBoosterSimulator.currentEstimate !== undefined && (
                  <p className="font-semibold">
                    {isTr ? "Mevcut matematiksel tahmin:" : "Current mathematical estimate:"} {report.pointsBoosterSimulator.currentEstimate}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {isTr
                    ? "Bu senaryolar yalnızca matematiksel puan değişimini gösterir; uygunluk veya sonuç anlamına gelmez."
                    : "This scenario reflects a mathematical change only and does not represent eligibility or outcome."}
                </p>
                <p className="text-xs text-muted-foreground">{report.pointsBoosterSimulator.note}</p>
                <div className="space-y-2">
                  {report.pointsBoosterSimulator.scenarios.map((scenario) => (
                    <div key={scenario.label} className="rounded-md border border-border/70 p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{scenario.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {scenario.estimatedChange >= 0 ? "+" : ""}{scenario.estimatedChange}
                          {scenario.resultingEstimate !== undefined ? ` → ${scenario.resultingEstimate}` : ""}
                        </p>
                      </div>
                      <p className="mt-2 text-muted-foreground">{scenario.explanation}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {report.financialRoadmap.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {isTr ? "Tahmini Maliyet Yol Haritası" : "Financial Roadmap"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.financialRoadmap.map((item) => (
                  <div key={item.category} className="rounded-md border border-border/70 p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{item.category}</p>
                      <p className="text-xs text-muted-foreground">{item.amountLabel}</p>
                    </div>
                    <p className="mt-2 text-muted-foreground">{item.explanation}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {report.progressionPathways.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {isTr ? "Tipik Geçiş Yolları" : "Bridge to PR / Typical Progression Pathways"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {isTr
                    ? "Avustralya vize sistemindeki tipik geçiş yolları aşağıdaki seçenekleri içerebilir."
                    : "Typical progression pathways in the Australian visa system may include the following options."}
                </p>
                {report.progressionPathways.map((item) => (
                  <div key={`${item.from}-${item.to}`} className="rounded-md border border-border/70 p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.from} → {item.to}</p>
                    </div>
                    <p className="mt-2 text-muted-foreground">{item.explanation}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {report.pathwayFriction.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {isTr ? "Vize Yolu Gerçeklik Kontrolü" : "Pathway Friction / Reality Check"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.pathwayFriction.map((item) => (
                  <div key={`${item.pathway}-${item.frictionType}`} className="rounded-md border border-border/70 p-3 text-sm">
                    <p className="font-medium">{item.pathway}</p>
                    <p className="text-xs text-muted-foreground">{item.frictionType}</p>
                    <p className="mt-2 text-muted-foreground">{item.explanation}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <ReportSection
            title={isTr ? "Risk göstergeleri" : "Risk indicators"}
            items={report.riskIndicators.map(
              (r) => `[${isTr ? (r.level === "high" ? "Yüksek" : r.level === "medium" ? "Orta" : "Düşük") : (r.level === "high" ? "High" : r.level === "medium" ? "Medium" : "Low")}] ${r.title}: ${r.explanation}`
            )}
          />

          <ReportSection
            title={isTr ? "Önerilen sonraki adımlar" : "Suggested next steps"}
            items={report.suggestedNextSteps}
          />

          {report.missingInformation.length > 0 && (
            <ReportSection
              title={isTr ? "Eksik bilgiler" : "Missing information"}
              items={report.missingInformation}
            />
          )}

          <Card className="bg-amber-50 border-amber-200">
            <CardHeader>
              <CardTitle className="text-sm text-amber-900">
                {isTr ? "Uyarı" : "Disclaimer"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-amber-800">{report.disclaimer}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {isTr ? "İndirilebilir PDF" : "Downloadable PDF"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
                Premium PDF Report (25+ Pages of Deep Analysis)
              </div>

              <div className="rounded-md border border-border bg-card/60 px-3 py-3">
                <p className="text-sm font-medium">{isTr ? "Sample Report önizlemesi" : "Sample Report preview"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isTr
                    ? "İçerik örneği: stratejik gantt, sürtünme analizi, maliyet yol haritası, audit checklist ve aksiyon planı."
                    : "Preview includes: strategic gantt, friction analysis, financial roadmap, audit checklist, and action plan."}
                </p>
              </div>

              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                {isTr ? "$29 Tek rapor ücreti" : "$29 for a Single Report"}
              </div>

              <Button onClick={handleDownloadPDF} variant="default" className="flex gap-2">
                <Download className="size-4" />
                {isTr ? "PDF indir" : "Download PDF"}
              </Button>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
