import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { getStripeClient, getStripeBaseUrl } from "@/lib/stripe";
import {
  CREDIT_PACKAGES,
  findCreditPackageByPriceId,
  getCreditPackagePriceId,
  isCreditPackageId,
  type CreditPackageId,
} from "@/lib/stripe/credit-packages";
import { getVisitorContext } from "@/lib/visitor-tracking";

export const dynamic = "force-dynamic";

interface CheckoutPayload {
  /** "starter" | "comprehensive" -- the price id is resolved server-side (lib/stripe/credit-packages.ts). */
  plan?: string;
  /** Legacy: older bundles posted the price id itself. Accepted only if it is one of our packages' prices. */
  priceId?: string;
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
  console.log("KULLANILAN STRIPE KEY SON 4 HANE:", process.env.STRIPE_SECRET_KEY?.slice(-4));
  try {
    const body = ((await req.json().catch(() => ({}))) ?? {}) as CheckoutPayload;

    let plan: CreditPackageId | null = isCreditPackageId(body.plan) ? body.plan : null;
    if (!plan && body.priceId) plan = findCreditPackageByPriceId(body.priceId);
    if (!plan) {
      return NextResponse.json({ error: "Unknown credit package." }, { status: 400 });
    }

    const priceId = getCreditPackagePriceId(plan);
    // The webhook (app/api/stripe/webhook/route.ts) reads the credit amount back out of
    // session.metadata.credits rather than re-deriving it from priceId.
    const credits = CREDIT_PACKAGES[plan].credits;
    const prefillEmail = sanitizeEmail(body.email);

    const [visitor, session] = await Promise.all([getVisitorContext(req), auth()]);

    const stripe = getStripeClient();
    const baseUrl = getStripeBaseUrl();

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: session?.user?.email || prefillEmail,
      // Stripe Tax needs a customer location to calculate GST; this is the
      // billing address Checkout collects to satisfy that requirement.
      billing_address_collection: "required",
      automatic_tax: { enabled: true },
      success_url: `${baseUrl}/ai-assistant?success=true`,
      cancel_url: `${baseUrl}/pricing?canceled=true`,
      metadata: {
        visitorId: visitor.id,
        userId: session?.user?.id || "",
        email: session?.user?.email || prefillEmail || "",
        plan,
        priceId,
        // Stripe metadata values are strings only; the webhook parses this
        // back to a number before incrementing premiumCredits.
        credits: String(credits),
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
