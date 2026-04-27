"use server";

import { sql } from "drizzle-orm";

import { db } from "@/db";
import { fullCheckWaitlist } from "@/db/schema";
import { runReadinessEngine } from "@/lib/readiness/engine";
import type { ReadinessReport } from "@/lib/readiness/types";

export type FullCheckWaitlistState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Record<string, string>;
  report?: ReadinessReport;
  userInput?: {
    name?: string;
    email?: string;
    mainGoal?: string;
    currentCountry?: string;
    passportCountry?: string;
    age?: string;
    occupation?: string;
    englishLevel?: string;
    sponsorOrFamily?: string;
    biggestConcern?: string;
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
  const passportCountry = String(formData.get("passportCountry") ?? "").trim();
  const age = String(formData.get("age") ?? "").trim();
  const occupation = String(formData.get("occupation") ?? "").trim();
  const englishLevel = String(formData.get("englishLevel") ?? "").trim();
  const sponsorOrFamily = String(formData.get("sponsorOrFamily") ?? "").trim();
  const biggestConcern = String(formData.get("biggestConcern") ?? "").trim();
  const source = String(formData.get("source") ?? "").trim() || "full_check";

  const isTr = preferredLanguage === "tr";
  const errors: Record<string, string> = {};

  if (!email) errors.email = isTr ? "E-posta adresi gereklidir." : "Email is required.";
  if (email && !isValidEmail(email)) errors.email = isTr ? "Geçerli bir e-posta adresi girin." : "Enter a valid email address.";

  if (Object.keys(errors).length > 0) {
    return {
      status: "error",
      errors,
      message: isTr ? "Lütfen geçerli bir e-posta adresi girin." : "Please enter a valid email address.",
    };
  }

  await ensureFullCheckWaitlistTable();

  // Save lead to database
  await db.insert(fullCheckWaitlist).values({
    email,
    full_name: fullName || null,
    visa_interest: visaInterest || null,
    preferred_language: preferredLanguage || null,
    current_country: currentCountry || null,
    main_goal: mainGoal || null,
    source,
  });

  // Generate readiness report
  const report = runReadinessEngine({
    locale: preferredLanguage === "tr" ? "tr" : "en",
    mainGoal: mainGoal || undefined,
    currentCountry: currentCountry || undefined,
    passportCountry: passportCountry || undefined,
    age: age || undefined,
    occupation: occupation || undefined,
    englishLevel: englishLevel || undefined,
    sponsorOrFamily: sponsorOrFamily || undefined,
    preferredPathway: visaInterest || undefined,
    biggestConcern: biggestConcern || undefined,
  });

  return {
    status: "success",
    message: isTr
      ? "Raporunuz oluşturuldu. E-postanıza bir özet göndereceğiz."
      : "Your report has been generated. We'll send a summary to your email.",
    report,
    userInput: {
      name: fullName || undefined,
      email,
      mainGoal: mainGoal || undefined,
      currentCountry: currentCountry || undefined,
      passportCountry: passportCountry || undefined,
      age: age || undefined,
      occupation: occupation || undefined,
      englishLevel: englishLevel || undefined,
      sponsorOrFamily: sponsorOrFamily || undefined,
      biggestConcern: biggestConcern || undefined,
    },
  };
}
