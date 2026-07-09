import livingCostsData from "@/src/data/living-costs.json";
import visaTrendsData from "@/src/data/visa-trends.json";
import { localizeText, localizeTrendDescription, localizeWaitWindow } from "@/src/lib/readiness/localization";
import type { Locale } from "@/lib/readiness/types";

export type FamilyProfile = "Single" | "Couple" | "Family of 4";

export type InvitationTrendEstimate = {
  subclass: "189" | "190" | "491" | "CEC" | "FSW" | "FSTP" | "PNP";
  estimatedPoints: number;
  estimatedWait: string;
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

function matchTrendByOccupation(occupation?: string): TrendRecord {
  const query = normalize(occupation);
  if (!query) {
    return TREND_DATA.occupation_trends[0];
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

  return keyword ?? TREND_DATA.occupation_trends[0];
}

function buildGanttByTimeline(
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
    const occupationLabel = occupation?.trim() || "your nominated occupation";
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
        description: `Lodge formal skills assessment for ${occupationLabel} with the relevant Australian assessing authority, accounting for potential deducted years of experience.`,
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
          `Use the 485 bridge to strengthen Australian work-history evidence while you lodge the formal skills assessment for ${occupationLabel}; this keeps your Q2 activity aligned with a 190/491 nomination pathway rather than treating 485 as a standalone end point.`,
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

function getTrendOccupationGroup(locale: Locale, trend: TrendRecord): string {
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
  country?: "AU" | "CA";
}): PremiumSections {
  const locale = input.locale ?? "en";

  if (input.country === "CA") {
    const gantt = buildGanttByTimeline(input.timeline, input.occupation, "CA", false);
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
        estimates: inferCanadaTrendEstimates({
          locale,
          estimatedPoints: input.estimatedPoints,
          timeline: input.timeline,
          occupation: input.occupation,
        }),
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
  const gantt = buildGanttByTimeline(
    input.timeline,
    input.occupation,
    "AU",
    input.hasGraduateVisaPathwayIntent === true
  );
  const methodologyNote = localizeTrendDescription(
    locale,
    locale === "zh-Hans" ? TREND_DATA.methodology_note_zh ?? TREND_DATA.methodology_note : TREND_DATA.methodology_note
  );
  const livingCostMethodologyNote = getLivingCostMethodologyNote(locale);

  return {
    historicalInvitationTrends: {
      matchedOccupationGroup: getTrendOccupationGroup(locale, trend),
      anzscoCode: trend.anzsco_code,
      estimates: trend.estimates.map((e) => ({
        subclass: e.subclass,
        estimatedPoints: e.last_invited_point ?? e.estimated_points,
        estimatedWait: localizeWaitWindow(locale, e.estimated_wait),
      })),
      note: [
        localizeText(
          locale,
          "Trend estimates are analytical planning references only and do not guarantee invitation outcomes."
        ),
        methodologyNote,
      ].filter(Boolean).join(" "),
    },
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
        description: localizeText(locale, step.description),
      })),
      timelineBand: localizeWaitWindow(locale, gantt.timelineBand),
    },
  };
}
