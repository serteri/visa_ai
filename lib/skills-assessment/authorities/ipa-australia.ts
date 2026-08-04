import type { SkillsAssessmentAuthority } from "../types";

/**
 * Institute of Public Accountants Ltd (IPA)
 * Source: IPA — Migration to Australia (official evaluation document)
 * Verified: 2026-08-05
 *
 * IPA covers the same 6 accounting occupations as CPA Australia and CA ANZ.
 * In the authority registry, IPA is registered but CPA Australia and CA ANZ
 * are prioritised (CPA first, CA ANZ second) per project requirements.
 * IPA serves as the third option for accounting skills assessment.
 */
export const ipaAustraliaAuthority: SkillsAssessmentAuthority = {
  authorityId: "IPA",
  authorityName: "Institute of Public Accountants Ltd",
  country: "AU",
  role: "Skills assessment only — IPA does not provide migration advice.",
  occupations: [
    { anzscoCode: "221111", title: "Accountant (General)" },
    { anzscoCode: "221213", title: "External Auditor" },
    { anzscoCode: "221112", title: "Management Accountant" },
    { anzscoCode: "221113", title: "Taxation Accountant" },
    { anzscoCode: "132211", title: "Finance Manager" },
    { anzscoCode: "221212", title: "Corporate Treasurer" },
  ],
  lastVerified: "2026-08-05",
  sourceDocument: "Institute of Public Accountants Ltd — Migration to Australia",
  notes: [
    "IPA covers the same 6 accounting occupations as CPA Australia and CA ANZ.",
    "Qualification must be equivalent to a relevant Australian Bachelor degree or higher.",
    "A full 12-16 unit Master of Professional Accounting without exemptions from an accredited Australian University is accepted as equivalent to a Bachelor.",
  ],
  fraudPolicy:
    "If false or fraudulent information is identified, IPA will issue an unsuitable outcome letter, report the matter to DHA, and may impose a temporary ban on future skills assessment applications. To prevent fraud, IPA will not accept altered references at any time after the initial application is lodged or an outcome is provided. Job duties copied directly from the ABS website are not acceptable.",
  validityPeriod: {
    years: 3,
    note: "English tests are accepted if undertaken within the past three years. Validity of the assessment outcome letter aligns with standard DHA migration rules (typically 3 years).",
  },
  occupationCompetencyMapping: {
    note: "To meet educational standards, the qualification must include adequate coverage of the required core competency areas.",
    sharedCompetencies: [
      "Basic Accounting",
      "Cost & Management Accounting",
      "Financial Accounting & Reporting",
      "Financial Management",
      "Business Law (including Corporate Law)",
      "Economics",
      "Statistics",
    ],
    byOccupation: {
      "Accountant (General) - 221111": [
        "Basic Accounting",
        "Cost & Management Accounting",
        "Financial Accounting & Reporting",
        "Financial Management",
        "Business Law (including Corporate Law)",
        "Economics",
        "Statistics",
      ],
      "Management Accountant - 221112": [
        "Basic Accounting",
        "Cost & Management Accounting",
        "Financial Accounting & Reporting",
        "Financial Management",
        "Business Law (including Corporate Law)",
        "Economics",
        "Statistics",
      ],
      "Finance Manager - 132211": [
        "Basic Accounting",
        "Cost & Management Accounting",
        "Financial Accounting & Reporting",
        "Financial Management",
        "Business Law (including Corporate Law)",
        "Economics",
        "Statistics",
      ],
      "Corporate Treasurer - 221212": [
        "Basic Accounting",
        "Cost & Management Accounting",
        "Financial Accounting & Reporting",
        "Financial Management",
        "Business Law (including Corporate Law)",
        "Economics",
        "Statistics",
      ],
      "Taxation Accountant - 221113": [
        "Basic Accounting",
        "Cost & Management Accounting",
        "Financial Accounting & Reporting",
        "Financial Management",
        "Business Law (including Corporate Law)",
        "Economics",
        "Statistics",
        "Tax Law (Australian Tax Law)",
      ],
      "External Auditor - 221213": [
        "Basic Accounting",
        "Cost & Management Accounting",
        "Financial Accounting & Reporting",
        "Financial Management",
        "Business Law (including Corporate Law)",
        "Economics",
        "Statistics",
        "Auditing & Assurance",
      ],
    },
  },
  englishRequirements: [
    {
      test: "IELTS Academic",
      minimumScore: "7.0 all bands",
      note: "OSR accepted from May 2023; must provide both standard report and OSR result.",
      validityYears: 3,
    },
    {
      test: "PTE Academic",
      minimumScore: "58/59/69/76 (L/R/W/S) for tests taken from 7 Aug 2025 onwards",
      validityYears: 3,
    },
    {
      test: "TOEFL iBT",
      minimumScore: "22/22/26/24 (L/R/W/S)",
      note: "Tests taken between 26 July 2023 and 4 May 2024 are NOT acceptable.",
      validityYears: 3,
    },
    {
      test: "Cambridge C1 Advanced",
      minimumScore: "175/179/193/194 (L/R/W/S) for tests taken from 7 Aug 2025 onwards",
      validityYears: 3,
    },
    {
      test: "CELPIP General",
      minimumScore: "9/8/10/8 (L/R/W/S) for tests taken from 7 Aug 2025 onwards",
      validityYears: 3,
    },
    {
      test: "Michigan English Test (MET)",
      minimumScore: "61/63/74/59 (L/R/W/S) for tests taken from 7 Aug 2025 onwards",
      validityYears: 3,
    },
    {
      test: "LANGUAGECERT Academic",
      minimumScore: "67/71/78/82 (L/R/W/S) for tests taken from 7 Aug 2025 onwards",
      validityYears: 3,
    },
  ],
  englishExemptions: [
    "Passport holder of Canada",
    "Passport holder of New Zealand",
    "Passport holder of the Republic of Ireland",
    "Passport holder of the United Kingdom",
    "Passport holder of the United States of America",
  ],
  englishTestValidity:
    "Within the past three years if the score reports can be verified with the providers.",
  pathways: [
    // ── Pathway 1: Qualification Assessment ────────────────────────────
    {
      pathwayId: "QUALIFICATION_ASSESSMENT",
      name: "Qualification Assessment",
      occupation: "ALL",
      eligibleFor: [
        "Applicants seeking to migrate to Australia as an accounting professional under GSM",
      ],
      requiresPriorAssessment: false,
      fees: [
        { label: "Standard Qualification Assessment", amountAUD: 595 },
        { label: "Priority Qualification Assessment", amountAUD: 795 },
        { label: "Qualification reassessment within 12 months", amountAUD: 235 },
        { label: "Qualification reassessment over 12 months", amountAUD: 595 },
        { label: "Priority reassessment", amountAUD: 795 },
        { label: "Review", amountAUD: 235 },
        { label: "Standard GSM upgrade", amountAUD: 180 },
        { label: "Priority GSM upgrade", amountAUD: 550 },
        { label: "Administration Fee / Replacement Letter", amountAUD: 90 },
      ],
      processingTimeWeeks: {
        standard: 1.5,
        ifIncomplete: 12,
        note: "Standard is 7 business days; Priority guarantees a response within 1-2 business days.",
      },
      documentRequirements: [
        "Passport ID page (clear, high-quality colour copy).",
        "University Degree Certificates or official completion letter.",
        "Official academic transcripts or mark sheets showing individual grades.",
        "Official syllabus details/subject outlines (required for non-Australian universities).",
        "Valid English language test results.",
        "Secondary/High School certificates and mark sheets (ONLY if degree was completed from a Subcontinental country) — conditional.",
        "Marriage certificate or formal evidence of name change (if applicable).",
        "NAATI certified translations for any document not in English.",
      ],
      notes: [
        "Certification is not required at this stage as DHA conducts further checks.",
        "Priority service expedites processing but does not guarantee a successful outcome.",
      ],
    },
    // ── Pathway 2: Skilled Employment Assessment ────────────────────────
    {
      pathwayId: "SKILLED_EMPLOYMENT_ASSESSMENT",
      name: "Skilled Employment Assessment",
      occupation: "ALL",
      eligibleFor: [
        "Applicants who hold a successful qualifications assessment outcome from IPA",
      ],
      requiresPriorAssessment: true,
      prerequisite: "QUALIFICATION_ASSESSMENT",
      fees: [
        { label: "Skilled Employment (Standard)", amountAUD: 300 },
        { label: "Priority Skilled Employment", amountAUD: 795 },
      ],
      processingTimeWeeks: {
        standard: 1.5,
        ifIncomplete: 12,
        note: "Applications are placed in the queue based on the date of the Qualification Assessment outcome letter.",
      },
      documentRequirements: [
        "References on company or government department letterhead.",
        "Contracts of Employment.",
        "Tax Returns.",
        "Payslips.",
      ],
      notes: [
        "IPA does not reassess or review skilled employment outcomes after a decision has been made.",
        "Altered references will not be accepted at any time after initial lodgement.",
      ],
    },
  ],
};
