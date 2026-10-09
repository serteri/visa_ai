import { NextRequest } from "next/server";
import Stripe from "stripe";

import { prisma } from "@/lib/prisma";
import { generateAndSendReport } from "@/lib/services/report-service";
import { PDF_SLUGS, sendPdfDeliveryEmail } from "@/lib/email/pdf-delivery";
import { getApprovedAgent } from "@/lib/crm/agent-access";
import { sendAgentReferralPurchaseEmail } from "@/lib/email/agent-notifications";
import { recordCommissionTransaction, recordCommissionTransactionForLead, hasRecordedTransaction } from "@/lib/stripe/commission";
import { getStripeClient } from "@/lib/stripe";
import { fullCheckAdminPayload, sendFullCheckAdminEmail } from "@/lib/email/full-check-admin";
import { getReportEmailSuppressionDecision, shouldSkipInternalNotification, shouldSuppressReportEmails } from "@/lib/email/suppression";
import { getSessionCouponIds } from "@/lib/stripe/session-discounts";
import { recordCreditPurchase } from "@/lib/chat/purchases";

export const dynamic = "force-dynamic";

// The single source of truth for Stripe webhook handling in this app.
// app/api/webhooks/stripe/route.ts re-exports this file's POST handler --
// Stripe's dashboard endpoint is registered at that plural/reordered path,
// and it 404'd until that re-export was added, since Next.js routes are
// path-literal. Keep all event handling here; that file must stay a
// pass-through, not a second implementation. The lead-magnet
// campaign paywall's checkout.session.completed handling (createCheckoutSession
// in app/actions/stripeActions.ts) was added here too, for the same reason --
// a second webhook route would either duplicate signature verification or
// require registering two endpoint URLs in the Stripe dashboard for one event.
type CheckoutSessionMeta = {
  productType?: "premium" | "pdf_book" | "pdf_book_global";
  /** Set by app/api/checkout/route.ts, mirrors reportId -- the UserReport id
   * to unlock and to send the "PAID Assessment Completed" admin email for. */
  assessmentId?: string;
  /** Set by app/actions/stripeActions.ts's createCheckoutSession for the
   * lead-magnet slot-counter paywall (campaigns.name, e.g.
   * "australia-guide-2026"). Fixed contract -- do not rename here without
   * updating that action too. */
  campaign?: string;
  /** Set by createCheckoutSession when the buyer arrived via a ?ref=<agentId>
   * link (components/ref-capture.tsx), resolved server-side against a real
   * AGENT account before being placed here -- never trust this as anything
   * more than "an approved agent id at checkout-creation time"; the commission
   * code re-checks that the agent is approved at the moment of the sale. Report
   * sales never read this: the agent comes from the report row. */
  agentId?: string;
  /** Set by app/api/stripe/checkout/route.ts for the AI-assistant credit
   * packages (app/[locale]/pricing) -- the anonymous ChatVisitor id to
   * credit, paired with `credits` (a stringified integer, since Stripe
   * metadata values are strings only). */
  visitorId?: string;
  credits?: string;
};

function resolvePdfSlug(productType: CheckoutSessionMeta["productType"]): string | null {
  if (productType === "pdf_book") return PDF_SLUGS.turkish;
  if (productType === "pdf_book_global") return PDF_SLUGS.global;
  return null;
}

/**
 * AI-assistant credit-package purchase (app/[locale]/pricing, checkout
 * created in app/api/stripe/checkout/route.ts). Grants the purchased
 * premiumCredits to the anonymous ChatVisitor named in metadata.visitorId and
 * links the email Stripe collected to those credits (lib/chat/purchases.ts),
 * which is what "Restore my credits" and the stored-report profile hang off.
 * isPremium is no longer set: it grants nothing, the balance is the access.
 */
async function handleCreditsPurchase(session: Stripe.Checkout.Session): Promise<Response> {
  const metadata = (session.metadata || {}) as CheckoutSessionMeta;
  const visitorId = metadata.visitorId;
  const credits = metadata.credits ? Number.parseInt(metadata.credits, 10) : NaN;

  if (!visitorId || !Number.isFinite(credits) || credits <= 0) {
    console.error("Webhook: Missing or invalid visitorId/credits in session metadata", {
      sessionId: session.id,
      visitorId,
      creditsRaw: metadata.credits,
    });
    return new Response("Missing or invalid visitorId/credits", { status: 400 });
  }

  try {
    const outcome = await recordCreditPurchase(prisma, {
      sessionId: session.id,
      visitorId,
      credits,
      email: session.customer_details?.email || session.customer_email || session.metadata?.email,
    });
    if (outcome === "duplicate") {
      console.warn("Webhook: credit purchase already processed, skipping", { sessionId: session.id });
      return Response.json({ received: true });
    }
  } catch (err) {
    // Includes Prisma's "record not found" (P2025) if visitorId doesn't
    // match any ChatVisitor -- surfaced as a 500 so Stripe retries and this
    // gets noticed instead of silently dropping a paid purchase.
    console.error("Webhook: failed to credit ChatVisitor:", err, { sessionId: session.id, visitorId });
    return new Response("Processing failed", { status: 500 });
  }

  console.log(`Webhook: credited ${credits} premiumCredits to visitor ${visitorId}`, { sessionId: session.id });
  return Response.json({ received: true });
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

async function handlePdfBookPurchase(stripe: Stripe, session: Stripe.Checkout.Session, slug: string): Promise<void> {
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

  // Free admin order (ADMINFREE applied on the session, or an admin allow-list address): no delivery email.
  // Decided server-side from the Stripe session, never from anything the browser sent.
  const couponIds = await getSessionCouponIds(stripe, session);
  if (
    shouldSuppressReportEmails(
      { email: [email, session.metadata?.email, session.customer_email, session.customer_details?.email], promotionCode: couponIds },
      "stripe_webhook_pdf_delivery"
    )
  ) {
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

/** One grep-able line per paid report order: what happened to the PAID admin notification and to the customer email, and why. */
function logPaidOrderSummary(reportId: string | undefined, admin: string, customer: string, extra: Record<string, unknown> = {}) {
  console.log(`[webhook-summary] report=${reportId ?? "-"} paid_admin_notification=${admin} customer_email=${customer}`, extra);
}

async function handleReportUnlock(stripe: Stripe, session: Stripe.Checkout.Session): Promise<Response> {
  // assessmentId is the explicit metadata key set by app/api/checkout/route.ts
  // for this purpose; reportId is kept as a fallback for older sessions
  // created before that key existed.
  const reportId = session.metadata?.assessmentId || session.metadata?.reportId;
  const email = session.metadata?.email ?? session.customer_email ?? "";

  if (!reportId) {
    console.error("Webhook: Missing reportId in session metadata");
    console.error("Webhook: PAID admin notification NOT sent: reason=missing_report_id");
    logPaidOrderSummary(undefined, "skipped:missing_report_id", "skipped:missing_report_id");
    return new Response("Missing reportId", { status: 400 });
  }

  try {
    const record = await prisma.userReport.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        email: true,
        locale: true,
        fullName: true,
        source: true,
        preferredPath: true,
        reportJson: true,
        inputJson: true,
      },
    });

    if (!record) {
      console.error(`Webhook: Report ${reportId} not found`);
      console.error(`Webhook: PAID admin notification NOT sent for report ${reportId}: reason=report_not_found`);
      logPaidOrderSummary(reportId, "skipped:report_not_found", "skipped:report_not_found");
      return new Response("Report not found", { status: 404 });
    }

    // Mark as unlocked with payment
    await prisma.userReport.update({
      where: { id: reportId },
      data: {
        email,
        unlockMethod: "payment",
        paymentStatus: "paid",
        isUnlocked: true,
        pdfSent: false,
        unlockedAt: new Date(),
      },
    });

    // Affiliate commission ledger -- best-effort, must never fail this
    // webhook or block PDF delivery below. No-ops if this session has no
    // leadId in metadata (recordCommissionTransaction checks internally).
    try {
      // The agent credited is the one on the report row (and only if approved), never one named in the session metadata.
      const sale = await recordCommissionTransaction(session);
      if (sale?.agentId && !shouldSkipInternalNotification({ email: [email, record.email] }, "agent_referral_purchase_email")) {
        const agent = await getApprovedAgent(sale.agentId);
        if (agent) await sendAgentReferralPurchaseEmail({ agentEmail: agent.email, agentName: agent.name, locale: record.locale });
      }
    } catch (commissionErr) {
      console.error("Webhook: Commission transaction recording failed (non-blocking):", commissionErr);
    }

    // What may skip an email -- and nothing else: the CUSTOMER's address on ADMIN_EMAILS / KNOWN_TEST_EMAILS, or the single coupon ID in
    // ADMIN_FREE_COUPON_ID (unset = never). The amount, payment status, a 100% coupon, any other promotion code, and the notification's own recipient
    // never suppress anything. Every skip logs its reason.
    const couponIds = await getSessionCouponIds(stripe, session);
    const suppressionInput = {
      email: [email, session.metadata?.email, session.customer_email, session.customer_details?.email, record.email],
      promotionCode: couponIds,
    };
    const decision = getReportEmailSuppressionDecision(suppressionInput);
    console.log(`Webhook: report ${reportId} order facts`, { amountTotal: session.amount_total, paymentStatus: session.payment_status, couponCount: couponIds.length, suppression: decision ? `${decision.reason}:${decision.list}` : "none" });

    let adminOutcome = "";
    try {
      if (shouldSkipInternalNotification({ email: suppressionInput.email, couponId: couponIds }, "stripe_webhook_admin_notification")) {
        adminOutcome = `skipped:${decision?.reason === "admin_promo" ? "admin_coupon" : "customer_address_listed"}`;
        console.log(`Webhook: PAID admin notification NOT sent for report ${reportId}: reason=${adminOutcome.slice(8)} (list=${decision?.list})`);
      } else {
        const adminResult = await sendFullCheckAdminEmail(fullCheckAdminPayload(record, email));
        if (adminResult.sent) {
          adminOutcome = "sent";
          console.log(`Webhook: PAID admin notification sent for report ${reportId}`);
        } else {
          adminOutcome = `skipped:${adminResult.skippedReason}`;
          console.error(`Webhook: PAID admin notification NOT sent for report ${reportId}: reason=${adminResult.skippedReason}`);
        }
      }
    } catch (adminEmailErr) {
      adminOutcome = "failed:provider_error";
      console.error(`Webhook: PAID admin notification FAILED for report ${reportId}: reason=provider_error`, adminEmailErr);
    }

    // Generate PDF and send email -- shared with the free-promo grant in
    // app/api/checkout/route.ts (see lib/services/report-service.ts).
    // generateAndSendReport never throws (its own contract), but this is
    // still wrapped: payment already succeeded and was recorded above, so a
    // PDF/email failure here must never fail this webhook and cause Stripe
    // to retry a charge that already went through.
    let customerOutcome = "";
    try {
      const customerDecision = decision;
      const { pdfSent, skippedReason } = await generateAndSendReport(reportId, email, record.fullName ?? undefined, {
        suppressEmail: shouldSuppressReportEmails(suppressionInput, "stripe_webhook_customer_report_email"),
        suppressReason: customerDecision ? (customerDecision.reason === "admin_promo" ? "admin_coupon" : "customer_address_listed") : undefined,
      });
      customerOutcome = pdfSent ? "sent" : `skipped:${skippedReason ?? "unknown"}`;
      console.log(`Webhook: Report ${reportId} unlock processed, pdfSent=${pdfSent}${pdfSent ? "" : ` customerEmailSkipped reason=${skippedReason ?? "unknown"}`}`, { amountTotal: session.amount_total, paymentStatus: session.payment_status });
    } catch (emailErr) {
      customerOutcome = "failed:exception";
      console.error("Webhook: PDF generation or email delivery failed:", emailErr);
      // Payment was successful, so we don't fail the webhook
    }
    logPaidOrderSummary(reportId, adminOutcome, customerOutcome);
  } catch (err) {
    console.error("Webhook: Failed to process checkout.session.completed:", err);
    console.error(`Webhook: PAID admin notification NOT sent for report ${reportId}: reason=processing_error`);
    logPaidOrderSummary(reportId, "failed:processing_error", "failed:processing_error");
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

      console.log(`[webhook-summary] paid_admin_notification=not_applicable:campaign_pdf_purchase (no report order; the buyer gets the delivery email)`);
      try {
        await handlePdfBookPurchase(stripe, session, campaignPdfSlug);
      } catch (err) {
        console.error("Webhook: campaign pdf purchase handling failed:", err);
        return new Response("Processing failed", { status: 500 });
      }

      // Financial ledger write for EVERY campaign sale (not just
      // referral-attributed ones) -- no CRM lead exists for this purchase
      // (an assessment-report lead and a guide purchase are different
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
      console.log(`[webhook-summary] paid_admin_notification=not_applicable:pdf_book_purchase (no report order; the buyer gets the delivery email)`);
      try {
        await handlePdfBookPurchase(stripe, session, pdfSlug);
      } catch (err) {
        console.error("Webhook: pdf book purchase handling failed:", err);
        return new Response("Processing failed", { status: 500 });
      }
      return new Response("OK", { status: 200 });
    }

    // Chat credits and report unlock are granted only once the money is in: "paid", or "no_payment_required" (a
    // 100% promotion code, total A$0). An async method (e.g. BECS direct debit) completes Checkout as "unpaid";
    // that grant waits for checkout.session.async_payment_succeeded below.
    if (!GRANTABLE_PAYMENT_STATUSES.has(session.payment_status)) {
      console.log("[webhook-summary] paid_admin_notification=deferred:awaiting_async_payment");
      console.warn("[stripe webhook] checkout completed but payment not yet received; waiting for async payment", {
        sessionId: session.id,
        paymentStatus: session.payment_status,
      });
      return new Response("Awaiting async payment", { status: 200 });
    }
    return grantCreditsOrUnlock(stripe, session);
  }

  // The async payment of an "unpaid" session cleared: grant now (the same handlers, so idempotency is unchanged).
  if (event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (!GRANTABLE_PAYMENT_STATUSES.has(session.payment_status)) {
      console.error("[stripe webhook] async_payment_succeeded with a non-paid session; nothing granted", {
        sessionId: session.id,
        paymentStatus: session.payment_status,
      });
      return new Response("Payment not received", { status: 200 });
    }
    return grantCreditsOrUnlock(stripe, session);
  }

  // The async payment failed: nothing is granted, ever.
  if (event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object as Stripe.Checkout.Session;
    console.warn("[stripe webhook] async payment failed; nothing granted", { sessionId: session.id });
    return new Response("OK", { status: 200 });
  }

  return new Response("OK", { status: 200 });
}

/** Payment statuses at which chat credits / a report unlock may be granted. "unpaid" never qualifies. */
const GRANTABLE_PAYMENT_STATUSES = new Set<Stripe.Checkout.Session["payment_status"]>(["paid", "no_payment_required"]);

/** Chat credits (metadata.visitorId) or, otherwise, the report unlock -- the two grants gated on payment_status. */
function grantCreditsOrUnlock(stripe: Stripe, session: Stripe.Checkout.Session): Promise<Response> {
  const metadata = (session.metadata || {}) as CheckoutSessionMeta;
  // AI-assistant credit packages (checked before the reportId fallback -- this checkout flow never sets reportId,
  // so falling through to handleReportUnlock would just log a "Missing reportId" error).
  if (metadata.visitorId) {
    console.log("[webhook-summary] paid_admin_notification=not_applicable:chat_credits_purchase");
    return handleCreditsPurchase(session);
  }
  return handleReportUnlock(stripe, session);
}
