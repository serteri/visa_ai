import type { SkillsAssessmentAuthority } from "../types";

/**
 * Architects Accreditation Council of Australia (AACA)
 * Source: AACA OQA Applicants Guide, October 2025
 * Verified: 2025-10-01
 */
export const aacaAuthority: SkillsAssessmentAuthority = {
  authorityId: "AACA",
  authorityName: "Architects Accreditation Council of Australia",
  country: "AU",
  occupations: [
    { anzscoCode: "232111", oscaCode: "241131", title: "Architect" },
  ],
  lastVerified: "2025-10-01",
  sourceDocument: "AACA OQA Applicants Guide, October 2025",
  englishRequirements: [
    {
      test: "IELTS Academic (incl. One Skill Retake)",
      minimumScore: "Overall band 6.5",
    },
    {
      test: "PTE Academic",
      minimumScore: "Overall score 61",
    },
    {
      test: "Cambridge English (C1 Advanced / CAE)",
      minimumScore: "Overall score 176",
    },
    {
      test: "TOEFL iBT",
      minimumScore: "Overall score 85",
    },
    {
      test: "OET",
      minimumScore: "N/A",
      note: "Listed as accepted but primarily designed for health professionals.",
    },
    {
      test: "Employer letter (AU residents only)",
      minimumScore: "N/A",
      note:
        "Only valid if the applicant currently resides in Australia and the letter confirms professional-level English from a current architectural employer.",
    },
  ],
  validityPeriod: {
    years: 3,
    note:
      "Skilled Migration Assessment is valid for 3 years from date of issue, including the discontinued provisional Stage 1 assessment.",
  },
  fraudPolicy:
    "Submission of fraudulent documents results in immediate rejection, a lifetime ban from applying for any AACA assessment, and reporting to relevant authorities.",
  pathways: [
    {
      pathwayId: "OQA",
      name: "Overseas Qualifications Assessment (OQA)",
      requiresPriorAssessment: false,
      minWorkExperienceMonths: 6,
      qualificationDurationRequirement:
        "5-year full-time equivalent (10 semesters) coursework degree in architecture; research-only qualifications not eligible; a 4-year qualification may be accepted if it permits registration as an Architect in the home country",
      fees: [
        { label: "OQA — New Applicants", amountAUD: 4900 },
        {
          label: "OQA — Stage 2 only (legacy Stage 1 holders pre-1 March 2022)",
          amountAUD: 3000,
        },
        { label: "2nd Competency Assessment Interview", amountAUD: 0 },
        {
          label: "Renewal of OQA Skilled Migration Assessment",
          amountAUD: 440,
        },
      ],
      processingTimeWeeks: { standard: 7, ifIncomplete: 12 },
      documentRequirements: [
        "Scanned original certificate (colour, 300 dpi min, original language + certified English translation if needed).",
        "Scanned original academic transcripts.",
        "Statutory Declaration Form (witnessed).",
        "English language proficiency evidence (if program not delivered in English).",
        "Reference letter confirming min. 6 months post-graduate paid architectural work experience (on firm letterhead, with specific required fields: issue date, letterhead, applicant name, working hours/week, position title, employment period, duties, salary confirmation, referee contact — colleague references at same/lower level NOT accepted).",
        "CV/Resume listing academic and professional project experience.",
        "Evidence of registration as an Architect (if applicable).",
        "Evidence of name change (if applicable).",
        "Form 956 (Department of Home Affairs) if using a migration agent.",
        "Scanned ID documents (1 photo ID + 2 of: passport, driver's licence, national ID, visa, birth certificate, etc.).",
        "Payment of application fee.",
      ],
      competencyAssessment: {
        portfolioProjectsMin: 3,
        portfolioProjectsMax: 4,
        interviewDurationMinutes: 60,
        topicAreas: [
          "Design Studies and Design Integration",
          "Documentation and Technical Studies",
          "History and Theory",
          "Practice and Project Management, Implementation and User Studies",
          "Environmental Studies",
          "Communication Studies",
          "Relevant Elective Studies",
        ],
      },
      notes: [
        "Since March 2022, OQA is a single comprehensive step (previously two stages: Stage 1 qualification assessment, Stage 2 competency assessment).",
        "Skilled Migration Assessments can ONLY be issued to applicants who have completed BOTH Stage 1 and Stage 2 (post-March 2022 requirement).",
        "Priority/expedited processing for an additional fee is NOT available since 18 March 2024; AACA may expedite at no cost only for documented extenuating circumstances.",
        "At least 1 'complex project' required in portfolio — single dwelling residential and interior fit-out projects do NOT qualify as complex.",
        "Application fees are NON-REFUNDABLE, including when the outcome is 'Not Suitable'.",
        "Card surcharge: 1.49% for Australian cards, 2.9% for international cards, applies to all fees above.",
      ],
    },
    {
      pathwayId: "VERIFICATION_ACCREDITED_QUAL",
      name: "Verification of Australian Accredited Architecture Qualification",
      eligibleFor: ["AU", "NZ", "HK", "SG"],
      requiresPriorAssessment: false,
      fees: [
        {
          label:
            "Not specified in source document — refer to AACA Verification website",
          note: "Separate fee schedule from OQA; not detailed in the October 2025 guide.",
        },
      ],
      documentRequirements: [
        "Proof that qualification is on AACA's accredited qualifications list.",
      ],
      notes: [
        "No OQA required if the qualification is on the accredited list (AU, NZ, or Hong Kong Master of Architecture programs).",
        "Full accredited qualifications list is included in the source document (AU institutions by state, plus NZ/HK/Singapore institutions).",
      ],
    },
    {
      pathwayId: "UK_ARB_MRA",
      name: "UK/AUS Mutual Recognition Agreement (RIBA Part 1 & 2)",
      eligibleFor: ["UK"],
      requiresPriorAssessment: false,
      fees: [
        {
          label:
            "Refer to AACA UK/AUS Mutual Recognition Agreement page",
          note: "Not detailed in the source document.",
        },
      ],
      documentRequirements: [
        "Evidence of completed UK ARB-prescribed Part 1 and Part 2 qualifications.",
      ],
      notes: [
        "Separate mutual recognition pathway, distinct from standard OQA.",
      ],
    },
    {
      pathwayId: "EPA",
      name: "Experienced Practitioner Assessment (EPA)",
      requiresPriorAssessment: false,
      minWorkExperienceYears: 10,
      fees: [
        { label: "EPA — Local", amountAUD: 3650 },
        { label: "EPA — Overseas", amountAUD: 4990 },
        {
          label: "EPA — Overseas Modified (previously OQA-assessed applicants)",
          amountAUD: 3780,
        },
      ],
      processingTimeWeeks: { standard: 15 },
      documentRequirements: [
        "Same core document set as OQA (see OQA pathway), plus evidence of Principal Decision-Maker role on complex projects.",
      ],
      competencyAssessment: {
        portfolioProjectsMin: 3,
        portfolioProjectsMax: 4,
        interviewDurationMinutes: 90,
      },
      notes: [
        "REVISED July 2025: minimum experience increased from 7 to 10 years; complex projects in portfolio must be no older than 15 years (previously 10); interview extended from 60 to 90 minutes; role terminology changed from 'Executive level' to 'Principal Decision-Maker'.",
        "Bypasses the Architectural Practice Examination (APE) entirely — direct pathway to state/territory registration.",
        "Applicants may apply for EPA or APE, but not both concurrently.",
        "Western Australia EPA candidates must first register in another state/territory, then apply to WA ARB via mutual recognition.",
      ],
    },
  ],
  postAssessmentPathway: {
    name: "Architectural Practice Examination (APE)",
    note:
      "Required after a Suitable OQA/NPrA outcome (not required if EPA is used instead). Consists of Part 1 (Logbook + 3,300 hours / ~2 years practical experience, min. 12 months post-qualification), Part 2 (National Examination Paper), Part 3 (Examination by Interview). Not required for the Skilled Migration Assessment itself — this is for actual Architect registration.",
  },
};
