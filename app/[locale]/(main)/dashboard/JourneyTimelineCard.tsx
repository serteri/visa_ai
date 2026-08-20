"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/contexts/language-context";

export type VisaJourneySummary = {
  id: string;
  visaType: string;
  currentStage: string;
  progressPercentage: number;
  updatedAt: string;
};

const STAGE_KEY: Record<string, string> = {
  PREPARATION: "portal.stage.preparation",
  SKILLS_ASSESSMENT: "portal.stage.skillsAssessment",
  EOI: "portal.stage.eoi",
  INVITED: "portal.stage.invited",
  LODGED: "portal.stage.lodged",
  GRANTED: "portal.stage.granted",
};

export function JourneyTimelineCard({
  journeys,
  locale,
}: {
  journeys: VisaJourneySummary[];
  locale: string;
}) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("portal.timeline", "Your Timeline")}</CardTitle>
      </CardHeader>
      <CardContent>
        {journeys.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <MapPin className="h-8 w-8 text-slate-300" />
            <p className="max-w-sm text-sm text-slate-500">
              {t(
                "portal.timelineEmpty",
                "Your visa journey timeline will appear here once you start tracking a visa pathway."
              )}
            </p>
            <Link
              href={`/${locale}/dashboard/visa-tracker`}
              className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              {t("portal.timelineEmptyCta", "Start tracking a visa")}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {journeys.map((journey) => (
              <div key={journey.id} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">{journey.visaType}</p>
                  <span className="text-xs font-medium text-slate-500">
                    {t(STAGE_KEY[journey.currentStage] ?? journey.currentStage, journey.currentStage)}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{t("portal.progress", "Progress")}</span>
                    <span>{journey.progressPercentage}%</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-indigo-600 transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, journey.progressPercentage))}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
