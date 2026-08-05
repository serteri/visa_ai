import type { SkillsAssessmentAuthority } from "../types";

/**
 * Occupational Therapy Council of Australia Ltd (OTC)
 * Source: OTC Assessment for Migration & Pathways to Evidence English
 *         Language Proficiency (June/April 2026)
 * Verified: 2026-08-05
 *
 * OTC covers only one occupation: Occupational Therapist (252411).
 * Unique: Desktop Assessment only — ALL documents must be JPEG colour
 * photographs. NO SCANS accepted. Identity verified via unscheduled video call.
 */
export const otcAustraliaAuthority: SkillsAssessmentAuthority = {
  authorityId: "OTC",
  authorityName: "Occupational Therapy Council of Australia Ltd",
  country: "AU",
  role: "Skills assessment only — OTC does not provide migration advice.",
  occupations: [
    { anzscoCode: "252411", title: "Occupational Therapist" },
  ],
  lastVerified: "2026-08-05",
  sourceDocument:
    "OTC Assessment for Migration & Pathways to Evidence English Language Proficiency (June/April 2026)",
  notes: [
    "OTC covers only one occupation: Occupational Therapist (ANZSCO 252411).",
    "Qualifications MUST be approved by the World Federation of Occupational Therapy (WFOT) at the time of graduation (no retrospective approval).",
    "ALL documents must be submitted as high-resolution JPEG colour photographs. NO SCANS ACCEPTED.",
    "Identity verification is done via an unscheduled video call — applicants must be prepared.",
  ],
  fraudPolicy:
    "If documents are suspected as fraudulent, they will be provided to the Department of Home Affairs (DoHA) for investigation. The assessment will be paused until DoHA advises.",
  validityPeriod: {
    years: 3,
    note: "The outcome from this assessment is valid for three years. A new application and fee of A$800 is required if the outcome expires.",
  },
  englishRequirements: [
    {
      test: "IELTS (Academic)",
      minimumScore: "7.0 overall (min 7.0 in L/R/S, 6.5 in W)",
      validityYears: 2,
    },
    {
      test: "PTE (Academic)",
      minimumScore: "58/59/69/76 (L/R/W/S)",
      validityYears: 2,
    },
    {
      test: "OET",
      minimumScore: "Min 350 in L/W, min 360 in R/S",
      validityYears: 2,
    },
    {
      test: "TOEFL iBT",
      minimumScore: "91 overall (min 22 L/R, 23 W, 24 S)",
      validityYears: 2,
    },
    {
      test: "Cambridge (C1 Advanced)",
      minimumScore: "178 overall (min 175 L, 179 R, 180 W, 194 S)",
      validityYears: 2,
    },
  ],
  englishExemptions: [
    "Applicants with education pathways completed solely in English from recognised countries (e.g., UK, USA, Canada, NZ, Ireland, South Africa, etc.) meeting specific criteria (Combined, School, or Advanced education pathways).",
  ],
  englishTestValidity:
    "Tests must be obtained within 2 years before lodging the application, OR more than 2 years if continuously working as an OT or continuously enrolled in a Board-approved program.",
  pathways: [
    {
      pathwayId: "DESKTOP_ASSESSMENT_MIGRATION",
      name: "Desktop Assessment for Migration",
      occupation: "252411",
      eligibleFor: [
        "Occupational therapists wanting to apply for skilled migration (ANZSCO 252411)",
      ],
      requiresPriorAssessment: false,
      fees: [
        {
          label: "Application for Assessment for Migration",
          amountAUD: 800,
        },
      ],
      processingTimeWeeks: {
        standard: 5,
        note: "Standard desktop assessments generally take 4-6 weeks once all correct JPEG files and payments are received.",
      },
      documentRequirements: [
        "Completed application form (PDF or Word).",
        "Proof of payment receipt.",
        "Birth certificate, Passport, additional photo ID, recent facial photograph (no older than 1 month).",
        "Testamur/letter of completion and full academic transcript.",
        "English test result statement OR evidence of education in a recognised country.",
        "NAATI accredited translations for non-English documents.",
      ],
      notes: [
        "CRITICAL: ALL documents MUST be submitted as high-resolution JPEG colour photographs. NO SCANS WILL BE ACCEPTED.",
        "To verify identity, the OTC will contact the practitioner via a brief unscheduled video call.",
        "Applications are submitted via email to migration@otcouncil.com.au.",
      ],
    },
  ],
};
