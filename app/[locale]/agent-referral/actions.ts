"use server";

import { sql } from "drizzle-orm";
import { Resend } from "resend";

import { db } from "@/db";
import { agentReferrals } from "@/db/schema";

export type ReferralFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Record<string, string>;
};

async function ensureAgentReferralsTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS agents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name TEXT NOT NULL,
      business_name TEXT,
      email TEXT NOT NULL,
      phone TEXT,
      marn TEXT,
      languages JSONB,
      specialties JSONB,
      locations JSONB,
      active BOOLEAN DEFAULT TRUE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

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
      assigned_agent_id UUID,
      assigned_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    ALTER TABLE agent_referrals
    ADD COLUMN IF NOT EXISTS assigned_agent_id UUID
  `);

  await db.execute(sql`
    ALTER TABLE agent_referrals
    ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP
  `);

  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'agent_referrals_assigned_agent_id_agents_id_fk'
      ) THEN
        ALTER TABLE agent_referrals
        ADD CONSTRAINT agent_referrals_assigned_agent_id_agents_id_fk
        FOREIGN KEY (assigned_agent_id) REFERENCES agents(id);
      END IF;
    END
    $$;
  `);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function sendReferralNotificationEmail(payload: {
  fullName: string;
  email: string;
  phone: string;
  countryOfPassport: string;
  currentCountry: string;
  preferredLanguage: string;
  visaInterest: string;
  shortMessage: string;
  submittedDate: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const notificationEmail = process.env.REFERRAL_NOTIFICATION_EMAIL;

  if (!apiKey || !notificationEmail) {
    console.error(
      "Referral notification email skipped: RESEND_API_KEY or REFERRAL_NOTIFICATION_EMAIL is missing."
    );
    return;
  }

  const resend = new Resend(apiKey);

  const bodyLines = [
    "A new visa referral lead has been submitted.",
    "",
    `full name: ${payload.fullName}`,
    `email: ${payload.email}`,
    `phone: ${payload.phone || "-"}`,
    `country of passport: ${payload.countryOfPassport}`,
    `current country: ${payload.currentCountry}`,
    `preferred language: ${payload.preferredLanguage}`,
    `visa interest: ${payload.visaInterest}`,
    `short message: ${payload.shortMessage}`,
    `submitted date: ${payload.submittedDate}`,
  ];

  await resend.emails.send({
    from: "Visa AI <onboarding@resend.dev>",
    to: [notificationEmail],
    subject: "New visa referral lead",
    text: bodyLines.join("\n"),
  });
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

  const [insertedReferral] = await db
    .insert(agentReferrals)
    .values({
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
    })
    .returning({
      created_at: agentReferrals.created_at,
    });

  try {
    await sendReferralNotificationEmail({
      fullName,
      email,
      phone,
      countryOfPassport,
      currentCountry,
      preferredLanguage,
      visaInterest,
      shortMessage,
      submittedDate: insertedReferral?.created_at
        ? new Date(insertedReferral.created_at).toISOString()
        : new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to send referral notification email", error);
  }

  return {
    status: "success",
    message:
      "Thank you. Your request has been received. If appropriate, you may be connected with a registered migration professional.",
  };
}
