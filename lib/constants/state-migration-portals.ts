/**
 * Official state/territory migration portal links for the Admin Data Sync
 * panel's "State & Territory Migration Portals" section
 * (app/[locale]/(main)/admin/data-sync). These are plain outbound links
 * (target="_blank") for an admin to manually check for updates -- there is
 * no scrape/upsert flow behind them, unlike the federal cards backed by
 * lib/constants/scraper-sources.ts + app/api/admin/scrape/route.ts.
 */
export type StateMigrationPortal = {
  code: "NSW" | "VIC" | "QLD" | "SA" | "WA" | "ACT" | "TAS" | "NT";
  name: string;
  url: string;
};

export const STATE_MIGRATION_PORTALS: StateMigrationPortal[] = [
  { code: "NSW", name: "New South Wales", url: "https://www.nsw.gov.au/visas-and-migration" },
  { code: "VIC", name: "Victoria", url: "https://liveinmelbourne.vic.gov.au/" },
  { code: "QLD", name: "Queensland", url: "https://migration.qld.gov.au/" },
  { code: "SA", name: "South Australia", url: "https://www.migration.sa.gov.au/" },
  { code: "WA", name: "Western Australia", url: "https://migration.wa.gov.au/" },
  { code: "ACT", name: "Australian Capital Territory", url: "https://www.act.gov.au/migration" },
  { code: "TAS", name: "Tasmania", url: "https://www.migration.tas.gov.au/" },
  { code: "NT", name: "Northern Territory", url: "https://theterritory.com.au/migrate" },
];
