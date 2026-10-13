/**
 * The official state / territory program pages the change monitor watches, and for each state the source file(s) to replace when a page changes
 * (from docs/state-recheck-2026-27.md / state-rules-config.ts `sourceDocument`). The list was supplied by the project owner on 2026-10-13;
 * the URLs have not been fetched from the build sandbox, so the first monitor runs show which need correcting (a page that fails is reported
 * once after repeated failures).
 */
import { getStateRule } from "@/lib/state-nomination/state-rules-config";

export const STATE_CODES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"] as const;
export type StateCode = (typeof STATE_CODES)[number];

export type MonitoredPage = { state: StateCode; url: string };

export const MONITORED_PAGES: readonly MonitoredPage[] = [
  { state: "ACT", url: "https://www.act.gov.au/migration/skilled-migrants" },
  { state: "ACT", url: "https://www.act.gov.au/migration/home" },
  { state: "NSW", url: "https://www.nsw.gov.au/visas-and-migration/skilled-visas/skilled-nominated-visa-subclass-190" },
  { state: "NSW", url: "https://www.nsw.gov.au/visas-and-migration/skilled-visas/nsw-skills-lists" },
  { state: "NT", url: "https://australiasnorthernterritory.com.au/move/migrate-to-work/nt-government-visa-nomination" },
  { state: "QLD", url: "https://migration.qld.gov.au/program-updates/skilled-program" },
  { state: "QLD", url: "https://migration.qld.gov.au/visa-options/skilled-visas" },
  { state: "SA", url: "https://migration.sa.gov.au/skilled-migrants" },
  { state: "TAS", url: "https://www.migration.tas.gov.au/skilled_migration" },
  { state: "VIC", url: "https://liveinmelbourne.vic.gov.au/migrate/skilled-migration-visas" },
  { state: "WA", url: "https://migration.wa.gov.au/our-services-support/state-nominated-migration-program" },
];

/** The knowledge-base file(s) to replace for a state ("data/knowledge/..."), or a note when the state's source is a web page only. */
export function sourceFilesFor(state: string): string[] {
  const doc = getStateRule(state)?.sourceDocument ?? "";
  const parts = doc.split(";").map((x) => x.trim()).filter(Boolean);
  const files = parts.filter((x) => x.startsWith("data/knowledge/"));
  return files.length > 0 ? files : ["(no file: this state's source is the web page itself; update the state's rule in lib/state-nomination/state-rules-config.ts)"];
}
