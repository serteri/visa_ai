"use client";

import { useRef, useState, useTransition } from "react";
import { Check, ChevronDown, FileText, Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/contexts/language-context";
import {
  DOCUMENTS_BY_STAGE,
  VISA_DOCUMENT_STATUS_LABEL_KEY,
  VISA_DOCUMENT_TYPE_LABEL_KEY,
  type VisaDocumentStatus,
} from "@/lib/constants/visa-documents";
import {
  VISA_STAGES,
  VISA_STAGE_I18N,
  isVisaStage,
  nextVisaStage,
  stageStatus,
  visaStageIndex,
  type VisaStage,
  type VisaStageStatus,
} from "@/lib/constants/visa-stages";
import {
  getSecureDocumentUrlAction,
  updateJourneyStage,
  uploadVisaDocument,
  startVisaJourney,
} from "@/app/[locale]/(main)/dashboard/actions";

export type VisaJourneySummary = {
  id: string;
  visaType: string;
  currentStage: string;
  progressPercentage: number;
  updatedAt: string;
};

export type VisaDocumentSummary = {
  id: string;
  journeyId: string;
  stage: string;
  documentType: string;
  status: string;
  hasFile: boolean;
};

function statusBadgeClass(status: VisaDocumentStatus): string {
  if (status === "AI_VERIFIED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "REJECTED") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "MANUAL_REVIEW") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-500";
}

function circleClass(status: VisaStageStatus): string {
  if (status === "COMPLETED") return "border-emerald-500 bg-emerald-500 text-white";
  if (status === "IN_PROGRESS") return "border-indigo-600 bg-indigo-600 text-white ring-4 ring-indigo-100";
  return "border-slate-200 bg-white text-slate-400";
}

function titleClass(status: VisaStageStatus): string {
  if (status === "COMPLETED") return "text-emerald-700";
  if (status === "IN_PROGRESS") return "text-indigo-700";
  return "text-slate-500";
}

/** Same upload control as before -- one hidden file input triggered by a
 *  button, reused per-step here instead of per-row in a flat table. */
function UploadButton({
  journeyId,
  stage,
  documentType,
  hasFile,
}: {
  journeyId: string;
  stage: string;
  documentType: string;
  hasFile: boolean;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    startTransition(async () => {
      const result = await uploadVisaDocument(journeyId, stage, documentType, file);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelected}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-60"
      >
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {hasFile ? t("portal.documents.replace", "Replace") : t("portal.documents.upload", "Upload Document")}
      </button>
      {error && <p className="max-w-[10rem] text-right text-[11px] text-rose-600">{error}</p>}
    </div>
  );
}

function ViewDocumentLink({ documentId }: { documentId: string }) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleView() {
    setError(null);
    startTransition(async () => {
      const result = await getSecureDocumentUrlAction(documentId);
      if (result.error || !result.url) {
        setError(result.error ?? "Could not open this file.");
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={handleView}
        disabled={isPending}
        className="flex items-center gap-1 text-left text-xs text-indigo-600 hover:underline disabled:opacity-60"
      >
        {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
        {t("portal.documents.view", "View uploaded file")}
      </button>
      {error && <p className="text-[11px] text-rose-600">{error}</p>}
    </div>
  );
}

function StepDocuments({ journeyId, stage, documents }: { journeyId: string; stage: VisaStage; documents: VisaDocumentSummary[] }) {
  const { t } = useTranslation();
  const expectedTypes = DOCUMENTS_BY_STAGE[stage];
  const documentsByType = new Map(documents.filter((d) => d.stage === stage).map((d) => [d.documentType, d]));

  if (expectedTypes.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 space-y-2">
      {expectedTypes.map((documentType) => {
        const existing = documentsByType.get(documentType);
        const labelKey = VISA_DOCUMENT_TYPE_LABEL_KEY[documentType];
        const status = (existing?.status as VisaDocumentStatus) ?? null;
        return (
          <div
            key={documentType}
            className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2.5 shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <FileText className="h-4 w-4 shrink-0 text-slate-300" />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-700">{t(labelKey, documentType)}</span>
                {existing?.hasFile && <ViewDocumentLink documentId={existing.id} />}
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              {status && (
                <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadgeClass(status)}`}>
                  {t(VISA_DOCUMENT_STATUS_LABEL_KEY[status], status)}
                </span>
              )}
              <UploadButton
                journeyId={journeyId}
                stage={stage}
                documentType={documentType}
                hasFile={existing?.hasFile ?? false}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AdvanceStageButton({ journeyId }: { journeyId: string }) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAdvance() {
    setError(null);
    startTransition(async () => {
      try {
        await updateJourneyStage(journeyId);
      } catch {
        setError(t("portal.stageUpdateError", "Could not update your journey. Please try again."));
      }
    });
  }

  return (
    <div className="mt-3">
      <Button size="sm" onClick={handleAdvance} disabled={isPending}>
        {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
        {t("portal.markCompleted", "Mark as Completed")}
      </Button>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

function StepRow({
  journeyId,
  stage,
  status,
  isLast,
  isExpanded,
  onToggle,
  documents,
}: {
  journeyId: string;
  stage: VisaStage;
  status: VisaStageStatus;
  isLast: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  documents: VisaDocumentSummary[];
}) {
  const { t } = useTranslation();
  const { titleKey, descriptionKey } = VISA_STAGE_I18N[stage];

  return (
    <div className="relative flex gap-4 pb-8 last:pb-0">
      {!isLast && (
        <div
          className={`absolute left-[15px] top-8 h-[calc(100%-1rem)] w-0.5 ${
            status === "COMPLETED" ? "bg-emerald-400" : "bg-slate-200"
          }`}
        />
      )}
      <div
        className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${circleClass(status)}`}
      >
        {status === "COMPLETED" ? <Check className="h-4 w-4" /> : visaStageIndex(stage) + 1}
      </div>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <div>
            <p className={`text-sm font-semibold ${titleClass(status)}`}>{t(titleKey, stage)}</p>
            {status === "IN_PROGRESS" && (
              <p className="mt-0.5 text-xs text-slate-500">{t(descriptionKey, "")}</p>
            )}
          </div>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          />
        </button>

        {isExpanded && (
          <div>
            <StepDocuments journeyId={journeyId} stage={stage} documents={documents} />
            {status === "IN_PROGRESS" && <AdvanceStageButton journeyId={journeyId} />}
          </div>
        )}
      </div>
    </div>
  );
}

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
        <Button onClick={handleStart} disabled={isPending || !visaType.trim()} className="whitespace-nowrap">
          {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          {t("portal.startJourneyCta", "Start")}
        </Button>
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}

function JourneyStepper({ journey, documents }: { journey: VisaJourneySummary; documents: VisaDocumentSummary[] }) {
  const { t } = useTranslation();
  const validStage = isVisaStage(journey.currentStage) ? journey.currentStage : VISA_STAGES[0];
  const [expandedStage, setExpandedStage] = useState<VisaStage | null>(validStage);
  const isAtLastStage = nextVisaStage(validStage) === null;

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-4 sm:p-5">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">{journey.visaType}</p>
        <span className="text-xs font-medium text-slate-500">{journey.progressPercentage}%</span>
      </div>
      <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-indigo-600 transition-all"
          style={{ width: `${Math.min(100, Math.max(0, journey.progressPercentage))}%` }}
        />
      </div>

      {VISA_STAGES.map((stage, index) => (
        <StepRow
          key={stage}
          journeyId={journey.id}
          stage={stage}
          status={stageStatus(stage, journey.currentStage)}
          isLast={index === VISA_STAGES.length - 1}
          isExpanded={expandedStage === stage}
          onToggle={() => setExpandedStage((prev) => (prev === stage ? null : stage))}
          documents={documents}
        />
      ))}

      {isAtLastStage && stageStatus(VISA_STAGES[VISA_STAGES.length - 1], journey.currentStage) === "IN_PROGRESS" && (
        <p className="mt-2 text-sm font-medium text-slate-500">
          {t("portal.finalStageHint", "Mark this stage complete once your visa is granted.")}
        </p>
      )}
    </div>
  );
}

export function JourneyTimeline({
  journeys,
  documents,
}: {
  journeys: VisaJourneySummary[];
  documents: VisaDocumentSummary[];
}) {
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
          <div className="space-y-6">
            {journeys.map((journey) => (
              // Keyed on currentStage too, not just id: remounts the
              // stepper (resetting its local expandedStage state) whenever
              // the journey advances, so the newly-active step opens
              // automatically instead of leaving the just-completed one
              // expanded.
              <JourneyStepper
                key={`${journey.id}-${journey.currentStage}`}
                journey={journey}
                documents={documents.filter((d) => d.journeyId === journey.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
