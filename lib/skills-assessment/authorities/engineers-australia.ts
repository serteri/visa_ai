import type { SkillsAssessmentAuthority } from "../types";

/**
 * Engineers Australia (The Institution of Engineers Australia)
 * Source: Engineers Australia — Prepare your Migration Skills Assessment application
 *         (official guide) + EA web content
 * Verified: 2026-08-04
 *
 * NOTE: The source PDF (175 pages) is mostly the accredited-program list.
 * Fees and processing times are NOT listed — marked as null.
 * English requirements changed for tests taken on/after 7 August 2025.
 */
export const engineersAustraliaAuthority: SkillsAssessmentAuthority = {
  authorityId: "EA",
  authorityName: "Engineers Australia (The Institution of Engineers Australia)",
  country: "AU",
  lastVerified: "2026-08-04",
  sourceDocument:
    "Engineers Australia — Prepare your Migration Skills Assessment application (official guide) + EA web content",
  notes: [
    "Engineers Australia is the largest Australian assessing authority by occupation count (27+ engineering occupations across 4 categories).",
    "Assessment outcome is a 'Skill Level' (Professional Engineer / Engineering Technologist / Engineering Associate), NOT a occupation-specific pass/fail.",
    "The Competency Demonstration Report (CDR) pathway is the most common for overseas-qualified engineers.",
  ],
  englishRequirements: [
    {
      test: "IELTS (General or Academic, incl. One Skill Retake)",
      minimumScore: "6 all bands",
      note: "Same threshold pre and post 7 Aug 2025. See TOEFL/PTE/Cambridge/LANGUAGECERT/MET/CELPIP for changed thresholds post 7 Aug 2025.",
    },
    {
      test: "TOEFL iBT",
      minimumScore:
        "Pre 7 Aug 2025: 12/13/21/18 (L/R/W/S); Post 7 Aug 2025: 16/16/19/19",
    },
    {
      test: "PTE Academic",
      minimumScore:
        "Pre 7 Aug 2025: 50 all; Post 7 Aug 2025: 47/48/51/54 (L/R/W/S)",
    },
    {
      test: "Cambridge C1 Advanced",
      minimumScore: "169 all bands (both periods)",
    },
    {
      test: "LANGUAGECERT Academic Test",
      minimumScore: "57/60/64/70 (L/R/W/S), post 7 Aug 2025 table only",
    },
    {
      test: "Michigan English Test (MET)",
      minimumScore: "56/55/57/48 (L/R/W/S), post 7 Aug 2025 table only",
    },
    {
      test: "CELPIP General",
      minimumScore: "7 all bands, post 7 Aug 2025 table only",
    },
  ],
  englishExemptions: [
    "Graduated from an Australian institution with two academic years of study (min. 92 weeks) at a CRICOS-registered institution, AQF level 6 or above.",
    "Citizen and valid passport holder of UK, USA, Canada, New Zealand, or Republic of Ireland.",
  ],
  englishTestValidity:
    "Test must be taken within 3 years before lodging and remain valid/verifiable during assessment.",
  validityPeriod: {
    years: 3,
    note: "The Department of Home Affairs requires a valid skills assessment outcome at time of invitation. An updated outcome letter service is available if the original assessment is more than 3 years old.",
  },
  fraudPolicy:
    "Plagiarism (including career episodes or summary statements written by a third party) results in immediate application rejection and a 12, 24, or 36-month ban on reapplying. Engineers Australia may impose or extend a ban at any stage and may report details to the Department of Home Affairs.",
  // Occupations: 27 engineering roles across 233xxx/312xxx/133211 series.
  // Mapped from occupations.json where authority === "Engineers Australia".
  occupations: [
    { anzscoCode: "233911", title: "Aeronautical Engineer" },
    { anzscoCode: "233912", title: "Agricultural Engineer" },
    { anzscoCode: "233913", title: "Biomedical Engineer" },
    { anzscoCode: "233111", title: "Chemical Engineer" },
    { anzscoCode: "233211", title: "Civil Engineer" },
    { anzscoCode: "312211", title: "Civil Engineering Draftsperson" },
    { anzscoCode: "233311", title: "Electrical Engineer" },
    { anzscoCode: "312311", title: "Electrical Engineering Draftsperson" },
    { anzscoCode: "312312", title: "Electrical Engineering Technician" },
    { anzscoCode: "312412", title: "Electronic Engineering Technician" },
    { anzscoCode: "233411", title: "Electronics Engineer" },
    { anzscoCode: "312411", title: "Electronic Engineering Draftsperson" },
    { anzscoCode: "133211", title: "Engineering Manager" },
    { anzscoCode: "233999", title: "Engineering Professionals nec" },
    { anzscoCode: "233914", title: "Engineering Technologist" },
    { anzscoCode: "233915", title: "Environmental Engineer" },
    { anzscoCode: "233212", title: "Geotechnical Engineer" },
    { anzscoCode: "233511", title: "Industrial Engineer" },
    { anzscoCode: "233112", title: "Materials Engineer" },
    { anzscoCode: "233512", title: "Mechanical Engineer" },
    { anzscoCode: "312511", title: "Mechanical Engineering Draftsperson" },
    { anzscoCode: "312512", title: "Mechanical Engineering Technician" },
    { anzscoCode: "233612", title: "Petroleum Engineer" },
    { anzscoCode: "233916", title: "Naval Architect" },
    { anzscoCode: "233214", title: "Structural Engineer" },
    { anzscoCode: "263311", title: "Telecommunications Engineer" },
    { anzscoCode: "263312", title: "Telecommunications Network Engineer" },
  ],
  // ── Occupational Categories ──────────────────────────────────────────
  occupationalCategories: [
    {
      name: "Professional Engineer",
      qualification:
        "Four-year professional engineering degree accredited or recognised by Engineers Australia, or comparable overseas qualification, or a degree accredited under the Washington Accord.",
      skillFocus:
        "Overall systems, developing and applying new engineering practices, leadership and management, holistic problem-solving.",
    },
    {
      name: "Engineering Technologist",
      qualification:
        "Three-year engineering technology degree accredited or recognised by Engineers Australia, or comparable overseas qualification, or a degree accredited under the Sydney Accord.",
      skillFocus:
        "System interactions, modifying and adapting established engineering practices, advancing engineering technology.",
    },
    {
      name: "Engineering Associate",
      qualification:
        "Two-year advanced diploma or associate degree in engineering, accredited or recognised by Engineers Australia, or comparable overseas qualification, or a degree accredited under the Dublin Accord.",
      skillFocus:
        "Specific system elements, working within codes, applying established practices and procedures.",
    },
    {
      name: "Engineering Manager",
      qualification:
        "Bachelor of Engineering degree or comparable qualification in a related field, plus relevant experience.",
      skillFocus:
        "Formulating, implementing and monitoring engineering strategies and plans; directing engineering operations.",
      notes: [
        "ANZSCO occupation under the Managers group, not an Engineers Australia membership occupational category.",
        "A positive outcome does not grant automatic Engineers Australia membership.",
        "Relevant Skilled Employment Assessment is mandatory for this category.",
      ],
    },
  ],
  pathways: [
    // ── Pathway 1: Australian Qualification ──────────────────────────────
    {
      pathwayId: "AU_QUALIFICATION",
      name: "Australian Qualification Pathway (accredited)",
      eligibleFor: [
        "Program accredited by Engineers Australia",
        "Program started during or after the accreditation commencement year",
      ],
      requiresPriorAssessment: false,
      fees: [
        {
          label: "Application fee",
          amountAUD: undefined,
          note: "Not stated in source document; confirm current fee schedule on Engineers Australia website.",
        },
      ],
      documentRequirements: [
        "High-resolution colour scan of valid passport bio data page.",
        "Change of name documents (if applicable).",
        "Recent high-resolution colour passport-sized photograph.",
        "Detailed CV.",
        "Evidence of English language competency (unless exempt).",
        "High-resolution colour scan of qualifications incl. degree certificate/testamur.",
        "High-resolution colour scan of academic transcripts, with official English translation if applicable.",
      ],
      notes: [
        "From 1 September 2024, only qualifications accredited by Engineers Australia are eligible for this pathway for Advanced Diploma/Associate Degree holders.",
      ],
    },
    // ── Pathway 2: Washington Accord ─────────────────────────────────────
    {
      pathwayId: "WASHINGTON_ACCORD",
      name: "Washington Accord Pathway (accredited, Professional Engineer level)",
      eligibleFor: [
        "Accredited qualification from a Washington Accord signatory country",
        "French engineering degree under the CTI agreement",
        "Spanish Master of Industrial Engineering registered by CGCOII",
        "Spanish Master of Civil Engineering with CICCP registration evidence",
      ],
      requiresPriorAssessment: false,
      fees: [
        {
          label: "Application fee",
          amountAUD: undefined,
          note: "Not stated in source document.",
        },
      ],
      documentRequirements: [
        "Same as Australian Qualification Pathway document list.",
      ],
    },
    // ── Pathway 3: Sydney Accord ────────────────────────────────────────
    {
      pathwayId: "SYDNEY_ACCORD",
      name: "Sydney Accord Pathway (accredited, Engineering Technologist level)",
      eligibleFor: [
        "Accredited qualification from a Sydney Accord signatory country",
      ],
      requiresPriorAssessment: false,
      fees: [
        {
          label: "Application fee",
          amountAUD: undefined,
          note: "Not stated in source document.",
        },
      ],
      documentRequirements: [
        "Same as Australian Qualification Pathway document list.",
      ],
    },
    // ── Pathway 4: Dublin Accord ────────────────────────────────────────
    {
      pathwayId: "DUBLIN_ACCORD",
      name: "Dublin Accord Pathway (accredited, Engineering Associate level)",
      eligibleFor: [
        "Accredited qualification from a Dublin Accord signatory country",
      ],
      requiresPriorAssessment: false,
      fees: [
        {
          label: "Application fee",
          amountAUD: undefined,
          note: "Not stated in source document.",
        },
      ],
      documentRequirements: [
        "Same as Australian Qualification Pathway document list.",
      ],
    },
    // ── Pathway 5: CDR ─────────────────────────────────────────────────
    {
      pathwayId: "CDR",
      name: "Competency Demonstration Report (CDR) Pathway",
      eligibleFor: [
        "Provisionally-accredited Australian qualification",
        "Non-accredited engineering qualification",
        "Accredited qualification but seeking assessment in a different occupation than the degree title",
        "Qualification(s) demonstrating underpinning knowledge aligned with the nominated occupation",
        "Engineering Manager nomination with evidence of relevant skilled employment",
      ],
      requiresPriorAssessment: false,
      minAcademicLevel: "AQF Level 6 (Advanced Diploma / Associate Degree) minimum",
      fees: [
        {
          label: "Application fee",
          amountAUD: undefined,
          note: "Not stated in source document.",
        },
      ],
      documentRequirements: [
        "High-resolution colour scan of valid passport bio data page.",
        "Change of name documents (if applicable).",
        "Recent high-resolution colour passport-sized photograph.",
        "Detailed CV.",
        "Evidence of English language competency (unless exempt).",
        "Degree certificate/testamur (colour scan, with translation if applicable).",
        "Licensure/registration certificate (if applicable).",
        "Academic transcripts (colour scan, with translation if applicable).",
        "Written statement of continuing professional development (CPD).",
        "Three career episodes.",
        "Summary statement (occupational-category-specific template).",
      ],
      competencyAssessment: {
        portfolioProjectsMin: 3,
        portfolioProjectsMax: 3,
        interviewDurationMinutes: 0,
        topicAreas: [
          "Career Episode 1 — personal engineering activity",
          "Career Episode 2 — personal engineering activity",
          "Career Episode 3 — personal engineering activity",
          "Summary Statement — cross-reference to 16 stage-1 competency elements",
        ],
      },
      notes: [
        "Must demonstrate all 16 stage-1 competency elements at least once across the three career episodes.",
        "Each paragraph in a career episode is numbered for cross-referencing in the summary statement.",
        "Employer reference letter required if career episodes are employment-based.",
        "31 engineering occupations available in the CDR dropdown, as determined by the Australian government (ANZSCO). Choosing an occupation auto-populates skill level, ANZSCO code, and occupational category.",
      ],
    },
  ],
  // ── Additional Assessment Services ────────────────────────────────────
  additionalAssessmentServices: [
    {
      name: "Overseas PhD qualification assessment",
      additionalDocuments: [
        "Thesis abstract.",
        "List of doctoral examiners with contact details and profile link.",
        "List of publications during/after doctoral program with links.",
      ],
    },
    {
      name: "Relevant Skilled Employment Assessment",
      mandatoryFor: ["Engineering Manager occupational category"],
      employeeDocuments: {
        primary: [
          "Reference letter on company letterhead: employment type, pay rate, employment period, job title, issuing manager/HR endorsement with contact details, company stamp if applicable, letter date, at least 5 main engineering duties.",
        ],
        secondary: [
          "Income tax/superannuation/social security/retirement contribution statements, OR work/residence permit or employment contract.",
        ],
      },
      selfEmployedDocuments: [
        "Client/contractor letters.",
        "Original invoices.",
        "Organisational chart.",
        "Business registration certificate.",
        "Business tax report.",
        "Bank statements.",
        "Optional: payroll tax receipts, personal income tax return, social security/pension contributions, business financial report, compliance letter.",
      ],
    },
    {
      name: "Updated outcome letter",
      when:
        "Original assessment outcome older than 3 years, or to update title/name/address",
      documentRequirements: [
        "Valid passport bio data page.",
        "Recent passport photo.",
        "Detailed CV.",
      ],
    },
  ],
  // ── Excluded Evidence ─────────────────────────────────────────────────
  excludedEvidence: [
    "Statutory declarations and affidavits.",
    "Bank statements and payslips as secondary employment documents.",
    "Work experience claimed before qualification completion.",
    "Research/teaching assistant work during PhD/MPhil as relevant skilled employment.",
    "Lecturer/demonstrator/tutor roles as relevant skilled employment (different ANZSCO classification).",
  ],
};
