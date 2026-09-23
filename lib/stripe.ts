import Stripe from "stripe";

export type StripeProductType = "premium" | "pdf_book" | "pdf_book_global";

export function getStripeClient(): Stripe {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

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
        ".env.local was last changed -- stop and restart `npm run dev` with an sk_test_ key."
    );
  }

  return new Stripe(stripeSecretKey);
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
