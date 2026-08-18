import Stripe from "stripe";

export type StripeProductType = "premium" | "pdf_book" | "pdf_book_global";

export function getStripeClient(): Stripe {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  // TEMPORARY diagnostic for the "live mode + test card declined" report --
  // only ever logs a 10-char prefix (enough to tell sk_test_ from sk_live_),
  // never the actual secret. Remove once we've confirmed which mode is
  // actually active at runtime (every getStripeClient() caller -- checkout,
  // webhook, stripeActions -- goes through this one function).
  console.log("AKTİF STRIPE ANAHTARI:", stripeSecretKey.slice(0, 10) + "...");

  // TEMPORARY guard: if a running dev process has an sk_live_ key cached in
  // memory from before .env.local was last edited (Next.js does NOT hot-
  // reload env vars into an already-running process -- a full restart is
  // required), this throws instead of silently placing a real charge.
  // Restarting `npm run dev` after fixing .env.local is the actual fix;
  // this is a safety net for the window before that restart happens.
  if (process.env.NODE_ENV === "development" && stripeSecretKey.startsWith("sk_live_")) {
    throw new Error(
      "Refusing to initialize Stripe with a LIVE key (sk_live_...) in development. " +
        "This almost always means the dev server has a stale env var cached from before " +
        ".env.local was last changed -- stop and restart `npm run dev`, then confirm the " +
        "AKTİF STRIPE ANAHTARI log above shows sk_test_ on the next request."
    );
  }

  return new Stripe(stripeSecretKey);
}

export function getPriceIdForProduct(product: StripeProductType): string {
  const premiumPriceId =
    process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID ??
    process.env.STRIPE_PREMIUM_PRICE_ID;
  const pdfBookTurkishPriceId =
    process.env.NEXT_PUBLIC_STRIPE_PDFBOOKTURKISH_PRICE_ID ??
    process.env.STRIPE_PDFBOOKTURKISH_PRICE_ID;
  const pdfBookEnglishPriceId =
    process.env.NEXT_PUBLIC_STRIPE_PDFBOOKENGLISH_PRICE_ID ??
    process.env.STRIPE_PDFBOOKENGLISH_PRICE_ID;

  if (product === "premium") {
    if (!premiumPriceId) {
      throw new Error("Premium price id is not configured.");
    }
    return premiumPriceId;
  }

  if (product === "pdf_book_global") {
    if (!pdfBookEnglishPriceId) {
      throw new Error("Global English PDF book price id is not configured.");
    }
    return pdfBookEnglishPriceId;
  }

  if (!pdfBookTurkishPriceId) {
    throw new Error("Turkish PDF book price id is not configured.");
  }

  return pdfBookTurkishPriceId;
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
