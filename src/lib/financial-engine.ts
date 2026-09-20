import visaFeesData from "@/src/data/visa-fees.json";
import {
  calculateVisaPoints,
  type PointsCalculatorInput,
  type PointsCalculatorResult,
} from "@/lib/readiness/visa-points-calculator";
import { getAuthorityById, getDefaultPathway } from "@/lib/skills-assessment";

export type SupportedSubclass = "500" | "485" | "482" | "189" | "190" | "491" | "820/801" | "820_801";
export type SupportedAuthority = "ACS" | "Engineers Australia" | "VETASSESS" | string;

export type FamilyComposition = {
  adultDependants?: number;
  childDependants?: number;
  policeCheckCountriesPerAdult?: number;
};

export type CostCategory = "Government" | "Mandatory" | "Optional";

export type CostLineItem = {
  category: CostCategory;
  item: string;
  amount: number;
};

export type FinancialReport = {
  totalEstimatedCost: number;
  currency: "AUD";
  breakdown: Array<{ item: string; amount: number }>;
  categorizedBreakdown: CostLineItem[];
  disclaimer: string;
};

export type FullReadinessReport = {
  points: PointsCalculatorResult;
  financial: FinancialReport;
};

type VisaVac = {
  main: number;
  partner_18_plus: number;
  child_under_18: number;
  // Subclass 820-specific concession tiers (1 July 2026 pricing) -- optional
  // since only the 820 fee table currently has these reduced rates.
  subclass300Holder?: number;
  formerSubclass300Holder?: number;
  // Subclass 189-specific mandatory surcharge (1 July 2026 pricing) for
  // applicants 18+ without functional English.
  secondInstalmentEnglish?: number;
};

type VisaFeeTable = {
  label: string;
  vac: VisaVac;
};

type VisaFeesDataset = {
  currency: "AUD";
  visas: Record<string, VisaFeeTable>;
  mandatory_estimates: {
    medical_check_per_person: number;
    biometrics_per_person: number;
    police_check_per_country_per_adult: number;
  };
  optional_estimates: {
    naati_ccl: number;
    professional_year: number;
    translation_notarization_buffer: number;
  };
  disclaimer: string;
};

const FEES = visaFeesData as VisaFeesDataset;

function normalizeSubclass(subclass: SupportedSubclass | string): string {
  const cleaned = subclass.trim();
  if (cleaned === "820/801") return "820_801";
  return cleaned;
}

function getVisaFeeTable(subclass: SupportedSubclass | string): VisaFeeTable {
  const key = normalizeSubclass(subclass);
  const table = FEES.visas[key];
  if (!table) {
    throw new Error(`Unsupported visa subclass: ${subclass}`);
  }
  return table;
}

// Maps this module's legacy loose authority labels onto the real
// registry's authorityId values (lib/skills-assessment/authorities/*.ts) --
// "Engineers Australia" here vs "EA" there, "default"/unmatched here vs
// "GENERAL" there.
const AUTHORITY_LABEL_TO_ID: Record<string, string> = {
  ACS: "ACS",
  "Engineers Australia": "EA",
  VETASSESS: "VETASSESS",
};

function resolveSkillsAssessmentFeeEstimate(authority: SupportedAuthority): number {
  const authorityId = AUTHORITY_LABEL_TO_ID[authority] ?? "GENERAL";
  const resolved = getAuthorityById(authorityId) ?? getAuthorityById("GENERAL");
  const pathway = getDefaultPathway(resolved);
  const fee = pathway?.fees.find((f) => typeof f.amountAUD === "number");
  // GENERAL (VETASSESS / General Professional Authority) is always
  // registered, so this fallback should be unreachable -- kept defensive
  // only, matching the same "should not be reachable" pattern engine.ts
  // uses for the equivalent lookup in buildFinancialRoadmap.
  return fee?.amountAUD ?? 850;
}

function normalizeFamily(familyComposition?: FamilyComposition): Required<FamilyComposition> {
  return {
    adultDependants: Math.max(0, familyComposition?.adultDependants ?? 0),
    childDependants: Math.max(0, familyComposition?.childDependants ?? 0),
    policeCheckCountriesPerAdult: Math.max(1, familyComposition?.policeCheckCountriesPerAdult ?? 1),
  };
}

export function calculateTotalCosts(
  subclass: SupportedSubclass | string,
  familyComposition?: FamilyComposition
): number {
  const feeTable = getVisaFeeTable(subclass);
  const family = normalizeFamily(familyComposition);

  const main = feeTable.vac.main;
  const adults = feeTable.vac.partner_18_plus * family.adultDependants;
  const children = feeTable.vac.child_under_18 * family.childDependants;

  return main + adults + children;
}

export function estimateThirdPartyCosts(
  authority: SupportedAuthority,
  familyComposition?: FamilyComposition
): {
  authority: string;
  skillsAssessmentEstimate: number;
  mandatoryChecksEstimate: number;
  mandatoryBreakdown: {
    medical: number;
    biometrics: number;
    police: number;
  };
} {
  const family = normalizeFamily(familyComposition);
  const peopleCount = 1 + family.adultDependants + family.childDependants;
  const adultCount = 1 + family.adultDependants;

  // visa-fees.json used to carry its own skills_assessment_estimates table
  // here (ACS 560, Engineers Australia 800-1,100, VETASSESS 1,000) --
  // deleted as dead data (unused by the report/chat/admin code paths,
  // confirmed by repo-wide grep) and because it disagreed with the real,
  // occupation/pathway-specific fees in lib/skills-assessment/authorities/*
  // (e.g. ACS's actual General Skills Assessment pathway fee is AUD 1,498,
  // not 560). Resolve the same authority registry the report's own
  // Financial Roadmap uses instead of a second, drifting copy.
  const skillsAssessmentEstimate = resolveSkillsAssessmentFeeEstimate(authority);

  const medical = FEES.mandatory_estimates.medical_check_per_person * peopleCount;
  const biometrics = FEES.mandatory_estimates.biometrics_per_person * peopleCount;
  const police =
    FEES.mandatory_estimates.police_check_per_country_per_adult *
    family.policeCheckCountriesPerAdult *
    adultCount;

  return {
    authority,
    skillsAssessmentEstimate,
    mandatoryChecksEstimate: medical + biometrics + police,
    mandatoryBreakdown: {
      medical,
      biometrics,
      police,
    },
  };
}

export function getCostBreakdown(
  subclass: SupportedSubclass | string,
  authority: SupportedAuthority,
  familyComposition?: FamilyComposition
): FinancialReport {
  const family = normalizeFamily(familyComposition);
  const visaFee = getVisaFeeTable(subclass);
  const governmentFee = calculateTotalCosts(subclass, family);
  const thirdParty = estimateThirdPartyCosts(authority, family);

  const mainVac = visaFee.vac.main;
  const dependantVac = governmentFee - mainVac;

  const categorizedBreakdown: CostLineItem[] = [
    {
      category: "Government",
      item: "Visa Application Charge (Main + Dependants)",
      amount: governmentFee,
    },
    {
      category: "Mandatory",
      item: "Skills Assessment (Estimate)",
      amount: thirdParty.skillsAssessmentEstimate,
    },
    {
      category: "Mandatory",
      item: "Health & Character Checks",
      amount: thirdParty.mandatoryChecksEstimate,
    },
    {
      category: "Optional",
      item: "NAATI CCL (Optional)",
      amount: FEES.optional_estimates.naati_ccl,
    },
    {
      category: "Optional",
      item: "Professional Year (Optional)",
      amount: FEES.optional_estimates.professional_year,
    },
    {
      category: "Optional",
      item: "Translation / Notarization Buffer",
      amount: FEES.optional_estimates.translation_notarization_buffer,
    },
  ];

  const totalEstimatedCost = categorizedBreakdown
    .filter((line) => line.category !== "Optional")
    .reduce((sum, line) => sum + line.amount, 0);

  return {
    totalEstimatedCost,
    currency: FEES.currency,
    breakdown: [
      { item: "Visa Application Charge (Main)", amount: mainVac },
      { item: "Visa Application Charge (Dependants)", amount: dependantVac },
      { item: "Skills Assessment (Estimate)", amount: thirdParty.skillsAssessmentEstimate },
      { item: "Health & Character Checks", amount: thirdParty.mandatoryChecksEstimate },
    ],
    categorizedBreakdown,
    disclaimer: FEES.disclaimer,
  };
}

export function buildFullReportCostAndPoints(params: {
  subclass: SupportedSubclass | string;
  familyComposition?: FamilyComposition;
  pointsInput: PointsCalculatorInput;
  authorityOverride?: SupportedAuthority;
}): FullReadinessReport {
  const points = calculateVisaPoints(params.pointsInput);
  const authority = params.authorityOverride ?? points.occupationAuthority ?? "default";

  return {
    points,
    financial: getCostBreakdown(params.subclass, authority, params.familyComposition),
  };
}

export function getCombinedReportSnapshot(params: {
  subclass: SupportedSubclass | string;
  authority?: SupportedAuthority;
  familyComposition?: FamilyComposition;
  pointsScore?: number;
}) {
  const authority = params.authority ?? "default";
  const financial = getCostBreakdown(params.subclass, authority, params.familyComposition);

  return {
    points: {
      currentScore: params.pointsScore ?? 0,
      isEligibleForPointsTest: (params.pointsScore ?? 0) >= 65,
    },
    financial,
  };
}
