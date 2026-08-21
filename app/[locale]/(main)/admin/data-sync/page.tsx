import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ExternalLink, Clock } from "lucide-react";

import { AdminNav } from "@/app/[locale]/(main)/admin/admin-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { isMissingRelationError } from "@/lib/db/missing-relation";
import { SCRAPER_SOURCES } from "@/lib/constants/scraper-sources";
import { RunScraperButton } from "./RunScraperButton";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Data Sync — Admin | LogiVisa",
    description: "Trigger and monitor scrapers for government invitation-round and quota data sources.",
  };
}

type PageProps = { params: Promise<{ locale: string }> };

// ScraperSyncLog (see prisma/schema.prisma) is brand-new -- the table may
// not exist in the live database yet (until `npx prisma db push` is run).
// Degrades to an empty map (every source shown as "Never synced") instead
// of 500ing, same isMissingRelationError pattern used throughout this app.
async function getSyncLogMap(): Promise<Record<string, { lastRunAt: Date; status: string; message: string | null }>> {
  try {
    const rows = await prisma.scraperSyncLog.findMany();
    return Object.fromEntries(
      rows.map((row) => [row.sourceId, { lastRunAt: row.lastRunAt, status: row.status, message: row.message }])
    );
  } catch (error) {
    if (isMissingRelationError(error, "scraper_sync_logs")) return {};
    throw error;
  }
}

function statusBadgeClass(status: string | undefined): string {
  if (status === "success") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "failed") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-500";
}

export default async function DataSyncPage({ params }: PageProps) {
  const { locale } = await params;

  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    redirect(`/${locale}/admin/leads/access?callbackUrl=${encodeURIComponent(`/${locale}/admin/data-sync`)}`);
  }

  const syncLog = await getSyncLogMap();

  return (
    <main className="ambient-bg flex-1 py-12">
      <section className="section-shell space-y-6">
        <AdminNav locale={locale} />

        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Admin</p>
          <h1 className="text-3xl font-bold">Data Sync</h1>
          <p className="text-sm text-muted-foreground">
            Government sources for invitation-round and quota data. No real scraper runs yet -- Run Scraper triggers
            a mock 2-second scrape that writes a sample record so the end-to-end flow can be verified.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SCRAPER_SOURCES.map((source) => {
            const log = syncLog[source.id];
            return (
              <Card key={source.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{source.label}</CardTitle>
                    <Badge className={statusBadgeClass(log?.status)} variant="outline">
                      {log?.status ?? "Never synced"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{source.description}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 break-all text-xs text-indigo-600 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    {source.url}
                  </a>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    Last Sync:{" "}
                    {log?.lastRunAt
                      ? log.lastRunAt.toLocaleString(locale, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Never"}
                  </div>

                  {log?.message && <p className="text-xs text-slate-400">{log.message}</p>}

                  <RunScraperButton sourceId={source.id} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </main>
  );
}
