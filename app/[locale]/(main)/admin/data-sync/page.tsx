import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ExternalLink, Clock } from "lucide-react";

import { AdminNav } from "@/app/[locale]/(main)/admin/admin-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { isMissingRelationError } from "@/lib/db/missing-relation";
import { MIGRATION_SOURCES, type MigrationSource } from "@/lib/constants/migration-sources";
import { RunScraperButton } from "./RunScraperButton";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Data Sync — Admin | LogiVisa",
    description: "Trigger scrapers and check official pages for every federal and state migration data source.",
  };
}

type PageProps = { params: Promise<{ locale: string }> };
type SyncLogEntry = { lastRunAt: Date; status: string; message: string | null };

// ScraperSyncLog (see prisma/schema.prisma) may not exist in the live
// database yet (until `npx prisma db push` is run). Degrades to an empty
// map (every source shown as "Never synced") instead of 500ing, same
// isMissingRelationError pattern used throughout this app.
async function getSyncLogMap(): Promise<Record<string, SyncLogEntry>> {
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

function SourceCard({ source, log, locale }: { source: MigrationSource; log: SyncLogEntry | undefined; locale: string }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{source.name}</CardTitle>
          {source.hasAutoScript ? (
            <Badge className={statusBadgeClass(log?.status)} variant="outline">
              {log?.status ?? "Never synced"}
            </Badge>
          ) : (
            <Badge className="border-slate-200 bg-slate-50 text-slate-500" variant="outline">
              Manual
            </Badge>
          )}
        </div>
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

        {source.hasAutoScript ? (
          <>
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
          </>
        ) : (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700"
          >
            Open Official Page &amp; Check
          </a>
        )}
      </CardContent>
    </Card>
  );
}

export default async function DataSyncPage({ params }: PageProps) {
  const { locale } = await params;

  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    redirect(`/${locale}/admin/leads/access?callbackUrl=${encodeURIComponent(`/${locale}/admin/data-sync`)}`);
  }

  const syncLog = await getSyncLogMap();
  const federalSources = MIGRATION_SOURCES.filter((source) => source.category === "Federal");
  const stateSources = MIGRATION_SOURCES.filter((source) => source.category === "State");

  return (
    <main className="ambient-bg flex-1 py-12">
      <section className="section-shell space-y-8">
        <AdminNav locale={locale} />

        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Admin</p>
          <h1 className="text-3xl font-bold">Data Sync</h1>
          <p className="text-sm text-muted-foreground">
            Sources with an automated script show Run Script &amp; Sync (mock 2-second scrape for now, writes a
            sample record so the end-to-end flow is verifiable). Sources without one show Open Official Page &amp;
            Check instead, so an admin can go straight to the right page.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Federal &amp; Automated Sources</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {federalSources.map((source) => (
              <SourceCard key={source.id} source={source} log={syncLog[source.id]} locale={locale} />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">State &amp; Territory Portals</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stateSources.map((source) => (
              <SourceCard key={source.id} source={source} log={syncLog[source.id]} locale={locale} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
