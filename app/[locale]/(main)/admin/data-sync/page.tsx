import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ExternalLink, Clock } from "lucide-react";

import { AdminNav } from "@/app/[locale]/(main)/admin/admin-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { isMissingRelationError } from "@/lib/db/missing-relation";
import { MIGRATION_SOURCES, type MigrationSource } from "@/lib/constants/migration-sources";
import { ManualUploadForm } from "./ManualUploadForm";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Data Sync — Admin | LogiVisa",
    description: "Upload manually-downloaded invitation-round and quota data for every federal and state source.",
  };
}

type PageProps = { params: Promise<{ locale: string }> };
type ImportLogEntry = { lastRunAt: Date; status: string; message: string | null };

// ScraperSyncLog (see prisma/schema.prisma) is repurposed here as an import
// log -- same table, now tracking manual uploads (app/actions/admin/
// upload-data.ts) instead of the removed mock scraper. May not exist in the
// live database yet; degrades to an empty map ("Never imported" for every
// source) instead of 500ing, same isMissingRelationError pattern used
// throughout this app.
async function getImportLogMap(): Promise<Record<string, ImportLogEntry>> {
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

function SourceCard({ source, log, locale }: { source: MigrationSource; log: ImportLogEntry | undefined; locale: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{source.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
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
          Last Import:{" "}
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

        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700"
        >
          Open Official Page &amp; Check
        </a>
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

  const importLog = await getImportLogMap();
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
            There is no scraper bot. Download the current data from a source&apos;s official page, then upload it
            below to sync the database.
          </p>
        </div>

        <ManualUploadForm />

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Federal Sources</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {federalSources.map((source) => (
              <SourceCard key={source.id} source={source} log={importLog[source.id]} locale={locale} />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">State &amp; Territory Portals</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stateSources.map((source) => (
              <SourceCard key={source.id} source={source} log={importLog[source.id]} locale={locale} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
