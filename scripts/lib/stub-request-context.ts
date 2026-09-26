/**
 * Test bootstrap: lets app modules that read the Next.js request context (lib/admin-auth.ts, lib/auth/rbac.ts, the
 * report routes) run under tsx. Import it FIRST in a test script, before any app module:
 *   - "server-only" -> empty module (Next.js supplies the real one; it is not an installed package);
 *   - "next/headers" -> cookies() backed by `cookieJar` (so the real admin-session code signs and verifies cookies);
 *   - "@/auth" (auth.ts, NextAuth) -> auth() returning `setNextAuthSession(...)`'s value (default: signed out).
 * Also gives report access tokens a secret when the environment has none (CI).
 */
import Module from "node:module";
import path from "node:path";

export const cookieJar = new Map<string, string>();
let nextAuthSession: { user: { id: string; email: string; role: string } } | null = null;
export function setNextAuthSession(session: typeof nextAuthSession) {
  nextAuthSession = session;
}
export function signOutAll() {
  cookieJar.clear();
  nextAuthSession = null;
}

if (!process.env.AUTH_SECRET && !process.env.REPORT_ACCESS_SECRET && !process.env.NEXTAUTH_SECRET) {
  process.env.AUTH_SECRET = "test-only-report-access-secret";
}

const STUBS: Record<string, unknown> = {
  "stub:server-only": {},
  "stub:next/headers": {
    cookies: async () => ({
      get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined),
      set: (name: string, value: string) => void cookieJar.set(name, value),
      delete: (name: string) => void cookieJar.delete(name),
    }),
    headers: async () => new Headers(),
  },
  "stub:auth": { auth: async () => nextAuthSession, handlers: {}, signIn: async () => {}, signOut: async () => {} },
};

const authFile = path.resolve("auth.ts");
type Resolver = (request: string, parent: unknown, ...rest: unknown[]) => string;
const mod = Module as unknown as { _resolveFilename: Resolver; _cache: Record<string, unknown> };
const originalResolve = mod._resolveFilename;
mod._resolveFilename = function (request: string, parent: unknown, ...rest: unknown[]) {
  if (request === "server-only") return "stub:server-only";
  if (request === "next/headers") return "stub:next/headers";
  const resolved = originalResolve.call(this, request, parent, ...rest);
  return resolved === authFile ? "stub:auth" : resolved;
};
for (const [id, exports] of Object.entries(STUBS)) mod._cache[id] = { id, filename: id, loaded: true, exports };
