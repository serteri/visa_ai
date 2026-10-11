/** The monitor's two admin emails (to ADMIN_NOTIFICATION_EMAIL): one when pages changed, one when pages keep failing. Report data is never changed by either. */
import { Resend } from "resend";

import { adminNotificationRecipients } from "@/lib/email/admin-recipient";
import { sendChecked } from "@/lib/email/provider";
import { sourceFilesFor } from "./pages";

export type ChangeItem = { state: string; url: string; detectedAt: Date; summary: string };
export type FailureItem = { state: string; url: string; failures: number; error: string };
export type AlertMail = { kind: "change" | "failure"; subject: string; text: string };

const iso = (d: Date) => d.toISOString().slice(0, 16).replace("T", " ") + " UTC";

export function buildChangeAlert(items: ChangeItem[], adminUrl: string): AlertMail {
  const states = [...new Set(items.map((i) => i.state))];
  const blocks = items.map((i) => {
    const files = sourceFilesFor(i.state).map((f) => `    - ${f}`).join("\n");
    return `${i.state}\n  Page: ${i.url}\n  Detected: ${iso(i.detectedAt)}\n  What changed:\n${i.summary.split("\n").map((l) => `    ${l}`).join("\n")}\n  Source file(s) to replace:\n${files}`;
  });
  return {
    kind: "change",
    subject: `[LogiVisa] State page changed: ${states.join(", ")}`,
    text: `The state-page monitor found a change on ${items.length} official page(s) (${states.join(", ")}).\n\n${blocks.join("\n\n")}\n\nNothing was changed automatically: reports keep showing the data as last verified, with a "data may have changed since" note for these states until you apply the change.\nTo apply: replace the source file(s), update the state's rule in lib/state-nomination/state-rules-config.ts (wording, lastVerified), set the live State Nomination Config in the admin panel, then press "Mark applied" for the state at ${adminUrl}.`,
  };
}

export function buildFailureAlert(items: FailureItem[], adminUrl: string): AlertMail {
  const lines = items.map((i) => `${i.state}  ${i.url}\n  failed ${i.failures} runs in a row; last error: ${i.error}`);
  return {
    kind: "failure",
    subject: `[LogiVisa] State page monitor cannot fetch ${items.length} page(s)`,
    text: `These official pages could not be fetched on several runs in a row (this alert is sent once per page until it succeeds again):\n\n${lines.join("\n\n")}\n\nIf a URL is wrong or the site blocks automated requests, correct it in lib/state-monitor/pages.ts. Until a page is fetched again, reports show "data may have changed since" for its state once 14 days have passed without a successful check.\nMonitor status: ${adminUrl}`,
  };
}

export const adminMonitorUrl = () => `${(process.env.NEXT_PUBLIC_BASE_URL || "https://logivisa.com").replace(/\/$/, "")}/en/admin/states`;

/** Sends one alert email; false when it could not be sent (the caller keeps the item pending so the next run tries again). */
export async function sendMonitorAlert(mail: AlertMail): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error(`[state-monitor] alert NOT sent: reason=resend_api_key_missing (${mail.subject})`);
    return false;
  }
  try {
    await sendChecked(`state_monitor_${mail.kind}`, new Resend(apiKey), {
      from: process.env.FROM_EMAIL || "LogiVisa <noreply@logivisa.com>",
      to: adminNotificationRecipients({ env: ["FULL_CHECK_NOTIFICATION_EMAIL", "REFERRAL_NOTIFICATION_EMAIL"], fallback: "serter@logivisa.com" }),
      subject: mail.subject,
      text: mail.text,
    });
    return true;
  } catch (error) {
    console.error(`[state-monitor] alert NOT sent: reason=provider_error (${mail.subject})`, error);
    return false;
  }
}
