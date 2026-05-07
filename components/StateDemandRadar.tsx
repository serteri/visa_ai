import Link from "next/link";
import { Lock, Radar } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StateNominationState } from "@/lib/readiness/types";

type StateDemandRadarProps = {
  locale: string;
  occupationName: string;
  occupationId: string;
  states: StateNominationState[];
};

const tx = (locale: string, zh: string, tr: string, en: string) =>
  locale === "tr" ? tr : locale === "zh-Hans" ? zh : en;

function getStatusStyle(status: StateNominationState["status"]) {
  if (status === "High Demand") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (status === "Onshore Only") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (status === "Closed") {
    return "border-slate-300 bg-slate-100 text-slate-700";
  }

  return "border-cyan-200 bg-cyan-50 text-cyan-800";
}

export function StateDemandRadar({ locale, occupationName, occupationId, states }: StateDemandRadarProps) {
  const visibleStates = states.slice(0, 3);
  const hiddenStates = states.slice(3);
  const fullCheckHref = `/en/full-check?occupation=${encodeURIComponent(occupationId)}`;

  return (
    <Card className="border-cyan-300/90 bg-gradient-to-br from-white via-cyan-50/50 to-emerald-50/50 shadow-2xl shadow-cyan-900/10">
      <CardHeader className="space-y-2">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">
          <Radar className="size-3.5" />
          State Demand Intelligence
        </div>
        <CardTitle className="text-xl font-extrabold text-slate-900 sm:text-2xl">
          {tx(
            locale,
            `${occupationName} 的州担保需求雷达`,
            `${occupationName} icin Eyalet Sponsorluk Radari`,
            `State Sponsorship Radar for ${occupationName}`
          )}
        </CardTitle>
        <p className="text-sm text-slate-600">
          {tx(
            locale,
            "来自澳大利亚各州和领地的实时需求信号。",
            "Avustralya eyaletleri ve bolgelerinden canli talep sinyalleri.",
            "Live demand signals from Australian states & territories."
          )}
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {visibleStates.map((state) => (
            <div key={state.code} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-extrabold text-slate-900">{state.code}</p>
                <Badge className={`border ${getStatusStyle(state.status)}`}>{state.status}</Badge>
              </div>
              <p className="mt-1 text-xs text-slate-600">{state.name}</p>
              <p className="mt-3 text-xs text-slate-500">{state.summary}</p>
            </div>
          ))}
        </div>

        {hiddenStates.length > 0 && (
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <div className="pointer-events-none select-none blur-md">
              <div className="grid gap-3 sm:grid-cols-3">
                {hiddenStates.map((state) => (
                  <div key={state.code} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-extrabold text-slate-900">{state.code}</p>
                      <Badge className={`border ${getStatusStyle(state.status)}`}>{state.status}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-slate-600">{state.name}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute inset-0 flex items-center justify-center bg-white/55 p-4 backdrop-blur-[2px]">
              <div className="w-full max-w-lg rounded-2xl border border-cyan-200 bg-white p-5 text-center shadow-xl shadow-cyan-900/15 sm:p-6">
                <Lock className="mx-auto size-7 text-cyan-700" />
                <p className="mt-3 text-sm text-slate-600">
                  {tx(
                    locale,
                    `另外 ${hiddenStates.length} 个州信号已锁定。`,
                    `${hiddenStates.length} ek eyalet sinyali kilitli.`,
                    `${hiddenStates.length} more state signals are locked.`
                  )}
                </p>
                <Button asChild size="lg" className="mt-4 h-12 rounded-xl bg-cyan-600 px-7 text-base font-bold hover:bg-cyan-500">
                  <Link href={fullCheckHref}>
                    {tx(
                      locale,
                      "查看完整州匹配报告",
                      "Tam Eyalet Eslesme Raporunu Goster",
                      "Check Your Full State Matching Report"
                    )}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
