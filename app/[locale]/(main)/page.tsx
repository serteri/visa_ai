import { HomeContent } from "@/components/home-content";
import { getCachedFullCheckUsage, getCachedPdfLeadDownloadStats } from "@/lib/cache/public-read-models";

export default async function Home() {
  const [{ freeRemaining }, { remainingSpots }] = await Promise.all([
    getCachedPdfLeadDownloadStats(),
    getCachedFullCheckUsage(),
  ]);

  return (
    <main className="flex-1 bg-slate-50 pb-16">
      <HomeContent
        initialFreeDownloadsLeft={freeRemaining}
        initialAssessmentSlotsLeft={remainingSpots}
      />
    </main>
  );
}
