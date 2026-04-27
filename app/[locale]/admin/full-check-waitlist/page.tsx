import { desc, sql } from "drizzle-orm";

import { db } from "@/db";
import { fullCheckWaitlist } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminNav } from "@/app/[locale]/admin/admin-nav";

async function ensureFullCheckWaitlistTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS full_check_waitlist (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL,
      full_name TEXT,
      visa_interest TEXT,
      preferred_language TEXT,
      current_country TEXT,
      main_goal TEXT,
      source TEXT DEFAULT 'full_check',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    ALTER TABLE full_check_waitlist
    ADD COLUMN IF NOT EXISTS full_name TEXT
  `);

  await db.execute(sql`
    ALTER TABLE full_check_waitlist
    ADD COLUMN IF NOT EXISTS visa_interest TEXT
  `);

  await db.execute(sql`
    ALTER TABLE full_check_waitlist
    ADD COLUMN IF NOT EXISTS preferred_language TEXT
  `);

  await db.execute(sql`
    ALTER TABLE full_check_waitlist
    ADD COLUMN IF NOT EXISTS current_country TEXT
  `);

  await db.execute(sql`
    ALTER TABLE full_check_waitlist
    ADD COLUMN IF NOT EXISTS main_goal TEXT
  `);

  await db.execute(sql`
    ALTER TABLE full_check_waitlist
    ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'full_check'
  `);
}

async function getWaitlistLeads() {
  await ensureFullCheckWaitlistTable();

  return db
    .select()
    .from(fullCheckWaitlist)
    .orderBy(desc(fullCheckWaitlist.created_at));
}

const KNOWN_SOURCES = new Set(["homepage", "results", "readiness-preview", "full_check"]);

function normalizeSource(source: string | null): string {
  if (!source) return "unknown";
  return KNOWN_SOURCES.has(source) ? source : "unknown";
}

function sourceLabel(source: string): string {
  if (source === "homepage") return "Homepage";
  if (source === "results") return "Results";
  if (source === "readiness-preview") return "readiness-preview";
  if (source === "full_check") return "full_check";
  return "unknown";
}

type FullCheckWaitlistAdminPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function FullCheckWaitlistAdminPage({
  params,
}: FullCheckWaitlistAdminPageProps) {
  const { locale } = await params;
  const records = await getWaitlistLeads();

  return (
    <main className="ambient-bg flex-1 py-12">
      <section className="section-shell space-y-6">
        <AdminNav locale={locale} />

        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Admin</p>
          <h1 className="text-3xl font-bold">Full Check Waitlist</h1>
          <p className="text-sm text-muted-foreground">Total records: {records.length}</p>
        </div>

        {records.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No full check waitlist records found yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {records.map((record) => {
              const source = normalizeSource(record.source);
              const isReadinessPreview = source === "readiness-preview";

              return (
                <Card
                  key={record.id}
                  className={isReadinessPreview ? "border-primary/50 bg-primary/5" : ""}
                >
                  <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">
                          {record.full_name || record.email}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">{record.email}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={isReadinessPreview ? "default" : "secondary"}>
                          {sourceLabel(source)}
                        </Badge>
                        <Badge variant={isReadinessPreview ? "default" : "outline"}>
                          {isReadinessPreview ? "High intent" : "Standard"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                      <p>
                        <span className="font-semibold">Created:</span>{" "}
                        {record.created_at
                          ? new Date(record.created_at).toLocaleString()
                          : "-"}
                      </p>
                      <p>
                        <span className="font-semibold">Email:</span> {record.email}
                      </p>
                      <p>
                        <span className="font-semibold">Full name:</span>{" "}
                        {record.full_name || "-"}
                      </p>
                      <p>
                        <span className="font-semibold">Visa interest:</span>{" "}
                        {record.visa_interest || "-"}
                      </p>
                      <p>
                        <span className="font-semibold">Preferred language:</span>{" "}
                        {record.preferred_language || "-"}
                      </p>
                      <p>
                        <span className="font-semibold">Current country:</span>{" "}
                        {record.current_country || "-"}
                      </p>
                      <p>
                        <span className="font-semibold">Source:</span> {sourceLabel(source)}
                      </p>
                      <p>
                        <span className="font-semibold">Priority:</span>{" "}
                        {isReadinessPreview ? "High intent" : "Standard"}
                      </p>
                    </div>

                    <div className="rounded-md border border-border/70 bg-background/80 p-4">
                      <p className="mb-2 text-sm font-semibold">Main goal / context</p>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                        {record.main_goal || "-"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
