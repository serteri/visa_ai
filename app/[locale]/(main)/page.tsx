import { HomeContent } from "@/components/home-content";
import { getCachedFullCheckUsage, getCachedPdfLeadDownloadStats } from "@/lib/cache/public-read-models";
import { calculateDisplayedSlots } from "@/lib/countries";

export default async function Home() {
  const [{ freeRemaining }, { remainingSpots, maxFree }] = await Promise.all([
    getCachedPdfLeadDownloadStats(),
    getCachedFullCheckUsage(),
  ]);

  const displayedAssessmentSlots = calculateDisplayedSlots(maxFree, remainingSpots);

  return (
    <main className="flex-1 bg-slate-50 pb-16 dark:bg-zinc-950">
      <HomeContent
        initialFreeDownloadsLeft={freeRemaining}
        initialAssessmentSlotsLeft={displayedAssessmentSlots}
      />
    </main>
  );
}
