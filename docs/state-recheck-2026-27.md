# State and territory pages: the change monitor

Manual re-checks are replaced by the **state page monitor** (`lib/state-monitor`). Once a week (Vercel cron, Sundays 20:00 UTC = Monday morning in Australia; `vercel.json`) it fetches each official page below, takes the main text, normalises it (markup, spacing and case do not count) and stores a hash and a short snippet. It emails `ADMIN_NOTIFICATION_EMAIL` **only** when a page's content changed (state, URL, what changed) or when a page could not be fetched on 3 runs in a row (one email per page, not one per run). Every run is logged: the run row is written when the run starts and updated when it ends, and pages are fetched concurrently with a per-page timeout inside a 35 s budget (`maxDuration` 60 s); pages the budget did not reach go first on the next run. A failed page is classified in the admin table and the alert: blocked by site (403 / 429), not found (404), network / timeout. It can be run by hand from the admin page (**Admin > State nomination > Run the monitor now**).

**The pages it watches are the ones saved on each state's row** (official page and extra pages, edited in **Admin > State nomination > <state>**). The list below is the bundled seed those rows start from.

**The monitor never changes report data.** Reports show a "data may have changed since <date>" note for a state only when the monitor saw a change that is not applied yet, or when there has been no successful check (or save / Mark verified in the admin page) for 14 days.

## After a change alert

1. Open the page, read what changed.
2. Open **Admin > State nomination > <state>** and update what changed (status, dates, allocations, fees, conditions, exceptions, notes). Saving sets *last verified* and is logged with your name. If the page changed but nothing in our data needs to, press **Mark verified**.
3. Press **Mark applied** for the state in the monitor panel on the States page. Reports, the chat and the monitor read the saved data within a moment; there is no deploy.

One-off setup: `prisma/manual-migrations/2026-10-11-create-state-page-monitor.sql` (the monitor's two tables) and `prisma/manual-migrations/2026-10-15-create-admin-state-data.sql` (the admin data), then `npx tsx scripts/seed-admin-data.ts` (dry run first). The first monitor run stores a baseline (no alert).

## ACT

- State: Australian Capital Territory
- Status in the seed: High Demand (last verified 2026-10-13)
- Monitored pages:
  - https://www.act.gov.au/migration/home
  - https://www.act.gov.au/migration/resources/canberra-matrix-invitation-round
  - https://www.act.gov.au/migration/resources/act-migration-application-fees
  - https://www.act.gov.au/migration/skilled-migrants/190-nomination-criteria
  - https://www.act.gov.au/migration/skilled-migrants/491-nomination-criteria
- Sources recorded for the state:
  - data/knowledge/State Immigrations/ACT/2026-27/ACT Home - updates (fetched 2026-10-13).md
  - data/knowledge/State Immigrations/ACT/2026-27/ACT Canberra Matrix invitation rounds (fetched 2026-10-13).md
  - data/knowledge/State Immigrations/ACT/2026-27/ACT Migration application fees (fetched 2026-10-13).md
  - data/knowledge/State Immigrations/ACT/2026-27/ACT 190 Canberra resident eligibility (fetched 2026-10-13).md
  - data/knowledge/State Immigrations/ACT/2026-27/ACT 491 Canberra resident eligibility (fetched 2026-10-13).md

## NSW

- State: New South Wales
- Status in the seed: Suspended / Closed (last verified 2026-10-13)
- Monitored pages:
  - https://www.nsw.gov.au/visas-and-migration/skilled-visas/skilled-nominated-visa-subclass-190
  - https://www.nsw.gov.au/visas-and-migration/skilled-visas/skilled-work-regional-visa-subclass-491
  - https://www.nsw.gov.au/visas-and-migration/skilled-visas/nsw-skills-lists
- Sources recorded for the state:
  - data/knowledge/State Immigrations/NSW/2026-27/NSW Skilled Nominated visa (subclass 190) (fetched 2026-10-13).md
  - data/knowledge/State Immigrations/NSW/2026-27/NSW Skilled Work Regional visa (subclass 491) (fetched 2026-10-13).md
  - data/knowledge/State Immigrations/NSW/2026-27/NSW Skills Lists (fetched 2026-10-13).md

## NT

- State: Northern Territory
- Status in the seed: Closed with exceptions (last verified 2026-10-13)
- Monitored pages:
  - https://australiasnorthernterritory.com.au/move/migrate-to-work/nt-government-visa-nomination
- Sources recorded for the state:
  - data/knowledge/State Immigrations/NT/2026-27/NT user-confirmed status (checked 2026-10-13).md

## QLD

- State: Queensland
- Status in the seed: Suspended / Closed (last verified 2026-10-13)
- Monitored pages:
  - https://www.migration.qld.gov.au/visa-options/skilled-visas/skilled-workers-living-in-queensland
  - https://www.migration.qld.gov.au/nomination-process/application-process/application-fees
- Sources recorded for the state:
  - data/knowledge/State Immigrations/Queensland/2026-27/QLD Skilled workers living in Queensland (onshore) (fetched 2026-10-13).md
  - data/knowledge/State Immigrations/Queensland/2026-27/QLD Application fees (fetched 2026-10-13).md

## SA

- State: South Australia
- Status in the seed: Suspended / Closed (last verified 2026-10-13)
- Monitored pages:
  - https://migration.sa.gov.au/before-applying/visa-options-and-pathways/skilled-migrants
  - https://migration.sa.gov.au/news
- Sources recorded for the state:
  - data/knowledge/State Immigrations/SA/2026-27/SA News - ROIs closing 2 June 2026 (fetched 2026-10-13).md
  - data/knowledge/State Immigrations/SA/2026-27/SA Skilled Migration (nomination streams and fees) (fetched 2026-10-13).md
  - data/knowledge/State Immigrations/SA/2026-27/SA Skilled Employment in South Australia stream (fetched 2026-10-13).md
  - data/knowledge/State Immigrations/SA/2026-27/SA South Australian Graduates stream (fetched 2026-10-13).md
  - data/knowledge/State Immigrations/SA/2026-27/SA Outer Regional Skilled Employment stream (fetched 2026-10-13).md
  - data/knowledge/State Immigrations/SA/2026-27/SA Offshore stream (fetched 2026-10-13).md

## TAS

- State: Tasmania
- Status in the seed: Open (Onshore only) (last verified 2026-10-13)
- Monitored pages:
  - https://www.migration.tas.gov.au/skilled_migration
- Sources recorded for the state:
  - data/knowledge/State Immigrations/TAS/2026-27/TAS user-confirmed program settings (checked 2026-10-13).md

## VIC

- State: Victoria
- Status in the seed: Suspended / Closed (last verified 2026-10-11)
- Monitored pages:
  - https://liveinmelbourne.vic.gov.au/migrate/skilled-migration-visas
- Sources recorded for the state:
  - Confirmed directly against liveinmelbourne.vic.gov.au (2026-10-11)

## WA

- State: Western Australia
- Status in the seed: Check official page (last verified 2026-10-13)
- Monitored pages:
  - https://migration.wa.gov.au/our-services-support/state-nominated-migration-program
  - https://migration.wa.gov.au/news
- Sources recorded for the state:
  - data/knowledge/State Immigrations/Western Australia/2026-27/WA State Nominated Migration Program (fetched 2026-10-13).md
  - data/knowledge/State Immigrations/Western Australia/2026-27/WA News list (fetched 2026-10-13).md
  - data/knowledge/State Immigrations/Western Australia/Last invited expression of interest - Priority trade occupations - May 2026.pdf
  - data/knowledge/State Immigrations/Western Australia/2025—26 program year — Invitations issued.png

## Also

- `src/data/state-sponsorship.json`: the occupation-level heat-map dataset (its own `updatedAt`); it is not part of the admin data yet.
