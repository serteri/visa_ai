import type { Metadata } from "next";

import { AnzscoSearchTool } from "./AnzscoSearchTool";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = new URL(BASE_URL);

  return {
    metadataBase: siteUrl,
    title: "ANZSCO Code & Duty Finder | LogiVisa",
    description:
      "Search popular Australian occupations by title or code and review typical ANZSCO duties before checking PR eligibility.",
    alternates: {
      canonical: `/${locale}/tools/anzsco-finder`,
      languages: {
        en: "/en/tools/anzsco-finder",
        tr: "/tr/tools/anzsco-finder",
        "zh-Hans": "/zh-Hans/tools/anzsco-finder",
      },
    },
    openGraph: {
      title: "ANZSCO Code & Duty Finder | LogiVisa",
      description:
        "Find ANZSCO codes, skill levels, and typical occupation duties for Australian skilled migration planning.",
      type: "website",
      url: `/${locale}/tools/anzsco-finder`,
      images: [{ url: "/og/default-og.png", width: 1200, height: 630 }],
    },
  };
}

export default async function AnzscoFinderPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden border-b border-slate-200 bg-slate-950">
        <div className="absolute inset-x-0 top-0 h-1 bg-cyan-500" />
        <div className="mx-auto flex min-h-[380px] max-w-6xl flex-col justify-center px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100">
              Free migration research tool
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              ANZSCO Code & Duty Finder
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
              Search the official Australian occupation database to find your code, skill level,
              and required daily tasks.
            </p>
          </div>
        </div>
      </section>

      <div className="-mt-12">
        <AnzscoSearchTool />
      </div>
    </main>
  );
}
