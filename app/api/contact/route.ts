import { NextRequest } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

import { db } from "@/db";
import { contactMessages } from "@/db/schema";

export const dynamic = "force-dynamic";

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

const contactSchema = z.object({
  full_name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  phone: z
    .string()
    .trim()
    .max(50)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  message: z.string().trim().min(1).max(5000),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return Response.json({ error: "Validation failed.", fieldErrors }, { status: 400 });
  }

  const { full_name, email, phone, message } = parsed.data;

  // Step 2a: persist first -- the message must never be lost even if the
  // notification email fails to send (network blip, Resend outage, etc.).
  try {
    await db.insert(contactMessages).values({
      full_name,
      email,
      phone,
      message,
    });
  } catch (err) {
    console.error("[contact POST] Failed to save message", err);
    return Response.json({ error: "Server error. Please try again." }, { status: 500 });
  }

  // Step 2b: best-effort notification email -- a delivery failure here must
  // not undo the successful save above or be reported to the user as a
  // failure, since their message was already recorded.
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const resend = new Resend(apiKey);
      const fromEmail = process.env.FROM_EMAIL || "LogiVisa <onboarding@resend.dev>";

      await resend.emails.send({
        from: fromEmail,
        to: ["hello@logivisa.com"],
        replyTo: email,
        subject: `New contact form message from ${full_name}`,
        html: buildContactEmailHtml({ fullName: full_name, email, phone, message }),
        text: [
          `Name: ${full_name}`,
          `Email: ${email}`,
          `Phone: ${phone ?? "(not provided)"}`,
          "",
          "Message:",
          message,
        ].join("\n"),
      });
    } catch (err) {
      console.error("[contact POST] Failed to send notification email", err);
    }
  }

  return Response.json({ success: true });
}
