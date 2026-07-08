import { HomeContent } from "@/components/home-content";
import { getCachedFullCheckUsage, getCachedPdfLeadDownloadStats } from "@/lib/cache/public-read-models";

// Marketing-only "urgency" counter for the hero scarcity banner. This is
// deliberately decoupled from the real backend quota (MAX_FREE_REPORTS,
// currently 20) -- the hard limit enforced by getCachedFullCheckUsage is
// never touched. It starts at 14 and ticks down by 1 per real submission
// (derived from how many of the real 20 slots have already been used), with
// a floor so the banner never reads 0/negative.
const DISPLAY_START_SLOTS = 14;
const MIN_DISPLAY_SLOTS = 2;

export default async function Home() {
  const [{ freeRemaining }, { remainingSpots, maxFree }] = await Promise.all([
    getCachedPdfLeadDownloadStats(),
    getCachedFullCheckUsage(),
  ]);

  const usedSlots = Math.max(0, maxFree - remainingSpots);
  const displayedAssessmentSlots = Math.max(MIN_DISPLAY_SLOTS, DISPLAY_START_SLOTS - usedSlots);

  return (
    <main className="flex-1 bg-slate-50 pb-16">
      <HomeContent
        initialFreeDownloadsLeft={freeRemaining}
        initialAssessmentSlotsLeft={displayedAssessmentSlots}
      />
    </main>
  );
}
