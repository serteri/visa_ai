import type { SkillsAssessmentAuthority } from "../types";

/**
 * Chartered Accountants Australia and New Zealand (CA ANZ)
 * Source: CA ANZ Migration Skills Assessment — PDF (22 pages)
 * Verified: 2026-08-04
 *
 * Fee schedule effective 1 July 2026 — "current" values below.
 * Previous fees (pre-1 Jul 2026) are retained as `previousFeeAUD` for historical reference.
 */
export const caanzAuthority: SkillsAssessmentAuthority = {
  authorityId: "CA-ANZ",
  authorityName: "Chartered Accountants Australia and New Zealand",
  country: "AU",
  role: "Skills assessment only — CA ANZ does not provide migration advice and does not advise on visa eligibility.",
  occupations: [
    { anzscoCode: "221111", title: "Accountant (General)" },
    { anzscoCode: "221112", title: "Management Accountant" },
    { anzscoCode: "221113", title: "Taxation Accountant" },
    { anzscoCode: "221212", title: "Corporate Treasurer" },
    { anzscoCode: "221213", title: "External Auditor" },
    { anzscoCode: "132211", title: "Finance Manager" },
  ],
  lastVerified: "2026-08-04",
  sourceDocument:
    "Chartered Accountants Australia and New Zealand — Migration Skills Assessment (PDF, 22 pages)",
  notes: [
    "CA ANZ full members pay $0 for all assessment services (noted in fee schedule).",
    "Provisional assessment was discontinued effective 1 July 2024.",
    "CA ANZ is one of three authorised assessing authorities for accounting occupations (alongside CPA Australia and IPA).",
  ],
  pathways: [
    {
      pathwayId: "qualification-assessment",
      name: "Qualification Assessment",
      occupation: "ALL",
      requiresPriorAssessment: false,
      eligibleFor: ["All applicants seeking a CA ANZ skills assessment for a listed ANZSCO occupation"],
      fees: [
        { label: "Qualification assessment (onshore)", amountAUD: 565 },
        { label: "Qualification assessment (offshore)", amountAUD: 514 },
        { label: "Qualification assessment (Singapore)", amountAUD: 560 },
        { label: "Fast Track qualification assessment (onshore)", amountAUD: 675 },
        { label: "Fast Track qualification assessment (offshore)", amountAUD: 614 },
        { label: "Fast Track qualification assessment (Singapore)", amountAUD: 669 },
      ],
      documentRequirements: [
        "Passport (photo page) or national ID card.",
        "Official name-change document if applicable.",
        "English language proficiency evidence (unless exempt): PYP certificate + transcript OR recognised test result.",
        "Official academic award/degree certificates.",
        "Official academic transcripts, including prior-study transcripts if exemptions were granted.",
        "Official translations (with originals) for non-English academic documents.",
        "Professional body membership certificate + exam results/marksheets, if applicable.",
        "Official syllabus for non-accredited qualifications (or statutory declaration in exceptional circumstances).",
        "Chinese Degree Verification for PRC qualifications — verification body must send reports directly to CA ANZ.",
      ],
      notes: [
        "Accredited course search tool available to check if a qualification is pre-recognised.",
        "AQF Level 7+ equivalence required; CEP/UK ENIC reference for overseas comparability.",
      ],
    },
    {
      pathwayId: "employment-assessment",
      name: "Skilled Employment Assessment",
      occupation: "ALL",
      requiresPriorAssessment: true,
      prerequisite: "qualification-assessment",
      fallback: "Cannot be assessed without a 'Suitable' qualification assessment outcome.",
      fees: [
        { label: "Employment only (onshore)", amountAUD: 260 },
        { label: "Employment only (offshore)", amountAUD: 236 },
        { label: "Employment only (Singapore)", amountAUD: 257 },
      ],
      documentRequirements: [
        "Employer testimonial per role: letterhead, full contact details, signature from higher-level person, DD/MM/YYYY dates, specific duties, employment terms, weekly hours, annual salary.",
        "Minimum 3 pay slips per role (start, middle, end of role ideally).",
        "Self-employed: testimonial + statutory declaration + business registration + practising certificate + tax returns + 2+ client references.",
      ],
      notes: [
        "CVs/resumes are NOT accepted as employment evidence.",
        "No new/altered references accepted after an outcome has been determined.",
        "Employment must be within 10 years, minimum 1 year, minimum 20 hours/week, paid and continuous.",
        "At least 12 months in the most recent 12-month period.",
      ],
    },
    {
      pathwayId: "combined",
      name: "Combined Qualification + Skilled Employment Assessment",
      occupation: "ALL",
      requiresPriorAssessment: false,
      fees: [
        { label: "Combined (onshore)", amountAUD: 620 },
        { label: "Combined (offshore)", amountAUD: 564 },
        { label: "Combined (Singapore)", amountAUD: 615 },
        { label: "Additional ANZSCO (onshore)", amountAUD: 350 },
        { label: "Additional ANZSCO (offshore)", amountAUD: 318 },
        { label: "Additional ANZSCO (Singapore)", amountAUD: 347 },
      ],
      documentRequirements: [
        "All documents from Qualification Assessment pathway.",
        "All documents from Skilled Employment Assessment pathway.",
      ],
      notes: [
        "If qualification outcome is 'Not Suitable', the employment assessment is automatically determined as 'Not Suitable' — no separate employment outcome is issued.",
      ],
    },
  ],
  englishRequirements: [
    {
      test: "IELTS Academic",
      minimumScore: "7.0 all bands",
      validityYears: 3,
    },
    {
      test: "PTE Academic",
      minimumScore: "Pre-7 Aug 2025: 65 all; Post-7 Aug 2025: 58/59/69/76 (L/R/W/S)",
      validityYears: 3,
    },
    {
      test: "TOEFL iBT",
      minimumScore: "Pre-7 Aug 2025: 24/24/27/23 (L/R/W/S); Post-7 Aug 2025: 22/22/26/24",
      validityYears: 3,
    },
    {
      test: "Cambridge C1 Advanced",
      minimumScore: "Pre-7 Aug 2025: 185 all bands; Post-7 Aug 2025: 175/179/193/194 (L/R/W/S)",
      validityYears: 3,
    },
    {
      test: "CELPIP General",
      minimumScore: "9/8/10/8 (L/R/W/S)",
      validityYears: 3,
    },
    {
      test: "LANGUAGECERT Academic",
      minimumScore: "67/71/78/82 (L/R/W/S)",
      validityYears: 3,
    },
    {
      test: "MET",
      minimumScore: "61/63/74/59 (L/R/W/S)",
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
  englishTestValidity: "3 years from test date. Online/at-home test versions are NOT accepted.",
  assessmentContext:
    "CA ANZ is one of three authorised accounting assessing authorities (alongside CPA Australia and IPA). The source document covers migration skills assessment only — CA ANZ does not provide migration advice.",
  competencyMatrix: {
    columns: ["221111", "221112", "132211", "221212", "221113", "221213"],
    rows: [
      { area: "Accounting Systems & Processes", status: ["Mandatory", "Mandatory", "Mandatory", null, null, null], _needsVerification: false },
      { area: "Financial Accounting & Reporting", status: ["Mandatory", "Mandatory", "Mandatory", null, null, null], _needsVerification: false },
      { area: "Management Accounting", status: ["Mandatory", "Mandatory", "Mandatory", null, null, null], _needsVerification: false },
      { area: "Finance & Financial Management", status: ["Mandatory", "Mandatory", "Mandatory", null, null, null], _needsVerification: false },
      { area: "Economics", status: ["Mandatory", "Mandatory", "Mandatory", null, null, null], _needsVerification: false },
      { area: "Quantitative Methods", status: ["Mandatory", "Mandatory", "Mandatory", null, null, null], _needsVerification: false },
      { area: "Business Law", status: ["Optional", "Optional", "Optional", null, null, null], _needsVerification: false },
      { area: "Taxation Law", status: ["Optional", "Optional", "Optional", null, null, null], _needsVerification: false },
      { area: "Audit & Assurance", status: ["Optional", "Optional", "Optional", null, null, null], _needsVerification: false },
    ],
  },
  feesSchedule: [
    { type: "Qualification assessment (onshore)", currentFeeAUD: 565, previousFeeAUD: 540, processingTime: "10 business days", effectiveDate: "2026-07-01" },
    { type: "Qualification assessment (offshore)", currentFeeAUD: 514, previousFeeAUD: 491, effectiveDate: "2026-07-01" },
    { type: "Qualification assessment (Singapore)", currentFeeAUD: 560, previousFeeAUD: 535, effectiveDate: "2026-07-01" },
    { type: "Fast Track qualification assessment (onshore)", currentFeeAUD: 675, previousFeeAUD: 645, processingTime: "5 business days", effectiveDate: "2026-07-01" },
    { type: "Fast Track qualification assessment (offshore)", currentFeeAUD: 614, previousFeeAUD: 589, effectiveDate: "2026-07-01" },
    { type: "Fast Track qualification assessment (Singapore)", currentFeeAUD: 669, previousFeeAUD: 640, effectiveDate: "2026-07-01" },
    { type: "Employment only (onshore)", currentFeeAUD: 260, previousFeeAUD: 248, processingTime: "10 business days", effectiveDate: "2026-07-01" },
    { type: "Employment only (offshore)", currentFeeAUD: 236, previousFeeAUD: 225, effectiveDate: "2026-07-01" },
    { type: "Employment only (Singapore)", currentFeeAUD: 257, previousFeeAUD: 246, effectiveDate: "2026-07-01" },
    { type: "Combined qual+employment (onshore)", currentFeeAUD: 620, previousFeeAUD: 590, processingTime: "10 business days", effectiveDate: "2026-07-01" },
    { type: "Combined qual+employment (offshore)", currentFeeAUD: 564, previousFeeAUD: 537, effectiveDate: "2026-07-01" },
    { type: "Combined qual+employment (Singapore)", currentFeeAUD: 615, previousFeeAUD: 586, effectiveDate: "2026-07-01" },
    { type: "Additional ANZSCO — Qual (onshore)", currentFeeAUD: 260, previousFeeAUD: 248, effectiveDate: "2026-07-01" },
    { type: "Additional ANZSCO — Qual (offshore)", currentFeeAUD: 236, previousFeeAUD: 225, effectiveDate: "2026-07-01" },
    { type: "Additional ANZSCO — Qual (Singapore)", currentFeeAUD: 257, previousFeeAUD: 246, effectiveDate: "2026-07-01" },
    { type: "Additional ANZSCO — Combined (onshore)", currentFeeAUD: 350, previousFeeAUD: 333, effectiveDate: "2026-07-01" },
    { type: "Additional ANZSCO — Combined (offshore)", currentFeeAUD: 318, previousFeeAUD: 303, effectiveDate: "2026-07-01" },
    { type: "Additional ANZSCO — Combined (Singapore)", currentFeeAUD: 347, previousFeeAUD: 331, effectiveDate: "2026-07-01" },
    { type: "Update — Qual (onshore)", currentFeeAUD: 185, previousFeeAUD: 176, effectiveDate: "2026-07-01" },
    { type: "Update — Qual (offshore)", currentFeeAUD: 168, previousFeeAUD: 160, effectiveDate: "2026-07-01" },
    { type: "Update — Qual (Singapore)", currentFeeAUD: 183, previousFeeAUD: 174, effectiveDate: "2026-07-01" },
    { type: "Review — single (onshore)", currentFeeAUD: 185, previousFeeAUD: 176, effectiveDate: "2026-07-01" },
    { type: "Review — single (offshore)", currentFeeAUD: 168, previousFeeAUD: 160, effectiveDate: "2026-07-01" },
    { type: "Review — single (Singapore)", currentFeeAUD: 183, previousFeeAUD: 174, effectiveDate: "2026-07-01" },
    { type: "Update — Employment (onshore)", currentFeeAUD: 185, previousFeeAUD: 176, effectiveDate: "2026-07-01" },
    { type: "Update — Employment (offshore)", currentFeeAUD: 168, previousFeeAUD: 160, effectiveDate: "2026-07-01" },
    { type: "Update — Employment (Singapore)", currentFeeAUD: 183, previousFeeAUD: 174, effectiveDate: "2026-07-01" },
    { type: "Reissue of Outcome Letter", currentFeeAUD: 0, previousFeeAUD: 0, note: "Free of charge", effectiveDate: "2026-07-01" },
    { type: "Withdrawal administration fee", currentFeeAUD: 85, previousFeeAUD: 81, effectiveDate: "2026-07-01" },
  ],
  processingNotes: {
    initialReviewDays: 10,
    additionalInfoResponseDays: 20,
    holdPeriodMonths: { before20260101: 6, from20260101: 4 },
    urgentProcessing: {
      available: true,
      criteria: [
        "Visa expiry within 20 business days",
        "Formal invitation deadline from Department of Home Affairs",
        "Age limit approaching (within 12 months of turning 45)",
      ],
    },
  },
  outcomeAndValidity: {
    validityYears: 3,
    reassessmentWindowDays: 60,
    reissueFee: "Free of charge",
  },
  reviewAppealFraud: {
    internalReview: {
      windowDays: 28,
      newDocumentsAccepted: false,
    },
    externalAppeal: {
      windowDays: 28,
      tribunal: "Administrative Review Tribunal (ART)",
    },
    fraudPolicy: {
      responseWindowDays: 20,
      banYears: 3,
      feeRefunded: false,
    },
  },
  discontinuedPrograms: [
    {
      name: "Accounting Professional Year Program (APYP)",
      closureDate: "2026-05-01",
      note: "Former participants may still be eligible for 5 points under the points test, but the points system is under review by Home Affairs.",
    },
  ],
  requiredDocuments: {
    identity: [
      "Passport (photo page).",
      "Name change evidence (statutory declaration or official document).",
      "Recent passport photo.",
    ],
    englishProficiencyEvidence: [
      "Official language test result (IELTS Academic, PTE, TOEFL, Cambridge, CELPIP, LANGUAGECERT, MET) OR",
      "Accounting Professional Year Program (APYP) completion certificate + transcript (accepted in lieu of a language test).",
    ],
    educationalQualifications: [
      "Official degree certificate/testamur or statement of completion.",
      "Official academic transcripts.",
      "My eQuals verification link (AU qualifications) sent to CA ANZ.",
    ],
    professionalMembership: [
      "Professional body membership certificate (if applicable).",
      "Exam results/marksheets.",
      "Good-standing letter (less than 3 months old at time of submission).",
    ],
    translations: [
      "Original + certified translation for non-English documents.",
      "Certified translator must be NAATI-accredited (AU) or equivalent (overseas).",
    ],
    syllabusOrCourseDescription: [
      "Required for non-accredited degree programs.",
    ],
    chineseQualificationVerification: [
      "Separate verification service required for PRC qualifications.",
      "CA ANZ recommends VETASSESS for this verification.",
    ],
    skilledEmploymentDocuments: [
      "Reference letter: letterhead, full contact details, signature from higher-level person, DD/MM/YYYY dates, specific duties, employment terms, weekly hours, annual salary.",
      "Minimum 3 pay slips per role (start, middle, end of role ideally).",
      "Alternative documents: tax records, bank statements, employment contracts.",
      "Statutory declaration: may supplement but cannot substitute a reference letter.",
    ],
    selfEmployedDocuments: [
      "Client/contractor letters.",
      "Business registration certificate.",
      "Tax returns (first/middle/final year).",
      "Statutory declaration of truthfulness.",
      "2+ client references.",
    ],
    scanningRequirements: {
      format: ["PDF", "JPEG", "PNG"],
      maxSizeMB: 20,
      dpi: 600,
      noEncryption: true,
    },
  },
};
