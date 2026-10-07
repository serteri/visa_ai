/**
 * The lead-magnet form's validation, one implementation for the browser and the API route (the server never trusts the browser's check).
 * Name and email are required; the phone number is optional and, when given, must have at least 6 digits.
 */
import { FORM_TEXT, pick } from "@/lib/lead-magnets";

// Stricter than the browser's type="email": a TLD is required ("a@b" is rejected).
export const STRICT_EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export type LeadFieldErrors = { full_name?: string; email?: string; phone?: string };

export function validateLeadFields(input: { full_name?: string; email?: string; phone?: string }, locale: string): LeadFieldErrors {
  const errors: LeadFieldErrors = {};
  if (!(input.full_name ?? "").trim()) errors.full_name = pick(FORM_TEXT.nameRequired, locale);
  const email = (input.email ?? "").trim();
  if (!email) errors.email = pick(FORM_TEXT.emailRequired, locale);
  else if (!STRICT_EMAIL_REGEX.test(email)) errors.email = pick(FORM_TEXT.emailInvalid, locale);
  const phone = (input.phone ?? "").trim();
  if (phone && phone.replace(/\D/g, "").length < 6) errors.phone = pick(FORM_TEXT.phoneInvalid, locale);
  return errors;
}
