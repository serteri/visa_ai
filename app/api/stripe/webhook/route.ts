import { NextRequest } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";

import { prisma } from "@/lib/prisma";
import { generateReadinessPDF } from "@/lib/readiness/generate-pdf";
import type { ReadinessReport } from "@/lib/readiness/types";
import type { ReadinessInput } from "@/lib/readiness/types";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured.");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Webhook signature verification failed", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const reportId = session.metadata?.reportId;
    const email = session.metadata?.email ?? session.customer_email ?? "";

    if (!reportId) {
      console.error("Webhook: Missing reportId in session metadata");
      return new Response("Missing reportId", { status: 400 });
    }

    try {
      // Fetch the report
      const rows = await prisma.$queryRawUnsafe<
        Array<{
          id: string;
          email: string;
          locale: string;
          full_name: string | null;
          report_json: ReadinessReport;
          input_json: ReadinessInput;
        }>
      >(
        `SELECT id, email, locale, full_name, report_json, input_json FROM user_reports WHERE id = $1::uuid LIMIT 1`,
        reportId
      );

      const record = rows[0];
      if (!record) {
        console.error(`Webhook: Report ${reportId} not found`);
        return new Response("Report not found", { status: 404 });
      }

      // Mark as unlocked with payment
      await prisma.$executeRawUnsafe(
        `
          UPDATE user_reports
          SET
            email = $1,
            unlock_method = 'payment',
            payment_status = 'paid',
            is_unlocked = TRUE,
            pdf_sent = FALSE,
            unlocked_at = NOW()
          WHERE id = $2::uuid
        `,
        email,
        reportId
      );

      // Generate PDF and send email
      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey) {
        try {
          const locale = (record.locale === "tr" ? "tr" : record.locale === "zh-Hans" ? "zh-Hans" : "en") as "en" | "tr" | "zh-Hans";
          const pdfBytes = await generateReadinessPDF({
            report: record.report_json,
            locale,
            saveToFile: false,
            userInputSummary: {
              name: record.full_name ?? undefined,
              email,
              mainGoal: record.input_json.mainGoal,
              currentCountry: record.input_json.currentCountry,
              passportCountry: record.input_json.passportCountry,
              age: record.input_json.age,
              occupation: record.input_json.occupation,
              englishLevel: record.input_json.englishLevel,
              sponsorOrFamily: record.input_json.sponsorOrFamily,
              biggestConcern: record.input_json.biggestConcern,
            },
          });

          const resend = new Resend(apiKey);
          const fromEmail = process.env.FROM_EMAIL || "Logivisa <onboarding@resend.dev>";
          const isTr = locale === "tr";
          const isZh = locale === "zh-Hans";
          const greeting = record.full_name
            ? `${isTr ? "Merhaba" : isZh ? "您好" : "Hi"} ${record.full_name},`
            : isTr ? "Merhaba," : isZh ? "您好，" : "Hi,";

          await resend.emails.send({
            from: fromEmail,
            to: [email],
            subject: isTr
              ? "Tam vize hazirlik raporu — ödeme onaylandı"
              : isZh
                ? "完整签证准备度报告 — 支付已确认"
                : "Your full visa readiness report — payment confirmed",
            text: [
              greeting,
              "",
              isTr
                ? "Ödemeniz onaylandı. Tam vize hazırlık raporunuz ektedir."
                : isZh
                  ? "您的付款已确认。完整签证准备度报告已作为附件发送。"
                  : "Your payment has been confirmed. Your full visa readiness report is attached.",
              "",
              isTr
                ? "Bu yalnızca genel bilgidir ve göç tavsiyesi değildir."
                : isZh
                  ? "本内容仅为一般信息，不构成移民建议。"
                  : "This is general information only and not migration advice.",
            ].join("\n"),
            attachments: [
              {
                filename: "visa-readiness-report.pdf",
                content: Buffer.from(pdfBytes),
              },
            ],
          });

          // Mark PDF as sent
          await prisma.$executeRawUnsafe(
            `UPDATE user_reports SET pdf_sent = TRUE WHERE id = $1::uuid`,
            reportId
          );

          console.log(`Webhook: Report ${reportId} unlocked and PDF sent to ${email}`);
        } catch (emailErr) {
          console.error("Webhook: PDF generation or email delivery failed:", emailErr);
          // Payment was successful, so we don't fail the webhook
        }
      }
    } catch (err) {
      console.error("Webhook: Failed to process checkout.session.completed:", err);
      return new Response("Processing failed", { status: 500 });
    }
  }

  return new Response("OK", { status: 200 });
}
