import { desc, sql } from "drizzle-orm";

import { db } from "@/db";
import { agents } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createAgent, toggleAgentActive } from "@/app/[locale]/admin/agents/actions";

async function ensureAgentsTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS agents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name TEXT NOT NULL,
      business_name TEXT,
      email TEXT NOT NULL,
      phone TEXT,
      marn TEXT,
      languages JSONB,
      specialties JSONB,
      locations JSONB,
      active BOOLEAN DEFAULT TRUE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

async function getAgents() {
  await ensureAgentsTable();

  return db.select().from(agents).orderBy(desc(agents.created_at));
}

function toStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

type AdminAgentsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminAgentsPage({ params }: AdminAgentsPageProps) {
  const { locale } = await params;
  const records = await getAgents();

  return (
    <main className="ambient-bg flex-1 py-12">
      <section className="section-shell space-y-6">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Admin</p>
          <h1 className="text-3xl font-bold">Registered Agents</h1>
          <p className="text-sm text-muted-foreground">Total records: {records.length}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Add New Agent</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createAgent} className="space-y-4">
              <input type="hidden" name="locale" value={locale} />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="fullName" className="text-sm font-medium">
                    Full name
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    required
                    className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="businessName" className="text-sm font-medium">
                    Business name
                  </label>
                  <input
                    id="businessName"
                    name="businessName"
                    className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="phone" className="text-sm font-medium">
                    Phone
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="marn" className="text-sm font-medium">
                    MARN
                  </label>
                  <input
                    id="marn"
                    name="marn"
                    className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="locations" className="text-sm font-medium">
                    Locations (comma separated)
                  </label>
                  <input
                    id="locations"
                    name="locations"
                    placeholder="Sydney, Melbourne"
                    className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="languages" className="text-sm font-medium">
                    Languages (comma separated)
                  </label>
                  <input
                    id="languages"
                    name="languages"
                    placeholder="English, Turkish"
                    className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="specialties" className="text-sm font-medium">
                    Specialties (comma separated)
                  </label>
                  <input
                    id="specialties"
                    name="specialties"
                    placeholder="skilled migration, student visa"
                    className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label htmlFor="notes" className="text-sm font-medium">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    className="w-full rounded-md border border-border bg-card p-3 text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
              >
                Create agent
              </button>
            </form>
          </CardContent>
        </Card>

        {records.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">No agent records found yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {records.map((agent) => {
              const languages = toStringList(agent.languages);
              const specialties = toStringList(agent.specialties);

              return (
                <Card key={agent.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{agent.full_name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{agent.business_name || "-"}</p>
                      </div>
                      <Badge variant={agent.active ? "default" : "outline"}>
                        {agent.active ? "active" : "inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <form action={toggleAgentActive}>
                      <input type="hidden" name="agentId" value={agent.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="currentActive" value={String(Boolean(agent.active))} />
                      <button
                        type="submit"
                        className="h-10 rounded-md border border-border px-4 text-sm font-medium transition hover:bg-muted"
                      >
                        {agent.active ? "Set inactive" : "Set active"}
                      </button>
                    </form>

                    <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                      <p>
                        <span className="font-semibold">Email:</span> {agent.email}
                      </p>
                      <p>
                        <span className="font-semibold">Phone:</span> {agent.phone || "-"}
                      </p>
                      <p>
                        <span className="font-semibold">MARN:</span> {agent.marn || "-"}
                      </p>
                      <p className="sm:col-span-2 lg:col-span-3">
                        <span className="font-semibold">Languages:</span>{" "}
                        {languages.length > 0 ? languages.join(", ") : "-"}
                      </p>
                      <p className="sm:col-span-2 lg:col-span-3">
                        <span className="font-semibold">Specialties:</span>{" "}
                        {specialties.length > 0 ? specialties.join(", ") : "-"}
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
