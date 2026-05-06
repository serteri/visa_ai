"use client";

import { useEffect, useState } from "react";
import { Loader2, UploadCloud } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DocumentType = "Passport" | "English Test" | "Skills Assessment" | "Unknown";
type ValidationStatus = "VALID" | "EXPIRED" | "MISMATCH";

type AnalysisResult = {
  documentType: DocumentType;
  extractedFields: Record<string, unknown>;
  validationStatus: ValidationStatus;
  reasoning: string;
};

type LeadData = {
  fullName?: string;
  email?: string;
  occupation?: string;
  englishLevel?: string;
  age?: string;
  currentCountry?: string;
  targetVisa?: string;
};

type DocumentAnalyzerProps = {
  leadData: LeadData;
};

const SCAN_FRAMES = [
  "AI is scanning document for inconsistencies...",
  "Extracting fields and classifying document type...",
  "Comparing extracted values against lead declaration...",
  "Finalizing intelligence summary...",
];

export function DocumentAnalyzer({ leadData }: DocumentAnalyzerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanStep, setScanStep] = useState(0);

  useEffect(() => {
    if (!isAnalyzing) return;
    const timer = window.setInterval(() => {
      setScanStep((prev) => (prev + 1) % SCAN_FRAMES.length);
    }, 900);

    return () => window.clearInterval(timer);
  }, [isAnalyzing]);

  const canAnalyze = !!file && !isAnalyzing;

  function onFileSelect(nextFile: File | null) {
    setFile(nextFile);
    setAnalysis(null);
    setError(null);
  }

  async function analyzeDocument() {
    if (!file) return;

    try {
      setIsAnalyzing(true);
      setScanStep(0);
      setError(null);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("leadData", JSON.stringify(leadData));

      const response = await fetch("/api/document-analyze", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as AnalysisResult | { error?: string };
      if (!response.ok) {
        const apiError = "error" in payload ? payload.error : "Analysis failed.";
        throw new Error(apiError || "Analysis failed.");
      }

      setAnalysis(payload as AnalysisResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to analyze document.";
      setError(message);
    } finally {
      setIsAnalyzing(false);
    }
  }

  function renderStatusBadge(status: ValidationStatus) {
    if (status === "VALID") {
      return (
        <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800">
          Valid / Match
        </Badge>
      );
    }

    if (status === "EXPIRED") {
      return (
        <Badge className="border-rose-200 bg-rose-100 text-rose-800">
          Expired
        </Badge>
      );
    }

    return (
      <Badge className="border-rose-200 bg-rose-100 text-rose-800">
        Inconsistency Detected
      </Badge>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI-Powered Document Intelligence</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <label
          className={[
            "group relative flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition",
            isDragOver
              ? "border-primary bg-primary/10"
              : "border-border bg-muted/20 hover:border-primary/60 hover:bg-primary/5",
          ].join(" ")}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragOver(false);
            const droppedFile = event.dataTransfer.files?.[0] ?? null;
            onFileSelect(droppedFile);
          }}
        >
          <input
            type="file"
            className="sr-only"
            accept="image/*,application/pdf"
            onChange={(event) => onFileSelect(event.target.files?.[0] ?? null)}
          />
          <UploadCloud className="mb-3 h-8 w-8 text-primary" />
          <p className="text-sm font-semibold">Drag and drop document here</p>
          <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, WEBP or PDF up to 10MB</p>
          {file && (
            <p className="mt-4 rounded-full bg-card px-3 py-1 text-xs text-muted-foreground">
              Selected: {file.name}
            </p>
          )}
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={analyzeDocument} disabled={!canAnalyze}>
            {isAnalyzing ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </span>
            ) : (
              "Analyze Document"
            )}
          </Button>
          {file && !isAnalyzing && (
            <Button type="button" variant="outline" onClick={() => onFileSelect(null)}>
              Clear
            </Button>
          )}
        </div>

        {isAnalyzing && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-medium text-primary">{SCAN_FRAMES[scanStep]}</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded bg-primary/20">
              <div className="h-full w-1/3 animate-[pulse_1s_ease-in-out_infinite] bg-primary" />
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {analysis && (
          <div className="space-y-4 rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Document Type</p>
                <p className="text-sm font-semibold">{analysis.documentType}</p>
              </div>
              {renderStatusBadge(analysis.validationStatus)}
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">AI Reasoning</p>
              <p className="mt-1 text-sm text-foreground/90">{analysis.reasoning}</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Extracted Fields</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {Object.entries(analysis.extractedFields).length === 0 && (
                  <p className="text-sm text-muted-foreground">No fields extracted.</p>
                )}
                {Object.entries(analysis.extractedFields).map(([key, value]) => (
                  <div key={key} className="rounded-md border bg-muted/30 p-2 text-sm">
                    <p className="font-medium text-foreground">{key}</p>
                    <p className="text-muted-foreground">{String(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
