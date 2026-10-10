/**
 * Single source of truth for the Visa Information Report price.
 *
 * Australian Consumer Law requires the advertised price to be the single
 * GST-inclusive total a customer actually pays -- not a net price with GST
 * added at checkout. The price is AUD $39.99 inclusive of GST (net $36.35 +
 * $3.64 GST, worked out here, not by Stripe Tax). Every place that shows or charges this price -- site copy,
 * pricing components, the premium gate, the PDF download modal, emails,
 * meta/JSON-LD, the chat system prompt, and every Stripe Checkout Session
 * that sells this product -- must read from here, never hardcode a copy.
 *
 * The ebooks and the AI-assistant credit packages follow the same rule --
 * see PRODUCT_PRICE_AUD_CENTS below.
 */

/** GST-inclusive price, in cents (Stripe's unit for AUD amountAUD). */
export const PREMIUM_PRICE_AUD_CENTS = 3999;

/** GST-inclusive price, in whole-dollar AUD, for arithmetic/display. */
export const PREMIUM_PRICE_AUD = PREMIUM_PRICE_AUD_CENTS / 100;

/**
 * The GST component of a GST-inclusive amount, in cents: one eleventh, rounded to the cent (3999 / 11 = 363.55 -> 364). Computed here for the
 * ledger and the receipts' wording; the charge itself is the inclusive total.
 */
export const gstComponentCents = (inclusiveCents: number) => Math.round(inclusiveCents / 11);

/**
 * The local GST figures every checkout session carries in its metadata (strings, as Stripe requires): the GST-inclusive price actually charged, the GST
 * component and the net. Stripe Tax is NOT used (automatic_tax is disabled on every session): these figures, not Stripe's, are what our records use.
 */
export function localTaxMetadata(inclusiveCents: number): Record<string, string> {
  const gst = gstComponentCents(inclusiveCents);
  return { priceInclGstCents: String(inclusiveCents), gstCents: String(gst), netCents: String(inclusiveCents - gst), gstSource: "local" };
}

/** GST portion of the report price, in cents (A$3.64). */
export const PREMIUM_PRICE_GST_AUD_CENTS = gstComponentCents(PREMIUM_PRICE_AUD_CENTS);

/** The net (GST-exclusive) price, for reference only -- never advertise this alone (A$36.35). */
export const PREMIUM_PRICE_NET_AUD_CENTS = PREMIUM_PRICE_AUD_CENTS - PREMIUM_PRICE_GST_AUD_CENTS;

/** Locale-appropriate "A$39.99 inc. GST" display strings. */
export const PREMIUM_PRICE_DISPLAY: Readonly<Record<"en" | "tr" | "zh-Hans", string>> = {
  en: "A$39.99 inc. GST",
  tr: "GST dahil A$39.99",
  "zh-Hans": "A$39.99（含GST）",
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
