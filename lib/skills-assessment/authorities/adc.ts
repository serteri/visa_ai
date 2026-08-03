import type { SkillsAssessmentAuthority } from "../types";

/**
 * Australian Dental Council Limited (ADC)
 * Source: ADC Skills Assessment overview (ADC website content)
 * Verified: 2026-08-04
 *
 * NOTE: This data is sourced from publicly available ADC overview pages.
 * Fee schedule, processing times, and English requirements are NOT listed
 * in the source document — marked as null. Do not fabricate values.
 */
export const adcAuthority: SkillsAssessmentAuthority = {
  authorityId: "ADC",
  authorityName: "Australian Dental Council Limited",
  country: "AU",
  lastVerified: "2026-08-04",
  sourceDocument:
    "Australian Dental Council Limited — Skills Assessment overview (ADC website content)",
  englishRequirements: [],
  validityPeriod: {
    years: 3,
    note:
      "Skills assessment is valid for three years from the date of issue, per the Department of Home Affairs. A lapsed assessment can be reissued by ADC on request; an administrative fee applies.",
  },
  occupations: [
    { anzscoCode: "252311", title: "Dental Specialist" },
    { anzscoCode: "252312", title: "Dentist" },
  ],
  pathways: [
    // ── Pathway 1: Skills Assessment Only ─────────────────────────────────
    // For dentists who already hold an eligible qualification from AU/NZ/UK/
    // Ireland/Canada — no registration process required.
    {
      pathwayId: "SKILLS_ASSESSMENT_ONLY",
      name: "Skills Assessment (no registration required)",
      eligibleFor: ["AU", "NZ", "UK", "IE", "CA"],
      requiresPriorAssessment: false,
      fees: [
        {
          label: "Skills assessment application fee",
          amountAUD: undefined,
          note:
            "Not stated in source document; confirm current fee via ADC Connect portal at time of application.",
        },
      ],
      documentRequirements: [
        "Current passport.",
        "Recent passport photo (meeting Australian passport photo guidelines, .jpg or .png).",
        "Evidence of change of name (if applicable).",
        "Dental qualification, official certificate, or testamur.",
        "Academic transcript.",
        "Internship certificate (if completed as part of qualification).",
        "Evidence of registration or licence to practise dentistry.",
        "Two written professional references.",
        "Evidence of practice or work history as a registered or licensed dentist.",
        "Certificate/letter of good standing sent directly to ADC by the regulating body (valid 3 months from issue if received before submission).",
        "Official English translation for any non-English documents.",
      ],
      notes: [
        "Applicants confirm registration type and application type at the start of the application on ADC Connect.",
        "For dentists, application type options are: initial assessment for registration, skills assessment, or both.",
        "This pathway covers dentists with eligible qualifications from: Australia, New Zealand, UK, Republic of Ireland, or Canada (obtained after March 2010, certified by the National Dental Examination Board of Canada).",
      ],
    },
    // ── Pathway 2: Registration + Skills Assessment ───────────────────────
    // For overseas-qualified dentists who do NOT meet the direct skills-
    // assessment-only criteria — must go through the full Dental
    // Practitioner Assessment process first, then can obtain the migration
    // skills assessment.
    {
      pathwayId: "REGISTRATION_AND_SKILLS",
      name: "Registration and Skills Assessment (Dental Practitioner Assessment)",
      eligibleFor: [],
      requiresPriorAssessment: true,
      fees: [
        {
          label: "Dental practitioner assessment process fee",
          amountAUD: undefined,
          note: "Not stated in source document.",
        },
        {
          label: "Subsequent migration skills assessment (post-registration-assessment)",
          amountAUD: 0,
          note:
            "No additional charge — offered once the dental practitioner assessment process is complete, if required for migration purposes.",
        },
      ],
      documentRequirements: [
        "Same core document set as Skills Assessment Only pathway (see above).",
        "Must select 'registration only' application type on ADC Connect if not eligible for the direct skills-assessment pathway.",
      ],
      notes: [
        "Further detail on this pathway sits with the Dental Board of Australia registration process, not solely with ADC.",
        "This pathway is for overseas-qualified dentists seeking Australian registration who do not meet the direct skills-assessment-only criteria (i.e. not from AU/NZ/UK/Ireland/Canada).",
      ],
    },
  ],
};
