import { redirect } from "next/navigation";

import { auth } from "@/auth";

export type Role = "ADMIN" | "AGENT" | "USER";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: Role;
  /** Lead-pool scope for AGENT accounts -- "TR" or "GLOBAL". Unused otherwise. */
  market?: string | null;
};

/** Normalizes the raw session into a typed user (or null if unauthenticated). */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: (session.user.role as Role) ?? "USER",
    market: session.user.market ?? null,
  };
}

/**
 * Where a signed-in user of a given role belongs. Admin pages are always served
 * under the /<locale>/admin prefix in this app (proxy.ts keeps even English
 * admin at /en/admin), whereas agent/consumer English routes are prefixless.
 */
export function homePathForRole(role: Role, locale: string): string {
  // CRM admin lives under /admin/crm/* to avoid colliding with the pre-existing
  // token-gated ops admin at /admin/dashboard.
  if (role === "ADMIN") return `/${locale}/admin/crm/dashboard`;
  const prefix = locale === "en" ? "" : `/${locale}`;
  if (role === "AGENT") return `${prefix}/agent/dashboard`;
  return `${prefix}/dashboard`;
}

function loginPath(locale: string): string {
  return locale === "en" ? "/login" : `/${locale}/login`;
}

/**
 * Server-component guard. Enforces authentication + role. Unauthenticated users
 * go to /login (with a callback back to where they were headed); a signed-in
 * user with the wrong role is redirected to their own home rather than shown
 * the page — matching the "redirect unauthorized roles" requirement.
 *
 * This is the authoritative check (defense in depth); proxy.ts provides a
 * first-line redirect but every protected page also calls this.
 */
export async function requireRole(role: Role, locale: string, callbackPath?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    const cb = callbackPath ? `?callbackUrl=${encodeURIComponent(callbackPath)}` : "";
    redirect(`${loginPath(locale)}${cb}`);
  }
  if (user.role !== role) {
    redirect(homePathForRole(user.role, locale));
  }
  return user;
}
