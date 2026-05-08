import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export function InlineLeadCta() {
  return (
    <aside className="my-12 overflow-hidden rounded-2xl border border-cyan-200 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-6 text-white shadow-[0_24px_70px_-45px_rgba(15,23,42,0.7)] sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-100">
            <Sparkles className="h-3.5 w-3.5" />
            Free AI readiness check
          </div>
          <p className="text-2xl font-bold leading-9">
            Stop guessing your visa chances. Let LogiVisa AI analyze your profile and find your
            exact PR points.
          </p>
        </div>
        <Button
          asChild
          size="lg"
          className="h-12 shrink-0 rounded-xl bg-cyan-500 px-6 text-base font-bold text-slate-950 shadow-lg shadow-cyan-950/20 hover:bg-cyan-400"
        >
          <Link href="/en/full-check">
            Calculate PR Points (Free)
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </aside>
  );
}
