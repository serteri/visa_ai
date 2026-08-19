import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminNav } from "@/app/[locale]/(main)/admin/admin-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import type { ReadinessInput } from "@/lib/readiness/types";

// The `leads` Drizzle table (db/schema.ts) this page used to query never
// exists in the live database -- the real, populated lead records live in
// Prisma's UserReport model (user_reports table), the same one the CRM
// (lib/crm/leads.ts) and full-check submission flow (createUserReport)
// already write to. Reading from there instead of the phantom Drizzle table
// is what actually surfaces the Moderate/Low-tier leads that were missing
// before -- there was never a filter hiding them; the query source itself
// was wrong.
//
// Deliberately no where clause: every lead (High/Moderate/Low, any source)
// is returned, ordered by leadScore desc so the highest-intent leads sort
// first, with createdAt desc as the tiebreaker. No silent catch-and-hide
// here -- if this throws, it throws, and shows up as a real error (logged
// by Next.js's error boundary / server logs) instead of a fake "0 leads".
async function getAllLeads() {
  return prisma.userReport.findMany({
    orderBy: [{ leadScore: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      fullName: true,
      email: true,
      source: true,
      preferredPath: true,
      leadScore: true,
      leadTier: true,
      createdAt: true,
      inputJson: true,
    },
  });
}

function scoreBadgeClass(score: number | null) {
  if ((score ?? 0) >= 75) return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if ((score ?? 0) >= 50) return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-red-200 bg-red-50 text-red-900";
}

function readOccupation(inputJson: unknown): string | null {
  if (!inputJson || typeof inputJson !== "object") return null;
  const occupation = (inputJson as ReadinessInput).occupation;
  return typeof occupation === "string" && occupation.trim() ? occupation : null;
}

type AdminLeadsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ auth?: string }>;
};

export default async function AdminLeadsPage({ params, searchParams }: AdminLeadsPageProps) {
  const { locale } = await params;
  const query = await searchParams;
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    redirect(`/${locale}/admin/leads/access${query.auth ? `?auth=${query.auth}` : ""}`);
  }

  const records = await getAllLeads();

  return (
    <main className="ambient-bg flex-1 py-10">
      <section className="section-shell space-y-6 pt-8">
        <AdminNav locale={locale} />

        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Admin</p>
          <h1 className="text-3xl font-bold">Lead Management</h1>
          <p className="text-sm text-muted-foreground">
            Tüm sistem lead kayıtları (Skor ve Niyet seviyelerine göre) listelenmektedir.
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
                      <th className="px-4 py-3 font-semibold">Lead Score</th>
                      <th className="px-4 py-3 font-semibold">Lead Tier</th>
                      <th className="px-4 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((lead) => (
                      <tr key={lead.id} className="border-b border-border/70 last:border-0">
                        <td className="py-3 pr-4 align-top">
                          <div>
                            <p className="font-semibold">{lead.fullName || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">
                              {lead.createdAt ? new Date(lead.createdAt).toLocaleString() : "-"}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">{lead.email}</td>
                        <td className="px-4 py-3 align-top">{readOccupation(lead.inputJson) || "-"}</td>
                        <td className="px-4 py-3 align-top">{lead.preferredPath || lead.source || "-"}</td>
                        <td className="px-4 py-3 align-top">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${scoreBadgeClass(lead.leadScore)}`}>
                            {lead.leadScore ?? "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top">{lead.leadTier || "-"}</td>
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
