"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { activeCountries, countryComplianceBadge } from "@/lib/countries";
import { useTranslation } from "@/contexts/language-context";

/**
 * Hero — search-first, Google-like landing hero (redesign).
 *
 * Big serif headline, a single wide search bar over the full ANZSCO
 * occupation index (lazily imported so it never bloats the initial bundle),
 * quick-occupation pills, and the trust/scarcity strip underneath. Every
 * search/select/toggle action routes straight into `/full-check` (the
 * readiness-report intake form), not the ANZSCO Finder tool -- prefilling
 * its `occupation` and `country` query params (see
 * app/[locale]/(main)/full-check/page.tsx's searchParams shape; note the
 * param is `occupation`, not `q`).
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

// `code` stays the English occupation title -- it's passed straight through
// to goToOccupation() as the `occupation` query param that prefills the
// intake form's free-text search, so it must match the canonical English
// term the ANZSCO lookup expects. `label` is what's actually displayed and
// is localized.
const QUICK_PILLS: Array<{ code: string; label: { en: string; tr: string; "zh-Hans": string } }> = [
  { code: "Software Engineer", label: { en: "Software Engineer", tr: "Yazılım Mühendisi", "zh-Hans": "软件工程师" } },
  { code: "Chef", label: { en: "Chef", tr: "Şef", "zh-Hans": "厨师" } },
  { code: "Motor Mechanic", label: { en: "Motor Mechanic", tr: "Oto Tamircisi", "zh-Hans": "汽车维修技工" } },
  { code: "Registered Nurse", label: { en: "Registered Nurse", tr: "Hemşire", "zh-Hans": "注册护士" } },
];

export function Hero({ locale, onScrollToPdfSection }: HeroProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Occupation[]>([]);
  const [open, setOpen] = useState(false);
  const [targetCountry, setTargetCountry] = useState<"au" | "ca">("au");
  const searchRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<Occupation[] | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  // useTransition's isPending, not a manually-tracked boolean: router.push
  // doesn't return a promise that resolves on navigation completion, but
  // wrapping it in startTransition gives an accurate "still navigating"
  // signal from React itself, including staying true through the target
  // route's server render.
  const [isNavigatingCountry, startCountryNavigation] = useTransition();

  // Headline/subheadline fade-slide crossfade on country change: drop
  // opacity immediately, then fade back in on the next frame. Triggered
  // directly from the click handler (not a useEffect watching
  // targetCountry) so the setState calls happen in an event handler, not
  // an effect body -- avoids a cascading-render footgun for no benefit,
  // since this is already the moment user intent is known.
  const [textVisible, setTextVisible] = useState(true);

  /**
   * Clicking AU/CA used to only flip local UI state (toggle color, headline/
   * placeholder copy) with no actual navigation -- it felt like a dead
   * button because nothing on the page ever *happened*. Now it immediately
   * routes into the ANZSCO Finder scoped to the chosen country, carrying
   * whatever's currently typed in the search box (or nothing, which
   * AnzscoSearchTool already handles by falling back to a default
   * occupation rather than a blank page).
   */
  function selectTargetCountry(code: "au" | "ca") {
    setTargetCountry(code);
    setTextVisible(false);
    // setTimeout, not requestAnimationFrame: rAF only fires on an actual
    // paint, which a backgrounded/non-visible tab can suspend indefinitely
    // (confirmed while testing this in a headless browser context) --
    // setTimeout still fires regardless of tab visibility, so the fade-in
    // reliably completes instead of getting stuck at opacity-0.
    setTimeout(() => setTextVisible(true), 20);
    // Auto-focus the search input so the next action (searching) is
    // obvious -- the user just told us which country, searching is the
    // natural next step.
    searchInputRef.current?.focus();

    const trimmed = query.trim();
    const params = new URLSearchParams({ country: code });
    // "occupation", not "q" -- that's the param full-check/page.tsx's
    // searchParams actually reads to prefill the intake form.
    if (trimmed) params.set("occupation", trimmed);
    startCountryNavigation(() => {
      router.push(`/${locale}/full-check?${params.toString()}`);
    });
  }

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
    // "occupation", not "q" -- full-check/page.tsx's searchParams reads
    // `occupation` to prefill the intake form; `q` would be silently ignored.
    router.push(`/${locale}/full-check?occupation=${encodeURIComponent(code)}&country=${targetCountry}`);
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

  // Country-dependent copy -- sourced from public/locales/{locale}.json
  // (home.hero.*), not hardcoded, so it's translated per-locale AND swaps
  // per-country from the same key namespace.
  const headline = t(
    `home.hero.headline.${targetCountry}`,
    targetCountry === "ca"
      ? "Discover Your Canada Migration Path in Seconds"
      : "Discover Your Australia Migration Path in Seconds"
  );

  const subheadline = t(
    `home.hero.subheadline.${targetCountry}`,
    targetCountry === "ca"
      ? "Search your occupation and instantly learn your NOC eligibility and Express Entry pathway."
      : "Search your occupation and instantly learn your visa eligibility and dedicated assessing authority."
  );

  const placeholder = t(
    `home.hero.placeholder.${targetCountry}`,
    targetCountry === "ca" ? "e.g. Software Engineer, Chef, NOC 21231..." : "e.g. Software Engineer, Chef, Mechanic..."
  );

  const searchNote = useMemo(() => {
    const q = query.trim();
    if (open && q && results.length > 0) {
      return isTr
        ? `${results.length} eşleşen meslek bulundu`
        : isZh
          ? `找到 ${results.length} 个匹配职业`
          : `${results.length} matching occupations`;
    }
    return t(
      `home.hero.searchNoteDefault.${targetCountry}`,
      targetCountry === "ca" ? "Search across Canadian NOC occupations" : "Search across 1,400+ ANZSCO occupations"
    );
  }, [open, query, results.length, isTr, isZh, targetCountry, t]);

  return (
    <section className="case-file relative overflow-hidden bg-[var(--cf-bg)] pb-24 pt-20 sm:pb-32 sm:pt-28">
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
            className="mb-8 inline-flex max-w-full items-center gap-2 rounded-full border border-[#53917E]/30 bg-[#53917E]/5 px-4 py-2 text-sm font-medium text-[var(--cf-fg)] transition-all hover:border-[#53917E]/60 hover:bg-[#53917E]/10"
          >
            {isTr ? (
              <>
                <span className="rounded bg-[#53917E] px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">YENİ</span>
                Ücretsiz 80 Sayfalık Avustralya &amp; Kanada PR Kılavuzu 2026
                <span aria-hidden>→</span>
              </>
            ) : isZh ? (
              <>
                <span className="rounded bg-[#53917E] px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">2026</span>
                免费 80 页澳大利亚 &amp; 加拿大 PR 指南 2026
                <span aria-hidden>→</span>
              </>
            ) : (
              <>
                <span className="rounded bg-[#53917E] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">2026</span>
                Free 80-Page Australia &amp; Canada PR Guide 2026
                <span aria-hidden>→</span>
              </>
            )}
          </a>
        ) : null}

        <h1
          className={`cf-serif max-w-[18ch] text-4xl font-medium leading-[1.08] tracking-tight text-[var(--cf-fg)] transition-all duration-300 ease-out sm:text-5xl lg:text-6xl ${
            textVisible ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
          }`}
        >
          {headline}
        </h1>

        <p
          className={`mt-6 max-w-[52ch] text-lg leading-relaxed text-[var(--cf-muted)] transition-all duration-300 ease-out sm:text-xl ${
            textVisible ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
          }`}
        >
          {subheadline}
        </p>

        {/* Wide search bar — Google-style, results flow into ANZSCO Finder */}
        <div ref={searchRef} className="relative mt-12 w-full max-w-2xl">
          <div className="relative">
            {isNavigatingCountry ? (
              <Loader2 className="pointer-events-none absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-[var(--cf-accent)]" />
            ) : (
              <Search className="pointer-events-none absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--cf-accent)]" />
            )}
            <input
              ref={searchInputRef}
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
              className="h-16 w-full rounded-full border border-[var(--cf-line)] bg-[var(--cf-cover-bg)] pl-14 pr-14 text-base text-slate-900 shadow-[0_18px_50px_-30px_var(--cf-shadow)] outline-none transition-all placeholder:text-slate-500 focus:border-[var(--cf-accent-dim)] focus:ring-2 focus:ring-[var(--cf-accent-dim)] sm:text-lg"
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
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--cf-muted)]">
            {isTr ? "Popüler:" : isZh ? "热门：" : "Popular:"}
          </span>
          {QUICK_PILLS.map((pill) => (
            <button
              key={pill.code}
              type="button"
              // Navigates immediately (carrying the currently-selected
              // targetCountry) rather than only pre-filling the search box --
              // a quick pill is a shortcut past typing, not a second step
              // that still requires pressing Enter.
              onClick={() => goToOccupation(pill.code)}
              className="cursor-pointer rounded-full border border-[var(--cf-line)] px-3.5 py-1.5 text-xs font-medium text-[var(--cf-muted)] transition-all duration-200 hover:border-[var(--cf-accent-dim)] hover:text-[var(--cf-accent)]"
            >
              {pill.label[locale as "en" | "tr" | "zh-Hans"] ?? pill.label.en}
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
        <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-[#53917E]/40 bg-[#53917E]/10 px-5 py-2 text-sm font-medium text-[#53917E] shadow-[0_0_20px_-4px_rgba(83,145,126,0.5)]">
          <span>
            {t(
              "hero.pricingBadgePrefix",
              isTr
                ? "Premium AI Hazırlık Analizi —"
                : isZh
                  ? "高级 AI 准备度分析 —"
                  : "Premium AI Readiness Analysis —"
            )}
          </span>
          <span className="font-bold text-slate-900">
            {t("hero.pricingBadgePrice", isTr ? "Sadece 49$" : isZh ? "仅需 $49" : "Only $49")}
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
        <div className="relative z-20 mt-6 flex flex-col items-center gap-3">
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
                onClick={() => selectTargetCountry(code)}
                disabled={isNavigatingCountry}
                aria-pressed={targetCountry === code}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-6 py-2.5 text-sm transition-all duration-200 disabled:cursor-wait ${
                  targetCountry === code
                    ? "scale-105 transform bg-[#d8a65c] font-bold text-[#0f1e33] shadow-md"
                    : "bg-transparent font-semibold text-[var(--cf-muted)] opacity-50 hover:opacity-100"
                }`}
              >
                {isNavigatingCountry && targetCountry === code ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="text-base">{code === "au" ? "🇦🇺" : "🇨🇦"}</span>
                )}
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
        <div className="cf-mono mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-xs text-[var(--cf-muted)]">
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
