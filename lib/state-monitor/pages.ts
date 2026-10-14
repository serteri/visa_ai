/**
 * The official state / territory program pages the change monitor watches, and for each state the source file(s) to replace when a page changes
 * (from docs/state-recheck-2026-27.md / state-rules-config.ts `sourceDocument`). On 2026-10-13 the ACT, NSW, QLD, SA and WA pages below were
 * fetched and read for the 2026-27 refresh (dated snapshots in data/knowledge/State Immigrations/<STATE>/2026-27/). The NT, TAS and VIC pages
 * returned HTTP 403 to that automated fetch, so they are unverified from here (the NT page is the one the project owner checked by hand); the
 * monitor reports a page that keeps failing once after repeated failures.
 */
import { seedStateData } from "@/lib/admin-data/snapshot";
import type { AdminStateData } from "@/lib/admin-data/types";

export const STATE_CODES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"] as const;
export type StateCode = (typeof STATE_CODES)[number];

export type MonitoredPage = { state: StateCode; url: string };

export const MONITORED_PAGES: readonly MonitoredPage[] = [
  { state: "ACT", url: "https://www.act.gov.au/migration/home" },
  { state: "ACT", url: "https://www.act.gov.au/migration/resources/canberra-matrix-invitation-round" },
  { state: "ACT", url: "https://www.act.gov.au/migration/resources/act-migration-application-fees" },
  { state: "ACT", url: "https://www.act.gov.au/migration/skilled-migrants/190-nomination-criteria" },
  { state: "ACT", url: "https://www.act.gov.au/migration/skilled-migrants/491-nomination-criteria" },
  { state: "NSW", url: "https://www.nsw.gov.au/visas-and-migration/skilled-visas/skilled-nominated-visa-subclass-190" },
  { state: "NSW", url: "https://www.nsw.gov.au/visas-and-migration/skilled-visas/skilled-work-regional-visa-subclass-491" },
  { state: "NSW", url: "https://www.nsw.gov.au/visas-and-migration/skilled-visas/nsw-skills-lists" },
  { state: "NT", url: "https://australiasnorthernterritory.com.au/move/migrate-to-work/nt-government-visa-nomination" },
  { state: "QLD", url: "https://www.migration.qld.gov.au/visa-options/skilled-visas/skilled-workers-living-in-queensland" },
  { state: "QLD", url: "https://www.migration.qld.gov.au/nomination-process/application-process/application-fees" },
  { state: "SA", url: "https://migration.sa.gov.au/before-applying/visa-options-and-pathways/skilled-migrants" },
  { state: "SA", url: "https://migration.sa.gov.au/news" },
  { state: "TAS", url: "https://www.migration.tas.gov.au/skilled_migration" },
  { state: "VIC", url: "https://liveinmelbourne.vic.gov.au/migrate/skilled-migration-visas" },
  { state: "WA", url: "https://migration.wa.gov.au/our-services-support/state-nominated-migration-program" },
  { state: "WA", url: "https://migration.wa.gov.au/news" },
];

/**
 * The pages to watch, from the admin's state data (each state's official URL and its extra URLs, edited on the admin page); the static list above
 * when the data holds none.
 */
export function monitoredPagesFrom(data: AdminStateData): MonitoredPage[] {
  const seen = new Set<string>();
  const out: MonitoredPage[] = [];
  for (const code of STATE_CODES) {
    const p = data.programs[code];
    for (const url of [p?.officialUrl, ...(p?.extraUrls ?? [])]) {
      if (!url || seen.has(`${code}|${url}`)) continue;
      seen.add(`${code}|${url}`);
      out.push({ state: code, url });
    }
  }
  return out.length > 0 ? out : [...MONITORED_PAGES];
}

/** The state's sources as the admin recorded them (text), or a pointer to the admin page when none is recorded. */
export function sourceFilesFor(state: string, data: AdminStateData = seedStateData()): string[] {
  const doc = data.rules[state]?.sourceDocument ?? "";
  const parts = doc.split(";").map((x) => x.trim()).filter(Boolean);
  return parts.length > 0 ? parts : ["(no source recorded: add it on the state's admin page)"];
}
