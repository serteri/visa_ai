"use server";

import { sql } from "drizzle-orm";

import { db } from "@/db";
import { fullCheckWaitlist } from "@/db/schema";

export type FullCheckWaitlistState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Record<string, string>;
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
    message: "Thanks — you're on the early access list.",
  };
}
