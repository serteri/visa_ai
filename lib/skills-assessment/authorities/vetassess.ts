import type { SkillsAssessmentAuthority } from "../types";

/**
 * Vocational Education and Training Assessment Services (VETASSESS)
 * Source: "Am I Eligible to Apply with My Professional Occupation" + Trade Skills Assessment guides
 * Verified: 2026-08-04
 *
 * VETASSESS has two independent assessment services:
 *   1. Professional & Other Non-Trade — 341 occupations, standard skills assessment
 *   2. Trade Skills Assessment — licensed/non-licensed trades via TSS/OSAP programs
 *
 * The top-level `pathways` array is empty; callers should iterate `services[]` instead.
 */
export const vetassessAuthority: SkillsAssessmentAuthority = {
  authorityId: "VETASSESS",
  authorityName: "Vocational Education and Training Assessment Services",
  country: "AU",
  occupations: [],
  lastVerified: "2026-08-04",
  sourceDocument:
    "VETASSESS — Am I Eligible to Apply with My Professional Occupation (fees & document guide) + VETASSESS Pathway 1/Pathway 2 Trade Skills Assessment guides",
  pathways: [],
  validityPeriod: {
    years: 3,
    note: "Renewal within 3 years of the original outcome costs a reduced renewal fee; renewal requested outside 3 years requires a full new skills assessment application.",
  },
  services: [
    // ── Service 1: Professional & Other Non-Trade ──────────────────────
    {
      serviceId: "professional-non-trade",
      serviceName:
        "Professional & Other Non-Trade Occupations — Full Skills Assessment",
      appliesTo: "341 professional and other non-trade occupations",
      fees: [
        {
          label: "Online application (onshore, incl. GST)",
          amountAUD: 1205.60,
        },
        {
          label: "Online application (offshore, excl. GST)",
          amountAUD: 1096.0,
        },
        {
          label:
            "Priority Processing Fee (onshore, incl. GST) — in addition to full fee",
          amountAUD: 907.50,
        },
        {
          label:
            "Priority Processing Fee (offshore, excl. GST) — in addition to full fee",
          amountAUD: 825.0,
        },
        {
          label: "Employment only assessment (onshore, incl. GST)",
          amountAUD: 669.90,
        },
        {
          label: "Employment only assessment (offshore, excl. GST)",
          amountAUD: 609.0,
        },
        {
          label:
            "Qualification and employment assessment (onshore, incl. GST)",
          amountAUD: 1004.30,
        },
        {
          label:
            "Qualification and employment assessment (offshore, excl. GST)",
          amountAUD: 913.0,
        },
      ],
      notes: [
        "Qualification must be at the AQF-comparable educational level required for the nominated occupation.",
        "An Australian Graduate Diploma (or comparable overseas postgraduate diploma) is never treated as comparable to an Australian Bachelor degree, alone or combined with underpinning sub-degree qualifications.",
        "'Highly relevant field of study' is assessed against multiple factors: major/specialisation match, depth and breadth of study, employment outcomes of the qualification in its home country, and course requirements (thesis, major projects, internships).",
        "Sufficient years of highly relevant employment within the last 5 years can compensate for a qualification that is not in a highly relevant major field of study.",
      ],
      pathways: [
        {
          pathwayId: "full-skills-assessment",
          name: "Full Skills Assessment (qualifications and/or employment)",
          fees: [
            {
              label: "Online application (onshore, incl. GST)",
              amountAUD: 1205.60,
            },
            {
              label: "Online application (offshore, excl. GST)",
              amountAUD: 1096.0,
            },
            {
              label:
                "Priority Processing Fee (onshore, incl. GST) — in addition to full fee",
              amountAUD: 907.50,
            },
            {
              label:
                "Priority Processing Fee (offshore, excl. GST) — in addition to full fee",
              amountAUD: 825.0,
            },
            {
              label: "Employment only assessment (onshore, incl. GST)",
              amountAUD: 669.90,
            },
            {
              label: "Employment only assessment (offshore, excl. GST)",
              amountAUD: 609.0,
            },
            {
              label:
                "Qualification and employment assessment (onshore, incl. GST)",
              amountAUD: 1004.30,
            },
            {
              label:
                "Qualification and employment assessment (offshore, excl. GST)",
              amountAUD: 913.0,
            },
          ],
          documentRequirements: [
            "Resume / CV (academic studies incl. major projects, plus employment/career history).",
            "One recent (within 6 months) passport-sized colour photograph, not self-taken.",
            "Proof of identity: 3 ID documents (min. 1 primary; combos: 2 primary + 1 secondary OR 1 primary + 2 secondary). Primary: passport bio page or birth certificate. Secondary examples: national ID, driver's licence, social security card, marriage certificate, student ID, Australian visa.",
            "Evidence of legal name change if applicable (statutory declarations NOT accepted).",
            "Qualification award certificate (or provisional certificate / official statement of completion if not yet issued) plus complete academic transcript.",
            "Additional verification required for qualifications from the People's Republic of China (PRC) — see notes.",
            "Statutory declaration permitted only to supplement official employment documentation, never as sole evidence of employment dates or payment.",
          ],
          notes: [
            "Qualification must be at the AQF-comparable educational level required for the nominated occupation.",
            "An Australian Graduate Diploma (or comparable overseas postgraduate diploma) is never treated as comparable to an Australian Bachelor degree, alone or combined with underpinning sub-degree qualifications.",
            "'Highly relevant field of study' is assessed against multiple factors: major/specialisation match, depth and breadth of study, employment outcomes of the qualification in its home country, and course requirements (thesis, major projects, internships).",
            "Sufficient years of highly relevant employment within the last 5 years can compensate for a qualification that is not in a highly relevant major field of study.",
          ],
        },
      ],
    },
    // ── Service 2: Trade Skills Assessment ──────────────────────────────
    {
      serviceId: "trade-skills-assessment",
      serviceName: "Trade Skills Assessment",
      appliesTo:
        "Licensed and non-licensed trade occupations (e.g. Electrician, Plumber, Air-conditioning/Refrigeration Mechanic, Automotive Electrician, Baker/Pastrycook, Bricklayer, Cabinetmaker, Carpenter, Cook/Chef, Diesel Motor Mechanic, Electronic Equipment Trades Worker, Fitter, Hairdresser, Joiner, Metal Machinist, Motor Mechanic, Panel Beater, Toolmaker, Metal Fabricator/Sheet Metal Trades Worker/Welder)",
      programs: [
        {
          name: "Temporary Skills Shortage (TSS) Skills Assessment Program",
          purpose:
            "For Skills in Demand visa (temporary work) applications.",
        },
        {
          name: "Offshore Skills Assessment Program (OSAP)",
          purpose: "For permanent skilled migration visa applications.",
        },
      ],
      pathways: [
        {
          pathwayId: "pathway-1",
          name: "Pathway 1 — No Australian qualification or occupational licence",
          eligibleFor: [
            "Applicants without a recognised Australian trade qualification or occupational licence",
          ],
          fees: [
            {
              label: "Trade Skills Assessment application fee",
              amountAUD: undefined,
              note: "Not stated in source document; confirm via VETASSESS portal.",
            },
          ],
          documentRequirements: [
            "Evidence (documentation) of employment, skills and knowledge.",
            "Video evidence demonstrating trade skills, per the occupation-specific Video Guide.",
            "Australian Industry Standards Online Assessment — completed before the technical interview.",
            "Current passport (bring to interview).",
            "Technical Interview Admission Voucher (bring to interview).",
          ],
          notes: [
            "Licensed trades: 6 years' employment experience with no formal training, OR 4 years' with relevant formal training.",
            "Non-licensed trades: 5 years' with no formal training, OR 3 years' with relevant formal training.",
            "In all cases, at least 12 months' work in the nominated occupation within the 3 years prior to application.",
          ],
          competencyAssessment: {
            portfolioProjectsMin: 0,
            portfolioProjectsMax: 0,
            interviewDurationMinutes: 180,
            topicAreas: [
              "Video evidence review",
              "Australian Industry Standards Online Assessment",
              "Technical interview (~3 hours, English only, no interpreter, at a VETASSESS-approved venue or online)",
            ],
          },
        },
        {
          pathwayId: "pathway-2",
          name: "Pathway 2 — Has Australian qualification or occupational licence",
          eligibleFor: [
            "Applicants who hold a recognised Australian trade qualification or occupational licence",
          ],
          fees: [
            {
              label: "Trade Skills Assessment application fee",
              amountAUD: undefined,
              note: "Not stated in source document; confirm via VETASSESS portal.",
            },
          ],
          documentRequirements: [
            "Evidence of Australian qualification(s).",
            "Evidence of work experience — minimum 3 years full-time (or part-time equivalent) at the skill level required.",
          ],
          competencyAssessment: {
            portfolioProjectsMin: 0,
            portfolioProjectsMax: 0,
            interviewDurationMinutes: 120,
            topicAreas: [
              "Qualification and work experience evidence review",
              "Technical interview",
            ],
          },
        },
      ],
      notes: [
        "Outcome for both pathways is a Skills Assessment Result Letter with a 'Suitable' or 'Not Suitable' determination.",
        "Unsuccessful applicants may apply for reassessment or review.",
        "Technical interview rules: arriving more than 30 minutes late cancels the interview; no reference materials or internet-connected devices allowed; interview is recorded; assessor cannot disclose results on the day.",
        "Interview may be cancelled if the candidate cannot prove identity, cannot understand/answer questions in English, becomes distressed, appears unwell, becomes angry/violent, or arrives intoxicated/drugged.",
      ],
    },
  ],
  excludedEvidence: [
    "Statutory declarations or affidavits as sole evidence of employment dates or payment (must be supported by official documentation such as tax records, signed contracts, appointment letters, job descriptions).",
    "Statutory declarations as evidence of legal name change.",
  ],
};
