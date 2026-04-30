import livingCostsData from "@/src/data/living-costs.json";
import visaTrendsData from "@/src/data/visa-trends.json";

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
  familyProfile: FamilyProfile;
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

const TREND_DATA = visaTrendsData as { occupation_trends: TrendRecord[] };
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
    (row) => normalize(row.occupation_group) === query
  );
  if (exact) return exact;

  const partial = TREND_DATA.occupation_trends.find((row) =>
    normalize(row.occupation_group).includes(query) || query.includes(normalize(row.occupation_group))
  );
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
          title: "English Test Preparation + Exam",
          window: "Weeks 1-6",
          description: "Complete exam booking, target score cycle, and score release planning.",
        },
        {
          step: 2,
          title: "Skills Assessment Evidence Pack",
          window: "Weeks 4-10",
          description: "Finalize authority-ready references, duties mapping, and qualification documents.",
        },
        {
          step: 3,
          title: "EOI Submission + State Interest",
          window: "Weeks 8-16",
          description: "Lodge EOI profile and state pathways aligned to score strategy.",
        },
        {
          step: 4,
          title: "Visa Lodgement Readiness",
          window: "Weeks 16-24",
          description: "Prepare health, police, and identity pack for rapid post-invitation lodgement.",
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
          title: "English Uplift Strategy",
          window: "Months 1-3",
          description: "Schedule multiple attempts if needed to reach competitive score bands.",
        },
        {
          step: 2,
          title: "Skills Assessment + Experience Positioning",
          window: "Months 2-5",
          description: "Sequence assessment submission with experience evidence optimization.",
        },
        {
          step: 3,
          title: "EOI Optimization + Nomination Track",
          window: "Months 4-8",
          description: "Refine points profile, monitor invitation rounds, and activate nomination options.",
        },
        {
          step: 4,
          title: "Visa Application Assembly",
          window: "Months 8-12",
          description: "Complete final compliance pack for efficient invitation-to-lodgement turnaround.",
        },
      ],
    };
  }

  return {
    timelineBand: "12+ months",
    steps: [
      {
        step: 1,
        title: "Foundation Phase: English + Documentation",
        window: "Quarter 1",
        description: "Build base profile and document controls for a durable migration pipeline.",
      },
      {
        step: 2,
        title: "Skills Assessment + Career Evidence",
        window: "Quarter 2",
        description: "Synchronize qualification proof and role scope evidence with authority rules.",
      },
      {
        step: 3,
        title: "EOI + Invitation Cycle Monitoring",
        window: "Quarter 3",
        description: "Track invitation movement and tune strategy to state and federal demand signals.",
      },
      {
        step: 4,
        title: "Lodgement and Post-Lodgement Controls",
        window: "Quarter 4",
        description: "Execute submission and maintain readiness for any follow-up requests.",
      },
    ],
  };
}

export function generatePremiumSections(input: {
  occupation?: string;
  selectedCity?: string;
  familyStatus?: string;
  timeline?: string;
  mainGoal?: string;
  biggestConcern?: string;
}): PremiumSections {
  const trend = matchTrendByOccupation(input.occupation);
  const city = inferCity({
    selectedCity: input.selectedCity,
    mainGoal: input.mainGoal,
    biggestConcern: input.biggestConcern,
  });
  const familyProfile = inferFamilyProfile(input.familyStatus);
  const cityCosts = LIVING_DATA.cities[city] ?? LIVING_DATA.cities[LIVING_DATA.fallback_city];
  const monthly = cityCosts[familyProfile] ?? cityCosts[LIVING_DATA.fallback_profile];

  return {
    historicalInvitationTrends: {
      matchedOccupationGroup: trend.occupation_group,
      anzscoCode: trend.anzsco_code,
      estimates: trend.estimates.map((e) => ({
        subclass: e.subclass,
        estimatedPoints: e.last_invited_point ?? e.estimated_points,
        estimatedWait: e.estimated_wait,
      })),
      note: "Trend estimates are analytical planning references only and do not guarantee invitation outcomes.",
    },
    livingCostProjection: {
      city,
      familyProfile,
      currency: LIVING_DATA.currency,
      monthly,
      note: "Living cost projections are indicative monthly planning estimates and may vary by suburb and lifestyle.",
    },
    strategicGanttChart: buildGanttByTimeline(input.timeline),
  };
}
