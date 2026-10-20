"use client";

import { useState, type ReactNode } from "react";
import { ClipboardCheck, ClipboardList, DollarSign, FileText, ListChecks, type LucideIcon } from "lucide-react";

import { useLanguage, useTranslation } from "@/contexts/language-context";
import { researchText } from "@/lib/marketing/research-journey";

type FeatureKey = "cover" | "summary" | "glance" | "requirements" | "costs";

// Pages of the CURRENT information report, rendered from a synthetic profile with a placeholder name and the target visa "not_sure" by
// scripts/render-showcase-images.ts (public/images/report-previews/<locale>/<key>.png). The old screenshots of the previous report layout are
// gone: scripts/test-showcase-images.ts fails if any removed asset is referenced again.
const FEATURES: Array<{ key: FeatureKey; icon: LucideIcon }> = [
  { key: "cover", icon: FileText },
  { key: "summary", icon: ClipboardList },
  { key: "glance", icon: ListChecks },
  { key: "requirements", icon: ClipboardCheck },
  { key: "costs", icon: DollarSign },
];
const IMAGE_LOCALES = ["en", "tr", "zh-Hans"] as const;

/**
 * The real report-page gallery. mode "tabs" (homepage): feature list on the left, the selected report page on the right, stacking on mobile.
 * mode "sequence" (/sample-report): the four pages one after the other at a readable size, each linking to its full-size image.
 * Every string comes from public/locales/{locale}.json via useTranslation(), keyed under "home.reportShowcase.*"; `intro` is the section's
 * heading / price / call-to-action block, which the page supplies.
 */
export function PremiumReportShowcase({ intro, mode = "tabs" }: { intro?: ReactNode; mode?: "tabs" | "sequence" }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const imageLocale = (IMAGE_LOCALES as readonly string[]).includes(language) ? language : "en";
  const [activeKey, setActiveKey] = useState<FeatureKey>(FEATURES[0].key);
  const active = FEATURES.find((f) => f.key === activeKey) ?? FEATURES[0];
  const fictional = researchText(language, "Example report — fictional information", "Örnek rapor — kurgusal bilgiler", "示例报告 — 虚构信息");
  const fullSize = researchText(language, "Open full size", "Tam boyutta aç", "查看原图");
  const sampleNote = t("home.reportShowcase.sampleNote", "Pages from a sample report with a placeholder name. Information only, not migration advice.");
  const badge = (
    <span data-sample-label className="inline-flex rounded-full bg-[var(--cf-accent-dim)] px-3 py-1 text-xs font-semibold text-[var(--cf-accent)]">
      {fictional}
    </span>
  );

  if (mode === "sequence") {
    return (
      <div data-report-gallery="sequence">
        {intro}
        <div className="mt-6">{badge}</div>
        <ol className="mt-6 space-y-12">
          {FEATURES.map((feature, index) => {
            const src = `/images/report-previews/${imageLocale}/${feature.key}.png`;
            return (
              <li key={feature.key}>
                <h2 className="cf-serif text-xl text-[var(--cf-fg)]">
                  <span className="cf-mono mr-3 text-sm text-[var(--cf-accent)]">0{index + 1}</span>
                  {t(`home.reportShowcase.features.${feature.key}.title`, feature.key)}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--cf-muted)]">{t(`home.reportShowcase.features.${feature.key}.description`, "")}</p>
                <a href={src} target="_blank" rel="noopener noreferrer" className="mt-4 block overflow-hidden rounded-xl border border-[var(--cf-line)] bg-white" aria-label={`${t(`home.reportShowcase.features.${feature.key}.title`, feature.key)} — ${fullSize}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- a static report page of varying height; shown at its natural ratio */}
                  <img src={src} alt={t(`home.reportShowcase.features.${feature.key}.title`, feature.key)} loading={index === 0 ? "eager" : "lazy"} className="h-auto w-full" />
                </a>
                <a href={src} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-medium text-[var(--cf-accent)] underline underline-offset-4">{fullSize} →</a>
              </li>
            );
          })}
        </ol>
        <p className="mt-8 text-xs text-[var(--cf-muted)]" data-showcase-note>{sampleNote}</p>
      </div>
    );
  }

  return (
    <section data-report-gallery="tabs" className="case-file border-t border-[var(--cf-line)] py-12 sm:py-20">
      <div className="section-shell">
        {intro}
        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start lg:gap-12">
          <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:gap-1 lg:pb-0" role="group" aria-label={t("home.reportShowcase.features.cover.title", "Cover")}>
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              const isActive = feature.key === activeKey;
              return (
                <button
                  key={feature.key}
                  type="button"
                  onClick={() => setActiveKey(feature.key)}
                  aria-pressed={isActive}
                  data-report-tab={feature.key}
                  className={`flex shrink-0 items-start gap-3 border-l-2 px-5 py-4 text-left transition-colors lg:w-full lg:shrink ${isActive ? "border-[var(--cf-accent)] bg-[var(--cf-accent-dim)]" : "border-[var(--cf-line)] hover:border-[var(--cf-muted)]"}`}
                >
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isActive ? "bg-[var(--cf-accent)] text-white" : "border border-[var(--cf-line)] bg-transparent text-[var(--cf-muted)]"}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block whitespace-nowrap text-sm font-semibold text-[var(--cf-fg)] lg:whitespace-normal">{t(`home.reportShowcase.features.${feature.key}.title`, feature.key)}</span>
                    <span className="mt-0.5 hidden text-xs leading-relaxed text-[var(--cf-muted)] lg:block">{t(`home.reportShowcase.features.${feature.key}.description`, "")}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              {badge}
              <a href={`/images/report-previews/${imageLocale}/${active.key}.png`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-[var(--cf-accent)] underline underline-offset-4">{fullSize} →</a>
            </div>
            <p className="mb-3 text-sm leading-relaxed text-[var(--cf-muted)] lg:hidden">{t(`home.reportShowcase.features.${active.key}.description`, "")}</p>
            <div className="overflow-hidden rounded-xl border border-[var(--cf-line)] bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element -- a static report page of varying height; shown at its natural ratio */}
              <img
                src={`/images/report-previews/${imageLocale}/${active.key}.png`}
                alt={t(`home.reportShowcase.features.${active.key}.title`, active.key)}
                className="h-auto w-full"
              />
            </div>
            <p className="mt-3 text-center text-xs text-[var(--cf-muted)]" data-showcase-note>{sampleNote}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
