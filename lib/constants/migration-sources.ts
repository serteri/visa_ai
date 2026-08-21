/**
 * Single source of truth for the Admin Data Sync panel
 * (app/[locale]/(main)/admin/data-sync): every federal + state/territory
 * migration data source, with its real government URL. Previously also
 * carried a `hasAutoScript` flag driving a mock "Run Script & Sync" bot
 * button -- removed along with that button (see app/actions/admin/
 * upload-data.ts's doc comment for why): there is no real scraper, so admins
 * now download the file from these URLs themselves and upload it via the
 * Manual Data Upload form instead of pretending a bot fetched it.
 */
export type MigrationSourceCategory = "Federal" | "State";

export type MigrationSource = {
  id: string;
  name: string;
  category: MigrationSourceCategory;
  url: string;
};

export const MIGRATION_SOURCES: MigrationSource[] = [
  {
    id: "federal-invitation-rounds",
    name: "Federal 189/190 Invitation Rounds",
    category: "Federal",
    url: "https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect/invitation-rounds",
  },
  {
    id: "federal-skillselect-dashboard",
    name: "Federal SkillSelect Dashboard",
    category: "Federal",
    url: "https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect/dashboard",
  },
  {
    id: "wa",
    name: "Western Australia",
    category: "State",
    url: "https://migration.wa.gov.au/our-services-support/state-nominated-migration-program#2025-26-invitation-rounds",
  },
  {
    id: "act",
    name: "ACT (Canberra)",
    category: "State",
    url: "https://www.act.gov.au/migration/skilled-migration/act-skilled-migration-invitation-rounds",
  },
  {
    id: "nsw",
    name: "New South Wales",
    category: "State",
    url: "https://www.nsw.gov.au/visas-and-migration/skilled-visas/latest-news-and-updates",
  },
  {
    id: "vic",
    name: "Victoria",
    category: "State",
    url: "https://liveinmelbourne.vic.gov.au/news-events/news",
  },
  {
    id: "qld",
    name: "Queensland",
    category: "State",
    url: "https://migration.qld.gov.au/latest-news",
  },
  {
    id: "sa",
    name: "South Australia",
    category: "State",
    url: "https://www.migration.sa.gov.au/news",
  },
  {
    id: "tas",
    name: "Tasmania",
    category: "State",
    url: "https://www.migration.tas.gov.au/news",
  },
  {
    id: "nt",
    name: "Northern Territory",
    category: "State",
    url: "https://theterritory.com.au/migrate/migrate-to-the-territory/latest-news",
  },
];

export function getMigrationSource(id: string): MigrationSource | undefined {
  return MIGRATION_SOURCES.find((source) => source.id === id);
}
