import type { Metadata } from "next";

import { AnzscoClassifier } from "@/components/AnzscoClassifier";

// This page's title is a plain string, not an object -- the locale layout
// (app/[locale]/(main)/layout.tsx) owns the "%s | LogiVisa" template, which
// Next.js applies automatically to produce "AI Visa Pathway Matcher | LogiVisa".
export const metadata: Metadata = {
  title: "AI Visa Pathway Matcher",
  description:
    "Instantly match your CV to an official ANZSCO occupation code with AI. Discover your Australia Skilled Migration (Subclass 189/190/491) pathway in seconds.",
};

type AiVisaMatchPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AiVisaMatchPage({ params }: AiVisaMatchPageProps) {
  const { locale } = await params;

  return (
    <div className="bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <section className="section-shell pt-10 pb-6 text-center sm:pt-16">
        <h1 className="mx-auto max-w-3xl text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl">
          Find Your Australia Visa Pathway in Seconds
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
          Upload your CV and our AI instantly analyzes it against all 707 official
          ANZSCO occupation codes — no forms, no guesswork, just your matching
          Skilled Migration pathway.
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-24 pt-4 sm:px-6">
        <AnzscoClassifier initialLocale={locale} />
      </section>
    </div>
  );
}
