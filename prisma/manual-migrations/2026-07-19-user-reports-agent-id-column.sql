-- Critical fix: "user_reports.agent_id" is declared in schema.prisma
-- (UserReport.agentId, the CRM's agent-assignment column -- claimLead,
-- getAgentLeads, getAllAgentMetrics, getUnassignedLeads all filter/group on
-- it) but was missing from the live database, causing every /admin/crm/*
-- and /agent/* page to 500 with a PrismaClientKnownRequestError. This was
-- pre-existing (not something added this session) -- just unmasked now that
-- /admin/crm/dashboard is actually reachable (see the prior /admin/crm 404
-- fix). IF NOT EXISTS keeps this safe to re-run. No FK constraint added,
-- consistent with the app's existing "safe additive column" approach --
-- Prisma doesn't require one at the DB level to run these queries.
ALTER TABLE "user_reports" ADD COLUMN IF NOT EXISTS "agent_id" TEXT;
CREATE INDEX IF NOT EXISTS "user_reports_agent_id_idx" ON "user_reports" ("agent_id");
