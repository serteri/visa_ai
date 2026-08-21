/**
 * Single source of truth for the Admin Data Sync panel
 * (app/[locale]/(main)/admin/data-sync): every federal + state/territory
 * migration data source, each with its real government URL and whether an
 * automated scrape exists for it (hasAutoScript). Replaces the previous
 * split between lib/constants/scraper-sources.ts (2 federal entries) and
 * lib/constants/state-migration-portals.ts (8 states with different URLs
 * than specified here) -- consolidating avoids two drifting per-source URL
 * lists; this file is now the only one.
 */
export type MigrationSourceCategory = "Federal" | "State";

export type MigrationSource = {
  id: string;
  name: string;
  category: MigrationSourceCategory;
  url: string;
  hasAutoScript: boolean;
};

export const MIGRATION_SOURCES: MigrationSource[] = [
  {
    id: "federal-invitation-rounds",
    name: "Federal Invitation Rounds",
    category: "Federal",
    url: "https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect/invitation-rounds",
    hasAutoScript: true,
  },
  {
    id: "federal-skillselect-dashboard",
    name: "Federal SkillSelect Dashboard",
    category: "Federal",
    url: "https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect/dashboard",
    hasAutoScript: false,
  },
  {
    id: "wa",
    name: "Western Australia",
    category: "State",
    url: "https://migration.wa.gov.au/our-services-support/state-nominated-migration-program#2025-26-invitation-rounds",
    hasAutoScript: true,
  },
  {
    id: "act",
    name: "ACT (Canberra)",
    category: "State",
    url: "https://www.act.gov.au/migration/skilled-migration/act-skilled-migration-invitation-rounds",
    hasAutoScript: true,
  },
  {
    id: "nsw",
    name: "New South Wales",
    category: "State",
    url: "https://www.nsw.gov.au/visas-and-migration/skilled-visas/latest-news-and-updates",
    hasAutoScript: false,
  },
  {
    id: "vic",
    name: "Victoria",
    category: "State",
    url: "https://liveinmelbourne.vic.gov.au/news-events/news",
    hasAutoScript: false,
  },
  {
    id: "qld",
    name: "Queensland",
    category: "State",
    url: "https://migration.qld.gov.au/latest-news",
    hasAutoScript: false,
  },
  {
    id: "sa",
    name: "South Australia",
    category: "State",
    url: "https://www.migration.sa.gov.au/news",
    hasAutoScript: false,
  },
  {
    id: "tas",
    name: "Tasmania",
    category: "State",
    url: "https://www.migration.tas.gov.au/news",
    hasAutoScript: false,
  },
  {
    id: "nt",
    name: "Northern Territory",
    category: "State",
    url: "https://theterritory.com.au/migrate/migrate-to-the-territory/latest-news",
    hasAutoScript: false,
  },
];

export function getMigrationSource(id: string): MigrationSource | undefined {
  return MIGRATION_SOURCES.find((source) => source.id === id);
}
