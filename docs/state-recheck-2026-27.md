# State and territory pages: the change monitor and the files to replace

Manual re-checks are replaced by the **state page monitor** (`lib/state-monitor`). Once a week (Vercel cron, Sundays 20:00 UTC = Monday morning in Australia; `vercel.json`) it fetches each official page below, takes the main text, normalises it (markup, spacing and case do not count) and stores a hash and a short snippet. It emails `ADMIN_NOTIFICATION_EMAIL` **only** when a page's content changed (state, URL, what changed, the source file to replace) or when a page could not be fetched on 3 runs in a row (one email per page, not one per run). Every run is logged: the run row is written when the run starts and updated when it ends (`state_monitor_runs`, the admin panel's run log shows a run that did not finish), and pages are fetched concurrently with a per-page timeout inside a 35 s budget (`maxDuration` 60 s); pages the budget did not reach go first on the next run. A failed page is classified in the admin table and the alert: blocked by site (403 / 429), not found (404), network / timeout. Requests are browser-like and follow redirects. It can be run by hand from the admin panel (**Admin > State Nomination Config > Run the monitor now**).

**The monitor never changes report data.** Reports show a "data may have changed since <date>" note for a state only when the monitor saw a change that is not applied yet, or when there has been no successful check (or hand verification) for 14 days.

## After a change alert

1. Open the page, read what changed, and replace the source file(s) listed for the state (same file name, so `sourceDocument` stays valid).
2. Update the state's rule in `lib/state-nomination/state-rules-config.ts` (note, keyFacts, `lastVerified`, `sourceDocument`) and `src/data/state-nomination-status.json` / `src/data/state-sponsorship.json` where they carry the same state.
3. Update the live State Nomination Config in the admin panel (it has priority over the rules file, but a rule verified on a later day wins over an older admin row: save the row again after the rule's `lastVerified` date).
4. Deploy, then press **Mark applied** for the state in the admin panel (or leave it: a change older than the rule's `lastVerified` date counts as applied).

One-off setup: run `prisma/manual-migrations/2026-10-11-create-state-page-monitor.sql` in Neon (two new tables). The first run stores a baseline (no alert).

The URLs below are the ones the project already cites; they could not be reached from the build sandbox, so the first runs show which need correcting (the failure alert names them). Correct them in `lib/state-monitor/pages.ts`.

## ACT

- State: Australian Capital Territory
- Status in our rules: High Demand (last verified 2026-10-13)
- Monitored pages:
  - https://www.act.gov.au/migration/home
  - https://www.act.gov.au/migration/resources/canberra-matrix-invitation-round
  - https://www.act.gov.au/migration/resources/act-migration-application-fees
  - https://www.act.gov.au/migration/skilled-migrants/190-nomination-criteria
  - https://www.act.gov.au/migration/skilled-migrants/491-nomination-criteria
- Source file(s) to replace after a change:
  - `data/knowledge/State Immigrations/ACT/2026-27/ACT Home - updates (fetched 2026-10-13).md`
  - `data/knowledge/State Immigrations/ACT/2026-27/ACT Canberra Matrix invitation rounds (fetched 2026-10-13).md`
  - `data/knowledge/State Immigrations/ACT/2026-27/ACT Migration application fees (fetched 2026-10-13).md`
  - `data/knowledge/State Immigrations/ACT/2026-27/ACT 190 Canberra resident eligibility (fetched 2026-10-13).md`
  - `data/knowledge/State Immigrations/ACT/2026-27/ACT 491 Canberra resident eligibility (fetched 2026-10-13).md`

## NSW

- State: New South Wales
- Status in our rules: Suspended / Closed (last verified 2026-10-13)
- Monitored pages:
  - https://www.nsw.gov.au/visas-and-migration/skilled-visas/skilled-nominated-visa-subclass-190
  - https://www.nsw.gov.au/visas-and-migration/skilled-visas/skilled-work-regional-visa-subclass-491
  - https://www.nsw.gov.au/visas-and-migration/skilled-visas/nsw-skills-lists
- Source file(s) to replace after a change:
  - `data/knowledge/State Immigrations/NSW/2026-27/NSW Skilled Nominated visa (subclass 190) (fetched 2026-10-13).md`
  - `data/knowledge/State Immigrations/NSW/2026-27/NSW Skilled Work Regional visa (subclass 491) (fetched 2026-10-13).md`
  - `data/knowledge/State Immigrations/NSW/2026-27/NSW Skills Lists (fetched 2026-10-13).md`

## NT

- State: Northern Territory
- Status in our rules: Suspended / Closed (last verified 2026-10-13)
- Monitored pages:
  - https://australiasnorthernterritory.com.au/move/migrate-to-work/nt-government-visa-nomination
- Source file(s) to replace after a change:
  - `data/knowledge/State Immigrations/NT/2026-27/NT user-confirmed status (checked 2026-10-13).md`
  - `data/knowledge/State Immigrations/NT/NT Government visa nomination.pdf`

## QLD

- State: Queensland
- Status in our rules: Suspended / Closed (last verified 2026-10-13)
- Monitored pages:
  - https://www.migration.qld.gov.au/visa-options/skilled-visas/skilled-workers-living-in-queensland
  - https://www.migration.qld.gov.au/nomination-process/application-process/application-fees
- Source file(s) to replace after a change:
  - `data/knowledge/State Immigrations/Queensland/2026-27/QLD Skilled workers living in Queensland (onshore) (fetched 2026-10-13).md`
  - `data/knowledge/State Immigrations/Queensland/2026-27/QLD Application fees (fetched 2026-10-13).md`

## SA

- State: South Australia
- Status in our rules: Suspended / Closed (last verified 2026-10-13)
- Monitored pages:
  - https://migration.sa.gov.au/before-applying/visa-options-and-pathways/skilled-migrants
  - https://migration.sa.gov.au/news
- Source file(s) to replace after a change:
  - `data/knowledge/State Immigrations/SA/2026-27/SA News - ROIs closing 2 June 2026 (fetched 2026-10-13).md`
  - `data/knowledge/State Immigrations/SA/2026-27/SA Skilled Migration (nomination streams and fees) (fetched 2026-10-13).md`
  - `data/knowledge/State Immigrations/SA/2026-27/SA Skilled Employment in South Australia stream (fetched 2026-10-13).md`
  - `data/knowledge/State Immigrations/SA/2026-27/SA South Australian Graduates stream (fetched 2026-10-13).md`
  - `data/knowledge/State Immigrations/SA/2026-27/SA Outer Regional Skilled Employment stream (fetched 2026-10-13).md`
  - `data/knowledge/State Immigrations/SA/2026-27/SA Offshore stream (fetched 2026-10-13).md`

## TAS

- State: Tasmania
- Status in our rules: Open (Onshore Only) (last verified 2026-10-13)
- Monitored pages:
  - https://www.migration.tas.gov.au/skilled_migration
- Source file(s) to replace after a change:
  - `data/knowledge/State Immigrations/TAS/2026-27/TAS user-confirmed program settings (checked 2026-10-13).md`
  - `data/knowledge/State Immigrations/TAS/Migration Tasmania-Skilled Migration.pdf`

## VIC

- State: Victoria
- Status in our rules: Suspended / Closed (last verified 2026-10-11)
- Monitored pages:
  - https://liveinmelbourne.vic.gov.au/migrate/skilled-migration-visas
- Source file(s) to replace after a change:
  - (no file: this state's source is the web page itself; update the state's rule in lib/state-nomination/state-rules-config.ts)

## WA

- State: Western Australia
- Status in our rules: Check official page (last verified 2026-10-13)
- Monitored pages:
  - https://migration.wa.gov.au/our-services-support/state-nominated-migration-program
  - https://migration.wa.gov.au/news
- Source file(s) to replace after a change:
  - `data/knowledge/State Immigrations/Western Australia/2026-27/WA State Nominated Migration Program (fetched 2026-10-13).md`
  - `data/knowledge/State Immigrations/Western Australia/2026-27/WA News list (fetched 2026-10-13).md`
  - `data/knowledge/State Immigrations/Western Australia/Last invited expression of interest - Priority trade occupations - May 2026.pdf`
  - `data/knowledge/State Immigrations/Western Australia/2025—26 program year — Invitations issued.png`

## Also

- `src/data/state-nomination-status.json` and `src/data/state-sponsorship.json`: the generic dataset beneath the rules (its own `lastVerified` / `updatedAt`).
