import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/rbac";
import { getAgentMetrics, getAgentUser } from "@/lib/crm/leads";
import { tierBadgeClass, tierEmoji } from "@/lib/crm/tiers";

export const metadata: Metadata = {
  title: "Admin · Agent detail · LogiVisa Portal",
  robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ locale: string; id: string }> };

function StatCard({ label, value, tier }: { label: string; value: number; tier?: "Hot" | "Warm" | "Cold" }) {
  return (
    <div
      className={`rounded-xl border px-4 py-5 ${
        tier ? tierBadgeClass(tier) : "border-slate-200 bg-white text-slate-900"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
        {tier ? `${tierEmoji(tier)} ${label}` : label}
      </p>
      <p className="mt-1 text-3xl font-extrabold">{value}</p>
    </div>
  );
}

export default async function AdminAgentDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  await requireRole("ADMIN", locale, `/${locale}/admin/crm/agent/${id}`);

  const agent = await getAgentUser(id);
  if (!agent) notFound();

  const metrics = await getAgentMetrics(id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/${locale}/admin/crm/dashboard`}
          className="text-sm font-medium text-indigo-600 hover:underline"
        >
          ← Back to agents
        </Link>
        <h1 className="mt-1 text-2xl font-bold">{agent.name ?? agent.email}</h1>
        <p className="text-sm text-slate-500">Agent profile &amp; historical performance.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-0.5 rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Name</span>
              <span className="text-sm font-medium">{agent.name ?? "—"}</span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email</span>
              <span className="text-sm font-medium">{agent.email}</span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Agent ID</span>
              <span className="text-sm font-medium break-all">{agent.id}</span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Joined</span>
              <span className="text-sm font-medium">{agent.createdAt.toLocaleDateString(locale)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lead metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total leads" value={metrics.total} />
            <StatCard label="Hot" value={metrics.hot} tier="Hot" />
            <StatCard label="Warm" value={metrics.warm} tier="Warm" />
            <StatCard label="Cold" value={metrics.cold} tier="Cold" />
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Individual lead reports/PDFs are delivered to agents and by email — this admin view
            intentionally shows aggregate metrics only.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
