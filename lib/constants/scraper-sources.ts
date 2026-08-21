/**
 * Data sources for the Admin Data Sync panel (app/[locale]/(main)/admin/
 * data-sync). URLs match the ones already used by the fortnightly
 * state-migration sync skeleton (app/api/cron/sync-states/route.ts) where
 * that source overlaps, so this isn't a second, drifting list of the same
 * government pages.
 */
export type ScraperSource = {
  id: string;
  label: string;
  description: string;
  url: string;
};

export const SCRAPER_SOURCES: ScraperSource[] = [
  {
    id: "federal-189-491",
    label: "Federal 189/491 Rounds",
    description: "SkillSelect current EOI invitation round results.",
    url: "https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect/current-eoi-invitation-rounds",
  },
  {
    id: "eoi-dashboard",
    label: "EOI Dashboard",
    description: "SkillSelect Expression of Interest overview.",
    url: "https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect",
  },
  {
    id: "wa-rounds",
    label: "WA Rounds",
    description: "Western Australia skilled migration nomination updates.",
    url: "https://www.migration.wa.gov.au/",
  },
  {
    id: "nsw-rounds",
    label: "NSW Rounds",
    description: "New South Wales skilled visa nomination updates.",
    url: "https://www.nsw.gov.au/migration/skilled-visa-nomination",
  },
  {
    id: "vic-rounds",
    label: "VIC Rounds",
    description: "Victoria skilled and business visa nomination updates.",
    url: "https://www.vic.gov.au/live-victoria-skilled-and-business-visas",
  },
  {
    id: "sa-rounds",
    label: "SA Rounds",
    description: "South Australia skilled migration nomination updates.",
    url: "https://migration.sa.gov.au/",
  },
  {
    id: "qld-rounds",
    label: "QLD Rounds",
    description: "Queensland skilled migration nomination updates.",
    url: "https://migration.qld.gov.au/",
  },
];

export function getScraperSource(id: string): ScraperSource | undefined {
  return SCRAPER_SOURCES.find((source) => source.id === id);
}
