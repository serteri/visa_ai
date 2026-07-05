import { NextRequest } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

import { db } from "@/db";
import { contactMessages } from "@/db/schema";

export const dynamic = "force-dynamic";

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
