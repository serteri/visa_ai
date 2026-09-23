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
 * The ebooks and the AI-assistant credit packages follow the same rule --
 * see PRODUCT_PRICE_AUD_CENTS below.
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

// ── Ebooks and AI-assistant credit packages ──────────────────────────────────
//
// Same Australian Consumer Law single-price rule as the Premium report above: the advertised figure is the
// GST-inclusive total the customer pays, and Stripe Checkout charges exactly that (price_data with
// tax_behavior "inclusive" -- GST comes out of the amount, never on top). Each price keeps the previous net
// (GST-exclusive) amount, so net revenue is unchanged:
//   inclusive = round(net * 1.10)   999 * 1.10 = 1098.9 -> 1099;   1999 * 1.10 = 2198.9 -> 2199
// Stripe's inclusive tax then works out GST as inclusive/11 (1099 -> 100, 2199 -> 200).

export type GstInclusiveProduct = "pdf_book" | "pdf_book_global" | "credits_starter" | "credits_comprehensive";

/** Previous GST-exclusive amounts, for reference only -- never advertise these. */
export const PRODUCT_PRICE_NET_AUD_CENTS: Readonly<Record<GstInclusiveProduct, number>> = {
  pdf_book: 999,
  pdf_book_global: 999,
  credits_starter: 999,
  credits_comprehensive: 1999,
};

/** GST-inclusive price, in cents: the exact amount Checkout charges. */
export const PRODUCT_PRICE_AUD_CENTS: Readonly<Record<GstInclusiveProduct, number>> = {
  pdf_book: 1099,
  pdf_book_global: 1099,
  credits_starter: 1099,
  credits_comprehensive: 2199,
};

/** "A$10.99 inc. GST" / "GST dahil A$10.99" / "A$10.99（含GST）" -- the same wording as PREMIUM_PRICE_DISPLAY. */
export function formatPriceIncGst(cents: number, locale: string): string {
  const amount = `A$${(cents / 100).toFixed(2)}`;
  if (locale === "tr") return `GST dahil ${amount}`;
  if (locale === "zh-Hans" || locale === "zh") return `${amount}（含GST）`;
  return `${amount} inc. GST`;
}

/** Display string for one of the products above. */
export function getProductPriceDisplay(product: GstInclusiveProduct, locale: string): string {
  return formatPriceIncGst(PRODUCT_PRICE_AUD_CENTS[product], locale);
}
