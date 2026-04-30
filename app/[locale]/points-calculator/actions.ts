"use server";

import {
  calculateVisaPoints,
  formatPointsResult,
  type AgeRange,
  type EnglishLevel,
  type QualificationLevel,
  type PointsCalculatorInput,
} from "@/lib/readiness/visa-points-calculator";

/**
 * Server action to calculate visa points
 * Called from client-side form submission
 */
export async function calculatePointsAction(formData: {
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
}) {
  try {
    const input: PointsCalculatorInput = {
      ageRange: formData.ageRange,
      englishLevel: formData.englishLevel,
      qualificationLevel: formData.qualificationLevel,
      offshoreExperienceYears: formData.offshoreExperienceYears || 0,
      onshoreExperienceYears: formData.onshoreExperienceYears || 0,
      anzscoCode: formData.anzscoCode,
      occupationName: formData.occupationName,
      hasNAATI: formData.hasNAATI || false,
      hasProfessionalYear: formData.hasProfessionalYear || false,
      hasRegionalStudy: formData.hasRegionalStudy || false,
      partnerSkilled: formData.partnerSkilled || false,
    };

    const result = calculateVisaPoints(input);

    return {
      success: true,
      data: result,
      formatted: formatPointsResult(result),
    };
  } catch (error) {
    console.error("Points calculation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Example: Calculate points for a specific occupation/scenario
 */
export async function calculatePointsForScenario(scenario: {
  occupationName?: string;
  anzscoCode?: string;
  age: AgeRange;
  english: EnglishLevel;
  qualification: QualificationLevel;
  yearsOffshore: number;
  yearsOnshore: number;
}) {
  try {
    const result = calculateVisaPoints({
      ageRange: scenario.age,
      englishLevel: scenario.english,
      qualificationLevel: scenario.qualification,
      offshoreExperienceYears: scenario.yearsOffshore,
      onshoreExperienceYears: scenario.yearsOnshore,
      anzscoCode: scenario.anzscoCode,
      occupationName: scenario.occupationName,
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
