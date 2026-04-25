import type {
  AgeOption,
  AustralianEmploymentOption,
  EducationOption,
  EnglishOption,
  OverseasEmploymentOption,
  PartnerOption,
  SkilledPointsInput,
  SkilledPointsResult,
} from "@/lib/points/types";

const MINIMUM_THRESHOLD = 65;

const AGE_POINTS: Record<AgeOption, number> = {
  "18_24": 25,
  "25_32": 30,
  "33_39": 25,
  "40_44": 15,
  "45_plus": 0,
};

const ENGLISH_POINTS: Record<EnglishOption, number> = {
  competent: 0,
  proficient: 10,
  superior: 20,
};

const OVERSEAS_EMPLOYMENT_POINTS: Record<OverseasEmploymentOption, number> = {
  lt3: 0,
  "3_4": 5,
  "5_7": 10,
  "8_plus": 15,
};

const AUSTRALIAN_EMPLOYMENT_POINTS: Record<AustralianEmploymentOption, number> = {
  lt1: 0,
  "1_2": 5,
  "3_4": 10,
  "5_7": 15,
  "8_plus": 20,
};

const EDUCATION_POINTS: Record<EducationOption, number> = {
  doctorate: 20,
  bachelor_or_higher: 15,
  australian_diploma_or_trade: 10,
  assessing_authority_recognised: 10,
  none_or_unsure: 0,
};

const PARTNER_POINTS: Record<PartnerOption, number> = {
  partner_skilled: 10,
  partner_competent_english: 5,
  single_or_partner_au_citizen_or_pr: 10,
  none_or_unsure: 0,
};

export function calculateSkilledPoints(input: SkilledPointsInput): SkilledPointsResult {
  const age = AGE_POINTS[input.age];
  const english = ENGLISH_POINTS[input.english];
  const overseasEmployment = OVERSEAS_EMPLOYMENT_POINTS[input.overseasEmployment];
  const australianEmployment = AUSTRALIAN_EMPLOYMENT_POINTS[input.australianEmployment];
  const education = EDUCATION_POINTS[input.education];
  const partner = PARTNER_POINTS[input.partner];

  const employmentCombinedBeforeCap = overseasEmployment + australianEmployment;
  const employmentCombinedAfterCap = Math.min(employmentCombinedBeforeCap, 20);
  const employmentCapApplied = employmentCombinedBeforeCap > employmentCombinedAfterCap;

  const specialistEducation = input.specialistEducation ? 10 : 0;
  const australianStudyRequirement = input.australianStudyRequirement ? 5 : 0;
  const professionalYear = input.professionalYear ? 5 : 0;
  const credentialledCommunityLanguage = input.credentialledCommunityLanguage ? 5 : 0;
  const regionalStudy = input.regionalStudy ? 5 : 0;
  const bonusTotal =
    specialistEducation +
    australianStudyRequirement +
    professionalYear +
    credentialledCommunityLanguage +
    regionalStudy;

  const stateNomination190 = input.hasStateNomination190 ? 5 : 0;
  const nominationOrSponsorship491 = input.hasNominationOrSponsorship491 ? 15 : 0;

  const baseTotal =
    age +
    english +
    employmentCombinedAfterCap +
    education +
    bonusTotal +
    partner;

  return {
    minimumThreshold: MINIMUM_THRESHOLD,
    total189: baseTotal,
    total190: baseTotal + stateNomination190,
    total491: baseTotal + nominationOrSponsorship491,
    employmentCapApplied,
    age45OrOlder: input.age === "45_plus",
    breakdown: {
      age,
      english,
      overseasEmployment,
      australianEmployment,
      employmentCombinedBeforeCap,
      employmentCombinedAfterCap,
      education,
      bonus: {
        specialistEducation,
        australianStudyRequirement,
        professionalYear,
        credentialledCommunityLanguage,
        regionalStudy,
        total: bonusTotal,
      },
      partner,
      stateNomination190,
      nominationOrSponsorship491,
    },
  };
}
