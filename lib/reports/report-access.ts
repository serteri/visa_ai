/**
 * Who may see a report (its PDF, its full on-screen view) -- pure logic, no request APIs, so it is unit-testable.
 * The request-reading side is lib/reports/report-access-server.ts.
 *
 * A report ID (crypto.randomUUID(), 122 random bits) is not guessable, but it is not a credential either: it travels
 * in URLs (result page, checkout success, emails). Access therefore needs, besides the report being unlocked (PDF):
 *   - an ADMIN session -- the signed admin cookie (lib/admin-auth.ts) or a NextAuth session with role ADMIN; or
 *   - the report's ACCESS TOKEN -- HMAC-SHA256 of the report id under a server secret, handed out only where the owner
 *     legitimately is: the checkout success page after the server confirms the Stripe session paid for this report,
 *     and the links in the emails sent to the report's own address; or
 *   - a signed-in (NextAuth) user whose email is the report's email.
 * A typed email address is never a credential.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

/** REPORT_ACCESS_SECRET, else the NextAuth secret. None configured -> no token is issued or accepted (fail closed). */
export function reportAccessSecret(): string | null {
  const s = (process.env.REPORT_ACCESS_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "").trim();
  return s ? s : null;
}

/** The report's access token (base64url, 43 chars), or null when no secret is configured. */
export function reportAccessToken(reportId: string, secret: string | null = reportAccessSecret()): string | null {
  if (!secret || !reportId) return null;
  return createHmac("sha256", secret).update(`report-access:v1:${reportId}`).digest("base64url");
}

export function isValidReportAccessToken(reportId: string, token: string | null | undefined, secret: string | null = reportAccessSecret()): boolean {
  const expected = reportAccessToken(reportId, secret);
  if (!expected || !token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type ReportRequester = {
  /** Verified server-side: signed admin cookie, or NextAuth role ADMIN. */
  isAdmin: boolean;
  /** Email of a verified NextAuth session, if any. */
  sessionEmail?: string | null;
};

/** Pure decision: may this requester see this report? (Unlock state is checked separately by the caller.) */
export function canAccessReport(input: {
  requester: ReportRequester;
  reportId: string;
  reportEmail: string;
  token?: string | null;
  secret?: string | null;
}): boolean {
  if (input.requester.isAdmin) return true;
  if (isValidReportAccessToken(input.reportId, input.token, input.secret === undefined ? reportAccessSecret() : input.secret)) return true;
  const session = (input.requester.sessionEmail ?? "").trim().toLowerCase();
  return session !== "" && session === input.reportEmail.trim().toLowerCase();
}

/** A link to the report's result page that carries its access token (for emails and the success page). */
export function reportResultUrl(baseUrl: string, locale: string, reportId: string): string {
  const token = reportAccessToken(reportId);
  return `${baseUrl.replace(/\/$/, "")}/${locale}/full-check/result?reportId=${encodeURIComponent(reportId)}${token ? `&t=${token}` : ""}`;
}

/** The PDF route URL for a report, with its access token (relative). */
export function reportPdfPath(reportId: string, token: string | null | undefined): string {
  return `/api/reports/${encodeURIComponent(reportId)}/pdf${token ? `?t=${encodeURIComponent(token)}` : ""}`;
}
