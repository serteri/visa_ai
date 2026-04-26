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
            {records.map((record) => (
              <Card key={record.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        {record.full_name || record.email}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{record.email}</p>
                    </div>
                    <Badge variant="secondary">{record.source || "full_check"}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
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
                      <span className="font-semibold">Source:</span>{" "}
                      {record.source || "full_check"}
                    </p>
                    <p className="sm:col-span-2 lg:col-span-3">
                      <span className="font-semibold">Main goal:</span>{" "}
                      {record.main_goal || "-"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
