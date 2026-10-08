import { Resend } from "resend";

import type { ReadinessInput } from "@/lib/readiness/types";

import { sendChecked } from "@/lib/email/provider";
export type FullCheckAdminEmailPayload = {
  fullName: string;
  email: string;
  visaInterest: string;
  preferredLanguage: string;
  currentCountry: string;
  passportCountry: string;
  age: string;
  occupation: string;
  englishLevel: string;
  occupationConfirmed: string;
  estimatedBudgetRange: string;
  timeline: string;
  qualificationAwardedInAustralia?: boolean;
  qualificationRegionalAustralia?: boolean;
  specialistEducationStemResponse?: "yes" | "no" | "not_sure";
  offshoreExperienceYears?: number;
  onshoreExperienceYears?: number;
  sponsorOrFamily: string;
  biggestConcern: string;
  mainGoal: string;
  source: string;
  /** "paid" (Stripe webhook, the default) or "free_beta" (the free-beta unlock): same content, labelled. */
  variant?: "paid" | "free_beta";
  /** free_beta only: unlocks recorded so far today, including this one. */
  freeUnlocksToday?: number;
};

/** The notification payload from a stored report row -- one mapping for the paid and the free-beta notification. */
export function fullCheckAdminPayload(
  record: { fullName?: string | null; locale: string; source: string; preferredPath?: string | null; inputJson?: unknown },
  email: string,
): FullCheckAdminEmailPayload {
  const input = (record.inputJson ?? {}) as Partial<ReadinessInput>;
  return {
    fullName: record.fullName ?? "",
    email,
    visaInterest: record.preferredPath ?? input.preferredPathway ?? "",
    preferredLanguage: record.locale,
    currentCountry: input.currentCountry ?? "",
    passportCountry: input.passportCountry ?? "",
    age: input.age ?? "",
    occupation: input.occupation ?? "",
    englishLevel: input.englishLevel ?? "",
    occupationConfirmed: input.occupationConfirmed ?? "",
    estimatedBudgetRange: input.estimatedBudgetRange ?? "",
    timeline: input.timeline ?? "",
    qualificationAwardedInAustralia: input.qualificationAwardedInAustralia,
    qualificationRegionalAustralia: input.qualificationRegionalAustralia,
    specialistEducationStemResponse: input.specialistEducationStemResponse,
    offshoreExperienceYears: input.offshoreExperienceYears,
    onshoreExperienceYears: input.onshoreExperienceYears,
    sponsorOrFamily: input.sponsorOrFamily ?? "",
    biggestConcern: input.biggestConcern ?? "",
    mainGoal: input.mainGoal ?? "",
    source: record.source,
  };
}

/** Subject and first line of the notification, by variant. */
export function fullCheckAdminHeadline(payload: Pick<FullCheckAdminEmailPayload, "variant" | "fullName">): { subject: string; firstLine: string } {
  const name = payload.fullName || "Unknown";
  return payload.variant === "free_beta"
    ? { subject: `🆓 FREE BETA Assessment Unlocked: ${name}`, firstLine: "A full readiness assessment has been unlocked in the FREE BETA (no payment taken)." }
    : { subject: `💰 PAID Assessment Completed: ${name}`, firstLine: "A paid full readiness assessment has been completed." };
}

/**
 * Admin notification for a completed full-check assessment.
 *
 * Fired from the Stripe webhook (checkout.session.completed, see
 * handleReportUnlock in app/api/stripe/webhook/route.ts) after a successful
 * payment, and -- labelled "FREE BETA" -- from the free-beta unlock
 * (unlockPremiumReport) while the paid checkout is off. Never from the free
 * quick-check form submission in submitFullCheckWaitlist: it used to fire on
 * every submission regardless of payment, which meant most of these emails
 * were for visitors who filled the form and never paid.
 */
export async function sendFullCheckAdminEmail(payload: FullCheckAdminEmailPayload): Promise<{ sent: boolean; skippedReason?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const notificationEmail =
    process.env.FULL_CHECK_NOTIFICATION_EMAIL ||
    process.env.REFERRAL_NOTIFICATION_EMAIL ||
    "serter@logivisa.com";

  if (!apiKey) {
    console.error("[email] full_check_admin_notification NOT sent: reason=resend_api_key_missing");
    return { sent: false, skippedReason: "resend_api_key_missing" };
  }

  const resend = new Resend(apiKey);
  const fromEmail = process.env.FROM_EMAIL || "LogiVisa <noreply@logivisa.com>";
  const headline = fullCheckAdminHeadline(payload);
  const bodyLines = [
    headline.firstLine,
    ...(payload.variant === "free_beta" && payload.freeUnlocksToday !== undefined ? [`free beta unlocks today: ${payload.freeUnlocksToday}`] : []),
    "",
    `full name: ${payload.fullName || "-"}`,
    `email: ${payload.email}`,
    `phone: -`,
    `visa interest: ${payload.visaInterest || "-"}`,
    `preferred language: ${payload.preferredLanguage || "-"}`,
    `current country: ${payload.currentCountry || "-"}`,
    `passport country: ${payload.passportCountry}`,
    `age: ${payload.age}`,
    `occupation: ${payload.occupation || "-"}`,
    `english level: ${payload.englishLevel || "-"}`,
    `occupation confirmed: ${payload.occupationConfirmed || "-"}`,
    `estimated budget range: ${payload.estimatedBudgetRange || "-"}`,
    `timeline: ${payload.timeline || "-"}`,
    `qualification completed at Australian institution: ${payload.qualificationAwardedInAustralia ?? "-"}`,
    `qualification completed at regional Australian campus: ${payload.qualificationRegionalAustralia ?? "-"}`,
    `specialist education STEM response: ${payload.specialistEducationStemResponse ?? "-"}`,
    `offshore skilled employment years: ${payload.offshoreExperienceYears ?? "-"}`,
    `onshore skilled employment years: ${payload.onshoreExperienceYears ?? "-"}`,
    `sponsor/family: ${payload.sponsorOrFamily || "-"}`,
    `biggest concern: ${payload.biggestConcern || "-"}`,
    `main goal: ${payload.mainGoal}`,
    `source: ${payload.source}`,
  ];

  await sendChecked("full_check_admin_notification", resend, {
    from: fromEmail,
    to: [notificationEmail],
    subject: headline.subject,
    text: bodyLines.join("\n"),
  });
  return { sent: true };
}
