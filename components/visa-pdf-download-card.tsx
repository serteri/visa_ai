import { ExternalLink, FileDown, FileText } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

type VisaPdfDownloadCardProps = {
  title?: string;
  description?: string;
  pdfUrls: string[];
  sourceUrl?: string;
  primaryLabel?: string;
  sourceLabel?: string;
};

export function VisaPdfDownloadCard({
  title = "Download Official Migration Guide (PDF)",
  description = "Open the official source snapshot stored on Vercel Blob and keep the application guide handy.",
  pdfUrls,
  sourceUrl,
  primaryLabel = "Open PDF",
  sourceLabel = "Open source page",
}: VisaPdfDownloadCardProps) {
  if (pdfUrls.length === 0) {
    return null;
  }

  const primaryPdfUrl = pdfUrls[0];

  return (
    <Card className="overflow-hidden border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-sky-50 shadow-sm dark:border-cyan-500/20 dark:from-cyan-950/30 dark:via-slate-900 dark:to-slate-900">
      <CardContent className="space-y-5 p-6 sm:p-7">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-600 text-white shadow-lg shadow-cyan-600/25">
            <FileText className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-300">
              PDF
            </p>
            <h3 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">
              {title}
            </h3>
          </div>
        </div>

        <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          {description}
        </p>

        <div className="flex flex-wrap gap-3">
          <a
            href={primaryPdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700"
          >
            <FileDown className="h-4 w-4" />
            {primaryLabel}
          </a>
          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
            >
              {sourceLabel}
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
        </div>

        {pdfUrls.length > 1 ? (
          <div className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
            {pdfUrls.slice(1).map((pdfUrl) => (
              <a
                key={pdfUrl}
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 break-all rounded-xl border border-dashed border-cyan-200 bg-white/70 px-3 py-2 font-medium text-cyan-800 transition-colors hover:bg-cyan-50 dark:border-cyan-500/20 dark:bg-slate-950/50 dark:text-cyan-200 dark:hover:bg-cyan-950/40"
              >
                <FileText className="h-4 w-4 shrink-0" />
                {pdfUrl}
              </a>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}