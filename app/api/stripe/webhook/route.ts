import { NextRequest } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";

import { prisma } from "@/lib/prisma";
import { generateReadinessPDF } from "@/lib/readiness/generate-pdf";
import type { ReadinessReport } from "@/lib/readiness/types";
import type { ReadinessInput } from "@/lib/readiness/types";
import { PDF_SLUGS, sendPdfDeliveryEmail } from "@/lib/email/pdf-delivery";
import { recordCommissionTransaction, recordCommissionTransactionForLead, hasRecordedTransaction } from "@/lib/stripe/commission";
import { getStripeClient } from "@/lib/stripe";

export const dynamic = "force-dynamic";

// The single active Stripe webhook endpoint for this app -- consolidated
// from a second, unused stub at app/api/webhooks/stripe/route.ts (deleted;
// its pdf_book/pdf_book_global delivery-email logic was merged in below so
// removing it didn't silently break paid PDF purchases). The lead-magnet
// campaign paywall's checkout.session.completed handling (createCheckoutSession
// in app/actions/stripeActions.ts) was added here too, for the same reason --
// a second webhook route would either duplicate signature verification or
// require registering two endpoint URLs in the Stripe dashboard for one event.
type CheckoutSessionMeta = {
  productType?: "premium" | "pdf_book" | "pdf_book_global";
  /** Set by app/actions/stripeActions.ts's createCheckoutSession for the
   * lead-magnet slot-counter paywall (campaigns.name, e.g.
   * "australia-guide-2026"). Fixed contract -- do not rename here without
   * updating that action too. */
  campaign?: string;
  /** Set by createCheckoutSession when the buyer arrived via a ?ref=<agentId>
   * link (components/ref-capture.tsx), resolved server-side against a real
   * AGENT account before being placed here -- never trust this as anything
   * more than "an agent id that passed getAgentUser() at checkout-creation
   * time", not currently-still-valid until re-checked. */
  agentId?: string;
};

function resolvePdfSlug(productType: CheckoutSessionMeta["productType"]): string | null {
  if (productType === "pdf_book") return PDF_SLUGS.turkish;
  if (productType === "pdf_book_global") return PDF_SLUGS.global;
  return null;
}

/**
 * Lead-magnet campaign checkout (app/actions/stripeActions.ts) reuses the
 * campaign's DB name directly as the PDF slug -- campaigns.name and
 * PDF_SLUGS values are the same string by convention (e.g.
 * "australia-guide-2026" is both), so no separate campaign->slug mapping
 * table is needed. Only known PDF_SLUGS values are accepted so an
 * unexpected/malformed metadata.campaign can't be used to probe for
 * arbitrary public files.
 */
function resolveCampaignPdfSlug(campaign: string | undefined): string | null {
  if (!campaign) return null;
  const knownSlugs = Object.values(PDF_SLUGS) as string[];
  return knownSlugs.includes(campaign) ? campaign : null;
}

async function handlePdfBookPurchase(session: Stripe.Checkout.Session, slug: string): Promise<void> {
  const email =
    session.metadata?.email?.trim() ||
    session.customer_email?.trim() ||
    session.customer_details?.email?.trim() ||
    undefined;
  const fullName = session.customer_details?.name?.trim() || "there";

  if (!email) {
    console.error("[stripe webhook] pdf purchase missing customer email — cannot deliver", {
      sessionId: session.id,
      slug,
    });
    return;
  }

  const result = await sendPdfDeliveryEmail({ fullName, email, slug });
  console.log("[stripe webhook] pdf delivery", {
    sessionId: session.id,
    slug,
    email,
    sent: result.sent,
    skippedReason: result.skippedReason,
  });
}

async function handleReportUnlock(session: Stripe.Checkout.Session): Promise<Response> {
  const reportId = session.metadata?.reportId;
  const email = session.metadata?.email ?? session.customer_email ?? "";

  if (!reportId) {
    console.error("Webhook: Missing reportId in session metadata");
    return new Response("Missing reportId", { status: 400 });
  }

  try {
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
      `SELECT id, email, locale, full_name, report_json, input_json FROM user_reports WHERE id::text = $1::text LIMIT 1`,
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
        WHERE id::text = $2::text
      `,
      email,
      reportId
    );

    // Affiliate commission ledger -- best-effort, must never fail this
    // webhook or block PDF delivery below. No-ops if this session has no
    // leadId in metadata (recordCommissionTransaction checks internally).
    try {
      await recordCommissionTransaction(session);
    } catch (commissionErr) {
      console.error("Webhook: Commission transaction recording failed (non-blocking):", commissionErr);
    }

    // Generate PDF and send email
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      try {
        const locale = (record.locale === "tr" ? "tr" : record.locale === "zh-Hans" ? "zh-Hans" : "en") as
          | "en"
          | "tr"
          | "zh-Hans";
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
        const fromEmail = process.env.FROM_EMAIL || "LogiVisa <noreply@logivisa.com>";
        const isTr = locale === "tr";
        const isZh = locale === "zh-Hans";
        const greeting = record.full_name
          ? `${isTr ? "Merhaba" : isZh ? "您好" : "Hi"} ${record.full_name},`
          : isTr
            ? "Merhaba,"
            : isZh
              ? "您好，"
              : "Hi,";

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

        await prisma.$executeRawUnsafe(`UPDATE user_reports SET pdf_sent = TRUE WHERE id::text = $1::text`, reportId);

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

  return new Response("OK", { status: 200 });
}

export async function POST(request: NextRequest) {
  let stripe: Stripe;
  try {
    stripe = getStripeClient();
  } catch (err) {
    console.error("Webhook: Stripe client not configured:", err);
    return new Response("Stripe not configured", { status: 500 });
  }

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
    const metadata = (session.metadata || {}) as CheckoutSessionMeta;

    // Lead-magnet campaign paywall (app/actions/stripeActions.ts). Checked
    // first and independently of the productType branch below, since this
    // checkout flow never sets productType.
    const campaignPdfSlug = resolveCampaignPdfSlug(metadata.campaign);
    if (campaignPdfSlug) {
      const email = session.customer_details?.email;
      if (!email || !metadata.campaign) {
        console.error("[stripe webhook] campaign purchase missing customer email or campaign metadata — cannot deliver", {
          sessionId: session.id,
          email,
          campaign: metadata.campaign,
        });
        return new Response("Missing customer email or campaign metadata", { status: 400 });
      }

      // Idempotency gate, checked BEFORE any side effect (PDF send or ledger
      // write) -- this is what actually stops a Stripe-redelivered webhook
      // from re-sending the product, not the ledger insert's unique
      // constraint (that only protects the ledger row itself, and would
      // still let the email go out a second time if checked afterward).
      if (await hasRecordedTransaction(session.id)) {
        console.warn("[stripe webhook] campaign session already processed, skipping", { sessionId: session.id });
        return new Response("Already processed", { status: 200 });
      }

      try {
        await handlePdfBookPurchase(session, campaignPdfSlug);
      } catch (err) {
        console.error("Webhook: campaign pdf purchase handling failed:", err);
        return new Response("Processing failed", { status: 500 });
      }

      // Financial ledger write for EVERY campaign sale (not just
      // referral-attributed ones) -- no CRM lead exists for this purchase
      // (an assessment-report lead and a $9.99 guide purchase are different
      // things), so buyerEmail identifies the buyer instead of a fabricated
      // UserReport row that would pollute CRM conversion metrics. Errors
      // here are NOT swallowed: this is a financial record, and letting the
      // error surface as a 500 makes Stripe retry -- the idempotency check
      // above ensures that retry won't re-send the PDF, but WILL retry
      // recording the transaction, since it's genuinely missing.
      await recordCommissionTransactionForLead({
        buyerEmail: email,
        agentId: metadata.agentId ?? null,
        stripeSessionId: session.id,
        totalAmount: (session.amount_total ?? 0) / 100,
      });

      return new Response("OK", { status: 200 });
    }

    const pdfSlug = resolvePdfSlug(metadata.productType);

    if (pdfSlug) {
      try {
        await handlePdfBookPurchase(session, pdfSlug);
      } catch (err) {
        console.error("Webhook: pdf book purchase handling failed:", err);
        return new Response("Processing failed", { status: 500 });
      }
      return new Response("OK", { status: 200 });
    }

    return handleReportUnlock(session);
  }

  return new Response("OK", { status: 200 });
}
