# Admin: State nomination (what it does and what to check)

Page: **Admin portal > State nomination** (`/<locale>/admin/crm/states`; sign in with your admin account, the same one as CRM & Agents).
The old `/admin/states` page redirects there.

## What is the source of truth now

The rows you save on this page. Reports, the chat and the page monitor read them (cached for up to 60 s; saving expires the cache at once).
The admin row always wins: there is no date comparison with the code files any more. If the database or the tables are not available, the bundled
seed (the data the rows start from) is used so nothing breaks. `lib/state-nomination/state-rules-config.ts` and
`src/data/state-nomination-status.json` are the seed and the fallback only.

## One-time setup (each step is a production write, so each waits for your go-ahead)

1. Run `prisma/manual-migrations/2026-10-15-create-admin-state-data.sql` in Neon (creates 3 new tables; nothing existing is touched; rollback is in the file header).
2. Review `docs/admin-data-seed-dry-run.md`, or run `npx dotenv-cli -e .env.local -- tsx scripts/seed-admin-data.ts` (dry run, also lists the old admin rows).
3. `npx dotenv-cli -e .env.local -- tsx scripts/seed-admin-data.ts --execute --expect-rows 8`.

Until step 3 the page shows the seed read-only and says so; reports and the chat are unchanged.
