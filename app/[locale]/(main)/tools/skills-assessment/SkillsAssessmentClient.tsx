"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  ExternalLink,
  ArrowRight,
  Clock,
  DollarSign,
  ChevronDown,
  ChevronUp,
  BookOpen,
} from "lucide-react";
import anzscoList from "@/src/data/anzsco-list.json";
import assessingData from "@/src/data/assessing-bodies.json";
import { useTranslation } from "@/contexts/language-context";

type Occupation = { code: string; title: string; skillLevel: string; duties: string[] };
type AssessingBody = {
  name: string;
  shortName: string;
  website: string;
  fee: string;
  processingTime: string;
  description: string;
  color: string;
};

const OCCUPATIONS = anzscoList as Occupation[];
const { assessingBodies, occupationMapping } = assessingData as {
  assessingBodies: Record<string, AssessingBody>;
  occupationMapping: Record<string, string>;
};

const COLOR_MAP: Record<string, string> = {
  blue: "bg-blue-100 text-blue-700 border-blue-200",
  indigo: "bg-indigo-100 text-indigo-700 border-indigo-200",
  pink: "bg-pink-100 text-pink-700 border-pink-200",
  violet: "bg-violet-100 text-violet-700 border-violet-200",
  orange: "bg-orange-100 text-orange-700 border-orange-200",
  emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
  teal: "bg-teal-100 text-teal-700 border-teal-200",
  cyan: "bg-cyan-100 text-cyan-700 border-cyan-200",
  red: "bg-red-100 text-red-700 border-red-200",
  green: "bg-green-100 text-green-700 border-green-200",
  amber: "bg-amber-100 text-amber-700 border-amber-200",
  sky: "bg-sky-100 text-sky-700 border-sky-200",
  slate: "bg-slate-100 text-slate-700 border-slate-200",
  yellow: "bg-yellow-100 text-yellow-700 border-yellow-200",
  purple: "bg-purple-100 text-purple-700 border-purple-200",
  rose: "bg-rose-100 text-rose-700 border-rose-200",
  lime: "bg-lime-100 text-lime-700 border-lime-200",
};

const DOT_MAP: Record<string, string> = {
  blue: "bg-blue-500", indigo: "bg-indigo-500", pink: "bg-pink-500",
  violet: "bg-violet-500", orange: "bg-orange-500", emerald: "bg-emerald-500",
  teal: "bg-teal-500", cyan: "bg-cyan-500", red: "bg-red-500",
  green: "bg-green-500", amber: "bg-amber-500", sky: "bg-sky-500",
  slate: "bg-slate-500", yellow: "bg-yellow-500", purple: "bg-purple-500",
  rose: "bg-rose-500", lime: "bg-lime-500",
};

const FAQ_ITEMS = [
  { q: "sa.faq.q1", a: "sa.faq.a1" },
  { q: "sa.faq.q2", a: "sa.faq.a2" },
  { q: "sa.faq.q3", a: "sa.faq.a3" },
  { q: "sa.faq.q4", a: "sa.faq.a4" },
  { q: "sa.faq.q5", a: "sa.faq.a5" },
];

function FaqItem({ q, a, t }: { q: string; a: string; t: (key: string) => string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
      >
        <span className="text-sm font-semibold text-slate-800">{t(q)}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        )}
      </button>
      {open && <p className="pb-4 text-sm leading-relaxed text-slate-500">{t(a)}</p>}
    </div>
  );
}

// Count occupations per body
const bodyCounts: Record<string, number> = {};
for (const bodyKey of Object.values(occupationMapping)) {
  bodyCounts[bodyKey] = (bodyCounts[bodyKey] ?? 0) + 1;
}

export function SkillsAssessmentClient({ locale }: { locale: string }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selected, setSelected] = useState<Occupation | null>(null);
  const [bodyFilter, setBodyFilter] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return OCCUPATIONS.filter(
      (o) => o.title.toLowerCase().includes(q) || o.code.includes(q)
    ).slice(0, 8);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function selectOccupation(occ: Occupation) {
    setSelected(occ);
    setQuery(occ.title);
    setDropdownOpen(false);
  }

  const selectedBodyKey = selected ? occupationMapping[selected.code] : null;
  const selectedBody = selectedBodyKey ? assessingBodies[selectedBodyKey] : null;

  // For "all bodies" grid — filtered if bodyFilter is set
  const allBodies = Object.entries(assessingBodies).filter(([key]) => {
    if (!bodyFilter) return true;
    return key === bodyFilter;
  });

  // Occupations for the filtered body
  const filteredOccupations = useMemo(() => {
    if (!bodyFilter) return [];
    return OCCUPATIONS.filter((o) => occupationMapping[o.code] === bodyFilter);
  }, [bodyFilter]);

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-slate-950">
        <div className="absolute inset-x-0 top-0 h-1 bg-indigo-500" />
        <div className="mx-auto flex min-h-[340px] max-w-5xl flex-col justify-center px-4 pt-28 pb-16 sm:px-6">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex rounded-full border border-indigo-300/30 bg-indigo-300/10 px-4 py-1.5 text-sm font-semibold text-indigo-200">
              {t("sa.badge", "Skills Assessment Finder")}
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              {t("sa.title", "Which assessing body do you need?")}
            </h1>
            <p className="mt-4 text-lg text-slate-300">
              {t("sa.subtitle", "Enter your occupation or ANZSCO code to instantly find the right assessing authority for your Australian skilled migration application.")}
            </p>
          </div>
        </div>
      </section>

      {/* Search */}
      <div className="-mt-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.4)] sm:p-6">
            <div className="relative">
              <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-indigo-600" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setDropdownOpen(true);
                  if (!e.target.value) setSelected(null);
                }}
                onFocus={() => query && setDropdownOpen(true)}
                placeholder={t("sa.searchPlaceholder", "Enter occupation title or ANZSCO code…")}
                className="h-16 w-full rounded-xl border border-slate-200 bg-slate-50 pl-14 pr-5 text-lg text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
              {/* Dropdown */}
              {dropdownOpen && suggestions.length > 0 && (
                <div
                  ref={dropdownRef}
                  className="absolute left-0 top-full z-50 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-xl"
                >
                  {suggestions.map((occ) => {
                    const bodyKey = occupationMapping[occ.code];
                    const body = bodyKey ? assessingBodies[bodyKey] : null;
                    return (
                      <button
                        key={occ.code}
                        type="button"
                        onMouseDown={() => selectOccupation(occ)}
                        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-indigo-50 first:rounded-t-xl last:rounded-b-xl"
                      >
                        <div>
                          <span className="text-xs font-semibold text-indigo-600">
                            {occ.code}
                          </span>
                          <p className="mt-0.5 text-sm font-medium text-slate-800">{occ.title}</p>
                        </div>
                        {body && (
                          <span
                            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                              COLOR_MAP[body.color] ?? COLOR_MAP.slate
                            }`}
                          >
                            {body.shortName}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-10 px-4 py-10 sm:px-6">
        {/* Result card */}
        {selected && (
          <div className="space-y-4">
            {selectedBody ? (
              <>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  {/* Occupation header */}
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        ANZSCO {selected.code}
                      </p>
                      <h2 className="mt-1 text-2xl font-bold text-slate-900">{selected.title}</h2>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        COLOR_MAP[selectedBody.color] ?? COLOR_MAP.slate
                      }`}
                    >
                      {selected.skillLevel}
                    </span>
                  </div>

                  <div className="my-5 h-px bg-slate-100" />

                  {/* Assessing body */}
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {t("sa.assessingBody", "Assessing Body")}
                      </p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">
                        {selectedBody.name}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">{selectedBody.description}</p>
                    </div>
                  </div>

                  {/* Fee + time */}
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <DollarSign className="h-5 w-5 shrink-0 text-emerald-600" />
                      <div>
                        <p className="text-xs font-medium text-slate-400">{t("sa.assessmentFee", "Assessment Fee")}</p>
                        <p className="mt-0.5 text-base font-bold text-slate-800">
                          {selectedBody.fee}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <Clock className="h-5 w-5 shrink-0 text-indigo-600" />
                      <div>
                        <p className="text-xs font-medium text-slate-400">{t("sa.processingTime", "Processing Time")}</p>
                        <p className="mt-0.5 text-base font-bold text-slate-800">
                          {selectedBody.processingTime}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Info box */}
                  <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
                    <p className="text-xs font-semibold text-indigo-700">{t("sa.whatIsTitle", "What is a skills assessment?")}</p>
                    <p className="mt-1 text-xs leading-relaxed text-indigo-600">
                      {t("sa.whatIsText", "A skills assessment verifies that your overseas qualifications and work experience meet Australian standards for your nominated occupation. It is required before lodging most skilled migration visa applications.")}
                    </p>
                  </div>

                  {/* Buttons */}
                  <div className="mt-5 flex flex-wrap gap-3">
                    <a
                      href={selectedBody.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                    >
                      {t("sa.visitOfficialWebsite", "Visit Official Website")}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <Link
                      href={`/${locale}/full-check`}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      {t("sa.getFreeConsultation", "Get free consultation")}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>

                {/* ANZSCO finder nudge */}
                <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                  <p className="text-sm font-semibold text-slate-700">
                    {t("sa.anzscoNudgeTitle", "Not sure about your ANZSCO code?")}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {t("sa.anzscoNudgeText", "Use our ANZSCO Finder tool to identify your correct occupation code.")}
                  </p>
                  <Link
                    href={`/${locale}/tools/anzsco-finder`}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    {t("sa.openAnzscoFinder", "Open ANZSCO Finder")} <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
                <p className="font-semibold text-amber-800">
                  {t("sa.noMappingPrefix", "No assessing body mapped for")} {" "}
                  <span className="font-bold">{selected.title}</span> ({selected.code})
                </p>
                <p className="mt-1 text-sm text-amber-700">
                  {t("sa.noMappingText", "This occupation may be assessed by VETASSESS or may not require a skills assessment for all visa types. Check with the Department of Home Affairs or a registered migration agent.")}
                </p>
                <a
                  href="https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect/eligible-skilled-occupations"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700 hover:underline"
                >
                  {t("sa.viewDhaList", "View DHA occupation list")} <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* All assessing bodies grid */}
        <div>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">{t("sa.allBodies", "All Assessing Bodies")}</h2>
            {bodyFilter && (
              <button
                type="button"
                onClick={() => setBodyFilter(null)}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                {t("sa.clearFilter", "Clear filter")}
              </button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(assessingBodies).map(([key, body]) => {
              const count = bodyCounts[key] ?? 0;
              const isActive = bodyFilter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setBodyFilter(isActive ? null : key)}
                  className={`rounded-xl border p-4 text-left transition ${
                    isActive
                      ? "border-indigo-300 bg-indigo-50 shadow-md"
                      : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 h-3 w-3 shrink-0 rounded-full ${
                        DOT_MAP[body.color] ?? "bg-slate-400"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">{body.shortName}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{body.name}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-400">{count} {t("sa.occupations", "occupations")}</span>
                    <a
                      href={body.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
                    >
                      {t("sa.website", "Website")} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Filtered occupations */}
          {bodyFilter && filteredOccupations.length > 0 && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {t("sa.occupationsAssessedBy", "Occupations assessed by")} {assessingBodies[bodyFilter]?.shortName}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {filteredOccupations.map((occ) => (
                  <button
                    key={occ.code}
                    type="button"
                    onClick={() => {
                      selectOccupation(occ);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 text-left transition hover:border-indigo-200 hover:bg-indigo-50"
                  >
                    <span className="text-xs font-bold text-indigo-600">{occ.code}</span>
                    <span className="text-sm text-slate-700">{occ.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* FAQ */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">{t("sa.faqTitle", "Frequently Asked Questions")}</h2>
          </div>
          {FAQ_ITEMS.map((item) => (
            <FaqItem key={item.q} q={item.q} a={item.a} t={t} />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 p-6">
          <h3 className="text-base font-bold text-slate-900">{t("sa.bottomCtaTitle", "Need help with your application?")}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {t("sa.bottomCtaText", "Our free full-check report covers your visa pathway, skills assessment requirements, points score and next steps — tailored to your profile.")}
          </p>
          <Link
            href={`/${locale}/full-check`}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            {t("sa.bottomCtaButton", "Get a free consultation")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}
