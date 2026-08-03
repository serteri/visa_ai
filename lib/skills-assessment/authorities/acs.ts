import type { SkillsAssessmentAuthority } from "../types";

/**
 * Australian Computer Society (ACS)
 * Source: ACS Migration Skills Assessment — official guide
 * Fee increase effective 3 November 2025
 * Verified: 2025-11-03
 */
export const acsAuthority: SkillsAssessmentAuthority = {
  authorityId: "ACS",
  authorityName: "Australian Computer Society",
  country: "AU",
  lastVerified: "2025-11-03",
  sourceDocument:
    "ACS Migration Skills Assessment — official guide, fee increase effective 3 November 2025",
  notes: [
    "ACS assessments are underpinned by SFIA (Skills Framework for the Information Age).",
    "A complimentary 12-month ACS membership is included with every Migration Skills Assessment.",
    "ACS supports the Designated Area Migration Agreement (DAMA).",
  ],
  occupations: [
    // Data Science
    { anzscoCode: "224999", title: "Information and Organisation Professionals nec" },
    { anzscoCode: "224114", title: "Data Analyst" },
    { anzscoCode: "224115", title: "Data Scientist" },
    // ICT Managers (1351)
    { anzscoCode: "135111", title: "Chief Information Officer" },
    { anzscoCode: "135112", title: "ICT Project Manager" },
    { anzscoCode: "135199", title: "ICT Managers nec" },
    // ICT Trainers (2232)
    { anzscoCode: "223211", title: "ICT Trainer" },
    // ICT Business and Systems Analysts (2611)
    { anzscoCode: "261111", title: "ICT Business Analyst" },
    { anzscoCode: "261112", title: "Systems Analyst" },
    // Multimedia Specialists and Web Developers (2612)
    { anzscoCode: "261211", title: "Multimedia Specialist" },
    { anzscoCode: "261212", title: "Web Developer" },
    // Software and Applications Programmers (2613)
    { anzscoCode: "261311", title: "Analyst Programmer" },
    { anzscoCode: "261312", title: "Developer Programmer" },
    { anzscoCode: "261313", title: "Software Engineer" },
    { anzscoCode: "261314", title: "Software Tester" },
    { anzscoCode: "261316", title: "DevOps Engineer" },
    { anzscoCode: "261399", title: "Software and Application Programmer nec" },
    // Database and Systems Administrators (2621)
    { anzscoCode: "262111", title: "Database Administrator" },
    { anzscoCode: "262113", title: "Systems Administrator" },
    // ICT Security
    { anzscoCode: "262112", title: "ICT Security Specialist" },
    // Computer Network Professionals (2631)
    { anzscoCode: "263111", title: "Computer Network and Systems Engineer" },
    { anzscoCode: "263112", title: "Network Administrator" },
    { anzscoCode: "263113", title: "Network Analyst" },
    // ICT Support and Test Engineers (2632)
    { anzscoCode: "263211", title: "ICT Quality Assurance Engineer" },
    { anzscoCode: "263212", title: "ICT Support Engineer" },
    { anzscoCode: "263213", title: "ICT Systems Test Engineer" },
    { anzscoCode: "263299", title: "ICT Support and Test Engineer nec" },
    // ICT Support Technicians (3131)
    { anzscoCode: "313113", title: "Web Administrator" },
    // Cyber Security Occupations
    { anzscoCode: "261315", title: "Cyber Security Engineer" },
    { anzscoCode: "261317", title: "Penetration Tester" },
    { anzscoCode: "262114", title: "Cyber Governance Risk and Compliance Specialist" },
    { anzscoCode: "262115", title: "Cyber Security Advice and Assessment Specialist" },
    { anzscoCode: "262116", title: "Cyber Security Analyst" },
    { anzscoCode: "262117", title: "Cyber Security Architect" },
    { anzscoCode: "262118", title: "Cyber Security Operations Coordinator" },
  ],
  pathways: [
    // ── Pathway 1: Post Australian Study ──────────────────────────────────
    {
      pathwayId: "POST_AU_STUDY",
      name: "Post Australian Study",
      eligibleFor: ["AU"],
      minWorkExperienceMonths: 12,
      qualificationDurationRequirement:
        "Australian bachelor's degree or higher, IT/Data Science major, closely related to nominated occupation + ANZSCO code",
      fees: [{ label: "Post Australian Study Assessment", amountAUD: 1136 }],
      documentRequirements: [
        "Two forms of photo identification (one must be current passport) plus evidence of name change if applicable.",
        "Australian Completion Letter or Award Certificate + Academic Transcript (colour scan of original).",
        "Employment reference letter(s) on company letterhead, OR a 4-part Statutory Declaration set with two forms of payslip evidence (one for start of employment, one for end) if no reference letter is available.",
        "Optional: Vendor Certification evidence (DevOps and Cyber Security occupation codes only).",
      ],
      notes: [
        "ACS does NOT assess eligibility for the Australian Study Requirement (ASR) — this is determined separately by Home Affairs.",
      ],
    },

    // ── Pathway 2: General Skills Assessment ──────────────────────────────
    {
      pathwayId: "GENERAL_SKILLS",
      name: "General Skills Assessment",
      requiresPriorAssessment: false,
      fees: [{ label: "General Skills Assessment", amountAUD: 1498 }],
      processingTimeWeeks: { standard: 12 },
      documentRequirements: [
        "Two forms of photo identification plus evidence of name change if applicable.",
        "Any AU or overseas IT qualification (Award Certificate/Testamur + Transcript; AU qualification also requires Completion Letter).",
        "Employment reference letter(s) on company letterhead, OR a 4-part Statutory Declaration set with two forms of payslip evidence if no reference letter is available.",
        "Optional: Vendor Certification evidence (DevOps and Cyber Security occupation codes only).",
      ],
      notes: [
        "ACS supports the Designated Area Migration Agreement (DAMA).",
        "Eligibility depends on qualification level, IT content, and relevance — see occupation-specific matrix below.",
        "For IT roles (ANZSCO 2611–2632, 3131): Bachelor+ Major/Closely related = 2yr recent or 4yr any; Minor/Not closely related requires more.",
        "For Data Science roles (224114, 224115, 224999): Bachelor+ Major in Data Science = 2yr recent or 4yr any; Bachelor+ Major in ICT/CompSci/Math/Stats/Engineering = 4yr any.",
      ],
    },

    // ── Pathway 3: Recognition of Prior Learning (RPL) ────────────────────
    {
      pathwayId: "RPL",
      name: "Recognition of Prior Learning (RPL)",
      minWorkExperienceYears: 6,
      fees: [{ label: "RPL Assessment", amountAUD: 625 }],
      processingTimeWeeks: { standard: 12 },
      documentRequirements: [
        "Two forms of photo identification plus evidence of name change if applicable.",
        "Two RPL Project Reports (within ACS RPL form) — one from within the last 2 years, one from within the last 4 years; for non-project-based roles, detailed work experience and challenges encountered.",
        "Professional Currency Evidence — at least 2 different forms showing currency/skills in nominated ANZSCO code.",
        "Employment reference letter(s) on company letterhead, OR a 4-part Statutory Declaration set with two forms of payslip evidence.",
        "Optional: Vendor Certification evidence (DevOps and Cyber Security occupation codes only).",
      ],
      notes: [
        "No tertiary qualification is assessed — this pathway is for applicants who do not hold a relevant IT qualification.",
        "At least 6 years of relevant IT work experience required, with the most recent 2 years being active.",
      ],
    },

    // ── Pathway 4a: Qualification Only — TG 485 ──────────────────────────
    {
      pathwayId: "QUALIFICATION_ONLY_TG485",
      name: "Qualification Only — Temporary Graduate (Post-Vocational Education Work stream)",
      eligibleFor: ["AU"],
      fees: [{ label: "Qualification Only Assessment", amountAUD: 625 }],
      processingTimeWeeks: { standard: 12 },
      documentRequirements: [
        "Two forms of photo identification plus evidence of name change if applicable.",
        "AU Diploma or Associate Degree (Completion Letter/Award Certificate + Transcript).",
      ],
      notes: [
        "ACS does NOT assess eligibility for the Temporary Graduate visa (TGSR) — this is determined by Home Affairs.",
        "The qualification must be a Diploma or Associate Degree from an AU institution, in a closely related IT/Data Science/Cyber Security major.",
        "The nominated occupation must appear on the subclass 485 Medium and Long-term Strategic Skills List (MLTSSL).",
      ],
    },

    // ── Pathway 4b: Qualification Only — PY Enrolment ────────────────────
    {
      pathwayId: "QUALIFICATION_ONLY_PY",
      name: "Qualification Only — Professional Year Program Enrolment",
      eligibleFor: ["AU"],
      fees: [{ label: "Qualification Only Assessment", amountAUD: 625 }],
      processingTimeWeeks: { standard: 12 },
      documentRequirements: [
        "Two forms of photo identification plus evidence of name change if applicable.",
        "AU Bachelor's degree or higher (Completion Letter/Award Certificate + Transcript).",
      ],
      notes: [
        "Purpose: ICT content assessment for Professional Year Program enrolment.",
        "The qualification must be a Bachelor's degree or higher from an AU institution.",
      ],
    },
  ],
};
