import { createHash, randomBytes } from "node:crypto";

/**
 * "Restore my credits": the visitor enters the email they bought with, gets a one-time expiring link, and opening
 * it attaches that email's credits to the visitor who confirms. The request endpoint answers every valid email
 * identically (credits or not, known or not) -- the only observable difference is whether an email arrives.
 */

export const RESTORE_TOKEN_TTL_MS = 30 * 60 * 1000;
export const RESTORE_WINDOW_MS = 60 * 60 * 1000;
export const RESTORE_MAX_PER_EMAIL = 3;
export const RESTORE_MAX_PER_IP = 10;

export interface RestoreStore {
  countRequests(filter: { email?: string; ip?: string }, since: Date): Promise<number>;
  logRequest(email: string, ip: string | null, at: Date): Promise<void>;
  /** Does any visitor holding credits bought with this email still have a balance above 0? */
  hasCredits(email: string): Promise<boolean>;
  createToken(tokenHash: string, email: string, expiresAt: Date): Promise<void>;
  /** Atomically marks an unused, unexpired token used and returns its email; null for unknown / used / expired. */
  consumeToken(tokenHash: string, now: Date): Promise<string | null>;
  /** Moves every other holder's credits for this email to `visitorId`, marks the link verified; returns the new balance. */
  transferCredits(email: string, visitorId: string): Promise<number>;
}

export interface RestoreDeps {
  store: RestoreStore;
  sendEmail(args: { to: string; link: string; locale: string }): Promise<void>;
  /** Runs work after the response is sent (next/server `after`), so response time cannot reveal an email. */
  defer(task: () => Promise<void>): void;
  now(): Date;
  baseUrl: string;
}

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const generateToken = () => randomBytes(32).toString("base64url");

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export type RestoreRequestResult = { status: 200; body: { ok: true } } | { status: 400; body: { error: "invalid_email" } } | { status: 429; body: { error: "rate_limited" } };

/** The one response every valid, non-rate-limited request gets. */
export const RESTORE_REQUEST_OK: RestoreRequestResult = { status: 200, body: { ok: true } };

export async function requestRestore(
  deps: RestoreDeps,
  input: { email: unknown; ip: string | null; locale?: string },
): Promise<RestoreRequestResult> {
  const email = normalizeEmail(input.email);
  if (!email) return { status: 400, body: { error: "invalid_email" } };

  const now = deps.now();
  const since = new Date(now.getTime() - RESTORE_WINDOW_MS);
  const [byEmail, byIp] = await Promise.all([
    deps.store.countRequests({ email }, since),
    input.ip ? deps.store.countRequests({ ip: input.ip }, since) : Promise.resolve(0),
  ]);
  // Counted over ALL requests (every email, credits or not), so hitting the limit says nothing about the email.
  if (byEmail >= RESTORE_MAX_PER_EMAIL || byIp >= RESTORE_MAX_PER_IP) return { status: 429, body: { error: "rate_limited" } };
  await deps.store.logRequest(email, input.ip, now);

  deps.defer(async () => {
    try {
      if (!(await deps.store.hasCredits(email))) return;
      const token = generateToken();
      await deps.store.createToken(hashToken(token), email, new Date(now.getTime() + RESTORE_TOKEN_TTL_MS));
      const link = `${deps.baseUrl}/ai-assistant?restore=${encodeURIComponent(token)}`;
      await deps.sendEmail({ to: email, link, locale: input.locale ?? "en" });
    } catch (err) {
      console.error("[chat/restore] request processing failed", err);
    }
  });
  return RESTORE_REQUEST_OK;
}

export type RestoreConfirmResult = { ok: true; credits: number } | { ok: false };

/** Invalid, expired and already-used links are indistinguishable on purpose. */
export async function confirmRestore(deps: RestoreDeps, input: { token: unknown; visitorId: string }): Promise<RestoreConfirmResult> {
  if (typeof input.token !== "string" || input.token.length < 20 || input.token.length > 200) return { ok: false };
  const email = await deps.store.consumeToken(hashToken(input.token), deps.now());
  if (!email) return { ok: false };
  return { ok: true, credits: await deps.store.transferCredits(email, input.visitorId) };
}
