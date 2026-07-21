import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Download, ArrowRight, CheckCircle, Info } from "lucide-react";

import { OCCUPATION_LIST_2026_PDF_URL } from "@/config/resources";

export const metadata: Metadata = {
  title: "2026 Official Occupation List — Australia Skilled Migration",
  description:
    "Download the official 2026 Skilled Occupation List (SOL) PDF published by the Australian Department of Home Affairs. Find out if your occupation is eligible for a subclass 189, 190 or 491 visa.",
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
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 pb-16 pt-12 sm:px-6 lg:px-8">
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
            The <strong>Skilled Occupation List (SOL)</strong> is the definitive reference
            published by the{" "}
            <span className="font-medium text-indigo-600 dark:text-indigo-400">
              Australian Department of Home Affairs
            </span>{" "}
            listing every occupation eligible for Australia&apos;s skilled migration program.
            Check whether your job qualifies, then start your readiness assessment.
          </p>

          {/* Action buttons */}
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              id="view-pdf-btn"
              href={OCCUPATION_LIST_2026_PDF_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <Download className="h-4 w-4" />
              View / Download PDF
            </a>

            <Link
              id="start-assessment-cta"
              href={`/${locale}/full-check`}
              className="inline-flex items-center gap-2.5 rounded-full border border-indigo-200 bg-white px-7 py-3.5 text-sm font-semibold text-indigo-700 shadow-sm transition-all duration-300 hover:border-indigo-400 hover:shadow-md dark:border-indigo-800 dark:bg-zinc-900 dark:text-indigo-300 dark:hover:border-indigo-600"
            >
              Start My Assessment
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* What's in the list */}
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
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
              <strong className="text-slate-700 dark:text-slate-200">ANZSCO code</strong> (the
              Australian and New Zealand Standard Classification of Occupations). Each entry
              shows the occupation title and which skilled-migration visa subclasses it is
              eligible for.
            </p>

            <ul className="space-y-3">
              {HIGHLIGHTS.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                  <span className="text-sm text-slate-600 dark:text-slate-300">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-8 text-center shadow-xl">
            {/* Pattern overlay */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                backgroundSize: "24px 24px",
              }}
            />

            <h2 className="relative text-2xl font-extrabold text-white sm:text-3xl">
              Found your occupation?
            </h2>
            <p className="relative mt-3 text-base text-indigo-100">
              Run a full visa-readiness assessment to see your points score, the
              best pathways for your situation, and a personalised action plan.
            </p>

            <Link
              id="banner-start-assessment-cta"
              href={`/${locale}/full-check`}
              className="relative mt-6 inline-flex items-center gap-2.5 rounded-full bg-white px-8 py-3.5 text-sm font-bold text-indigo-700 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
            >
              Get My Free Report
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
