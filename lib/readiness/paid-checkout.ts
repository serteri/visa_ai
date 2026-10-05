/**
 * Feature flag for the PAID Readiness Report checkout (Stripe, product "premium" in app/api/checkout/route.ts).
 *
 * The report is a free beta: with the flag off, the paid checkout is unreachable (the /api/checkout route refuses the
 * "premium" product, the unlock action never asks it for a session) and the unlock UI says "Free beta". The payment code
 * itself (checkout route, webhook, pricing, line items) is untouched and comes back by setting
 *
 *   READINESS_REPORT_PAID_CHECKOUT_ENABLED=true
 *
 * Only the exact string "true" turns it on; unset, empty, "false", "1", "TRUE" are all OFF, so production stays off
 * unless the variable is set on purpose. Read at request time on the server -- never a NEXT_PUBLIC_ variable.
 */
export const PAID_CHECKOUT_FLAG = "READINESS_REPORT_PAID_CHECKOUT_ENABLED";

export function isPaidReportCheckoutEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env[PAID_CHECKOUT_FLAG] === "true";
}

/** What a visitor who is not an admin gets when they ask to open the full report. */
export type NonAdminUnlockMode = "stripe_checkout" | "free_beta";

export function nonAdminUnlockMode(env: Record<string, string | undefined> = process.env): NonAdminUnlockMode {
  return isPaidReportCheckoutEnabled(env) ? "stripe_checkout" : "free_beta";
}
