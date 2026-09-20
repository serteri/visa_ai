/**
 * Single source of truth for the Premium Full Visa Readiness Report price.
 *
 * Australian Consumer Law requires the advertised price to be the single
 * GST-inclusive total a customer actually pays -- not a net price with GST
 * added at checkout. The price is AUD $21.99 inclusive of GST (net $19.99 +
 * $2.00 GST). Every place that shows or charges this price -- site copy,
 * pricing components, the premium gate, the PDF download modal, emails,
 * meta/JSON-LD, the chat system prompt, and every Stripe Checkout Session
 * that sells this product -- must read from here, never hardcode a copy.
 *
 * This does NOT cover the separate "AI Assistant" chat-credit packages sold
 * via app/[locale]/pricing (Stripe Prices NEXT_PUBLIC_STRIPE_STARTER_/
 * COMPREHENSIVE_CREDITS_PRICE_ID) -- those are a different product/SKU with
 * their own price, out of scope for this constant.
 */

/** GST-inclusive price, in cents (Stripe's unit for AUD amountAUD). */
export const PREMIUM_PRICE_AUD_CENTS = 2199;

/** GST-inclusive price, in whole-dollar AUD, for arithmetic/display. */
export const PREMIUM_PRICE_AUD = PREMIUM_PRICE_AUD_CENTS / 100;

/** The net (GST-exclusive) price, for reference only -- never advertise this alone. */
export const PREMIUM_PRICE_NET_AUD_CENTS = 1999;

/** GST portion, in cents. amount_tax from Stripe's automatic tax should match this (~200). */
export const PREMIUM_PRICE_GST_AUD_CENTS = PREMIUM_PRICE_AUD_CENTS - PREMIUM_PRICE_NET_AUD_CENTS;

/** Locale-appropriate "A$21.99 inc. GST" display strings. */
export const PREMIUM_PRICE_DISPLAY: Readonly<Record<"en" | "tr" | "zh-Hans", string>> = {
  en: "A$21.99 inc. GST",
  tr: "GST dahil A$21.99",
  "zh-Hans": "A$21.99（含GST）",
};

/** Resolves the display string for a locale, falling back to English. */
export function getPremiumPriceDisplay(locale: string): string {
  if (locale === "tr") return PREMIUM_PRICE_DISPLAY.tr;
  if (locale === "zh-Hans" || locale === "zh") return PREMIUM_PRICE_DISPLAY["zh-Hans"];
  return PREMIUM_PRICE_DISPLAY.en;
}
