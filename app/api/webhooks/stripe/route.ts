import { NextRequest } from "next/server";
import type Stripe from "stripe";

import { prisma } from "@/lib/prisma";
import {
  getStripeClient,
  getStripeWebhookSecret,
  type StripeProductType,
} from "@/lib/stripe";
import { PDF_SLUGS, sendPdfDeliveryEmail } from "@/lib/email/pdf-delivery";

export const dynamic = "force-dynamic";

type CheckoutSessionMeta = {
  productType?: StripeProductType;
  userId?: string;
  email?: string;
  reportId?: string;
  locale?: string;
};

async function handlePremiumPurchase(session: Stripe.Checkout.Session) {
  const metadata = (session.metadata || {}) as CheckoutSessionMeta;
  const userId = metadata.userId?.trim();
  const email =
    metadata.email?.trim() ||
    session.customer_email?.trim() ||
    undefined;

  // Placeholder logic for premium unlock.
  // Adjust this to your final premium schema (plan, credits, ai_limit, etc.).
  console.log("[stripe webhook] premium purchase", {
    sessionId: session.id,
    userId,
    email,
  });

  // Existing schema does not currently have premium columns on User.
  // We only verify user existence when possible so you can wire your final fields safely.
  if (userId) {
    await prisma.user.findUnique({ where: { id: userId } });
  } else if (email) {
    await prisma.user.findUnique({ where: { email } });
  }
}

// Maps the purchased product to the correct guide file. Turkish edition
// (pdf_book) -> Turkish PDF; Global English edition (pdf_book_global) -> English
// PDF. Any other product type is not a PDF purchase and returns null.
function resolvePdfSlug(productType: StripeProductType | undefined): string | null {
  if (productType === "pdf_book") return PDF_SLUGS.turkish;
  if (productType === "pdf_book_global") return PDF_SLUGS.global;
  return null;
}

async function handlePdfBookPurchase(
  session: Stripe.Checkout.Session,
  productType: StripeProductType
) {
  const metadata = (session.metadata || {}) as CheckoutSessionMeta;
  const email =
    metadata.email?.trim() ||
    session.customer_email?.trim() ||
    session.customer_details?.email?.trim() ||
    undefined;
  // Stripe collects the buyer's name during checkout; fall back to a neutral
  // greeting rather than leaving the email addressed to nobody.
  const fullName = session.customer_details?.name?.trim() || "there";

  const slug = resolvePdfSlug(productType);
  if (!slug) {
    console.error("[stripe webhook] pdf purchase with unmappable productType", {
      sessionId: session.id,
      productType,
    });
    return;
  }

  if (!email) {
    console.error("[stripe webhook] pdf purchase missing customer email — cannot deliver", {
      sessionId: session.id,
      productType,
      slug,
    });
    return;
  }

  const result = await sendPdfDeliveryEmail({ fullName, email, slug });
  console.log("[stripe webhook] pdf delivery", {
    sessionId: session.id,
    productType,
    slug,
    email,
    sent: result.sent,
    pdfUrl: result.pdfUrl,
    skippedReason: result.skippedReason,
  });
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  let payload: string;
  try {
    // Use raw body for Stripe signature verification.
    payload = await request.text();
  } catch {
    return new Response("Invalid body", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    const webhookSecret = getStripeWebhookSecret();
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error("[stripe webhook] signature verification failed", error);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = (session.metadata || {}) as CheckoutSessionMeta;
      const productType = metadata.productType;

      if (productType === "premium") {
        await handlePremiumPurchase(session);
      } else if (productType === "pdf_book" || productType === "pdf_book_global") {
        await handlePdfBookPurchase(session, productType);
      } else {
        console.warn("[stripe webhook] checkout.session.completed without known productType", {
          sessionId: session.id,
          productType,
        });
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[stripe webhook] handler failed", error);
    return new Response("Webhook handler error", { status: 500 });
  }
}
