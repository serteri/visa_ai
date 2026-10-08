# Missing production tables

`POST /full-check` logged `leads table missing; skipping lead persistence.` in production: the Drizzle tables in `db/schema.ts`
(`leads`, `full_check_waitlist`, `full_check_usage`, `visa_types`, `visa_structured_data`, `source_snapshots`) were never created.

1. See what is missing (read only, uses `PROD_DATABASE_URL`):

       npx tsx scripts/check-missing-tables.ts

2. Create it (idempotent, one transaction, creates only what is absent; drops and alters nothing). Needs the `vector` extension (Neon: available):

       psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f prisma/manual-migrations/2026-10-08-create-missing-tables.sql

   `DATABASE_URL` is production: run it only when you intend to. The file was run twice against an empty local Postgres (second run no-op).
   Constraints that already exist (or whose rows would violate them) are skipped with a NOTICE, not an error.

3. Re-run step 1: `nothing missing`. Missing COLUMNS on existing tables are not covered by this script.

While the table is missing, every submission logs `[ops-alert] leads_table_missing` (error) and emails the internal address, at most once an hour.

## Update: only 3 tables are missing

Production check: only `full_check_waitlist`, `leads`, `full_check_usage` are missing. Apply `prisma/manual-migrations/2026-10-08-create-3-missing-tables.sql`
(three `CREATE TABLE IF NOT EXISTS`, one transaction, nothing else). Do NOT apply `2026-10-08-create-missing-tables.sql` (all tables, with ALTER TABLE ... ADD CONSTRAINT on live tables).
Read the warning about `MAX_FREE_REPORTS` in the commit/report before creating `full_check_usage`.
