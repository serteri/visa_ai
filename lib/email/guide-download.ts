import { Resend, type CreateEmailOptions } from "resend";

import { sendChecked } from "@/lib/email/provider";

/**
 * The /rehber guide download: the visitor's delivery email (must be accepted by the provider, otherwise this throws and the form reports
 * the failure) and the internal lead notice (non-blocking). The Resend client is created here, per call: creating it at module load
 * throws when the API key is missing and took the whole server-actions file down with it.
 */
export async function sendGuideDownloadEmails(user: CreateEmailOptions, admin: CreateEmailOptions): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured -- the guide email cannot be sent.");
  const resend = new Resend(apiKey);
  await Promise.all([
    sendChecked("guide_download_user", resend, user),
    sendChecked("guide_download_admin", resend, admin).catch((err) => console.error("Admin notification failed (non-blocking):", err)),
  ]);
}
