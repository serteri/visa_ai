export type AgeOption = "18_24" | "25_32" | "33_39" | "40_44" | "45_plus";

export type EnglishOption = "competent" | "proficient" | "superior";

export type OverseasEmploymentOption = "lt3" | "3_4" | "5_7" | "8_plus";

export type AustralianEmploymentOption = "lt1" | "1_2" | "3_4" | "5_7" | "8_plus";

export type EducationOption =
  | "doctorate"
  | "bachelor_or_higher"
  | "australian_diploma_or_trade"
  | "assessing_authority_recognised"
  | "none_or_unsure";

export type PartnerOption =
  | "partner_skilled"
  | "partner_competent_english"
  | "single_or_partner_au_citizen_or_pr"
  | "none_or_unsure";

export type SkilledPointsInput = {
  age: AgeOption;
  english: EnglishOption;
  overseasEmployment: OverseasEmploymentOption;
  australianEmployment: AustralianEmploymentOption;
  education: EducationOption;
  specialistEducation: boolean;
  australianStudyRequirement: boolean;
  professionalYear: boolean;
  credentialledCommunityLanguage: boolean;
  regionalStudy: boolean;
  partner: PartnerOption;
  hasStateNomination190: boolean;
};

export type PointsBreakdown = {
  age: number;
  english: number;
  overseasEmployment: number;
  australianEmployment: number;
  employmentCombinedBeforeCap: number;
  employmentCombinedAfterCap: number;
  education: number;
  bonus: {
    specialistEducation: number;
    australianStudyRequirement: number;
    professionalYear: number;
    credentialledCommunityLanguage: number;
    regionalStudy: number;
    total: number;
  };
  partner: number;
  stateNomination190: number;
};

export type SkilledPointsResult = {
  minimumThreshold: number;
  total189: number;
  total190: number;
  employmentCapApplied: boolean;
  age45OrOlder: boolean;
  breakdown: PointsBreakdown;
};
