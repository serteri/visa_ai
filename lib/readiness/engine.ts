import { CURRENT_CSIT } from "@/lib/readiness/constants";
import { buildAssessmentState } from "@/lib/readiness/assessment-state";
import {
  buildEmploymentExperienceCaveat,
  getEmploymentDataSignals,
} from "@/lib/readiness/employment-signals";
import { hasRealEnglishEvidence } from "@/lib/readiness/english-evidence";
import {
  buildSpecialistEducationCaveat,
  getSpecialistEducationSignals,
} from "@/lib/readiness/education-signals";
import { checkOccupation } from "@/lib/occupations/check-occupation";
import { checkNocOccupation } from "@/lib/occupations/check-noc-occupation";
import { isFSTPEligibleOccupation } from "@/lib/readiness/noc-fstp-groups";
import {
  getSkillsAssessmentAuthority,
  getAuthorityById,
  getDefaultPathway,
  resolveACSPathway,
  resolveLocalized,
  resolveLocalizedArray,
} from "@/lib/skills-assessment";
import { getAssessingAuthority } from "@/lib/skills-assessment/occupation-authority-map";
import {
  type ProvinceCode,
  type ProvinceStream,
  type OntarioPathwayId,
  type OntarioPathwayResult,
  type BCPathwayId,
  type BCPathwayResult,
  type AlbertaPathwayId,
  type AlbertaPathwayResult,
  ONTARIO_WORKFORCE_PRIORITY_STREAMS,
  BC_PNP_STREAMS,
  ALBERTA_AAIP_STREAMS,
  SUPPORTED_PROVINCES,
  qualifiesForOntarioTradesLanguageException,
  ontarioStreamsIntroText,
  bcStreamsIntroText,
  albertaStreamsIntroText,
} from "@/lib/readiness/pnp-provinces";
import {
  type PSTQStreamId,
  type PSTQStream,
  type QuebecPSTQResult,
  QUEBEC_PSTQ_STREAMS,
  quebecStreamsIntroText,
  isCalqArtsOccupation,
  resolvePSTQStream,
} from "@/lib/readiness/quebec-pstq";
import { calculateAustraliaPoints } from "@/lib/points/calculate-australia-points";
import { calculateCanadaCRS } from "@/lib/points/calculate-canada-crs";
import type { CanadaCRSInput, CLBLevel } from "@/lib/points/canada-types";
import type { PartnerOption } from "@/lib/points/types";
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
import type { InvitationTrendEstimate } from "@/src/lib/readiness/report-generator";
import { getDocumentChecklist, getCanadaDocumentChecklist } from "./document-checklists";
import { buildRiskIndicators, buildCanadaRiskIndicators } from "./risk-rules";
import { buildNextSteps, buildCanadaNextSteps } from "./next-steps";
import { isPartnerFamilySponsorship } from "@/lib/countries";
import { parsePartnerIntakeFromText, buildPartnerSponsorshipAssessment } from "./partner-sponsorship";
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
  PointsBreakdownItem,
  PointsEstimate,
  PrimaryLimitingFactor,
  ProgressionPathway,
  ReadinessInput,
  ReadinessReport,
  ReportIndicators,
  SignalSnapshot,
  StateNominationTracker,
  StateNominationState,
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

const JULY_2026_CSIT_AUD = CURRENT_CSIT.value;
const JULY_2026_485_STANDARD_MAX_AGE = 35;
const JULY_2026_485_EXCEPTION_MAX_AGE = 50;
const JULY_2026_482_BASE_COST_AUD = 4015;
// 189 and 190 do NOT share an identical base VAC -- keep them as separate
// constants (matching the DHA fee schedule) instead of one shared value, so
// every surface that quotes either figure (GOV_FEES_EN/TR fee table and the
// Financial Roadmap narrative note) reads from the same single source and
// can never drift into quoting two different numbers for the same subclass.
const JULY_2026_189_BASE_COST_AUD = 6135;
const JULY_2026_190_491_BASE_COST_AUD = 6140;
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

const DIRECT_ENTRY_186_MAX_AGE = 45;
const TRT_186_MIN_SPONSORED_YEARS = 2;

/**
 * Narrow, documented exceptions to the Direct Entry 45 age cap: academics,
 * government/university scientists or researchers, and eligible NZ subclass
 * 444/461 holders. Detected only via freetext keyword signals (no dedicated
 * ReadinessInput field exists for nominator type or NZ visa history), so
 * this is best-effort — same limitation as has485AgeException.
 */
function has186DirectEntryAgeException(input: ReadinessInput): boolean {
  const combined = [input.mainGoal ?? "", input.preferredPathway ?? "", input.biggestConcern ?? "", input.occupation ?? ""]
    .join(" ")
    .toLowerCase();
  return /(academic|university lecturer|faculty head|scientist|researcher|technical specialist|nz visa 444|nz visa 461|subclass 444|subclass 461)/i.test(
    combined
  );
}

/**
 * The occupation dataset (src/data/occupations.json) only tracks
 * MLTSSL/STSOL/ROL membership, not CSOL (which superseded those lists under
 * the Migration Strategy reforms). An MLTSSL match is used as a proxy signal
 * for "likely on CSOL" — high-confidence but not a direct CSOL lookup, so
 * callers must not present this as a definitive CSOL confirmation.
 */
function isLikelyOnCsolViaMltsslProxy(occupation?: string): boolean {
  return getEligibleSkilledSubclasses(occupation).includes("189");
}

/**
 * Direct Entry stream (permanent, points-untested): age <45 (subject to the
 * narrow exceptions above), positive skills assessment, occupation on CSOL
 * (approximated via MLTSSL proxy — see isLikelyOnCsolViaMltsslProxy), and at
 * least 3 years of relevant work experience (approximated as the sum of
 * offshore + onshore experience years, since no single "total relevant
 * experience" field exists).
 */
function evaluate186DirectEntryGate(input: ReadinessInput): {
  declaredAge: number | null;
  isAgeIneligible: boolean;
  hasAgeException: boolean;
  hasSkillsAssessment: boolean;
  isLikelyOnCsol: boolean;
  hasOccupation: boolean;
  totalExperienceYears: number;
  meetsExperienceThreshold: boolean;
} {
  const declaredAge = parseDeclaredAge(input);
  const hasAgeException = has186DirectEntryAgeException(input);
  const isAgeIneligible = declaredAge !== null && declaredAge >= DIRECT_ENTRY_186_MAX_AGE && !hasAgeException;
  const hasSkillsAssessment = (input.occupationConfirmed ?? "").trim().toLowerCase() === "yes";
  const totalExperienceYears = (input.offshoreExperienceYears ?? 0) + (input.onshoreExperienceYears ?? 0);
  return {
    declaredAge,
    isAgeIneligible,
    hasAgeException,
    hasSkillsAssessment,
    isLikelyOnCsol: isLikelyOnCsolViaMltsslProxy(input.occupation),
    hasOccupation: Boolean(input.occupation),
    totalExperienceYears,
    meetsExperienceThreshold: totalExperienceYears >= 3,
  };
}

/**
 * TRT stream (permanent, experience-based, no age limit, no points test): at
 * least 2 years of employment in the nominated occupation aggregated across
 * any employer(s) that held approved-sponsor status during the counted
 * period (DHA removed the same-employer requirement in Dec 2024; the 29 Nov
 * 2025 amendment only requires each counted period to be under an approved
 * sponsor, not a single continuous employer — see yearsInSponsoredPosition
 * doc comment in types.ts). CSOL membership is applied here too per current
 * guidance, approximated via the same MLTSSL proxy as Direct Entry.
 */
function evaluate186TrtGate(input: ReadinessInput): {
  yearsInSponsoredPosition: number | null;
  meetsTenureThreshold: boolean;
  isLikelyOnCsol: boolean;
  hasOccupation: boolean;
} {
  const years = typeof input.yearsInSponsoredPosition === "number" && Number.isFinite(input.yearsInSponsoredPosition)
    ? input.yearsInSponsoredPosition
    : null;
  return {
    yearsInSponsoredPosition: years,
    meetsTenureThreshold: years !== null && years >= TRT_186_MIN_SPONSORED_YEARS,
    isLikelyOnCsol: isLikelyOnCsolViaMltsslProxy(input.occupation),
    hasOccupation: Boolean(input.occupation),
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
 * might otherwise produce — UNLESS has485AgeException applies (PhD,
 * Master's by Research, or Hong Kong/BNO passport all raise the cap to 50
 * in either stream). PhD/Master's-by-Research holders already bypass this
 * gate naturally since neither qualification is in
 * QUALIFICATIONS_BACHELOR_OR_LOWER, but a Hong Kong/BNO passport holder
 * with a Bachelor's degree or lower would otherwise be wrongly hard-gated
 * at 35 despite qualifying for the 50 exception — has485AgeException is
 * checked explicitly here to close that gap.
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
    isHardIneligible: declaredAge !== null && declaredAge > 35 && isBachelorOrLower && !has485AgeException(input),
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
 * Per-subclass friction explanation for ineligible pathways. Replaces the
 * identical `shortIneligibleReference` string that was previously repeated
 * verbatim under every ineligible visa (189/190/491) in the Reality Check
 * section. Each pathway now gets a distinct, plain-language sentence so the
 * report reads as tailored analysis rather than a copy-pasted robotic block;
 * the "🚨 CRITICAL COMPLIANCE ALERT" banner itself is shown once at the top of
 * the section by the PDF/UI layer.
 */
function customIneligibleFrictionExplanation(locale: Locale, subclass: string): string {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const bySubclass: Record<string, { en: string; tr: string; zh: string }> = {
    "189": {
      en: "Subclass 189 is fully points-tested with no sponsor or nominator to offset a shortfall, so it stays out of reach until your estimated score clears the 65-point pass mark.",
      tr: "Subclass 189 tamamen puana dayalıdır ve açığı kapatacak bir sponsor veya aday gösterici yoktur; bu nedenle tahmini puanınız 65 baraj puanını geçene kadar erişilemez kalır.",
      zh: "189 类完全依赖打分，且没有担保方或提名方来弥补分差，因此在预估分数达到 65 分及格线之前无法申请。",
    },
    "190": {
      en: "Subclass 190 adds state nomination (+5) on top of the points test, but that boost still leaves your base score below the binding 65-point threshold on its own.",
      tr: "Subclass 190, puan testinin üzerine eyalet aday gösterimi (+5) ekler; ancak bu katkı tek başına temel puanınızı bağlayıcı 65 puan eşiğinin altında bırakır.",
      zh: "190 类在打分基础上增加州担保（+5），但仅凭这一加分，您的基础分数仍低于具有约束力的 65 分门槛。",
    },
    "491": {
      en: "Subclass 491 carries the largest single boost via regional nomination (+15), making it the most realistic route back to eligibility once you close the remaining points gap.",
      tr: "Subclass 491, bölgesel aday gösterimi (+15) ile en büyük tekil puan katkısını sağlar; kalan puan açığını kapattığınızda uygunluğa dönmenin en gerçekçi yoludur.",
      zh: "491 类通过偏远地区提名（+15）提供最大的单项加分，在您补齐剩余分差后，是恢复资格最现实的途径。",
    },
  };
  const entry = bySubclass[subclass];
  if (!entry) return shortIneligibleReference(locale);
  return isTr ? entry.tr : isZh ? entry.zh : entry.en;
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

function buildSubclassIneligiblePointsReason(
  subclass: string,
  locale: Locale,
  estimatedPoints: number,
  input: ReadinessInput
): string {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const gap = 65 - estimatedPoints;
  const displayOccupation = input.occupation
    ? resolveOccupationDisplayName(input.occupation, locale)
    : (isTr ? "mesleğiniz" : isZh ? "您的职业" : "your occupation");

  if (subclass === "189") {
    if (isTr) {
      return `Tahmini temel puanınız ${estimatedPoints} olup, 189 vizesi için gereken asgari 65 barajının ${gap} puan altındadır. Subclass 189 tamamen bağımsız bir vize olup, puanınızı artıracak herhangi bir eyalet veya akraba sponsorluğu katkısı sunmaz. Bu vize yolunu ulaşılabilir kılmak için, puan açığını tamamen dil puanınızı yükseltmek (örneğin Superior English ile +20 puan) veya daha fazla iş deneyimi kazanmak gibi kişisel niteliklerinizle kapatmanız gerekir.`;
    }
    if (isZh) {
      return `您的预估分数为 ${estimatedPoints} 分，距离 189 签证最低要求的 65 分还有 ${gap} 分的差距。189 类属于完全独立的技术移民签证，没有额外的州担保或亲属担保加分来弥补这一分差。要使该途径可行，您必须完全通过提升个人基本背景（例如将英语成绩提高到 Superior 水平以获得 +20 加分，或积累更多相关工作经验）来弥补差距。`;
    }
    return `Your estimated baseline score is ${estimatedPoints} points, leaving a ${gap}-point gap to the 189 visa minimum of 65. As a purely independent pathway, subclass 189 does not offer any state nomination or family sponsorship points to help offset this shortfall. To make this visa viable, you must close this points deficit entirely through improving your personal credentials (e.g., achieving a Superior English exam result for +20 points, or accumulating more skilled work experience).`;
  }

  if (subclass === "190") {
    const potentialScore = estimatedPoints + 5;
    const remainingGap = Math.max(0, 65 - potentialScore);
    if (isTr) {
      return `Tahmini puanınız ${estimatedPoints} olup, gereken asgari 65 barajının ${gap} puan altındadır. Eyalet adaylığı (Subclass 190) size +5 ek puan sağlayarak potansiyel puanınızı ${potentialScore}'e yükseltir; ancak bu durumda dahi 65 barajına ulaşmak için ${remainingGap} puanlık bir açığınız kalacaktır. Eyalet sponsorluğuyla bu vizeye başvurabilmek için temel puanınızı en az 60'a yükseltmeniz gerekir. Eyaletlerin ${displayOccupation} mesleğini talep edip etmediğini görmek için bu rapordaki Eyalet Adaylığı Takipçisine göz atın.`;
    }
    if (isZh) {
      return `您的预估分数为 ${estimatedPoints} 分，比 65 分最低要求低 ${gap} 分。虽然州担保（190 类）可以为您提供 +5 分的加分（使您的潜在分数达到 ${potentialScore} 分），但这仍使您面临 ${remainingGap} 分的差距。您必须将基础分数提高到至少 60 分，才能使该州担保途径可行。请参阅本报告中的州担保跟踪器，了解各州当前是否在积极邀请 ${displayOccupation} 职业。`;
    }
    return `Your estimated score of ${estimatedPoints} points is ${gap} points below the 65-point minimum. While obtaining a state nomination (subclass 190) provides a +5 point boost, bringing your potential score to ${potentialScore}, you would still face a ${remainingGap}-point shortfall. You must raise your base score to at least 60 to make this option viable. Refer to the State Nomination Tracker in this report to check if states are actively nominating ${displayOccupation}.`;
  }

  if (subclass === "491") {
    const potentialScore = estimatedPoints + 15;
    const remainingGap = Math.max(0, 65 - potentialScore);
    if (isTr) {
      return `Tahmini temel puanınız ${estimatedPoints} olup, 65 barajının ${gap} puan altındadır. Ancak Subclass 491, bölgesel adaylık veya aile sponsorluğu aracılığıyla +15 puanlık en büyük tekil puan desteğini sunarak potansiyel puanınızı ${potentialScore}'e yükseltir ve kalan açığı sadece ${remainingGap} puana indirir. Bu yolu uygulanabilir kılmak için temel puanınızı en az 50'ye yükseltmeniz yeterli olacaktır. Subclass 491, profiliniz için en gerçekçi ve en hızlı uygulanabilir nitelikli göç yolu olup, uygunluğa ulaşmak için İngilizce sonucunuzu yükseltmek gibi küçük temel puan artışları yeterlidir.`;
    }
    if (isZh) {
      return `您的预估分数为 ${estimatedPoints} 分，比 65 分最低要求低 ${gap} 分。然而，491 类偏远地区提名或亲属担保可提供高达 +15 分的的加分，使您的潜在分数达到 ${potentialScore} 分，并将剩余差距缩短至仅 ${remainingGap} 分。要使该途径可行，您必须将基础分数提高到至少 50 分。这使 491 成为您当前最现实、最易实现的技术移民途径，您只需进行较小的基础分数提升（例如提高英语考试成绩）即可达到申请资格。`;
    }
    return `Your estimated score of ${estimatedPoints} points is ${gap} points below the 65-point threshold. However, subclass 491 regional nomination or family sponsorship offers a substantial +15 point boost, bringing your potential score to ${potentialScore} and reducing your remaining gap to only ${remainingGap} points. To make this pathway viable, you must raise your base score to at least 50. Subclass 491 is the most realistic and accessible skilled pathway for your profile, requiring only minor base points improvements (such as a higher English test result) to reach eligibility.`;
  }

  return "";
}


// ─── Pathway detection ────────────────────────────────────────────────────────

/**
 * True only when the user explicitly picked the "Partner visa 820/801"
 * option from the full-check pathway dropdown (real submitted value:
 * "820_801") or wrote the phrase out in free text. Deliberately does NOT
 * key off input.sponsorOrFamily — that field's three options ("Single / No
 * Dependants", "Partner / Dependants with Functional English", "Partner /
 * Dependants WITHOUT Functional English") describe the skilled-visa
 * applicant's own accompanying partner/dependants for points-test and
 * second-instalment-fee purposes, not "I am seeking 820/801 sponsorship by
 * a partner" — treating it as a partner-visa signal would incorrectly
 * suppress genuine 189/190/491 results for the common case of a skilled
 * migrant who simply has a partner.
 *
 * Exported (and typed against a minimal structural subset of ReadinessInput,
 * not the full type) so ranked-pathways.ts can apply the exact same check
 * to the Visa Viability Ranking section — that section is built via a
 * separate code path from pathwayComparison and would otherwise keep
 * showing 189/190/491 there even after a partner-pathway selection is
 * correctly excluded from pathwayComparison itself.
 */
export function isPartnerPathwaySelected(input: { preferredPathway?: string }): boolean {
  const pref = norm(input.preferredPathway ?? "");
  if (!pref) return false;
  return pref.includes("820_801") || pref.includes("820/801") || pref.includes("partner visa") || pref.includes("partner vizesi");
}

function detectSubclasses(input: ReadinessInput): string[] {
  // Hard scope boundary: this engine cannot responsibly evaluate
  // family-sponsored pathways (see the "Partner/Family visas ... are
  // intentionally never detected" comments below), so when the user has
  // explicitly told us that's what they want, skip all skilled/employer/
  // student detection entirely rather than silently substituting an
  // unrelated pathway just because their occupation or freetext happens to
  // match a keyword.
  if (isPartnerPathwaySelected(input)) return [];

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
  if (/\b485\b/.test(pref)) found.add("485");
  if (/\b482\b/.test(pref)) found.add("482");
  if (/\b189\b/.test(pref)) found.add("189");
  if (/\b190\b/.test(pref)) found.add("190");
  if (/\b491\b/.test(pref)) found.add("491");
  if (/\b186\b/.test(pref)) found.add("186");
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
  // Structured signal from the course fields (name, CRICOS code, completion
  // status/date) — stronger and more direct than the freetext keyword match
  // above, same treatment as hasGraduateVisaPathwayIntent for 485 below.
  // These fields are shared with the 485 evidence checklist ("Recent
  // Australian study" — see getEvidenceStatusItems), so when the user has
  // explicitly selected 485 (found.has("485") from the explicit-number check
  // above), a completed/in-progress course is evidence FOR 485, not a signal
  // that they also want a fresh 500 — skip adding 500 in that case so one
  // shared field set can't make a 485 applicant's report show an unrelated
  // Student visa pathway.
  if (
    (input.courseName || input.courseCricosCode || input.courseCompletionStatus) &&
    !found.has("485")
  ) {
    found.add("500");
  }

  // Graduate → 485
  if (
    hasKw(combined, [
      "485",
      "graduate visa",
      "temporary graduate",
      "post-study work",
      "post study work",
      "psw",
      "mezun vizesi",
      "geçici mezun",
    ])
  ) {
    found.add("485");
  }
  // Structured signal from the "currently an international student in
  // Australia or planning to apply for a 485 Graduate Visa?" form field —
  // stronger and more direct than the freetext keyword match above, so it
  // is checked independently rather than folded into the hasKw() call.
  if (input.hasGraduateVisaPathwayIntent === true) {
    found.add("485");
  }

  // Sponsor/employer → 482
  // hasSponsorContext() correctly treats negated phrasing ("No employer
  // sponsor, open to regional nomination") as having NO sponsor context.
  // A plain hasKw(combined, [...]) substring match on "sponsor"/"employer"
  // used to fire even on that exact negation -- combined includes
  // input.sponsorOrFamily verbatim, so "No employer sponsor" still
  // contains "employer" and "sponsor" as substrings -- incorrectly
  // surfacing the 482 Skills in Demand Visa for skilled-only applicants
  // who explicitly said they have no sponsor. Gate the sponsorOrFamily
  // field through hasSponsorContext() and only keyword-match the other,
  // narrower fields (which describe visa intent, not sponsor status).
  const otherFieldsMentionSponsor = hasKw(
    [input.mainGoal ?? "", input.preferredPathway ?? "", input.biggestConcern ?? ""].join(" "),
    ["482", "employer", "sponsor", "sponsored", "job offer", "işveren", "sponsorlu"]
  );
  if (hasSponsorContext(input.sponsorOrFamily) || otherFieldsMentionSponsor) {
    found.add("482");
  }

  // Employer Nomination Scheme (permanent) → 186
  if (
    hasKw(combined, [
      "186",
      "employer nomination",
      "ens visa",
      "ens stream",
      "permanent sponsor",
      "temporary residence transition",
      "işveren aday gösterme",
      "kalıcı sponsor",
    ])
  ) {
    found.add("186");
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

/**
 * Single source of truth for which province's PNP module (if any) applies —
 * prefers an explicit input.targetProvince, then falls back to keyword
 * inference so existing free-text profiles ("Ontario", "OINP", "Toronto")
 * still resolve without requiring a new form field immediately. Every
 * downstream section (State Nomination Tracker, pathwayComparison PNP entry)
 * must read from this instead of re-deriving its own province guess.
 */
function resolveTargetProvince(input: ReadinessInput): ProvinceCode | undefined {
  if (input.targetProvince) return input.targetProvince;

  const combined = [input.mainGoal ?? "", input.preferredCity ?? "", input.preferredPathway ?? "", input.sponsorOrFamily ?? ""]
    .filter(Boolean)
    .join(" ");

  if (hasKw(combined, ["ontario", "oinp", "toronto", "ottawa", "mississauga", "hamilton", "london ontario"])) return "ON";
  if (hasKw(combined, ["british columbia", "bc pnp", "vancouver", "victoria bc", "surrey", "burnaby"])) return "BC";
  if (hasKw(combined, ["alberta", "ainp", "aaip", "calgary", "edmonton"])) return "AB";
  if (hasKw(combined, ["quebec", "montreal", "laval", "sherbrooke", "pstq", "mifi", "arrima"])) return "QC";
  return undefined;
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
  const hasLanguage = hasRealEnglishEvidence(input);
  const hasAge = Boolean(input.age);
  const hasEducation = Boolean(input.qualificationLevel);
  return hasNoc && hasLanguage && hasAge && hasEducation ? "HIGH" : "LOW";
}

// FSTP work-experience gate: 2 years (3,120 hours) within the last 5 years,
// deliberately separate constants from FSW's 1 year / 10 years (see
// buildCanadaPointsEstimate's CEC/FSW work-experience handling) so the two
// programs' hard gates can never be conflated.
const FSTP_MIN_WORK_EXPERIENCE_YEARS = 2;
const FSTP_MIN_WORK_EXPERIENCE_HOURS = 3120;
const FSTP_WORK_EXPERIENCE_LOOKBACK_YEARS = 5;
// FSTP's language threshold (CLB 5 speaking/listening, CLB 4 reading/writing)
// is lower than FSW's CLB 7 -- kept as its own named constant rather than
// reusing FSW's threshold anywhere in the FSTP gate.
const FSTP_LANGUAGE_THRESHOLD = { speakingListening: "CLB 5", readingWriting: "CLB 4" } as const;

export type FSTPEligibility = {
  /** Code-based NOC check (lib/readiness/noc-fstp-groups.ts) — never free-text keyword matching. */
  occupationEligible: boolean;
  nocCode?: string;
  /** True once >= FSTP_MIN_WORK_EXPERIENCE_YEARS of combined offshore+onshore experience is on file (a proxy for the 3,120-hour/5-year rule; hours are not separately collected). */
  workExperienceGateMet: boolean;
  workExperienceYears: number;
  /** Best-effort from the coarse englishLevel field; any tier at or above "competent" clears CLB 5/4. Undefined English is treated as not meeting the threshold, not silently passing. */
  languageThresholdMet: boolean;
  /**
   * The intake form does not currently collect a job offer or a Canadian
   * certificate of qualification, so this hard gate cannot be confirmed
   * true or false from user input -- it is surfaced as "unmet" (not
   * silently assumed satisfied) so the report flags it for manual
   * verification instead of asserting eligibility the data can't support.
   */
  hasJobOfferOrCertificateOfQualification: false;
};

/**
 * Single source of truth for FSTP eligibility -- every downstream section
 * (pathway detection, Structured Pathway Comparison text, Audit-Ready Proof
 * Checklist gating) must read from this instead of re-deriving its own
 * occupation or work-experience check, mirroring the hasRealEnglishEvidence
 * pattern used for the English-evidence fix.
 */
function buildFSTPEligibility(input: ReadinessInput): FSTPEligibility {
  const nocResult = checkNocOccupation({ occupation: input.occupation ?? "", nocCode: input.nocCode });
  const resolvedNocCode = input.nocCode ?? nocResult.matches[0]?.code;
  const occupationEligible = Boolean(resolvedNocCode && isFSTPEligibleOccupation(resolvedNocCode));

  const workExperienceYears = (input.offshoreExperienceYears ?? 0) + (input.onshoreExperienceYears ?? 0);
  const workExperienceGateMet = workExperienceYears >= FSTP_MIN_WORK_EXPERIENCE_YEARS;

  const englishOption = input.englishLevel ? parseEnglishOption(input.englishLevel) : null;
  const languageThresholdMet = englishOption === "competent" || englishOption === "proficient" || englishOption === "superior";

  return {
    occupationEligible,
    nocCode: resolvedNocCode,
    workExperienceGateMet,
    workExperienceYears,
    languageThresholdMet,
    hasJobOfferOrCertificateOfQualification: false,
  };
}

/**
 * Resolves eligibility against all 3 Ontario Workforce Priority Stream
 * pathways from actual profile data (NOC/TEER, language tier, job offer —
 * unconfirmed by the intake form). Single source of truth: both the State
 * Nomination Tracker and any future PNP-specific report text must read from
 * this instead of re-deriving their own Ontario checks.
 */
function buildOntarioPnpEligibility(input: ReadinessInput): OntarioPathwayResult[] {
  const nocResult = checkNocOccupation({ occupation: input.occupation ?? "", nocCode: input.nocCode });
  const nocMatch = nocResult.matches.find((m) => m.code === input.nocCode) ?? nocResult.matches[0];
  const resolvedNocCode = input.nocCode ?? nocMatch?.code;
  const occupationTeer = input.nocTeer ?? nocMatch?.teer;

  // check-noc-occupation.ts's NocMatch doesn't expose majorGroup/minorGroup
  // directly, but qualifiesForOntarioTradesLanguageException only needs the
  // code (its additional-codes/minor-group-prefix checks work off the code
  // string) plus majorGroup, which we can derive from the code's first two
  // digits — NOC 2021 codes are always major-group-prefixed.
  const majorGroup = resolvedNocCode?.slice(0, 2) ?? "";
  const minorGroup = resolvedNocCode?.slice(0, 3) ?? "";
  const qualifiesForTradesLanguageException = resolvedNocCode
    ? qualifiesForOntarioTradesLanguageException({ majorGroup, minorGroup, code: resolvedNocCode })
    : false;

  const englishOption = input.englishLevel ? parseEnglishOption(input.englishLevel) : null;
  const meetsClb6 = englishOption === "competent" || englishOption === "proficient" || englishOption === "superior";
  // The coarse englishLevel enum (competent/proficient/superior) doesn't
  // distinguish CLB 4/5/6 bands below "competent" -- any provided tier is
  // treated as clearing CLB 4/5 too, and "none"/unset fails all three, same
  // limitation already accepted for the FSTP language gate.
  const meetsClb5Trades = meetsClb6;
  const meetsClb4 = meetsClb6;

  function buildResult(pathwayId: OntarioPathwayId, stream: ProvinceStream): OntarioPathwayResult {
    if (pathwayId === "SELF_EMPLOYED_PHYSICIAN") {
      // No job offer or language threshold to check per Ontario's own
      // published requirements -- eligibility hinges entirely on OHIP
      // billing/CPSO registration, which this intake form does not collect.
      return {
        pathwayId,
        stream,
        occupationTeer,
        languageThresholdMet: true,
        qualifiesForTradesLanguageException: false,
        hasQualifyingJobOffer: false,
        eligible: false,
        missingRequirements: ["OHIP billing eligibility and CPSO registration status (not collected by this form)"],
      };
    }

    const languageThresholdMet = pathwayId === "TEER_0_3" ? (qualifiesForTradesLanguageException ? meetsClb5Trades : meetsClb6) : meetsClb4;
    const teerMatches =
      pathwayId === "TEER_0_3" ? occupationTeer !== undefined && occupationTeer <= 3 : occupationTeer !== undefined && occupationTeer >= 4;

    const missing: string[] = [];
    if (occupationTeer === undefined) missing.push("NOC/TEER code (not resolved from occupation)");
    else if (!teerMatches) missing.push(pathwayId === "TEER_0_3" ? "occupation TEER 0-3" : "occupation TEER 4-5");
    if (!languageThresholdMet) missing.push(stream.languageThreshold);
    missing.push("qualifying full-time job offer in Ontario (not collected by this form)");

    return {
      pathwayId,
      stream,
      occupationTeer,
      languageThresholdMet,
      qualifiesForTradesLanguageException: pathwayId === "TEER_0_3" && qualifiesForTradesLanguageException,
      hasQualifyingJobOffer: false,
      // hasQualifyingJobOffer is always false (unconfirmed by the form), so
      // "eligible" never reaches true on job offer alone -- this correctly
      // reflects that the job-offer gate always needs manual verification,
      // rather than asserting eligibility the data can't support.
      eligible: false,
      missingRequirements: missing,
    };
  }

  return [
    buildResult("TEER_0_3", ONTARIO_WORKFORCE_PRIORITY_STREAMS[0]),
    buildResult("TEER_4_5", ONTARIO_WORKFORCE_PRIORITY_STREAMS[1]),
    buildResult("SELF_EMPLOYED_PHYSICIAN", ONTARIO_WORKFORCE_PRIORITY_STREAMS[2]),
  ];
}

function ontarioPathwayScore(result: OntarioPathwayResult): { score: number; matchLevel: "high" | "medium" | "low" } {
  if (result.pathwayId === "SELF_EMPLOYED_PHYSICIAN") return { score: 20, matchLevel: "low" };
  const teerMatches = result.missingRequirements.every((m) => !m.includes("TEER") && !m.includes("NOC/TEER"));
  if (teerMatches && result.languageThresholdMet) return { score: 65, matchLevel: "medium" };
  if (teerMatches || result.languageThresholdMet) return { score: 35, matchLevel: "low" };
  return { score: 10, matchLevel: "low" };
}

function isFederalEeEligible(input: ReadinessInput): boolean {
  const nocResult = checkNocOccupation({ occupation: input.occupation ?? "", nocCode: input.nocCode });
  const nocMatch = nocResult.matches.find((m) => m.code === input.nocCode) ?? nocResult.matches[0];
  const resolvedNocCode = input.nocCode ?? nocMatch?.code;
  const occupationTeer = input.nocTeer ?? nocMatch?.teer;

  const englishOption = input.englishLevel ? parseEnglishOption(input.englishLevel) : null;
  const meetsClb7 = englishOption === "proficient" || englishOption === "superior";
  const totalExperience = (input.offshoreExperienceYears ?? 0) + (input.onshoreExperienceYears ?? 0);

  // FSWP/CEC criteria: TEER 0-3, CLB 7+, >= 1 year of experience
  const meetsFswOrCec = occupationTeer !== undefined && occupationTeer <= 3 && meetsClb7 && totalExperience >= 1;

  // FSTP criteria:
  const fstp = buildFSTPEligibility(input);
  const meetsFstp = fstp.occupationEligible && fstp.workExperienceGateMet && fstp.languageThresholdMet;

  return meetsFswOrCec || meetsFstp;
}

function buildBcPnpEligibility(
  input: ReadinessInput,
  isFederalEeEligible: boolean
): BCPathwayResult[] {
  const nocResult = checkNocOccupation({ occupation: input.occupation ?? "", nocCode: input.nocCode });
  const nocMatch = nocResult.matches.find((m) => m.code === input.nocCode) ?? nocResult.matches[0];
  const resolvedNocCode = input.nocCode ?? nocMatch?.code;
  const occupationTeer = input.nocTeer ?? nocMatch?.teer;

  const englishOption = input.englishLevel ? parseEnglishOption(input.englishLevel) : null;
  const meetsClb6 = englishOption === "competent" || englishOption === "proficient" || englishOption === "superior";

  const bcPathways: {
    id: BCPathwayId;
    requiresJobOffer: boolean;
    jobOfferMinDurationMonths?: number;
    jobOfferMinDaysRemaining?: number;
    eligibleTEER: number[];
    requiresFederalEEEligibility?: boolean;
  }[] = [
    { id: "BC_SKILLED_WORKER", requiresJobOffer: true, eligibleTEER: [0, 1, 2, 3] },
    { id: "BC_HEALTH_AUTHORITY", requiresJobOffer: true, eligibleTEER: [0, 1, 2, 3, 4, 5] },
    { id: "BC_INTL_GRAD", requiresJobOffer: true, eligibleTEER: [0, 1, 2, 3] },
    { id: "BC_INTL_POSTGRAD", requiresJobOffer: true, jobOfferMinDurationMonths: 12, jobOfferMinDaysRemaining: 120, eligibleTEER: [0, 1, 2, 3, 4, 5] },
    { id: "BC_EEBC", requiresJobOffer: true, eligibleTEER: [0, 1, 2], requiresFederalEEEligibility: true },
  ];

  return bcPathways.map((pw, index) => {
    const stream = BC_PNP_STREAMS[index];
    const missing: string[] = [];

    const teerMatches = occupationTeer !== undefined && pw.eligibleTEER.includes(occupationTeer);
    if (occupationTeer === undefined) {
      missing.push("NOC/TEER code (not resolved from occupation)");
    } else if (!teerMatches) {
      missing.push(`eligible occupation in TEER ${pw.eligibleTEER.join(", ")}`);
    }

    if (!meetsClb6) {
      missing.push(stream.languageThreshold);
    }

    if (pw.requiresFederalEEEligibility && !isFederalEeEligible) {
      missing.push("active and eligible Federal Express Entry profile (FSWP, CEC, or FSTP)");
    }

    if (pw.jobOfferMinDurationMonths && pw.jobOfferMinDaysRemaining) {
      missing.push(`qualifying BC job offer of at least ${pw.jobOfferMinDurationMonths} months with at least ${pw.jobOfferMinDaysRemaining} days remaining (not collected by this form)`);
    } else {
      missing.push("qualifying full-time, indeterminate job offer in British Columbia (not collected by this form)");
    }

    return {
      pathwayId: pw.id,
      stream,
      occupationTeer,
      languageThresholdMet: meetsClb6,
      hasQualifyingJobOffer: false,
      eligible: false,
      missingRequirements: missing,
    };
  });
}

function bcPathwayScore(result: BCPathwayResult): { score: number; matchLevel: "high" | "medium" | "low" } {
  const teerAndLangMet = result.missingRequirements.every(
    (m) =>
      !m.includes("NOC/TEER") &&
      !m.includes("TEER") &&
      !m.includes("CLB") &&
      !m.includes("language") &&
      !m.includes("Express Entry profile")
  );
  if (teerAndLangMet) return { score: 60, matchLevel: "medium" };
  return { score: 20, matchLevel: "low" };
}

function buildAlbertaPnpEligibility(
  input: ReadinessInput,
  isFederalEeEligible: boolean,
  estimatedPoints?: number
): AlbertaPathwayResult[] {
  const nocResult = checkNocOccupation({ occupation: input.occupation ?? "", nocCode: input.nocCode });
  const nocMatch = nocResult.matches.find((m) => m.code === input.nocCode) ?? nocResult.matches[0];
  const resolvedNocCode = input.nocCode ?? nocMatch?.code;
  const occupationTeer = input.nocTeer ?? nocMatch?.teer;

  const englishOption = input.englishLevel ? parseEnglishOption(input.englishLevel) : null;
  const meetsClb5 = englishOption === "competent" || englishOption === "proficient" || englishOption === "superior";
  const meetsClb4 = meetsClb5;

  const abPathways: {
    id: AlbertaPathwayId;
    requiresJobOffer: boolean;
    requiresCurrentAlbertaEmployment?: boolean;
    requiresCommunityEndorsement?: boolean;
    minCRS?: number;
  }[] = [
    { id: "AB_OPPORTUNITY", requiresJobOffer: true, requiresCurrentAlbertaEmployment: true },
    { id: "AB_EXPRESS_ENTRY", requiresJobOffer: false, minCRS: 300 },
    { id: "AB_RURAL_RENEWAL", requiresJobOffer: true, requiresCommunityEndorsement: true },
    { id: "AB_TOURISM_HOSPITALITY", requiresJobOffer: true, requiresCurrentAlbertaEmployment: true },
  ];

  return abPathways.map((pw, index) => {
    const stream = ALBERTA_AAIP_STREAMS[index];
    const missing: string[] = [];

    if (occupationTeer === undefined) {
      missing.push("NOC/TEER code (not resolved from occupation)");
    }

    let langMet = true;
    if (pw.id === "AB_OPPORTUNITY" || pw.id === "AB_RURAL_RENEWAL") {
      const requiredClb = (occupationTeer !== undefined && occupationTeer <= 3) ? 5 : 4;
      langMet = requiredClb === 5 ? meetsClb5 : meetsClb4;
      if (!langMet) missing.push(`CLB ${requiredClb} language proficiency`);
    } else if (pw.id === "AB_TOURISM_HOSPITALITY") {
      langMet = meetsClb4;
      if (!langMet) missing.push("CLB 4 language proficiency");
    } else if (pw.id === "AB_EXPRESS_ENTRY") {
      langMet = isFederalEeEligible;
      if (!langMet) missing.push("Must meet language requirements for a Federal Express Entry program");
    }

    if (pw.requiresJobOffer) {
      missing.push("qualifying job offer from an Alberta employer (not collected by this form)");
    }
    if (pw.requiresCurrentAlbertaEmployment) {
      missing.push("active full-time employment in Alberta (not collected by this form)");
    }
    if (pw.requiresCommunityEndorsement) {
      missing.push("official rural community endorsement letter (not collected by this form)");
    }

    let crsMet = true;
    if (pw.id === "AB_EXPRESS_ENTRY") {
      if (!isFederalEeEligible) {
        missing.push("active and eligible Federal Express Entry profile (FSWP, CEC, or FSTP)");
      }
      if (estimatedPoints === undefined) {
        missing.push("valid CRS points estimate (requires age and English level)");
        crsMet = false;
      } else if (estimatedPoints < (pw.minCRS ?? 300)) {
        missing.push(`Express Entry CRS score of at least ${pw.minCRS} (current estimate: ${estimatedPoints})`);
        crsMet = false;
      }
    }

    const eligible = pw.id === "AB_EXPRESS_ENTRY" ? (isFederalEeEligible && crsMet) : false;

    return {
      pathwayId: pw.id,
      stream,
      occupationTeer,
      languageThresholdMet: langMet,
      hasQualifyingJobOffer: false,
      eligible,
      missingRequirements: missing,
    };
  });
}

function albertaPathwayScore(result: AlbertaPathwayResult): { score: number; matchLevel: "high" | "medium" | "low" } {
  if (result.pathwayId === "AB_EXPRESS_ENTRY" && result.eligible) {
    return { score: 85, matchLevel: "high" };
  }
  const otherMet = result.missingRequirements.every(
    (m) =>
      !m.includes("NOC/TEER") &&
      !m.includes("CLB") &&
      !m.includes("language") &&
      !m.includes("Express Entry")
  );
  if (otherMet) return { score: 60, matchLevel: "medium" };
  return { score: 20, matchLevel: "low" };
}

function buildQuebecPSTQEligibility(input: ReadinessInput): QuebecPSTQResult[] {
  const isTr = input.locale === "tr";
  const isZh = input.locale === "zh-Hans";

  const nocResult = checkNocOccupation({ occupation: input.occupation ?? "", nocCode: input.nocCode });
  const nocMatch = nocResult.matches.find((m) => m.code === input.nocCode) ?? nocResult.matches[0];
  const resolvedNocCode = input.nocCode ?? nocMatch?.code;
  const occupationTeer = input.nocTeer ?? nocMatch?.teer;

  const occLower = (input.occupation ?? "").toLowerCase();
  const isRegulated = ["nurse", "hemşire", "physician", "doctor", "hekim", "doktor", "engineer", "mühendis", "lawyer", "avukat"].some(
    (kw) => occLower.includes(kw)
  );

  const resolvedStreamId = resolvePSTQStream(resolvedNocCode ?? "", isRegulated, occupationTeer ?? 1);

  // Parse French levels
  let oral = (input as any).frenchOralLevel !== undefined ? Number((input as any).frenchOralLevel) : undefined;
  let written = (input as any).frenchWrittenLevel !== undefined ? Number((input as any).frenchWrittenLevel) : undefined;

  const combinedText = [input.mainGoal, input.preferredPathway, input.biggestConcern, input.sponsorOrFamily]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  
  if (oral === undefined) {
    const oralMatch = combinedText.match(/french oral\s*(\d+)/i) || combinedText.match(/fransızca sözlü\s*(\d+)/i);
    if (oralMatch) oral = Number(oralMatch[1]);
  }
  if (written === undefined) {
    const writtenMatch = combinedText.match(/french written\s*(\d+)/i) || combinedText.match(/fransızca yazılı\s*(\d+)/i);
    if (writtenMatch) written = Number(writtenMatch[1]);
  }

  const ageNum = input.age ? Number(input.age) : undefined;
  const hasSpouse = input.sponsorOrFamily ? !["no spouse", "single", "eşi yok"].some(kw => input.sponsorOrFamily!.toLowerCase().includes(kw)) : false;

  return QUEBEC_PSTQ_STREAMS.map((stream) => {
    const missing: string[] = [];
    let frenchLevelMet = true;
    let workExperienceMet = true;
    let recognitionStatus: "not_applicable" | "pending" | "recognized" = "not_applicable";

    // 1. Common Age Check
    if (ageNum !== undefined && ageNum < 18) {
      missing.push(isTr ? "18 yaşından büyük olmak" : isZh ? "年满18岁" : "Must be at least 18 years old");
    }

    // 2. French Oral Requirement
    if (oral === undefined) {
      frenchLevelMet = false;
      missing.push(
        isTr
          ? `Fransızca sözlü seviye ${stream.frenchOralMin} (gerekli Fransızca yeterlilik kanıtı bulunamadı)`
          : isZh
            ? `法语口语水平达到 ${stream.frenchOralMin} 级（未提供法语能力证明）`
            : `Oral French level ${stream.frenchOralMin} (no French proficiency evidence found)`
      );
    } else if (oral < stream.frenchOralMin) {
      frenchLevelMet = false;
      missing.push(
        isTr
          ? `Fransızca sözlü seviye ${stream.frenchOralMin} (mevcut: ${oral})`
          : isZh
            ? `法语口语水平达到 ${stream.frenchOralMin} 级（当前：${oral}）`
            : `Oral French level ${stream.frenchOralMin} (current: ${oral})`
      );
    }

    // 3. French Written Requirement (if applicable)
    if (stream.frenchWrittenMin !== undefined) {
      if (written === undefined) {
        frenchLevelMet = false;
        missing.push(
          isTr
            ? `Fransızca yazılı seviye ${stream.frenchWrittenMin} (gerekli Fransızca yeterlilik kanıtı bulunamadı)`
            : isZh
              ? `法语书面水平达到 ${stream.frenchWrittenMin} 级（未提供法语能力证明）`
              : `Written French level ${stream.frenchWrittenMin} (no French proficiency evidence found)`
        );
      } else if (written < stream.frenchWrittenMin) {
        frenchLevelMet = false;
        missing.push(
          isTr
            ? `Fransızca yazılı seviye ${stream.frenchWrittenMin} (mevcut: ${written})`
            : isZh
              ? `法语书面水平达到 ${stream.frenchWrittenMin} 级（当前：${written}）`
              : `Written French level ${stream.frenchWrittenMin} (current: ${written})`
        );
      }
    }

    // 4. Spousal French Check
    if (hasSpouse) {
      missing.push(
        isTr
          ? "Eşlik eden eşin Fransızca sözlü seviye 4 olması gerekir (formda doğrulanmamıştır)"
          : isZh
            ? "随行配偶的法语口语水平需达到 4 级（本表单未核验）"
            : "Accompanying spouse oral French level 4 (not verified by this form)"
      );
    }

    // 5. Work Experience check
    const totalExp = (input.offshoreExperienceYears ?? 0) + (input.onshoreExperienceYears ?? 0);
    if (stream.id === "STREAM_2_INTERMEDIATE") {
      if (totalExp < 2) {
        workExperienceMet = false;
        missing.push(
          isTr
            ? `Son 5 yılda en az 2 yıl iş deneyimi (mevcut: ${totalExp} yıl)`
            : isZh
              ? `近 5 年内至少有 2 年工作经验（当前：${totalExp} 年）`
              : `At least 2 years of work experience in the last 5 years (current: ${totalExp} years)`
        );
      }
      missing.push(
        isTr
          ? "Quebec'te en az 1 yıl tam zamanlı iş deneyimi (formda toplanmamıştır)"
          : isZh
            ? "在魁北克省内至少 1 年的全职工作经验（本表单未收集）"
            : "At least 1 year of full-time work experience in Quebec (not collected by this form)"
      );
    } else if (stream.id === "STREAM_4_EXCEPTIONAL") {
      if (totalExp < 3) {
        workExperienceMet = false;
        missing.push(
          isTr
            ? `Son 5 yılda en az 3 yıl mesleki deneyim (mevcut: ${totalExp} yıl)`
            : isZh
              ? `近 5 年内至少有 3 年专业工作经验（当前：${totalExp} 年）`
              : `At least 3 years of professional work experience in the last 5 years (current: ${totalExp} years)`
        );
      }
      missing.push(
        isTr
          ? "İstisnai yetenek ve uluslararası başarı kanıtı (ödüller, patentler, yayınlar)"
          : isZh
            ? "杰出才能及国际声誉证明（如奖项、专利、出版物等）"
            : "Proof of exceptional talent and international recognition (awards, patents, publications)"
      );
      if (isCalqArtsOccupation(resolvedNocCode)) {
        missing.push(
          isTr
            ? "UYARI: CALQ sanat/kültür alt-akışı şu anda yeni başvurulara kapatılmıştır."
            : isZh
              ? "警告：CALQ 艺术与文化子通道当前已关闭，不接受新申请。"
              : "WARNING: CALQ arts & culture sub-stream is currently closed to new applications."
        );
      }
    }

    // 6. Professional Recognition Check (Stream 3)
    if (stream.id === "STREAM_3_REGULATED") {
      recognitionStatus = "pending";
      missing.push(
        isTr
          ? "Quebec Meslek Odası (Professional Order) tarafından denklik/tanınma (tanınma onaylanana kadar süreç pending olarak değerlendirilir)"
          : isZh
            ? "魁北克专业协会（Professional Order）的资格认证/承认（在认证获得批准前，该状态显示为待定）"
            : "Professional order recognition or denklik (process is considered pending until recognition is verified)"
      );
    }

    // Stream Routing Check (Must be routed to this stream)
    const isRoutedToThis = stream.id === resolvedStreamId || (stream.id === "STREAM_4_EXCEPTIONAL" && totalExp >= 3);
    const eligible = isRoutedToThis && frenchLevelMet && workExperienceMet && (stream.id !== "STREAM_3_REGULATED");

    return {
      streamId: stream.id,
      stream,
      eligible,
      missingRequirements: missing,
      frenchLevelMet,
      workExperienceMet,
      recognitionStatus,
    };
  });
}

function quebecPathwayScore(result: QuebecPSTQResult): { score: number; matchLevel: "high" | "medium" | "low" } {
  if (result.frenchLevelMet) {
    if (result.streamId === "STREAM_3_REGULATED") {
      return { score: 70, matchLevel: "medium" };
    }
    return { score: 85, matchLevel: "high" };
  }
  return { score: 15, matchLevel: "low" };
}

/**
 * Province-scoped Canada equivalent of calculateStateNominationTracker
 * (AU). Only Ontario has a real eligibility module wired up in this pass
 * (SUPPORTED_PROVINCES) -- BC/Alberta and any unrecognized/unset target
 * return an eligibilityBlocked tracker with an honest "not yet supported"
 * note instead of silently returning nothing or fabricating a result.
 */
function buildCanadaStateNominationTracker(
  input: ReadinessInput,
  locale: Locale
): StateNominationTracker {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const targetProvince = resolveTargetProvince(input);

  if (!targetProvince || !SUPPORTED_PROVINCES.has(targetProvince)) {
    const blockedReason = !targetProvince
      ? (isTr
          ? "Hedef eyalet belirtilmedi. Eyalet aday gösterme (PNP) analizi için bir hedef eyalet (örn. Ontario) belirtin."
          : isZh
            ? "未指定目标省份。请指定目标省份（如安大略省）以获取省提名（PNP）分析。"
            : "No target province was specified. Provide a target province (e.g. Ontario) for provincial nominee program (PNP) analysis.")
      : (isTr
          ? `${targetProvince} eyaleti için ayrıntılı bir PNP değerlendirme modülü henüz bu raporda desteklenmiyor. Bu, genel bilgidir; güncel eyalet PNP kriterleri için resmi kaynağı kontrol edin.`
          : isZh
            ? `本报告尚不支持 ${targetProvince} 省的详细 PNP 评估模块。这是一般信息；请查阅官方来源获取最新的省级 PNP 标准。`
            : `A detailed PNP eligibility module for ${targetProvince} is not yet supported in this report. This is general information only — check the official source for current provincial PNP criteria.`);
    return { states: [], topRecommendedStates: [], note: blockedReason, eligibilityBlocked: true, blockedReason };
  }

  const isEeEligible = isFederalEeEligible(input);

  if (targetProvince === "ON") {
    const ontarioResults = buildOntarioPnpEligibility(input);
    const pathwayLabel: Record<OntarioPathwayId, string> = {
      TEER_0_3: isTr ? "Ontario — TEER 0-3" : isZh ? "安大略省 — TEER 0-3" : "Ontario — TEER 0-3",
      TEER_4_5: isTr ? "Ontario — TEER 4-5" : isZh ? "安大略省 — TEER 4-5" : "Ontario — TEER 4-5",
      SELF_EMPLOYED_PHYSICIAN: isTr
        ? "Ontario — Kendi Hesabına Çalışan Hekimler"
        : isZh
          ? "安大略省 — 自雇医生"
          : "Ontario — Self-Employed Physicians",
    };

    const states: StateNominationState[] = ontarioResults.map((result) => {
      const { score, matchLevel } = ontarioPathwayScore(result);
      return {
        code: "ON",
        name: pathwayLabel[result.pathwayId],
        status: "Closed",
        matchLevel,
        score,
        summary: result.stream.notes,
        requirements: result.missingRequirements,
      };
    });

    const topRecommendedStates = [...states].sort((a, b) => b.score - a.score).slice(0, 2);

    return {
      states,
      topRecommendedStates,
      note: ontarioStreamsIntroText(locale),
      eligibilityBlocked: false,
    };
  }

  if (targetProvince === "BC") {
    const bcResults = buildBcPnpEligibility(input, isEeEligible);
    const pathwayLabel: Record<BCPathwayId, string> = {
      BC_SKILLED_WORKER: isTr ? "BC — Skilled Worker" : isZh ? "BC省 — Skilled Worker" : "BC — Skilled Worker",
      BC_HEALTH_AUTHORITY: isTr ? "BC — Health Authority" : isZh ? "BC省 — Health Authority" : "BC — Health Authority",
      BC_INTL_GRAD: isTr ? "BC — International Graduate" : isZh ? "BC省 — International Graduate" : "BC — International Graduate",
      BC_INTL_POSTGRAD: isTr ? "BC — International Post-Graduate" : isZh ? "BC省 — International Post-Graduate" : "BC — International Post-Graduate",
      BC_EEBC: isTr ? "BC — Express Entry BC (EEBC)" : isZh ? "BC省 — Express Entry BC (EEBC)" : "BC — Express Entry BC (EEBC)",
    };

    const states: StateNominationState[] = bcResults.map((result) => {
      const { score, matchLevel } = bcPathwayScore(result);
      return {
        code: "BC",
        name: pathwayLabel[result.pathwayId],
        status: "Open for Offshore",
        matchLevel,
        score,
        summary: result.stream.notes,
        requirements: result.missingRequirements,
      };
    });

    const topRecommendedStates = [...states].sort((a, b) => b.score - a.score).slice(0, 2);

    return {
      states,
      topRecommendedStates,
      note: bcStreamsIntroText(locale),
      eligibilityBlocked: false,
    };
  }

  if (targetProvince === "QC") {
    const qcResults = buildQuebecPSTQEligibility(input);
    const pathwayLabel: Record<PSTQStreamId, string> = {
      STREAM_1_SPECIALIZED: isTr ? "Quebec — Specialized Skills" : isZh ? "魁北克 — Specialized Skills" : "Quebec — Specialized Skills",
      STREAM_2_INTERMEDIATE: isTr ? "Quebec — Intermediate Skills" : isZh ? "魁北克 — Intermediate Skills" : "Quebec — Intermediate Skills",
      STREAM_3_REGULATED: isTr ? "Quebec — Regulated Professions" : isZh ? "魁北克 — Regulated Professions" : "Quebec — Regulated Professions",
      STREAM_4_EXCEPTIONAL: isTr ? "Quebec — Exceptional Talent" : isZh ? "魁北克 — Exceptional Talent" : "Quebec — Exceptional Talent",
    };

    const states: StateNominationState[] = qcResults.map((result) => {
      const { score, matchLevel } = quebecPathwayScore(result);
      return {
        code: "QC",
        name: pathwayLabel[result.streamId],
        status: "Open for Offshore",
        matchLevel,
        score,
        summary: result.stream.notes,
        requirements: result.missingRequirements,
      };
    });

    const topRecommendedStates = [...states].sort((a, b) => b.score - a.score).slice(0, 2);

    return {
      states,
      topRecommendedStates,
      note: quebecStreamsIntroText(locale),
      eligibilityBlocked: false,
    };
  }

  // targetProvince === "AB"
  const pointsEstimate = buildCanadaPointsEstimate(input, locale);
  const abResults = buildAlbertaPnpEligibility(input, isEeEligible, pointsEstimate.estimatedPoints);
  const pathwayLabel: Record<AlbertaPathwayId, string> = {
    AB_OPPORTUNITY: isTr ? "Alberta — Opportunity Stream" : isZh ? "阿尔伯塔省 — Opportunity Stream" : "Alberta — Opportunity Stream",
    AB_EXPRESS_ENTRY: isTr ? "Alberta — Express Entry Stream" : isZh ? "阿尔伯塔省 — Express Entry Stream" : "Alberta — Express Entry Stream",
    AB_RURAL_RENEWAL: isTr ? "Alberta — Rural Renewal Stream" : isZh ? "阿尔伯塔省 — Rural Renewal Stream" : "Alberta — Rural Renewal Stream",
    AB_TOURISM_HOSPITALITY: isTr ? "Alberta — Tourism & Hospitality" : isZh ? "阿尔伯塔省 — Tourism & Hospitality" : "Alberta — Tourism & Hospitality",
  };

  const states: StateNominationState[] = abResults.map((result) => {
    const { score, matchLevel } = albertaPathwayScore(result);
    return {
      code: "AB",
      name: pathwayLabel[result.pathwayId],
      status: "Open for Offshore",
      matchLevel,
      score,
      summary: result.stream.notes,
      requirements: result.missingRequirements,
    };
  });

  const topRecommendedStates = [...states].sort((a, b) => b.score - a.score).slice(0, 2);

  return {
    states,
    topRecommendedStates,
    note: albertaStreamsIntroText(locale),
    eligibilityBlocked: false,
  };
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
  occupation?: string,
  fstpEligibility?: FSTPEligibility
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

    // FSTP gets its own branch instead of falling into the generic
    // isExpressEntry copy shared with CEC/FSW: its work-experience duration
    // (2yr/3,120hr/5yr, not CEC's 1yr/1,560hr or FSW's 1yr/10yr), language
    // threshold (CLB 5/4, not CLB 7), and job-offer-OR-certificate hard gate
    // are all distinct rules that generic Express Entry wording would
    // misrepresent. fstpEligibility is the single source of truth for these
    // (buildFSTPEligibility) -- this branch only renders it.
    if (code === "FSTP" && fstpEligibility) {
      if (!fstpEligibility.occupationEligible) {
        return {
          subclass: "FSTP",
          visaName: isTr ? CANADA_PATHWAY_NAMES[code].tr : CANADA_PATHWAY_NAMES[code].en,
          reason: isTr
            ? `NOC kodunuz (${fstpEligibility.nocCode ?? "?"}) FSTP (Federal Skilled Trades) için geçerli bir ticaret grubu (Major Group 72/73/82/83/92/93 veya Chef/Cook) kapsamında değildir.`
            : isZh
              ? `您的 NOC 代码（${fstpEligibility.nocCode ?? "?"}）不在 FSTP（联邦技工类）符合条件的技工组别内。`
              : `Your NOC code (${fstpEligibility.nocCode ?? "?"}) is not in an eligible trade group for the Federal Skilled Trades Program (FSTP).`,
          relevance: "ineligible",
          confidenceLevel: "high",
          confidenceExplanation: isTr
            ? "NOC kodu ticaret grubu kapsamında olmadığı için kesin olarak uygun değildir."
            : isZh
              ? "由于 NOC 代码不属于技工组别，确定不符合该途径。"
              : "Definitively ineligible because the NOC code is not within the eligible skilled trades groups.",
          difficulty: "high",
          requirementType: isTr ? "NOC Ticaret Grubu" : isZh ? "NOC 技工类型" : "NOC Trade Group Eligibility",
          userRelativePosition: isTr
            ? "Bu yol için meslek kodu uygun değildir."
            : "Occupation code is not eligible for this pathway.",
          keyRequirements: isTr
            ? ["FSTP uygun ticaret grubunda NOC kodu (Major Group 72/73/82/83/92/93 veya Chef/Cook)"]
            : ["NOC code in an FSTP-eligible trade group (Major Group 72/73/82/83/92/93 or Chef/Cook)"],
          pathwaySpecificRisks: [
            isTr
              ? "Ticari meslek dışındaki profiller FSTP yolundan başvuramaz. Lütfen CEC veya FSW gibi diğer Express Entry kanallarını değerlendirin."
              : isZh
                ? "非技工类职业无法通过 FSTP 申请。请考虑 CEC 或 FSW 等其他快速通道项目。"
                : "Non-trade occupations cannot apply via the FSTP. Please consider CEC or FSW Express Entry streams."
          ],
        };
      }
      const hardGateUnmet = !fstpEligibility.workExperienceGateMet || !fstpEligibility.languageThresholdMet;
      const missingBits: string[] = [];
      if (!fstpEligibility.workExperienceGateMet) {
        missingBits.push(
          isTr
            ? `son ${FSTP_WORK_EXPERIENCE_LOOKBACK_YEARS} yıl içinde en az ${FSTP_MIN_WORK_EXPERIENCE_YEARS} yıl (${FSTP_MIN_WORK_EXPERIENCE_HOURS} saat) ilgili ticaret deneyimi`
            : isZh
              ? `过去 ${FSTP_WORK_EXPERIENCE_LOOKBACK_YEARS} 年内至少 ${FSTP_MIN_WORK_EXPERIENCE_YEARS} 年（${FSTP_MIN_WORK_EXPERIENCE_HOURS} 小时）相关技工经验`
              : `at least ${FSTP_MIN_WORK_EXPERIENCE_YEARS} years (${FSTP_MIN_WORK_EXPERIENCE_HOURS} hours) of relevant trade experience within the last ${FSTP_WORK_EXPERIENCE_LOOKBACK_YEARS} years`
        );
      }
      if (!fstpEligibility.languageThresholdMet) {
        missingBits.push(
          isTr
            ? `${FSTP_LANGUAGE_THRESHOLD.speakingListening} konuşma/dinleme ve ${FSTP_LANGUAGE_THRESHOLD.readingWriting} okuma/yazma dil eşiği`
            : isZh
              ? `口语/听力达到 ${FSTP_LANGUAGE_THRESHOLD.speakingListening}、读写达到 ${FSTP_LANGUAGE_THRESHOLD.readingWriting} 的语言门槛`
              : `${FSTP_LANGUAGE_THRESHOLD.speakingListening} speaking/listening and ${FSTP_LANGUAGE_THRESHOLD.readingWriting} reading/writing language threshold`
        );
      }
      return {
        subclass: code,
        visaName: isTr ? CANADA_PATHWAY_NAMES[code].tr : CANADA_PATHWAY_NAMES[code].en,
        reason: isTr
          ? `NOC kodunuz (${fstpEligibility.nocCode ?? "?"}) FSTP için uygun ticaret grubunda.${hardGateUnmet ? ` Ancak ${missingBits.join(" ve ")} henüz doğrulanamadı.` : ""}`
          : isZh
            ? `您的 NOC 代码（${fstpEligibility.nocCode ?? "?"}）属于 FSTP 合格技工组别。${hardGateUnmet ? `但${missingBits.join("和")}尚未确认。` : ""}`
            : `Your NOC code (${fstpEligibility.nocCode ?? "?"}) is in an FSTP-eligible trade group.${hardGateUnmet ? ` However, ${missingBits.join(" and ")} could not yet be confirmed.` : ""}`,
        relevance: hardGateUnmet ? "needs_more_information" : "possible",
        confidenceLevel: hardGateUnmet ? "low" : dynConf,
        confidenceExplanation: isTr
          ? "FSTP değerlendirmesi NOC ticaret grubu uygunluğuna, iş deneyimi eşiğine (2 yıl/3.120 saat) ve dil eşiğine (CLB 5/4) dayanır; bunlar CEC/FSW'den farklı ayrı kurallardır."
          : isZh
            ? "FSTP 评估依据 NOC 技工组别资格、工作经验门槛（2 年/3,120 小时）和语言门槛（CLB 5/4）——这些规则与 CEC/FSW 不同，是独立评估的。"
            : "FSTP eligibility is assessed against NOC trade-group membership, a work-experience threshold (2 years/3,120 hours), and a language threshold (CLB 5/4) -- rules kept separate from CEC/FSW.",
        difficulty: hardGateUnmet ? "high" : "medium",
        requirementType: isTr
          ? "NOC ticaret grubu, iş deneyimi eşiği ve dil eşiği (CLB 5/4)"
          : isZh
            ? "NOC 技工组别、工作经验门槛与语言门槛（CLB 5/4）"
            : "NOC trade-group eligibility, work-experience threshold, and language threshold (CLB 5/4)",
        userRelativePosition: isTr
          ? "Bu yol bir puan testine değil, ticaret grubu uygunluğu ve eşik kriterlerine dayanır; göreli konum kavramı geçerli değildir."
          : isZh
            ? "该路径不基于打分制，而是基于技工组别资格和门槛标准；相对位置概念不适用。"
            : "This pathway is not points-tested -- it is based on trade-group eligibility and threshold criteria, so a relative-position comparison does not apply.",
        keyRequirements: isTr
          ? [
              "FSTP uygun ticaret grubunda NOC kodu",
              `Son ${FSTP_WORK_EXPERIENCE_LOOKBACK_YEARS} yıl içinde ${FSTP_MIN_WORK_EXPERIENCE_YEARS} yıl (${FSTP_MIN_WORK_EXPERIENCE_HOURS} saat) ücretli ticaret deneyimi`,
              `${FSTP_LANGUAGE_THRESHOLD.speakingListening} konuşma/dinleme, ${FSTP_LANGUAGE_THRESHOLD.readingWriting} okuma/yazma`,
              "Geçerli iş teklifi (en az 1 yıl, en fazla 2 Kanadalı işveren) VEYA Kanada eyalet/federal yeterlilik sertifikası",
            ]
          : isZh
            ? [
                "NOC 代码属于 FSTP 合格技工组别",
                `过去 ${FSTP_WORK_EXPERIENCE_LOOKBACK_YEARS} 年内 ${FSTP_MIN_WORK_EXPERIENCE_YEARS} 年（${FSTP_MIN_WORK_EXPERIENCE_HOURS} 小时）有偿技工经验`,
                `口语/听力 ${FSTP_LANGUAGE_THRESHOLD.speakingListening}，读写 ${FSTP_LANGUAGE_THRESHOLD.readingWriting}`,
                "有效工作邀约（至少1年，最多2名加拿大雇主）或加拿大省/联邦资格证书",
              ]
            : [
                "NOC code in an FSTP-eligible trade group",
                `${FSTP_MIN_WORK_EXPERIENCE_YEARS} years (${FSTP_MIN_WORK_EXPERIENCE_HOURS} hours) of paid trade experience within the last ${FSTP_WORK_EXPERIENCE_LOOKBACK_YEARS} years`,
                `${FSTP_LANGUAGE_THRESHOLD.speakingListening} speaking/listening, ${FSTP_LANGUAGE_THRESHOLD.readingWriting} reading/writing`,
                "A valid job offer (at least 1 year, max 2 Canadian employers) OR a Canadian provincial/federal certificate of qualification",
              ],
        pathwaySpecificRisks: [
          isTr
            ? "Bu form iş teklifi veya yeterlilik sertifikası bilgisi toplamaz — bu ikili şart ayrıca doğrulanmalıdır."
            : isZh
              ? "本表单未收集工作邀约或资格证书信息——该二选一条件需另行确认。"
              : "This form does not collect job offer or certificate-of-qualification details -- this either/or requirement still needs separate confirmation.",
        ],
      };
    }

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
  "186": { en: "Employer Nomination Scheme Visa (subclass 186)", tr: "İşveren Aday Gösterme Programı Vizesi (subclass 186)" },
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
    case "186":
      return isTr
        ? [
            "İşveren aday gösterme bağlamı ve CSOL meslek listesi uyumu",
            "Direct Entry akışı için beceri değerlendirmesi ve yaş (<45) bağlamı",
            "TRT akışı için onaylı sponsor altında geçirilen süre (en az 2 yıl) bağlamı",
          ]
        : [
            "Employer nomination context and CSOL occupation-list alignment",
            "Direct Entry stream: skills assessment and age (<45) context",
            "TRT stream: time spent under an approved sponsor (at least 2 years) context",
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

  if (subclass === "186") {
    const salaryGate = evaluateEmployerSalaryGate(input);
    const directEntryGate = evaluate186DirectEntryGate(input);
    const trtGate = evaluate186TrtGate(input);

    if (salaryGate.isBelowCsit && salaryGate.declaredSalaryAud !== null) {
      risks.push(formatIneligibleSalaryReason(locale, salaryGate.declaredSalaryAud));
    }
    if (directEntryGate.isAgeIneligible && directEntryGate.declaredAge !== null) {
      risks.push(t(locale, "ineligible.ageReason", { age: directEntryGate.declaredAge, ageLimit: DIRECT_ENTRY_186_MAX_AGE }));
    }
    if (trtGate.yearsInSponsoredPosition !== null && !trtGate.meetsTenureThreshold) {
      risks.push(
        isTr
          ? `TRT akışı için gereken en az ${TRT_186_MIN_SPONSORED_YEARS} yıllık onaylı sponsor süresi henüz karşılanmıyor (beyan edilen: ${trtGate.yearsInSponsoredPosition} yıl).`
          : `The TRT stream's minimum ${TRT_186_MIN_SPONSORED_YEARS}-year approved-sponsor period is not yet met (declared: ${trtGate.yearsInSponsoredPosition} ${trtGate.yearsInSponsoredPosition === 1 ? "year" : "years"}).`
      );
    }
    if ((directEntryGate.hasOccupation || trtGate.hasOccupation) && !directEntryGate.isLikelyOnCsol) {
      risks.push(
        isTr
          ? "Meslek, MLTSSL eşleşmesi üzerinden CSOL'de olası görünüyor ancak bu bir yaklaşık değerdir — gerçek CSOL listesini ayrıca doğrulayın."
          : "Occupation appears likely on CSOL based on an MLTSSL-match proxy — this is an approximation, not a direct CSOL lookup; verify against the current CSOL separately."
      );
    }
    if (!input.nominationStream || input.nominationStream === "not_sure") {
      risks.push(
        isTr
          ? "Hedeflenen 186 akışı (Direct Entry, TRT veya Labour Agreement) belirtilmediği için değerlendirme tüm akışları kapsayacak şekilde genel tutuldu."
          : "Because no specific 186 stream (Direct Entry, TRT, or Labour Agreement) was targeted, this assessment covers all streams generally."
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

  if (subclass === "186") {
    const directEntryGate = evaluate186DirectEntryGate(input);
    const trtGate = evaluate186TrtGate(input);
    const trtLooksStrong = trtGate.meetsTenureThreshold && trtGate.isLikelyOnCsol;
    const directEntryLooksStrong =
      directEntryGate.hasSkillsAssessment && directEntryGate.meetsExperienceThreshold && directEntryGate.isLikelyOnCsol;
    if (dataCompletenessPercentage < 40) return "low";
    if (trtLooksStrong || directEntryLooksStrong) {
      return dataCompletenessPercentage >= 60 ? "high" : "medium";
    }
    return input.occupation ? "medium" : "low";
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
  const hasEnglish = hasRealEnglishEvidence(input);
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

  if (subclass === "186") {
    return isTr
      ? hasSponsorContext && hasOccupation
        ? `İşveren sponsorluğu ve meslek bağlamı mevcut; veri tamamlanma düzeyi (%${dataCompletenessPercentage}) ile birlikte güven destekleniyor.`
        : `İşveren sponsorluğu/meslek bağlamı veya veri tamamlanma düzeyi (%${dataCompletenessPercentage}) sınırlı olduğu için güven daha temkinli.`
      : hasSponsorContext && hasOccupation
        ? `Employer sponsorship and occupation context are visible, and the available detail (${dataCompletenessPercentage}%) supports this confidence level.`
        : `Employer sponsorship/occupation context or available detail (${dataCompletenessPercentage}%) is limited, so confidence remains cautious.`;
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
  } else if (subclass === "186") {
    const salaryGate186 = evaluateEmployerSalaryGate(input);
    const directEntryGate = evaluate186DirectEntryGate(input);
    const trtGate = evaluate186TrtGate(input);

    const isLabourAgreementStream = input.nominationStream === "labour_agreement";

    // CSIT salary gate: applies to Direct Entry and TRT (employer-sponsored),
    // but NOT to Labour Agreement (agreement sets its own salary floor) and
    // NOT when stream is "not_sure" (user might be eligible for LA, so don't
    // gate on CSIT prematurely).
    const isKnownNonLA = input.nominationStream === "direct_entry" || input.nominationStream === "trt";
    if (isKnownNonLA && salaryGate186.isBelowCsit && salaryGate186.declaredSalaryAud !== null) {
      relevance = "ineligible";
      reason = formatIneligibleSalaryReason(locale, salaryGate186.declaredSalaryAud);
    } else if (isLabourAgreementStream) {
      // Labour Agreement stream: no CSOL membership check, no upfront skills
      // assessment, and no fixed age/English/work-experience floor — those are
      // set by the specific labour agreement. The only gate is whether the
      // nominating employer is party to a labour agreement.
      // Primary signal: explicit checkbox (isLabourAgreementEmployer).
      // Fallback: free-text keyword matching in sponsorOrFamily/mainGoal.
      const labourAgreementContext =
        input.isLabourAgreementEmployer === true ||
        hasKw(
          [input.sponsorOrFamily ?? "", input.mainGoal ?? ""].join(" "),
          ["labour agreement", "labor agreement", "iş anlaşması", "iş sözleşmesi"]
        );
      if (labourAgreementContext) {
        relevance = "possible";
        reason = isTr
          ? "İşverenin bir labour agreement (iş anlaşması) tarafı olması, Labour Agreement akışının olası bir yol olabileceğini gösteriyor. Yaş, İngilizce ve iş deneyimi şartları ilgili anlaşmada belirlenir."
          : "The employer being party to a labour agreement indicates the Labour Agreement stream may be a possible pathway. Age, English, and work experience requirements are set by the specific agreement.";
      } else {
        relevance = "needs_more_information";
        reason = isTr
          ? "Labour Agreement akışı, işverenin bir labour agreement (iş anlaşması) tarafı olmasını gerektirir. İşverenin böyle bir anlaşmaya taraf olup olmadığı henüz net değil."
          : "The Labour Agreement stream requires the employer to be party to a labour agreement. Whether the employer holds one is not yet clear.";
      }
    } else if (input.nominationStream === "trt") {
      if (trtGate.yearsInSponsoredPosition !== null && !trtGate.meetsTenureThreshold) {
        relevance = "ineligible";
        reason = isTr
          ? `TRT akışı, onaylı sponsor altında en az ${TRT_186_MIN_SPONSORED_YEARS} yıl çalışılmış olmasını gerektirir. Beyan edilen süre (${trtGate.yearsInSponsoredPosition} yıl) bu eşiğin altında olduğu için TRT akışı şu an uygun görünmüyor.`
          : `The TRT stream requires at least ${TRT_186_MIN_SPONSORED_YEARS} years employed under an approved sponsor. The declared period (${trtGate.yearsInSponsoredPosition} ${trtGate.yearsInSponsoredPosition === 1 ? "year" : "years"}) is below this threshold, so the TRT stream does not currently look available.`;
      } else if (trtGate.yearsInSponsoredPosition === null) {
        relevance = "needs_more_information";
        reason = isTr
          ? "TRT akışı için uygunluk, onaylı sponsor altında geçirilen toplam süreye (en az 2 yıl) bağlıdır. Bu bilgi henüz sağlanmadı."
          : "TRT stream eligibility depends on total time spent under an approved sponsor in the nominated occupation (at least 2 years). This information has not been provided yet.";
      } else {
        relevance = "possible";
        reason = isTr
          ? "Bildirilen onaylı sponsor süresi TRT akışının asgari 2 yıllık eşiğini karşılıyor, bu nedenle subclass 186 (TRT) olası bir yol olabilir. Bu yalnızca genel bilgidir ve kişisel duruma göre değişebilir."
          : "The reported approved-sponsor period meets the TRT stream's minimum 2-year threshold, so subclass 186 (TRT) may be a possible pathway. This is general information only and depends on individual circumstances.";
      }
    } else if (input.nominationStream === "direct_entry") {
      if (directEntryGate.isAgeIneligible && directEntryGate.declaredAge !== null) {
        relevance = "ineligible";
        reason = t(locale, "ineligible.ageReason", { age: directEntryGate.declaredAge, ageLimit: DIRECT_ENTRY_186_MAX_AGE });
      } else if (!directEntryGate.hasSkillsAssessment || !directEntryGate.meetsExperienceThreshold || !directEntryGate.hasOccupation) {
        relevance = "needs_more_information";
        reason = isTr
          ? "Direct Entry akışı olumlu bir beceri değerlendirmesi ve en az 3 yıllık ilgili iş deneyimi gerektirir. Bu bilgilerin bir kısmı henüz eksik."
          : "The Direct Entry stream requires a positive skills assessment and at least 3 years of relevant work experience. Some of this information is still missing.";
      } else {
        relevance = "possible";
        reason = isTr
          ? "Beceri değerlendirmesi ve iş deneyimi bağlamı, Direct Entry akışının olası bir yol olabileceğini göstermektedir. Bu yalnızca genel bilgidir ve kişisel duruma göre değişebilir."
          : "Skills assessment and work experience context indicate the Direct Entry stream may be a possible pathway. This is general information only and depends on individual circumstances.";
      }
    } else {
      // No stream specified (or "not_sure") — evaluate all three streams and
      // report whichever look viable.
      const trtViable = trtGate.meetsTenureThreshold;
      const directEntryViable =
        directEntryGate.hasSkillsAssessment && directEntryGate.meetsExperienceThreshold && !directEntryGate.isAgeIneligible;
      const labourAgreementViable =
        input.isLabourAgreementEmployer === true ||
        hasKw(
          [input.sponsorOrFamily ?? "", input.mainGoal ?? ""].join(" "),
          ["labour agreement", "labor agreement", "iş anlaşması", "iş sözleşmesi"]
        );
      if (trtViable || directEntryViable || labourAgreementViable) {
        relevance = "possible";
        if (trtViable && !directEntryViable && !labourAgreementViable) {
          reason = isTr
            ? "Mevcut sinyaller TRT akışı için olası bir uyum gösteriyor (onaylı sponsor süresi eşiği karşılanıyor)."
            : "Current signals suggest a possible fit for the TRT stream (approved-sponsor tenure threshold is met).";
        } else if (directEntryViable && !trtViable && !labourAgreementViable) {
          reason = isTr
            ? "Mevcut sinyaller Direct Entry akışı için olası bir uyum gösteriyor (beceri değerlendirmesi ve deneyim eşiği karşılanıyor)."
            : "Current signals suggest a possible fit for the Direct Entry stream (skills assessment and experience thresholds are met).";
        } else if (labourAgreementViable && !trtViable && !directEntryViable) {
          reason = isTr
            ? "Mevcut sinyaller Labour Agreement akışı için olası bir uyum gösteriyor (işveren bir labour agreement tarafı görünüyor)."
            : "Current signals suggest a possible fit for the Labour Agreement stream (the employer appears to be party to a labour agreement).";
        } else {
          const viableStreams = [
            ...(trtViable ? ["TRT"] : []),
            ...(directEntryViable ? ["Direct Entry"] : []),
            ...(labourAgreementViable ? ["Labour Agreement"] : []),
          ].join(", ");
          reason = isTr
            ? `Mevcut sinyaller şu akışlar için olası bir uyum gösteriyor: ${viableStreams}. Hangi akışın hedeflendiği belirtilirse değerlendirme netleşir.`
            : `Current signals suggest a possible fit for the following stream(s): ${viableStreams}. Specifying which stream is targeted would sharpen this assessment.`;
        }
      } else if (directEntryGate.isAgeIneligible && trtGate.yearsInSponsoredPosition !== null && !trtGate.meetsTenureThreshold) {
        relevance = "ineligible";
        reason = isTr
          ? "Direct Entry akışı için yaş sınırı aşılmış, TRT akışı için ise onaylı sponsor süresi eşiği karşılanmıyor. Mevcut bilgilerle her iki akış da uygun görünmüyor."
          : "The Direct Entry stream's age cap is exceeded, and the TRT stream's approved-sponsor tenure threshold is not met. Neither stream currently looks available based on the information provided.";
      } else {
        relevance = "needs_more_information";
        reason = isTr
          ? "Subclass 186, Direct Entry (beceri değerlendirmesi, yaş, CSOL), TRT (en az 2 yıllık onaylı sponsor süresi) veya Labour Agreement (işverenin labour agreement tarafı olması) akışlarından biri üzerinden değerlendirilebilir. Hangi akışın hedeflendiği ve ilgili detaylar henüz net değil."
          : "Subclass 186 can be assessed via Direct Entry (skills assessment, age, CSOL), TRT (at least 2 years under an approved sponsor), or Labour Agreement (employer party to a labour agreement). Which stream is targeted, and the related details, are not yet clear.";
      }
    }
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
    ineligiblePointsLine = buildSubclassIneligiblePointsReason(subclass, locale, estimatedPoints, input);
    const parts = buildIneligibleLowPointsParts(locale, estimatedPoints, input.englishLevel, input);
    ineligibleSharedNotes = parts.sharedNotes;
  }

  // For 186, relevance is already set to "ineligible" only on true hard-gate
  // failures within the branch above (CSIT salary floor, TRT tenure below 2
  // years, or Direct Entry age above 45) — reusing that here avoids
  // recomputing the salary/age/tenure gates a third time.
  const isForced186Ineligible = subclass === "186" && relevance === "ineligible";

  const forcedIneligibleByRule =
    (subclass === "485" && (hardAgeGate?.isHardIneligible || ageGate?.isAboveLimit)) ||
    (subclass === "482" && salaryGate?.isBelowCsit) ||
    isLowPointsIneligible ||
    isForced186Ineligible;

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
  if (pathway.subclass === "186") return "high";
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
  if (pathway.subclass === "186") {
    return isTr
      ? "İşveren aday gösterme, meslek listesi ve akışa özgü kanıt (beceri değerlendirmesi veya sponsor süresi) odaklı"
      : "Employer nomination, occupation-list, and stream-specific evidence (skills assessment or sponsor tenure) based";
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
  const englishEvidence = hasRealEnglishEvidence(input);
  const skillsSignal = (input.occupationConfirmed ?? "").trim().toLowerCase() === "yes";

  const readinessSignals = [englishEvidence, skillsSignal].filter(Boolean).length;

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
      isEoiEligible: true,
      eoiIneligibilityReason: null,
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
    isEoiEligible: true,
    eoiIneligibilityReason: null,
  };
}

const AGE_BRACKET_LABEL: Record<ReturnType<typeof parseAgeOption> & string, { en: string; tr: string; zh: string }> = {
  "18_24": { en: "18-24 age bracket", tr: "18-24 yaş aralığı", zh: "18-24 岁区间" },
  "25_32": { en: "25-32 age bracket", tr: "25-32 yaş aralığı", zh: "25-32 岁区间" },
  "33_39": { en: "33-39 age bracket", tr: "33-39 yaş aralığı", zh: "33-39 岁区间" },
  "40_44": { en: "40-44 age bracket", tr: "40-44 yaş aralığı", zh: "40-44 岁区间" },
  "45_plus": { en: "45+ age bracket", tr: "45 ve üzeri yaş", zh: "45 岁及以上" },
};

/**
 * Maps the applicant's own accompanying-partner/dependants status
 * (input.sponsorOrFamily, the same field documented at
 * isPartnerPathwaySelected -- three real form options) to the points-test
 * partner factor. "Functional English" is a lower bar than the Competent
 * English (IELTS 6.0) the partner-skilled/competent-English point tiers
 * require, and the form doesn't collect the partner's skills-assessment
 * status at all, so that option can only be confidently scored 0 rather
 * than guessed at 5 or 10 -- never award points the form can't actually
 * confirm.
 */
function sponsorOrFamilyToPartnerOption(sponsorOrFamily: string | undefined, locale: Locale): { option: PartnerOption; reason: string } {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const value = (sponsorOrFamily ?? "").trim();

  if (value === "Single / No Dependants") {
    return {
      option: "single_or_partner_au_citizen_or_pr",
      reason: isTr
        ? "Bekar / bağımlı yok olarak belirtildi"
        : isZh
          ? "已选择“单身 / 无受养人”"
          : "Declared single / no dependants",
    };
  }
  if (value === "Partner / Dependants WITHOUT Functional English") {
    return {
      option: "none_or_unsure",
      reason: isTr
        ? "Partner Functional English koşulunu karşılamıyor"
        : isZh
          ? "伴侣不具备 Functional English"
          : "Partner does not meet Functional English",
    };
  }
  if (value === "Partner / Dependants with Functional English") {
    return {
      option: "none_or_unsure",
      reason: isTr
        ? "Functional English, puan tablosundaki Competent English eşiğinin altında; partnerin beceri değerlendirmesi de forma girilmedi, bu yüzden puan verilmedi"
        : isZh
          ? "Functional English 低于积分表要求的 Competent English 门槛，且未提供伴侣的技能评估情况，因此未计分"
          : "Functional English is below the points-table's Competent English threshold, and the partner's skills-assessment status wasn't collected, so no points are awarded",
    };
  }
  return {
    option: "none_or_unsure",
    reason: isTr ? "Partner durumu girilmedi" : isZh ? "未提供伴侣情况" : "Partner status not provided",
  };
}

function buildPointsEstimate(input: ReadinessInput, locale: Locale): PointsEstimate {
  if (input.country === "CA") return buildCanadaPointsEstimate(input, locale);

  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";

  function getLocalizedQualification(level: string | undefined, locale: Locale): string {
    if (!level) return "";
    const isTr = locale === "tr";
    const isZh = locale === "zh-Hans";

    if (isZh) {
      if (level.includes("Bachelor")) return "学士学位 / 本科";
      if (level.includes("Master's Degree (Coursework)")) return "硕士学位（授课型）";
      if (level.includes("Master's Degree (Research)")) return "硕士学位（研究型）";
      if (level.includes("PhD") || level.includes("Doctorate")) return "博士学位";
      if (level === "Diploma") return "大专 / 文凭";
      if (level === "Certificate") return "证书课程";
      if (level === "High School") return "高中";
      if (level === "Other") return "其他学历";
      return level;
    }
    if (isTr) {
      if (level.includes("Bachelor")) return "Lisans Derecesi";
      if (level.includes("Master's Degree (Coursework)")) return "Yüksek Lisans (Ders Aşamalı)";
      if (level.includes("Master's Degree (Research)")) return "Yüksek Lisans (Tezli / Araştırma)";
      if (level.includes("PhD") || level.includes("Doctorate")) return "Doktora";
      if (level === "Diploma") return "Ön Lisans / Diploma";
      if (level === "Certificate") return "Sertifika";
      if (level === "High School") return "Lise";
      if (level === "Other") return "Diğer";
      return level;
    }
    return level;
  }

  const ageOption = input.age ? parseAgeOption(input.age) : null;
  const englishOption = input.englishLevel ? parseEnglishOption(input.englishLevel) : null;

  // ── Absolute EOI Hard Gates (DHA) ──────────────────────────────────────
  // 1. Age: applicants 45 or older cannot lodge an EOI.
  // 2. Skills Assessment: a positive assessment is legally required.
  // 3. English: at least "Competent English" (the legal minimum) is required.
  //    NOTE: parseEnglishOption("none") maps to "competent" for the points
  //    tiering, but the "none" dropdown option means "no valid test / test
  //    older than 3 years" — that does NOT satisfy the Competent English gate.
  const numericAge = input.age ? parseInt(input.age, 10) : undefined;
  const isOverAgeLimit = numericAge !== undefined && !isNaN(numericAge) && numericAge >= 45;
  const assessmentDone = (input.occupationConfirmed ?? "").trim().toLowerCase() === "yes";
  const englishLevelRaw = (input.englishLevel ?? "").trim().toLowerCase();
  const meetsCompetentEnglish =
    englishOption !== null &&
    englishLevelRaw !== "none" &&
    (englishOption === "competent" || englishOption === "proficient" || englishOption === "superior");

  // Preliminary eligibility, used only for the "no age/English at all" early
  // return below where estimatedPoints can't be calculated -- the points
  // threshold can't be checked without a real number, so that path is left
  // on the original 3-factor gate. The real isEoiEligible (age + assessment
  // + English + points >= 65) is computed further down, once estimatedPoints
  // is known -- see its definition after the breakdown is built.
  const preliminaryEoiEligible = !isOverAgeLimit && assessmentDone && meetsCompetentEnglish;
  const preliminaryEoiIneligibilityReason: "age" | "skills_assessment" | "english" | null = preliminaryEoiEligible
    ? null
    : isOverAgeLimit
      ? "age"
      : !assessmentDone
        ? "skills_assessment"
        : "english";
  const hasExperienceInput =
    input.offshoreExperienceYears !== undefined || input.onshoreExperienceYears !== undefined;
  const hasEducationInput = Boolean(input.qualificationLevel);
  const occupationHasDatasetMatch = Boolean(
    input.occupation?.trim() && getEligibleSkilledSubclasses(input.occupation).length > 0
  );
  const canApplyExperiencePoints = !hasExperienceInput || occupationHasDatasetMatch;

  if (!ageOption && !englishOption) {
    return {
      appliesTo: ["189", "190", "491"],
      estimatedPoints: undefined,
      breakdown: [],
      note: isTr
        ? "Puan tahmini için yaş ve İngilizce seviyesi sağlanmadı. Puan hesaplaması mevcut değil."
        : "Age and English level were not provided. A points estimate is not available.",
      isEoiEligible: preliminaryEoiEligible,
      eoiIneligibilityReason: preliminaryEoiIneligibilityReason,
    };
  }

  const overseasEmployment = yearsToOverseasEmploymentOption(
    canApplyExperiencePoints ? input.offshoreExperienceYears : undefined
  );
  const australianEmployment = yearsToAustralianEmploymentOption(
    canApplyExperiencePoints ? input.onshoreExperienceYears : undefined
  );
  const education = qualificationToEducationOption(input.qualificationLevel, isAustralianQualification(input));

  // ── DHA Skills Assessment Gate ────────────────────────────────────────
  // Per DHA rules: skilled employment points require a valid skills assessment.
  // Education points from overseas qualifications also require assessment.
  // Australian qualifications are exempt from assessment for points purposes.
  const hasSkillsAssessmentDone = (input.occupationConfirmed ?? "").trim().toLowerCase() === "yes";
  const isOverseasQualification = !isAustralianQualification(input);
  const isQualificationRecognized = input.isQualificationRecognized === true;
  const specialistEducation = hasSpecialistEducationClaim(input);
  const australianStudyRequirement = isAustralianQualification(input);
  const regionalStudy = isRegionalAustralianQualification(input);
  const partner = sponsorOrFamilyToPartnerOption(input.sponsorOrFamily, locale);

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
    partner: partner.option,
    hasStateNomination190: false,
    hasNominationOrSponsorship491: false,
  });

  const employmentCapNote = result.employmentCapApplied
    ? isTr
      ? " (birleşik istihdam puanı 20 ile sınırlandırılmıştır)"
      : isZh
        ? "（合计工作经验分已按 20 分上限计算）"
        : " (combined employment score capped at 20)"
    : "";

  // Core scored categories: always shown, even at 0, so the user sees every
  // factor the points test actually checks -- not just the ones they filled
  // in. Occupation/skills-assessment status is deliberately NOT a row here;
  // it carries no points-table score of its own (see occupationNote below).
  const breakdown: PointsBreakdownItem[] = [
    {
      label: isTr
        ? `Yaş (${ageOption ? AGE_BRACKET_LABEL[ageOption].tr : "belirtilmedi"})`
        : isZh ? `年龄 (${ageOption ? AGE_BRACKET_LABEL[ageOption].zh : "未提供"})`
        : `Age${ageOption ? ` (${AGE_BRACKET_LABEL[ageOption].en})` : " (Not Provided)"}`,
      // DHA absolute age gate: applicants 45+ get 0 age points and cannot lodge an EOI.
      points: isOverAgeLimit ? 0 : result.breakdown.age,
      max: 30,
      note: isOverAgeLimit
        ? (isTr ? "Yaş sınırı aşıldı (45+) — 0 puan, EOI uygun değil"
          : isZh ? "超过年龄上限（45岁）— 0分，不符合EOI条件"
          : "Age limit exceeded (45+) — 0 pts, EOI ineligible")
        : ageOption
          ? isTr ? `${result.breakdown.age} puan — ${AGE_BRACKET_LABEL[ageOption].tr}`
            : isZh ? `${result.breakdown.age} 分 — ${AGE_BRACKET_LABEL[ageOption].zh}`
            : `${result.breakdown.age} pts — ${AGE_BRACKET_LABEL[ageOption].en}`
          : isTr ? "Yaş girilmedi" : isZh ? "未提供年龄" : "Age not provided",
    },
    {
      label: isTr
        ? `İngilizce Dil (${input.englishLevel || "belirtilmedi"})`
        : isZh ? `英语能力 (${input.englishLevel || "未提供"})`
        : `English Language (${input.englishLevel || "Not Provided"})`,
      points: result.breakdown.english,
      max: 20,
      note: englishOption
        ? (isTr ? "Girilen seviye: " : isZh ? "已提供级别：" : "Provided level: ") + input.englishLevel
        : isTr ? "Test sonucu girilmedi" : isZh ? "未提供考试成绩" : "Test score not provided",
    },
    {
      label: isTr
        ? `Yurt Dışı Nitelikli İstihdam${input.offshoreExperienceYears !== undefined ? ` (${input.offshoreExperienceYears} yıl)` : ""}`
        : isZh ? `海外技术工作${input.offshoreExperienceYears !== undefined ? ` (${input.offshoreExperienceYears}年)` : ""}`
        : `Skilled Employment (Overseas${input.offshoreExperienceYears !== undefined ? `, ${input.offshoreExperienceYears} yrs` : ""})`,
      points: (canApplyExperiencePoints && hasSkillsAssessmentDone) ? result.breakdown.overseasEmployment : 0,
      max: 15,
      note: !hasSkillsAssessmentDone
        ? (isTr ? "Beceri değerlendirmesi gerekli — puan talep edilemez"
          : isZh ? "需要技能评估 — 无法计分"
          : "Assessment Required — points cannot be claimed")
        : !canApplyExperiencePoints
          ? (isTr ? "Meslek doğrulanamadığı için uygulanmadı" : isZh ? "职业无法核验，未计分" : "Not applied -- occupation could not be verified")
          : input.offshoreExperienceYears !== undefined
            ? `${input.offshoreExperienceYears} ${isTr ? "yıl" : isZh ? "年" : "yrs"}${employmentCapNote}`
            // Left blank -- a valid claim of zero years, not missing data
            // (see state-nomination.ts's buildPartialDataWarning, which
            // stopped flagging this as an error for the same reason).
            : isTr ? "Beyan Edilen Tecrübe: 0 Yıl" : isZh ? "申报经验：0 年" : "Claimed Experience: 0 Years",
    },
    {
      label: isTr
        ? `Avustralya Nitelikli İstihdam${input.onshoreExperienceYears !== undefined ? ` (${input.onshoreExperienceYears} yıl)` : ""}`
        : isZh ? `澳大利亚技术工作${input.onshoreExperienceYears !== undefined ? ` (${input.onshoreExperienceYears}年)` : ""}`
        : `Skilled Employment (Australian${input.onshoreExperienceYears !== undefined ? `, ${input.onshoreExperienceYears} yrs` : ""})`,
      points: (canApplyExperiencePoints && hasSkillsAssessmentDone) ? result.breakdown.australianEmployment : 0,
      max: 20,
      note: !hasSkillsAssessmentDone
        ? (isTr ? "Beceri değerlendirmesi gerekli — puan talep edilemez"
          : isZh ? "需要技能评估 — 无法计分"
          : "Assessment Required — points cannot be claimed")
        : !canApplyExperiencePoints
          ? (isTr ? "Meslek doğrulanamadığı için uygulanmadı" : isZh ? "职业无法核验，未计分" : "Not applied -- occupation could not be verified")
          : input.onshoreExperienceYears !== undefined
            ? `${input.onshoreExperienceYears} ${isTr ? "yıl" : isZh ? "年" : "yrs"}${employmentCapNote}`
            // Left blank -- a valid claim of zero years, not missing data
            // (see state-nomination.ts's buildPartialDataWarning, which
            // stopped flagging this as an error for the same reason).
            : isTr ? "Beyan Edilen Tecrübe: 0 Yıl" : isZh ? "申报经验：0 年" : "Claimed Experience: 0 Years",
    },
    {
      label: isTr
        ? `Eğitim Nitelikleri (${hasEducationInput ? getLocalizedQualification(input.qualificationLevel, locale) : "belirtilmedi"})`
        : isZh ? `教育背景 (${hasEducationInput ? getLocalizedQualification(input.qualificationLevel, locale) : "未提供"})`
        : `Educational Qualifications (${hasEducationInput ? getLocalizedQualification(input.qualificationLevel, locale) : "Not Provided"})`,
      // DHA rule: Australian qualifications are exempt from assessment for points.
      // Overseas qualifications need EITHER a positive Skills Assessment OR an
      // explicit recognition declaration to claim education points -- a
      // positive Skills Assessment outcome already means the assessing
      // authority evaluated the qualification as part of determining skill
      // level, so it supersedes (and can't be contradicted by) a separate
      // "is your qualification recognized?" answer of "No". Only zero out
      // points when NEITHER signal confirms recognition.
      points: (isOverseasQualification && !hasSkillsAssessmentDone && !isQualificationRecognized) ? 0 : result.breakdown.education,
      max: 20,
      note: (isOverseasQualification && !hasSkillsAssessmentDone && !isQualificationRecognized)
        ? (isTr ? "Yabancı diploma — tanıma gerekli"
          : isZh ? "海外学历 — 需要资格认可"
          : "Overseas qualification — recognition required")
        : hasEducationInput
          ? getLocalizedQualification(input.qualificationLevel, locale)
          : isTr ? "Eğitim düzeyi girilmedi" : isZh ? "未提供学历" : "Education level not provided",
    },
    {
      label: isTr
        ? `Partner Nitelikleri (${partner.reason})`
        : isZh ? `伴侣技能 (${partner.reason})`
        : `Partner Skills (${partner.reason})`,
      points: result.breakdown.partner,
      max: 10,
      note: partner.reason,
    },
  ];

  // Situational bonuses: only shown when actually applicable, since most
  // profiles won't have them -- unlike the core six, a "not applicable" row
  // here would just be noise rather than a useful zero.
  if (australianStudyRequirement) {
    breakdown.push({
      label: isTr ? "Avustralya öğrenim koşulu" : isZh ? "澳大利亚学习要求" : "Australian study requirement",
      points: result.breakdown.bonus.australianStudyRequirement,
      max: 5,
      note: isTr ? "Avustralya kurumunda tamamlanan yeterlilik" : isZh ? "在澳大利亚教育机构完成的学历" : "Qualification completed at an Australian institution",
    });
  }
  if (regionalStudy) {
    breakdown.push({
      label: isTr ? "Bölgesel Avustralya öğrenimi" : isZh ? "澳大利亚偏远地区学习" : "Regional Australia study",
      points: result.breakdown.bonus.regionalStudy,
      max: 5,
      note: isTr ? "Belirlenmiş bölgesel kampüs" : isZh ? "指定偏远地区实体校区" : "Designated regional campus",
    });
  }
  if (isResearchOrDoctorateQualification(input.qualificationLevel)) {
    breakdown.push({
      label: isTr ? "Uzmanlık eğitimi (STEM)" : isZh ? "专业型学位 (STEM)" : "Specialist education (STEM)",
      points: result.breakdown.bonus.specialistEducation,
      max: 10,
      note:
        input.specialistEducationStemResponse === "yes"
          ? isTr ? "STEM alanı onaylandı" : isZh ? "已确认 STEM 学位" : "STEM field confirmed"
          : input.specialistEducationStemResponse === "not_sure"
            ? isTr ? "Emin değilim → uygulanmadı" : isZh ? "不确定 → 未计分" : "Not sure -> not awarded"
            : isTr ? "Onay yok → uygulanmadı" : isZh ? "未确认 → 未计分" : "Not confirmed -> not awarded",
    });
  }

  // The true total respects both the employment cap AND the skills-assessment
  // gate (education/employment zeroed when assessment is missing). We sum the
  // final breakdown values rather than using result.total189, which doesn't
  // account for the assessment gate applied above.
  const estimatedPoints = breakdown.reduce((sum, item) => sum + item.points, 0);

  // Real EOI eligibility, now that estimatedPoints is known: age + Skills
  // Assessment + Competent English are necessary but not sufficient -- DHA
  // only invites EOIs that also clear the points threshold (65). A positive
  // Skills Assessment alone (preliminaryEoiEligible above) must not read as
  // "READY" when the points position doesn't support an invitation.
  const meetsPointsThreshold = estimatedPoints >= 65;
  const isEoiEligible = preliminaryEoiEligible && meetsPointsThreshold;
  const eoiIneligibilityReason: "age" | "skills_assessment" | "english" | "points" | null = isEoiEligible
    ? null
    : preliminaryEoiIneligibilityReason ?? "points";

  const occupationNote = isTr
    ? "Meslek / Skills Assessment doğrudan puan vermez, ama diğer pathway'lerin (482/186 gibi) uygunluğunu belirler."
    : isZh
      ? "职业 / 技能评估本身不计分，但决定其他路径（如 482/186）的资格。"
      : "Occupation / Skills Assessment does not carry points-table score directly, but determines eligibility for other pathways (e.g. 482/186).";

  const australianOriginPointsDisclaimer = buildAustralianOriginPointsDisclaimer(input, locale);
  const specialistEducationNoteCaveat = buildSpecialistEducationCaveat(
    locale,
    getSpecialistEducationSignals(input),
    "short"
  );
  const note = isTr
    ? `Gerçek puan durumu kişisel duruma göre değişebilir; NAATI, Mesleki Yıl ve eyalet/bölgesel adaylık gibi ek fırsatlar için Puan Senaryo Simülatörüne bakın.${australianOriginPointsDisclaimer ? ` ${australianOriginPointsDisclaimer}` : ""}${specialistEducationNoteCaveat ? ` ${specialistEducationNoteCaveat}` : ""}`
    : isZh
      ? `实际分数取决于个人情况；NAATI、Professional Year、州/偏远地区提名等潜在加分见下方“加分场景模拟”。${australianOriginPointsDisclaimer ? ` ${australianOriginPointsDisclaimer}` : ""}${specialistEducationNoteCaveat ? ` ${specialistEducationNoteCaveat}` : ""}`
      : `Actual points position depends on individual circumstances; see the Points Booster Simulator below for potential additions like NAATI, Professional Year, and state/regional nomination.${australianOriginPointsDisclaimer ? ` ${australianOriginPointsDisclaimer}` : ""}${specialistEducationNoteCaveat ? ` ${specialistEducationNoteCaveat}` : ""}`;

  return {
    appliesTo: ["189", "190", "491"],
    estimatedPoints,
    breakdown,
    note,
    occupationNote,
    isEoiEligible,
    eoiIneligibilityReason,
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
  assessmentState: AssessmentState,
  rawEstimatedPoints?: number
): string[] {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const estimatedPoints = assessmentState.canShowNumericRanking ? assessmentState.estimatedPoints : undefined;
  // A points figure can be mathematically known (e.g. an ineligible-by-points
  // pathway's "30 vs 65 required" comparison, shown regardless of
  // canShowNumericRanking) even when the report's overall ranking confidence
  // is not "sufficient". Without this distinction, the summary said ranking
  // "cannot be confirmed" on the same report where the Visa Viability Ranking
  // section below displays that exact points figure and gap -- an
  // intermediate wording acknowledges the number exists but with caveated
  // confidence, instead of contradicting the section right below it.
  const hasPreliminaryPointsSignal = estimatedPoints === undefined && rawEstimatedPoints !== undefined;
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
        : skilledVisible && hasPreliminaryPointsSignal
          ? `Tahmini temel puan yaklaşık ${rawEstimatedPoints}; ancak İngilizce sınav kanıtı gibi bazı profil ayrıntıları eksik olduğu için sıralama güveni sınırlıdır.`
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
        : skilledVisible && hasPreliminaryPointsSignal
          ? `预计基础分数约为 ${rawEstimatedPoints}；但由于英语考试证明等部分档案信息缺失，排序的可信度仍然有限。`
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
      : skilledVisible && hasPreliminaryPointsSignal
        ? `Estimated base points are approximately ${rawEstimatedPoints}, but ranking confidence remains limited because some profile details (e.g., English test evidence) are not yet provided.`
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
  const hasEnglish = hasRealEnglishEvidence(input);
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
        {
          label: isTr ? "Son Avustralya eğitimi" : "Recent Australian study",
          status: input.courseCompletionStatus === "completed" ? "provided" : "typically_required",
        },
        { label: isTr ? "İngilizce kanıtı" : "English evidence", status: hasEnglish ? "provided" : "missing" },
        { label: isTr ? "AFP kontrolü" : "AFP check", status: "typically_required" },
        { label: isTr ? "Sağlık sigortası" : "Health insurance", status: "typically_required" },
      ];
    case "500":
      return [
        {
          label: isTr ? "Kurs / CoE" : "Course / CoE",
          status: input.courseName || input.courseCricosCode ? "provided" : "typically_required",
        },
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
      // A below-threshold score is not a rule violation -- see isPointsThresholdOnly doc comment.
      isPointsThresholdOnly: pathway.ineligiblePointsLine !== undefined,
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
      status: hasRealEnglishEvidence(input) ? "provided" : hasSkilled || has482 || has485 ? "missing" : "unclear",
      explanation: isTr
        ? hasRealEnglishEvidence(input)
          ? "İngilizce seviyesi formda belirtildi."
          : hasSkilled || has482 || has485
            ? "Yetenekli, işveren odaklı veya 485 mezun vizesi yollarında İngilizce kanıtı genellikle değerlendirilir."
            : "Bu yolda İngilizce kanıtının rolü bağlama göre değişebilir."
        : hasRealEnglishEvidence(input)
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
  locale: Locale,
  trendEstimates?: InvitationTrendEstimate[]
): PointsBoosterSimulator | undefined {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
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
        ? "Superior İngilizce (IELTS 8.0+ / PTE 79+)"
        : isZh
          ? "卓越英语水平 (IELTS 8.0+ / PTE 79+)"
          : "Superior English (IELTS 8.0+ / PTE 79+)",
      estimatedChange: 20,
      resultingEstimate: currentEstimate === undefined ? undefined : currentEstimate + 20,
      explanation: isTr
        ? "En yüksek getirili tek puan artışı."
        : isZh
          ? "打分表中分值最高且性价比最高的单项加分。"
          : "The single highest-value points upgrade available.",
    });
  } else if (englishOption === "proficient") {
    scenarios.push({
      label: isTr
        ? "Superior İngilizce'ye yükseltme (IELTS 8.0+ / PTE 79+)"
        : isZh
          ? "提升至卓越英语水平 (IELTS 8.0+ / PTE 79+)"
          : "Upgrade to Superior English (IELTS 8.0+ / PTE 79+)",
      estimatedChange: 10,
      resultingEstimate: currentEstimate === undefined ? undefined : currentEstimate + 10,
      explanation: isTr
        ? "Proficient'ten Superior'a geçiş."
        : isZh
          ? "从优秀英语水平（Proficient，+10分）提升至卓越英语水平（Superior，+20分）。"
          : "Moving from Proficient to Superior.",
    });
  }

  // NAATI CCL: +5 points (Community Languages credential)
  scenarios.push({
    label: isTr
      ? "NAATI CCL (Toplum Dili Sertifikası)"
      : isZh
        ? "NAATI CCL 社区语言能力认证"
        : "NAATI CCL Community Languages credential",
    estimatedChange: 5,
    resultingEstimate: currentEstimate === undefined ? undefined : currentEstimate + 5,
    explanation: isTr
      ? "Nitelikli bir toplum dili sertifikası."
      : isZh
        ? "获得认可的社区语言能力证书。"
        : "A recognised community-language credential.",
  });

  // Professional Year: +5 points
  if (isProfessionalYearRelevantOccupation(input)) {
    scenarios.push({
      label: isTr
        ? "Avustralya'da Mesleki Yıl (Professional Year)"
        : isZh
          ? "澳大利亚职业年项目 (Professional Year)"
          : "Australian Professional Year program",
      estimatedChange: 5,
      resultingEstimate: currentEstimate === undefined ? undefined : currentEstimate + 5,
      explanation: isTr
        ? "Muhasebe, BT veya mühendislikte 44 haftalık program."
        : isZh
          ? "针对会计、IT或工程类别的44周职业培训项目。"
          : "A 44-week program in accounting, IT, or engineering.",
    });
  }

  // Partner/single applicant factor: max 10 points. Only offered when there's
  // real room to gain -- if pointsEstimate already shows the max (e.g.
  // applicant declared single), suggesting "+10 more" would double-count
  // points they already have.
  const currentPartnerPoints = pointsEstimate?.breakdown.find(
    (item) => item.label === "Partner status" || item.label === "Partner durumu" || item.label === "伴侣状态"
  )?.points ?? 0;
  if (currentPartnerPoints < 10) {
    const partnerDelta = 10 - currentPartnerPoints;
    scenarios.push({
      label: isTr
        ? "Tek başvurucu veya becerili partner (partner faktörü)"
        : isZh
          ? "单身申请或伴侣技术加分+达到英语雅思4个6分"
          : "Single applicant or partner with skilled qualifications + Competent English",
      estimatedChange: partnerDelta,
      resultingEstimate: currentEstimate === undefined ? undefined : currentEstimate + partnerDelta,
      explanation: isTr
        ? "Partner Competent İngilizce + beceri değerlendirmesini karşılarsa."
        : isZh
          ? "若伴侣通过了澳洲职业评估，且英语达到雅思4个6分（或同等水平）。"
          : "If your partner meets Competent English + a positive skills assessment.",
    });
  }

  // 190 State nomination: +5 points
  if (subclasses.includes("190")) {
    scenarios.push({
      label: isTr
        ? "190 Eyalet/Bölge Adaylığı"
        : isZh
          ? "190 州/领地担保提名"
          : "190 State or Territory Nomination",
      estimatedChange: 5,
      resultingEstimate: currentEstimate === undefined ? undefined : currentEstimate + 5,
      explanation: isTr
        ? "Zorunlu eyalet/bölge adaylığı."
        : isZh
          ? "获得州或领地政府提名。"
          : "Mandatory state/territory nomination.",
    });
  }

  // 491 Regional nomination/sponsorship: +15 points
  if (subclasses.includes("491")) {
    scenarios.push({
      label: isTr
        ? "491 Bölgesel Adaylık veya Sponsorluk"
        : isZh
          ? "491 偏远地区州提名或亲属担保"
          : "491 Regional Nomination or Eligible Relative Sponsorship",
      estimatedChange: 15,
      resultingEstimate: currentEstimate === undefined ? undefined : currentEstimate + 15,
      explanation: isTr
        ? "Puan tablosundaki en büyük tekil artış."
        : isZh
          ? "打分表中数额最大的单项加分。"
          : "The largest single bonus in the points test.",
    });
  }

  if (ageOption === "18_24") {
    scenarios.push({
      label: isTr
        ? "Yaş bandı (18–24): şu anki maksimum puan"
        : isZh
          ? "年龄区间 (18-24岁)：当前最高得分"
          : "Age band (18–24): current maximum points",
      estimatedChange: 0,
      resultingEstimate: currentEstimate,
      explanation: isTr
        ? "Bu avantaj 25 yaşından itibaren azalır."
        : isZh
          ? "此加分优势自25岁起开始下降。"
          : "This advantage begins to decrease at age 25.",
    });
  }

  if (scenarios.length === 0) {
    scenarios.push({
      label: isTr
        ? "Eksik puan faktörleri"
        : isZh
          ? "缺失积分评估因素"
          : "Missing points-table factors",
      estimatedChange: 0,
      resultingEstimate: currentEstimate,
      explanation: isTr
        ? "İstihdam, eğitim, partner ve bonus faktörleri sağlanmadığı için ek matematiksel senaryo hesaplanmadı."
        : isZh
          ? "由于未提供工作经验、学历、伴侣等背景，未计算额外的模拟加分情景。"
          : "Employment, education, partner, and bonus factors were not provided, so no additional mathematical scenario was calculated.",
    });
  }

  // Real combined-pathway scenarios: instead of one arbitrary "top 2"
  // combination, enumerate every distinct 2- and 3-factor combination of the
  // achievable single boosters above (each already additive/non-double-
  // counted -- see the partner-status guard above) and surface the ones that
  // actually matter: (a) distinct paths that cross the real 65-point
  // minimum from the applicant's current score, and (b) -- only when a real,
  // occupation-matched recent invitation benchmark exists (never a guessed
  // number) -- the smallest combination that reaches that benchmark.
  const combinable = scenarios.filter((s) => s.estimatedChange > 0);
  type Combo = { items: typeof combinable; total: number };
  const combos: Combo[] = [];
  for (let i = 0; i < combinable.length; i++) {
    for (let j = i + 1; j < combinable.length; j++) {
      combos.push({
        items: [combinable[i], combinable[j]],
        total: combinable[i].estimatedChange + combinable[j].estimatedChange,
      });
      for (let k = j + 1; k < combinable.length; k++) {
        combos.push({
          items: [combinable[i], combinable[j], combinable[k]],
          total: combinable[i].estimatedChange + combinable[j].estimatedChange + combinable[k].estimatedChange,
        });
      }
    }
  }

  function comboLabel(items: typeof combinable): string {
    return items.map((s) => s.label).join(isTr ? " + " : isZh ? " + " : " + ");
  }

  function pushComboScenario(items: typeof combinable, total: number, explanation: string, labelSuffix?: string) {
    scenarios.push({
      label: comboLabel(items) + (labelSuffix ?? ""),
      estimatedChange: total,
      resultingEstimate: currentEstimate === undefined ? undefined : currentEstimate + total,
      explanation,
      isCombined: true,
    });
  }

  if (currentEstimate !== undefined && combos.length > 0) {
    const targetThresholds = [65, 75, 85, 95];
    const seenComboKeys = new Set<string>();

    for (const target of targetThresholds) {
      if (currentEstimate >= target) continue;
      const gap = target - currentEstimate;
      const reaching = combos
        .filter((c) => c.total >= gap)
        .sort((a, b) => a.items.length - b.items.length || a.total - b.total);

      for (const bestCombo of reaching) {
        const key = bestCombo.items.map((s) => s.label).sort().join("|");
        if (seenComboKeys.has(key)) continue;
        seenComboKeys.add(key);

        const resulting = currentEstimate + bestCombo.total;
        pushComboScenario(
          bestCombo.items,
          bestCombo.total,
          isTr
            ? `${target} puan hedefine ulaşır (Toplam: ${resulting} puan).`
            : isZh
              ? `达到 ${target} 分目标（总分：${resulting} 分）。`
              : `Reaches the ${target}-point target (Total: ${resulting} points).`
        );
        break; // Add only the single best distinct combo for this target threshold
      }
    }

    // Try the real, occupation-matched benchmarks from highest to lowest and
    // use the highest one that's actually reachable with the available
    // boosters -- an ambitious target the profile can't realistically reach
    // is skipped in favor of the next real target down.
    const relevantTrendEstimates = [...(trendEstimates ?? [])]
      .filter((e) => subclasses.includes(e.subclass) && e.estimatedPoints > currentEstimate)
      .sort((a, b) => b.estimatedPoints - a.estimatedPoints);

    for (const target of relevantTrendEstimates) {
      const targetGap = target.estimatedPoints - currentEstimate;
      const reaching = combos
        .filter((c) => c.total >= targetGap)
        .sort((a, b) => a.items.length - b.items.length || a.total - b.total);

      for (const chosen of reaching) {
        const key = chosen.items.map((s) => s.label).sort().join("|");
        if (seenComboKeys.has(key)) continue;
        seenComboKeys.add(key);

        const resulting = currentEstimate + chosen.total;
        pushComboScenario(
          chosen.items,
          chosen.total,
          isTr
            ? `Subclass ${target.subclass} için son davet turlarındaki referans puanına ulaşır (${target.estimatedPoints} puan; sonucunuz: ${resulting}).`
            : isZh
              ? `达到 Subclass ${target.subclass} 近期邀请轮次的参考分数（${target.estimatedPoints} 分；您的结果：${resulting} 分）。`
              : `Reaches the recent invitation benchmark for Subclass ${target.subclass} (${target.estimatedPoints} points; your result: ${resulting}).`,
          isTr
            ? ` (Subclass ${target.subclass} son davet referansı: ${target.estimatedPoints} puan)`
            : isZh
              ? `（Subclass ${target.subclass} 近期邀请参考分：${target.estimatedPoints} 分）`
              : ` (recent Subclass ${target.subclass} invitation benchmark: ${target.estimatedPoints} pts)`
        );
        break; // Only push one combo for this subclass benchmark
      }
    }
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
  "189": `From AUD ${JULY_2026_189_BASE_COST_AUD.toLocaleString("en-AU")} (main applicant)`,
  "190": `From about AUD ${JULY_2026_190_491_BASE_COST_AUD.toLocaleString("en-AU")} (main applicant)`,
  "491": `From about AUD ${JULY_2026_190_491_BASE_COST_AUD.toLocaleString("en-AU")} (main applicant)`,
  "820": "From AUD 11,710 (most applicants) — covers both the temporary (820) and permanent (801) stages",
  "801": "No separate fee — already paid as part of the subclass 820 application",
};
const GOV_FEES_TR: Record<string, string> = {
  "500": "AUD 2.000'den itibaren (muaf olmayan başvurular için)",
  "482": "AUD 4.015'ten itibaren (temel başvuru ücreti)",
  "485": "AUD 4.600'dan itibaren",
  "189": `AUD ${JULY_2026_189_BASE_COST_AUD.toLocaleString("tr-TR")}'ten itibaren (ana başvurucu)`,
  "190": `Yaklaşık AUD ${JULY_2026_190_491_BASE_COST_AUD.toLocaleString("tr-TR")}'tan itibaren (ana başvurucu)`,
  "491": `Yaklaşık AUD ${JULY_2026_190_491_BASE_COST_AUD.toLocaleString("tr-TR")}'tan itibaren (ana başvurucu)`,
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
        ? `Resmi başvuru ücreti vize türüne göre değişir ve 1 Temmuz 2026 sonrası güncellenmiştir. 482 temel ücret: AUD ${JULY_2026_482_BASE_COST_AUD.toLocaleString("en-AU")}. 189 temel ücret: AUD ${JULY_2026_189_BASE_COST_AUD.toLocaleString("en-AU")}. 190/491 temel ücret: yaklaşık AUD ${JULY_2026_190_491_BASE_COST_AUD.toLocaleString("en-AU")}. Ücretler dönemsel olarak endekslenebilir; başvuru öncesi güncel tablo doğrulanmalıdır.`
        : `Official visa application charges vary by subclass and were updated for the post-1 July 2026 schedule. Subclass 482 base charge: AUD ${JULY_2026_482_BASE_COST_AUD.toLocaleString("en-AU")}. Subclass 189 base charge: AUD ${JULY_2026_189_BASE_COST_AUD.toLocaleString("en-AU")}. Subclass 190/491 base charge: about AUD ${JULY_2026_190_491_BASE_COST_AUD.toLocaleString("en-AU")}. Charges can be indexed periodically and should be verified before lodgement.`,
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
    // Look up an occupation-specific assessing authority. For occupations
    // covered by a registered authority (e.g. Architect → AACA, Software Engineer → ACS),
    // the line renders the specific pathway + fee + processing time + doc checklist
    // instead of generic multi-authority text.
    // For ACS, the pathway is resolved from intake data (education + experience).
    //
    // Precise ANZSCO-code match first; when it misses (most commonly an
    // occupation string with no code attached), fall back to fuzzy keyword
    // matching (getAssessingAuthority), which always resolves to something
    // -- a specific authority via keyword, or generalAuthority (VETASSESS /
    // General Professional Authority) as the universal last resort -- so
    // this row is never the old generic "$530-900+, varies by authority"
    // paragraph. getAuthorityById turns that match's authorityId back into
    // the full authority object so the same fee/pathway rendering below
    // works identically for both the precise and fuzzy-matched cases.
    const authority =
      getSkillsAssessmentAuthority(input.occupation) ??
      getAuthorityById(getAssessingAuthority(input.occupation).authorityId);
    let primaryPathway = getDefaultPathway(authority);

    // ACS-specific: resolve pathway from intake data instead of default
    if (authority?.authorityId === "ACS") {
      const resolvedId = resolveACSPathway({
        qualificationLevel: input.qualificationLevel ?? "",
        completedAtAustralianInstitution: input.qualificationAwardedInAustralia === true,
        yearsOfExperience: (input.offshoreExperienceYears ?? 0) + (input.onshoreExperienceYears ?? 0),
      });
      const resolved = authority.pathways.find((p) => p.pathwayId === resolvedId);
      if (resolved) primaryPathway = resolved;
    }

    if (authority && primaryPathway) {
      const primaryFee = primaryPathway.fees.find((f) => typeof f.amountAUD === "number")
        ?? primaryPathway.fees[0];
      const feeLabel = primaryFee?.amountAUD !== undefined
        ? `AUD $${primaryFee.amountAUD.toLocaleString("en-AU")} ${primaryFee.note ? `(${resolveLocalized(primaryFee.note, locale)})` : ""}`
        : (primaryFee?.label ? resolveLocalized(primaryFee.label, locale) : "");
      const processing = primaryPathway.processingTimeWeeks
        ? `${primaryPathway.processingTimeWeeks.standard} wk${primaryPathway.processingTimeWeeks.ifIncomplete ? ` (${primaryPathway.processingTimeWeeks.ifIncomplete} wk if incomplete)` : ""}`
        : "";
      // primaryPathway.notes is LocalizedString[] ({ en, tr, "zh-Hans" } |
      // string), not string[] -- joining it directly stringifies each
      // object entry as "[object Object]". Resolve to the current locale
      // first.
      const notesText = primaryPathway.notes?.length
        ? resolveLocalizedArray(primaryPathway.notes, locale).slice(0, 2).join(" ")
        : "";
      // primaryPathway.name is also LocalizedString, not a plain string --
      // same "[object Object]" risk as notes above (this one showed up as
      // "Default pathway: [object Object]" in the rendered PDF).
      const pathwayName = resolveLocalized(primaryPathway.name, locale);

      items.push({
        category: isTr
          ? `Beceri Değerlendirmesi — ${authority.authorityName} (${authority.authorityId})`
          : `Skills Assessment — ${authority.authorityName} (${authority.authorityId})`,
        estimateType: "third_party_estimate",
        amountLabel: isTr
          ? feeLabel
          : feeLabel,
        explanation: isTr
          ? `Otorite: ${authority.authorityName}. Varsayılan yol: ${pathwayName}.${primaryPathway.processingTimeWeeks ? ` İşlem süresi: ${processing}.` : ""}${primaryPathway.minWorkExperienceMonths ? ` Minimum iş deneyimi: ${primaryPathway.minWorkExperienceMonths} ay.` : primaryPathway.minWorkExperienceYears ? ` Minimum iş deneyimi: ${primaryPathway.minWorkExperienceYears} yıl.` : ""} ${notesText ? "Notlar: " + notesText : ""} Kaynak: ${authority.sourceDocument} (last verified ${authority.lastVerified}).`
          : `Assessing authority: ${authority.authorityName}. Default pathway: ${pathwayName}.${primaryPathway.processingTimeWeeks ? ` Processing time: ${processing}.` : ""}${primaryPathway.minWorkExperienceMonths ? ` Min work experience: ${primaryPathway.minWorkExperienceMonths} months.` : primaryPathway.minWorkExperienceYears ? ` Min work experience: ${primaryPathway.minWorkExperienceYears} years.` : ""} ${notesText ? "Notes: " + notesText : ""} Source: ${authority.sourceDocument} (last verified ${authority.lastVerified}).`,
      });
    } else {
      // Should not be reachable now that generalAuthority (VETASSESS /
      // General Professional Authority) is always resolved as the last
      // resort above -- kept as a defensive fallback only, in case
      // getAuthorityById/getAssessingAuthority is ever refactored to allow
      // a genuinely unresolvable case again.
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
  }

  items.push(
    {
      category: isTr ? "Sağlık Muayenesi (eMedical)" : "Health Examination (eMedical)",
      estimateType: "third_party_estimate",
      amountLabel: isTr
        ? "AUD 300–500+ (yaşa ve ülkeye göre, kişi başı)"
        : "AUD $300–$500+ (per person, varies by age and country of residence)",
      explanation: isTr
        ? "Her başvurucu, İçişleri Bakanlığı (Department of Home Affairs) tarafından onaylı panel sağlayıcısı Bupa Medical Visa Services aracılığıyla eMedical muayenesi yaptırmalıdır. Çocuklar ve gençler daha düşük ücretle muayene olabilir. Muayene akciğer röntgeni (11 yaş ve üzeri için), kan testi ve genel fizik muayeneyi kapsar. Sonuçlar eMedical sistemi üzerinden elektronik olarak Department of Home Affairs'e iletilir — kağıt rapor gönderimi gerekmez. Geçerlilik süresi 12 aydır. Mevcut TB salgını olan ülkelerden gelenler ek testlerden geçebilir, bu da süreci 6–12 ay uzatabilir."
        : "Every applicant must complete a medical examination through Bupa Medical Visa Services, the panel provider approved by the Department of Home Affairs. Indicative costs: adults AUD $300–$400; children under 15 approximately AUD $150–$250. The examination includes a chest X-ray (for applicants 11+), blood tests, and a general physical assessment. Medical results are electronically transmitted to the Department of Home Affairs via the eMedical system — there is no paper report to submit. Results are valid for 12 months. Applicants from tuberculosis-prevalent countries may require additional chest monitoring, extending the process by 6–12 months.",
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
  hasGraduateVisaPathwayIntent = false,
  isPartnerPathway = false,
  input?: ReadinessInput,
  pointsEstimate?: PointsEstimate
): ProgressionPathway[] {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const items: ProgressionPathway[] = [];
  const hasSkilled = subclasses.some((subclass) => ["189", "190", "491"].includes(subclass));

  const score = pointsEstimate?.estimatedPoints ?? 0;
  const gap = Math.max(0, 65 - score);

  if (hasGraduateVisaPathwayIntent) {
    items.push({
      from: isTr ? "Mevcut profil" : isZh ? "当前档案" : "Current profile",
      to: isTr ? "485 köprüsü → 189/190/491" : isZh ? "485 桥梁 → 189/190/491" : "485 bridge → 189/190/491",
      label: isTr ? "485 köprü stratejisi" : isZh ? "485 桥梁策略" : "485 bridge strategy",
      explanation: isTr
        ? "485 geçici mezun vizesi, Avustralya iş deneyimi biriktirmek ve eyalet adaylığı şartlarına yaklaşmak için stratejik bir köprü olarak kullanılabilir; bu yalnızca geçiş bağlamıdır, bağımsız bir PR yolu değildir."
        : isZh
          ? "485 临时毕业生签证可用作积累澳大利亚工作经验并更接近州担保要求的战略桥梁；这仅是过渡逻辑，并非独立的永久居民路径。"
          : "The 485 Temporary Graduate Visa can be used as a strategic bridge to accumulate Australian work experience and move closer to state nomination requirements; it is contextual transition logic, not a standalone PR pathway.",
    });
  }

  if (subclasses.includes("500")) {
    items.push({
      from: "500",
      to: "485 → 189/190/491",
      label: isTr ? "Öğrenci yolu bağlamı" : isZh ? "学生签证路径" : "Student pathway context",
      explanation: isTr
        ? "Öğrenci yolu sonrasında mezuniyet ve nitelikli göç seçenekleri bazı profillerde birlikte değerlendirilebilir. Bu genel bilgi amaçlıdır ve kişisel koşullara bağlıdır."
        : isZh
          ? "在一些档案中，学生签证之后的毕业生签证和技术移民选项可以结合考虑。本内容仅为一般信息，取决于个人情况。"
          : "After a student pathway, graduate and skilled migration options may be considered together in some profiles. This is general information only and depends on individual circumstances."
    });
  }

  if (hasSkilled && !subclasses.includes("500") && !subclasses.includes("485")) {
    items.push({
      from: "500",
      to: "485 → 189/190/491",
      label: isTr ? "Öğrenci yolu bağlamı" : isZh ? "学生签证路径" : "Student pathway context",
      isAlternative: true,
      explanation: isTr
        ? "Öğrenci vizesi (500) alıp Avustralya'da eğitim görmek, mezuniyet sonrası geçici vize ve nihayetinde PR yollarını açmak için alternatif bir seçenek olabilir. Bu yol ek finansal yatırım ve zaman gerektirir."
        : isZh
          ? "通过申请学生签证（500）在澳大利亚学习，是积累本地学历、解锁毕业后工作签证并最终申请技术移民的替代方案。此途径需要额外的资金投入和时间。"
          : "Taking a Student visa (500) to study in Australia can be an alternative route to unlock post-study graduate visas and eventual PR pathways. This requires additional financial investment and time.",
    });
  }

  if (hasSkilled && !subclasses.includes("482")) {
    items.push({
      from: "482",
      to: "Employer-sponsored permanent pathways",
      label: isTr ? "İş sponsorluğu bağlamı" : isZh ? "雇主担保路径" : "Employer sponsorship context",
      isAlternative: true,
      explanation: isTr
        ? "İş sponsorluğu (482 vizesi), işvereniniz tarafından sponsor olunarak Avustralya'da kalmanızı sağlayan alternatif bir yoldur. İleride 186 ENS gibi kalıcı göçmenlik vizesine geçiş olanağı sunabilir."
        : isZh
          ? "雇主担保（482签证）是让您在雇主支持下在澳大利亚工作的替代方案。如果在相关职位工作满规定年限且符合条件，未来可过渡到 186 ENS 等永久居民签证。"
          : "Employer sponsorship (subclass 482) is an alternative route allowing you to remain in Australia with employer support. It can lead to permanent pathways like the 186 ENS later.",
    });
  }

  if (subclasses.includes("485")) {
    items.push({
      from: "485",
      to: "189 / 190 / 491",
      label: isTr ? "485 sonrası tipik seçenekler" : isZh ? "典型的 485 之后选项" : "Typical post-485 options",
      explanation: isTr
        ? "485 Geçici Mezun vizesinden sonra nitelikli göç yolları bazı profillerde ilgili olabilir. Bu PR vaadi değildir ve kişisel duruma göre değişebilir."
        : isZh
          ? "在一些档案中，485 临时毕业生签证之后的毕业生签证和技术移民选项可以结合考虑。这不构成永久居民保证，取决于个人情况。"
          : "After the 485 Temporary Graduate visa, skilled migration pathways may be relevant in some profiles. This does not promise permanent residence and depends on individual circumstances.",
    });
  }

  if (subclasses.includes("482")) {
    items.push({
      from: "482",
      to: "Employer-sponsored permanent pathways",
      label: isTr ? "İş sponsorluğu bağlamı" : isZh ? "雇主担保路径" : "Employer sponsorship context",
      explanation: isTr
        ? "İş sponsorluğu bağlamında 482 sonrası kalıcı sponsorlu yollar bazı profillerde değerlendirilebilir; bu durum bireysel koşullara bağlıdır."
        : isZh
          ? "在 482 之后，雇主担保的永久途径在某些情况下可能是相关的；标准和雇主背景至关重要。"
          : "After 482, employer-sponsored permanent pathways may be relevant in some cases; criteria and employer context matter.",
    });
  }

  if (subclasses.includes("491")) {
    items.push({
      from: "491",
      to: "191",
      label: isTr ? "Bölgesel geçiş bağlamı" : isZh ? "偏远地区过渡路径" : "Regional progression context",
      explanation: isTr
        ? gap > 0
          ? `491 bölgesel vizesini aldıktan sonra, 191 kalıcı ikamet vizesine geçiş için en az 3 yıl boyunca belirlenmiş bir bölgesel alanda yaşamanız, çalışmanız ve vergilendirilebilir gelir şartını (yıllık 53.900 AUD; bkz. Tahmini Maliyet Yol Haritası) karşılamanız gerekir. Mevcut ${gap} puanlık açığınız göz önüne olduğunda, 491 vizesi üzerinden +15 puanlık bölgesel adaylık desteği almak, bu açığı kapatarak PR'a giden yolda son derece gerçekçi ve gerekli bir adımdır.`
          : `491 bölgesel vizesini aldıktan sonra, 191 kalıcı ikamet vizesine geçiş için en az 3 yıl boyunca belirlenmiş bir bölgesel alanda yaşamanız, çalışmanız ve vergilendirilebilir gelir şartını (yıllık 53.900 AUD; bkz. Tahmini Maliyet Yol Haritası) karşılamanız gerekir.`
        : isZh
          ? gap > 0
            ? `获得 491 偏远地区签证后，您必须在指定的偏远地区居住并工作至少 3 年，并满足应纳税收入要求（目前为每年 53,900 澳元；请参见财务路线图部分）。鉴于您目前有 ${gap} 分的分数差距，通过 491 获得偏远地区州担保的 +15 分加分，是通往 191 永久居民签证的一条非常务实且必不可少的捷径。`
            : `获得 491 偏远地区签证后，您必须在指定的偏远地区居住并工作至少 3 年，并满足应纳税收入要求（目前为每年 53,900 澳元；请参见财务路线图部分），方可递交 191 永久居民签证。`
          : gap > 0
            ? `After obtaining a subclass 491 visa, you must live and work in a designated regional area for at least 3 years and meet taxable income requirements (currently AUD 53,900/year; refer to the Financial Roadmap). Given your current points gap of ${gap} points, securing the +15 point regional nomination via subclass 491 is a highly realistic and essential stepping stone to permanent residency (subclass 191).`
            : `After obtaining a subclass 491 visa, you must live and work in a designated regional area for at least 3 years and meet taxable income requirements (currently AUD 53,900/year; refer to the Financial Roadmap) to progress to permanent residency (subclass 191).`,
    });
  }

  if (subclasses.includes("190")) {
    items.push({
      from: "190 EOI",
      to: "190 Permanent Residency",
      label: isTr ? "Eyalet adaylığı süreci" : isZh ? "州担保提名流程" : "State nomination progression",
      explanation: isTr
        ? gap > 0
          ? `190 vizesi süreci, eyaletten adaylık daveti almayı (+5 puan) içerir. Mevcut ${gap} puanlık açığınız göz önüne alındığında, eyalet adaylığı desteği, rekabetçi bir davet barajına ulaşmanız için kritik öneme sahiptir.`
          : `190 vizesi süreci, eyaletten adaylık daveti almayı (+5 puan) içerir ve doğrudan kalıcı ikamet hakkı sağlar.`
        : isZh
          ? gap > 0
            ? `递交 190 签证的流程包括获得州担保提名（+5 分）。鉴于您目前有 ${gap} 分的分数差距，州担保对于帮助您弥补差距、达到具有竞争力的邀请分数线至关重要。`
            : `递交 190 签证的流程包括获得州担保提名（+5 分），成功后可直接获得澳大利亚永久居民身份。`
          : gap > 0
            ? `Progressing through subclass 190 involves obtaining a state nomination (+5 points). Given your current gap of ${gap} points, state sponsorship is crucial to help bridge the remaining points needed to reach a competitive invitation benchmark.`
            : `Progressing through subclass 190 involves obtaining a state nomination (+5 points), leading directly to permanent residency.`,
    });
  }

  if (subclasses.includes("189")) {
    items.push({
      from: "189 EOI",
      to: "189 Permanent Residency",
      label: isTr ? "Bağımsız nitelikli göç süreci" : isZh ? "独立技术移民流程" : "Independent skilled progression",
      explanation: isTr
        ? gap > 0
          ? `189 vizesi için süreç, eyalet adaylığı olmaksızın tamamen puan bazlıdır. Mevcut ${gap} puanlık açığınız göz önüne alındığında, davet turlarında rekabetçi olabilmek için tekil veya birleşik puan artırıcıları (örn. İngilizce sınavı, NAATI) aktif olarak hedeflemelisiniz.`
          : `189 vizesi için süreç, eyalet adaylığı olmaksızın tamamen puan bazlıdır. Davet turlarında doğrudan kalıcı ikamet hakkı sağlar.`
        : isZh
          ? gap > 0
            ? `对于 189 独立技术移民签证，申请完全基于您的打分，无需州担保。鉴于您目前有 ${gap} 分的分数差距，您必须积极争取单项或组合加分（例如英语考试、NAATI 社区语言认证），才能在邀请轮次中具备竞争力。`
            : `对于 189 独立技术移民签证，申请完全基于您的打分，达到门槛后可通过递交 EOI 竞争直接受邀获得永久居民身份。`
          : gap > 0
            ? `For subclass 189, progression is purely points-based without state nomination. Given your current gap of ${gap} points, you must actively pursue single or combined points boosters (e.g. English test, NAATI) to become competitive for invitation rounds.`
            : `For subclass 189, progression is purely points-based, leading directly to permanent residency upon invitation.`,
    });
  }

  if ((subclasses.includes("820") || subclasses.includes("801"))) {
    items.push({
      from: "820",
      to: "801",
      label: isTr ? "Partner yolu aşamaları" : isZh ? "伴侣签证阶段" : "Partner pathway stages",
      explanation: isTr
        ? "820 geçici aşama ve 801 kalıcı aşama aynı onshore partner yolunun tipik aşamalarıdır."
        : isZh
          ? "820 临时阶段和 801 永久阶段是同一种境内伴侣签证路径的典型阶段。"
          : "820 temporary stage and 801 permanent stage are typical stages of the same onshore partner pathway.",
    });
  }

  if (items.length === 0 && isPartnerPathway) {
    items.push({
      from: isTr ? "Mevcut profil" : isZh ? "当前档案" : "Current profile",
      to: isTr ? "Kapsam dışı" : isZh ? "范围之外" : "Out of scope",
      label: isTr ? "Partner Vizesi (820/801) değerlendirmesi kapsam dışı" : isZh ? "伴侣签证 (820/801) 评估范围之外" : "Partner Visa (820/801) assessment out of scope",
      explanation: isTr
        ? "Bu araç Partner Vizesi (820/801) için tipik bir geçiş yolu öngörmez; bu tamamen ayrı bir ilişki-temelli vize kategorisidir. Uygunluk için kayıtlı bir göçmenlik danışmanına (MARA) danışın."
        : isZh
          ? "此工具不为伴侣签证 (820/801) 预测过渡路径——它是一个完全独立的、基于关系的签证类别。请咨询注册移民代理 (MARA) 以获取资格评估。"
          : "This tool does not project a typical progression pathway for the Partner Visa (820/801) -- it is a separate, relationship-based visa category. Consult a registered migration agent (MARA) for eligibility.",
    });
  } else if (items.length === 0) {
    items.push({
      from: isTr ? "Mevcut profil" : isZh ? "当前档案" : "Current profile",
      to: isTr ? "Stratejik nitelikli göç yolu" : isZh ? "战略技术移民路线" : "Strategic skilled migration route",
      label: isTr ? "Nitelikli göç için standart ilerleme" : isZh ? "技术移民标准进度" : "Standard progression for skilled professionals",
      explanation: isTr
        ? "Mevcut ortamda nitelikli profesyoneller için standart ilerleme genellikle olumlu bir Skills Assessment alınmasını, İngilizce puanını Superior seviyeye taşımayı ve hem Eyalet (190) hem de Bölgesel (491) sponsorluklarını hedefleyen stratejik bir Expression of Interest (EOI) sunumunu içerir."
        : isZh
          ? "在当前环境下，技术专业人员的标准进度通常包括获得正面的职业评估、将英语成绩提高到 Superior 级别，并递交针对州担保 (190) 和偏远地区担保 (491) 的战略性 EOI 意向书。"
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
  const filtered = pathways.filter(
    (p) => !(p.relevance === "ineligible" && p.ineligiblePointsLine !== undefined)
  );
  return filtered.map((pathway) => {
    if (pathway.relevance === "ineligible") {
      // Hard Gate (1 July 2026): replaces the routine friction note with a
      // compliance alert carrying the exact ineligibility reason. A
      // below-threshold score (ineligiblePointsLine set) is not a rule
      // violation, so it gets the neutral "Below Points Threshold" label
      // instead of "CRITICAL COMPLIANCE ALERT", which is reserved for
      // genuine hard-gate breaches (age cap, salary floor, tenure, etc).
      const visaLabel =
        pathway.subclass === "general" ? pathway.visaName : `${pathway.visaName.replace(/\s*\(subclass\s+\d+\)\s*$/i, "").replace(/\s*\(\d+\)\s*$/, "")} (${pathway.subclass})`;
      const isPointsThresholdOnly = pathway.ineligiblePointsLine !== undefined;
      return {
        pathway: visaLabel,
        frictionType: isPointsThresholdOnly
          ? isTr ? "📉 PUAN EŞİĞİNİN ALTINDA" : isZh ? "📉 未达到分数门槛" : "📉 BELOW POINTS THRESHOLD"
          : isTr ? "🚨 KRİTİK UYUMLULUK UYARISI" : isZh ? "🚨 关键合规警报" : "🚨 CRITICAL COMPLIANCE ALERT",
        explanation: customIneligibleFrictionExplanation(locale, pathway.subclass),
        isHardIneligible: true,
        isPointsThresholdOnly,
      };
    }
    const visaLabel =
      pathway.subclass === "general" ? pathway.visaName : `${pathway.visaName.replace(/\s*\(subclass\s+\d+\)\s*$/i, "").replace(/\s*\(\d+\)\s*$/, "")} (${pathway.subclass})`;
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

/**
 * Single source of truth for the report's overall confidence level: the most
 * cautious (lowest) confidenceLevel among relevant pathways, since a report
 * is only as trustworthy as its weakest-confidence recommendation. Both the
 * Structured Pathway Comparison badges (per-pathway confidenceLevel) and
 * this aggregate text now derive from the same underlying values instead of
 * each side independently re-deriving "how much data is missing" from raw
 * input fields — which is what let them disagree (e.g. badges showing "Low"
 * while the narrative said "moderate").
 */
function getOverallConfidenceLevel(pathways: PathwayComparison[]): ConfidenceLevel {
  const relevantLevels = pathways.filter((p) => p.relevance !== "ineligible").map((p) => p.confidenceLevel);
  if (relevantLevels.length === 0) return "low";
  const rank: Record<ConfidenceLevel, number> = { low: 0, medium: 1, high: 2 };
  return relevantLevels.reduce((worst, level) => (rank[level] < rank[worst] ? level : worst), "high" as ConfidenceLevel);
}

/**
 * Builds the confidence narrative's "missing fields" list directly from the
 * SAME evidenceReadiness array rendered in the Evidence Readiness Snapshot
 * section, instead of a hardcoded example list (e.g. "occupation and English
 * level") that could name a field as missing when the snapshot right above
 * it already says "Provided". Only status === "missing" items are listed —
 * "unclear"/"typically_required" items are not confirmed-missing, so listing
 * them here would be a different, unsupported claim.
 */
function buildConfidenceMissingFieldsList(evidenceReadiness: EvidenceReadinessItem[]): string[] {
  return evidenceReadiness.filter((item) => item.status === "missing").map((item) => item.category);
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
  const hasSponsor = hasSponsorContext(input.sponsorOrFamily);
  const overallConfidenceLevel = getOverallConfidenceLevel(pathways);
  const missingFields = buildConfidenceMissingFieldsList(evidenceReadiness);
  const missingFieldsList = missingFields.length > 0
    ? missingFields.join(isZh ? "、" : ", ")
    : isTr
      ? "temel profil bilgileri"
      : isZh
        ? "核心档案信息"
        : "key profile inputs";

  if (overallConfidenceLevel === "low") {
    return isTr
      ? `Güven düzeyi sınırlıdır çünkü ${missingFieldsList} gibi temel bilgiler eksik veya yetersiz. Bu rapor yalnızca genel bilgidir ve kişisel koşullara bağlıdır.`
      : isZh
        ? `由于${missingFieldsList}等核心信息缺失或不足，置信度有限。本报告仅为一般信息，仍取决于个人具体情况。`
        : `Confidence is limited because key inputs such as ${missingFieldsList} are missing or insufficient. This report is general information only and depends on individual circumstances.`;
  }

  if (overallConfidenceLevel === "high") {
    // Mirror-image of the "low" branch's fix: only claim a field is
    // "provided" if it actually is, instead of asserting age/English/
    // occupation/passport unconditionally.
    const occupationDisplay = resolveOccupationDisplayName(input.occupation, locale);
    const providedBits: string[] = [];
    if (input.age) providedBits.push(isTr ? `yaş (${input.age})` : isZh ? `年龄（${input.age}）` : `age (${input.age})`);
    if (hasRealEnglishEvidence(input)) providedBits.push(isTr ? "İngilizce seviyesi" : isZh ? "英语水平" : "English level");
    if (input.occupation) providedBits.push(isTr ? `meslek (${occupationDisplay})` : isZh ? `职业（${occupationDisplay}）` : `occupation (${occupationDisplay})`);
    if (input.passportCountry) providedBits.push(isTr ? `pasaport ülkesi (${input.passportCountry})` : isZh ? `护照国家（${input.passportCountry}）` : `passport country (${input.passportCountry})`);
    const providedList = providedBits.length > 0
      ? providedBits.join(isZh ? "、" : ", ")
      : isTr
        ? "temel profil bilgileri"
        : isZh
          ? "核心档案信息"
          : "key profile inputs";
    return isTr
      ? `Güven düzeyi daha güçlüdür çünkü ${providedList} sağlanmıştır; bazı yol-özel kanıtlar hâlâ ayrıca incelenir${estimatedPoints !== undefined ? ` (tahmini temel puan: ${estimatedPoints})` : ""}. Bu yalnızca genel bilgidir.`
      : isZh
        ? `由于已提供${providedList}，置信度较强；部分路径特定证据仍需单独复核${estimatedPoints !== undefined ? `（当前加分信号：${estimatedPoints}）` : ""}。本内容仅为一般信息。`
        : `Confidence is stronger because ${providedList} are provided, while some pathway-specific evidence still needs separate review${estimatedPoints !== undefined ? ` (estimated base points: ${estimatedPoints})` : ""}. This is general information only.`;
  }

  return isTr
    ? "Güven düzeyi orta seviyededir çünkü bazı temel bilgiler sağlanmıştır; ancak beceri değerlendirmesi ve puan bağlamı net değildir."
    : isZh
      ? `由于部分核心信息已提供，置信度为中等；但职业评估和完整加分背景仍不明确${estimatedPoints !== undefined ? `（当前加分信号：${estimatedPoints}）` : ""}。${hasSponsor ? "已提供担保背景。" : "担保背景看起来有限。"}本内容仅为一般信息，仍取决于个人具体情况。`
      : `Confidence is moderate because some core inputs are provided, but skills assessment and full points context remain unclear${estimatedPoints !== undefined ? ` (estimated base points: ${estimatedPoints})` : ""}. ${hasSponsor ? "Sponsorship context is provided." : "Sponsorship context appears limited."} This is general information only and depends on individual circumstances.`;
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
    const frictionRank = { low: 4, medium: 3, high: 2, extreme: 1 };
    return frictionRank[b.friction] - frictionRank[a.friction];
  });

  const strongestPathway = sorted[0];
  const confidenceLabel: SignalSnapshot["confidenceLabel"] =
    strongestPathway?.relativePosition === "stronger_signal"
      ? "stronger"
      : strongestPathway?.relativePosition === "moderate_signal"
        ? "moderate"
        : "limited";

  // Strip any existing "(subclass N)" or "(N)" suffix from visaName before
  // appending the subclass code, to avoid duplication (e.g. 186's VISA_NAMES
  // entry already contains "(subclass 186)", so appending "(186)" would
  // produce "... (subclass 186) (186)").
  const formatVisaLabel = (name: string, sub: string): string => {
    const stripped = name.replace(/\s*\(subclass\s+\d+\)\s*$/i, "").replace(/\s*\(\d+\)\s*$/, "");
    return `${stripped} (${sub})`;
  };

  return {
    strongest: strongestPathway
      ? formatVisaLabel(strongestPathway.visaName, strongestPathway.subclass)
      : "General pathway signal",
    secondary: sorted.slice(1, 3).map((item) => formatVisaLabel(item.visaName, item.subclass)),
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
    const targetProvince = resolveTargetProvince(input);
    let amountLabel = t("CAD $0–$2,000 (varies by province)", "CAD 0–2.000 (eyalete göre değişir)", "CAD $0–$2,000（因省份而异）");
    let explanation = t(
      "Some PNP streams have their own application fees: Ontario OINP (no fee for Tech Draw), BC PNP Skills Immigration (CAD $1,750), Alberta AAIP (CAD $135 Worker EOI + CAD $1,500 application fee). A PNP nomination adds +600 CRS points.",
      "Bazı PNP akışlarının kendi başvuru ücretleri vardır: Ontario OINP (Tech Draw ücretsiz), BC PNP Skills Immigration (CAD 1.750), Alberta AAIP (CAD 135 Worker EOI + CAD 1.500 başvuru ücreti). PNP adaylığı +600 CRS puanı ekler.",
      "部分PNP通道有独立申请费：安大略省OINP（科技抽签免费），BC省PNP技术移民（CAD $1,750），阿尔伯塔AAIP（CAD $135 意向表达费 + CAD $1,500 申请费）。省提名可获 +600 CRS 分。"
    );

    if (targetProvince === "BC") {
      amountLabel = "CAD $1,750";
      explanation = t(
        "BC PNP Skills Immigration application fee (updated 22 January 2026). A PNP nomination adds +600 CRS points, effectively guaranteeing an ITA in the next Express Entry draw.",
        "BC PNP Skills Immigration başvuru ücreti (22 Ocak 2026'da güncellenmiştir). PNP adaylığı +600 CRS puanı ekleyerek sonraki Express Entry çekilişinde ITA'yı neredeyse garanti eder.",
        "BC省技术移民（Skills Immigration）申请费（2026年1月22日更新）。省提名可获 +600 CRS 分，实际上可保证在下次 Express Entry 抽签中获得 ITA。"
      );
    } else if (targetProvince === "AB") {
      amountLabel = "CAD $1,635";
      explanation = t(
        "Alberta AAIP fees: CAD $135 Worker Express of Interest (EOI) fee (effective 7 April 2026) + CAD $1,500 application fee. A PNP nomination adds +600 CRS points, effectively guaranteeing an ITA in the next Express Entry draw.",
        "Alberta AAIP ücretleri: CAD 135 Worker EOI ücreti (7 Nisan 2026'dan itibaren) + CAD 1.500 başvuru ücreti. PNP adaylığı +600 CRS puanı ekleyerek sonraki Express Entry çekilişinde ITA'yı neredeyse garanti eder.",
        "阿尔伯塔省 AAIP 费用：CAD $135 劳工意向表达（EOI）费（2026年4月7日生效）+ CAD $1,500 申请费。省提名可获 +600 CRS 分，实际上可保证在下次 Express Entry 抽签中获得 ITA。"
      );
    } else if (targetProvince === "QC") {
      amountLabel = "CAD $940";
      explanation = t(
        "Quebec MIFI processing fee for a permanent selection application (effective 1 January 2026). Note: MIFI fees are adjusted annually on January 1st; lodgement-ready applicants should verify the exact fee on quebec.ca before submitting payment.",
        "Quebec MIFI kalıcı seçim başvuru işlem ücreti (1 Ocak 2026'dan itibaren geçerli). Not: MIFI ücretleri her yıl 1 Ocak'ta güncellenir; başvuru sahipleri ödemeden önce güncel ücreti quebec.ca adresinden doğrulamalıdır.",
        "魁北克 MIFI 永久选拔申请处理费（2026年1月1日生效）。注：MIFI 费用每年1月1日调整，准备递交的申请人应在付款前在 quebec.ca 上核实准确费用。"
      );
    }

    items.push({
      category: t(
        "Provincial Nominee Program (PNP) stream — if applicable",
        "Eyalet Aday Programı (PNP) akışı — geçerliyse",
        "省提名计划（PNP）通道（如适用）"
      ),
      estimateType: "variable",
      amountLabel,
      explanation,
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
      "A valid provincial/territorial nomination that keeps your Express Entry profile active adds exactly +600 CRS points — effectively guaranteeing an Invitation to Apply (ITA) in the next general draw regardless of base CRS score. This is the ENHANCED nomination route (not every provincial nomination is Express Entry-linked -- verify which route a given stream offers before assuming +600 applies). Ontario: as of 26 June 2026, the previous 8 OINP streams (including Human Capital Priorities) were replaced by the single Ontario Workforce Priority Stream, covering TEER 0-3, TEER 4-5, and Self-Employed Physicians pathways -- each offers an optional Express Entry nomination route if the candidate maintains a valid Express Entry profile through to nomination; its EOI intake is currently closed pending reopening, so this is a readiness check, not confirmation a nomination can be submitted today. See the State Nomination Tracker section for a code-based eligibility check against your profile. BC and Alberta PNP modules are not yet implemented in this report -- consult WelcomeBC.ca / Alberta.ca directly for their current streams and CRS-linkage rules.",
      "Express Entry profilinizi aktif tutan geçerli bir eyalet/bölge adaylığı +600 CRS puanı ekler; bu da bir sonraki çekilişte ITA'yı neredeyse garanti eder (her eyalet adaylığı Express Entry'ye bağlı değildir, doğrulayın). Ontario: 26 Haziran 2026 itibarıyla önceki 8 OINP stream'i (Human Capital Priorities dahil) kaldırılıp tek bir Ontario Workforce Priority Stream ile değiştirildi (TEER 0-3, TEER 4-5, Kendi Hesabına Çalışan Hekimler); her biri isteğe bağlı bir Express Entry adaylık yolu sunar. EOI başvuru sistemi şu anda kapalı ve yeniden açılış bekleniyor; bu nedenle bu bir hazırlık değerlendirmesidir, bugün başvuru yapılabileceği anlamına gelmez. Ayrıntı için Eyalet Aday Gösterme Programı (PNP) Takibi bölümüne bakın. BC ve Alberta PNP modülleri bu raporda henüz uygulanmadı.",
      "保持 Express Entry 档案有效的有效省/地区提名可获 +600 CRS 分，实际上保证在下次抽签中获得 ITA（并非所有省提名都与 Express Entry 挂钩，请核实）。安大略省：自2026年6月26日起，此前的8个OINP通道（含人力资本优先）已被单一的Ontario Workforce Priority Stream取代（分为TEER 0-3、TEER 4-5、自雇医生三条路径），每条路径均可选择性走Express Entry提名通道；其EOI申请系统目前处于关闭状态，等待重新开放，因此这只是一项准备度评估，并不代表今天即可提交提名申请。详见省提名计划（PNP）追踪部分。本报告尚未实现BC和阿尔伯塔省的PNP模块。"
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
  if (isPartnerFamilySponsorship(input.preferredPathway)) {
    return buildPartnerReadinessReport(input, "CA");
  }
  const locale = input.locale;
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const hasPnpInterest = hasCanadaPnpInterest(input);

  const fstpEligibility = buildFSTPEligibility(input);
  // FSTP is only surfaced when the occupation's NOC code is actually in an
  // FSTP-eligible trade group (code-based check, not free-text keyword
  // matching) -- detectCanadaPathways may still add "FSTP" from keyword
  // intent or the generic PR-intent fallback, but a non-trades occupation
  // (e.g. Software Engineer) must not show FSTP as a pathway option, and a
  // trades occupation that wasn't explicitly named must not be silently
  // excluded either.
  let pathwayCodes = detectCanadaPathways(input);
  if (pathwayCodes.includes("FSTP") && !fstpEligibility.occupationEligible) {
    const isExplicitFSTP = input.preferredPathway === "canada-express-entry-fstp" ||
      (input.preferredPathway && input.preferredPathway.toLowerCase().includes("fstp"));
    if (!isExplicitFSTP) {
      pathwayCodes = pathwayCodes.filter((code) => code !== "FSTP");
    } else {
      // If FSTP is explicit but occupation is ineligible, check if TEER 0/1/2/3 to suggest FSW and CEC as alternatives
      const nocResult = checkNocOccupation({ occupation: input.occupation ?? "", nocCode: input.nocCode });
      const nocMatch = nocResult.matches.find((m) => m.code === input.nocCode) ?? nocResult.matches[0];
      const teer = input.nocTeer ?? nocMatch?.teer;
      if (teer !== undefined && teer <= 3) {
        if (!pathwayCodes.includes("FSW")) pathwayCodes.push("FSW");
        if (!pathwayCodes.includes("CEC")) pathwayCodes.push("CEC");
      }
    }
  }
  const pointsEstimate = buildCanadaPointsEstimate(input, locale);
  const dataCompleteness = buildDataCompleteness(input, locale);
  const pathwayComparison = buildCanadaPathwayComparison(pathwayCodes, locale, pointsEstimate.estimatedPoints, input.occupation, fstpEligibility);

  const targetProvince = resolveTargetProvince(input);
  const isEeEligible = isFederalEeEligible(input);

  if (targetProvince === "ON") {
    const ontarioResults = buildOntarioPnpEligibility(input);
    const onComparisons: PathwayComparison[] = ontarioResults.map((res) => {
      const isPhysician = res.pathwayId === "SELF_EMPLOYED_PHYSICIAN";
      return {
        subclass: res.pathwayId,
        visaName: res.stream.streamName,
        reason: isPhysician
          ? (isTr
              ? "Ontario Kendi Hesabına Çalışan Hekimler akışı için OHIP faturalandırma uygunluğu ve CPSO kaydı gereklidir (formda toplanmamıştır)."
              : isZh
                ? "安大略自雇医生通道需要 OHIP 计费资格和 CPSO 注册状态（本表单未收集）。"
                : "Ontario Self-Employed Physicians pathway requires OHIP billing eligibility and CPSO registration (not collected by this form).")
          : (isTr
              ? `Ontario Workforce Priority stream (TEER 0-3 veya 4-5) için iş teklifi gereklidir. Eksik: ${res.missingRequirements.join(", ")}.`
              : isZh
                ? `安大略技术通道需要工作邀约。缺失条件：${res.missingRequirements.join(", ")}。`
                : `Ontario Workforce Priority stream (TEER 0-3 or 4-5) requires a job offer. Missing: ${res.missingRequirements.join(", ")}.`),
        relevance: "ineligible",
        confidenceLevel: "medium",
        confidenceExplanation: isTr
          ? "Ontario EOI alımı kapalı durumdadır ve iş teklifi eksiktir."
          : isZh
            ? "安大略意向表达通道已关闭且缺少有效工作邀约。"
            : "Ontario EOI intake is closed and job offer is missing.",
        difficulty: "high",
        requirementType: isTr ? "İş teklifi zorunluluğu" : "Job offer required",
        userRelativePosition: isTr
          ? "Ontario EOI sistemi şu anda kapalıdır ve iş teklifi gereklidir."
          : isZh
            ? "安大略省 EOI 系统当前处于关闭状态，且必须持有工作邀约。"
            : "Ontario EOI system is currently closed and a job offer is required.",
        keyRequirements: isPhysician
          ? ["OHIP billing eligibility", "CPSO registration"]
          : ["Ontario job offer", "CLB 6 or CLB 4 language threshold"],
        pathwaySpecificRisks: [
          isTr
            ? "OINP EOI alımı kapalı durumdadır."
            : isZh
              ? "OINP 意向表达申请通道目前已关闭。"
              : "OINP EOI intake is currently closed."
        ]
      };
    });
    pathwayComparison.unshift(...onComparisons);
  } else if (targetProvince === "BC") {
    const bcResults = buildBcPnpEligibility(input, isEeEligible);
    const bcComparisons: PathwayComparison[] = bcResults.map((res) => {
      const isEeBC = res.pathwayId === "BC_EEBC";
      const keyRequirements = isEeBC 
        ? (isTr 
            ? ["Express Entry profil uygunluğu", "BC iş teklifi", "CLB 7", "NOC TEER 0, 1, 2"] 
            : isZh 
              ? ["联邦EE通道资格", "BC工作邀约", "CLB 7", "NOC TEER 0, 1, 2"] 
              : ["Federal Express Entry eligibility", "BC job offer", "CLB 7", "NOC TEER 0, 1, 2"])
        : (isTr
            ? ["BC iş teklifi", "CLB 6", "NOC TEER 0, 1, 2, 3"]
            : isZh
              ? ["BC工作邀约", "CLB 6", "NOC TEER 0, 1, 2, 3"]
              : ["BC job offer", "CLB 6", "NOC TEER 0, 1, 2, 3"]);
      return {
        subclass: res.pathwayId,
        visaName: res.stream.streamName,
        reason: isTr
          ? `British Columbia PNP adaylığı için geçerli bir iş teklifi gereklidir (formda toplanmamıştır). Eksik: ${res.missingRequirements.join(", ")}.`
          : isZh
            ? `不列颠哥伦比亚省提名（BC PNP）需要有效的工作邀约（本表单未收集）。缺失条件：${res.missingRequirements.join(", ")}。`
            : `A qualifying job offer in British Columbia is required (not collected by this form). Missing requirements: ${res.missingRequirements.join(", ")}.`,
        relevance: "ineligible",
        confidenceLevel: "medium",
        confidenceExplanation: isTr
          ? "İş teklifi olmaması nedeniyle bu akış kapalıdır (blocked)."
          : isZh
            ? "由于缺乏有效工作邀约，此通道已被锁定。"
            : "Blocked due to lack of a qualifying job offer.",
        difficulty: "high",
        requirementType: isTr ? "İş teklifi zorunluluğu" : "Job offer required",
        userRelativePosition: isTr 
          ? "Geçerli bir iş teklifiniz olmadan ilerleme kaydedemezsiniz." 
          : isZh
            ? "在未获得有效工作邀约前，您无法推进此路径。"
            : "You cannot proceed without a valid job offer.",
        keyRequirements,
        pathwaySpecificRisks: [
          isTr 
            ? "BC PNP Skills Immigration veya EEBC akışları için iş teklifi kritik bir önkoşuldur." 
            : isZh
              ? "工作邀约是申请 BC PNP 技术移民或 EEBC 的关键前置条件。"
              : "A job offer is a critical prerequisite for BC PNP Skills Immigration or EEBC."
        ]
      };
    });
    pathwayComparison.unshift(...bcComparisons);
  } else if (targetProvince === "AB") {
    const abResults = buildAlbertaPnpEligibility(input, isEeEligible, pointsEstimate.estimatedPoints);
    const abComparisons: PathwayComparison[] = abResults.map((res) => {
      const isAEES = res.pathwayId === "AB_EXPRESS_ENTRY";
      if (isAEES) {
        return {
          subclass: res.pathwayId,
          visaName: res.stream.streamName,
          reason: res.eligible
            ? (isTr
                ? "Alberta Express Entry için asgari CRS 300 puanına ve federal EE uygunluğuna sahipsiniz."
                : isZh
                  ? "您满足阿尔伯塔 Express Entry（AEES）的最低 CRS 300 分及联邦 EE 资格要求。"
                  : "You meet the requirements for Alberta Express Entry (minimum CRS 300 and Federal EE eligibility).")
            : (isTr
                ? `Alberta Express Entry akışı uygun bulunmadı. Eksik: ${res.missingRequirements.join(", ")}.`
                : isZh
                  ? `未满足阿尔伯塔 Express Entry 通道资格。缺失条件：${res.missingRequirements.join(", ")}。`
                  : `Alberta Express Entry pathway is not eligible. Missing: ${res.missingRequirements.join(", ")}.`),
          relevance: res.eligible ? "possible" : "ineligible",
          confidenceLevel: "medium",
          confidenceExplanation: isTr
            ? "Express Entry CRS puanınız ve federal EE profil durumunuz doğrulanmıştır."
            : isZh
              ? "Express Entry CRS 预估得分和联邦 EE 资格已验证。"
              : "Express Entry CRS score and Federal EE profile status have been verified.",
          difficulty: res.eligible ? "medium" : "high",
          requirementType: isTr ? "Federal EE ve CRS Skoru" : "Federal EE & CRS Score",
          userRelativePosition: isTr
            ? "Alberta Express Entry çekilişleri önceden planlanmaz, puanınız havuzda değerlendirilir."
            : isZh
              ? "阿尔伯塔 Express Entry 抽签不定期进行，您的档案将在池中等待挑选。"
              : "Alberta Express Entry draws are unplanned and processed directly from the pool.",
          keyRequirements: isTr
            ? ["Federal Express Entry uygunluğu", "Asgari 300 CRS puanı"]
            : isZh
              ? ["联邦 Express Entry 资格", "最低 300 CRS 分数"]
              : ["Federal Express Entry eligibility", "Minimum 300 CRS score"],
          pathwaySpecificRisks: [
            isTr
              ? "AAIP çekilişleri düzensiz aralıklarla yapılır, kesin tarih veya garanti verilmez."
              : isZh
                ? "AAIP 抽签不定期进行，无法预测确切抽签日期且不保证获得邀请。"
                : "AAIP draws occur at irregular intervals with no fixed schedule or invitation guarantee."
          ]
        };
      } else {
        return {
          subclass: res.pathwayId,
          visaName: res.stream.streamName,
          reason: isTr
            ? `Alberta Opportunity, Rural veya Tourism akışları iş teklifi gerektirir. Eksik: ${res.missingRequirements.join(", ")}.`
            : isZh
              ? `阿尔伯塔 Opportunity、Rural 或 Tourism 通道要求工作邀约。缺失条件：${res.missingRequirements.join(", ")}。`
              : `Alberta Opportunity, Rural, or Tourism streams require a job offer. Missing: ${res.missingRequirements.join(", ")}.`,
          relevance: "ineligible",
          confidenceLevel: "medium",
          confidenceExplanation: isTr
            ? "İş teklifi olmaması nedeniyle bu akış kapalıdır (blocked)."
            : isZh
              ? "由于缺乏有效工作邀约，此通道已被锁定。"
              : "Blocked due to lack of a qualifying job offer.",
          difficulty: "high",
          requirementType: isTr ? "İş teklifi ve Alberta istihdamı" : "Job offer & Alberta employment",
          userRelativePosition: isTr
            ? "Geçerli bir iş teklifiniz olmadan ilerleme kaydedemezsiniz."
            : isZh
              ? "在未获得有效工作邀约前，您无法推进此路径。"
              : "You cannot proceed without a valid job offer.",
          keyRequirements: isTr
            ? ["Alberta işvereninden iş teklifi", "Geçerli çalışma izni / aktif çalışma (AOS için)"]
            : isZh
              ? ["阿省雇主工作邀约", "有效工签 / 在阿省全职工作（AOS 适用）"]
              : ["Job offer from an Alberta employer", "Valid work permit / active employment (for AOS)"],
          pathwaySpecificRisks: [
            isTr
              ? "Alberta iş teklifi ve yerel istihdam durumu kritik bir önkoşuldur."
              : isZh
                ? "阿尔伯塔省的工作邀约和本地工作状态是至关重要的前置条件。"
                : "Alberta job offer and local employment status are critical prerequisites."
          ]
        };
      }
    });
    pathwayComparison.unshift(...abComparisons);
  } else if (targetProvince === "QC") {
    const qcResults = buildQuebecPSTQEligibility(input);
    const qcComparisons: PathwayComparison[] = qcResults.map((res) => {
      const isCalqArt = isCalqArtsOccupation(input.nocCode);
      const isRegulated = res.streamId === "STREAM_3_REGULATED";
      return {
        subclass: res.streamId,
        visaName: res.stream.streamName,
        reason: res.eligible
          ? (isTr
              ? `Quebec PSTQ ${res.stream.streamName} akışı için uygun görünüyorsunuz. Fransızca seviyeniz ve TEER grubunuz kriterleri karşılamaktadır.`
              : isZh
                ? `根据您的法语水平和 TEER 分类，您符合魁北克 PSTQ ${res.stream.streamName} 的申请资格。`
                : `You are eligible for Quebec PSTQ ${res.stream.streamName} based on your TEER and French level.`)
          : (isTr
              ? `Quebec PSTQ ${res.stream.streamName} akışı uygun bulunmadı. Eksik: ${res.missingRequirements.join(", ")}.`
              : isZh
                ? `未满足魁北克 PSTQ ${res.stream.streamName} 通道资格。缺失条件：${res.missingRequirements.join(", ")}。`
                : `Quebec PSTQ ${res.stream.streamName} pathway is not eligible. Missing: ${res.missingRequirements.join(", ")}.`),
        relevance: res.eligible ? "possible" : "ineligible",
        confidenceLevel: "medium",
        confidenceExplanation: isTr
          ? "Quebec PSTQ değerlendirmesi Fransızca dil beyanı ve meslek TEER grubuna dayanmaktadır."
          : isZh
            ? "魁北克 PSTQ 评估基于法语能力声明和职业 TEER 分类。"
            : "Quebec PSTQ assessment is based on declared French ability and occupation TEER classification.",
        difficulty: "high",
        requirementType: isTr ? "Fransızca Dil Yeterliliği" : "French Language Proficiency",
        userRelativePosition: isTr
          ? "Quebec, federal Express Entry havuzundan bağımsızdır. CRS puanınız buradaki davetler için geçerli değildir."
          : isZh
            ? "魁北克省独立于联邦 Express Entry 池之外。您的 CRS 分数不适用于该省的邀请。"
            : "Quebec operates independently of the federal Express Entry pool. Your CRS score does not apply for invitations here.",
        keyRequirements: isRegulated
          ? ["French Oral level 7 & Written level 5", "Professional order recognition / denklik"]
          : [
              `French Oral level ${res.stream.frenchOralMin}`,
              ...(res.stream.frenchWrittenMin ? [`French Written level ${res.stream.frenchWrittenMin}`] : []),
              `TEER ${res.stream.teerRange.join(", ")}`
            ],
        pathwaySpecificRisks: [
          isTr
            ? "Quebec göçmenlik programları federal Express Entry ile eşzamanlı yürütülemez."
            : isZh
              ? "魁北克移民计划不能与联邦 Express Entry 同步进行。"
              : "Quebec immigration programs cannot be pursued concurrently with federal Express Entry.",
          ...(isCalqArt
            ? [
                isTr
                  ? "Sanat/Kültür meslekleri için CALQ alt-akışı şu anda yeni başvurulara kapatılmıştır."
                  : isZh
                    ? "艺术与文化类职业的 CALQ 子通道目前已关闭新申请。"
                    : "The CALQ sub-stream for arts/culture occupations is currently closed to new applications."
              ]
            : [])
        ]
      };
    });
    pathwayComparison.unshift(...qcComparisons);
  } else if (hasPnpInterest) {
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
  const stateNominationTracker = buildCanadaStateNominationTracker(input, locale);

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
    hasEnglish: hasRealEnglishEvidence(input),
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
    stateNominationTracker,
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

  if (isPartnerFamilySponsorship(input.preferredPathway)) {
    return buildPartnerReadinessReport(input, "AU");
  }

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

  if (detectedSubclasses.length === 0 && isPartnerPathwaySelected(input)) {
    pathwayComparison = [
      {
        subclass: "general",
        visaName:
          locale === "tr" ? "Partner Vizesi (820/801) — Kapsam Dışı" : "Partner Visa (820/801) — Out of Scope",
        reason:
          locale === "tr"
            ? "Bu araç şu anda Partner Vizesi (820/801) değerlendirmesi yapmıyor. Bu form sponsorun Avustralya vatandaşlığı/daimi oturum statüsü, ilişkinin niteliği ve süresi gibi ilişki-temelli kanıtları toplamıyor; bu nedenle güvenilir bir uygunluk değerlendirmesi sunulamaz. Partner vizesi uygunluğu için kayıtlı bir göçmenlik danışmanına (MARA) veya immi.homeaffairs.gov.au adresine başvurun."
            : "This tool does not currently assess the Partner Visa (820/801). This form does not collect relationship-based evidence — the sponsor's Australian citizenship/permanent residency status, or the nature and duration of the relationship — so a reliable eligibility assessment cannot be produced. For Partner visa eligibility, consult a registered migration agent (MARA) or immi.homeaffairs.gov.au.",
        relevance: "not_enough_information",
        confidenceLevel: "low",
        confidenceExplanation:
          locale === "tr"
            ? "Partner vizesi değerlendirmesi bu aracın kapsamı dışında olduğu için güven seviyesi uygulanamaz."
            : "Confidence does not apply — Partner visa assessment is out of scope for this tool.",
        difficulty: "medium",
        requirementType:
          locale === "tr"
            ? "İlişki ve sponsor kanıtı odaklı (bu araç tarafından toplanmıyor)"
            : "Relationship and sponsor evidence based (not collected by this tool)",
        userRelativePosition:
          locale === "tr"
            ? "Bu yol için göreli konum değerlendirilemez."
            : "Relative positioning does not apply to this pathway.",
        keyRequirements:
          locale === "tr"
            ? ["Sponsorun Avustralya vatandaşlığı/daimi oturum statüsü", "İlişkinin niteliği ve sürekliliğine ilişkin kanıt", "Kayıtlı bir göçmenlik danışmanına (MARA) danışın"]
            : ["Sponsor's Australian citizenship/permanent residency status", "Evidence of the relationship's nature and continuity", "Consult a registered migration agent (MARA)"],
        pathwaySpecificRisks:
          locale === "tr"
            ? ["Bu form Partner Vizesi (820/801) için gereken ilişki-temelli kanıtları toplamadığından, burada gösterilen diğer vize yolları (189/190/491 gibi) bu profil için geçerli veya ilgili değildir."]
            : ["Because this form does not collect the relationship-based evidence the Partner Visa (820/801) requires, any other visa pathways this tool might otherwise show (such as 189/190/491) are not valid or relevant to this profile."],
      },
    ];
  } else if (detectedSubclasses.length === 0) {
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
    locale,
    input.nominationStream,
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
    assessmentState,
    pointsEstimate?.estimatedPoints
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
  const generatedPremiumSections = generatePremiumSections({
    locale,
    occupation: input.occupation,
    selectedCity: input.preferredCity,
    familyStatus: input.sponsorOrFamily,
    timeline: input.timeline,
    mainGoal: input.mainGoal,
    biggestConcern: input.biggestConcern,
    estimatedPoints: pointsEstimate?.estimatedPoints,
    englishLevel: input.englishLevel,
    country: "AU",
    pathwayComparison,
    assessmentState,
    isPartnerPathway: isPartnerPathwaySelected(input),
  });
  const pointsBoosterSimulator = buildPointsBoosterSimulator(
    input,
    detectedSubclasses,
    pointsEstimate,
    locale,
    generatedPremiumSections.historicalInvitationTrends.estimates
  );
  const financialRoadmap = buildFinancialRoadmap(
    detectedSubclasses,
    input,
    locale
  );
  const progressionPathways = buildProgressionPathways(
    detectedSubclasses,
    locale,
    input.hasGraduateVisaPathwayIntent === true,
    isPartnerPathwaySelected(input),
    input,
    pointsEstimate
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
    hasEnglish: hasRealEnglishEvidence(input),
    hasSkilledPathway,
    hasPartnerPathway: (detectedSubclasses.includes("820") || detectedSubclasses.includes("801")),
    has482Pathway: detectedSubclasses.includes("482"),
    hasMissingInfo: missingInformation.length > 0,
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
    nominationStream: input.nominationStream,
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

function buildPartnerReadinessReport(input: ReadinessInput, country: "AU" | "CA"): ReadinessReport {
  const locale = input.locale;
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";

  const partnerData = parsePartnerIntakeFromText(input.sponsorOrFamily);
  const pAssessment = buildPartnerSponsorshipAssessment(partnerData, country, locale);

  const aestDatePart = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Brisbane",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const reportId = `LVA-${aestDatePart.replace(/-/g, "")}-PARTNER`;

  const executiveSummary = country === "AU"
    ? [
        isTr
          ? "Bu rapor, Avustralya Partner vizesi (Subclass 820/801) başvurunuz için ilişki kanıtı derinliğini ve sponsor uygunluğu sinyallerini değerlendirmektedir."
          : isZh
            ? "本报告评估您申请澳大利亚伴侣签证（Subclass 820/801）的关系证明深度和担保人资格信号。"
            : "This report assesses your relationship evidence depth and sponsor eligibility signals for the Australian Partner visa (Subclass 820/801) pathway.",
        isTr
          ? "Bu değerlendirme puan testi içeren vasıflı göçmenlik vizeleri (189/190/491) için geçerli değildir; partner vizeleri puan-bazlı değildir."
          : isZh
            ? "本评估不适用于打分制技术移民签证（189/190/491）；伴侣签证不基于积分系统。"
            : "This assessment does not apply to points-tested skilled migration visas (189/190/491); partner visas are not points-tested."
      ]
    : [
        isTr
          ? "Bu rapor, Kanada Eş Sponsorluğu (Spousal Sponsorship) başvurunuz için ilişki kanıtı derinliğini ve sponsor uygunluğu sinyallerini değerlendirmektedir."
          : isZh
            ? "本报告评估您申请加拿大配偶担保（Spousal Sponsorship）的关系证明深度和担保人资格信号。"
            : "This report assesses your relationship evidence depth and sponsor eligibility signals for the Canada Spousal Sponsorship pathway.",
        isTr
          ? "Bu değerlendirme puan testi içeren Express Entry (CRS) göçmenlik vizeleri için geçerli değildir; aile sponsorluğu vizeleri puan-bazlı değildir."
          : isZh
            ? "本评估不适用于快速通道 (Express Entry) CRS 打分制移民；家庭担保不基于积分系统。"
            : "This assessment does not apply to points-tested Express Entry (CRS) migration; family sponsorship is not points-tested."
      ];

  const primaryLimitingFactor = {
    label: isTr
      ? (pAssessment.relationshipSignalStrength === "Low" ? "Kısıtlı İlişki Kanıtı" : pAssessment.sponsorEligibilitySignal === "Conditional" ? "Sponsorluk Engel Riski" : "Kanıt Toplama")
      : isZh
        ? (pAssessment.relationshipSignalStrength === "Low" ? "关系证明不足" : pAssessment.sponsorEligibilitySignal === "Conditional" ? "担保人资格风险" : "材料收集")
        : (pAssessment.relationshipSignalStrength === "Low" ? "Limited Relationship Evidence" : pAssessment.sponsorEligibilitySignal === "Conditional" ? "Sponsorship Bar Risk" : "Evidence Collection"),
    explanation: pAssessment.sponsorEligibilitySignal === "Conditional"
      ? (isTr
          ? "Sponsorun son 5 yıl içindeki sponsorluk geçmişi, başvurunun askıya alınmasına veya reddedilmesine neden olabilecek bir kısıtlamayı tetikleyebilir."
          : isZh
            ? "担保人近 5 年内的担保历史可能会触发限制条件，导致申请被暂停或拒绝。"
            : "The sponsor's previous sponsorship within the last 5 years may trigger a bar or restriction, causing delays or refusal.")
      : (isTr
          ? "Partner vizesinde en kritik faktör ilişkinin gerçekliği ve sürekliliğidir. Eksik kanıtların toplanması öncelikli adımdır."
          : isZh
            ? "配偶签证最关键的因素是关系的真实性与持续性。收集缺失的证明材料是首要任务。"
            : "The most critical factor in a partner visa is relationship genuineness and continuity. Gathering missing evidence is the priority.")
  };

  const pathwayComparison: PathwayComparison[] = [
    {
      subclass: country === "AU" ? "820_801" : "FAMILY_SPONSORSHIP",
      visaName: country === "AU" ? "Partner visa (820/801)" : "Spousal Sponsorship",
      reason: isTr
        ? "Formda beyan edilen ilişki ve sponsor bilgileriyle eşleşen doğrudan sponsorluk yolu."
        : isZh
          ? "与表单中申报的关系和担保信息匹配的直接担保途径。"
          : "Direct sponsorship pathway matching the relationship and sponsor details declared in the form.",
      relevance: "possible",
      confidenceLevel: pAssessment.relationshipSignalStrength === "High" ? "high" : pAssessment.relationshipSignalStrength === "Medium" ? "medium" : "low",
      confidenceExplanation: isTr
        ? "Güven seviyesi, sunulan ilişki süresi ve kanıt türlerinin çeşitliliğine dayanmaktadır."
        : isZh
          ? "置信度级别基于提供的共同居住时间及证明材料的多样性。"
          : "The confidence level is based on the cohabitation duration and variety of evidence types provided.",
      difficulty: pAssessment.sponsorEligibilitySignal === "Conditional" ? "high" : "medium",
      requirementType: isTr ? "İlişki ve sponsor kanıtları" : "Relationship & sponsor evidence",
      userRelativePosition: isTr
        ? "Bu yol puan-bazlı değildir; kriterlerin eksiksiz karşılanması esastır."
        : isZh
          ? "此通道非打分制；完全符合标准是关键。"
          : "This pathway is criteria-based rather than points-tested; complete compliance with requirements is key.",
      keyRequirements: country === "AU"
        ? [
            isTr ? "Gerçek ve devam eden ilişki kanıtları" : "Evidence of a genuine and continuing relationship",
            isTr ? "Sponsorun Avustralya vatandaşı/PR olması" : "Sponsor is an Australian citizen or permanent resident",
            isTr ? "Sağlık ve karakter gereklilikleri" : "Health and character checks"
          ]
        : [
            isTr ? "İlişki ve asgari 12 ay birlikte yaşam kanıtı" : "Proof of relationship and min 12-month cohabitation",
            isTr ? "Sponsorun Kanada vatandaşı/PR olması" : "Sponsor is a Canadian citizen or permanent resident",
            isTr ? "Sponsorun finansal taahhüt belgesi" : "Financial undertaking by the sponsor"
          ],
      pathwaySpecificRisks: pAssessment.hardGateFlags
    }
  ];

  const financialRoadmap: FinancialRoadmapItem[] = country === "AU"
    ? [
        {
          category: isTr ? "Vize Başvuru Ücreti (VAC)" : "Visa Application Charge (VAC)",
          estimateType: "official_fee" as const,
          amountLabel: "AUD 11,710",
          explanation: isTr
            ? "Asıl başvuru sahibi için hükümet harcı (820 ve 801 aşamalarını kapsar), 1 Temmuz 2026 itibariyle güncel."
            : "Base government fee for main applicant (covering both subclass 820 and 801 stages), updated July 1, 2026."
        },
        {
          category: isTr ? "Diğer Maliyetler (Tahmini)" : "Other costs (est.)",
          estimateType: "third_party_estimate" as const,
          amountLabel: "AUD 300 - 800",
          explanation: isTr
            ? "Sağlık muayeneleri, polis kayıtları, tercüme ve noter onayları."
            : "Estimated expenses for health examinations, police checks, translations, and certifications."
        }
      ]
    : [
        {
          category: isTr ? "Eş Sponsorluğu Başvuru Ücretleri" : "Spousal Sponsorship government fees",
          estimateType: "official_fee" as const,
          amountLabel: "CAD 1,345",
          explanation: isTr
            ? "Sponsorluk ($90), İşlem ($570), Kalıcı Oturum Hakkı ($600) ve Biyometri ($85) ücretleri dahil, 30 Nisan 2026 itibariyle güncel."
            : "Includes Sponsorship ($90), Processing ($570), Right of Permanent Residence ($600), and Biometrics ($85), updated April 30, 2026."
        },
        {
          category: isTr ? "Diğer Maliyetler (Tahmini)" : "Other costs (est.)",
          amountLabel: "CAD 450 - 1,500",
          estimateType: "third_party_estimate" as const,
          explanation: isTr
            ? "Sağlık muayenesi, adli sicil belgeleri, belge çevirileri ve kargo masrafları."
            : "Estimated expenses for medical exams, police clearances, translation of documents, and postage."
        }
      ];

  const assessmentState: AssessmentState = {
    employmentDataProvided: false,
    employmentDataConfirmed: false,
    fieldsPresent: {
      age: true,
      englishLevel: false,
      occupation: false,
      skillsAssessment: false,
      workExperienceYears: false,
      partnerStatus: true,
      stateNomination: false,
      healthCharacterDocs: false,
    },
    missingFieldLabels: [],
    dataCompletenessLevel: "minimal" as const,
    hardGateFlags: pAssessment.hardGateFlags,
    occupationEligibility: "eligible" as const,
    occupationEligibilityReason: "",
    canShowNumericRanking: false,
  };

  const signalSnapshot = {
    strongest: country === "AU" ? "Partner Visa (subclass 820/801)" : "Spousal Sponsorship",
    secondary: [],
    confidenceLabel: pAssessment.relationshipSignalStrength === "High"
      ? ("stronger" as const)
      : pAssessment.relationshipSignalStrength === "Medium"
        ? ("moderate" as const)
        : ("limited" as const),
    confidenceExplanation: isTr
      ? "İlişki süresi ve mevcut kanıtların çeşitliliğine dayanmaktadır."
      : "Based on relationship duration and diversity of declared evidence.",
  };

  const dataCompleteness: DataCompleteness = {
    percentage: 100,
    missingFields: [],
  };

  const documentChecklist: DocumentCategory[] = [
    {
      category: isTr ? "Kimlik ve Pasaport Belgeleri" : "Identity and Passport Documents",
      items: [
        isTr ? "Geçerli pasaport (tüm işlem görmüş sayfaların kopyası)" : "Valid passport (copy of all used pages)",
        isTr ? "Adli sicil kaydı (son 10 yılda 6 aydan fazla yaşanmış tüm ülkeler için)" : "Police certificates for all countries resided in for 6+ months in the last 10 years"
      ]
    },
    {
      category: isTr ? "İlişki Kanıt Belgeleri" : "Relationship Evidence Documents",
      items: pAssessment.evidenceGaps.concat(
        partnerData.relationshipEvidence?.map(e => {
          if (e === "marriage_cert") return isTr ? "Evlilik Cüzdanı / Kaydı" : "Marriage Certificate";
          if (e === "joint_bank") return isTr ? "Ortak Banka Hesabı / Ortak Finansal Kanıtlar" : "Joint Bank Account / Shared Finances";
          if (e === "joint_lease") return isTr ? "Ortak Kira Sözleşmesi / Faturalar" : "Joint Lease / Utility Bills";
          if (e === "photos_social") return isTr ? "Birlikte Fotoğraflar / Sosyal Kanıtlar" : "Photos & Social Evidence";
          return isTr ? "Ortak Çocuk Bilgileri" : "Joint Children Details";
        }) ?? []
      )
    }
  ];

  return {
    country,
    executiveSummary,
    signalSnapshot,
    primaryLimitingFactor,
    positionChangers: [],
    pathwayComparison,
    pathwayStrengthComparison: [],
    evidenceReadiness: [],
    financialRoadmap,
    progressionPathways: [],
    pathwayFriction: [],
    confidenceExplanation: signalSnapshot.confidenceExplanation,
    assessmentState,
    reportIndicators: {
      dataCompletenessScore: 100,
      dataCompletenessLabel: isTr ? "Veri tamlığı" : "Data completeness",
      documentReadinessIndicator: pAssessment.relationshipSignalStrength === "High" ? "high" : pAssessment.relationshipSignalStrength === "Medium" ? "medium" : "low",
      informationCoverageLevel: "comprehensive",
      explanation: isTr
        ? "Partner vizesi değerlendirmesi yapılmıştır."
        : "A partner visa assessment was completed.",
    },
    primaryGap: primaryLimitingFactor.label,
    dataCompleteness,
    keyVisaRequirements: [],
    factorsAffectingPathways: [],
    riskIndicators: [],
    documentChecklist,
    premiumSections: {
      historicalInvitationTrends: {
        matchedOccupationGroup: "",
        anzscoCode: "",
        estimates: [],
        note: isTr
          ? "Partner vizeleri puan-bazlı olmadığı için davet taban puanları geçerli değildir."
          : "Historical invitation points do not apply because partner visas are not points-tested."
      },
      livingCostProjection: {
        city: country === "CA" ? (isTr ? "Toronto" : "Toronto") : (isTr ? "Sydney" : "Sydney"),
        familyProfile: isTr ? "Tek Kişi" : "Single Adult",
        currency: country === "CA" ? "CAD" : "AUD",
        monthly: { rent: 2800, groceries: 800, transport: 150, total: 3750 },
        note: ""
      },
      strategicGanttChart: {
        timelineBand: "6-12 months",
        steps: [
          {
            step: 1,
            title: isTr ? "Kanıt Toplama ve Hazırlık Aşaması" : "Evidence Collection & Preparation",
            window: "Weeks 1-8",
            description: isTr
              ? "İlişki kanıtlarının (ortak banka hesap dökümleri, faturalar, fotoğraflar, arkadaş ve aile beyanları) bir araya getirilmesi."
              : "Assembling comprehensive relationship proof (joint accounts, statements, declarations, and history narrative)."
          },
          {
            step: 2,
            title: isTr ? "Sponsorluk ve Vize Başvuru Dosyası" : "Sponsorship & Visa Application Submission",
            window: "Weeks 8-12",
            description: isTr
              ? "Hükümet harcının ödenerek sponsorluk onay talebinin ve vize dosyasının resmi olarak sisteme girilmesi."
              : "Lodge the sponsorship request and the main visa application files with the official government portal."
          },
          {
            step: 3,
            title: isTr ? "Sağlık ve Karakter Kontrolleri" : "Health, Biometrics & Character Clearances",
            window: "Weeks 12-24",
            description: isTr
              ? "Göçmenlik dairesinden gelen bildirimleri takiben biyometri verilmesi, sağlık kontrolü ve adli sicil belgelerinin sunulması."
              : "Attend biometrics appointment, undergo medical examinations, and submit police certificates upon request."
          }
        ]
      },
      scenarioBasedInsights: {
        pathwayStrengthComparison: [],
        evidenceReadiness: [],
        financialRoadmap: [],
        progressionPathways: [],
        pathwayFriction: [],
        frictionAnalysis: [],
        documentChecklist: [],
        suggestedNextSteps: []
      }
    },
    frictionAnalysis: [],
    suggestedNextSteps: pAssessment.recommendedNextSteps,
    missingInformation: [],
    disclaimer: country === "AU"
      ? "Regulatory disclaimer: Registered Migration Agents (MARA) provide official counsel in Australia. This report is for initial guidance only."
      : "Regulatory disclaimer: Licensed RCIC consultants provide official counsel in Canada. This report is for initial guidance only.",
    partnerSponsorshipAssessment: pAssessment,
  };
}
