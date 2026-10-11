/**
 * The official state / territory program pages the change monitor watches, and for each state the source file(s) to replace when a page changes
 * (from docs/state-recheck-2026-27.md / state-rules-config.ts `sourceDocument`). The URLs are the ones the project already cites; they were NOT
 * reachable from the build sandbox, so the first runs show which need correcting (a page that fails is reported once after repeated failures).
 * VIC's liveinmelbourne.vic.gov.au was confirmed directly on 2026-10-11.
 */
import { getStateRule } from "@/lib/state-nomination/state-rules-config";

export const STATE_CODES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"] as const;
export type StateCode = (typeof STATE_CODES)[number];

export type MonitoredPage = { state: StateCode; url: string };

export const MONITORED_PAGES: readonly MonitoredPage[] = [
  { state: "ACT", url: "https://www.act.gov.au/migration/skilled-migration/act-skilled-migration-invitation-rounds" },
  { state: "ACT", url: "https://www.act.gov.au/migration" },
  { state: "NSW", url: "https://www.nsw.gov.au/visas-and-migration/skilled-visas/latest-news-and-updates" },
  { state: "NSW", url: "https://www.nsw.gov.au/visas-and-migration" },
  { state: "NT", url: "https://www.migration.nt.gov.au/" },
  { state: "QLD", url: "https://migration.qld.gov.au/" },
  { state: "QLD", url: "https://migration.qld.gov.au/latest-news" },
  { state: "SA", url: "https://migration.sa.gov.au/" },
  { state: "SA", url: "https://migration.sa.gov.au/news" },
  { state: "TAS", url: "https://www.migration.tas.gov.au/" },
  { state: "TAS", url: "https://www.migration.tas.gov.au/news" },
  { state: "VIC", url: "https://liveinmelbourne.vic.gov.au/" },
  { state: "VIC", url: "https://liveinmelbourne.vic.gov.au/news-events/news" },
  { state: "WA", url: "https://migration.wa.gov.au/our-services-support/state-nominated-migration-program" },
  { state: "WA", url: "https://migration.wa.gov.au/" },
];

/** The knowledge-base file(s) to replace for a state ("data/knowledge/..."), or a note when the state's source is a web page only. */
export function sourceFilesFor(state: string): string[] {
  const doc = getStateRule(state)?.sourceDocument ?? "";
  const parts = doc.split(";").map((x) => x.trim()).filter(Boolean);
  const files = parts.filter((x) => x.startsWith("data/knowledge/"));
  return files.length > 0 ? files : ["(no file: this state's source is the web page itself; update the state's rule in lib/state-nomination/state-rules-config.ts)"];
}
