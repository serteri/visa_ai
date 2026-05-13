"use client";

import { useState, useTransition, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Bell, Loader2, CheckCircle } from "lucide-react";
import { savePointsAlert } from "./actions";
import { useTranslation } from "@/contexts/language-context";

type Round = {
  id: string;
  date: string;
  visaSubclass: string;
  visaName: string;
  invitations: number;
  lowestPoints: number | null;
  poolSize: number | null;
  notes: string | null;
  isEstimated?: boolean;
  source?: string;
};

type OccupationCutoff = {
  occupation: string;
  subclass189: number | null;
  subclass491: number | null;
};

const SUBCLASS_COLOR: Record<string, string> = {
  "189": "#6366f1",
  "190": "#10b981",
  "491": "#f59e0b",
};

const SUBCLASS_BG: Record<string, string> = {
  "189": "bg-indigo-100 text-indigo-700",
  "190": "bg-emerald-100 text-emerald-700",
  "491": "bg-amber-100 text-amber-700",
};

const PAGE_SIZE = 20;

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatPoints(points: number | null): string {
  return typeof points === "number" ? `${points}` : "Varies";
}

function TrendIcon({ trend }: { trend: "up" | "down" | "flat" }) {
  if (trend === "up")
    return <TrendingUp className="h-4 w-4 text-rose-500" />;
  if (trend === "down")
    return <TrendingDown className="h-4 w-4 text-emerald-500" />;
  return <Minus className="h-4 w-4 text-slate-400" />;
}

function SummaryCard({
  subclass,
  visaName,
  latest,
  previous,
}: {
  subclass: string;
  visaName: string;
  latest: Round | undefined;
  previous: Round | undefined;
}) {
  const { t } = useTranslation();
  const hasLatestPoints = typeof latest?.lowestPoints === "number";
  const hasPreviousPoints = typeof previous?.lowestPoints === "number";

  const trend: "up" | "down" | "flat" =
    !hasLatestPoints || !hasPreviousPoints
      ? "flat"
      : (latest?.lowestPoints ?? 0) > (previous?.lowestPoints ?? 0)
      ? "up"
      : (latest?.lowestPoints ?? 0) < (previous?.lowestPoints ?? 0)
      ? "down"
      : "flat";

  const delta =
    hasLatestPoints && hasPreviousPoints
      ? (latest?.lowestPoints ?? 0) - (previous?.lowestPoints ?? 0)
      : 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${SUBCLASS_BG[subclass]}`}
          >
            {t("ir.subclassLabel")} {subclass}
          </span>
          <p className="mt-1.5 text-xs text-slate-500">{visaName}</p>
        </div>
        <TrendIcon trend={trend} />
      </div>
      {latest ? (
        <>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {typeof latest.lowestPoints === "number" ? latest.lowestPoints : t("ir.varied", "Varied")}
            <span className="ml-1 text-base font-normal text-slate-500">{t("ir.pts")}</span>
          </p>
          <p className="mt-0.5 text-xs text-slate-400">{formatDate(latest.date)}</p>
          {delta !== 0 && (
            <p
              className={`mt-1 text-xs font-medium ${
                delta > 0 ? "text-rose-500" : "text-emerald-600"
              }`}
            >
              {delta > 0 ? "+" : ""}
              {delta} {t("ir.vsPreviousRound")}
            </p>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm text-slate-400">{t("ir.noData")}</p>
      )}
    </div>
  );
}

type TooltipProps = {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; payload: { invitations: number } }>;
  label?: string;
};

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg text-xs">
      <p className="mb-1.5 font-semibold text-slate-700">
        {label ? formatDate(label) : ""}
      </p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: entry.color }}
          />
          <span className="text-slate-600">
            {entry.name}: <strong>{entry.value} pts</strong>
          </span>
        </div>
      ))}
    </div>
  );
}

export function InvitationRoundsClient({
  rounds,
  occupationPoints,
}: {
  rounds: Round[];
  occupationPoints: OccupationCutoff[];
}) {
  const { t } = useTranslation();
  const [subclassFilter, setSubclassFilter] = useState<"all" | "189" | "190" | "491">("all");
  const [yearFilter, setYearFilter] = useState<"all" | "2023" | "2024" | "2025">("all");
  const [page, setPage] = useState(1);
  const [occupationSearch, setOccupationSearch] = useState("");

  // Alert form
  const [alertEmail, setAlertEmail] = useState("");
  const [alertPoints, setAlertPoints] = useState("");
  const [alertSubclass, setAlertSubclass] = useState("189");
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Summary cards — always use full dataset
  const bySubclass = (sc: string) =>
    rounds.filter((r) => r.visaSubclass === sc).sort((a, b) => b.date.localeCompare(a.date));

  const latest189 = bySubclass("189")[0];
  const prev189 = bySubclass("189")[1];
  const latest190 = bySubclass("190")[0];
  const prev190 = bySubclass("190")[1];
  const latest491 = bySubclass("491")[0];
  const prev491 = bySubclass("491")[1];

  // Filtered rounds for table + chart
  const filtered = useMemo(() => {
    return rounds.filter((r) => {
      if (subclassFilter !== "all" && r.visaSubclass !== subclassFilter) return false;
      if (yearFilter !== "all" && !r.date.startsWith(yearFilter)) return false;
      return true;
    });
  }, [rounds, subclassFilter, yearFilter]);

  // Chart data: one entry per unique date, with each subclass as a key
  const chartData = useMemo(() => {
    const dates = Array.from(new Set(filtered.map((r) => r.date))).sort();
    return dates.map((date) => {
      const entry: Record<string, string | number> = { date };
      filtered
        .filter((r) => r.date === date)
        .forEach((r) => {
          if (typeof r.lowestPoints === "number") {
            entry[r.visaSubclass] = r.lowestPoints;
          }
        });
      return entry;
    });
  }, [filtered]);

  const filteredOccupationPoints = useMemo(() => {
    const search = occupationSearch.trim().toLowerCase();
    if (!search) return occupationPoints;
    return occupationPoints.filter((row) => row.occupation.toLowerCase().includes(search));
  }, [occupationPoints, occupationSearch]);

  const activeSubclasses = useMemo(() => {
    if (subclassFilter !== "all") return [subclassFilter];
    return Array.from(new Set(filtered.map((r) => r.visaSubclass))).sort();
  }, [filtered, subclassFilter]);

  const sortedFiltered = useMemo(
    () => [...filtered].sort((a, b) => b.date.localeCompare(a.date)),
    [filtered]
  );

  const shown = sortedFiltered.slice(0, page * PAGE_SIZE);
  const hasMore = shown.length < sortedFiltered.length;

  function handleAlert(e: React.FormEvent) {
    e.preventDefault();
    setAlertMsg(null);
    setAlertError(null);
    startTransition(async () => {
      const result = await savePointsAlert(alertEmail, Number(alertPoints), alertSubclass);
      if (result.success) {
        setAlertMsg(result.message);
        setAlertEmail("");
        setAlertPoints("");
      } else {
        setAlertError(result.error);
      }
    });
  }

  return (
    <div className="space-y-8 pt-20">
      <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        {t("ir.infoBanner", "ℹ️ Subclass 190 and 491 (State Nominated) are NOT included in these rounds — states nominate independently throughout the month.")}
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard subclass="189" visaName="Skilled Independent" latest={latest189} previous={prev189} />
        <SummaryCard subclass="190" visaName="Skilled Nominated" latest={latest190} previous={prev190} />
        <SummaryCard subclass="491" visaName="Skilled Work Regional" latest={latest491} previous={prev491} />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {(["all", "189", "190", "491"] as const).map((sc) => (
            <button
              key={sc}
              type="button"
              onClick={() => { setSubclassFilter(sc); setPage(1); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                subclassFilter === sc
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {sc === "all" ? t("ir.allSubclasses", "All Subclasses") : `${t("ir.subclass", "Subclass")} ${sc}`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {(["all", "2023", "2024", "2025"] as const).map((yr) => (
            <button
              key={yr}
              type="button"
              onClick={() => { setYearFilter(yr); setPage(1); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                yearFilter === yr
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {yr === "all" ? t("ir.allYears", "All Years") : yr}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-800">{t("ir.pointsCutoffTrend", "Points Cutoff Trend")}</h2>
        {chartData.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-slate-400">
            {t("ir.noDataSelectedFilters", "No data for the selected filters")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div style={{ minWidth: 480 }}>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickFormatter={(d) =>
                      new Date(d).toLocaleDateString("en-AU", { month: "short", year: "2-digit" })
                    }
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    domain={["auto", "auto"]}
                    tickCount={6}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    formatter={(value) => (
                      <span className="text-xs text-slate-600">Subclass {value}</span>
                    )}
                  />
                  {activeSubclasses.map((sc) => (
                    <Line
                      key={sc}
                      type="monotone"
                      dataKey={sc}
                      name={sc}
                      stroke={SUBCLASS_COLOR[sc]}
                      strokeWidth={2}
                      dot={{ r: 3, fill: SUBCLASS_COLOR[sc] }}
                      activeDot={{ r: 5 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-800">{t("ir.invitationRounds", "Invitation Rounds")}</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            {sortedFiltered.length} {t("ir.rounds", "rounds")} — {t("ir.showing", "showing")} {shown.length}
          </p>
        </div>
        {sortedFiltered.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            {t("ir.noRoundsMatch", "No rounds match the selected filters")}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-400">
                    <th className="px-4 py-3 text-left">{t("ir.date", "Date")}</th>
                    <th className="px-4 py-3 text-left">{t("ir.visa", "Visa")}</th>
                    <th className="px-4 py-3 text-right">{t("ir.lowestPoints", "Lowest Points")}</th>
                    <th className="px-4 py-3 text-right">{t("ir.invitations", "Invitations")}</th>
                    <th className="px-4 py-3 text-right">{t("ir.poolSize", "Pool Size")}</th>
                    <th className="px-4 py-3 text-left">{t("ir.notes", "Notes")}</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r, i) => (
                    <tr
                      key={r.id}
                      className={`border-b border-slate-50 transition hover:bg-slate-50 ${
                        i % 2 === 1 ? "bg-white" : "bg-slate-50/30"
                      }`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {formatDate(r.date)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${SUBCLASS_BG[r.visaSubclass]}`}
                        >
                          {r.visaSubclass}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">
                        {typeof r.lowestPoints === "number" ? r.lowestPoints : t("ir.varies", "Varies")}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {r.invitations.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500">
                        {typeof r.poolSize === "number" ? r.poolSize.toLocaleString() : "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {r.notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hasMore && (
              <div className="border-t border-slate-100 px-5 py-4 text-center">
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  {t("ir.loadMore", "Load more")}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Occupation cutoff table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-800">{t("ir.pointsByOccupation", "Points by Occupation")}</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            {t("ir.sourceDohaRound", "Source: DoHA — Round of 13 November 2025")}
          </p>
          <div className="mt-3">
            <input
              type="text"
              value={occupationSearch}
              onChange={(e) => setOccupationSearch(e.target.value)}
              placeholder={t("ir.searchOccupationName", "Search occupation name")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-400">
                <th className="px-4 py-3 text-left">{t("ir.occupation", "Occupation")}</th>
                <th className="px-4 py-3 text-right">{t("ir.subclass189MinPoints", "Subclass 189 Min Points")}</th>
                <th className="px-4 py-3 text-right">{t("ir.subclass491MinPoints", "Subclass 491 Min Points")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredOccupationPoints.map((row, i) => (
                <tr
                  key={row.occupation}
                  className={`border-b border-slate-50 ${i % 2 === 1 ? "bg-white" : "bg-slate-50/30"}`}
                >
                  <td className="px-4 py-3 text-slate-700">{row.occupation}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">
                    {row.subclass189 ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">
                    {row.subclass491 ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alert section */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-indigo-100 p-2.5">
            <Bell className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-slate-900">{t("ir.notifyTitle", "Get notified when points drop")}</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {t("ir.notifySubtitle", "We'll email you as soon as the cutoff falls to your target or below.")}
            </p>
          </div>
        </div>

        {alertMsg ? (
          <div className="mt-5 flex items-start gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <p className="text-sm text-emerald-700">{alertMsg}</p>
          </div>
        ) : (
          <form onSubmit={handleAlert} className="mt-5 grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">{t("ir.email", "Email")}</label>
              <input
                type="email"
                required
                value={alertEmail}
                onChange={(e) => setAlertEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">{t("ir.targetPoints", "Target Points")}</label>
              <input
                type="number"
                required
                min={50}
                max={130}
                value={alertPoints}
                onChange={(e) => setAlertPoints(e.target.value)}
                placeholder="e.g. 75"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">{t("ir.visaSubclass", "Visa Subclass")}</label>
              <select
                value={alertSubclass}
                onChange={(e) => setAlertSubclass(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="189">{t("ir.subclass", "Subclass")} 189</option>
                <option value="190">{t("ir.subclass", "Subclass")} 190</option>
                <option value="491">{t("ir.subclass", "Subclass")} 491</option>
              </select>
            </div>
            {alertError && (
              <div className="sm:col-span-4">
                <p className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-600">
                  {alertError}
                </p>
              </div>
            )}
            <div className="sm:col-span-4">
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("ir.setAlert", "Set Alert")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
