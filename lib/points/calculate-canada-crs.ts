import expressEntryConfig from "@/src/data/countries/ca/express-entry.json";
import type {
  CanadaCRSBreakdown,
  CanadaCRSInput,
  CanadaCRSResult,
  CLBLevel,
} from "@/lib/points/canada-types";

const CLB_RANK: Record<CLBLevel, number> = {
  not_selected: 0,
  less_than_CLB4: 0,
  CLB_4_5: 5,
  CLB_6: 6,
  CLB_7: 7,
  CLB_8: 8,
  CLB_9: 9,
  CLB_10_plus: 10,
};

function minClbRank(scores: { speaking: CLBLevel; listening: CLBLevel; reading: CLBLevel; writing: CLBLevel }): number {
  return Math.min(
    CLB_RANK[scores.speaking],
    CLB_RANK[scores.listening],
    CLB_RANK[scores.reading],
    CLB_RANK[scores.writing],
  );
}

function coreHumanCapital(input: CanadaCRSInput) {
  const spouseKey = input.hasSpouseOrPartner ? "withSpouse" : "withoutSpouse";
  const crs = expressEntryConfig.crsScore.coreHumanCapitalFactors;

  const ageTable: Record<string, { withSpouse: number; withoutSpouse: number }> = crs.age.table;
  const educationTable: Record<string, { withSpouse: number; withoutSpouse: number }> = crs.education.table;
  const age = ageTable[input.age]?.[spouseKey] ?? 0;
  const education = educationTable[input.education]?.[spouseKey] ?? 0;

  const firstLanguagePerAbilityMax = input.hasSpouseOrPartner
    ? crs.firstOfficialLanguage.maxPerAbilityWithSpouse
    : crs.firstOfficialLanguage.maxPerAbilityWithoutSpouse;
  const firstLanguageAbilities = [
    input.firstLanguageAbilityScores.speaking,
    input.firstLanguageAbilityScores.listening,
    input.firstLanguageAbilityScores.reading,
    input.firstLanguageAbilityScores.writing,
  ];
  const firstLanguageTable: Record<string, { withSpouse: number; withoutSpouse: number }> =
    crs.firstOfficialLanguage.table;
  const firstLanguage = firstLanguageAbilities.reduce((sum, ability) => {
    const row = firstLanguageTable[ability]?.[spouseKey] ?? 0;
    return sum + Math.min(row, firstLanguagePerAbilityMax);
  }, 0);

  const secondLanguageMax = input.hasSpouseOrPartner
    ? crs.secondOfficialLanguage.maxCombinedWithSpouse
    : crs.secondOfficialLanguage.maxCombinedWithoutSpouse;
  const secondLanguage =
    input.secondLanguageBand === "none"
      ? 0
      : Math.min(crs.secondOfficialLanguage.table[input.secondLanguageBand] ?? 0, secondLanguageMax);

  const canadianWorkExperience = crs.canadianWorkExperience.table[input.canadianWorkExperience]?.[spouseKey] ?? 0;

  const total = age + education + firstLanguage + secondLanguage + canadianWorkExperience;
  return { age, education, firstLanguage, secondLanguage, canadianWorkExperience, total };
}

function spouseFactors(input: CanadaCRSInput) {
  if (!input.hasSpouseOrPartner || !input.spouse) {
    return { education: 0, language: 0, canadianWorkExperience: 0, total: 0 };
  }
  const crs = expressEntryConfig.crsScore.spouseFactors;
  const education = crs.education.table[input.spouse.education] ?? 0;

  const abilities = [
    input.spouse.firstLanguageAbilityScores.speaking,
    input.spouse.firstLanguageAbilityScores.listening,
    input.spouse.firstLanguageAbilityScores.reading,
    input.spouse.firstLanguageAbilityScores.writing,
  ];
  const language = abilities.reduce((sum, score) => sum + Math.min(score, crs.languageFirstOfficial.maxPerAbility), 0);
  const cappedLanguage = Math.min(language, crs.languageFirstOfficial.maxTotal);

  const canadianWorkExperience = crs.canadianWorkExperience.table[input.spouse.canadianWorkExperience] ?? 0;

  const total = education + cappedLanguage + canadianWorkExperience;
  return { education, language: cappedLanguage, canadianWorkExperience, total };
}

type CanadianExpTier = "1_year" | "2_years_plus";

function canadianExpTier(years: CanadaCRSInput["canadianWorkExperience"]): CanadianExpTier | null {
  if (years === "none_or_less_than_1yr") return null;
  if (years === "1_year") return "1_year";
  return "2_years_plus";
}

function clbTier(minRank: number): "CLB_7_or_8" | "CLB_9_plus" | null {
  if (minRank >= 9) return "CLB_9_plus";
  if (minRank >= 7) return "CLB_7_or_8";
  return null;
}

/**
 * Official combos and exact point values verified against immigration.ca's
 * published CRS grid on 2026-06-22 (canada.ca's own CRS criteria page blocks
 * automated fetches with HTTP 403). Each combo has 4 tiers driven by
 * credential count (one vs two-or-more) or experience-years bucket crossed
 * with a CLB tier — collapsing these to booleans (an earlier version of this
 * function did) silently doubles the score for single-credential / 1-year-
 * Canadian-experience profiles, which are the most common applicant shape.
 */
function skillTransferability(input: CanadaCRSInput): number {
  const crs = expressEntryConfig.crsScore.skillTransferabilityFactors;
  const firstLanguageMinRank = minClbRank(input.firstLanguageAbilityScores);
  const clb = clbTier(firstLanguageMinRank);
  let total = 0;

  if (input.postSecondaryCredentialCount !== "none" && clb) {
    const row =
      input.postSecondaryCredentialCount === "two_or_more"
        ? crs.educationPlusLanguage.twoOrMoreCredentials
        : crs.educationPlusLanguage.oneCredential;
    total += row[clb];
  }

  const caExpTier = canadianExpTier(input.canadianWorkExperience);
  if (input.postSecondaryCredentialCount !== "none" && caExpTier) {
    const row =
      input.postSecondaryCredentialCount === "two_or_more"
        ? crs.educationPlusCanadianWorkExp.twoOrMoreCredentials
        : crs.educationPlusCanadianWorkExp.oneCredential;
    total += caExpTier === "1_year" ? row["1_year"] : row["2_years_plus"];
  }

  if (input.foreignWorkExperienceYears !== "none" && clb) {
    const row = crs.foreignWorkExpPlusLanguage[input.foreignWorkExperienceYears];
    total += row[clb];
  }

  if (input.foreignWorkExperienceYears !== "none" && caExpTier) {
    const row = crs.foreignWorkExpPlusCanadianWorkExp[input.foreignWorkExperienceYears];
    total += caExpTier === "1_year" ? row["1_year"] : row["2_years_plus"];
  }

  if (input.hasCertificateOfQualification) {
    if (firstLanguageMinRank >= 7) total += crs.certificateOfQualificationPlusLanguage.maxWithCLB7;
    else if (firstLanguageMinRank >= 5) total += crs.certificateOfQualificationPlusLanguage.maxWithCLB5;
  }

  return Math.min(total, crs.maxTotal);
}

function additionalPoints(input: CanadaCRSInput) {
  const crs = expressEntryConfig.crsScore.additionalPoints;

  const sibling = input.hasSiblingInCanada ? crs.siblingInCanada.points : 0;
  const french = input.frenchAbility === "none" ? 0 : crs.frenchLanguageSkills.table[input.frenchAbility] ?? 0;
  const canadianEducation =
    input.canadianPostSecondaryCredentialYears === "none"
      ? 0
      : crs.canadianPostSecondaryEducation[input.canadianPostSecondaryCredentialYears] ?? 0;
  const provincialNomination = input.hasProvincialNomination ? crs.provincialOrTerritorialNomination.points : 0;

  const total = sibling + french + canadianEducation + provincialNomination;
  return { sibling, french, canadianEducation, provincialNomination, total };
}

export function calculateCanadaCRS(input: CanadaCRSInput): CanadaCRSResult {
  const coreHumanCapitalBreakdown = coreHumanCapital(input);
  const spouseBreakdown = spouseFactors(input);
  const skillTransferabilityTotal = skillTransferability(input);
  const additionalBreakdown = additionalPoints(input);

  const breakdown: CanadaCRSBreakdown = {
    coreHumanCapital: coreHumanCapitalBreakdown,
    spouseFactors: spouseBreakdown,
    skillTransferability: { total: skillTransferabilityTotal },
    additionalPoints: additionalBreakdown,
  };

  const totalScore =
    coreHumanCapitalBreakdown.total +
    spouseBreakdown.total +
    skillTransferabilityTotal +
    additionalBreakdown.total;

  return {
    configVersion: expressEntryConfig.lastVerified,
    totalScore,
    maxScore: expressEntryConfig.crsScore.maxScore,
    breakdown,
  };
}
