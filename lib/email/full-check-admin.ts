import { Resend } from "resend";

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
};

/**
 * Admin notification for a completed full-check assessment.
 *
 * Fired ONLY from the Stripe webhook (checkout.session.completed, see
 * handleReportUnlock in app/api/stripe/webhook/route.ts) after a successful
 * payment -- never from the free quick-check form submission in
 * app/[locale]/(main)/full-check/actions.ts's submitFullCheckWaitlist. It
 * used to fire on every submission regardless of payment, which meant most
 * of these emails were for visitors who filled the form and never paid.
 */
export async function sendFullCheckAdminEmail(payload: FullCheckAdminEmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const notificationEmail =
    process.env.FULL_CHECK_NOTIFICATION_EMAIL ||
    process.env.REFERRAL_NOTIFICATION_EMAIL ||
    "serter@logivisa.com";

  if (!apiKey) return;

  const resend = new Resend(apiKey);
  const fromEmail = process.env.FROM_EMAIL || "LogiVisa <noreply@logivisa.com>";
  const bodyLines = [
    "A paid full readiness assessment has been completed.",
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

  await resend.emails.send({
    from: fromEmail,
    to: [notificationEmail],
    subject: `💰 PAID Assessment Completed: ${payload.fullName || "Unknown"}`,
    text: bodyLines.join("\n"),
  });
}
