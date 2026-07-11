"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { sendGAEvent } from "@next/third-parties/google";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  type FullCheckWaitlistState,
  submitFullCheckWaitlist,
} from "./actions";
import { activeCountries, countryLabels, countryVisaPathways, defaultCountry, isSupportedCountry, type SupportedCountry, type VisaPathwayOption } from "@/lib/countries";
import { PremiumFeatureGate } from "@/components/premium-feature-gate";
import { TermsGate, TermsGateLink } from "@/components/terms-gate";
import { LogiAIAssistant } from "@/components/LogiAIAssistant";
import { ActionChecklist } from "@/components/ActionChecklist";
import { StateHeatmap } from "@/components/StateHeatmap";
import { generateReadinessPDF } from "@/lib/readiness/generate-pdf";
import type { AssistantReportData, ReadinessReport } from "@/lib/readiness/types";
import nocListRaw from "@/src/data/countries/ca/noc-list.json";
import anzscoListRaw from "@/src/data/anzsco-list.json";
import Fuse from "fuse.js";

// ── NOC Fuzzy Search Setup ────────────────────────────────────────────────────
// Built once at module level so every keystroke hits a pre-built index.

type NocEntry = { code: string; title: string; teer: number };
type AnzscoEntry = { code: string; title: string; title_tr?: string; title_zh?: string };

// Maps official NOC title keywords → everyday synonyms used by applicants.
// Merged into the search index so "doctor" → "physician", "dev" → "software", etc.
const NOC_ALIAS_MAP_STATIC: Record<string, string[]> = {
  physician: ["doctor", "medical doctor", "doc", "gp", "surgeon", "pediatrician", "psychiatrist", "internist", "specialist", "md", "family doctor"],
  nursing: ["nurse", "rn", "lpn", "registered nurse", "practitioner", "midwife", "midwifery"],
  care: ["caregiver", "psw", "support worker", "elder care", "nanny", "personal support", "health aide"],
  pharmacy: ["pharmacist", "chemist", "dispenser", "pharmacy technician"],
  dental: ["dentist", "dental hygienist", "orthodontist", "dental assistant", "oral health"],
  physiotherapy: ["physio", "physiotherapist", "physical therapist", "pt", "rehab therapist"],
  optometry: ["optometrist", "eye doctor", "optician"],
  veterinary: ["vet", "veterinarian", "animal doctor"],
  radiology: ["radiologist", "x-ray technician", "mri", "ultrasound technologist"],
  laboratory: ["lab technician", "medical lab", "pathologist", "lab tech", "clinical lab"],
  software: ["programmer", "coder", "software engineer", "developer", "dev", "frontend", "backend", "fullstack", "ui developer", "ux developer", "web developer", "app developer", "mobile developer", "ios", "android", "react", "node", "python developer", "java developer"],
  data: ["data scientist", "data analyst", "machine learning", "ml engineer", "ai", "artificial intelligence", "database", "data engineer", "bi analyst", "business intelligence", "etl"],
  systems: ["sysadmin", "system administrator", "it support", "helpdesk", "help desk", "network engineer", "cybersecurity", "security analyst", "devops", "cloud engineer", "aws", "azure", "infrastructure"],
  "information technology": ["it manager", "it director", "cto", "chief technology", "it consultant", "technology manager"],
  civil: ["civil engineer", "structural engineer", "geotechnical", "site engineer", "construction engineer"],
  mechanical: ["mechanical engineer", "hvac engineer", "hvac", "manufacturing engineer", "production engineer"],
  electrical: ["electrical engineer", "electronics engineer", "power engineer", "instrumentation engineer"],
  chemical: ["chemical engineer", "process engineer", "materials engineer", "metallurgist"],
  aerospace: ["aerospace engineer", "aeronautical engineer", "aviation engineer"],
  accounting: ["accountant", "cpa", "bookkeeper", "auditor", "comptroller", "controller", "tax specialist", "forensic accountant", "payroll"],
  "human resources": ["hr", "recruiter", "talent acquisition", "people ops", "compensation", "benefits specialist", "hr generalist", "hr manager"],
  marketing: ["marketer", "seo", "digital marketing", "social media", "growth hacker", "brand manager", "content manager", "campaign manager", "communications"],
  sales: ["sales rep", "account executive", "b2b sales", "retail", "cashier", "sales manager", "business development", "bdr", "sdr", "account manager"],
  management: ["manager", "ceo", "director", "supervisor", "executive", "vp", "vice president", "coo", "cfo", "operations manager", "general manager"],
  administrative: ["admin", "secretary", "receptionist", "assistant", "clerk", "office manager", "data entry", "coordinator"],
  finance: ["financial analyst", "investment", "portfolio manager", "banker", "loan officer", "credit analyst", "underwriter", "insurance"],
  legal: ["lawyer", "attorney", "paralegal", "notary", "barrister", "solicitor", "legal assistant"],
  "electrical trades": ["electrician", "sparky", "wireman", "journeyman electrician", "master electrician"],
  plumbing: ["plumber", "pipefitter", "steamfitter", "gasfitter"],
  carpentry: ["carpenter", "cabinetmaker", "framer", "joiner", "woodworker", "trim carpenter"],
  mechanic: ["auto mechanic", "technician", "automotive technician", "service technician", "diesel mechanic", "heavy equipment mechanic"],
  welding: ["welder", "fabricator", "fitter", "boilermaker"],
  driving: ["driver", "truck driver", "trucker", "delivery driver", "courier", "logistics", "transport operator", "bus driver", "transit operator", "cdl"],
  construction: ["construction worker", "labourer", "laborer", "ironworker", "rebar", "concrete", "mason", "bricklayer", "tile setter", "plasterer"],
  culinary: ["chef", "cook", "baker", "sous chef", "pastry chef", "head chef", "line cook", "prep cook"],
  "food service": ["waiter", "waitress", "server", "bartender", "barista", "host", "hostess", "busser", "food counter attendant"],
  cleaning: ["cleaner", "janitor", "housekeeper", "maid", "custodian", "sanitation worker", "building cleaner"],
  hotel: ["hotel manager", "front desk", "concierge", "guest services", "hospitality manager"],
  educator: ["teacher", "prof", "professor", "tutor", "lecturer", "instructor", "elementary teacher", "high school teacher", "kindergarten", "early childhood educator", "ece", "daycare"],
  biology: ["biologist", "biochemist", "microbiologist", "research scientist", "life sciences"],
  geology: ["geologist", "geoscientist", "environmental scientist", "hydrogeologist"],
  psychology: ["psychologist", "therapist", "counsellor", "counselor", "mental health", "social worker", "behaviour analyst"],
  agriculture: ["farmer", "agricultural worker", "greenhouse worker", "farm worker", "horticulturist", "livestock", "agri"],
};

// Build augmented index: each NOC entry gains an `aliasText` field containing
// all alias synonyms whose NOC keyword appears in the entry's title.
// This lets Fuse index "doctor coder trucker" etc. as searchable text.
type NocIndexEntry = NocEntry & { aliasText: string };
const NOC_INDEX: NocIndexEntry[] = (nocListRaw as NocEntry[]).map((entry) => {
  const titleLower = entry.title.toLowerCase();
  const aliasTerms: string[] = [];
  for (const [nocKeyword, aliases] of Object.entries(NOC_ALIAS_MAP_STATIC)) {
    if (titleLower.includes(nocKeyword.toLowerCase())) {
      aliasTerms.push(...aliases);
    }
  }
  return { ...entry, aliasText: aliasTerms.join(" ") };
});

const NOC_FUSE = new Fuse<NocIndexEntry>(NOC_INDEX, {
  keys: [
    { name: "title", weight: 1.0 },
    { name: "aliasText", weight: 0.7 },
    { name: "code", weight: 0.3 },
  ],
  threshold: 0.38,        // 0 = exact, 1 = match anything; 0.38 catches "doc"→"doctor"
  distance: 200,          // search within entire string, not just prefix
  minMatchCharLength: 2,
  includeScore: true,
  ignoreLocation: true,   // don't penalise matches at end of string
  useExtendedSearch: false,
});

/**
 * Two-phase fuzzy NOC search:
 * 1. Fuse.js fuzzy search on title + aliasText (catches typos, partials, synonyms)
 * 2. If the raw query exactly hits an alias map key's aliases, inject those NOC
 *    titles at the top (highest semantic precision — e.g. "doctor" → physician NOCs)
 */
function searchNoc(query: string): NocEntry[] {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase().trim();

  // Phase 1 — alias-expansion pre-pass: collect NOC keywords whose alias list
  // contains the query (whole-word or prefix match on individual alias terms).
  const expandedKeywords = new Set<string>();
  for (const [nocKeyword, aliases] of Object.entries(NOC_ALIAS_MAP_STATIC)) {
    const hit = aliases.some(
      (alias) => alias.toLowerCase().startsWith(q) || alias.toLowerCase() === q || q.startsWith(alias.toLowerCase())
    );
    if (hit) expandedKeywords.add(nocKeyword.toLowerCase());
  }

  // Phase 2 — run Fuse fuzzy search on the raw query
  const fuseResults = NOC_FUSE.search(q, { limit: 30 });

  // Phase 3 — also run Fuse on each expanded keyword so alias hits get scored
  type FuseResult = ReturnType<typeof NOC_FUSE.search>[number];
  const aliasResults: FuseResult[] = [];
  for (const kw of expandedKeywords) {
    const kwResults = NOC_FUSE.search(kw, { limit: 10 });
    aliasResults.push(...kwResults);
  }

  // Merge: alias results first (higher semantic confidence), then fuzzy results
  const seen = new Set<string>();
  const merged: NocEntry[] = [];

  const addEntry = (entry: NocIndexEntry) => {
    if (!seen.has(entry.code)) {
      seen.add(entry.code);
      merged.push({ code: entry.code, title: entry.title, teer: entry.teer });
    }
  };

  for (const r of aliasResults) addEntry(r.item);
  for (const r of fuseResults) addEntry(r.item);

  return merged.slice(0, 14);
}

const ANZSCO_INDEX = anzscoListRaw as AnzscoEntry[];

const ANZSCO_SEARCH_ALIAS_MAP: Record<string, string[]> = {
  doktor: ["pratisyen hekim", "uzman hekim", "medical practitioners", "specialist physician"],
  doctor: ["general practitioner", "medical practitioners", "specialist physician", "physician"],
  physician: ["general practitioner", "specialist physician", "medical practitioners"],
  hekim: ["pratisyen hekim", "uzman hekim", "medical practitioners", "specialist physician"],
  医生: ["全科医生", "专科医生", "specialist physician", "general practitioner"],
  醫生: ["全科医生", "专科医生", "specialist physician", "general practitioner"],
};

function foldLookupValue(value?: string): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[ıİ]/g, "i")
    .replace(/[şŞ]/g, "s")
    .replace(/[ğĞ]/g, "g")
    .replace(/[çÇ]/g, "c")
    .replace(/[öÖ]/g, "o")
    .replace(/[üÜ]/g, "u")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
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
  if (explicitCode) {
    const codeMatch = ANZSCO_INDEX.find((entry) => entry.code === explicitCode);
    if (codeMatch) return codeMatch;
  }

  const folded = foldLookupValue(trimmed);
  if (!folded) return undefined;

  return ANZSCO_INDEX.find((entry) => {
    const candidates = [entry.title, entry.title_tr, entry.title_zh, `${entry.title} (${entry.code})`, `${entry.title_tr ?? ""} (${entry.code})`, `${entry.title_zh ?? ""} (${entry.code})`];
    return candidates.some((candidate) => foldLookupValue(candidate) === folded);
  });
}

function searchAnzsco(query: string, locale: string): AnzscoEntry[] {
  const foldedQuery = foldLookupValue(query);
  if (foldedQuery.length < 2) return [];

  const aliasTerms = ANZSCO_SEARCH_ALIAS_MAP[foldedQuery] ?? [];
  const searchTerms = [
    foldedQuery,
    ...aliasTerms.map((term) => foldLookupValue(term)).filter(Boolean),
  ];

  return ANZSCO_INDEX.filter((entry) => {
    const localizedTitle = getLocalizedAnzscoTitle(entry, locale);
    return [entry.code, entry.title, localizedTitle, entry.title_tr, entry.title_zh]
      .filter(Boolean)
      .some((candidate) => {
        const foldedCandidate = foldLookupValue(candidate);
        return searchTerms.some((term) => foldedCandidate.includes(term));
      });
  }).slice(0, 14);
}


function trackGaEvent(name: string, params?: Record<string, string | number | boolean | null | undefined>) {
  if (typeof window === "undefined") return;
  const gaId = process.env.NEXT_PUBLIC_GA_ID?.trim();
  if (!gaId) return;
  if (!Array.isArray((window as { dataLayer?: Object[] }).dataLayer)) return;

  sendGAEvent("event", name, params ?? {});
}

function trackFbLeadEvent() {
  if (typeof window === "undefined") return;
  const w = window as Window & { fbq?: (...args: unknown[]) => void };
  if (typeof w.fbq === "function") w.fbq("track", "Lead");
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

// Groups CA's Express Entry sub-streams (CEC/FSW/FSTP) and other single-item
// pathways (PNP, AIP, Family Sponsorship) under <optgroup> labels so the
// hierarchy is visible in the dropdown. AU's flat list (no `group`) renders
// unchanged as plain <option> elements.
function renderVisaPathwayOptions(
  options: VisaPathwayOption[],
  isTr: boolean,
  isZh: boolean
) {
  const lang = isTr ? "tr" : isZh ? "zh-Hans" : "en";
  const groups: { label: string; options: VisaPathwayOption[] }[] = [];
  const ungrouped: VisaPathwayOption[] = [];

  for (const opt of options) {
    if (!opt.group) {
      ungrouped.push(opt);
      continue;
    }
    const groupLabel = opt.group[lang];
    const existing = groups.find((g) => g.label === groupLabel);
    if (existing) {
      existing.options.push(opt);
    } else {
      groups.push({ label: groupLabel, options: [opt] });
    }
  }

  return (
    <>
      {ungrouped.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label[lang]}
        </option>
      ))}
      {groups.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label[lang]}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}

export function FullCheckWaitlistForm({
  locale,
  initialValues = {},
  isFreeActive = true,
  remainingSpots = 0,
  onCountryChange,
}: {
  locale: string;
  initialValues?: {
    visaInterest?: string;
    targetCountry?: string;
    currentCountry?: string;
    occupation?: string;
    mainGoal?: string;
    source?: string;
  };
  isFreeActive?: boolean;
  remainingSpots?: number;
  onCountryChange?: (country: SupportedCountry) => void;
}) {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const txt = (trText: string, enText: string, zhText: string) =>
    isTr ? trText : isZh ? zhText : enText;
  const rpt = (zhText: string, trText: string, enText: string) =>
    isZh ? zhText : isTr ? trText : enText;
  const initialState: FullCheckWaitlistState = {
    status: "idle",
  };

  const [state, formAction, isPending] = useActionState(
    submitFullCheckWaitlist,
    initialState
  );
  const [selectedCountry, setSelectedCountry] = useState<SupportedCountry>(
    isSupportedCountry(initialValues.targetCountry) ? initialValues.targetCountry : defaultCountry
  );
  const initialAnzscoEntry = resolveAnzscoEntry(initialValues.occupation);
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);
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
  const reportSectionRef = useRef<HTMLElement | null>(null);
  const budgetCurrency = selectedCountry === "CA" ? "CAD" : "AUD";

  const [nocSearch, setNocSearch] = useState(initialValues.occupation ?? "");
  const [nocCode, setNocCode] = useState("");
  const [nocTeer, setNocTeer] = useState<number | null>(null);
  const [nocResults, setNocResults] = useState<NocEntry[]>([]);
  const [nocOpen, setNocOpen] = useState(false);
  const [anzscoSearch, setAnzscoSearch] = useState(
    initialAnzscoEntry ? getLocalizedAnzscoTitle(initialAnzscoEntry, locale) : (initialValues.occupation ?? "")
  );
  const [anzscoCode, setAnzscoCode] = useState(initialAnzscoEntry?.code ?? "");
  const [anzscoResults, setAnzscoResults] = useState<AnzscoEntry[]>([]);
  const [anzscoOpen, setAnzscoOpen] = useState(false);
  const [qualificationLevel, setQualificationLevel] = useState("");
  const [englishLevel, setEnglishLevel] = useState("");
  const [sponsorFamilyStatus, setSponsorFamilyStatus] = useState("");
  const [annualSalaryAud, setAnnualSalaryAud] = useState("");
  const [qualificationAwardedInAustralia, setQualificationAwardedInAustralia] = useState("");
  const [qualificationRegionalAustralia, setQualificationRegionalAustralia] = useState("");
  const [specialistEducationStemResponse, setSpecialistEducationStemResponse] = useState("");
  const experienceHelpText = txt(
    "Yalnızca davetten önceki son 10 yıl içindeki, aday gösterilen veya yakından ilgili meslekte, haftada en az 20 saatlik nitelikli çalışmayı yazın.",
    "Count only skilled work in your nominated or closely related occupation, at least 20 hours/week, within 10 years before invitation.",
    "仅填写获邀前10年内、提名职业或密切相关职业、且每周至少20小时的技术工作年限。"
  );
  const isResearchOrDoctorateQualification =
    qualificationLevel === "Master's Degree (Research)" ||
    qualificationLevel === "PhD/Doctorate" ||
    qualificationLevel === "PhD";
  const resolvedAnzscoEntry = resolveAnzscoEntry(anzscoCode || anzscoSearch);
  const submittedOccupationValue =
    selectedCountry === "AU"
      ? resolvedAnzscoEntry?.code ?? anzscoSearch
      : nocSearch;

  // NOC_ALIAS_MAP and filterNoc replaced by module-level NOC_ALIAS_MAP_STATIC
  // and searchNoc() which uses Fuse.js — see top of file.

  const aiAnalysisSteps = selectedCountry === "CA"
    ? isTr
      ? [
          "516 NOC 2021 meslek kodu taranıyor...",
          "Express Entry CRS çizimi eğilimleri analiz ediliyor...",
          "PNP akışları ve eyalet talep sinyalleri işleniyor...",
          "Kanada stratejik hazırlık raporu oluşturuluyor...",
        ]
      : isZh
      ? [
          "正在扫描 516 个 NOC 2021 职业代码...",
          "正在分析 Express Entry CRS 抽签趋势...",
          "正在处理 PNP 通道与省级需求信号...",
          "正在生成加拿大战略准备度报告...",
        ]
      : [
          "Scanning 516 NOC 2021 occupation codes...",
          "Analyzing Express Entry CRS draw trends...",
          "Processing PNP streams and provincial demand signals...",
          "Generating Canada strategic readiness report...",
        ]
    : isTr
    ? [
        "691 ANZSCO meslek kodu taranıyor...",
        "Tarihsel davet trendleri analiz ediliyor...",
        "Değerlendirme kurumu kesinti kuralları uygulanıyor...",
        "Avustralya stratejik hazırlık raporu oluşturuluyor...",
      ]
    : isZh
    ? [
        "正在扫描 691 个 ANZSCO 职业代码...",
        "正在分析历史邀请趋势...",
        "正在应用评估机构扣减规则...",
        "正在生成澳大利亚战略准备度报告...",
      ]
    : [
        "Scanning 691 ANZSCO occupation codes...",
        "Analyzing historical invitation trends...",
        "Applying assessing authority deduction rules...",
        "Generating Australia strategic readiness report...",
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

    trackFbLeadEvent();

    trackedReportIdRef.current = state.reportId;
  }, [locale, state.reportId, state.status]);

  const activeUnlockedReportState =
    unlockedReportState?.reportId === state.reportId ? unlockedReportState : null;
  const report = activeUnlockedReportState?.report ?? null;
  const shouldHideIntakeForm = state.status === "success" && Boolean(state.reportId);
  const assistantReportData: AssistantReportData | null = report
    ? {
        country: report.country ?? "AU",
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
        stateNominationTracker: report.stateNominationTracker,
        lodgementReadyChecklist: report.lodgementReadyChecklist,
        executiveSummary: report.executiveSummary,
        suggestedNextSteps: report.suggestedNextSteps,
        riskIndicators: report.riskIndicators,
      }
    : null;

  useEffect(() => {
    if (state.status !== "success" || !report) return;
    const node = reportSectionRef.current;
    if (!node) return;

    node.scrollIntoView({ behavior: "smooth", block: "start" });
    node.focus({ preventScroll: true });
  }, [report, state.status]);

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

  function getViabilityBadge(index: number) {
    if (index === 0) return rpt("高潜力", "Yuksek potansiyel", "High potential");
    if (index === 1) return rpt("有条件", "Kosullu", "Conditional");
    return rpt("高风险", "Yuksek risk", "High risk");
  }

  function getQualitativeTierLabel(tier?: string) {
    if (tier === "Potential fit") return rpt("可能匹配", "Olasi uyum", "Potential fit");
    if (tier === "Unclear fit") return rpt("匹配度不明确", "Belirsiz uyum", "Unclear fit");
    return rpt("匹配可能性低", "Olasi degil", "Unlikely fit");
  }

  function getRankedVisaLabel(subclass: string) {
    if (subclass === "189") return rpt("189 独立技术移民", "189 Yetenekli Bagimsiz", "189 Skilled Independent");
    if (subclass === "190") return rpt("190 州担保技术移民", "190 Eyalet Adaylikli", "190 Skilled Nominated");
    if (subclass === "491") return rpt("491 偏远地区技术移民", "491 Bolgesel Nitelikli", "491 Skilled Work Regional");
    return subclass;
  }

  const fieldClassName =
    "h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm shadow-sm transition-all outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20";
  const selectClassName =
    "h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm shadow-sm transition-all outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20";

  const englishLevelOptions = [
    {
      value: "none",
      label: txt(
        "Test almadım / Test 3 yıldan eski",
        "I haven't taken a test / Test is older than 3 years",
        "我还没有参加考试 / 成绩已超过3年"
      ),
    },
    {
      value: "competent",
      label: txt("Competent (örn. IELTS 6.0, PTE 50)", "Competent (e.g., IELTS 6.0, PTE 50)", "Competent（如 IELTS 6.0，PTE 50）"),
    },
    {
      value: "proficient",
      label: txt("Proficient (örn. IELTS 7.0, PTE 65)", "Proficient (e.g., IELTS 7.0, PTE 65)", "Proficient（如 IELTS 7.0，PTE 65）"),
    },
    {
      value: "superior",
      label: txt("Superior (örn. IELTS 8.0, PTE 79)", "Superior (e.g., IELTS 8.0, PTE 79)", "Superior（如 IELTS 8.0，PTE 79）"),
    },
  ];

  const educationOptions = [
    {
      value: "High School",
      label: txt("Lise", "High School", "高中"),
    },
    {
      value: "Certificate",
      label: txt("Sertifika", "Certificate", "证书"),
    },
    {
      value: "Diploma",
      label: txt("Diploma / Meslek Yeterliliği", "Diploma / Trade Qualification", "文凭 / 技工资格"),
    },
    {
      value: "Bachelor's Degree",
      label: txt("Lisans Derecesi", "Bachelor's Degree", "学士学位"),
    },
    {
      value: "Master's Degree (Coursework)",
      label: txt("Yüksek Lisans (Ders Ağırlıklı)", "Master's Degree (Coursework)", "硕士学位（授课型）"),
    },
    {
      value: "Master's Degree (Research)",
      label: txt("Yüksek Lisans (Araştırma)", "Master's Degree (Research)", "硕士学位（研究型）"),
    },
    {
      value: "PhD/Doctorate",
      label: txt("Doktora / PhD", "PhD/Doctorate", "博士学位"),
    },
  ];

  const sponsorFamilyOptions = [
    {
      value: "Single / No Dependants",
      label: txt("Bekar / Bağımlı Yok", "Single / No Dependants", "单身 / 无受养人"),
    },
    {
      value: "Partner / Dependants with Functional English",
      label: txt(
        "Partner / Bağımlılar Functional English ile",
        "Partner / Dependants with Functional English",
        "配偶 / 受养人具备 Functional English"
      ),
    },
    {
      value: "Partner / Dependants WITHOUT Functional English",
      label: txt(
        "Partner / Bağımlılar Functional English OLMADAN",
        "Partner / Dependants WITHOUT Functional English",
        "配偶 / 受养人不具备 Functional English"
      ),
    },
  ];

  // Legal gate: blocks the server action entirely -- no data is submitted,
  // no report is generated -- until Terms/data-processing consent is given.
  // Calling preventDefault() here stops React 19's form `action` from firing,
  // same as it would for a plain onSubmit handler.
  function handleIntakeSubmit(e: React.FormEvent<HTMLFormElement>) {
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
  const termsErrorText = txt(
    "Lütfen devam etmek için yasal koşulları onaylayın.",
    "Please accept the legal terms to proceed.",
    "请接受法律条款以继续。"
  );

  return (
    <div className="space-y-6 overflow-visible">
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

      {!shouldHideIntakeForm && (
      <form action={formAction} onSubmit={handleIntakeSubmit} className="space-y-4 overflow-visible" noValidate>
        <input type="hidden" name="routeLocale" value={locale} />
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
          <Label htmlFor="waitlist-target-country">
            {txt("Hangi ülke için rapor istiyorsunuz?", "Which country is this report for?", "您希望针对哪个国家生成报告？")}
          </Label>
          <select
            id="waitlist-target-country"
            name="targetCountry"
            value={selectedCountry}
            onChange={(e) => {
              const next = e.target.value as SupportedCountry;
              setSelectedCountry(next);
              onCountryChange?.(next);
            }}
            disabled={Boolean(initialValues.targetCountry)}
            className={selectClassName}
          >
            {activeCountries.map((code) => (
              <option key={code} value={code}>
                {countryLabels[code][isTr ? "tr" : isZh ? "zh-Hans" : "en"]}
              </option>
            ))}
          </select>
          {initialValues.targetCountry && (
            <input type="hidden" name="targetCountry" value={initialValues.targetCountry} />
          )}
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
            {renderVisaPathwayOptions(countryVisaPathways[selectedCountry], isTr, isZh)}
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
          <Label htmlFor="waitlist-occupation">
            {txt("Meslek", "Occupation", "职业")}
            {selectedCountry === "CA" && (
              <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                {txt("(NOC 2021 araması)", "(NOC 2021 search)", "（NOC 2021 搜索）")}
              </span>
            )}
          </Label>
          {selectedCountry === "CA" ? (
            <div className="relative">
              <input
                id="waitlist-occupation"
                type="text"
                value={nocSearch}
                autoComplete="off"
                onChange={(e) => {
                  const v = e.target.value;
                  setNocSearch(v);
                  setNocCode("");
                  setNocTeer(null);
                  setNocResults(searchNoc(v));
                  setNocOpen(true);
                }}
                onBlur={() => setTimeout(() => setNocOpen(false), 150)}
                onFocus={() => {
                  if (nocSearch.length >= 2) {
                    setNocResults(searchNoc(nocSearch));
                    setNocOpen(true);
                  }
                }}
                className={fieldClassName + " w-full"}
                placeholder={txt("Örn: Yazılım Mühendisi veya NOC kodu", "E.g., Software Engineer or NOC code", "例如：软件工程师或 NOC 代码")}
              />
              <input type="hidden" name="occupation" value={nocSearch} />
              {nocCode && <input type="hidden" name="nocCode" value={nocCode} />}
              {nocTeer !== null && <input type="hidden" name="nocTeer" value={String(nocTeer)} />}
              {nocCode && (
                <p className="mt-1 text-xs text-emerald-700">
                  {txt("Seçildi:", "Selected:", "已选：")} {nocCode} · TEER {nocTeer}
                </p>
              )}
              {nocOpen && nocResults.length > 0 && (
                <ul className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-md border border-border bg-card shadow-lg text-sm">
                  {nocResults.map((entry) => (
                    <li
                      key={entry.code}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setNocSearch(entry.title);
                        setNocCode(entry.code);
                        setNocTeer(entry.teer);
                        setNocOpen(false);
                        setNocResults([]);
                      }}
                      className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 hover:bg-muted"
                    >
                      <span>{entry.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {entry.code} · TEER {entry.teer}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="relative">
              <input
                id="waitlist-occupation"
                type="text"
                value={anzscoSearch}
                autoComplete="off"
                onChange={(e) => {
                  const value = e.target.value;
                  setAnzscoSearch(value);
                  setAnzscoCode("");
                  setAnzscoResults(searchAnzsco(value, locale));
                  setAnzscoOpen(true);
                }}
                onBlur={() => setTimeout(() => setAnzscoOpen(false), 150)}
                onFocus={() => {
                  if (anzscoSearch.length >= 2) {
                    setAnzscoResults(searchAnzsco(anzscoSearch, locale));
                    setAnzscoOpen(true);
                  }
                }}
                className={fieldClassName + " w-full"}
                placeholder={txt("Örn: Yazılım Mühendisi", "E.g., Software Engineer", "例如：软件工程师")}
              />
              <input type="hidden" name="occupation" value={submittedOccupationValue} />
              {resolvedAnzscoEntry && (
                <p className="mt-1 text-xs text-emerald-700">
                  {txt("Seçildi:", "Selected:", "已选：")} {resolvedAnzscoEntry.code} · {getLocalizedAnzscoTitle(resolvedAnzscoEntry, locale)}
                </p>
              )}
              {anzscoOpen && anzscoResults.length > 0 && (
                <ul className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-md border border-border bg-card shadow-lg text-sm">
                  {anzscoResults.map((entry) => (
                    <li
                      key={entry.code}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setAnzscoSearch(getLocalizedAnzscoTitle(entry, locale));
                        setAnzscoCode(entry.code);
                        setAnzscoOpen(false);
                        setAnzscoResults([]);
                      }}
                      className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 hover:bg-muted"
                    >
                      <span>{getLocalizedAnzscoTitle(entry, locale)}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{entry.code}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="waitlist-english">{txt("İngilizce seviyesi", "English level", "英语水平")}</Label>
          <Select value={englishLevel} onValueChange={setEnglishLevel}>
            <SelectTrigger id="waitlist-english" className={fieldClassName}>
              <SelectValue
                placeholder={txt("İngilizce seviyenizi seçin", "Select your English level", "请选择你的英语水平")}
              />
            </SelectTrigger>
            <SelectContent>
              {englishLevelOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="englishLevel" value={englishLevel} />
          <ErrorText message={state.errors?.englishLevel} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="waitlist-education">
            {txt("En yüksek eğitim seviyesi", "Highest Education Level", "最高学历")}
          </Label>
          <Select value={qualificationLevel} onValueChange={setQualificationLevel}>
            <SelectTrigger id="waitlist-education" className={fieldClassName}>
              <SelectValue
                placeholder={txt("Eğitim seviyenizi seçin", "Select your education level", "请选择你的学历")}
              />
            </SelectTrigger>
            <SelectContent>
              {educationOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="qualificationLevel" value={qualificationLevel} />
          <ErrorText message={state.errors?.qualificationLevel} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="waitlist-qualification-awarded-in-australia">
            {txt(
              "Bu yeterliliği bir Avustralya kurumunda tamamladınız mı?",
              "Did you complete this qualification at an Australian institution?",
              "你是否在澳大利亚教育机构完成了这一学历？"
            )}
          </Label>
          <select
            id="waitlist-qualification-awarded-in-australia"
            name="qualificationAwardedInAustralia"
            value={qualificationAwardedInAustralia}
            onChange={(e) => {
              const next = e.target.value;
              setQualificationAwardedInAustralia(next);
              if (next !== "yes") {
                setQualificationRegionalAustralia("");
                setSpecialistEducationStemResponse("");
              }
            }}
            className={selectClassName}
          >
            <option value="">{txt("Belirtmek istemiyorum", "Prefer not to say", "不愿意说明")}</option>
            <option value="yes">{txt("Evet", "Yes", "是")}</option>
            <option value="no">{txt("Hayır", "No", "否")}</option>
          </select>
          <p className="text-xs text-muted-foreground">
            {txt(
              "Bu yanıt, Australian study requirement (+5) ve varsa regional study (+5) puanlarını belirler.",
              "This answer drives the Australian study requirement (+5) and, if relevant, regional study (+5) points.",
              "此答案将决定 Australian study requirement（+5）以及如适用的 regional study（+5）积分。"
            )}
          </p>
          <ErrorText message={state.errors?.qualificationAwardedInAustralia} />
        </div>

        {qualificationAwardedInAustralia === "yes" && (
          <div className="space-y-2">
            <Label htmlFor="waitlist-qualification-regional-australia">
              {txt(
                "Bu eğitim, Avustralya'nın belirlenmiş bölgesel bir kampüsünde mi tamamlandı? (uzaktan/online değil)",
                "Was this study completed at a campus in a designated regional area of Australia (not distance/online)?",
                "该学习是否在澳大利亚指定偏远地区的实体校区完成（非远程/在线）？"
              )}
            </Label>
            <select
              id="waitlist-qualification-regional-australia"
              name="qualificationRegionalAustralia"
              value={qualificationRegionalAustralia}
              onChange={(e) => setQualificationRegionalAustralia(e.target.value)}
              className={selectClassName}
            >
              <option value="">{txt("Belirtmek istemiyorum", "Prefer not to say", "不愿意说明")}</option>
              <option value="yes">{txt("Evet", "Yes", "是")}</option>
              <option value="no">{txt("Hayır", "No", "否")}</option>
            </select>
            <ErrorText message={state.errors?.qualificationRegionalAustralia} />
          </div>
        )}

        {qualificationAwardedInAustralia === "yes" && isResearchOrDoctorateQualification && (
          <div className="space-y-2">
            <Label htmlFor="waitlist-specialist-education-stem-response">
              {txt(
                "Bu araştırma derecesi şu alanlardan birinde miydi: doğa/fizik bilimleri, matematik, bilgisayar bilimi/BT veya mühendislik ve ilgili teknoloji?",
                "Was this research degree in one of these fields: natural/physical sciences, mathematics, computer science/IT, or engineering and related technology?",
                "该研究型学位是否属于以下领域之一：自然/物理科学、数学、计算机科学/信息技术、或工程及相关技术？"
              )}
            </Label>
            <select
              id="waitlist-specialist-education-stem-response"
              name="specialistEducationStemResponse"
              value={specialistEducationStemResponse}
              onChange={(e) => setSpecialistEducationStemResponse(e.target.value)}
              className={selectClassName}
            >
              <option value="">{txt("Belirtmek istemiyorum", "Prefer not to say", "不愿意说明")}</option>
              <option value="yes">{txt("Evet", "Yes", "是")}</option>
              <option value="no">{txt("Hayır", "No", "否")}</option>
              <option value="not_sure">{txt("Emin değilim", "Not sure", "不确定")}</option>
            </select>
            <p className="text-xs text-muted-foreground">
              {txt(
                "Specialist education +10 puanı yalnızca açıkça 'Evet' cevabı verildiğinde uygulanır.",
                "The specialist education +10 is awarded only on an explicit 'Yes' response.",
                "Specialist education +10 只有在明确回答“是”时才会计入。"
              )}
            </p>
            <ErrorText message={state.errors?.specialistEducationStemResponse} />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="waitlist-salary-aud">{txt("Yıllık Maaş (AUD)", "Annual Salary (AUD)", "年薪（AUD）")}</Label>
          <Input
            id="waitlist-salary-aud"
            name="annualSalaryAud"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={annualSalaryAud}
            onChange={(e) => setAnnualSalaryAud(e.target.value)}
            className={fieldClassName}
            placeholder={txt("Örn: 85000", "E.g., 85000", "例如：85000")}
          />
          <ErrorText message={state.errors?.annualSalaryAud} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="waitlist-offshore-experience-years">
              {txt(
                "Avustralya dışındaki nitelikli iş deneyimi (yıl)",
                "Years of skilled employment outside Australia",
                "澳大利亚境外技术工作年限"
              )}
            </Label>
            <Input
              id="waitlist-offshore-experience-years"
              name="offshoreExperienceYears"
              type="number"
              min={0}
              step="0.5"
              inputMode="decimal"
              className={fieldClassName}
              placeholder={txt("Örn: 5", "E.g., 5", "例如：5")}
            />
            <p className="text-xs text-muted-foreground">{experienceHelpText}</p>
            <ErrorText message={state.errors?.offshoreExperienceYears} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="waitlist-onshore-experience-years">
              {txt(
                "Avustralya içindeki nitelikli iş deneyimi (yıl)",
                "Years of skilled employment in Australia",
                "澳大利亚境内技术工作年限"
              )}
            </Label>
            <Input
              id="waitlist-onshore-experience-years"
              name="onshoreExperienceYears"
              type="number"
              min={0}
              step="0.5"
              inputMode="decimal"
              className={fieldClassName}
              placeholder={txt("Örn: 2", "E.g., 2", "例如：2")}
            />
            <p className="text-xs text-muted-foreground">{experienceHelpText}</p>
            <ErrorText message={state.errors?.onshoreExperienceYears} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="waitlist-sponsor">{txt("Sponsor veya aile durumu", "Sponsor or family status", "担保或家庭情况")}</Label>
          <Select value={sponsorFamilyStatus} onValueChange={setSponsorFamilyStatus}>
            <SelectTrigger id="waitlist-sponsor" className={fieldClassName}>
              <SelectValue
                placeholder={txt("Sponsor/aile durumunu seçin", "Select sponsor/family status", "请选择担保/家庭状态")}
              />
            </SelectTrigger>
            <SelectContent>
              {sponsorFamilyOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="sponsorOrFamily" value={sponsorFamilyStatus} />
          <ErrorText message={state.errors?.sponsorOrFamily} />
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

        <div className="space-y-2">
          <Label htmlFor="waitlist-graduate-visa-intent">
            {txt(
              "Şu anda Avustralya'da uluslararası öğrenci misiniz veya 485 Mezun Vizesi başvurmayı planlıyor musunuz? (opsiyonel)",
              "Are you currently an international student in Australia or planning to apply for a 485 Graduate Visa? (optional)",
              "您目前是否是在澳大利亚的国际学生，或计划申请485毕业生签证？（可选）"
            )}
          </Label>
          <select
            id="waitlist-graduate-visa-intent"
            name="hasGraduateVisaPathwayIntent"
            defaultValue=""
            className={selectClassName}
          >
            <option value="">{txt("Belirtmek istemiyorum", "Prefer not to say", "不愿意说明")}</option>
            <option value="yes">{txt("Evet", "Yes", "是")}</option>
            <option value="no">{txt("Hayır", "No", "否")}</option>
          </select>
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
              placeholder={txt(
                `Orn: 10k-20k ${budgetCurrency}`,
                `E.g., 10k-20k ${budgetCurrency}`,
                `例如：10k-20k ${budgetCurrency}`
              )}
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
                "Kontenjan dolduğunda rapor $49 olacak.",
                "Report will be $49 once spots run out.",
                "名额用完后报告将收费 $49。"
              )}
            </p>
          </div>
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
                  "Hazırlık raporunuzu oluşturun ($49)",
                  "Generate your readiness report ($49)",
                  "生成准备度报告 ($49)"
                )}
        </Button>
      </form>
      )}

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
            window.setTimeout(() => {
              reportSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 80);
          }}
        />
      )}

      {state.status === "success" && report && (
        <section ref={reportSectionRef} tabIndex={-1} className="space-y-4 outline-none">
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
              {rpt("完整签证准备度报告", "Tam vize hazırlık raporu", "Full visa readiness report")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {rpt(
                "本报告基于结构化信息和个人情况。和注册移民顾问面谈可提供进一步评估。",
                "Bu rapor yapısal bilgiye ve kişisel duruma bağlıdır. Kayıtlı bir göç danışmanı ile yapılan görüşme ek inceleme sağlar.",
                "This report is based on structured information and personal circumstances. A consultation with a registered migration agent provides additional review."
              )}
            </p>
          </div>

          <div className="space-y-5 pb-24 sm:pb-28">
            {report.executiveSummary.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {rpt("执行摘要", "Yönetici Özeti", "Executive Summary")}
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

            {(() => {
              // Hard Gate (1 July 2026): pathways the engine marked "ineligible"
              // (482 salary/CSIT, 485 age, 189/190/491 sub-65-point score) are
              // unconditionally pinned to the top of the ranking, ahead of any
              // match-percentage score below.
              const ineligiblePathways = report.pathwayComparison.filter(
                (p) =>
                  p.relevance === "ineligible" &&
                  ["482", "485", "189", "190", "491"].includes(p.subclass)
              );
              const rankedPathways = (report.rankedPathways ?? []).filter(
                (rp) => !ineligiblePathways.some((ie) => ie.subclass === rp.subclass)
              );
              if (ineligiblePathways.length === 0 && rankedPathways.length === 0) return null;

              return (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {rpt("签证可行性排序", "Vize Sans Siralamasi", "Visa Viability Ranking")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {ineligiblePathways.map((p) => (
                      <div
                        key={p.subclass}
                        className="rounded-md border-2 border-red-600 bg-red-50 p-3 dark:bg-red-950/30"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                            {p.subclass} - {p.visaName}
                          </p>
                          <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
                            {rpt("❌ 不符合资格（合规违规）", "❌ Uygun Değil (Uyumluluk İhlali)", "❌ Ineligible (Compliance Violation)")}
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-bold text-red-700 dark:text-red-400">{p.reason}</p>
                      </div>
                    ))}

                    {rankedPathways.map((item, index) => {
                      if (item.isPreliminaryOnly) {
                        return (
                          <div key={item.subclass} className="rounded-md border border-border/70 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-foreground">
                                {getRankedVisaLabel(item.subclass)} - {rpt("仅初步信号", "Yalnizca on sinyal", "Preliminary signal only")}
                              </p>
                              <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                                {getQualitativeTierLabel(item.qualitativeTier)}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{item.preliminaryNote}</p>
                          </div>
                        );
                      }

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
                              {getRankedVisaLabel(item.subclass)} - {item.matchPercentage}% {rpt("匹配", "Uyum", "Match")}
                            </p>
                            <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                              {getViabilityBadge(index)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {rpt("估算基础分", "Tahmini temel puan", "Estimated base points")}: {item.pointsSignal}
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
              );
            })()}

            {report.stateNominationTracker?.eligibilityBlocked && (
              <Card className="border-slate-300 bg-slate-50">
                <CardHeader>
                  <CardTitle className="text-base">
                    {rpt("州担保追踪图", "Eyalet Nomination Tracker", "State Nomination Tracker")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {report.stateNominationTracker.blockedReason}
                  </p>
                </CardContent>
              </Card>
            )}

            {report.stateNominationTracker &&
              !report.stateNominationTracker.eligibilityBlocked &&
              report.stateNominationTracker.states.length > 0 && (
                <StateHeatmap locale={locale} tracker={report.stateNominationTracker} />
              )}

            {report.lodgementReadyChecklist && report.lodgementReadyChecklist.items.length > 0 && (
              <div className="pt-1">
                <ActionChecklist locale={locale} checklist={report.lodgementReadyChecklist} />
              </div>
            )}

            <Card className="border-primary/40 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-base">
                  {rpt("信号摘要", "Sinyal Özeti", "Signal Snapshot")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-md border border-primary/20 bg-background/80 p-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      {rpt("最强信号", "En güçlü sinyal", "Strongest signal")}
                    </p>
                    <p className="mt-1 font-medium">{report.signalSnapshot.strongest}</p>
                  </div>
                  <div className="rounded-md border border-primary/20 bg-background/80 p-3 sm:col-span-2">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      {rpt("次要信号", "İkincil sinyaller", "Secondary signals")}
                    </p>
                    <p className="mt-1 font-medium">
                      {report.signalSnapshot.secondary.length > 0
                        ? report.signalSnapshot.secondary.join(", ")
                        : rpt("无明确次要信号", "Belirgin ikincil sinyal yok", "No clear secondary signal")}
                    </p>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {rpt("信心：", "Güven:", "Confidence:")} {" "}
                    {getSignalConfidenceLabel(report.signalSnapshot.confidenceLabel)}
                  </span>
                </p>
              </CardContent>
            </Card>

            <Card className="border-amber-300 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-base text-amber-950">
                  {rpt("主要限制因素", "Birincil Sınırlayıcı Faktör", "Primary Limiting Factor")}
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
                    {rpt("可能影响您位置的因素", "Durumunuzu Değiştirebilecek Faktörler", "What May Change Your Position")}
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
                    {rpt("路径强度对比", "Vize Yolu Karşılaştırması", "Pathway Strength Comparison")}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {rpt(
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
                          {item.isHardIneligible && item.ineligibleReason && (
                            <p className="mt-1 text-xs font-bold text-red-600 dark:text-red-400">
                              {rpt("🚨 关键合规警报：", "🚨 KRİTİK UYUMLULUK UYARISI: ", "🚨 CRITICAL COMPLIANCE ALERT: ")}
                              {item.ineligibleReason}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">{item.typicalPath}</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-xs">
                          <span className={`rounded-full px-2.5 py-0.5 font-medium ${getRelativePositionClass(item.relativePosition)}`}>
                            {getStrengthLabel(item.strength)}
                          </span>
                          <span className="rounded-full bg-muted px-2.5 py-0.5 text-muted-foreground">
                            {rpt("阻力：", "Zorluk seviyesi:", "Friction:")} {getDifficultyLabel(item.friction)}
                          </span>
                          <span className="rounded-full bg-muted px-2.5 py-0.5 text-muted-foreground">
                            {rpt("材料量：", "Gerekli belge düzeyi:", "Evidence load:")} {getEvidenceLoadLabel(item.evidenceLoad)}
                          </span>
                        </div>
                      </div>
                      {/* Signal reasons and limiting factors */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <p className="font-medium text-xs mb-1">{rpt("信号原因", "Sinyal nedenleri", "Signal reasons")}</p>
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
                          <p className="font-medium text-xs mb-1">{rpt("限制因素", "Sınırlayıcı faktörler", "Limiting factors")}</p>
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
                        <p className="font-medium text-xs mb-1.5">{rpt("材料状态", "Kanıt durumu", "Evidence status")}</p>
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
                  {rpt("置信度说明", "Güven Açıklaması", "Confidence Explanation")}
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
                  {rpt("材料准备度摘要", "Kanıt/Bilgi Hazırlık Özeti", "Evidence Readiness Snapshot")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.evidenceReadiness.map((item) => (
                  <div key={item.category} className="rounded-md border border-border/70 p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{item.category}</p>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                        {item.status === "provided"
                          ? rpt("已提供", "Sağlandı", "Provided")
                          : item.status === "missing"
                            ? rpt("缺少", "Eksik", "Missing")
                            : item.status === "typically_required"
                              ? rpt("通常需要", "Tipik olarak gerekir", "Typically required")
                              : rpt("不明确", "Net değil", "Unclear")}
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
                  {rpt("加分场景模拟", "Puan Senaryo Simülätörü", "Points Booster Simulator")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.pointsBoosterSimulator.currentEstimate !== undefined && (
                  <p className="font-semibold">
                      {rpt("当前数学估算：", "Mevcut matematiksel tahmin:", "Current mathematical estimate:")} {report.pointsBoosterSimulator.currentEstimate}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {rpt(
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
                  {rpt("费用路线图", "Tahmini Maliyet Yol Haritası", "Financial Roadmap")}
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
                  {rpt("通往永居路径", "Tipik Geçiş Yolları", "Bridge to PR / Typical Progression Pathways")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {rpt(
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
                  {rpt("路径阻力 / 现实校验", "Vize Yolu Gerçeklik Kontrolü", "Pathway Friction / Reality Check")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.pathwayFriction.map((item) => (
                  <div
                    key={`${item.pathway}-${item.frictionType}`}
                    className={
                      item.isHardIneligible
                        ? "rounded-md border-2 border-red-600 bg-red-50 p-3 text-sm dark:bg-red-950/30"
                        : "rounded-md border border-border/70 p-3 text-sm"
                    }
                  >
                    <p className={item.isHardIneligible ? "font-bold text-red-700 dark:text-red-400" : "font-medium"}>
                      {item.pathway}
                    </p>
                    <p className={item.isHardIneligible ? "text-xs font-bold text-red-700 dark:text-red-400" : "text-xs text-muted-foreground"}>
                      {item.frictionType}
                    </p>
                    <p className={item.isHardIneligible ? "mt-2 font-bold text-red-700 dark:text-red-400" : "mt-2 text-muted-foreground"}>
                      {item.explanation}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <ReportSection
            title={rpt("风险指标", "Risk göstergeleri", "Risk indicators")}
            items={report.riskIndicators.map(
              (r) => `[${isZh ? (r.level === "high" ? "高" : r.level === "medium" ? "中" : "低") : isTr ? (r.level === "high" ? "Yüksek" : r.level === "medium" ? "Orta" : "Düşük") : (r.level === "high" ? "High" : r.level === "medium" ? "Medium" : "Low")}] ${r.title}: ${r.explanation}`
            )}
          />

          <ReportSection
            title={rpt("建议下一步", "Önerilen sonraki adımlar", "Suggested next steps")}
            items={report.suggestedNextSteps}
          />

          {report.missingInformation.length > 0 && (
            <ReportSection
              title={rpt("缺少信息", "Eksik bilgiler", "Missing information")}
              items={report.missingInformation}
            />
          )}

          <Card className="bg-amber-50 border-amber-200">
            <CardHeader>
              <CardTitle className="text-sm text-amber-900">
                {rpt("免责声明", "Uyarı", "Disclaimer")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-amber-800">{report.disclaimer}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                  {rpt("可下载 PDF", "İndirilebilir PDF", "Downloadable PDF")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
                {rpt(
                  "高级 PDF 报告（多模块深度分析）",
                  "Premium PDF Report (Cok Bolumlu Derin Analiz)",
                  "Premium PDF Report (Comprehensive Multi-Section Analysis)"
                )}
              </div>

              <div className="rounded-md border border-border bg-card/60 px-3 py-3">
                <p className="text-sm font-medium">{rpt("样本报告预览", "Sample Report önizlemesi", "Sample Report preview")}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {rpt(
                    "内容示例：战略甘特图、阻力分析、费用路线图、审计清单和行动计划。",
                    "İçerik örneği: stratejik gantt, sürtünme analizi, maliyet yol haritası, audit checklist ve aksiyon planı.",
                    "Preview includes: strategic gantt, friction analysis, financial roadmap, audit checklist, and action plan."
                  )}
                </p>
              </div>

              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                {rpt("$49 单次报告", "$49 Tek rapor üreti", "$49 for a Single Report")}
              </div>

              <Button onClick={handleDownloadPDF} variant="default" className="flex gap-2">
                <Download className="size-4" />
                {rpt("下载 PDF", "PDF indir", "Download PDF")}
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
