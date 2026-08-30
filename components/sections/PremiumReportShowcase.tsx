"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ClipboardCheck,
  DollarSign,
  ListChecks,
  MapPinned,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { useTranslation } from "@/contexts/language-context";

type FeatureKey = "viabilityRanking" | "pointsBreakdown" | "pointsBooster" | "financialRoadmap" | "historicalTrends";

// Real product screenshots (replaced the old generic mockups). The task's
// requested filenames had a "_2" suffix that doesn't exist on disk -- these
// are the actual files in public/images/report-previews/, matched by their
// shared timestamps. Renamed to remove spaces (kebab-case, lowercase) --
// spaces in web asset filenames get percent-encoded to %20 and are prone to
// breaking on some CDN/server configs.
const FEATURES: Array<{ key: FeatureKey; icon: LucideIcon; image: string }> = [
  { key: "viabilityRanking", icon: ShieldCheck, image: "/images/report-previews/screenshot-2026-08-26-204059.png" },
  { key: "pointsBreakdown", icon: ListChecks, image: "/images/report-previews/screenshot-2026-08-26-204437.png" },
  { key: "pointsBooster", icon: MapPinned, image: "/images/report-previews/screenshot-2026-08-26-204504.png" },
  { key: "financialRoadmap", icon: DollarSign, image: "/images/report-previews/screenshot-2026-08-26-204514.png" },
  { key: "historicalTrends", icon: ClipboardCheck, image: "/images/report-previews/screenshot-2026-08-26-204527.png" },
];

/**
 * Homepage section explaining what the $49 premium report actually
 * contains -- horizontal tabs on desktop (feature list left, PDF preview
 * image right), stacking to image-below-text on mobile. Every string comes
 * from public/locales/{locale}.json via useTranslation(), keyed under
 * "home.reportShowcase.*" -- see that namespace for the exact keys.
 */
export function PremiumReportShowcase() {
  const { t } = useTranslation();
  const [activeKey, setActiveKey] = useState<FeatureKey>(FEATURES[0].key);
  const active = FEATURES.find((f) => f.key === activeKey) ?? FEATURES[0];

  return (
    <section className="relative overflow-hidden bg-black py-24 sm:py-32">
      {/* Dala neon glow accents -- iris + saffron radial blooms behind the
          heading, giving the section a "worth $49" moment instead of
          burying it in a flat black box. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full opacity-30 blur-[110px]"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, #8052ff, transparent 60%), radial-gradient(circle at 70% 60%, #ffb829, transparent 55%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#8052ff]/40 bg-[#8052ff]/10 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-[#c4b0ff]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ffb829]" />
            {t("home.reportShowcase.eyebrow", "$49 Premium Report")}
          </span>
          <h2 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            {t("home.reportShowcase.title", "What's Inside the Premium Report?")}
          </h2>
          <p className="mt-4 text-lg font-medium leading-relaxed text-slate-400">
            {t(
              "home.reportShowcase.subtitle",
              "Stop guessing. Get the exact AI-powered blueprint used by migration experts, detailing your precise points, hidden risks, and a clear roadmap to Permanent Residency. All for $49."
            )}
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start lg:gap-12">
          {/* Feature list -- suspended in the void, no boxed card fills;
              just a thin left rule that glows iris when active. */}
          <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:gap-1 lg:pb-0">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              const isActive = feature.key === activeKey;
              return (
                <button
                  key={feature.key}
                  type="button"
                  onClick={() => setActiveKey(feature.key)}
                  aria-pressed={isActive}
                  className={`flex shrink-0 items-start gap-3 border-l-2 px-5 py-4 text-left transition-colors lg:shrink lg:w-full ${
                    isActive
                      ? "border-[#8052ff] bg-[#8052ff]/5"
                      : "border-slate-800/60 hover:border-slate-600"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      isActive ? "bg-[#8052ff] text-white" : "bg-transparent text-slate-400 border border-slate-800/60"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block whitespace-nowrap text-sm font-semibold text-white lg:whitespace-normal">
                      {t(`home.reportShowcase.features.${feature.key}.title`, feature.key)}
                    </span>
                    <span className="mt-0.5 hidden text-xs leading-relaxed text-slate-400 lg:block">
                      {t(`home.reportShowcase.features.${feature.key}.description`, "")}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Preview image -- comes after the tabs in DOM order, so on
              mobile (single-column grid) it stacks below the feature text;
              from lg: up the grid goes two-column and they sit side by
              side instead. */}
          <div>
            <p className="mb-3 text-sm leading-relaxed text-slate-400 lg:hidden">
              {t(`home.reportShowcase.features.${active.key}.description`, "")}
            </p>
            {/* No border, no box-shadow -- the image floats in the void
                per Dala's flat/borderless rule. A soft iris glow sits
                behind it instead of a hard edge, so a screenshot with its
                own dark corners doesn't visually fuse into the black
                section background. */}
            <div className="relative aspect-[3/4] w-full">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-[-6%] rounded-3xl opacity-40 blur-3xl"
                style={{
                  background:
                    "radial-gradient(closest-side, rgba(128,82,255,0.35), transparent 75%)",
                }}
              />
              <Image
                src={active.image}
                alt={t(`home.reportShowcase.features.${active.key}.title`, active.key)}
                fill
                className="relative object-contain"
                sizes="(min-width: 1024px) 50vw, 100vw"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
