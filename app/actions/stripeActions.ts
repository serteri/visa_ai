"use server";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

import { db } from "@/db";
import { campaigns } from "@/db/schema";
import { getStripeClient, getStripeBaseUrl } from "@/lib/stripe";
import { getAgentUser } from "@/lib/crm/leads";

export type CreateCheckoutSessionResult =
  | { success: true; url: string }
  | { success: false; error: string };

// Same cookie/resolution pattern as full-check/actions.ts's
// resolveReferralAgent() -- kept as its own copy rather than a shared import
// since that function lives in a route-group-local actions.ts, not a
// reusable lib module. An invalid/stale/tampered cookie value just means no
// commission attribution, never a broken checkout.
const REF_COOKIE = "logivisa_ref";

async function resolveReferralAgentId(): Promise<string | undefined> {
  try {
    const cookieStore = await cookies();
    const refAgentId = cookieStore.get(REF_COOKIE)?.value;
    if (!refAgentId) return undefined;

    const agent = await getAgentUser(refAgentId);
    return agent?.id;
  } catch (error) {
    console.error("[createCheckoutSession] Failed to resolve referral agent cookie (non-blocking):", error);
    return undefined;
  }
}

/**
 * Creates a one-off Stripe Checkout Session for a lead-magnet campaign's
 * paid fallback (shown once campaigns.slots_remaining hits 0). Price is
 * read from the campaigns row rather than a pre-created Stripe Price object,
 * since each campaign's price is DB-configured; unlike the fixed-catalog
 * products in lib/stripe.ts (getPriceIdForProduct), this uses Stripe's
 * inline `price_data` for a dynamic, per-campaign amount.
 */
export async function createCheckoutSession(
  campaignSlug: string,
  locale: string = "en"
): Promise<CreateCheckoutSessionResult> {
  try {
    const rows = await db
      .select({ name: campaigns.name, price: campaigns.price })
      .from(campaigns)
      .where(eq(campaigns.name, campaignSlug))
      .limit(1);

    const campaign = rows[0];
    if (!campaign) {
      return { success: false, error: "Campaign not found." };
    }

    const stripe = getStripeClient();
    const baseUrl = getStripeBaseUrl();
    const agentId = await resolveReferralAgentId();

    // Locale-prefixed: the success/cancel pages live under app/[locale]/...
    // with no locale-detection middleware in this project, so a bare
    // "/checkout/success" (no locale segment) would 404 after payment.
    const successUrl = `${baseUrl}/${locale}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/${locale}/checkout/cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: campaign.name },
            unit_amount: campaign.price,
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      // Key names "campaign"/"agentId" are a fixed contract with
      // app/api/stripe/webhook/route.ts's checkout.session.completed handler
      // -- do not rename on either side without updating both. agentId is
      // only set when the visitor arrived via a ?ref=<agentId> link
      // (components/ref-capture.tsx); the webhook creates the actual lead
      // record and commission Transaction once it has the real email from
      // Stripe (see resolveCampaignPdfSlug's caller in the webhook -- this
      // action has no email to attach a lead to yet).
      metadata: { campaign: campaign.name, ...(agentId ? { agentId } : {}) },
    });

    if (!session.url) {
      return { success: false, error: "Stripe did not return a checkout URL." };
    }

    return { success: true, url: session.url };
  } catch (error) {
    console.error("[createCheckoutSession] failed", error);
    // Covers a missing/invalid STRIPE_SECRET_KEY (thrown by getStripeClient)
    // as well as network failures reaching Stripe -- both surface as a
    // generic, safe-to-display message rather than leaking internals.
    return {
      success: false,
      error: "Unable to start checkout right now. Please try again shortly.",
    };
  }
}
