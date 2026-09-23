import { PREMIUM_PRICE_AUD_CENTS, PRODUCT_PRICE_AUD_CENTS } from "@/lib/pricing";
import type { StripeProductType } from "@/lib/stripe";

// Every fixed-catalog product (app/api/checkout/route.ts) is priced inline (price_data) instead of a
// pre-created Stripe Price, so the GST-inclusive total and tax_behavior live in one place (lib/pricing.ts)
// rather than requiring a Price object edit in the Stripe dashboard (which is also immutable for tax_behavior
// once created). The advertised price is the exact GST-inclusive total the customer pays -- GST comes out of
// that amount, never added on top (ACL single-price rule). Each tax_code is the one the product's former
// Stripe Price carried.
const CHECKOUT_PRODUCTS: Readonly<Record<StripeProductType, { name: string; taxCode: string; unitAmount: number }>> = {
  // General - Electronically Supplied Services.
  premium: { name: "Full Visa Readiness Report (Premium)", taxCode: "txcd_10000000", unitAmount: PREMIUM_PRICE_AUD_CENTS },
  // Digital books.
  pdf_book: { name: "Avustralya PR Rehberi 2026 (PDF)", taxCode: "txcd_10202003", unitAmount: PRODUCT_PRICE_AUD_CENTS.pdf_book },
  pdf_book_global: { name: "Australia PR Guide 2026 (PDF)", taxCode: "txcd_10000000", unitAmount: PRODUCT_PRICE_AUD_CENTS.pdf_book_global },
};

export function getCheckoutLineItem(productType: StripeProductType) {
  const product = CHECKOUT_PRODUCTS[productType];
  return {
    price_data: {
      currency: "aud",
      product_data: { name: product.name, tax_code: product.taxCode },
      unit_amount: product.unitAmount,
      tax_behavior: "inclusive" as const,
    },
    quantity: 1,
  };
}
