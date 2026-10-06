/**
 * Session-bound access to a report for the BROWSER THAT CREATED IT (pure logic; the cookie plumbing is in
 * lib/reports/report-access-server.ts).
 *
 * When the form is submitted, the server remembers the new report id in an httpOnly cookie as "<id>.<token>", where the
 * token is an HMAC of the id under the server secret (a different domain from the emailed-link access token, so one can
 * never stand in for the other). That browser may then open its own report on screen and download its PDF right after
 * unlock. Nobody else gains anything: the cookie is set only in the response to the submission, is httpOnly, signed per
 * report id, and a report id, an email address or the typed form values never substitute for it. The emailed secure link
 * (lib/reports/report-access.ts) remains the second route, for another device or browser.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

import { reportAccessSecret } from "./report-access";

export const REPORT_SESSION_COOKIE = "lv_report_session";
/** How long the creating browser keeps access (seconds). */
export const REPORT_SESSION_MAX_AGE = 60 * 60 * 24 * 7;
/** At most this many reports are remembered per browser (the newest). */
export const REPORT_SESSION_MAX_ENTRIES = 8;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function reportSessionToken(reportId: string, secret: string | null = reportAccessSecret()): string | null {
  if (!secret || !reportId) return null;
  return createHmac("sha256", secret).update(`report-session:v1:${reportId}`).digest("base64url");
}

function validEntry(entry: string, secret: string | null): string | null {
  const dot = entry.indexOf(".");
  if (dot < 1) return null;
  const id = entry.slice(0, dot);
  const token = entry.slice(dot + 1);
  if (!UUID.test(id)) return null;
  const expected = reportSessionToken(id, secret);
  if (!expected) return null;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? id : null;
}

/** The report ids this cookie value proves access to (tampered or foreign entries are dropped). */
export function verifiedReportSessionIds(cookieValue: string | null | undefined, secret: string | null = reportAccessSecret()): string[] {
  if (!cookieValue) return [];
  const out: string[] = [];
  for (const entry of cookieValue.split(",")) {
    const id = validEntry(entry.trim(), secret);
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}

/** The cookie value after remembering `reportId` (newest last, capped); null when no secret is configured (fail closed). */
export function withReportSession(cookieValue: string | null | undefined, reportId: string, secret: string | null = reportAccessSecret()): string | null {
  const token = reportSessionToken(reportId, secret);
  if (!token || !UUID.test(reportId)) return null;
  const kept = verifiedReportSessionIds(cookieValue, secret).filter((id) => id !== reportId);
  const entries = [...kept, reportId].slice(-REPORT_SESSION_MAX_ENTRIES).map((id) => `${id}.${reportSessionToken(id, secret)}`);
  return entries.join(",");
}
