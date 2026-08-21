/**
 * FEDERAL data sources for the Admin Data Sync panel (app/[locale]/(main)/
 * admin/data-sync) -- the "Run Scraper" mock-flow cards at the top of the
 * page. State/territory sources moved to lib/constants/state-migration-
 * portals.ts's STATE_MIGRATION_PORTALS: those are plain "open the official
 * site" links (no scrape/upsert flow), a different card style entirely, so
 * they don't belong in this scraper-source list. This file previously also
 * held 5 states with URLs that didn't match the official links now
 * specified for all 8 -- consolidating on state-migration-portals.ts as the
 * one source of truth avoids two drifting per-state URL lists.
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
];

export function getScraperSource(id: string): ScraperSource | undefined {
  return SCRAPER_SOURCES.find((source) => source.id === id);
}
