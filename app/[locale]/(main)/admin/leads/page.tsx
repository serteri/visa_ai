import { desc } from "drizzle-orm";
import Link from "next/link";

import { AdminNav } from "@/app/[locale]/(main)/admin/admin-nav";
import { loginAdmin, logoutAdmin } from "@/app/[locale]/(main)/admin/leads/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { getAdminPassword, isAdminAuthenticated } from "@/lib/admin-auth";

async function getLeads() {
  return db.select().from(leads).orderBy(desc(leads.system_score), desc(leads.created_at));
}

function scoreBadgeClass(score: number | null) {
  if ((score ?? 0) >= 75) return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if ((score ?? 0) >= 50) return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-red-200 bg-red-50 text-red-900";
}

type AdminLeadsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ auth?: string }>;
};

export default async function AdminLeadsPage({ params, searchParams }: AdminLeadsPageProps) {
  const { locale } = await params;
  const query = await searchParams;
  const authenticated = await isAdminAuthenticated();
  const configured = Boolean(getAdminPassword());

  if (!authenticated) {
    return (
      <main className="ambient-bg flex-1 py-12">
        <section className="section-shell max-w-xl space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Admin</p>
            <h1 className="text-3xl font-bold">Lead Management</h1>
            <p className="text-sm text-muted-foreground">
              Full Check leads ekranina erismek icin admin sifresi gerekir.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Admin Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!configured && (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  `ADMIN_DASHBOARD_PASSWORD` env degeri tanimli degil.
                </p>
              )}
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
              {query.auth === "setup" && (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Admin sifresi ortama eklenmeden erisim acilmayacak.
                </p>
              )}

              <form action={loginAdmin} className="space-y-3">
                <input type="hidden" name="locale" value={locale} />
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Password</Label>
                  <Input id="admin-password" name="password" type="password" required />
                </div>
                <Button type="submit" className="w-full" disabled={!configured}>
                  Enter Admin
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>
      </main>
    );
  }

  const records = await getLeads();

  return (
    <main className="ambient-bg flex-1 py-12">
      <section className="section-shell space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <AdminNav locale={locale} />
          <form action={logoutAdmin}>
            <input type="hidden" name="locale" value={locale} />
            <Button type="submit" variant="outline">Sign out</Button>
          </form>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Admin</p>
          <h1 className="text-3xl font-bold">Lead Management</h1>
          <p className="text-sm text-muted-foreground">
            Full Check sorgulari burada sicak lead onceligiyle listelenir.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>Leads</CardTitle>
              <Badge variant="secondary">Total {records.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {records.length === 0 ? (
              <p className="text-sm text-muted-foreground">Henüz lead kaydı yok.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="py-3 pr-4 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold">Email</th>
                      <th className="px-4 py-3 font-semibold">Occupation</th>
                      <th className="px-4 py-3 font-semibold">Selected Visa</th>
                      <th className="px-4 py-3 font-semibold">System Score</th>
                      <th className="px-4 py-3 font-semibold">Lead Tier</th>
                      <th className="px-4 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((lead) => (
                      <tr key={lead.id} className="border-b border-border/70 last:border-0">
                        <td className="py-3 pr-4 align-top">
                          <div>
                            <p className="font-semibold">{lead.full_name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">
                              {lead.created_at ? new Date(lead.created_at).toLocaleString() : "-"}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">{lead.email}</td>
                        <td className="px-4 py-3 align-top">{lead.occupation || "-"}</td>
                        <td className="px-4 py-3 align-top">{lead.selected_visa || lead.source || "-"}</td>
                        <td className="px-4 py-3 align-top">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${scoreBadgeClass(lead.system_score)}`}>
                            {lead.system_score ?? "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top">{lead.lead_tier || "-"}</td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-wrap gap-2">
                            <Button asChild size="sm" variant="outline">
                              <a href={`mailto:${lead.email}?subject=Your LogiVisa Full Check`}>Email Gonder</a>
                            </Button>
                            <Button asChild size="sm">
                              <Link href={`/${locale}/admin/leads/${lead.id}`}>Raporu Incele</Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}