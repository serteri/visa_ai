/**
 * AI-assistant credit packages sold on app/[locale]/pricing, resolved SERVER-SIDE only.
 *
 * The pricing page used to read NEXT_PUBLIC_STRIPE_{STARTER,COMPREHENSIVE}_CREDITS_PRICE_ID in the browser.
 * NEXT_PUBLIC_* values are inlined at build time; when they are not set in the Vercel build environment the
 * browser bundle keeps an unresolved `process.env.NEXT_PUBLIC_...` lookup that evaluates to undefined, and
 * the Buy Now handler returned early with only a console.error -- both buttons silently did nothing in
 * production. The browser now sends only the package id ("starter" | "comprehensive"); the price id is
 * resolved here, at request time.
 *
 * Resolution per package: the server-only STRIPE_<PLAN>_CREDITS_PRICE_ID override if set, otherwise the
 * committed default for the Stripe mode of STRIPE_SECRET_KEY (sk_live_ -> live price, anything else -> test
 * price), so the price can never be from the other mode than the key. The legacy NEXT_PUBLIC_* names are
 * deliberately NOT read: local .env files still carry live ids under them next to a test key. Price ids are
 * public identifiers, not secrets. Defaults checked against Stripe on 2026-09-23: live AUD 9.99 / 19.99
 * one-time, tax_behavior "exclusive"; the test-mode prices mirror them exactly.
 */

export type CreditPackageId = "starter" | "comprehensive";

type CreditPackage = {
  credits: number;
  envKey: string;
  defaultPriceId: { live: string; test: string };
};

export const CREDIT_PACKAGES: Readonly<Record<CreditPackageId, CreditPackage>> = {
  starter: {
    credits: 50,
    envKey: "STRIPE_STARTER_CREDITS_PRICE_ID",
    defaultPriceId: { live: "price_1U4LBCPBavTMsgWAqlbD4jVv", test: "price_1UIfzMPBavTMsgWAF513wSsy" },
  },
  comprehensive: {
    credits: 150,
    envKey: "STRIPE_COMPREHENSIVE_CREDITS_PRICE_ID",
    defaultPriceId: { live: "price_1U4LBsPBavTMsgWAThYuUrSK", test: "price_1UIfzMPBavTMsgWAJRi0xnNI" },
  },
};

export function isCreditPackageId(value: unknown): value is CreditPackageId {
  return value === "starter" || value === "comprehensive";
}

function stripeMode(): "live" | "test" {
  return process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test";
}

export function getCreditPackagePriceId(id: CreditPackageId): string {
  const pkg = CREDIT_PACKAGES[id];
  const override = process.env[pkg.envKey]?.trim().replace(/^["']+|["']+$/g, "");
  return override || pkg.defaultPriceId[stripeMode()];
}

/** Legacy clients posted a priceId; map it back to its package if it is one of ours. */
export function findCreditPackageByPriceId(priceId: string): CreditPackageId | null {
  for (const id of Object.keys(CREDIT_PACKAGES) as CreditPackageId[]) {
    if (getCreditPackagePriceId(id) === priceId) return id;
  }
  return null;
}
