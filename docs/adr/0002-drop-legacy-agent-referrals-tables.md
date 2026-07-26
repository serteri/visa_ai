# ADR 0002 — Dropped Legacy `agent_referrals` / `agents` Tables

**Date:** 2026-07-26
**Status:** Done

## What happened

Following ADR 0001's Phase 3 (schema definitions removed from `db/schema.ts`
and `prisma/schema.prisma`, commit `ca6385f`), the live `agent_referrals` and
`agents` tables were dropped from the production database via a direct
`DROP TABLE IF EXISTS` (agent_referrals first, then agents, respecting the
FK between them).

This is a database action, not a code change — there is no corresponding
file diff for the drop itself; this record exists so the action has a
traceable commit.

## Safety steps taken before dropping

1. Exported both tables' full contents to `legacy_referrals_export.json`
   (git-ignored — contains real customer PII: names, emails, phone numbers,
   free-text messages).
2. Verified the export: 2 `agent_referrals` rows, 0 `agents` rows, all 14
   expected columns present.
3. Re-checked live row counts immediately before dropping — still 2 and 0,
   confirming no new submissions arrived between export and drop (the
   Phase 1/2 cleanup had already removed every code path that could write
   to these tables).
4. Ran `DROP TABLE IF EXISTS` directly (not `prisma db push
   --accept-data-loss`, to avoid touching the unrelated, pre-existing
   `user_reports.points_tier_backup`/`report_json_backup` drift noted in
   ADR 0001).
5. Verified post-drop: `information_schema.tables` confirms both tables no
   longer exist, and `prisma db push` (dry-run) shows no new diff beyond the
   same pre-existing `user_reports` backup-column warnings.

## Recovery

If this data is ever needed again, `legacy_referrals_export.json` (kept
outside git per `.gitignore`) has the full contents of both tables as of
2026-07-26.
