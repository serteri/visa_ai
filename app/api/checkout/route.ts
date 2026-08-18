import { NextRequest, NextResponse } from "next/server";

import {
  getStripeClient,
  getPriceIdForProduct,
  getStripeBaseUrl,
  type StripeProductType,
} from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { generateAndSendReport } from "@/lib/services/report-service";
import { getUserReportById } from "@/src/lib/user-reports";
import { FREE_PROMO_LIMIT } from "@/lib/services/free-promo";

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
    // has it could otherwise grant themselves a free-promo slot on someone
    // else's report and have that report's PDF emailed to their own inbox
    // (generateAndSendReport uses whatever email is passed in). Requiring
    // the submitted email to match the report's own stored email closes
    // that off -- the "credential" for an anonymous report is its UUID
    // *and* the email it was created under, not the UUID alone. Applies to
    // both the free-promo grant and the Stripe path below, since both
    // ultimately deliver the PDF using body.email.
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

    // Free-promo path: only applies to report unlocks (productType "premium")
    // that identify a specific UserReport via reportId. The UPDATE's WHERE
    // clause re-checks the live count inside the same statement, so it's
    // atomic under concurrent requests -- no separate count-then-update race,
    // no locking/retry logic needed.
    if (productType === "premium" && body.reportId) {
      try {
        const granted = await prisma.$queryRaw<{ id: string }[]>`
          UPDATE user_reports
          SET is_free_promo = true,
              is_unlocked = true,
              payment_status = 'paid',
              unlock_method = 'free_promo',
              unlocked_at = now()
          WHERE id = ${body.reportId}
            AND is_free_promo = false
            AND (SELECT COUNT(*) FROM user_reports WHERE is_free_promo = true) < ${FREE_PROMO_LIMIT}
          RETURNING id
        `;

        if (granted.length > 0) {
          // Best-effort: generateAndSendReport already swallows its own
          // PDF/email errors and never throws, but this call is wrapped
          // anyway so a bug in that contract can never take down a checkout
          // response that already told the client the report is unlocked.
          try {
            await generateAndSendReport(body.reportId, body.email ?? "");
          } catch (reportError) {
            console.error("[checkout] free-promo PDF/email generation failed (non-fatal)", reportError);
          }

          return NextResponse.json({
            url: `${baseUrl}/${locale}/checkout/success?product=${productType}&free=true&reportId=${body.reportId}`,
          });
        }
        // No row updated: either the promo quota is full, or this report was
        // already granted/unlocked previously. Fall through to Stripe below.
      } catch (promoError) {
        console.error("[checkout] free-promo grant failed, falling back to Stripe", promoError);
        // Fall through to Stripe rather than failing the request outright.
      }
    }

    const stripe = getStripeClient();
    const priceId = getPriceIdForProduct(productType);

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
