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

type FeatureKey = "eligibility" | "roadmap" | "costTimeline" | "occupationInsights" | "documentChecklist";

const FEATURES: Array<{ key: FeatureKey; icon: LucideIcon; image: string }> = [
  { key: "eligibility", icon: ShieldCheck, image: "/images/report-previews/report-preview-1.png" },
  { key: "roadmap", icon: MapPinned, image: "/images/report-previews/report-preview-2.png" },
  { key: "costTimeline", icon: DollarSign, image: "/images/report-previews/report-preview-3.png" },
  { key: "occupationInsights", icon: ListChecks, image: "/images/report-previews/report-preview-4.png" },
  { key: "documentChecklist", icon: ClipboardCheck, image: "/images/report-previews/report-preview-5.png" },
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
    <section className="relative overflow-hidden bg-black py-16 sm:py-20">
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
          <h2 className="mt-4 text-3xl font-normal tracking-tight text-white sm:text-4xl">
            {t("home.reportShowcase.title", "What's Inside the Premium Report?")}
          </h2>
          <p className="mt-3 text-base text-gray-400">
            {t(
              "home.reportShowcase.subtitle",
              "A $49 report built to replace hours of guesswork -- here's exactly what you get."
            )}
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start lg:gap-12">
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
                  className={`flex shrink-0 items-start gap-3 border-l-2 px-4 py-3.5 text-left transition-colors lg:shrink lg:w-full ${
                    isActive
                      ? "border-[#8052ff] bg-[#8052ff]/5"
                      : "border-gray-800 hover:border-gray-600"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      isActive ? "bg-[#8052ff] text-white" : "bg-transparent text-gray-500 border border-gray-800"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block whitespace-nowrap text-sm font-semibold lg:whitespace-normal ${
                        isActive ? "text-white" : "text-gray-400"
                      }`}
                    >
                      {t(`home.reportShowcase.features.${feature.key}.title`, feature.key)}
                    </span>
                    <span className="mt-0.5 hidden text-xs leading-relaxed text-gray-500 lg:block">
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
            <p className="mb-3 text-sm leading-relaxed text-gray-400 lg:hidden">
              {t(`home.reportShowcase.features.${active.key}.description`, "")}
            </p>
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-gray-800 bg-black">
              <Image
                src={active.image}
                alt={t(`home.reportShowcase.features.${active.key}.title`, active.key)}
                fill
                className="object-contain"
                sizes="(min-width: 1024px) 50vw, 100vw"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
