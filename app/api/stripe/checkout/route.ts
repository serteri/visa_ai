import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { getStripeClient, getStripeBaseUrl } from "@/lib/stripe";
import { getVisitorContext } from "@/lib/visitor-tracking";

export const dynamic = "force-dynamic";

interface CheckoutPayload {
  priceId?: string;
}

/**
 * One-time credit-package checkout for the AI assistant paywall (see
 * app/[locale]/pricing). Unlike app/api/checkout/route.ts (fixed product
 * types), this accepts any Stripe priceId directly from the frontend since
 * the pricing page's packages aren't part of the existing productType enum.
 *
 * The purchasing identity is the anonymous ChatVisitor (IP+User-Agent, see
 * getVisitorContext) rather than a signed-in user, since the chat paywall
 * itself is anonymous -- visitorId in metadata is what the webhook will use
 * to credit premiumCredits once payment succeeds. Signed-in userId/email
 * are attached too when available, purely for reconciliation.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CheckoutPayload;
    const priceId = body.priceId;

    if (!priceId) {
      return NextResponse.json({ error: "priceId is required." }, { status: 400 });
    }

    const [visitor, session] = await Promise.all([getVisitorContext(req), auth()]);

    const stripe = getStripeClient();
    const baseUrl = getStripeBaseUrl();

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: session?.user?.email || undefined,
      success_url: `${baseUrl}/ai-assistant?success=true`,
      cancel_url: `${baseUrl}/pricing?canceled=true`,
      metadata: {
        visitorId: visitor.id,
        userId: session?.user?.id || "",
        email: session?.user?.email || "",
        priceId,
      },
    });

    if (!checkoutSession.url) {
      return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 500 });
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("[stripe/checkout] failed to create session", error);
    return NextResponse.json({ error: "Failed to create checkout session." }, { status: 500 });
  }
}
