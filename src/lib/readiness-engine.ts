import occupationsData from "@/src/data/occupations.json";
import visaTrendsData from "@/src/data/visa-trends.json";
import { runReadinessEngine as runBaseReadinessEngine } from "@/lib/readiness/engine";
import { calculateVisaPoints, type AgeRange, type EnglishLevel } from "@/lib/readiness/visa-points-calculator";
import type {
  FrictionAnalysisItem,
  FrictionScore,
  ReadinessInput,
  ReadinessReport,
} from "@/lib/readiness/types";

type TrendRecord = {
  occupation_group: string;
  anzsco_code: string;
  estimates: Array<{
    subclass: "189" | "190" | "491";
    estimated_points: number;
    estimated_wait: string;
  }>;
};

type OccupationRecord = {
  anzsco_code: string;
  occupation_name: string;
  authority: string;
};

const TREND_ROWS = (visaTrendsData as { occupation_trends: TrendRecord[] }).occupation_trends;
const OCCUPATION_ROWS = (occupationsData as { occupations: OccupationRecord[] }).occupations;

function normalize(value?: string): string {
  return (value ?? "").trim().toLowerCase();
}

function parseAnzscoCode(occupation?: string): string | undefined {
  if (!occupation) return undefined;
  const codeMatch = occupation.match(/(\d{6})/);
  return codeMatch?.[1];
}

function findOccupationRecord(input: ReadinessInput): OccupationRecord | undefined {
  const code = parseAnzscoCode(input.occupation);
  if (code) {
    const byCode = OCCUPATION_ROWS.find((row) => row.anzsco_code === code);
    if (byCode) return byCode;
  }

  const q = normalize(input.occupation);
  if (!q) return undefined;

  const exact = OCCUPATION_ROWS.find((row) => normalize(row.occupation_name) === q);
  if (exact) return exact;

  return OCCUPATION_ROWS.find((row) => normalize(row.occupation_name).includes(q));
}

function findTrendRecord(input: ReadinessInput, occupation?: OccupationRecord): TrendRecord | undefined {
  const code = occupation?.anzsco_code ?? parseAnzscoCode(input.occupation);
  if (code) {
    const byCode = TREND_ROWS.find((row) => row.anzsco_code === code);
    if (byCode) return byCode;
  }

  const q = normalize(input.occupation);
  if (!q) return undefined;

  const exact = TREND_ROWS.find((row) => normalize(row.occupation_group) === q);
  if (exact) return exact;

  return TREND_ROWS.find((row) => normalize(row.occupation_group).includes(q));
}

function parseAgeRange(age?: string): AgeRange | undefined {
  const n = Number((age ?? "").trim());
  if (!Number.isFinite(n)) return undefined;
  if (n >= 18 && n <= 24) return "18_24";
  if (n >= 25 && n <= 32) return "25_32";
  if (n >= 33 && n <= 39) return "33_39";
  if (n >= 40 && n <= 44) return "40_44";
  return "45_plus";
}

function parseEnglishLevel(value?: string): EnglishLevel | undefined {
  const n = normalize(value);
  if (!n) return undefined;
  if (n.includes("superior") || n.includes("pte 79") || n.includes("79+")) return "Superior";
  if (n.includes("proficient") || n.includes("pte 65") || n.includes("65+")) return "Proficient";
  if (n.includes("competent")) return "Competent";
  return undefined;
}

function computeBestKnownScore(input: ReadinessInput, base: ReadinessReport, occupationCode?: string): number {
  const ageRange = parseAgeRange(input.age);
  const englishLevel = parseEnglishLevel(input.englishLevel);

  if (!ageRange || !englishLevel) {
    return base.pointsEstimate?.estimatedPoints ?? 0;
  }

  const points = calculateVisaPoints({
    ageRange,
    englishLevel,
    qualificationLevel: input.qualificationLevel ?? "Bachelor",
    offshoreExperienceYears: input.offshoreExperienceYears ?? 0,
    onshoreExperienceYears: input.onshoreExperienceYears ?? 0,
    anzscoCode: occupationCode,
    occupationName: input.occupation,
    hasNAATI: false,
    hasProfessionalYear: false,
    hasRegionalStudy: false,
    partnerSkilled: false,
  });

  return points.scores.subclass190;
}

function escalate(current: FrictionScore, next: FrictionScore): FrictionScore {
  const rank: Record<FrictionScore, number> = {
    Low: 1,
    Medium: 2,
    High: 3,
    Extreme: 4,
  };
  return rank[next] > rank[current] ? next : current;
}

function buildFrictionItem(input: ReadinessInput, base: ReadinessReport, subclass: string): FrictionAnalysisItem {
  const occupation = findOccupationRecord(input);
  const trend = findTrendRecord(input, occupation);
  const score = computeBestKnownScore(input, base, occupation?.anzsco_code);

  let frictionScore: FrictionScore = "Medium";
  const reality: string[] = [];
  const successSignals: string[] = [];

  const subclassKey = subclass === "820_801" ? "820/801" : subclass;

  const estimate = trend?.estimates.find((e) => e.subclass === subclassKey) ?? undefined;
  if (["189", "190", "491"].includes(subclassKey)) {
    if (estimate && score <= estimate.estimated_points - 10) {
      frictionScore = escalate(frictionScore, "High");
      reality.push(`Current score is at least 10 points below recent ${subclassKey} invitation trend for this occupation.`);
    }

    if (["221111", "261313"].includes(occupation?.anzsco_code ?? "") && score < 90) {
      frictionScore = "Extreme";
      reality.push("High-competition occupation segment with elevated invitation score pressure.");
    }

    if (subclassKey === "491" && input.regionalWilling === true) {
      frictionScore = frictionScore === "Extreme" ? "High" : "Low";
      reality.push("Regional willingness improves pathway viability for 491 nomination streams.");
    }
  }

  if (occupation?.authority === "ACS" && (input.offshoreExperienceYears ?? 0) < 2) {
    frictionScore = "Extreme";
    reality.push("ACS authority with sub-2-year experience has high deduction and skills assessment risk.");
  }

  if (
    (occupation?.authority ?? "").toLowerCase().includes("vetassess group a") &&
    input.educationRelevance === "non_relevant"
  ) {
    frictionScore = "Extreme";
    reality.push("VETASSESS Group A with non-relevant qualification profile triggers high assessment refusal risk.");
  }

  if (subclassKey === "500") {
    frictionScore = frictionScore === "Extreme" ? "Extreme" : "Low";
    reality.push("Student pathway is generally lower friction but sensitive to GTE/GS evidence quality.");
  }

  if (subclassKey === "820/801") {
    frictionScore = escalate(frictionScore, "High");
    reality.push("Relationship evidence burden is document-heavy and consistency-sensitive.");
  }

  if (subclassKey === "482") {
    frictionScore = escalate(frictionScore, "High");
    reality.push("Employer sponsorship dependency is a major practical bottleneck.");
  }

  const english = parseEnglishLevel(input.englishLevel);
  if (english === "Superior") {
    successSignals.push("Superior English is a strong competitiveness signal.");
  }
  if ((input.offshoreExperienceYears ?? 0) >= 5) {
    successSignals.push("Sustained offshore experience strengthens profile depth.");
  }
  if (subclassKey === "491" && input.regionalWilling) {
    successSignals.push("Regional intent aligns with nomination incentives.");
  }
  if (["190", "491"].includes(subclassKey)) {
    successSignals.push("Nomination pathways provide additional score leverage compared with pure independent routes.");
  }

  return {
    pathway: subclassKey,
    frictionScore,
    realityCheck: reality.join(" ") || "No major friction trigger detected from available profile data.",
    successSignals: successSignals.length ? successSignals : ["Profile can improve with stronger evidence completeness and timing discipline."],
  };
}

function buildFrictionAnalysis(input: ReadinessInput, base: ReadinessReport): FrictionAnalysisItem[] {
  const subclasses = base.pathwayComparison.map((item) => item.subclass);
  const unique = Array.from(new Set(subclasses));
  return unique.map((subclass) => buildFrictionItem(input, base, subclass));
}

export function runReadinessEngine(input: ReadinessInput): ReadinessReport {
  const base = runBaseReadinessEngine(input);
  return {
    ...base,
    frictionAnalysis: buildFrictionAnalysis(input, base),
  };
}

export { buildLeadQuality } from "@/lib/readiness/engine";
