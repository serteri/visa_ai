/**
 * Report-email suppression for free admin orders.
 *
 * Report emails are suppressed ONLY for these two reasons, nothing else:
 *   1. the recipient / buyer address (trimmed, lower-cased, quotes stripped) is in ADMIN_EMAILS or KNOWN_TEST_EMAILS; or
 *   2. the Stripe Checkout session had the one coupon whose id is set in ADMIN_FREE_COUPON_ID (optional; unset = never)
 *      -- determined server-side from the Stripe session (lib/stripe/session-discounts.ts).
 * The browser's admin session, cookies, NextAuth role, a zero-amount session, a 100% coupon or any other promotion
 * code NEVER suppress an email: a customer who is not on the lists always gets the customer email and the admin
 * notification.
 *
 * Every report-related sender calls shouldSuppressReportEmails() BEFORE sending. Authentication/password
 * mail, the contact form and agent-portal notifications are not report emails and never call it.
 * The log line carries a reason code and the sender name only -- never an email address.
 */

/** The optional single coupon id (env var) that marks an owner's free order. Unset: no coupon suppresses anything. */
export function adminFreeCouponId(): string {
  return (process.env.ADMIN_FREE_COUPON_ID ?? "").trim().replace(/^["']+|["']+$/g, "").trim().toLowerCase();
}

export type EmailSuppressionReason = "admin_email" | "admin_promo";

type MaybeString = string | null | undefined;

export type SuppressionInput = {
  /** Buyer/customer address(es): any of them being on the admin list suppresses. */
  email?: MaybeString | MaybeString[];
  /** Promotion code / coupon identifiers found on the Stripe session (server-side lookup). */
  promotionCode?: MaybeString | MaybeString[];
};

// Strips surrounding quote characters in addition to whitespace: an env value pasted verbatim as
// ADMIN_EMAILS="a@b.com,c@d.com" into a dashboard keeps its quotes, which would silently break every entry.
function parseEmailList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((item) => item.trim().replace(/^["']+|["']+$/g, "").trim().toLowerCase())
    .filter(Boolean);
}

function toList(value: MaybeString | MaybeString[]): string[] {
  const items = Array.isArray(value) ? value : [value];
  return items.filter((v): v is string => typeof v === "string");
}

/** True when the address is in ADMIN_EMAILS or KNOWN_TEST_EMAILS (read at call time). */
export function isAdminAllowListedEmail(email: MaybeString): boolean {
  const normalized = (email ?? "").trim().replace(/^["']+|["']+$/g, "").trim().toLowerCase();
  if (!normalized) return false;
  const allowList = new Set([...parseEmailList(process.env.ADMIN_EMAILS), ...parseEmailList(process.env.KNOWN_TEST_EMAILS)]);
  return allowList.has(normalized);
}

export function isAdminPromoCode(code: MaybeString): boolean {
  const configured = adminFreeCouponId();
  return configured !== "" && (code ?? "").trim().toLowerCase() === configured;
}

/** Pure decision: why the report emails are suppressed, or null when they should go out. */
export function getReportEmailSuppressionReason(input: SuppressionInput): EmailSuppressionReason | null {
  if (toList(input.promotionCode ?? null).some(isAdminPromoCode)) return "admin_promo";
  if (toList(input.email ?? null).some(isAdminAllowListedEmail)) return "admin_email";
  return null;
}

/**
 * Decision + one server log line. `sender` names the call site (e.g. "stripe_webhook_admin_notification"),
 * so a suppressed order leaves one line per skipped email.
 */
export function shouldSuppressReportEmails(input: SuppressionInput, sender = "unspecified"): boolean {
  const reason = getReportEmailSuppressionReason(input);
  if (!reason) return false;
  console.log(`[email-suppression] suppressed reason=${reason} sender=${sender}`);
  return true;
}
