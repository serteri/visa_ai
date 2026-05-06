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
  WA: {
    path: "M28 34 L86 30 L109 41 L110 61 L120 89 L118 141 L95 171 L66 182 L48 197 L27 193 L18 165 L16 84 L21 55 Z",
    labelX: 70,
    labelY: 108,
  },
  NT: {
    path: "M120 42 L183 42 L188 54 L185 96 L167 101 L121 99 L116 84 L116 54 Z",
    labelX: 151,
    labelY: 73,
  },
  SA: {
    path: "M111 101 L169 101 L182 110 L184 146 L169 162 L133 163 L118 151 L111 128 Z",
    labelX: 148,
    labelY: 132,
  },
  QLD: {
    path: "M188 40 L236 35 L259 48 L270 68 L272 106 L260 133 L236 149 L203 146 L188 126 L188 94 L196 80 L188 58 Z",
    labelX: 231,
    labelY: 90,
  },
  NSW: {
    path: "M186 125 L202 121 L236 123 L252 138 L251 170 L235 183 L208 184 L194 168 L188 147 Z",
    labelX: 221,
    labelY: 151,
  },
  VIC: {
    path: "M189 173 L206 170 L234 172 L242 185 L233 198 L208 203 L192 196 L186 184 Z",
    labelX: 214,
    labelY: 186,
  },
  ACT: { path: "M233 144 C236 141 241 141 243 145 C244 149 241 153 236 153 C232 152 231 148 233 144 Z", labelX: 237, labelY: 148 },
  TAS: { path: "M217 213 L228 209 L238 217 L234 232 L220 235 L212 225 Z", labelX: 225, labelY: 223 },
};

const MAINLAND_OUTLINE =
  "M25 34 L88 29 L113 41 L122 41 L185 41 L189 40 L238 35 L261 49 L272 68 L273 107 L260 135 L252 171 L242 186 L235 199 L208 203 L190 197 L181 161 L132 163 L118 151 L95 171 L66 183 L48 198 L26 194 L17 165 L16 84 L21 55 Z";

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
              <defs>
                <filter id="map-shadow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="rgba(15,23,42,0.12)" />
                </filter>
              </defs>

              <rect x="0" y="0" width="290" height="245" rx="18" fill="rgba(191,219,254,0.15)" />
              <path
                d={MAINLAND_OUTLINE}
                fill="rgba(255,255,255,0.78)"
                stroke="rgba(148,163,184,0.35)"
                strokeWidth="2.2"
                filter="url(#map-shadow)"
              />

              {tracker.states.map((state) => {
                const region = MAP_REGIONS[state.code];
                if (!region) return null;

                const fillColor =
                  state.matchLevel === "high"
                    ? "rgba(16,185,129,0.78)"
                    : state.matchLevel === "medium"
                      ? "rgba(245,158,11,0.76)"
                      : "rgba(239,68,68,0.78)";

                return (
                  <g key={state.code}>
                    <path d={region.path} fill={fillColor} stroke="rgba(15,23,42,0.28)" strokeWidth="1.8" />
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

              <path d="M183 205 C191 210 202 212 214 212" fill="none" stroke="rgba(15,23,42,0.18)" strokeWidth="1.4" strokeDasharray="3 4" />
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