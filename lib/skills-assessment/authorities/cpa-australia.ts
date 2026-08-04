import type { SkillsAssessmentAuthority } from "../types";

/**
 * CPA Australia Ltd
 * Source: CPA Australia — Migration to Australia (official web content)
 * Verified: 2026-08-04
 *
 * CPA Australia is one of three assessing authorities for accounting occupations
 * (alongside CA ANZ and IPA). This module models only CPA Australia.
 */
export const cpaAustraliaAuthority: SkillsAssessmentAuthority = {
  authorityId: "CPA",
  authorityName: "CPA Australia Ltd",
  country: "AU",
  occupations: [
    { anzscoCode: "221111", title: "Accountant (General)" },
    { anzscoCode: "221212", title: "Corporate Treasurer" },
    { anzscoCode: "221213", title: "External Auditor" },
    { anzscoCode: "132211", title: "Finance Manager" },
    { anzscoCode: "221112", title: "Management Accountant" },
    { anzscoCode: "221113", title: "Taxation Accountant" },
  ],
  lastVerified: "2026-08-04",
  sourceDocument:
    "CPA Australia Ltd — Migration to Australia (official CPA Australia web content)",
  fraudPolicy:
    "CPA Australia may refuse an application without refund and report it to the Department of Home Affairs if fraudulent or misleading information is suspected, in either the qualification or skilled employment assessment. Altered references or additional information will not be accepted once an outcome has been determined.",
  validityPeriod: {
    years: 3,
    note: "Application valid for 3 years from the initial assessment outcome date. Updates, additional-ANZSCO assessments, skilled employment assessments, or reviews do NOT reset the expiry date. After expiry, a new application is required.",
  },
  notes: [
    "CPA Australia is one of three authorised assessing authorities for accounting occupations (alongside CA ANZ and IPA). This module models only CPA Australia.",
    "PRC (Chinese) qualification verification is recommended via VETASSESS — CPA Australia suggests applicants use VETASSESS for Chinese Degree Verification, and reports must be sent directly to migrationupload@cpaaustralia.com.au.",
  ],
  // ── Occupation Competency Mapping ───────────────────────────────────
  occupationCompetencyMapping: {
    note: "Each ANZSCO occupation requires a specific set of mandatory competencies for the educational-knowledge component of qualification assessment.",
    sharedCompetencies: [
      "Accounting Systems and Processes",
      "Economics",
      "Financial Accounting and Reporting",
      "Finance and Financial Management",
      "Management Accounting",
      "Quantitative Methods",
    ],
    byOccupation: {
      "Accountant (General) - 221111": [
        "Accounting Systems and Processes",
        "Economics",
        "Financial Accounting and Reporting",
        "Finance and Financial Management",
        "Management Accounting",
        "Quantitative Methods",
      ],
      "Corporate Treasurer - 221212": [
        "Business Law",
        "Economics",
        "Financial Accounting and Reporting",
        "Finance and Financial Management",
        "Management Accounting",
        "Quantitative Methods",
      ],
      "Finance Manager - 132211": [
        "Business Law",
        "Economics",
        "Financial Accounting and Reporting",
        "Finance and Financial Management",
        "Management Accounting",
        "Quantitative Methods",
      ],
      "Management Accountant - 221112": [
        "Accounting Systems and Processes",
        "Business Law",
        "Financial Accounting and Reporting",
        "Finance and Financial Management",
        "Management Accounting",
        "Quantitative Methods",
      ],
      "Taxation Accountant - 221113": [
        "Australian Taxation Law (must specifically cover Australian tax law)",
        "Financial Accounting and Reporting",
        "Finance and Financial Management",
        "Management Accounting",
        "Quantitative Methods",
      ],
      "External Auditor - 221213": [
        "Accounting Systems and Processes",
        "Audit and Assurance",
        "Economics",
        "Financial Accounting and Reporting",
        "Finance and Financial Management",
        "Quantitative Methods",
      ],
    },
  },
  englishRequirements: [
    {
      test: "Cambridge C1 Advanced",
      minimumScore:
        "Pre 7 Aug 2025: 185 all bands; Post 7 Aug 2025: 175/179/193/194 (L/R/W/S)",
    },
    {
      test: "IELTS Academic",
      minimumScore: "7.0 all bands",
      note: "Only Academic version accepted; OSR accepted for assessment but may not be accepted by DHA for some visa subclasses.",
    },
    {
      test: "PTE Academic",
      minimumScore:
        "Pre 7 Aug 2025: 65 all; Post 7 Aug 2025: 58/59/69/76 (L/R/W/S)",
    },
    {
      test: "TOEFL iBT",
      minimumScore:
        "Pre 7 Aug 2025: 24/24/27/23 (L/R/W/S); Post 7 Aug 2025: 22/22/26/24",
      note: "Tests taken 26 Jul 2023–5 May 2024 NOT accepted (unapproved test period).",
    },
    {
      test: "Michigan English Test (MET)",
      minimumScore: "61/63/74/59 (L/R/W/S)",
      note: "Only accepted for tests taken on/after 7 Aug 2025.",
    },
    {
      test: "LANGUAGECERT Academic",
      minimumScore: "67/71/78/82 (L/R/W/S)",
      note: "Only accepted for tests taken on/after 7 Aug 2025.",
    },
    {
      test: "CELPIP General",
      minimumScore: "9/8/10/8 (L/R/W/S)",
      note: "Only accepted for tests taken on/after 7 Aug 2025.",
    },
    {
      test: "Accounting Professional Year Program (PYP)",
      minimumScore: "N/A",
      note: "Completion certificate + transcript accepted in lieu of a language test; no expiry/validity period applies to this route.",
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
    "3 years from test date; must remain within validity at the time the qualification assessment outcome is issued, including for any update, review, or additional-ANZSCO request. 'At-home'/online test versions are never accepted.",
  pathways: [
    // ── Pathway 1: Qualification Assessment ────────────────────────────
    {
      pathwayId: "QUALIFICATION_ASSESSMENT",
      name: "Qualification Assessment",
      eligibleFor: [
        "All applicants seeking a CPA Australia skills assessment for a listed ANZSCO occupation",
      ],
      requiresPriorAssessment: false,
      fees: [
        { label: "Qualification assessment (onshore)", amountAUD: 565 },
        { label: "Qualification assessment (offshore)", amountAUD: 514 },
        {
          label: "Qualification assessment (Singapore)",
          amountAUD: 560,
          note: "Plus 9% Singapore GST for payments on/after 1 Jan 2024.",
        },
        { label: "Fast Track qualification assessment (onshore)", amountAUD: 675 },
        { label: "Fast Track qualification assessment (offshore)", amountAUD: 614 },
        { label: "Fast Track qualification assessment (Singapore)", amountAUD: 669 },
        {
          label: "Qualification assessment — Additional ANZSCO (onshore)",
          amountAUD: 260,
        },
        {
          label: "Qualification assessment — Additional ANZSCO (offshore)",
          amountAUD: 236,
        },
        {
          label: "Qualification assessment — Additional ANZSCO (Singapore)",
          amountAUD: 257,
        },
        { label: "Fast Track — Additional ANZSCO (onshore)", amountAUD: 310 },
        { label: "Fast Track — Additional ANZSCO (offshore)", amountAUD: 282 },
        { label: "Fast Track — Additional ANZSCO (Singapore)", amountAUD: 307 },
        {
          label: "Qualification assessment — Update (onshore)",
          amountAUD: 185,
        },
        {
          label: "Qualification assessment — Update (offshore)",
          amountAUD: 168,
        },
        {
          label: "Qualification assessment — Update (Singapore)",
          amountAUD: 183,
        },
        { label: "Review (onshore)", amountAUD: 185 },
        { label: "Review (offshore)", amountAUD: 168 },
        { label: "Review (Singapore)", amountAUD: 183 },
        {
          label: "Administration fee (withdrawal before work commenced, onshore)",
          amountAUD: 85,
        },
        { label: "Administration fee (offshore)", amountAUD: 77 },
        { label: "Administration fee (Singapore)", amountAUD: 84 },
      ],
      processingTimeWeeks: {
        standard: 2,
        ifIncomplete: 12,
        note: "Fast Track applies only to Qualification Assessment and Qualification Assessment — Additional ANZSCO. Excludes weekends, public holidays, and year-end office closure.",
      },
      documentRequirements: [
        "Passport (photo page) or national ID card.",
        "Official name-change document if applicable.",
        "English language proficiency evidence (unless exempt): PYP certificate + transcript OR recognised test result.",
        "Official academic award/degree certificates.",
        "Official academic transcripts, including prior-study transcripts if exemptions were granted.",
        "Official translations (with originals) for non-English academic documents.",
        "Professional body membership certificate + exam results/marksheets, if applicable.",
        "Official syllabus for non-CPA-accredited qualifications (or statutory declaration in exceptional circumstances).",
        "Chinese Degree Verification for PRC qualifications — verification body must send reports directly to CPA Australia.",
        "Third-party authorisation form if a migration agent is managing the application.",
      ],
      notes: [
        "Accredited course search tool available to check if a qualification is pre-recognised (skips syllabus submission requirement).",
      ],
    },
    // ── Pathway 2: Skilled Employment Assessment ────────────────────────
    {
      pathwayId: "SKILLED_EMPLOYMENT_ASSESSMENT",
      name: "Skilled Employment Assessment",
      eligibleFor: [
        "Applicants who have received a 'Suitable' qualification assessment outcome for their nominated ANZSCO code",
      ],
      requiresPriorAssessment: true,
      fees: [
        { label: "Skilled employment assessment (onshore)", amountAUD: 260 },
        { label: "Skilled employment assessment (offshore)", amountAUD: 236 },
        { label: "Skilled employment assessment (Singapore)", amountAUD: 257 },
        {
          label: "Combined — Qualification + skilled employment (onshore)",
          amountAUD: 620,
        },
        {
          label: "Combined — Qualification + skilled employment (offshore)",
          amountAUD: 564,
        },
        {
          label: "Combined — Qualification + skilled employment (Singapore)",
          amountAUD: 615,
        },
        {
          label: "Combined — Qualification + skilled employment, Additional ANZSCO (onshore)",
          amountAUD: 350,
        },
        {
          label: "Combined — Additional ANZSCO (offshore)",
          amountAUD: 318,
        },
        {
          label: "Combined — Additional ANZSCO (Singapore)",
          amountAUD: 347,
        },
        {
          label: "Skilled employment assessment — Update (onshore)",
          amountAUD: 185,
        },
        {
          label: "Skilled employment assessment — Update (offshore)",
          amountAUD: 168,
        },
        {
          label: "Skilled employment assessment — Update (Singapore)",
          amountAUD: 183,
        },
      ],
      documentRequirements: [
        "Employer testimonial per role (letterhead with full business contact details; signed by a person at a higher level than the applicant, with direct work contact details; complete DD/MM/YYYY start-end dates per role; specific duties in the employer's own words — no generic/ABS-copied descriptions; employment terms, weekly hours, annual salary).",
        "Minimum 3 pay slips per claimed role (start, middle, end of role ideally).",
        "Self-employed: testimonial on official letterhead + statutory declaration of truthfulness, business registration, practising certificate, tax returns (first/middle/final year), 2+ client references.",
      ],
      notes: [
        "CVs/resumes are NOT accepted as employment evidence.",
        "No new/altered references accepted after an outcome has been determined.",
        "Statutory declaration may substitute an employer testimonial only if a letterhead reference is genuinely unobtainable, and must still include all standard testimonial content.",
      ],
    },
  ],
};
