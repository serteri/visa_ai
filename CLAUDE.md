# Database: two ORMs, one database

This project uses **both Prisma** (`prisma/schema.prisma`) **and Drizzle** (`db/schema.ts`) against the same PostgreSQL database. Neither ORM is aware of the other's tables by default.

## Never run `prisma db push --accept-data-loss` blindly

`prisma db push` diffs the live database against `prisma/schema.prisma` and will propose **dropping any table not declared in that file** — including tables Drizzle owns and actively writes to. This already happened once: a routine schema change attempted to drop `agent_referrals` and `pdf_downloads` (both non-empty, Drizzle-managed) before being caught and stopped manually.

**The fix in place:** the four Drizzle-owned tables that exist in the live database are declared in `schema.prisma` as `@@ignore` models (introspected via `prisma db pull`, not hand-written), specifically so Prisma recognizes them and never proposes touching them, while `@@ignore` keeps them out of Prisma Client's generated API:

- `agent_referrals`
- `agents`
- `contact_messages`
- `pdf_downloads`

Drizzle also declares a few tables that don't exist in the live database yet (`full_check_usage`, `full_check_waitlist`, `leads`, `visa_types`, `visa_structured_data`, `source_snapshots`) — application code already handles their absence gracefully (see the `*_table_missing` warnings in server logs), and they're not Prisma's concern since they aren't in the DB to begin with.

**Rules going forward:**
1. Before running `prisma db push`, run it **without** `--accept-data-loss` first and read the output. If it proposes dropping or altering a table you don't recognize as Prisma-owned, stop.
2. If Drizzle adds a new table to the live database, re-run `prisma db pull` to pick it up, then add `@@ignore` to the newly-introspected model (matching the pattern of the four above) before running `db push` again.
3. For small, isolated schema changes to Prisma's own models (adding a column, etc.), prefer a targeted `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` over a full `db push` — it's less likely to touch anything unexpected.
4. `schema.prisma` itself has a matching warning comment at the top — keep both in sync if this list changes.
