import { pageAlternates, publicUrl, SITE_ORIGIN } from "@/lib/seo/urls";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOccupationBySlug } from "@/lib/occupations";
import { PointsCalculatorClient } from "../points-calculator-client";

const BASE_URL = SITE_ORIGIN;

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const occupation = getOccupationBySlug(slug);

  if (!occupation) {
    return {};
  }

  const title = `${occupation.title} (${occupation.anzsco}) Australia Visa Points Calculator 2026`;
  const description = `Calculate a points total for subclasses 189, 190 and 491 under the published points test, for ${occupation.title} (ANZSCO ${occupation.anzsco}). Information only.`;
  const siteUrl = new URL(BASE_URL);

  return {
    metadataBase: siteUrl,
    title,
    description,
    alternates: pageAlternates(locale, `/tools/points-calculator/${slug}`),
    openGraph: {
      title,
      description,
      type: "website",
      url: publicUrl(locale, `/tools/points-calculator/${slug}`),
      images: [{ url: "/og/default-og.png", width: 1200, height: 630 }],
    },
  };
}

export default async function OccupationPointsCalculatorPage({ params }: PageProps) {
  const { locale, slug } = await params;
  const occupation = getOccupationBySlug(slug);

  if (!occupation) {
    notFound();
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="px-4 sm:px-6 lg:px-8 text-center mx-auto w-full max-w-6xl">
        <span className="inline-block rounded-full border border-[#53917E]/30 bg-[#53917E]/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-[#53917E]">
          Occupation Specific Calculator
        </span>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Australia Visa Points Calculator for{" "}
          <span className="text-[#53917E]">
            {occupation.title}
          </span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base text-slate-600">
          Calculate a points total for subclasses 189, 190 and 491 under the Department of Home Affairs points test. Occupation: <strong>{occupation.title} (ANZSCO {occupation.anzsco})</strong>.
        </p>
      </div>
      
      <PointsCalculatorClient locale={locale} hideHeader={true} occupation={occupation} />
    </div>
  );
}
