/**
 * Browser side of purchase tracking. It only ever receives a VerifiedPurchase from the server (lib/analytics/purchase.ts); it never reads the URL.
 * GA4 gets a `purchase` event with a path-only location.
 *
 * Repeats: a per-browser ledger (localStorage) stops reloads; across browsers the same `txn` is the GA4 transaction_id, which GA4 uses to collapse duplicates
 * per property. That is vendor-side best effort, not an exactly-once guarantee: a visitor who clears storage and re-opens the success link relies on that
 * deduplication.
 */
export type PurchasePayload = { txn: string; value: number; currency: string; product: string };

export const PURCHASE_LEDGER_PREFIX = "lv_purchase_";

export type PurchaseDeps = {
  storage: { getItem(k: string): string | null; setItem(k: string, v: string): void } | null;
  /** GA is loaded, consented and allowed for this page. */
  gtag: ((...a: unknown[]) => void) | null;
  /** The path-only location (no query) to attach to the GA4 event. */
  pageLocation: string;
};

export function validPurchase(p: unknown): p is PurchasePayload {
  const x = p as PurchasePayload;
  return (
    Boolean(x) &&
    /^[0-9a-f]{32}$/.test(x.txn) &&
    typeof x.value === "number" &&
    Number.isFinite(x.value) &&
    x.value > 0 &&
    x.value < 100000 &&
    /^[A-Z]{3}$/.test(x.currency) &&
    /^[a-z_]{2,30}$/.test(x.product)
  );
}

const ledgerKey = (txn: string, vendor: "ga") => `${PURCHASE_LEDGER_PREFIX}${txn}_${vendor}`;
function seen(deps: PurchaseDeps, key: string): boolean {
  try {
    return Boolean(deps.storage?.getItem(key));
  } catch {
    return false; // no ledger: vendor-side deduplication only
  }
}
function remember(deps: PurchaseDeps, key: string) {
  try {
    deps.storage?.setItem(key, "1");
  } catch {
    /* ignore */
  }
}

/**
 * Sends the verified purchase once per browser, as soon as GA4 is available. `done` is true when nothing is left to send, so the caller can stop retrying.
 */
export function reportPurchase(p: PurchasePayload, deps: PurchaseDeps): { ga: boolean; done: boolean } {
  if (!validPurchase(p)) return { ga: false, done: true };
  let ga = false;
  const gaSeen = seen(deps, ledgerKey(p.txn, "ga"));
  if (!gaSeen && deps.gtag) {
    remember(deps, ledgerKey(p.txn, "ga"));
    deps.gtag("event", "purchase", {
      transaction_id: p.txn,
      value: p.value,
      currency: p.currency,
      items: [{ item_id: p.product, item_name: p.product, price: p.value, quantity: 1 }],
      page_location: deps.pageLocation,
      page_referrer: "",
    });
    ga = true;
  }
  return { ga, done: gaSeen || ga };
}
