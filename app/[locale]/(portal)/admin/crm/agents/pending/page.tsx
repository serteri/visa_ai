import Link from "next/link";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/rbac";
import { getPendingAgents } from "@/lib/crm/leads";
import { approveAgentAction, rejectAgentAction } from "../../actions";

export const metadata: Metadata = {
  title: "Pending agents · Admin · LogiVisa Portal",
  robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ locale: string }> };

export default async function PendingAgentsPage({ params }: PageProps) {
  const { locale } = await params;
  await requireRole("ADMIN", locale, `/${locale}/admin/crm/agents/pending`);

  const pendingAgents = await getPendingAgents();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Admin</p>
          <h1 className="text-2xl font-bold">Pending agent applications</h1>
          <p className="text-sm text-slate-500">
            {pendingAgents.length} self-registered agent{pendingAgents.length === 1 ? "" : "s"} awaiting review.
          </p>
        </div>
        <Link href={`/${locale}/admin/crm/dashboard`} className="text-sm font-medium text-indigo-600 hover:underline">
          ← All agents
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Awaiting approval</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingAgents.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No pending applications right now.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="py-3 pr-4 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Company</th>
                    <th className="px-4 py-3 font-semibold">Phone</th>
                    <th className="px-4 py-3 font-semibold">Applied</th>
                    <th className="px-4 py-3 font-semibold sr-only">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingAgents.map((agent) => (
                    <tr key={agent.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 pr-4 font-medium">
                        <Link href={`/${locale}/admin/crm/agent/${agent.id}`} className="hover:underline">
                          {agent.name ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{agent.email}</td>
                      <td className="px-4 py-3 text-slate-600">{agent.companyName ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{agent.phone ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-500">{agent.createdAt.toLocaleDateString(locale)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <form action={rejectAgentAction.bind(null, agent.id)}>
                            <Button type="submit" size="sm" variant="outline">
                              Reject
                            </Button>
                          </form>
                          <form action={approveAgentAction.bind(null, agent.id)}>
                            <Button type="submit" size="sm">
                              Approve
                            </Button>
                          </form>
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
    </div>
  );
}
