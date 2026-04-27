"use server";

import { sql } from "drizzle-orm";

import { db } from "@/db";
import { fullCheckWaitlist } from "@/db/schema";

export type FullCheckWaitlistState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Record<string, string>;
  report?: {
    possiblePathways: string[];
    riskIndicators: string[];
    documentChecklist: string[];
  };
};

async function ensureFullCheckWaitlistTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS full_check_waitlist (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL,
      full_name TEXT,
      visa_interest TEXT,
      preferred_language TEXT,
      current_country TEXT,
      main_goal TEXT,
      source TEXT DEFAULT 'full_check',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    ALTER TABLE full_check_waitlist
    ADD COLUMN IF NOT EXISTS full_name TEXT
  `);

  await db.execute(sql`
    ALTER TABLE full_check_waitlist
    ADD COLUMN IF NOT EXISTS visa_interest TEXT
  `);

  await db.execute(sql`
    ALTER TABLE full_check_waitlist
    ADD COLUMN IF NOT EXISTS preferred_language TEXT
  `);

  await db.execute(sql`
    ALTER TABLE full_check_waitlist
    ADD COLUMN IF NOT EXISTS current_country TEXT
  `);

  await db.execute(sql`
    ALTER TABLE full_check_waitlist
    ADD COLUMN IF NOT EXISTS main_goal TEXT
  `);

  await db.execute(sql`
    ALTER TABLE full_check_waitlist
    ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'full_check'
  `);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function buildBasicReport(input: {
  visaInterest: string;
  currentCountry: string;
  mainGoal: string;
}) {
  const combined = `${input.visaInterest} ${input.mainGoal}`.toLowerCase();
  const possiblePathways: string[] = [];

  if (combined.includes("partner") || combined.includes("spouse")) {
    possiblePathways.push("820/801 Partner onshore pathway may be relevant to review.");
  }

  if (
    combined.includes("student") ||
    combined.includes("study") ||
    combined.includes("course")
  ) {
    possiblePathways.push("500 Student visa pathway may be relevant to review.");
  }

  if (
    combined.includes("skilled") ||
    combined.includes("points") ||
    combined.includes("occupation") ||
    combined.includes("pr")
  ) {
    possiblePathways.push("189, 190 or 491 skilled pathways may be relevant to review.");
  }

  if (
    combined.includes("work") ||
    combined.includes("employer") ||
    combined.includes("sponsor")
  ) {
    possiblePathways.push("482 Skills in Demand pathway may be relevant to review.");
  }

  if (possiblePathways.length === 0) {
    possiblePathways.push(
      "500, 482, 189, 190, 491 and 820/801 pathways may be useful starting points to compare."
    );
  }

  return {
    possiblePathways,
    riskIndicators: [
      input.currentCountry
        ? `Your current country is recorded as ${input.currentCountry}; location can affect which steps may be available.`
        : "Your current location was not provided, so location-based risks need further review.",
      input.visaInterest
        ? "Your selected visa interest should be checked against current pathway requirements."
        : "No visa interest was selected, so the report is using broad pathway signals only.",
      "Timing, documents and personal circumstances may affect next steps.",
    ],
    documentChecklist: [
      "Passport and identity documents",
      "Evidence related to your study, work, partner or skilled background",
      "English test, skills assessment, sponsor or relationship evidence if relevant",
      "Current visa details and travel history if you are in Australia",
    ],
  };
}

export async function submitFullCheckWaitlist(
  _prevState: FullCheckWaitlistState,
  formData: FormData
): Promise<FullCheckWaitlistState> {
  const email = String(formData.get("email") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const visaInterest = String(formData.get("visaInterest") ?? "").trim();
  const preferredLanguage = String(formData.get("preferredLanguage") ?? "").trim();
  const currentCountry = String(formData.get("currentCountry") ?? "").trim();
  const mainGoal = String(formData.get("mainGoal") ?? "").trim();
  const source = String(formData.get("source") ?? "").trim() || "full_check";

  const errors: Record<string, string> = {};

  if (!email) errors.email = "Email is required.";
  if (email && !isValidEmail(email)) errors.email = "Enter a valid email address.";

  if (Object.keys(errors).length > 0) {
    return {
      status: "error",
      errors,
      message: "Please enter a valid email address.",
    };
  }

  await ensureFullCheckWaitlistTable();

  await db.insert(fullCheckWaitlist).values({
    email,
    full_name: fullName || null,
    visa_interest: visaInterest || null,
    preferred_language: preferredLanguage || null,
    current_country: currentCountry || null,
    main_goal: mainGoal || null,
    source,
  });

  return {
    status: "success",
    message: "You’ve unlocked a basic report. A more detailed version will be available soon.",
    report: buildBasicReport({
      visaInterest,
      currentCountry,
      mainGoal,
    }),
  };
}
