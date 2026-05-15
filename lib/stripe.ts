import Stripe from "stripe";

export type StripeProductType = "premium" | "pdf_book";

export function getStripeClient(): Stripe {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  return new Stripe(stripeSecretKey);
}

export function getPriceIdForProduct(product: StripeProductType): string {
  const premiumPriceId =
    process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID ??
    process.env.STRIPE_PREMIUM_PRICE_ID;
  const pdfBookPriceId =
    process.env.NEXT_PUBLIC_STRIPE_PDFBOOKTURKISH_PRICE_ID ??
    process.env.STRIPE_PDFBOOKTURKISH_PRICE_ID;

  if (product === "premium") {
    if (!premiumPriceId) {
      throw new Error("Premium price id is not configured.");
    }
    return premiumPriceId;
  }

  if (!pdfBookPriceId) {
    throw new Error("PDF book price id is not configured.");
  }

  return pdfBookPriceId;
}

export function getStripeBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
}

export function getStripeWebhookSecret(): string {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured.");
  }
  return webhookSecret;
}
