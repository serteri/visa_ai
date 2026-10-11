# State and territory pages: the change monitor and the files to replace

Manual re-checks are replaced by the **state page monitor** (`lib/state-monitor`). Once a week (Vercel cron, Sundays 20:00 UTC = Monday morning in Australia; `vercel.json`) it fetches each official page below, takes the main text, normalises it (markup, spacing and case do not count) and stores a hash and a short snippet. It emails `ADMIN_NOTIFICATION_EMAIL` **only** when a page's content changed (state, URL, what changed, the source file to replace) or when a page could not be fetched on 3 runs in a row (one email per page, not one per run). Every run is logged (`state_monitor_runs`, the admin panel's run log, the server log). It can be run by hand from the admin panel (**Admin > State Nomination Config > Run the monitor now**).

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
- Status in our rules: High Demand (last verified 2026-10-11)
- Monitored pages:
  - https://www.act.gov.au/migration/skilled-migration/act-skilled-migration-invitation-rounds
  - https://www.act.gov.au/migration
- Source file(s) to replace after a change:
  - `data/knowledge/State Immigrations/ACT/ACT Migration.pdf`

## NSW

- State: New South Wales
- Status in our rules: Suspended / Closed (last verified 2026-10-11)
- Monitored pages:
  - https://www.nsw.gov.au/visas-and-migration/skilled-visas/latest-news-and-updates
  - https://www.nsw.gov.au/visas-and-migration
- Source file(s) to replace after a change:
  - `data/knowledge/State Immigrations/NSW/Skilled Nominated visa (Subclass 190)/Skilled Nominated visa (Subclass 190).pdf`
  - `data/knowledge/State Immigrations/NSW/Skilled Work Regional visa (subclass 491)/Skilled Work Regional visa (subclass 491) NSW.pdf`

## NT

- State: Northern Territory
- Status in our rules: Closed (last verified 2026-10-11)
- Monitored pages:
  - https://www.migration.nt.gov.au/
- Source file(s) to replace after a change:
  - `data/knowledge/State Immigrations/NT/NT Government visa nomination.pdf`

## QLD

- State: Queensland
- Status in our rules: Suspended / Closed (last verified 2026-10-11)
- Monitored pages:
  - https://migration.qld.gov.au/
  - https://migration.qld.gov.au/latest-news
- Source file(s) to replace after a change:
  - `data/knowledge/State Immigrations/Queensland/Skilled visa options (Queensland)/Skilled visa options (Queensland).pdf`

## SA

- State: South Australia
- Status in our rules: Open (Onshore & Offshore) (last verified 2026-10-11)
- Monitored pages:
  - https://migration.sa.gov.au/
  - https://migration.sa.gov.au/news
- Source file(s) to replace after a change:
  - `data/knowledge/State Immigrations/SA/State nomination South Australia/State nomination South Australia.pdf`
  - `data/knowledge/State Immigrations/SA/Skilled Nominated Visa (subclass 190)SA/Skilled Nominated Visa (subclass 190)SA.pdf`
  - `data/knowledge/State Immigrations/SA/Skilled Work Regional (Provisional) Visa (subclass 491) SA/Skilled Work Regional (Provisional) Visa (subclass 491) SA.pdf`

## TAS

- State: Tasmania
- Status in our rules: Open (Onshore Only) (last verified 2026-10-11)
- Monitored pages:
  - https://www.migration.tas.gov.au/
  - https://www.migration.tas.gov.au/news
- Source file(s) to replace after a change:
  - `data/knowledge/State Immigrations/TAS/Migration Tasmania-Skilled Migration.pdf`

## VIC

- State: Victoria
- Status in our rules: Suspended / Closed (last verified 2026-10-11)
- Monitored pages:
  - https://liveinmelbourne.vic.gov.au/
  - https://liveinmelbourne.vic.gov.au/news-events/news
- Source file(s) to replace after a change:
  - (no file: this state's source is the web page itself; update the state's rule in lib/state-nomination/state-rules-config.ts)

## WA

- State: Western Australia
- Status in our rules: Open (Onshore & Offshore) (last verified 2026-10-11)
- Monitored pages:
  - https://migration.wa.gov.au/our-services-support/state-nominated-migration-program
  - https://migration.wa.gov.au/
- Source file(s) to replace after a change:
  - `data/knowledge/State Immigrations/Western Australia/State Nominated Migration Program/State Nominated Migration Program Western Australia.pdf`
  - `data/knowledge/State Immigrations/Western Australia/Last invited expression of interest - Priority trade occupations - May 2026.pdf`
  - `data/knowledge/State Immigrations/Western Australia/2025—26 program year — Invitations issued.png`

## Also

- `src/data/state-nomination-status.json` and `src/data/state-sponsorship.json`: the generic dataset beneath the rules (its own `lastVerified` / `updatedAt`).
