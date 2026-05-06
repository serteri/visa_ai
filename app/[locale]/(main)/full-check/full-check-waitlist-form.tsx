"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { sendGAEvent } from "@next/third-parties/google";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  type FullCheckWaitlistState,
  submitFullCheckWaitlist,
} from "./actions";
import { PremiumFeatureGate } from "@/components/premium-feature-gate";
import { LogiAIAssistant } from "@/components/LogiAIAssistant";
import { generateReadinessPDF } from "@/lib/readiness/generate-pdf";
import type { ReadinessReport } from "@/lib/readiness/types";

function trackGaEvent(name: string, params?: Record<string, string | number | boolean | null | undefined>) {
  if (typeof window === "undefined") return;
  const gaId = process.env.NEXT_PUBLIC_GA_ID?.trim();
  if (!gaId) return;
  if (!Array.isArray((window as { dataLayer?: Object[] }).dataLayer)) return;

  sendGAEvent("event", name, params ?? {});
}

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
  isZh,
}: {
  title: string;
  confidenceLabel: string;
  confidenceExplanation: string;
  summary: string;
  keyRequirements: string[];
  pathwayRisks: string[];
  isTr: boolean;
  isZh: boolean;
}) {
  const tx = (en: string, tr: string, zh: string) => (isTr ? tr : isZh ? zh : en);
  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base">{title}</CardTitle>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            {tx("Confidence:", "Güven:", "信心：")} {confidenceLabel}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{summary}</p>
        <p className="text-xs text-muted-foreground">{confidenceExplanation}</p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-2">
          <p className="font-medium">{tx("Key Requirements", "Ana Gereklilikler", "关键要求")}</p>
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
          <p className="font-medium">{tx("Pathway-Specific Risks", "Yola Özgü Riskler", "路径特定风险")}</p>
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

function LockedSection({ title, isTr, isZh }: { title: string; isTr: boolean; isZh: boolean }) {
  const tx = (en: string, tr: string, zh: string) => (isTr ? tr : isZh ? zh : en);
  return (
    <Card className="relative overflow-hidden border-dashed">
      <CardHeader className="opacity-45 blur-[1px]">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="opacity-45 blur-[1px]">
        <p className="text-sm text-muted-foreground">
          {tx(
            "This section is included in the generated report when relevant details are provided.",
            "Bu bölüm ilgili ayrıntılar sağlandığında oluşturulan raporda yer alır.",
            "提供相关详情后，此章节将包含在生成的报告中。"
          )}
        </p>
      </CardContent>
      <div className="absolute inset-0 flex items-center justify-center bg-background/65 p-4 backdrop-blur-[1px]">
        <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-2 text-sm font-medium shadow-sm">
          <Download className="size-4 text-primary" />
          <span>{tx("Locked", "Kilitli", "已锁定")}</span>
        </div>
      </div>
    </Card>
  );
}

export function FullCheckWaitlistForm({
  locale,
  initialValues = {},
  isFreeActive = true,
  remainingSpots = 0,
}: {
  locale: string;
  initialValues?: {
    visaInterest?: string;
    currentCountry?: string;
    mainGoal?: string;
    source?: string;
  };
  isFreeActive?: boolean;
  remainingSpots?: number;
}) {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const txt = (trText: string, enText: string, zhText: string) =>
    isTr ? trText : isZh ? zhText : enText;
  const initialState: FullCheckWaitlistState = {
    status: "idle",
  };

  const [state, formAction, isPending] = useActionState(
    submitFullCheckWaitlist,
    initialState
  );
  const [analysisStepIndex, setAnalysisStepIndex] = useState(0);
  const [analysisProgressId, setAnalysisProgressId] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `progress-${Date.now()}`
  );
  const wasPendingRef = useRef(false);
  const trackedReportIdRef = useRef<string | null>(null);
  const [unlockedReportState, setUnlockedReportState] = useState<{
    reportId?: string;
    report: ReadinessReport;
    name?: string;
    email?: string;
  } | null>(null);

  const aiAnalysisSteps = isTr
    ? [
        "691 meslek kodu taranıyor...",
        "Tarihsel davet trendleri analiz ediliyor...",
        "Değerlendirme kurumu kesinti kuralları uygulanıyor...",
        "Stratejik hazırlık raporu oluşturuluyor...",
      ]
    : isZh
    ? [
        "正在扫描 691 个职业代码...",
        "正在分析历史邀请趋势...",
        "正在应用评估机构扣减规则...",
        "正在生成战略准备度报告...",
      ]
    : [
        "Scanning 691 occupation codes...",
        "Analyzing historical invitation trends...",
        "Applying assessing authority deduction rules...",
        "Generating strategic readiness report...",
      ];

  const milestoneToIndex: Record<string, number> = {
    scanning_occupations: 0,
    analyzing_trends: 1,
    applying_deductions: 2,
    generating_report: 3,
    completed: 3,
    error: 0,
  };

  useEffect(() => {
    if (isPending) {
      wasPendingRef.current = true;
      return;
    }

    if (!wasPendingRef.current) return;

    wasPendingRef.current = false;
    setAnalysisStepIndex(0);
    setAnalysisProgressId(
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `progress-${Date.now()}`
    );
  }, [isPending]);

  useEffect(() => {
    if (!isPending) return;

    let cancelled = false;
    const intervalId = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/full-check/progress?id=${encodeURIComponent(analysisProgressId)}`, {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { status?: string; milestone?: string };
        if (data.status === "ok" && data.milestone && data.milestone in milestoneToIndex) {
          setAnalysisStepIndex(milestoneToIndex[data.milestone]);
        }
      } catch {
        // Keep current UI state if polling fails transiently.
      }
    }, 500);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [analysisProgressId, isPending]);

  useEffect(() => {
    if (state.status !== "success" || !state.reportId) return;
    if (trackedReportIdRef.current === state.reportId) return;

    trackGaEvent("report_generated", {
      report_id: state.reportId,
      locale,
      source: "full_check_waitlist",
    });

    trackedReportIdRef.current = state.reportId;
  }, [locale, state.reportId, state.status]);

  const activeUnlockedReportState =
    unlockedReportState?.reportId === state.reportId ? unlockedReportState : null;
  const report = activeUnlockedReportState?.report ?? null;
  const assistantReportData = report
    ? {
        user: {
          name: activeUnlockedReportState?.name ?? state.userInput?.name,
          email: activeUnlockedReportState?.email ?? state.userInput?.email,
          currentCountry: state.userInput?.currentCountry,
          age: state.userInput?.age,
          occupation: state.userInput?.occupation,
        },
        targetVisa:
          report.rankedPathways?.[0]?.subclass ??
          report.pathwayComparison[0]?.subclass ??
          undefined,
        pointsEstimate: report.pointsEstimate?.estimatedPoints,
        primaryLimitingFactor: report.primaryLimitingFactor,
        rankedPathways: report.rankedPathways,
        pathwayComparison: report.pathwayComparison,
        executiveSummary: report.executiveSummary,
        suggestedNextSteps: report.suggestedNextSteps,
        riskIndicators: report.riskIndicators,
      }
    : null;

  async function handleDownloadPDF() {
    if (!report) return;

    await generateReadinessPDF({
      report,
      locale: locale === "tr" ? "tr" : locale === "zh-Hans" ? "zh-Hans" : "en",
      userInputSummary: {
        ...(state.userInput || {}),
        name: activeUnlockedReportState?.name ?? state.userInput?.name,
        email: activeUnlockedReportState?.email ?? state.userInput?.email,
      },
    });
  }

  function getConfidenceLabel(level: "low" | "medium" | "high") {
    if (isTr) return level === "high" ? "Yüksek" : level === "medium" ? "Orta" : "Düşük";
    if (isZh) return level === "high" ? "高" : level === "medium" ? "中" : "低";
    return level === "high" ? "High" : level === "medium" ? "Medium" : "Low";
  }

  function getDifficultyLabel(level: "low" | "medium" | "high") {
    if (isTr) return level === "high" ? "Yüksek" : level === "medium" ? "Orta" : "Düşük";
    if (isZh) return level === "high" ? "高" : level === "medium" ? "中" : "低";
    return level === "high" ? "High" : level === "medium" ? "Medium" : "Low";
  }

  function getStrengthLabel(level: "limited" | "moderate" | "strong") {
    if (isTr) return level === "strong" ? "Daha güçlü sinyal" : level === "moderate" ? "Orta sinyal" : "Sınırlı sinyal";
    if (isZh) return level === "strong" ? "信号较强" : level === "moderate" ? "信号中等" : "信号有限";
    return level === "strong" ? "Stronger signal" : level === "moderate" ? "Moderate signal" : "Limited signal";
  }

  function getSignalConfidenceLabel(level: "limited" | "moderate" | "stronger") {
    if (isTr) return level === "stronger" ? "Daha güçlü" : level === "moderate" ? "Orta" : "Sınırlı";
    if (isZh) return level === "stronger" ? "较强" : level === "moderate" ? "中等" : "有限";
    return level === "stronger" ? "Stronger" : level === "moderate" ? "Moderate" : "Limited";
  }

  function getEvidenceLoadLabel(level: "low" | "medium" | "high") {
    if (isTr) return level === "high" ? "Yüksek" : level === "medium" ? "Orta" : "Düşük";
    if (isZh) return level === "high" ? "高" : level === "medium" ? "中" : "低";
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
    if (isZh) {
      if (status === "provided") return "已提供";
      if (status === "missing") return "缺少";
      if (status === "unclear") return "不明确";
      return "通常需要";
    }
    if (status === "provided") return "Provided";
    if (status === "missing") return "Missing";
    if (status === "unclear") return "Unclear";
    return "Typically required";
  }

  const fieldClassName =
    "h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm shadow-sm transition-all outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20";
  const selectClassName =
    "h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm shadow-sm transition-all outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20";

  return (
    <div className="space-y-6">
      {isPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-border/70 bg-card/95 p-6 shadow-2xl">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">AI Analysis</p>
              <h3 className="text-xl font-semibold text-foreground">
                {isTr ? "Profiliniz işleniyor" : isZh ? "正在处理你的档案" : "Processing your profile"}
              </h3>
            </div>

            <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                style={{ width: `${((analysisStepIndex + 1) / aiAnalysisSteps.length) * 100}%` }}
              />
            </div>

            <div className="mt-4 min-h-7 rounded-lg border border-border/60 bg-background/70 px-3 py-2">
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {aiAnalysisSteps[analysisStepIndex]}
              </p>
            </div>

            <div className="mt-4 flex gap-1.5">
              {aiAnalysisSteps.map((step, idx) => (
                <span
                  key={step}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    idx <= analysisStepIndex ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <form action={formAction} className="space-y-4" noValidate>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="preferredLanguage" value={locale} />
        <input type="hidden" name="source" value={initialValues.source ?? "full_check"} />
        <input type="hidden" name="analysisProgressId" value={analysisProgressId} />

        <div className="space-y-2">
          <Label htmlFor="waitlist-full-name">{txt("Ad soyad", "Full name", "姓名")}</Label>
          <Input
            id="waitlist-full-name"
            name="fullName"
            autoComplete="name"
            className={fieldClassName}
            placeholder={txt("Adınız", "Your name", "请输入姓名")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="waitlist-email">{txt("E-posta adresi", "Email address", "邮箱地址")}</Label>
          <Input
            id="waitlist-email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            className={fieldClassName}
            required
          />
          <ErrorText message={state.errors?.email} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="waitlist-visa-interest">
            {txt("Bu rapor hangi vize yoluna odaklanmalı?", "Which visa pathway should this report focus on?", "本报告应重点分析哪条签证路径？")}
          </Label>
          <select
            id="waitlist-visa-interest"
            name="visaInterest"
            defaultValue={initialValues.visaInterest ?? ""}
            className={selectClassName}
          >
            <option value="">{txt("Tüm yollar / Emin değilim", "All pathways / Not sure", "全部路径 / 不确定")}</option>
            <option value="500">{txt("Öğrenci Vizesi 500", "Student visa 500", "500 学生签证")}</option>
            <option value="485">{txt("Geçici Mezun Vizesi 485", "Temporary Graduate visa 485", "485 临时毕业生签证")}</option>
            <option value="482">{txt("Skills in Demand Vizesi 482", "Skills in Demand visa 482", "482 紧缺技能签证")}</option>
            <option value="189">{txt("Skilled Independent Vizesi 189", "Skilled Independent visa 189", "189 独立技术移民")}</option>
            <option value="190">{txt("Skilled Nominated Vizesi 190", "Skilled Nominated visa 190", "190 州担保技术移民")}</option>
            <option value="491">{txt("Skilled Work Regional Vizesi 491", "Skilled Work Regional visa 491", "491 偶远地区技术签证")}</option>
            <option value="820_801">{txt("Partner Vizesi 820/801", "Partner visa 820/801", "820/801 境内配偶签证")}</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="waitlist-current-country">{txt("Bulunduğunuz ülke", "Current country", "当前国家")}</Label>
          <Input
            id="waitlist-current-country"
            name="currentCountry"
            defaultValue={initialValues.currentCountry ?? ""}
            autoComplete="country-name"
            className={fieldClassName}
            placeholder={txt("Avustralya, Türkiye, Hindistan veya başka bir ülke", "Australia, Turkiye, India, or elsewhere", "例如：澳大利亚、中国、土耳其等")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="waitlist-main-goal">{txt("Ana hedef", "Main goal", "主要目标")}</Label>
          <Textarea
            id="waitlist-main-goal"
            name="mainGoal"
            defaultValue={initialValues.mainGoal ?? ""}
            className="min-h-28 rounded-xl border-border/70 bg-background/80 px-4 py-3 shadow-sm transition focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            placeholder={txt("Raporun hangi konuda yardımcı olmasını istediğinizi belirtin", "Tell us what you want the report to help with", "请说明你希望报告重点解决的问题")}
            rows={3}
            required
          />
          <ErrorText message={state.errors?.mainGoal} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="waitlist-passport-country">{txt("Pasaport ülkesi", "Passport country", "护照国家")}</Label>
            <Input
              id="waitlist-passport-country"
              name="passportCountry"
              required
              className={fieldClassName}
              placeholder={txt("Ülke adı", "Country name", "国家名称")}
            />
            <ErrorText message={state.errors?.passportCountry} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="waitlist-age">{txt("Yaş", "Age", "年龄")}</Label>
            <Input
              id="waitlist-age"
              name="age"
              type="number"
              required
              className={fieldClassName}
              placeholder={txt("Örn: 28", "E.g., 28", "例如：28")}
            />
            <ErrorText message={state.errors?.age} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="waitlist-occupation">{txt("Meslek", "Occupation", "职业")}</Label>
          <Input
            id="waitlist-occupation"
            name="occupation"
            className={fieldClassName}
            placeholder={txt("Örn: Yazılım Mühendisi", "E.g., Software Engineer", "例如：软件工程师")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="waitlist-english">{txt("İngilizce seviyesi", "English level", "英语水平")}</Label>
          <Input
            id="waitlist-english"
            name="englishLevel"
            className={fieldClassName}
            placeholder={txt("Örn: IELTS 7.0 veya Yüksek", "E.g., IELTS 7.0 or Proficient", "例如：IELTS 7.0 或 Proficient")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="waitlist-sponsor">{txt("Sponsor veya aile durumu", "Sponsor or family status", "担保或家庭情况")}</Label>
          <Input
            id="waitlist-sponsor"
            name="sponsorOrFamily"
            className={fieldClassName}
            placeholder={txt("Örn: İşveren sponsor, Partner veya Aile", "E.g., Employer sponsor, Partner, or Family", "例如：雇主担保、配偶或家庭")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="waitlist-concern">{txt("En büyük endişe", "Biggest concern", "最大担忧")}</Label>
          <Input
            id="waitlist-concern"
            name="biggestConcern"
            className={fieldClassName}
            placeholder={txt("Örn: Belgeler, Puan, Dil testi", "E.g., Documents, Points, English test", "例如：材料、分数、英语考试")}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="waitlist-english-test-taken">
              {txt("İngilizce testi alındı mı? (opsiyonel)", "English test taken? (optional)", "英语考试成绩（可选）")}
            </Label>
            <select
              id="waitlist-english-test-taken"
              name="englishTestTaken"
              defaultValue=""
              className={selectClassName}
            >
              <option value="">{txt("Belirtmek istemiyorum", "Prefer not to say", "不愿意说明")}</option>
              <option value="yes">{txt("Evet", "Yes", "是")}</option>
              <option value="no">{txt("Hayır", "No", "否")}</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="waitlist-occupation-confirmed">
              {txt("Meslek bilgisi net mi? (opsiyonel)", "Occupation confirmed? (optional)", "职业已确认？（可选）")}
            </Label>
            <select
              id="waitlist-occupation-confirmed"
              name="occupationConfirmed"
              defaultValue=""
              className={selectClassName}
            >
              <option value="">{txt("Belirtmek istemiyorum", "Prefer not to say", "不愿意说明")}</option>
              <option value="yes">{txt("Evet", "Yes", "是")}</option>
              <option value="no">{txt("Hayır", "No", "否")}</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="waitlist-budget-range">
              {txt("Tahmini bütçe aralığı (opsiyonel)", "Estimated budget range (optional)", "预算范围（可选）")}
            </Label>
            <Input
              id="waitlist-budget-range"
              name="estimatedBudgetRange"
              className={fieldClassName}
              placeholder={txt("Orn: 10k-20k AUD", "E.g., 10k-20k AUD", "例如：10k-20k AUD")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="waitlist-timeline">
              {txt("Zamanlama (opsiyonel)", "Timeline (optional)", "时间规划（可选）")}
            </Label>
            <select
              id="waitlist-timeline"
              name="timeline"
              defaultValue=""
              className={selectClassName}
            >
              <option value="">{txt("Belirtmek istemiyorum", "Prefer not to say", "不愿意说明")}</option>
              <option value="0-6">{txt("0-6 ay", "0-6 months", "0-6 个月")}</option>
              <option value="6-12">{txt("6-12 ay", "6-12 months", "6-12 个月")}</option>
              <option value="12+">{txt("12+ ay", "12+ months", "12 个月以上")}</option>
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

        {isFreeActive && remainingSpots > 0 && (
          <div className="rounded-xl border border-amber-300/60 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 text-center space-y-1">
            <p className="text-sm font-bold text-amber-900">
              {txt(
                `Ücretsiz rapor için yalnızca ${remainingSpots} kontenjan kaldı!`,
                `Only ${remainingSpots} spots left for the free report!`,
                `免费报告仅剩 ${remainingSpots} 个名额！`
              )}
            </p>
            <p className="text-xs text-amber-700">
              {txt(
                "Kontenjan dolduğunda rapor $29 olacak.",
                "Report will be $29 once spots run out.",
                "名额用完后报告将收费 $29。"
              )}
            </p>
          </div>
        )}

        <Button type="submit" className="h-11 w-full rounded-lg text-sm font-semibold" disabled={isPending}>
          {isPending
            ? txt("Oluşturuluyor...", "Generating...", "生成中...")
            : isFreeActive
              ? txt(
                  "Ücretsiz hazırlık raporunuzu oluşturun",
                  "Generate your FREE readiness report",
                  "生成免费准备度报告"
                )
              : txt(
                  "Hazırlık raporunuzu oluşturun ($29)",
                  "Generate your readiness report ($29)",
                  "生成准备度报告 ($29)"
                )}
        </Button>
      </form>

      {state.status === "success" && state.preview && state.reportId && !report && (
        <PremiumFeatureGate
          locale={locale}
          reportId={state.reportId}
          preview={state.preview}
          defaultEmail={state.userInput?.email}
          defaultName={state.userInput?.name}
          isFreeActive={isFreeActive}
          remainingSpots={remainingSpots}
          onUnlocked={({ report: unlocked, email, name }) => {
            setUnlockedReportState({
              reportId: state.reportId,
              report: unlocked,
              email,
              name,
            });
          }}
        />
      )}

      {state.status === "success" && report && (
        <section className="space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {txt(
              "Raporunuzun kilidi acildi. Premium detaylariniz hazir.",
              "Your report is unlocked. Premium insights are ready.",
              "你的报告已解锁，高级分析已准备就绪。"
            )}
          </div>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-foreground/90">
                {txt(
                  "Beta surecindeyiz. Raporu nasil buldunuz? Gelistirmemize yardimci olun.",
                  "We are in Beta! How was your report? Help us improve.",
                  "我们正处于 Beta 阶段。你觉得这份报告如何？欢迎帮助我们持续改进。"
                )}
              </p>
              <Button asChild className="h-10 rounded-lg px-4">
                <a href="mailto:hello@logivisa.com?subject=Beta%20Feedback%20-%20Visa%20Readiness%20Report">
                  {txt("Geri Bildirim Paylas", "Share Feedback", "分享反馈")}
                </a>
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-1">
            <h3 className="text-xl font-bold">
              {txt("完整签证准备度报告", "Tam vize hazırlık raporu", "Full visa readiness report")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {txt(
                "本报告基于结构化信息和个人情况。和注册移民顾问面谈可提供进一步评估。",
                "Bu rapor yapısal bilgiye ve kişisel duruma bağlıdır. Kayıtlı bir göç danışmanı ile yapılan görüşme ek inceleme sağlar.",
                "This report is based on structured information and personal circumstances. A consultation with a registered migration agent provides additional review."
              )}
            </p>
          </div>

          <div className="space-y-3">
            {report.executiveSummary.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {txt("执行摘要", "Yönetici Özeti", "Executive Summary")}
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

            {report.rankedPathways && report.rankedPathways.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {txt("签证可行性排序", "Vize Sans Siralamasi", "Visa Viability Ranking")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {report.rankedPathways.map((item, index) => {
                    const barColor =
                      index === 0
                        ? "bg-emerald-500"
                        : index === 1
                          ? "bg-amber-500"
                          : "bg-red-500";

                    return (
                      <div key={item.subclass} className="rounded-md border border-border/70 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            {item.visaLabel} - {item.matchPercentage}% Match
                          </p>
                          <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                            {item.recommendationTag}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Points Signal: {item.pointsSignal}
                        </p>
                        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${barColor}`}
                            style={{ width: `${item.matchPercentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            <Card className="border-primary/40 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-base">
                  {txt("信号摘要", "Sinyal Özeti", "Signal Snapshot")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-md border border-primary/20 bg-background/80 p-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      {txt("最强信号", "En güçlü sinyal", "Strongest signal")}
                    </p>
                    <p className="mt-1 font-medium">{report.signalSnapshot.strongest}</p>
                  </div>
                  <div className="rounded-md border border-primary/20 bg-background/80 p-3 sm:col-span-2">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      {txt("次要信号", "İkincil sinyaller", "Secondary signals")}
                    </p>
                    <p className="mt-1 font-medium">
                      {report.signalSnapshot.secondary.length > 0
                        ? report.signalSnapshot.secondary.join(", ")
                        : txt("无明确次要信号", "Belirgin ikincil sinyal yok", "No clear secondary signal")}
                    </p>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {txt("信心：", "Güven:", "Confidence:")}{" "}
                    {getSignalConfidenceLabel(report.signalSnapshot.confidenceLabel)}
                  </span>{" "}
                  — {report.signalSnapshot.confidenceExplanation}
                </p>
              </CardContent>
            </Card>

            <Card className="border-amber-300 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-base text-amber-950">
                  {txt("主要限制因素", "Birincil Sınırlayıcı Faktör", "Primary Limiting Factor")}
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
                    {txt("可能影响您位置的因素", "Durumunuzu Değiştirebilecek Faktörler", "What May Change Your Position")}
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
                    {txt("路径强度对比", "Vize Yolu Karşılaştırması", "Pathway Strength Comparison")}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {txt(
                      "信号强度、阻力等级及材料准备状态均基于提供的信息评估。",
                      "Her yolun sinyal güü, zorluk seviyesi ve belge durumu sağlanan bilgilere göre değerlendirilmiştir.",
                      "Signal strength, friction level, and evidence status for each pathway based on provided information."
                    )}
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
                            {txt("阻力：", "Zorluk seviyesi:", "Friction:")} {getDifficultyLabel(item.friction)}
                          </span>
                          <span className="rounded-full bg-muted px-2.5 py-0.5 text-muted-foreground">
                            {txt("材料量：", "Gerekli belge düzeyi:", "Evidence load:")} {getEvidenceLoadLabel(item.evidenceLoad)}
                          </span>
                        </div>
                      </div>
                      {/* Signal reasons and limiting factors */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <p className="font-medium text-xs mb-1">{txt("信号原因", "Sinyal nedenleri", "Signal reasons")}</p>
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
                          <p className="font-medium text-xs mb-1">{txt("限制因素", "Sınırlayıcı faktörler", "Limiting factors")}</p>
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
                        <p className="font-medium text-xs mb-1.5">{txt("材料状态", "Kanıt durumu", "Evidence status")}</p>
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
                  {txt("置信度说明", "Güven Açıklaması", "Confidence Explanation")}
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
                  {txt("材料准备度摘要", "Kanıt/Bilgi Hazırlık Özeti", "Evidence Readiness Snapshot")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.evidenceReadiness.map((item) => (
                  <div key={item.category} className="rounded-md border border-border/70 p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{item.category}</p>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                        {item.status === "provided"
                          ? txt("已提供", "Sağlandı", "Provided")
                          : item.status === "missing"
                            ? txt("缺少", "Eksik", "Missing")
                            : item.status === "typically_required"
                              ? txt("通常需要", "Tipik olarak gerekir", "Typically required")
                              : txt("不明确", "Net değil", "Unclear")}
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
                  {txt("加分场景模拟", "Puan Senaryo Simülätörü", "Points Booster Simulator")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.pointsBoosterSimulator.currentEstimate !== undefined && (
                  <p className="font-semibold">
                      {txt("当前数学估算：", "Mevcut matematiksel tahmin:", "Current mathematical estimate:")} {report.pointsBoosterSimulator.currentEstimate}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {txt(
                      "此场景仅反映数学分数变化，不代表资格或结果。",
                      "Bu senaryolar yalnızca matematiksel puan değişimini gösterir; uygunluk veya sonuç anlamına gelmez.",
                      "This scenario reflects a mathematical change only and does not represent eligibility or outcome."
                    )}
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
                  {txt("费用路线图", "Tahmini Maliyet Yol Haritası", "Financial Roadmap")}
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
                  {txt("通往永居路径", "Tipik Geçiş Yolları", "Bridge to PR / Typical Progression Pathways")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {txt(
                    "澳大利亚签证体系的典型过渡路径可能包含以下选项。",
                    "Avustralya vize sistemindeki tipik geçiş yolları aşağıdaki seçenekleri içerebilir.",
                    "Typical progression pathways in the Australian visa system may include the following options."
                  )}
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
                  {txt("路径阻力 / 现实校验", "Vize Yolu Gerçeklik Kontrolü", "Pathway Friction / Reality Check")}
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
            title={txt("风险指标", "Risk göstergeleri", "Risk indicators")}
            items={report.riskIndicators.map(
              (r) => `[${isZh ? (r.level === "high" ? "高" : r.level === "medium" ? "中" : "低") : isTr ? (r.level === "high" ? "Yüksek" : r.level === "medium" ? "Orta" : "Düşük") : (r.level === "high" ? "High" : r.level === "medium" ? "Medium" : "Low")}] ${r.title}: ${r.explanation}`
            )}
          />

          <ReportSection
            title={txt("建议下一步", "Önerilen sonraki adımlar", "Suggested next steps")}
            items={report.suggestedNextSteps}
          />

          {report.missingInformation.length > 0 && (
            <ReportSection
              title={txt("缺少信息", "Eksik bilgiler", "Missing information")}
              items={report.missingInformation}
            />
          )}

          <Card className="bg-amber-50 border-amber-200">
            <CardHeader>
              <CardTitle className="text-sm text-amber-900">
                {txt("免责声明", "Uyarı", "Disclaimer")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-amber-800">{report.disclaimer}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                  {txt("可下载 PDF", "İndirilebilir PDF", "Downloadable PDF")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
                {txt(
                  "高级 PDF 报告（25+ 页深度分析）",
                  "Premium PDF Report (25+ Sayfalik Derin Analiz)",
                  "Premium PDF Report (25+ Pages of Deep Analysis)"
                )}
              </div>

              <div className="rounded-md border border-border bg-card/60 px-3 py-3">
                <p className="text-sm font-medium">{txt("样本报告预览", "Sample Report önizlemesi", "Sample Report preview")}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {txt(
                    "内容示例：战略甘特图、阻力分析、费用路线图、审计清单和行动计划。",
                    "İçerik örneği: stratejik gantt, sürtünme analizi, maliyet yol haritası, audit checklist ve aksiyon planı.",
                    "Preview includes: strategic gantt, friction analysis, financial roadmap, audit checklist, and action plan."
                  )}
                </p>
              </div>

              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                {txt("$29 Tek rapor üreti", "$29 Tek rapor üreti", "$29 for a Single Report")}
              </div>

              <Button onClick={handleDownloadPDF} variant="default" className="flex gap-2">
                <Download className="size-4" />
                {txt("PDF indir", "PDF indir", "Download PDF")}
              </Button>
            </CardContent>
          </Card>
        </section>
      )}

      {state.status === "success" && assistantReportData && (
        <LogiAIAssistant locale={locale} reportData={assistantReportData} />
      )}
    </div>
  );
}
