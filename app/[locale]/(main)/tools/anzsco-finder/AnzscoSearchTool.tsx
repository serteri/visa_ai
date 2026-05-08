"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, BadgeCheck, BriefcaseBusiness, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Occupation = {
  code: string;
  title: string;
  skillLevel: string;
  duties: string[];
};

const OCCUPATIONS: Occupation[] = [
  {
    code: "261313",
    title: "Software Engineer",
    skillLevel: "Skill Level 1",
    duties: [
      "Designs, develops, modifies, documents, tests, implements, installs and supports software applications and systems.",
      "Analyses user needs and software requirements to determine feasibility and system design.",
      "Writes and maintains program code that meets system requirements and technical specifications.",
      "Tests, debugs, diagnoses and corrects errors in applications programming language.",
    ],
  },
  {
    code: "254412",
    title: "Registered Nurse",
    skillLevel: "Skill Level 1",
    duties: [
      "Assesses, plans, implements and evaluates nursing care for patients according to clinical needs.",
      "Administers medication and treatments, monitors patient responses and records clinical observations.",
      "Coordinates care with doctors, allied health professionals and patient support networks.",
      "Provides health education and supports patient safety, recovery and ongoing care planning.",
    ],
  },
  {
    code: "321211",
    title: "Motor Mechanic",
    skillLevel: "Skill Level 3",
    duties: [
      "Detects and diagnoses mechanical and electrical faults in engines and vehicle systems.",
      "Dismantles and removes engine assemblies, transmissions, steering mechanisms and other components.",
      "Repairs, replaces and reassembles worn or defective parts using workshop tools and diagnostic equipment.",
      "Tests and adjusts mechanical parts after repair to ensure proper performance and roadworthiness.",
    ],
  },
  {
    code: "351311",
    title: "Chef",
    skillLevel: "Skill Level 2",
    duties: [
      "Plans menus, estimates food and labour costs and orders food supplies for kitchen operations.",
      "Prepares, seasons and cooks food according to recipes, dietary requirements and quality standards.",
      "Supervises kitchen staff and coordinates timing of food preparation and service.",
      "Monitors hygiene, storage, presentation and kitchen safety standards.",
    ],
  },
  {
    code: "233512",
    title: "Mechanical Engineer",
    skillLevel: "Skill Level 1",
    duties: [
      "Plans and designs mechanical equipment, machines, components and systems.",
      "Develops specifications for manufacture, installation, operation and maintenance of mechanical systems.",
      "Investigates failures and recommends modifications to improve performance and reliability.",
      "Oversees installation, testing, inspection and maintenance of mechanical plant and equipment.",
    ],
  },
  {
    code: "221111",
    title: "Accountant",
    skillLevel: "Skill Level 1",
    duties: [
      "Prepares financial statements, tax returns, budgets and accounting reports.",
      "Reviews operating costs, income, expenditure and financial commitments.",
      "Audits accounts and advises on financial risk, compliance and business structures.",
      "Maintains accounting systems and supports accurate record keeping for organisations.",
    ],
  },
];

export function AnzscoSearchTool() {
  const [query, setQuery] = useState("");
  const [selectedCode, setSelectedCode] = useState<string | null>("261313");

  const matches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return OCCUPATIONS;

    return OCCUPATIONS.filter((occupation) => {
      return (
        occupation.title.toLowerCase().includes(normalizedQuery) ||
        occupation.code.includes(normalizedQuery) ||
        occupation.duties.some((duty) => duty.toLowerCase().includes(normalizedQuery))
      );
    });
  }, [query]);

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
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                No mock occupations match this search yet.
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
