"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { ArrowRight, BadgeCheck, BriefcaseBusiness, Download, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/contexts/language-context";
import { PdfDownloadModal } from "@/components/PdfDownloadModal";
import anzscoList from "@/public/anzsco-list.json";

type Occupation = {
  code: string;
  title_en: string;
  title_tr?: string;
  title_zh?: string;
  keywords?: string[];
  skillLevel: number | string;
  duties_en: string[];
  duties_tr?: string[];
  duties_zh?: string[];
};

const OCCUPATIONS = anzscoList as Occupation[];

// Falls back to the canonical English title whenever a locale-specific
// translation hasn't been added yet for that occupation
function getLocalizedTitle(o: Occupation, locale: string): string {
  if (locale === "tr") return o.title_tr || o.title_en;
  if (locale === "zh-Hans") return o.title_zh || o.title_en;
  return o.title_en;
}

// Localized duties fall back to English until tr/zh duty translations are available
function getLocalizedDuties(o: Occupation, locale: string): string[] {
  if (locale === "tr" && o.duties_tr?.length) return o.duties_tr;
  if (locale === "zh-Hans" && o.duties_zh?.length) return o.duties_zh;
  return o.duties_en || [];
}
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
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

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
    return OCCUPATIONS.filter((o) => {
      const localizedTitle =
        locale === "tr" ? o.title_tr : locale === "zh-Hans" ? o.title_zh : undefined;
      const titleEn = o.title_en || "";
      const matchesKeywords = o.keywords?.some((kw) => kw.toLowerCase().includes(q)) ?? false;
      return (
        titleEn.toLowerCase().includes(q) ||
        localizedTitle?.toLowerCase().includes(q) ||
        o.code.toLowerCase().includes(q) ||
        matchesKeywords
      );
    });
  }, [popularOccupations, debouncedQuery, locale]);

  const hasSearch = query.trim().length > 0;
  const selectedOccupation =
    matches.find((o) => o.code === selectedCode) ?? matches[0] ?? null;

  return (
    <main className="min-h-screen bg-[var(--cf-bg)]">
      {/* Hero -- always-navy band (--cf-case-bg never flips with the page
          theme), matching the case-log entry cards' convention. */}
      <section className="relative overflow-hidden border-b border-[var(--cf-line)] bg-[var(--cf-case-bg)]">
        <div className="absolute inset-x-0 top-0 h-1 bg-[var(--cf-accent)]" />
        <div className="mx-auto flex min-h-[380px] max-w-6xl flex-col justify-center px-4 pb-20 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex rounded-sm border border-[var(--cf-flag-brass-bg)] bg-[var(--cf-flag-brass-bg)] px-4 py-2 text-sm font-semibold text-[var(--cf-flag-brass-fg)]">
              {t("af.badge")}
            </div>
            <h1 className="cf-serif text-4xl font-medium tracking-tight text-[var(--cf-case-fg)] sm:text-6xl">
              {t("af.title")}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--cf-case-muted)] sm:text-xl">
              {t("af.description")}
            </p>
          </div>
        </div>
      </section>

      {/* Search tool */}
      <div className="-mt-12">
        <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="rounded-sm border border-[var(--cf-cover-line)] bg-[var(--cf-cover-bg)] p-4 shadow-[0_24px_70px_-45px_var(--cf-shadow)] sm:p-6">
            <div className="relative">
              <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--cf-accent)]" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("af.searchPlaceholder")}
                className="h-16 rounded-sm border-[var(--cf-cover-line)] bg-[var(--cf-cover-bg-dim)] pl-14 pr-5 text-lg shadow-inner focus-visible:border-[var(--cf-accent)] focus-visible:ring-[var(--cf-accent-dim)]"
                aria-label={t("af.searchPlaceholder")}
              />
            </div>

            {/* Lead magnet: opens the lead-capture modal; the full official
                occupation list PDF is emailed after the form is submitted. */}
            <div className="mt-4 flex justify-center sm:justify-start">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setPdfModalOpen(true);
                }}
                className="group inline-flex items-center gap-2 rounded-sm border border-[var(--cf-accent)] bg-[var(--cf-accent)] px-5 py-3 text-sm font-semibold text-[var(--cf-bg-deep)] shadow-lg transition-all hover:opacity-90"
              >
                <Download className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
                {t("af.downloadOfficialPdf")}
              </button>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.5fr]">
              {/* Left: results list */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold uppercase tracking-wide text-[var(--cf-cover-muted)]">
                    {hasSearch
                      ? `${matches.length} ${t("af.matchingCount")}`
                      : t("af.popular")}
                  </p>
                  <p className="text-xs font-semibold text-[var(--cf-cover-muted)]">
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
                        className={`w-full rounded-sm border p-4 text-left transition-all ${
                          isSelected
                            ? "border-[var(--cf-accent)] bg-[var(--cf-accent-dim)] shadow-md"
                            : "border-[var(--cf-cover-line)] bg-[var(--cf-cover-bg)] hover:border-[var(--cf-accent-dim)] hover:bg-[var(--cf-cover-bg-dim)]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-[var(--cf-accent)]">{occ.code}</p>
                            <p className="mt-1 text-base font-bold text-[var(--cf-cover-fg)]">
                              {getLocalizedTitle(occ, locale)}
                            </p>
                          </div>
                          {occ.skillLevel ? (
                            <span className="rounded-full border border-[var(--cf-cover-line)] bg-[var(--cf-cover-bg)] px-3 py-1 text-xs font-semibold text-[var(--cf-cover-muted)] whitespace-nowrap">
                              Skill Level {occ.skillLevel}
                            </span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-sm border border-dashed border-[var(--cf-accent-dim)] bg-[var(--cf-cover-bg-dim)] p-6 shadow-inner">
                    <p className="text-base font-bold text-[var(--cf-cover-fg)]">{t("af.noResults.title")}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--cf-cover-muted)]">{t("af.noResults.subtitle")}</p>
                  </div>
                )}
              </div>

              {/* Right: occupation detail */}
              {selectedOccupation ? (
                <Card className="overflow-hidden rounded-sm border-[var(--cf-cover-line)] bg-[var(--cf-cover-bg)] shadow-[0_24px_70px_-45px_var(--cf-shadow)]">
                  <CardContent className="p-0">
                    <div className="border-b border-[var(--cf-line)] bg-[var(--cf-case-bg)] p-6 text-[var(--cf-case-fg)]">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--cf-flag-brass-fg)]">
                            ANZSCO {selectedOccupation.code}
                          </p>
                          <h2 className="cf-serif mt-2 text-2xl font-medium tracking-tight">
                            {getLocalizedTitle(selectedOccupation, locale)}
                          </h2>
                        </div>
                        {selectedOccupation.skillLevel ? (
                          <div className="rounded-full border border-[var(--cf-flag-brass-bg)] bg-[var(--cf-flag-brass-bg)] px-4 py-2 text-sm font-semibold text-[var(--cf-flag-brass-fg)] whitespace-nowrap">
                            Skill Level {selectedOccupation.skillLevel}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-sm border border-[var(--cf-cover-line)] bg-[var(--cf-cover-bg-dim)] p-4">
                          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--cf-cover-muted)]">
                            <BriefcaseBusiness className="h-4 w-4 text-[var(--cf-accent)]" />
                            {t("af.detail.code")}
                          </div>
                          <p className="mt-2 text-3xl font-bold text-[var(--cf-cover-fg)]">
                            {selectedOccupation.code}
                          </p>
                        </div>
                        <div className="rounded-sm border border-[var(--cf-cover-line)] bg-[var(--cf-cover-bg-dim)] p-4">
                          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--cf-cover-muted)]">
                            <BadgeCheck className="h-4 w-4 text-[var(--cf-accent)]" />
                            {t("af.detail.skillLevel")}
                          </div>
                          <p className="mt-2 text-3xl font-bold text-[var(--cf-cover-fg)]">
                            {selectedOccupation.skillLevel
                              ? `Skill Level ${selectedOccupation.skillLevel}`
                              : "—"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6">
                        <h3 className="cf-serif text-lg font-medium text-[var(--cf-cover-fg)]">{t("af.detail.tasks")}</h3>
                        <ul className="mt-4 space-y-3">
                          {getLocalizedDuties(selectedOccupation, locale).map((duty) => (
                            <li key={duty} className="flex gap-3 text-sm leading-6 text-[var(--cf-cover-muted)]">
                              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--cf-accent)]" />
                              <span>{duty}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-8 rounded-sm border border-[var(--cf-accent-dim)] bg-[var(--cf-cover-bg-dim)] p-6 shadow-inner">
                        <p className="text-xl font-bold leading-8 text-[var(--cf-cover-fg)]">
                          {t("af.cta.text")}{" "}
                          {getLocalizedTitle(selectedOccupation, locale)}.
                        </p>
                        <Button
                          asChild
                          size="lg"
                          className="mt-5 h-12 rounded-sm bg-[var(--cf-accent)] px-6 text-base text-[var(--cf-bg-deep)] shadow-lg hover:opacity-90"
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

      <PdfDownloadModal
        locale={locale}
        product="occupation"
        open={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
      />
    </main>
  );
}
