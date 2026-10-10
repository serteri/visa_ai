import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { localTaxMetadata } from "@/lib/pricing";
import { getStripeClient, getStripeBaseUrl } from "@/lib/stripe";
import { CREDIT_PACKAGES, getCreditPackageLineItem, isCreditPackageId } from "@/lib/stripe/credit-packages";
import { getVisitorContext } from "@/lib/visitor-tracking";

export const dynamic = "force-dynamic";

interface CheckoutPayload {
  /** "starter" | "comprehensive" -- the price is resolved server-side (lib/stripe/credit-packages.ts). */
  plan?: string;
  /** Optional prefill from /pricing?email=... (set by the AI assistant's upgrade prompt). */
  email?: string;
}

// Loose sanity check only: a malformed customer_email makes Stripe reject the whole session, so anything
// that doesn't look like an address is dropped (Checkout then asks for the email itself) rather than
// failing the purchase.
function sanitizeEmail(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const email = value.trim();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined;
}

/**
 * One-time credit-package checkout for the AI assistant paywall (see
 * app/[locale]/pricing). The browser sends only the package id; the
 * GST-inclusive line item comes from lib/stripe/credit-packages.ts.
 *
 * The purchasing identity is the anonymous ChatVisitor (IP+User-Agent, see
 * getVisitorContext) rather than a signed-in user, since the chat paywall
 * itself is anonymous -- visitorId in metadata is what the webhook will use
 * to credit premiumCredits once payment succeeds. Signed-in userId/email
 * are attached too when available, purely for reconciliation.
 */
export async function POST(req: NextRequest) {
  try {
    const body = ((await req.json().catch(() => ({}))) ?? {}) as CheckoutPayload;

    const plan = body.plan;
    if (!isCreditPackageId(plan)) {
      return NextResponse.json({ error: "Unknown credit package." }, { status: 400 });
    }

    // The webhook (app/api/stripe/webhook/route.ts) reads the credit amount back out of
    // session.metadata.credits rather than re-deriving it from the line item.
    const credits = CREDIT_PACKAGES[plan].credits;
    const prefillEmail = sanitizeEmail(body.email);

    const [visitor, session] = await Promise.all([getVisitorContext(req), auth()]);

    const stripe = getStripeClient();
    const baseUrl = getStripeBaseUrl();

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [getCreditPackageLineItem(plan)],
      // Same as the report checkout (app/api/checkout/route.ts): promotion codes can be entered on Checkout. No
      // `discounts` is set here -- Stripe rejects a session with both. The webhook credits the package from
      // metadata.credits, never from the amount paid, so a 100% code (total A$0) still credits the right package.
      allow_promotion_codes: true,
      customer_email: session?.user?.email || prefillEmail,
      // GST is calculated by us (lib/pricing.ts), not by Stripe Tax: the prices are GST-inclusive.
      billing_address_collection: "required",
      automatic_tax: { enabled: false },
      success_url: `${baseUrl}/ai-assistant?success=true`,
      cancel_url: `${baseUrl}/pricing?canceled=true`,
      metadata: {
        visitorId: visitor.id,
        userId: session?.user?.id || "",
        email: session?.user?.email || prefillEmail || "",
        plan,
        // Stripe metadata values are strings only; the webhook parses this
        // back to a number before incrementing premiumCredits.
        credits: String(credits),
        ...localTaxMetadata(getCreditPackageLineItem(plan).price_data.unit_amount),
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
