// Canada Express Entry / CRS types
// Field names follow src/data/countries/ca/express-entry.json table keys.

export type CanadaAgeBracket =
  | "not_selected"
  | "17_or_less"
  | "18"
  | "19"
  | "20_29"
  | "30"
  | "31"
  | "32"
  | "33"
  | "34"
  | "35"
  | "36"
  | "37"
  | "38"
  | "39"
  | "40"
  | "41"
  | "42"
  | "43"
  | "44"
  | "45_or_more";

export type CanadaEducationLevel =
  | "not_selected"
  | "less_than_secondary"
  | "secondary_diploma"
  | "one_year_post_secondary"
  | "two_year_post_secondary"
  | "bachelors_or_3yr_program"
  | "two_or_more_credentials_one_3yr_plus"
  | "masters_or_professional_degree"
  | "doctoral_phd";

export type CanadaSpouseEducationLevel =
  | "less_than_secondary"
  | "secondary"
  | "one_year_post_secondary"
  | "two_year_post_secondary"
  | "bachelors_or_3yr"
  | "two_or_more_credentials"
  | "masters_or_professional"
  | "doctoral";

/**
 * A first-official-language result per ability. CLB 4 and CLB 5 score the same core points (the published table row is "CLB 4 or 5") but differ for
 * the certificate-of-qualification rule (CLB 5 or more), so they are separate values; "CLB_4_5" is the older combined value, read as CLB 5.
 */
export type CLBLevel =
  | "not_selected"
  | "less_than_CLB4"
  | "CLB_4"
  | "CLB_5"
  | "CLB_4_5"
  | "CLB_6"
  | "CLB_7"
  | "CLB_8"
  | "CLB_9"
  | "CLB_10_plus";

export type SecondLanguageCLBBand = "CLB4_or_less" | "CLB5_6" | "CLB7_8" | "CLB9_plus";

export type CanadianWorkExperienceYears =
  | "none_or_less_than_1yr"
  | "1_year"
  | "2_years"
  | "3_years"
  | "4_years"
  | "5_plus_years";

export type SpouseCanadianWorkExperienceYears =
  | "none_or_less_1yr"
  | "1_year"
  | "2_years"
  | "3_years"
  | "4_years"
  | "5_plus_years";

export type CanadaCRSInput = {
  hasSpouseOrPartner: boolean;
  age: CanadaAgeBracket;
  education: CanadaEducationLevel;
  firstLanguageAbilityScores: {
    speaking: CLBLevel;
    listening: CLBLevel;
    reading: CLBLevel;
    writing: CLBLevel;
  };
  /** Older single value: the same band for all four abilities. Ignored when secondLanguageAbilityScores is given. */
  secondLanguageBand: SecondLanguageCLBBand | "none";
  /** Second official language per ability (points are per ability: 1 / 3 / 6, capped at 24, or 22 with a spouse or partner). */
  secondLanguageAbilityScores?: { speaking: SecondLanguageCLBBand | "none"; listening: SecondLanguageCLBBand | "none"; reading: SecondLanguageCLBBand | "none"; writing: SecondLanguageCLBBand | "none" };
  canadianWorkExperience: CanadianWorkExperienceYears;

  spouse?: {
    education: CanadaSpouseEducationLevel;
    /** The spouse or partner's first official language per ability, as CLB levels (points per ability: 1 / 3 / 5, capped at 20). */
    firstLanguageAbilityScores: { speaking: CLBLevel; listening: CLBLevel; reading: CLBLevel; writing: CLBLevel };
    canadianWorkExperience: SpouseCanadianWorkExperienceYears;
  };

  // Skill transferability inputs
  // CRS distinguishes "one" credential from "two or more" — collapsing this to
  // a boolean was the source of a confirmed scoring bug, see calculate-canada-crs.ts
  postSecondaryCredentialCount: "none" | "one" | "two_or_more";
  foreignWorkExperienceYears: "none" | "1_2_years" | "3_plus_years";
  hasCertificateOfQualification: boolean;

  // Additional points
  hasSiblingInCanada: boolean;
  frenchAbility: "none" | "NCLC7_plus_english_CLB4_or_less" | "NCLC7_plus_english_CLB5_plus";
  canadianPostSecondaryCredentialYears: "none" | "one_to_two_year_credential" | "three_year_plus_credential";
  hasProvincialNomination: boolean;
};

export type CanadaCRSBreakdown = {
  coreHumanCapital: {
    age: number;
    education: number;
    firstLanguage: number;
    secondLanguage: number;
    canadianWorkExperience: number;
    total: number;
  };
  spouseFactors: {
    education: number;
    language: number;
    canadianWorkExperience: number;
    total: number;
  };
  skillTransferability: {
    total: number;
  };
  additionalPoints: {
    sibling: number;
    french: number;
    canadianEducation: number;
    provincialNomination: number;
    total: number;
  };
};

export type CanadaCRSResult = {
  /** Factors the calculator could not score from this input (for example a spouse or partner whose details were not given). Empty = every factor was scored. */
  notCalculated: string[];
  configVersion: string;
  totalScore: number;
  maxScore: number;
  breakdown: CanadaCRSBreakdown;
};
