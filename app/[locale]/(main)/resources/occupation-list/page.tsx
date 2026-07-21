import type { Metadata } from "next";
import { FileText, CheckCircle, Info } from "lucide-react";

import { LeadMagnetForm } from "@/components/LeadMagnetForm";

export const metadata: Metadata = {
  title: "2026 Official Occupation List — Australia Skilled Migration",
  description:
    "Get the official 2026 Skilled Occupation List (SOL) delivered to your inbox. Find out if your occupation is eligible for a subclass 189, 190 or 491 visa.",
};

const HIGHLIGHTS = [
  "Covers all ANZSCO occupations eligible for skilled-migration pathways",
  "Used for subclass 189, 190, 491, 482 and more",
  "Published directly by the Australian Department of Home Affairs",
  "Updated for the 2025–2026 program year",
];

export default async function OccupationListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-indigo-950/20">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-4 pb-12 pt-12 sm:px-6 lg:px-8">
        {/* Decorative blobs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 right-0 h-96 w-96 rounded-full bg-indigo-200/30 blur-3xl dark:bg-indigo-900/20"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-violet-200/30 blur-3xl dark:bg-violet-900/20"
        />

        <div className="relative mx-auto max-w-3xl text-center">
          {/* Badge */}
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
            <FileText className="h-3.5 w-3.5" />
            Official Government Document
          </span>

          <h1 className="mt-2 bg-gradient-to-br from-slate-900 via-indigo-900 to-violet-800 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl dark:from-white dark:via-indigo-200 dark:to-violet-300">
            2026 Official<br />Occupation List
          </h1>

          <p className="mt-5 text-lg leading-relaxed text-slate-600 dark:text-slate-300">
            The <strong>Skilled Occupation List (SOL)</strong> is the definitive
            reference published by the{" "}
            <span className="font-medium text-indigo-600 dark:text-indigo-400">
              Australian Department of Home Affairs
            </span>{" "}
            listing every occupation eligible for Australia&apos;s skilled
            migration program. Enter your email below and we&apos;ll send it
            straight to your inbox.
          </p>
        </div>
      </section>

      {/* ── Lead capture + highlights ── */}
      <section className="px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2">
          {/* Lead capture card */}
          <div className="rounded-2xl border border-indigo-100 bg-white/90 p-8 shadow-md backdrop-blur-sm dark:border-indigo-900/50 dark:bg-zinc-900/70">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-indigo-500">
              Free · Instant delivery
            </p>
            <h2 className="mb-6 text-xl font-bold text-slate-800 dark:text-white">
              Get the PDF in your inbox
            </h2>

            <LeadMagnetForm
              locale={locale}
              documentId="csol-2026"
              documentName="2026 Official Occupation List"
            />
          </div>

          {/* What's in the list */}
          <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-8 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/60">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/50">
                <Info className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </span>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                What&apos;s in this document?
              </h2>
            </div>

            <p className="mb-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              The PDF lists hundreds of occupations identified by their{" "}
              <strong className="text-slate-700 dark:text-slate-200">
                ANZSCO code
              </strong>{" "}
              (the Australian and New Zealand Standard Classification of
              Occupations). Each entry shows the occupation title and which
              skilled-migration visa subclasses it is eligible for.
            </p>

            <ul className="space-y-3">
              {HIGHLIGHTS.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {point}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>


    </div>
  );
}
