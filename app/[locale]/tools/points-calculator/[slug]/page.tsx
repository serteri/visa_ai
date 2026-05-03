import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOccupationBySlug } from "@/lib/occupations";
import { PointsCalculatorClient } from "../points-calculator-client";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const occupation = getOccupationBySlug(slug);

  if (!occupation) {
    return {};
  }

  const title = `${occupation.title} (${occupation.anzsco}) Australia Visa Points Calculator 2026 | LogiVisa`;
  const description = `Calculate your 189, 190, and 491 visa points specifically for ${occupation.title}. Check your eligibility and hidden risks instantly.`;
  const siteUrl = new URL(BASE_URL);

  return {
    metadataBase: siteUrl,
    title,
    description,
    alternates: {
      canonical: `/${locale}/tools/points-calculator/${slug}`,
      languages: {
        en: `/en/tools/points-calculator/${slug}`,
        tr: `/tr/tools/points-calculator/${slug}`,
        "zh-Hans": `/zh-Hans/tools/points-calculator/${slug}`,
      },
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: `/${locale}/tools/points-calculator/${slug}`,
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
    <div className="bg-slate-50 min-h-screen">
      <div className="pt-28 px-4 sm:px-6 lg:px-8 text-center mx-auto w-full max-w-6xl">
        <span className="inline-block rounded-full border border-blue-200 bg-blue-50 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-blue-600">
          Occupation Specific Calculator
        </span>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Australia Visa Points Calculator for{" "}
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {occupation.title}
          </span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base text-slate-500">
          Check your PR readiness as a <strong>{occupation.title} ({occupation.anzsco})</strong> using the latest 2026 DHA rules.
        </p>
      </div>
      
      <PointsCalculatorClient locale={locale} hideHeader={true} />
    </div>
  );
}
