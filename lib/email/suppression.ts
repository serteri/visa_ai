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
  /** Coupon IDS applied to the Stripe session (server-side lookup); only an exact match on ADMIN_FREE_COUPON_ID counts. */
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

export type SuppressionDecision = {
  reason: EmailSuppressionReason;
  /** Which configuration matched. */
  list: "ADMIN_EMAILS" | "KNOWN_TEST_EMAILS" | "ADMIN_FREE_COUPON_ID";
  /** The matched customer address, masked (first and last character of the name + domain) so a log line identifies it without exposing it. */
  masked?: string;
};

const normalizeAddress = (email: MaybeString) => (email ?? "").trim().replace(/^["']+|["']+$/g, "").trim().toLowerCase();

/** "cimend79@hotmail.com" -> "c***9/hotmail.com" (no @, so a log line never carries a usable address). */
export function maskAddressForLog(email: string): string {
  const [name = "", domain = ""] = normalizeAddress(email).split("@");
  return `${name.slice(0, 1)}***${name.slice(-1)}/${domain}`;
}

/** Pure decision with the matching rule: why the report emails are suppressed, or null when they should go out. */
export function getReportEmailSuppressionDecision(input: SuppressionInput): SuppressionDecision | null {
  if (toList(input.promotionCode ?? null).some(isAdminPromoCode)) return { reason: "admin_promo", list: "ADMIN_FREE_COUPON_ID" };
  const admin = new Set(parseEmailList(process.env.ADMIN_EMAILS));
  const known = new Set(parseEmailList(process.env.KNOWN_TEST_EMAILS));
  for (const candidate of toList(input.email ?? null)) {
    const n = normalizeAddress(candidate);
    if (!n) continue;
    if (admin.has(n)) return { reason: "admin_email", list: "ADMIN_EMAILS", masked: maskAddressForLog(n) };
    if (known.has(n)) return { reason: "admin_email", list: "KNOWN_TEST_EMAILS", masked: maskAddressForLog(n) };
  }
  return null;
}

/** Pure decision: why the report emails are suppressed, or null when they should go out. */
export function getReportEmailSuppressionReason(input: SuppressionInput): EmailSuppressionReason | null {
  return getReportEmailSuppressionDecision(input)?.reason ?? null;
}

function logDecision(decision: SuppressionDecision, sender: string, kind: "customer" | "internal") {
  console.log(
    `[email-suppression] suppressed reason=${decision.reason} sender=${sender} kind=${kind} list=${decision.list}${decision.masked ? ` addr=${decision.masked}` : ""}`,
  );
}

/**
 * CUSTOMER emails (report ready, access link, preview, guide delivery): decided by the customer's address (the allow-lists) or the one coupon
 * id in ADMIN_FREE_COUPON_ID. Decision + one server log line naming the rule that matched.
 */
export function shouldSuppressReportEmails(input: SuppressionInput, sender = "unspecified"): boolean {
  const decision = getReportEmailSuppressionDecision(input);
  if (!decision) return false;
  logDecision(decision, sender, "customer");
  return true;
}

/**
 * INTERNAL notifications to the operator (PAID, free-unlock, quick-check lead tier, lead alerts). They are skipped only when the CUSTOMER's
 * address is on the owner's own test lists (or the ADMIN_FREE_COUPON_ID coupon was used). The notification's own recipient (serter@ / hello@)
 * is never looked at, so being on ADMIN_EMAILS can never silence the operator's inbox. `customer` must be the customer's address(es).
 */
export function shouldSkipInternalNotification(customer: { email?: MaybeString | MaybeString[]; couponId?: MaybeString | MaybeString[] }, sender = "unspecified"): boolean {
  const decision = getReportEmailSuppressionDecision({ email: customer.email, promotionCode: customer.couponId });
  if (!decision) return false;
  logDecision(decision, sender, "internal");
  return true;
}
