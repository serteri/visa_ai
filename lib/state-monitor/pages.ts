/**
 * The official state / territory program pages the change monitor watches, and for each state the source file(s) to replace when a page changes
 * (from docs/state-recheck-2026-27.md / state-rules-config.ts `sourceDocument`). On 2026-10-13 the ACT, NSW, QLD, SA and WA pages below were
 * fetched and read for the 2026-27 refresh (dated snapshots in data/knowledge/State Immigrations/<STATE>/2026-27/). The NT, TAS and VIC pages
 * returned HTTP 403 to that automated fetch, so they are unverified from here (the NT page is the one the project owner checked by hand); the
 * monitor reports a page that keeps failing once after repeated failures.
 */
import { getStateRule } from "@/lib/state-nomination/state-rules-config";

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

/** The knowledge-base file(s) to replace for a state ("data/knowledge/..."), or a note when the state's source is a web page only. */
export function sourceFilesFor(state: string): string[] {
  const doc = getStateRule(state)?.sourceDocument ?? "";
  const parts = doc.split(";").map((x) => x.trim()).filter(Boolean);
  const files = parts.filter((x) => x.startsWith("data/knowledge/"));
  return files.length > 0 ? files : ["(no file: this state's source is the web page itself; update the state's rule in lib/state-nomination/state-rules-config.ts)"];
}
