"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileText, Loader2, UploadCloud, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StripeCheckoutButton } from "@/components/stripe-checkout-button";

type ClassifyResult = {
  match_found: boolean;
  anzsco_code: string | null;
  occupation_title: string | null;
  confidence_score: number;
  reasoning: string;
};

type Status = "idle" | "extracting" | "loading" | "result" | "error";

type AnzscoClassifierProps = {
  locale?: string;
  /** Which guide the sales CTA sells. Defaults to the Global English edition. */
  productType?: "pdf_book" | "pdf_book_global";
};

const MAX_FILE_BYTES = 10 * 1024 * 1024;

async function extractTextFromPdf(file: File): Promise<string> {
  // Dynamic import: pdfjs-dist touches browser-only APIs (Worker, DOMMatrix)
  // that don't exist during this "use client" component's server render pass.
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pageTexts: string[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pageTexts.push(pageText);
  }

  return pageTexts.join("\n").replace(/\s+/g, " ").trim();
}

export function AnzscoClassifier({
  locale = "en",
  productType = "pdf_book_global",
}: AnzscoClassifierProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isBusy = status === "extracting" || status === "loading";

  function reset() {
    setStatus("idle");
    setFileName(null);
    setResult(null);
    setErrorMessage(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleFile(file: File | null) {
    if (!file || isBusy) return;

    if (file.type !== "application/pdf") {
      setStatus("error");
      setErrorMessage("Please upload a PDF file.");
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setStatus("error");
      setErrorMessage("File is too large. Max 10MB.");
      return;
    }

    setFileName(file.name);
    setResult(null);
    setErrorMessage(null);

    try {
      setStatus("extracting");
      const cvText = await extractTextFromPdf(file);

      if (!cvText || cvText.length < 20) {
        setStatus("error");
        setErrorMessage(
          "We couldn't read any text from this PDF. Make sure it's not a scanned image, then try again."
        );
        return;
      }

      setStatus("loading");
      const response = await fetch("/api/anzsco-classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvText }),
      });

      const payload = (await response.json()) as ClassifyResult | { error?: string };
      if (!response.ok || "error" in payload) {
        const message = "error" in payload ? payload.error : undefined;
        throw new Error(message || "Analysis failed. Please try again.");
      }

      setResult(payload as ClassifyResult);
      setStatus("result");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setStatus("error");
      setErrorMessage(message);
    }
  }

  return (
    <Card className="overflow-hidden border-2 border-indigo-100 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white">
        <CardTitle className="text-2xl font-black text-white">🎯 ANZSCO AI Matcher</CardTitle>
        <p className="text-sm text-indigo-100">
          Upload your CV and let our AI instantly identify your matching ANZSCO occupation code.
        </p>
      </CardHeader>

      <CardContent className="space-y-5 pt-6">
        {(status === "idle" || status === "error") && (
          <>
            <label
              className={[
                "group relative flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all",
                isDragOver
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/60",
              ].join(" ")}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragOver(false);
                handleFile(event.dataTransfer.files?.[0] ?? null);
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                className="sr-only"
                onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
              />
              <UploadCloud className="mb-3 h-10 w-10 text-indigo-500" />
              <p className="text-base font-semibold text-slate-900">
                Drop your CV here, or click to upload
              </p>
              <p className="mt-1 text-sm text-slate-500">PDF only, up to 10MB</p>
            </label>

            {status === "error" && errorMessage && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </>
        )}

        {isBusy && (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-indigo-200 bg-indigo-50 py-12">
            <Loader2 className="h-9 w-9 animate-spin text-indigo-600" />
            <div className="text-center">
              <p className="text-sm font-semibold text-indigo-700">
                {status === "extracting"
                  ? `Reading ${fileName ?? "your CV"}...`
                  : "AI is matching your CV against 700+ ANZSCO codes..."}
              </p>
              <p className="mt-1 text-xs text-indigo-500">This usually takes a few seconds.</p>
            </div>
          </div>
        )}

        {status === "result" && result && (
          <div className="space-y-5">
            {result.match_found ? (
              <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                      Match Found
                    </p>
                    <p className="text-2xl font-black leading-tight text-slate-900">
                      {result.occupation_title}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-bold text-white">
                    ANZSCO {result.anzsco_code}
                  </span>
                  <span className="rounded-full border border-emerald-300 bg-white px-4 py-1.5 text-sm font-semibold text-emerald-700">
                    {Math.round(result.confidence_score * 100)}% confidence
                  </span>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-slate-700">{result.reasoning}</p>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-400 text-white">
                    <FileText className="h-6 w-6" />
                  </div>
                  <p className="text-lg font-bold text-slate-900">No Direct Match Found</p>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-700">
                  We couldn&apos;t find a direct ANZSCO match for your CV. Ensure your duties are
                  clearly listed or try a different document.
                </p>
              </div>
            )}

            {/* Sales CTA — shown regardless of match outcome */}
            <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
              <p className="text-base font-semibold leading-relaxed text-slate-900">
                Unlock the full strategy, state invitation history, and points optimization guide
                {result.match_found && result.occupation_title ? (
                  <>
                    {" "}
                    for <strong>{result.occupation_title}</strong>
                  </>
                ) : null}{" "}
                in our 80+ page Blueprint.
              </p>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-black text-indigo-700">$9.99</span>
                <span className="text-base font-medium text-slate-400 line-through">$29.99</span>
              </div>

              <div className="mt-4">
                <StripeCheckoutButton
                  productType={productType}
                  locale={locale}
                  className="w-full bg-indigo-600 py-6 text-base font-bold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 sm:w-auto"
                  label="Download Full Blueprint ($9.99)"
                />
              </div>
            </div>

            <Button type="button" variant="outline" className="w-full" onClick={reset}>
              Analyze Another CV
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
