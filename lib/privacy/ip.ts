/**
 * IP addresses are read from a request only to be used in that request. They are not written to the report, guide-download, PDF-download or chat-visitor
 * tables (docs/privacy-data-inventory.md). Two things still need a stable, non-reversible stand-in for an address:
 *
 *  - the assistant recognises a browser (free-message limit, credit balance): `ipFingerprint`, a keyed hash stored in chat_visitors.fingerprint next to the
 *    browser details. It is pseudonymous personal data, not an anonymous value, and the privacy policy says so.
 *  - the one-download-per-address rule of the guide forms: `createSeenSet`, an in-memory set that is per server instance and forgets after its time limit
 *    (best effort, not a guarantee across instances or restarts).
 */
import { createHmac } from "node:crypto";

export const UNKNOWN_IP = "unknown";

/** The first address of x-forwarded-for, else x-real-ip, else "unknown". Never store the result. */
export function clientIpFromHeaders(headers: { get(name: string): string | null }): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || UNKNOWN_IP;
}

/** HMAC-SHA256 of the address under the site secret, first 32 hex characters; the literal "unknown" when the address is unknown. */
export function ipFingerprint(ip: string, secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? ""): string {
  if (!ip || ip === UNKNOWN_IP) return UNKNOWN_IP;
  return createHmac("sha256", secret).update(`chat-visitor:v1:${ip}`).digest("hex").slice(0, 32);
}

export type SeenSet = {
  has(key: string): boolean;
  add(key: string, id?: string): void;
  /** Forgets the key that was added with this id (a download whose email failed to send frees its slot). */
  removeById(id: string): void;
};

/** An in-memory "seen recently" set with a time limit and a size cap. Per server instance; see the file header. */
export function createSeenSet(ttlMs: number, maxEntries = 5000, now: () => number = Date.now): SeenSet {
  const entries = new Map<string, { at: number; id?: string }>();
  const prune = () => {
    const cutoff = now() - ttlMs;
    for (const [k, v] of entries) if (v.at < cutoff) entries.delete(k);
    while (entries.size > maxEntries) {
      const first = entries.keys().next().value;
      if (first === undefined) break;
      entries.delete(first);
    }
  };
  return {
    has(key) {
      const v = entries.get(key);
      if (!v) return false;
      if (v.at < now() - ttlMs) {
        entries.delete(key);
        return false;
      }
      return true;
    },
    add(key, id) {
      entries.set(key, { at: now(), id });
      prune();
    },
    removeById(id) {
      for (const [k, v] of entries) if (v.id === id) entries.delete(k);
    },
  };
}
