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
    <section className="bg-slate-50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {t("home.reportShowcase.title", "What's Inside the Premium Report?")}
          </h2>
          <p className="mt-3 text-base text-slate-500">
            {t(
              "home.reportShowcase.subtitle",
              "A $49 report built to replace hours of guesswork -- here's exactly what you get."
            )}
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start lg:gap-12">
          {/* Feature tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              const isActive = feature.key === activeKey;
              return (
                <button
                  key={feature.key}
                  type="button"
                  onClick={() => setActiveKey(feature.key)}
                  aria-pressed={isActive}
                  className={`flex shrink-0 items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-all lg:shrink lg:w-full ${
                    isActive
                      ? "border-indigo-300 bg-white shadow-md"
                      : "border-transparent bg-white/60 hover:border-slate-200 hover:bg-white"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      isActive ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block whitespace-nowrap text-sm font-semibold lg:whitespace-normal ${
                        isActive ? "text-indigo-900" : "text-slate-700"
                      }`}
                    >
                      {t(`home.reportShowcase.features.${feature.key}.title`, feature.key)}
                    </span>
                    <span className="mt-0.5 hidden text-xs leading-relaxed text-slate-500 lg:block">
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
            <p className="mb-3 text-sm leading-relaxed text-slate-600 lg:hidden">
              {t(`home.reportShowcase.features.${active.key}.description`, "")}
            </p>
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
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
