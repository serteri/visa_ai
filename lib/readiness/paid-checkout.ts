/**
 * Feature flag for the PAID Visa Information Report checkout (Stripe, product "premium" in app/api/checkout/route.ts).
 *
 * ON by default: the report is sold, the unlock UI asks for payment and /api/checkout creates the Stripe session. The flag stays in
 * code so the sale can be switched off again without a deploy of different code:
 *
 *   READINESS_REPORT_PAID_CHECKOUT_ENABLED=false
 *
 * Only the exact string "false" turns it off (then the checkout route refuses the "premium" product and the unlock action opens the report
 * for its owner without payment); unset, empty, "true", "TRUE", "0" are all ON, so a missing variable can never silently give the report
 * away. Reports unlocked while the sale was off stay unlocked (the unlock is a database fact, not a flag). Read at request time on the
 * server -- never a NEXT_PUBLIC_ variable.
 */
export const PAID_CHECKOUT_FLAG = "READINESS_REPORT_PAID_CHECKOUT_ENABLED";

export function isPaidReportCheckoutEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env[PAID_CHECKOUT_FLAG]?.trim() !== "false";
}

/** What a visitor who is not an admin gets when they ask to open the full report. */
export type NonAdminUnlockMode = "stripe_checkout" | "free_beta";

export function nonAdminUnlockMode(env: Record<string, string | undefined> = process.env): NonAdminUnlockMode {
  return isPaidReportCheckoutEnabled(env) ? "stripe_checkout" : "free_beta";
}
