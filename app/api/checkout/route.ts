import { NextRequest, NextResponse } from "next/server";

import {
  getStripeClient,
  getPriceIdForProduct,
  getStripeBaseUrl,
  type StripeProductType,
} from "@/lib/stripe";

export const dynamic = "force-dynamic";

type CheckoutPayload = {
  productType?: StripeProductType;
  locale?: string;
  email?: string;
  userId?: string;
  reportId?: string;
};

const SUPPORTED_PRODUCTS = new Set<StripeProductType>(["premium", "pdf_book"]);

function normalizeLocale(value?: string): string {
  if (value === "tr") return "tr";
  if (value === "zh-Hans" || value === "zh") return "zh-Hans";
  return "en";
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripeClient();
    const body = (await request.json()) as CheckoutPayload;

    const productType = body.productType;
    if (!productType || !SUPPORTED_PRODUCTS.has(productType)) {
      return NextResponse.json(
        { error: "Invalid productType. Use 'premium' or 'pdf_book'." },
        { status: 400 }
      );
    }

    const locale = normalizeLocale(body.locale);
    const priceId = getPriceIdForProduct(productType);
    const baseUrl = getStripeBaseUrl();

    const successUrl = `${baseUrl}/${locale}/checkout/success?session_id={CHECKOUT_SESSION_ID}&product=${productType}`;
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
