import { desc, sql } from "drizzle-orm";

import { db } from "@/db";
import { agentReferrals } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function ensureAgentReferralsTable() {
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
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

async function getReferrals() {
  await ensureAgentReferralsTable();

  return db
    .select()
    .from(agentReferrals)
    .orderBy(desc(agentReferrals.created_at));
}

export default async function AdminReferralsPage() {
  const referrals = await getReferrals();

  return (
    <main className="ambient-bg flex-1 py-12">
      <section className="section-shell space-y-6">
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
            {referrals.map((referral) => (
              <Card key={referral.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-lg">{referral.full_name}</CardTitle>
                    <Badge>{referral.status ?? "new"}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
