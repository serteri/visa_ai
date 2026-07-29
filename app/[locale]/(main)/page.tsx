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
    <main className="flex-1 bg-[var(--cf-bg)] pb-16">
      <HomeContent
        initialFreeDownloadsLeft={freeRemaining}
        initialAssessmentSlotsLeft={displayedAssessmentSlots}
      />
    </main>
  );
}
