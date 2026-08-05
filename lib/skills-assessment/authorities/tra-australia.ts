import type { SkillsAssessmentAuthority } from "../types";

/**
 * Trades Recognition Australia (TRA)
 * Source: TRA — Migration Skills Assessment Program Guidelines (July 2026)
 * Verified: 2026-08-05
 *
 * TRA covers 133 trade occupations. This module includes the most common ones.
 * Licensed occupations (Electrician, Plumber, Air-con Mechanic) MUST go through
 * OSAP for permanent migration — not just MSA.
 *
 * Key rule: "12 months in last 3 years" — this is a strict requirement
 * that must be prominently displayed in the report.
 */
export const traAustraliaAuthority: SkillsAssessmentAuthority = {
  authorityId: "TRA",
  authorityName: "Trades Recognition Australia",
  country: "AU",
  role: "Skills assessment only — TRA does not provide migration advice.",
  occupations: [
    { anzscoCode: "351311", title: "Chef" },
    { anzscoCode: "351411", title: "Cook" },
    { anzscoCode: "331212", title: "Carpenter" },
    { anzscoCode: "341111", title: "Electrician (General)" },
    { anzscoCode: "334111", title: "Plumber (General)" },
    { anzscoCode: "321211", title: "Motor Mechanic (General)" },
  ],
  lastVerified: "2026-08-05",
  sourceDocument:
    "Trades Recognition Australia — Migration Skills Assessment Program Guidelines (July 2026)",
  notes: [
    "TRA covers 133 trade occupations. This module includes the 6 most common; the rest are matched from the occupations registry.",
    "Licensed occupations (Electrician 341111, Plumber 334111, Air-con Mechanic 342111) MUST go through OSAP for permanent migration.",
    "CRITICAL: '12 months in last 3 years' rule — applicants must have at least 12 months full-time (or equivalent) work in the nominated occupation within the 3 years immediately prior to application.",
  ],
  fraudPolicy:
    "Penalties apply under the Crimes Act 1914 and the Criminal Code Act 1995 for making false or misleading statements. TRA may refuse subsequent applications for up to three years if bogus documents or false/misleading information is provided, and overturn existing successful outcomes.",
  validityPeriod: {
    years: 3,
    note: "Standard validity for TRA skills assessments is typically 3 years from the date of issue.",
  },
  englishRequirements: [
    {
      test: "Not Directly Assessed by TRA",
      minimumScore:
        "TRA does not conduct English testing as part of the MSA/OSAP process, but English requirements will apply for the visa application with DHA.",
    },
  ],
  pathways: [
    // ── Pathway 1: Migration Skills Assessment (MSA) ──────────────────
    {
      pathwayId: "MSA",
      name: "Migration Skills Assessment (MSA)",
      occupation: "ALL",
      eligibleFor: [
        "Applicants for skilled migration in occupations/countries not required to be assessed under OSAP",
      ],
      requiresPriorAssessment: false,
      fees: [
        { label: "Migration Skills Assessment", amountAUD: 795 },
        { label: "Migration Skills Assessment Review", amountAUD: 610 },
      ],
      processingTimeWeeks: {
        standard: 24,
        note: "Average processing time is 120 days (24 weeks) after all required documentary evidence is provided.",
      },
      documentRequirements: [
        "Passport identification page (colour scan, min 150 dpi, max 10MB).",
        "Proof of qualification(s) and full academic transcripts (short courses/unpaid work do not count).",
        "Apprenticeship documents (contract, journal, etc.) if applicable.",
        "Employer Template form for each employment period.",
        "Pay evidence: At least two sources required (e.g., Notice of Assessment, 3 payslips, Superannuation documents, Bank statements). For self-employed: At least three sources (Business Registration, Tax Returns, Invoices).",
        "NAATI certified translations for documents not in English.",
      ],
      notes: [
        "CRITICAL PRIVACY RULE: Applicants MUST delete or obscure sensitive information such as their Tax File Number (TFN) or bank account details/transactions not related to salary deposits before submitting.",
      ],
    },
    // ── Pathway 2: OSAP ────────────────────────────────────────────────
    {
      pathwayId: "OSAP",
      name: "Offshore Skills Assessment Program (OSAP)",
      occupation: "ALL",
      eligibleFor: [
        "Mandatory for licensed occupations (Electrician, Plumber, Air-conditioning Mechanic) applying for permanent migration",
        "Applicants holding passports from nominated countries for specific occupations (e.g., Chef, Fitter, Mechanic)",
      ],
      requiresPriorAssessment: false,
      fees: [
        { label: "Pathway 1: Documentary Evidence", amountAUD: 1120 },
        { label: "Pathway 1: Technical Interview", amountAUD: 2000 },
        { label: "Pathway 1: Practical Assessment (if required)", amountAUD: 2200 },
        { label: "Pathway 1 Total Max", amountAUD: 5320 },
        { label: "Pathway 2: Documentary Evidence", amountAUD: 1120 },
        { label: "Pathway 2: Technical Interview", amountAUD: 900 },
        { label: "Pathway 2 Total Max", amountAUD: 2020 },
      ],
      processingTimeWeeks: {
        standard: 15,
        note: "Processed within 15 weeks (approx 75 business days) of submission.",
      },
      documentRequirements: [
        "Documents are guided by the chosen RTO.",
        "Must obtain a unique RTO Assessment Payment Identifier Code for each step.",
      ],
      notes: [
        "Requires contacting a TRA-approved RTO directly via the RTO Finder before paying through the TRA Online Portal.",
        "Pathway 1: For applicants WITHOUT a relevant Australian VET qualification.",
        "Pathway 2: For applicants WITH a relevant Australian VET qualification or current Australian occupation licence.",
      ],
    },
  ],
  // ── Licensed occupations that MUST go through OSAP ──────────────────
  licensedOccupations: [
    "Electrician (General) - 341111",
    "Electrician (Special Class) - 341112",
    "Plumber (General) - 334111",
    "Air-conditioning and Refrigeration Mechanic - 342111",
  ],
};
