"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { sendGAEvent } from "@next/third-parties/google";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type FullCheckWaitlistState, submitFullCheckWaitlist } from "./actions";
import { activeCountries, countryLabels, countryVisaPathways, defaultCountry, isSupportedCountry, isPartnerFamilySponsorship, migrationGoalOptions, getVisaSubclassesForGoals, type SupportedCountry, type VisaPathwayOption, type MigrationGoalId } from "@/lib/countries";
import { PremiumFeatureGate } from "@/components/premium-feature-gate";
import { TermsGate, TermsGateLink } from "@/components/terms-gate";
import { LogiAIAssistant } from "@/components/LogiAIAssistant";
import { useTranslation } from "@/contexts/language-context";
import { generateReadinessPDF } from "@/lib/readiness/generate-pdf";
import type { AssistantReportData, ReadinessReport } from "@/lib/readiness/types";
import { findOccupationRecord, getSkilledListMembership } from "@/lib/readiness/occupation-eligibility";
import { LeadMagnetForm } from "@/components/LeadMagnetForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import nocListRaw from "@/src/data/countries/ca/noc-list.json";
import anzscoListRaw from "@/src/data/anzsco-list.json";
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
type AnzscoEntry = { code: string; title: string; title_tr?: string; title_zh?: string; keywords?: string[]; isOnSkilledList?: boolean };

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

const ANZSCO_INDEX = (anzscoListRaw as any[]).map((row) => ({ code: row.code, title: row.title_en || row.title || "", title_tr: row.title_tr, title_zh: row.title_zh, keywords: row.keywords || [] })) as AnzscoEntry[];
const ANZSCO_SEARCH_ALIAS_MAP: Record<string, string[]> = { doktor: ["pratisyen hekim", "uzman hekim"], doctor: ["general practitioner", "medical practitioners"], hekim: ["pratisyen hekim", "uzman hekim"] };

function foldLookupValue(v?: string): string {
  return (v ?? "").trim().toLowerCase().replace(/[ıİ]/g, "i").replace(/[şŞ]/g, "s").replace(/[ğĞ]/g, "g").replace(/[çÇ]/g, "c").replace(/[öÖ]/g, "o").replace(/[üÜ]/g, "u").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function getLocalizedAnzscoTitle(entry: AnzscoEntry, locale: string): string {
  if (locale === "tr") return entry.title_tr ?? entry.title;
  if (locale === "zh-Hans") return entry.title_zh ?? entry.title;
  return entry.title;
}

function resolveAnzscoEntry(value?: string): AnzscoEntry | undefined {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return undefined;
  const explicitCode = trimmed.match(/(\d{6})/)?.[1];
  if (explicitCode) { const m = ANZSCO_INDEX.find((e) => e.code === explicitCode); if (m) return m; }
  const folded = foldLookupValue(trimmed);
  if (!folded) return undefined;
  return ANZSCO_INDEX.find((e) => [e.title, e.title_tr, e.title_zh, `${e.title} (${e.code})`, `${e.title_tr ?? ""} (${e.code})`, `${e.title_zh ?? ""} (${e.code})`].some((c) => foldLookupValue(c) === folded));
}

function searchAnzsco(query: string, locale: string): AnzscoEntry[] {
  const fq = foldLookupValue(query);
  if (fq.length < 2) return [];
  const aliasTerms = ANZSCO_SEARCH_ALIAS_MAP[fq] ?? [];
  const searchTerms = [fq, ...aliasTerms.map((t) => foldLookupValue(t)).filter(Boolean)];
  const maxResults = locale === "tr" || locale === "zh-Hans" ? 80 : 14;
  return ANZSCO_INDEX.map((entry) => {
    const lt = getLocalizedAnzscoTitle(entry, locale);
    const flt = foldLookupValue(lt), fe = foldLookupValue(entry.title), fc = foldLookupValue(entry.code);
    let best = Infinity;
    for (const term of searchTerms) {
      if (!term) continue;
      if (fc === term) best = Math.min(best, 0);
      if (flt === term) best = Math.min(best, 1);
      if (fe === term) best = Math.min(best, 2);
      if (flt.startsWith(term)) best = Math.min(best, 3);
      if (fe.startsWith(term)) best = Math.min(best, 4);
      if (flt.includes(term)) best = Math.min(best, 5);
      if (fe.includes(term)) best = Math.min(best, 6);
      if (entry.keywords?.some((kw) => foldLookupValue(kw).includes(term))) best = Math.min(best, 7);
    }
    return { entry, score: best };
  }).filter(({ score }) => Number.isFinite(score)).sort((a, b) => a.score - b.score).slice(0, maxResults).map(({ entry }) => {
    const record = findOccupationRecord(entry.code);
    return { ...entry, isOnSkilledList: record ? getSkilledListMembership(record.anzsco_code).length > 0 : false };
  });
}

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

function RequiredMark() {
  return <span className="text-red-500 ml-1" aria-hidden="true">*</span>;
}

function noAutofill(field: string): Record<string, string> {
  return { autoComplete: `no-fill-${field}`, autoCorrect: "off", autoCapitalize: "off", spellCheck: "false", "data-lpignore": "true", "data-1p-ignore": "true" };
}

export { renderVisaPathwayOptions };

function renderVisaPathwayOptions(options: VisaPathwayOption[], isTr: boolean, isZh: boolean) {
  return options.map((opt) => (
    <option key={opt.value} value={opt.value}>{opt.label[isTr ? "tr" : isZh ? "zh-Hans" : "en"] ?? opt.label.en}</option>
  ));
}

// ── Main Form Component ───────────────────────────────────────────────────────
export function FullCheckWaitlistForm({
  locale,
  initialValues = {},
  isFreeActive = true,
  remainingSpots = 0,
  onCountryChange,
}: {
  locale: string;
  initialValues?: Record<string, string>;
  isFreeActive?: boolean;
  remainingSpots?: number;
  onCountryChange?: (country: SupportedCountry) => void;
}) {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const txt = (tr: string, en: string, zh: string) => (isTr ? tr : isZh ? zh : en);

  const [currentStep, setCurrentStep] = useState(1);
  const [stepErrors, setStepErrors] = useState<string | null>(null);

  const validateStep = (step: number): boolean => {
    setStepErrors(null);
    if (step === 1) {
      const name = (document.getElementById("waitlist-full-name") as HTMLInputElement)?.value?.trim();
      const email = (document.getElementById("waitlist-email") as HTMLInputElement)?.value?.trim();
      const country = (document.getElementById("waitlist-current-country") as HTMLInputElement)?.value?.trim();
      const passport = (document.getElementById("waitlist-passport-country") as HTMLInputElement)?.value?.trim();
      const age = (document.getElementById("waitlist-age") as HTMLInputElement)?.value?.trim();
      const errors: string[] = [];
      if (!name) errors.push(txt("Ad soyad gerekli", "Full name is required", "姓名为必填项"));
      if (!email) errors.push(txt("E-posta gerekli", "Email is required", "邮箱为必填项"));
      if (!country) errors.push(txt("Bulunduğunuz ülke gerekli", "Current country is required", "当前国家为必填项"));
      if (!passport) errors.push(txt("Pasaport ülkesi gerekli", "Passport country is required", "护照国家为必填项"));
      if (!age) errors.push(txt("Yaş gerekli", "Age is required", "年龄为必填项"));
      if (errors.length > 0) { setStepErrors(errors.join(" · ")); return false; }
    }
    return true;
  };

  const nextStep = () => {
    if (!validateStep(currentStep)) return;
    setCurrentStep((s) => Math.min(s + 1, 3));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const prevStep = () => { setStepErrors(null); setCurrentStep((s) => Math.max(s - 1, 1)); };

  const initialState: FullCheckWaitlistState = { status: "idle" };
  const [state, formAction, isPending] = useActionState(submitFullCheckWaitlist, initialState);

  const [selectedCountry, setSelectedCountry] = useState<SupportedCountry>(
    isSupportedCountry(initialValues.targetCountry) ? (initialValues.targetCountry as SupportedCountry) : defaultCountry
  );
  const initialAnzscoEntry = resolveAnzscoEntry(initialValues.occupation);
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [occupationModalOpen, setOccupationModalOpen] = useState(false);
  const [analysisStepIndex, setAnalysisStepIndex] = useState(0);
  const [analysisProgressId, setAnalysisProgressId] = useState(() => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `progress-${Date.now()}`);
  const wasPendingRef = useRef(false);
  const trackedReportIdRef = useRef<string | null>(null);
  const [unlockedReportState, setUnlockedReportState] = useState<{ reportId?: string; report: ReadinessReport; name?: string; email?: string } | null>(null);
  const reportSectionRef = useRef<HTMLElement | null>(null);
  const budgetCurrency = selectedCountry === "CA" ? "CAD" : "AUD";

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
  const [isQualificationRecognized, setIsQualificationRecognized] = useState("");
  const [visaInterest, setVisaInterest] = useState(initialValues.visaInterest ?? "");
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
  ] : [
    { value: "none", label: txt("Test almadım", "No test", "未测试") },
    { value: "competent", label: txt("Competent (IELTS 6)", "Competent (IELTS 6)", "胜任 (雅思6)") },
    { value: "proficient", label: txt("Proficient (IELTS 7)", "Proficient (IELTS 7)", "熟练 (雅思7)") },
    { value: "superior", label: txt("Superior (IELTS 8+)", "Superior (IELTS 8+)", "优秀 (雅思8+)") },
  ];

  const educationOptions = [
    { value: "High School", label: txt("Lise", "High School", "高中") },
    { value: "Diploma", label: txt("Diploma / Trade", "Diploma / Trade", "文凭/技工") },
    { value: "Bachelor", label: txt("Lisans", "Bachelor's Degree", "学士") },
    { value: "Master's Degree (Research)", label: txt("Yüksek Lisans (Araştırma)", "Master's (Research)", "研究型硕士") },
    { value: "PhD", label: txt("Doktora", "PhD/Doctorate", "博士") },
  ];

  const sponsorFamilyOptions = selectedCountry === "CA" ? [
    { value: "Single / No Spouse", label: txt("Bekar / Eş Yok", "Single / No Spouse", "单身") },
    { value: "Spouse with functional English", label: txt("Eş — Yetkin İngilizce", "Spouse — Competent English", "配偶—胜任英语") },
    { value: "Spouse without functional English", label: txt("Eş — Yetkin İngilizce Yok", "Spouse — No Functional English", "配偶—无胜任英语") },
  ] : [
    { value: "Single / No Dependants", label: txt("Bekar / Bağımlı Yok", "Single / No Dependants", "单身/无受养人") },
    { value: "Partner / Dependants with Functional English", label: txt("Eş/Bağımlı — Yetkin İngilizce", "Partner / Dependants — Functional English", "配偶/受养人—胜任英语") },
    { value: "Partner / Dependants WITHOUT Functional English", label: txt("Eş/Bağımlı — Yetkin İngilizce Yok", "Partner / Dependants — No Functional English", "配偶/受养人—无胜任英语") },
  ];

  const fieldClassName = "h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm shadow-sm transition-all outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20";
  const selectClassName = "h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm shadow-sm transition-all outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20";

  const aiAnalysisSteps = selectedCountry === "CA"
    ? [txt("516 NOC kodu taranıyor...", "Scanning 516 NOC codes...", "扫描516 NOC代码..."), txt("CRS çizimi analiz ediliyor...", "Analysing CRS draw trends...", "分析CRS趋势..."), txt("PNP akışları işleniyor...", "Processing PNP streams...", "处理PNP通道..."), txt("Sonuçlar derleniyor...", "Compiling results...", "编译结果...")]
    : [txt("Meslek aranıyor...", "Searching occupation...", "搜索职业..."), txt("Değerlendirme kurumları eşleştiriliyor...", "Matching assessing authorities...", "匹配评估机构..."), txt("Puan hesaplanıyor...", "Calculating points...", "计算分数..."), txt("Vize yolları analiz ediliyor...", "Analysing visa pathways...", "分析签证路径...")];

  const termsLabel = txt(
    "Kullanım Koşullarını ve veri işleme politikalarını kabul ediyorum.",
    "I agree to the Terms of Service and data processing policies.",
    "我已阅读并同意服务条款和数据处理政策。"
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
        trackGaEvent("full_check_complete", { reportId: state.reportId, country: selectedCountry });
        if (state.userInput?.name) {
          setUnlockedReportState({ reportId: state.reportId, report: null as any, name: state.userInput.name, email: state.userInput.email });
        }
      }
    }
  }, [isPending, state]);

  const [report, setReport] = useState<ReadinessReport | null>(null);
  const [assistantReportData, setAssistantReportData] = useState<AssistantReportData | null>(null);

  const handleIntakeSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!isTermsAccepted) { e.preventDefault(); setTermsError(true); return; }
    setTermsError(false);
    trackGaEvent("full_check_submit", { country: selectedCountry });
  };

  const handleDownloadPDF = async () => {
    if (!unlockedReportState?.report) return;
    trackGaEvent("pdf_download", { reportId: unlockedReportState.reportId });
    const pdfBytes = await generateReadinessPDF({
      report: unlockedReportState.report,
      locale: locale as "en" | "tr" | "zh-Hans",
      saveToFile: false,
      userInputSummary: { name: unlockedReportState.name, email: unlockedReportState.email, occupation: unlockedReportState.report.pathwayComparison?.[0]?.visaName, mainGoal: initialValues.mainGoal, currentCountry: initialValues.currentCountry, age: initialValues.age, englishLevel },
    });
    const blob = new Blob([pdfBytes as unknown as ArrayBuffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logivisa-readiness-report-${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Report display section ──
  const reportSection = state.status === "success" && state.preview && state.reportId && !report && (
    <PremiumFeatureGate
      locale={locale}
      reportId={state.reportId}
      preview={state.preview}
      defaultEmail={state.userInput?.email}
      defaultName={state.userInput?.name}
      isFreeActive={isFreeActive}
      remainingSpots={remainingSpots}
      onUnlocked={({ report: unlocked, email, name }) => {
        setUnlockedReportState({ reportId: state.reportId, report: unlocked, name, email });
        setReport(unlocked);
        if (unlocked) {
          setAssistantReportData({
            country: selectedCountry,
            user: { name: unlockedReportState?.name, email: unlockedReportState?.email, occupation: unlocked.pathwayComparison?.[0]?.visaName },
            targetVisa: unlocked.pathwayComparison?.[0]?.subclass,
          } as any);
        }
      }}
    />
  );

  // ── Render ──
  return (
    <div className="space-y-6 overflow-visible">
      {/* AI Analysis overlay */}
      {isPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-border/70 bg-card/95 p-6 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">AI Analysis</p>
            <h3 className="text-xl font-semibold text-foreground">{txt("Profiliniz işleniyor", "Processing your profile", "正在处理你的档案")}</h3>
            <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all duration-700 ease-out" style={{ width: `${((analysisStepIndex + 1) / aiAnalysisSteps.length) * 100}%` }} />
            </div>
            <div className="mt-4 min-h-7 rounded-lg border border-border/60 bg-background/70 px-3 py-2">
              <p className="text-sm text-muted-foreground" aria-live="polite">{aiAnalysisSteps[analysisStepIndex]}</p>
            </div>
            <div className="mt-4 flex gap-1.5">
              {aiAnalysisSteps.map((step, idx) => (
                <span key={step} className={`h-1.5 flex-1 rounded-full transition-colors ${idx <= analysisStepIndex ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>
          </div>
        </div>
      )}

      {!unlockedReportState?.report && (
        <form action={formAction} onSubmit={handleIntakeSubmit} className="space-y-4 overflow-visible" autoComplete="off" noValidate>
          <input type="hidden" name="routeLocale" value={locale} />
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="preferredLanguage" value={locale} />
          <input type="hidden" name="source" value={initialValues.source ?? "full_check"} />
          <input type="hidden" name="analysisProgressId" value={analysisProgressId} />

          {/* Step validation error */}
          {stepErrors && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
              {stepErrors}
            </div>
          )}

          {/* Progress bar */}
          <div className="flex items-center gap-3 rounded-xl border border-[var(--cf-line)] bg-[var(--cf-cover-bg)] px-4 py-3">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex-1">
                <div className={`h-1.5 rounded-full transition-colors ${currentStep >= step ? "bg-[var(--cf-accent)]" : "bg-[var(--cf-line)]"}`} />
                <p className="mt-1 text-center text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--cf-muted)]">
                  {step === 1 ? txt("Kişisel", "Personal", "个人") : step === 2 ? txt("Kariyer", "Career", "职业") : txt("Dil & Profil", "Language", "语言")}
                  <span className="ml-1 text-[var(--cf-muted)]/60">{`(${step}/3)`}</span>
                </p>
              </div>
            ))}
          </div>

          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {txt("* ile işaretli alanların doldurulması zorunludur.", "* fields are mandatory.", "* 标记为必填。")}
          </p>

          {/* Step content */}
          {currentStep === 1 && <Step1Personal locale={locale} selectedCountry={selectedCountry} onCountryChange={(c) => { setSelectedCountry(c); onCountryChange?.(c); }} initialValues={initialValues} migrationGoals={migrationGoals} toggleMigrationGoal={toggleMigrationGoal} visaInterest={visaInterest} setVisaInterest={setVisaInterest} nominationStream={nominationStream} setNominationStream={setNominationStream} yearsInSponsoredPosition={yearsInSponsoredPosition} setYearsInSponsoredPosition={setYearsInSponsoredPosition} courseName={courseName} setCourseName={setCourseName} courseCricosCode={courseCricosCode} setCourseCricosCode={setCourseCricosCode} courseCompletionStatus={courseCompletionStatus} setCourseCompletionStatus={setCourseCompletionStatus} courseCompletionDate={courseCompletionDate} setCourseCompletionDate={setCourseCompletionDate} preferredState={preferredState} setPreferredState={setPreferredState} state={state} fieldClassName={fieldClassName} selectClassName={selectClassName} noAutofill={noAutofill} showsCourseFields={showsCourseFields} />}
          {currentStep === 2 && <Step2Career locale={locale} selectedCountry={selectedCountry} isPartner={isPartner} nocSearch={nocSearch} setNocSearch={setNocSearch} nocCode={nocCode} setNocCode={setNocCode} nocTeer={nocTeer} setNocTeer={setNocTeer} nocResults={nocResults} setNocResults={setNocResults} nocOpen={nocOpen} setNocOpen={setNocOpen} searchNoc={searchNoc} anzscoSearch={anzscoSearch} setAnzscoSearch={setAnzscoSearch} anzscoCode={anzscoCode} setAnzscoCode={setAnzscoCode} resolvedAnzscoEntry={resolvedAnzscoEntry} anzscoResults={anzscoResults} setAnzscoResults={setAnzscoResults} anzscoOpen={anzscoOpen} setAnzscoOpen={setAnzscoOpen} searchAnzsco={searchAnzsco} getLocalizedAnzscoTitle={getLocalizedAnzscoTitle} submittedOccupationValue={submittedOccupationValue} setOccupationModalOpen={setOccupationModalOpen} relationshipType={relationshipType} setRelationshipType={setRelationshipType} cohabitationDuration={cohabitationDuration} setCohabitationDuration={setCohabitationDuration} sponsorStatus={sponsorStatus} setSponsorStatus={setSponsorStatus} previousSponsorship={previousSponsorship} setPreviousSponsorship={setPreviousSponsorship} applicationLocationPreference={applicationLocationPreference} setApplicationLocationPreference={setApplicationLocationPreference} relationshipEvidence={relationshipEvidence} setRelationshipEvidence={setRelationshipEvidence} state={state} fieldClassName={fieldClassName} selectClassName={selectClassName} noAutofill={noAutofill} />}
          {currentStep === 3 && <Step3Language locale={locale} selectedCountry={selectedCountry} isPartner={isPartner} englishLevel={englishLevel} setEnglishLevel={setEnglishLevel} englishLevelOptions={englishLevelOptions} qualificationLevel={qualificationLevel} setQualificationLevel={setQualificationLevel} educationOptions={educationOptions} qualificationAwardedInAustralia={qualificationAwardedInAustralia} setQualificationAwardedInAustralia={setQualificationAwardedInAustralia} qualificationRegionalAustralia={qualificationRegionalAustralia} setQualificationRegionalAustralia={setQualificationRegionalAustralia} specialistEducationStemResponse={specialistEducationStemResponse} setSpecialistEducationStemResponse={setSpecialistEducationStemResponse} isQualificationRecognized={isQualificationRecognized} setIsQualificationRecognized={setIsQualificationRecognized} isResearchOrDoctorateQualification={isResearchOrDoctorateQualification} annualSalaryAud={annualSalaryAud} setAnnualSalaryAud={setAnnualSalaryAud} sponsorFamilyStatus={sponsorFamilyStatus} setSponsorFamilyStatus={setSponsorFamilyStatus} sponsorFamilyOptions={sponsorFamilyOptions} experienceHelpText={experienceHelpText} budgetCurrency={budgetCurrency} state={state} fieldClassName={fieldClassName} selectClassName={selectClassName} noAutofill={noAutofill} />}

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
              <TermsGate isTermsAccepted={isTermsAccepted} termsError={termsError} onToggle={(c) => { setIsTermsAccepted(c); if (c) setTermsError(false); }} label={termsLabel} errorText={termsErrorText} />
              <Button type="submit" className="h-11 w-full rounded-lg text-sm font-semibold" disabled={isPending}>
                {isPending ? txt("Oluşturuluyor...", "Generating...", "生成中...") : txt("Hazırlık raporunuzu oluşturun", "Generate your readiness report", "生成准备度报告")}
              </Button>
            </>
          )}
        </form>
      )}

      {reportSection}

      {state.status === "success" && assistantReportData && <LogiAIAssistant locale={locale} reportData={assistantReportData} />}

      {selectedCountry === "AU" && (
        <Dialog open={occupationModalOpen} onOpenChange={(v) => !v && setOccupationModalOpen(false)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">📋 2026 Official Occupation List</DialogTitle>
              <DialogDescription className="text-slate-600">Enter your details and we&apos;ll send the full PDF straight to your inbox.</DialogDescription>
            </DialogHeader>
            <LeadMagnetForm locale={locale} documentId="csol-2026" documentName="2026 Official Occupation List" onSuccess={() => setOccupationModalOpen(false)} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
