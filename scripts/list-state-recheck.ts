/**
 * Writes docs/state-recheck-2026-27.md: which official state / territory pages the change monitor watches (lib/state-monitor/pages.ts), the source files
 * in data/knowledge to replace when one changes, and what to do after an alert. Read only.
 *
 *   npx tsx scripts/list-state-recheck.ts
 */
import { writeFileSync } from "node:fs";
import { getStateRule } from "../lib/state-nomination/state-rules-config";
import { MONITORED_PAGES, STATE_CODES, sourceFilesFor } from "../lib/state-monitor/pages";

const lines: string[] = [
  "# State and territory pages: the change monitor and the files to replace",
  "",
  "Manual re-checks are replaced by the **state page monitor** (`lib/state-monitor`). Once a week (Vercel cron, Sundays 20:00 UTC = Monday morning in Australia; `vercel.json`) it fetches each official page below, takes the main text, normalises it (markup, spacing and case do not count) and stores a hash and a short snippet. It emails `ADMIN_NOTIFICATION_EMAIL` **only** when a page's content changed (state, URL, what changed, the source file to replace) or when a page could not be fetched on 3 runs in a row (one email per page, not one per run). Every run is logged (`state_monitor_runs`, the admin panel's run log, the server log). It can be run by hand from the admin panel (**Admin > State Nomination Config > Run the monitor now**).",
  "",
  "**The monitor never changes report data.** Reports show a \"data may have changed since <date>\" note for a state only when the monitor saw a change that is not applied yet, or when there has been no successful check (or hand verification) for 14 days.",
  "",
  "## After a change alert",
  "",
  "1. Open the page, read what changed, and replace the source file(s) listed for the state (same file name, so `sourceDocument` stays valid).",
  "2. Update the state's rule in `lib/state-nomination/state-rules-config.ts` (note, keyFacts, `lastVerified`, `sourceDocument`) and `src/data/state-nomination-status.json` / `src/data/state-sponsorship.json` where they carry the same state.",
  "3. Update the live State Nomination Config in the admin panel (it has priority over the rules file, but a rule verified on a later day wins over an older admin row: save the row again after the rule's `lastVerified` date).",
  "4. Deploy, then press **Mark applied** for the state in the admin panel (or leave it: a change older than the rule's `lastVerified` date counts as applied).",
  "",
  "One-off setup: run `prisma/manual-migrations/2026-10-11-create-state-page-monitor.sql` in Neon (two new tables). The first run stores a baseline (no alert).",
  "",
  "The URLs below are the ones the project already cites; they could not be reached from the build sandbox, so the first runs show which need correcting (the failure alert names them). Correct them in `lib/state-monitor/pages.ts`.",
  "",
];
for (const code of STATE_CODES) {
  const r = getStateRule(code)!;
  lines.push(`## ${code}`, "", `- State: ${r.name}`, `- Status in our rules: ${r.status} (last verified ${r.lastVerified})`, "- Monitored pages:");
  for (const p of MONITORED_PAGES.filter((x) => x.state === code)) lines.push(`  - ${p.url}`);
  lines.push("- Source file(s) to replace after a change:");
  for (const f of sourceFilesFor(code)) lines.push(f.startsWith("data/knowledge/") ? `  - \`${f}\`` : `  - ${f}`);
  lines.push("");
}
lines.push("## Also", "", "- `src/data/state-nomination-status.json` and `src/data/state-sponsorship.json`: the generic dataset beneath the rules (its own `lastVerified` / `updatedAt`).", "");
writeFileSync("docs/state-recheck-2026-27.md", lines.join("\n"));
console.log("wrote docs/state-recheck-2026-27.md");
