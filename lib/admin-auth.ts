import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const ADMIN_SESSION_COOKIE = "logivisa_admin_session";

// Sliding-window idle timeout -- the session token is only valid for this
// long since it was last (re-)issued. Replaces the previous static
// sha256(password:secret) token (never rotated, no expiry check at all
// server-side -- a leaked cookie value was valid forever) with an
// HMAC-signed timestamp: isAdminAuthenticated() rejects it once this much
// time has passed since issuance, and re-issues a fresh one on every
// successful check it can (see refreshAdminSession() below), so continued
// activity keeps the window open instead of hard-cutting 5 minutes after
// login regardless of use.
const IDLE_TIMEOUT_SECONDS = 30 * 60;
const IDLE_TIMEOUT_MS = IDLE_TIMEOUT_SECONDS * 1000;

/** Timing-safe string comparison -- exported for reuse by every other
 *  secret/token comparison in the app (VIP unlock, admin diagnostic routes,
 *  the full-check admin-tools reset action), so none of them fall back to
 *  a plain `===`/`!==` that leaks timing information about a match. */
export function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function getAdminPassword(): string {
  return process.env.ADMIN_DASHBOARD_PASSWORD?.trim() ?? "";
}

function getAdminSecret(): string {
  return process.env.ADMIN_DASHBOARD_SECRET?.trim() || "logivisa-admin";
}

/** HMAC-SHA256 of `${timestamp}:${password}`, keyed by the secret -- the
 *  secret never appears in the signed message itself, only as the HMAC key. */
function signTimestamp(timestamp: string): string {
  return createHmac("sha256", getAdminSecret()).update(`${timestamp}:${getAdminPassword()}`).digest("hex");
}

/** Builds a fresh `<timestamp>.<hmac>` token, timestamped to right now. */
function issueAdminToken(): string {
  const timestamp = String(Date.now());
  return `${timestamp}.${signTimestamp(timestamp)}`;
}

/**
 * Verifies a token's HMAC signature AND that it hasn't gone idle past
 * IDLE_TIMEOUT_MS -- both checks happen server-side, unlike the old
 * design where only the browser's cookie maxAge enforced expiry (a raw
 * cookie value replayed directly, bypassing the browser, was valid forever).
 */
function verifyAdminToken(token: string): boolean {
  const dotIndex = token.indexOf(".");
  if (dotIndex === -1) return false;

  const timestampPart = token.slice(0, dotIndex);
  const signaturePart = token.slice(dotIndex + 1);
  const timestamp = Number(timestampPart);
  if (!Number.isFinite(timestamp)) return false;
  if (Date.now() - timestamp > IDLE_TIMEOUT_MS) return false;

  return safeEqual(signaturePart, signTimestamp(timestampPart));
}

/**
 * Issues a fresh token and writes it as the session cookie. Only legal to
 * call from a Server Action or Route Handler (Next.js throws if `cookies().
 * set()` is called during a Server Component render) -- callers that are
 * definitely in one of those contexts (loginAdmin, the NextAuth bridge
 * route) call this directly; isAdminAuthenticated() below calls it
 * defensively, since it's invoked from both contexts throughout the app.
 */
export async function refreshAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, issueAdminToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: IDLE_TIMEOUT_SECONDS,
  });
}

/** Alias kept for the existing login/bridge call sites' naming -- both
 *  contexts are Server Actions/Route Handlers, so this is always legal there. */
export const setAdminSession = refreshAdminSession;

export async function isAdminAuthenticated(): Promise<boolean> {
  const password = getAdminPassword();
  if (!password) return false;

  const cookieStore = await cookies();
  const currentToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!currentToken) return false;

  const valid = verifyAdminToken(currentToken);
  if (!valid) return false;

  // Sliding window: an active admin should stay signed in. This is called
  // from plain Server Component page renders (read-only, can't set cookies)
  // as well as Server Actions/Route Handlers (can) -- swallow the
  // Server-Component case rather than crashing the page; the read above
  // already succeeded either way, so auth correctness isn't affected by
  // whether the refresh itself lands.
  try {
    await refreshAdminSession();
  } catch {
    // Called from a Server Component render -- expected, not an error.
  }

  return true;
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export async function logoutAdmin(): Promise<never> {
  await clearAdminSession();
  redirect("/");
}

export function isValidAdminPassword(candidate: string): boolean {
  const password = getAdminPassword();
  if (!password) return false;
  return safeEqual(candidate, password);
}
