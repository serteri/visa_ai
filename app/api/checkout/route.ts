import { NextRequest, NextResponse } from "next/server";

import {
  getStripeClient,
  getPriceIdForProduct,
  getStripeBaseUrl,
  type StripeProductType,
} from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getUserReportById } from "@/src/lib/user-reports";

export const dynamic = "force-dynamic";

type CheckoutPayload = {
  productType?: StripeProductType;
  locale?: string;
  email?: string;
  userId?: string;
  reportId?: string;
  agentId?: string;
};

const SUPPORTED_PRODUCTS = new Set<StripeProductType>([
  "premium",
  "pdf_book",
  "pdf_book_global",
]);

function normalizeLocale(value?: string): string {
  if (value === "tr") return "tr";
  if (value === "zh-Hans" || value === "zh") return "zh-Hans";
  return "en";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CheckoutPayload;

    const productType = body.productType;
    if (!productType || !SUPPORTED_PRODUCTS.has(productType)) {
      return NextResponse.json(
        {
          error:
            "Invalid productType. Use 'premium', 'pdf_book', or 'pdf_book_global'.",
        },
        { status: 400 }
      );
    }

    const locale = normalizeLocale(body.locale);
    const baseUrl = getStripeBaseUrl();

    // Ownership check: reportId is a UUID, not a secret -- if it ever leaks
    // (referrer header, browser history, a shared screenshot), anyone who
    // has it could otherwise start a Stripe checkout for someone else's
    // report and have that report's PDF emailed to their own inbox once
    // paid (the webhook's generateAndSendReport call uses whatever email
    // is on the Stripe session). Requiring the submitted email to match
    // the report's own stored email closes that off -- the "credential"
    // for an anonymous report is its UUID *and* the email it was created
    // under, not the UUID alone.
    if (productType === "premium" && body.reportId) {
      const record = await getUserReportById(body.reportId);
      if (!record) {
        return NextResponse.json({ error: "Report not found." }, { status: 404 });
      }
      const submittedEmail = (body.email ?? "").trim().toLowerCase();
      const ownerEmail = record.email.trim().toLowerCase();
      if (!submittedEmail || submittedEmail !== ownerEmail) {
        console.warn(
          `[checkout] email mismatch for report ${body.reportId} -- refusing to unlock/redirect`
        );
        return NextResponse.json(
          { error: "The email you entered doesn't match this report. Please use the email you originally submitted." },
          { status: 403 }
        );
      }
    }

    // Free-promo ("first 14 users free") was permanently cancelled as a
    // product decision -- every non-admin unlock now goes through Stripe,
    // no exceptions. The isFreePromo-gated bypass that used to live here
    // (an atomic UPDATE ... WHERE is_free_promo=false AND count < limit,
    // returning success_url directly without a real Stripe session) is
    // gone; UserReport.isFreePromo stays in the schema as historical data
    // for reports already granted under the old promo, just never written
    // to again.
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe keys are missing from environment variables." },
        { status: 500 }
      );
    }

    const stripe = getStripeClient();
    const priceId = getPriceIdForProduct(productType);

    // Loyalty discount: an email that already owns a prior unlocked report
    // is a returning customer, not a first-time visitor -- give them a
    // discount instead of the full $49 (never free; a discount is the only
    // loyalty mechanism, per product decision). Scoped to "premium" only --
    // pdf_book purchases are a different, lower-priced product this
    // discount isn't meant for. Uses a single, fixed coupon ID configured
    // once in the Stripe Dashboard (STRIPE_LOYALTY_COUPON_ID) instead of
    // creating a new Coupon object via the API on every checkout -- that
    // previously left a fresh, one-off Coupon behind in the Dashboard for
    // every returning-customer session, permanently. No promo-code field is
    // shown to the user; this is applied automatically, server-side only.
    let discounts: { coupon: string }[] | undefined;
    if (productType === "premium" && body.email) {
      try {
        const priorReport = await prisma.userReport.findFirst({
          where: {
            email: { equals: body.email, mode: "insensitive" },
            isUnlocked: true,
            ...(body.reportId ? { id: { not: body.reportId } } : {}),
          },
          select: { id: true },
        });

        if (priorReport) {
          const loyaltyCouponId = process.env.STRIPE_LOYALTY_COUPON_ID || "LOYALTY30";
          discounts = [{ coupon: loyaltyCouponId }];
          console.log(
            `[checkout] Applying loyalty coupon ${loyaltyCouponId} for ${body.email} (prior report ${priorReport.id})`
          );
        }
      } catch (discountErr) {
        console.error("[checkout] Returning-customer discount lookup failed (non-fatal)", discountErr);
        // Fall through without a discount rather than failing checkout entirely.
      }
    }

    // reportId is only meaningful for the "premium" product (pdf_book/
    // pdf_book_global purchases aren't tied to a UserReport) -- appended
    // when present so the success page can offer a "Download Report" button
    // without waiting on the webhook-driven email.
    const successUrl = `${baseUrl}/${locale}/checkout/success?session_id={CHECKOUT_SESSION_ID}&product=${productType}${body.reportId ? `&reportId=${body.reportId}` : ""}`;
    const cancelUrl = `${baseUrl}/${locale}/checkout/cancel?product=${productType}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      ...(discounts ? { discounts } : {}),
      customer_email: body.email || undefined,
      client_reference_id: body.userId || body.email || undefined,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        productType,
        locale,
        userId: body.userId || "",
        email: body.email || "",
        reportId: body.reportId || "",
        // leadId mirrors reportId -- recordCommissionTransaction() (lib/
        // stripe/commission.ts) reads leadId specifically, kept distinct
        // from reportId since not every checkout here is report-related.
        leadId: body.reportId || "",
        agentId: body.agentId || "",
        returningCustomerDiscount: discounts ? "true" : "false",
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("[checkout] failed to create session", error);
    return NextResponse.json(
      { error: "Failed to create checkout session." },
      { status: 500 }
    );
  }
}
