-- ============================================================================
-- CRM Mini-CRM migration: role-based access + lead→agent assignment
-- ----------------------------------------------------------------------------
-- Additive only. No DROP / ALTER TYPE / column removals. Safe to run more than
-- once (IF NOT EXISTS guards). Prisma-owned tables only (users, user_reports) —
-- this does NOT touch any Drizzle-owned table, so it sidesteps the dual-ORM
-- `prisma db push` footgun documented in CLAUDE.md.
--
-- Apply with:  psql "$DATABASE_URL" -f scripts/sql/2026-07-18-crm-role-agent.sql
-- (or run the two statements via any SQL client).
--
-- After applying, run `npx prisma generate` so Prisma Client picks up the new
-- fields (the schema.prisma changes are already committed).
-- ============================================================================

-- 1. User role for RBAC. Existing rows default to 'USER' (consumers), so no
--    existing consumer loses access. Set specific accounts to 'AGENT'/'ADMIN'
--    afterwards (see scripts/seed-crm-users.ts or the UPDATE examples below).
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'USER';

-- 2. Lead → agent assignment. Nullable FK to users.id; ON DELETE SET NULL so
--    removing an agent returns their leads to the unassigned pool rather than
--    deleting assessment data.
ALTER TABLE "user_reports"
  ADD COLUMN IF NOT EXISTS "agent_id" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_reports_agent_id_fkey'
  ) THEN
    ALTER TABLE "user_reports"
      ADD CONSTRAINT "user_reports_agent_id_fkey"
      FOREIGN KEY ("agent_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Index the FK for the agent dashboard's "my leads" query.
CREATE INDEX IF NOT EXISTS "user_reports_agent_id_idx" ON "user_reports" ("agent_id");

-- ── Optional: promote accounts to roles (edit emails, then uncomment) ────────
-- UPDATE "users" SET "role" = 'ADMIN' WHERE "email" = 'serteri@gmail.com';
-- UPDATE "users" SET "role" = 'AGENT' WHERE "email" = 'agent@example.com';
