# Database environments

The project uses a single Neon Postgres database, which is production.

| Where | Variable | Database |
|---|---|---|
| Local development (`.env`, `.env.local`) | `DATABASE_URL` | production |
| Vercel (Production and Preview) | `DATABASE_URL` | production |
| Scripts that read production | `PROD_DATABASE_URL` | production, read-only |
| GitHub Actions (`report-checks.yml`) | `DATABASE_URL` = dummy localhost URL | none (nothing connects) |

**Anything run locally against `DATABASE_URL` reads and writes production.** That includes `prisma db push`, the
`scripts/add-*.ts` / `apply-migration.ts` migration helpers, the seed scripts and the e2e checkout test. Every write
needs an explicit go-ahead first, and schema changes must follow the `prisma db push` rules in `CLAUDE.md`.

## Reading production from a script

Scripts that only need to read production connect through `PROD_DATABASE_URL`, never `DATABASE_URL`, so every read
runs in a transaction the database itself keeps read-only. Set `PROD_DATABASE_URL` in your local `.env.local`
(never commit it). Prefer a connection string for a **read-only Neon role**.

All production reads go through `scripts/lib/prod-db.ts`:

- `withProdReadOnly(fn)` connects with `PROD_DATABASE_URL` and runs `fn` inside one transaction opened with
  `SET TRANSACTION READ ONLY`, so any `INSERT` / `UPDATE` / `DELETE` fails. It then disconnects.
- `requireProdDatabaseUrl()` throws when `PROD_DATABASE_URL` is unset. It never falls back to `DATABASE_URL`.
- `prodDatabaseUrl()` returns the URL or `undefined`. Tests use it to skip production-only checks.

Scripts that read production:

| Script | What it reads | Without `PROD_DATABASE_URL` |
|---|---|---|
| `scripts/audit-unlocked-reports.ts` | unlocked `user_reports` and `transactions` (counts and dates only) | fails with a clear message |
| `scripts/render-persona-pdfs.ts --report <id>` | one `user_reports` row and the live state config | fails with a clear message |
| `scripts/render-persona-pdfs.ts --live-state` | `StateNominationConfig` and `StateIntelligence` | fails with a clear message |
| `scripts/test-result-page-pdf-parity.tsx`, part 2 | stored report `b0d20f74` and the live state config (in memory only) | part 2 prints SKIPPED |

`scripts/report-premium-visitors.ts` is the read-only report of `chat_visitors` rows with `is_premium = true` and their credit
balances (counts and balances only, through `withProdReadOnly`).

`scripts/add-chat-credit-tables.ts` creates the four additive chat-credit tables (`chat_credit_purchases`, `chat_credit_links`,
`chat_restore_tokens`, `chat_restore_requests`) with `CREATE TABLE IF NOT EXISTS`. It writes to production, so it needs an explicit
go-ahead, and it must run before the code that reads those tables is deployed.

`scripts/smoke-prod-report.ts` also targets production, but only over HTTPS (the live site, Stripe Checkout and the
PDF route). It opens no database connection; see [smoke-prod-report.md](smoke-prod-report.md).

Rows read from production can contain personal data. The scripts print no email addresses, names or report IDs.
`render-persona-pdfs.ts --report` caches the row under `temp_tests/real/`, which is gitignored, and replaces the name
and email before rendering.

## Adding a new production-reading script

1. Import `withProdReadOnly` from `scripts/lib/prod-db.ts`. Do not construct `new PrismaClient()` for read-only
   production data.
2. Do all reads inside the callback. No writes, since the transaction rejects them.
3. Add the script to the table above.
