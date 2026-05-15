import { NextRequest } from "next/server";
import type Stripe from "stripe";

import { prisma } from "@/lib/prisma";
import {
  getStripeClient,
  getStripeWebhookSecret,
  type StripeProductType,
} from "@/lib/stripe";

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

async function handlePdfBookPurchase(session: Stripe.Checkout.Session) {
  const metadata = (session.metadata || {}) as CheckoutSessionMeta;
  const email =
    metadata.email?.trim() ||
    session.customer_email?.trim() ||
    undefined;

  // Placeholder logic for PDF fulfillment.
  // Replace with: send email with signed URL / unlock download record in DB.
  console.log("[stripe webhook] pdf_book purchase", {
    sessionId: session.id,
    email,
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
      } else if (productType === "pdf_book") {
        await handlePdfBookPurchase(session);
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
