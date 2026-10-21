import { parseExperienceYears } from "@/lib/intake/fields";
import { ABILITIES, CRS_FIELD } from "@/lib/points/canada-crs-intake";

/** The Canada CRS questions that must be answered (the spouse and second-language questions only when they apply). */
export const CANADA_CRS_REQUIRED_FIELDS = (values: Record<string, string>): string[] => [
  CRS_FIELD.spouse, ...ABILITIES.map(CRS_FIELD.firstLanguage), CRS_FIELD.education, CRS_FIELD.credentials, CRS_FIELD.secondLanguage,
  ...(values[CRS_FIELD.secondLanguage] === "tested" ? ABILITIES.map(CRS_FIELD.secondLanguageAbility) : []),
  CRS_FIELD.certificateOfQualification, CRS_FIELD.sibling, CRS_FIELD.canadianStudy, CRS_FIELD.provincialNomination,
  ...(values[CRS_FIELD.spouse] === "yes" ? [CRS_FIELD.spouseEducation, ...ABILITIES.map(CRS_FIELD.spouseLanguage), CRS_FIELD.spouseCanadianWork] : []),
  "offshoreExperienceYears", "onshoreExperienceYears",
];

/** Intake validation only: these checks do not decide visa eligibility. */
export function assessmentStepErrors(step: number, values: Record<string, string>, partner: boolean, australian: boolean): Record<string, "required" | "email" | "number"> {
  const canadian = values.targetCountry === "CA";
  const errors: Record<string, "required" | "email" | "number"> = {};
  const required = step === 1
    ? ["fullName", "contactEmail", "targetCountry", "currentCountry", "passportCountry", "age", ...(australian ? ["visaInterest", ...(!partner ? ["employerSponsorship", ...(values.currentCountry === "AU" ? ["residenceState"] : [])] : [])] : [])]
    : step === 2 ? partner ? ["relationshipType", "cohabitationDuration", "sponsorStatus", "previousSponsorship"] : ["occupation"]
    : partner ? [] : ["englishLevel", "qualificationLevel", "sponsorOrFamily"];
  // Canada: every CRS question is required so the CRS figure can be complete (lib/points/canada-crs-intake.ts).
  if (step === 3 && canadian && !partner) {
    required.push(...CANADA_CRS_REQUIRED_FIELDS(values));
  }
  for (const name of required) if (!values[name]?.trim()) errors[name] = "required";
  if (step === 1 && values.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.contactEmail.trim())) errors.contactEmail = "email";
  if (step === 1 && values.age && (!/^\d+$/.test(values.age) || Number(values.age) > 120)) errors.age = "number";
  if (step === 3 && !partner) {
    for (const name of ["offshoreExperienceYears", "onshoreExperienceYears"]) if (!parseExperienceYears(values[name]).ok) errors[name] = "number";
    if (values.annualSalaryAud && (!Number.isFinite(Number(values.annualSalaryAud)) || Number(values.annualSalaryAud) <= 0)) errors.annualSalaryAud = "number";
  }
  return errors;
}

export const ASSESSMENT_FIELD_IDS: Record<string, string> = {
  fullName: "waitlist-full-name", contactEmail: "waitlist-e", email: "waitlist-e", targetCountry: "waitlist-target-country", currentCountry: "waitlist-current-country", passportCountry: "waitlist-passport-country", age: "waitlist-age", visaInterest: "waitlist-target-visa", targetVisa: "waitlist-target-visa", employerSponsorship: "waitlist-employer-sponsorship", residenceState: "waitlist-residence-state", occupation: "waitlist-occupation", englishLevel: "waitlist-english", qualificationLevel: "waitlist-education", sponsorOrFamily: "waitlist-sponsor", annualSalaryAud: "waitlist-salary-aud", qualificationAwardedInAustralia: "waitlist-qualification-awarded-in-australia", offshoreExperienceYears: "waitlist-offshore-experience-years", onshoreExperienceYears: "waitlist-onshore-experience-years",
};
