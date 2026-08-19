import { redirect } from "next/navigation";

import { loginAdmin } from "@/app/[locale]/(main)/admin/leads/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAdminPassword, isAdminAuthenticated } from "@/lib/admin-auth";

type AdminLeadAccessPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ auth?: string; callbackUrl?: string }>;
};

// The default landing spot after admin login is /admin/states (State
// Nomination Config) -- the previous default, /admin/leads, queries a
// Drizzle table (`leads`) that doesn't exist in the live database yet (see
// CLAUDE.md), so it 500'd every time someone logged in with no specific
// destination in mind.
const DEFAULT_ADMIN_DESTINATION = "admin/states";

// Only accept a same-origin, locale-admin-scoped relative path from
// callbackUrl (set by proxy.ts when it bounces an unauthenticated /admin/*
// request here) -- never redirect to an arbitrary attacker-supplied URL.
function resolveDestination(locale: string, callbackUrl: string | undefined): string {
  if (callbackUrl && /^\/(?:en|tr|zh-Hans)?\/?admin\//.test(callbackUrl)) {
    return callbackUrl;
  }
  return `/${locale}/${DEFAULT_ADMIN_DESTINATION}`;
}

export default async function AdminLeadAccessPage({ params, searchParams }: AdminLeadAccessPageProps) {
  const { locale } = await params;
  const query = await searchParams;
  const destination = resolveDestination(locale, query.callbackUrl);

  if (!(await isAdminAuthenticated()) && !getAdminPassword()) {
    redirect(`/${locale}`);
  }

  if (await isAdminAuthenticated()) {
    redirect(destination);
  }

  return (
    <main className="ambient-bg flex-1 py-12">
      <section className="section-shell max-w-xl space-y-6">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Admin</p>
          <h1 className="text-3xl font-bold">Lead Management Access</h1>
          <p className="text-sm text-muted-foreground">
            Admin password is required to access lead records.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Admin Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {query.auth === "invalid" && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                Invalid password.
              </p>
            )}
            {query.auth === "signed-out" && (
              <p className="rounded-md border border-border/70 bg-background/80 px-3 py-2 text-sm text-muted-foreground">
                You have been logged out.
              </p>
            )}
            <form action={loginAdmin} className="space-y-3">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="destination" value={destination} />
              <div className="space-y-2">
                <Label htmlFor="admin-password">Password</Label>
                <Input id="admin-password" name="password" type="password" placeholder="Password" required />
              </div>
              <Button type="submit" className="w-full">
                Access Dashboard
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}