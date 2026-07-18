import livingCostsData from "@/src/data/living-costs.json";
import visaTrendsData from "@/src/data/visa-trends.json";
import { localizeText, localizeTrendDescription, localizeWaitWindow, t3 } from "@/src/lib/readiness/localization";
import { resolveOccupationDisplayName } from "@/lib/readiness/occupation-eligibility";
import type { AssessmentState, Locale, PathwayComparison } from "@/lib/readiness/types";

/** GSM points-tested subclasses (AU) that trend/gantt EOI framing depends on. */
const AU_GSM_SUBCLASSES = ["189", "190", "491"];
/** CRS-based subclasses (CA) that trend/gantt ITA framing depends on. */
const CA_CRS_SUBCLASSES = ["CEC", "FSW", "FSTP"];

function findIneligiblePathway(
  pathwayComparison: PathwayComparison[],
  country: "AU" | "CA"
): PathwayComparison | undefined {
  const relevant = country === "CA" ? CA_CRS_SUBCLASSES : AU_GSM_SUBCLASSES;
  return pathwayComparison.find((p) => relevant.includes(p.subclass) && p.relevance === "ineligible");
}

function annotateTrendEstimates(
  estimates: InvitationTrendEstimate[],
  pathwayComparison: PathwayComparison[],
  assessmentState: AssessmentState,
  locale: Locale
): InvitationTrendEstimate[] {
  const uniformlyUnverified = !assessmentState.canShowNumericRanking;

  return estimates.map((estimate) => {
    const ineligiblePathway = pathwayComparison.find(
      (p) => p.subclass === estimate.subclass && p.relevance === "ineligible"
    );

    if (ineligiblePathway) {
      return {
        ...estimate,
        isReferenceOnly: true,
        referenceOnlyNote: t3(
          locale,
          `Reference data only - your profile does not currently meet Subclass ${estimate.subclass}'s threshold. See the Visa Viability Ranking section for the full reason.`,
          `Yalnızca referans verisi - profiliniz şu anda Subclass ${estimate.subclass} eşiğini karşılamıyor. Tam neden için Vize Uygulanabilirlik Sıralaması bölümüne bakın.`,
          `仅供参考数据 - 您的档案目前尚未达到 Subclass ${estimate.subclass} 的门槛。完整原因见"签证可行性排序"部分。`
        ),
      };
    }

    if (uniformlyUnverified) {
      return {
        ...estimate,
        isReferenceOnly: true,
        referenceOnlyNote: t3(
          locale,
          "Reference data only - pathway eligibility is not yet confirmed (missing profile details or occupation verification).",
          "Yalnızca referans verisi - yol uygunluğu henüz doğrulanmadı (profil ayrıntıları veya meslek doğrulaması eksik).",
          "仅供参考数据 - 路径资格尚未确认（缺少档案细节或职业核验）。"
        ),
      };
    }

    return estimate;
  });
}

/**
 * Short, single-sentence blocking reason, capped at
 * roughly one line of PDF card text. The Gantt chart card only renders the
 * FIRST wrapped line of a step's description (see drawGanttTimeline in
 * generate-pdf.ts) -- the long, fully-explanatory reason used elsewhere
 * would get silently truncated mid-sentence there, so this step's
 * description is REPLACED with this short form rather than prefixed with
 * the long one.
 */
function getEligibilityBlockReasonShort(
  locale: Locale,
  pathwayComparison: PathwayComparison[],
  assessmentState: AssessmentState,
  country: "AU" | "CA"
): string | undefined {
  const ineligiblePathway = findIneligiblePathway(pathwayComparison, country);
  if (ineligiblePathway) {
    return t3(
      locale,
      `BLOCKED - Subclass ${ineligiblePathway.subclass} points threshold not met.`,
      `ENGELLİ - Subclass ${ineligiblePathway.subclass} puan eşiği karşılanmadı.`,
      `已阻断 - 未达到 Subclass ${ineligiblePathway.subclass} 的分数门槛。`
    );
  }
  if (!assessmentState.canShowNumericRanking) {
    return t3(
      locale,
      "BLOCKED - eligibility not yet confirmed.",
      "ENGELLİ - uygunluk henüz doğrulanmadı.",
      "已阻断 - 资格尚未确认。"
    );
  }
  return undefined;
}

export type FamilyProfile = "Single" | "Couple" | "Family of 4";

export type InvitationTrendEstimate = {
  subclass: "189" | "190" | "491" | "CEC" | "FSW" | "FSTP" | "PNP";
  estimatedPoints: number;
  estimatedWait: string;
  /** True when this subclass is currently ineligible/unverified for the profile — the estimate is reference data only, not a personal trajectory. */
  isReferenceOnly?: boolean;
  /** Localized "Reference data only — ..." explanation, set when isReferenceOnly is true. */
  referenceOnlyNote?: string;
};

export type InvitationTrendSection = {
  matchedOccupationGroup: string;
  anzscoCode: string;
  estimates: InvitationTrendEstimate[];
  note: string;
};

export type LivingCostSection = {
  city: string;
  familyProfile: string;
  currency: "AUD" | "CAD";
  monthly: {
    rent: number;
    groceries: number;
    transport: number;
    total: number;
  };
  note: string;
};

export type GanttStep = {
  step: number;
  title: string;
  window: string;
  description: string;
  /** True when this step (typically EOI/lodgement) is currently blocked by an ineligible or unverified pathway. */
  isBlocked?: boolean;
};

export type GanttSection = {
  timelineBand: string;
  steps: GanttStep[];
};

export type PremiumSections = {
  historicalInvitationTrends: InvitationTrendSection;
  livingCostProjection: LivingCostSection;
  strategicGanttChart: GanttSection;
  scenarioBasedInsights?: unknown;
};

type TrendRecord = {
  occupation_group: string;
  occupation_group_zh?: string;
  anzsco_code: string;
  estimates: Array<{
    subclass: "189" | "190" | "491";
    last_invited_point?: number;
    estimated_points: number;
    estimated_wait: string;
  }>;
};

type LivingCostDataset = {
  currency: "AUD";
  methodology_note_zh?: string;
  city_labels_zh?: Record<string, string>;
  family_profile_labels_zh?: Record<FamilyProfile, string>;
  cities: Record<
    string,
    Record<
      FamilyProfile,
      {
        rent: number;
        groceries: number;
        transport: number;
        total: number;
      }
    >
  >;
  fallback_city: string;
  fallback_profile: FamilyProfile;
};

const TREND_DATA = visaTrendsData as {
  methodology_note?: string;
  methodology_note_zh?: string;
  occupation_trends: TrendRecord[];
};
const LIVING_DATA = livingCostsData as LivingCostDataset;

const SUPPORTED_CITIES = ["Sydney", "Melbourne", "Brisbane", "Adelaide", "Perth"];
const SUPPORTED_CA_CITIES = ["Toronto", "Vancouver", "Calgary", "Montreal", "Ottawa"];

const CA_LIVING_COSTS: Record<string, Record<FamilyProfile, { rent: number; groceries: number; transport: number; total: number }>> = {
  Toronto: {
    Single: { rent: 2200, groceries: 520, transport: 170, total: 2890 },
    Couple: { rent: 2800, groceries: 860, transport: 300, total: 3960 },
    "Family of 4": { rent: 3600, groceries: 1320, transport: 420, total: 5340 },
  },
  Vancouver: {
    Single: { rent: 2350, groceries: 540, transport: 180, total: 3070 },
    Couple: { rent: 3000, groceries: 900, transport: 310, total: 4210 },
    "Family of 4": { rent: 3900, groceries: 1380, transport: 430, total: 5710 },
  },
  Calgary: {
    Single: { rent: 1750, groceries: 500, transport: 150, total: 2400 },
    Couple: { rent: 2300, groceries: 820, transport: 260, total: 3380 },
    "Family of 4": { rent: 3000, groceries: 1260, transport: 380, total: 4640 },
  },
  Montreal: {
    Single: { rent: 1600, groceries: 470, transport: 125, total: 2195 },
    Couple: { rent: 2100, groceries: 780, transport: 230, total: 3110 },
    "Family of 4": { rent: 2800, groceries: 1180, transport: 340, total: 4320 },
  },
  Ottawa: {
    Single: { rent: 1800, groceries: 490, transport: 145, total: 2435 },
    Couple: { rent: 2350, groceries: 810, transport: 250, total: 3410 },
    "Family of 4": { rent: 3050, groceries: 1240, transport: 360, total: 4650 },
  },
};

function normalize(text?: string): string {
  return (text ?? "").trim().toLowerCase();
}

function inferFamilyProfile(raw?: string): FamilyProfile {
  const n = normalize(raw);
  if (!n) return "Single";

  if (
    n.includes("family") ||
    n.includes("child") ||
    n.includes("children") ||
    n.includes("kid") ||
    n.includes("aile") ||
    n.includes("cocuk")
  ) {
    return "Family of 4";
  }

  if (
    n.includes("partner") ||
    n.includes("spouse") ||
    n.includes("couple") ||
    n.includes("es")
  ) {
    return "Couple";
  }

  return "Single";
}

function inferCity(input: {
  selectedCity?: string;
  mainGoal?: string;
  biggestConcern?: string;
}): string {
  const direct = input.selectedCity?.trim();
  if (direct && SUPPORTED_CITIES.includes(direct)) return direct;

  const combined = `${input.mainGoal ?? ""} ${input.biggestConcern ?? ""}`.toLowerCase();
  const matched = SUPPORTED_CITIES.find((city) => combined.includes(city.toLowerCase()));
  return matched ?? LIVING_DATA.fallback_city;
}

function inferCanadaCity(input: {
  selectedCity?: string;
  mainGoal?: string;
  biggestConcern?: string;
}): string {
  const direct = input.selectedCity?.trim();
  if (direct && SUPPORTED_CA_CITIES.includes(direct)) return direct;

  const combined = `${input.mainGoal ?? ""} ${input.biggestConcern ?? ""}`.toLowerCase();
  const matched = SUPPORTED_CA_CITIES.find((city) => combined.includes(city.toLowerCase()));
  return matched ?? "Toronto";
}

function extractNocCode(occupation?: string): string {
  const match = (occupation ?? "").match(/\b\d{4,5}\b/);
  return match?.[0] ?? "NOC not specified";
}

function inferCanadaOccupationGroup(occupation?: string): string {
  const q = normalize(occupation);
  if (!q) return "Express Entry profile";
  if (q.includes("software") || q.includes("developer") || q.includes("engineer") || q.includes("it")) return "Technology occupations";
  if (q.includes("nurse") || q.includes("doctor") || q.includes("physician") || q.includes("medical")) return "Healthcare occupations";
  if (q.includes("electrician") || q.includes("welder") || q.includes("plumber") || q.includes("mechanic")) return "Skilled trades occupations";
  if (q.includes("teacher") || q.includes("professor")) return "Education occupations";
  return occupation ?? "Express Entry profile";
}

function inferCanadaTrendEstimates(input: {
  locale: Locale;
  estimatedPoints?: number;
  timeline?: string;
  occupation?: string;
}): InvitationTrendEstimate[] {
  const base = input.estimatedPoints ?? 470;
  const normalizedTimeline = normalize(input.timeline);
  const fasterWindow = normalizedTimeline.includes("0-6") || normalizedTimeline.includes("6 month");
  const occ = normalize(input.occupation);
  const tradeBoost = occ.includes("electrician") || occ.includes("welder") || occ.includes("plumber") || occ.includes("carpenter") ? 6 : 0;
  const healthcareBoost = occ.includes("nurse") || occ.includes("doctor") || occ.includes("physician") ? 4 : 0;

  return [
    {
      subclass: "CEC",
      estimatedPoints: Math.max(360, base - 5 + healthcareBoost),
      estimatedWait: localizeWaitWindow(input.locale, fasterWindow ? "1-3 months" : "3-6 months"),
    },
    {
      subclass: "FSW",
      estimatedPoints: Math.max(370, base + tradeBoost),
      estimatedWait: localizeWaitWindow(input.locale, fasterWindow ? "2-4 months" : "4-7 months"),
    },
    {
      subclass: "FSTP",
      estimatedPoints: Math.max(300, base - 35 + tradeBoost * 2),
      estimatedWait: localizeWaitWindow(input.locale, fasterWindow ? "2-5 months" : "4-8 months"),
    },
    {
      subclass: "PNP",
      estimatedPoints: Math.min(1200, base + 600),
      estimatedWait: localizeWaitWindow(input.locale, fasterWindow ? "1-4 months" : "3-8 months"),
    },
  ];
}

function inferCanadaActionTrack(locale: Locale, occupation?: string): { title: string; description: string } {
  const q = normalize(occupation);
  if (q.includes("doctor") || q.includes("physician") || q.includes("nurse") || q.includes("medical")) {
    return {
      title: localizeText(locale, "Credential and licensing alignment window"),
      description: localizeText(locale, "Prioritize ECA + healthcare credential checks, then align language and licensing milestones with Express Entry profile timing."),
    };
  }
  if (q.includes("electrician") || q.includes("welder") || q.includes("plumber") || q.includes("mechanic") || q.includes("trades")) {
    return {
      title: localizeText(locale, "Trade pathway documentation window"),
      description: localizeText(locale, "Prioritize employer letters, task logs, and trade qualification evidence to strengthen FSTP and PNP pathway signals."),
    };
  }
  return {
    title: localizeText(locale, "CRS optimization and evidence window"),
    description: localizeText(locale, "Prioritize language score optimization, ECA readiness, and work-evidence consistency before ITA-sensitive windows."),
  };
}

function matchTrendByOccupation(occupation?: string): TrendRecord | undefined {
  const query = normalize(occupation);
  if (!query) {
    return undefined;
  }

  const codeMatch = occupation?.match(/(\d{6})/)?.[1];
  if (codeMatch) {
    const byCode = TREND_DATA.occupation_trends.find((row) => row.anzsco_code === codeMatch);
    if (byCode) return byCode;
  }

  const exact = TREND_DATA.occupation_trends.find(
    (row) => normalize(row.occupation_group) === query || normalize(row.occupation_group_zh) === query
  );
  if (exact) return exact;

  const partial = TREND_DATA.occupation_trends.find((row) => {
    const source = normalize(row.occupation_group);
    const zh = normalize(row.occupation_group_zh);
    return source.includes(query) || query.includes(source) || (zh ? zh.includes(query) || query.includes(zh) : false);
  });
  if (partial) return partial;

  const keyword = TREND_DATA.occupation_trends.find((row) => {
    const source = normalize(row.occupation_group);
    return query.split(/\s+/).some((word) => word.length > 3 && source.includes(word));
  });

  return keyword;
}

function buildRawGanttSteps(
  timeline?: string,
  occupation?: string,
  country: "AU" | "CA" = "AU",
  hasGraduateVisaPathwayIntent = false
): GanttSection {
  const raw = normalize(timeline);

  if (raw.includes("0-6") || raw.includes("0 to 6") || raw.includes("6 month")) {
    return {
      timelineBand: "0-6 months",
      steps: [
        {
          step: 1,
          title: "English Test Signal Window",
          window: "Weeks 1-6",
          description: "This period typically captures exam booking, score-cycle timing, and English-result availability as model inputs.",
        },
        {
          step: 2,
          title: "Skills Assessment Evidence Window",
          window: "Weeks 4-10",
          description: "This period usually concentrates reference structure, duties mapping, and qualification documents into the assessment dataset.",
        },
        {
          step: 3,
          title: "EOI and State-Interest Window",
          window: "Weeks 8-16",
          description: "This period typically reflects when EOI variables and state-interest signals begin to interact in the comparison model.",
        },
        {
          step: 4,
          title: "Application Readiness Window",
          window: "Weeks 16-24",
          description: "This period usually captures health, police, and identity-document completeness as readiness variables.",
        },
      ],
    };
  }

  if (raw.includes("6-12") || raw.includes("6 to 12") || raw.includes("12 month")) {
    return {
      timelineBand: "6-12 months",
      steps: [
        {
          step: 1,
          title: "English Score Development Window",
          window: "Months 1-3",
          description: "This window often determines whether higher English-score bands enter the points model.",
        },
        {
          step: 2,
          title: "Skills Assessment and Experience Window",
          window: "Months 2-5",
          description: "This window typically consolidates assessment timing with work-history evidence depth and classification.",
        },
        {
          step: 3,
          title: "EOI and Nomination Window",
          window: "Months 4-8",
          description: "This window usually captures EOI signal changes, invitation-round movement, and nomination-linked variables.",
        },
        {
          step: 4,
          title: "Application Assembly Window",
          window: "Months 8-12",
          description: "This window generally reflects how quickly the profile can convert into a complete application-ready evidence set.",
        },
      ],
    };
  }

  if (country === "AU") {
    const steps = [
      {
        step: 1,
        title: "Profile Foundation & English",
        window: "Quarter 1",
        description: "Establish baseline points, finalize highest possible English language testing, and gather core identity documents.",
      },
      {
        step: 2,
        title: "Skills Validation",
        window: "Quarter 2",
          description:
            "Lodge formal skills assessment for {occupation} with the relevant Australian assessing authority, accounting for potential deducted years of experience.",
      },
      {
        step: 3,
        title: "EOI Strategy",
        window: "Quarter 3",
        description: "Submit Expression of Interest (EOI) targeting 190 and 491 state nomination pathways based on current quota allocations.",
      },
      {
        step: 4,
        title: "Visa Lodgement & Processing",
        window: "Quarter 4",
        description: "Finalize character/police clearances and medicals immediately upon receiving an Invitation to Apply (ITA).",
      },
    ];

    if (hasGraduateVisaPathwayIntent) {
      steps[0] = {
        ...steps[0],
        title: "Profile Foundation & 485 Bridge",
        description:
          "Bridge to PR (Subclass 485): Utilize your Temporary Graduate Visa timeline (Post-Higher Education or Post-Vocational stream) to accumulate crucial Australian work experience and bridge the gap toward state nomination requirements. Keep English testing and identity documents aligned with the 485-to-190/491 transition plan.",
      };
      steps[1] = {
        ...steps[1],
        title: "Skills Validation & 485 Work-Experience Window",
        description:
          "Use the 485 bridge to strengthen Australian work-history evidence while you lodge the formal skills assessment for {occupation}; this keeps your Q2 activity aligned with a 190/491 nomination pathway rather than treating 485 as a standalone end point.",
      };
    }

    return {
      timelineBand: "12+ months",
      steps,
    };
  }

  return {
    timelineBand: "12+ months",
    steps: [
      {
        step: 1,
        title: "Foundation Window: English and Documentation",
        window: "Quarter 1",
        description: "This quarter usually establishes the baseline profile and document-control variables used across later comparisons.",
      },
      {
        step: 2,
        title: "Skills Assessment and Career Evidence Window",
        window: "Quarter 2",
        description: "This quarter typically aligns qualification proof and role-scope evidence with assessment-authority criteria.",
      },
      {
        step: 3,
        title: "EOI and Invitation-Cycle Window",
        window: "Quarter 3",
        description: "This quarter usually captures invitation-cycle movement and state or federal demand signals as comparison inputs.",
      },
      {
        step: 4,
        title: "Application and Post-Application Window",
        window: "Quarter 4",
        description: "This quarter typically reflects submission completeness and response-readiness variables after application lodgement.",
      },
    ],
  };
}

/**
 * Steps 1-2 (profile foundation / skills validation) stay actionable
 * regardless of current eligibility -- they're literally how a gap gets
 * resolved. Steps 3-4 (EOI / lodgement) assume the underlying pathway is
 * already eligible, so when it isn't, they get marked blocked and their
 * description REPLACED (not prefixed) with a short blocking reason --
 * the PDF Gantt card only renders one line of description text, so a long
 * reason concatenated onto the original text would just get truncated
 * mid-sentence instead of ever reaching the actual blocking message.
 */
function applyEligibilityBlockToSteps(steps: GanttStep[], blockReasonShort: string): GanttStep[] {
  return steps.map((step, index) => {
    if (index < 2) return step;
    return {
      ...step,
      isBlocked: true,
      description: blockReasonShort,
    };
  });
}

/**
 * Premium remediation path (AU points shortfall): instead of leaving Steps 3-4
 * as a "BLOCKED - points threshold not met" dead end, populate them with the
 * concrete, points-bearing recovery actions that actually close the gap. The
 * English step is skipped when the user is already at Superior, in which case
 * Step 3 pivots to skilled-experience/partner points. Returns one entry per
 * blocked step (Steps 3 and 4).
 */
function buildAuPointsRemediationSteps(
  locale: Locale,
  englishLevel?: string,
  estimatedPoints?: number
): Array<{ title: string; description: string }> {
  const level = (englishLevel ?? "").trim().toLowerCase();
  const alreadySuperior = level === "superior";
  const gap = typeof estimatedPoints === "number" ? Math.max(0, 65 - estimatedPoints) : undefined;
  const gapText = typeof gap === "number" && gap > 0 ? ` (~${gap}-point gap)` : "";
  const gapTextTr = typeof gap === "number" && gap > 0 ? ` (~${gap} puanlık açık)` : "";
  const gapTextZh = typeof gap === "number" && gap > 0 ? `（约 ${gap} 分差距）` : "";

  const q3 = alreadySuperior
    ? {
        title: t3(locale, "Recovery: Skilled Experience Points", "Toparlanma: Nitelikli Deneyim Puanı", "补分：技术工作经验加分"),
        description: t3(
          locale,
          `Bank additional skilled-employment points and finalize your Skills Assessment${gapText}: each further year of assessed experience can add +5, and 8+ years reaches the +15 tier.`,
          `Ek nitelikli istihdam puanı biriktirin ve Beceri Değerlendirmenizi tamamlayın${gapTextTr}: değerlendirilen her ek yıl +5, 8+ yıl ise +15 kademesine ulaşır.`,
          `积累更多技术工作经验加分并完成技能评估${gapTextZh}：每增加一年被认可的经验可加 +5，满 8 年可达 +15 档。`
        ),
      }
    : {
        title: t3(locale, "Recovery: Book English Retest", "Toparlanma: İngilizce Sınavını Planla", "补分：预约英语重考"),
        description: t3(
          locale,
          `Book a PTE/IELTS sitting to lift your English to Superior for up to +20 points${gapText} — the single fastest lever to close the points gap.`,
          `İngilizceyi Superior seviyesine çıkarmak için bir PTE/IELTS sınavı planlayın (en fazla +20 puan)${gapTextTr} — puan açığını kapatmanın en hızlı yolu.`,
          `预约 PTE/IELTS 考试，将英语提升至 Superior，最多可加 +20 分${gapTextZh}——这是缩小分差最快的杠杆。`
        ),
      };

  const q4 = {
    title: t3(locale, "Recovery: Stack Secondary Boosters", "Toparlanma: İkincil Puan Kaynakları", "补分：叠加次要加分项"),
    description: t3(
      locale,
      "Stack further points: enrol in NAATI CCL for +5, and lodge a 491 regional EOI for +15 via state nomination, to move your score toward the 65-point pass mark.",
      "Ek puanları biriktirin: +5 için NAATI CCL'e kaydolun ve eyalet aday gösterimiyle +15 için 491 bölgesel EOI sunun; puanınızı 65 baraj puanına yaklaştırın.",
      "叠加更多加分：报名 NAATI CCL 加 +5，并通过州担保提交 491 偏远地区 EOI 加 +15，使分数向 65 分及格线靠拢。"
    ),
  };

  return [q3, q4];
}

/**
 * Replaces the blocked Steps 3-4 with actionable remediation entries (keeping
 * each step's original quarter window). Unlike applyEligibilityBlockToSteps,
 * these steps are NOT marked blocked — they are the recovery plan.
 */
function applyRemediationToSteps(
  steps: GanttStep[],
  remediation: Array<{ title: string; description: string }>
): GanttStep[] {
  return steps.map((step, index) => {
    if (index < 2) return step;
    const entry = remediation[index - 2];
    if (!entry) return step;
    return {
      ...step,
      isBlocked: false,
      title: entry.title,
      description: entry.description,
    };
  });
}

function buildGanttByTimeline(
  timeline?: string,
  occupation?: string,
  country: "AU" | "CA" = "AU",
  hasGraduateVisaPathwayIntent = false,
  blockReason?: string,
  remediationSteps?: Array<{ title: string; description: string }>
): GanttSection {
  const section = buildRawGanttSteps(timeline, occupation, country, hasGraduateVisaPathwayIntent);
  // Prefer an actionable remediation path over a bare "BLOCKED" dead end.
  if (remediationSteps && remediationSteps.length > 0) {
    return { ...section, steps: applyRemediationToSteps(section.steps, remediationSteps) };
  }
  if (!blockReason) return section;
  return { ...section, steps: applyEligibilityBlockToSteps(section.steps, blockReason) };
}

function getTrendOccupationGroup(locale: Locale, trend: TrendRecord): string {
  const resolved = trend.anzsco_code ? resolveOccupationDisplayName(trend.anzsco_code, locale) : undefined;
  if (resolved) return resolved;

  if (locale === "zh-Hans") {
    return trend.occupation_group_zh ?? localizeText(locale, trend.occupation_group);
  }
  return localizeText(locale, trend.occupation_group);
}

function getLivingCostMethodologyNote(locale: Locale): string | undefined {
  if (locale === "zh-Hans") return LIVING_DATA.methodology_note_zh;
  return undefined;
}

function getLocalizedCity(locale: Locale, city: string): string {
  if (locale === "zh-Hans") return LIVING_DATA.city_labels_zh?.[city] ?? city;
  return city;
}

function getLocalizedFamilyProfile(locale: Locale, familyProfile: FamilyProfile): string {
  if (locale === "zh-Hans") {
    return LIVING_DATA.family_profile_labels_zh?.[familyProfile] ?? localizeText(locale, familyProfile);
  }
  return familyProfile;
}

// Canada-specific terminology swap applied to the (otherwise generic) gantt
// text — the time-window structure itself is intentionally left untouched.
const CA_TERMINOLOGY_SWAP: Array<[RegExp, string]> = [
  [/state nomination/gi, "provincial nomination"],
  [/state-interest/gi, "provincial-interest"],
  [/Skills Assessment/g, "ECA (Educational Credential Assessment)"],
  [/skills-assessment/gi, "ECA"],
  // Express Entry uses ITA (Invitation to Apply), not EOI (an AU/SkillSelect term).
  [/\bEOI\b/g, "ITA"],
];

function applyCanadaTerminology(text: string): string {
  return CA_TERMINOLOGY_SWAP.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), text);
}

export function generatePremiumSections(input: {
  locale?: Locale;
  occupation?: string;
  selectedCity?: string;
  familyStatus?: string;
  timeline?: string;
  hasGraduateVisaPathwayIntent?: boolean;
  mainGoal?: string;
  biggestConcern?: string;
  estimatedPoints?: number;
  englishLevel?: string;
  country?: "AU" | "CA";
  /** Required so this section can never disagree with the main engine's eligibility verdict — see assessment-state.ts. */
  pathwayComparison: PathwayComparison[];
  assessmentState: AssessmentState;
}): PremiumSections {
  const locale = input.locale ?? "en";

  if (input.country === "CA") {
    const blockReason = getEligibilityBlockReasonShort(locale, input.pathwayComparison, input.assessmentState, "CA");
    const gantt = buildGanttByTimeline(input.timeline, input.occupation, "CA", false, blockReason);
    const canadaTrack = inferCanadaActionTrack(locale, input.occupation);
    const city = inferCanadaCity({
      selectedCity: input.selectedCity,
      mainGoal: input.mainGoal,
      biggestConcern: input.biggestConcern,
    });
    const familyProfile = inferFamilyProfile(input.familyStatus);
    const monthly = CA_LIVING_COSTS[city]?.[familyProfile] ?? CA_LIVING_COSTS.Toronto.Single;

    return {
      historicalInvitationTrends: {
        matchedOccupationGroup: localizeText(locale, inferCanadaOccupationGroup(input.occupation)),
        anzscoCode: extractNocCode(input.occupation),
        estimates: annotateTrendEstimates(
          inferCanadaTrendEstimates({
            locale,
            estimatedPoints: input.estimatedPoints,
            timeline: input.timeline,
            occupation: input.occupation,
          }),
          input.pathwayComparison,
          input.assessmentState,
          locale
        ),
        note: localizeText(
          locale,
          "Express Entry and PNP trend estimates are scenario-based planning references derived from profile signals and timeline assumptions; they are not invitation guarantees."
        ),
      },
      livingCostProjection: {
        city: localizeText(locale, city),
        familyProfile: localizeText(locale, familyProfile),
        currency: "CAD",
        monthly,
        note: localizeText(
          locale,
          "Canadian monthly cost projection reflects city-level baseline assumptions for rent, groceries, and transport and should be adjusted for neighborhood and lifestyle."
        ),
      },
      strategicGanttChart: {
        ...gantt,
        steps: gantt.steps.map((step, index) => {
          if (index === 1) {
            return {
              ...step,
              title: applyCanadaTerminology(canadaTrack.title),
              window: localizeWaitWindow(locale, step.window),
              description: applyCanadaTerminology(canadaTrack.description),
            };
          }
          return {
          ...step,
          title: applyCanadaTerminology(localizeText(locale, step.title)),
          window: localizeWaitWindow(locale, step.window),
          description: applyCanadaTerminology(localizeText(locale, step.description)),
          };
        }),
        timelineBand: localizeWaitWindow(locale, gantt.timelineBand),
      },
    };
  }

  const trend = matchTrendByOccupation(input.occupation);
  const city = inferCity({
    selectedCity: input.selectedCity,
    mainGoal: input.mainGoal,
    biggestConcern: input.biggestConcern,
  });
  const familyProfile = inferFamilyProfile(input.familyStatus);
  const cityCosts = LIVING_DATA.cities[city] ?? LIVING_DATA.cities[LIVING_DATA.fallback_city];
  const monthly = cityCosts[familyProfile] ?? cityCosts[LIVING_DATA.fallback_profile];
  const blockReason = getEligibilityBlockReasonShort(locale, input.pathwayComparison, input.assessmentState, "AU");
  // When the block is specifically an AU points shortfall (not an unverified
  // profile), replace the blocked Steps 3-4 with a concrete points-recovery
  // path rather than a "BLOCKED" dead end.
  const auPointsShortfall = findIneligiblePathway(input.pathwayComparison, "AU");
  const remediationSteps = auPointsShortfall
    ? buildAuPointsRemediationSteps(locale, input.englishLevel, input.estimatedPoints)
    : undefined;
  const gantt = buildGanttByTimeline(
    input.timeline,
    input.occupation,
    "AU",
    input.hasGraduateVisaPathwayIntent === true,
    blockReason,
    remediationSteps
  );
  const methodologyNote = localizeTrendDescription(
    locale,
    locale === "zh-Hans" ? TREND_DATA.methodology_note_zh ?? TREND_DATA.methodology_note : TREND_DATA.methodology_note
  );
  const livingCostMethodologyNote = getLivingCostMethodologyNote(locale);
  const occupationLabel =
    resolveOccupationDisplayName(input.occupation, locale) || localizeText(locale, "your nominated occupation");

  const unavailableTrendMessage = localizeText(
    locale,
    "Historical trend data unavailable - occupation not yet verified against our database."
  );

  const historicalInvitationTrends = trend
    ? {
        matchedOccupationGroup: getTrendOccupationGroup(locale, trend),
        anzscoCode: trend.anzsco_code,
        estimates: annotateTrendEstimates(
          trend.estimates.map((e) => ({
            subclass: e.subclass,
            estimatedPoints: e.last_invited_point ?? e.estimated_points,
            estimatedWait: localizeWaitWindow(locale, e.estimated_wait),
          })),
          input.pathwayComparison,
          input.assessmentState,
          locale
        ),
        note: [
          localizeText(
            locale,
            "Trend estimates are analytical planning references only and do not guarantee invitation outcomes."
          ),
          methodologyNote,
        ].filter(Boolean).join(" "),
      }
    : {
        matchedOccupationGroup: unavailableTrendMessage,
        anzscoCode: "",
        estimates: [],
        note: unavailableTrendMessage,
      };

  return {
    historicalInvitationTrends,
    livingCostProjection: {
      city: getLocalizedCity(locale, city),
      familyProfile: getLocalizedFamilyProfile(locale, familyProfile),
      currency: LIVING_DATA.currency,
      monthly,
      note: [
        localizeText(
          locale,
          "Living cost projections are indicative monthly planning estimates and may vary by suburb and lifestyle."
        ),
        livingCostMethodologyNote,
      ].filter(Boolean).join(" "),
    },
    strategicGanttChart: {
      ...gantt,
      steps: gantt.steps.map((step) => ({
        ...step,
        title: localizeText(locale, step.title),
        window: localizeWaitWindow(locale, step.window),
        description: localizeText(locale, step.description).replaceAll("{occupation}", occupationLabel),
      })),
      timelineBand: localizeWaitWindow(locale, gantt.timelineBand),
    },
  };
}
