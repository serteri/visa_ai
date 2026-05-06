"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { StateNominationTracker } from "@/lib/readiness/types";

type StateHeatmapProps = {
  locale: string;
  tracker: StateNominationTracker;
};

function getMatchTone(level: "high" | "medium" | "low") {
  if (level === "high") {
    return {
      card: "border-emerald-300 bg-emerald-50/80",
      badge: "border-emerald-300 bg-emerald-100 text-emerald-900",
      progress: "bg-emerald-500",
    };
  }

  if (level === "medium") {
    return {
      card: "border-amber-300 bg-amber-50/80",
      badge: "border-amber-300 bg-amber-100 text-amber-900",
      progress: "bg-amber-500",
    };
  }

  return {
    card: "border-red-300 bg-red-50/80",
    badge: "border-red-300 bg-red-100 text-red-900",
    progress: "bg-red-500",
  };
}

export function StateHeatmap({ locale, tracker }: StateHeatmapProps) {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const t = (tr: string, en: string, zh: string) => (isTr ? tr : isZh ? zh : en);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {t("Eyalet Nomination Tracker", "State Nomination Tracker", "州担保追踪图")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{tracker.note}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {tracker.topRecommendedStates.length > 0 && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
            <p className="font-semibold text-foreground">
              {t("En guclu 2 eyalet", "Top 2 Recommended States", "前 2 个推荐州")}
            </p>
            <p className="mt-1 text-muted-foreground">
              {tracker.topRecommendedStates.map((item) => `${item.code} (${item.status})`).join(" · ")}
            </p>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          {tracker.states.map((state) => {
            const tone = getMatchTone(state.matchLevel);

            return (
              <div key={state.code} className={`rounded-xl border p-4 shadow-sm ${tone.card}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{state.code} · {state.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{state.summary}</p>
                  </div>
                  <Badge variant="outline" className={tone.badge}>
                    {state.status}
                  </Badge>
                </div>

                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{t("Uyum sinyali", "Match signal", "匹配信号")}</span>
                    <span>{state.score}%</span>
                  </div>
                  <Progress
                    value={state.score}
                    className="h-2 bg-white/80"
                  />
                  <div className={`-mt-2 h-2 rounded-full ${tone.progress}`} style={{ width: `${state.score}%` }} />
                </div>

                {state.requirements.length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {state.requirements.map((item) => (
                      <li key={`${state.code}-${item}`} className="flex gap-2">
                        <span className="text-foreground">-</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}