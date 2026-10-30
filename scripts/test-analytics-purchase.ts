/**
 * Marketing Phase 1B, Stripe purchase tracking: a purchase event exists only for a payment Stripe confirmed to the server, repeats are collapsed, and no
 * Stripe identifier, name, e-mail, report id or token reaches an analytics vendor.
 *
 *   npx tsx scripts/test-analytics-purchase.ts
 */
import { readFileSync } from "node:fs";

import { purchaseFromSession, purchaseTransactionId, verifiedPurchase, type StripeSessionLike } from "../lib/analytics/purchase";
import { PURCHASE_LEDGER_PREFIX, reportPurchase, validPurchase, type PurchaseDeps, type PurchasePayload } from "../lib/analytics/purchase-client";

let failures = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  if (cond) console.log(`  ✅ ${msg}`);
  else { failures++; console.error(`  ❌ ${msg}${detail ? ` -- ${detail}` : ""}`); }
};
const read = (f: string) => readFileSync(f, "utf8");
const KEY = "test-secret-not-a-real-key";

const paid = (over: Partial<StripeSessionLike> = {}): StripeSessionLike => ({
  id: "cs_live_a1B2c3D4e5F6",
  payment_status: "paid",
  status: "complete",
  amount_total: 3999,
  currency: "aud",
  payment_intent: "pi_3Abc123Def456",
  metadata: { productType: "premium", email: "jane@example.com", reportId: "rep_123", userId: "u1", locale: "en" },
  ...over,
});

async function main() {
  console.log("\n1. a legitimate purchase");
  const p = purchaseFromSession(paid(), KEY);
  check(p !== null && p.value === 39.99 && p.currency === "AUD" && p.product === "premium", "a paid session -> the amount and currency Stripe actually charged, and the product");
  check(p !== null && /^[0-9a-f]{32}$/.test(p.txn) && !/cs_|pi_/.test(JSON.stringify(p)), "the transaction id is an opaque keyed hash, never a Stripe id");
  check(p !== null && JSON.stringify(Object.keys(p).sort()) === JSON.stringify(["currency", "product", "txn", "value"]), "the payload has exactly txn, value, currency, product (no name, e-mail, report id, user id, token)");
  const coupon = purchaseFromSession(paid({ amount_total: 2000 }), KEY);
  check(coupon?.value === 20, "a discounted payment reports the discounted amount (not the list price)");
  check(purchaseFromSession(paid({ metadata: { productType: "pdf_book" } }), KEY)?.product === "pdf_book" && purchaseFromSession(paid({ metadata: { productType: "weird thing!" } }), KEY)?.product === "other", "the product is a fixed vocabulary");

  console.log("\n2. not a purchase: unpaid, failed, free, expired, malformed");
  check(purchaseFromSession(paid({ payment_status: "unpaid" }), KEY) === null, "an unpaid session (async payment pending or failed) -> no purchase");
  check(purchaseFromSession(paid({ payment_status: "unpaid", status: "complete" }), KEY) === null, "a failed payment -> no purchase");
  check(purchaseFromSession(paid({ payment_status: "no_payment_required", amount_total: 0 }), KEY) === null, "a 100%-coupon / no-payment session -> no purchase");
  check(purchaseFromSession(paid({ status: "expired" }), KEY) === null, "an expired session -> no purchase");
  check(purchaseFromSession(paid({ amount_total: 0 }), KEY) === null && purchaseFromSession(paid({ amount_total: null }), KEY) === null && purchaseFromSession(paid({ amount_total: -5 }), KEY) === null && purchaseFromSession(paid({ amount_total: 12.5 }), KEY) === null, "a zero, missing, negative or fractional amount -> no purchase");
  check(purchaseFromSession(paid({ currency: null }), KEY) === null && purchaseFromSession(paid({ currency: "dollars" }), KEY) === null, "a missing or malformed currency -> no purchase");
  check(purchaseFromSession(paid(), "") === null && purchaseFromSession(null, KEY) === null, "no secret configured, or no session -> no purchase (never an unhashed id)");

  console.log("\n3. verification goes through Stripe, never the URL");
  let retrieved = 0;
  const stripe = (s: StripeSessionLike | Error) => async (id: string) => { retrieved++; if (s instanceof Error) throw s; return { ...s, id }; };
  check((await verifiedPurchase("cs_live_a1B2c3D4e5F6", stripe(paid()), KEY)) !== null && retrieved === 1, "a session id that Stripe returns as paid -> a verified purchase");
  retrieved = 0;
  check((await verifiedPurchase(undefined, stripe(paid()), KEY)) === null && (await verifiedPurchase("", stripe(paid()), KEY)) === null && (await verifiedPurchase("not-a-session", stripe(paid()), KEY)) === null && (await verifiedPurchase("cs_live_x'; DROP", stripe(paid()), KEY)) === null && retrieved === 0, "a missing or malformed session id never reaches Stripe and yields nothing");
  check((await verifiedPurchase("cs_live_zzz", stripe(new Error("No such checkout.session")), KEY)) === null, "an unknown session (Stripe error) -> nothing, no throw");
  check((await verifiedPurchase("cs_live_zzz", stripe(paid({ payment_status: "unpaid" })), KEY)) === null, "an unpaid session reached through the URL -> nothing (a typed URL cannot create a purchase)");
  const a = await verifiedPurchase("cs_live_a1B2c3D4e5F6", stripe(paid()), KEY);
  const b = await verifiedPurchase("cs_live_a1B2c3D4e5F6", stripe(paid()), KEY);
  check(a !== null && JSON.stringify(a) === JSON.stringify(b), "the same payment verified twice (a refresh, a second device, a retried webhook delivery) gives the same transaction id");
  check(purchaseTransactionId({ id: "cs_live_other", payment_intent: "pi_other" }, KEY) !== purchaseTransactionId({ id: "cs_live_a1B2c3D4e5F6", payment_intent: "pi_3Abc123Def456" }, KEY), "different payments have different ids");
  check(purchaseTransactionId({ id: "cs_1", payment_intent: { id: "pi_same" } }, KEY) === purchaseTransactionId({ id: "cs_2", payment_intent: "pi_same" }, KEY), "the id is keyed on the payment intent, so one payment under two session ids still collapses");

  console.log("\n4. repeats: refreshes do not inflate purchases");
  const store = new Map<string, string>();
  const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
  const gaCalls: unknown[][] = [];
  const metaCalls: PurchasePayload[] = [];
  const deps = (over: Partial<PurchaseDeps> = {}): PurchaseDeps => ({ storage, gtag: (...a) => void gaCalls.push(a), postToMeta: (x) => void metaCalls.push(x), pageLocation: "https://www.logivisa.com/checkout/success", ...over });
  const first = reportPurchase(a!, deps());
  check(first.ga && first.meta && first.done && gaCalls.length === 1 && metaCalls.length === 1, "first visit: one GA4 purchase and one Meta purchase");
  const ev = gaCalls[0];
  check(ev[0] === "event" && ev[1] === "purchase" && (ev[2] as { transaction_id: string }).transaction_id === a!.txn && (ev[2] as { value: number }).value === 39.99 && (ev[2] as { currency: string }).currency === "AUD" && !/[?#]/.test((ev[2] as { page_location: string }).page_location) && (ev[2] as { page_referrer: string }).page_referrer === "", "the GA4 event has the transaction id, amount, currency, a path-only location and no referrer");
  check(!/cs_|pi_|jane|@|rep_/.test(JSON.stringify(gaCalls) + JSON.stringify(metaCalls)), "nothing identifying is in what GA4 or Meta receive");
  for (let i = 0; i < 5; i++) reportPurchase(a!, deps());
  check(gaCalls.length === 1 && metaCalls.length === 1, "five more refreshes send nothing");
  const store2 = new Map<string, string>();
  const dev2 = (over: Partial<PurchaseDeps> = {}): PurchaseDeps => ({ ...deps(over), storage: { getItem: (k) => store2.get(k) ?? null, setItem: (k, v) => void store2.set(k, v) } });
  gaCalls.length = 0; metaCalls.length = 0;
  const onlyGa = reportPurchase(a!, dev2({ postToMeta: null }));
  check(onlyGa.ga && !onlyGa.meta && !onlyGa.done && gaCalls.length === 1, "GA4 ready before the Meta frame: GA4 is sent, the call is not 'done'");
  const later = reportPurchase(a!, dev2({ gtag: null }));
  check(!later.ga && later.meta && later.done && gaCalls.length === 1 && metaCalls.length === 1, "when the frame is ready later only Meta is sent; GA4 is not sent twice");
  const noStorage = reportPurchase(a!, { ...deps(), storage: null });
  check(noStorage.ga && noStorage.meta, "without storage (private mode) the vendor-side deduplication on the transaction id is what is left (documented limitation)");
  gaCalls.length = 0; metaCalls.length = 0;
  const store3 = new Map<string, string>();
  const noConsent = reportPurchase(a!, { ...deps(), gtag: null, postToMeta: null, storage: { getItem: (k) => store3.get(k) ?? null, setItem: (k, v) => void store3.set(k, v) } });
  check(!noConsent.ga && !noConsent.meta && !noConsent.done && gaCalls.length === 0 && metaCalls.length === 0 && ![...store3.keys()].some((k) => k.startsWith(PURCHASE_LEDGER_PREFIX)), "without consent nothing is sent and nothing is marked as sent (a later consent can still send it)");
  check(!validPurchase({ ...a, txn: "cs_live_abc" }) && !validPurchase({ ...a, value: 0 }) && !validPurchase({ ...a, currency: "aud" }) && !validPurchase(null) && reportPurchase({ ...a!, value: -1 }, deps()).done, "an invalid payload sends nothing");

  console.log("\n5. wiring: the page, the webhook and the old Pixel call");
  const page = read("app/[locale]/(main)/checkout/success/page.tsx");
  check(/verifiedPurchase\(sessionId, \(id\) => getStripeClient\(\)\.checkout\.sessions\.retrieve\(id\)/.test(page) && /<CheckoutSuccessClient downloadHref=\{downloadHref\} purchase=\{purchase\}/.test(page), "the success page derives the purchase from the retrieved Stripe session on the server");
  check(/verifiedDownloadHref\(sessionId, reportId\?\.trim\(\)\)/.test(page) && /session\.payment_status === "paid" \|\| session\.payment_status === "no_payment_required"/.test(page), "the existing download verification is unchanged");
  const client = read("app/[locale]/(main)/checkout/success/success-client.tsx");
  check(!/fbq|searchParams|useSearchParams|PREMIUM_PRICE_AUD|PRODUCT_PRICE_AUD_CENTS/.test(client) && /<PurchaseTracker purchase=\{purchase\} \/>/.test(client), "the page-visit Meta Purchase (fixed price, fired from the URL's product) is gone");
  const webhook = read("app/api/stripe/webhook/route.ts") + read("app/api/webhooks/stripe/route.ts");
  check(!/gtag|fbq|trackEvent|analytics\/purchase|graph\.facebook|measurement_id|mp\/collect/.test(webhook), "the webhooks emit no analytics event, so a duplicated or retried webhook cannot create a purchase");
  const tracker = read("components/analytics/purchase-tracker.tsx");
  check(/iframe/.test(tracker) && /referrerPolicy = "no-referrer"/.test(tracker) && /allow-scripts allow-same-origin/.test(tracker) && !/fbq\(/.test(tracker), "the Meta Purchase is sent from an isolated, referrer-less frame, not from the page whose URL holds the session id");
  check(/pageLocation: `\$\{window\.location\.origin\}\$\{window\.location\.pathname\}`/.test(tracker) && /analyticsConsent/.test(tracker), "GA4 gets a path-only location and only with analytics consent");
  const checkoutRoute = read("app/api/checkout/route.ts");
  check(/success_url: successUrl/.test(checkoutRoute) && /session_id=\{CHECKOUT_SESSION_ID\}/.test(checkoutRoute), "the checkout success URL and the Stripe session creation are unchanged");

  if (failures) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
  console.log("\nAll checks passed");
}
main().catch((e) => { console.error(e); process.exit(1); });
