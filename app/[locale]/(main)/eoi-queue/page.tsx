"use client";

import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Minus, Snowflake } from "lucide-react";

import { useTranslation } from "@/contexts/language-context";
import {
  EOI_CATEGORIES,
  EOI_CATEGORY_LABEL_KEY,
  MOCK_OCCUPATION_STATS,
  type EoiCategory,
  type EoiTrend,
} from "@/lib/constants/eoi-queue";

function tierBadgeClass(tier: EoiCategory): string {
  switch (tier) {
    case "HEALTHCARE":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "EDUCATION":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "ENGINEERING":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "ICT":
      return "border-cyan-200 bg-cyan-50 text-cyan-700";
    case "TRADES":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "BUSINESS":
      return "border-indigo-200 bg-indigo-50 text-indigo-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function TrendCell({ trend }: { trend: EoiTrend }) {
  const { t } = useTranslation();

  if (trend === "FROZEN") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-600">
        <Snowflake className="h-4 w-4" />
        {t("eoiQueue.trend.frozen", "Frozen")}
      </span>
    );
  }
  if (trend === "UP") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
        <TrendingUp className="h-4 w-4" />
        {t("eoiQueue.trend.up", "Rising")}
      </span>
    );
  }
  if (trend === "DOWN") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600">
        <TrendingDown className="h-4 w-4" />
        {t("eoiQueue.trend.down", "Falling")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500">
      <Minus className="h-4 w-4" />
      {t("eoiQueue.trend.stable", "Stable")}
    </span>
  );
}

export default function EoiQueuePage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "en";
  const { t } = useTranslation();
  const [category, setCategory] = useState<EoiCategory>("ALL");

  const rows = useMemo(
    () => MOCK_OCCUPATION_STATS.filter((row) => category === "ALL" || row.tier === category),
    [category]
  );

  return (
    <main className="ambient-bg flex-1 py-12">
      <section className="section-shell space-y-6">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            {t("nav.eoiQueue", "EOI Queue")}
          </p>
          <h1 className="text-3xl font-bold text-slate-900">{t("eoiQueue.title", "EOI Queue")}</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {t(
              "eoiQueue.subtitle",
              "See how many Expressions of Interest are sitting in the pool for each occupation, the latest 189 cutoff, and whether the trend is improving or worsening."
            )}
          </p>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t(
            "eoiQueue.disclaimer",
            "Beta feature — figures shown are illustrative mock data, not live SkillSelect numbers. Live data is coming soon."
          )}
        </div>

        {/* Category pill filters */}
        <div className="flex flex-wrap gap-2">
          {EOI_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                category === cat
                  ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-700"
              }`}
            >
              {t(EOI_CATEGORY_LABEL_KEY[cat], cat)}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600">
                    {t("eoiQueue.table.occupation", "Occupation")}
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-600">
                    {t("eoiQueue.table.tier", "Category")}
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">
                    {t("eoiQueue.table.pool189", "189 Pool")}
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">
                    {t("eoiQueue.table.pool190", "190 Pool")}
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">
                    {t("eoiQueue.table.cutoff189", "189 Cutoff")}
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-600">
                    {t("eoiQueue.table.trend", "Trend")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                      {t("eoiQueue.noResults", "No occupations found in this category.")}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{row.title}</p>
                        <p className="text-xs text-slate-400">{row.anzscoCode}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${tierBadgeClass(row.tier)}`}
                        >
                          {t(EOI_CATEGORY_LABEL_KEY[row.tier], row.tier)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                        {row.pool189.toLocaleString(locale)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                        {row.pool190.toLocaleString(locale)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                        {row.cutoff189 ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <TrendCell trend={row.trend} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
