import occupationsData from "@/src/data/occupations.json";

// ─────────────────────────────────────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

export type AgeRange = "18_24" | "25_32" | "33_39" | "40_44" | "45_plus";
export type EnglishLevel = "Competent" | "Proficient" | "Superior";
export type QualificationLevel = "PhD" | "Bachelor" | "Diploma" | "Certificate" | "Other";
export type VisaSubclass = "189" | "190" | "491";

export interface PointsCalculatorInput {
  ageRange: AgeRange;
  englishLevel: EnglishLevel;
  qualificationLevel: QualificationLevel;
  offshoreExperienceYears: number;
  onshoreExperienceYears: number;
  anzscoCode?: string;
  occupationName?: string;
  hasNAATI?: boolean;
  hasProfessionalYear?: boolean;
  hasRegionalStudy?: boolean;
  partnerSkilled?: boolean;
}

export interface PointsBreakdown {
  age: number;
  english: number;
  education: number;
  experienceOffshore: number;
  experienceOnshore: number;
  experienceTotal: number;
  partner: number;
  naati: number;
  professionalYear: number;
  regionalStudy: number;
  bonusTotal: number;
}

export interface BoosterScenario {
  title: string;
  potentialPoints: number;
  description: string;
}

export interface PointsCalculatorResult {
  currentScore: number;
  breakdown: PointsBreakdown;
  scores: {
    subclass189: number;
    subclass190: number;
    subclass491: number;
  };
  boosters: BoosterScenario[];
  isEligibleForPointsTest: boolean;
  occupationAuthority?: string;
  acsDeductionApplied?: boolean;
  warnings: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Occupation Data Interface
// ─────────────────────────────────────────────────────────────────────────────

interface OccupationRecord {
  anzsco_code: string;
  occupation_name: string;
  authority: string;
  min_qualification: string;
  post_qual_experience_years: number;
  english_requirement: string;
  critical_warning: string;
  visa_lists: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const AGE_POINTS: Record<AgeRange, number> = {
  "18_24": 25,
  "25_32": 30,
  "33_39": 25,
  "40_44": 15,
  "45_plus": 0,
};

const ENGLISH_POINTS: Record<EnglishLevel, number> = {
  Competent: 0,
  Proficient: 10,
  Superior: 20,
};

const EDUCATION_POINTS: Record<QualificationLevel, number> = {
  PhD: 20,
  Bachelor: 15,
  Diploma: 10,
  Certificate: 10,
  Other: 0,
};

const MINIMUM_POINTS_THRESHOLD = 65;
const ACS_OFFSHORE_DEDUCTION_YEARS = 2;
const MAX_EXPERIENCE_POINTS = 20;
const STATE_NOMINATION_BONUS_190 = 5;
const REGIONAL_NOMINATION_BONUS_491 = 15;

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Finds an occupation record by ANZSCO code or occupation name
 * Implements fallback mechanism for unmatched codes
 */
function findOccupationRecord(
  anzscoCode?: string,
  occupationName?: string
): OccupationRecord | null {
  const occupations = (occupationsData as any).occupations as OccupationRecord[];

  if (!occupations || !Array.isArray(occupations)) {
    console.warn("Occupations data not available or malformed");
    return null;
  }

  // Try exact ANZSCO code match
  if (anzscoCode) {
    const exactMatch = occupations.find((o) => o.anzsco_code === anzscoCode);
    if (exactMatch) return exactMatch;
  }

  // Try exact occupation name match
  if (occupationName) {
    const nameMatch = occupations.find(
      (o) => o.occupation_name.toLowerCase() === occupationName.toLowerCase()
    );
    if (nameMatch) return nameMatch;
  }

  // Try partial occupation name match (fallback)
  if (occupationName) {
    const partialMatch = occupations.find((o) =>
      o.occupation_name.toLowerCase().includes(occupationName.toLowerCase())
    );
    if (partialMatch) return partialMatch;
  }

  return null;
}

/**
 * Calculates experience points with cap enforcement
 * Returns both individual and capped totals
 */
function calculateExperiencePoints(
  offshoreYears: number,
  onshoreYears: number,
  acsDeductionApplied: boolean
): { offshore: number; onshore: number; total: number } {
  // Apply ACS deduction if necessary
  const adjustedOffshoreYears = acsDeductionApplied
    ? Math.max(0, offshoreYears - ACS_OFFSHORE_DEDUCTION_YEARS)
    : offshoreYears;

  // Experience point calculation based on years
  const getExperiencePoints = (years: number): number => {
    if (years < 1) return 0;
    if (years < 3) return 5;
    if (years < 5) return 10;
    if (years < 8) return 15;
    return 20;
  };

  const offshorePoints = getExperiencePoints(adjustedOffshoreYears);
  const onshorePoints = getExperiencePoints(onshoreYears);
  const totalBeforeCap = offshorePoints + onshorePoints;
  const totalAfterCap = Math.min(totalBeforeCap, MAX_EXPERIENCE_POINTS);

  return {
    offshore: offshorePoints,
    onshore: onshorePoints,
    total: totalAfterCap,
  };
}

/**
 * Generates booster scenarios based on current input
 */
function generateBoosters(
  input: PointsCalculatorInput,
  currentScore: number,
  breakdown: PointsBreakdown
): BoosterScenario[] {
  const boosters: BoosterScenario[] = [];

  // English Boost
  if (input.englishLevel !== "Superior") {
    const gain = input.englishLevel === "Competent" ? 20 : 10;
    boosters.push({
      title: "English Score Scenario",
      potentialPoints: gain,
      description: `If the profile moved to Superior English (PTE 79+ equivalent), the points model would add +${gain} points. Current score + ${gain} = ${currentScore + gain}`,
    });
  }

  // NAATI or Professional Year Boost
  if (!input.hasNAATI && !input.hasProfessionalYear) {
    boosters.push({
      title: "NAATI or Professional Year Scenario",
      potentialPoints: 5,
      description: `If a NAATI CCL or Professional Year variable were added, the points model would add +5 points. Current score + 5 = ${currentScore + 5}`,
    });
  }

  // State Nomination Bonus (190)
  boosters.push({
    title: "State Nomination Scenario (Subclass 190)",
    potentialPoints: STATE_NOMINATION_BONUS_190,
    description: `If a 190 state nomination variable were present, the model would add +${STATE_NOMINATION_BONUS_190} points (190 total: ${currentScore + STATE_NOMINATION_BONUS_190})`,
  });

  // Regional Nomination Bonus (491)
  boosters.push({
    title: "Regional Nomination Scenario (Subclass 491)",
    potentialPoints: REGIONAL_NOMINATION_BONUS_491,
    description: `If a 491 regional nomination variable were present, the model would add +${REGIONAL_NOMINATION_BONUS_491} points (491 total: ${currentScore + REGIONAL_NOMINATION_BONUS_491})`,
  });

  // Partner Skill Boost
  if (!input.partnerSkilled) {
    boosters.push({
      title: "Partner Skills Scenario",
      potentialPoints: 10,
      description: `If partner-skills points were available, the model would add +10 points. Current score + 10 = ${currentScore + 10}`,
    });
  }

  return boosters;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Calculator Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Comprehensive visa points calculator for skilled migration (189/190/491)
 * Integrates occupation data, applies ACS deduction, and generates booster scenarios
 */
export function calculateVisaPoints(input: PointsCalculatorInput): PointsCalculatorResult {
  const warnings: string[] = [];

  // Get age points
  const agePoints = AGE_POINTS[input.ageRange];

  // Get English points
  const englishPoints = ENGLISH_POINTS[input.englishLevel];

  // Get education points
  const educationPoints = EDUCATION_POINTS[input.qualificationLevel];

  // Look up occupation and determine if ACS deduction applies
  let occupationRecord: OccupationRecord | null = null;
  let acsDeductionApplied = false;
  let occupationAuthority: string | undefined;

  if (input.anzscoCode || input.occupationName) {
    occupationRecord = findOccupationRecord(input.anzscoCode, input.occupationName);

    if (occupationRecord) {
      occupationAuthority = occupationRecord.authority;

      // Check if ACS deduction should apply
      if (
        occupationRecord.authority === "ACS" &&
        input.offshoreExperienceYears > 0
      ) {
        acsDeductionApplied = true;
      }

      // Add occupation-specific warnings
      if (occupationRecord.critical_warning) {
        warnings.push(`[${occupationRecord.authority}] ${occupationRecord.critical_warning}`);
      }
    } else {
      warnings.push(
        `Occupation not found in database. Using provided inputs without occupation-specific deductions. Consider verifying ANZSCO code or occupation title.`
      );
    }
  }

  // Calculate experience points (handles ACS deduction)
  const experienceData = calculateExperiencePoints(
    input.offshoreExperienceYears,
    input.onshoreExperienceYears,
    acsDeductionApplied
  );

  // Calculate bonus points
  const naatiPoints = input.hasNAATI ? 5 : 0;
  const professionalYearPoints = input.hasProfessionalYear ? 5 : 0;
  const regionalStudyPoints = input.hasRegionalStudy ? 5 : 0;
  const partnerPoints = input.partnerSkilled ? 10 : 0;
  const bonusTotal = naatiPoints + professionalYearPoints + regionalStudyPoints;

  // Calculate base score (without state/regional nomination bonuses)
  const baseScore =
    agePoints +
    englishPoints +
    educationPoints +
    experienceData.total +
    bonusTotal +
    partnerPoints;

  // Calculate subclass-specific scores
  const score189 = baseScore;
  const score190 = baseScore + STATE_NOMINATION_BONUS_190;
  const score491 = baseScore + REGIONAL_NOMINATION_BONUS_491;

  // Build breakdown object
  const breakdown: PointsBreakdown = {
    age: agePoints,
    english: englishPoints,
    education: educationPoints,
    experienceOffshore: experienceData.offshore,
    experienceOnshore: experienceData.onshore,
    experienceTotal: experienceData.total,
    partner: partnerPoints,
    naati: naatiPoints,
    professionalYear: professionalYearPoints,
    regionalStudy: regionalStudyPoints,
    bonusTotal,
  };

  // Generate booster scenarios
  const boosters = generateBoosters(input, baseScore, breakdown);

  // Check eligibility for points test
  const isEligibleForPointsTest = score189 >= MINIMUM_POINTS_THRESHOLD;

  // Add ACS deduction warning if applied
  if (acsDeductionApplied) {
    warnings.unshift(
      `ACS Deduction Applied: ${ACS_OFFSHORE_DEDUCTION_YEARS} years deducted from offshore experience (${input.offshoreExperienceYears} → ${Math.max(0, input.offshoreExperienceYears - ACS_OFFSHORE_DEDUCTION_YEARS)} years) per ACS assessment rules.`
    );
  }

  return {
    currentScore: baseScore,
    breakdown,
    scores: {
      subclass189: score189,
      subclass190: score190,
      subclass491: score491,
    },
    boosters,
    isEligibleForPointsTest,
    occupationAuthority,
    acsDeductionApplied,
    warnings,
  };
}

/**
 * Utility function to format points result for display/PDF
 */
export function formatPointsResult(result: PointsCalculatorResult): string {
  const lines: string[] = [
    "═══════════════════════════════════════════════════════════════",
    "                    SKILLED MIGRATION POINTS CALCULATOR",
    "═══════════════════════════════════════════════════════════════",
    "",
    `Current Base Score: ${result.currentScore} points`,
    `Subclass 189 (Independent): ${result.scores.subclass189} points`,
    `Subclass 190 (State Nominated): ${result.scores.subclass190} points`,
    `Subclass 491 (Regional): ${result.scores.subclass491} points`,
    "",
    "POINTS BREAKDOWN:",
    `  Age:                    ${result.breakdown.age} points (${result.breakdown.age > 0 ? "✓" : "✗"})`,
    `  English:                ${result.breakdown.english} points`,
    `  Education:              ${result.breakdown.education} points`,
    `  Experience (Total):     ${result.breakdown.experienceTotal} points`,
    `    - Offshore:           ${result.breakdown.experienceOffshore} points`,
    `    - Onshore:            ${result.breakdown.experienceOnshore} points`,
    `  Partner:                ${result.breakdown.partner} points`,
    `  Bonuses:                ${result.breakdown.bonusTotal} points`,
    `    - NAATI:              ${result.breakdown.naati} points`,
    `    - Professional Year:  ${result.breakdown.professionalYear} points`,
    `    - Regional Study:     ${result.breakdown.regionalStudy} points`,
    "",
    `Eligible for Points Test (65+): ${result.isEligibleForPointsTest ? "YES ✓" : "NO ✗"}`,
    "",
  ];

  if (result.occupationAuthority) {
    lines.push(`Occupation Authority: ${result.occupationAuthority}`);
    if (result.acsDeductionApplied) {
      lines.push(`ACS Deduction Applied: Yes (2-year offshore experience deduction)`);
    }
    lines.push("");
  }

  if (result.boosters.length > 0) {
    lines.push("POINTS BOOSTER SCENARIOS:");
    result.boosters.forEach((booster) => {
      lines.push(`  • ${booster.title} (+${booster.potentialPoints} points)`);
      lines.push(`    ${booster.description}`);
    });
    lines.push("");
  }

  if (result.warnings.length > 0) {
    lines.push("WARNINGS & NOTES:");
    result.warnings.forEach((warning) => {
      lines.push(`  ⚠️  ${warning}`);
    });
  }

  lines.push("═══════════════════════════════════════════════════════════════");

  return lines.join("\n");
}
