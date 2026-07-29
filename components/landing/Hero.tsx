"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { activeCountries, countryComplianceBadge, DISPLAY_START_SLOTS } from "@/lib/countries";

interface HeroProps {
  locale: string;
  t: (key: string) => string;
  assessmentSlotsLeft: number;
  hasFreeAssessmentSlots: boolean;
  onScrollToPdfSection: (event: MouseEvent<HTMLAnchorElement>) => void;
}

/**
 * Hero — "case file cover" concept (see design/logivisa_landing_redesign.html).
 * All copy/state/i18n logic is unchanged from the original home-content.tsx
 * hero block; only the visual language changed (serif headline, case-tag
 * eyebrow, brass CTA, cover-card preview panel instead of a stock hero image).
 */
export function Hero({ locale, t, assessmentSlotsLeft, hasFreeAssessmentSlots, onScrollToPdfSection }: HeroProps) {
  return (
    <section className="case-file relative overflow-hidden bg-[var(--cf-bg)] pb-20 pt-16 sm:pb-28 sm:pt-20">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="section-shell relative grid grid-cols-1 items-start gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
        <div>
          <a
            href="#pdf-download-section"
            onClick={onScrollToPdfSection}
            className="mb-5 flex w-fit max-w-full items-center gap-2 rounded-sm border border-[var(--cf-accent-dim)] px-4 py-2.5 text-sm font-medium text-[var(--cf-fg)] transition-colors hover:border-[var(--cf-accent)]"
          >
            {locale === "tr" ? (
              <>
                📘 Ücretsiz 80 Sayfalık Avustralya &amp; Kanada PR Kılavuzu 2026 Yayınlandı!{" "}
                <strong className="text-[var(--cf-accent)]">Hemen İndirin →</strong>
              </>
            ) : (
              <>
                📘 Free 80-Page Australia &amp; Canada PR Guide 2026 is now available!{" "}
                <strong className="text-[var(--cf-accent)]">Get Free Copy →</strong>
              </>
            )}
          </a>

          <div className="cf-mono mb-6 inline-flex items-center gap-2 rounded-sm border border-[var(--cf-accent-dim)] px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.12em] text-[var(--cf-accent)]">
            <span aria-hidden className="text-[0.55rem] text-[#B1502E]">
              ●
            </span>
            {t("hero.trustBadge")}
          </div>

          <h1 className="cf-serif max-w-[16ch] text-4xl font-medium leading-[1.08] tracking-tight text-[var(--cf-fg)] sm:text-5xl lg:text-6xl">
            {t("hero.headline")}
          </h1>

          <p className="mt-6 max-w-[46ch] text-lg text-[var(--cf-muted)]">{t("hero.subheadline")}</p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={`/${locale}/full-check?country=AU`}
              className="inline-flex items-center justify-center gap-2 rounded-sm bg-[var(--cf-accent)] px-8 py-4 text-base font-semibold text-[var(--cf-bg-deep)] shadow-[0_20px_40px_-15px_var(--cf-shadow)] transition-transform hover:-translate-y-0.5"
            >
              {t("hero.btnAustralia")} <span aria-hidden>→</span>
            </Link>
            <Link
              href={`/${locale}/full-check?country=CA`}
              className="inline-flex items-center justify-center gap-2 rounded-sm border border-[var(--cf-line)] px-8 py-4 text-base font-semibold text-[var(--cf-fg)] transition-colors hover:border-[var(--cf-fg)]"
            >
              {t("hero.btnCanada")} <span aria-hidden>→</span>
            </Link>
          </div>

          {hasFreeAssessmentSlots && (
            <p className="cf-mono mt-6 max-w-[52ch] text-xs leading-relaxed text-[var(--cf-accent)]">
              {locale === "tr" ? (
                <>
                  İki ülke için ortak — bugün sadece{" "}
                  <span className="line-through opacity-60">{DISPLAY_START_SLOTS}</span>{" "}
                  <strong className="text-sm">{assessmentSlotsLeft}</strong> ücretsiz analiz hakkı kaldı. (Normalde
                  $49 — ücretsiz haklar bittiğinde bu fiyata döner.)
                </>
              ) : locale === "zh-Hans" ? (
                <>
                  两国共享 — 今日仅剩 <span className="line-through opacity-60">{DISPLAY_START_SLOTS}</span>{" "}
                  <strong className="text-sm">{assessmentSlotsLeft}</strong> 个免费评估名额。（原价 $49 —
                  免费名额用尽后将恢复原价）
                </>
              ) : (
                <>
                  Shared across both countries — only{" "}
                  <span className="line-through opacity-60">{DISPLAY_START_SLOTS}</span>{" "}
                  <strong className="text-sm">{assessmentSlotsLeft}</strong> free assessment slots left. (Normally
                  $49 — reverts to this price once free slots run out.)
                </>
              )}
            </p>
          )}

          <div className="cf-mono mt-10 flex flex-wrap gap-x-7 gap-y-3 text-xs text-[var(--cf-muted)]">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--cf-accent)]" />
              {t("socialProof.users")}
            </div>
            {activeCountries.map((code) => (
              <div key={code} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--cf-accent)]" />
                {countryComplianceBadge[code][locale === "tr" ? "tr" : locale === "zh-Hans" ? "zh-Hans" : "en"]}
              </div>
            ))}
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--cf-accent)]" />
              {t("socialProof.dha")}
            </div>
          </div>
        </div>

        {/* Cover-card: an anonymized preview of the report's shape, not a
            fabricated persona -- avoids duplicating the real case studies
            further down the page with a fake "sample customer". */}
        <div
          className="relative -rotate-1 rounded-sm bg-[var(--cf-cover-bg)] p-8 text-[var(--cf-cover-fg)] shadow-[0_30px_60px_-20px_var(--cf-shadow)]"
        >
          <div className="pointer-events-none absolute inset-2.5 border border-[var(--cf-cover-line)]" />
          <div className="cf-mono flex items-center justify-between text-[0.65rem] uppercase tracking-[0.08em] text-[var(--cf-cover-muted)]">
            <span>
              {locale === "tr" ? "Uygunluk Raporu · Önizleme" : locale === "zh-Hans" ? "资格报告 · 预览" : "Readiness Report · Preview"}
            </span>
            <span>AU / 189-190-491</span>
          </div>

          <h3 className="cf-serif mt-6 text-2xl font-semibold">
            {locale === "tr" ? "Sizin Dosyanız" : locale === "zh-Hans" ? "您的案卷" : "Your File"}
          </h3>
          <p className="mt-1 text-sm text-[var(--cf-cover-muted)]">
            {locale === "tr"
              ? "Profil ve meslek girildikten sonra doldurulur"
              : locale === "zh-Hans"
                ? "填写档案与职业信息后生成"
                : "Fills in once you submit your profile & occupation"}
          </p>

          <div className="mt-5 space-y-0">
            {[
              [
                locale === "tr" ? "Meslek Kodu" : locale === "zh-Hans" ? "职业代码" : "Occupation Code",
                locale === "tr" ? "—" : "—",
              ],
              [
                locale === "tr" ? "İngilizce Kanıtı" : locale === "zh-Hans" ? "英语证明" : "English Evidence",
                "—",
              ],
              [locale === "tr" ? "Puan (tahmini)" : locale === "zh-Hans" ? "预估分数" : "Points (est.)", "—"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex justify-between border-b border-dashed border-[var(--cf-cover-line)] py-2.5 text-sm"
              >
                <span className="text-[var(--cf-cover-muted)]">{label}</span>
                <span className="cf-mono text-[0.85rem] font-semibold">{value}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between bg-[color-mix(in_srgb,var(--cf-cover-fg)_6%,transparent)] px-4 py-3.5">
            <span className="cf-mono text-[0.68rem] uppercase tracking-[0.08em] text-[var(--cf-cover-muted)]">
              {locale === "tr" ? "Eşleşme Olasılığı" : locale === "zh-Hans" ? "匹配概率" : "Match Probability"}
            </span>
            <span className="cf-serif text-2xl font-semibold text-[#B98A4A]">?</span>
          </div>
        </div>
      </div>
    </section>
  );
}
