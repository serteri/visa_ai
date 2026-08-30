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

const OCCUPATIONS = (anzscoList as any[]).map((o) => ({
  code: o.code,
  title: o.title_en || o.title || "",
  title_tr: o.title_tr,
  title_zh: o.title_zh,
  keywords: o.keywords || [],
  skillLevel: String(o.skillLevel || ""),
  duties: o.duties_en || o.duties || [],
})) as (Occupation & { title_tr?: string; title_zh?: string; keywords?: string[] })[];
const { assessingBodies, occupationMapping } = assessingData as {
  assessingBodies: Record<string, AssessingBody>;
  occupationMapping: Record<string, string>;
};

const COLOR_MAP: Record<string, string> = {
  blue: "bg-blue-500/10 text-blue-300 border-blue-500/30",
  indigo: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
  pink: "bg-pink-500/10 text-pink-300 border-pink-500/30",
  violet: "bg-violet-500/10 text-violet-300 border-violet-500/30",
  orange: "bg-orange-500/10 text-orange-300 border-orange-500/30",
  emerald: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  teal: "bg-teal-500/10 text-teal-300 border-teal-500/30",
  cyan: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
  red: "bg-red-500/10 text-red-300 border-red-500/30",
  green: "bg-green-500/10 text-green-300 border-green-500/30",
  amber: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  sky: "bg-sky-500/10 text-sky-300 border-sky-500/30",
  slate: "bg-indigo-500/10 text-indigo-100 border-indigo-500/30",
  yellow: "bg-yellow-500/10 text-yellow-300 border-yellow-500/30",
  purple: "bg-purple-500/10 text-purple-300 border-purple-500/30",
  rose: "bg-rose-500/10 text-rose-300 border-rose-500/30",
  lime: "bg-lime-500/10 text-lime-300 border-lime-500/30",
};

const DOT_MAP: Record<string, string> = {
  blue: "bg-blue-500", indigo: "bg-indigo-500", pink: "bg-pink-500",
  violet: "bg-violet-500", orange: "bg-orange-500", emerald: "bg-emerald-500",
  teal: "bg-teal-500", cyan: "bg-cyan-500", red: "bg-red-500",
  green: "bg-green-500", amber: "bg-amber-500", sky: "bg-sky-500",
  slate: "bg-indigo-500", yellow: "bg-yellow-500", purple: "bg-purple-500",
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
    <div className="border-b border-indigo-800/50 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
      >
        <span className="text-sm font-semibold text-white">{t(q)}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-indigo-200" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-indigo-200" />
        )}
      </button>
      {open && <p className="pb-4 text-sm leading-relaxed text-indigo-100">{t(a)}</p>}
    </div>
  );
}

// Count occupations per body
const bodyCounts: Record<string, number> = {};
for (const bodyKey of Object.values(occupationMapping)) {
  bodyCounts[bodyKey] = (bodyCounts[bodyKey] ?? 0) + 1;
}

function getLocalizedTitle(o: any, locale: string): string {
  if (locale === "tr") return o.title_tr || o.title;
  if (locale === "zh-Hans") return o.title_zh || o.title;
  return o.title;
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
      (o) =>
        o.title.toLowerCase().includes(q) ||
        o.title_tr?.toLowerCase().includes(q) ||
        o.title_zh?.toLowerCase().includes(q) ||
        o.code.includes(q) ||
        o.keywords?.some((kw) => kw.toLowerCase().includes(q))
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
    setQuery(getLocalizedTitle(occ, locale));
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
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-indigo-800/50 bg-[#1e1b4b]">
        <div className="absolute inset-x-0 top-0 h-1 bg-indigo-500" />
        <div className="mx-auto flex min-h-[340px] max-w-5xl flex-col justify-center px-4 pb-16 sm:px-6">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex rounded-full border border-indigo-300/30 bg-indigo-300/10 px-4 py-1.5 text-sm font-semibold text-indigo-200">
              {t("sa.badge", "Skills Assessment Finder")}
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              {t("sa.title", "Which assessing body do you need?")}
            </h1>
            <p className="mt-4 text-lg text-indigo-100">
              {t("sa.subtitle", "Enter your occupation or ANZSCO code to instantly find the right assessing authority for your Australian skilled migration application.")}
            </p>
          </div>
        </div>
      </section>

      {/* Search */}
      <div className="-mt-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="rounded-2xl border border-indigo-800/50 bg-card p-4 shadow-[0_24px_70px_-40px_rgba(0,0,0,0.6)] sm:p-6">
            <div className="relative">
              <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-indigo-400" />
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
                className="h-16 w-full rounded-xl border border-indigo-700 bg-[#3C3262] pl-14 pr-5 text-lg text-white outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
              />
              {/* Dropdown */}
              {dropdownOpen && suggestions.length > 0 && (
                <div
                  ref={dropdownRef}
                  className="absolute left-0 top-full z-50 mt-2 w-full rounded-xl border border-indigo-800/50 bg-card shadow-xl"
                >
                  {suggestions.map((occ) => {
                    const bodyKey = occupationMapping[occ.code];
                    const body = bodyKey ? assessingBodies[bodyKey] : null;
                    return (
                      <button
                        key={occ.code}
                        type="button"
                        onMouseDown={() => selectOccupation(occ)}
                        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-indigo-500/10 first:rounded-t-xl last:rounded-b-xl"
                      >
                        <div>
                          <span className="text-xs font-semibold text-indigo-400">
                            {occ.code}
                          </span>
                          <p className="mt-0.5 text-sm font-medium text-white">{getLocalizedTitle(occ, locale)}</p>
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
                <div className="rounded-2xl border border-indigo-800/50 bg-card p-6 shadow-sm">
                  {/* Occupation header */}
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-200">
                        ANZSCO {selected.code}
                      </p>
                      <h2 className="mt-1 text-2xl font-bold text-white">{getLocalizedTitle(selected, locale)}</h2>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        COLOR_MAP[selectedBody.color] ?? COLOR_MAP.slate
                      }`}
                    >
                      Skill Level {selected.skillLevel}
                    </span>
                  </div>

                  {selected.duties && selected.duties.length > 0 && (
                    <div className="mt-4 rounded-xl border border-indigo-800/50 bg-[#3C3262]/60 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-200">
                        {t("sa.duties", "Key Duties")}
                      </p>
                      <ul className="mt-2 space-y-2">
                        {selected.duties.map((duty, idx) => (
                          <li key={idx} className="flex gap-2.5 text-sm leading-relaxed text-indigo-100">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                            <span>{duty}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="my-5 h-px bg-indigo-800/60" />

                  {/* Assessing body */}
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-200">
                        {t("sa.assessingBody", "Assessing Body")}
                      </p>
                      <p className="mt-1 text-2xl font-bold text-white">
                        {selectedBody.name}
                      </p>
                      <p className="mt-1 text-sm text-indigo-100">{selectedBody.description}</p>
                    </div>
                  </div>

                  {/* Fee + time */}
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center gap-3 rounded-xl border border-indigo-800/50 bg-[#3C3262]/60 px-4 py-3">
                      <DollarSign className="h-5 w-5 shrink-0 text-emerald-400" />
                      <div>
                        <p className="text-xs font-medium text-indigo-200">{t("sa.assessmentFee", "Assessment Fee")}</p>
                        <p className="mt-0.5 text-base font-bold text-white">
                          {selectedBody.fee}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-indigo-800/50 bg-[#3C3262]/60 px-4 py-3">
                      <Clock className="h-5 w-5 shrink-0 text-indigo-400" />
                      <div>
                        <p className="text-xs font-medium text-indigo-200">{t("sa.processingTime", "Processing Time")}</p>
                        <p className="mt-0.5 text-base font-bold text-white">
                          {selectedBody.processingTime}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Info box */}
                  <div className="mt-5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3">
                    <p className="text-xs font-semibold text-indigo-300">{t("sa.whatIsTitle", "What is a skills assessment?")}</p>
                    <p className="mt-1 text-xs leading-relaxed text-indigo-300/80">
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
                      className="flex items-center gap-2 rounded-xl border border-indigo-700 bg-card px-5 py-2.5 text-sm font-semibold text-indigo-100 transition hover:bg-indigo-800/40"
                    >
                      {t("sa.getFreeConsultation", "Get free consultation")}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>

                {/* ANZSCO finder nudge */}
                <div className="rounded-xl border border-indigo-800/50 bg-card px-5 py-4 shadow-sm">
                  <p className="text-sm font-semibold text-indigo-100">
                    {t("sa.anzscoNudgeTitle", "Not sure about your ANZSCO code?")}
                  </p>
                  <p className="mt-0.5 text-xs text-indigo-200">
                    {t("sa.anzscoNudgeText", "Use our ANZSCO Finder tool to identify your correct occupation code.")}
                  </p>
                  <Link
                    href={`/${locale}/tools/anzsco-finder`}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:underline"
                  >
                    {t("sa.openAnzscoFinder", "Open ANZSCO Finder")} <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
                <p className="font-semibold text-amber-300">
                  {t("sa.noMappingPrefix", "No assessing body mapped for")} {" "}
                  <span className="font-bold">{getLocalizedTitle(selected, locale)}</span> ({selected.code})
                </p>
                <p className="mt-1 text-sm text-amber-300/80">
                  {t("sa.noMappingText", "This occupation may be assessed by VETASSESS or may not require a skills assessment for all visa types. Check with the Department of Home Affairs or a registered migration agent.")}
                </p>
                <a
                  href="https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect/eligible-skilled-occupations"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-300 hover:underline"
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
            <h2 className="text-lg font-bold text-white">{t("sa.allBodies", "All Assessing Bodies")}</h2>
            {bodyFilter && (
              <button
                type="button"
                onClick={() => setBodyFilter(null)}
                className="text-xs font-semibold text-indigo-400 hover:underline"
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
                      ? "border-indigo-500/40 bg-indigo-500/10 shadow-md"
                      : "border-indigo-800/50 bg-card hover:border-indigo-500/30 hover:bg-indigo-800/40"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 h-3 w-3 shrink-0 rounded-full ${
                        DOT_MAP[body.color] ?? "bg-indigo-400"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{body.shortName}</p>
                      <p className="mt-0.5 truncate text-xs text-indigo-200">{body.name}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-xs text-indigo-200">{count} {t("sa.occupations", "occupations")}</span>
                    <a
                      href={body.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-xs font-medium text-indigo-400 hover:underline"
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
            <div className="mt-4 rounded-xl border border-indigo-800/50 bg-card p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-indigo-200">
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
                    className="flex items-center gap-3 rounded-lg border border-indigo-800/50 px-3 py-2 text-left transition hover:border-indigo-500/30 hover:bg-indigo-500/10"
                  >
                    <span className="text-xs font-bold text-indigo-400">{occ.code}</span>
                    <span className="text-sm text-indigo-100">{occ.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* FAQ */}
        <div className="rounded-2xl border border-indigo-800/50 bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">{t("sa.faqTitle", "Frequently Asked Questions")}</h2>
          </div>
          {FAQ_ITEMS.map((item) => (
            <FaqItem key={item.q} q={item.q} a={item.a} t={t} />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/30 to-violet-950/30 p-6">
          <h3 className="text-base font-bold text-white">{t("sa.bottomCtaTitle", "Need a clear visa strategy?")}</h3>
          <p className="mt-1 text-sm text-indigo-100">
            {t("sa.bottomCtaText", "Stop guessing. Get your personalized 20-page AI-powered PR report covering your exact points, state demand, and next steps.")}
          </p>
          <Link
            href={`/${locale}/full-check`}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            {t("sa.bottomCtaButton", "Get your Premium Report ➔")}
          </Link>
        </div>
      </div>
    </main>
  );
}
