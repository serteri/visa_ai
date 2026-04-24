import React from "react";
import { db } from "@/db";
import { visaTypes, visaStructuredData } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

async function getVisas() {
  const visas = await db.select().from(visaTypes);
  
  // Fetch structured data for each visa
  const visasWithData = await Promise.all(
    visas.map(async (visa) => {
      const [structuredData] = await db
        .select()
        .from(visaStructuredData)
        .where(eq(visaStructuredData.visa_type_id, visa.id))
        .limit(1);
      
      return {
        ...visa,
        structured_data: structuredData,
      };
    })
  );

  return visasWithData;
}

function ReviewBadge({ status }: { status: string | null | undefined }) {
  const variant =
    status === "approved"
      ? "default"
      : status === "needs_review"
        ? "secondary"
        : "outline";

  return <Badge variant={variant}>{status || "unknown"}</Badge>;
}

function ExpandableJSON({ data }: { data: unknown }) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-sm font-medium text-primary hover:underline"
      >
        {isOpen ? "▼" : "▶"} View Structured Data
      </button>
      {isOpen && (
        <pre className="overflow-auto rounded bg-muted p-3 text-xs max-h-96">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default async function AdminVisasPage() {
  const visas = await getVisas();

  return (
    <main className="ambient-bg flex-1 py-12">
      <section className="section-shell space-y-6">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Admin
          </p>
          <h1 className="text-3xl font-bold">Visa Database Records</h1>
          <p className="text-sm text-muted-foreground">
            Total records: {visas.length}
          </p>
        </div>

        {visas.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No visa records found. Run <code className="rounded bg-muted px-2 py-1">npm run db:seed</code> to seed data.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {visas.map((visa) => (
              <Card key={visa.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        {visa.visa_name} (Subclass {visa.subclass})
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {visa.category} • ID: {visa.id}
                      </p>
                    </div>
                    <ReviewBadge status={visa.reviewed_status} />
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        Purpose
                      </p>
                      <p className="text-sm">{visa.purpose || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        Stay Period
                      </p>
                      <p className="text-sm">{visa.stay_period || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        Cost
                      </p>
                      <p className="text-sm">{visa.cost || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        Last Checked
                      </p>
                      <p className="text-sm">
                        {visa.last_checked
                          ? new Date(visa.last_checked).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Work Rights
                    </p>
                    <p className="text-sm">{visa.work_rights || "—"}</p>
                  </div>

                  {visa.source_url && (
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        Source
                      </p>
                      <a
                        href={visa.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline break-all"
                      >
                        {visa.source_url}
                      </a>
                    </div>
                  )}

                  {visa.structured_data && (
                    <ExpandableJSON data={visa.structured_data.raw_json} />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
