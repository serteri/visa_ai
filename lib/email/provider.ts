/**
 * The one way to send a transactional email through Resend.
 *
 * The Resend SDK (v6) does NOT throw when the provider rejects a message (unverified sending domain, invalid recipient, rate limit, suppressed
 * recipient, sandbox sender): it resolves with `{ data, error }`. Every sender used to `await resend.emails.send(...)` and ignore that, so a
 * rejected report-ready / unlock / lead / notification email was logged as nothing and looked like success. `sendChecked` turns a rejection into a
 * thrown `EmailRejectedError` (callers keep their own catch / non-blocking policy) and logs the outcome without any address.
 */
import type { CreateEmailOptions, Resend } from "resend";

export class EmailRejectedError extends Error {
  constructor(
    readonly kind: string,
    readonly providerName: string | undefined,
    message: string,
  ) {
    super(`[${kind}] the email provider rejected the message: ${message}`);
    this.name = "EmailRejectedError";
  }
}

/** Sends and returns the provider's message id; throws EmailRejectedError when the provider answers with an error or no id. */
export async function sendChecked(kind: string, resend: Resend, payload: CreateEmailOptions): Promise<string> {
  if (/resend\.dev/i.test(String(payload.from))) {
    // The sandbox sender only delivers to the Resend account owner and answers 200-style success for others in some setups.
    console.error(`[email] ${kind}: the From address is Resend's sandbox sender; set FROM_EMAIL to a verified domain`);
  }
  const { data, error } = await resend.emails.send(payload);
  if (error || !data?.id) {
    console.error(`[email] ${kind} REJECTED by the provider`, { name: error?.name, message: error?.message });
    throw new EmailRejectedError(kind, error?.name, error?.message ?? "no message id returned");
  }
  console.info(`[email] ${kind} accepted by the provider`, { messageId: data.id });
  return data.id;
}
