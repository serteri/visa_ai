import { createHmac } from "node:crypto";

/**
 * Verified-purchase facts for analytics. The only source is the Stripe Checkout session retrieved by the SERVER (the checkout success page, the same
 * retrieval that already gates the download link): a page visit, a query parameter or a redirect proves nothing. Server only: it holds the HMAC secret.
 *
 *   - Only a session whose payment_status is "paid" with a positive amount counts. "unpaid" (async payment pending or failed), "no_payment_required"
 *     (100% coupon, free) and an expired session produce nothing.
 *   - `txn` is an opaque, keyed hash of the payment intent (else the session id): the same for every refresh, webhook retry or second device, and it
 *     contains no Stripe identifier. It is the GA4 transaction_id and the Meta event_id, so the vendors can collapse repeats.
 *   - `value` / `currency` are what Stripe actually charged (after any coupon), not a list price. No name, email, report id or token is included.
 */
export type VerifiedPurchase = { txn: string; value: number; currency: string; product: string };

export type StripeSessionLike = {
  id: string;
  payment_status: string;
  status?: string | null;
  amount_total: number | null;
  currency: string | null;
  payment_intent?: string | { id: string } | null;
  metadata?: Record<string, string> | null;
};

const PRODUCTS = new Set(["premium", "pdf_book", "pdf_book_global"]);

function secret(): string {
  return (process.env.REPORT_ACCESS_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "").trim();
}

export function purchaseTransactionId(session: Pick<StripeSessionLike, "id" | "payment_intent">, key = secret()): string | null {
  if (!key) return null;
  const basis = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || session.id;
  return createHmac("sha256", key).update(`analytics-purchase:v1:${basis}`).digest("hex").slice(0, 32);
}

export function purchaseFromSession(session: StripeSessionLike | null | undefined, key = secret()): VerifiedPurchase | null {
  if (!session || session.payment_status !== "paid" || session.status === "expired") return null;
  const cents = session.amount_total;
  const currency = (session.currency ?? "").toUpperCase();
  if (typeof cents !== "number" || !Number.isInteger(cents) || cents <= 0 || !/^[A-Z]{3}$/.test(currency)) return null;
  const txn = purchaseTransactionId(session, key);
  if (!txn) return null;
  const product = session.metadata?.productType ?? "";
  return { txn, value: cents / 100, currency, product: PRODUCTS.has(product) ? product : "other" };
}

/** Retrieves the session with the injected function (Stripe in production) and returns the verified purchase, or null on any failure. */
export async function verifiedPurchase(sessionId: string | undefined, retrieve: (id: string) => Promise<StripeSessionLike>, key = secret()): Promise<VerifiedPurchase | null> {
  if (!sessionId || !/^cs_(live|test)_[A-Za-z0-9]+$/.test(sessionId)) return null;
  try {
    return purchaseFromSession(await retrieve(sessionId), key);
  } catch {
    return null;
  }
}
