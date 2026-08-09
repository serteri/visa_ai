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
import { activeCountries, countryLabels, countryVisaPathways, defaultCountry, isSupportedCountry, isPartnerFamilySponsorship, migrationGoalOptions, getVisaSubclassesForGoals, type SupportedCountry, type VisaPathwayOption, type MigrationGoalId } from "@/lib/countries";
import { PremiumFeatureGate } from "@/components/premium-feature-gate";
import { TermsGate, TermsGateLink } from "@/components/terms-gate";
import { LogiAIAssistant } from "@/components/LogiAIAssistant";
import { useTranslation } from "@/contexts/language-context";
import { generateReadinessPDF } from "@/lib/readiness/generate-pdf";
import type { AssistantReportData, ReadinessReport } from "@/lib/readiness/types";
import { findOccupationRecord, getSkilledListMembership } from "@/lib/readiness/occupation-eligibility";
import { LeadMagnetForm } from "@/components/LeadMagnetForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import nocListRaw from "@/src/data/countries/ca/noc-list.json";
import anzscoListRaw from "@/src/data/anzsco-list.json";
import Fuse from "fuse.js";

// Course/CoE fields feed the evidence checklist for both the Student visa
// (500 — "Course / CoE") and the Temporary Graduate visa (485 — "Recent
// Australian study"), so both pathways need the chance to fill them in.
const COURSE_FIELDS_VISA_INTERESTS = ["500", "485"];
function showsCourseFields(visaInterest: string): boolean {
  return COURSE_FIELDS_VISA_INTERESTS.includes(visaInterest);
}

// ── NOC Fuzzy Search Setup ────────────────────────────────────────────────────
// Built once at module level so every keystroke hits a pre-built index.

type NocEntry = { code: string; title: string; teer: number };
type AnzscoEntry = {
  code: string;
  title: string;
  title_tr?: string;
  title_zh?: string;
  keywords?: string[];
  isOnSkilledList?: boolean;
};

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

const ANZSCO_INDEX = (anzscoListRaw as any[]).map((row) => ({
  code: row.code,
  title: row.title_en || row.title || "",
  title_tr: row.title_tr,
  title_zh: row.title_zh,
  keywords: row.keywords || [],
})) as AnzscoEntry[];

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

  const maxResults = locale === "tr" || locale === "zh-Hans" ? 80 : 14;

  const scoredResults = ANZSCO_INDEX.map((entry) => {
    const localizedTitle = getLocalizedAnzscoTitle(entry, locale);
    const foldedLocalizedTitle = foldLookupValue(localizedTitle);
    const foldedEnglishTitle = foldLookupValue(entry.title);
    const foldedCode = foldLookupValue(entry.code);

    let bestScore = Number.POSITIVE_INFINITY;
    for (const term of searchTerms) {
      if (!term) continue;
      if (foldedCode === term) bestScore = Math.min(bestScore, 0);
      if (foldedLocalizedTitle === term) bestScore = Math.min(bestScore, 1);
      if (foldedEnglishTitle === term) bestScore = Math.min(bestScore, 2);
      if (foldedLocalizedTitle.startsWith(term)) bestScore = Math.min(bestScore, 3);
      if (foldedEnglishTitle.startsWith(term)) bestScore = Math.min(bestScore, 4);
      if (foldedLocalizedTitle.includes(term)) bestScore = Math.min(bestScore, 5);
      if (foldedEnglishTitle.includes(term)) bestScore = Math.min(bestScore, 6);
      
      const keywordMatch = entry.keywords?.some(kw => foldLookupValue(kw).includes(term)) ?? false;
      if (keywordMatch) bestScore = Math.min(bestScore, 7);
    }

    return { entry, score: bestScore, localizedTitle };
  })
    .filter(({ score }) => Number.isFinite(score))
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;

      const byLocalizedTitle = a.localizedTitle.localeCompare(b.localizedTitle, locale);
      if (byLocalizedTitle !== 0) return byLocalizedTitle;

      return a.entry.code.localeCompare(b.entry.code);
    });

  return scoredResults.slice(0, maxResults).map(({ entry }) => {
    const record = findOccupationRecord(entry.code);
    const isOnSkilledList = record ? getSkilledListMembership(record.anzsco_code).length > 0 : false;
    return {
      ...entry,
      isOnSkilledList,
    };
  });
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

// Red asterisk shown next to the label of every mandatory field.
function RequiredMark() {
  return (
    <span className="text-red-500 ml-1" aria-hidden="true">
      *
    </span>
  );
}

// Robust cross-browser autofill suppression. Chrome/Edge frequently ignore
// autoComplete="off", but they disable autofill for a field whose token they
// don't recognise, so each field gets a distinct non-standard token (kept
// constant here so server and client render the same markup — no hydration
// mismatch). The data-* attributes opt the field out of the common password
// managers (LastPass, 1Password, Dashlane) as well.
function noAutofill(field: string) {
  return {
    autoComplete: `no-fill-${field}`,
    autoCorrect: "off",
    autoCapitalize: "off",
    spellCheck: false,
    "data-lpignore": "true",
    "data-1p-ignore": "true",
    "data-form-type": "other",
  } as const;
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
  const { t } = useTranslation();
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
  const [occupationModalOpen, setOccupationModalOpen] = useState(false);
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
  const [isQualificationRecognized, setIsQualificationRecognized] = useState("");
  const [visaInterest, setVisaInterest] = useState(initialValues.visaInterest ?? "");
  const [migrationGoals, setMigrationGoals] = useState<MigrationGoalId[]>([]);
  const [preferredState, setPreferredState] = useState("");
  const isPartner = isPartnerFamilySponsorship(visaInterest);

  /** Toggle a migration goal. Max 2 selections — deselects the oldest when a 3rd is picked. */
  function toggleMigrationGoal(id: MigrationGoalId) {
    setMigrationGoals((prev) => {
      if (prev.includes(id)) return prev.filter((g) => g !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }

  const [relationshipType, setRelationshipType] = useState("");
  const [cohabitationDuration, setCohabitationDuration] = useState("");
  const [sponsorStatus, setSponsorStatus] = useState("");
  const [previousSponsorship, setPreviousSponsorship] = useState("");
  const [applicationLocationPreference, setApplicationLocationPreference] = useState("");
  const [relationshipEvidence, setRelationshipEvidence] = useState<string[]>([]);

  const [nominationStream, setNominationStream] = useState("");
  const [yearsInSponsoredPosition, setYearsInSponsoredPosition] = useState("");
  const [courseName, setCourseName] = useState("");
  const [courseCricosCode, setCourseCricosCode] = useState("");
  const [courseCompletionStatus, setCourseCompletionStatus] = useState("");
  const [courseCompletionDate, setCourseCompletionDate] = useState("");
  const experienceHelpText = selectedCountry === "CA"
    ? txt(
        "Nitelikli (TEER 0-5) kapsamındaki iş deneyimlerinizi yazın. Kanada içi deneyimler en az 1 yıl tam zamanlı olmalıdır.",
        "Count skilled employment (TEER 0-5). Canadian work experience must be at least 1 year full-time to claim points.",
        "仅计入技术工作经验（TEER 0-5）。加拿大境内工作经验须满至少1年全职方可计分。"
      )
    : txt(
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

  const fieldClassName =
    "h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm shadow-sm transition-all outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20";
  const selectClassName =
    "h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm shadow-sm transition-all outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20";

  const englishLevelOptions = selectedCountry === "CA" ? [
    {
      value: "none",
      label: txt(
        "Test almadım / CLB 4'ten düşük",
        "I haven't taken a test / Below CLB 4",
        "我还没有参加考试 / 低于 CLB 4"
      ),
    },
    {
      value: "competent",
      label: txt(
        "CLB 5 - 6 (örn. IELTS 5.0 - 5.5, CELPIP 5 - 6)",
        "CLB 5 - 6 (e.g., IELTS 5.0 - 5.5, CELPIP 5 - 6)",
        "CLB 5 - 6（如 IELTS 5.0 - 5.5，CELPIP 5 - 6）"
      ),
    },
    {
      value: "proficient",
      label: txt(
        "CLB 7 - 8 (örn. IELTS 6.0 - 6.5, CELPIP 7 - 8)",
        "CLB 7 - 8 (e.g., IELTS 6.0 - 6.5, CELPIP 7 - 8)",
        "CLB 7 - 8（如 IELTS 6.0 - 6.5，CELPIP 7 - 8）"
      ),
    },
    {
      value: "superior",
      label: txt(
        "CLB 9+ (örn. IELTS L:8.0, diğer:7.0, CELPIP 9+)",
        "CLB 9+ (e.g., IELTS L:8.0, others:7.0, CELPIP 9+)",
        "CLB 9+（如 IELTS 听力:8.0，其他:7.0，CELPIP 9+）"
      ),
    },
  ] : [
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

  const sponsorFamilyOptions = selectedCountry === "CA" ? [
    {
      value: "Single / No Spouse",
      label: txt("Bekar / Eş Yok", "Single / No Spouse", "单身 / 无配偶"),
    },
    {
      value: "Spouse is Canadian Citizen or PR",
      label: txt("Eşim Kanada Vatandaşı veya PR", "Spouse is Canadian Citizen or PR", "配偶是加拿大公民或永久居民"),
    },
    {
      value: "Spouse is Accompanying (with English/Education)",
      label: txt("Eşim Eşlik Ediyor (İngilizce/Eğitim Var)", "Spouse is Accompanying (with English/Education)", "配偶随行（有英语/教育学历）"),
    },
    {
      value: "Spouse is Accompanying (WITHOUT English/Education)",
      label: txt("Eşim Eşlik Ediyor (İngilizce/Eğitim Yok)", "Spouse is Accompanying (WITHOUT English/Education)", "配偶随行（无英语/教育学历）"),
    }
  ] : [
    {
      value: "Single / No Dependants",
      label: txt("Bekar / Bağımlı Yok", "Single / No Dependants", "单身 / 无受养人"),
    },
    {
      value: "Partner / Dependants with Functional English",
      label: txt(
        "Partner / Bağımlılar Functional English ile",
        "Partner / Dependants with Functional English",
        "伴侣 / 受养人具备 Functional English"
      ),
    },
    {
      value: "Partner / Dependants WITHOUT Functional English",
      label: txt(
        "Partner / Bağımlılar Functional English OLMADAN",
        "Partner / Dependants WITHOUT Functional English",
        "伴侣 / 受养人不具备 Functional English"
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
      <form action={formAction} onSubmit={handleIntakeSubmit} className="space-y-4 overflow-visible" autoComplete="off" noValidate>
        <input type="hidden" name="routeLocale" value={locale} />
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="preferredLanguage" value={locale} />
        <input type="hidden" name="source" value={initialValues.source ?? "full_check"} />
        <input type="hidden" name="analysisProgressId" value={analysisProgressId} />

        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {t("mandatory_fields_warning")}
        </p>

        <div className="space-y-2">
          <Label htmlFor="waitlist-full-name">
            {txt("Ad soyad", "Full name", "姓名")}
            <RequiredMark />
          </Label>
          <Input
            id="waitlist-full-name"
            name="fullName"
            required
            {...noAutofill("fullName")}
            className={fieldClassName}
            placeholder={txt("Adınız", "Your name", "请输入姓名")}
          />
          <ErrorText message={state.errors?.fullName} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="waitlist-email">
            {txt("E-posta adresi", "Email address", "邮箱地址")}
            <RequiredMark />
          </Label>
          <Input
            id="waitlist-email"
            name="email"
            type="email"
            placeholder="you@example.com"
            {...noAutofill("email")}
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

        <div className="space-y-3">
          <Label>
            {txt("Birincil göç hedefiniz nedir? (en fazla 2 seçim)", "What is your primary migration goal? (max 2 selections)", "您的主要移民目标是什么？（最多选2项）")}
            <RequiredMark />
          </Label>
          <div className="grid gap-3 sm:grid-cols-3">
            {migrationGoalOptions.map((goal) => {
              const isSelected = migrationGoals.includes(goal.id);
              return (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => toggleMigrationGoal(goal.id)}
                  className={`rounded-xl border-2 p-4 text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/20"
                      : "border-border/60 bg-background/60 hover:border-primary/40 hover:bg-primary/[0.02]"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className={`mt-0.5 h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center ${
                      isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"
                    }`}>
                      {isSelected && (
                        <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}>
                        {goal.label[locale as "en" | "tr" | "zh-Hans"] ?? goal.label.en}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {goal.description[locale as "en" | "tr" | "zh-Hans"] ?? goal.description.en}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <input type="hidden" name="migrationGoals" value={JSON.stringify(migrationGoals)} />
          {/* Backward-compat: populate mainGoal from selected intents */}
          <input
            type="hidden"
            name="mainGoal"
            value={migrationGoals
              .map((id) => migrationGoalOptions.find((g) => g.id === id)?.label.en ?? id)
              .join(", ")
            }
          />
          {migrationGoals.length === 0 && (
            <p className="text-xs text-muted-foreground">
              {txt(
                "En az bir hedef seçin. Belirli bir vize bilginiz varsa aşağıdan seçebilirsiniz.",
                "Select at least one goal. If you know a specific visa subclass, you can choose it below.",
                "请至少选择一个目标。如果您了解具体签证类别，可在下方选择。"
              )}
            </p>
          )}
        </div>

        {/* Fallback: specific visa subclass select — shown only when no goals selected */}
        {migrationGoals.length === 0 && (
          <div className="space-y-2">
            <Label htmlFor="waitlist-visa-interest">
              {txt("veya belirli bir vize yolunu seçin", "or select a specific visa pathway", "或选择具体签证路径")}
            </Label>
            <select
              id="waitlist-visa-interest"
              name="visaInterest"
              value={visaInterest}
              onChange={(e) => setVisaInterest(e.target.value)}
              className={selectClassName}
            >
              <option value="">{txt("Tüm yollar / Emin değilim", "All pathways / Not sure", "全部路径 / 不确定")}</option>
              {renderVisaPathwayOptions(countryVisaPathways[selectedCountry], isTr, isZh)}
            </select>
          </div>
        )}
        {/* When goals are selected, still pass visaInterest for backward compat */}
        {migrationGoals.length > 0 && (
          <input type="hidden" name="visaInterest" value={getVisaSubclassesForGoals(migrationGoals).join(",")} />
        )}

        {/* Preferred state for 190/491 state nomination — shown when a state-nominated goal is selected */}
        {selectedCountry === "AU" && (migrationGoals.includes("direct_pr") || migrationGoals.includes("regional")) && (
          <div className="space-y-2">
            <Label htmlFor="waitlist-preferred-state">
              {txt(
                "Tercih ettiğiniz eyalet? (190/491 adaylığı için)",
                "Preferred state? (for 190/491 nomination)",
                "您偏好哪个州？（用于190/491提名）"
              )}
            </Label>
            <select
              id="waitlist-preferred-state"
              name="preferredState"
              value={preferredState}
              onChange={(e) => setPreferredState(e.target.value)}
              className={selectClassName}
            >
              <option value="">{txt("Seçin / Kararsızım", "Select / Undecided", "请选择/未决定")}</option>
              {[
                ["NSW", "New South Wales"],
                ["VIC", "Victoria"],
                ["QLD", "Queensland"],
                ["SA", "South Australia"],
                ["WA", "Western Australia"],
                ["TAS", "Tasmania"],
                ["NT", "Northern Territory"],
                ["ACT", "Australian Capital Territory"],
              ].map(([code, name]) => (
                <option key={code} value={code}>
                  {code} — {name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {txt(
                "Eyalet adaylığı analizi, seçtiğiniz eyaletin yıllık tahsisiyle karşılaştırılacaktır.",
                "State nomination analysis will compare against your selected state's annual allocation.",
                "州提名分析将根据您所选州的年度配额进行比较。"
              )}
            </p>
            <ErrorText message={state.errors?.preferredState} />
          </div>
        )}

        {visaInterest === "186" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="waitlist-nomination-stream">
                {txt(
                  "186 için hangi akışı hedefliyorsunuz? (opsiyonel)",
                  "Which subclass 186 stream are you targeting? (optional)",
                  "您计划申请186签证的哪个通道？（可选）"
                )}
              </Label>
              <select
                id="waitlist-nomination-stream"
                name="nominationStream"
                value={nominationStream}
                onChange={(e) => setNominationStream(e.target.value)}
                className={selectClassName}
              >
                <option value="">{txt("Emin değilim / ikisini de değerlendir", "Not sure / evaluate both", "不确定 / 两者都评估")}</option>
                <option value="direct_entry">{txt("Direct Entry", "Direct Entry", "Direct Entry")}</option>
                <option value="trt">{txt("Temporary Residence Transition (TRT)", "Temporary Residence Transition (TRT)", "Temporary Residence Transition (TRT)")}</option>
                <option value="labour_agreement">{txt("Labour Agreement", "Labour Agreement", "Labour Agreement")}</option>
              </select>
              <p className="text-xs text-muted-foreground">
                {txt(
                  "Direct Entry: yeni başvurular için. TRT: halihazırda 457/482 vizesiyle 2+ yıl sponsorlu çalışanlar için. Labour Agreement: işvereni bir labour agreement'a taraf olanlar için.",
                  "Direct Entry: for new applicants without a current 457/482 visa. TRT: requires currently holding a 457 or 482 visa with 2+ years of eligible sponsored employment. Labour Agreement: for applicants whose employer is party to a labour agreement.",
                  "Direct Entry：适用于无当前457/482签证的新申请人。TRT：需持有457或482签证且有2年以上合格担保就业经历。Labour Agreement：适用于雇主为劳工协议签约方的申请人。"
                )}
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-[var(--cf-line)] px-4 py-3">
              <input
                type="checkbox"
                id="waitlist-labour-agreement-employer"
                name="isLabourAgreementEmployer"
                className="h-4 w-4 rounded border-[var(--cf-line)] accent-[var(--cf-accent)]"
              />
              <Label htmlFor="waitlist-labour-agreement-employer" className="cursor-pointer text-sm font-medium text-foreground">
                Is your employer party to a Labour Agreement / DAMA?
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="waitlist-years-sponsored-position">
                {txt(
                  "TRT: Onaylı sponsor(lar) altında toplam çalışma süresi (yıl, opsiyonel)",
                  "TRT: Total years employed under approved sponsor(s) (optional)",
                  "TRT：在获批担保方名下的累计工作年限（可选）"
                )}
              </Label>
              <Input
                id="waitlist-years-sponsored-position"
                name="yearsInSponsoredPosition"
                type="number"
                min={0}
                step="0.5"
                inputMode="decimal"
                value={yearsInSponsoredPosition}
                onChange={(e) => setYearsInSponsoredPosition(e.target.value)}
                {...noAutofill("yearsInSponsoredPosition")}
                className={fieldClassName}
                placeholder={txt("Örn: 3", "E.g., 3", "例如：3")}
              />
              <p className="text-xs text-muted-foreground">
                {txt(
                  "Aynı işverende olması gerekmez — süre, onaylı sponsor statüsündeki tüm işverenler toplanarak hesaplanabilir.",
                  "Does not need to be with a single employer — this can total sponsored periods across more than one approved sponsor.",
                  "无需在同一雇主处任职——可累计多个获批担保雇主的工作年限总和。"
                )}
              </p>
            </div>
          </div>
        )}

        {showsCourseFields(visaInterest) && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="waitlist-course-name">
                {txt("Kurs / nitelik adı (opsiyonel)", "Course / qualification name (optional)", "课程/学历名称（可选）")}
              </Label>
              <Input
                id="waitlist-course-name"
                name="courseName"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                {...noAutofill("courseName")}
                className={fieldClassName}
                placeholder={txt("Örn: Master of Information Technology", "E.g., Master of Information Technology", "例如：信息技术硕士")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="waitlist-course-cricos-code">
                {txt("CRICOS kurs kodu (opsiyonel)", "CRICOS course code (optional)", "CRICOS 课程代码（可选）")}
              </Label>
              <Input
                id="waitlist-course-cricos-code"
                name="courseCricosCode"
                value={courseCricosCode}
                onChange={(e) => setCourseCricosCode(e.target.value)}
                {...noAutofill("courseCricosCode")}
                className={fieldClassName}
                placeholder={txt("Örn: 0123456X", "E.g., 0123456X", "例如：0123456X")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="waitlist-course-completion-status">
                {txt("Kurs durumu (opsiyonel)", "Course status (optional)", "课程状态（可选）")}
              </Label>
              <select
                id="waitlist-course-completion-status"
                name="courseCompletionStatus"
                value={courseCompletionStatus}
                onChange={(e) => setCourseCompletionStatus(e.target.value)}
                className={selectClassName}
              >
                <option value="">{txt("Belirtmek istemiyorum", "Prefer not to say", "不愿意说明")}</option>
                <option value="studying">{txt("Hâlâ okuyorum", "Still studying", "仍在就读")}</option>
                <option value="completed">{txt("Tamamladım", "Completed", "已完成")}</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="waitlist-course-completion-date">
                {txt(
                  "Kursun (tahmini) tamamlanma tarihi (opsiyonel)",
                  "Course's (estimated) completion date (optional)",
                  "课程（预计）完成日期（可选）"
                )}
              </Label>
              <Input
                id="waitlist-course-completion-date"
                name="courseCompletionDate"
                type="month"
                value={courseCompletionDate}
                onChange={(e) => setCourseCompletionDate(e.target.value)}
                {...noAutofill("courseCompletionDate")}
                className={fieldClassName}
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="waitlist-current-country">
            {txt("Bulunduğunuz ülke", "Current country", "当前国家")}
            <RequiredMark />
          </Label>
          <Input
            id="waitlist-current-country"
            name="currentCountry"
            required
            defaultValue={initialValues.currentCountry ?? ""}
            {...noAutofill("currentCountry")}
            className={fieldClassName}
            placeholder={txt("Avustralya, Türkiye, Hindistan veya başka bir ülke", "Australia, Turkiye, India, or elsewhere", "例如：澳大利亚、中国、土耳其等")}
          />
          <ErrorText message={state.errors?.currentCountry} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="waitlist-passport-country">
              {txt("Pasaport ülkesi", "Passport country", "护照国家")}
              <RequiredMark />
            </Label>
            <Input
              id="waitlist-passport-country"
              name="passportCountry"
              required
              {...noAutofill("passportCountry")}
              className={fieldClassName}
              placeholder={txt("Ülke adı", "Country name", "国家名称")}
            />
            <ErrorText message={state.errors?.passportCountry} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="waitlist-age">
              {txt("Yaş", "Age", "年龄")}
              <RequiredMark />
            </Label>
            <Input
              id="waitlist-age"
              name="age"
              type="number"
              required
              {...noAutofill("age")}
              className={fieldClassName}
              placeholder={txt("Örn: 28", "E.g., 28", "例如：28")}
            />
            <ErrorText message={state.errors?.age} />
          </div>
        </div>

        {!isPartner && (
          <div className="space-y-2">
            <Label htmlFor="waitlist-occupation">
              {txt("Meslek", "Occupation", "职业")}
              <RequiredMark />
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
                  {...noAutofill("occupation")}
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
                  {...noAutofill("occupation")}
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
                    {anzscoResults.map((entry) => {
                      const nameStyle = entry.isOnSkilledList === false ? "text-muted-foreground" : "text-foreground font-medium";
                      return (
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
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`${nameStyle} truncate`}>
                              {getLocalizedAnzscoTitle(entry, locale)}
                            </span>
                            {entry.isOnSkilledList === false && (
                              <Badge variant="outline" className="shrink-0 scale-90 border-slate-200 bg-slate-50 text-slate-500 font-normal">
                                {txt("Nitelikli Listede Değil", "Not on Skilled List", "不在主要职业清单上")}
                              </Badge>
                            )}
                          </div>
                          <span className="shrink-0 text-xs text-muted-foreground">{entry.code}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            {/* AU-only helper — opens modal so user never loses form progress */}
            {selectedCountry === "AU" && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3 shrink-0 text-indigo-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {txt("Emin değil misiniz?", "Not sure?", "不确定？")}{" "}
                <button
                  type="button"
                  onClick={() => setOccupationModalOpen(true)}
                  className="inline-flex items-center gap-0.5 text-indigo-500 underline-offset-2 hover:text-indigo-700 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  {txt("2026 Resmi Meslek Listesini İncele", "Check the 2026 Official Occupation List", "查看 2026 官方职业清单")}
                </button>
              </p>
            )}

            {/* Skills Assessment Question — shown only when occupation is on a skilled list */}
            {((selectedCountry === "AU" && resolvedAnzscoEntry && getSkilledListMembership(resolvedAnzscoEntry.code).length > 0) ||
              (selectedCountry === "CA" && nocCode && nocTeer !== null && nocTeer <= 5)) && (
              <div className="mt-3 space-y-2 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                <Label className="text-sm font-semibold text-indigo-900 dark:text-indigo-300">
                  {txt(
                    "Bu meslek için beceri değerlendirmesi (skills assessment) yaptıınız mı?",
                    "Have you completed a skills assessment for this occupation?",
                    "您是否已完成该职业的技能评估？"
                  )}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {txt(
                    nocCode
                      ? `${nocCode} kodu için değerlendirme kurumundan onay aldıysanız Evet seçin.`
                      : "Değerlendirme kurumundan onay aldıysanız Evet seçin.",
                    nocCode
                      ? `Select Yes if you have received approval from the assessing authority for NOC ${nocCode}.`
                      : "Select Yes if you have received approval from the assessing authority.",
                    nocCode
                      ? `如果${nocCode}职业已通过评估机构认证，请选择是。`
                      : "如果已通过评估机构认证，请选择是。"
                  )}
                </p>
                <div className="flex gap-3 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="skillsAssessment" value="yes" className="accent-indigo-600" />
                    <span className="text-sm font-medium">{txt("Evet", "Yes", "是")}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="skillsAssessment" value="no" className="accent-indigo-600" defaultChecked />
                    <span className="text-sm font-medium">{txt("Hayır / Henüz Yapılmadı", "No / Not Yet Done", "否 / 尚未完成")}</span>
                  </label>
                </div>
                <input type="hidden" name="skillsAssessment" value="no" />
              </div>
            )}

            <ErrorText message={state.errors?.occupation} />
          </div>
        )}

        {isPartner && (
          <div className="space-y-4 border-l-2 border-indigo-200 pl-4 py-1 my-4">
            <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-300">
              {txt("İlişki ve Sponsor Bilgileri", "Relationship & Sponsor Information", "关系与担保人信息")}
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="waitlist-relationship-type">
                  {txt("İlişki Türü", "Relationship Type", "关系类型")}
                  <RequiredMark />
                </Label>
                <select
                  id="waitlist-relationship-type"
                  name="relationshipType"
                  value={relationshipType}
                  onChange={(e) => setRelationshipType(e.target.value)}
                  className={selectClassName}
                  required
                >
                  <option value="">{txt("Seçin", "Select", "请选择")}</option>
                  <option value="married">{txt("Evli", "Married", "已婚")}</option>
                  <option value="de_facto">{selectedCountry === "CA" ? txt("Common-law (Fiili Birliktelik)", "Common-law (De facto)", "事实婚姻 (Common-law)") : txt("De facto (Fiili Birliktelik)", "De facto", "事实婚姻 (De facto)")}</option>
                  {selectedCountry === "AU" && (
                    <option value="engaged">{txt("Nişanlı", "Engaged", "订婚")}</option>
                  )}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="waitlist-cohabitation-duration">
                  {txt("Birlikte Yaşama Süresi", "Cohabitation Duration", "共同居住时间")}
                  <RequiredMark />
                </Label>
                <select
                  id="waitlist-cohabitation-duration"
                  name="cohabitationDuration"
                  value={cohabitationDuration}
                  onChange={(e) => setCohabitationDuration(e.target.value)}
                  className={selectClassName}
                  required
                >
                  <option value="">{txt("Seçin", "Select", "请选择")}</option>
                  <option value="less_than_12_months">{txt("12 aydan az", "Less than 12 months", "少于 12 个月")}</option>
                  <option value="12_to_24_months">{txt("12 - 24 ay", "12 - 24 months", "12 - 24 个月")}</option>
                  <option value="more_than_2_years">{txt("2 yıldan fazla", "More than 2 years", "2 年以上")}</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="waitlist-sponsor-status">
                  {txt("Sponsorun Statüsü", "Sponsor Status", "担保人身份")}
                  <RequiredMark />
                </Label>
                <select
                  id="waitlist-sponsor-status"
                  name="sponsorStatus"
                  value={sponsorStatus}
                  onChange={(e) => setSponsorStatus(e.target.value)}
                  className={selectClassName}
                  required
                >
                  <option value="">{txt("Seçin", "Select", "请选择")}</option>
                  <option value="citizen">{txt("Vatandaş", "Citizen", "公民")}</option>
                  <option value="permanent_resident">{txt("Kalıcı Oturum (PR)", "Permanent Resident", "永久居民")}</option>
                  {selectedCountry === "AU" && (
                    <option value="eligible_nz_citizen">{txt("Uygun Yeni Zelanda Vatandaşı", "Eligible NZ Citizen", "合格的新西兰公民")}</option>
                  )}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="waitlist-previous-sponsorship">
                  {txt("Önceki Sponsorluk Geçmişi", "Previous Sponsorship History", "既往担保历史")}
                  <RequiredMark />
                </Label>
                <select
                  id="waitlist-previous-sponsorship"
                  name="previousSponsorship"
                  value={previousSponsorship}
                  onChange={(e) => setPreviousSponsorship(e.target.value)}
                  className={selectClassName}
                  required
                >
                  <option value="">{txt("Seçin", "Select", "请选择")}</option>
                  <option value="no">{txt("Hayır (Hiç kimseye sponsor olmadı)", "No (Never sponsored anyone)", "否（从未担保过任何人）")}</option>
                  <option value="yes_within_5_years">{txt("Evet (Son 5 yıl içinde)", "Yes (Within last 5 years)", "是（近 5 年内）")}</option>
                  <option value="yes_longer">{txt("Evet (5 yıldan uzun süre önce)", "Yes (More than 5 years ago)", "是（5 年前）")}</option>
                </select>
              </div>
            </div>

            {selectedCountry === "CA" && (
              <div className="space-y-2">
                <Label htmlFor="waitlist-application-location-preference">
                  {txt("Başvuru Konum Tercihi", "Application Location Preference", "申请递交地点偏好")}
                  <RequiredMark />
                </Label>
                <select
                  id="waitlist-application-location-preference"
                  name="applicationLocationPreference"
                  value={applicationLocationPreference}
                  onChange={(e) => setApplicationLocationPreference(e.target.value)}
                  className={selectClassName}
                  required
                >
                  <option value="">{txt("Seçin", "Select", "请选择")}</option>
                  <option value="inland">{txt("Inland (Kanada içinden başvuru)", "Inland (Applying from within Canada)", "境内递交 (Inland)")}</option>
                  <option value="outland">{txt("Outland (Kanada dışından başvuru)", "Outland (Applying from outside Canada)", "境外递交 (Outland)")}</option>
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label>{txt("Mevcut İlişki Kanıtları (Birden fazla seçebilirsiniz)", "Available Relationship Evidence (Select all that apply)", "现有关系证明（可多选）")}</Label>
              <div className="grid gap-2 sm:grid-cols-2 text-sm">
                {[
                  { value: "marriage_cert", en: "Marriage Certificate / Registry", tr: "Evlilik Cüzdanı / Kaydı", zh: "结婚证书/官方登记" },
                  { value: "joint_bank", en: "Joint bank account / Shared finances", tr: "Ortak banka hesabı / Ortak finansal kanıtlar", zh: "联名银行账户/共享财务" },
                  { value: "joint_lease", en: "Joint lease / Utility bills together", tr: "Ortak kira sözleşmesi / Faturalar", zh: "联名租约/共同账单" },
                  { value: "photos_social", en: "Photos & Social evidence", tr: "Fotoğraflar ve Sosyal kanıtlar", zh: "照片与社交关系证明" },
                  { value: "joint_children", en: "Joint children", tr: "Ortak çocuk(lar)", zh: "共同子女" },
                ].map((item) => (
                  <label key={item.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="relationshipEvidence"
                      value={item.value}
                      checked={relationshipEvidence.includes(item.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setRelationshipEvidence([...relationshipEvidence, item.value]);
                        } else {
                          setRelationshipEvidence(relationshipEvidence.filter((v) => v !== item.value));
                        }
                      }}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <span>{txt(item.tr, item.en, item.zh)}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {!isPartner && (
          <>
            <div className="space-y-2">
              <Label htmlFor="waitlist-english">
                {txt("İngilizce seviyesi", "English level", "英语水平")}
                <RequiredMark />
              </Label>
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
                <RequiredMark />
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
                {selectedCountry === "CA"
                  ? txt(
                      "Bu diploma için ECA (örn. WES) eğitim denkliği aldınız mı?",
                      "Did you obtain an ECA (e.g. WES) credential assessment for this qualification?",
                      "你是否为该学历获得了 ECA（例如 WES）证书评估？"
                    )
                  : txt(
                      "Bu yeterliliği bir Avustralya kurumunda tamamladınız mı?",
                      "Did you complete this qualification at an Australian institution?",
                      "你是否在澳大利亚教育机构完成了这一学历？"
                    )}
                <RequiredMark />
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
                <option value="yes">{txt("Evet", "Yes", "是")}</option>
                <option value="no">{txt("Hayır", "No", "否")}</option>
              </select>
              <p className="text-xs text-muted-foreground">
                {selectedCountry === "CA"
                  ? txt(
                      "Kanada dışındaki eğitimler için ECA denkliği (ECA assessed) +puan getirir.",
                      "Education completed outside Canada requires an ECA credential assessment to claim points.",
                      "在加拿大境外完成的学历需要进行 ECA 证书评估才能计分。"
                    )
                  : txt(
                      "Bu yanıt, Australian study requirement (+5) ve varsa regional study (+5) puanlarını belirler. Yabancı diplomalar için skills assessment zorunludur.",
                      "This answer drives the Australian study requirement (+5) and, if relevant, regional study (+5) points. Overseas qualifications require a skills assessment to claim points.",
                      "此答案将决定 Australian study requirement（+5）以及如适用的 regional study（+5）积分。海外学历需要技能评估才能计分。"
                    )}
              </p>
              <ErrorText message={state.errors?.qualificationAwardedInAustralia} />
            </div>

            {selectedCountry === "AU" && qualificationAwardedInAustralia === "yes" && (
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

            {selectedCountry === "AU" && qualificationAwardedInAustralia === "no" && (
              <div className="space-y-2">
                <Label htmlFor="waitlist-qualification-recognized">
                  {txt(
                    "Yabancı diplomanız Avustralya'daki ilgili değerlendirme kurumu tarafından tanındı mı?",
                    "Has your overseas qualification been recognized by the relevant Australian assessing authority?",
                    "您的海外学历是否已获得澳大利亚相关评估机构的认可？"
                  )}
                  <RequiredMark />
                </Label>
                <select
                  id="waitlist-qualification-recognized"
                  name="isQualificationRecognized"
                  value={isQualificationRecognized}
                  onChange={(e) => setIsQualificationRecognized(e.target.value)}
                  className={selectClassName}
                >
                  <option value="yes">{txt("Evet", "Yes", "是")}</option>
                  <option value="no">{txt("Hayır", "No", "否")}</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  {txt(
                    "Tanınma olmadan yabancı diplomanız için eğitim puanı talep edilemez. Değerlendirme kurumu yetkinliklerinizi doğrulamalıdır.",
                    "Without recognition, you cannot claim educational points for an overseas qualification. The assessing authority must verify your credentials.",
                    "未获认可的海外学历无法主张教育积分。评估机构必须核实您的资历。"
                  )}
                </p>
                <ErrorText message={state.errors?.isQualificationRecognized} />
              </div>
            )}

            {selectedCountry === "AU" && qualificationAwardedInAustralia === "yes" && isResearchOrDoctorateQualification && (
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

            {selectedCountry === "AU" && (
              <div className="space-y-2">
                <Label htmlFor="waitlist-salary-aud">
                  {txt("Yıllık Maaş (AUD)", "Annual Salary (AUD)", "年薪（AUD）")}
                  <RequiredMark />
                </Label>
                <Input
                  id="waitlist-salary-aud"
                  name="annualSalaryAud"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={annualSalaryAud}
                  onChange={(e) => setAnnualSalaryAud(e.target.value)}
                  {...noAutofill("annualSalaryAud")}
                  className={fieldClassName}
                  placeholder={txt("Örn: 85000", "E.g., 85000", "例如：85000")}
                />
                <ErrorText message={state.errors?.annualSalaryAud} />
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="waitlist-offshore-experience-years">
                  {selectedCountry === "CA"
                    ? txt(
                        "Kanada dışındaki nitelikli iş deneyimi (yıl)",
                        "Years of skilled employment outside Canada",
                        "加拿大境外技术工作年限"
                      )
                    : txt(
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
                  {...noAutofill("offshoreExperienceYears")}
                  className={fieldClassName}
                  placeholder={txt("Örn: 5", "E.g., 5", "例如：5")}
                />
                <p className="text-xs text-muted-foreground">{experienceHelpText}</p>
                <ErrorText message={state.errors?.offshoreExperienceYears} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="waitlist-onshore-experience-years">
                  {selectedCountry === "CA"
                    ? txt(
                        "Kanada içindeki nitelikli iş deneyimi (yıl)",
                        "Years of skilled employment in Canada",
                        "加拿大境内技术工作年限"
                      )
                    : txt(
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
                  {...noAutofill("onshoreExperienceYears")}
                  className={fieldClassName}
                  placeholder={txt("Örn: 2", "E.g., 2", "例如：2")}
                />
                <p className="text-xs text-muted-foreground">{experienceHelpText}</p>
                <ErrorText message={state.errors?.onshoreExperienceYears} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="waitlist-sponsor">
                {selectedCountry === "CA"
                  ? txt("Medeni durum ve eş faktörü", "Marital status and spouse factors", "婚姻状况与配偶情况")
                  : txt("Sponsor veya aile durumu", "Sponsor or family status", "担保或家庭情况")}
                <RequiredMark />
              </Label>
              <Select value={sponsorFamilyStatus} onValueChange={setSponsorFamilyStatus}>
                <SelectTrigger id="waitlist-sponsor" className={fieldClassName}>
                  <SelectValue
                    placeholder={
                      selectedCountry === "CA"
                        ? txt("Medeni/eş durumunu seçin", "Select marital/spouse status", "请选择婚姻/配偶状态")
                        : txt("Sponsor/aile durumunu seçin", "Select sponsor/family status", "请选择担保/家庭状态")
                    }
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
          </>
        )}

        <div className="space-y-2">
          <Label htmlFor="waitlist-concern">{txt("En büyük endişe", "Biggest concern", "最大担忧")}</Label>
          <Input
            id="waitlist-concern"
            name="biggestConcern"
            {...noAutofill("biggestConcern")}
            className={fieldClassName}
            placeholder={txt("Örn: Belgeler, Puan, Dil testi", "E.g., Documents, Points, English test", "例如：材料、分数、英语考试")}
          />
        </div>

        {!isPartner && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="waitlist-english-test-taken">
                  {selectedCountry === "CA"
                    ? txt("Dil testi alındı mı? (IELTS/CELPIP/TEF vb. - opsiyonel)", "Language test taken? (IELTS/CELPIP/TEF etc. - optional)", "语言考试成绩（IELTS/CELPIP/TEF 等 - 可选）")
                    : txt("İngilizce testi alındı mı? (IELTS/PTE vb. - opsiyonel)", "English test taken? (IELTS/PTE etc. - optional)", "英语考试成绩（IELTS/PTE 等 - 可选）")}
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
                {selectedCountry === "CA"
                  ? txt(
                      "Şu anda Kanada'da uluslararası öğrenci misiniz veya PGWP (Post-Graduation Work Permit) başvurmayı planlıyor musunuz? (opsiyonel)",
                      "Are you currently an international student in Canada or planning to apply for a Post-Graduation Work Permit (PGWP)? (optional)",
                      "您目前是否是在加拿大的国际学生，或计划申请毕业后工作许可（PGWP）？（可选）"
                    )
                  : txt(
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
          </>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="waitlist-budget-range">
              {txt("Tahmini bütçe aralığı (opsiyonel)", "Estimated budget range (optional)", "预算范围（可选）")}
            </Label>
            <Input
              id="waitlist-budget-range"
              name="estimatedBudgetRange"
              {...noAutofill("estimatedBudgetRange")}
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

        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {t("mandatory_fields_warning")}
        </p>

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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {rpt("可下载 PDF", "İndirilebilir PDF", "Downloadable PDF")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {rpt(
                  "您的完整报告已生成为 PDF（多模块深度分析）。请下载查看全部内容。",
                  "Tam raporunuz PDF olarak hazırlandı (çok bölümlü derin analiz). Tüm içeriği görmek için indirin.",
                  "Your full report is ready as a PDF (comprehensive multi-section analysis). Download it to view all sections."
                )}
              </p>

              <Button onClick={handleDownloadPDF} variant="default" size="lg" className="flex w-full gap-2 sm:w-auto">
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

      {/* Occupation list modal — AU only, triggered by helper link next to occupation field */}
      {selectedCountry === "AU" && (
        <Dialog open={occupationModalOpen} onOpenChange={(v) => !v && setOccupationModalOpen(false)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                📋 2026 Official Occupation List
              </DialogTitle>
              <DialogDescription className="text-slate-600 dark:text-slate-400">
                Enter your details and we&apos;ll send the full PDF straight to your inbox — then come back and continue your assessment.
              </DialogDescription>
            </DialogHeader>
            <LeadMagnetForm
              locale={locale}
              documentId="csol-2026"
              documentName="2026 Official Occupation List"
              onSuccess={() => setOccupationModalOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
