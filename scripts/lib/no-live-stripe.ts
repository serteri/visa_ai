/**
 * Makes a test incapable of reaching live Stripe. Import it FIRST (before any app module) in every test that loads the real
 * /api/checkout, /api/stripe/* or unlock code.
 *
 * Why: Prisma's client (loaded by src/lib/user-reports and lib/prisma) reads the project's .env on import and puts back
 * every variable that is NOT already defined -- including STRIPE_SECRET_KEY. A test that did `delete process.env.STRIPE_SECRET_KEY`
 * and then imported the route therefore ran with the developer's real key and created real Checkout Sessions. dotenv never
 * overrides a variable that exists, even as an empty string, so these are SET to "" (falsy: the route answers "Stripe keys
 * are missing") rather than deleted.
 *
 * Two layers:
 *   1. the Stripe variables are defined and empty before anything loads;
 *   2. outgoing HTTP(S) and fetch calls to *.stripe.com throw, so even a key that appears later cannot reach Stripe.
 * assertNoLiveStripeKey() is the tripwire to call after the app modules are loaded.
 */
import http from "node:http";
import https from "node:https";

for (const name of ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"]) process.env[name] = "";

const BLOCKED = /(^|\.)stripe\.com$/i;

function hostOf(arg: unknown): string {
  if (typeof arg === "string") {
    try {
      return new URL(arg).hostname;
    } catch {
      return "";
    }
  }
  if (arg instanceof URL) return arg.hostname;
  if (arg && typeof arg === "object") {
    const o = arg as { hostname?: string; host?: string };
    return (o.hostname ?? o.host ?? "").split(":")[0];
  }
  return "";
}

function refuse(host: string): never {
  throw new Error(`test safety: a request to ${host} was blocked (tests must never reach Stripe)`);
}

for (const mod of [https, http] as const) {
  for (const fn of ["request", "get"] as const) {
    const original = mod[fn].bind(mod) as (...a: unknown[]) => unknown;
    (mod as unknown as Record<string, unknown>)[fn] = (...args: unknown[]) => {
      const host = hostOf(args[0]) || hostOf(args[1]);
      if (BLOCKED.test(host)) refuse(host);
      return original(...args);
    };
  }
}

const originalFetch = globalThis.fetch?.bind(globalThis);
if (originalFetch) {
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const host = hostOf(typeof input === "string" || input instanceof URL ? input : (input as Request).url);
    if (BLOCKED.test(host)) refuse(host);
    return originalFetch(input, init);
  }) as typeof fetch;
}

/** Throws if a live Stripe key is in the environment (call after the app modules are loaded, when .env may have been read). */
export function assertNoLiveStripeKey(): void {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (key.startsWith("sk_live_") || key.startsWith("rk_live_")) throw new Error("test safety: a live Stripe key is present in the test environment");
}
