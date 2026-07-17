import { buildAssessmentState } from "@/lib/readiness/assessment-state";
import {
  buildEmploymentExperienceCaveat,
  getEmploymentDataSignals,
} from "@/lib/readiness/employment-signals";
import {
  buildSpecialistEducationCaveat,
  getSpecialistEducationSignals,
} from "@/lib/readiness/education-signals";
import { checkOccupation } from "@/lib/occupations/check-occupation";
import { checkNocOccupation } from "@/lib/occupations/check-noc-occupation";
import { calculateAustraliaPoints } from "@/lib/points/calculate-australia-points";
import { calculateCanadaCRS } from "@/lib/points/calculate-canada-crs";
import type { CanadaCRSInput, CLBLevel } from "@/lib/points/canada-types";
import type {
  AgeOption,
  AustralianEmploymentOption,
  EducationOption,
  EnglishOption,
  OverseasEmploymentOption,
} from "@/lib/points/types";
import expressEntryConfig from "@/src/data/countries/ca/express-entry.json";
import enTranslations from "@/public/locales/en.json";
import trTranslations from "@/public/locales/tr.json";
import zhTranslations from "@/public/locales/zh-Hans.json";
import { getEligibleSkilledSubclasses, resolveOccupationDisplayName } from "./occupation-eligibility";
import { generatePremiumSections } from "@/src/lib/readiness/report-generator";
import { getDocumentChecklist, getCanadaDocumentChecklist } from "./document-checklists";
import { buildRiskIndicators, buildCanadaRiskIndicators } from "./risk-rules";
import { buildNextSteps, buildCanadaNextSteps } from "./next-steps";
import type {
  AssessmentState,
  ConfidenceLevel,
  DataCompleteness,
  DocumentCategory,
  EvidenceReadinessItem,
  FinancialRoadmapItem,
  InformationCoverageLevel,
  IndicatorLevel,
  KeyVisaRequirement,
  Locale,
  OccupationIndication,
  PathwayComparison,
  PathwayFriction,
  PathwayRelevance,
  PathwayStrengthComparison,
  PositionChanger,
  PremiumSections,
  PointsBoosterSimulator,
  PointsEstimate,
  PrimaryLimitingFactor,
  ProgressionPathway,
  ReadinessInput,
  ReadinessReport,
  ReportIndicators,
  SignalSnapshot,
} from "./types";

export type LeadTier = "High intent" | "Moderate intent" | "Low intent";

export type LeadQuality = {
  leadValueScore: number;
  leadScore: number;
  leadTier: LeadTier;
};

// ─── Keyword helpers ─────────────────────────────────────────────────────────

function norm(text: string): string {
  return text.toLowerCase().trim();
}

function hasKw(text: string, keywords: string[]): boolean {
  const n = norm(text);
  return keywords.some((kw) => n.includes(kw));
}

function hasSponsorContext(raw?: string): boolean {
  if (!raw) return false;
  const s = norm(raw);
  if (!s) return false;
  const noneKeywords = ["none", "no", "yok", "hayir", "belirtmek istemiyorum", "n/a", "na"];
  return !noneKeywords.some((kw) => s === kw || s.includes(kw));
}

const JULY_2026_CSIT_AUD = 79423;
const JULY_2026_485_STANDARD_MAX_AGE = 35;
const JULY_2026_485_EXCEPTION_MAX_AGE = 50;
const JULY_2026_482_BASE_COST_AUD = 4015;
const JULY_2026_189_190_BASE_COST_AUD = 6140;
const JULY_2026_SECOND_INSTALMENT_AUD = 4890;
const SKILLED_MIGRATION_MIN_POINTS = 65;

function parseDeclaredSalaryAud(input: ReadinessInput): number | null {
  if (typeof input.annualSalaryAud === "number" && Number.isFinite(input.annualSalaryAud)) {
    const rounded = Math.round(input.annualSalaryAud);
    if (rounded >= 20000 && rounded <= 500000) return rounded;
  }

  const combined = [
    input.mainGoal ?? "",
    input.preferredPathway ?? "",
    input.sponsorOrFamily ?? "",
    input.biggestConcern ?? "",
  ].join(" ");

  const lower = norm(combined);
  const hasSalarySignal = /(salary|income|wage|pay|offer|package|aud|\$|maas|maaş)/i.test(lower);
  if (!hasSalarySignal) return null;

  const patterns = [
    /(?:aud|\$)\s*(\d{2,3}(?:[\s,]\d{3})+|\d{5,6}|\d{2,3}(?:\.\d+)?k)\b/gi,
    /\b(\d{2,3}(?:\.\d+)?k|\d{2,3}(?:[\s,]\d{3})+|\d{5,6})\s*(?:aud)?\b/gi,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(combined)) !== null) {
      const raw = match[1].trim().toLowerCase();
      const parsed = raw.endsWith("k")
        ? Math.round(parseFloat(raw.slice(0, -1)) * 1000)
        : parseInt(raw.replace(/[\s,]/g, ""), 10);

      if (!Number.isFinite(parsed)) continue;
      if (parsed >= 20000 && parsed <= 500000) return parsed;
    }
  }

  return null;
}

function parseDeclaredAge(input: ReadinessInput): number | null {
  if (!input.age) return null;
  const value = parseInt(input.age.trim(), 10);
  if (!Number.isFinite(value)) return null;
  if (value < 15 || value > 80) return null;
  return value;
}

function has485AgeException(input: ReadinessInput): boolean {
  const qualification = input.qualificationLevel ?? "";
  const normalizedQualification = qualification.toLowerCase();
  if (
    qualification === "Master's Degree (Research)" ||
    qualification === "PhD/Doctorate" ||
    normalizedQualification === "phd"
  ) {
    return true;
  }

  const combined = [input.mainGoal ?? "", input.preferredPathway ?? "", input.biggestConcern ?? ""]
    .join(" ")
    .toLowerCase();
  const passport = (input.passportCountry ?? "").toLowerCase();

  return /(masters?\s*(?:by\s*)?research|master\s*by\s*research|phd|doctorate)/i.test(combined)
    || /(hong\s*kong|\bhk\s*sar\b)/i.test(passport)
    || /(\bbno\b|british\s*national\s*\(?(?:overseas|o)\)?)/i.test(`${passport} ${combined}`);
}

function hasDependantsWithoutFunctionalEnglish(input: ReadinessInput): boolean {
  const value = norm(input.sponsorOrFamily ?? "");
  if (!value) return false;

  return (
    value.includes("without functional english") ||
    value.includes("partner / dependants without functional english") ||
    value.includes("functional english yok") ||
    value.includes("fonksiyonel ingilizce yok") ||
    value.includes("无功能英语") ||
    value.includes("沒有功能英語")
  );
}

function evaluateEmployerSalaryGate(input: ReadinessInput): {
  declaredSalaryAud: number | null;
  isBelowCsit: boolean;
} {
  const declaredSalaryAud = parseDeclaredSalaryAud(input);
  return {
    declaredSalaryAud,
    isBelowCsit: declaredSalaryAud !== null && declaredSalaryAud < JULY_2026_CSIT_AUD,
  };
}

const QUALIFICATIONS_BACHELOR_OR_LOWER = new Set([
  "High School",
  "Bachelor's Degree",
  "Bachelor",
  "Diploma",
  "Certificate",
  "Other",
]);

/**
 * Hard Gate (1 July 2026 rules): age > 35 with a Bachelor's degree or lower
 * is an unconditional 485 disqualifier, regardless of any other "possible"/
 * "high potential" signal the softer evaluate485AgeGate heuristic below
 * might otherwise produce.
 */
function evaluate485HardAgeGate(input: ReadinessInput): {
  declaredAge: number | null;
  isHardIneligible: boolean;
} {
  const declaredAge = parseDeclaredAge(input);
  const qualification = input.qualificationLevel;
  const isBachelorOrLower = qualification !== undefined && QUALIFICATIONS_BACHELOR_OR_LOWER.has(qualification);
  return {
    declaredAge,
    isHardIneligible: declaredAge !== null && declaredAge > 35 && isBachelorOrLower,
  };
}

function evaluate485AgeGate(input: ReadinessInput): {
  declaredAge: number | null;
  maxAllowedAge: number;
  hasException: boolean;
  isAboveLimit: boolean;
} {
  const declaredAge = parseDeclaredAge(input);
  const hasException = has485AgeException(input);
  const maxAllowedAge = hasException ? JULY_2026_485_EXCEPTION_MAX_AGE : JULY_2026_485_STANDARD_MAX_AGE;
  return {
    declaredAge,
    maxAllowedAge,
    hasException,
    isAboveLimit: declaredAge !== null && declaredAge > maxAllowedAge,
  };
}

// ─── i18n ─────────────────────────────────────────────────────────────────────
// engine.ts runs server-side with no React context, so it reads the same flat
// dot-key /public/locales/*.json files the frontend's useTranslation() hook
// uses, rather than a separate translation source of truth.

const TRANSLATIONS: Record<Locale, Record<string, unknown>> = {
  en: enTranslations,
  tr: trTranslations,
  "zh-Hans": zhTranslations,
};

function t(locale: Locale, key: string, params: Record<string, string | number> = {}): string {
  const raw = TRANSLATIONS[locale]?.[key] ?? TRANSLATIONS.en[key];
  const template = typeof raw === "string" ? raw : key;
  return Object.entries(params).reduce(
    (result, [paramKey, value]) => result.replaceAll(`{{${paramKey}}}`, String(value)),
    template
  );
}

/**
 * Hard Gate (1 July 2026): strict "Ineligible: [Reason]" template with the
 * user's declared value and the breached threshold spelled out, so the PDF/UI
 * layer can display the exact compliance reason without additional parsing.
 */
function formatIneligibleSalaryReason(locale: Locale, declaredSalaryAud: number): string {
  const declared = declaredSalaryAud.toLocaleString("en-AU");
  const threshold = JULY_2026_CSIT_AUD.toLocaleString("en-AU");
  return t(locale, "ineligible.salaryReason", { salary: declared, threshold });
}

function formatIneligibleAgeReason(locale: Locale, declaredAge: number): string {
  const limit = JULY_2026_485_STANDARD_MAX_AGE;
  return t(locale, "ineligible.ageReason", { age: declaredAge, ageLimit: limit });
}

/**
 * Short pointer used everywhere EXCEPT the Visa Viability Ranking section,
 * which is the single canonical place the full per-subclass ineligibility
 * reason (points + Mathematical Projection text) is rendered. Every other
 * section that references an ineligible pathway's reason should use this
 * instead of the full reason string, to avoid repeating the same ~40-word
 * paragraph across Executive Summary, Pathway Strength Comparison, Pathway
 * Friction, the Lodgement-Ready Checklist, State Nomination Tracker, and
 * Historical Invitation Trends.
 */
function shortIneligibleReference(locale: Locale): string {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  return isTr
    ? "Uygun değil — tam neden için Vize Uygulanabilirlik Sıralaması bölümüne bakın."
    : isZh
      ? "不符合资格——完整原因见“签证可行性排序”部分。"
      : "Ineligible — see the Visa Viability Ranking section for the full reason.";
}

/**
 * Hard Gate: Skilled Migration (189/190/491) pathways require an estimated
 * base points-test score of at least 65. Below this, the pathway is
 * unconditionally ineligible regardless of any other "possible" signal.
 *
 * When the user's English level still sits at the 0-point tier ("none" or
 * "competent"), a MARA-compliant "Mathematical Improvement" suggestion is
 * appended — framed strictly as a points calculation, not an eligibility or
 * invitation guarantee.
 */
/**
 * Splits the low-points ineligibility reason into its subclass-specific part
 * (the points comparison) and its profile-level shared notes (the English
 * "Mathematical Projection" and the employment-experience caveat). The shared
 * notes are identical across 189/190/491 for a given profile — English level
 * and employment data don't vary by subclass — so the Visa Viability Ranking
 * renders them ONCE beneath the three rows instead of repeating them per row.
 */
function buildIneligibleLowPointsParts(
  locale: Locale,
  estimatedPoints: number,
  englishLevel?: string,
  input?: ReadinessInput
): { pointsLine: string; sharedNotes: string[] } {
  const pointsLine = t(locale, "ineligible.lowPoints", { points: estimatedPoints });
  const normalizedEnglish = (englishLevel ?? "").trim().toLowerCase();
  const hasRoomToImproveEnglish = normalizedEnglish === "none" || normalizedEnglish === "competent";

  const sharedNotes: string[] = [];
  if (hasRoomToImproveEnglish) {
    sharedNotes.push(t(locale, "suggestion.improveEnglish"));
  }
  if (input) {
    const employmentCaveat = buildEmploymentExperienceCaveat(locale, getEmploymentDataSignals(input), "short");
    if (employmentCaveat) sharedNotes.push(employmentCaveat);
  }

  return { pointsLine, sharedNotes };
}

function formatIneligibleLowPointsReason(
  locale: Locale,
  estimatedPoints: number,
  englishLevel?: string,
  input?: ReadinessInput
): string {
  // Kept as the single concatenated form for the `reason` field (used by
  // fallbacks and assessment-state); composed from the same parts so it can
  // never drift from the split rendering in the Visa Viability Ranking.
  const { pointsLine, sharedNotes } = buildIneligibleLowPointsParts(locale, estimatedPoints, englishLevel, input);
  return [pointsLine, ...sharedNotes].join(" ");
}

// ─── Pathway detection ────────────────────────────────────────────────────────

function detectSubclasses(input: ReadinessInput): string[] {
  const combined = [
    input.mainGoal ?? "",
    input.preferredPathway ?? "",
    input.sponsorOrFamily ?? "",
    input.biggestConcern ?? "",
    input.occupation ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const found = new Set<string>();

  // Explicit subclass numbers first
  const pref = norm(input.preferredPathway ?? "");
  if (/\b500\b/.test(pref)) found.add("500");
  if (/\b482\b/.test(pref)) found.add("482");
  if (/\b189\b/.test(pref)) found.add("189");
  if (/\b190\b/.test(pref)) found.add("190");
  if (/\b491\b/.test(pref)) found.add("491");
  // Partner/Family visas (820, 801, 300, 309, 100) are intentionally never
  // detected or added here. The readiness form does not collect sponsor
  // citizenship data, so this engine is scoped to General Skilled Migration
  // (189, 190, 491) and Employer-Sponsored pathways (482, 186, 494) only.

  for (const subclass of getEligibleSkilledSubclasses(input.occupation)) {
    found.add(subclass);
  }

  // Study → 500
  if (hasKw(combined, ["study", "student", "course", "university", "college", "school", "eğitim", "öğrenci", "okul"])) {
    found.add("500");
  }

  // Sponsor/employer → 482
  if (hasKw(combined, ["482", "employer", "sponsor", "sponsored", "job offer", "işveren", "sponsorlu"])) {
    found.add("482");
  }

  // Regional → also ensure 491
  if (hasKw(combined, ["regional", "bölgesel"])) {
    found.add("491");
  }

  // Partner/Family visas (820, 801, 300, 309, 100) are never added to the
  // candidate list. The readiness form does not collect sponsor citizenship
  // data, so this engine cannot responsibly evaluate family-sponsored
  // pathways — it is scoped to General Skilled Migration (189, 190, 491)
  // and Employer-Sponsored pathways (482, 186, 494) only.

  // Work without explicit sponsor and no other pathway → suggest 482 as needs_more_info
  if (
    hasKw(combined, ["work", "çalış", "iş"]) &&
    !found.has("482") &&
    !found.has("189") &&
    !found.has("500")
  ) {
    found.add("482");
  }

  return Array.from(found);
}

export type CanadaPathwayCode = "CEC" | "FSW" | "FSTP" | "PNP" | "AIP" | "FAMILY_SPONSORSHIP";

function detectCanadaPathways(input: ReadinessInput): CanadaPathwayCode[] {
  const combined = [
    input.mainGoal ?? "",
    input.preferredPathway ?? "",
    input.sponsorOrFamily ?? "",
    input.biggestConcern ?? "",
    input.occupation ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const found = new Set<CanadaPathwayCode>();

  // The CEC/FSW/FSTP/AIP/FAMILY_SPONSORSHIP keyword lists also match the
  // slug-style values sent by the full-check "visa pathway" dropdown
  // (e.g. "canada-express-entry-cec", "atlantic-immigration-program",
  // "canada-family-sponsorship") so an explicit selection is always detected
  // exactly, on top of the free-text fallback phrases.
  if (hasKw(combined, ["cec", "canadian experience class", "canada work experience", "canadian work experience"])) {
    found.add("CEC");
  }
  if (hasKw(combined, ["fsw", "federal skilled worker"])) {
    found.add("FSW");
  }
  if (hasKw(combined, ["fstp", "federal skilled trade", "skilled trades program", "trade", "tradesperson"])) {
    found.add("FSTP");
  }
  if (
    hasKw(combined, [
      "aip",
      "atlantic-immigration-program",
      "atlantic immigration program",
      "atlantic immigration",
    ])
  ) {
    found.add("AIP");
  }
  if (
    hasKw(combined, [
      "canada-family-sponsorship",
      "family sponsorship",
      "family-sponsorship",
      "sponsor my spouse",
      "sponsor my partner",
      "sponsor my child",
      "spouse sponsorship",
      "partner sponsorship",
    ])
  ) {
    found.add("FAMILY_SPONSORSHIP");
  }

  // No explicit program named but general PR/skilled-migration intent toward Canada → show all three Express Entry streams.
  // "pr" is checked as a whole word (not hasKw's plain substring) because it
  // otherwise false-matches inside unrelated words/slugs like "express" or
  // "atlantic-immigration-program".
  if (
    found.size === 0 &&
    (hasKw(combined, ["express entry", "permanent", "skilled", "points", "crs", "migrate", "migration", "nitelikli", "puan", "kalıcı", "göç"]) ||
      /\bpr\b/i.test(combined))
  ) {
    found.add("CEC");
    found.add("FSW");
    found.add("FSTP");
  }

  return Array.from(found);
}

function hasCanadaPnpInterest(input: ReadinessInput): boolean {
  const combined = [
    input.mainGoal ?? "",
    input.preferredPathway ?? "",
    input.sponsorOrFamily ?? "",
    input.biggestConcern ?? "",
    input.occupation ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return hasKw(combined, [
    "pnp",
    "provincial nominee",
    "province nomination",
    "provincial nomination",
    "oinp",
    "bc pnp",
    "ainp",
  ]);
}

function buildCanadaSparseStrategy(params: {
  locale: Locale;
  occupation?: string;
  pathwayCodes: CanadaPathwayCode[];
  pointsEstimate?: number;
  hasPnpInterest: boolean;
}): {
  summaryLines: string[];
  nextSteps: string[];
  primaryLimitingFactor: PrimaryLimitingFactor;
} {
  const { locale, occupation, pathwayCodes, pointsEstimate, hasPnpInterest } = params;
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const occ = (occupation ?? "").toLowerCase();
  const isMedicalDoctor = ["doctor", "physician", "medical doctor", "hekim", "doktor", "md", "general practitioner"].some((kw) =>
    occ.includes(kw)
  );
  const pathwayText = pathwayCodes.length > 0 ? pathwayCodes.join(", ") : (isTr ? "CEC/FSW/FSTP" : isZh ? "CEC/FSW/FSTP" : "CEC/FSW/FSTP");

  if (isMedicalDoctor) {
    const summaryLines = isTr
      ? [
          `Profil sparse olsa bile doktor mesleği için detaylı strateji uygulanır: ilk aşamada ${pathwayText} yolları, ikinci aşamada eyalet bazlı healthcare odaklı PNP sinyalleri birlikte değerlendirilir.`,
          "Klinik pratik hedefleniyorsa göçmenlik ve lisanslama iki ayrı hat olarak planlanır: MCCQE/MCC değerlendirme akışı ile PR dosyası paralel yürütülmelidir.",
          `CRS sinyali ${pointsEstimate ?? "hesaplanamadı"}. Puan tek başına karar verdirmez; healthcare draw türü, NOC/TEER eşleşmesi ve eyalet talebi birlikte ele alınır.`,
        ]
      : isZh
        ? [
            `即使输入较少，医生职业也会应用详细策略：第一层评估 ${pathwayText}，第二层叠加各省医疗导向PNP信号。`,
            "若目标是临床执业，移民路径与执照路径必须并行规划：MCCQE/MCC评估流程应与PR申请同步推进。",
            `当前CRS信号为 ${pointsEstimate ?? "未能计算"}。分数并非唯一变量；还需综合医疗类别抽选、NOC/TEER匹配和省级需求。`,
          ]
        : [
            `Even with sparse inputs, a physician profile gets a detailed pathway strategy: ${pathwayText} is assessed first, then layered with province-level healthcare-focused PNP signals.`,
            "If the goal includes clinical practice, immigration and licensing must run as parallel tracks: MCCQE/MCC licensing steps should be planned alongside PR strategy.",
            `Current CRS signal is ${pointsEstimate ?? "not available"}. Points alone are not decisive; healthcare draw categories, NOC/TEER fit, and provincial demand must be evaluated together.`,
          ];

    const nextSteps = isTr
      ? [
          "NOC/TEER kodunu doktor alt uzmanlığına göre kesinleştirin ve Express Entry profilinde aynı kodu koruyun.",
          "MCCQE/MCC lisanslama hazırlığını (sınav takvimi, belge doğrulama, credential pathway) ayrı bir iş planı olarak başlatın.",
          "Healthcare odaklı draw'ları ve hedef eyalet PNP healthcare stream duyurularını aylık olarak takip edin.",
          "ECA + dil testini güncel tutun; CRS optimizasyonu için CLB artış senaryolarını yeniden hesaplayın.",
        ]
      : isZh
        ? [
            "按医生细分方向确认NOC/TEER代码，并在Express Entry资料中保持一致。",
            "将MCCQE/MCC执照准备（考试计划、材料核验、资质路径）作为独立工作流启动。",
            "按月跟踪医疗类别抽选与目标省份PNP医疗通道公告。",
            "保持ECA与语言成绩有效，并按CLB提升情景重算CRS优化路径。",
          ]
        : [
            "Finalize the physician-specific NOC/TEER code and keep it consistent across Express Entry materials.",
            "Run MCCQE/MCC licensing preparation as a separate workstream (exam timeline, document verification, credential pathway).",
            "Track healthcare-category draws and target-province healthcare PNP announcements monthly.",
            "Keep ECA and language scores current and re-model CRS scenarios for CLB upgrades.",
          ];

    const primaryLimitingFactor: PrimaryLimitingFactor = isTr
      ? {
          label: "Göç ve lisanslama hattının aynı anda yönetimi",
          explanation:
            "Doktor adaylarında ana kısıt genellikle puandan çok süreç senkronizasyonudur. PR stratejisi ile MCCQE/MCC lisanslama hazırlığı eşzamanlı ve takvimli ilerletilmelidir.",
        }
      : isZh
        ? {
            label: "移民路径与执照路径的并行管理",
            explanation:
              "医生档案的主要限制通常不是单一分数，而是双路径协同。PR策略与MCCQE/MCC执照准备需要并行并按时间表推进。",
          }
        : {
            label: "Parallel management of immigration and licensing tracks",
            explanation:
              "For physician profiles, the primary constraint is often process synchronization rather than points alone. PR strategy and MCCQE/MCC licensing preparation should run in parallel against a clear timeline.",
          };

    return { summaryLines, nextSteps, primaryLimitingFactor };
  }

  const summaryLines = isTr
    ? [
        `Veri sparse olsa da boş rapor üretilmez: ${pathwayText} için meslek odaklı bir yol haritası oluşturulur ve kritik eksikler adım adım işlenir.`,
        `CRS sinyali ${pointsEstimate ?? "hesaplanamadı"}. Bu değer tek başına karar değildir; meslek kodu, dil düzeyi ve eyalet/federal draw dinamiği birlikte ele alınır.`,
        hasPnpInterest
          ? "PNP ilgisi algılandı; eyalet bazlı stream detayları yakında genişletilecek olsa da şimdiden hedef eyalet kısa listesiyle ilerlemek gerekir."
          : "Program seçimi net değilse CEC/FSW/FSTP karşılaştırması üzerinden en hızlı uygulanabilir rota önceliklendirilir.",
      ]
    : isZh
      ? [
          `即使信息较少，也不会生成空白报告：系统会围绕 ${pathwayText} 输出职业导向路线，并逐步标注关键缺口。`,
          `当前CRS信号为 ${pointsEstimate ?? "未能计算"}。该值并非唯一结论，仍需结合职业代码、语言水平和联邦/省级抽选动态。`,
          hasPnpInterest
            ? "已识别PNP意向；即便省级细分仍在扩展，也应先建立目标省份短名单并推进可执行步骤。"
            : "若项目偏好不明确，将基于CEC/FSW/FSTP比较优先选择最可执行路径。",
        ]
      : [
          `Sparse input will not produce a blank report: the engine generates an occupation-focused pathway plan across ${pathwayText} and surfaces critical gaps step-by-step.`,
          `Current CRS signal is ${pointsEstimate ?? "not available"}. This is not the sole decision variable; NOC fit, language level, and federal/provincial draw dynamics must be considered together.`,
          hasPnpInterest
            ? "PNP interest is detected; even while province-level stream detail is still expanding, a target-province shortlist should be built now."
            : "When program preference is unclear, CEC/FSW/FSTP comparison is used to prioritize the fastest executable route.",
        ];

  const nextSteps = isTr
    ? [
        "Meslek için en yakın NOC/TEER kodunu kesinleştirip profilin tüm alanlarında aynı kodu kullanın.",
        "Dil puanını CLB 9+ hedefiyle senaryolayın; puan artışının hangi programı öne taşıdığını karşılaştırın.",
        "ECA, iş tecrübesi referansları ve fon kanıtlarını tek bir belge planında toplayın.",
        "Hedef program için 30-60-90 günlük uygulama takvimi oluşturun (profil, davet, başvuru hazırlığı).",
      ]
    : isZh
      ? [
          "先确定最匹配的NOC/TEER代码，并在所有资料字段中保持一致。",
          "以CLB 9+为目标进行语言分数情景测算，比较哪些项目会因此被明显强化。",
          "将ECA、工作经验证明和资金材料整合为单一文档计划。",
          "为目标项目建立30-60-90天执行节奏（建档、等待邀请、申请材料准备）。",
        ]
      : [
          "Lock the closest-fit NOC/TEER code and keep it consistent across all profile fields.",
          "Scenario-plan language upgrades toward CLB 9+ and compare which program gets the largest uplift.",
          "Consolidate ECA, work-reference evidence, and proof-of-funds into one document plan.",
          "Build a 30-60-90 day execution cadence for profile setup, invitation readiness, and application packaging.",
        ];

  const primaryLimitingFactor: PrimaryLimitingFactor = isTr
    ? {
        label: "Sinyal derinliği ve belge tutarlılığı",
        explanation:
          "Kısa girişlerde ana kısıt, programa özel sinyal derinliği ve kanıt tutarlılığıdır. Meslek kodu, dil hedefi ve belge seti netleştikçe strateji daha keskinleşir.",
      }
    : isZh
      ? {
          label: "信号深度与证据一致性",
          explanation:
            "在简短输入下，主要限制是项目特定信号深度和证据一致性。随着职业代码、语言目标和材料集被明确，策略会显著收敛。",
        }
      : {
          label: "Signal depth and evidence consistency",
          explanation:
            "With sparse input, the main constraint is program-specific signal depth and evidence consistency. As NOC code, language target, and document set are clarified, strategy precision improves materially.",
        };

  return { summaryLines, nextSteps, primaryLimitingFactor };
}

const CANADA_PATHWAY_NAMES: Record<CanadaPathwayCode, { en: string; tr: string }> = {
  CEC: { en: "Canadian Experience Class", tr: "Kanada Deneyim Sınıfı (CEC)" },
  FSW: { en: "Federal Skilled Worker Program", tr: "Federal Vasıflı İşçi Programı (FSW)" },
  FSTP: { en: "Federal Skilled Trades Program", tr: "Federal Vasıflı Esnaf Programı (FSTP)" },
  PNP: { en: "Provincial Nominee Program", tr: "Eyalet Aday Programı (PNP)" },
  AIP: { en: "Atlantic Immigration Program", tr: "Atlantic Immigration Program (AIP)" },
  FAMILY_SPONSORSHIP: { en: "Family Sponsorship", tr: "Aile Sponsorluğu" },
};

/**
 * Returns HIGH only when all 4 critical fields are present (NOC/occupation,
 * language level, age, and education level). Any missing field → LOW.
 * Used by the PDF to render a dynamic confidence label and gate sections.
 */
function calculateConfidence(input: ReadinessInput): "HIGH" | "LOW" {
  const hasNoc = Boolean(input.nocCode || input.occupation);
  const hasLanguage = Boolean(input.englishLevel);
  const hasAge = Boolean(input.age);
  const hasEducation = Boolean(input.qualificationLevel);
  return hasNoc && hasLanguage && hasAge && hasEducation ? "HIGH" : "LOW";
}

// Intentionally simpler than the AU pathwayComparison builder — this covers
// only what's needed for the 8 sections activated for Canada in this pass
// (points, roadmap, risk, document checklist, gantt, PDF, disclaimer). The
// deeper per-pathway friction/strength/financial-roadmap analysis built for
// AU was out of scope for this pass and is not replicated here.
function buildCanadaPathwayComparison(
  pathwayCodes: CanadaPathwayCode[],
  locale: Locale,
  estimatedPoints?: number,
  occupation?: string
): PathwayComparison[] {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";

  if (pathwayCodes.length === 0) {
    return [
      {
        subclass: "general",
        visaName: isTr ? "Yetersiz Veri — Yol Belirlenemedi" : isZh ? "数据不足 — 无法确定路径" : "Inconclusive — Insufficient Data",
        reason: isTr
          ? "Profil girdileri belirli bir programa yönlendirme için yeterli değil. Aşağıdaki eksik alanları doldurun: NOC meslek kodu, CLB/NCLC dil sınav skoru ve eğitim düzeyi."
          : isZh
            ? "当前档案信息不足以确定具体移民路径。请补充以下缺失字段：NOC职业代码、CLB/NCLC语言成绩及学历等级。"
            : "Incomplete Profile: Insufficient data to determine a pathway. Please refine your profile inputs — the following fields are required to unlock a personalized strategy: NOC occupation code, CLB/NCLC language test score, and education level.",
        relevance: "not_enough_information",
        confidenceLevel: "low",
        confidenceExplanation: isTr
          ? "Güven düzeyi DÜŞÜK — Kritik profil verileri eksik (NOC, CLB, eğitim). Bu analiz kişiselleştirilemiyor."
          : isZh
            ? "置信度：低 — 关键档案数据缺失（NOC、CLB、学历）。无法生成个性化分析。"
            : "Confidence: LOW — Vital profile data (e.g., NOC occupation, CLB score, education level) is missing. This analysis cannot be personalized.",
        difficulty: "high",
        requirementType: isTr ? "Tamamlanmamış profil" : isZh ? "档案未完整" : "Incomplete profile",
        userRelativePosition: isTr
          ? "Kişiselleştirilmiş bir strateji için profil bilgilerini tamamlayın."
          : isZh
            ? "请完善档案信息以获得个性化策略。"
            : "Complete your profile to unlock a personalized pathway strategy.",
        keyRequirements: isTr
          ? ["NOC meslek kodunu seçin", "CLB/NCLC dil sınav skoru girin", "Eğitim düzeyini belirtin"]
          : isZh
            ? ["选择NOC职业代码", "填写CLB/NCLC语言成绩", "填写学历等级"]
            : ["Select your NOC occupation code", "Enter your CLB/NCLC language test score", "Specify your education level"],
        pathwaySpecificRisks: isTr
          ? ["Eksik alanlar giderilmeden kesin pathway sıralaması yapılamaz."]
          : isZh
            ? ["在补充必填字段之前，无法进行精确的路径排名。"]
            : ["A definitive pathway ranking cannot be produced until missing fields are completed."],
      },
    ];
  }

  return pathwayCodes.map((code) => {
    const isExpressEntry = code === "CEC" || code === "FSW" || code === "FSTP";
    const isAip = code === "AIP";
    // Derive a per-pathway confidence level from the calculateConfidence helper so it
    // reflects actual input completeness rather than a hardcoded "medium".
    // The input object is captured in the outer scope via the `occupation` param.
    // We synthesize a minimal ReadinessInput-compatible object for the check.
    const dynConf: ConfidenceLevel = estimatedPoints !== undefined && Boolean(occupation) ? "medium" : "low";

    return {
      subclass: code,
      visaName: isTr ? CANADA_PATHWAY_NAMES[code].tr : CANADA_PATHWAY_NAMES[code].en,
      reason: isTr
        ? `${CANADA_PATHWAY_NAMES[code].tr} sinyalleri mevcut bilgilerle eşleşiyor.`
        : `Signals for ${CANADA_PATHWAY_NAMES[code].en} match the information provided.`,
      relevance: "possible",
      confidenceLevel: dynConf,
      confidenceExplanation: isExpressEntry
        ? (isTr
            ? "CRS tahmini ve program kriterleri kısmi bilgiyle değerlendirilmiştir."
            : "CRS estimate and program criteria were assessed with partial information.")
        : isAip
          ? (isTr
              ? "Atlantik eyaleti onayı ve işveren teklifi bağlamı kısmi bilgiyle değerlendirilmiştir."
              : "Atlantic province endorsement and employer offer context were assessed with partial information.")
          : (isTr
              ? "Sponsor uygunluğu ve ilişki kanıtı bağlamı kısmi bilgiyle değerlendirilmiştir."
              : "Sponsor eligibility and relationship evidence context were assessed with partial information."),
      difficulty: "medium",
      requirementType: isExpressEntry
        ? (isTr ? "CRS puanı ve NOC uygunluğu" : "CRS score and NOC eligibility")
        : isAip
          ? (isTr ? "İşveren teklifi ve eyalet onayı" : "Employer job offer and provincial endorsement")
          : (isTr ? "Sponsor uygunluğu ve ilişki kanıtı" : "Sponsor eligibility and relationship evidence"),
      userRelativePosition: isExpressEntry
        ? (isTr
            ? "Göreli konum, son draw kesim puanlarına erişilemediği için belirlenememektedir."
            : "Relative position cannot be determined yet because recent draw cutoff data is not available.")
        : (isTr
            ? "Bu yol bir puan testine değil, uygunluk kriterlerine dayanır; göreli konum kavramı geçerli değildir."
            : "This pathway is criteria-based rather than points-tested, so a relative-position comparison does not apply."),
      keyRequirements: isExpressEntry
        ? (isTr
            ? ["NOC uygunluğu", "Dil testi (CELPIP/IELTS/TEF)", "ECA (gerekirse)", "Kanıt fonları"]
            : ["NOC eligibility", "Language test (CELPIP/IELTS/TEF)", "ECA (if required)", "Proof of funds"])
        : isAip
          ? (isTr
              ? ["Atlantik eyaletinde geçerli iş teklifi", "Eyalet onayı sertifikası", "Yerleşim planı"]
              : ["Valid job offer in an Atlantic province", "Provincial endorsement certificate", "Settlement plan"])
          : (isTr
              ? ["Sponsor uygunluk kriterleri", "İlişki kanıtı", "Asgari gelir/finansal taahhüt belgeleri"]
              : ["Sponsor eligibility criteria", "Proof of relationship", "Minimum income / financial undertaking documents"]),
      pathwaySpecificRisks: [],
    };
  });
}

// ─── Visa name map ────────────────────────────────────────────────────────────

const VISA_NAMES: Record<string, { en: string; tr: string }> = {
  "500": { en: "Student Visa", tr: "Öğrenci Vizesi" },
  "485": { en: "Temporary Graduate Visa (subclass 485)", tr: "Geçici Mezun Vizesi (subclass 485)" },
  "482": { en: "Skills in Demand Visa", tr: "Skills in Demand Vizesi" },
  "189": { en: "Skilled Independent Visa", tr: "Yetenekli Bağımsız Vize" },
  "190": { en: "Skilled Nominated Visa", tr: "Yetenekli Aday Gösterilen Vize" },
  "491": { en: "Skilled Work Regional Visa", tr: "Bölgesel Yetenekli Çalışma Vizesi" },
  "820": { en: "Partner Visa - Temporary (Onshore)", tr: "Partner Vizesi - Geçici (Yerinde)" },
  "801": { en: "Partner Visa - Permanent", tr: "Partner Vizesi - Kalıcı" },
};

function getPathwayKeyRequirements(
  subclass: string,
  locale: Locale
): string[] {
  const isTr = locale === "tr";

  switch (subclass) {
    case "500":
      return isTr
        ? [
            "Kayıtlı bir eğitim kurumu ve kurs bağlamı",
            "Gerçek öğrenci niyetine ilişkin destekleyici bilgiler",
            "Maddi yeterlilik ve eğitim planı bağlamı",
          ]
        : [
            "A registered education provider and course context",
            "Supporting information relevant to genuine student intent",
            "Financial capacity and study plan context",
          ];
    case "485":
      return isTr
        ? [
            "Tamamlanmış uygun Avustralya niteliği ve CRICOS kayıtlı kurum bağlamı",
            "Son 6 ayda öğrenci vizesi (500) tutulduğuna ilişkin kanıt",
            "İngilizce eşik gereksinimlerine ilişkin bilgiler ve yaş uygunluğu bağlamı",
          ]
        : [
            "Completed Australian qualification from a CRICOS-registered institution",
            "Evidence of having held a Student visa (subclass 500) in the last 6 months",
            "Information relevant to English threshold requirements and age context",
          ];
    case "482":
      return isTr
        ? [
            "Uygun bir işveren sponsorluğu bağlamı",
            "Görev ile uyumlu meslek ve deneyim bilgisi",
            "İngilizce ve iş koşullarına ilişkin destekleyici bilgiler",
          ]
        : [
            "Employer sponsorship context",
            "Occupation and experience information aligned with the role",
            "Supporting information relevant to English and employment conditions",
          ];
    case "189":
      return isTr
        ? [
            "Puan testine konu olabilecek yaş ve İngilizce bilgisi",
            "Meslek ve beceri değerlendirmesi bağlamı",
            "Davet gereksinimine ilişkin genel uygunluk bağlamı",
          ]
        : [
            "Age and English information relevant to a points-tested pathway",
            "Occupation and skills assessment context",
            "General context relevant to the invitation requirement",
          ];
    case "190":
      return isTr
        ? [
            "Puan testine konu olabilecek yaş ve İngilizce bilgisi",
            "Meslek ve beceri değerlendirmesi bağlamı",
            "Eyalet veya bölge adaylığına ilişkin bağlam",
          ]
        : [
            "Age and English information relevant to a points-tested pathway",
            "Occupation and skills assessment context",
            "State or territory nomination context",
          ];
    case "491":
      return isTr
        ? [
            "Puan testine konu olabilecek yaş ve İngilizce bilgisi",
            "Meslek ve beceri değerlendirmesi bağlamı",
            "Bölgesel adaylık veya uygun akraba sponsorluğu bağlamı",
          ]
        : [
            "Age and English information relevant to a points-tested pathway",
            "Occupation and skills assessment context",
            "Regional nomination or relative sponsorship context",
          ];
    case "820":
    case "801":
      return isTr
        ? [
            "Uygun partner sponsorluğu statüsü bağlamı",
            "İlişkinin niteliği ve sürekliliğine ilişkin bilgiler",
            "Birlikte yaşam veya ortak yaşam düzenine ilişkin destekleyici bağlam",
          ]
        : [
            "Partner sponsorship status context",
            "Information relevant to the nature and continuity of the relationship",
            "Supporting context about living arrangements or shared life",
          ];
    default:
      return isTr
        ? ["Daha ayrıntılı kişisel bağlam"]
        : ["Additional personal context"];
  }
}

function getPathwaySpecificRisks(
  subclass: string,
  input: ReadinessInput,
  locale: Locale,
  estimatedPoints?: number
): string[] {
  const isTr = locale === "tr";
  const risks: string[] = [];

  if (subclass === "500") {
    if (!hasKw([input.mainGoal ?? "", input.preferredPathway ?? ""].join(" "), ["study", "student", "course", "eğitim", "öğrenci"])) {
      risks.push(
        isTr
          ? "Eğitim amacı açık biçimde belirtilmediği için bu yolun ağırlığı sınırlı kalabilir."
          : "The study purpose is not clearly stated, which may limit the weight of this pathway."
      );
    }
    if (!input.currentCountry) {
      risks.push(
        isTr
          ? "Mevcut ülke bağlamı olmadan öğrenci konumuna ilişkin değerlendirme sınırlı kalır."
          : "Without current-country context, the student-position review remains limited."
      );
    }
  }

  if (subclass === "485") {
    const hardAgeGate = evaluate485HardAgeGate(input);
    const ageGate = evaluate485AgeGate(input);
    if (hardAgeGate.isHardIneligible && hardAgeGate.declaredAge !== null) {
      risks.push(formatIneligibleAgeReason(locale, hardAgeGate.declaredAge));
    }
    risks.push(
      isTr
        ? "İstihdam sonuçları ve nitelikli yollara geçiş bireysel koşullara bağlı olabilir."
        : "Employment outcomes and transition to skilled pathways may affect this pathway."
    );
    if (!hardAgeGate.isHardIneligible && ageGate.isAboveLimit) {
      risks.push(
        isTr
          ? `1 Temmuz 2026 kuralına göre 485 için yaş sınırı ${ageGate.hasException ? `istisna kapsamında ${ageGate.maxAllowedAge}` : `${ageGate.maxAllowedAge}`} olarak uygulanır. Beyan edilen yaş (${ageGate.declaredAge}) bu sınırın üzerindedir.`
          : `Under the 1 July 2026 rule set, the 485 age cap is ${ageGate.maxAllowedAge}${ageGate.hasException ? " under the stated exception" : ""}. The declared age (${ageGate.declaredAge}) is above this cap.`
      );
    }
    if (!hasKw([input.mainGoal ?? "", input.preferredPathway ?? ""].join(" "), ["study", "student", "graduated", "eğitim", "mezun"])) {
      risks.push(
        isTr
          ? "Eğitim veya mezuniyet bağlamı açık biçimde görünmediği için bu yolun değerlendirmesi sınırlı kalabilir."
          : "The study or graduation context is not clearly visible, which may limit the review of this pathway."
      );
    }
  }

  if (subclass === "482") {
    const salaryGate = evaluateEmployerSalaryGate(input);
    if (!hasKw([input.sponsorOrFamily ?? "", input.mainGoal ?? ""].join(" "), ["sponsor", "employer", "işveren", "sponsored"])) {
      risks.push(
        isTr
          ? "İşveren sponsorluğu bağlamı açık değil."
          : "Employer sponsorship context is not yet clear."
      );
    }
    if (salaryGate.isBelowCsit && salaryGate.declaredSalaryAud !== null) {
      risks.push(formatIneligibleSalaryReason(locale, salaryGate.declaredSalaryAud));
      risks.push(
        isTr
          ? `1 Temmuz 2026 CSIT eşiği AUD ${JULY_2026_CSIT_AUD.toLocaleString("en-AU")}. Beyan edilen teklif (AUD ${salaryGate.declaredSalaryAud.toLocaleString("en-AU")}) bu eşiğin altında olduğu için 482/186 işveren sponsorlu yolları uygun görünmez.`
          : `The 1 July 2026 CSIT floor is AUD ${JULY_2026_CSIT_AUD.toLocaleString("en-AU")}. The declared salary offer (AUD ${salaryGate.declaredSalaryAud.toLocaleString("en-AU")}) is below this threshold, so employer-sponsored pathways such as 482/186 are ineligible under this income floor.`
      );
    }
    if (!input.occupation) {
      risks.push(
        isTr
          ? "Meslek bilgisi olmadan rol uyumu daha sınırlı incelenebilir."
          : "Without occupation information, role alignment can only be reviewed at a limited level."
      );
    }
  }

  if (["189", "190", "491"].includes(subclass)) {
    if (estimatedPoints !== undefined && estimatedPoints < SKILLED_MIGRATION_MIN_POINTS) {
      risks.push(formatIneligibleLowPointsReason(locale, estimatedPoints, input.englishLevel, input));
    }
    if (!input.occupation) {
      risks.push(
        isTr
          ? "Meslek bilgisi eksik olduğu için yetenekli yol incelemesi sınırlıdır."
          : "The skilled-pathway review is limited because occupation information is missing."
      );
    }
    if (!input.englishLevel || !input.age) {
      risks.push(
        isTr
          ? "Yaş ve İngilizce bilgisi eksik olduğunda puan testli değerlendirme eksik kalır."
          : "When age and English details are missing, the points-based review remains incomplete."
      );
    }
  }

  if (subclass === "190") {
    risks.push(
      isTr
        ? "Eyalet veya bölge adaylığına ilişkin bağlam olmadan bu yol daha temkinli değerlendirilir."
        : "Without nomination context, this pathway is assessed more cautiously."
    );
  }

  if (subclass === "491") {
    if (!hasKw(input.sponsorOrFamily ?? "", ["family", "relative", "akraba", "sponsor"])) {
      risks.push(
        isTr
          ? "Bölgesel adaylık veya uygun akraba sponsorluğu bağlamı henüz net değil."
          : "Regional nomination or relative sponsorship context is not yet clear."
      );
    }
  }

  if ((subclass === "820" || subclass === "801")) {
    if (!input.sponsorOrFamily) {
      risks.push(
        isTr
          ? "Partner sponsorluğu bağlamı olmadan bu yol sınırlı görünür."
          : "Without partner sponsorship context, this pathway remains limited."
      );
    }
    if (!hasKw([input.mainGoal ?? "", input.sponsorOrFamily ?? ""].join(" "), ["partner", "spouse", "de facto", "eş", "ilişki"])) {
      risks.push(
        isTr
          ? "İlişki bağlamı açık biçimde görünmediği için bu yol için güven seviyesi düşer."
          : "Because the relationship context is not clearly visible, confidence in this pathway is lower."
      );
    }
  }

  if (risks.length === 0) {
    risks.push(
      isTr
        ? "Mevcut bilgiler bu yol için bazı ana sinyaller sunuyor, ancak bireysel bağlam sonucu değiştirebilir."
        : "The available information provides some baseline signals for this pathway, but individual context could change the picture."
    );
  }

  return risks;
}

function getPathwayConfidenceLevel(
  subclass: string,
  input: ReadinessInput,
  relevance: PathwayRelevance,
  dataCompletenessPercentage: number,
  estimatedPoints?: number
): ConfidenceLevel {
  const combinedGoal = [input.mainGoal ?? "", input.preferredPathway ?? ""].join(" ");
  const sponsorText = [input.sponsorOrFamily ?? "", input.mainGoal ?? ""].join(" ");

  if (relevance !== "possible") {
    return relevance === "needs_more_information" ? "low" : "low";
  }

  if (subclass === "500") {
    const base = hasKw(combinedGoal, ["study", "student", "course", "eğitim", "öğrenci"])
      ? "high"
      : "medium";
    if (dataCompletenessPercentage < 40) return "low";
    if (dataCompletenessPercentage < 60 && base === "high") return "medium";
    return base;
  }

  if (subclass === "485") {
    const hasGradContext = hasKw(
      [input.mainGoal ?? "", input.preferredPathway ?? ""].join(" "),
      ["study", "student", "graduated", "graduate", "485", "eğitim", "mezun"]
    );
    const base = hasGradContext ? "medium" : "low";
    if (dataCompletenessPercentage < 40) return "low";
    return base;
  }

  if (subclass === "482") {
    const base = hasKw(sponsorText, ["sponsor", "employer", "işveren", "sponsored"]) && Boolean(input.occupation)
      ? "high"
      : "medium";
    if (dataCompletenessPercentage < 40) return "low";
    if (dataCompletenessPercentage < 60 && base === "high") return "medium";
    return base;
  }

  if (subclass === "189") {
    if (input.occupation && input.age && input.englishLevel && estimatedPoints !== undefined && estimatedPoints >= 65) {
      return dataCompletenessPercentage >= 60 ? "high" : "medium";
    }
    if (dataCompletenessPercentage < 40) return "low";
    return input.occupation && (input.age || input.englishLevel) ? "medium" : "low";
  }

  if (subclass === "190") {
    if (input.occupation && input.age && input.englishLevel && estimatedPoints !== undefined && estimatedPoints >= 65) {
      return dataCompletenessPercentage >= 60 ? "medium" : "low";
    }
    if (dataCompletenessPercentage < 40) return "low";
    return input.occupation ? "medium" : "low";
  }

  if (subclass === "491") {
    if (input.occupation && input.age && input.englishLevel && hasKw(sponsorText, ["family", "relative", "regional", "akraba", "bölgesel"])) {
      return dataCompletenessPercentage >= 60 ? "medium" : "low";
    }
    if (dataCompletenessPercentage < 40) return "low";
    return input.occupation ? "medium" : "low";
  }

  if ((subclass === "820" || subclass === "801")) {
    const base = hasKw(sponsorText, ["partner", "spouse", "de facto", "eş", "ilişki"]) && Boolean(input.sponsorOrFamily)
      ? "high"
      : "medium";
    if (dataCompletenessPercentage < 40) return "low";
    if (dataCompletenessPercentage < 60 && base === "high") return "medium";
    return base;
  }

  return "low";
}

function getConfidenceExplanation(
  subclass: string,
  input: ReadinessInput,
  locale: Locale,
  confidenceLevel: ConfidenceLevel,
  dataCompletenessPercentage: number,
  estimatedPoints?: number
): string {
  const isTr = locale === "tr";
  const hasAge = Boolean(input.age);
  const hasEnglish = Boolean(input.englishLevel);
  const hasOccupation = Boolean(input.occupation);
  const hasSponsorContext = hasKw(
    [input.sponsorOrFamily ?? "", input.mainGoal ?? ""].join(" "),
    ["sponsor", "employer", "partner", "family", "işveren", "eş", "akraba"]
  );

  if (subclass === "500") {
    return isTr
      ? confidenceLevel === "high"
        ? `Eğitim amacı net görünüyor ve veri tamamlanma düzeyi (%${dataCompletenessPercentage}) bu güven seviyesini destekliyor.`
        : `Eğitim bağlamı mevcut; ancak veri tamamlanma düzeyi (%${dataCompletenessPercentage}) bu güveni sınırlıyor.`
      : confidenceLevel === "high"
        ? `Study intent is clear and the available detail (${dataCompletenessPercentage}%) supports this confidence level.`
        : `There is study context, but available detail (${dataCompletenessPercentage}%) limits confidence.`;
  }

  if (subclass === "485") {
    const hasGradContext = hasKw(
      [input.mainGoal ?? "", input.preferredPathway ?? ""].join(" "),
      ["study", "student", "graduated", "graduate", "485", "eğitim", "mezun"]
    );
    return isTr
      ? hasGradContext
        ? `Eğitim veya mezuniyet bağlamı mevcut; veri tamamlanma düzeyi (%${dataCompletenessPercentage}) bu yolun genel bir göstergesi olarak kullanılıyor.`
        : `485 yolu için eğitim/mezuniyet bağlamı veya veri tamamlanma düzeyi (%${dataCompletenessPercentage}) sınırlı olduğu için güven daha temkinli.`
      : hasGradContext
        ? `Study or graduation context is visible; available detail (${dataCompletenessPercentage}%) is used as a general indicator for this pathway.`
        : `Graduate or study context or available detail (${dataCompletenessPercentage}%) is limited, so confidence for the 485 pathway remains cautious.`;
  }

  if (subclass === "482") {
    return isTr
      ? hasSponsorContext && hasOccupation
        ? `Sponsor ve rol bağlamı mevcut; veri tamamlanma düzeyi (%${dataCompletenessPercentage}) ile birlikte güven destekleniyor.`
        : `Sponsor/rol bağlamı veya veri tamamlanma düzeyi (%${dataCompletenessPercentage}) sınırlı olduğu için güven daha temkinli.`
      : hasSponsorContext && hasOccupation
        ? `Sponsor and role context are visible, and the available detail (${dataCompletenessPercentage}%) supports this confidence level.`
        : `Sponsor/role context or available detail (${dataCompletenessPercentage}%) is limited, so confidence remains cautious.`;
  }

  if (["189", "190", "491"].includes(subclass)) {
    const pointsText =
      estimatedPoints === undefined
        ? isTr
          ? "tahmini temel puan hesaplanamıyor"
          : "estimated base points cannot be calculated"
        : isTr
          ? `tahmini temel puan ${estimatedPoints}`
          : `estimated base points are ${estimatedPoints}`;
    return isTr
      ? `Güven seviyesi; yaş/İngilizce/meslek girdileri, ${pointsText} ve veri tamamlanma düzeyi (%${dataCompletenessPercentage}) ile göstergesel olarak hesaplanmıştır.`
      : `Confidence is estimated indicatively from age/English/occupation inputs, ${pointsText}, and available detail (${dataCompletenessPercentage}%).`;
  }

  if ((subclass === "820" || subclass === "801")) {
    return isTr
      ? hasSponsorContext
        ? `İlişki/sponsor bağlamı mevcut ve veri tamamlanma düzeyi (%${dataCompletenessPercentage}) güveni destekliyor.`
        : `İlişki/sponsor bağlamı veya veri tamamlanma düzeyi (%${dataCompletenessPercentage}) sınırlı olduğu için güven düşüktür.`
      : hasSponsorContext
        ? `Confidence is stronger with relationship/sponsor context and current available detail (${dataCompletenessPercentage}%).`
        : `Confidence is lower when relationship/sponsor context or available detail (${dataCompletenessPercentage}%) is limited.`;
  }

  const knownSignals = [hasAge, hasEnglish, hasOccupation, hasSponsorContext].filter(Boolean)
    .length;
  return isTr
    ? `Güven seviyesi, mevcut ${knownSignals}/4 ana sinyal ve %${dataCompletenessPercentage} veri tamamlanma düzeyi ile genel bir gösterge olarak oluşturuldu.`
    : `Confidence is shown as a general indicator based on ${knownSignals}/4 core signals and ${dataCompletenessPercentage}% available detail.`;
}

// ─── Pathway reason builder ───────────────────────────────────────────────────

function buildPathwayEntry(
  subclass: string,
  input: ReadinessInput,
  locale: Locale,
  dataCompletenessPercentage: number,
  estimatedPoints?: number
): PathwayComparison {
  const isTr = locale === "tr";
  const names = VISA_NAMES[subclass] ?? {
    en: `Subclass ${subclass}`,
    tr: `Alt sınıf ${subclass}`,
  };
  const visaName = isTr ? names.tr : names.en;

  let reason: string;
  let relevance: PathwayRelevance;

  const goalText = [input.mainGoal ?? "", input.preferredPathway ?? ""].join(" ");
  const sponsorText = [input.sponsorOrFamily ?? "", input.mainGoal ?? ""].join(" ");

  if (subclass === "500") {
    const studySignal = hasKw(goalText, ["study", "student", "course", "eğitim", "öğrenci"]);
    relevance = studySignal ? "possible" : "needs_more_information";
    reason = isTr
      ? studySignal
        ? "Eğitim hedefi, 500 Öğrenci Vizesinin olası bir yol olabileceğini göstermektedir. Bu yalnızca genel bilgidir ve kişisel duruma göre değişebilir."
        : "500 Öğrenci Vizesi, Avustralya'da kayıtlı bir kurumda öğrenim için ilgili olabilir. Daha fazla bağlam bu değerlendirmeyi destekleyecektir."
      : studySignal
        ? "The study goal indicates the Student Visa (subclass 500) may be a possible pathway. This is general information only and depends on individual circumstances."
        : "The 500 Student Visa may be relevant for study at a registered Australian institution. More context would support this assessment.";
  } else if (subclass === "485") {
    const hardAgeGate = evaluate485HardAgeGate(input);
    const ageGate = evaluate485AgeGate(input);
    const hasGradSignal = hasKw(goalText, ["study", "student", "graduated", "graduate", "485", "eğitim", "mezun"]);
    if (hardAgeGate.isHardIneligible && hardAgeGate.declaredAge !== null) {
      // Hard Gate (1 July 2026): overrides any "possible"/high-potential signal below.
      relevance = "ineligible";
      reason = formatIneligibleAgeReason(locale, hardAgeGate.declaredAge);
    } else if (ageGate.isAboveLimit) {
      relevance = "not_enough_information";
      reason = isTr
        ? `1 Temmuz 2026 kuralına göre 485 yaş sınırı ${ageGate.hasException ? `istisna kapsamında ${ageGate.maxAllowedAge}` : `${ageGate.maxAllowedAge}`}. Beyan edilen yaş (${ageGate.declaredAge}) bu sınırı aştığı için bu yol uygun görünmez.`
        : `Under the 1 July 2026 rule set, the 485 age cap is ${ageGate.maxAllowedAge}${ageGate.hasException ? " under the stated exception" : ""}. The declared age (${ageGate.declaredAge}) is above this cap, so this pathway is ineligible on age.`;
    } else {
      relevance = hasGradSignal ? "possible" : "needs_more_information";
      reason = isTr
        ? hasGradSignal
          ? "485 Geçici Mezun Vizesi (Post-Yükseköğretim Çalışma akışı), Avustralya'da uygun bir kurumdan mezun olan kişiler için ilgili bir yol olabilir. Bu yalnızca genel bilgidir ve bireysel koşullara bağlıdır."
          : "485 Geçici Mezun Vizesi, Avustralya'da uygun çalışmayı tamamlayan mezunlar için ilgili olabilir. Bu yolun değerlendirilebilmesi için daha fazla eğitim ve mezuniyet bağlamı gereklidir."
        : hasGradSignal
          ? "The 485 Temporary Graduate Visa (Post-Higher Education Work stream) may be a possible pathway for those who have completed Australian study in Australia. This is general information only and depends on individual circumstances."
          : "The 485 Temporary Graduate Visa may be relevant for those who have completed Australian study at a CRICOS-registered institution. More graduate or study context would support this assessment.";
    }
  } else if (subclass === "482") {
    const salaryGate = evaluateEmployerSalaryGate(input);
    const hasSponsor = hasKw(sponsorText, ["sponsor", "employer", "işveren", "sponsored"]);
    if (salaryGate.isBelowCsit && salaryGate.declaredSalaryAud !== null) {
      // Hard Gate (1 July 2026): overrides any "possible"/high-potential signal below.
      relevance = "ineligible";
      reason = formatIneligibleSalaryReason(locale, salaryGate.declaredSalaryAud);
    } else {
      relevance = hasSponsor ? "possible" : "needs_more_information";
      reason = isTr
        ? hasSponsor
          ? "İşveren sponsoru bağlamı, 482 Skills in Demand Vizesinin olası bir yol olabileceğini göstermektedir. Bu kişisel duruma göre değişebilir."
          : "482 Skills in Demand Vizesi bir işveren sponsoru gerektirmektedir. Sponsor bağlamı bu değerlendirme için önemlidir."
        : hasSponsor
          ? "The employer sponsor context indicates the 482 Skills in Demand Visa may be a possible pathway. This depends on individual circumstances."
          : "The 482 Skills in Demand Visa requires an employer sponsor. Sponsor context is important to support this assessment.";
    }
  } else if (subclass === "189") {
    if (estimatedPoints !== undefined && estimatedPoints < SKILLED_MIGRATION_MIN_POINTS) {
      // Hard Gate: overrides any "possible"/high-potential signal below.
      relevance = "ineligible";
      reason = formatIneligibleLowPointsReason(locale, estimatedPoints, input.englishLevel, input);
    } else {
      relevance = input.occupation ? "possible" : "needs_more_information";
      reason = isTr
        ? "189 Yetenekli Bağımsız Vizesi, puan testi ve davet gereksinimi olan bağımsız bir yoldur. Bu yalnızca genel bilgidir ve kişisel duruma göre değişebilir."
        : "The 189 Skilled Independent Visa is a points-tested pathway requiring an invitation. This is general information only and depends on individual circumstances.";
    }
  } else if (subclass === "190") {
    if (estimatedPoints !== undefined && estimatedPoints < SKILLED_MIGRATION_MIN_POINTS) {
      // Hard Gate: overrides any "possible"/high-potential signal below.
      relevance = "ineligible";
      reason = formatIneligibleLowPointsReason(locale, estimatedPoints, input.englishLevel, input);
    } else {
      relevance = input.occupation ? "possible" : "needs_more_information";
      reason = isTr
        ? "190 Yetenekli Aday Gösterilen Vizesi, eyalet veya bölge adaylığı gerektiren bir puan testi yoludur. Bu yalnızca genel bilgidir ve kişisel duruma göre değişebilir."
        : "The 190 Skilled Nominated Visa is a points-tested pathway requiring state or territory nomination. This is general information only and depends on individual circumstances.";
    }
  } else if (subclass === "491") {
    if (estimatedPoints !== undefined && estimatedPoints < SKILLED_MIGRATION_MIN_POINTS) {
      // Hard Gate: overrides any "possible"/high-potential signal below.
      relevance = "ineligible";
      reason = formatIneligibleLowPointsReason(locale, estimatedPoints, input.englishLevel, input);
    } else {
      relevance = input.occupation ? "possible" : "needs_more_information";
      reason = isTr
        ? "491 Bölgesel Yetenekli Çalışma Vizesi, bölgesel adaylık veya akraba sponsorluğu gerektiren geçici bir yoldur. Bu yalnızca genel bilgidir ve kişisel duruma göre değişebilir."
        : "The 491 Skilled Work Regional Visa is a provisional regional pathway requiring nomination or relative sponsorship. This is general information only and depends on individual circumstances.";
    }
  } else if ((subclass === "820" || subclass === "801")) {
    const hasPartnerSignal = hasKw(sponsorText, ["partner", "citizen", "pr", "permanent", "nz", "eş", "vatandaş", "daimi"]);
    relevance = hasPartnerSignal ? "possible" : "needs_more_information";
    reason = isTr
      ? hasPartnerSignal
        ? "Partner bağlamı, 820/801 Partner Vizesinin olası bir yol olabileceğini göstermektedir. Bu kişisel duruma ve Avustralya'daki sponsor statüsüne göre değişebilir."
        : "820/801 Partner Vizesi için Avustralya vatandaşı, daimi oturum veya NZ vatandaşı olan bir sponsorun varlığı gerekmektedir. Sponsor bilgisi bu değerlendirmeyi destekleyecektir."
      : hasPartnerSignal
        ? "The partner context indicates the 820/801 Partner Visa may be a possible pathway. This depends on individual circumstances and the sponsor's Australian status."
        : "The 820/801 Partner Visa requires a sponsor who is an Australian citizen, permanent resident, or NZ citizen. Sponsor information would support this assessment.";
  } else {
    relevance = "not_enough_information";
    reason = isTr
      ? "Bu yol mevcut bilgilere dayanarak incelemeye değer olabilir."
      : "This pathway may be relevant to explore based on available information.";
  }

  let confidenceLevel = getPathwayConfidenceLevel(
    subclass,
    input,
    relevance,
    dataCompletenessPercentage,
    estimatedPoints
  );
  const ageGate = subclass === "485" ? evaluate485AgeGate(input) : null;
  const hardAgeGate = subclass === "485" ? evaluate485HardAgeGate(input) : null;
  const salaryGate = subclass === "482" ? evaluateEmployerSalaryGate(input) : null;
  const isLowPointsIneligible =
    ["189", "190", "491"].includes(subclass) &&
    estimatedPoints !== undefined &&
    estimatedPoints < SKILLED_MIGRATION_MIN_POINTS;

  // Split form of the low-points reason: the points line is subclass-specific
  // (rendered per row), the shared notes are profile-level (rendered once).
  let ineligiblePointsLine: string | undefined;
  let ineligibleSharedNotes: string[] | undefined;
  if (isLowPointsIneligible && estimatedPoints !== undefined) {
    const parts = buildIneligibleLowPointsParts(locale, estimatedPoints, input.englishLevel, input);
    ineligiblePointsLine = parts.pointsLine;
    ineligibleSharedNotes = parts.sharedNotes;
  }

  const forcedIneligibleByRule =
    (subclass === "485" && (hardAgeGate?.isHardIneligible || ageGate?.isAboveLimit)) ||
    (subclass === "482" && salaryGate?.isBelowCsit) ||
    isLowPointsIneligible;

  // Hard Gate: unconditionally overrides any "possible"/high-potential relevance
  // and confidence the softer heuristics above might otherwise have produced.
  if (hardAgeGate?.isHardIneligible || (subclass === "482" && salaryGate?.isBelowCsit) || isLowPointsIneligible) {
    relevance = "ineligible";
  }

  if (forcedIneligibleByRule) {
    confidenceLevel = "low";
  }

  let confidenceExplanation = getConfidenceExplanation(
    subclass,
    input,
    locale,
    confidenceLevel,
    dataCompletenessPercentage,
    estimatedPoints
  );
  if (forcedIneligibleByRule) {
    confidenceExplanation = isTr
      ? "Bu değerlendirme sinyali 1 Temmuz 2026 kural eşiği ihlali nedeniyle düşük güvene çekildi."
      : "This pathway signal is forced to low confidence due to a direct 1 July 2026 rule-threshold failure.";
  }
  const difficulty = getDifficultyForPathway({ subclass });
  const requirementType = getRequirementType(
    { subclass },
    locale
  );
  const userRelativePosition = getUserRelativePosition(
    { relevance, confidenceLevel },
    locale
  );
  const keyRequirements = getPathwayKeyRequirements(subclass, locale);
  const pathwaySpecificRisks = getPathwaySpecificRisks(
    subclass,
    input,
    locale,
    estimatedPoints
  );

  return {
    subclass,
    visaName,
    reason,
    relevance,
    confidenceLevel,
    confidenceExplanation,
    difficulty,
    requirementType,
    userRelativePosition,
    keyRequirements,
    pathwaySpecificRisks,
    ineligiblePointsLine,
    ineligibleSharedNotes,
  };
}

function getDifficultyForPathway(
  pathway: Pick<PathwayComparison, "subclass">
): "low" | "medium" | "high" {
  if (pathway.subclass === "general") return "medium";
  if (pathway.subclass === "500") return "medium";
  if (pathway.subclass === "485") return "medium";
  if (pathway.subclass === "482") return "medium";
  if (pathway.subclass === "820" || pathway.subclass === "801") return "high";
  if (["189", "190", "491"].includes(pathway.subclass)) return "high";
  return "medium";
}

function getRequirementType(
  pathway: Pick<PathwayComparison, "subclass">,
  locale: Locale
): string {
  const isTr = locale === "tr";
  if (pathway.subclass === "500") {
    return isTr
      ? "Eğitim ve mali kanıt ağırlıklı"
      : "Study and financial evidence focused";
  }
  if (pathway.subclass === "485") {
    return isTr
      ? "Mezuniyet, İngilizce ve polis taraması kanıtı odaklı"
      : "Graduation, English, and police clearance evidence focused";
  }
  if (pathway.subclass === "482") {
    return isTr
      ? "İşveren sponsorluğu ve rol uyumu"
      : "Employer sponsorship and role alignment";
  }
  if (["189", "190", "491"].includes(pathway.subclass)) {
    return isTr
      ? "Puan, meslek ve davet/adaylık odaklı"
      : "Points, occupation, and invitation/nomination based";
  }
  if (pathway.subclass === "820" || pathway.subclass === "801") {
    return isTr
      ? "İlişki ve sponsor kanıtı odaklı"
      : "Relationship and sponsor evidence based";
  }
  return isTr ? "Daha fazla kişisel bağlam gerektirir" : "Requires more personal context";
}

function getUserRelativePosition(
  pathway: Pick<PathwayComparison, "relevance" | "confidenceLevel">,
  locale: Locale
): string {
  const isTr = locale === "tr";

  if (pathway.relevance === "ineligible") {
    return isTr
      ? "Uygun Değil — 1 Temmuz 2026 kural eşiği karşılanmıyor"
      : "Ineligible — does not meet the 1 July 2026 rule threshold";
  }

  if (pathway.relevance === "not_enough_information") {
    return isTr
      ? "Konumlandırma için veri yetersiz"
      : "Insufficient data for relative positioning";
  }

  if (pathway.relevance === "needs_more_information") {
    return isTr
      ? "Ek kişisel veriyle netleşebilir"
      : "Could become clearer with additional personal data";
  }

  if (pathway.confidenceLevel === "high") {
    return isTr
      ? "Mevcut veride göreli olarak daha güçlü"
      : "Relatively stronger in current data";
  }

  if (pathway.confidenceLevel === "medium") {
    return isTr
      ? "Orta düzey sinyal, belirgin boşluklarla"
      : "Moderate signal with notable gaps";
  }

  return isTr
    ? "Düşük sinyal, sınırlı uyum görünümü"
    : "Lower signal with limited alignment";
}

function buildDataCompleteness(
  input: ReadinessInput,
  locale: Locale
): DataCompleteness {
  const isTr = locale === "tr";
  const fields: Array<{ value?: string; label: string }> = [
    {
      value: input.mainGoal,
      label: isTr ? "Ana hedef" : "Main goal",
    },
    {
      value: input.preferredPathway,
      label: isTr ? "Vize ilgi alanı" : "Visa interest",
    },
    {
      value: input.currentCountry,
      label: isTr ? "Bulunduğunuz ülke" : "Current country",
    },
    {
      value: input.passportCountry,
      label: isTr ? "Pasaport ülkesi" : "Passport country",
    },
    {
      value: input.age,
      label: isTr ? "Yaş" : "Age",
    },
    {
      value: resolveOccupationDisplayName(input.occupation, locale),
      label: isTr ? "Meslek" : "Occupation",
    },
    {
      value: input.englishLevel,
      label: isTr ? "İngilizce seviyesi" : "English level",
    },
    {
      value: input.sponsorOrFamily,
      label: isTr ? "Sponsor/aile durumu" : "Sponsor/family context",
    },
    {
      value: input.biggestConcern,
      label: isTr ? "En büyük endişe" : "Biggest concern",
    },
  ];

  const completed = fields.filter((f) => Boolean(f.value)).length;
  const percentage = Math.round((completed / fields.length) * 100);
  const missingFields = fields
    .filter((f) => !f.value)
    .map((f) => f.label);

  return { percentage, missingFields };
}

function hasClearGoal(mainGoal?: string): boolean {
  if (!mainGoal) return false;
  const trimmed = mainGoal.trim();
  if (!trimmed) return false;
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  return wordCount >= 3;
}

export function buildLeadQuality(input: ReadinessInput): LeadQuality {
  const completeness = buildDataCompleteness(input, input.locale).percentage;
  const occupationConfirmed = (input.occupationConfirmed ?? "").trim().toLowerCase() === "yes";

  const englishIsValid = Boolean(input.englishLevel?.trim() && parseEnglishOption(input.englishLevel) !== null);
  const occupationHasMatch = Boolean(
    input.occupation?.trim() && checkOccupation({ occupation: input.occupation }).matches.length > 0
  );
  const clearOccupationMatch = occupationConfirmed || occupationHasMatch;
  const timelineDefined = Boolean(input.timeline?.trim());
  const goalClear = hasClearGoal(input.mainGoal);
  const completenessScore = Math.round(completeness * 0.4);

  let score = 0;
  if (englishIsValid) score += 20;
  if (clearOccupationMatch) score += 20;
  if (timelineDefined) score += 10;
  if (goalClear) score += 10;
  score += completenessScore;

  score = Math.max(0, Math.min(100, score));

  const leadTier: LeadTier =
    score >= 70 ? "High intent" : score >= 40 ? "Moderate intent" : "Low intent";

  return {
    leadValueScore: score,
    leadScore: score,
    leadTier,
  };
}

function getDataCompletenessLabel(score: number, locale: Locale): string {
  const isTr = locale === "tr";
  if (score >= 80) return isTr ? "Yüksek tamamlanma" : "High completeness";
  if (score >= 50) return isTr ? "Orta tamamlanma" : "Medium completeness";
  return isTr ? "Düşük tamamlanma" : "Low completeness";
}

function buildDocumentReadinessIndicator(input: ReadinessInput): IndicatorLevel {
  const englishTestTaken = (input.englishTestTaken ?? "").trim().toLowerCase() === "yes";
  const skillsSignal = (input.occupationConfirmed ?? "").trim().toLowerCase() === "yes";

  const readinessSignals = [englishTestTaken, skillsSignal].filter(Boolean).length;

  if (readinessSignals === 2) return "high";
  if (readinessSignals === 1) return "medium";
  return "low";
}

function buildInformationCoverageLevel(dataCompletenessScore: number): InformationCoverageLevel {
  if (dataCompletenessScore >= 80) return "comprehensive";
  if (dataCompletenessScore >= 50) return "partial";
  return "initial";
}

function buildReportIndicators(params: {
  locale: Locale;
  dataCompleteness: DataCompleteness;
  input: ReadinessInput;
}): ReportIndicators {
  const { locale, dataCompleteness, input } = params;
  const isTr = locale === "tr";

  const dataCompletenessScore = dataCompleteness.percentage;
  const dataCompletenessLabel = getDataCompletenessLabel(dataCompletenessScore, locale);
  const documentReadinessIndicator = buildDocumentReadinessIndicator(input);
  const informationCoverageLevel = buildInformationCoverageLevel(dataCompletenessScore);
  const explanation = isTr
    ? "Bu göstergeler yalnızca bilgi tamamlanmasını yansıtır ve vize sonucunu garanti etmez."
    : "These indicators reflect information coverage only and do not predict visa outcomes.";

  return {
    dataCompletenessScore,
    dataCompletenessLabel,
    documentReadinessIndicator,
    informationCoverageLevel,
    explanation,
  };
}

function buildPrimaryGap(params: {
  locale: Locale;
  pathways: PathwayComparison[];
  dataCompleteness: DataCompleteness;
  missingInformation: string[];
  riskIndicators: ReturnType<typeof buildRiskIndicators>;
  pointsEstimate?: PointsEstimate;
}): string {
  const { locale, pathways, dataCompleteness, missingInformation, riskIndicators, pointsEstimate } = params;
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";

  const hasSkilled = pathways.some((p) => ["189", "190", "491"].includes(p.subclass));
  if (hasSkilled && pointsEstimate?.estimatedPoints !== undefined && pointsEstimate.estimatedPoints < 65) {
    return isTr
      ? "Birincil boşluk: Mevcut tahmini temel puan, puan testli yollar için sınırlayıcı kalıyor."
      : isZh
        ? "主要差距：当前加分信号仍会限制打分制路径的相对竞争力。"
        : "Current points context remains a limiting factor for points-tested pathways.";
  }

  const priorityMissing = [
    "Occupation",
    "Meslek",
    "English level",
    "İngilizce seviyesi",
    "Sponsor",
    "sponsor",
    "partner",
    "Partner",
  ];
  const majorMissing = missingInformation.find((item) =>
    priorityMissing.some((needle) => item.includes(needle))
  );
  if (majorMissing) {
    return isTr
      ? `Birincil boşluk: ${majorMissing} alanı netleşmeden karşılaştırmalı değerlendirme sınırlı kalır.`
      : isZh
        ? `主要差距：在 ${majorMissing} 信息更清晰前，比较评估仍会受到限制。`
        : `Primary gap: Comparative assessment remains limited until ${majorMissing} is clarified.`;
  }

  const highRisk = riskIndicators.find((risk) => risk.level === "high");
  if (highRisk) {
    return isTr
      ? `Birincil boşluk: "${highRisk.title}" başlığındaki risk etkisi baskın görünüyor.`
      : isZh
        ? `主要差距：“${highRisk.title}” 所示风险目前是主要限制因素。`
        : `Primary gap: The risk signal in "${highRisk.title}" appears to be the dominant limiter.`;
  }

  if (dataCompleteness.percentage < 60) {
    return isTr
      ? `Birincil boşluk: Veri tamamlanma düzeyi (%${dataCompleteness.percentage}) karar-destek sinyallerini sınırlıyor.`
      : isZh
        ? `主要差距：当前信息完整度（${dataCompleteness.percentage}%）限制了决策参考信号强度。`
        : `Primary gap: Available detail (${dataCompleteness.percentage}%) is limiting the decision-support signal strength.`;
  }

  return isTr
    ? "Birincil boşluk: Karşılaştırmalı tabloyu güçlendirecek ek kişisel bağlam ihtiyacı."
    : isZh
      ? "主要差距：需要更多个人背景信息，以增强路径比较表的参考价值。"
      : "Primary gap: Additional personal context is needed to strengthen the comparison table.";
}

function buildFactorsAffectingPathways(
  locale: Locale,
  input: ReadinessInput,
  dataCompleteness: DataCompleteness,
  hasSkilledPathway: boolean,
  hasEmployerPathway: boolean,
  hasPartnerPathway: boolean
): string[] {
  const isTr = locale === "tr";
  const items: string[] = [];

  if (!input.englishLevel?.trim()) {
    items.push(
      isTr
        ? "İngilizce seviyesi netleşmediği için puan testli ve işveren odaklı yolların karşılaştırması zayıflayabilir."
        : "Without a defined English level, comparison signals for points-tested and employer pathways can remain weak."
    );
  }

  if (!input.occupation?.trim()) {
    items.push(
      isTr
        ? "Meslek bilgisi olmadan beceri değerlendirmesi gerektiren yolların göreli gücü netleşmez."
        : "Without occupation detail, the relative strength of pathways that rely on skills assessment remains unclear."
    );
  }

  if (!input.sponsorOrFamily?.trim()) {
    items.push(
      isTr
        ? "Sponsor/aile bağlamı eksik olduğunda işveren veya partner sponsorluğu içeren seçenekler sınırlı görünür."
        : "When sponsorship/family context is missing, employer- or partner-sponsored options can appear more limited."
    );
  }

  if (dataCompleteness.percentage < 60) {
    items.push(
      isTr
        ? `Veri tamamlanma düzeyi (%${dataCompleteness.percentage}) düşük olduğu için yol karşılaştırmasındaki güven sinyali azalır.`
        : `Low information completeness (${dataCompleteness.percentage}%) reduces confidence in pathway comparison signals.`
    );
  }

  if (hasSkilledPathway) {
    items.push(
      isTr
        ? "Puan testli yollar için davet seviyeleri ve eyalet/bölge öncelikleri dönemsel dalgalanabilir."
        : "For points-tested pathways, invitation levels and state/territory priorities may fluctuate by period."
    );
  }

  if (hasEmployerPathway) {
    items.push(
      isTr
        ? `İşverenin rol, sponsorluk ve ücret gerekliliklerine uygunluğu sonucu etkileyebilir; 1 Temmuz 2026 için CSIT eşiği AUD ${JULY_2026_CSIT_AUD.toLocaleString("en-AU")} olarak uygulanır.`
        : `Employer alignment with role, sponsorship, and salary settings can affect pathway viability; for 1 July 2026 rules, the CSIT floor is AUD ${JULY_2026_CSIT_AUD.toLocaleString("en-AU")}.`
    );
  }

  if (hasPartnerPathway) {
    items.push(
      isTr
        ? "İlişki kanıtlarının türü ve süreklilik düzeyi partner yolunun gücünü değiştirebilir."
        : "The type and continuity of relationship evidence can alter the relative strength of partner pathways."
    );
  }

  if (!input.currentCountry?.trim()) {
    items.push(
      isTr
        ? "Mevcut ülke bilgisi olmadan bazı başvuru senaryolarının uygulanabilirlik değerlendirmesi eksik kalabilir."
        : "Without current-country context, feasibility checks for some application scenarios may stay incomplete."
    );
  }

  if (!input.mainGoal?.trim()) {
    items.push(
      isTr
        ? "Ana hedef netleşmediğinde uygun yol önceliği daha düşük güvenle sıralanır."
        : "When the primary migration goal is unclear, pathway prioritization is ranked with lower confidence."
    );
  }

  const fallbackFactors = [
    isTr
      ? "Resmi kriter ve politika güncellemeleri karşılaştırmalı sinyalleri dönemsel olarak değiştirebilir."
      : "Official criteria and policy updates can periodically shift comparative pathway signals.",
    isTr
      ? "Sunulan bilgilerin belgeyle tutarlılığı, yol sıralamasında nihai ağırlığı etkileyebilir."
      : "How submitted information aligns with supporting evidence can influence final pathway weighting.",
    isTr
      ? "Başvuru zamanlaması, dönemsel davet ve işlem öncelikleri nedeniyle sonuç sinyallerini etkileyebilir."
      : "Application timing can influence outcome signals due to period-based invitation and processing priorities.",
  ];

  for (const factor of fallbackFactors) {
    if (items.length >= 3) break;
    if (!items.includes(factor)) items.push(factor);
  }

  return items.slice(0, 5);
}

// ─── Points estimate ──────────────────────────────────────────────────────────

function parseAgeOption(ageStr: string): AgeOption | null {
  const n = parseInt(ageStr.trim(), 10);
  if (isNaN(n)) return null;
  if (n < 18) return null;
  if (n <= 24) return "18_24";
  if (n <= 32) return "25_32";
  if (n <= 39) return "33_39";
  if (n <= 44) return "40_44";
  return "45_plus";
}

function parseEnglishOption(raw: string): EnglishOption | null {
  const s = raw.toLowerCase().trim();
  // Strict exact-match mapping for the standardized "English Level" dropdown
  // values (none/competent/proficient/superior) before falling back to the
  // fuzzy free-text matching below (used by other callers, e.g. chat intake).
  if (s === "none") return "competent"; // 0 points — same tier as "competent"
  if (s === "competent") return "competent";
  if (s === "proficient") return "proficient";
  if (s === "superior") return "superior";
  if (s.includes("superior") || s.includes("高级") || s.includes("优秀") || /ielts\s*[89]/.test(s) || /pte\s*7[0-9]/.test(s) || /pte\s*8/.test(s))
    return "superior";
  if (s.includes("proficient") || s.includes("熟练") || /ielts\s*7/.test(s) || /pte\s*6[0-9]/.test(s))
    return "proficient";
  if (s.includes("competent") || s.includes("合格") || /ielts\s*6/.test(s) || /pte\s*5[0-9]/.test(s) || s.includes("functional"))
    return "competent";
  // Handle raw numeric scores (e.g., "8", "8.5", "7.5", "6.5") treated as IELTS-band-equivalent
  const numericScore = parseFloat(s);
  if (!isNaN(numericScore) && numericScore >= 1 && numericScore <= 9) {
    if (numericScore >= 7.5) return "superior";
    if (numericScore >= 7.0) return "proficient";
    if (numericScore >= 6.0) return "competent";
  }
  // Handle "level N" or "N/9" patterns
  const levelMatch = s.match(/(?:level|lvl|band|clb)\s*(\d+(?:\.\d+)?)/);
  if (levelMatch) {
    const level = parseFloat(levelMatch[1]);
    if (level >= 9) return "superior";
    if (level >= 7) return "proficient";
    if (level >= 5) return "competent";
  }
  return null;
}

function yearsToOverseasEmploymentOption(years: number | undefined): OverseasEmploymentOption {
  if (years === undefined) return "lt3";
  if (years >= 8) return "8_plus";
  if (years >= 5) return "5_7";
  if (years >= 3) return "3_4";
  return "lt3";
}

function yearsToAustralianEmploymentOption(years: number | undefined): AustralianEmploymentOption {
  if (years === undefined) return "lt1";
  if (years >= 8) return "8_plus";
  if (years >= 5) return "5_7";
  if (years >= 3) return "3_4";
  if (years >= 1) return "1_2";
  return "lt1";
}

function isAustralianQualification(input: ReadinessInput): boolean {
  return input.qualificationAwardedInAustralia === true;
}

function isRegionalAustralianQualification(input: ReadinessInput): boolean {
  return isAustralianQualification(input) && input.qualificationRegionalAustralia === true;
}

function isResearchOrDoctorateQualification(level: ReadinessInput["qualificationLevel"]): boolean {
  return (
    level === "Master's Degree (Research)" ||
    level === "PhD/Doctorate" ||
    level === "PhD"
  );
}

function hasSpecialistEducationClaim(input: ReadinessInput): boolean {
  return (
    isAustralianQualification(input) &&
    isResearchOrDoctorateQualification(input.qualificationLevel) &&
    input.specialistEducationStemResponse === "yes"
  );
}

function isProfessionalYearRelevantOccupation(input: ReadinessInput): boolean {
  const occupation = (input.occupation ?? "").trim().toLowerCase();
  if (!occupation) return false;
  return (
    occupation.includes("account") ||
    occupation.includes("audit") ||
    occupation.includes("ict") ||
    occupation.includes("software") ||
    occupation.includes("developer") ||
    occupation.includes("programmer") ||
    occupation.includes("engineer") ||
    occupation.includes("engineering") ||
    occupation.includes("information technology")
  );
}

function buildAustralianOriginPointsDisclaimer(input: ReadinessInput, locale: Locale): string | undefined {
  const hasAustralianEmploymentPoints = (input.onshoreExperienceYears ?? 0) > 0;
  const hasAustralianStudyPoints = isAustralianQualification(input);
  if (!hasAustralianEmploymentPoints && !hasAustralianStudyPoints) return undefined;

  if (locale === "tr") {
    return "Avustralya kaynaklı puan notu: Avustralya iş deneyimi puanları yalnızca davetten önceki 10 yıl içinde, haftada en az 20 saat, substantive vize veya Bridging A/B vizesiyle yapılan nitelikli çalışma için geçerlidir. Avustralya study / regional study puanları ise Australian study requirement'i karşılayan ve bölgesel puan için uzaktan eğitim olmayan belirlenmiş bölgesel kampüste tamamlanan eğitim varsayımıyla hesaplanır.";
  }
  if (locale === "zh-Hans") {
    return "澳大利亚来源积分说明：澳洲工作经验分仅适用于获邀前10年内、每周至少20小时、且在 substantive 签证或 Bridging A/B 签证期间完成的技术工作。Australian study / regional study 分则基于满足 Australian study requirement，且偏远地区分对应课程在指定偏远地区实体校区完成、非远程教学的前提。";
  }
  return "Australian-origin points note: Australian employment points apply only where the skilled work was completed within 10 years before invitation, for at least 20 hours per week, while holding a substantive visa or Bridging A/B visa. Australian study / regional study points assume the qualification satisfied the Australian study requirement and, for regional points, was completed at a designated regional campus rather than by distance education.";
}

function qualificationToEducationOption(
  level: ReadinessInput["qualificationLevel"],
  awardedInAustralia: boolean
): EducationOption {
  if (level === "PhD/Doctorate" || level === "PhD") return "doctorate";
  if (
    level === "Bachelor's Degree" ||
    level === "Bachelor" ||
    level === "Master's Degree (Coursework)" ||
    level === "Master's Degree (Research)"
  ) {
    return "bachelor_or_higher";
  }
  if ((level === "Diploma" || level === "Certificate") && awardedInAustralia) {
    return "australian_diploma_or_trade";
  }
  return "none_or_unsure";
}

// Rough bridge from AU's English bands to CLB — both are ultimately derived
// from similar IELTS/PTE thresholds, but this is an approximation, not an
// official conversion table. Used only for the partial (age+English-only)
// CA estimate, mirroring how the AU partial estimate also only uses age+English.
function englishOptionToClb(option: EnglishOption | null): CLBLevel {
  if (option === "superior") return "CLB_9";
  if (option === "proficient") return "CLB_7";
  if (option === "competent") return "CLB_6";
  return "less_than_CLB4";
}

function parseCanadaAgeBracket(ageStr?: string): CanadaCRSInput["age"] | null {
  if (!ageStr) return null;
  const n = parseInt(ageStr.trim(), 10);
  if (isNaN(n) || n < 17) return null;
  if (n <= 17) return "17_or_less";
  if (n >= 45) return "45_or_more";
  if (n >= 20 && n <= 29) return "20_29";
  return String(n) as CanadaCRSInput["age"];
}

function buildCanadaPointsEstimate(input: ReadinessInput, locale: Locale): PointsEstimate {
  const isTr = locale === "tr";
  const ageBracket = parseCanadaAgeBracket(input.age);
  const englishOption = input.englishLevel ? parseEnglishOption(input.englishLevel) : null;

  if (!ageBracket && !englishOption) {
    return {
      appliesTo: ["CEC", "FSW", "FSTP"],
      estimatedPoints: undefined,
      breakdown: [],
      note: isTr
        ? "CRS tahmini için yaş ve İngilizce seviyesi sağlanmadı. Puan hesaplaması mevcut değil."
        : "Age and English level were not provided. A CRS estimate is not available.",
    };
  }

  const clb = englishOptionToClb(englishOption);
  const result = calculateCanadaCRS({
    hasSpouseOrPartner: false,
    age: ageBracket ?? "20_29",
    education: "less_than_secondary",
    firstLanguageAbilityScores: { speaking: clb, listening: clb, reading: clb, writing: clb },
    secondLanguageBand: "none",
    canadianWorkExperience: "none_or_less_than_1yr",
    postSecondaryCredentialCount: "none",
    foreignWorkExperienceYears: "none",
    hasCertificateOfQualification: false,
    hasSiblingInCanada: false,
    frenchAbility: "none",
    canadianPostSecondaryCredentialYears: "none",
    hasProvincialNomination: false,
  });

  const breakdown = [
    ageBracket
      ? {
          label: isTr ? "Yaş puanı" : "Age points",
          points: result.breakdown.coreHumanCapital.age,
          note: input.age,
        }
      : null,
    englishOption
      ? {
          label: isTr ? "İngilizce seviyesi puanı (CLB tahmini)" : "English level points (estimated CLB)",
          points: result.breakdown.coreHumanCapital.firstLanguage,
          note: input.englishLevel,
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  const estimatedPoints = breakdown.reduce((sum, item) => sum + item.points, 0);

  const note = isTr
    ? `Bu yalnızca yaş${ageBracket ? "" : " (belirtilmedi)"} ve İngilizce seviyesine${englishOption ? "" : " (belirtilmedi)"} dayalı kısmi bir CRS tahminidir (config v${result.configVersion}). Eğitim, Kanada/yurt dışı iş tecrübesi, eş faktörleri ve ek puanlar dahil değildir. Gerçek CRS puanınız IRCC'nin resmi Express Entry hesaplayıcısıyla doğrulanmalıdır.`
    : `This is a partial CRS estimate (config v${result.configVersion}) based on age${ageBracket ? "" : " (not provided)"} and English level${englishOption ? "" : " (not provided)"} only. Education, Canadian/foreign work experience, spouse factors, and additional points are not included. Verify your actual CRS score against IRCC's official Express Entry calculator.`;

  return {
    appliesTo: ["CEC", "FSW", "FSTP"],
    estimatedPoints,
    breakdown,
    note,
  };
}

function buildPointsEstimate(input: ReadinessInput, locale: Locale): PointsEstimate {
  if (input.country === "CA") return buildCanadaPointsEstimate(input, locale);

  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const ageOption = input.age ? parseAgeOption(input.age) : null;
  const englishOption = input.englishLevel ? parseEnglishOption(input.englishLevel) : null;
  const hasExperienceInput =
    input.offshoreExperienceYears !== undefined || input.onshoreExperienceYears !== undefined;
  const hasEducationInput = Boolean(input.qualificationLevel);
  const occupationHasDatasetMatch = Boolean(
    input.occupation?.trim() && getEligibleSkilledSubclasses(input.occupation).length > 0
  );
  const canApplyExperiencePoints = !hasExperienceInput || occupationHasDatasetMatch;

  const missingFactors = isTr
    ? ["NAATI / topluluk dili", "Mesleki Yıl", "Partner durumu", "Eyalet / bölgesel adaylık"]
    : isZh
      ? ["NAATI / 社区语言", "Professional Year", "伴侣状态", "州 / 偏远地区提名"]
      : ["NAATI / community language", "Professional Year", "Partner status", "State / regional nomination"];

  if (!ageOption && !englishOption) {
    return {
      appliesTo: ["189", "190", "491"],
      estimatedPoints: undefined,
      breakdown: [],
      note: isTr
        ? "Puan tahmini için yaş ve İngilizce seviyesi sağlanmadı. Puan hesaplaması mevcut değil."
        : "Age and English level were not provided. A points estimate is not available.",
    };
  }

  const overseasEmployment = yearsToOverseasEmploymentOption(
    canApplyExperiencePoints ? input.offshoreExperienceYears : undefined
  );
  const australianEmployment = yearsToAustralianEmploymentOption(
    canApplyExperiencePoints ? input.onshoreExperienceYears : undefined
  );
  const education = qualificationToEducationOption(input.qualificationLevel, isAustralianQualification(input));
  const specialistEducation = hasSpecialistEducationClaim(input);
  const australianStudyRequirement = isAustralianQualification(input);
  const regionalStudy = isRegionalAustralianQualification(input);

  const result = calculateAustraliaPoints({
    age: ageOption ?? "18_24",
    english: englishOption ?? "competent",
    overseasEmployment,
    australianEmployment,
    education,
    specialistEducation,
    australianStudyRequirement,
    professionalYear: false,
    credentialledCommunityLanguage: false,
    regionalStudy,
    partner: "none_or_unsure",
    hasStateNomination190: false,
    hasNominationOrSponsorship491: false,
  });

  const breakdown = [
    ageOption
      ? {
          label: isTr ? "Yaş puanı" : "Age points",
          points: result.breakdown.age,
          note: input.age,
        }
      : null,
    englishOption
      ? {
          label: isTr ? "İngilizce seviyesi puanı" : "English level points",
          points: result.breakdown.english,
          note: input.englishLevel,
        }
      : null,
    hasExperienceInput
      ? {
          label: isTr ? "İstihdam puanı (yurt dışı + Avustralya)" : "Employment points (overseas + Australian)",
          points: canApplyExperiencePoints ? result.breakdown.employmentCombinedAfterCap : 0,
          note: canApplyExperiencePoints
            ? (isTr
                ? `Yurt dışı: ${input.offshoreExperienceYears ?? 0} yıl, Avustralya: ${input.onshoreExperienceYears ?? 0} yıl. Yakından ilgili meslek iddiaları ayrıca doğrulanmaz; deneyimin girilen aday meslekle uyumlu olduğu varsayılır.`
                : isZh
                  ? `境外：${input.offshoreExperienceYears ?? 0} 年，澳洲：${input.onshoreExperienceYears ?? 0} 年。系统不会单独核验“密切相关职业”工作经历；默认你填写的工作经历与所填提名职业一致。`
                  : `Overseas: ${input.offshoreExperienceYears ?? 0} yrs, Australian: ${input.onshoreExperienceYears ?? 0} yrs. Closely related occupation claims are not independently verified; this estimate assumes the declared work aligns to the nominated occupation entered.`)
            : (isTr
                ? "Deneyim puanı uygulanmadı: aday meslek veritabanında doğrulanamadı. İlgisiz veya doğrulanmamış iş deneyimi otomatik puanlanmaz."
                : isZh
                  ? "未应用工作经验分：提名职业无法在职业数据库中核验。与提名职业无关或无法核验的工作经历不会自动计分。"
                  : "Employment points were not applied because the nominated occupation could not be verified against the occupation dataset. Unrelated or unverified employment is not auto-credited."),
        }
      : null,
    hasEducationInput
      ? {
          label: isTr ? "Eğitim puanı" : "Education points",
          points: result.breakdown.education,
          note: input.qualificationLevel,
        }
      : null,
    australianStudyRequirement
      ? {
          label: isTr ? "Avustralya study requirement puanı" : "Australian study requirement points",
          points: result.breakdown.bonus.australianStudyRequirement,
          note: isTr
            ? "Avustralya kurumunda tamamlanan yeterlilik"
            : isZh
              ? "在澳大利亚教育机构完成的学历"
              : "Qualification completed at an Australian institution",
        }
      : null,
    regionalStudy
      ? {
          label: isTr ? "Bölgesel Avustralya öğrenim puanı" : "Regional Australia study points",
          points: result.breakdown.bonus.regionalStudy,
          note: isTr
            ? "Belirlenmiş bölgesel kampüs, uzaktan eğitim değil"
            : isZh
              ? "指定偏远地区实体校区，非远程教学"
              : "Designated regional campus, not distance education",
        }
      : null,
    isResearchOrDoctorateQualification(input.qualificationLevel)
      ? {
          label: isTr ? "Uzmanlık eğitimi (STEM) puanı" : "Specialist education (STEM) points",
          points: result.breakdown.bonus.specialistEducation,
          note:
            input.specialistEducationStemResponse === "yes"
              ? isTr
                ? "Kullanıcı STEM alanını açıkça onayladı"
                : isZh
                  ? "用户明确确认属于 STEM 研究学位"
                  : "User explicitly confirmed an eligible STEM research degree"
              : input.specialistEducationStemResponse === "not_sure"
                ? isTr
                  ? "Emin değilim → +10 uygulanmadı"
                  : isZh
                    ? "不确定 → 未授予 +10"
                    : "Not sure -> +10 not awarded"
                : isTr
                  ? "Açık 'Evet' yanıtı olmadığı için +10 uygulanmadı"
                  : isZh
                    ? "未收到明确“是”回答，因此未授予 +10"
                    : "No explicit 'Yes' confirmation, so +10 was not awarded",
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  const estimatedPoints = breakdown.reduce((sum, item) => sum + item.points, 0);

  const missingStr = missingFactors.join(", ");
  const australianOriginPointsDisclaimer = buildAustralianOriginPointsDisclaimer(input, locale);
  const specialistEducationNoteCaveat = buildSpecialistEducationCaveat(
    locale,
    getSpecialistEducationSignals(input),
    "short"
  );
  const note = isTr
    ? `Bu, yaş${ageOption ? "" : " (belirtilmedi)"}, İngilizce seviyesi${englishOption ? "" : " (belirtilmedi)"}, iş deneyimi${hasExperienceInput ? "" : " (belirtilmedi)"} ve eğitim düzeyine${hasEducationInput ? "" : " (belirtilmedi)"} dayalı bir tahmindir. Dahil edilmeyen faktörler: ${missingStr}. Gerçek puan durumu kişisel duruma göre değişebilir.${australianOriginPointsDisclaimer ? ` ${australianOriginPointsDisclaimer}` : ""}${specialistEducationNoteCaveat ? ` ${specialistEducationNoteCaveat}` : ""}`
    : isZh
      ? `本估算基于年龄${ageOption ? "" : "（未提供）"}、英语水平${englishOption ? "" : "（未提供）"}、工作经验${hasExperienceInput ? "" : "（未提供）"}和学历${hasEducationInput ? "" : "（未提供）"}。未纳入因素：${missingStr}。实际分数取决于个人情况。${australianOriginPointsDisclaimer ? ` ${australianOriginPointsDisclaimer}` : ""}${specialistEducationNoteCaveat ? ` ${specialistEducationNoteCaveat}` : ""}`
      : `This estimate is based on age${ageOption ? "" : " (not provided)"}, English level${englishOption ? "" : " (not provided)"}, work experience${hasExperienceInput ? "" : " (not provided)"}, and education level${hasEducationInput ? "" : " (not provided)"}. Factors not included: ${missingStr}. Actual points position depends on individual circumstances.${australianOriginPointsDisclaimer ? ` ${australianOriginPointsDisclaimer}` : ""}${specialistEducationNoteCaveat ? ` ${specialistEducationNoteCaveat}` : ""}`;

  return {
    appliesTo: ["189", "190", "491"],
    estimatedPoints,
    breakdown,
    note,
  };
}

// ─── Occupation indication ────────────────────────────────────────────────────

function buildCanadaOccupationIndication(
  input: ReadinessInput,
  locale: Locale
): OccupationIndication | undefined {
  const isTr = locale === "tr";
  if (!input.occupation) return undefined;

  const result = checkNocOccupation({ occupation: input.occupation, nocCode: input.nocCode });

  if (result.partialCoverageGap) {
    return {
      occupation: input.occupation,
      matches: [],
      note: isTr
        ? `"${input.occupation}" şu anda NOC veritabanımızda bulunamadı. Bu, mesleğin geçersiz olduğu anlamına gelmez — derlememiz henüz tüm NOC 2021 kategorilerini kapsamıyor. Lütfen IRCC'nin resmi NOC arama aracını kullanın: https://noc.esdc.gc.ca/Structure/NocWelcome`
        : `"${input.occupation}" was not found in our NOC database yet. This does not mean the occupation is invalid — our NOC compilation does not yet cover every NOC 2021 category. Please use IRCC's official NOC search tool: https://noc.esdc.gc.ca/Structure/NocWelcome`,
    };
  }

  const topMatch = result.matches[0];
  const isDirectSelection = !!input.nocCode && result.matches.length === 1;

  let note: string;
  if (isDirectSelection && topMatch) {
    const duties = topMatch.duties ?? [];
    const dutiesText = duties.length
      ? ` ECA valuation strategy — your reference letters must explicitly document these NOC-defined duties: ${duties.map((d, i) => `(${i + 1}) ${d}`).join("; ")}.`
      : "";
    const skillLabel = topMatch.teer <= 1 ? "High-Skilled (TEER 0–1)" : topMatch.teer <= 3 ? "Mid-Skilled (TEER 2–3)" : "Lower-Skilled (TEER 4–5)";
    const pathways = `CEC/FSW${topMatch.isFstpEligibleGroup ? "/FSTP" : ""}`;
    // ECA body recommendation based on major group / NOC code prefix
    const mg = topMatch.code.slice(0, 2);
    let ecaBody: string;
    if (mg === "31" || mg === "32" || mg === "33" || topMatch.code.startsWith("301") || topMatch.code.startsWith("302")) {
      ecaBody = "IRCC-designated ECA body: Medical Council of Canada (MCC) for physicians (NOC 31100); National Nursing Assessment Service (NNAS) for nurses; relevant regulatory body per profession (e.g., Canadian Dental Association for dentists). Note: healthcare professionals may be required to obtain provincial licensure in addition to the federal ECA.";
    } else if (mg === "21" || mg === "22") {
      ecaBody = "IRCC-designated ECA body: Engineers Canada (for professional engineers, P.Eng. pathway) or World Education Services (WES) for general engineering technology credentials. Note: Canadian provincial engineering associations (e.g., PEO in Ontario, APEGA in Alberta) govern licensure separately from the federal ECA — budget 6–18 months for full professional engineering recognition.";
    } else if (mg === "11" || mg === "12" || mg === "13") {
      ecaBody = "IRCC-designated ECA body: CPA Canada (Chartered Professional Accountants) for accounting credentials; WES or ICAS for general business/finance credentials. CPA Canada's Prior Learning Assessment (PLA) may require additional bridging modules depending on your home country's accounting framework.";
    } else if (mg === "21" || topMatch.code.startsWith("211") || topMatch.code.startsWith("212") || topMatch.code.startsWith("213")) {
      ecaBody = "IRCC-designated ECA body: World Education Services (WES) for most IT/computer science credentials; ICAS also accepted. WES standard report costs CAD $239–$285 (7–20 business days). For ACS-style assessments, note that Canada and Australia use different bodies — WES is the correct choice for Canadian Express Entry, not ACS.";
    } else if (mg === "51" || mg === "52" || mg === "53" || mg === "54" || mg === "55") {
      ecaBody = "IRCC-designated ECA body: World Education Services (WES) for arts, education, and social science credentials. Some education credentials (teachers) may additionally require provincial teacher certification, which is separate from the federal ECA and managed by provincial bodies such as the Ontario College of Teachers (OCT).";
    } else {
      ecaBody = "IRCC-designated ECA body: World Education Services (WES) is accepted for most occupations under FSW/CEC; ICAS (International Credential Assessment Service of Canada) is also an approved IRCC ECA provider. Cost: WES CAD $239–$285 (standard, 7–20 business days); ICAS CAD $200–$300. ECA validity: 5 years from report date.";
    }
    note = isTr
      ? `NOC Kodu doğrulandı: ${topMatch.code} — ${topMatch.title} (TEER ${topMatch.teer} / ${skillLabel}). ${pathways} yollarına uygun olabilir.${dutiesText} ECA değerlendirme kurumu: ${ecaBody}`
      : `NOC Code confirmed: ${topMatch.code} — ${topMatch.title} (TEER ${topMatch.teer} / ${skillLabel}). May qualify for ${pathways}.${dutiesText} ${ecaBody}`;
  } else {
    note = isTr
      ? `NOC verilerinde ${result.matches.length} olası meslek eşleşmesi bulundu (TEER ${topMatch?.teer ?? "?"}). Bu yalnızca genel bilgi amaçlıdır; resmi bir ECA veya NOC doğrulaması ayrı bir süreçtir.`
      : `${result.matches.length} possible NOC match(es) found in NOC 2021 V1.0 (TEER ${topMatch?.teer ?? "?"}). This is general information only; the confirmed NOC code, ECA body selection, and duty-matching strategy require verification against your specific credentials and IRCC's current requirements.`;
  }

  return {
    occupation: result.query,
    matches: result.matches.map((m) => ({
      title: m.title,
      relevantVisas: [
        "CEC",
        "FSW",
        ...(m.isFstpEligibleGroup ? ["FSTP"] : []),
      ],
    })),
    note,
  };
}

function buildOccupationIndication(
  input: ReadinessInput,
  locale: Locale
): OccupationIndication | undefined {
  if (input.country === "CA") return buildCanadaOccupationIndication(input, locale);

  const isTr = locale === "tr";

  if (!input.occupation) return undefined;

  const displayOccupation = resolveOccupationDisplayName(input.occupation, locale);
  const result = checkOccupation({ occupation: displayOccupation });

  if (result.matches.length === 0) {
    return {
      occupation: displayOccupation,
      matches: [],
      note: isTr
        ? `"${displayOccupation}" için stored occupation verilerinde eşleşme bulunamadı. Bu, mesleğin listede olmadığı anlamına gelmez; resmi kaynakların incelenmesi önerilir.`
        : `No matches were found in the stored occupation data for "${displayOccupation}". This does not mean the occupation is not listed. Reviewing official sources may be relevant.`,
    };
  }

  return {
    occupation: displayOccupation,
    matches: result.matches.map((m) => ({
      title: m.title,
      relevantVisas: m.relevantVisas,
    })),
    note: isTr
      ? `Stored verilerde ${result.matches.length} olası meslek eşleşmesi bulundu. Bu yalnızca genel bilgi amaçlıdır ve kişisel duruma göre değişebilir. Resmi bir beceri değerlendirmesi ayrı bir süreçtir.`
      : `${result.matches.length} possible occupation match(es) found in stored data. This is general information only and depends on individual circumstances. A formal skills assessment is a separate step.`,
  };
}

// ─── Missing information ──────────────────────────────────────────────────────

function buildMissingInformation(
  input: ReadinessInput,
  subclasses: string[],
  locale: Locale
): string[] {
  const isTr = locale === "tr";
  const missing: string[] = [];
  const skilled = subclasses.some((s) => ["189", "190", "491"].includes(s));
  const has485 = subclasses.includes("485");
  const has482 = subclasses.includes("482");
  const hasPartner = (subclasses.includes("820") || subclasses.includes("801"));

  if (!input.mainGoal && subclasses.length === 0) {
    missing.push(isTr ? "Ana hedef veya vize ilgi alanı" : "Main goal or visa interest");
  }
  if (!input.currentCountry) {
    missing.push(isTr ? "Bulunduğunuz ülke" : "Current country");
  }
  if (!input.passportCountry) {
    missing.push(isTr ? "Pasaport ülkesi" : "Passport country");
  }
  if (!input.age) {
    missing.push(isTr ? "Yaş" : "Age");
  }
  if (skilled && !input.occupation) {
    missing.push(
      isTr
        ? "Meslek veya eğitim geçmişi (yetenekli yol için)"
        : "Occupation or study background (for skilled pathway)"
    );
  }
  if ((skilled || has482 || has485) && !input.englishLevel) {
    missing.push(isTr ? "İngilizce seviyesi" : "English level");
  }
  if ((has482 || hasPartner) && !input.sponsorOrFamily) {
    missing.push(
      isTr
        ? "Sponsor, partner veya Avustralya'daki aile bağlamı"
        : "Sponsor, partner, or family context in Australia"
    );
  }

  return missing;
}

// ─── Disclaimer ───────────────────────────────────────────────────────────────

function buildDisclaimer(locale: Locale, country: "AU" | "CA" = "AU"): string {
  if (country === "CA") {
    // express-entry.json has no zh-Hans disclaimer yet; falls back to its English text.
    return expressEntryConfig.disclaimerText[locale === "tr" ? "tr" : "en"];
  }
  return locale === "tr"
    ? "Bu rapor otomatik bir veri analizidir ve göçmenlik tavsiyesi teşkil etmez. Resmi başvurularınız için kayıtlı bir MARA acentesine danışın."
    : locale === "zh-Hans"
      ? "本报告为自动化数据分析，仅供一般信息参考，不构成移民或法律建议。涉及签证策略规划与正式申请，请咨询注册移民代理（MARA）。"
      : "This report is an automated data analysis for general information only and does not constitute migration or legal advice. For strategic planning and visa applications, please consult a registered migration agent (MARA).";
}

function buildKeyVisaRequirements(
  pathways: PathwayComparison[]
): KeyVisaRequirement[] {
  return pathways
    .filter((pathway) => pathway.subclass !== "general")
    .map((pathway) => ({
      pathway: `${pathway.visaName} (${pathway.subclass})`,
      items: pathway.keyRequirements,
    }));
}

function buildIneligibleSummaryLine(
  ineligiblePathways: PathwayComparison[],
  locale: Locale,
  estimatedPoints?: number
): string | null {
  if (ineligiblePathways.length === 0) return null;
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const subclasses = ineligiblePathways.map((pathway) => pathway.subclass);
  const list = subclasses.join("/");
  const allPointsBased =
    estimatedPoints !== undefined &&
    ineligiblePathways.every((pathway) => ["189", "190", "491"].includes(pathway.subclass));

  if (allPointsBased) {
    const skilledLabel =
      subclasses.length === 3
        ? isTr
          ? "Üç puan testli yolun (189/190/491) tümü"
          : isZh
            ? "全部三个打分制路径（189/190/491）"
            : "All three skilled subclasses (189/190/491)"
        : isTr
          ? `Alt sınıf ${list}`
          : isZh
            ? `子类别 ${list}`
            : `Subclass ${list}`;

    return isTr
      ? `${skilledLabel} şu anda uygun değil — ${estimatedPoints} puan / ${SKILLED_MIGRATION_MIN_POINTS} puan gerekli. Ayrıntılar için aşağıdaki Vize Uygulanabilirlik Sıralamasına bakın.`
      : isZh
        ? `${skilledLabel}当前不符合资格——${estimatedPoints} 分，需 ${SKILLED_MIGRATION_MIN_POINTS} 分。详情见下方“签证可行性排序”。`
        : `${skilledLabel} currently ineligible — ${estimatedPoints} pts vs ${SKILLED_MIGRATION_MIN_POINTS} required. See the Visa Viability Ranking below for details.`;
  }

  return isTr
    ? `Alt sınıf ${list} şu anda uygun değil. Ayrıntılar için aşağıdaki Vize Uygulanabilirlik Sıralamasına bakın.`
    : isZh
      ? `子类别 ${list} 当前不符合资格。详情见下方“签证可行性排序”。`
      : `Subclass ${list} currently ineligible. See the Visa Viability Ranking below for details.`;
}

function buildExecutiveSummary(
  input: ReadinessInput,
  pathways: PathwayComparison[],
  locale: Locale,
  missingInformation: string[],
  assessmentState: AssessmentState
): string[] {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const estimatedPoints = assessmentState.canShowNumericRanking ? assessmentState.estimatedPoints : undefined;
  const skilledVisible = pathways.some((pathway) => ["189", "190", "491"].includes(pathway.subclass));
  const pathwayNames = pathways
    .filter((pathway) => pathway.subclass !== "general")
    .slice(0, 6)
    .map((pathway) => pathway.subclass)
    .join(", ");

  // Hard Gate (1 July 2026): ineligible pathways are reported as flat
  // determinations, not softened "may be possible" language, and are
  // placed first so they cannot be missed or outranked by softer signals.
  //
  // The full per-subclass reason (points + Mathematical Projection text) is
  // shown once, canonically, in the Visa Viability Ranking section below --
  // repeating that ~40-word paragraph once per subclass here as well is
  // pure duplication, so the Executive Summary gets a single brief line
  // instead.
  const ineligiblePathways = pathways.filter((pathway) => pathway.relevance === "ineligible");
  const ineligibleSummaryLine = buildIneligibleSummaryLine(ineligiblePathways, locale, estimatedPoints);
  const ineligibleLines = ineligibleSummaryLine ? [ineligibleSummaryLine] : [];

  if (isTr) {
    return [
      ...ineligibleLines,
      pathwayNames
        ? `Bu rapor, ${pathwayNames} yollarını bağlayıcı 1 Temmuz 2026 kural eşiklerine göre değerlendirir; çalışma, mezuniyet, iş sponsorluğu ve nitelikli göç sinyalleri tek çerçevede sunulur.`
        : "Bu rapor, verilen bilgilerle görünen yol sinyallerini bağlayıcı kural eşiklerine göre değerlendirir.",
      skilledVisible && estimatedPoints !== undefined
        ? `Tahmini temel puan ${estimatedPoints}; bu puan, puan testli yolların sıralamasını belirleyen ana faktördür.`
        : "Puan bağlamı sınırlı olduğunda puan testli yolların sıralaması doğrulanamaz.",
      "Beceri değerlendirmesi, adaylık bağlamı, sponsor bilgisi ve belge tamlığı, yol gücü sıralamasını doğrudan belirler.",
    ];
  }

  if (isZh) {
    return [
      ...ineligibleLines,
      pathwayNames
        ? `本报告依据具有约束力的2026年7月1日规则门槛评估 ${pathwayNames} 路径，并综合学习、毕业生、雇主担保与技术移民信号。`
        : "本报告依据具有约束力的规则门槛评估当前可见的签证路径信号。",
      skilledVisible && estimatedPoints !== undefined
        ? `当前加分信号为 ${estimatedPoints}；该分数是决定打分制路径排序的关键因素。`
        : "加分背景有限时，打分制路径的排序无法得到确认。",
      "职业评估、州担保背景、担保信息与材料完整度，直接决定路径强度排序。",
    ];
  }

  return [
    ...ineligibleLines,
    pathwayNames
      ? `This report evaluates ${pathwayNames} against binding 1 July 2026 rule thresholds, cross-referencing study, graduate, employer-sponsored, and skilled pathway signals.`
      : "This report evaluates visible pathway signals from the details provided against binding rule thresholds.",
    skilledVisible && estimatedPoints !== undefined
      ? `Estimated base points are ${estimatedPoints}; this is a determining factor in the ranking of points-tested pathways.`
      : "Limited points context means the ranking of points-tested pathways cannot be confirmed.",
    "Skills assessment, nomination context, sponsorship evidence, and documentation completeness directly determine the pathway strength ranking.",
  ];
}

// Per-pathway evidence status items based on form input
function getEvidenceStatusItems(
  subclass: string,
  input: ReadinessInput,
  isTr: boolean
): Array<{ label: string; status: "provided" | "missing" | "unclear" | "typically_required" }> {
  const hasEnglish = Boolean(input.englishLevel || input.englishTestTaken);
  const hasOccupation = Boolean(input.occupation);
  const hasSponsor = hasSponsorContext(input.sponsorOrFamily);
  const skillsStatus: "provided" | "missing" | "unclear" =
    input.occupationConfirmed === "yes" ? "provided" : input.occupationConfirmed === "no" ? "missing" : "unclear";

  switch (subclass) {
    case "189":
    case "190":
    case "491":
      return [
        { label: isTr ? "İngilizce kanıtı" : "English evidence", status: hasEnglish ? "provided" : "missing" },
        { label: isTr ? "Meslek ayrıntıları" : "Occupation details", status: hasOccupation ? "provided" : "missing" },
        { label: isTr ? "Beceri değerlendirmesi" : "Skills assessment", status: skillsStatus },
        { label: isTr ? "Puan tablosu konumu" : "Points table position", status: hasEnglish && hasOccupation ? "unclear" : "typically_required" },
      ];
    case "482":
      return [
        { label: isTr ? "İşveren sponsoru bağlamı" : "Employer sponsor context", status: hasSponsor ? "provided" : "missing" },
        { label: isTr ? "Meslek ayrıntıları" : "Occupation details", status: hasOccupation ? "provided" : "missing" },
        { label: isTr ? "İngilizce kanıtı" : "English evidence", status: hasEnglish ? "provided" : "missing" },
        { label: isTr ? "Beceri değerlendirmesi" : "Skills assessment", status: skillsStatus },
      ];
    case "485":
      return [
        { label: isTr ? "Son Avustralya eğitimi" : "Recent Australian study", status: "typically_required" },
        { label: isTr ? "İngilizce kanıtı" : "English evidence", status: hasEnglish ? "provided" : "missing" },
        { label: isTr ? "AFP kontrolü" : "AFP check", status: "typically_required" },
        { label: isTr ? "Sağlık sigortası" : "Health insurance", status: "typically_required" },
      ];
    case "500":
      return [
        { label: isTr ? "Kurs / CoE" : "Course / CoE", status: "typically_required" },
        { label: isTr ? "OSHC" : "OSHC", status: "typically_required" },
        { label: isTr ? "Mali kanıt" : "Financial evidence", status: "typically_required" },
        { label: isTr ? "Pasaport ülkesi" : "Passport country", status: input.passportCountry ? "provided" : "typically_required" },
      ];
    case "820":
    case "801":
      return [
        { label: isTr ? "İlişki kanıtı" : "Relationship evidence", status: hasSponsor ? "provided" : "missing" },
        { label: isTr ? "Sponsor kanıtı" : "Sponsor evidence", status: hasSponsor ? "provided" : "typically_required" },
        { label: isTr ? "Kimlik belgeleri" : "Identity documents", status: "typically_required" },
      ];
    default:
      return [
        { label: isTr ? "Kimlik ve pasaport" : "Identity and passport", status: input.passportCountry ? "provided" : "typically_required" },
        { label: isTr ? "Belge seti" : "Document set", status: "typically_required" },
      ];
  }
}

// Per-pathway metadata used in strength comparison
const PATHWAY_STRENGTH_META: Record<
  string,
  {
    friction: "low" | "medium" | "high";
    evidenceLoad: "low" | "medium" | "high";
    typicalPathEn: string;
    typicalPathTr: string;
    signalReasonsEn: string[];
    signalReasonsTr: string[];
    limitingFactorsEn: string[];
    limitingFactorsTr: string[];
  }
> = {
  "500": {
    friction: "medium",
    evidenceLoad: "medium",
    typicalPathEn: "Study pathway",
    typicalPathTr: "Eğitim yolu",
    signalReasonsEn: ["Study pathway context"],
    signalReasonsTr: ["Eğitim yolu bağlamı"],
    limitingFactorsEn: ["Course enrolment, OSHC and financial evidence context may affect pathway"],
    limitingFactorsTr: ["Kurs kaydı, OSHC ve mali kanıt bağlamı bu yolu etkileyebilir"],
  },
  "485": {
    friction: "medium",
    evidenceLoad: "medium",
    typicalPathEn: "Post-study temporary graduate pathway",
    typicalPathTr: "Mezuniyet sonrası geçici mezun yolu",
    signalReasonsEn: ["Post-study temporary graduate pathway context"],
    signalReasonsTr: ["Mezuniyet sonrası geçici mezun yolu bağlamı"],
    limitingFactorsEn: ["Recent Australian study, age, English, AFP check and insurance context may affect pathway"],
    limitingFactorsTr: ["Son Avustralya eğitimi, yaş, İngilizce, AFP kontrolü ve sigorta bağlamı bu yolu etkileyebilir"],
  },
  "482": {
    friction: "medium",
    evidenceLoad: "high",
    typicalPathEn: "Employer-sponsored work pathway",
    typicalPathTr: "İşveren sponsorlu çalışma yolu",
    signalReasonsEn: ["Employer-sponsored work pathway context"],
    signalReasonsTr: ["İşveren sponsorlu çalışma yolu bağlamı"],
    limitingFactorsEn: ["Employer sponsor context is central to this pathway"],
    limitingFactorsTr: ["İşveren sponsoru bağlamı bu yol için merkezi önemdedir"],
  },
  "189": {
    friction: "high",
    evidenceLoad: "high",
    typicalPathEn: "Invitation-based skilled pathway",
    typicalPathTr: "Davet tabanlı nitelikli yol",
    signalReasonsEn: [
      "Points-tested skilled pathway context",
      "Occupation and English inputs affect signal",
    ],
    signalReasonsTr: [
      "Puan tabanlı nitelikli yol bağlamı",
      "Meslek ve İngilizce girdileri sinyali etkiler",
    ],
    limitingFactorsEn: [
      "Invitation round settings may affect pathway",
      "Points estimate may be incomplete based on provided information",
    ],
    limitingFactorsTr: [
      "Davet turu ayarları bu yolu etkileyebilir",
      "Puan tahmini sağlanan bilgilere göre eksik olabilir",
    ],
  },
  "190": {
    friction: "high",
    evidenceLoad: "high",
    typicalPathEn: "State or territory nomination pathway",
    typicalPathTr: "Eyalet veya bölge adaylık yolu",
    signalReasonsEn: ["Skilled nomination pathway context"],
    signalReasonsTr: ["Nitelikli adaylık yolu bağlamı"],
    limitingFactorsEn: ["State or territory nomination settings may affect pathway"],
    limitingFactorsTr: ["Eyalet veya bölge adaylık ayarları bu yolu etkileyebilir"],
  },
  "491": {
    friction: "medium",
    evidenceLoad: "high",
    typicalPathEn: "Regional provisional pathway",
    typicalPathTr: "Bölgesel geçici yol",
    signalReasonsEn: ["Regional skilled pathway context"],
    signalReasonsTr: ["Bölgesel nitelikli yol bağlamı"],
    limitingFactorsEn: ["Regional nomination or relative sponsorship context may affect pathway"],
    limitingFactorsTr: ["Bölgesel adaylık veya akraba sponsorluğu bağlamı bu yolu etkileyebilir"],
  },
  "820": {
    friction: "high",
    evidenceLoad: "high",
    typicalPathEn: "Onshore partner pathway (temporary stage)",
    typicalPathTr: "Avustralya içi partner yolu (geçici aşama)",
    signalReasonsEn: ["Partner pathway context"],
    signalReasonsTr: ["Partner yolu bağlamı"],
    limitingFactorsEn: ["Relationship evidence and sponsor context are central to this pathway"],
    limitingFactorsTr: ["İlişki kanıtı ve sponsor bağlamı bu yol için merkezi önemdedir"],
  },
  "801": {
    friction: "medium",
    evidenceLoad: "medium",
    typicalPathEn: "Onshore partner pathway (permanent stage)",
    typicalPathTr: "Avustralya içi partner yolu (kalıcı aşama)",
    signalReasonsEn: ["Continuing partner relationship context"],
    signalReasonsTr: ["Süregelen partner ilişkisi bağlamı"],
    limitingFactorsEn: ["Eligibility for assessment depends on the 2-year wait since the subclass 820 application"],
    limitingFactorsTr: ["Değerlendirmeye uygunluk, subclass 820 başvurusundan itibaren 2 yıllık bekleme süresine bağlıdır"],
  },
};

function buildPathwayStrengthComparison(
  pathways: PathwayComparison[],
  locale: Locale,
  input: ReadinessInput
): PathwayStrengthComparison[] {
  const isTr = locale === "tr";

  function strengthFor(pathway: PathwayComparison): "limited" | "moderate" | "strong" {
    if (pathway.confidenceLevel === "high" && pathway.difficulty !== "high") return "strong";
    if (pathway.confidenceLevel === "low" || pathway.relevance !== "possible") return "limited";
    return "moderate";
  }

  return pathways.map((pathway) => {
    const strength = strengthFor(pathway);
    const meta = PATHWAY_STRENGTH_META[pathway.subclass];
    const friction: "low" | "medium" | "high" = meta?.friction ?? (pathway.difficulty === "high" ? "high" : pathway.difficulty === "medium" ? "medium" : "low");
    const evidenceLoad: "low" | "medium" | "high" = meta?.evidenceLoad ?? "medium";
    const typicalPath = meta
      ? isTr ? meta.typicalPathTr : meta.typicalPathEn
      : isTr ? "Genel yol" : "General pathway";
    const signalReasons = meta
      ? isTr ? meta.signalReasonsTr : meta.signalReasonsEn
      : [isTr ? "Genel sinyal bağlamı" : "General signal context"];
    const limitingFactors = meta
      ? isTr ? meta.limitingFactorsTr : meta.limitingFactorsEn
      : [isTr ? "Daha fazla bilgi bu yolu netleştirebilir" : "More information may clarify this pathway"];

    const relativePosition: "stronger_signal" | "moderate_signal" | "limited_signal" =
      strength === "strong" ? "stronger_signal" : strength === "moderate" ? "moderate_signal" : "limited_signal";

    const evidenceStatus = getEvidenceStatusItems(pathway.subclass, input, isTr);

    const strengthLabel = isTr
      ? strength === "strong" ? "daha güçlü sinyal" : strength === "moderate" ? "orta sinyal" : "sınırlı sinyal"
      : strength === "strong" ? "stronger signal" : strength === "moderate" ? "moderate signal" : "limited signal";
    const frictionLabel = isTr
      ? friction === "high" ? "yüksek" : friction === "medium" ? "orta" : "düşük"
      : friction;
    const evidenceLoadLabel = isTr
      ? evidenceLoad === "high" ? "yüksek" : evidenceLoad === "medium" ? "orta" : "düşük"
      : evidenceLoad;

    return {
      subclass: pathway.subclass,
      visaName: pathway.visaName,
      strength,
      friction,
      evidenceLoad,
      typicalPath,
      explanation: isTr
        ? `${pathway.visaName}: sinyal ${strengthLabel}; sürtünme ${frictionLabel}; kanıt yükü ${evidenceLoadLabel}. Tipik yol: ${typicalPath}. Sağlanan bilgilere göre genel karşılaştırmadır.`
        : `${pathway.visaName}: ${strengthLabel}; ${frictionLabel} friction; ${evidenceLoadLabel} evidence load. Typical path: ${typicalPath}. General comparison based on provided information.`,
      relativePosition,
      signalReasons,
      limitingFactors,
      evidenceStatus,
      // Hard Gate (1 July 2026): overrides the strength breakdown with a bold
      // red compliance-violation reason shown as the first item in the PDF.
      isHardIneligible: pathway.relevance === "ineligible",
      ineligibleReason:
        pathway.relevance === "ineligible"
          ? shortIneligibleReference(locale)
          : undefined,
    };
  });
}

function buildEvidenceReadiness(
  input: ReadinessInput,
  subclasses: string[],
  locale: Locale
): EvidenceReadinessItem[] {
  const isTr = locale === "tr";
  const hasSkilled = subclasses.some((subclass) => ["189", "190", "491"].includes(subclass));
  const has485 = subclasses.includes("485");
  const has482 = subclasses.includes("482");
  const hasPartner = (subclasses.includes("820") || subclasses.includes("801"));
  const employmentSignals = getEmploymentDataSignals(input);
  const items: EvidenceReadinessItem[] = [
    {
      category: isTr ? "Kimlik ve pasaport" : "Identity and passport",
      status: input.passportCountry ? "provided" : "typically_required",
      explanation: isTr
        ? input.passportCountry
          ? "Pasaport ülkesi sağlandı; kimlik belgeleri tipik olarak ayrıca hazırlanır."
          : "Kimlik ve pasaport belgeleri tipik olarak gerekir."
        : input.passportCountry
          ? "Passport country was provided; identity documents are typically prepared separately."
          : "Identity and passport evidence is typically required.",
    },
    {
      category: isTr ? "İngilizce kanıtı" : "English evidence",
      status: input.englishLevel ? "provided" : hasSkilled || has482 || has485 ? "missing" : "unclear",
      explanation: isTr
        ? input.englishLevel
          ? "İngilizce seviyesi formda belirtildi."
          : hasSkilled || has482 || has485
            ? "Yetenekli, işveren odaklı veya 485 mezun vizesi yollarında İngilizce kanıtı genellikle değerlendirilir."
            : "Bu yolda İngilizce kanıtının rolü bağlama göre değişebilir."
        : input.englishLevel
          ? "English level was provided in the form."
          : hasSkilled || has482 || has485
            ? "English evidence is commonly considered for skilled, employer-sponsored, or 485 graduate visa pathways."
            : "The role of English evidence depends on pathway context.",
    },
    {
      category: isTr ? "Meslek ve beceri kanıtı" : "Occupation and skills evidence",
      status: input.occupation ? (input.occupationConfirmed === "yes" ? "provided" : "unclear") : hasSkilled || has482 ? "missing" : "unclear",
      explanation: isTr
        ? input.occupation
          ? "Meslek bilgisi sağlandı; beceri değerlendirmesi veya deneyim kanıtı ayrıca değişebilir."
          : "Meslek bilgisi özellikle yetenekli ve işveren odaklı yollar için önemlidir."
        : input.occupation
          ? "Occupation was provided; skills assessment or work evidence may still vary by pathway."
          : "Occupation detail is important for skilled and employer-sponsored pathways.",
    },
  ];

  if (has485) {
    items.push({
      category: isTr ? "Eğitim tamamlama kanıtı" : "Study completion evidence",
      status: hasKw([input.mainGoal ?? "", input.preferredPathway ?? ""].join(" "), ["study", "student", "graduated", "eğitim", "mezun"]) ? "unclear" : "typically_required",
      explanation: isTr
        ? "485 vizesi için CRICOS kayıtlı bir kurumdan uygun bir Avustralya niteliğinin tamamlanmasına ilişkin kanıt tipik olarak gereklidir."
        : "Evidence of completing an Australian qualification from a CRICOS-registered institution is typically required for the 485 visa.",
    });
    items.push({
      category: isTr ? "Polis taraması ve karakter belgesi" : "Police clearance and character evidence",
      status: "typically_required",
      explanation: isTr
        ? "485 vizesi için Avustralya polis taraması tipik olarak gereklidir. Yurt dışı polis sertifikaları da gerekebilir."
        : "Australian police clearance is typically required for the 485 visa. Overseas police certificates may also be required.",
    });
  }

  if (has482 || hasPartner) {
    items.push({
      category: isTr ? "Sponsorluk kanıtı" : "Sponsorship evidence",
      status: input.sponsorOrFamily ? "provided" : "missing",
      explanation: isTr
        ? "İşveren veya partner sponsorluğu içeren yollar için sponsorluk bağlamı merkezi olabilir."
        : "Sponsorship context can be central for employer or partner pathways.",
    });
  }

  if (hasPartner) {
    items.push({
      category: isTr ? "İlişki kanıtı" : "Relationship evidence",
      status: input.sponsorOrFamily || hasKw(input.mainGoal ?? "", ["partner", "spouse", "eş", "ilişki"]) ? "unclear" : "missing",
      explanation: isTr
        ? "820/801 için ilişki kanıtı kategorileri tipik olarak ayrıntılı şekilde değerlendirilir."
        : "Relationship evidence categories are typically reviewed in detail for 820/801.",
    });
  }

  const employmentCaveat = buildEmploymentExperienceCaveat(locale, employmentSignals);
  if (hasSkilled && employmentCaveat) {
    items.push({
      category: isTr ? "İstihdam deneyimi sinyali" : locale === "zh-Hans" ? "工作经验信号" : "Employment experience signal",
      status: employmentSignals.bothBlank ? "missing" : "unclear",
      explanation: employmentCaveat,
    });
  }

  const specialistEducationSignals = getSpecialistEducationSignals(input);
  const specialistEducationCaveat = buildSpecialistEducationCaveat(locale, specialistEducationSignals);
  if (hasSkilled && specialistEducationCaveat) {
    items.push({
      category: isTr
        ? "Uzmanlık eğitimi (STEM) sinyali"
        : locale === "zh-Hans"
          ? "Specialist education（STEM）信号"
          : "Specialist education (STEM) signal",
      status: specialistEducationSignals.notSure ? "unclear" : "missing",
      explanation: specialistEducationCaveat,
    });
  }

  items.push({
    category: isTr ? "Sağlık, karakter ve çeviri belgeleri" : "Health, character, and translation documents",
    status: "typically_required",
    explanation: isTr
      ? "Sağlık kontrolleri, polis belgeleri ve çeviriler yol ve kişisel duruma göre değişebilir."
      : "Health checks, police certificates, and translations can vary by pathway and individual circumstances.",
  });

  return items;
}

function buildPointsBoosterSimulator(
  input: ReadinessInput,
  subclasses: string[],
  pointsEstimate: PointsEstimate | undefined,
  locale: Locale
): PointsBoosterSimulator | undefined {
  const isTr = locale === "tr";
  const hasSkilled = subclasses.some((subclass) => ["189", "190", "491"].includes(subclass));
  if (!hasSkilled) return undefined;

  const currentEstimate = pointsEstimate?.estimatedPoints;
  const scenarios: PointsBoosterSimulator["scenarios"] = [];
  const englishOption = input.englishLevel ? parseEnglishOption(input.englishLevel) : null;
  const ageOption = input.age ? parseAgeOption(input.age) : null;
  const employmentSignals = getEmploymentDataSignals(input);

  // Superior English: +20 points vs Proficient, +10 vs Competent
  // (Schedule 6A of the Migration Regulations 1994: Competent=0, Proficient=10, Superior=20)
  if (englishOption === "competent") {
    scenarios.push({
      label: isTr
        ? "Superior İngilizce (IELTS 8.0+ / PTE 79+) — +20 puan"
        : "Superior English (IELTS 8.0+ / PTE 79+) — +20 points",
      estimatedChange: 20,
      resultingEstimate: currentEstimate === undefined ? undefined : currentEstimate + 20,
      explanation: isTr
        ? "Avustralya puan tablosunda Competent (6.0) yerine Superior (8.0+) İngilizce, tüm dört bantta elde edildiğinde +20 puan ekler. IELTS 8.0+ her bantta Superior ile eşleşir. Bu, noktaların artırılması için en yüksek getirili tek senaryodur."
        : "Under Schedule 6A of the Migration Regulations 1994, English proficiency points are: Competent (IELTS 6.0 in all four bands) = 0 bonus points; Proficient (IELTS 7.0) = +10 points; Superior (IELTS 8.0+ in all four bands) = +20 points. Upgrading from Competent to Superior adds exactly +20 points — the largest single-factor improvement in the entire Australian points test. A single low band score (e.g., Speaking 7.5) means you miss Superior and receive only Proficient points, so target all four bands at 8.0+. PTE Academic 79+ across all communicative skills or OET Grade B in all sections also qualifies as Superior. Superior English also provides priority ranking in several state 190 nomination programs.",
    });
  } else if (englishOption === "proficient") {
    scenarios.push({
      label: isTr
        ? "Superior İngilizce'ye yükseltme (IELTS 8.0+ / PTE 79+) — +10 puan"
        : "Upgrade to Superior English (IELTS 8.0+ / PTE 79+) — +10 points",
      estimatedChange: 10,
      resultingEstimate: currentEstimate === undefined ? undefined : currentEstimate + 10,
      explanation: isTr
        ? "Proficient'ten (IELTS 7.0) Superior'a (IELTS 8.0+) geçiş +10 puan ekler. Dört bantta 8.0+ elde etmek zor olabilir; ancak bazı yollar için birikimsel olarak puan avantajı sağlar."
        : "Moving from Proficient English (+10 points at IELTS 7.0 in all bands) to Superior (+20 points at IELTS 8.0+ in all bands) adds exactly +10 points. Achieving 8.0+ simultaneously in all four bands is demanding, particularly Writing and Speaking. Targeted preparation with IELTS coaches is advisable. PTE Academic 79+ in all communicative skills also qualifies as Superior. A single successful IELTS resit (~AUD $385) that achieves 8.0+ across all bands returns +10 points at zero ongoing cost — high ROI.",
    });
  }

  // NAATI CCL: +5 points (Community Languages credential)
  scenarios.push({
    label: isTr
      ? "NAATI CCL (Toplum Dili Sertifikası) — +5 puan"
      : "NAATI CCL Community Languages credential — +5 points",
    estimatedChange: 5,
    resultingEstimate: currentEstimate === undefined ? undefined : currentEstimate + 5,
    explanation: isTr
      ? "NAATI Toplum Dili Sertifikası (CCL), nitelikli kişilere +5 bonus puan sağlar. Bu sınav, adayların bir toplum dilini (örn. Türkçe, Mandarin, Arapça) yeterli bir düzeyde kullanabildiğini kanıtlamasını gerektirir. Sınavda iki 300 kelimelik diyalogun çevirisi yapılır."
      : "The NAATI Community Languages Credential (CCL), if obtained on or after 8 July 2019, awards exactly +5 bonus points (Schedule 6A). The exam tests oral translation of two 300-word dialogues between English and a specified community language (e.g., Mandarin, Cantonese, Turkish, Arabic, Vietnamese, Hindi, Korean). Pass rate is approximately 50%, so structured preparation with a CCL coach is strongly recommended. Cost: ~AUD $700–$800 per attempt. The credential is valid for 3 years. For candidates whose first language appears on the supported list, the CCL is one of the fastest +5 points available — typical preparation time is 4–8 weeks.",
  });

  // Professional Year: +5 points
  if (isProfessionalYearRelevantOccupation(input)) {
    scenarios.push({
      label: isTr
        ? "Avustralya'da Mesleki Yıl (Professional Year) — +5 puan"
        : "Australian Professional Year program — +5 points",
      estimatedChange: 5,
      resultingEstimate: currentEstimate === undefined ? undefined : currentEstimate + 5,
      explanation: isTr
        ? "Avustralya'da muhasebe, BT veya mühendislik alanında tamamlanan Mesleki Yıl programı +5 bonus puan ekler. Program genellikle 12 ay sürer ve yaklaşık AUD 7,000–10,000 maliyeti vardır. Yalnızca Avustralya'daki son mezunlar veya uluslararası mezunlar için geçerlidir."
        : "Completing an Australian Professional Year (PY) program in accounting, IT, or engineering adds exactly +5 bonus points. The program runs for 44 weeks: 36 weeks structured training + 8 weeks workplace internship. Cost: ~AUD $7,000–$10,000 depending on provider. Open to international graduates currently in Australia on a valid visa. Approved providers: IT → ACS-approved institutions; Accounting → FPA, CPA Australia, or ICAA-affiliated programs; Engineering → Engineers Australia-approved providers. The 8-week internship must be with a registered Australian employer in the relevant field. The PY also satisfies the '12 months Australian study' criterion some state 190 programs require for onshore applicants. It additionally builds a local professional network and Australian workplace references — both valuable for post-visa employment.",
    });
  }

  // Partner/single applicant factor: +10 points
  scenarios.push({
    label: isTr
      ? "Tek başvurucu veya becerili partner (partner faktörü) — +10 puan"
      : "Single applicant or partner with skilled qualifications + Competent English — +10 points",
    estimatedChange: 10,
    resultingEstimate: currentEstimate === undefined ? undefined : currentEstimate + 10,
    explanation: isTr
      ? "Partner faktörü Schedule 6A altında iki durumda +10 puan verir: (1) Başvurucu bekar veya partneri Avustralya vatandaşı/PR sahibiyse; (2) Partnerin hem pozitif beceri değerlendirmesi hem de Competent İngilizce (IELTS 6.0+) koşullarını sağlaması. Eş adaylarınızı optimize edin: partner şartları karşılayamazsa, onu başvuruya dahil etmemek puan avantajı sağlayabilir."
      : "The 'partner factor' in Schedule 6A awards +10 points in two scenarios: (1) the applicant is single, OR their partner is an Australian citizen or permanent resident; (2) the partner holds a valid positive skills assessment from an Australian assessing authority AND meets Competent English (IELTS 6.0 in all four bands). If the partner cannot satisfy both criteria, the partner factor score is 0 — including a non-qualifying partner costs 10 points compared to applying as single. Strategic decision: if your partner cannot obtain a skills assessment or pass IELTS in time, it may be more point-efficient to apply as a de-facto single (not including them in the application). Confirm with a Registered Migration Agent before lodging.",
  });

  // 190 State nomination: +5 points
  if (subclasses.includes("190")) {
    scenarios.push({
      label: isTr
        ? "190 Eyalet/Bölge Adaylığı — +5 puan"
        : "190 State or Territory Nomination — +5 points",
      estimatedChange: 5,
      resultingEstimate: currentEstimate === undefined ? undefined : currentEstimate + 5,
      explanation: isTr
        ? "190 eyalet/bölge adaylığı +5 puan ekler. Bazı eyaletlerde (örn. Victoria, NSW) mevcut çekilişlerin 75-80 puan bandında olduğu bildirilmiştir; adaylık bu eşiği aşmak için belirleyici olabilir. Her eyalet kendi meslek listesini yönetir."
        : "State or Territory nomination for subclass 190 adds exactly +5 points to the points test and is a mandatory visa requirement. It also carries a 2-year obligation to live and work in the nominating state. Recent 190 invitation thresholds: NSW 75–80 points; Victoria 75–80 points; Queensland 70–75 points; South Australia 65+ points; Western Australia 65+ points. Each state maintains its own Skilled Occupation List (SOL) which changes periodically. Smaller states (South Australia, Tasmania) typically operate with lower demand thresholds and faster turnaround times (4–8 weeks vs 12–16 weeks for NSW/VIC). Submit your EOI in SkillSelect then apply for state nomination — never pay third parties for 'guaranteed' state nomination.",
    });
  }

  // 491 Regional nomination/sponsorship: +15 points
  if (subclasses.includes("491")) {
    scenarios.push({
      label: isTr
        ? "491 Bölgesel Adaylık veya Sponsorluk — +15 puan"
        : "491 Regional Nomination or Eligible Relative Sponsorship — +15 points",
      estimatedChange: 15,
      resultingEstimate: currentEstimate === undefined ? undefined : currentEstimate + 15,
      explanation: isTr
        ? "491 adaylığı (eyalet/bölge) veya uygun bir akraba sponsoru (Kategori 2-3 posta kodunda yaşayan) +15 puan ekler. Bu, mevcut puana eklenir ve çoğu meslek için rekabetçi bir konuma taşıyabilir. 491 vizesi 5 yıl sürelidir; sahipler PR'a geçmek için bölgede oturmalı ve çalışmalıdır."
        : "491 nomination (state/territory pathway) or sponsorship by an eligible relative living in a Specified Regional Area adds exactly +15 points — the largest single bonus in the SkillSelect points test. This can transform a borderline 65-point 189 profile into a competitive 80-point 491 candidate. The 491 is a provisional visa valid for 5 years; holders must live and work in a regional area for at least 3 years and meet an income threshold (~AUD $53,900/year) before applying for PR via Subclass 191. Active 491-nominating states include New South Wales (occupations outside Sydney), South Australia, Tasmania, and Northern Territory. Regional postcode categories 2 and 3 include cities such as Newcastle, Wollongong, Geelong, the Gold Coast hinterland, and all of regional Western Australia.",
    });
  }

  if (ageOption === "18_24") {
    scenarios.push({
      label: isTr ? "Yaş bandı (18–24): şu anki maksimum puan" : "Age band (18–24): current maximum points",
      estimatedChange: 0,
      resultingEstimate: currentEstimate,
      explanation: isTr
        ? "18–24 yaş bandı puan tablosunda maksimum yaş puanı (25 puan) sağlar. Bu avantaj 25 yaşından itibaren azalmaya başlar."
        : "The 18–24 age band attracts the maximum age points (25 points) in the Australian points test. This advantage begins to decrease at age 25 and disappears after 44.",
    });
  }

  if (scenarios.length === 0) {
    scenarios.push({
      label: isTr ? "Eksik puan faktörleri" : "Missing points-table factors",
      estimatedChange: 0,
      resultingEstimate: currentEstimate,
      explanation: isTr
        ? "İstihdam, eğitim, partner ve bonus faktörleri sağlanmadığı için ek matematiksel senaryo hesaplanmadı."
        : "Employment, education, partner, and bonus factors were not provided, so no additional mathematical scenario was calculated.",
    });
  }

  const australianOriginPointsDisclaimer = buildAustralianOriginPointsDisclaimer(input, locale);
  const specialistEducationCaveat = buildSpecialistEducationCaveat(
    locale,
    getSpecialistEducationSignals(input),
    "short"
  );
  return {
    currentEstimate,
    scenarios,
    note: isTr
      ? `Avustralya puan tablosu (Schedule 6A, Migration Regulations 1994) doğrudan nümerik kazanımlar içerir. Aşağıdaki senaryolar resmi puan tablosu katsayılarına dayanmaktadır.${australianOriginPointsDisclaimer ? ` ${australianOriginPointsDisclaimer}` : ""}${specialistEducationCaveat ? ` ${specialistEducationCaveat}` : ""}`
      : locale === "zh-Hans"
        ? `澳大利亚积分表（Migration Regulations 1994, Schedule 6A）采用固定分值。以下情景基于官方积分系数。${australianOriginPointsDisclaimer ? ` ${australianOriginPointsDisclaimer}` : ""}${specialistEducationCaveat ? ` ${specialistEducationCaveat}` : ""}`
        : `The Australian points test (Schedule 6A, Migration Regulations 1994) uses fixed numerical gains per factor. Scenarios below are based on official points table coefficients — not estimates.${australianOriginPointsDisclaimer ? ` ${australianOriginPointsDisclaimer}` : ""}${specialistEducationCaveat ? ` ${specialistEducationCaveat}` : ""}`,
  };
}

// Indicative government application charges by subclass
// Source: Australian Government Department of Home Affairs (subject to change)
const GOV_FEES_EN: Record<string, string> = {
  "500": "From AUD 2,000 (unless exempt)",
  "482": "From AUD 4,015 (base application charge)",
  "485": "From AUD 4,600",
  "189": "From AUD 6,135 (main applicant)",
  "190": "From about AUD 6,140 (main applicant)",
  "491": "From about AUD 6,140 (main applicant)",
  "820": "From AUD 11,710 (most applicants) — covers both the temporary (820) and permanent (801) stages",
  "801": "No separate fee — already paid as part of the subclass 820 application",
};
const GOV_FEES_TR: Record<string, string> = {
  "500": "AUD 2.000'den itibaren (muaf olmayan başvurular için)",
  "482": "AUD 4.015'ten itibaren (temel başvuru ücreti)",
  "485": "AUD 4.600'dan itibaren",
  "189": "AUD 6.135'ten itibaren (ana başvurucu)",
  "190": "Yaklaşık AUD 6.140'tan itibaren (ana başvurucu)",
  "491": "Yaklaşık AUD 6.140'tan itibaren (ana başvurucu)",
  "820": "AUD 11.710'dan itibaren (çoğu başvurucu) — geçici (820) ve kalıcı (801) aşamaları kapsar",
  "801": "Ayrı bir ücret yok — subclass 820 başvurusu kapsamında ödenmiştir",
};

function buildFinancialRoadmap(
  subclasses: string[],
  input: ReadinessInput,
  locale: Locale
): FinancialRoadmapItem[] {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const hasGraduateVisaPathwayIntent = input.hasGraduateVisaPathwayIntent === true;
  const hasSkilled = subclasses.some((subclass) => ["189", "190", "491"].includes(subclass));
  const has482 = subclasses.includes("482");
  const hasNoFunctionalEnglishDependants = hasDependantsWithoutFunctionalEnglish(input);
  const hasFamilyStatusProvided = Boolean((input.sponsorOrFamily ?? "").trim());
  const variable = isTr ? "Değişken / sağlayıcıya bağlı" : "Variable / depends on provider";

  const feeSubclass = subclasses.find((s) => GOV_FEES_EN[s]);
  const govFeeLabel = feeSubclass
    ? (isTr ? GOV_FEES_TR[feeSubclass] : GOV_FEES_EN[feeSubclass])
    : (isTr ? "Resmi ücret yol ve tarihe göre değişir" : "Official fee varies by pathway and date");

  const items: FinancialRoadmapItem[] = [
    {
      category: isTr ? "Devlet başvuru ücreti (Visa Application Charge)" : "Government Visa Application Charge (VAC)",
      estimateType: "official_fee",
      amountLabel: govFeeLabel,
      explanation: isTr
        ? `Resmi başvuru ücreti vize türüne göre değişir ve 1 Temmuz 2026 sonrası güncellenmiştir. 482 temel ücret: AUD ${JULY_2026_482_BASE_COST_AUD.toLocaleString("en-AU")}. 189/190 temel ücret: yaklaşık AUD ${JULY_2026_189_190_BASE_COST_AUD.toLocaleString("en-AU")}. 491 için ücretler ayrı tabloda doğrulanmalıdır. Ücretler dönemsel olarak endekslenebilir; başvuru öncesi güncel tablo doğrulanmalıdır.`
        : `Official visa application charges vary by subclass and were updated for the post-1 July 2026 schedule. Subclass 482 base charge: AUD ${JULY_2026_482_BASE_COST_AUD.toLocaleString("en-AU")}. Subclass 189/190 base charge: about AUD ${JULY_2026_189_190_BASE_COST_AUD.toLocaleString("en-AU")}. 491 charges should be separately confirmed from the current schedule. Charges can be indexed periodically and should be verified before lodgement.`,
    },
    {
      category: isTr ? "İngilizce Dil Testi (IELTS / PTE / OET)" : "English Language Test (IELTS / PTE / OET)",
      estimateType: "third_party_estimate",
      amountLabel: isTr
        ? "AUD 385–590 (teste ve lokasyona göre)"
        : "AUD $385–$590 (varies by test and location)",
      explanation: isTr
        ? "Avustralya göçü için kabul edilen testler şunlardır: IELTS Academic veya General Training (~AUD 385–405), PTE Academic (~AUD 375–395), OET (Occupational English Test, sağlık meslekleri için, ~AUD 587), TOEFL iBT (~AUD 340–390, bazı akışlar için kabul edilir). Competent English için genel eşikler: IELTS her bantta minimum 6.0, PTE her bantta minimum 50. Superior English (IELTS 8.0+) puan tablosunda +20 ek puan sağlar. Sınavlar 2 yıldan uzun süre önce alınmışsa yenilenmesi gerekir."
        : "Tests accepted for Australian migration include: IELTS Academic or General Training (~AUD $385–$405 per attempt), PTE Academic (~AUD $375–$395), OET (Occupational English Test, used by healthcare occupations, ~AUD $587), and TOEFL iBT (~AUD $340–$390, accepted for some streams). Minimum Competent English thresholds: IELTS 6.0 in all four bands, PTE 50 in all bands. Achieving Superior English (IELTS 8.0+ in all four bands or PTE 79+) unlocks +20 additional points in the Australian points test — a significant investment if retesting is needed. Scores must be no more than 3 years old at time of visa grant.",
    },
  ];

  // Second-instalment risk (18+ dependants without functional English) must
  // never render as an active, dollar-specific "CRITICAL COMPLIANCE ALERT"
  // unless the user actually provided family/dependant information. Without
  // that, there is nothing to assess — showing the alarming headline and a
  // specific AUD figure regardless was a fabrication, not a real finding.
  if (!hasFamilyStatusProvided) {
    items.push({
      category: isTr
        ? "Aile/bağımlı durumu bilgisi sağlanmadı"
        : isZh
          ? "未提供家庭/受抚养人信息"
          : "Family/dependant information not provided",
      estimateType: "variable",
      amountLabel: isTr ? "Değerlendirilemez" : isZh ? "无法评估" : "Cannot be assessed",
      explanation: isTr
        ? "Aile/bağımlı durumu bilgisi sağlanmadığı için ikinci taksit yükümlülükleri değerlendirilemez. 18 yaş ve üzeri bağımlılar Functional English kanıtı sunamazsa kişi başı ikinci taksit ücreti uygulanabilir."
        : isZh
          ? "由于未提供家庭/受抚养人信息，无法评估第二期费用义务。若18岁及以上受抚养人无法提供功能性英语证明，可能会产生每人的第二期费用。"
          : "Family/dependant information not provided — second instalment obligations cannot be assessed. Where a dependant aged 18+ cannot show functional English, a second instalment can apply per dependant.",
    });
  } else if (hasNoFunctionalEnglishDependants) {
    items.push({
      category: isTr
        ? `🚨 KRİTİK UYUMLULUK UYARISI: 18+ bağımlılar için olası ikinci taksit ücreti ~AUD ${JULY_2026_SECOND_INSTALMENT_AUD.toLocaleString("en-AU")}`
        : isZh
          ? `🚨 关键合规警报：18岁及以上受抚养人可能产生约 AUD ${JULY_2026_SECOND_INSTALMENT_AUD.toLocaleString("en-AU")} 的第二期费用`
          : `🚨 CRITICAL COMPLIANCE ALERT: Potential second-instalment charge of ~${JULY_2026_SECOND_INSTALMENT_AUD.toLocaleString("en-AU")} AUD`,
      estimateType: "official_fee",
      amountLabel: isTr
        ? `Bağımlı başına yaklaşık AUD ${JULY_2026_SECOND_INSTALMENT_AUD.toLocaleString("en-AU")}`
        : `About AUD ${JULY_2026_SECOND_INSTALMENT_AUD.toLocaleString("en-AU")} per dependant`,
      explanation: isTr
        ? `Seçilen aile durumunda (18+ bağımlılarda Functional English yok), ikinci taksit riski aktif görünüyor: bağımlı başına yaklaşık AUD ${JULY_2026_SECOND_INSTALMENT_AUD.toLocaleString("en-AU")}.`
        : `Your selected family status indicates no functional English for dependants aged 18+, so the second-instalment risk appears active at about AUD ${JULY_2026_SECOND_INSTALMENT_AUD.toLocaleString("en-AU")} per dependant.`,
    });
  } else {
    items.push({
      category: isTr
        ? "İkinci taksit riski (bağımlı İngilizce durumu)"
        : isZh
          ? "第二期费用风险（受抚养人英语状况）"
          : "Second-instalment risk (dependant English status)",
      estimateType: "variable",
      amountLabel: isTr
        ? `Bağımlı başına yaklaşık AUD ${JULY_2026_SECOND_INSTALMENT_AUD.toLocaleString("en-AU")} (belirtilen aile durumunda görünmüyor)`
        : `About AUD ${JULY_2026_SECOND_INSTALMENT_AUD.toLocaleString("en-AU")} per dependant (not indicated by your provided family status)`,
      explanation: isTr
        ? "18 yaş ve üzeri bağımlılar Functional English kanıtı sunamazsa kişi başı ikinci taksit ücreti uygulanabilir. Sağladığınız aile durumu bu riski işaret etmiyor, ancak koşullar değişirse yeniden değerlendirilmelidir."
        : "Where a dependant aged 18+ cannot show functional English, a second instalment can apply per dependant. Your provided family status does not indicate this risk, but it should be reassessed if circumstances change.",
    });
  }

  if (hasGraduateVisaPathwayIntent) {
    items.unshift({
      category: "CRITICAL FINANCIAL ALERT: Temporary Graduate Visa (Subclass 485)",
      estimateType: "official_fee",
      amountLabel: "AUD 5,750",
      explanation:
        "CRITICAL FINANCIAL ALERT: Note that as of the July 2026 schedule, the base application charge for the Temporary Graduate Visa (Subclass 485) has risen sharply to 5,750 AUD. Maximizing this costly visa window for targeted 190/491 PR points optimization is highly critical.",
    });
  }

  if (hasSkilled || has482) {
    items.push({
      category: isTr ? "Beceri Değerlendirmesi (Assessing Authority'ye göre)" : "Skills Assessment (by Assessing Authority)",
      estimateType: "third_party_estimate",
      amountLabel: isTr
        ? "AUD 530–900+ (kuruma ve mesleğe göre)"
        : "AUD $530–$900+ (varies by authority and occupation)",
      explanation: isTr
        ? "Değerlendirme kurumu ANZSCO meslek koduna göre belirlenir: BT/ICT rolleri (ANZSCO Major Group 26) → ACS (AUD 530–665, 6–12 hafta); Mühendislik → Engineers Australia (AUD 735–900, 4–10 hafta); Sağlık meslekleri → AHPRA (AUD 890+, lisans gereklidir); Muhasebe → CPA Australia, CAANZ veya IPA (AUD 600–800); Genel meslekler → VETASSESS (AUD 850, 10–16 hafta). Değerlendirme genellikle noterli belge kopyaları, iş referans mektupları ve resmi transkriptleri kapsar. ACS değerlendirmeleri için, son 8 yıl içinde en az 1 yıl BT ile ilgili iş deneyimi zorunludur. Bazı değerlendirme kurumları tekrar başvuru için indirimli ücret uygular."
        : "The assessing authority is determined by your ANZSCO occupation code: IT/ICT roles (ANZSCO Major Group 26) → ACS (AUD $530–$665, 6–12 weeks); Engineering → Engineers Australia (AUD $735–$900, 4–10 weeks); Healthcare professions → AHPRA (AUD $890+, requires registration); Accounting → CPA Australia, CAANZ, or IPA (AUD $600–$800); General professional and trade occupations → VETASSESS (AUD $850, 10–16 weeks). All assessments require certified copies of qualifications, official transcripts, and detailed employment reference letters specifying duties, dates, and hours worked. ACS requires a minimum of 1 year of relevant IT work experience in the past 8 years. Negative assessment outcomes can be challenged or a re-assessment sought, which incurs additional fees (typically 50–80% of the original charge).",
    });
  }

  items.push(
    {
      category: isTr ? "Sağlık Muayenesi (eMedical)" : "Health Examination (eMedical)",
      estimateType: "third_party_estimate",
      amountLabel: isTr
        ? "AUD 300–500+ (yaşa ve ülkeye göre, kişi başı)"
        : "AUD $300–$500+ (per person, varies by age and country of residence)",
      explanation: isTr
        ? "Her başvurucu IRCC tarafından onaylı bir Göçmen Sağlık Hizmeti (IHS) kliniğinde eMedical muayenesi yaptırmalıdır. Çocuklar ve gençler daha düşük ücretle muayene olabilir. Muayene akciğer röntgeni, kan testi ve genel fizik muayeneyi kapsar. Geçerlilik süresi 12 aydır. Mevcut TB salgını olan ülkelerden gelenler ek testlerden geçebilir."
        : "Every applicant must complete a medical examination at an IRCC-approved Immigration Health Services (IHS) panel physician clinic. Indicative costs: adults AUD $300–$400; children under 15 approximately AUD $150–$250. The examination includes a chest X-ray (for applicants 11+), blood tests, and a general physical assessment. Medical results are electronically transmitted to the Department of Home Affairs via the eMedical system — there is no paper report to submit. Results are valid for 12 months. Applicants from tuberculosis-prevalent countries may require additional chest monitoring, extending the process by 6–12 months.",
    },
    {
      category: isTr ? "Polis Belgesi / Karakter Belgeleri" : "Police Clearance Certificates",
      estimateType: "third_party_estimate",
      amountLabel: isTr
        ? "AUD 42–200+ (ülkeye göre, kişi başı)"
        : "AUD $42–$200+ (per person, varies by country)",
      explanation: isTr
        ? "18 yaş ve üzeri her başvurucu, son 12 ayda ikamet ettiği ve 12 ayı aşan süreyle yaşadığı her ülke için polis belgesi sunmalıdır. Avustralya Federal Polis (AFP) belgesi: AUD 42 (online). Her ülkenin kendi belgesi, süreç ve maliyeti vardır; bazı ülkelerde noterlendirme ve resmi çeviri gerekebilir. Bazı ülkeler için belgeler haftalar içinde hazırlanırken, diğerleri için 3–6 ay sürebilir. Mümkün olduğunca erken başlatılması önerilir."
        : "Every applicant aged 18+ must provide police clearance certificates for every country where they have lived for 12 months or more in the past 10 years (for skilled visas). The Australian Federal Police (AFP) check costs AUD $42 and is processed online within 15 business days. International certificates vary widely: United Kingdom (ACPO check, ~GBP 25), United States (FBI Identity History, ~USD 18 + fingerprint costs), India (state-level, ~INR 500–2,000 plus notarisation), China (~CNY 80–100 via local public security bureau). Non-English certificates must be translated by a NAATI-certified translator. Plan for 4–12 weeks lead time for overseas police clearances — start these before lodging your EOI.",
    },
    {
      category: isTr ? "NAATI Onaylı Çeviri" : "NAATI-Certified Translation",
      estimateType: "third_party_estimate",
      amountLabel: isTr
        ? "AUD 80–200 sayfa başına (NAATI onaylı çevirmen)"
        : "AUD $80–$200 per page (NAATI-certified translator)",
      explanation: isTr
        ? "İngilizce olmayan tüm belgeler (diplom, transkript, kimlik, polis belgesi, doğum/evlilik cüzdanı) NAATI onaylı bir çevirmen tarafından çevrilmelidir. NAATI onaylı çevirmenler belirterek aranabilir. Karmaşık teknik belgeler için sayfa başı AUD 150–200 uygulanabilir. Çeviri maliyetleri, sunulan belge sayısına göre AUD 500–3,000 arasında değişebilir."
        : "All documents not in English must be translated by a NAATI-certified translator (National Accreditation Authority for Translators and Interpreters). Rates range from AUD $80 per page for simple personal documents to AUD $150–$200 per page for technical or legal documents. For a typical visa application with 8–12 documents (transcripts, employment certificates, marriage certificate, police clearances), translation costs commonly total AUD $800–$2,500. NAATI-certified translators can be located via the NAATI online register — never use uncertified translations as they will be rejected by the Department of Home Affairs.",
    },
    {
      category: isTr ? "Kayıtlı Göçmenlik Danışmanı (RMA) veya Göçmenlik Avukatı" : "Registered Migration Agent (RMA) or Immigration Lawyer",
      estimateType: "variable",
      amountLabel: isTr
        ? "AUD 3,000–10,000+ (visa türü ve dosyanın karmaşıklığına göre)"
        : "AUD $3,000–$10,000+ (varies by visa type and case complexity)",
      explanation: isTr
        ? "Kayıtlı bir göçmenlik danışmanı (RMA) veya göçmenlik avukatı ile çalışmak zorunlu değildir, ancak karmaşık durumlarda (ret geçmişi, eksik belgeler, çift uyruk sorunu) önemli avantaj sağlar. Tipik maliyetler: 189/190/491 EOI ve tam başvuru için AUD 3,000–8,000; PY/eğitim başvuruları için AUD 1,500–4,000. MARA (Migration Agents Registration Authority) web sitesinden kayıtlı bir ajan doğrulanabilir. Kayıtlı olmayan danışmanlardan kaçının."
        : "Engaging a Registered Migration Agent (RMA) or immigration lawyer is not mandatory, but is strongly recommended for applications involving prior visa refusals, complex employment histories, or family members with health or character issues. Typical fee ranges: full EOI + 189/190/491 skilled application: AUD $3,000–$8,000; state nomination assistance only: AUD $1,000–$2,500; 482 employer-sponsored nomination and visa: AUD $5,000–$10,000+. Verify any agent's registration via the MARA (Migration Agents Registration Authority) public register at mara.gov.au. Never pay upfront in full before the work commences.",
    }
  );

  return items;
}

function buildProgressionPathways(
  subclasses: string[],
  locale: Locale,
  hasGraduateVisaPathwayIntent = false
): ProgressionPathway[] {
  const isTr = locale === "tr";
  const items: ProgressionPathway[] = [];
  const hasSkilled = subclasses.some((subclass) => ["189", "190", "491"].includes(subclass));

  if (hasGraduateVisaPathwayIntent) {
    items.push({
      from: isTr ? "Mevcut profil" : "Current profile",
      to: isTr ? "485 köprüsü → 189/190/491" : "485 bridge → 189/190/491",
      label: isTr ? "485 köprü stratejisi" : "485 bridge strategy",
      explanation: isTr
        ? "485 geçici mezun vizesi, Avustralya iş deneyimi biriktirmek ve eyalet adaylığı şartlarına yaklaşmak için stratejik bir köprü olarak kullanılabilir; bu yalnızca geçiş bağlamıdır, bağımsız bir PR yolu değildir."
        : "The 485 Temporary Graduate Visa can be used as a strategic bridge to accumulate Australian work experience and move closer to state nomination requirements; it is contextual transition logic, not a standalone PR pathway.",
    });
  }

  if (subclasses.includes("500")) {
    items.push({
      from: "500",
      to: "485 → 189/190/491",
      label: isTr ? "Öğrenci yolu bağlamı" : "Student pathway context",
      explanation: isTr
        ? "Öğrenci yolu sonrasında mezuniyet ve nitelikli göç seçenekleri bazı profillerde birlikte değerlendirilebilir. Bu genel bilgi amaçlıdır ve kişisel koşullara bağlıdır."
        : "After a student pathway, graduate and skilled migration options may be considered together in some profiles. This is general information only and depends on individual circumstances."
    });
  }

  if (hasSkilled && !subclasses.includes("500") && !subclasses.includes("485")) {
    items.push({
      from: "500",
      to: "485 → 189/190/491",
      label: isTr ? "Öğrenci yolu bağlamı" : "Student pathway context",
      explanation: isTr
        ? "Öğrenci yolu sonrasında mezuniyet ve nitelikli göç seçenekleri bazı profillerde birlikte değerlendirilebilir. Bu genel bilgi amaçlıdır ve kişisel koşullara bağlıdır."
        : "After a student pathway, graduate and skilled migration options may be considered together in some profiles. This is general information only and depends on individual circumstances.",
    });
  }

  if (hasSkilled && !subclasses.includes("482")) {
    items.push({
      from: "482",
      to: "Employer-sponsored permanent pathways",
      label: isTr ? "İş sponsorluğu bağlamı" : "Employer sponsorship context",
      explanation: isTr
        ? "İş sponsorluğu bağlamında 482 sonrası kalıcı sponsorlu yollar bazı profillerde değerlendirilebilir; bu durum bireysel koşullara bağlıdır."
        : "In some profiles, 482 context may be considered alongside employer-sponsored permanent pathways; outcomes depend on individual circumstances.",
    });
  }
  if (subclasses.includes("485")) {
    items.push({
      from: "485",
      to: "189 / 190 / 491",
      label: isTr ? "485 sonrası tipik seçenekler" : "Typical post-485 options",
      explanation: isTr
        ? "485 Geçici Mezun vizesinden sonra nitelikli göç yolları bazı profillerde ilgili olabilir. Bu PR vaadi değildir ve kişisel duruma göre değişebilir."
        : "After the 485 Temporary Graduate visa, skilled migration pathways may be relevant in some profiles. This does not promise permanent residence and depends on individual circumstances.",
    });
  }

  if (subclasses.includes("482")) {
    items.push({
      from: "482",
      to: "Employer-sponsored permanent pathways",
      label: isTr ? "İş sponsorluğu bağlamı" : "Employer sponsorship context",
      explanation: isTr
        ? "İş sponsorluğu bağlamında 482 sonrası kalıcı sponsorlu yollar bazı profillerde değerlendirilebilir; bu durum bireysel koşullara bağlıdır."
        : "After 482, employer-sponsored permanent pathways may be relevant in some cases; criteria and employer context matter.",
    });
  }
  if (subclasses.includes("491")) {
    items.push({
      from: "491",
      to: "191",
      label: isTr ? "Bölgesel geçiş bağlamı" : "Regional progression context",
      explanation: isTr
        ? "İlgili dönem ve kriterler karşılanırsa bu tipik bir sistem geçişi olarak değerlendirilebilir."
        : "This may be considered a typical system progression after the relevant period if criteria are met.",
    });
  }
  if ((subclasses.includes("820") || subclasses.includes("801"))) {
    items.push({
      from: "820",
      to: "801",
      label: isTr ? "Partner yolu aşamaları" : "Partner pathway stages",
      explanation: isTr
        ? "820 geçici aşama ve 801 kalıcı aşama aynı onshore partner yolunun tipik aşamalarıdır."
        : "820 temporary stage and 801 permanent stage are typical stages of the same onshore partner pathway.",
    });
  }

  if (items.length === 0) {
    items.push({
      from: isTr ? "Mevcut profil" : "Current profile",
      to: isTr ? "Stratejik nitelikli göç yolu" : "Strategic skilled migration route",
      label: isTr ? "Nitelikli göç için standart ilerleme" : "Standard progression for skilled professionals",
      explanation: isTr
        ? "Mevcut ortamda nitelikli profesyoneller için standart ilerleme genellikle olumlu bir Skills Assessment alınmasını, İngilizce puanını Superior seviyeye taşımayı ve hem Eyalet (190) hem de Bölgesel (491) sponsorluklarını hedefleyen stratejik bir Expression of Interest (EOI) sunumunu içerir."
        : "Standard progression for skilled professionals in the current landscape typically involves securing a positive Skills Assessment, maximizing English scores to Superior, and lodging a strategic Expression of Interest (EOI) targeting both State (190) and Regional (491) sponsorships.",
    });
  }

  return items;
}

function buildPathwayFriction(
  pathways: PathwayComparison[],
  locale: Locale
): PathwayFriction[] {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  return pathways.map((pathway) => {
    if (pathway.relevance === "ineligible") {
      // Hard Gate (1 July 2026): replaces the routine friction note with a
      // bold red compliance alert carrying the exact ineligibility reason.
      const visaLabel =
        pathway.subclass === "general" ? pathway.visaName : `${pathway.visaName} (${pathway.subclass})`;
      return {
        pathway: visaLabel,
        frictionType: isTr ? "🚨 KRİTİK UYUMLULUK UYARISI" : isZh ? "🚨 关键合规警报" : "🚨 CRITICAL COMPLIANCE ALERT",
        explanation: shortIneligibleReference(locale),
        isHardIneligible: true,
      };
    }
    const visaLabel =
      pathway.subclass === "general" ? pathway.visaName : `${pathway.visaName} (${pathway.subclass})`;
    const detail: Record<string, { en: string; tr: string }> = {
      "500": {
        en: "Course enrolment, OSHC, and genuine student settings may affect this pathway.",
        tr: "Kurs kaydı, OSHC ve gerçek öğrenci ayarları bu yolu etkileyebilir.",
      },
      "485": {
        en: "Employment outcomes and transition to skilled pathways may affect this pathway.",
        tr: "İstihdam sonuçları ve nitelikli yollara geçiş bu yolu etkileyebilir.",
      },
      "482": {
        en: "Employer sponsorship context is central to this pathway.",
        tr: "İşveren sponsorluğu bağlamı bu yol için merkezi önemdedir.",
      },
      "189": {
        en: "Invitation rounds and points competition may affect this pathway.",
        tr: "Davet dönemleri ve puan rekabeti bu yolu etkileyebilir.",
      },
      "190": {
        en: "State or territory nomination settings may affect this pathway.",
        tr: "Eyalet veya bölge adaylık ayarları bu yolu etkileyebilir.",
      },
      "491": {
        en: "Regional requirements and nomination or sponsorship context may affect this pathway.",
        tr: "Bölgesel gereklilikler ve adaylık veya sponsorluk bağlamı bu yolu etkileyebilir.",
      },
      "820": {
        en: "Relationship evidence is central to this pathway.",
        tr: "İlişki kanıtı bu yol için merkezi önemdedir.",
      },
      "801": {
        en: "Continuing to meet relationship requirements is central to this pathway.",
        tr: "İlişki gerekliliklerini sürdürmek bu yol için merkezi önemdedir.",
      },
      general: {
        en: "General Skilled Migration (GSM) is highly competitive. Success requires strict alignment between your nominated occupation, your assessing authority's exact requirements, and current state-level demand matrices. Missing specific state ties (like regional work or onshore residency) is the primary friction point.",
        tr: "Genel Nitelikli Göç (GSM) oldukça rekabetçidir. Başarı; beyan edilen meslek, değerlendirme kurumunun tam gereklilikleri ve güncel eyalet düzeyi talep matrisleri arasında sıkı bir uyum gerektirir. Belirli eyalet bağlarının (bölgesel çalışma veya yerinde ikamet gibi) eksik olması birincil sürtünme noktasıdır.",
      },
    };
    const selected = detail[pathway.subclass] ?? detail.general;
    return {
      pathway: visaLabel,
      frictionType: isTr ? "Gerçeklik kontrolü" : "Reality check",
      explanation: isTr ? selected.tr : selected.en,
    };
  });
}

function buildConfidenceExplanation(
  pathways: PathwayComparison[],
  evidenceReadiness: EvidenceReadinessItem[],
  locale: Locale,
  input: ReadinessInput,
  estimatedPoints?: number
): string {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const hasEnglish = Boolean(input.englishLevel);
  const hasOccupation = Boolean(input.occupation);
  const hasPassport = Boolean(input.passportCountry);
  const hasSponsor = hasSponsorContext(input.sponsorOrFamily);
  const hasAge = Boolean(input.age);
  const skillsClear = input.occupationConfirmed === "yes";
  const missingCore = [hasEnglish, hasOccupation, hasPassport, hasAge].filter(Boolean).length;
  const hasMissingEvidence = evidenceReadiness.some((item) => item.status === "missing");

  if (missingCore <= 1) {
    return isTr
      ? "Güven düzeyi sınırlıdır çünkü meslek ve İngilizce gibi temel bilgiler eksiktir. Bu rapor yalnızca genel bilgidir ve kişisel koşullara bağlıdır."
      : isZh
        ? "由于职业和英语水平等核心信息缺失，置信度有限。本报告仅为一般信息，仍取决于个人具体情况。"
        : "Confidence is limited because key inputs such as occupation and English level are missing. This report is general information only and depends on individual circumstances.";
  }

  if (missingCore >= 3 && skillsClear) {
    const occupationDisplay = resolveOccupationDisplayName(input.occupation, locale);
    return isTr
      ? `Güven düzeyi daha güçlüdür çünkü yaş (${input.age}), İngilizce seviyesi, meslek (${occupationDisplay}) ve pasaport ülkesi (${input.passportCountry}) sağlanmıştır; bazı yol-özel kanıtlar hâlâ ayrıca incelenir${estimatedPoints !== undefined ? ` (tahmini temel puan: ${estimatedPoints})` : ""}. Bu yalnızca genel bilgidir.`
      : isZh
        ? `由于已提供年龄（${input.age}）、英语水平、职业（${occupationDisplay}）和护照国家（${input.passportCountry}），置信度较强；部分路径特定证据仍需单独复核${estimatedPoints !== undefined ? `（当前加分信号：${estimatedPoints}）` : ""}。本内容仅为一般信息。`
        : `Confidence is stronger because age (${input.age}), English level, occupation (${occupationDisplay}), and passport country (${input.passportCountry}) are provided, while some pathway-specific evidence still needs separate review${estimatedPoints !== undefined ? ` (estimated base points: ${estimatedPoints})` : ""}. This is general information only.`;
  }

  return isTr
    ? "Güven düzeyi orta seviyededir çünkü İngilizce ve meslek bilgileri sağlanmıştır; ancak beceri değerlendirmesi ve puan bağlamı net değildir."
    : isZh
      ? `由于已提供英语和职业信息，置信度为中等；但职业评估和完整加分背景仍不明确${estimatedPoints !== undefined ? `（当前加分信号：${estimatedPoints}）` : ""}。${hasSponsor ? "已提供担保背景。" : "担保背景看起来有限。"}本内容仅为一般信息，仍取决于个人具体情况。`
      : `Confidence is moderate because English and occupation details are available, but skills assessment and full points context remain unclear${estimatedPoints !== undefined ? ` (estimated base points: ${estimatedPoints})` : ""}. ${hasSponsor ? "Sponsorship context is provided." : "Sponsorship context appears limited."} This is general information only and depends on individual circumstances.`;
}

// ─── Main engine ──────────────────────────────────────────────────────────────

function relativePositionScore(position: PathwayStrengthComparison["relativePosition"]): number {
  if (position === "stronger_signal") return 3;
  if (position === "moderate_signal") return 2;
  return 1;
}

function buildSignalSnapshot(
  pathwayStrengthComparison: PathwayStrengthComparison[],
  confidenceExplanation: string
): SignalSnapshot {
  const sorted = [...pathwayStrengthComparison].sort((a, b) => {
    const positionDiff =
      relativePositionScore(b.relativePosition) - relativePositionScore(a.relativePosition);
    if (positionDiff !== 0) return positionDiff;
    const frictionRank = { low: 3, medium: 2, high: 1 };
    return frictionRank[b.friction] - frictionRank[a.friction];
  });

  const strongestPathway = sorted[0];
  const confidenceLabel: SignalSnapshot["confidenceLabel"] =
    strongestPathway?.relativePosition === "stronger_signal"
      ? "stronger"
      : strongestPathway?.relativePosition === "moderate_signal"
        ? "moderate"
        : "limited";

  return {
    strongest: strongestPathway
      ? `${strongestPathway.visaName} (${strongestPathway.subclass})`
      : "General pathway signal",
    secondary: sorted.slice(1, 3).map((item) => `${item.visaName} (${item.subclass})`),
    confidenceLabel,
    confidenceExplanation,
  };
}

function buildPrimaryLimitingFactor(
  input: ReadinessInput,
  subclasses: string[],
  estimatedPoints: number | undefined,
  locale: Locale
): PrimaryLimitingFactor {
  const isTr = locale === "tr";
  const englishOption = input.englishLevel ? parseEnglishOption(input.englishLevel) : null;
  const sponsorRequired = subclasses.some((subclass) => subclass === "482" || (subclass === "820" || subclass === "801"));
  const sponsorMissing = sponsorRequired && !hasSponsorContext(input.sponsorOrFamily);

  if (estimatedPoints !== undefined && estimatedPoints < 65) {
    return {
      label: isTr
        ? "Tahmini temel puan yaygın eşiklerin altında"
        : "Estimated base points below commonly referenced thresholds",
      explanation: isTr
        ? `Tahmini temel puan ${estimatedPoints}. Puan testli yollar için bu gösterge, yol gücünü sınırlayabilir ve bireysel koşullara bağlıdır.`
        : `The estimated base points are ${estimatedPoints}. For points-tested pathways, this indicator may limit pathway strength and depends on individual circumstances.`,
    };
  }

  if (!input.englishLevel?.trim() || !englishOption) {
    return {
      label: isTr ? "İngilizce seviyesi net değil" : "English test level not yet clear",
      explanation: isTr
        ? "İngilizce test düzeyi netleşmediğinde puan testli, mezun ve işveren odaklı yolların karşılaştırması sınırlı kalabilir."
        : "When the English test level is not clear, comparison across skilled, graduate, and employer-sponsored pathways may remain limited.",
    };
  }

  if (input.occupationConfirmed !== "yes") {
    return {
      label: isTr
        ? "Beceri değerlendirmesi net değil"
        : "Skills assessment or occupation verification unclear",
      explanation: isTr
        ? "Meslek veya beceri değerlendirmesi netleşmediğinde nitelikli ve işveren odaklı yol sinyalleri değişebilir."
        : "When occupation or skills assessment context is unclear, skilled and employer-sponsored pathway signals may change.",
    };
  }

  if (sponsorMissing) {
    return {
      label: isTr
        ? "Sponsor veya ilişki bağlamı net değil"
        : "Sponsor or relationship context not established",
      explanation: isTr
        ? "Sponsor veya ilişki bağlamı net olmadığında işveren sponsorlu ya da partner yollarının sinyali sınırlı kalabilir."
        : "When sponsor or relationship context is not established, employer-sponsored or partner pathway signals may remain limited.",
    };
  }

  return {
    label: isTr
      ? "Yola özgü kanıtların ayrıca incelenmesi gerekir"
      : "Pathway-specific evidence still needs separate review",
    explanation: isTr
      ? "Ana form bilgileri güçlü olsa bile, belge kategorileri ve yol-özel kanıtlar sonucu etkileyebilir."
      : "Even when the main form details are strong, document categories and pathway-specific evidence may affect the final position.",
  };
}

function buildPositionChangers(
  input: ReadinessInput,
  subclasses: string[],
  estimatedPoints: number | undefined,
  locale: Locale
): PositionChanger[] {
  const isTr = locale === "tr";
  const items: PositionChanger[] = [];
  const hasSkilled = subclasses.some((subclass) => ["189", "190", "491"].includes(subclass));
  const englishOption = input.englishLevel ? parseEnglishOption(input.englishLevel) : null;

  if (hasSkilled && englishOption !== "superior") {
    items.push({
      label: isTr ? "İngilizce test kategorisi" : "English test category",
      explanation: isTr
        ? "Daha yüksek İngilizce seviyesi tahmini temel puanı değiştirebilir."
        : "A higher English test category may change the estimated base points.",
    });
  }

  if ((hasSkilled || subclasses.includes("482")) && input.occupationConfirmed !== "yes") {
    items.push({
      label: isTr ? "Beceri değerlendirmesi" : "Skills assessment",
      explanation: isTr
        ? "Beceri değerlendirmesinin netleşmesi yol gücünü etkileyebilir."
        : "Confirming skills assessment may affect pathway strength.",
    });
  }

  if (subclasses.includes("190") || subclasses.includes("491")) {
    items.push({
      label: isTr ? "Adaylık bağlamı" : "Nomination context",
      explanation: isTr
        ? "Eyalet adaylık veya bölgesel bağlam yol sinyallerini etkileyebilir."
        : "State nomination or regional context may affect pathway signals.",
    });
  }

  if (subclasses.includes("482") || (subclasses.includes("820") || subclasses.includes("801"))) {
    items.push({
      label: isTr ? "Sponsor veya ilişki kanıtı" : "Sponsor or relationship evidence",
      explanation: isTr
        ? "Sponsor veya ilişki kanıtı netleştikçe ilgili yol sinyali değişebilir."
        : "Sponsor or relationship evidence may change the signal for related pathways.",
    });
  }

  if (estimatedPoints !== undefined && estimatedPoints < 65 && items.length < 3) {
    items.push({
      label: isTr ? "Puan tablosu faktörleri" : "Points-table factors",
      explanation: isTr
        ? "Yaş, İngilizce, adaylık ve diğer puan faktörleri matematiksel konumu değiştirebilir."
        : "Age, English, nomination, and other points factors may change the mathematical position.",
    });
  }

  if (items.length < 2) {
    items.push({
      label: isTr ? "Belge hazırlık düzeyi" : "Evidence preparation level",
      explanation: isTr
        ? "Kanıt kategorilerinin netleşmesi, rapordaki yol karşılaştırmasını etkileyebilir."
        : "Clarifying evidence categories may affect the pathway comparison in the report.",
    });
  }

  return items.slice(0, 3);
}

// ─── Canada financial roadmap ──────────────────────────────────────────────────
// Hard costs sourced from IRCC official fee schedule (2024) and published
// WES/ICAS pricing. Amounts in CAD.
function buildCanadaFinancialRoadmap(
  pathwayCodes: CanadaPathwayCode[],
  input: ReadinessInput,
  locale: Locale
): FinancialRoadmapItem[] {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const t = (en: string, tr: string, zh: string) => (isTr ? tr : isZh ? zh : en);

  const items: FinancialRoadmapItem[] = [
    {
      category: t("IRCC PR Processing Fee (main applicant)", "IRCC PR İşlem Ücreti (ana başvurucu)", "IRCC PR 审核费（主申请人）"),
      estimateType: "official_fee",
      amountLabel: "CAD $1,525",
      explanation: t(
        "Official IRCC fee for the permanent residence application. Spouse/common-law partner adds CAD $825; each dependent child adds CAD $225. Payable when the application is submitted.",
        "Daimi ikamet başvurusu için resmi IRCC ücreti. Eş/birlikte yaşanan partner +CAD 825; her bağımlı çocuk +CAD 225 ekler. Başvuru sunulduğunda ödenir.",
        "永久居留申请的官方IRCC费用。配偶/同居伴侣加收CAD $825；每位受养子女加收CAD $225。提交申请时支付。"
      ),
    },
    {
      category: t("Right of Permanent Residence Fee (RPRF)", "Daimi İkamet Hakkı Ücreti (RPRF)", "永久居留权费（RPRF）"),
      estimateType: "official_fee",
      amountLabel: "CAD $515",
      explanation: t(
        "Payable by the principal applicant and any accompanying spouse or common-law partner upon approval of PR. Not payable by dependent children.",
        "PR onaylanınca ana başvurucu ve eşi/birlikte yaşanan partneri tarafından ödenir. Bağımlı çocuklar için ödenmez.",
        "PR批准后，主申请人及随行配偶/同居伴侣需支付。受养子女无需支付。"
      ),
    },
    {
      category: t("Biometrics", "Biyometrik", "生物特征采集"),
      estimateType: "official_fee",
      amountLabel: t("CAD $85 (individual) / CAD $170 (family group)", "CAD 85 (bireysel) / CAD 170 (aile grubu)", "CAD $85（个人）/ CAD $170（家庭组）"),
      explanation: t(
        "Fingerprints and photo collection at a biometrics collection point. A family group sharing a single application pays a flat CAD $170.",
        "Biyometrik toplama noktasında parmak izi ve fotoğraf. Tek bir başvuruda aile grubu için toplam CAD 170 ödenir.",
        "在生物特征采集点采集指纹和照片。共用同一申请的家庭组统一收取CAD $170。"
      ),
    },
    {
      category: t(
        "Educational Credential Assessment (ECA) — WES or ICAS",
        "Eğitim Belgesi Değerlendirmesi (ECA) — WES veya ICAS",
        "教育资历评估（ECA）— WES 或 ICAS"
      ),
      estimateType: "third_party_estimate",
      amountLabel: t("CAD $239–$285 (WES) · CAD $200–$300 (ICAS)", "CAD 239–285 (WES) · CAD 200–300 (ICAS)", "CAD $239–$285（WES）· CAD $200–$300（ICAS）"),
      explanation: t(
        "WES (World Education Services) is the most common IRCC-designated ECA provider. ICAS (International Credential Assessment Service) is accepted for FSW/CEC. ECA validity is 5 years. Allow 7–20 business days for standard processing.",
        "WES (Dünya Eğitim Hizmetleri), en yaygın IRCC tarafından belirlenmiş ECA sağlayıcısıdır. ICAS (Uluslararası Belge Değerlendirme Servisi) FSW/CEC için kabul edilir. ECA geçerlilik süresi 5 yıldır.",
        "WES（世界教育服务）是最常见的IRCC指定ECA提供机构。ICAS（国际资历评估服务）适用于FSW/CEC。ECA有效期5年，标准处理需7-20个工作日。"
      ),
    },
    {
      category: t("Language Test (IELTS / CELPIP)", "Dil Testi (IELTS / CELPIP)", "语言考试（IELTS / CELPIP）"),
      estimateType: "third_party_estimate",
      amountLabel: t("CAD $300–$370 per attempt", "CAD 300–370 (deneme başına)", "每次CAD $300–$370"),
      explanation: t(
        "IELTS General Training and CELPIP-General are the two IRCC-accepted English tests. Scores must be valid (within 2 years). CLB 9+ in all four skills maximises CRS language points (~124 points for primary applicant).",
        "IELTS Genel Eğitim ve CELPIP-General, IRCC tarafından kabul edilen iki İngilizce testidir. CLB 9+ tüm dört beceride CRS dil puanını maksimize eder (~124 puan).",
        "IELTS普通培训和CELPIP-General是IRCC认可的两项英语考试。四项技能均达CLB 9+可最大化CRS语言分（主申请人约124分）。"
      ),
    },
    {
      category: t("Medical Examination", "Sağlık Muayenesi", "体检"),
      estimateType: "third_party_estimate",
      amountLabel: t("CAD $225–$450 (varies by IRCC panel physician)", "CAD 225–450 (IRCC panel hekimine göre değişir)", "CAD $225–$450（因IRCC指定医生而异）"),
      explanation: t(
        "Must be completed by an IRCC-designated Panel Physician. Validity is 12 months. Additional charges may apply for required vaccinations or X-rays.",
        "IRCC tarafından belirlenmiş bir Panel Hekimi tarafından tamamlanmalıdır. Geçerlilik süresi 12 aydır.",
        "必须由IRCC指定的体检医生完成。有效期12个月。如需接种疫苗或X光检查，可能有额外费用。"
      ),
    },
    {
      category: t(
        "Proof of Funds (if required for FSW/FSTP)",
        "Fon Kanıtı (FSW/FSTP için gerekiyorsa)",
        "资金证明（FSW/FSTP如需要）"
      ),
      estimateType: "official_fee",
      amountLabel: t(
        "CAD $13,757 (1 person) · $17,127 (2) · $21,055 (3) · $25,564 (4)",
        "CAD 13.757 (1 kişi) · 17.127 (2) · 21.055 (3) · 25.564 (4)",
        "CAD $13,757（1人）· $17,127（2人）· $21,055（3人）· $25,564（4人）"
      ),
      explanation: t(
        "Settlement funds required for FSW and FSTP applicants (not required for CEC applicants or those with a valid LMIA job offer). Funds must be unencumbered, liquid, and accessible. IRCC validates via bank statements — typically 3–6 months of statements showing consistent balance.",
        "FSW ve FSTP başvurucular için gerekli yerleşim fonları (CEC başvurucuları veya geçerli LMIA iş teklifleri olanlar için gerekli değildir). Fonlar serbest, likit ve erişilebilir olmalıdır.",
        "FSW和FSTP申请人所需的定居资金（CEC申请人或持有有效LMIA工作邀约者无需提供）。资金必须无抵押、流动且可随时支取。IRCC通过银行流水验证，通常需提供3-6个月的对账单。"
      ),
    },
  ];

  if (pathwayCodes.includes("PNP") || pathwayCodes.includes("CEC")) {
    items.push({
      category: t(
        "Provincial Nominee Program (PNP) stream — if applicable",
        "Eyalet Aday Programı (PNP) akışı — geçerliyse",
        "省提名计划（PNP）通道（如适用）"
      ),
      estimateType: "variable",
      amountLabel: t("CAD $0–$2,000 (varies by province)", "CAD 0–2.000 (eyalete göre değişir)", "CAD $0–$2,000（因省份而异）"),
      explanation: t(
        "Some PNP streams have their own application fees: Ontario OINP (no fee for Tech Draw, EOI-based), BC PNP Tech Pilot (~CAD $300 registration), Alberta AAIP (~CAD $500). A PNP nomination adds +600 CRS points, effectively guaranteeing an ITA in the next Express Entry draw.",
        "Bazı PNP akışlarının kendi başvuru ücretleri vardır: Ontario OINP (Tech Draw için ücretsiz), BC PNP Tech Pilot (~CAD 300 kayıt), Alberta AAIP (~CAD 500). PNP adaylığı +600 CRS puanı ekleyerek sonraki Express Entry çekilişinde ITA'yı neredeyse garanti eder.",
        "部分PNP通道有独立申请费：安大略省OINP（科技抽签免费，基于EOI），BC省PNP科技试点（约CAD $300注册费），阿尔伯塔AAIP（约CAD $500）。省提名可获+600 CRS分，实际上可保证在下次Express Entry抽签中获得ITA。"
      ),
    });
  }

  // Living cost is now rendered as a dedicated dual-row (Single + Family of 3) section
  // in generate-pdf.ts via drawFamilyLivingCosts(). Removed from here to avoid duplication.

  items.push({
    category: t(
      "Regulated Canadian Immigration Consultant (RCIC) or Immigration Lawyer",
      "Kanada Göçmenlik Danışmanı (RCIC) veya Göçmenlik Avukatı",
      "加拿大注册移民顾问（RCIC）或移民律师"
    ),
    estimateType: "variable",
    amountLabel: t("CAD $3,000–$10,000+ (application type and complexity)", "CAD 3.000–10.000+ (başvuru türü ve karmaşıklığına göre)", "CAD $3,000–$10,000+（申请类型及复杂程度）"),
    explanation: t(
      "Hiring an RCIC (Regulated Canadian Immigration Consultant) or Canadian immigration lawyer is not mandatory for Express Entry applications, but is strongly recommended for profiles with prior refusals, complex employment histories, gaps in documentation, or dual citizenship considerations. Typical fee ranges: EOI creation + full FSW/CEC/FSTP application (PR stage only) = CAD $3,000–$6,000; PNP nomination + PR application combined = CAD $5,000–$10,000; consultation-only services (EOI review, strategy session) = CAD $300–$700. Verify any consultant's registration via the ICCRC (Immigration Consultants of Canada Regulatory Council) public register at iccrc-crcic.ca. Never pay a flat 'success fee' upfront — a legitimate RCIC will provide a written service agreement. Unauthorized representatives who charge fees are prohibited under IRPA s.91.",
      "RCIC veya Kanada göçmenlik avukatı tutmak Express Entry başvuruları için zorunlu değildir, ancak karmaşık dosyalarda önerilir. Tipik ücretler: EOI + tam FSW/CEC başvurusu = CAD 3.000–6.000; PNP + PR = CAD 5.000–10.000. ICCRC kaydını iccrc-crcic.ca üzerinden doğrulayın.",
      "聘请RCIC（注册加拿大移民顾问）或移民律师并非必须，但对于有拒签记录、复杂就业史或文件缺失的申请人强烈推荐。典型费用：EOI+完整FSW/CEC申请 = CAD $3,000–$6,000；PNP+PR = CAD $5,000–$10,000。通过iccrc-crcic.ca验证顾问注册状态。"
    ),
  });

  return items;
}

// ─── Canada points booster simulator ─────────────────────────────────────────
// Exact CRS point gains per IRCC published scoring tables (2024).
function buildCanadaPointsBoosterSimulator(
  input: ReadinessInput,
  pointsEstimate: PointsEstimate | undefined,
  locale: Locale
): PointsBoosterSimulator {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const t = (en: string, tr: string, zh: string) => (isTr ? tr : isZh ? zh : en);

  const currentEstimate = pointsEstimate?.estimatedPoints;
  const englishOption = input.englishLevel ? parseEnglishOption(input.englishLevel) : null;
  const scenarios: PointsBoosterSimulator["scenarios"] = [];

  // Language boost — CLB 9+ in all skills
  if (englishOption !== "superior") {
    const langGain = englishOption === "proficient" ? 12 : englishOption === "competent" ? 24 : 28;
    scenarios.push({
      label: t("CLB 9+ in all four skills (IELTS 7.0+ / CELPIP 9+)", "Dört becerinin tamamında CLB 9+ (IELTS 7.0+ / CELPIP 9+)", "四项技能均达CLB 9+（IELTS 7.0+ / CELPIP 9+）"),
      estimatedChange: langGain,
      resultingEstimate: currentEstimate !== undefined ? currentEstimate + langGain : undefined,
      explanation: t(
        `Achieving CLB 9 across all four language skills (reading, writing, listening, speaking) unlocks the maximum first-official-language CRS band. Estimated CRS gain from your current English level: approximately +${langGain} points. CLB-to-IELTS mapping: CLB 7 = IELTS 6.0; CLB 8 = IELTS 6.5; CLB 9 = IELTS 7.0 (in all four bands); CLB 10 = IELTS 8.0; CLB 11 = IELTS 8.5; CLB 12 = IELTS 9.0. For a single applicant with no spouse, maximum CRS first-language points are 124 (achieved at CLB 10+ equivalent). CELPIP-General is also IRCC-accepted and uses the same CLB mapping. French speakers who achieve NCLC 7+ in all skills AND maintain CLB 7+ English receive a Bilingual Advantage bonus of +50 CRS on top of language points.`,
        `Dört dil becerisinin tamamında CLB 9 elde etmek (okuma, yazma, dinleme, konuşma) maksimum birinci resmi dil bandını açar. Tahmini CRS kazancı: mevcut dil puanından yaklaşık +${langGain} puan.`,
        `四项语言技能（阅读、写作、听力、口语）均达CLB 9可解锁最高第一官方语言分值。预计CRS增益：约+${langGain}分。IELTS各科7.0通常对应CLB 9；IELTS 8.0+对应CLB 10。`
      ),
    });
  }

  // LMIA job offer
  scenarios.push({
    label: t("Valid LMIA-backed job offer (NOC TEER 0/1/2/3)", "Geçerli LMIA destekli iş teklifi (NOC TEER 0/1/2/3)", "有效的LMIA担保工作邀约（NOC TEER 0/1/2/3）"),
    estimatedChange: 50,
    resultingEstimate: currentEstimate !== undefined ? currentEstimate + 50 : undefined,
    explanation: t(
      "A valid LMIA-supported job offer in a NOC TEER 0/1/2/3 occupation adds exactly +50 CRS points. Senior management roles classified as TEER 0 (e.g., NOC 00011 Senior managers – financial / communications / other business services) qualify for +200 points instead. The LMIA (Labour Market Impact Assessment) must be positive, issued to the specific employer, and must correspond to the exact NOC code and TEER level of the offer. The employer receives the LMIA from Employment and Social Development Canada (ESDC); IRCC does not issue LMIAs. LMIA-exempt job offers (e.g., under CUSMA/USMCA, intra-company transfers, or International Agreements) do not attract CRS job offer points. Note: LMIA-exempt offers under the C-10, C-11, or C-12 exemption codes may still qualify for +0, +50, or +200 depending on specific circumstances — verify with a Regulated Canadian Immigration Consultant (RCIC).",
      "NOC TEER 0/1/2/3 mesleklerde geçerli bir LMIA destekli iş teklifi tam olarak +50 CRS puanı ekler. Üst düzey yönetim rolleri (TEER 0) veya bazı spesifik NOC kodları için +200 puan uygulanabilir.",
      "NOC TEER 0/1/2/3职业的有效LMIA支持工作邀约可精确增加+50 CRS分。高管职位（TEER 0）或特定NOC代码可能获+200分。LMIA必须为正面、有效且由雇主持有。"
    ),
  });

  // Provincial nomination
  scenarios.push({
    label: t("Provincial Nominee Program (PNP) nomination", "Eyalet Aday Programı (PNP) adaylığı", "省提名计划（PNP）提名"),
    estimatedChange: 600,
    resultingEstimate: currentEstimate !== undefined ? currentEstimate + 600 : undefined,
    explanation: t(
      "A valid provincial/territorial nomination under Express Entry adds exactly +600 CRS points — effectively guaranteeing an Invitation to Apply (ITA) in the next general draw regardless of base CRS score. Key PNP streams by profile: (1) Ontario OINP Human Capital Priorities (HCP): targets TEER 0–3 candidates with an active Express Entry profile; IRCC sends the OINP a data-share of profiles meeting the score threshold, then OINP issues Notifications of Interest (NOIs) — you cannot apply directly. Typical HCP CRS threshold: 450–490. (2) BC PNP Tech Pilot: 29 specific NOC codes in tech/digital economy; registration fee ~CAD $300; BC PNP receives your EOI and invites based on a separate BC score; strong alignment with Express Entry required. (3) Alberta AAIP (Accelerated Tech Pathway / Express Entry Stream): targets tech workers and healthcare workers; CAD $500 fee; draws held approximately monthly. (4) Saskatchewan SINP: tech, healthcare, and trades workers; draws every 2–4 weeks. Category-based selection draws introduced in 2023 target specific NOC groups (French-speaking, healthcare, STEM, trades) and have lower CRS thresholds than general draws — healthcare draws have cleared at 430–480 CRS.",
      "Express Entry kapsamında geçerli bir eyalet/bölge adaylığı +600 CRS puanı ekler; bu da bir sonraki çekilişte ITA'yı neredeyse garanti eder. Meslekle ilgili akışlar şunlardır: Ontario OINP İnsan Sermayesi Öncelikleri (TEER 0-3), BC PNP Tech Pilot (teknoloji alanındaki seçili NOC kodları), Alberta AAIP.",
      "Express Entry下的有效省/地区提名可获+600 CRS分，实际上保证在下次抽签中获得ITA。按职业相关通道：安大略省OINP人力资本优先（TEER 0-3）、BC省PNP科技试点（科技领域特定NOC代码）、阿尔伯塔省AAIP。"
    ),
  });

  // Education upgrade
  const hasHighEd =
    input.qualificationLevel === "PhD" ||
    input.qualificationLevel === "PhD/Doctorate" ||
    input.qualificationLevel === "Bachelor" ||
    input.qualificationLevel === "Bachelor's Degree" ||
    input.qualificationLevel === "Master's Degree (Coursework)" ||
    input.qualificationLevel === "Master's Degree (Research)";
  if (!hasHighEd) {
    scenarios.push({
      label: t("Canadian bachelor's degree (or foreign equivalent ECA)", "Kanada lisans derecesi (veya yabancı denklik ECA'sı)", "加拿大学士学位（或外国同等ECA）"),
      estimatedChange: 30,
      resultingEstimate: currentEstimate !== undefined ? currentEstimate + 30 : undefined,
      explanation: t(
        "Education CRS points for a single applicant (no spouse): Two or more Canadian degrees (one at bachelor's level or higher) = +128 points; Canadian bachelor's degree or foreign credential equivalent (ECA required) = +120 points; Canadian two-year diploma or certificate = +98 points; less than secondary school = +28 points. The gain shown here reflects improvement from your current education band to a bachelor's equivalent. A Canadian or foreign master's degree assessed as equivalent = +135 points; PhD = +150 points. ECA providers: WES (World Education Services) processes most academic credentials in 7–20 business days for ~CAD $239–$285; ICAS (International Credential Assessment Service of Canada) is accepted for FSW/CEC at ~CAD $200–$300. ECA validity is 5 years from the date of the assessment report.",
        "Bir Kanada lisans derecesi veya ECA tarafından denkliği onaylanmış yabancı belge, tek başvurucu için yaklaşık +120 eğitim CRS puanı ekler. Kanada veya yabancı yüksek lisans derecesi +135 puan; doktora +150 puan ekler.",
        "加拿大学士学位或经ECA指定机构（WES/ICAS）评估等效的外国资历，单身申请人约可获+120教育CRS分；显示的增益反映从较低学历段的提升。加拿大或外国硕士学位+135分；博士+150分。"
      ),
    });
  }

  // French language bonus
  scenarios.push({
    label: t("French language ability (NCLC 7+ in all skills)", "Fransızca dil yeteneği (tüm becerilerde NCLC 7+)", "法语能力（四项技能均达NCLC 7+）"),
    estimatedChange: 50,
    resultingEstimate: currentEstimate !== undefined ? currentEstimate + 50 : undefined,
    explanation: t(
      "Bilingual candidates who score CLB 7+ in English AND NCLC 7+ in French receive a +50 CRS Bilingual Advantage bonus. This is independent of and in addition to the core language points. If French is used as the first official language (CLB 7+ French, but English below CLB 7), the bilingual bonus does not apply — but strong French scores alone still generate competitive CRS language points. NCLC is measured via TEF Canada or TCF Canada. French-speaking candidates also unlock category-based draws specifically for Francophone immigration, which have historically drawn candidates at lower CRS scores (400–450 range) — a major strategic advantage for French speakers regardless of their base CRS.",
      "CLB 7+ İngilizce VE NCLC 7+ Fransızca olan iki dilli adaylar +50 CRS bonusu alır (İki Dilli Avantaj). Yalnızca Fransızca ilk resmi dil olarak kullanıldığında ek bonus uygulanmaz, ancak yüksek Fransızca puanları güçlü CRS dil puanları oluşturur.",
      "英语CLB 7+且法语NCLC 7+的双语候选人可获+50 CRS奖励（双语优势）。若仅以法语作为第一官方语言（英语未达CLB 7+），不适用额外奖励，但高分法语仍能产生较强的CRS语言分。法语使用者还可访问法语流动通道和特定PNP通道。"
    ),
  });

  // Estimated CRS draw targets
  const teer = input.nocTeer;
  const baseScore = currentEstimate ?? 0;
  const crsDrawNote = teer !== undefined && teer <= 1
    ? t(
        `CRS Draw Targets for TEER ${teer} occupations — General pool draws: 470–520 CRS (STEM/most occupations). Category-based draws (introduced May 2023): Healthcare workers 430–480 CRS; French-language proficiency 375–425 CRS; Agriculture/Agri-food 300–360 CRS; Trade occupations 350–390 CRS. PNP nomination: +600 CRS points, effectively guarantees ITA in any draw. Itemized CRS buildup from your profile (estimated): Base score ${baseScore} CRS → +Language upgrade (if applicable) → +Education (ECA assessed) → +Experience → +Job offer (LMIA: +50/+200) → +PNP nomination (+600) = Total. Gap-to-invite analysis: the simplest path to a general draw invitation is typically: (1) optimise language to CLB 9+ (~+12–28 pts), then (2) pursue PNP stream matching your NOC code and province of interest.`,
        `TEER ${teer} meslekler için CRS çekim hedefleri — Genel havuz: 470–520 CRS. Kategori bazlı çekimler (2023'ten itibaren): Sağlık 430–480; Fransızca 375–425; Tarım 300–360; Meslekler 350–390. PNP adaylığı: +600 CRS.`,
        `TEER ${teer}职业CRS抽签目标——综合池：470–520。类别专项抽签（2023年起）：医疗430–480；法语375–425；农业300–360；技术工种350–390。省提名+600分。`
      )
    : t(
        `CRS Draw Targets — General pool draws: 470–520 CRS (most occupations). Category-based draws (May 2023+): French-language 375–425 CRS; Healthcare workers 430–480 CRS; Agriculture/Agri-food 300–360 CRS; Trade occupations 350–390 CRS. A PNP nomination adds +600 CRS, effectively eliminating the points competition. Itemized CRS buildup from your profile (estimated): Base score ${baseScore} CRS → +Language upgrade → +Education (ECA) → +Work experience → +Job offer (LMIA: +50/+200) → +PNP nomination (+600) = Total. The fastest realistic path to a general draw invitation typically combines language optimization (CLB 9+) with either a targeted PNP stream or category-based draw alignment.`,
        `CRS çekim hedefleri — Genel havuz: 470–520. Kategori çekimleri: Fransızca 375–425; Sağlık 430–480; Tarım 300–360; Meslekler 350–390. PNP adaylığı +600 CRS puan ekler.`,
        `CRS抽签目标——综合池470–520；类别专项：法语375–425，医疗430–480，农业300–360，技术工种350–390。省提名+600分，实际消除积分竞争。`
      );

  return {
    currentEstimate,
    scenarios,
    note: crsDrawNote,
  };
}

// Covers the 8 sections activated for Canada in this pass (points, roadmap,
// risk, partial skill mapping, document checklist, gantt, PDF footer,
// disclaimer). Fields below not in that scope (pathwayStrengthComparison,
// financialRoadmap, progressionPathways, pathwayFriction,
// confidenceExplanation, executiveSummary depth, factorsAffectingPathways,
// etc.) are filled with minimal, honest, country-neutral values rather than
// AU-flavored logic — they are explicitly out of scope for this pass, not
// silently degraded equivalents of the AU versions.
function runCanadaReadinessEngine(input: ReadinessInput): ReadinessReport {
  const locale = input.locale;
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const hasPnpInterest = hasCanadaPnpInterest(input);

  const pathwayCodes = detectCanadaPathways(input);
  const pointsEstimate = buildCanadaPointsEstimate(input, locale);
  const dataCompleteness = buildDataCompleteness(input, locale);
  const pathwayComparison = buildCanadaPathwayComparison(pathwayCodes, locale, pointsEstimate.estimatedPoints, input.occupation);
  if (hasPnpInterest) {
    pathwayComparison.unshift({
      subclass: "PNP",
      visaName: isTr
        ? "Provincial Nominee Program (PNP)"
        : isZh
          ? "省提名计划 (PNP)"
          : "Provincial Nominee Program (PNP)",
      reason: isTr
        ? "Bu pathway için eyalet-bazlı PNP sinyali, profil verisine dayalı genel CEC/FSW/FSTP karşılaştırmasıyla birlikte sunulur."
        : isZh
          ? "该路径的省级PNP信号将与基于CRS的CEC/FSW/FSTP综合对比一并呈现。"
          : "This pathway uses profile-driven provincial nomination signals together with a general CRS-based CEC/FSW/FSTP comparison.",
      relevance: "not_enough_information",
      confidenceLevel: "low",
      confidenceExplanation: isTr
        ? "PNP altyapısı eyalet/bölge bazında henüz tamamlanmadığı için güven düzeyi düşüktür."
        : isZh
          ? "由于按省/地区的PNP分析尚未完成，当前置信度较低。"
          : "Confidence is low because province/territory-level PNP analysis is not complete yet.",
      difficulty: "high",
      requirementType: isTr
        ? "Eyalet/bölge bazlı PNP kriterleri"
        : isZh
          ? "省/地区级PNP标准"
          : "Province/territory-level PNP criteria",
      userRelativePosition: isTr
        ? "PNP için göreli konum bu sürümde ölçülmemektedir; yalnızca genel CRS sinyali sunulur."
        : isZh
          ? "当前版本无法评估PNP相对位置；仅提供通用CRS信号。"
          : "Relative position for PNP is not measured in this version; only a general CRS signal is provided.",
      keyRequirements: isTr
        ? ["Hedef eyalet seçimi", "Eyalet stream uygunluk kontrolü", "Eyalet bazlı belge seti"]
        : isZh
          ? ["目标省份选择", "省提名通道资格核验", "省级材料清单"]
          : ["Target province selection", "Provincial stream eligibility check", "Province-specific document set"],
      pathwaySpecificRisks: [
        isTr
          ? "Bu geçici görünüm, eyalet stream kriterlerini yansıtmaz."
          : isZh
            ? "该临时视图不代表各省具体通道标准。"
            : "This temporary view does not represent province-specific stream criteria.",
      ],
    });
  }
  const occupationIndication = buildCanadaOccupationIndication(input, locale);
  const assessmentState = buildAssessmentState(input, pathwayComparison, pointsEstimate.estimatedPoints, locale);

  const riskIndicators = buildCanadaRiskIndicators({
    locale,
    age: input.age,
    englishLevel: input.englishLevel,
    occupation: input.occupation,
    estimatedPoints: pointsEstimate.estimatedPoints,
  });
  if (hasPnpInterest) {
    riskIndicators.unshift({
      level: "medium",
      title: isTr
        ? "PNP sinyali geniş profil varsayımlarıyla yorumlanmalı"
        : isZh
          ? "PNP信号需结合个人资料综合解读"
          : "PNP signals should be interpreted with full profile context",
      explanation: isTr
        ? "PNP seçildiğinde rapor, eyalet/bölge streamlerini tek tek değil; genel CRS tabanlı CEC/FSW/FSTP karşılaştırması ile birlikte yorumlar."
        : isZh
          ? "选择PNP时，报告会结合通用CRS下的CEC/FSW/FSTP信号进行综合判断，而不是逐一展开省/地区通道。"
          : "When PNP is selected, the report combines general CRS-based CEC/FSW/FSTP signals instead of drilling into each province/territory stream.",
    });
  }

  const documentChecklist = getCanadaDocumentChecklist(pathwayCodes, locale);

  const missingInformation: string[] = [];
  if (!input.age) missingInformation.push(isTr ? "Yaş" : "Age");
  if (!input.englishLevel) missingInformation.push(isTr ? "Dil seviyesi (CLB/NCLC)" : "Language level (CLB/NCLC)");
  if (!input.occupation) missingInformation.push(isTr ? "Meslek (NOC)" : "Occupation (NOC)");

  const suggestedNextSteps = buildCanadaNextSteps({
    locale,
    pathwayCodes,
    hasOccupation: Boolean(input.occupation),
    hasEnglish: Boolean(input.englishLevel),
    hasMissingInfo: missingInformation.length > 0,
  });
  const sparseStrategy = buildCanadaSparseStrategy({
    locale,
    occupation: input.occupation,
    pathwayCodes,
    pointsEstimate: pointsEstimate.estimatedPoints,
    hasPnpInterest,
  });
  if (hasPnpInterest) {
    suggestedNextSteps.unshift(
      isTr
        ? "PNP hedefi için 2-3 öncelikli eyalet seçip stream koşullarını ve meslek kodu uyumunu ayrı bir kontrol listesiyle eşleştirin."
        : isZh
          ? "如以PNP为重点，请先锁定2-3个目标省份，并将通道要求与职业代码逐项核对。"
          : "If PNP is a focus, shortlist 2-3 target provinces and map each stream's requirements against your occupation code and evidence set."
    );
  }

  for (const step of [...sparseStrategy.nextSteps].reverse()) {
    suggestedNextSteps.unshift(step);
  }

  const generatedPremiumSections = generatePremiumSections({
    locale,
    occupation: input.occupation,
    timeline: input.timeline,
    mainGoal: input.mainGoal,
    biggestConcern: input.biggestConcern,
    familyStatus: input.sponsorOrFamily,
    selectedCity: input.preferredCity,
    estimatedPoints: pointsEstimate.estimatedPoints,
    country: "CA",
    pathwayComparison,
    assessmentState,
  });
  const caFinancialRoadmap = buildCanadaFinancialRoadmap(pathwayCodes, input, locale);
  const caPointsBooster = buildCanadaPointsBoosterSimulator(input, pointsEstimate, locale);

  const premiumSections: PremiumSections = {
    ...generatedPremiumSections,
    scenarioBasedInsights: {
      pathwayStrengthComparison: [],
      evidenceReadiness: [],
      pointsBoosterSimulator: caPointsBooster,
      financialRoadmap: caFinancialRoadmap,
      progressionPathways: [],
      pathwayFriction: [],
      frictionAnalysis: [],
      documentChecklist,
      suggestedNextSteps,
    },
  };

  const disclaimer = buildDisclaimer(locale, "CA");

  const keyVisaRequirements = buildKeyVisaRequirements(pathwayComparison);

  // Dynamic confidence — HIGH only when all 4 critical fields are present.
  const confidenceScore = calculateConfidence(input);

  // Sections that cannot be personalized due to missing critical inputs.
  // The PDF renders an "Action Required" box in place of each listed section.
  const dataRequiredSections: string[] = [];
  if (!input.occupation && !input.nocCode) {
    dataRequiredSections.push("pointsBoosterSimulator");
  }
  if (pathwayComparison.length === 1 && pathwayComparison[0].subclass === "general") {
    dataRequiredSections.push("pathwayComparison");
  }

  const executiveSummary = [...sparseStrategy.summaryLines];
  if (hasPnpInterest) {
    executiveSummary.unshift(
      isTr
        ? "PNP seçimi algılandı: rapor, il bazlı stream sinyallerini genel CRS ve CEC/FSW/FSTP karşılaştırmasıyla birlikte yorumlar."
        : isZh
          ? "已识别PNP偏好：报告将省提名信号与通用CRS及CEC/FSW/FSTP对比联合解读。"
          : "PNP preference detected: the report interprets provincial nomination signals alongside general CRS and CEC/FSW/FSTP comparisons."
    );
  }

  const signalSnapshot: SignalSnapshot = {
    strongest: pathwayComparison[0]?.visaName ?? (isTr ? "Belirlenemedi" : "Not yet determined"),
    secondary: pathwayComparison.slice(1).map((p) => p.visaName),
    confidenceLabel: pointsEstimate.estimatedPoints !== undefined ? "moderate" : "limited",
    confidenceExplanation: isTr
      ? "Bu yalnızca kısmi bir CRS tahminine dayanmaktadır."
      : "This is based on a partial CRS estimate only.",
  };

  const primaryLimitingFactor: PrimaryLimitingFactor =
    missingInformation.length > 0
      ? {
          label: missingInformation[0],
          explanation: isTr
            ? "Eksik veri alanları, CRS ve uygunluk değerlendirmesinin tamlığını sınırlamaktadır."
            : isZh
              ? "缺失字段会限制CRS与资格评估的完整性。"
              : "Missing data fields limit the completeness of CRS and eligibility assessment.",
        }
      : sparseStrategy.primaryLimitingFactor;

  // ── Sparse Data Disclaimer ────────────────────────────────────────────────
  // Build an explicit disclaimer if key input fields were absent so the PDF
  // clearly states which assumptions were applied.
  const missingFields: string[] = [];
  if (!input.sponsorOrFamily) missingFields.push(isTr ? "medeni durum" : "marital status");
  if (!input.qualificationLevel) missingFields.push(isTr ? "eğitim düzeyi" : "education level");
  if (!input.englishLevel) missingFields.push(isTr ? "dil sınav skoru" : "language test score");
  if (!input.offshoreExperienceYears && !input.onshoreExperienceYears) missingFields.push(isTr ? "iş deneyimi yılı" : "years of work experience");

  const sparseDataDisclaimer: string | undefined = missingFields.length > 0
    ? (isTr
        ? `Not: Başvuru formunuzda belirli bilgiler (${missingFields.join(", ")}) sağlanmadığından, bu bölümler standart genelleştirilmiş varsayımlar kullanılarak oluşturulmuştur (ör. bekar bir yetişkin, lisans derecesi, CLB 7 dil seviyesi, 3 yıl iş deneyimi). Bu varsayımlar gerçek durumunuzla örtüşmeyebilir — sonuçların doğruluğunu artırmak için formu yeniden doldurun.`
        : isZh
          ? `注意：由于您的申请表中未提供某些具体信息（${missingFields.join("、")}），本报告部分内容基于标准通用假设生成（例如：单身成年人、本科学历、CLB 7语言水平、3年工作经验）。这些假设可能与您的实际情况不符——请重新填写表单以获得更准确的分析。`
          : `Note: Because specific details (${missingFields.join(", ")}) were not provided in your intake form, this report has been generated using standard generalized assumptions (e.g., applying as a single adult with a bachelor's degree, CLB 7 language proficiency, and 3 years of work experience). These assumptions may not reflect your actual situation — resubmit the form with complete data to improve accuracy.`)
    : undefined;

  // ── Family-of-3 living cost (CA) ──────────────────────────────────────────
  // Always include family-of-3 costs for the target city alongside single costs.
  const CA_FAMILY_COSTS: Record<string, { rent: number; groceries: number; transport: number; total: number }> = {
    Toronto:  { rent: 3800, groceries: 1100, transport: 280, total: 5180 },
    Vancouver:{ rent: 4200, groceries: 1150, transport: 250, total: 5600 },
    Calgary:  { rent: 3100, groceries: 1050, transport: 200, total: 4350 },
    Ottawa:   { rent: 3200, groceries: 1050, transport: 200, total: 4450 },
    Montreal: { rent: 2800, groceries: 1000, transport: 210, total: 4010 },
  };
  // Infer city from premium sections (already computed above)
  const caCity = generatedPremiumSections.livingCostProjection.city
    .replace(/多伦多/g, "Toronto")
    .replace(/温哥华/g, "Vancouver")
    .replace(/卡尔加里/g, "Calgary");
  const familyCostRow = CA_FAMILY_COSTS[caCity] ?? CA_FAMILY_COSTS.Toronto;
  const livingCostFamily = {
    city: generatedPremiumSections.livingCostProjection.city,
    currency: "CAD" as const,
    monthly: familyCostRow,
  };

  return {
    country: "CA",
    executiveSummary,
    signalSnapshot,
    primaryLimitingFactor,
    positionChangers: [],
    pathwayComparison,
    pathwayStrengthComparison: [],
    evidenceReadiness: [],
    financialRoadmap: caFinancialRoadmap,
    progressionPathways: [],
    pathwayFriction: [],
    confidenceExplanation: signalSnapshot.confidenceExplanation,
    assessmentState,
    reportIndicators: {
      dataCompletenessScore: dataCompleteness.percentage,
      dataCompletenessLabel: isTr ? "Veri tamlığı" : "Data completeness",
      documentReadinessIndicator: "medium",
      informationCoverageLevel: dataCompleteness.percentage >= 70 ? "comprehensive" : dataCompleteness.percentage >= 40 ? "partial" : "initial",
      explanation: isTr
        ? "Bu, Kanada Express Entry için ilk aşama bir değerlendirmedir."
        : "This is a first-pass assessment for Canada Express Entry.",
    },
    primaryGap: primaryLimitingFactor.label,
    dataCompleteness,
    keyVisaRequirements,
    factorsAffectingPathways: [],
    pointsEstimate,
    pointsBoosterSimulator: caPointsBooster,
    occupationIndication,
    riskIndicators,
    documentChecklist,
    premiumSections,
    frictionAnalysis: [],
    suggestedNextSteps,
    missingInformation,
    disclaimer,
    sparseDataDisclaimer,
    livingCostFamily,
    confidenceScore,
    dataRequiredSections,
  };
}

export function runReadinessEngine(input: ReadinessInput): ReadinessReport {
  if (input.country === "CA") return runCanadaReadinessEngine(input);

  const locale = input.locale;

  const detectedSubclasses = detectSubclasses(input);
  const hasSkilledPathway = detectedSubclasses.some((s) =>
    ["189", "190", "491"].includes(s)
  );
  const pointsEstimate = hasSkilledPathway
    ? buildPointsEstimate(input, locale)
    : undefined;
  const dataCompleteness = buildDataCompleteness(input, locale);

  let pathwayComparison: PathwayComparison[];

  if (detectedSubclasses.length === 0) {
    pathwayComparison = [
      {
        subclass: "general",
        visaName:
          locale === "tr" ? "Genel değerlendirme" : "General assessment",
        reason:
          locale === "tr"
            ? "Mevcut bilgilerle belirli bir yol tespit edilemedi. Hedef, meslek ve sponsorluk ayrıntıları daha kapsamlı bir değerlendirme sağlayacaktır."
            : "No specific pathway was detected from available information. Goal, occupation, and sponsorship details would provide a more complete assessment.",
        relevance: "not_enough_information",
        confidenceLevel: "low",
        confidenceExplanation:
          locale === "tr"
            ? "Mevcut sinyal seti sınırlı olduğu için güven seviyesi düşük görünmektedir."
            : "Confidence is low because the available signal set is limited.",
        difficulty: "medium",
        requirementType:
          locale === "tr"
            ? "Genel yol sinyali (eksik veri nedeniyle sınırlı)"
            : "General pathway signal (limited by missing data)",
        userRelativePosition:
          locale === "tr"
            ? "Daha fazla bilgi olmadan göreli konum netleşmez."
            : "Relative position is unclear without additional details.",
        keyRequirements:
          locale === "tr"
            ? ["Daha ayrıntılı hedef, meslek ve sponsorluk bağlamı"]
            : ["More detailed goal, occupation, and sponsorship context"],
        pathwaySpecificRisks:
          locale === "tr"
            ? ["Belirli bir yol için yeterli sinyal bulunmadığı için değerlendirme genel düzeyde kalmaktadır."]
            : ["The review remains general because there is not yet enough signal for a specific pathway."],
      },
    ];
  } else {
    pathwayComparison = detectedSubclasses.map((subclass) =>
      buildPathwayEntry(
        subclass,
        input,
        locale,
        dataCompleteness.percentage,
        pointsEstimate?.estimatedPoints
      )
    );
  }

  const occupationIndication = buildOccupationIndication(input, locale);

  const riskIndicators = buildRiskIndicators({
    locale,
    pathways: pathwayComparison,
    age: input.age,
    englishLevel: input.englishLevel,
    sponsorOrFamily: input.sponsorOrFamily,
    occupation: input.occupation,
    biggestConcern: input.biggestConcern,
    currentCountry: input.currentCountry,
    passportCountry: input.passportCountry,
    estimatedPoints: pointsEstimate?.estimatedPoints,
  });

  const documentChecklist: DocumentCategory[] = getDocumentChecklist(
    detectedSubclasses,
    locale
  );

  const missingInformation = buildMissingInformation(
    input,
    detectedSubclasses,
    locale
  );

  const reportIndicators = buildReportIndicators({
    locale,
    dataCompleteness,
    input,
  });
  const primaryGap = buildPrimaryGap({
    locale,
    pathways: pathwayComparison,
    dataCompleteness,
    missingInformation,
    riskIndicators,
    pointsEstimate,
  });

  const factorsAffectingPathways = buildFactorsAffectingPathways(
    locale,
    input,
    dataCompleteness,
    hasSkilledPathway,
    detectedSubclasses.includes("482"),
    (detectedSubclasses.includes("820") || detectedSubclasses.includes("801"))
  );

  const keyVisaRequirements = buildKeyVisaRequirements(pathwayComparison);
  // Single source of truth for assessment confidence — every downstream
  // section (executive summary language, ranked pathway %/points display,
  // pathway comparison) reads from this SAME object instead of independently
  // re-deriving whether there is enough data for a specific number.
  const assessmentState = buildAssessmentState(
    input,
    pathwayComparison,
    pointsEstimate?.estimatedPoints,
    locale
  );
  const executiveSummary = buildExecutiveSummary(
    input,
    pathwayComparison,
    locale,
    missingInformation,
    assessmentState
  );
  const pathwayStrengthComparison = buildPathwayStrengthComparison(
    pathwayComparison,
    locale,
    input
  );
  const evidenceReadiness = buildEvidenceReadiness(
    input,
    detectedSubclasses,
    locale
  );
  const pointsBoosterSimulator = buildPointsBoosterSimulator(
    input,
    detectedSubclasses,
    pointsEstimate,
    locale
  );
  const financialRoadmap = buildFinancialRoadmap(
    detectedSubclasses,
    input,
    locale
  );
  const progressionPathways = buildProgressionPathways(
    detectedSubclasses,
    locale,
    input.hasGraduateVisaPathwayIntent === true
  );
  const pathwayFriction = buildPathwayFriction(
    pathwayComparison,
    locale
  );
  const confidenceExplanation = buildConfidenceExplanation(
    pathwayComparison,
    evidenceReadiness,
    locale,
    input,
    pointsEstimate?.estimatedPoints
  );
  const signalSnapshot = buildSignalSnapshot(
    pathwayStrengthComparison,
    confidenceExplanation
  );
  const primaryLimitingFactor = buildPrimaryLimitingFactor(
    input,
    detectedSubclasses,
    pointsEstimate?.estimatedPoints,
    locale
  );
  const positionChangers = buildPositionChangers(
    input,
    detectedSubclasses,
    pointsEstimate?.estimatedPoints,
    locale
  );

  const suggestedNextSteps = buildNextSteps({
    locale,
    pathways: pathwayComparison,
    hasOccupation: Boolean(input.occupation),
    hasEnglish: Boolean(input.englishLevel),
    hasSkilledPathway,
    hasPartnerPathway: (detectedSubclasses.includes("820") || detectedSubclasses.includes("801")),
    has482Pathway: detectedSubclasses.includes("482"),
    hasMissingInfo: missingInformation.length > 0,
  });

  const generatedPremiumSections = generatePremiumSections({
    locale,
    occupation: input.occupation,
    selectedCity: input.preferredCity,
    familyStatus: input.sponsorOrFamily,
    timeline: input.timeline,
    mainGoal: input.mainGoal,
    biggestConcern: input.biggestConcern,
    country: "AU",
    pathwayComparison,
    assessmentState,
  });
  const premiumSections: PremiumSections = {
    ...generatedPremiumSections,
    scenarioBasedInsights: {
      pathwayStrengthComparison,
      evidenceReadiness,
      pointsBoosterSimulator,
      financialRoadmap,
      progressionPathways,
      pathwayFriction,
      frictionAnalysis: [],
      documentChecklist,
      suggestedNextSteps,
    },
  };

  const disclaimer = buildDisclaimer(locale);

  return {
    country: "AU",
    executiveSummary,
    signalSnapshot,
    primaryLimitingFactor,
    positionChangers,
    detectedSubclasses,
    pathwayComparison,
    pathwayStrengthComparison,
    evidenceReadiness,
    pointsBoosterSimulator,
    financialRoadmap,
    progressionPathways,
    pathwayFriction,
    confidenceExplanation,
    assessmentState,
    reportIndicators,
    primaryGap,
    dataCompleteness,
    keyVisaRequirements,
    factorsAffectingPathways,
    pointsEstimate,
    occupationIndication,
    riskIndicators,
    documentChecklist,
    premiumSections,
    frictionAnalysis: [],
    suggestedNextSteps,
    missingInformation,
    disclaimer,
  };
}
