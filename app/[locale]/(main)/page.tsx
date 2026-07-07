import { HomeContent } from "@/components/home-content";
import { getCachedPdfLeadDownloadStats } from "@/lib/cache/public-read-models";

export default async function Home() {
  const { freeRemaining } = await getCachedPdfLeadDownloadStats();

  return (
    <main className="flex-1 bg-slate-50 pb-16">
      <HomeContent initialFreeDownloadsLeft={freeRemaining} />
    </main>
  );
}
