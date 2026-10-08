import { Resend } from "resend";

import { adminNotificationRecipients } from "@/lib/email/admin-recipient";
import { sendChecked } from "@/lib/email/provider";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildContactEmailHtml(fields: {
  fullName: string;
  email: string;
  phone?: string;
  message: string;
}): string {
  const fullName = escapeHtml(fields.fullName);
  const email = escapeHtml(fields.email);
  const phone = escapeHtml(fields.phone ?? "Not provided");
  // Line breaks in a freeform textarea are meaningful; escape first, then
  // convert to <br> so the message renders exactly as the user typed it.
  const message = escapeHtml(fields.message).replace(/\n/g, "<br>");

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;width:140px;vertical-align:top;">
        <span style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;">${label}</span>
      </td>
      <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;vertical-align:top;">
        <span style="font-size:14px;color:#0f172a;">${value}</span>
      </td>
    </tr>`;

  return `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,0.08);">
            <tr>
              <td style="background-color:#0f172a;padding:24px 28px;">
                <span style="font-size:20px;font-weight:800;color:#ffffff;">Logi<span style="color:#a78bfa;">Visa</span></span>
                <div style="margin-top:4px;font-size:13px;color:#94a3b8;">New contact form submission</div>
              </td>
            </tr>
            <tr>
              <td style="padding:0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${row("Name", fullName)}
                  ${row("Email", `<a href="mailto:${email}" style="color:#4f46e5;text-decoration:none;">${email}</a>`)}
                  ${row("Phone", phone)}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 16px 24px;">
                <div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;">Message</div>
                <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;font-size:14px;line-height:1.6;color:#0f172a;white-space:pre-wrap;">${message}</div>
              </td>
            </tr>
          </table>
          <p style="max-width:560px;margin:16px auto 0;font-size:12px;color:#94a3b8;text-align:center;">
            Sent from the LogiVisa contact form at logivisa.com
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** The internal notification for a contact-form message. Throws on a provider rejection (the route treats it as non-blocking: the message is already saved). */
export async function sendContactNotification(m: { full_name: string; email: string; phone?: string | null; message: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] contact_form_notification not sent: RESEND_API_KEY is not configured");
    return;
  }
  await sendChecked("contact_form_notification", new Resend(apiKey), {
    from: process.env.FROM_EMAIL || "LogiVisa <noreply@logivisa.com>",
    to: adminNotificationRecipients({ fallback: "hello@logivisa.com" }),
    replyTo: m.email,
    subject: `New contact form message from ${m.full_name}`,
    html: buildContactEmailHtml({ fullName: m.full_name, email: m.email, phone: m.phone ?? undefined, message: m.message }),
    text: [`Name: ${m.full_name}`, `Email: ${m.email}`, `Phone: ${m.phone ?? "(not provided)"}`, "", "Message:", m.message].join("\n"),
  });
}
