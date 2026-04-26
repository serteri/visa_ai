import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { agentReferrals, agents } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { assignReferralToAgent, updateReferralStatus } from "@/app/[locale]/admin/referrals/actions";
import { matchAgents } from "@/lib/agents/match-agents";
import { AdminNav } from "@/app/[locale]/admin/admin-nav";

const STATUS_OPTIONS = ["new", "contacted", "referred", "closed"] as const;

async function ensureAgentReferralsTable() {
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

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS agent_referrals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      country_of_passport TEXT NOT NULL,
      current_country TEXT NOT NULL,
      preferred_language TEXT NOT NULL,
      visa_interest TEXT NOT NULL,
      short_message TEXT NOT NULL,
      consent BOOLEAN NOT NULL,
      status TEXT DEFAULT 'new',
      assigned_agent_id UUID,
      assigned_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    ALTER TABLE agent_referrals
    ADD COLUMN IF NOT EXISTS assigned_agent_id UUID
  `);

  await db.execute(sql`
    ALTER TABLE agent_referrals
    ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP
  `);

  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'agent_referrals_assigned_agent_id_agents_id_fk'
      ) THEN
        ALTER TABLE agent_referrals
        ADD CONSTRAINT agent_referrals_assigned_agent_id_agents_id_fk
        FOREIGN KEY (assigned_agent_id) REFERENCES agents(id);
      END IF;
    END
    $$;
  `);
}

async function getReferrals() {
  await ensureAgentReferralsTable();

  return db
    .select()
    .from(agentReferrals)
    .orderBy(desc(agentReferrals.created_at));
}

type AdminReferralsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminReferralsPage({ params }: AdminReferralsPageProps) {
  const { locale } = await params;
  const referrals = await getReferrals();
  const referralsWithMatches = await Promise.all(
    referrals.map(async (referral) => {
      const matchedAgents = await matchAgents({
        visaInterest: referral.visa_interest,
        preferredLanguage: referral.preferred_language,
        countryOfPassport: referral.country_of_passport,
        currentCountry: referral.current_country,
      });

      const assignedAgent = referral.assigned_agent_id
        ? await db
            .select({
              id: agents.id,
              full_name: agents.full_name,
              business_name: agents.business_name,
              email: agents.email,
              phone: agents.phone,
              marn: agents.marn,
              active: agents.active,
            })
            .from(agents)
            .where(eq(agents.id, referral.assigned_agent_id))
            .limit(1)
        : [];

      return {
        referral,
        matchedAgents: matchedAgents.slice(0, 3),
        assignedAgent: assignedAgent[0] ?? null,
      };
    })
  );

  return (
    <main className="ambient-bg flex-1 py-12">
      <section className="section-shell space-y-6">
        <AdminNav locale={locale} />

        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Admin</p>
          <h1 className="text-3xl font-bold">Agent Referral Leads</h1>
          <p className="text-sm text-muted-foreground">Total records: {referrals.length}</p>
        </div>

        {referrals.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">No referral records found yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {referralsWithMatches.map(({ referral, matchedAgents, assignedAgent }) => (
              <Card key={referral.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-lg">{referral.full_name}</CardTitle>
                    <Badge>{referral.status ?? "new"}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form action={updateReferralStatus} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <input type="hidden" name="referralId" value={referral.id} />
                    <input type="hidden" name="locale" value={locale} />
                    <div className="space-y-1">
                      <label htmlFor={`status-${referral.id}`} className="text-sm font-semibold">
                        Status
                      </label>
                      <select
                        key={`${referral.id}-${referral.status ?? "new"}`}
                        id={`status-${referral.id}`}
                        name="status"
                        defaultValue={referral.status ?? "new"}
                        className="h-10 min-w-[180px] rounded-md border border-border bg-card px-3 text-sm"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="h-10 rounded-md border border-border px-4 text-sm font-medium transition hover:bg-muted"
                    >
                      Update status
                    </button>
                  </form>

                  <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <p>
                      <span className="font-semibold">Created:</span>{" "}
                      {referral.created_at
                        ? new Date(referral.created_at).toLocaleString()
                        : "-"}
                    </p>
                    <p>
                      <span className="font-semibold">Email:</span> {referral.email}
                    </p>
                    <p>
                      <span className="font-semibold">Visa interest:</span> {referral.visa_interest}
                    </p>
                    <p>
                      <span className="font-semibold">Passport country:</span>{" "}
                      {referral.country_of_passport}
                    </p>
                    <p>
                      <span className="font-semibold">Current country:</span> {referral.current_country}
                    </p>
                    <p>
                      <span className="font-semibold">Preferred language:</span>{" "}
                      {referral.preferred_language}
                    </p>
                  </div>

                  <div className="space-y-2 rounded-md border border-border/70 p-3">
                    <p className="text-sm font-semibold">Assigned agent</p>
                    {!assignedAgent ? (
                      <p className="text-sm text-muted-foreground">No agent assigned yet.</p>
                    ) : (
                      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold">{assignedAgent.full_name}</p>
                          <Badge variant={assignedAgent.active ? "default" : "outline"}>
                            {assignedAgent.active ? "active" : "inactive"}
                          </Badge>
                        </div>
                        <p>{assignedAgent.business_name || "-"}</p>
                        <p>
                          <span className="font-semibold">Email:</span> {assignedAgent.email}
                        </p>
                        <p>
                          <span className="font-semibold">Phone:</span> {assignedAgent.phone || "-"}
                        </p>
                        <p>
                          <span className="font-semibold">MARN:</span> {assignedAgent.marn || "-"}
                        </p>
                        <p>
                          <span className="font-semibold">Assigned at:</span>{" "}
                          {referral.assigned_at
                            ? new Date(referral.assigned_at).toLocaleString()
                            : "-"}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 rounded-md border border-border/70 p-3">
                    <p className="text-sm font-semibold">Suggested agents</p>
                    {matchedAgents.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No active matching agents found.</p>
                    ) : (
                      <div className="space-y-2">
                        {matchedAgents.map((agent) => (
                          <div
                            key={agent.agentId}
                            className={`rounded-md border p-3 text-sm ${
                              referral.assigned_agent_id === agent.agentId
                                ? "border-emerald-300 bg-emerald-50"
                                : "border-border/70"
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-semibold">{agent.fullName}</p>
                              <div className="flex items-center gap-2">
                                {referral.assigned_agent_id === agent.agentId && (
                                  <Badge>Assigned</Badge>
                                )}
                                <Badge variant="secondary">Score: {agent.score}</Badge>
                              </div>
                            </div>
                            <p className="text-muted-foreground">{agent.businessName || "-"}</p>
                            <p>
                              <span className="font-semibold">Email:</span> {agent.email}
                            </p>
                            <p>
                              <span className="font-semibold">Phone:</span> {agent.phone || "-"}
                            </p>
                            <p>
                              <span className="font-semibold">MARN:</span> {agent.marn || "-"}
                            </p>
                            <p className="text-muted-foreground">
                              {agent.matchReasons.join(" • ")}
                            </p>
                            <form action={assignReferralToAgent} className="pt-2">
                              <input type="hidden" name="referralId" value={referral.id} />
                              <input type="hidden" name="agentId" value={agent.agentId} />
                              <input type="hidden" name="locale" value={locale} />
                              <button
                                type="submit"
                                className="h-9 rounded-md border border-border px-3 text-sm font-medium transition hover:bg-muted"
                              >
                                Assign to this agent
                              </button>
                            </form>
                          </div>
                        ))}
                      </div>
                    )}
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
