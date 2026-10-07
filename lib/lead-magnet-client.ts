/**
 * The browser side of a lead-magnet submission: POST to /api/pdf-download and turn the answer into one of four outcomes, so every modal shows
 * the same thing for the same answer. "sent" only when the provider accepted the email (the API says so); otherwise the download link is shown.
 */
import { FORM_TEXT, pdfPath, pick } from "@/lib/lead-magnets";
import type { LeadFieldErrors } from "@/lib/lead-magnet-validation";

export type LeadSubmission = {
  slug: string;
  category: string;
  locale: string;
  full_name: string;
  email: string;
  /** Already joined with the dial code, or "" when the phone was left empty. */
  phone: string;
  termsAcceptedAt: string | null;
};

export type LeadOutcome =
  | { kind: "sent" }
  | { kind: "not_delivered"; downloadUrl: string; suppressed: boolean }
  | { kind: "payment_required" }
  | { kind: "error"; message: string; fieldErrors?: LeadFieldErrors };

export async function submitLead(s: LeadSubmission): Promise<LeadOutcome> {
  try {
    const res = await fetch("/api/pdf-download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    });
    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      delivered?: boolean;
      suppressed?: boolean;
      downloadUrl?: string;
      error?: string;
      fieldErrors?: LeadFieldErrors;
      alreadyDownloaded?: boolean;
      paymentRequired?: boolean;
    };
    if (res.ok && data.success) {
      // The success message is shown only when the provider accepted the email.
      if (data.delivered === true) return { kind: "sent" };
      return { kind: "not_delivered", downloadUrl: data.downloadUrl ?? pdfPath(s.slug), suppressed: data.suppressed === true };
    }
    if (data.paymentRequired) return { kind: "payment_required" };
    if (data.alreadyDownloaded) return { kind: "error", message: pick(FORM_TEXT.alreadyDownloaded, s.locale) };
    return { kind: "error", message: data.error ?? pick(FORM_TEXT.generic, s.locale), fieldErrors: data.fieldErrors };
  } catch {
    return { kind: "error", message: pick(FORM_TEXT.connection, s.locale) };
  }
}
