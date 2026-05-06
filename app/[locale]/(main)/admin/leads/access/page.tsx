import { redirect } from "next/navigation";

import { loginAdmin } from "@/app/[locale]/(main)/admin/leads/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAdminPassword, isAdminAuthenticated } from "@/lib/admin-auth";

type AdminLeadAccessPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ auth?: string }>;
};

export default async function AdminLeadAccessPage({ params, searchParams }: AdminLeadAccessPageProps) {
  const { locale } = await params;
  const query = await searchParams;

  if (!(await isAdminAuthenticated()) && !getAdminPassword()) {
    redirect(`/${locale}`);
  }

  if (await isAdminAuthenticated()) {
    redirect(`/${locale}/admin/leads`);
  }

  return (
    <main className="ambient-bg flex-1 py-12">
      <section className="section-shell max-w-xl space-y-6">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Admin</p>
          <h1 className="text-3xl font-bold">Lead Management Access</h1>
          <p className="text-sm text-muted-foreground">
            Lead verisine ulasmak icin admin sifresi gerekir.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Admin Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {query.auth === "invalid" && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                Yanlis sifre.
              </p>
            )}
            {query.auth === "signed-out" && (
              <p className="rounded-md border border-border/70 bg-background/80 px-3 py-2 text-sm text-muted-foreground">
                Oturum kapatildi.
              </p>
            )}
            <form action={loginAdmin} className="space-y-3">
              <input type="hidden" name="locale" value={locale} />
              <div className="space-y-2">
                <Label htmlFor="admin-password">Password</Label>
                <Input id="admin-password" name="password" type="password" required />
              </div>
              <Button type="submit" className="w-full">
                Enter Admin
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}