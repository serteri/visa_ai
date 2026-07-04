"use client";

import { useRef, useState } from "react";
import Link from "next/link";
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
type UiLocale = "en" | "tr" | "zh";

type AnzscoClassifierProps = {
  /** Seeds the widget's own language toggle. The toggle still defaults to "en" if omitted. */
  initialLocale?: string;
};

const MAX_FILE_BYTES = 10 * 1024 * 1024;

// Maps the widget's simplified toggle to the app's real locale codes, which
// StripeCheckoutButton needs for the correct checkout success/cancel URL.
const STRIPE_LOCALE: Record<UiLocale, string> = {
  en: "en",
  tr: "tr",
  zh: "zh-Hans",
};

function resolveInitialLocale(value?: string): UiLocale {
  if (value === "tr") return "tr";
  if (value === "zh" || value === "zh-Hans") return "zh";
  return "en";
}

const DICT: Record<
  UiLocale,
  {
    headerTitle: string;
    headerSubtitle: string;
    dropPrompt: string;
    dropHint: string;
    errorNotPdf: string;
    errorTooLarge: string;
    errorNoText: string;
    errorGeneric: string;
    extracting: (fileName: string) => string;
    extractingHint: string;
    matching: string;
    matchFoundBadge: string;
    noMatchTitle: string;
    noMatchBody: string;
    confidenceLabel: (pct: number) => string;
    analyzeAnother: string;
  }
> = {
  en: {
    headerTitle: "🎯 ANZSCO AI Matcher",
    headerSubtitle:
      "Upload your CV and let our AI instantly identify your matching ANZSCO occupation code.",
    dropPrompt: "Drop your CV here, or click to upload",
    dropHint: "PDF only, up to 10MB",
    errorNotPdf: "Please upload a PDF file.",
    errorTooLarge: "File is too large. Max 10MB.",
    errorNoText:
      "We couldn't read any text from this PDF. Make sure it's not a scanned image, then try again.",
    errorGeneric: "Something went wrong. Please try again.",
    extracting: (fileName) => `Reading ${fileName}...`,
    extractingHint: "This usually takes a few seconds.",
    matching: "AI is matching your CV against 700+ ANZSCO codes...",
    matchFoundBadge: "Match Found",
    noMatchTitle: "No Direct Match Found",
    noMatchBody:
      "We couldn't find a direct ANZSCO match for your CV. Ensure your duties are clearly listed or try a different document.",
    confidenceLabel: (pct) => `${pct}% confidence`,
    analyzeAnother: "Analyze Another CV",
  },
  tr: {
    headerTitle: "🎯 ANZSCO Yapay Zeka Eşleştirici",
    headerSubtitle:
      "CV'nizi yükleyin, yapay zekamız eşleşen ANZSCO meslek kodunuzu anında belirlesin.",
    dropPrompt: "CV'nizi buraya sürükleyin veya yüklemek için tıklayın",
    dropHint: "Yalnızca PDF, 10MB'a kadar",
    errorNotPdf: "Lütfen bir PDF dosyası yükleyin.",
    errorTooLarge: "Dosya çok büyük. Maksimum 10MB.",
    errorNoText:
      "Bu PDF'ten metin okunamadı. Taranmış bir görüntü olmadığından emin olun ve tekrar deneyin.",
    errorGeneric: "Bir şeyler ters gitti. Lütfen tekrar deneyin.",
    extracting: (fileName) => `${fileName} okunuyor...`,
    extractingHint: "Bu genellikle birkaç saniye sürer.",
    matching: "Yapay zeka CV'nizi 700+ ANZSCO koduyla karşılaştırıyor...",
    matchFoundBadge: "Eşleşme Bulundu",
    noMatchTitle: "Doğrudan Eşleşme Bulunamadı",
    noMatchBody:
      "CV'niz için doğrudan bir ANZSCO eşleşmesi bulamadık. Görevlerinizin net bir şekilde listelendiğinden emin olun veya farklı bir belge deneyin.",
    confidenceLabel: (pct) => `%${pct} güven`,
    analyzeAnother: "Başka Bir CV Analiz Et",
  },
  zh: {
    headerTitle: "🎯 ANZSCO 智能匹配器",
    headerSubtitle: "上传您的简历，让我们的 AI 立即识别匹配的 ANZSCO 职业代码。",
    dropPrompt: "将简历拖放至此处，或点击上传",
    dropHint: "仅支持 PDF，最大 10MB",
    errorNotPdf: "请上传 PDF 文件。",
    errorTooLarge: "文件太大。最大 10MB。",
    errorNoText: "无法从此 PDF 中读取任何文本。请确认它不是扫描图像，然后重试。",
    errorGeneric: "出现问题，请重试。",
    extracting: (fileName) => `正在读取 ${fileName}...`,
    extractingHint: "这通常需要几秒钟。",
    matching: "AI 正在将您的简历与 700+ 个 ANZSCO 代码进行匹配...",
    matchFoundBadge: "找到匹配",
    noMatchTitle: "未找到直接匹配",
    noMatchBody: "我们未能为您的简历找到直接的 ANZSCO 匹配。请确保您的职责描述清晰，或尝试其他文件。",
    confidenceLabel: (pct) => `置信度 ${pct}%`,
    analyzeAnother: "分析其他简历",
  },
};

// The sales CTA only ever sells one of two products: the Turkish edition, or
// the Global English edition. Chinese-speaking visitors see the general UI
// in Chinese (via DICT above) but the CTA itself collapses to the English
// offer, since there is no separate Chinese guide.
const CTA_COPY: Record<
  "tr" | "en",
  {
    body: (occupationTitle: string | null) => React.ReactNode;
    button: string;
    termsLinkText: string;
    termsLabel: (link: React.ReactNode) => React.ReactNode;
    termsError: string;
  }
> = {
  tr: {
    body: (occupationTitle) => (
      <>
        80+ sayfalık <strong>Avustralya PR Başvuru Rehberi</strong> ile tam stratejiyi, eyalet davet
        geçmişini ve puan optimizasyon rehberini
        {occupationTitle ? (
          <>
            {" "}
            <strong>{occupationTitle}</strong> için
          </>
        ) : null}{" "}
        açığa çıkarın.
      </>
    ),
    button: "Tam Rehberi İndir ($9.99)",
    termsLinkText: "Kullanım Koşullarını",
    termsLabel: (link) => (
      <>
        {link}, Yasal MARA Uyarısını ve veri işleme politikalarını okudum, onaylıyorum. (Dijital
        ürünlerde iade yapılmaz.)
      </>
    ),
    termsError: "Lütfen devam etmek için yasal koşulları onaylayın.",
  },
  en: {
    body: (occupationTitle) => (
      <>
        Unlock the full strategy, state invitation history, and points optimization guide
        {occupationTitle ? (
          <>
            {" "}
            for <strong>{occupationTitle}</strong>
          </>
        ) : null}{" "}
        in our 80+ page Blueprint.
      </>
    ),
    button: "Download Full Blueprint ($9.99)",
    termsLinkText: "Terms of Service",
    termsLabel: (link) => (
      <>
        I agree to the {link}, the MARA Legal Disclaimer, and data processing policies. (No
        refunds on digital products.)
      </>
    ),
    termsError: "Please accept the legal terms to proceed.",
  },
};

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

export function AnzscoClassifier({ initialLocale }: AnzscoClassifierProps) {
  const [locale, setLocale] = useState<UiLocale>(resolveInitialLocale(initialLocale));
  const [status, setStatus] = useState<Status>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const t = DICT[locale];
  const isBusy = status === "extracting" || status === "loading";

  // Only two real product variants exist: Turkish edition, or Global English
  // (which Chinese-speaking visitors also see, per spec).
  const ctaVariant: "tr" | "en" = locale === "tr" ? "tr" : "en";
  const cta = CTA_COPY[ctaVariant];
  const productType = locale === "tr" ? "pdf_book" : "pdf_book_global";

  // Gate passed to StripeCheckoutButton -- runs at click time, blocks the
  // Stripe redirect (not just the UI) if the checkbox hasn't been checked.
  function handleBeforeCheckout(): boolean {
    if (!isTermsAccepted) {
      setTermsError(true);
      return false;
    }
    setTermsError(false);
    return true;
  }

  function reset() {
    setStatus("idle");
    setFileName(null);
    setResult(null);
    setErrorMessage(null);
    setIsTermsAccepted(false);
    setTermsError(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleFile(file: File | null) {
    if (!file || isBusy) return;

    if (file.type !== "application/pdf") {
      setStatus("error");
      setErrorMessage(t.errorNotPdf);
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setStatus("error");
      setErrorMessage(t.errorTooLarge);
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
        setErrorMessage(t.errorNoText);
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
        throw new Error(message || t.errorGeneric);
      }

      setResult(payload as ClassifyResult);
      setStatus("result");
    } catch (err) {
      const message = err instanceof Error ? err.message : t.errorGeneric;
      setStatus("error");
      setErrorMessage(message);
    }
  }

  return (
    <Card className="overflow-hidden border-2 border-indigo-100 shadow-xl">
      <CardHeader className="relative bg-gradient-to-r from-indigo-600 to-purple-700 text-white">
        <div className="absolute right-4 top-4 flex items-center gap-0.5 rounded-full bg-white/15 p-1 backdrop-blur-sm">
          {(["en", "tr", "zh"] as const).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setLocale(code)}
              aria-pressed={locale === code}
              className={[
                "rounded-full px-2.5 py-1 text-xs font-bold transition-colors",
                locale === code ? "bg-white text-indigo-700" : "text-white/80 hover:text-white",
              ].join(" ")}
            >
              {code === "en" ? "EN" : code === "tr" ? "TR" : "中文"}
            </button>
          ))}
        </div>

        <CardTitle className="max-w-[calc(100%-7rem)] text-2xl font-black text-white">
          {t.headerTitle}
        </CardTitle>
        <p className="max-w-[calc(100%-2rem)] text-sm text-indigo-100">{t.headerSubtitle}</p>
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
              <p className="text-base font-semibold text-slate-900">{t.dropPrompt}</p>
              <p className="mt-1 text-sm text-slate-500">{t.dropHint}</p>
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
                {status === "extracting" ? t.extracting(fileName ?? "CV") : t.matching}
              </p>
              <p className="mt-1 text-xs text-indigo-500">{t.extractingHint}</p>
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
                      {t.matchFoundBadge}
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
                    {t.confidenceLabel(Math.round(result.confidence_score * 100))}
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
                  <p className="text-lg font-bold text-slate-900">{t.noMatchTitle}</p>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-700">{t.noMatchBody}</p>
              </div>
            )}

            {/* Sales CTA — shown regardless of match outcome */}
            <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
              <p className="text-base font-semibold leading-relaxed text-slate-900">
                {cta.body(result.match_found ? result.occupation_title : null)}
              </p>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-black text-indigo-700">$9.99</span>
                <span className="text-base font-medium text-slate-400 line-through">$29.99</span>
              </div>

              <div className="mt-4 space-y-2">
                <label
                  className={[
                    "flex cursor-pointer items-start gap-2 text-sm transition-colors",
                    termsError ? "text-rose-600" : "text-slate-700",
                  ].join(" ")}
                >
                  <input
                    type="checkbox"
                    checked={isTermsAccepted}
                    onChange={(event) => {
                      setIsTermsAccepted(event.target.checked);
                      if (event.target.checked) setTermsError(false);
                    }}
                    className={[
                      "mt-0.5 h-4 w-4 shrink-0 rounded accent-indigo-600",
                      termsError ? "outline outline-2 outline-offset-1 outline-rose-400" : "",
                    ].join(" ")}
                  />
                  <span>
                    {cta.termsLabel(
                      <Link
                        href="/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="font-semibold underline underline-offset-2 hover:text-indigo-600"
                      >
                        {cta.termsLinkText}
                      </Link>
                    )}
                  </span>
                </label>

                {termsError && (
                  <p className="text-xs font-medium text-rose-600">{cta.termsError}</p>
                )}

                <StripeCheckoutButton
                  productType={productType}
                  locale={STRIPE_LOCALE[locale]}
                  className="w-full bg-indigo-600 py-6 text-base font-bold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 sm:w-auto"
                  label={cta.button}
                  onBeforeCheckout={handleBeforeCheckout}
                />
              </div>
            </div>

            <Button type="button" variant="outline" className="w-full" onClick={reset}>
              {t.analyzeAnother}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
