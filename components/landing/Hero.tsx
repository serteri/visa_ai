"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { toast } from "sonner";
import { activeCountries, countryComplianceBadge } from "@/lib/countries";

/**
 * Hero — search-first, Google-like landing hero (redesign).
 *
 * Big serif headline, a single wide search bar over the full ANZSCO
 * occupation index (lazily imported so it never bloats the initial bundle),
 * quick-occupation pills, and the trust/scarcity strip underneath. Searching
 * flows into the existing ANZSCO Finder (`/tools/anzsco-finder?q=...`), which
 * already renders code, skill level, duties and the full-check CTA.
 */
interface HeroProps {
  locale: string;
  onScrollToPdfSection?: (event: MouseEvent<HTMLAnchorElement>) => void;
}

type Occupation = {
  code: string;
  title_en: string;
  title_tr?: string;
  title_zh?: string;
  keywords?: string[];
  /** true if the occupation is eligible for skilled migration */
  isEligibleForMigration?: boolean;
};

const QUICK_PILLS = [
  "Software Engineer",
  "Chef",
  "Motor Mechanic",
  "Registered Nurse",
];

export function Hero({ locale, onScrollToPdfSection }: HeroProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Occupation[]>([]);
  const [open, setOpen] = useState(false);
  const [targetCountry, setTargetCountry] = useState<"au" | "ca">("au");
  const searchRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<Occupation[] | null>(null);

  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";

  const localize = (o: Occupation) =>
    isTr ? o.title_tr || o.title_en : isZh ? o.title_zh || o.title_en : o.title_en;

  // Lazy-load the full occupation index on first keystroke so the homepage
  // bundle stays lean. All 1,400+ occupations are searched; those with
  // isEligibleForMigration=false render muted with a "Not on Skilled List"
  // badge and are blocked from flowing into the migration funnel.
  useEffect(() => {
    if (query.trim().length === 0) {
      setResults([]);
      setOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      if (!listRef.current) {
        const mod = await import("@/src/data/occupations.json");
        const raw = (mod.default ?? mod) as {
          occupations?: Array<{
            anzsco_code: string;
            occupation_name: string;
            isEligibleForMigration?: boolean;
            keywords?: string[];
          }>;
        };
        const src = Array.isArray(raw) ? raw : raw.occupations ?? [];
        listRef.current = src.map((o) => ({
          code: o.anzsco_code,
          title_en: o.occupation_name,
          keywords: o.keywords,
          isEligibleForMigration: o.isEligibleForMigration,
        }));
      }
      const q = query.trim().toLowerCase();
      const rawMatches = listRef.current.filter((o) => {
        const titles = [
          o.title_en,
          isTr ? o.title_tr : isZh ? o.title_zh : undefined,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const kw = (o.keywords ?? []).join(" ").toLowerCase();
        return titles.includes(q) || o.code.includes(q) || kw.includes(q);
      });

      // Smart deduplication: if a职业 name has both eligible and non-eligible
      // versions (e.g. old ANZSCO code vs new), keep ONLY the eligible one.
      const titleHasEligible = new Set<string>();
      for (const o of rawMatches) {
        if (o.isEligibleForMigration === true) {
          titleHasEligible.add(o.title_en.toLowerCase());
        }
      }
      const matches = rawMatches
        .filter((o) => {
          if (o.isEligibleForMigration === false && titleHasEligible.has(o.title_en.toLowerCase())) {
            return false; // drop duplicate non-eligible entry
          }
          return true;
        })
        .slice(0, 8);
      setResults(matches);
      setOpen(true);
    }, 180);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Close the suggestion dropdown on outside click.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | globalThis.MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const goToOccupation = (code: string) => {
    router.push(`/${locale}/tools/anzsco-finder?q=${encodeURIComponent(code)}&country=${targetCountry}`);
  };

  /**
   * Entry point for every occupation picked from the suggestion dropdown.
   * Occupations flagged `isEligibleForMigration=false` are NOT on the current
   * skilled migration lists: the forward flow is blocked (no navigation into
   * the ANZSCO Finder / skills-assessment / points steps) and a warning toast
   * explains why.
   */
  const selectOccupation = (occ: Occupation | null | undefined) => {
    if (!occ?.code) return;
    if (occ.isEligibleForMigration === false) {
      toast.warning(
        isTr
          ? "Seçtiğiniz meslek şu anki Avustralya göçmenlik listelerinde bulunmamaktadır"
          : isZh
            ? "您选择的职业目前不在澳大利亚技术移民职业清单上"
            : "Your selected occupation is not currently on Australia's skilled migration lists",
        { duration: 5000 }
      );
      return;
    }
    goToOccupation(occ.code);
  };

  const headline = isTr
    ? "Avustralya Göçmenlik Sürecinizi Saniyeler İçinde Keşfedin"
    : isZh
      ? "几秒内发现您的澳大利亚移民路径"
      : "Discover Your Australia Migration Path in Seconds";

  const subheadline = isTr
    ? "Mesleğinizi aratın, vize uyumluluğunuzu ve özel değerlendirme kurumunuzu anında öğrenin."
    : isZh
      ? "搜索您的职业，立即了解您的签证资格与对应的官方评估机构。"
      : "Search your occupation and instantly learn your visa eligibility and dedicated assessing authority.";

  const placeholder = isTr
    ? "Örn: Software Engineer, Chef, Mechanic..."
    : isZh
      ? "例如：软件工程师、厨师、机械师…"
      : "e.g. Software Engineer, Chef, Mechanic...";

  const searchNote = useMemo(() => {
    const q = query.trim();
    if (open && q && results.length > 0) {
      return isTr
        ? `${results.length} eşleşen meslek bulundu`
        : isZh
          ? `找到 ${results.length} 个匹配职业`
          : `${results.length} matching occupations`;
    }
    return isTr
      ? "1.400'den fazla ANZSCO mesleği içinde arama yapın"
      : isZh
        ? "搜索 1,400+ 个 ANZSCO 职业"
        : "Search across 1,400+ ANZSCO occupations";
  }, [open, query, results.length, isTr, isZh]);

  return (
    <section className="case-file relative overflow-hidden bg-[var(--cf-bg)] pb-20 pt-16 sm:pb-24 sm:pt-20">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="section-shell relative mx-auto flex max-w-3xl flex-col items-center text-center">
        {/* 2026 guide banner — kept as a slim lead-magnet strip */}
        {onScrollToPdfSection ? (
          <a
            href="#pdf-download-section"
            onClick={onScrollToPdfSection}
            className="mb-8 inline-flex max-w-full items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/5 px-4 py-2 text-sm font-medium text-[var(--cf-fg)] transition-all hover:border-amber-500/60 hover:bg-amber-500/10"
          >
            {isTr ? (
              <>
                <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">YENİ</span>
                Ücretsiz 80 Sayfalık Avustralya &amp; Kanada PR Kılavuzu 2026
                <span aria-hidden>→</span>
              </>
            ) : isZh ? (
              <>
                <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">2026</span>
                免费 80 页澳大利亚 &amp; 加拿大 PR 指南 2026
                <span aria-hidden>→</span>
              </>
            ) : (
              <>
                <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">2026</span>
                Free 80-Page Australia &amp; Canada PR Guide 2026
                <span aria-hidden>→</span>
              </>
            )}
          </a>
        ) : null}

        <h1 className="cf-serif max-w-[18ch] text-4xl font-medium leading-[1.08] tracking-tight text-[var(--cf-fg)] sm:text-5xl lg:text-6xl">
          {headline}
        </h1>

        <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-[var(--cf-muted)] sm:text-xl">
          {subheadline}
        </p>

        {/* Wide search bar — Google-style, results flow into ANZSCO Finder */}
        <div ref={searchRef} className="relative mt-10 w-full max-w-2xl">
          <div className="relative">
            <Search className="pointer-events-none absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--cf-accent)]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const target = results[0] ?? { code: query.trim() };
                  if (target.code) selectOccupation(target);
                }
              }}
              placeholder={placeholder}
              aria-label={placeholder}
              className="h-16 w-full rounded-full border border-[var(--cf-line)] bg-[var(--cf-cover-bg)] pl-14 pr-14 text-base text-white shadow-[0_18px_50px_-30px_var(--cf-shadow)] outline-none transition-all placeholder:text-slate-400 focus:border-[var(--cf-accent-dim)] focus:ring-2 focus:ring-[var(--cf-accent-dim)] sm:text-lg"
            />
            <kbd className="cf-mono pointer-events-none absolute right-6 top-1/2 hidden -translate-y-1/2 rounded border border-[var(--cf-line)] px-2 py-0.5 text-[0.65rem] text-[var(--cf-muted)] sm:block">
              ↵
            </kbd>
          </div>

          {open && results.length > 0 ? (
            <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-40 overflow-hidden rounded-2xl border border-[var(--cf-line)] bg-[var(--cf-cover-bg)] shadow-2xl shadow-[var(--cf-shadow)]">
              {results.map((o) => {
                const ineligible = o.isEligibleForMigration === false;
                return (
                  <button
                    key={o.code}
                    type="button"
                    onClick={() => selectOccupation(o)}
                    className={`flex w-full items-center justify-between gap-4 border-b border-[var(--cf-line)] px-5 py-3.5 text-left transition-colors last:border-0 hover:bg-[var(--cf-accent)]/10 ${
                      ineligible ? "opacity-50" : ""
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-medium text-[var(--cf-cover-fg)]">
                        {localize(o)}
                      </span>
                      {ineligible ? (
                        <span className="shrink-0 rounded-full border border-[var(--cf-line)] bg-[var(--cf-bg-deep)] px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--cf-muted)]">
                          {isTr
                            ? "Skilled List'te Değil"
                            : isZh
                              ? "不在技术移民清单上"
                              : "Not on Skilled List"}
                        </span>
                      ) : null}
                    </span>
                    <span className="cf-mono shrink-0 text-xs text-[var(--cf-accent)]">{o.code}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  const top = results[0] ?? null;
                  if (top && top.isEligibleForMigration === false) {
                    selectOccupation(top);
                    return;
                  }
                  goToOccupation(query.trim());
                }}
                className="flex w-full items-center justify-center gap-2 bg-[var(--cf-case-bg)] px-5 py-3.5 text-sm font-semibold text-[var(--cf-case-fg)] transition-colors hover:bg-[var(--cf-bg-deep)]"
              >
                {isTr ? "Tüm sonuçları gör" : isZh ? "查看全部结果" : "View all results"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          <p className="cf-mono mt-4 text-[0.7rem] uppercase tracking-[0.12em] text-[var(--cf-muted)]">
            {searchNote}
          </p>
        </div>

        {/* Quick-occupation pills */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--cf-muted)]">
            {isTr ? "Popüler:" : isZh ? "热门：" : "Popular:"}
          </span>
          {QUICK_PILLS.map((pill) => (
            <button
              key={pill}
              type="button"
              // Navigates immediately (carrying the currently-selected
              // targetCountry) rather than only pre-filling the search box --
              // a quick pill is a shortcut past typing, not a second step
              // that still requires pressing Enter.
              onClick={() => goToOccupation(pill)}
              className="cursor-pointer rounded-full border border-[var(--cf-line)] px-3.5 py-1.5 text-xs font-medium text-[var(--cf-muted)] transition-all duration-200 hover:border-[var(--cf-accent-dim)] hover:text-[var(--cf-accent)]"
            >
              {pill}
            </button>
          ))}
        </div>

        {/* Upfront pricing badge -- the "Assessment Intake: Open (Limited
            Capacity)" badge that used to sit above this one was removed: it
            implied a free, capacity-gated intake, which contradicted this
            badge's own "Premium" pricing message directly below it and read
            as a bait-and-switch once a visitor reached the paid checkout.
            One badge, one unambiguous message: the price, stated before the
            visitor starts the assessment. */}
        <div className="mt-8 inline-flex items-center gap-2.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-4 py-2">
          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
            {isTr
              ? "Premium AI Hazırlık Analizi – 49$"
              : isZh
                ? "高级 AI 准备度分析 – $49"
                : "Premium AI Readiness Analysis – $49"}
          </span>
        </div>

        {/* Target country toggle -- replaces the previous "AU Assessment" /
            "CA Assessment" buttons, which read as two competing calls to
            action and confused visitors about which one to press. This is
            a single, unambiguous choice that scopes whichever search the
            visitor is about to run (or has just run), not a second entry
            point into the funnel.

            `relative z-20` on the wrapper is defensive: nothing in this
            section currently overlaps it (verified -- the noise-texture
            background at the top of this component is `pointer-events-none`
            and the search-suggestions dropdown is a sibling earlier in the
            DOM, not a positioned ancestor), but a toggle a user reported as
            "dead" is cheap insurance against any future absolutely-positioned
            decoration landing on top of it. */}
        <div className="relative z-20 mt-4 flex flex-col items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--cf-muted)]">
            {isTr ? "Hedef Ülke" : isZh ? "目标国家" : "Target Country"}
          </span>
          <div
            role="group"
            aria-label={isTr ? "Hedef ülke" : isZh ? "目标国家" : "Target country"}
            className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-[var(--cf-line)] bg-[var(--cf-cover-bg)] p-1"
          >
            {(["au", "ca"] as const).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setTargetCountry(code)}
                aria-pressed={targetCountry === code}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-5 py-2 text-sm transition-all duration-200 ${
                  targetCountry === code
                    ? "scale-105 transform bg-[#d8a65c] font-bold text-[#0f1e33] shadow-md"
                    : "bg-transparent font-semibold text-[var(--cf-muted)] opacity-50 hover:opacity-100"
                }`}
              >
                <span className="text-base">{code === "au" ? "🇦🇺" : "🇨🇦"}</span>
                {code === "au"
                  ? isTr
                    ? "Avustralya"
                    : isZh
                      ? "澳大利亚"
                      : "Australia"
                  : isTr
                    ? "Kanada"
                    : isZh
                      ? "加拿大"
                      : "Canada"}
              </button>
            ))}
          </div>
        </div>

        {/* Trust strip */}
        <div className="cf-mono mt-10 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-xs text-[var(--cf-muted)]">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--cf-accent)]" />
            {isTr ? "5.000+ Değerlendirme" : isZh ? "5,000+ 次评估" : "5,000+ Assessments"}
          </span>
          {activeCountries.map((code) => (
            <span key={code} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--cf-accent)]" />
              {countryComplianceBadge[code][isTr ? "tr" : isZh ? "zh-Hans" : "en"]}
            </span>
          ))}
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--cf-accent)]" />
            {isTr
              ? "İçişleri Bakanlığı Uyumlu"
              : isZh
                ? "内政部合规"
                : "Home Affairs Compliant"}
          </span>
        </div>
      </div>
    </section>
  );
}
