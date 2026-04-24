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
const SI_189_CAPTURED_AT = new Date("2026-04-25T00:00:00.000Z");

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
  visa_name: "Skilled Independent visa",
  subclass: "189",
  stream: "Points tested stream",
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
    "Have a suitable skills assessment for the nominated occupation",
    "Be invited to apply for this visa",
    "Satisfy the points test",
    "Be aged under 45 when invited to apply",
    "Score at least 65 points or more",
    "Have at least Competent English at the time of invitation",
    "Meet health and character requirements",
    "Have paid back any debt to the Australian Government",
    "Sign the Australian Values Statement if 18 or older",
    "Not have a visa cancellation or refusal history that affects eligibility",
  ],
  documents_required: [
    "Expression of Interest through SkillSelect",
    "Invitation to apply",
    "Suitable skills assessment",
    "Evidence supporting points claims",
    "English language evidence",
    "Identity documents",
    "Health examination results if requested",
    "Character documents and police certificates if requested",
    "Family member documents if included",
    "Evidence for education, employment, partner skills and other claimed points",
  ],
  application_steps: [
    "Submit an Expression of Interest through SkillSelect",
    "Wait for an invitation to apply",
    "Gather documents supporting EOI claims and eligibility",
    "Apply online through ImmiAccount within 60 days of invitation",
    "Attach documents and pay the application charge",
    "Respond to requests for additional information if requested",
    "Complete health examinations or biometrics if requested",
    "Wait for written visa outcome",
  ],
  visa_conditions: [
    "Permanent visa",
    "Live, work and study anywhere in Australia",
    "Travel to and from Australia for 5 years from grant date",
    "After 5 years, a Resident Return visa may be needed to re-enter Australia as a permanent resident",
    "May sponsor eligible relatives for permanent residence",
    "May become eligible for Australian citizenship",
  ],
  risks: [
    "No invitation means the applicant cannot apply",
    "A score below 65 points means the applicant will not be invited",
    "Invitation points may be higher than 65 depending on EOI claims",
    "Evidence must support all points claims",
    "Age must be under 45 at invitation",
    "Skills assessment must be suitable and valid",
    "Occupation must be on the relevant skilled occupation list",
    "Previous visa refusals or cancellations may affect eligibility",
    "Incomplete or incorrect information may delay or affect the application",
  ],
  english_requirements: {
    required_level: "Competent English",
    summary:
      "At the time of invitation, the applicant must have at least Competent English.",
    passport_exemptions: [
      "Canada",
      "New Zealand",
      "Republic of Ireland",
      "United Kingdom",
      "United States of America",
    ],
    tests_from_2025_08_07: {
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
        note: "Must select Taking TOEFL for Australia when registering.",
      },
    },
    tests_on_or_before_2025_08_06: {
      C1_Advanced: { listening: 169, reading: 169, writing: 169, speaking: 169 },
      IELTS: { listening: 6, reading: 6, writing: 6, speaking: 6 },
      OET: { listening: "B", reading: "B", writing: "B", speaking: "B" },
      PTE_Academic: { listening: 50, reading: 50, writing: 50, speaking: 50 },
      TOEFL_iBT: {
        listening: 12,
        reading: 13,
        writing: 21,
        speaking: 21,
        note: "TOEFL iBT tests from 26 July 2023 to 4 May 2024 were not approved.",
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
      "The main provided source does not describe a specific personal financial capacity requirement for subclass 189.",
      "Visa charges and possible second instalment for family members with less than functional English may apply.",
    ],
  },
  occupation_requirements: {
    summary:
      "Applicant must have an occupation on the relevant skilled occupation list for subclass 189 Points-tested stream.",
    list_name: "MLTSSL short list from provided source",
    note: "This occupation list should later become searchable/filterable.",
    occupations: [
      "Accountant (General)",
      "External Auditor",
      "Internal Auditor",
      "Management Accountant",
      "Tax Accountant",
      "Qualified Architect",
      "Civil Engineer",
      "Electrical Engineer",
      "Mechanical Engineer",
      "Software-related occupations should only be added if present in official occupation source",
      "Registered Nurse",
      "Midwife",
      "General Practitioner",
      "Physiotherapist",
      "Social Worker",
      "Chef",
      "Carpenter",
      "Electrician (General)",
      "Plumber (General)",
      "Welder (First Class)",
    ],
  },
  points_test_rules: {
    minimum_points_required: 65,
    age: [
      { range: "18 to less than 25", points: 25 },
      { range: "25 to less than 33", points: 30 },
      { range: "33 to less than 40", points: 25 },
      { range: "40 to less than 45", points: 15 },
    ],
    english_language: [
      { level: "Competent English", points: 0 },
      { level: "Proficient English", points: 10 },
      { level: "Superior English", points: 20 },
    ],
    overseas_skilled_employment: [
      { years: "Less than 3 years", points: 0 },
      { years: "At least 3 but less than 5 years", points: 5 },
      { years: "At least 5 but less than 8 years", points: 10 },
      { years: "At least 8 years", points: 15 },
    ],
    australian_skilled_employment: [
      { years: "Less than 1 year", points: 0 },
      { years: "At least 1 but less than 3 years", points: 5 },
      { years: "At least 3 but less than 5 years", points: 10 },
      { years: "At least 5 but less than 8 years", points: 15 },
      { years: "At least 8 years", points: 20 },
    ],
    employment_points_cap: 20,
    education: [
      { qualification: "Doctorate", points: 20 },
      { qualification: "Bachelor degree or higher recognised standard", points: 15 },
      { qualification: "Diploma or trade qualification from Australian institution", points: 10 },
      { qualification: "Qualification recognised by assessing authority", points: 10 },
    ],
    specialist_education: [
      {
        requirement:
          "Masters by research or Doctorate from Australian institution with at least 2 academic years in relevant field",
        points: 10,
      },
    ],
    australian_study_requirement: [{ requirement: "Meet Australian study requirement", points: 5 }],
    professional_year: [{ requirement: "Completed Professional Year in Australia", points: 5 }],
    credentialled_community_language: [
      { requirement: "Recognised qualification in a credentialled community language", points: 5 },
    ],
    study_in_regional_australia: [
      {
        requirement:
          "Australian study requirement completed while living and studying in eligible regional Australia",
        points: 5,
      },
    ],
    partner_skills: [
      {
        requirement:
          "Partner applicant under 45 with competent English, skilled occupation and suitable skills assessment",
        points: 10,
      },
      { requirement: "Partner applicant has competent English", points: 5 },
      { requirement: "Single, or partner is Australian citizen or permanent resident", points: 10 },
    ],
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

    console.log("🎉 Database seed completed successfully!");
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  }
}

seed();
