import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/rbac";
import { signOutAction } from "./actions";

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
        ? `${prefix}/agent/dashboard`
        : `${prefix}/`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href={homeHref} className="flex items-center gap-2">
            <span className="text-lg font-extrabold tracking-tight">LogiVisa</span>
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
              Portal
            </span>
          </Link>

          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium leading-tight">{user.name ?? user.email}</p>
                <p className="text-xs uppercase tracking-wide text-slate-500">{user.role}</p>
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
    </div>
  );
}
