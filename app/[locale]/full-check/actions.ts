"use server";

import { and, eq, gte, sql } from "drizzle-orm";
import { Resend } from "resend";

import { db } from "@/db";
import { fullCheckWaitlist } from "@/db/schema";
import { buildLeadQuality, runReadinessEngine } from "@/lib/readiness/engine";
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
      passport_country TEXT,
      age TEXT,
      occupation TEXT,
      english_level TEXT,
      english_test_taken TEXT,
      occupation_confirmed TEXT,
      estimated_budget_range TEXT,
      timeline TEXT,
      sponsor_or_family TEXT,
      biggest_concern TEXT,
      main_goal TEXT,
      lead_score INT,
      lead_tier TEXT,
      source TEXT DEFAULT 'full_check',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.execute(sql`ALTER TABLE full_check_waitlist ADD COLUMN IF NOT EXISTS full_name TEXT`);
  await db.execute(sql`ALTER TABLE full_check_waitlist ADD COLUMN IF NOT EXISTS visa_interest TEXT`);
  await db.execute(sql`ALTER TABLE full_check_waitlist ADD COLUMN IF NOT EXISTS preferred_language TEXT`);
  await db.execute(sql`ALTER TABLE full_check_waitlist ADD COLUMN IF NOT EXISTS current_country TEXT`);
  await db.execute(sql`ALTER TABLE full_check_waitlist ADD COLUMN IF NOT EXISTS passport_country TEXT`);
  await db.execute(sql`ALTER TABLE full_check_waitlist ADD COLUMN IF NOT EXISTS age TEXT`);
  await db.execute(sql`ALTER TABLE full_check_waitlist ADD COLUMN IF NOT EXISTS occupation TEXT`);
  await db.execute(sql`ALTER TABLE full_check_waitlist ADD COLUMN IF NOT EXISTS english_level TEXT`);
  await db.execute(sql`ALTER TABLE full_check_waitlist ADD COLUMN IF NOT EXISTS english_test_taken TEXT`);
  await db.execute(sql`ALTER TABLE full_check_waitlist ADD COLUMN IF NOT EXISTS occupation_confirmed TEXT`);
  await db.execute(sql`ALTER TABLE full_check_waitlist ADD COLUMN IF NOT EXISTS estimated_budget_range TEXT`);
  await db.execute(sql`ALTER TABLE full_check_waitlist ADD COLUMN IF NOT EXISTS timeline TEXT`);
  await db.execute(sql`ALTER TABLE full_check_waitlist ADD COLUMN IF NOT EXISTS sponsor_or_family TEXT`);
  await db.execute(sql`ALTER TABLE full_check_waitlist ADD COLUMN IF NOT EXISTS biggest_concern TEXT`);
  await db.execute(sql`ALTER TABLE full_check_waitlist ADD COLUMN IF NOT EXISTS main_goal TEXT`);
  await db.execute(sql`ALTER TABLE full_check_waitlist ADD COLUMN IF NOT EXISTS lead_score INT`);
  await db.execute(sql`ALTER TABLE full_check_waitlist ADD COLUMN IF NOT EXISTS lead_tier TEXT`);
  await db.execute(sql`ALTER TABLE full_check_waitlist ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'full_check'`);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isEmailDeliveryEnabled(): boolean {
  if (process.env.ENABLE_TRANSACTIONAL_EMAILS === "true") return true;
  if (process.env.ENABLE_TRANSACTIONAL_EMAILS === "false") return false;
  return process.env.NODE_ENV === "production";
}

async function hasRecentSubmission(email: string, source: string): Promise<boolean> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const rows = await db
    .select({ id: fullCheckWaitlist.id })
    .from(fullCheckWaitlist)
    .where(
      and(
        eq(fullCheckWaitlist.email, email),
        eq(fullCheckWaitlist.source, source),
        gte(fullCheckWaitlist.created_at, fiveMinutesAgo)
      )
    )
    .limit(1);

  return rows.length > 0;
}

async function sendFullCheckAdminEmail(payload: {
  fullName: string;
  email: string;
  visaInterest: string;
  preferredLanguage: string;
  currentCountry: string;
  passportCountry: string;
  age: string;
  occupation: string;
  englishLevel: string;
  englishTestTaken: string;
  occupationConfirmed: string;
  estimatedBudgetRange: string;
  timeline: string;
  sponsorOrFamily: string;
  biggestConcern: string;
  mainGoal: string;
  source: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const notificationEmail =
    process.env.FULL_CHECK_NOTIFICATION_EMAIL || process.env.REFERRAL_NOTIFICATION_EMAIL;

  if (!apiKey || !notificationEmail) {
    console.error(
      "Full check admin email skipped: RESEND_API_KEY and notification email are required."
    );
    return;
  }

  const resend = new Resend(apiKey);
  const fromEmail = process.env.FROM_EMAIL || "Visa AI <onboarding@resend.dev>";
  const bodyLines = [
    "A new full readiness report lead has been submitted.",
    "",
    `full name: ${payload.fullName || "-"}`,
    `email: ${payload.email}`,
    `visa interest: ${payload.visaInterest || "-"}`,
    `preferred language: ${payload.preferredLanguage || "-"}`,
    `current country: ${payload.currentCountry || "-"}`,
    `passport country: ${payload.passportCountry}`,
    `age: ${payload.age}`,
    `occupation: ${payload.occupation || "-"}`,
    `english level: ${payload.englishLevel || "-"}`,
    `english test taken: ${payload.englishTestTaken || "-"}`,
    `occupation confirmed: ${payload.occupationConfirmed || "-"}`,
    `estimated budget range: ${payload.estimatedBudgetRange || "-"}`,
    `timeline: ${payload.timeline || "-"}`,
    `sponsor/family: ${payload.sponsorOrFamily || "-"}`,
    `biggest concern: ${payload.biggestConcern || "-"}`,
    `main goal: ${payload.mainGoal}`,
    `source: ${payload.source}`,
  ];

  await resend.emails.send({
    from: fromEmail,
    to: [notificationEmail],
    subject: "New full readiness report lead",
    text: bodyLines.join("\n"),
  });
}

async function sendFullCheckConfirmationEmail(payload: {
  email: string;
  fullName: string;
  locale: "en" | "tr";
}) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error("Full check confirmation email skipped: RESEND_API_KEY is missing.");
    return;
  }

  const resend = new Resend(apiKey);
  const fromEmail = process.env.FROM_EMAIL || "Visa AI <onboarding@resend.dev>";
  const isTr = payload.locale === "tr";
  const greeting = payload.fullName
    ? `${isTr ? "Merhaba" : "Hi"} ${payload.fullName},`
    : isTr
      ? "Merhaba,"
      : "Hi,";

  await resend.emails.send({
    from: fromEmail,
    to: [payload.email],
    subject: isTr
      ? "Tam vize hazirlik raporu talebiniz"
      : "Your full visa readiness report request",
    text: isTr
      ? [
          greeting,
          "",
          "Tam vize hazirlik raporu talebiniz alindi.",
          "Yapilandirilmis rapor ekranda olusturuldu. Bu genel bilgi niteligindedir ve goc tavsiyesi degildir.",
        ].join("\n")
      : [
          greeting,
          "",
          "Your full visa readiness report request has been received.",
          "The structured report was generated on screen. This is general information only and not migration advice.",
        ].join("\n"),
  });
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
  const englishTestTaken = String(formData.get("englishTestTaken") ?? "").trim();
  const occupationConfirmed = String(formData.get("occupationConfirmed") ?? "").trim();
  const estimatedBudgetRange = String(formData.get("estimatedBudgetRange") ?? "").trim();
  const timeline = String(formData.get("timeline") ?? "").trim();
  const sponsorOrFamily = String(formData.get("sponsorOrFamily") ?? "").trim();
  const biggestConcern = String(formData.get("biggestConcern") ?? "").trim();
  const source = String(formData.get("source") ?? "").trim() || "full_check";

  const isTr = preferredLanguage === "tr";
  const errors: Record<string, string> = {};

  if (!email) errors.email = isTr ? "E-posta adresi gereklidir." : "Email is required.";
  if (email && !isValidEmail(email)) {
    errors.email = isTr ? "Gecerli bir e-posta adresi girin." : "Enter a valid email address.";
  }
  if (!passportCountry) {
    errors.passportCountry = isTr ? "Pasaport ulkesi gereklidir." : "Passport country is required.";
  }
  if (!age) errors.age = isTr ? "Yas gereklidir." : "Age is required.";
  if (!mainGoal) errors.mainGoal = isTr ? "Ana hedef gereklidir." : "Main goal is required.";

  if (Object.keys(errors).length > 0) {
    return {
      status: "error",
      errors,
      message: isTr
        ? "Yapilandirilmis bir rapor icin daha fazla bilgi gereklidir."
        : "More information required for a structured report.",
    };
  }

  await ensureFullCheckWaitlistTable();

  const leadQuality = buildLeadQuality({
    locale: preferredLanguage === "tr" ? "tr" : "en",
    mainGoal,
    currentCountry: currentCountry || undefined,
    passportCountry,
    age,
    occupation: occupation || undefined,
    englishLevel: englishLevel || undefined,
    englishTestTaken: englishTestTaken || undefined,
    occupationConfirmed: occupationConfirmed || undefined,
    estimatedBudgetRange: estimatedBudgetRange || undefined,
    timeline: timeline || undefined,
    sponsorOrFamily: sponsorOrFamily || undefined,
    preferredPathway: visaInterest || undefined,
    biggestConcern: biggestConcern || undefined,
  });

  const emailDeliveryEnabled = isEmailDeliveryEnabled();
  const suppressNotifications = await hasRecentSubmission(email, source);

  await db.insert(fullCheckWaitlist).values({
    email,
    full_name: fullName || null,
    visa_interest: visaInterest || null,
    preferred_language: preferredLanguage || null,
    current_country: currentCountry || null,
    passport_country: passportCountry,
    age,
    occupation: occupation || null,
    english_level: englishLevel || null,
    english_test_taken: englishTestTaken || null,
    occupation_confirmed: occupationConfirmed || null,
    estimated_budget_range: estimatedBudgetRange || null,
    timeline: timeline || null,
    sponsor_or_family: sponsorOrFamily || null,
    biggest_concern: biggestConcern || null,
    main_goal: mainGoal,
    lead_score: leadQuality.leadScore,
    lead_tier: leadQuality.leadTier,
    source,
  });

  const report = runReadinessEngine({
    locale: preferredLanguage === "tr" ? "tr" : "en",
    mainGoal,
    currentCountry: currentCountry || undefined,
    passportCountry,
    age,
    occupation: occupation || undefined,
    englishLevel: englishLevel || undefined,
    englishTestTaken: englishTestTaken || undefined,
    occupationConfirmed: occupationConfirmed || undefined,
    estimatedBudgetRange: estimatedBudgetRange || undefined,
    timeline: timeline || undefined,
    sponsorOrFamily: sponsorOrFamily || undefined,
    preferredPathway: visaInterest || undefined,
    biggestConcern: biggestConcern || undefined,
  });

  let confirmationEmailSent = false;

  if (emailDeliveryEnabled && !suppressNotifications) {
    try {
      await sendFullCheckAdminEmail({
        fullName,
        email,
        visaInterest,
        preferredLanguage,
        currentCountry,
        passportCountry,
        age,
        occupation,
        englishLevel,
        englishTestTaken,
        occupationConfirmed,
        estimatedBudgetRange,
        timeline,
        sponsorOrFamily,
        biggestConcern,
        mainGoal,
        source,
      });
    } catch (error) {
      console.error("Failed to send full check admin email", error);
    }

    try {
      await sendFullCheckConfirmationEmail({
        email,
        fullName,
        locale: preferredLanguage === "tr" ? "tr" : "en",
      });
      confirmationEmailSent = true;
    } catch (error) {
      console.error("Failed to send full check confirmation email", error);
    }
  } else if (suppressNotifications) {
    console.warn("Full check email notifications suppressed due to recent duplicate submission.");
  } else {
    console.warn("Full check email notifications are disabled in this environment.");
  }

  return {
    status: "success",
    message: isTr
      ? confirmationEmailSent
        ? "Tam hazirlik raporu olusturuldu. E-posta onayi gonderildi."
        : "Tam hazirlik raporu olusturuldu."
      : confirmationEmailSent
        ? "Full readiness report generated. A confirmation email has been sent."
        : "Full readiness report generated.",
    report,
    userInput: {
      name: fullName || undefined,
      email,
      mainGoal,
      currentCountry: currentCountry || undefined,
      passportCountry,
      age,
      occupation: occupation || undefined,
      englishLevel: englishLevel || undefined,
      sponsorOrFamily: sponsorOrFamily || undefined,
      biggestConcern: biggestConcern || undefined,
    },
  };
}
