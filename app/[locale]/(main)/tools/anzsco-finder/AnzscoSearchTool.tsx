"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, BadgeCheck, BriefcaseBusiness, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import anzscoList from "@/src/data/anzsco-list.json";

type Occupation = {
  code: string;
  title: string;
  skillLevel: string;
  duties: string[];
};

const OCCUPATIONS = anzscoList satisfies Occupation[];
const POPULAR_CODES = ["261313", "254412", "233211", "233512", "221111", "351311", "321211", "241213"];

export function AnzscoSearchTool() {
  const [query, setQuery] = useState("");
  const [selectedCode, setSelectedCode] = useState<string | null>("261313");

  const popularOccupations = useMemo(
    () =>
      POPULAR_CODES.map((code) => OCCUPATIONS.find((occupation) => occupation.code === code)).filter(
        (occupation): occupation is Occupation => Boolean(occupation)
      ),
    []
  );

  const matches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return popularOccupations;

    return OCCUPATIONS.filter((occupation) => {
      return (
        occupation.title.toLowerCase().includes(normalizedQuery) ||
        occupation.code.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [popularOccupations, query]);

  const hasSearch = query.trim().length > 0;

  const selectedOccupation =
    matches.find((occupation) => occupation.code === selectedCode) ?? matches[0] ?? null;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_24px_70px_-45px_rgba(15,23,42,0.45)] sm:p-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-cyan-700" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by job title, ANZSCO code, or duty..."
            className="h-16 rounded-xl border-slate-300 bg-slate-50 pl-14 pr-5 text-lg shadow-inner focus-visible:border-cyan-700 focus-visible:ring-cyan-700/15"
            aria-label="Search ANZSCO occupations"
          />
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.5fr]">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
                {hasSearch ? `${matches.length} matching occupations` : "Popular Searches"}
              </p>
              <p className="text-xs font-semibold text-slate-400">{OCCUPATIONS.length} occupations indexed</p>
            </div>
            {matches.length > 0 ? (
              matches.map((occupation) => {
                const isSelected = selectedOccupation?.code === occupation.code;
                return (
                  <button
                    key={occupation.code}
                    type="button"
                    onClick={() => setSelectedCode(occupation.code)}
                    className={`w-full rounded-xl border p-4 text-left transition-all ${
                      isSelected
                        ? "border-cyan-700 bg-cyan-50 shadow-md"
                        : "border-slate-200 bg-white hover:border-cyan-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-cyan-800">{occupation.code}</p>
                        <p className="mt-1 text-base font-bold text-slate-950">{occupation.title}</p>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                        {occupation.skillLevel}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-cyan-200 bg-gradient-to-br from-slate-50 to-cyan-50 p-6 shadow-inner">
                <p className="text-base font-bold text-slate-950">No occupations found.</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Please try a different keyword or ANZSCO code.
                </p>
              </div>
            )}
          </div>

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
                        Occupation Code
                      </div>
                      <p className="mt-2 text-3xl font-bold text-slate-950">
                        {selectedOccupation.code}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                        <BadgeCheck className="h-4 w-4 text-cyan-700" />
                        Skill Level
                      </div>
                      <p className="mt-2 text-3xl font-bold text-slate-950">
                        {selectedOccupation.skillLevel.replace("Skill Level ", "Level ")}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-lg font-bold text-slate-950">Typical Tasks & Duties</h3>
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
                      Does your CV match these duties? Calculate your PR points and visa chances for{" "}
                      {selectedOccupation.title}.
                    </p>
                    <Button
                      asChild
                      size="lg"
                      className="mt-5 h-12 rounded-xl bg-cyan-700 px-6 text-base text-white shadow-lg shadow-cyan-900/15 hover:bg-cyan-800"
                    >
                      <Link href={`/en/full-check?occupation=${selectedOccupation.code}`}>
                        Check PR Eligibility (Free)
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
  );
}
