import occupationsData from "@/src/data/occupations.json";
import documentRequirementsData from "@/src/data/document-requirements.json";
import visaTrendsData from "@/src/data/visa-trends.json";
import { runReadinessEngine as runBaseReadinessEngine } from "@/lib/readiness/engine";
import { calculateVisaPoints, type AgeRange, type EnglishLevel } from "@/lib/readiness/visa-points-calculator";
import type {
  DocumentCategory,
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
    last_invited_point?: number;
    estimated_points: number;
    estimated_wait: string;
  }>;
};

type OccupationRecord = {
  anzsco_code: string;
  occupation_name: string;
  authority: string;
};

type RequirementCategory = {
  category: string;
  items: string[];
  appliesTo: string[];
  requiresMarried?: boolean;
};

type RequirementsDataset = {
  baseCategories: RequirementCategory[];
  criticalWarnings: {
    occupationUnconfirmed: string;
  };
};

const TREND_ROWS = (visaTrendsData as { occupation_trends: TrendRecord[] }).occupation_trends;
const OCCUPATION_ROWS = (occupationsData as { occupations: OccupationRecord[] }).occupations;
const REQUIREMENTS = documentRequirementsData as RequirementsDataset;

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

function computeUserPointsBySubclass(input: ReadinessInput, base: ReadinessReport, occupationCode?: string): {
  subclass189: number;
  subclass190: number;
  subclass491: number;
} {
  const ageRange = parseAgeRange(input.age);
  const englishLevel = parseEnglishLevel(input.englishLevel);

  if (!ageRange || !englishLevel) {
    const fallback = base.pointsEstimate?.estimatedPoints ?? 0;
    return {
      subclass189: fallback,
      subclass190: fallback,
      subclass491: fallback,
    };
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

  return points.scores;
}

function escalate(current: FrictionScore, next: FrictionScore): FrictionScore {
  const rank: Record<FrictionScore, number> = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    EXTREME: 4,
  };
  return rank[next] > rank[current] ? next : current;
}

function getTrendPoint(estimate?: { last_invited_point?: number; estimated_points: number }): number | undefined {
  if (!estimate) return undefined;
  return estimate.last_invited_point ?? estimate.estimated_points;
}

function toPathwayKey(subclass: string): string {
  return subclass === "820_801" ? "820/801" : subclass;
}

function isMarriedContext(raw?: string): boolean {
  const n = normalize(raw);
  if (!n) return false;
  return ["married", "spouse", "wife", "husband", "eş", "evli", "partner"].some((k) => n.includes(k));
}

function normalizeItems(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = normalize(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function buildPremiumDocumentChecklist(input: ReadinessInput, base: ReadinessReport): DocumentCategory[] {
  const pathwaySet = new Set(base.pathwayComparison.map((p) => toPathwayKey(p.subclass)));
  const married = isMarriedContext(input.sponsorOrFamily);

  const categories: DocumentCategory[] = REQUIREMENTS.baseCategories
    .filter((cat) => cat.appliesTo.some((p) => pathwaySet.has(p)))
    .filter((cat) => (cat.requiresMarried ? married : true))
    .map((cat) => {
      const items = [...cat.items];
      if (married && cat.category === "Spouse/Family") {
        if (!items.some((i) => normalize(i).includes("spouse english"))) {
          items.push("Spouse English evidence");
        }
        if (!items.some((i) => normalize(i).includes("marriage certificate"))) {
          items.push("Marriage Certificate");
        }
      }
      return {
        category: cat.category,
        items: normalizeItems(items),
      };
    });

  const occupationConfirmed = normalize(input.occupationConfirmed) === "yes";
  if (!occupationConfirmed) {
    categories.unshift({
      category: "CRITICAL",
      items: [REQUIREMENTS.criticalWarnings.occupationUnconfirmed],
    });
  }

  return categories;
}

function buildImmediateActionPlan(input: ReadinessInput, base: ReadinessReport, occupationCode?: string): string[] {
  const ageRange = parseAgeRange(input.age);
  const englishLevel = parseEnglishLevel(input.englishLevel);

  const points = ageRange && englishLevel
    ? calculateVisaPoints({
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
      })
    : undefined;

  const score190 = points?.scores.subclass190 ?? 0;
  const expYears = (input.offshoreExperienceYears ?? 0) + (input.onshoreExperienceYears ?? 0);
  const occupationConfirmed = normalize(input.occupationConfirmed) === "yes";
  const lowPointsGap = score190 > 0 && score190 < 85;
  const lowExperienceGap = expYears < 3;

  if (lowPointsGap) {
    return [
      "Focus on PTE/IELTS to reach Superior level (79+) as your primary priority.",
      "Model a +5 to +15 point pathway immediately (NAATI CCL, state nomination, regional nomination) and set a target subclass sequence.",
      "Rebuild EOI positioning only after score uplift so invitation competitiveness improves materially.",
    ];
  }

  if (lowExperienceGap) {
    return [
      "Target Professional Year (PY) or NAATI CCL to compensate for missing experience points.",
      "Strengthen employment evidence quality (detailed references, duties mapping, exact dates) to maximize claimable points.",
      "Run a timeline strategy that prioritizes nomination pathways while experience depth is still building.",
    ];
  }

  if (!occupationConfirmed) {
    return [
      "Finalize your occupation strategy first and align ANZSCO mapping with your real employment history.",
      "Prioritize Skills Assessment evidence pack quality before any invitation-stage assumptions.",
      "Sequence English, assessment, and EOI milestones into one controlled evidence timeline.",
    ];
  }

  return [
    "Maintain score competitiveness through periodic invitation-trend checks and pathway reprioritization.",
    "Audit every core document category now to reduce post-invitation lodgement pressure.",
    "Prepare a submission-ready evidence bundle so you can act quickly when opportunity windows open.",
  ];
}

function buildFrictionItem(input: ReadinessInput, base: ReadinessReport, subclass: string): FrictionAnalysisItem {
  const occupation = findOccupationRecord(input);
  const trend = findTrendRecord(input, occupation);
  const scores = computeUserPointsBySubclass(input, base, occupation?.anzsco_code);

  let frictionScore: FrictionScore = "MEDIUM";
  const reality: string[] = [];
  const successSignals: string[] = [];

  const subclassKey = toPathwayKey(subclass);
  const userPoints =
    subclassKey === "189" ? scores.subclass189
    : subclassKey === "190" ? scores.subclass190
    : subclassKey === "491" ? scores.subclass491
    : computeBestKnownScore(input, base, occupation?.anzsco_code);

  const estimate = trend?.estimates.find((e) => e.subclass === subclassKey) ?? undefined;
  const lastInvitedPoint = getTrendPoint(estimate);

  if (["189", "190", "491"].includes(subclassKey)) {
    if (lastInvitedPoint !== undefined) {
      const gap = userPoints - lastInvitedPoint;
      if (gap < -10) {
        frictionScore = "EXTREME";
      } else if (gap >= 0) {
        frictionScore = "LOW";
      } else if (gap <= -6) {
        frictionScore = "HIGH";
      } else {
        frictionScore = "MEDIUM";
      }

      if (frictionScore === "EXTREME") {
        reality.push(`Your current score (${userPoints}) is more than 10 points below the recent ${subclassKey} invitation reference (${lastInvitedPoint}).`);
      } else if (frictionScore === "LOW") {
        reality.push(`You are currently at or above the recent ${subclassKey} invitation reference (${lastInvitedPoint}).`);
      } else if (frictionScore === "HIGH") {
        reality.push(`You are close but still behind recent ${subclassKey} invitation movement (${userPoints} vs ${lastInvitedPoint}).`);
      } else {
        reality.push(`You are within a manageable range of recent ${subclassKey} invitation movement (${userPoints} vs ${lastInvitedPoint}).`);
      }
    } else {
      reality.push(`No recent invitation point benchmark was matched for ${subclassKey}; score pressure is estimated from profile-only indicators.`);
    }

    if (subclassKey === "189" && ["221111", "261313"].includes(occupation?.anzsco_code ?? "") && userPoints < 90) {
      frictionScore = userPoints < 85 ? "EXTREME" : escalate(frictionScore, "HIGH");
      reality.push("This occupation is highly competitive for 189; sub-90 points profiles typically face elevated selection pressure.");
    }
  }

  if (["189", "190", "491"].includes(subclassKey) && occupation?.authority === "ACS" && (input.offshoreExperienceYears ?? 0) < 2) {
    frictionScore = "EXTREME";
    reality.push("ACS experience deduction risk is high because declared experience is below 2 years.");
  }

  if (subclassKey === "820/801") {
    frictionScore = "MEDIUM";
    reality.push("Relationship evidence preparation is documentation-heavy and consistency-sensitive.");
  }

  if (subclassKey === "482") {
    frictionScore = "HIGH";
    reality.push("Employer sponsorship dependency creates a practical bottleneck even with a valid profile.");
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

  if (["189", "190", "491"].includes(subclassKey) && lastInvitedPoint !== undefined && userPoints >= lastInvitedPoint) {
    successSignals.push("Your points currently meet or exceed the latest invitation reference for this pathway.");
  }

  if (subclassKey === "820/801" || subclassKey === "482") {
    successSignals.push("Outcome quality depends strongly on evidence quality, sequence control, and process timing.");
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
  const occupation = findOccupationRecord(input);
  return {
    ...base,
    documentChecklist: buildPremiumDocumentChecklist(input, base),
    suggestedNextSteps: buildImmediateActionPlan(input, base, occupation?.anzsco_code),
    frictionAnalysis: buildFrictionAnalysis(input, base),
  };
}

export { buildLeadQuality } from "@/lib/readiness/engine";
