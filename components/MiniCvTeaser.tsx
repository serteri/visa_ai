"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type MiniCvTeaserProps = {
  occupationId: string;
};

type Phase = "input" | "loading" | "result";

const LOADING_STEPS = [
  "AI analyzing duties...",
  "Matching with ANZSCO database...",
  "Preparing role alignment preview...",
];

export function MiniCvTeaser({ occupationId }: MiniCvTeaserProps) {
  const router = useRouter();
  const [duties, setDuties] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(8);
  const timerRef = useRef<number | null>(null);
  const progressRef = useRef<number | null>(null);

  const loadingText = useMemo(() => LOADING_STEPS[stepIndex] ?? LOADING_STEPS[0], [stepIndex]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (progressRef.current) window.clearInterval(progressRef.current);
    };
  }, []);

  function startFakeAnalysis() {
    if (!duties.trim()) return;

    setPhase("loading");
    setStepIndex(0);
    setProgress(8);

    timerRef.current = window.setInterval(() => {
      setStepIndex((prev) => {
        if (prev >= LOADING_STEPS.length - 1) return prev;
        return prev + 1;
      });
    }, 800);

    progressRef.current = window.setInterval(() => {
      setProgress((prev) => (prev >= 92 ? 92 : prev + 6));
    }, 180);

    window.setTimeout(() => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (progressRef.current) window.clearInterval(progressRef.current);
      setProgress(100);
      setPhase("result");
    }, 2500);
  }

  function handleUnlock() {
    const params = new URLSearchParams();
    params.set("occupation", occupationId);
    if (duties.trim()) params.set("duties", duties.trim());
    router.push(`/en/full-check?${params.toString()}`);
  }

  return (
    <div className="rounded-2xl border border-cyan-200/90 bg-white/95 p-6 shadow-xl shadow-cyan-900/10 sm:p-8">
      {phase === "input" && (
        <div className="space-y-4">
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
            Does your daily work match Australian ANZSCO standards? Test it now.
          </h2>
          <Textarea
            value={duties}
            onChange={(event) => setDuties(event.target.value)}
            placeholder="Briefly describe your daily tasks..."
            className="min-h-36 border-slate-300 text-sm"
          />
          <Button
            onClick={startFakeAnalysis}
            disabled={!duties.trim()}
            size="lg"
            className="h-12 rounded-xl bg-cyan-600 px-7 text-base font-bold hover:bg-cyan-500"
          >
            Run AI Match Test
          </Button>
        </div>
      )}

      {phase === "loading" && (
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
            <Loader2 className="size-4 animate-spin" />
            AI Match in Progress
          </div>
          <p className="text-sm font-medium text-slate-700">{loadingText}</p>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-500">This quick test simulates a full ANZSCO duty matching workflow.</p>
        </div>
      )}

      {phase === "result" && (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
          <div className="pointer-events-none select-none blur-md">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-emerald-100 p-3 text-sm font-semibold text-emerald-700">Matched duty signal: Strong</div>
              <div className="rounded-lg bg-rose-100 p-3 text-sm font-semibold text-rose-700">Missing duty cluster detected</div>
              <div className="rounded-lg bg-amber-100 p-3 text-sm font-semibold text-amber-700">ANZSCO alignment: Partial</div>
            </div>
            <div className="mt-4 h-28 rounded-xl bg-white p-3">
              <div className="mb-2 h-2 w-5/6 rounded bg-emerald-300" />
              <div className="mb-2 h-2 w-2/3 rounded bg-slate-300" />
              <div className="mb-2 h-2 w-3/4 rounded bg-rose-300" />
              <div className="h-2 w-1/2 rounded bg-slate-300" />
            </div>
          </div>

          <div className="absolute inset-0 flex items-center justify-center bg-white/55 p-4 backdrop-blur-[2px]">
            <div className="w-full max-w-xl rounded-2xl border border-cyan-200 bg-white p-5 text-center shadow-2xl shadow-cyan-900/15 sm:p-6">
              <Lock className="mx-auto size-8 text-cyan-700" />
              <p className="mt-3 text-sm text-slate-600">Full duty-by-duty match and PR points insights are locked.</p>
              <Button
                onClick={handleUnlock}
                size="lg"
                className="mt-4 h-14 w-full rounded-xl bg-cyan-600 px-6 text-base font-extrabold hover:bg-cyan-500 sm:text-lg"
              >
                Unlock Full AI Analysis & PR Points (Free)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
