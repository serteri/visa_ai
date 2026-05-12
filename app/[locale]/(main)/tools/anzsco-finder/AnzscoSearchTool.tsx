"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { ArrowRight, BadgeCheck, BriefcaseBusiness, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/contexts/language-context";
import anzscoList from "@/src/data/anzsco-list.json";

type Occupation = {
  code: string;
  title: string;
  skillLevel: string;
  duties: string[];
};

const OCCUPATIONS = anzscoList satisfies Occupation[];
const POPULAR_CODES = [
  "261313", // Software Engineer (ICT)
  "233211", // Civil Engineer (Engineering)
  "254412", // Registered Nurse (Health)
  "221111", // Accountant (Finance)
  "241213", // Secondary School Teacher (Education)
  "321211", // Electrician (Trades)
  "351311", // Chef (Hospitality)
  "232111", // Architect (Architecture)
  "252411", // Psychologist (Health)
  "133111", // Construction Manager (Management)
  "234112", // Chemist (Science)
  "271311", // Solicitor (Legal)
];

export function AnzscoSearchTool({ locale }: { locale: string }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [selectedCode, setSelectedCode] = useState<string | null>("261313");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search input 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const popularOccupations = useMemo(
    () =>
      POPULAR_CODES.map((code) => OCCUPATIONS.find((o) => o.code === code)).filter(
        (o): o is Occupation => Boolean(o)
      ),
    []
  );

  const matches = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return popularOccupations;
    return OCCUPATIONS.filter(
      (o) => o.title.toLowerCase().includes(q) || o.code.toLowerCase().includes(q)
    );
  }, [popularOccupations, debouncedQuery]);

  const hasSearch = query.trim().length > 0;
  const selectedOccupation =
    matches.find((o) => o.code === selectedCode) ?? matches[0] ?? null;

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-slate-950">
        <div className="absolute inset-x-0 top-0 h-1 bg-cyan-500" />
        <div className="mx-auto flex min-h-[380px] max-w-6xl flex-col justify-center px-4 pt-28 pb-20 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100">
              {t("af.badge")}
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              {t("af.title")}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
              {t("af.description")}
            </p>
          </div>
        </div>
      </section>

      {/* Search tool */}
      <div className="-mt-12">
        <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_24px_70px_-45px_rgba(15,23,42,0.45)] sm:p-6">
            <div className="relative">
              <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-cyan-700" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("af.searchPlaceholder")}
                className="h-16 rounded-xl border-slate-300 bg-slate-50 pl-14 pr-5 text-lg shadow-inner focus-visible:border-cyan-700 focus-visible:ring-cyan-700/15"
                aria-label={t("af.searchPlaceholder")}
              />
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.5fr]">
              {/* Left: results list */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
                    {hasSearch
                      ? `${matches.length} ${t("af.matchingCount")}`
                      : t("af.popular")}
                  </p>
                  <p className="text-xs font-semibold text-slate-400">
                    {OCCUPATIONS.length} {t("af.indexedCount")}
                  </p>
                </div>

                {matches.length > 0 ? (
                  matches.map((occ) => {
                    const isSelected = selectedOccupation?.code === occ.code;
                    return (
                      <button
                        key={occ.code}
                        type="button"
                        onClick={() => setSelectedCode(occ.code)}
                        className={`w-full rounded-xl border p-4 text-left transition-all ${
                          isSelected
                            ? "border-cyan-700 bg-cyan-50 shadow-md"
                            : "border-slate-200 bg-white hover:border-cyan-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-cyan-800">{occ.code}</p>
                            <p className="mt-1 text-base font-bold text-slate-950">{occ.title}</p>
                          </div>
                          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                            {occ.skillLevel}
                          </span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-cyan-200 bg-gradient-to-br from-slate-50 to-cyan-50 p-6 shadow-inner">
                    <p className="text-base font-bold text-slate-950">{t("af.noResults.title")}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{t("af.noResults.subtitle")}</p>
                  </div>
                )}
              </div>

              {/* Right: occupation detail */}
              {selectedOccupation ? (
                <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-[0_24px_70px_-45px_rgba(15,23,42,0.55)]">
                  <CardContent className="p-0">
                    <div className="border-b border-slate-200 bg-slate-950 p-6 text-white">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-200">
                            ANZSCO {selectedOccupation.code}
                          </p>
                          <h2 className="mt-2 text-2xl font-bold tracking-tight">
                            {selectedOccupation.title}
                          </h2>
                        </div>
                        <div className="rounded-full border border-cyan-200/30 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100">
                          {selectedOccupation.skillLevel}
                        </div>
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                            <BriefcaseBusiness className="h-4 w-4 text-cyan-700" />
                            {t("af.detail.code")}
                          </div>
                          <p className="mt-2 text-3xl font-bold text-slate-950">
                            {selectedOccupation.code}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                            <BadgeCheck className="h-4 w-4 text-cyan-700" />
                            {t("af.detail.skillLevel")}
                          </div>
                          <p className="mt-2 text-3xl font-bold text-slate-950">
                            {selectedOccupation.skillLevel.replace("Skill Level ", "Level ")}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6">
                        <h3 className="text-lg font-bold text-slate-950">{t("af.detail.tasks")}</h3>
                        <ul className="mt-4 space-y-3">
                          {selectedOccupation.duties.map((duty) => (
                            <li key={duty} className="flex gap-3 text-sm leading-6 text-slate-700">
                              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-cyan-700" />
                              <span>{duty}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-8 rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-slate-50 p-6 shadow-inner">
                        <p className="text-xl font-bold leading-8 text-slate-950">
                          {t("af.cta.text")}{" "}
                          {selectedOccupation.title}.
                        </p>
                        <Button
                          asChild
                          size="lg"
                          className="mt-5 h-12 rounded-xl bg-cyan-700 px-6 text-base text-white shadow-lg shadow-cyan-900/15 hover:bg-cyan-800"
                        >
                          <Link href={`/${locale}/full-check?occupation=${selectedOccupation.code}`}>
                            {t("af.cta.button")}
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
