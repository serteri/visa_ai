"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { trackEvent } from "@/lib/analytics/events";
import { assessmentStepErrors, ASSESSMENT_FIELD_IDS } from "@/lib/intake/assessment-validation";

import { Button } from "@/components/ui/button";
import { type FullCheckWaitlistState, submitFullCheckWaitlist } from "./actions";
import { defaultCountry, isSupportedCountry, isPartnerFamilySponsorship, type SupportedCountry, type VisaPathwayOption, type MigrationGoalId } from "@/lib/countries";
import { PremiumFeatureGate } from "@/components/premium-feature-gate";
import { TermsGate, TermsGateLink } from "@/components/terms-gate";
import { ReferralConsentBox } from "./referral-consent-box";
import { applyDestination, destinationFromParam, isDestination, passportIsDestination, toPassportLocale, type Destination } from "@/lib/intake/passport";
import { LogiAIAssistant } from "@/components/LogiAIAssistant";
import { downloadReportPdf } from "@/lib/client/download-report-pdf";
import type { AssistantReportData } from "@/lib/readiness/types";
import { LeadMagnetForm } from "@/components/LeadMagnetForm";
import { RequiredLegend } from "@/components/required-legend";
import { LEAD_MAGNETS, pick } from "@/lib/lead-magnets";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import nocListRaw from "@/src/data/countries/ca/noc-list.json";
import { getLocalizedAnzscoTitle, resolveAnzscoEntry, searchAnzsco, type AnzscoEntry } from "@/lib/intake/anzsco-search";
import { AU_ENGLISH_LEVEL_OPTIONS, EDUCATION_OPTIONS, optionLabel } from "@/lib/intake/fields";
import Fuse from "fuse.js";

import { Step1Personal } from "./step-1-personal";
import { Step2Career } from "./step-2-career";
import { Step3Language } from "./step-3-language";

// ── Helpers & types ───────────────────────────────────────────────────────────
const COURSE_FIELDS_VISA_INTERESTS = ["500", "485"];
function showsCourseFields(visaInterest: string): boolean {
  return COURSE_FIELDS_VISA_INTERESTS.includes(visaInterest);
}

type NocEntry = { code: string; title: string; teer: number };

const NOC_ALIAS_MAP_STATIC: Record<string, string[]> = {
  physician: ["doctor", "medical doctor", "doc", "gp", "surgeon", "pediatrician", "psychiatrist", "internist", "specialist", "md", "family doctor"],
  nursing: ["nurse", "rn", "lpn", "registered nurse", "practitioner", "midwife", "midwifery"],
  care: ["caregiver", "psw", "support worker", "elder care", "nanny", "personal support", "health aide"],
  pharmacy: ["pharmacist", "chemist", "dispenser", "pharmacy technician"],
  dental: ["dentist", "dental hygienist", "orthodontist", "dental assistant", "oral health"],
  software: ["programmer", "coder", "software engineer", "developer", "dev", "frontend", "backend", "fullstack", "web developer", "mobile developer"],
  data: ["data scientist", "data analyst", "machine learning", "ml engineer", "ai", "artificial intelligence", "database"],
  civil: ["civil engineer", "structural engineer", "geotechnical", "site engineer"],
  mechanical: ["mechanical engineer", "hvac engineer", "manufacturing engineer"],
  electrical: ["electrical engineer", "electronics engineer", "power engineer"],
  accounting: ["accountant", "cpa", "bookkeeper", "auditor", "tax specialist"],
  culinary: ["chef", "cook", "baker", "sous chef", "pastry chef"],
  mechanic: ["auto mechanic", "technician", "automotive technician", "diesel mechanic"],
};

type NocIndexEntry = NocEntry & { aliasText: string };
const NOC_INDEX: NocIndexEntry[] = (nocListRaw as NocEntry[]).map((entry) => {
  const titleLower = entry.title.toLowerCase();
  const aliasTerms: string[] = [];
  for (const [nocKeyword, aliases] of Object.entries(NOC_ALIAS_MAP_STATIC)) {
    if (titleLower.includes(nocKeyword.toLowerCase())) aliasTerms.push(...aliases);
  }
  return { ...entry, aliasText: aliasTerms.join(" ") };
});

const NOC_FUSE = new Fuse<NocIndexEntry>(NOC_INDEX, {
  keys: [{ name: "title", weight: 1.0 }, { name: "aliasText", weight: 0.7 }, { name: "code", weight: 0.3 }],
  threshold: 0.38, distance: 200, minMatchCharLength: 2, includeScore: true, ignoreLocation: true,
});

function searchNoc(query: string): NocEntry[] {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase().trim();
  const expandedKeywords = new Set<string>();
  for (const [nocKeyword, aliases] of Object.entries(NOC_ALIAS_MAP_STATIC)) {
    if (aliases.some((alias) => alias.toLowerCase().startsWith(q) || alias.toLowerCase() === q || q.startsWith(alias.toLowerCase())))
      expandedKeywords.add(nocKeyword.toLowerCase());
  }
  const fuseResults = NOC_FUSE.search(q, { limit: 30 });
  const aliasResults = [...expandedKeywords].flatMap((kw) => NOC_FUSE.search(kw, { limit: 10 }));
  const seen = new Set<string>();
  const merged: NocEntry[] = [];
  const add = (e: NocIndexEntry) => { if (!seen.has(e.code)) { seen.add(e.code); merged.push({ code: e.code, title: e.title, teer: e.teer }); } };
  aliasResults.forEach((r) => add(r.item));
  fuseResults.forEach((r) => add(r.item));
  return merged.slice(0, 14);
}

// ANZSCO occupation search: shared with the in-chat quick profile card (lib/intake/anzsco-search.ts).

function noAutofill(field: string, override?: string): Record<string, string> {
  return {
    autoComplete: override ?? "nope",
    autoCorrect: "off",
    autoCapitalize: "off",
    spellCheck: "false",
    "data-lpignore": "true",
    "data-1p-ignore": "true",
  };
}

export { renderVisaPathwayOptions };

function renderVisaPathwayOptions(options: VisaPathwayOption[], isTr: boolean, isZh: boolean) {
  return options.map((opt) => (
    <option className="bg-gray-900 text-white" key={opt.value} value={opt.value}>{opt.label[isTr ? "tr" : isZh ? "zh-Hans" : "en"] ?? opt.label.en}</option>
  ));
}

// ── Main Form Component ───────────────────────────────────────────────────────
export function FullCheckWaitlistForm({
  locale,
  initialValues = {},
  paidCheckoutEnabled = true,
  canadaReportEnabled = false,
  onCountryChange,
  onVisaInterestChange,
}: {
  locale: string;
  initialValues?: Record<string, string>;
  isFreeActive?: boolean;
  remainingSpots?: number;
  paidCheckoutEnabled?: boolean;
  canadaReportEnabled?: boolean;
  onCountryChange?: (country: SupportedCountry) => void;
  onVisaInterestChange?: (visa: string) => void;
}) {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const txt = (tr: string, en: string, zh: string) => (isTr ? tr : isZh ? zh : en);

  const [currentStep, setCurrentStep] = useState(1);
  const [stepErrors, setStepErrors] = useState<Record<string, string> | null>(null);

  const formRef = useRef<HTMLFormElement | null>(null);
  const validateStep = (step: number): boolean => {
    if (!formRef.current) return false;
    const values = Object.fromEntries([...new FormData(formRef.current).entries()].map(([key, value]) => [key, typeof value === "string" ? value : ""]));
    const found = assessmentStepErrors(step, values, isPartnerFamilySponsorship(values.visaInterest), values.targetCountry === "AU");
    const errors: Record<string, string> = {};
    for (const [name, kind] of Object.entries(found)) {
      const id = ASSESSMENT_FIELD_IDS[name] ?? name;
      const control = document.getElementById(id) ?? formRef.current.querySelector<HTMLElement>(`[name="${name}"]`);
      const label = document.querySelector(`label[for="${id}"]`)?.textContent?.replaceAll("*", "").trim() ?? control?.parentElement?.querySelector("label")?.textContent?.replaceAll("*", "").trim();
      const message = kind === "email" ? txt("Geçerli bir e-posta adresi girin.", "Enter a valid email address.", "请输入有效的邮箱地址。")
        : kind === "number" ? txt("Geçerli bir sayı girin.", "Enter a valid number.", "请输入有效数字。")
        : txt("Bu alanı doldurun veya bir seçenek seçin.", "Complete this field or select an option.", "请填写此项或选择一个选项。");
      errors[id] = label ? `${label}: ${message}` : message;
    }
    setStepErrors(errors);
    if (Object.keys(errors).length) {
      requestAnimationFrame(() => {
        const id = Object.keys(errors)[0];
        const input = document.getElementById(id) ?? formRef.current?.querySelector<HTMLElement>(`[name="${id}"]`);
        const visible = input?.getAttribute("type") === "hidden" ? input.previousElementSibling : input;
        visible?.scrollIntoView({ behavior: "smooth", block: "center" });
        if (visible instanceof HTMLElement) visible.focus();
      });
      return false;
    }
    return true;
  };

  const nextStep = () => {
    if (!validateStep(currentStep)) {
      return;
    }
    setCurrentStep((s) => Math.min(s + 1, 3));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const prevStep = () => { setStepErrors(null); setCurrentStep((s) => Math.max(s - 1, 1)); };

  const initialState: FullCheckWaitlistState = { status: "idle" };
  const [state, formAction, isPending] = useActionState(submitFullCheckWaitlist, initialState);

  const [selectedCountry, setSelectedCountry] = useState<SupportedCountry>(
    isSupportedCountry(initialValues.targetCountry) ? (initialValues.targetCountry as SupportedCountry) : defaultCountry
  );
  const [currentCountry, setCurrentCountry] = useState(initialValues.currentCountry ?? "");
  // The chosen destination ("" until one is chosen, or named by ?country=). The passport list never offers it, and choosing it clears a passport country.
  const initialDestination: Destination | "" = destinationFromParam(initialValues.destination);
  const [destination, setDestination] = useState<Destination | "">(initialDestination);
  const [passportCountry, setPassportCountry] = useState(passportIsDestination(initialValues.passportCountry, initialDestination) ? "" : (initialValues.passportCountry ?? ""));
  const [passportNote, setPassportNote] = useState<string | null>(null);
  const changeDestination = (c: string) => {
    if (!isDestination(c)) return;
    setSelectedCountry(c);
    setDestination(c);
    const next = applyDestination(passportCountry, c, toPassportLocale(locale));
    setPassportCountry(next.passport);
    setPassportNote(next.note);
    onCountryChange?.(c);
  };
  const initialAnzscoEntry = resolveAnzscoEntry(initialValues.occupation);
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [occupationModalOpen, setOccupationModalOpen] = useState(false);
  const startedRef = useRef(false);
  const [analysisProgressId] = useState(() => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `progress-${Date.now()}`);
  const wasPendingRef = useRef(false);
  const trackedReportIdRef = useRef<string | null>(null);
  const [unlockedReportState, setUnlockedReportState] = useState<{ reportId?: string; name?: string; email?: string; isUnlocked?: boolean; accessToken?: string } | null>(null);
  const reportSectionRef = useRef<HTMLDivElement | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const pdfErrorMessage = txt(
    "PDF indirilemedi. Lütfen tekrar deneyin; sorun sürerse bizimle iletişime geçin.",
    "The PDF could not be downloaded. Please try again, and contact us if it keeps failing.",
    "无法下载 PDF。请重试；如仍失败，请联系我们。"
  );

  // ── Search state ──
  const [nocSearch, setNocSearch] = useState(initialValues.occupation ?? "");
  const [nocCode, setNocCode] = useState("");
  const [nocTeer, setNocTeer] = useState<number | null>(null);
  const [nocResults, setNocResults] = useState<NocEntry[]>([]);
  const [nocOpen, setNocOpen] = useState(false);
  const [anzscoSearch, setAnzscoSearch] = useState(initialAnzscoEntry ? getLocalizedAnzscoTitle(initialAnzscoEntry, locale) : (initialValues.occupation ?? ""));
  const [anzscoCode, setAnzscoCode] = useState(initialAnzscoEntry?.code ?? "");
  const [anzscoResults, setAnzscoResults] = useState<AnzscoEntry[]>([]);
  const [anzscoOpen, setAnzscoOpen] = useState(false);

  // ── Form field state ──
  const [qualificationLevel, setQualificationLevel] = useState("");
  const [englishLevel, setEnglishLevel] = useState("");
  const [sponsorFamilyStatus, setSponsorFamilyStatus] = useState("");
  const [annualSalaryAud, setAnnualSalaryAud] = useState("");
  const [qualificationAwardedInAustralia, setQualificationAwardedInAustralia] = useState("");
  const [qualificationRegionalAustralia, setQualificationRegionalAustralia] = useState("");
  const [specialistEducationStemResponse, setSpecialistEducationStemResponse] = useState("");
  // No default: an unanswered question is stored as unknown, never as "no".
  const [skillsAssessment, setSkillsAssessment] = useState("");
  const [isQualificationRecognized, setIsQualificationRecognized] = useState("");
  const [visaInterest, updateVisaInterest] = useState(initialValues.visaInterest ?? "");
  const setVisaInterest = (value: string) => { updateVisaInterest(value); onVisaInterestChange?.(value); };
  const [migrationGoals, setMigrationGoals] = useState<MigrationGoalId[]>([]);
  const [preferredState, setPreferredState] = useState("");
  const [nominationStream, setNominationStream] = useState("");
  const [yearsInSponsoredPosition, setYearsInSponsoredPosition] = useState("");
  const [courseName, setCourseName] = useState("");
  const [courseCricosCode, setCourseCricosCode] = useState("");
  const [courseCompletionStatus, setCourseCompletionStatus] = useState("");
  const [courseCompletionDate, setCourseCompletionDate] = useState("");
  const [relationshipType, setRelationshipType] = useState("");
  const [cohabitationDuration, setCohabitationDuration] = useState("");
  const [sponsorStatus, setSponsorStatus] = useState("");
  const [previousSponsorship, setPreviousSponsorship] = useState("");
  const [applicationLocationPreference, setApplicationLocationPreference] = useState("");
  const [relationshipEvidence, setRelationshipEvidence] = useState<string[]>([]);

  const isPartner = isPartnerFamilySponsorship(visaInterest);
  const isResearchOrDoctorateQualification = qualificationLevel === "Master's Degree (Research)" || qualificationLevel === "PhD/Doctorate" || qualificationLevel === "PhD";
  const resolvedAnzscoEntry = resolveAnzscoEntry(anzscoCode || anzscoSearch);
  const submittedOccupationValue = selectedCountry === "AU" ? resolvedAnzscoEntry?.code ?? anzscoSearch : nocSearch;

  function toggleMigrationGoal(id: MigrationGoalId) {
    setMigrationGoals((prev) => { if (prev.includes(id)) return prev.filter((g) => g !== id); if (prev.length >= 2) return [prev[1], id]; return [...prev, id]; });
  }

  const experienceHelpText = selectedCountry === "CA"
    ? txt("Nitelikli iş deneyimi (TEER 0-5). Kanada içi deneyimler en az 1 yıl tam zamanlı olmalıdır.", "Count skilled employment (TEER 0-5). Canadian work experience must be at least 1 year full-time.", "加拿大境内工作经验须满至少1年全职。")
    : txt("Davetten önceki son 10 yıl içindeki, haftada en az 20 saatlik nitelikli çalışmayı yazın.", "Count only skilled work within 10 years before invitation, at least 20 hours/week.", "仅填写获邀前10年内、每周至少20小时的技术工作年限。");

  const englishLevelOptions = selectedCountry === "CA" ? [
    { value: "none", label: txt("Test almadım", "No test", "未测试") },
    { value: "clb4", label: "CLB 4" },
    { value: "clb5", label: "CLB 5" },
    { value: "clb6", label: "CLB 6" },
    { value: "clb7", label: "CLB 7" },
    { value: "clb8", label: "CLB 8" },
    { value: "clb9", label: "CLB 9" },
    { value: "clb10", label: "CLB 10" },
  ] : AU_ENGLISH_LEVEL_OPTIONS.map((o) => ({ value: o.value, label: optionLabel(o, locale) }));

  // Shared with the in-chat quick profile card (lib/intake/fields.ts).
  const educationOptions = EDUCATION_OPTIONS.map((o) => ({ value: o.value, label: optionLabel(o, locale) }));

  const sponsorFamilyOptions = selectedCountry === "CA" ? [
    { value: "Single / No Spouse", label: txt("Bekar / Eş Yok", "Single / No Spouse", "单身") },
    { value: "Spouse with functional English", label: txt("Eş — Yetkin İngilizce", "Spouse — Competent English", "配偶—胜任英语") },
    { value: "Spouse without functional English", label: txt("Eş — Yetkin İngilizce Yok", "Spouse — No Functional English", "配偶—无胜任英语") },
  ] : [
    // The Australian points test's partner categories (engine.ts sponsorOrFamilyToPartnerOption).
    { value: "Single / No Dependants", label: txt("Bekar (+10 puan)", "Single (+10 pts)", "单身（+10 分）") },
    { value: "Partner with Competent English and positive Skills Assessment", label: txt("Partner: Competent English VE olumlu Beceri Değerlendirmesi (+10 puan)", "Partner with Competent English AND positive Skills Assessment (+10 pts)", "伴侣：具备 Competent English 且技能评估结果为正面（+10 分）") },
    { value: "Partner with Competent English only", label: txt("Partner: yalnızca Competent English (+5 puan)", "Partner with Competent English only (+5 pts)", "伴侣：仅具备 Competent English（+5 分）") },
    { value: "Partner / Dependants WITHOUT Functional English", label: txt("Partner: işlevsel İngilizcesi yok (0 puan)", "Partner with no Functional English (0 pts)", "伴侣：没有功能性英语（0 分）") },
    { value: "Not provided", label: txt("Emin değilim / belirtmek istemiyorum (partner puanı değerlendirilmez)", "Not sure / prefer not to say (partner points not assessed)", "不确定 / 不愿说明（不评估伴侣分数）") },
  ];

  const fieldClassName = "h-11 w-full rounded-none border-0 border-b border-slate-300 bg-transparent px-1 text-sm text-slate-900 placeholder:text-gray-500 transition-colors outline-none focus-visible:border-[#53917E]";
  const selectClassName = "h-11 w-full rounded-none border-0 border-b border-slate-300 bg-transparent px-1 text-sm text-slate-900 transition-colors outline-none focus-visible:border-[#53917E]";

  const termsLabel = isTr ? (
    <>
      <TermsGateLink>Kullanım Koşullarını</TermsGateLink> ve veri işleme politikalarını kabul ediyorum.
    </>
  ) : isZh ? (
    <>
      我已阅读并同意<TermsGateLink>服务条款</TermsGateLink>和数据处理政策。
    </>
  ) : (
    <>
      I agree to the <TermsGateLink>Terms of Service</TermsGateLink> and data processing policies.
    </>
  );
  const termsErrorText = txt(
    "Devam etmek için lütfen yasal şartları kabul edin.",
    "Please accept the legal terms to proceed.",
    "请接受法律条款以继续。"
  );

  // ── Submit logic ──
  useEffect(() => {
    if (isPending) wasPendingRef.current = true;
    if (wasPendingRef.current && !isPending) {
      wasPendingRef.current = false;
      if (state.status === "success" && state.reportId) {
        if (trackedReportIdRef.current !== state.reportId) {
          trackEvent("full_check_complete", { locale });
          trackedReportIdRef.current = state.reportId;
        }
      }
    }
  }, [isPending, state, locale]);

  // ── Auto-scroll to Quick Result when report is generated ──
  useEffect(() => {
    if (state.status === "success" && state.reportId && !unlockedReportState?.isUnlocked) {
      setTimeout(() => {
        document.getElementById("quick-result-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
  }, [state.status, state.reportId, unlockedReportState?.isUnlocked]);

  // ── Auto-scroll to Full Report + Auto PDF download when unlocked ──
  useEffect(() => {
    if (unlockedReportState?.isUnlocked) {
      // Scroll to full report section
      setTimeout(() => {
        document.getElementById("full-report-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);

      // The creating browser sees its report on screen right away: the result page (the same information-first report the
      // PDF carries) opens for this browser through the signed session cookie set at submit, and offers the PDF download.
      // The emailed secure link stays the second route. The PDF is downloaded from there or from the button below.
      const reportId = unlockedReportState.reportId;
      if (reportId) {
        const t = unlockedReportState.accessToken ? `&t=${encodeURIComponent(unlockedReportState.accessToken)}` : "";
        window.location.assign(`/${locale}/full-check/result?reportId=${encodeURIComponent(reportId)}${t}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlockedReportState?.isUnlocked]);

  const [assistantReportData, setAssistantReportData] = useState<AssistantReportData | null>(null);

  const handleIntakeSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    for (const step of [1, 2, 3]) {
      if (!validateStep(step)) { e.preventDefault(); setCurrentStep(step); return; }
    }
    if (!isTermsAccepted) { e.preventDefault(); setTermsError(true); return; }
    setTermsError(false);
    // Map contactEmail → email so server-side reads formData.get("email") correctly
    const hidden = e.currentTarget.querySelector<HTMLInputElement>('input[name="email"]');
    const visible = document.getElementById("waitlist-e") as HTMLInputElement | null;
    if (hidden && visible) hidden.value = visible.value;
    trackEvent("full_check_submit", { locale });
  };

  const handleDownloadPDF = async () => {
    if (!unlockedReportState?.isUnlocked) return;
    trackEvent("pdf_download", { locale });
    setPdfError(null);
    try {
      await downloadReportPdf(unlockedReportState.reportId ?? "", `logivisa-readiness-report-${Date.now()}.pdf`, unlockedReportState.accessToken);
    } catch (error) {
      console.error("PDF download failed:", error);
      setPdfError(pdfErrorMessage);
    }
  };

  // ── Report display section ──
  const reportSection = state.status === "success" && state.header && state.reportId && !unlockedReportState?.isUnlocked && (
    <div id="quick-result-section" ref={reportSectionRef}>
      <PremiumFeatureGate
        paidCheckoutEnabled={paidCheckoutEnabled}
        locale={locale}
        reportId={state.reportId}
        header={state.header}
        defaultEmail={state.userInput?.email}
        defaultName={state.userInput?.name}
        onUnlocked={({ email, name, accessToken }) => {
          setUnlockedReportState({ reportId: state.reportId, name, email, isUnlocked: true, accessToken });
          setAssistantReportData({
            country: selectedCountry,
            user: { name: name, email: email, occupation: submittedOccupationValue },
          } as AssistantReportData);
        }}
      />
    </div>
  );

  // ── Full Report section (unlocked) ──
  const fullReportSection = unlockedReportState?.isUnlocked && (
    <div id="full-report-section" style={{ marginTop: "2rem" }}>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">
            {isTr ? "Tam Rapor" : isZh ? "完整报告" : "Full Report"}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {isTr ? "PDF İndir" : isZh ? "下载 PDF" : "Download PDF"}
          </Button>
        </div>
        {pdfError && (
          <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {pdfError}
          </p>
        )}
        {unlockedReportState?.reportId && (
          <a
            href={`/${locale}/full-check/result?reportId=${encodeURIComponent(unlockedReportState.reportId)}${unlockedReportState.accessToken ? `&t=${encodeURIComponent(unlockedReportState.accessToken)}` : ""}`}
            className="mb-4 inline-flex items-center rounded-md bg-[#53917E] px-4 py-2 text-sm font-semibold text-white"
            data-testid="view-report-on-screen"
          >
            {isTr ? "Raporu ekranda görüntüle" : isZh ? "在屏幕上查看报告" : "View your report on screen"}
          </a>
        )}
        <LogiAIAssistant locale={locale} reportData={assistantReportData} />
      </div>
    </div>
  );

  // ── Render ──
  return (
    <div className="space-y-6 overflow-visible">
      {isPending && (
        <div role="status" aria-live="polite" className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-xl font-semibold text-slate-900">{txt("Raporunuz hazırlanıyor", "Preparing your report", "正在准备您的报告")}</h3>
            <p className="mt-3 text-sm text-slate-600">{txt("Lütfen bu sayfayı açık tutun ve tekrar göndermeyin. Tamamlandığında rapor erişim seçenekleri gösterilecek.", "Please keep this page open and do not submit again. Report access options will appear when it is ready.", "请保持此页面打开，勿重复提交。完成后将显示报告访问选项。")}</p>
          </div>
        </div>
      )}

      {!unlockedReportState?.isUnlocked && (
        <form ref={formRef} action={formAction} onSubmit={handleIntakeSubmit} onChangeCapture={() => {
          if (!startedRef.current) { startedRef.current = true; trackEvent("full_check_start", { locale }); }
        }} className="space-y-4 overflow-visible" autoComplete="off" noValidate data-assessment-form>
        <RequiredLegend locale={locale} />
          <input type="hidden" name="routeLocale" value={locale} />
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="preferredLanguage" value={locale} />
          <input type="hidden" name="source" value={initialValues.source ?? "full_check"} />
          <input type="hidden" name="analysisProgressId" value={analysisProgressId} />
          {/* email: populated from waitlist-e on submit to avoid Chrome autofill */}
          <input type="hidden" name="email" value="" />

          {/* Step validation error */}
          {stepErrors && Object.keys(stepErrors).length > 0 && (
            <div role="alert" className="rounded-md border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
              {Object.values(stepErrors).join(" · ")}
            </div>
          )}

          {/* Progress bar — clickable for backward navigation */}
          <div aria-label={txt("Rapor adımları", "Report steps", "报告步骤")} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white shadow-sm px-4 py-3">
            {[1, 2, 3].map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => { if (step < currentStep) { setStepErrors(null); setCurrentStep(step); window.scrollTo({ top: 0, behavior: "smooth" }); } }}
                aria-current={step === currentStep ? "step" : undefined}
                disabled={step >= currentStep}
                className={`flex-1 text-left ${step < currentStep ? "cursor-pointer" : "cursor-default"}`}
              >
                <div className={`h-1.5 rounded-full transition-colors ${currentStep >= step ? "bg-[var(--cf-accent)]" : "bg-[var(--cf-line)]"}`} />
                <p className={`mt-1 text-center text-[0.65rem] font-semibold uppercase tracking-wide ${step < currentStep ? "text-[var(--cf-accent)]" : "text-[var(--cf-muted)]"}`}>
                  {step === 1 ? txt("Kişisel", "Your research", "研究背景") : step === 2 ? txt("İş veya aile", "Work or family", "工作或家庭") : isPartner ? txt("Gözden geçir", "Review", "核对") : txt("Eğitim & Dil", "Study & English", "学习与英语")}
                  <span className="ml-1 text-[var(--cf-muted)]/60">{`(${step}/3)`}</span>
                </p>
              </button>
            ))}
          </div>

          <p className="rounded-md border border-slate-200 bg-white shadow-sm px-3 py-2 text-sm font-medium text-slate-600">
            {txt("* ile işaretli alanların doldurulması zorunludur.", "* fields are mandatory.", "* 标记为必填。")}
          </p>

          <p data-step-purpose className="text-sm leading-relaxed text-slate-600" aria-live="polite">
            {currentStep === 1 ? txt("Bu bilgiler raporun konusunu ve genel bağlamını belirler. Vize numarasını bilmiyorsanız Emin değilim seçin.", "These details set the report topic and general context. Choose Not sure if you do not know a visa number.", "这些信息用于设置报告主题及一般背景。不知道签证号码时可选“不确定”。") : currentStep === 2 ? txt("İş veya aile bilgileri ilgili kaynak başlıklarını düzenlemeye yardımcı olur. Belgeler incelenmez ve uygunluk kararı verilmez.", "Work or family details help organise relevant reference topics. Documents are not reviewed and no eligibility decision is made.", "工作或家庭信息用于整理相关参考主题。不会审核文件或作资格判定。") : isPartner ? txt("Girdilerinizi Geri ile gözden geçirin. Rapor, verdiğiniz bilgileri ve genel kaynakları içerir; ilişki veya sponsorluk kararı vermez.", "Use Back to review your entries. The report records your information and general references; it does not decide relationship or sponsorship requirements.", "可用“上一步”核对填写内容。报告记录您的信息及一般参考资料，不判定关系或担保要求。") : txt("Bu girdiler rapordaki bilgi ve puan tablosu için kullanılır. İsteğe bağlı soruları boş bırakabilirsiniz; boşluk sıfır veya Hayır anlamına gelmez.", "These entries support the report information and points table. Optional questions can be left blank; missing information is not zero or No.", "这些填写内容用于报告信息及积分表。可不回答可选问题；未提供不表示零或“否”。")}
          </p>

          {/* Step content — CSS hidden keeps all mounted in DOM */}
          <div className={currentStep === 1 ? "" : "hidden"}>
            <Step1Personal locale={locale} canadaReportEnabled={canadaReportEnabled} selectedCountry={selectedCountry} onCountryChange={changeDestination} destination={destination} passportNote={passportNote} initialValues={initialValues} currentCountry={currentCountry} setCurrentCountry={setCurrentCountry} passportCountry={passportCountry} setPassportCountry={setPassportCountry} migrationGoals={migrationGoals} toggleMigrationGoal={toggleMigrationGoal} visaInterest={visaInterest} setVisaInterest={setVisaInterest} nominationStream={nominationStream} setNominationStream={setNominationStream} yearsInSponsoredPosition={yearsInSponsoredPosition} setYearsInSponsoredPosition={setYearsInSponsoredPosition} courseName={courseName} setCourseName={setCourseName} courseCricosCode={courseCricosCode} setCourseCricosCode={setCourseCricosCode} courseCompletionStatus={courseCompletionStatus} setCourseCompletionStatus={setCourseCompletionStatus} courseCompletionDate={courseCompletionDate} setCourseCompletionDate={setCourseCompletionDate} preferredState={preferredState} setPreferredState={setPreferredState} state={state} fieldClassName={fieldClassName} selectClassName={selectClassName} noAutofill={noAutofill} showsCourseFields={showsCourseFields} fieldErrors={stepErrors} />
          </div>
          <div className={currentStep === 2 ? "" : "hidden"}>
            <Step2Career skillsAssessment={skillsAssessment} setSkillsAssessment={setSkillsAssessment} locale={locale} selectedCountry={selectedCountry} isPartner={isPartner} nocSearch={nocSearch} setNocSearch={setNocSearch} nocCode={nocCode} setNocCode={setNocCode} nocTeer={nocTeer} setNocTeer={setNocTeer} nocResults={nocResults} setNocResults={setNocResults} nocOpen={nocOpen} setNocOpen={setNocOpen} searchNoc={searchNoc} anzscoSearch={anzscoSearch} setAnzscoSearch={setAnzscoSearch} anzscoCode={anzscoCode} setAnzscoCode={setAnzscoCode} resolvedAnzscoEntry={resolvedAnzscoEntry} anzscoResults={anzscoResults} setAnzscoResults={setAnzscoResults} anzscoOpen={anzscoOpen} setAnzscoOpen={setAnzscoOpen} searchAnzsco={searchAnzsco} getLocalizedAnzscoTitle={getLocalizedAnzscoTitle} submittedOccupationValue={submittedOccupationValue} setOccupationModalOpen={setOccupationModalOpen} relationshipType={relationshipType} setRelationshipType={setRelationshipType} cohabitationDuration={cohabitationDuration} setCohabitationDuration={setCohabitationDuration} sponsorStatus={sponsorStatus} setSponsorStatus={setSponsorStatus} previousSponsorship={previousSponsorship} setPreviousSponsorship={setPreviousSponsorship} applicationLocationPreference={applicationLocationPreference} setApplicationLocationPreference={setApplicationLocationPreference} relationshipEvidence={relationshipEvidence} setRelationshipEvidence={setRelationshipEvidence} state={state} fieldClassName={fieldClassName} selectClassName={selectClassName} noAutofill={noAutofill} />
          </div>
          <div className={currentStep === 3 ? "" : "hidden"}>
            <Step3Language visaInterest={visaInterest} skillsAssessmentYes={skillsAssessment === "yes"} isQualificationRecognized={isQualificationRecognized} setIsQualificationRecognized={setIsQualificationRecognized} locale={locale} selectedCountry={selectedCountry} isPartner={isPartner} englishLevel={englishLevel} setEnglishLevel={setEnglishLevel} englishLevelOptions={englishLevelOptions} qualificationLevel={qualificationLevel} setQualificationLevel={setQualificationLevel} educationOptions={educationOptions} qualificationAwardedInAustralia={qualificationAwardedInAustralia} setQualificationAwardedInAustralia={setQualificationAwardedInAustralia} qualificationRegionalAustralia={qualificationRegionalAustralia} setQualificationRegionalAustralia={setQualificationRegionalAustralia} specialistEducationStemResponse={specialistEducationStemResponse} setSpecialistEducationStemResponse={setSpecialistEducationStemResponse} isResearchOrDoctorateQualification={isResearchOrDoctorateQualification} annualSalaryAud={annualSalaryAud} setAnnualSalaryAud={setAnnualSalaryAud} sponsorFamilyStatus={sponsorFamilyStatus} setSponsorFamilyStatus={setSponsorFamilyStatus} sponsorFamilyOptions={sponsorFamilyOptions} experienceHelpText={experienceHelpText} state={state} fieldClassName={fieldClassName} selectClassName={selectClassName} noAutofill={noAutofill} />
          </div>

          {/* Navigation */}
          {currentStep > 1 && (
            <Button type="button" variant="outline" onClick={prevStep} className="h-11 w-full rounded-lg text-sm font-semibold">
              {txt("Geri", "Back", "上一步")}
            </Button>
          )}
          {currentStep < 3 && (
            <Button type="button" onClick={nextStep} className="h-11 w-full rounded-lg text-sm font-semibold">
              {txt("İleri", "Next", "下一步")}
            </Button>
          )}
          {currentStep === 3 && (
            <>
              <ReferralConsentBox locale={locale} />
              <TermsGate isTermsAccepted={isTermsAccepted} termsError={termsError} onToggle={(c) => { setIsTermsAccepted(c); if (c) setTermsError(false); }} label={termsLabel} errorText={termsErrorText} />
              <Button type="submit" className="h-auto min-h-11 w-full whitespace-normal rounded-lg px-4 py-3 text-center text-sm font-semibold leading-snug" disabled={isPending}>
                {isPending ? txt("Oluşturuluyor...", "Generating...", "生成中...") : txt("Vize Bilgi Raporunuzu oluşturun", "Generate your Visa Information Report", "生成您的签证信息报告")}
              </Button>
            </>
          )}
        </form>
      )}

      {reportSection}

      {fullReportSection}

      {state.status === "success" && assistantReportData && (
        <LogiAIAssistant locale={locale} reportData={assistantReportData} />
      )}

      {selectedCountry === "AU" && (
        <Dialog open={occupationModalOpen} onOpenChange={(v) => !v && setOccupationModalOpen(false)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">{pick(LEAD_MAGNETS.occupation.title, locale)}</DialogTitle>
              <DialogDescription className="text-slate-700">{pick(LEAD_MAGNETS.occupation.description, locale)}</DialogDescription>
            </DialogHeader>
            <LeadMagnetForm locale={locale} documentId="csol-2026" documentName={pick(LEAD_MAGNETS.occupation.name, locale)} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
