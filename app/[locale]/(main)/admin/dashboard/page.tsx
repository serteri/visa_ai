import { count, desc } from "drizzle-orm";
import Link from "next/link";
import { revalidatePath } from "next/cache";

import { AdminNav } from "@/app/[locale]/(main)/admin/admin-nav";
import { db } from "@/db";
import { agentReferrals, agents, fullCheckWaitlist, visaTypes } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

const KNOWN_SOURCES = ["full_check", "results", "readiness-preview", "homepage", "unknown"];

function normalizeSource(source: string | null): string {
  if (!source) return "unknown";
  return KNOWN_SOURCES.includes(source) ? source : "unknown";
}

function sourceLabel(source: string): string {
  if (source === "results") return "Results";
  if (source === "readiness-preview") return "readiness-preview";
  if (source === "homepage") return "Homepage";
  if (source === "full_check") return "full_check";
  return "unknown";
}

async function getDashboardData() {
  const [waitlistTotal] = await db.select({ value: count() }).from(fullCheckWaitlist);
  const [referralTotal] = await db.select({ value: count() }).from(agentReferrals);
  const [agentTotal] = await db.select({ value: count() }).from(agents);
  const [visaTotal] = await db.select({ value: count() }).from(visaTypes);

  const waitlistLeads = await db
    .select()
    .from(fullCheckWaitlist)
    .orderBy(desc(fullCheckWaitlist.created_at));

  const sourceCounts = KNOWN_SOURCES.map((source) => ({
    source,
    count: waitlistLeads.filter((lead) => normalizeSource(lead.source) === source).length,
  }));

  const highIntentLeads = waitlistLeads.filter((lead) => lead.lead_tier === "High intent");
  let latestEoiRound: { createdAt: Date } | null = null;
  try {
    latestEoiRound = await prisma.eoiRound.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
  } catch (error) {
    console.error("Failed to load latest EOI scrape timestamp", error);
  }

  return {
    waitlistTotal: waitlistTotal?.value ?? 0,
    referralTotal: referralTotal?.value ?? 0,
    agentTotal: agentTotal?.value ?? 0,
    visaTotal: visaTotal?.value ?? 0,
    highIntentTotal: highIntentLeads.length,
    sourceCounts,
    recentLeads: waitlistLeads.slice(0, 10),
    highIntentLeads: highIntentLeads.slice(0, 10),
    latestEoiScrapedAt: latestEoiRound?.createdAt ?? null,
  };
}

function formatMinutesAgo(timestamp: Date | null): string {
  if (!timestamp) return "never";
  const diffMs = Date.now() - timestamp.getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"} ago`;
}

type DashboardPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ intent?: string }>;
};

export default async function AdminDashboardPage({ params, searchParams }: DashboardPageProps) {
  const { locale } = await params;
  const query = await searchParams;
  const intentFilter = query.intent === "high" ? "high" : "all";
  const data = await getDashboardData();

  async function refreshEoiRounds() {
    "use server";

    const secret = process.env.CRON_SECRET;
    if (!secret) {
      console.error("CRON_SECRET is missing. Cannot trigger EOI scraper.");
      return;
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    try {
      await fetch(`${baseUrl}/api/cron/scrape-eoi`, {
        method: "GET",
        headers: {
          authorization: `Bearer ${secret}`,
        },
        cache: "no-store",
      });
    } catch (error) {
      console.error("Failed to trigger manual EOI refresh", error);
    }

    revalidatePath(`/${locale}/admin/dashboard`);
    revalidatePath(`/${locale}/tools/invitation-rounds`);
  }

  const metricCards = [
    { label: "Total full-check waitlist leads", value: data.waitlistTotal },
    { label: "High-intent leads", value: data.highIntentTotal },
    { label: "Total agent referrals", value: data.referralTotal },
    { label: "Total agents", value: data.agentTotal },
    { label: "Total visas in database", value: data.visaTotal },
  ];

  const visibleLeads = intentFilter === "high" ? data.highIntentLeads : data.recentLeads;

  return (
    <main className="ambient-bg flex-1 py-12">
      <section className="section-shell space-y-6">
        <AdminNav locale={locale} />

        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Admin</p>
          <h1 className="text-3xl font-bold">Conversion Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Basic funnel visibility for full-check interest and referral operations.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <form action={refreshEoiRounds}>
              <button
                type="submit"
                className="rounded-md border border-primary px-3 py-1.5 text-sm font-medium text-primary transition hover:bg-primary/10"
              >
                Refresh Data
              </button>
            </form>
            <p className="text-xs text-muted-foreground">
              Last scraped: {formatMinutesAgo(data.latestEoiScrapedAt)}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {metricCards.map((metric) => (
            <Card key={metric.label}>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <p className="mt-2 text-3xl font-bold">{metric.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <Card>
            <CardHeader>
              <CardTitle>Leads by source</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.sourceCounts.map((item) => (
                <div
                  key={item.source}
                  className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2 text-sm"
                >
                  <span>{sourceLabel(item.source)}</span>
                  <Badge variant={item.source === "readiness-preview" ? "default" : "secondary"}>
                    {item.count}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>
                  {intentFilter === "high" ? "High-intent leads (latest 10)" : "Recent 10 waitlist leads"}
                </CardTitle>
                <div className="flex gap-2">
                  <Link
                    href={`/${locale}/admin/dashboard?intent=all`}
                    className={`rounded border px-2 py-1 text-xs ${intentFilter === "all" ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
                  >
                    All
                  </Link>
                  <Link
                    href={`/${locale}/admin/dashboard?intent=high`}
                    className={`rounded border px-2 py-1 text-xs ${intentFilter === "high" ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
                  >
                    High intent
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {visibleLeads.length === 0 ? (
                <p className="text-sm text-muted-foreground">No waitlist leads yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1200px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="py-2 pr-3 font-semibold">Created</th>
                        <th className="px-3 py-2 font-semibold">Email</th>
                        <th className="px-3 py-2 font-semibold">Source</th>
                        <th className="px-3 py-2 font-semibold">Lead score</th>
                        <th className="px-3 py-2 font-semibold">Lead tier</th>
                        <th className="px-3 py-2 font-semibold">English test</th>
                        <th className="px-3 py-2 font-semibold">Occupation confirmed</th>
                        <th className="px-3 py-2 font-semibold">Budget range</th>
                        <th className="px-3 py-2 font-semibold">Timeline</th>
                        <th className="px-3 py-2 font-semibold">Priority</th>
                        <th className="px-3 py-2 font-semibold">Visa interest</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleLeads.map((lead) => {
                        const source = normalizeSource(lead.source);
                        const highIntent = lead.lead_tier === "High intent";

                        return (
                          <tr key={lead.id} className="border-b border-border/70 last:border-0">
                            <td className="py-2 pr-3">
                              {lead.created_at ? new Date(lead.created_at).toLocaleString() : "-"}
                            </td>
                            <td className="px-3 py-2">{lead.email}</td>
                            <td className="px-3 py-2">{sourceLabel(source)}</td>
                            <td className="px-3 py-2">{lead.lead_score ?? "-"}</td>
                            <td className="px-3 py-2">{lead.lead_tier ?? "-"}</td>
                            <td className="px-3 py-2">{lead.english_test_taken || "-"}</td>
                            <td className="px-3 py-2">{lead.occupation_confirmed || "-"}</td>
                            <td className="px-3 py-2">{lead.estimated_budget_range || "-"}</td>
                            <td className="px-3 py-2">{lead.timeline || "-"}</td>
                            <td className="px-3 py-2">
                              <Badge variant={highIntent ? "default" : "outline"}>
                                {highIntent ? "High intent" : "Standard"}
                              </Badge>
                            </td>
                            <td className="px-3 py-2">{lead.visa_interest || "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
