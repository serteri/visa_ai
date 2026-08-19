import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminNav } from "@/app/[locale]/(main)/admin/admin-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { approveAgentLegacy, rejectAgentLegacy } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Agents — Admin | LogiVisa",
    description: "Review and approve B2B agent registrations.",
  };
}

type PageProps = { params: Promise<{ locale: string }> };

// The B2B agent system (registration at /agent/register, User.role="AGENT",
// User.approvalStatus) already exists and is fully functional -- it just
// wasn't reachable from this legacy admin area, only from the role-based
// CRM portal at /admin/crm/agents/pending. This page is a legacy-admin-scoped
// view onto the exact same User rows, not a second agent system: no new
// Prisma model was needed.
function statusBadgeClass(status: string): string {
  if (status === "APPROVED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "REJECTED") return "border-red-200 bg-red-50 text-red-700";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

export default async function AdminAgentsPage({ params }: PageProps) {
  const { locale } = await params;

  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    redirect(`/${locale}/admin/leads/access?callbackUrl=${encodeURIComponent(`/${locale}/admin/agents`)}`);
  }

  const agents = await prisma.user.findMany({
    where: { role: "AGENT" },
    orderBy: [{ approvalStatus: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      email: true,
      companyName: true,
      phone: true,
      approvalStatus: true,
      commissionRate: true,
      createdAt: true,
    },
  });

  const pendingCount = agents.filter((a) => a.approvalStatus === "PENDING").length;

  return (
    <main className="ambient-bg flex-1 py-12">
      <section className="section-shell space-y-6">
        <AdminNav locale={locale} />

        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Admin</p>
          <h1 className="text-3xl font-bold">B2B Agents</h1>
          <p className="text-sm text-muted-foreground">
            {agents.length} agent{agents.length === 1 ? "" : "s"} registered
            {pendingCount > 0 ? ` — ${pendingCount} awaiting approval` : ""}. Self-registered agents
            (/{locale}/agent/register) start Pending until approved here.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>Agents</CardTitle>
              <Badge variant="secondary">Total {agents.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {agents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No agents registered yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="py-3 pr-4 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold">Email</th>
                      <th className="px-4 py-3 font-semibold">Company</th>
                      <th className="px-4 py-3 font-semibold">Phone</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Applied</th>
                      <th className="px-4 py-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map((agent) => (
                      <tr key={agent.id} className="border-b border-border/70 last:border-0">
                        <td className="py-3 pr-4 font-medium align-top">{agent.name || "—"}</td>
                        <td className="px-4 py-3 align-top">{agent.email}</td>
                        <td className="px-4 py-3 align-top">{agent.companyName || "—"}</td>
                        <td className="px-4 py-3 align-top">{agent.phone || "—"}</td>
                        <td className="px-4 py-3 align-top">
                          <Badge className={statusBadgeClass(agent.approvalStatus)} variant="outline">
                            {agent.approvalStatus}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 align-top text-muted-foreground">
                          {agent.createdAt.toLocaleDateString(locale)}
                        </td>
                        <td className="px-4 py-3 align-top text-right">
                          <div className="flex justify-end gap-2">
                            {agent.approvalStatus !== "APPROVED" && (
                              <form action={approveAgentLegacy.bind(null, agent.id)}>
                                <Button type="submit" size="sm">
                                  Approve
                                </Button>
                              </form>
                            )}
                            {agent.approvalStatus !== "REJECTED" && (
                              <form action={rejectAgentLegacy.bind(null, agent.id)}>
                                <Button type="submit" size="sm" variant="outline">
                                  Reject
                                </Button>
                              </form>
                            )}
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
