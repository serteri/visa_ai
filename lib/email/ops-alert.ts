/**
 * Operator alert for a failure that must not stay silent (e.g. the leads table is missing so no lead is saved). Always an error log; plus one
 * email to the internal notification address, at most once per kind per hour per server instance so a broken table cannot flood the inbox.
 * Never throws and never blocks the visitor's request.
 */
import { Resend } from "resend";
import { sendChecked } from "@/lib/email/provider";

const lastSent = new Map<string, number>();
const HOUR_MS = 60 * 60 * 1000;

export async function sendOpsAlert(kind: string, detail: string): Promise<{ sent: boolean; skippedReason?: string }> {
  console.error(`[ops-alert] ${kind}: ${detail}`);
  const now = Date.now();
  const prev = lastSent.get(kind);
  if (prev !== undefined && now - prev < HOUR_MS) return { sent: false, skippedReason: "throttled" };
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error(`[ops-alert] ${kind} email NOT sent: reason=resend_api_key_missing`);
    return { sent: false, skippedReason: "resend_api_key_missing" };
  }
  try {
    lastSent.set(kind, now);
    await sendChecked(`ops_alert_${kind}`, new Resend(apiKey), {
      from: process.env.FROM_EMAIL || "LogiVisa <noreply@logivisa.com>",
      to: [process.env.FULL_CHECK_NOTIFICATION_EMAIL || process.env.REFERRAL_NOTIFICATION_EMAIL || "serter@logivisa.com"],
      subject: `[LogiVisa ALERT] ${kind}`,
      text: `${kind}\n\n${detail}\n\nThis alert is sent at most once an hour per kind.`,
    });
    return { sent: true };
  } catch (err) {
    lastSent.delete(kind);
    console.error(`[ops-alert] ${kind} email NOT sent: reason=provider_error`, err);
    return { sent: false, skippedReason: "provider_error" };
  }
}
