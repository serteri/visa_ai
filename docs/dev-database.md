# Setting up a separate test database with a Neon branch

Status: **steps only, nothing here has been applied.** Today there is one database (production) and the local `DATABASE_URL` points at it (`CLAUDE.md`, `docs/database-environments.md`). Every local write is a production write. This page describes how to get a database you can write to freely.

## Why a branch

A Neon branch is a copy-on-write fork of a project's database. It has its own connection string and its own compute, so writes to the branch never reach the parent. It is created in seconds and can be reset or deleted.

## Decide first: with or without personal data

A normal branch copies the parent's data, including names, emails, phone numbers, IP addresses and report contents. For tests you almost never need that.

- **Preferred: a schema-only branch.** Neon's console and `neonctl` offer a schema-only branch option (check the current Neon documentation for the exact flag in your CLI version). It copies tables and indexes, no rows. Then load the seed data the app already ships: `npm run db:seed` (visa types) and `prisma/seed-rounds.ts`, and use `scripts/seed-test-agent.ts` for a test agent.
- **If you must branch with data:** treat the branch as production data. Restrict who has its connection string, do not point a Vercel Preview at it, and delete it when finished.

## Steps

1. **Install and sign in** (once): `npm i -g neonctl`, then `neonctl auth`. Find the project: `neonctl projects list`.
2. **Create the branch** from the production branch (name it so it cannot be confused with production):
   `neonctl branches create --project-id <project-id> --name dev-test --parent main`
   Use the schema-only option from the section above where available.
3. **Get its connection strings.** `neonctl connection-string dev-test --project-id <project-id> --pooled` (pooled host for the app) and without `--pooled` (direct host for migrations). The host contains the branch's own endpoint id; confirm it differs from the production endpoint before you continue.
4. **Create a role that exists only on the branch** if you want a separate login (Neon console → branch → Roles). The roles of the parent are copied; a dedicated role makes it obvious in logs which database a script used.
5. **Point the local app at the branch, not at production.** In `.env.local` set `DATABASE_URL` to the branch's pooled string. Keep `PROD_DATABASE_URL` for read-only production scripts only, and use a **read-only** production role for it (`.env.example` already recommends this).
6. **Check where you are** before running anything that writes:
   `SELECT current_database(), inet_server_addr();` and compare the endpoint host with the production one. Never rely on the variable name.
7. **Apply the schema.** For a schema-only branch the tables already exist. For a fresh empty branch: the Prisma tables come from `prisma/schema.prisma` and the Drizzle tables from `drizzle/*.sql` (`npm run db:migrate`). `referral_consents` is created by hand: `prisma/manual-migrations/2026-10-10-create-referral-consents.sql`. Follow `CLAUDE.md` before any `prisma db push`: run it without `--accept-data-loss`, read the diff, and stop if it proposes dropping a table Drizzle owns.
8. **Seed:** `npm run db:seed`, `tsx prisma/seed-rounds.ts`, `npm run db:seed-test-agent`.
9. **Run the database-backed tests only against the branch.** Scripts that call `getVisitorContext`, `prisma.*` or Drizzle (for example `test-partner-and-ai-removal`, `test-pdf-route`) use `DATABASE_URL`.
10. **Reset or delete.** `neonctl branches reset dev-test --parent --project-id <project-id>` returns it to the parent's current state; `neonctl branches delete dev-test --project-id <project-id>` removes it. A branch made with data should be deleted once the work is done.

## Vercel

Vercel Preview and Development environments should get their own `DATABASE_URL` (the branch), never the production string. Today the production string is shared by every environment (`CLAUDE.md`); changing that is a Vercel project setting and is not done here.

## What this page does not do

It does not create a branch, change any environment variable, or run any command. It is a checklist for the founder.
