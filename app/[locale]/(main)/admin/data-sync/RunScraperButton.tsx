"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function RunScraperButton({ sourceId }: { sourceId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceId }),
        });
        const data = (await res.json()) as { ok: boolean; message?: string; error?: string };

        if (!res.ok || !data.ok) {
          toast.error(data.error ?? "Scraping failed");
          return;
        }

        toast.success(data.message ?? "Scraping successful");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Scraping failed");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
    >
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
      {isPending ? "Syncing..." : "Run Script & Sync"}
    </button>
  );
}
