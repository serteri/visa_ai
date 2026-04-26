import * as dotenv from "dotenv";

// Load environment variables FIRST
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

// Verify DATABASE_URL is loaded
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL not found. Make sure .env or .env.local exists with DATABASE_URL.");
  process.exit(1);
}

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { sourceSnapshots, visaStructuredData, visaTypes } from "./schema";
import { eq } from "drizzle-orm";

// Initialize database
const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

const STUDENT_VISA_SOURCE_URL =
  "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500";
const STUDENT_VISA_PDF_URL =
  "https://jjcmslfzfhz5bjbp.public.blob.vercel-storage.com/Visa_500/visa_class_500_24April2026.pdf";
const STUDENT_VISA_CAPTURED_AT = new Date("2026-04-24T00:00:00.000Z");

const SID_482_SOURCE_URL =
  "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skills-in-demand-482/core-skills-stream";
const SID_482_PDF_URL =
  "https://jjcmslfzfhz5bjbp.public.blob.vercel-storage.com/Visa%20%28subclass%20482%29%20Core%20Skills%20stream/Skills%20in%20Demand%20Visa%20%28subclass%20482%29%20Core%20Skills%20stream_25April2026.pdf";
const SID_482_ENGLISH_SOURCE_URL = "https://immi.homeaffairs.gov.au";
const SID_482_ENGLISH_PDF_URL =
  "https://jjcmslfzfhz5bjbp.public.blob.vercel-storage.com/Visa%20%28subclass%20482%29%20Core%20Skills%20stream/English%20proficiency%20%28subclass%20482%29_25April2026.pdf";
const SID_482_CAPTURED_AT = new Date("2026-04-25T00:00:00.000Z");

const SI_189_SOURCE_URL =
  "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-independent-189/points-tested";
const SI_189_PDF_URL =
  "https://jjcmslfzfhz5bjbp.public.blob.vercel-storage.com/Skilled%20Independent%20visa%20%28subclass%20189%29%20Points-tested%20stream/Skilled%20Independent%20visa%20%28subclass%20189%29%20Points-tested%20stream_25April2026.pdf";
const SI_189_CAPTURED_AT = new Date("2026-04-25T00:00:00.000Z");

const SN_190_SOURCE_URL =
  "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-nominated-190";
const SN_190_PDF_URL =
  "https://jjcmslfzfhz5bjbp.public.blob.vercel-storage.com/Subclass%20190%20Skilled%20Nominated%20visa/Subclass%20190%20Skilled%20Nominated%20visa_25April2026.pdf";
const SN_190_CAPTURED_AT = new Date("2026-04-25T00:00:00.000Z");

const SWR_491_SOURCE_URL =
  "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-work-regional-provisional-491/main-applicant";
const SWR_491_PDF_URL =
  "https://jjcmslfzfhz5bjbp.public.blob.vercel-storage.com/Subclass%20491%20Skilled%20Work%20Regional%20%28Provisional%29%20visa%20-%20Main%20applicant/Subclass%20491%20Skilled%20Work%20Regional%20%28Provisional%29%20visa%20-%20Main%20applicant_25April2026.pdf";
const SWR_491_CAPTURED_AT = new Date("2026-04-25T00:00:00.000Z");

const PARTNER_820_801_SOURCE_URL =
  "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/partner-onshore";
const PARTNER_820_801_PDF_URL =
  "https://jjcmslfzfhz5bjbp.public.blob.vercel-storage.com/%28Subclasses%20820%20and%20801%29%20Partner%20visas%20%28apply%20in%20Australia%29/Subclass%20820%20Partner%20visa%20%28temporary%29/Subclass%20820%20Partner%20visa%20%28temporary%29_26April2026.pdf";
const PARTNER_801_SOURCE_URL =
  "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/partner-onshore/permanent-801";
const PARTNER_801_PDF_URL =
  "https://jjcmslfzfhz5bjbp.public.blob.vercel-storage.com/%28Subclasses%20820%20and%20801%29%20Partner%20visas%20%28apply%20in%20Australia%29/Subclass%20801%20Partner%20visa%20%28Permanent%29/Subclass%20801%20Partner%20visa%20%28Permanent%29_26April2026.pdf";
const PARTNER_820_801_CAPTURED_AT = new Date("2026-04-26T00:00:00.000Z");

const studentVisa500Data = {
  visa_name: "Student visa",
  subclass: "500",
  category: "Study",
  purpose: "Participate in an eligible course of study in Australia",
  stay_period: "Up to 6 years and in line with enrolment",
  cost: "From AUD 2,000 unless exempt",
  work_rights:
    "Work up to 48 hours per fortnight when course is in session; different rules may apply for research or postgraduate students",
  source_url: STUDENT_VISA_SOURCE_URL,
  last_checked: new Date("2026-04-24"),
  reviewed_status: "needs_review",
  key_requirements: [
    "Apply online in or outside Australia",
    "Be enrolled in a full-time course and hold a valid Confirmation of Enrolment (CoE)",
    "Maintain Overseas Student Health Cover (OSHC)",
    "Be at least 6 years old",
    "Have welfare arrangements if under 18",
    "Hold an eligible substantive visa if applying in Australia",
    "Meet English language requirements or qualify for an exemption",
    "Have sufficient financial capacity for the stay",
    "Be a genuine student",
    "Meet health and character requirements",
    "Sign the Australian Values Statement if 18 or older",
    "Have paid back any debt to the Australian Government",
    "Not have a visa history that affects eligibility",
  ],
  documents_required: [
    "Valid passport",
    "Confirmation of Enrolment (CoE)",
    "Proof of English language proficiency if required",
    "Evidence of financial capacity if required",
    "Overseas Student Health Cover (OSHC)",
    "Identity documents",
    "Health examination results if required",
    "Police certificates if required",
    "Welfare and parental consent documents if under 18",
    "Partner and dependant documents if applicable",
    "Certified translations for non-English documents",
  ],
  application_steps: [
    "Prepare before applying",
    "Gather required documents using the Document Checklist Tool",
    "Apply online through ImmiAccount",
    "Attach documents and pay the visa application charge or provide exemption evidence",
    "Respond to requests for additional information",
    "Provide biometrics or health examinations if requested",
    "Wait for written visa outcome",
  ],
  visa_conditions: [
    "Maintain enrolment in an eligible course",
    "Comply with work limitations",
    "Maintain adequate health insurance",
    "Obey Australian laws",
    "Travel in and out of Australia while the visa is valid",
    "Cannot extend the visa; must apply for a new visa to stay longer",
    "Notify the Department if circumstances change",
  ],
  risks: [
    "Application may be delayed or refused if incomplete",
    "Application may be invalid if CoE is missing or invalid",
    "Incorrect or false information may lead to refusal and future visa consequences",
    "Insufficient financial evidence may result in refusal",
    "Failure to maintain OSHC may cause compliance issues",
    "Previous refusals or cancellations may affect eligibility",
    "Not meeting the Genuine Student requirement may lead to refusal",
  ],
  english_requirements: {
    test_taken_on_or_before_2025_08_06: {
      IELTS: { standard: 6.0, elicos_10_weeks: 5.5, elicos_20_weeks: 5.0 },
      TOEFL_iBT: { standard: 64, elicos_10_weeks: 46, elicos_20_weeks: 35 },
      CAE: { standard: 169, elicos_10_weeks: 162, elicos_20_weeks: 154 },
      PTE: { standard: 50, elicos_10_weeks: 42, elicos_20_weeks: 36 },
      OET: {
        standard: "B for each test component",
        elicos_10_weeks: "B for each test component",
        elicos_20_weeks: "B for each test component",
      },
    },
    test_taken_on_or_after_2025_08_07: {
      C1_Advanced: { standard: 161, elicos_10_weeks: "Excluded", elicos_20_weeks: "Excluded" },
      CELPIP_General: { standard: 7, elicos_10_weeks: 6, elicos_20_weeks: 5 },
      IELTS_Academic: { standard: 6.0, elicos_10_weeks: 5.5, elicos_20_weeks: 5.0 },
      IELTS_General_Training: { standard: 6.0, elicos_10_weeks: 5.5, elicos_20_weeks: 5.0 },
      LANGUAGECERT_Academic: { standard: 61, elicos_10_weeks: 54, elicos_20_weeks: 46 },
      MET: { standard: 53, elicos_10_weeks: 49, elicos_20_weeks: 44 },
      OET: { standard: 1210, elicos_10_weeks: 1090, elicos_20_weeks: 1020 },
      PTE_Academic: { standard: 47, elicos_10_weeks: 39, elicos_20_weeks: 31 },
      TOEFL_iBT: { standard: 67, elicos_10_weeks: 51, elicos_20_weeks: 37 },
    },
    notes: [
      "At-home or online English tests are not accepted where the entire test is delivered online.",
      "Some applicants may be exempt from providing English test evidence.",
      "The Document Checklist Tool should be used to determine evidence requirements.",
    ],
  },
  financial_requirements: {
    living_costs_12_months: {
      student: "AUD 29,710",
      partner: "AUD 10,394",
      child: "AUD 4,449",
    },
    annual_income_option: {
      without_family: "AUD 87,856",
      with_family: "AUD 102,500",
    },
    schooling_costs_per_child: "At least AUD 13,502 per year",
    travel_costs_guidance: {
      outside_australia_general: "AUD 2,000",
      applying_in_australia: "AUD 1,000",
      east_or_southern_africa: "AUD 2,500",
      west_africa: "AUD 3,000",
    },
  },
};

function toIsoDate(date: Date) {
  return date.toISOString().split("T")[0];
}

const skillsInDemand482Data = {
  visa_name: "Skills in Demand visa",
  subclass: "482",
  category: "Work",
  purpose:
    "Work in Australia temporarily for an approved employer sponsor in an occupation listed on the Core Skills Occupation List.",
  stay_period: "Up to 4 years. Hong Kong passport holders may stay up to 5 years.",
  cost: "From AUD 3,210 for the main applicant and each dependant 18 years or over. AUD 805 for each dependant under 18.",
  work_rights:
    "Work in Australia for the approved sponsor in the nominated occupation. In some cases, work may be for an associated entity of the sponsor.",
  source_url: SID_482_SOURCE_URL,
  last_checked: new Date("2026-04-25"),
  reviewed_status: "needs_review",
  key_requirements: [
    "Be nominated by an approved sponsor",
    "Be nominated to work in an occupation on the Core Skills Occupation List",
    "Be paid the Annual Market Salary Rate and no less than the Core Skills Income Threshold",
    "Have at least 1 year of relevant work experience in the nominated occupation or a related field",
    "Have a relevant skills assessment if required for the occupation",
    "Work only for the sponsor or associated entity unless exempt",
    "Meet minimum English language proficiency standards unless exempt",
    "Hold an appropriate visa if applying in Australia",
    "Have complied with previous visa conditions if applying in Australia",
    "Maintain adequate health insurance",
    "Meet health and character requirements",
    "Have no relevant history of paying for visa sponsorship",
    "Not have a visa cancellation or refusal history that affects eligibility",
    "Have no debt to the Australian Government",
    "Sign the Australian Values Statement if 18 or older",
  ],
  documents_required: [
    "Valid passport",
    "Employer nomination Transaction Reference Number",
    "Identity documents",
    "Proof of change of name if applicable",
    "Skills assessment reference number if mandatory",
    "Evidence of skills, qualifications and employment background",
    "Relevant qualification certificates",
    "Registration or licensing evidence if required",
    "Curriculum vitae or resume",
    "Employment references",
    "English language proficiency documents",
    "Evidence of adequate health insurance",
    "Health examination results if required",
    "Australian police certificate if required",
    "Overseas police certificates if required",
    "Military service records if applicable",
    "Partner documents if applicable",
    "Dependant documents if applicable",
    "Parental responsibility documents for dependants under 18 if applicable",
    "Translated documents for non-English documents",
  ],
  application_steps: [
    "Before applying, arrange nomination, passport, skills assessment if required, English test if required, and health exams if needed",
    "Gather identity, skills, occupation, English, health insurance, character and family documents",
    "Apply online through ImmiAccount",
    "Attach documents and pay the application fee",
    "Respond to requests for more information if requested",
    "Complete health exams or biometrics if requested",
    "Stay lawful in Australia while the application is processed",
    "Wait for written visa outcome",
  ],
  visa_conditions: [
    "Work in the nominated occupation",
    "Usually work only for the sponsoring business",
    "If sponsored by an Australian business, may work for that business or an associated entity",
    "Begin employment within 90 days of entering Australia or within 90 days of visa grant if granted in Australia",
    "Maintain adequate health insurance",
    "Obey Australian laws",
    "Travel to and from Australia while the visa is valid",
    "Time outside Australia does not extend the visa",
    "Notify the Department of changes such as contact details, employer, employment status, relationship status or birth of a child",
  ],
  risks: [
    "Application cannot be granted unless the employer nomination is approved",
    "Application may be delayed or refused if documents are incomplete",
    "Mandatory skills assessment must be commenced before application if required, otherwise the application may be invalid",
    "False or misleading information may lead to refusal and future visa consequences",
    "Failure to meet English requirements may affect eligibility",
    "Failure to maintain adequate health insurance may breach visa conditions",
    "Previous visa refusals or cancellations may affect eligibility",
    "Paying for visa sponsorship conduct in the previous 3 years may affect eligibility",
    "If employment ends, the visa holder may need to find a new employer or make arrangements to leave Australia",
  ],
  english_requirements: {
    summary:
      "Primary visa applicants for the Skills in Demand visa subclass 482 must demonstrate minimum English language proficiency unless an exemption applies.",
    applies_to_streams: ["Core Skills stream", "Specialist Skills stream"],
    test_validity: "English tests must be taken within 3 years before applying.",
    exemptions: [
      "Passport holder from Canada",
      "Passport holder from New Zealand",
      "Passport holder from the Republic of Ireland",
      "Passport holder from the United Kingdom",
      "Passport holder from the United States of America",
      "Completed at least 5 years of full-time study in at least a secondary level institution where most classes were in English",
      "Nominated occupation will be performed at a diplomatic or consular mission of another country",
      "Nominated occupation will be performed at an Office of the Authorities of Taiwan",
      "Nominated occupation requires licence, registration or membership and the applicant proved equal or higher English proficiency to obtain it",
      "Applicant is an employee of an overseas business, the business or associated entity nominated them to work in Australia, and they will receive guaranteed annual earnings of at least AUD 96,400",
    ],
    online_tests_not_accepted: {
      rule: "The Department does not accept evidence from English language tests where the entire test is delivered online, remote-proctored, or at-home.",
      examples_not_accepted: [
        "CELPIP Online",
        "IELTS Online",
        "LANGUAGECERT Academic Online",
        "OET@Home",
        "MET Digital taken at-home",
        "TOEFL iBT Home Edition",
      ],
    },
    tests_taken_on_or_after_2025_09_13: {
      single_skill_retake_note:
        "If the test offers a single skill retake option, the result for that skill may be accepted.",
      CELPIP_General: { listening: 5, reading: 5, writing: 5, speaking: 5 },
      IELTS_Academic: { listening: 5.0, reading: 5.0, writing: 5.0, speaking: 5.0 },
      IELTS_General_Training: { listening: 5.0, reading: 5.0, writing: 5.0, speaking: 5.0 },
      LANGUAGECERT_Academic: { listening: 41, reading: 44, writing: 45, speaking: 54 },
      MET: { listening: 49, reading: 47, writing: 45, speaking: 38 },
      OET: { listening: 220, reading: 240, writing: 200, speaking: 270 },
      PTE_Academic: { listening: 33, reading: 36, writing: 29, speaking: 24 },
      TOEFL_iBT: {
        listening: 8,
        reading: 8,
        writing: 9,
        speaking: 14,
        note: "For tests taken on or after 21 January 2026, applicant must select Taking TOEFL for Australia during registration.",
      },
    },
    tests_taken_before_2025_09_13: {
      single_sitting_required: true,
      single_skill_retake_accepted: false,
      IELTS: { overall: 5.0, listening: 5.0, reading: 5.0, writing: 5.0, speaking: 5.0 },
      OET: { listening: "B", reading: "B", writing: "B", speaking: "B" },
      TOEFL_iBT: {
        overall: 35,
        listening: 4,
        reading: 4,
        writing: 14,
        speaking: 14,
        note: "TOEFL iBT tests from 26 July 2023 to 4 May 2024 were not approved for Australian visa purposes.",
      },
      PTE_Academic: { overall: 36, listening: 36, reading: 36, writing: 36, speaking: 36 },
      C1_Advanced: {
        overall: 154,
        listening: 154,
        reading: 154,
        writing: 154,
        speaking: 154,
        note: "From 12 February 2024, only Cambridge C1 Advanced paper-based test results are accepted. Tests before 12 February 2024 within validity periods may still be accepted.",
      },
    },
    labour_agreement_stream_note:
      "For Labour Agreement stream, English requirements may be specified in the labour agreement between the employer and the Commonwealth.",
  },
  financial_requirements: {
    status: "not_primary_requirement_in_source_text",
    notes: [
      "The provided source text refers to salary requirements rather than personal financial capacity.",
      "The applicant must be paid the Annual Market Salary Rate and no less than the Core Skills Income Threshold.",
      "Exact income threshold amount should be reviewed against the official skilled visa income threshold source.",
    ],
  },
  family_members: {
    can_include_family: true,
    notes: [
      "Family members may be included as secondary applicants depending on whether the applicant currently or previously held subclass 457 or 482.",
      "Secondary applicants must meet health and character requirements.",
      "Family members cannot be added after the application is submitted, but may apply later as subsequent entrants if eligible.",
    ],
  },
};

const skilledIndependent189Data = {
  subclass: "189",
  visa_name: "Skilled Independent visa",
  category: "Permanent Skilled Migration",
  purpose: "Live and work permanently anywhere in Australia as an invited skilled worker.",
  stay_period: "Permanently",
  cost: "From AUD 4,910 for the main applicant",
  work_rights: "Work and study anywhere in Australia",
  source_url: SI_189_SOURCE_URL,
  last_checked: new Date("2026-04-25"),
  reviewed_status: "needs_review",

  key_requirements: [
    "Have an occupation on the relevant skilled occupation list",
    "Have a suitable skills assessment",
    "Be invited to apply",
    "Score at least 65 points",
    "Be under 45 at time of invitation",
    "Have competent English",
    "Meet health and character requirements",
  ],

  documents_required: [
    "Expression of Interest (EOI)",
    "Invitation to apply",
    "Skills assessment",
    "English test results",
    "Identity documents",
    "Evidence supporting points claims",
  ],

  application_steps: [
    "Submit EOI in SkillSelect",
    "Wait for invitation",
    "Gather documents",
    "Apply via ImmiAccount",
    "Upload documents",
    "Wait for decision",
  ],

  visa_conditions: [
    "Permanent residency",
    "Live and work anywhere",
    "Travel for 5 years",
    "Eligible for citizenship",
  ],

  risks: [
    "No invitation = cannot apply",
    "Low points = not invited",
    "Incorrect claims may lead to refusal",
  ],

  english_requirements: {
    required_level: "Competent English",
    IELTS: "6.0 each band",
    PTE: "Equivalent scores required",
  },

  financial_requirements: {
    status: "not_primary_requirement",
  },

  occupation_requirements: {
    summary: "Must be on Skilled Occupation List",
    sample_occupations: [
      "Accountant",
      "Civil Engineer",
      "Software Engineer",
      "Registered Nurse",
      "Electrician",
      "Chef",
    ],
  },

  points_test_rules: {
    minimum_points: 65,
    age: [
      { range: "18-24", points: 25 },
      { range: "25-32", points: 30 },
      { range: "33-39", points: 25 },
      { range: "40-44", points: 15 },
    ],
    english: [
      { level: "Competent", points: 0 },
      { level: "Proficient", points: 10 },
      { level: "Superior", points: 20 },
    ],
  },
};

const skilledNominated190Data = {
  subclass: "190",
  visa_name: "Skilled Nominated visa",
  category: "Permanent Skilled Migration",
  purpose:
    "Live and work permanently in Australia as a skilled worker nominated by an Australian state or territory government.",
  stay_period: "Permanently",
  cost: "From AUD 4,910 for the main applicant",
  work_rights: "Work and study anywhere in Australia",
  source_url: SN_190_SOURCE_URL,
  last_checked: new Date("2026-04-25"),
  reviewed_status: "needs_review",

  key_requirements: [
    "Have an occupation on the relevant skilled list",
    "Have a suitable skills assessment for the occupation",
    "Submit an Expression of Interest through SkillSelect",
    "Be nominated by an Australian state or territory government agency",
    "Be invited to apply for this visa",
    "Score at least 65 points",
    "Be aged under 45 when invited to apply",
    "Have at least Competent English at the time of invitation",
    "Meet health and character requirements",
    "Have paid back any debt to the Australian Government",
    "Sign the Australian Values Statement if 18 or older",
  ],

  documents_required: [
    "Expression of Interest through SkillSelect",
    "Invitation to apply",
    "State or territory nomination",
    "Suitable skills assessment",
    "Identity documents",
    "Competent English evidence",
    "Evidence supporting points claims",
    "Relationship documents if applicable",
    "Character documents and police certificates if required",
    "Health examination results if requested",
    "Family member documents if included",
    "Translated documents for non-English documents",
  ],

  application_steps: [
    "Submit an Expression of Interest through SkillSelect",
    "Select the Skilled Nominated subclass 190 visa",
    "Wait for possible nomination by a state or territory government agency",
    "Receive an invitation to apply if nominated",
    "Apply online through ImmiAccount within 60 calendar days of invitation",
    "Attach documents and pay the application charge",
    "Respond to requests for additional information if requested",
    "Complete health examinations or biometrics if requested",
    "Wait for written visa outcome",
  ],

  visa_conditions: [
    "Permanent visa",
    "Live, work and study in Australia",
    "Travel to and from Australia for 5 years from grant date",
    "After 5 years, a Resident Return visa may be needed to re-enter Australia as a permanent resident",
    "May sponsor eligible relatives",
    "May become eligible for Australian citizenship",
    "Must obey Australian laws",
  ],

  risks: [
    "No state or territory nomination means the applicant will not be invited for this visa",
    "If the nominating state or territory withdraws nomination after application, the application becomes invalid",
    "A score below 65 points means the applicant will not be invited",
    "Invitation points may be higher than 65 depending on EOI claims",
    "Applicant must prove points claims after invitation",
    "Age must be under 45 at time of invitation",
    "Skills assessment must be suitable and valid",
    "Occupation must be on the relevant skilled occupation list",
    "State and territory agencies have their own nomination criteria",
    "Incomplete or incorrect information may delay or affect the application",
  ],

  english_requirements: {
    required_level: "Competent English",
    summary:
      "At the time of invitation, subclass 190 applicants must have at least Competent English.",
    test_validity:
      "Test scores must generally be achieved in the 3 years before the visa application, depending on the visa subclass.",
    passport_exemptions: [
      "Canada",
      "New Zealand",
      "Republic of Ireland",
      "United Kingdom of Great Britain and Northern Ireland",
      "United States of America",
    ],
    tests_taken_on_or_after_2025_08_07: {
      C1_Advanced: {
        listening: 163,
        reading: 163,
        writing: 170,
        speaking: 179,
      },
      CELPIP_General: {
        listening: 7,
        reading: 7,
        writing: 7,
        speaking: 7,
      },
      IELTS_Academic: {
        listening: 6,
        reading: 6,
        writing: 6,
        speaking: 6,
        note: "IELTS One Skill Retake may be accepted for eligible visas.",
      },
      IELTS_General_Training: {
        listening: 6,
        reading: 6,
        writing: 6,
        speaking: 6,
        note: "IELTS One Skill Retake may be accepted for eligible visas.",
      },
      MET: {
        listening: 56,
        reading: 55,
        writing: 57,
        speaking: 48,
        note: "MET Single Section Retake may be accepted for eligible visas.",
      },
      OET: {
        listening: 290,
        reading: 310,
        writing: 290,
        speaking: 330,
      },
      LANGUAGECERT_Academic: {
        listening: 57,
        reading: 60,
        writing: 64,
        speaking: 70,
      },
      PTE_Academic: {
        listening: 47,
        reading: 48,
        writing: 51,
        speaking: 54,
      },
      TOEFL_iBT: {
        listening: 16,
        reading: 16,
        writing: 19,
        speaking: 19,
        note: "Applicant must select Taking TOEFL for Australia when registering.",
      },
    },
    tests_taken_on_or_before_2025_08_06: {
      C1_Advanced: {
        listening: 169,
        reading: 169,
        writing: 169,
        speaking: 169,
        note:
          "From 12 February 2024 to 6 August 2025, only Cambridge C1 Advanced paper-based results are accepted. Earlier tests may still be accepted within validity periods.",
      },
      IELTS: {
        listening: 6,
        reading: 6,
        writing: 6,
        speaking: 6,
        note: "IELTS Academic or General Training.",
      },
      OET: {
        listening: "B",
        reading: "B",
        writing: "B",
        speaking: "B",
      },
      PTE_Academic: {
        listening: 50,
        reading: 50,
        writing: 50,
        speaking: 50,
      },
      TOEFL_iBT: {
        listening: 12,
        reading: 13,
        writing: 21,
        speaking: 21,
        note:
          "TOEFL iBT tests from 26 July 2023 to 4 May 2024 were not approved for Australian visa purposes.",
      },
    },
    online_tests_not_accepted: {
      rule:
        "The Department does not accept evidence from English language tests delivered completely online, remote-proctored, or at-home.",
      examples_not_accepted: [
        "CELPIP Online",
        "IELTS Online",
        "LANGUAGECERT Academic Online",
        "MET Digital taken at-home",
        "OET@Home",
        "TOEFL iBT Home Edition",
      ],
    },
    notes: [
      "Tests taken on or before 6 August 2025 may be used as evidence until 6 August 2028 inclusive, depending on the visa.",
      "Some visas may allow other forms of evidence.",
    ],
  },

  financial_requirements: {
    status: "not_primary_requirement_in_source_text",
    notes: [
      "The provided source does not describe a specific personal financial capacity requirement for subclass 190.",
      "Visa charges and possible second instalment for family members with less than functional English may apply.",
    ],
  },

  occupation_requirements: {
    summary:
      "Applicant must have an occupation on the relevant list of eligible skilled occupations for the Skilled Nominated subclass 190 visa.",
    state_specific_review_required: true,
    notes: [
      "Subclass 190 requires nomination by an Australian state or territory government agency.",
      "Each state or territory has its own nomination criteria and occupation priorities.",
      "Occupation eligibility should be checked against both the relevant skilled occupation list and the nominating state or territory criteria.",
    ],
    states_and_territories: [
      "Australian Capital Territory",
      "New South Wales",
      "Northern Territory",
      "Queensland",
      "South Australia",
      "Tasmania",
      "Victoria",
      "Western Australia",
    ],
  },

  points_test_rules: {
    minimum_points_required: 65,
    summary:
      "Subclass 190 is a points-tested visa. The applicant must score at least 65 points and may receive invitation based on EOI claims and state or territory nomination.",
    note:
      "Detailed points categories should reuse the same points-tested skilled migration table used for subclass 189 unless official subclass-specific differences are identified.",
  },
};

const skilledWorkRegional491Data = {
  subclass: "491",
  visa_name: "Skilled Work Regional (Provisional) visa",
  stream: "Main applicant",
  category: "Regional Skilled Migration",
  purpose: "Live, work and study in a designated regional area of Australia as a skilled worker.",
  stay_period: "5 years",
  cost: "From AUD 4,910 for the main applicant. Additional charges may apply for family members and second instalment charges.",
  work_rights: "Live, work and study in a designated regional area of Australia.",
  source_url: SWR_491_SOURCE_URL,
  last_checked: new Date("2026-04-25"),
  reviewed_status: "needs_review",
  key_requirements: [
    "Be nominated by a state or territory government agency or sponsored by an eligible relative",
    "Have an occupation on a relevant skilled occupation list",
    "Have a suitable skills assessment for the occupation",
    "Be invited to apply",
    "Satisfy the points test",
    "Score at least 65 points",
    "Be aged under 45 when invited to apply",
    "Have at least Competent English at time of invitation",
    "Live, work and study in a designated regional area of Australia if granted",
    "Meet health and character requirements",
    "Have paid back any debt to the Australian Government",
    "Sign the Australian Values Statement if 18 or older",
  ],
  documents_required: [
    "Expression of Interest through SkillSelect",
    "Invitation to apply",
    "Suitable skills assessment",
    "Identity documents",
    "Competent English evidence",
    "Evidence supporting points claims",
    "Character documents and police certificates if required",
    "Health examination results if requested",
    "Partner documents if applicable",
    "Dependent child documents if applicable",
    "Sponsor declaration if sponsored by eligible relative",
    "Proof sponsor is an eligible relative",
    "Proof sponsor is 18 or older",
    "Proof sponsor is Australian citizen, permanent resident, or eligible New Zealand citizen",
    "Proof sponsor usually resides in a designated area of Australia",
    "Translated documents for non-English documents",
  ],
  application_steps: [
    "Submit an Expression of Interest through SkillSelect",
    "Select Skilled Work Regional (Provisional) visa subclass 491 invited pathway",
    "Indicate whether seeking state or territory nomination or eligible relative sponsorship",
    "Wait for possible nomination, sponsorship invitation, or invitation round",
    "Receive an invitation to apply if selected",
    "Apply online through ImmiAccount within 60 calendar days of invitation",
    "Attach documents and pay the first visa application charge",
    "Respond to requests for more information if requested",
    "Complete health examinations or biometrics if requested",
    "Stay lawful while application is processed",
    "Wait for written visa outcome",
  ],
  visa_conditions: [
    "Temporary provisional visa valid for 5 years",
    "Must live, work and study in designated regional areas of Australia",
    "Travel to and from Australia while the visa is valid",
    "Time spent outside Australia does not extend the visa",
    "May apply for Permanent Residence (Skilled Regional) subclass 191 after 3 years if eligible",
    "Cannot extend this visa",
    "Family members who hold the visa must also live, work and study in designated regional areas",
    "Must comply with all visa conditions and Australian laws",
  ],
  risks: [
    "No invitation means the applicant cannot apply",
    "A score below 65 points means the applicant will not be invited",
    "Invitation points may be higher than 65 depending on EOI claims",
    "Age must be under 45 at time of invitation",
    "Skills assessment must be suitable and valid",
    "Occupation must be on the relevant skilled occupation list",
    "Nomination or sponsorship must be valid",
    "If nomination is withdrawn, visa may not be granted",
    "Applicants must live, work and study only in designated regional areas if granted",
    "Subclass 491 holders generally cannot apply for certain permanent visas until holding the 491 for 3 years",
    "Incomplete or incorrect information may delay or affect the application",
  ],
  english_requirements: {
    required_level: "Competent English",
    summary:
      "At the time of invitation, the primary applicant must have at least Competent English. Family members aged 18 or older must have Functional English or may need to pay a second instalment visa application charge.",
    competent_english: {
      passport_exemptions: [
        "Canada",
        "New Zealand",
        "Republic of Ireland",
        "United Kingdom of Great Britain and Northern Ireland",
        "United States of America",
      ],
      tests_taken_on_or_after_2025_08_07: {
        C1_Advanced: { listening: 163, reading: 163, writing: 170, speaking: 179 },
        CELPIP_General: { listening: 7, reading: 7, writing: 7, speaking: 7 },
        IELTS_Academic: { listening: 6, reading: 6, writing: 6, speaking: 6 },
        IELTS_General_Training: { listening: 6, reading: 6, writing: 6, speaking: 6 },
        MET: { listening: 56, reading: 55, writing: 57, speaking: 48 },
        OET: { listening: 290, reading: 310, writing: 290, speaking: 330 },
        LANGUAGECERT_Academic: { listening: 57, reading: 60, writing: 64, speaking: 70 },
        PTE_Academic: { listening: 47, reading: 48, writing: 51, speaking: 54 },
        TOEFL_iBT: {
          listening: 16,
          reading: 16,
          writing: 19,
          speaking: 19,
          note: "Applicant must select Taking TOEFL for Australia when registering.",
        },
      },
      tests_taken_on_or_before_2025_08_06: {
        C1_Advanced: { listening: 169, reading: 169, writing: 169, speaking: 169 },
        IELTS: { listening: 6, reading: 6, writing: 6, speaking: 6 },
        OET: { listening: "B", reading: "B", writing: "B", speaking: "B" },
        PTE_Academic: { listening: 50, reading: 50, writing: 50, speaking: 50 },
        TOEFL_iBT: {
          listening: 12,
          reading: 13,
          writing: 21,
          speaking: 21,
          note:
            "TOEFL iBT tests from 26 July 2023 to 4 May 2024 were not approved for Australian visa purposes.",
        },
      },
    },
    functional_english_for_family_members: {
      summary:
        "Family members aged 18 or older must show Functional English or may need to pay a second instalment charge.",
      passport_exemptions: [
        "Canada",
        "New Zealand",
        "Republic of Ireland",
        "United Kingdom of Great Britain and Northern Ireland",
        "United States of America",
      ],
      tests_taken_on_or_after_2025_08_07: {
        CELPIP_General: { overall: 5 },
        IELTS_Academic: { average: 4.5 },
        IELTS_General_Training: { average: 4.5 },
        MET: { overall: 38 },
        OET: { overall: 1020 },
        LANGUAGECERT_Academic: { overall: 38 },
        PTE_Academic: { overall: 24 },
        TOEFL_iBT: { overall: 26 },
      },
      tests_taken_on_or_before_2025_08_06: {
        C1_Advanced: { overall: 147 },
        IELTS: { average: 4.5 },
        PTE_Academic: { overall: 30 },
        TOEFL_iBT: {
          overall: 32,
          note:
            "TOEFL iBT tests from 26 July 2023 to 4 May 2024 were not approved for Australian visa purposes.",
        },
      },
    },
    online_tests_not_accepted: [
      "CELPIP Online",
      "IELTS Online",
      "LANGUAGECERT Academic Online",
      "MET Digital taken at-home",
      "OET@Home",
      "TOEFL iBT Home Edition",
    ],
  },
  financial_requirements: {
    status: "not_primary_requirement_in_source_text",
    notes: [
      "The source text does not describe a specific personal financial capacity requirement for subclass 491.",
      "Visa charges and possible second instalment charges may apply.",
      "Second instalment charge for family members with less than functional English is AUD 4,890.",
    ],
  },
  occupation_requirements: {
    summary:
      "Applicant must have an occupation on the combined list of eligible skilled occupations for a Skilled Regional subclass 491 visa.",
    regional_or_sponsor_specific_review_required: true,
    notes: [
      "Subclass 491 can involve state or territory nomination or eligible relative sponsorship.",
      "State and territory government agencies have their own nomination criteria.",
      "Occupation eligibility should be checked against the relevant skilled occupation list and nomination or sponsorship pathway.",
    ],
  },
  points_test_rules: {
    minimum_points_required: 65,
    summary:
      "Subclass 491 is a points-tested visa. Applicant must score at least 65 points and may receive invitation based on EOI claims, nomination, or eligible relative sponsorship.",
    note:
      "Detailed points categories should reuse the skilled migration points table used for subclass 189/190 unless subclass-specific differences are identified.",
  },
  regional_requirements: {
    summary: "Visa holders must live, work and study in designated regional areas of Australia.",
    pathway_to_permanent_residence:
      "May apply for Permanent Residence (Skilled Regional) subclass 191 after 3 years if eligible.",
    cannot_apply_for_certain_permanent_visas_before_3_years: [
      "Subclass 820 Partner visa",
      "Subclass 132 Business Talent",
      "Subclass 186 Employer Nomination Scheme",
      "Subclass 188 Business Innovation and Investment",
      "Subclass 189 Skilled Independent",
      "Subclass 190 Skilled Nominated",
      "Subclass 858 Global Talent",
    ],
  },
  nomination_or_sponsorship: {
    options: [
      "Nomination by Australian state or territory government agency",
      "Sponsorship by eligible relative",
    ],
    eligible_relative_sponsor_requirements: [
      "18 years old or older",
      "Usually resident in a designated area of Australia",
      "Australian citizen, Australian permanent resident, or eligible New Zealand citizen",
      "Eligible relative of the applicant or applicant's partner",
    ],
    eligible_relatives: [
      "Parent",
      "Child or step-child",
      "Brother or sister",
      "Adoptive brother or sister",
      "Step-brother or step-sister",
      "Aunt or uncle",
      "Adoptive aunt or uncle",
      "Step-aunt or step-uncle",
      "Nephew or niece",
      "Adoptive nephew or niece",
      "Step-nephew or step-niece",
      "Grandparent",
      "First cousin",
    ],
  },
};

const partnerVisa820801Data = {
  subclass: "820_801",
  visa_name: "Partner visa (onshore)",
  stream: "Apply in Australia",
  category: "Family Migration",
  purpose:
    "Allows the de facto partner or spouse of an Australian citizen, Australian permanent resident, or eligible New Zealand citizen to live in Australia temporarily and progress toward permanent residency.",
  stay_period: "Temporary until the permanent Partner visa subclass 801 is finalised or withdrawn",
  cost:
    "From AUD 9,365 for most applicants. From AUD 1,560 for Prospective Marriage visa subclass 300 holders. From AUD 1,980 for some former Prospective Marriage visa subclass 300 holders.",
  work_rights: "Live, work and study in Australia while the permanent Partner visa is processed.",
  key_requirements: [
    "Be in a genuine relationship with a spouse or de facto partner who is an Australian citizen, Australian permanent resident, or eligible New Zealand citizen",
    "Have the spouse or de facto partner sponsor the applicant",
    "Be in Australia when applying for the temporary Partner visa subclass 820",
    "Family members who apply with the applicant must also be in Australia",
    "Be in or outside Australia when the temporary visa application is decided",
    "Be 18 or older in most cases",
    "Meet spouse or de facto relationship requirements",
    "Meet health requirements",
    "Meet character requirements",
    "Have no debt to the Australian Government or have arranged repayment",
    "Sign the Australian Values Statement if required",
  ],
  documents_required: [
    "Passport and identity documents",
    "Birth certificate showing names of both parents, or accepted alternative identity document",
    "National identity card if available",
    "Proof of change of name if applicable",
    "Relationship history statement",
    "Marriage certificate or evidence marriage is valid in Australia if married",
    "De facto relationship evidence if applicable",
    "Evidence of at least 12 months de facto relationship unless an exemption applies",
    "Financial relationship evidence such as joint mortgage, lease, loans, bank accounts, or household bills",
    "Household evidence such as living arrangements, shared responsibilities, mail or emails addressed to both partners",
    "Social evidence such as joint invitations, travel together, friends in common, or Form 888 witness statements",
    "Commitment evidence showing long-term commitment, personal knowledge, contact while apart, and combined personal matters",
    "Evidence of former relationships if applicable",
    "Health examination evidence if requested",
    "Australian police certificate if required",
    "Overseas police certificates if required",
    "Military service records if applicable",
    "Sponsor evidence showing Australian citizenship, permanent residence, or eligible New Zealand citizen status",
    "Sponsorship for a Partner to Migrate to Australia form completed by sponsor",
    "Dependent child documents if applicable",
    "Parental responsibility documents for applicants under 18 if applicable",
    "Translations for non-English documents",
  ],
  application_steps: [
    "Prepare relationship, identity, sponsorship, health, character and family documents",
    "Apply online in ImmiAccount while in Australia",
    "Select Family and Stage 1 Partner or Prospective Marriage Visa",
    "Complete the application and pay the visa application charge",
    "Submit the application",
    "Give the Transaction Reference Number or Application ID to the sponsor",
    "Sponsor applies to sponsor the applicant using ImmiAccount",
    "Attach supporting documents to the completed application",
    "Complete health examinations if required",
    "Provide character documents and police certificates if required",
    "Respond to requests for more information if requested",
    "Stay lawful in Australia while the application is processed",
    "Wait for written decision on the subclass 820 temporary visa",
    "After the relevant period, provide additional documents for permanent Partner visa subclass 801 assessment",
  ],
  visa_conditions: [
    "Live, work and study in Australia",
    "Travel to and from Australia while the visa is held",
    "Obey Australian laws and visa conditions",
    "Use VEVO to check visa details and conditions",
    "Do not get another visa if it would affect eligibility for the permanent Partner visa subclass 801",
    "You cannot add family members to the subclass 820 application after the temporary visa is granted",
    "Notify the Department if circumstances change, including relationship status, contact details, passport details, or birth of a child",
  ],
  risks: [
    "Relationship breakdown may affect the temporary or permanent partner visa outcome",
    "Insufficient relationship evidence may delay or affect the application",
    "Missing sponsorship information may make an application invalid in some circumstances",
    "If the applicant does not hold a substantive visa, additional criteria may apply",
    "Certain previous visa refusals or cancellations may affect eligibility",
    "Certain regional visa holders may need to have held that visa for two or three years before applying",
    "A no further stay condition may prevent application unless waived",
    "Sponsor must be approved",
    "If an immigration officer grants a New Zealand passport holder a subclass 444 visa, it may override the temporary Partner visa and affect subclass 801 eligibility",
    "If another visa is granted, the applicant may no longer be eligible for the permanent Partner visa subclass 801",
    "Incorrect or incomplete information may lead to delays, invalidity or refusal",
  ],
  english_requirements: {
    status: "not_required_for_primary_applicant_in_source_text",
    notes: [
      "The provided source text does not specify a formal English test requirement for the primary subclass 820 applicant.",
    ],
  },
  financial_requirements: {
    status: "no_income_threshold_in_source_text",
    notes: [
      "The provided source text does not specify a personal income threshold for the applicant.",
      "The applicant must pay the correct visa application charge.",
      "Additional costs may include health checks, police certificates and biometrics.",
      "The sponsor must assist the applicant and included family members financially and with accommodation.",
    ],
  },
  relationship_requirements: {
    summary:
      "The applicant must be the spouse or de facto partner of an Australian citizen, Australian permanent resident, or eligible New Zealand citizen.",
    spouse: {
      requirement: "Must be in a married relationship and the marriage must be valid in Australia.",
      minimum_age_note: "Married applicants must, in most cases, be 18 or older when applying.",
    },
    de_facto: {
      requirement: "Must be in a de facto relationship.",
      usual_minimum_duration: "Usually at least 12 months immediately before applying.",
      notes: [
        "Time spent dating or in an online relationship might not count as being in a de facto relationship.",
        "The 12-month requirement may not apply where compelling and compassionate circumstances exist.",
        "The 12-month requirement may not apply in certain humanitarian visa circumstances.",
        "The 12-month requirement may not apply if the relationship is registered with an Australian State or Territory authority.",
      ],
    },
    evidence_categories: {
      financial: [
        "Joint mortgage or lease documents",
        "Joint loans for major assets",
        "Joint bank account statements",
        "Household bills in both names",
      ],
      household: [
        "Statement about how housework is shared",
        "Household bills in both names",
        "Mail or emails addressed to both partners",
        "Documents showing joint responsibility for children",
        "Documents proving living arrangements",
      ],
      social: [
        "Form 888 witness statements from people who know the relationship",
        "Joint invitations or evidence of going out together",
        "Proof of friends in common",
        "Proof of informing government, public or commercial bodies about the relationship",
        "Proof of joint sporting, cultural or social activities",
        "Proof of travel together",
      ],
      commitment: [
        "Knowledge of each other's background and family situation",
        "Combined personal matters",
        "Evidence of staying in touch while apart",
        "Evidence partners are not related by family",
        "Terms of wills if available",
      ],
    },
    relationship_history_statement_should_cover: [
      "How, when and where the couple first met",
      "How the relationship developed",
      "When the couple moved in together, got engaged or married",
      "What the couple does together",
      "Time spent apart",
      "Significant events in the relationship",
      "Plans for the future",
    ],
  },
  pathway: {
    summary:
      "Subclass 820 is the temporary stage and subclass 801 is the permanent stage of the onshore Partner visa pathway.",
    stage_1: {
      subclass: "820",
      type: "temporary",
      description:
        "Allows the applicant to live in Australia temporarily while the permanent Partner visa is processed.",
    },
    stage_2: {
      subclass: "801",
      type: "permanent",
      description:
        "Allows the applicant to live in Australia permanently after permanent stage assessment.",
    },
    permanent_stage_timing_note:
      "Permanent stage assessment generally starts from the date of eligibility, usually 2 years after applying for the temporary and permanent Partner visas.",
  },
  permanent_stage_801: {
    subclass: "801",
    visa_name: "Partner visa (Permanent)",
    stage: "permanent",
    stay_period: "Permanently",
    cost: "Paid when applying for the temporary and permanent Partner visas",
    processing_time_note:
      "Processing time starts from the date of eligibility, generally 2 years after applying for the temporary and permanent Partner visas.",
    key_requirements: [
      "Hold a temporary Partner visa subclass 820 or Dependent Child visa subclass 445",
      "In most cases, continue to be in a genuine and ongoing relationship with the sponsor",
      "Two years must usually have passed since applying for the subclass 820 and 801 visas",
      "Continue to meet health requirements",
      "Have no debt to the Australian Government or have arranged repayment",
      "Visa grant must be in the best interests of any applicant under 18",
    ],
    rights_and_benefits: [
      "Live, work and study in Australia permanently",
      "Access Medicare",
      "Sponsor eligible family members to come to Australia",
      "Travel to and from Australia for 5 years from grant date",
      "Apply for Australian citizenship if eligible",
      "Attend free English language classes through the Adult Migrant English Program if eligible",
    ],
    documents_required: [
      "Most recent passport identity pages",
      "Current Australian police certificate if required",
      "Overseas police certificates if required",
      "Evidence that the relationship with the sponsor is continuing",
      "Commonwealth statutory declaration completed by sponsor",
      "Marriage certificate if married",
      "Proof of de facto relationship if applicable",
      "Financial evidence",
      "Household evidence",
      "Social evidence",
      "Commitment evidence",
      "Form 888 witness statements",
      "Family member documents if applicable",
      "Translated documents for non-English documents",
    ],
    relationship_evidence: {
      summary:
        "Applicant must provide evidence they continue to be the spouse or de facto partner of the same person who sponsored the temporary Partner visa.",
      sponsor_statutory_declaration_should_cover: [
        "Whether the couple has mutual commitment to the exclusion of all others",
        "Whether the relationship is genuine and continuing",
        "Whether the couple lives together or does not live permanently apart",
        "When the relationship began and how long the couple has lived together",
        "Financial commitments shared by the couple",
        "Nature of the household including joint responsibility for children",
        "Social aspects of the relationship",
        "Nature of commitment to each other",
        "Plans for the future",
      ],
      evidence_categories: {
        financial: [
          "Joint mortgage or lease documents",
          "Joint loans for major assets",
          "Joint bank account statements",
          "Household bills in both names",
        ],
        household: [
          "Statement about how housework is shared",
          "Household bills in both names",
          "Mail or emails addressed to both partners",
          "Documents showing joint responsibility for children",
          "Documents proving living arrangements",
        ],
        social: [
          "Form 888 witness statements",
          "Joint invitations",
          "Proof of friends in common",
          "Proof of informing government, public or commercial bodies about the relationship",
          "Proof of joint sporting, cultural or social activities",
          "Proof of travel together",
        ],
        commitment: [
          "Knowledge of each other's background and family situation",
          "Combined personal matters",
          "Evidence of staying in touch while apart",
          "Evidence partners are not related by family",
          "Terms of wills if available",
        ],
      },
    },
    application_steps: [
      "Check current visa status using VEVO",
      "Wait until eligible for permanent stage assessment, generally 2 years after applying for the temporary and permanent Partner visas",
      "Gather updated identity, character and relationship evidence",
      "Log in to ImmiAccount",
      "Select New application",
      "Select Family",
      "Select Stage 2 - Permanent Partner Visa Assessment",
      "Complete the application",
      "Attach supporting documents",
      "Submit documents for permanent stage assessment",
      "Track and manage the application in ImmiAccount",
      "Respond to requests for more information if requested",
      "Wait for written decision",
    ],
    visa_conditions: [
      "Permanent residency",
      "Must obey Australian laws",
      "Travel facility valid for 5 years from grant date",
      "Resident Return visa may be needed to re-enter Australia as permanent resident after travel facility expires",
      "Cannot add family members after the permanent Partner visa is granted",
    ],
    risks: [
      "Permanent stage generally cannot be assessed until 2 years after initial partner visa application",
      "Relationship breakdown may affect the permanent visa outcome, though some exceptions may apply",
      "Domestic and family violence provisions may be relevant in some circumstances",
      "Incomplete documents may delay processing",
      "Incorrect information may affect the application",
      "Expired police certificates may need to be replaced",
      "If permanent Partner visa is refused, the person may no longer hold a temporary Partner visa",
    ],
    family_members: {
      dependent_child_445_pathway:
        "To include a dependent child in the permanent Partner visa application after subclass 820 grant, the child must usually hold a Dependent Child visa subclass 445 and be in Australia.",
      cannot_add_after_grant:
        "Family members cannot be added after the permanent Partner visa subclass 801 is granted.",
    },
    sponsor_801_requirements: {
      summary:
        "The sponsor must be the same person who sponsored the applicant for the temporary Partner visa and must continue to be married or in a de facto relationship with the applicant.",
      documents_required: [
        "Personal details page of most recent passport showing signature or Australian driver licence",
        "Completed Commonwealth statutory declaration about the relationship",
      ],
      obligations: [
        "Sponsor the partner and included family members",
        "Assist financially and with accommodation",
        "Tell the Department if circumstances change",
      ],
      withdrawal_note:
        "Sponsor cannot withdraw after the visa is granted, but may be able to withdraw sponsorship before the permanent Partner visa decision.",
    },
  },
  sponsor_requirements: {
    summary: "The sponsor is usually the applicant's partner and must be approved.",
    who_can_sponsor: [
      "Australian citizen",
      "Australian permanent resident",
      "Eligible New Zealand citizen",
    ],
    sponsor_obligations: [
      "Sponsor the partner and included family members",
      "Assist the partner and included family members financially",
      "Assist the partner and included family members with accommodation",
    ],
    sponsor_age:
      "Sponsor must be 18 or older. If under 18 and married to the applicant, a parent or guardian might be able to sponsor.",
    sponsorship_duration:
      "Sponsorship generally ends 2 years after the temporary partner visa is granted if applicants are in Australia at grant, or 2 years after next arrival in Australia if applicants are outside Australia at grant.",
    sponsor_documents: [
      "Evidence of Australian citizenship, Australian permanent residence, or eligible New Zealand citizenship",
      "Passport copy",
      "Birth certificate copy",
      "Photo of face",
      "Evidence of usually living in Australia if Australian permanent resident or eligible New Zealand citizen",
      "Australian police certificate",
      "Overseas police certificate if required",
      "Written consent for disclosure of relevant convictions to the visa applicant",
    ],
    sponsor_risks: [
      "Sponsorship may not be approved if character requirements are not met",
      "There are sponsorship limitations for certain offences involving children",
      "Sponsor can withdraw sponsorship before the permanent Partner visa subclass 801 decision",
      "Sponsor cannot withdraw as sponsor for subclass 820 after the visa is granted",
    ],
  },
  family_members: {
    can_include_dependent_child: true,
    notes: [
      "A dependent child can be included when lodging or after lodging but before the temporary visa is decided.",
      "Family members applying with the applicant must be in Australia.",
      "Family members must meet health and character requirements.",
      "After subclass 820 grant, family members cannot be added to the subclass 820 application.",
      "A dependent child may need to apply for a Dependent child visa subclass 445 before being included in the permanent partner visa application.",
    ],
  },
  domestic_and_family_violence: {
    summary:
      "The source notes that family violence provisions may apply and information is confidential.",
    notes: [
      "If experiencing domestic and family violence, the applicant may still be eligible for temporary and permanent Partner visas.",
      "The source recommends online safety steps such as changing ImmiAccount and email passwords.",
    ],
  },
  faq_summary: {
    online_application:
      "Applications must generally be lodged online using ImmiAccount. Paper applications are only available in limited circumstances and by invitation.",
    progress_updates:
      "The Department does not provide progress updates within standard processing times; applicants can check ImmiAccount.",
    urgent_processing:
      "Priority processing may be considered for compelling and compassionate circumstances, but there is no guarantee.",
    health_exams:
      "Health examinations can be completed after applying and are usually valid for 12 months.",
    withdrawal:
      "Applicants can withdraw online using ImmiAccount; adult applicants included in the withdrawal must consent.",
    review_rights:
      "If refusal is reviewable, the notification will explain how to apply for review.",
    permanent_stage_documents:
      "If two years have passed since first applying and the applicant holds subclass 820, they may complete Stage 2 Permanent Partner Visa Assessment in ImmiAccount.",
  },
};

async function createTables() {
  try {
    console.log("📊 Creating tables if they don't exist...");

    // Create visa_types table
    await sql`
      CREATE TABLE IF NOT EXISTS visa_types (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subclass TEXT NOT NULL UNIQUE,
        visa_name TEXT NOT NULL,
        category TEXT NOT NULL,
        purpose TEXT,
        stay_period TEXT,
        cost TEXT,
        work_rights TEXT,
        source_url TEXT,
        last_checked DATE,
        reviewed_status TEXT DEFAULT 'needs_review',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    console.log("✅ Created visa_types table");

    // Create visa_structured_data table
    await sql`
      CREATE TABLE IF NOT EXISTS visa_structured_data (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        visa_type_id UUID NOT NULL REFERENCES visa_types(id),
        key_requirements JSONB,
        documents_required JSONB,
        application_steps JSONB,
        visa_conditions JSONB,
        risks JSONB,
        english_requirements JSONB,
        financial_requirements JSONB,
        raw_json JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    console.log("✅ Created visa_structured_data table");

    // Create source_snapshots table
    await sql`
      CREATE TABLE IF NOT EXISTS source_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        visa_type_id UUID NOT NULL REFERENCES visa_types(id),
        source_url TEXT NOT NULL,
        pdf_snapshot_url TEXT,
        raw_text TEXT,
        captured_at TIMESTAMP DEFAULT NOW(),
        content_hash TEXT,
        notes TEXT
      )
    `;

    console.log("✅ Created source_snapshots table");
  } catch (error) {
    console.error("❌ Table creation error:", error);
    throw error;
  }
}

async function seed() {
  try {
    console.log("🌱 Starting database seed...");

    // Create tables
    await createTables();

    const visaPayload = {
      subclass: studentVisa500Data.subclass,
      visa_name: studentVisa500Data.visa_name,
      category: studentVisa500Data.category,
      purpose: studentVisa500Data.purpose,
      stay_period: studentVisa500Data.stay_period,
      cost: studentVisa500Data.cost,
      work_rights: studentVisa500Data.work_rights,
      source_url: studentVisa500Data.source_url,
      last_checked: toIsoDate(studentVisa500Data.last_checked),
      reviewed_status: studentVisa500Data.reviewed_status,
      updated_at: new Date(),
    };

    const [upsertedVisa] = await db
      .insert(visaTypes)
      .values(visaPayload)
      .onConflictDoUpdate({
        target: visaTypes.subclass,
        set: visaPayload,
      })
      .returning();

    console.log("✅ Upserted visa type:", upsertedVisa.id);

    const structuredDataPayload = {
      visa_type_id: upsertedVisa.id,
      key_requirements: studentVisa500Data.key_requirements,
      documents_required: studentVisa500Data.documents_required,
      application_steps: studentVisa500Data.application_steps,
      visa_conditions: studentVisa500Data.visa_conditions,
      risks: studentVisa500Data.risks,
      english_requirements: studentVisa500Data.english_requirements,
      financial_requirements: studentVisa500Data.financial_requirements,
      raw_json: {
        ...studentVisa500Data,
        last_checked: toIsoDate(studentVisa500Data.last_checked),
      },
      updated_at: new Date(),
    };

    const [existingStructuredData] = await db
      .select({ id: visaStructuredData.id })
      .from(visaStructuredData)
      .where(eq(visaStructuredData.visa_type_id, upsertedVisa.id))
      .limit(1);

    if (existingStructuredData) {
      const [updatedStructuredData] = await db
        .update(visaStructuredData)
        .set(structuredDataPayload)
        .where(eq(visaStructuredData.id, existingStructuredData.id))
        .returning({ id: visaStructuredData.id });

      console.log("✅ Updated structured data:", updatedStructuredData.id);
    } else {
      const [insertedStructuredData] = await db
        .insert(visaStructuredData)
        .values(structuredDataPayload)
        .returning({ id: visaStructuredData.id });

      console.log("✅ Inserted structured data:", insertedStructuredData.id);
    }

    const existingSnapshots = await db
      .select({
        id: sourceSnapshots.id,
        pdf_snapshot_url: sourceSnapshots.pdf_snapshot_url,
      })
      .from(sourceSnapshots)
      .where(eq(sourceSnapshots.visa_type_id, upsertedVisa.id));

    const matchingSnapshot = existingSnapshots.find(
      (snapshot) => snapshot.pdf_snapshot_url === STUDENT_VISA_PDF_URL
    );

    if (matchingSnapshot) {
      console.log("✅ PDF snapshot already exists:", matchingSnapshot.id);
    } else {
      const [insertedSnapshot] = await db
        .insert(sourceSnapshots)
        .values({
          visa_type_id: upsertedVisa.id,
          source_url: STUDENT_VISA_SOURCE_URL,
          pdf_snapshot_url: STUDENT_VISA_PDF_URL,
          captured_at: STUDENT_VISA_CAPTURED_AT,
          notes: "Manual PDF snapshot uploaded to Vercel Blob",
        })
        .returning({ id: sourceSnapshots.id });

      console.log("✅ Inserted PDF snapshot:", insertedSnapshot.id);
    }

    // ── Subclass 482: Skills in Demand visa (Core Skills stream) ──────────────

    const visa482Payload = {
      subclass: skillsInDemand482Data.subclass,
      visa_name: skillsInDemand482Data.visa_name,
      category: skillsInDemand482Data.category,
      purpose: skillsInDemand482Data.purpose,
      stay_period: skillsInDemand482Data.stay_period,
      cost: skillsInDemand482Data.cost,
      work_rights: skillsInDemand482Data.work_rights,
      source_url: skillsInDemand482Data.source_url,
      last_checked: toIsoDate(skillsInDemand482Data.last_checked),
      reviewed_status: skillsInDemand482Data.reviewed_status,
      updated_at: new Date(),
    };

    const [upsertedVisa482] = await db
      .insert(visaTypes)
      .values(visa482Payload)
      .onConflictDoUpdate({
        target: visaTypes.subclass,
        set: visa482Payload,
      })
      .returning();

    console.log("✅ Upserted visa type 482:", upsertedVisa482.id);

    const structured482Payload = {
      visa_type_id: upsertedVisa482.id,
      key_requirements: skillsInDemand482Data.key_requirements,
      documents_required: skillsInDemand482Data.documents_required,
      application_steps: skillsInDemand482Data.application_steps,
      visa_conditions: skillsInDemand482Data.visa_conditions,
      risks: skillsInDemand482Data.risks,
      english_requirements: skillsInDemand482Data.english_requirements,
      financial_requirements: skillsInDemand482Data.financial_requirements,
      raw_json: {
        ...skillsInDemand482Data,
        last_checked: toIsoDate(skillsInDemand482Data.last_checked),
      },
      updated_at: new Date(),
    };

    const [existingStructuredData482] = await db
      .select({ id: visaStructuredData.id })
      .from(visaStructuredData)
      .where(eq(visaStructuredData.visa_type_id, upsertedVisa482.id))
      .limit(1);

    if (existingStructuredData482) {
      const [updated] = await db
        .update(visaStructuredData)
        .set(structured482Payload)
        .where(eq(visaStructuredData.id, existingStructuredData482.id))
        .returning({ id: visaStructuredData.id });

      console.log("✅ Updated structured data 482:", updated.id);
    } else {
      const [inserted] = await db
        .insert(visaStructuredData)
        .values(structured482Payload)
        .returning({ id: visaStructuredData.id });

      console.log("✅ Inserted structured data 482:", inserted.id);
    }

    const existingSnapshots482 = await db
      .select({ id: sourceSnapshots.id, pdf_snapshot_url: sourceSnapshots.pdf_snapshot_url })
      .from(sourceSnapshots)
      .where(eq(sourceSnapshots.visa_type_id, upsertedVisa482.id));

    const snapshotsToSeed = [
      {
        source_url: SID_482_SOURCE_URL,
        pdf_snapshot_url: SID_482_PDF_URL,
        captured_at: SID_482_CAPTURED_AT,
        notes: "Manual PDF snapshot of subclass 482 Core Skills stream page uploaded to Vercel Blob",
      },
      {
        source_url: SID_482_ENGLISH_SOURCE_URL,
        pdf_snapshot_url: SID_482_ENGLISH_PDF_URL,
        captured_at: SID_482_CAPTURED_AT,
        notes: "Manual PDF snapshot of subclass 482 English proficiency requirements page uploaded to Vercel Blob",
      },
    ];

    for (const snap of snapshotsToSeed) {
      const existing = existingSnapshots482.find(
        (s) => s.pdf_snapshot_url === snap.pdf_snapshot_url
      );
      if (existing) {
        console.log("✅ PDF snapshot 482 already exists:", existing.id);
      } else {
        const [inserted] = await db
          .insert(sourceSnapshots)
          .values({ visa_type_id: upsertedVisa482.id, ...snap })
          .returning({ id: sourceSnapshots.id });
        console.log("✅ Inserted PDF snapshot 482:", inserted.id, "|", snap.notes);
      }
    }

    // ── Subclass 189: Skilled Independent visa (Points tested stream) ──────────────

    const visa189Payload = {
      subclass: skilledIndependent189Data.subclass,
      visa_name: skilledIndependent189Data.visa_name,
      category: skilledIndependent189Data.category,
      purpose: skilledIndependent189Data.purpose,
      stay_period: skilledIndependent189Data.stay_period,
      cost: skilledIndependent189Data.cost,
      work_rights: skilledIndependent189Data.work_rights,
      source_url: skilledIndependent189Data.source_url,
      last_checked: toIsoDate(skilledIndependent189Data.last_checked),
      reviewed_status: skilledIndependent189Data.reviewed_status,
      updated_at: new Date(),
    };

    const [upsertedVisa189] = await db
      .insert(visaTypes)
      .values(visa189Payload)
      .onConflictDoUpdate({
        target: visaTypes.subclass,
        set: visa189Payload,
      })
      .returning();

    console.log("✅ Upserted visa type 189:", upsertedVisa189.id);

    const structured189Payload = {
      visa_type_id: upsertedVisa189.id,
      key_requirements: skilledIndependent189Data.key_requirements,
      documents_required: skilledIndependent189Data.documents_required,
      application_steps: skilledIndependent189Data.application_steps,
      visa_conditions: skilledIndependent189Data.visa_conditions,
      risks: skilledIndependent189Data.risks,
      english_requirements: skilledIndependent189Data.english_requirements,
      financial_requirements: skilledIndependent189Data.financial_requirements,
      raw_json: {
        ...skilledIndependent189Data,
        last_checked: toIsoDate(skilledIndependent189Data.last_checked),
      },
      updated_at: new Date(),
    };

    const [existingStructuredData189] = await db
      .select({ id: visaStructuredData.id })
      .from(visaStructuredData)
      .where(eq(visaStructuredData.visa_type_id, upsertedVisa189.id))
      .limit(1);

    if (existingStructuredData189) {
      const [updated] = await db
        .update(visaStructuredData)
        .set(structured189Payload)
        .where(eq(visaStructuredData.id, existingStructuredData189.id))
        .returning({ id: visaStructuredData.id });

      console.log("✅ Updated structured data 189:", updated.id);
    } else {
      const [inserted] = await db
        .insert(visaStructuredData)
        .values(structured189Payload)
        .returning({ id: visaStructuredData.id });

      console.log("✅ Inserted structured data 189:", inserted.id);
    }

    // Seed PDF snapshot for 189
    const existingSnapshots189 = await db
      .select({ id: sourceSnapshots.id, pdf_snapshot_url: sourceSnapshots.pdf_snapshot_url })
      .from(sourceSnapshots)
      .where(eq(sourceSnapshots.visa_type_id, upsertedVisa189.id));

    const snapshot189 = {
      source_url: SI_189_SOURCE_URL,
      pdf_snapshot_url: SI_189_PDF_URL,
      captured_at: SI_189_CAPTURED_AT,
      notes: "Manual PDF snapshot of subclass 189 Points-tested stream page uploaded to Vercel Blob",
    };

    const existingSnapshot189 = existingSnapshots189.find(
      (s) => s.pdf_snapshot_url === snapshot189.pdf_snapshot_url
    );

    if (existingSnapshot189) {
      console.log("✅ PDF snapshot 189 already exists:", existingSnapshot189.id);
    } else {
      const [inserted] = await db
        .insert(sourceSnapshots)
        .values({ visa_type_id: upsertedVisa189.id, ...snapshot189 })
        .returning({ id: sourceSnapshots.id });
      console.log("✅ Inserted PDF snapshot 189:", inserted.id, "|", snapshot189.notes);
    }

    // ── Subclass 190: Skilled Nominated visa ───────────────────────────────

    const visa190Payload = {
      subclass: skilledNominated190Data.subclass,
      visa_name: skilledNominated190Data.visa_name,
      category: skilledNominated190Data.category,
      purpose: skilledNominated190Data.purpose,
      stay_period: skilledNominated190Data.stay_period,
      cost: skilledNominated190Data.cost,
      work_rights: skilledNominated190Data.work_rights,
      source_url: skilledNominated190Data.source_url,
      last_checked: toIsoDate(skilledNominated190Data.last_checked),
      reviewed_status: skilledNominated190Data.reviewed_status,
      updated_at: new Date(),
    };

    const [upsertedVisa190] = await db
      .insert(visaTypes)
      .values(visa190Payload)
      .onConflictDoUpdate({
        target: visaTypes.subclass,
        set: visa190Payload,
      })
      .returning();

    console.log("✅ Upserted visa type 190:", upsertedVisa190.id);

    const structured190Payload = {
      visa_type_id: upsertedVisa190.id,
      key_requirements: skilledNominated190Data.key_requirements,
      documents_required: skilledNominated190Data.documents_required,
      application_steps: skilledNominated190Data.application_steps,
      visa_conditions: skilledNominated190Data.visa_conditions,
      risks: skilledNominated190Data.risks,
      english_requirements: skilledNominated190Data.english_requirements,
      financial_requirements: skilledNominated190Data.financial_requirements,
      raw_json: {
        ...skilledNominated190Data,
        last_checked: toIsoDate(skilledNominated190Data.last_checked),
      },
      updated_at: new Date(),
    };

    const [existingStructuredData190] = await db
      .select({ id: visaStructuredData.id })
      .from(visaStructuredData)
      .where(eq(visaStructuredData.visa_type_id, upsertedVisa190.id))
      .limit(1);

    if (existingStructuredData190) {
      const [updated] = await db
        .update(visaStructuredData)
        .set(structured190Payload)
        .where(eq(visaStructuredData.id, existingStructuredData190.id))
        .returning({ id: visaStructuredData.id });

      console.log("✅ Updated structured data 190:", updated.id);
    } else {
      const [inserted] = await db
        .insert(visaStructuredData)
        .values(structured190Payload)
        .returning({ id: visaStructuredData.id });

      console.log("✅ Inserted structured data 190:", inserted.id);
    }

    const existingSnapshots190 = await db
      .select({ id: sourceSnapshots.id, pdf_snapshot_url: sourceSnapshots.pdf_snapshot_url })
      .from(sourceSnapshots)
      .where(eq(sourceSnapshots.visa_type_id, upsertedVisa190.id));

    const snapshot190 = {
      source_url: SN_190_SOURCE_URL,
      pdf_snapshot_url: SN_190_PDF_URL,
      captured_at: SN_190_CAPTURED_AT,
      notes: "Manual PDF snapshot for subclass 190 Skilled Nominated visa",
    };

    const existingSnapshot190 = existingSnapshots190.find(
      (s) => s.pdf_snapshot_url === snapshot190.pdf_snapshot_url
    );

    if (existingSnapshot190) {
      console.log("✅ PDF snapshot 190 already exists:", existingSnapshot190.id);
    } else {
      const [inserted] = await db
        .insert(sourceSnapshots)
        .values({ visa_type_id: upsertedVisa190.id, ...snapshot190 })
        .returning({ id: sourceSnapshots.id });
      console.log("✅ Inserted PDF snapshot 190:", inserted.id, "|", snapshot190.notes);
    }

    // ── Subclass 491: Skilled Work Regional (Provisional) visa ──────────────

    const visa491Payload = {
      subclass: skilledWorkRegional491Data.subclass,
      visa_name: skilledWorkRegional491Data.visa_name,
      category: skilledWorkRegional491Data.category,
      purpose: skilledWorkRegional491Data.purpose,
      stay_period: skilledWorkRegional491Data.stay_period,
      cost: "From AUD 4,910 for the main applicant",
      work_rights: "Live, work and study in a designated regional area of Australia",
      source_url: skilledWorkRegional491Data.source_url,
      last_checked: toIsoDate(skilledWorkRegional491Data.last_checked),
      reviewed_status: skilledWorkRegional491Data.reviewed_status,
      updated_at: new Date(),
    };

    const [upsertedVisa491] = await db
      .insert(visaTypes)
      .values(visa491Payload)
      .onConflictDoUpdate({
        target: visaTypes.subclass,
        set: visa491Payload,
      })
      .returning();

    console.log("✅ Upserted visa type 491:", upsertedVisa491.id);

    const structured491Payload = {
      visa_type_id: upsertedVisa491.id,
      key_requirements: skilledWorkRegional491Data.key_requirements,
      documents_required: skilledWorkRegional491Data.documents_required,
      application_steps: skilledWorkRegional491Data.application_steps,
      visa_conditions: skilledWorkRegional491Data.visa_conditions,
      risks: skilledWorkRegional491Data.risks,
      english_requirements: skilledWorkRegional491Data.english_requirements,
      financial_requirements: skilledWorkRegional491Data.financial_requirements,
      raw_json: {
        ...skilledWorkRegional491Data,
        last_checked: toIsoDate(skilledWorkRegional491Data.last_checked),
      },
      updated_at: new Date(),
    };

    const [existingStructuredData491] = await db
      .select({ id: visaStructuredData.id })
      .from(visaStructuredData)
      .where(eq(visaStructuredData.visa_type_id, upsertedVisa491.id))
      .limit(1);

    if (existingStructuredData491) {
      const [updated] = await db
        .update(visaStructuredData)
        .set(structured491Payload)
        .where(eq(visaStructuredData.id, existingStructuredData491.id))
        .returning({ id: visaStructuredData.id });

      console.log("✅ Updated structured data 491:", updated.id);
    } else {
      const [inserted] = await db
        .insert(visaStructuredData)
        .values(structured491Payload)
        .returning({ id: visaStructuredData.id });

      console.log("✅ Inserted structured data 491:", inserted.id);
    }

    const existingSnapshots491 = await db
      .select({ id: sourceSnapshots.id, pdf_snapshot_url: sourceSnapshots.pdf_snapshot_url })
      .from(sourceSnapshots)
      .where(eq(sourceSnapshots.visa_type_id, upsertedVisa491.id));

    const snapshot491 = {
      source_url: SWR_491_SOURCE_URL,
      pdf_snapshot_url: SWR_491_PDF_URL,
      captured_at: SWR_491_CAPTURED_AT,
      notes:
        "Manual PDF snapshot for subclass 491 Skilled Work Regional (Provisional) visa - Main applicant",
    };

    const existingSnapshot491 = existingSnapshots491.find(
      (s) => s.pdf_snapshot_url === snapshot491.pdf_snapshot_url
    );

    if (existingSnapshot491) {
      console.log("✅ PDF snapshot 491 already exists:", existingSnapshot491.id);
    } else {
      const [inserted] = await db
        .insert(sourceSnapshots)
        .values({ visa_type_id: upsertedVisa491.id, ...snapshot491 })
        .returning({ id: sourceSnapshots.id });
      console.log("✅ Inserted PDF snapshot 491:", inserted.id, "|", snapshot491.notes);
    }

    // ── Subclass 820_801: Partner visa (onshore) ───────────────────────────

    const visa820801Payload = {
      subclass: partnerVisa820801Data.subclass,
      visa_name: partnerVisa820801Data.visa_name,
      category: partnerVisa820801Data.category,
      purpose: partnerVisa820801Data.purpose,
      stay_period: partnerVisa820801Data.stay_period,
      cost:
        "From AUD 9,365 for most applicants; from AUD 1,560 for Prospective Marriage visa subclass 300 holders",
      work_rights:
        "Live, work and study in Australia while the permanent Partner visa is processed",
      source_url: PARTNER_820_801_SOURCE_URL,
      last_checked: "2026-04-26",
      reviewed_status: "needs_review",
      updated_at: new Date(),
    };

    const [upsertedVisa820801] = await db
      .insert(visaTypes)
      .values(visa820801Payload)
      .onConflictDoUpdate({
        target: visaTypes.subclass,
        set: visa820801Payload,
      })
      .returning();

    console.log("✅ Upserted visa type 820_801:", upsertedVisa820801.id);

    const structured820801Payload = {
      visa_type_id: upsertedVisa820801.id,
      key_requirements: partnerVisa820801Data.key_requirements,
      documents_required: partnerVisa820801Data.documents_required,
      application_steps: partnerVisa820801Data.application_steps,
      visa_conditions: partnerVisa820801Data.visa_conditions,
      risks: partnerVisa820801Data.risks,
      english_requirements: partnerVisa820801Data.english_requirements,
      financial_requirements: partnerVisa820801Data.financial_requirements,
      raw_json: partnerVisa820801Data,
      updated_at: new Date(),
    };

    const [existingStructuredData820801] = await db
      .select({ id: visaStructuredData.id })
      .from(visaStructuredData)
      .where(eq(visaStructuredData.visa_type_id, upsertedVisa820801.id))
      .limit(1);

    if (existingStructuredData820801) {
      const [updated] = await db
        .update(visaStructuredData)
        .set(structured820801Payload)
        .where(eq(visaStructuredData.id, existingStructuredData820801.id))
        .returning({ id: visaStructuredData.id });

      console.log("✅ Updated structured data 820_801:", updated.id);
    } else {
      const [inserted] = await db
        .insert(visaStructuredData)
        .values(structured820801Payload)
        .returning({ id: visaStructuredData.id });

      console.log("✅ Inserted structured data 820_801:", inserted.id);
    }

    const existingSnapshots820801 = await db
      .select({ id: sourceSnapshots.id, pdf_snapshot_url: sourceSnapshots.pdf_snapshot_url })
      .from(sourceSnapshots)
      .where(eq(sourceSnapshots.visa_type_id, upsertedVisa820801.id));

    const snapshots820801 = [
      {
        source_url: PARTNER_820_801_SOURCE_URL,
        pdf_snapshot_url: PARTNER_820_801_PDF_URL,
        captured_at: PARTNER_820_801_CAPTURED_AT,
        notes:
          "Manual PDF snapshot for Partner visa subclass 820 temporary stage, onshore 820/801 pathway",
      },
      {
        source_url: PARTNER_801_SOURCE_URL,
        pdf_snapshot_url: PARTNER_801_PDF_URL,
        captured_at: PARTNER_820_801_CAPTURED_AT,
        notes:
          "Manual PDF snapshot for Partner visa subclass 801 permanent stage, onshore 820/801 pathway",
      },
    ];

    for (const snapshot820801 of snapshots820801) {
      const existingSnapshot820801 = existingSnapshots820801.find(
        (s) => s.pdf_snapshot_url === snapshot820801.pdf_snapshot_url
      );

      if (existingSnapshot820801) {
        console.log("✅ PDF snapshot 820_801 already exists:", existingSnapshot820801.id);
      } else {
        const [inserted] = await db
          .insert(sourceSnapshots)
          .values({ visa_type_id: upsertedVisa820801.id, ...snapshot820801 })
          .returning({ id: sourceSnapshots.id });
        console.log("✅ Inserted PDF snapshot 820_801:", inserted.id, "|", snapshot820801.notes);
      }
    }

    console.log("🎉 Database seed completed successfully!");
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  }
}

seed();
