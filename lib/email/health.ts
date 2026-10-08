/**
 * Email health for the admin diagnostics route (app/api/admin/email-health) and the CLI (scripts/email-health.ts): which switches are set
 * (never a secret), the From domain's state in Resend, and a real test send whose provider answer is returned verbatim.
 */
import { Resend } from "resend";

import { adminNotificationRecipients } from "@/lib/email/admin-recipient";
import { isAdminAllowListedEmail } from "@/lib/email/suppression";
import { EmailRejectedError, sendChecked } from "@/lib/email/provider";

const maskAddress = (a: string) => a.replace(/^(.{2}).*(@.*)$/, "$1***$2");

export function emailConfigSummary() {
  const from = process.env.FROM_EMAIL || "LogiVisa <noreply@logivisa.com>";
  const entries = (v: string | undefined) => (v ?? "").split(",").map((x) => x.trim()).filter(Boolean).length;
  return {
    resendApiKeySet: Boolean(process.env.RESEND_API_KEY),
    fromEmailSetInEnv: Boolean(process.env.FROM_EMAIL),
    fromEmail: from,
    fromDomain: (from.match(/@([^>\s]+)/)?.[1] ?? "").toLowerCase(),
    fromIsSandbox: /resend\.dev/i.test(from),
    enableTransactionalEmails: process.env.ENABLE_TRANSACTIONAL_EMAILS ?? null,
    transactionalEmailsOn: process.env.ENABLE_TRANSACTIONAL_EMAILS === "true" ? true : process.env.ENABLE_TRANSACTIONAL_EMAILS === "false" ? false : Boolean(process.env.RESEND_API_KEY),
    adminEmailsEntries: entries(process.env.ADMIN_EMAILS),
    knownTestEmailsEntries: entries(process.env.KNOWN_TEST_EMAILS),
    adminNotificationEmailSet: Boolean(process.env.ADMIN_NOTIFICATION_EMAIL),
    internalLeadNotificationEmail: adminNotificationRecipients({ env: ["INTERNAL_LEAD_NOTIFICATION_EMAIL"], fallback: "hello@logivisa.com" }).map(maskAddress),
    pdfLeadNotificationEmail: adminNotificationRecipients({ env: ["PDF_LEAD_NOTIFICATION_EMAIL"], fallback: "serter@logivisa.com" }).map(maskAddress),
  };
}

/** The configuration, Resend's view of the From domain and the last events of recent messages. Read-only. */
export async function emailHealthSnapshot(address?: string) {
  const config = emailConfigSummary();
  const out: Record<string, unknown> = { config };
  if (address) out.addressOnAllowList = { address: maskAddress(address), suppressedByDesign: isAdminAllowListedEmail(address) };
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return out;
  const resend = new Resend(apiKey);
  const domains = await resend.domains.list();
  out.domains = domains.error
    ? { error: `${domains.error.name}: ${domains.error.message}` }
    : (domains.data?.data ?? []).map((d) => ({ name: d.name, status: d.status, region: d.region, isFromDomain: d.name === config.fromDomain }));
  const list = await resend.emails.list({ limit: 25 });
  out.recentMessages = list.error
    ? { error: `${list.error.name}: ${list.error.message}` }
    : (list.data?.data ?? []).map((e) => ({ at: e.created_at, lastEvent: e.last_event, to: (e.to ?? []).map(maskAddress), subject: e.subject }));
  return out;
}

/** Sends one real test email and returns exactly what the provider answered. */
export async function sendTestEmail(to: string): Promise<{ ok: true; messageId: string } | { ok: false; name?: string; message: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, message: "RESEND_API_KEY is not configured" };
  try {
    const messageId = await sendChecked("admin_test", new Resend(apiKey), {
      from: process.env.FROM_EMAIL || "LogiVisa <noreply@logivisa.com>",
      to: [to],
      subject: "LogiVisa email test",
      text: "This is a test message from the LogiVisa admin email diagnostics. If you can read it, sending from this domain to this address works.",
    });
    return { ok: true, messageId };
  } catch (error) {
    if (error instanceof EmailRejectedError) return { ok: false, name: error.providerName, message: error.message };
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}
