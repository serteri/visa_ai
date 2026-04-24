import * as dotenv from "dotenv";

// Load environment variables FIRST
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

// Verify DATABASE_URL is loaded
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL not found. Make sure .env or .env.local exists with DATABASE_URL.");
  process.exit(1);
}

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { visaTypes, visaStructuredData } from "./schema";
import { eq } from "drizzle-orm";

// Initialize database
const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

const studentVisa500Data = {
  visa_name: "Student visa",
  subclass: "500",
  category: "Study",
  purpose: "Participate in an eligible course of study in Australia",
  stay_period: "Up to 6 years depending on course length",
  cost: "From AUD 2,000 unless exempt",
  work_rights:
    "Up to 48 hours per fortnight while course is in session; unlimited hours when course is not in session; exceptions apply for research and certain postgraduate students",
  source_url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500",
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

    // Check if visa 500 already exists
    const existingVisa = await db
      .select()
      .from(visaTypes)
      .where(eq(visaTypes.subclass, "500"))
      .limit(1);

    if (existingVisa.length > 0) {
      console.log("✅ Student visa 500 already exists, skipping insertion");
      return;
    }

    // Insert visa type
    const [insertedVisa] = await db
      .insert(visaTypes)
      .values({
        subclass: studentVisa500Data.subclass,
        visa_name: studentVisa500Data.visa_name,
        category: studentVisa500Data.category,
        purpose: studentVisa500Data.purpose,
        stay_period: studentVisa500Data.stay_period,
        cost: studentVisa500Data.cost,
        work_rights: studentVisa500Data.work_rights,
        source_url: studentVisa500Data.source_url,
        last_checked: studentVisa500Data.last_checked 
          ? studentVisa500Data.last_checked.toISOString().split('T')[0] 
          : undefined,
        reviewed_status: studentVisa500Data.reviewed_status,
      } as any)
      .returning();

    console.log("✅ Inserted visa type:", insertedVisa.id);

    // Insert structured data
    const [insertedData] = await db
      .insert(visaStructuredData)
      .values({
        visa_type_id: insertedVisa.id,
        key_requirements: studentVisa500Data.key_requirements,
        documents_required: studentVisa500Data.documents_required,
        application_steps: studentVisa500Data.application_steps,
        visa_conditions: studentVisa500Data.visa_conditions,
        risks: studentVisa500Data.risks,
        english_requirements: studentVisa500Data.english_requirements,
        financial_requirements: studentVisa500Data.financial_requirements,
        raw_json: studentVisa500Data,
      })
      .returning();

    console.log("✅ Inserted structured data:", insertedData.id);
    console.log("🎉 Database seed completed successfully!");
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  }
}

seed();
