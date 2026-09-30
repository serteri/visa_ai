# Database environments

The project uses one Neon Postgres project with two branches.

| Where | Variable | Neon branch |
|---|---|---|
| Local development (`.env`, `.env.local`) | `DATABASE_URL` | **dev** branch |
| Vercel Preview deployments | `DATABASE_URL` | **dev** branch |
| Vercel Production | `DATABASE_URL` | **main** (production) |
| Scripts that must read production | `PROD_DATABASE_URL` | **main**, read-only |
| GitHub Actions (`report-checks.yml`) | `DATABASE_URL` = dummy localhost URL | none (nothing connects) |

**`DATABASE_URL` is never production outside Vercel Production.** Anything you run locally, including
`prisma db push`, the `scripts/add-*.ts` / `apply-migration.ts` migration helpers, the seed scripts and the e2e
checkout test, reads and writes the dev branch. Applying a change to production is a separate, deliberate step:
it needs an explicit go-ahead and must follow the `prisma db push` rules in `CLAUDE.md`.

## Reading production from a script

Set `PROD_DATABASE_URL` in your local `.env.local`. Never commit it, and never set it in Vercel or GitHub
Actions. Prefer a connection string for a **read-only Neon role**, so the database itself refuses writes as well.

Scripts reach production only through `scripts/lib/prod-db.ts`:

- `withProdReadOnly(fn)` connects with `PROD_DATABASE_URL` and runs `fn` inside a single transaction opened with
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

`scripts/smoke-prod-report.ts` also targets production, but only over HTTPS (the live site, Stripe Checkout and the
PDF route). It opens no database connection; see [smoke-prod-report.md](smoke-prod-report.md).

Rows read from production can contain personal data. The scripts print no email addresses, names or report IDs.
`render-persona-pdfs.ts --report` caches the row under `temp_tests/real/`, which is gitignored, and replaces the name
and email before rendering.

## Adding a new production-reading script

1. Import `withProdReadOnly` from `scripts/lib/prod-db.ts`. Do not construct `new PrismaClient()` against
   `DATABASE_URL` for production data.
2. Do all reads inside the callback. No writes, since the transaction rejects them.
3. Add the script to the table above.

## Scripts that write

Scripts that write rows use `DATABASE_URL`, which means the dev branch locally. They must never be pointed at
production without an explicit go-ahead. `scripts/e2e/test-affiliate-checkout-flow.ts` refuses to run when
`DATABASE_URL` has the same host as `PROD_DATABASE_URL`.
