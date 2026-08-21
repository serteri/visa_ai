"use client";

import { useState } from "react";
import { FileText, Upload } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/contexts/language-context";
import {
  DOCUMENTS_BY_STAGE,
  VISA_DOCUMENT_STATUS_LABEL_KEY,
  VISA_DOCUMENT_TYPE_LABEL_KEY,
  type VisaDocumentStatus,
} from "@/lib/constants/visa-documents";
import { isVisaStage, VISA_STAGE_I18N, type VisaStage } from "@/lib/constants/visa-stages";
import type { VisaJourneySummary } from "./JourneyTimelineCard";

export type VisaDocumentSummary = {
  id: string;
  journeyId: string;
  stage: string;
  documentType: string;
  status: string;
};

function statusBadgeClass(status: VisaDocumentStatus): string {
  if (status === "AI_VERIFIED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "REJECTED") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "MANUAL_REVIEW") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-500";
}

function UploadButton() {
  const { t } = useTranslation();
  const [showNotice, setShowNotice] = useState(false);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => setShowNotice(true)}
        className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700"
      >
        <Upload className="h-3.5 w-3.5" />
        {t("portal.documents.upload", "Upload Document")}
      </button>
      {showNotice && (
        <p className="text-[11px] text-slate-400">
          {t("portal.documents.uploadComingSoon", "Document upload is coming soon.")}
        </p>
      )}
    </div>
  );
}

function StageDocumentRow({
  documentType,
  status,
}: {
  documentType: string;
  status: VisaDocumentStatus | null;
}) {
  const { t } = useTranslation();
  const labelKey = VISA_DOCUMENT_TYPE_LABEL_KEY[documentType as keyof typeof VISA_DOCUMENT_TYPE_LABEL_KEY];

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <FileText className="h-4 w-4 shrink-0 text-slate-300" />
        <span className="text-sm font-medium text-slate-700">{t(labelKey ?? documentType, documentType)}</span>
      </div>
      <div className="flex items-center gap-3">
        {status && (
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(status)}`}>
            {t(VISA_DOCUMENT_STATUS_LABEL_KEY[status], status)}
          </span>
        )}
        <UploadButton />
      </div>
    </div>
  );
}

function JourneyDocuments({
  journey,
  documents,
}: {
  journey: VisaJourneySummary;
  documents: VisaDocumentSummary[];
}) {
  const { t } = useTranslation();
  const stage: VisaStage = isVisaStage(journey.currentStage) ? journey.currentStage : "PREPARATION";
  const expectedTypes = DOCUMENTS_BY_STAGE[stage];
  const stageTitleKey = VISA_STAGE_I18N[stage].titleKey;

  const documentsByType = new Map(
    documents.filter((doc) => doc.stage === stage).map((doc) => [doc.documentType, doc])
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">{journey.visaType}</p>
        <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
          {t(stageTitleKey, stage)}
        </span>
      </div>
      <div className="space-y-2">
        {expectedTypes.map((documentType) => (
          <StageDocumentRow
            key={documentType}
            documentType={documentType}
            status={(documentsByType.get(documentType)?.status as VisaDocumentStatus) ?? null}
          />
        ))}
      </div>
    </div>
  );
}

export function StageDocumentsCard({
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
        <CardTitle className="text-base">{t("portal.documents.title", "Stage Documents")}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("portal.documents.subtitle", "Documents suggested for your current stage")}
        </p>
      </CardHeader>
      <CardContent>
        {journeys.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            {t(
              "portal.documents.selectJourney",
              "Start a visa journey above to see suggested documents for your stage."
            )}
          </p>
        ) : (
          <div className="space-y-6">
            {journeys.map((journey) => (
              <JourneyDocuments
                key={journey.id}
                journey={journey}
                documents={documents.filter((doc) => doc.journeyId === journey.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
