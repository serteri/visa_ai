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
import { ResearchLinks } from "@/components/research-links";
import { researchText } from "@/lib/marketing/research-journey";
import { publicPath } from "@/lib/seo/urls";
import { buildOccupationSlug, findOccupationById } from "@/lib/occupations/seo";
import { supportedToolMappings } from "@/lib/skills-assessment/tool-coverage";

type Occupation = { code: string; title: string; skillLevel: string; duties: string[] };
type OccupationInput = { code: string; title_en?: string; title?: string; title_tr?: string; title_zh?: string; keywords?: string[]; skillLevel?: string | number; duties_en?: string[]; duties?: string[] };
type Localized = string | { en: string; tr: string; "zh-Hans": string };
type FeeFields = {
  fee: string;
  /** One-line eligibility note under the fee (e.g. ANMAC: which of its two fees applies). */
  feeNote?: Localized;
  processingTime: Localized;
  processingNote?: Localized;
  /** Where the figures come from (the extracted source data the report also uses). */
  source?: string;
};
type AssessingBody = FeeFields & {
  name: string;
  shortName: string;
  website: string;
  description: string;
  color: string;
  /** Per-ANZSCO fee fields where the sourced fee depends on the occupation (doctors, enrolled nurses). */
  occupationOverrides?: Record<string, Partial<FeeFields>>;
};

function pickLocalized(value: Localized | undefined, locale: string): string {
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  return locale === "tr" ? value.tr : locale === "zh-Hans" ? value["zh-Hans"] : value.en;
}

const OCCUPATIONS = (anzscoList as OccupationInput[]).map((o) => ({
  code: o.code,
  title: o.title_en || o.title || "",
  title_tr: o.title_tr,
  title_zh: o.title_zh,
  keywords: o.keywords || [],
  skillLevel: String(o.skillLevel || ""),
  duties: o.duties_en || o.duties || [],
})) as (Occupation & { title_tr?: string; title_zh?: string; keywords?: string[] })[];
const { assessingBodies, occupationMapping: legacyMapping } = assessingData as {
  assessingBodies: Record<string, AssessingBody>;
  occupationMapping: Record<string, string>;
};
const occupationMapping = supportedToolMappings(legacyMapping);

const COLOR_MAP: Record<string, string> = {
  blue: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  indigo: "bg-[#53917E]/10 text-[#53917E] border-[#53917E]/30",
  pink: "bg-pink-500/10 text-pink-700 border-pink-500/30",
  violet: "bg-violet-500/10 text-violet-700 border-violet-500/30",
  orange: "bg-orange-500/10 text-orange-700 border-orange-500/30",
  emerald: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  teal: "bg-teal-500/10 text-teal-700 border-teal-500/30",
  cyan: "bg-cyan-500/10 text-cyan-700 border-cyan-500/30",
  red: "bg-red-500/10 text-red-700 border-red-500/30",
  green: "bg-green-500/10 text-green-700 border-green-500/30",
  amber: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  sky: "bg-sky-500/10 text-sky-700 border-sky-500/30",
  slate: "bg-[#53917E]/10 text-slate-600 border-[#53917E]/30",
  yellow: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30",
  purple: "bg-purple-500/10 text-purple-700 border-purple-500/30",
  rose: "bg-rose-500/10 text-rose-700 border-rose-500/30",
  lime: "bg-lime-500/10 text-lime-700 border-lime-500/30",
};

const DOT_MAP: Record<string, string> = {
  blue: "bg-blue-500", indigo: "bg-[#53917E]", pink: "bg-pink-500",
  violet: "bg-violet-500", orange: "bg-orange-500", emerald: "bg-emerald-500",
  teal: "bg-teal-500", cyan: "bg-cyan-500", red: "bg-red-500",
  green: "bg-green-500", amber: "bg-amber-500", sky: "bg-sky-500",
  slate: "bg-[#53917E]", yellow: "bg-yellow-500", purple: "bg-purple-500",
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
    <div className="border-b border-slate-200 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
      >
        <span className="text-sm font-semibold text-slate-900">{t(q)}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-slate-600" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-600" />
        )}
      </button>
      {open && <p className="pb-4 text-sm leading-relaxed text-slate-600">{t(a)}</p>}
    </div>
  );
}

// Count occupations per body
const bodyCounts: Record<string, number> = {};
for (const bodyKey of Object.values(occupationMapping)) {
  bodyCounts[bodyKey] = (bodyCounts[bodyKey] ?? 0) + 1;
}

function getLocalizedTitle(o: Occupation & { title_tr?: string; title_zh?: string }, locale: string): string {
  if (locale === "tr") return o.title_tr || o.title;
  if (locale === "zh-Hans") return o.title_zh || o.title;
  return o.title;
}

export function SkillsAssessmentClient({ locale, initialQuery }: { locale: string; initialQuery?: string }) {
  const { t } = useTranslation();
  const text = (en: string, tr: string, zh: string) => researchText(locale, en, tr, zh);
  const [query, setQuery] = useState(initialQuery ?? "");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selected, setSelected] = useState<Occupation | null>(() => OCCUPATIONS.find(o => o.code === initialQuery) ?? null);
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
  const selectedPage = selected ? findOccupationById(selected.code) : null;
  const selectedBody = selectedBodyKey && selected
    ? { ...assessingBodies[selectedBodyKey], ...assessingBodies[selectedBodyKey].occupationOverrides?.[selected.code] }
    : null;

  // Occupations for the filtered body
  const filteredOccupations = useMemo(() => {
    if (!bodyFilter) return [];
    return OCCUPATIONS.filter((o) => occupationMapping[o.code] === bodyFilter);
  }, [bodyFilter]);

  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-slate-50">
        <div className="absolute inset-x-0 top-0 h-1 bg-[#53917E]" />
        <div className="mx-auto flex min-h-[340px] max-w-5xl flex-col justify-center px-4 pb-16 sm:px-6">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex rounded-full border border-[#53917E]/30 bg-[#53917E]/10 px-4 py-1.5 text-sm font-semibold text-[#53917E]">
              {t("sa.badge", "Skills Assessment Finder")}
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              {t("sa.title", "Which assessing body do you need?")}
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              {t("sa.subtitle", "Enter your occupation or ANZSCO code to instantly find the right assessing authority for your Australian skilled migration application.")}
            </p>
            <p className="mt-3 text-sm text-slate-500">{Object.keys(occupationMapping).length} {text("explicit occupation mappings", "meslek-kurum kaydı", "条明确职业对应记录")} · {Object.keys(bodyCounts).length} {text("directory entries. Coverage is limited; unresolved mappings are omitted and no personal assessment is made.", "dizin kaydı. Kapsam sınırlıdır; çözülmemiş kayıtlar gösterilmez ve kişisel değerlendirme yapılmaz.", "个目录条目。覆盖范围有限；未解决的对应关系不显示，也不进行个人评估。")}</p>
          </div>
        </div>
      </section>

      {/* Search */}
      <div className="-mt-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="rounded-2xl border border-slate-200 bg-card p-4 shadow-[0_24px_70px_-40px_rgba(0,0,0,0.6)] sm:p-6">
            <div className="relative">
              <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setDropdownOpen(true);
                  setSelected(null);
                }}
                onFocus={() => query && setDropdownOpen(true)}
                placeholder={t("sa.searchPlaceholder", "Enter occupation title or ANZSCO code…")}
                aria-label={t("sa.searchPlaceholder", "Enter occupation title or ANZSCO code")}
                onKeyDown={event => { if (event.key === "Enter" && suggestions[0]) selectOccupation(suggestions[0]); }}
                className="h-16 w-full rounded-xl border border-slate-200 bg-white pl-14 pr-5 text-lg text-slate-900 outline-none transition focus:border-[#53917E] focus:ring-2 focus:ring-[#53917E]/20"
              />
              {/* Dropdown */}
              {dropdownOpen && suggestions.length > 0 && (
                <div
                  ref={dropdownRef}
                  className="absolute left-0 top-full z-50 mt-2 w-full rounded-xl border border-slate-200 bg-card shadow-xl"
                >
                  {suggestions.map((occ) => {
                    const bodyKey = occupationMapping[occ.code];
                    const body = bodyKey ? assessingBodies[bodyKey] : null;
                    return (
                      <button
                        key={occ.code}
                        type="button"
                        onClick={() => selectOccupation(occ)}
                        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-[#53917E]/10 first:rounded-t-xl last:rounded-b-xl"
                      >
                        <div>
                          <span className="text-xs font-semibold text-slate-500">
                            {occ.code}
                          </span>
                          <p className="mt-0.5 text-sm font-medium text-slate-900">{getLocalizedTitle(occ, locale)}</p>
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
                <div className="rounded-2xl border border-slate-200 bg-card p-6 shadow-sm">
                  {/* Occupation header */}
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        ANZSCO {selected.code}
                      </p>
                      <h2 className="mt-1 text-2xl font-bold text-slate-900">{getLocalizedTitle(selected, locale)}</h2>
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
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {t("sa.duties", "Key Duties")}
                      </p>
                      <ul className="mt-2 space-y-2">
                        {selected.duties.map((duty, idx) => (
                          <li key={idx} className="flex gap-2.5 text-sm leading-relaxed text-slate-600">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#53917E]" />
                            <span>{duty}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="my-5 h-px bg-slate-200" />

                  {/* Assessing body */}
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {t("sa.assessingBody", "Assessing Body")}
                      </p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">
                        {selectedBody.name}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">{selectedBody.description}</p>
                    </div>
                  </div>

                  {/* Fee + time */}
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <DollarSign className="h-5 w-5 shrink-0 text-emerald-400" />
                      <div>
                        <p className="text-xs font-medium text-slate-600">{t("sa.assessmentFee", "Assessment Fee")}</p>
                        <p className="mt-0.5 text-base font-bold text-slate-900">
                          {selectedBody.fee}
                        </p>
                        {selectedBody.feeNote && (
                          <p className="mt-1 text-xs leading-relaxed text-slate-600">{pickLocalized(selectedBody.feeNote, locale)}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <Clock className="h-5 w-5 shrink-0 text-slate-500" />
                      <div>
                        <p className="text-xs font-medium text-slate-600">{t("sa.processingTime", "Processing Time")}</p>
                        <p className="mt-0.5 text-base font-bold text-slate-900">
                          {pickLocalized(selectedBody.processingTime, locale)}
                        </p>
                        {selectedBody.processingNote && (
                          <p className="mt-1 text-xs leading-relaxed text-slate-600">{pickLocalized(selectedBody.processingNote, locale)}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {selectedBody.source && (
                    <p className="mt-2 text-xs text-slate-500">
                      {t("sa.source", "Source")}: {selectedBody.source}
                    </p>
                  )}

                  {/* Info box */}
                  <div className="mt-5 rounded-xl border border-[#53917E]/30 bg-[#53917E]/10 px-4 py-3">
                    <p className="text-xs font-semibold text-[#53917E]">{t("sa.whatIsTitle", "What is a skills assessment?")}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      {t("sa.whatIsText", "A skills assessment verifies that your overseas qualifications and work experience meet Australian standards for your nominated occupation. It is required before lodging most skilled migration visa applications.")}
                    </p>
                  </div>

                  {/* Buttons */}
                  <div className="mt-5 flex flex-wrap gap-3">
                    <a
                      href={selectedBody.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-xl bg-[#53917E] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#53917E]/90"
                    >
                      {t("sa.visitOfficialWebsite", "Visit Official Website")}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <Link
                      href={publicPath(locale, "/tools/points-calculator/australia")}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-card px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-[#53917E]/10"
                    >
                      {text("Calculate points", "Puan hesapla", "计算积分")}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>

                {/* ANZSCO finder nudge */}
                <div className="rounded-xl border border-slate-200 bg-card px-5 py-4 shadow-sm">
                  <p className="text-sm font-semibold text-slate-600">
                    {t("sa.anzscoNudgeTitle", "Not sure about your ANZSCO code?")}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {t("sa.anzscoNudgeText", "Use our ANZSCO Finder tool to identify your correct occupation code.")}
                  </p>
                  <Link
                    href={publicPath(locale, `/tools/anzsco-finder`)}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:underline"
                  >
                    {t("sa.openAnzscoFinder", "Open ANZSCO Finder")} <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
                <p className="font-semibold text-amber-700">
                  {t("sa.noMappingPrefix", "No assessing body mapped for")} {" "}
                  <span className="font-bold">{getLocalizedTitle(selected, locale)}</span> ({selected.code})
                </p>
                <p className="mt-1 text-sm text-amber-700/80">
                  {t("sa.noMappingText", "No verified mapping is held here. This is a coverage gap, not a conclusion about skills assessment or visa requirements. Consult the official occupation list.")}
                </p>
                <a
                  href="https://immi.homeaffairs.gov.au/visas/working-in-australia/skill-occupation-list"
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

        {selected && <ResearchLinks locale={locale} code={selected.code} links={[
          ...(selectedPage ? [{ label: text("Read occupation details", "Meslek bilgileri", "阅读职业详情"), path: `/occupations/${buildOccupationSlug(selectedPage)}`, destination: "anzsco_finder" }] : []),
          { label: text("Calculate points", "Puan hesapla", "计算积分"), path: "/tools/points-calculator/australia", destination: "points_calculator" },
          { label: text("Explore document checklist references", "Belge kontrol listesi kaynakları", "探索材料清单参考"), path: "/tools/document-checklist-2026", destination: "document_checklist" },
        ]} />}
        {query.trim() && !selected && suggestions.length === 0 && <p role="status" className="rounded-xl border border-slate-200 p-4 text-sm text-slate-600">{text("No matching record in this finder. Try another title or code, or use the official occupation list. Missing coverage does not determine visa or assessment requirements.", "Bu araçta eşleşen kayıt yok. Başka ad veya kod deneyin ya da resmî meslek listesine bakın. Veri eksikliği vize veya değerlendirme şartlarını belirlemez.", "本工具未找到匹配记录。请尝试其他名称或代码，或查阅官方职业清单。缺少数据不能确定签证或评估要求。")}</p>}
        {/* All assessing bodies grid */}
        <div>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">{t("sa.allBodies", "All Assessing Bodies")}</h2>
            {bodyFilter && (
              <button
                type="button"
                onClick={() => setBodyFilter(null)}
                className="text-xs font-semibold text-slate-500 hover:underline"
              >
                {t("sa.clearFilter", "Clear filter")}
              </button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(assessingBodies).filter(([key]) => bodyCounts[key] > 0).map(([key, body]) => {
              const count = bodyCounts[key] ?? 0;
              const isActive = bodyFilter === key;
              return (
                <div
                  key={key}
                  className={`rounded-xl border p-4 text-left transition ${
                    isActive
                      ? "border-[#53917E]/40 bg-[#53917E]/10 shadow-md"
                      : "border-slate-200 bg-card hover:border-[#53917E]/30 hover:bg-[#53917E]/10"
                  }`}
                >
                  <button type="button" onClick={() => setBodyFilter(isActive ? null : key)} aria-pressed={isActive} className="flex w-full items-start gap-3 text-left">
                    <span
                      className={`mt-0.5 h-3 w-3 shrink-0 rounded-full ${
                        DOT_MAP[body.color] ?? "bg-[#53917E]"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-bold text-slate-900">{body.shortName}</p>
                      <p className="mt-0.5 break-words text-xs text-slate-600">{body.name}</p>
                    </div>
                  </button>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-600">{count} {t("sa.occupations", "occupations")}</span>
                    <a
                      href={body.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:underline"
                    >
                      {t("sa.website", "Website")} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Filtered occupations */}
          {bodyFilter && filteredOccupations.length > 0 && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-card p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
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
                    className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-left transition hover:border-[#53917E]/30 hover:bg-[#53917E]/10"
                  >
                    <span className="text-xs font-bold text-slate-500">{occ.code}</span>
                    <span className="text-sm text-slate-600">{occ.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* FAQ */}
        <div className="rounded-2xl border border-slate-200 bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-slate-500" />
            <h2 className="text-lg font-bold text-slate-900">{t("sa.faqTitle", "Frequently Asked Questions")}</h2>
          </div>
          {FAQ_ITEMS.map((item) => (
            <FaqItem key={item.q} q={item.q} a={item.a} t={t} />
          ))}
        </div>

      </div>
    </main>
  );
}
