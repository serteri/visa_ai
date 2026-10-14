/**
 * Writes docs/state-recheck-2026-27.md: which official state / territory pages the change monitor watches (the pages saved on each state's admin row; the
 * bundled seed here) and what to do after an alert. Read only.
 *
 *   npx tsx scripts/list-state-recheck.ts
 */
import { writeFileSync } from "node:fs";

import { seedStateData } from "../lib/admin-data/snapshot";
import { monitoredPagesFrom, STATE_CODES, sourceFilesFor } from "../lib/state-monitor/pages";

const data = seedStateData();
const pages = monitoredPagesFrom(data);

const lines: string[] = [
  "# State and territory pages: the change monitor",
  "",
  "Manual re-checks are replaced by the **state page monitor** (`lib/state-monitor`). Once a week (Vercel cron, Sundays 20:00 UTC = Monday morning in Australia; `vercel.json`) it fetches each official page below, takes the main text, normalises it (markup, spacing and case do not count) and stores a hash and a short snippet. It emails `ADMIN_NOTIFICATION_EMAIL` **only** when a page's content changed (state, URL, what changed) or when a page could not be fetched on 3 runs in a row (one email per page, not one per run). Every run is logged: the run row is written when the run starts and updated when it ends, and pages are fetched concurrently with a per-page timeout inside a 35 s budget (`maxDuration` 60 s); pages the budget did not reach go first on the next run. A failed page is classified in the admin table and the alert: blocked by site (403 / 429), not found (404), network / timeout. It can be run by hand from the admin page (**Admin > State nomination > Run the monitor now**).",
  "",
  "**The pages it watches are the ones saved on each state's row** (official page and extra pages, edited in **Admin > State nomination > <state>**). The list below is the bundled seed those rows start from.",
  "",
  "**The monitor never changes report data.** Reports show a \"data may have changed since <date>\" note for a state only when the monitor saw a change that is not applied yet, or when there has been no successful check (or save / Mark verified in the admin page) for 14 days.",
  "",
  "## After a change alert",
  "",
  "1. Open the page, read what changed.",
  "2. Open **Admin > State nomination > <state>** and update what changed (status, dates, allocations, fees, conditions, exceptions, notes). Saving sets *last verified* and is logged with your name. If the page changed but nothing in our data needs to, press **Mark verified**.",
  "3. Press **Mark applied** for the state in the monitor panel on the States page. Reports, the chat and the monitor read the saved data within a moment; there is no deploy.",
  "",
  "One-off setup: `prisma/manual-migrations/2026-10-11-create-state-page-monitor.sql` (the monitor's two tables) and `prisma/manual-migrations/2026-10-15-create-admin-state-data.sql` (the admin data), then `npx tsx scripts/seed-admin-data.ts` (dry run first). The first monitor run stores a baseline (no alert).",
  "",
];
for (const code of STATE_CODES) {
  const r = data.rules[code]!;
  lines.push(`## ${code}`, "", `- State: ${r.name}`, `- Status in the seed: ${r.status} (last verified ${r.lastVerified})`, "- Monitored pages:");
  for (const p of pages.filter((x) => x.state === code)) lines.push(`  - ${p.url}`);
  lines.push("- Sources recorded for the state:");
  for (const f of sourceFilesFor(code, data)) lines.push(`  - ${f}`);
  lines.push("");
}
lines.push("## Also", "", "- `src/data/state-sponsorship.json`: the occupation-level heat-map dataset (its own `updatedAt`); it is not part of the admin data yet.", "");
writeFileSync("docs/state-recheck-2026-27.md", lines.join("\n"));
console.log("wrote docs/state-recheck-2026-27.md");
