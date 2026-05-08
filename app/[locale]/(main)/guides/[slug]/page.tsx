import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import guides from "@/src/data/guides.json";
import { InlineLeadCta } from "../InlineLeadCta";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

type Guide = (typeof guides)[number];

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

function findGuide(slug: string): Guide | undefined {
  return guides.find((guide) => guide.slug === slug);
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function ArticleBlock({ block }: { block: string }) {
  if (block.startsWith("## ")) {
    return (
      <h2 className="mt-10 text-2xl font-bold tracking-tight text-slate-950">
        {block.replace("## ", "")}
      </h2>
    );
  }

  return <p className="mt-5 text-lg leading-8 text-slate-700">{block}</p>;
}

export async function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const guide = findGuide(slug);
  const siteUrl = new URL(BASE_URL);

  if (!guide) {
    return {
      metadataBase: siteUrl,
      title: "Guide Not Found | LogiVisa",
    };
  }

  return {
    metadataBase: siteUrl,
    title: `${guide.title} | LogiVisa Hub`,
    description: guide.excerpt,
    alternates: {
      canonical: `/${locale}/guides/${guide.slug}`,
      languages: {
        en: `/en/guides/${guide.slug}`,
        tr: `/tr/guides/${guide.slug}`,
        "zh-Hans": `/zh-Hans/guides/${guide.slug}`,
      },
    },
    openGraph: {
      title: `${guide.title} | LogiVisa Hub`,
      description: guide.excerpt,
      type: "article",
      url: `/${locale}/guides/${guide.slug}`,
      publishedTime: guide.date,
      images: [{ url: "/og/default-og.png", width: 1200, height: 630 }],
    },
  };
}

export default async function GuideArticlePage({ params }: PageProps) {
  const { locale, slug } = await params;
  const guide = findGuide(slug);

  if (!guide) notFound();

  const blocks = guide.content.split("\n\n").filter(Boolean);
  const midpoint = Math.max(2, Math.floor(blocks.length / 2));
  const firstHalf = blocks.slice(0, midpoint);
  const secondHalf = blocks.slice(midpoint);

  return (
    <main className="min-h-screen bg-white pt-28 sm:pt-32">
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <Link
          href={`/${locale}/guides`}
          className="inline-flex items-center gap-2 text-sm font-bold text-cyan-800 transition-colors hover:text-cyan-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to guides
        </Link>

        <header className="mt-10 border-b border-slate-200 pb-10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-cyan-800">
              {guide.category}
            </span>
            <time className="text-sm font-medium text-slate-500" dateTime={guide.date}>
              {formatDate(guide.date)}
            </time>
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            {guide.title}
          </h1>
          <p className="mt-6 text-xl leading-8 text-slate-600">{guide.excerpt}</p>
        </header>

        <div className="mt-10">
          {firstHalf.map((block) => (
            <ArticleBlock key={block} block={block} />
          ))}

          <InlineLeadCta />

          {secondHalf.map((block) => (
            <ArticleBlock key={block} block={block} />
          ))}

          <InlineLeadCta />
        </div>
      </article>
    </main>
  );
}
