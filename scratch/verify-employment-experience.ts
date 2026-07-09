import { calculateVisaPoints } from "@/lib/readiness/visa-points-calculator";
import type { ReadinessInput } from "@/lib/readiness/types";
import { runReadinessEngine } from "@/src/lib/readiness-engine";

function print(label: string, value: unknown) {
  console.log(label, JSON.stringify(value, null, 2));
}

const calculatorBase = {
  ageRange: "33_39" as const,
  englishLevel: "Competent" as const,
  qualificationLevel: "Bachelor" as const,
  occupationName: "Software Engineer",
  hasNAATI: false,
  hasProfessionalYear: false,
  hasRegionalStudy: false,
  partnerSkilled: false,
};

const case1 = calculateVisaPoints({
  ...calculatorBase,
  offshoreExperienceYears: 8,
  onshoreExperienceYears: 0,
});

const case2 = calculateVisaPoints({
  ...calculatorBase,
  offshoreExperienceYears: 5,
  onshoreExperienceYears: 5,
});

const case3 = calculateVisaPoints({
  ...calculatorBase,
  offshoreExperienceYears: 8,
  onshoreExperienceYears: 8,
});

const reportBaseInput: ReadinessInput = {
  locale: "en",
  country: "AU",
  mainGoal: "Skilled migration to Australia",
  currentCountry: "Turkey",
  passportCountry: "Turkey",
  age: "36",
  occupation: "Software Engineer",
  englishLevel: "competent",
  qualificationLevel: "Bachelor's Degree",
  annualSalaryAud: 85000,
  sponsorOrFamily: "no",
  occupationConfirmed: "yes",
  offshoreExperienceYears: 0,
  onshoreExperienceYears: 0,
};

const reportWithoutExperience = runReadinessEngine(reportBaseInput);
const reportWithOffshoreExperience = runReadinessEngine({
  ...reportBaseInput,
  offshoreExperienceYears: 8,
});

print("CASE_1", {
  offshoreExperienceYears: 8,
  onshoreExperienceYears: 0,
  experienceOffshorePoints: case1.breakdown.experienceOffshore,
  experienceOnshorePoints: case1.breakdown.experienceOnshore,
  experienceTotalAfterCap: case1.breakdown.experienceTotal,
  currentScore189: case1.scores.subclass189,
  currentScore190: case1.scores.subclass190,
  currentScore491: case1.scores.subclass491,
  warnings: case1.warnings,
});

print("CASE_2", {
  offshoreExperienceYears: 5,
  onshoreExperienceYears: 5,
  experienceOffshorePoints: case2.breakdown.experienceOffshore,
  experienceOnshorePoints: case2.breakdown.experienceOnshore,
  experienceTotalAfterCap: case2.breakdown.experienceTotal,
  currentScore189: case2.scores.subclass189,
  currentScore190: case2.scores.subclass190,
  currentScore491: case2.scores.subclass491,
  warnings: case2.warnings,
});

print("CASE_3", {
  offshoreExperienceYears: 8,
  onshoreExperienceYears: 8,
  experienceOffshorePoints: case3.breakdown.experienceOffshore,
  experienceOnshorePoints: case3.breakdown.experienceOnshore,
  experienceTotalBeforeCap: case3.breakdown.experienceOffshore + case3.breakdown.experienceOnshore,
  experienceTotalAfterCap: case3.breakdown.experienceTotal,
  currentScore189: case3.scores.subclass189,
  currentScore190: case3.scores.subclass190,
  currentScore491: case3.scores.subclass491,
  warnings: case3.warnings,
});

print("CASE_4", {
  baselineEstimatedPoints: reportWithoutExperience.pointsEstimate?.estimatedPoints,
  withOffshoreExperienceEstimatedPoints: reportWithOffshoreExperience.pointsEstimate?.estimatedPoints,
  minimumThreshold: 65,
  baselineAssessmentState: reportWithoutExperience.assessmentState,
  withOffshoreExperienceAssessmentState: reportWithOffshoreExperience.assessmentState,
  baselineRankedPathways: reportWithoutExperience.rankedPathways,
  withOffshoreExperienceRankedPathways: reportWithOffshoreExperience.rankedPathways,
  baselineStateNominationTracker: reportWithoutExperience.stateNominationTracker,
  withOffshoreExperienceStateNominationTracker: reportWithOffshoreExperience.stateNominationTracker,
  baselineChecklist: reportWithoutExperience.lodgementReadyChecklist,
  withOffshoreExperienceChecklist: reportWithOffshoreExperience.lodgementReadyChecklist,
});