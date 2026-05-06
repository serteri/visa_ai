"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const MAP_REGIONS: Record<
  string,
  {
    path: string;
    labelX: number;
    labelY: number;
  }
> = {
  WA: { path: "M20 42 L20 145 L112 145 L112 42 Z", labelX: 66, labelY: 96 },
  NT: { path: "M116 42 L184 42 L184 96 L116 96 Z", labelX: 150, labelY: 73 },
  SA: { path: "M116 100 L184 100 L184 145 L116 145 Z", labelX: 150, labelY: 124 },
  QLD: { path: "M188 42 L272 42 L272 118 L220 118 L220 96 L188 96 Z", labelX: 232, labelY: 78 },
  NSW: { path: "M188 122 L252 122 L252 170 L206 170 L188 148 Z", labelX: 222, labelY: 146 },
  VIC: { path: "M190 172 L236 172 L228 198 L198 198 Z", labelX: 214, labelY: 187 },
  ACT: { path: "M232 144 L241 144 L241 153 L232 153 Z", labelX: 236.5, labelY: 149.5 },
  TAS: { path: "M214 212 L232 212 L228 232 L210 232 Z", labelX: 221, labelY: 223 },
};

function getTextTone(level: "high" | "medium" | "low") {
  if (level === "high") return "fill-emerald-950";
  if (level === "medium") return "fill-amber-950";
  return "fill-red-950";
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

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-border/70 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.04),_transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,250,252,0.88))] p-4">
            <div className="mb-4 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-900">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                {t("Yuksek uyum", "High Match", "高匹配")}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-900">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                {t("Kosullu", "Medium / Conditional", "中等 / 条件型")}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-red-900">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                {t("Kapali / zayif", "Low Match / Closed", "低匹配 / 关闭")}
              </span>
            </div>

            <svg viewBox="0 0 290 245" className="w-full">
              {tracker.states.map((state) => {
                const region = MAP_REGIONS[state.code];
                if (!region) return null;

                const tone = getMatchTone(state.matchLevel);
                const fillColor =
                  state.matchLevel === "high"
                    ? "rgba(16,185,129,0.78)"
                    : state.matchLevel === "medium"
                      ? "rgba(245,158,11,0.76)"
                      : "rgba(239,68,68,0.78)";

                return (
                  <g key={state.code}>
                    <path d={region.path} fill={fillColor} stroke="rgba(15,23,42,0.25)" strokeWidth="2" />
                    <text
                      x={region.labelX}
                      y={region.labelY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className={`text-[10px] font-bold ${getTextTone(state.matchLevel)}`}
                    >
                      {state.code}
                    </text>
                    <text
                      x={region.labelX}
                      y={region.labelY + 11}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className={`text-[8px] ${getTextTone(state.matchLevel)}`}
                    >
                      {state.score}%
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="space-y-3">
            {tracker.states.slice(0, 4).map((state) => {
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

                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{t("Uyum sinyali", "Match signal", "匹配信号")}</span>
                      <span>{state.score}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/80">
                      <div
                        className={`h-full rounded-full ${tone.progress}`}
                        style={{ width: `${Math.max(0, Math.min(100, state.score))}%` }}
                      />
                    </div>
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
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {tracker.states.map((state) => {
            const tone = getMatchTone(state.matchLevel);

            return (
              <div key={state.code} className={`rounded-xl border p-3 shadow-sm ${tone.card}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{state.code} · {state.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{state.status}</p>
                  </div>
                  <Badge variant="outline" className={tone.badge}>
                    {state.score}%
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{state.summary}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}