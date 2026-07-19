-- Targeted, additive-only schema sync for prisma/schema.prisma's new
-- Agent CRM workflow fields (UserReport.docStatus/agentNotes/market,
-- User.market). IF NOT EXISTS makes this safe to re-run; no table is
-- touched other than adding these columns, so it cannot drop or alter
-- anything Drizzle owns.
ALTER TABLE "user_reports" ADD COLUMN IF NOT EXISTS "doc_status" TEXT DEFAULT 'New';
ALTER TABLE "user_reports" ADD COLUMN IF NOT EXISTS "agent_notes" TEXT;
ALTER TABLE "user_reports" ADD COLUMN IF NOT EXISTS "market" TEXT DEFAULT 'GLOBAL';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "market" TEXT;
