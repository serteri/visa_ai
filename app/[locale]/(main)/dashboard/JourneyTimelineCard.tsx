"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/contexts/language-context";
import {
  VISA_STAGES,
  VISA_STAGE_I18N,
  isVisaStage,
  nextVisaStage,
  visaStageIndex,
  type VisaStage,
} from "@/lib/constants/visa-stages";
import { startVisaJourney, updateJourneyStage } from "./actions";

export type VisaJourneySummary = {
  id: string;
  visaType: string;
  currentStage: string;
  progressPercentage: number;
  updatedAt: string;
};

function StartJourneyForm() {
  const { t } = useTranslation();
  const [visaType, setVisaType] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleStart() {
    if (!visaType.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await startVisaJourney(visaType.trim());
      } catch {
        setError(t("portal.stageUpdateError", "Could not update your journey. Please try again."));
      }
    });
  }

  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <p className="max-w-sm text-sm text-slate-500">
        {t(
          "portal.timelineEmpty",
          "Your visa journey timeline will appear here once you start tracking a visa pathway."
        )}
      </p>
      <div className="flex w-full max-w-xs flex-col gap-2 sm:flex-row">
        <Input
          value={visaType}
          onChange={(e) => setVisaType(e.target.value)}
          placeholder={t("portal.visaTypePlaceholder", "e.g. Subclass 189")}
          disabled={isPending}
        />
        <button
          type="button"
          onClick={handleStart}
          disabled={isPending || !visaType.trim()}
          className="flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {t("portal.startJourneyCta", "Start")}
        </button>
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}

function StageStep({
  stage,
  status,
}: {
  stage: VisaStage;
  status: "completed" | "active" | "upcoming";
}) {
  const { t } = useTranslation();
  const { titleKey, descriptionKey } = VISA_STAGE_I18N[stage];

  return (
    <div className="flex flex-1 flex-col items-center gap-2 text-center">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
          status === "completed"
            ? "border-emerald-500 bg-emerald-500 text-white"
            : status === "active"
              ? "border-indigo-600 bg-indigo-600 text-white ring-4 ring-indigo-100"
              : "border-slate-200 bg-white text-slate-400"
        }`}
      >
        {status === "completed" ? <Check className="h-4 w-4" /> : visaStageIndex(stage) + 1}
      </div>
      <div>
        <p
          className={`text-xs font-semibold ${
            status === "active" ? "text-indigo-700" : status === "completed" ? "text-emerald-700" : "text-slate-400"
          }`}
        >
          {t(titleKey, stage)}
        </p>
        {status === "active" && (
          <p className="mt-0.5 max-w-[9rem] text-[11px] leading-snug text-slate-500">
            {t(descriptionKey, "")}
          </p>
        )}
      </div>
    </div>
  );
}

function JourneyStepper({ journey }: { journey: VisaJourneySummary }) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const validStage = isVisaStage(journey.currentStage);
  const currentIndex = validStage ? visaStageIndex(journey.currentStage) : -1;
  const nextStage = validStage ? nextVisaStage(journey.currentStage as VisaStage) : null;

  function handleAdvance() {
    setError(null);
    startTransition(async () => {
      try {
        await updateJourneyStage(journey.id);
      } catch {
        setError(t("portal.stageUpdateError", "Could not update your journey. Please try again."));
      }
    });
  }

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">{journey.visaType}</p>
        <span className="text-xs font-medium text-slate-500">{journey.progressPercentage}%</span>
      </div>

      <div className="mt-1 mb-5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-indigo-600 transition-all"
          style={{ width: `${Math.min(100, Math.max(0, journey.progressPercentage))}%` }}
        />
      </div>

      <div className="flex items-start justify-between gap-1">
        {VISA_STAGES.map((stage, index) => (
          <StageStep
            key={stage}
            stage={stage}
            status={index < currentIndex ? "completed" : index === currentIndex ? "active" : "upcoming"}
          />
        ))}
      </div>

      <div className="mt-5 flex flex-col items-center gap-2">
        {nextStage ? (
          <button
            type="button"
            onClick={handleAdvance}
            disabled={isPending}
            className="flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {t("portal.markCompleted", "Mark as Completed")}
          </button>
        ) : (
          <p className="text-sm font-medium text-emerald-700">
            {t("portal.journeyComplete", "You've completed every stage of this journey. 🎉")}
          </p>
        )}
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </div>
    </div>
  );
}

export function JourneyTimelineCard({ journeys }: { journeys: VisaJourneySummary[] }) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("portal.timeline", "Your Timeline")}</CardTitle>
      </CardHeader>
      <CardContent>
        {journeys.length === 0 ? (
          <StartJourneyForm />
        ) : (
          <div className="space-y-4">
            {journeys.map((journey) => (
              <JourneyStepper key={journey.id} journey={journey} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
