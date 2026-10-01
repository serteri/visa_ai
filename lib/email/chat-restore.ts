import { Resend } from "resend";

import { RESTORE_EMAIL_COPY, RestoreCreditsEmail, type RestoreEmailLocale } from "@/emails/RestoreCredits";

/** Sends the restore link. Throws on failure; the caller (lib/chat/restore.ts) logs it and never tells the requester. */
export async function sendRestoreEmail(args: { to: string; link: string; locale: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured -- cannot send restore email.");

  const locale: RestoreEmailLocale = args.locale === "tr" || args.locale === "zh-Hans" ? args.locale : "en";
  const { error } = await new Resend(apiKey).emails.send({
    from: "LogiVisa <noreply@logivisa.com>",
    to: [args.to],
    subject: RESTORE_EMAIL_COPY[locale].subject,
    react: RestoreCreditsEmail({ url: args.link, locale }),
  });
  if (error) throw new Error(`Failed to send restore email: ${error.message}`);
}
