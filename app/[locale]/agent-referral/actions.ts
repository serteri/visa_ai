"use server";

import { sql } from "drizzle-orm";

import { db } from "@/db";
import { agentReferrals } from "@/db/schema";

export type ReferralFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Record<string, string>;
};

async function ensureAgentReferralsTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS agent_referrals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      country_of_passport TEXT NOT NULL,
      current_country TEXT NOT NULL,
      preferred_language TEXT NOT NULL,
      visa_interest TEXT NOT NULL,
      short_message TEXT NOT NULL,
      consent BOOLEAN NOT NULL,
      status TEXT DEFAULT 'new',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function submitAgentReferral(
  _prevState: ReferralFormState,
  formData: FormData
): Promise<ReferralFormState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const countryOfPassport = String(formData.get("countryOfPassport") ?? "").trim();
  const currentCountry = String(formData.get("currentCountry") ?? "").trim();
  const preferredLanguage = String(formData.get("preferredLanguage") ?? "").trim();
  const visaInterest = String(formData.get("visaInterest") ?? "").trim();
  const shortMessage = String(formData.get("shortMessage") ?? "").trim();
  const consent = formData.get("consent") === "on";

  const errors: Record<string, string> = {};

  if (!fullName) errors.fullName = "Full name is required.";
  if (!email) errors.email = "Email is required.";
  if (email && !isValidEmail(email)) errors.email = "Enter a valid email address.";
  if (!countryOfPassport) errors.countryOfPassport = "Country of passport is required.";
  if (!currentCountry) errors.currentCountry = "Current country is required.";
  if (!preferredLanguage) errors.preferredLanguage = "Preferred language is required.";
  if (!visaInterest) errors.visaInterest = "Visa interest is required.";
  if (!shortMessage) errors.shortMessage = "Short message is required.";
  if (!consent) {
    errors.consent =
      "You must acknowledge that this platform provides general information only.";
  }

  if (Object.keys(errors).length > 0) {
    return {
      status: "error",
      errors,
      message: "Please fix the highlighted fields and submit again.",
    };
  }

  await ensureAgentReferralsTable();

  await db.insert(agentReferrals).values({
    full_name: fullName,
    email,
    phone: phone || null,
    country_of_passport: countryOfPassport,
    current_country: currentCountry,
    preferred_language: preferredLanguage,
    visa_interest: visaInterest,
    short_message: shortMessage,
    consent,
    status: "new",
  });

  return {
    status: "success",
    message:
      "Thank you. Your request has been received. If appropriate, you may be connected with a registered migration professional.",
  };
}
