import type { SkillsAssessmentAuthority } from "../types";

/**
 * Australian Institute of Medical Scientists (AIMS)
 * / Australian Institute of Medical and Clinical Scientists
 *
 * Source: "Guide to Employer Assisted Professional and Skills Qualifications"
 * (GEAPSQ v7.0, 10/2023) + AIMS Migration Skills Assessment web page
 * (English requirements updated 12 March 2026)
 * Verified: 2026-08-04
 *
 * IMPORTANT: The source document (GEAPSQ v7.0) is titled "Guide to Employer
 * Assisted Professional and Skills Qualifications" — an employer-assisted
 * assessment, NOT necessarily a standard individual Migration Skills Assessment.
 * AIMS may have a separate individual MSA process. This ambiguity is flagged
 * in `assessmentContext` rather than resolved by assumption.
 *
 * No fees are published in the guide; AIMS directs applicants to its website.
 * No English exemptions exist (all applicants must provide test scores).
 */
export const aimsAuthority: SkillsAssessmentAuthority = {
  authorityId: "AIMS",
  authorityName:
    "Australian Institute of Medical Scientists (AIMS) / Australian Institute of Medical and Clinical Scientists",
  country: "AU",
  occupations: [
    { anzscoCode: "234611", title: "Medical Laboratory Scientist" },
    { anzscoCode: "311213", title: "Medical Laboratory Technician" },
  ],
  assessmentContext:
    "Source document (GEAPSQ v7.0) is titled 'Guide to Employer Assisted Professional and Skills Qualifications' — an employer-assisted skills and qualifications assessment. AIMS explicitly states this specific assessment is NOT valid for individual immigration purposes on its own; verify with AIMS / Department of Home Affairs whether a separate individual Migration Skills Assessment application is required, or whether this employer-assisted outcome satisfies the same DHA requirement. Flag this ambiguity to the user rather than asserting either way.",
  lastVerified: "2026-08-04",
  sourceDocument:
    "AIMS — Guide to Employer Assisted Professional and Skills Qualifications (GEAPSQ v7.0, 10/2023) + AIMS Qualification and Skills Assessments for Migration web page (English requirements updated 12 March 2026)",
  fraudPolicy:
    "Application rejected and applicant banned from submitting further AIMS applications for 2 years from the date of notification of suspected fraudulent documents.",
  validityPeriod: {
    years: 3,
    note: "Valid for 3 years from the date of the original Stage 1 Skills Assessment Results Letter. Amendment (not renewal) is possible only with evidence of experience/qualifications obtained BEFORE the original assessment date; evidence obtained after requires a brand new full application and fee.",
  },
  processingTime: {
    standardWeeks: 16,
    maxWeeksIfVerificationDelayed: 26,
    note: "AIMS aims to complete assessments within 16 weeks; document verification may extend this to up to 6 months (~26 weeks). No express/priority service is offered under any circumstances. Pending applications held for up to 1 year from receipt to allow issue rectification.",
  },
  reviewAndAppeal: {
    review: {
      feeAUD: 0,
      windowMonths: 1,
      note: "Written request via email within 1 month of receiving the Stage 1 Skills Assessment Results Letter. Conducted by the same committee that made the original assessment. Free of charge.",
    },
    appeal: {
      windowMonths: 1,
      note: "Written request within 1 month of receiving the Stage 1 AIMS Review Results Letter. Conducted by a different committee than the original assessment. Fee applies — refer to AIMS website for current amount (not stated in source).",
    },
  },
  fees: [
    {
      label: "All AIMS assessment fees",
      amountAUD: undefined,
      note: "Source document states fees are not published in the guide itself — 'Refer to the AIMS website for current fees.' All fees are non-refundable once preliminary work has commenced.",
    },
  ],
  englishRequirements: [
    {
      test: "IELTS (Academic or General Training)",
      minimumScore: "7.0 all 4 components",
    },
    {
      test: "TOEFL iBT",
      minimumScore: "24 listening / 24 reading / 27 writing / 23 speaking (total ≥98)",
    },
    {
      test: "PTE Academic",
      minimumScore:
        "65 all 4 components; must be submitted online directly by the test-taker to AIMS",
    },
    {
      test: "Occupational English Test (OET)",
      minimumScore:
        "Grade B or ≥350 each component; must have been completed in Medicine, Nursing, Dentistry, Pharmacy, or Veterinary Science to be considered relevant by AIMS",
    },
    {
      test: "Cambridge C1 Advanced",
      minimumScore: "185 all 4 components",
    },
  ],
  englishTestValidity:
    "Must be received by AIMS, with the skills assessment application, within 3 years of the test date. No exemptions of any kind — mandatory for all applicants.",
  englishExemptions: [],
  pathways: [
    // ── MLS Option 1: AIMS Accredited Degree ───────────────────────────
    {
      pathwayId: "MLS_OPTION_1",
      occupation: "Medical Laboratory Scientist — ANZSCO 234611",
      name: "Option 1 — AIMS Accredited Degree",
      eligibleFor: [
        "Completed an AIMS-accredited bachelor's or master's program (see AIMS Accredited University Programs list)",
      ],
      examRequired: false,
      fees: [{ label: "Assessment fee", amountAUD: undefined }],
      documentRequirements: [],
      notes: [
        "Applicant's units must comply with the AIMS-accredited subject pathway held on file at the university — verify with the program co-ordinator if uncertain.",
      ],
    },
    // ── MLS Option 2: Acceptable Science Degree + Professional Exam ─────
    {
      pathwayId: "MLS_OPTION_2",
      occupation: "Medical Laboratory Scientist — ANZSCO 234611",
      name: "Option 2 — Acceptable Science Degree + Professional Examination",
      eligibleFor: [
        "AQF level 7/8/9 science degree (or combination) covering AIMS foundation subjects (Chemistry, Statistics, Cell & Tissue Biology, Biochemistry, Microbiology, Genetics & Molecular Biology) plus basic studies in all professional disciplines and advanced studies in ≥2 (preferably 3) of: Pathophysiology, Anatomical Pathology/Histopathology, Chemical Pathology, Genomic Pathology, Haematology, Immunopathology, Medical Microbiology, Transfusion Science",
        "Minimum 2 years full-time (or part-time equivalent) postgraduate professional experience in a medical pathology laboratory, at least 1 year within the 5 years immediately prior to application",
      ],
      examRequired: true,
      examDetails: {
        name: "AIMS Medical Laboratory Scientist Professional Examination",
        format: "150 single-response MCQ, 3 hours, online remote-proctored",
        sittings: "Twice yearly — March and September",
        sections: [
          { discipline: "Anatomical Pathology", questions: 14, mustPass: true },
          { discipline: "Chemical Pathology", questions: 30, mustPass: true },
          { discipline: "Genomic Pathology", questions: 16, mustPass: false },
          { discipline: "Haematology", questions: 30, mustPass: true },
          { discipline: "Immunopathology", questions: 14, mustPass: false },
          { discipline: "Medical Microbiology", questions: 26, mustPass: true },
          { discipline: "Transfusion Science", questions: 20, mustPass: true },
        ],
        passRequirement:
          "≥80/150 correct overall AND ≥50% in each asterisked (must-pass) discipline",
      },
      fallback:
        "Applicants who don't qualify to sit, or who fail, may instead be assessed as suitable for Medical Laboratory Technician (ANZSCO 311213).",
      fees: [{ label: "Assessment + examination fee", amountAUD: undefined }],
      documentRequirements: [],
    },
    // ── MLS Option 3: Postgraduate Studies + Experience ─────────────────
    {
      pathwayId: "MLS_OPTION_3",
      occupation: "Medical Laboratory Scientist — ANZSCO 234611",
      name: "Option 3 — Postgraduate Studies with Medical Laboratory Experience",
      eligibleFor: [
        "Science degree(s) in life/biological/medical/biomedical/veterinary science, PLUS a taught Master's (AQF 9) with a pathology-lab research project, OR a professional doctorate (AQF 10), OR a PhD (AQF 10) with a laboratory-technique research topic applicable to human disease diagnosis/treatment/monitoring/prevention",
        "Minimum 2 years full-time (or part-time equivalent) relevant post-doctoral employment in a medical pathology laboratory, at least 1 year within the 5 years immediately prior to application",
      ],
      examRequired: true,
      examDetails: {
        name: "AIMS Medical Laboratory Scientist Special Professional Examination",
        format: "Essay, short-answer, and MCQ paper, 2 hours, online remote-proctored",
        sittings: "Twice yearly — March and September",
        topics: [
          "Laboratory accreditation",
          "Quality control/assurance/systems",
          "Pre-analytic factors",
          "Laboratory operations regulations (health & safety, sample transport, waste disposal)",
          "Ethics",
          "Patient information integrity",
        ],
        passRequirement: "≥50%",
      },
      notes: [
        "Purely research-environment postgraduate employment is not favourably considered — must be in a medical pathology laboratory context relating to human disease.",
      ],
      fallback:
        "Applicants who don't qualify to sit, or who fail, may instead be assessed as suitable for Medical Laboratory Technician (ANZSCO 311213).",
      fees: [{ label: "Assessment + examination fee", amountAUD: undefined }],
      documentRequirements: [],
    },
    // ── MLT Option 1: Diploma + Work Experience ─────────────────────────
    {
      pathwayId: "MLT_OPTION_1",
      occupation: "Medical Laboratory Technician — ANZSCO 311213",
      name: "Option 1 — Diploma + Work Experience",
      eligibleFor: [
        "Award comparable to an Australian diploma (min. AQF Level 5, TAFE-equivalent) with pathology-relevant subjects (Haematology, Chemical Pathology, Histopathology, Blood Banking, etc.)",
        "Minimum 2 years full-time (or part-time equivalent) diagnostic medical pathology laboratory experience, wholly within the 5 years immediately prior to application",
      ],
      examRequired: false,
      fees: [{ label: "Assessment fee", amountAUD: undefined }],
      documentRequirements: [],
      notes: [
        "No professional examination required for Medical Laboratory Technician assessment under any option.",
      ],
    },
    // ── MLT Option 2: NZ Registration ──────────────────────────────────
    {
      pathwayId: "MLT_OPTION_2",
      occupation: "Medical Laboratory Technician — ANZSCO 311213",
      name: "Option 2 — New Zealand Registration",
      eligibleFor: [
        "Current FULL (not provisional) registration with the Medical Sciences Council of New Zealand as a Medical Laboratory Technician",
      ],
      examRequired: false,
      fees: [{ label: "Assessment fee", amountAUD: undefined }],
      documentRequirements: [],
    },
  ],
  documentRequirements: [
    "1 colour digital photograph, taken within last 6 months, plain light background, not self-taken.",
    "Colour scan of birth certificate.",
    "Colour scans of 2+ additional ID documents (passport bio-page, national ID, driver's licence, social security card, marriage certificate, student ID, or Australian visa).",
    "English language test report (mandatory, no exemptions — see englishRequirements).",
    "Professional registration/licence proof if the role required registration/licensing in the country of practice (AIMS verifies directly with the issuing body).",
    "Professional membership certificate (colour scan).",
    "Qualification certificate/testamur or statement of completion, for each qualification.",
    "Complete official academic transcript showing full subject names, for each qualification.",
    "Unit/subject descriptions (syllabus) for all relevant units — NOT required for AIMS-accredited degree graduates.",
    "Thesis abstract (incl. research methods) if holding a PhD/MPhil/Masters by Research.",
  ],
  transcriptVerification: {
    australianUniversities:
      "Via My eQuals system — share directly with applications@aims.org.au, or email a cryptographically signed PDF.",
    australianVET:
      "Via Unique Student Identifier (USI) portal — generate a viewable VET transcript link and email the PDF to applications@aims.org.au.",
    nonAustralianInstitutions:
      "Original institution must post/courier the official transcript directly to AIMS in a sealed, signed-and-stamped envelope. An opened envelope or one without a stamp/signature across the back flap will be rejected.",
    postalAddress:
      "Australian Institute of Medical and Clinical Scientists, P.O. Box 1911, MILTON QLD 4064, AUSTRALIA",
    courierAddress:
      "Australian Institute of Medical and Clinical Scientists, Unit 7 / 31 Black Street, MILTON QLD 4064, AUSTRALIA",
  },
  excludedEvidence: [
    "Research work undertaken for a PhD/MPhil/Masters by Research is not recognised as professional experience.",
    "Employment averaging less than 35 hours/week has reduced recognition (see source for partial-time handling).",
    "Living allowances/scholarships designed to cover study expenses do not count as 'remunerated' employment.",
  ],
};
