import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/rbac";
import { signOutAction } from "./actions";
import { Toaster } from "@/components/ui/sonner";
import { IdleLogout } from "./idle-logout";

export default async function PortalLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getCurrentUser();
  const prefix = locale === "en" ? "" : `/${locale}`;
  const homeHref =
    user?.role === "ADMIN"
      ? `/${locale}/admin/crm/dashboard`
      : user?.role === "AGENT"
        ? `${prefix}/agent/pool`
        : `${prefix}/`;

  return (
    <div className="min-h-screen bg-background text-white">
      <header className="border-b border-slate-800/60 bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href={homeHref} className="flex items-center gap-2">
            <span className="text-lg font-extrabold tracking-tight text-white">LogiVisa</span>
            <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-300">
              Portal
            </span>
          </Link>

          {user ? (
            <div className="flex items-center gap-3">
              {user.role === "ADMIN" && (
                <nav aria-label="Admin areas" className="hidden items-center gap-1 md:flex">
                  <Link
                    href={`/${locale}/admin/crm/dashboard`}
                    className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                  >
                    CRM &amp; Agents
                  </Link>
                  {/* Bridges this NextAuth ADMIN session into the legacy
                      password-cookie admin session (lib/admin-auth.ts) so
                      this lands on Data Sync directly instead of a password
                      prompt -- see app/api/admin/bridge-legacy-session/route.ts. */}
                  <Link
                    href={`/api/admin/bridge-legacy-session?locale=${locale}`}
                    className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                  >
                    Data Sync &amp; Sources
                  </Link>
                </nav>
              )}
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium leading-tight text-white">{user.name ?? user.email}</p>
                <p className="text-xs uppercase tracking-wide text-slate-300">{user.role}</p>
              </div>
              <form action={signOutAction}>
                <Button type="submit" variant="outline" size="sm">
                  Sign out
                </Button>
              </form>
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      <Toaster />
      {user ? <IdleLogout locale={locale} /> : null}
    </div>
  );
}
