import livingCostsData from "@/src/data/living-costs.json";
import visaTrendsData from "@/src/data/visa-trends.json";
import { localizeText, localizeTrendDescription, localizeWaitWindow } from "@/src/lib/readiness/localization";
import type { Locale } from "@/lib/readiness/types";

export type FamilyProfile = "Single" | "Couple" | "Family of 4";

export type InvitationTrendEstimate = {
  subclass: "189" | "190" | "491";
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
  currency: "AUD";
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

function buildGanttByTimeline(timeline?: string): GanttSection {
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

export function generatePremiumSections(input: {
  locale?: Locale;
  occupation?: string;
  selectedCity?: string;
  familyStatus?: string;
  timeline?: string;
  mainGoal?: string;
  biggestConcern?: string;
}): PremiumSections {
  const locale = input.locale ?? "en";
  const trend = matchTrendByOccupation(input.occupation);
  const city = inferCity({
    selectedCity: input.selectedCity,
    mainGoal: input.mainGoal,
    biggestConcern: input.biggestConcern,
  });
  const familyProfile = inferFamilyProfile(input.familyStatus);
  const cityCosts = LIVING_DATA.cities[city] ?? LIVING_DATA.cities[LIVING_DATA.fallback_city];
  const monthly = cityCosts[familyProfile] ?? cityCosts[LIVING_DATA.fallback_profile];
  const gantt = buildGanttByTimeline(input.timeline);
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
