import type { SkillsAssessmentAuthority } from "../types";

/**
 * Civil Aviation Safety Authority (CASA)
 * Source: Civil Aviation Safety Authority — Skills Assessment for Migration
 * Verified: 2026-08-05
 *
 * CASA assesses only pilot occupations. Unique requirements:
 * - Australian flight crew licence (CPL or ATPL) mandatory
 * - Overseas pilots must convert licences in Australia (requires travel)
 * - Aviation English Language Proficiency (AELP) Level 4 — NOT IELTS/PTE
 * - Minimum 5 years of flying for work immediately prior to application
 */
export const casaAustraliaAuthority: SkillsAssessmentAuthority = {
  authorityId: "CASA",
  authorityName: "Civil Aviation Safety Authority",
  country: "AU",
  role: "Skills assessment only — CASA does not provide migration advice.",
  occupations: [
    { anzscoCode: "231111", title: "Aeroplane Pilot" },
    { anzscoCode: "231113", title: "Flying Instructor" },
    { anzscoCode: "231114", title: "Helicopter Pilot" },
  ],
  lastVerified: "2026-08-05",
  sourceDocument: "Civil Aviation Safety Authority — Skills Assessment for Migration",
  notes: [
    "CASA assesses only pilot occupations — not engineers, technicians, or other aviation roles.",
    "Overseas pilots MUST convert their licences first, which requires travelling to Australia for medicals, exams, and a flight test.",
    "Aviation English Language Proficiency (AELP) Level 4 is the mandatory English requirement — standard IELTS/PTE are NOT accepted.",
    "Form 79 must be submitted through the myCASA online portal.",
  ],
  fraudPolicy:
    "General fraudulent information guidelines apply. Applications must be strictly supported by certified true copies and verified logbooks.",
  validityPeriod: {
    years: 3,
    note: "Standard validity for skills assessments. Logbooks and medical checks must be current at time of application.",
  },
  englishRequirements: [
    {
      test: "Aviation English Language Proficiency (AELP)",
      minimumScore: "Level 4 (Minimum)",
      note: "Standard IELTS/PTE are NOT accepted. AELP Level 4 is the mandatory aviation-specific English requirement.",
    },
  ],
  englishExemptions: [],
  englishTestValidity: "AELP must be current at time of application.",
  pathways: [
    // ── Pathway: Pilot Skills Assessment (Form 79) ────────────────────
    {
      pathwayId: "PILOT_SKILLS_ASSESSMENT",
      name: "Pilot Skills Assessment (Form 79)",
      occupation: "ALL",
      eligibleFor: [
        "Pilots applying for a visa under the skilled occupations list (SOL) or Employer Nomination Scheme occupation list (ENSOL)",
      ],
      requiresPriorAssessment: false,
      fees: [
        {
          label: "Skills Assessment (Form 79)",
          amountAUD: 100,
          note: "This is the base fee. Converting overseas qualifications, medicals, exams, or flight tests will incur additional significant costs.",
        },
      ],
      processingTimeWeeks: {
        standard: 3,
        note: "Usually takes around 14 business days to process applications. Incomplete forms are sent back and not processed.",
      },
      documentRequirements: [
        "Form 79 — Skills assessment for the purpose of migration application (submitted via myCASA).",
        "Evidence of at least 5 years flying for work immediately to the date of submission.",
        "Written evidence of work (e.g., referees or statement of service letters from previous Aviation employers).",
        "Certified true copies of logbook openings showing evidence of flying in previous jobs.",
        "Last completed logbook page of flying experience.",
        "English translations by NAATI (in Australia) or verified by Australian Embassy/Consulate (overseas) for non-English documents.",
        "Third-party release of information section must be completed if using an agent.",
      ],
      notes: [
        "Applications must be submitted securely through the myCASA online portal.",
        "Overseas pilots MUST convert their licences first, which requires travelling to Australia.",
        "Licence conversion involves: medical examination, written exams, and flight test — all conducted in Australia.",
        "5 years of flying experience must be IMMEDIATELY PRIOR to application submission — no gaps allowed.",
      ],
    },
  ],
};
