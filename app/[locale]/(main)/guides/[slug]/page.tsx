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

type GuideFaq = {
  q: string;
  a: string;
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

function renderInline(text: string, locale: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^\)]+\))/g);

  function normalizeHref(rawHref: string) {
    return rawHref.replace("{locale}", `/${locale}`);
  }

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }

        const linkMatch = part.match(/^\[([^\]]+)\]\(([^\)]+)\)$/);
        if (linkMatch) {
          const label = linkMatch[1];
          const href = normalizeHref(linkMatch[2]);
          const isInternal = href.startsWith("/");

          if (isInternal) {
            return (
              <Link key={i} href={href} className="font-semibold text-cyan-800 underline decoration-cyan-300 underline-offset-2">
                {label}
              </Link>
            );
          }

          return (
            <a
              key={i}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-cyan-800 underline decoration-cyan-300 underline-offset-2"
            >
              {label}
            </a>
          );
        }

        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function ArticleBlock({ block, locale }: { block: string; locale: string }) {
  if (block.startsWith("## ")) {
    return (
      <h2 className="mt-10 text-2xl font-bold tracking-tight text-slate-950">
        {block.replace("## ", "")}
      </h2>
    );
  }

  const lines = block.split("\n");
  if (lines.every((line) => line.startsWith("- "))) {
    return (
      <ul className="mt-5 list-disc space-y-2 pl-6 text-lg leading-8 text-slate-700">
        {lines.map((line, i) => (
          <li key={i}>{renderInline(line.slice(2), locale)}</li>
        ))}
      </ul>
    );
  }

  return <p className="mt-5 text-lg leading-8 text-slate-700">{renderInline(block, locale)}</p>;
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

  const g = guide as Record<string, string | number | GuideFaq[]>;
  const localTitle = locale === "tr" ? (g.metaTitle_tr as string | undefined) ?? (g.title_tr as string | undefined) ?? guide.title : locale === "zh-Hans" ? (g.metaTitle_zh as string | undefined) ?? (g.title_zh as string | undefined) ?? guide.title : (g.metaTitle as string | undefined) ?? guide.title;
  const localExcerpt = locale === "tr" ? (g.metaDescription_tr as string | undefined) ?? (g.excerpt_tr as string | undefined) ?? guide.excerpt : locale === "zh-Hans" ? (g.metaDescription_zh as string | undefined) ?? (g.excerpt_zh as string | undefined) ?? guide.excerpt : (g.metaDescription as string | undefined) ?? guide.excerpt;
  return {
    metadataBase: siteUrl,
    title: `${localTitle} | LogiVisa Hub`,
    description: localExcerpt,
    alternates: {
      canonical: `/${locale}/guides/${guide.slug}`,
      languages: {
        en: `/en/guides/${guide.slug}`,
        tr: `/tr/guides/${guide.slug}`,
        "zh-Hans": `/zh-Hans/guides/${guide.slug}`,
      },
    },
    openGraph: {
      title: `${localTitle} | LogiVisa Hub`,
      description: localExcerpt,
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
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const tx = (en: string, tr: string, zh: string) => (isTr ? tr : isZh ? zh : en);

  if (!guide) notFound();

  const blocks = guide.content.split("\n\n").filter(Boolean);
  const g = guide as Record<string, string | number | GuideFaq[]>;
  const localTitle = isTr ? (g.title_tr as string) ?? guide.title : isZh ? (g.title_zh as string) ?? guide.title : guide.title;
  const localExcerpt = isTr ? (g.excerpt_tr as string) ?? guide.excerpt : isZh ? (g.excerpt_zh as string) ?? guide.excerpt : guide.excerpt;
  const localCategory = isTr ? (g.category_tr as string) ?? guide.category : isZh ? (g.category_zh as string) ?? guide.category : guide.category;
  const readTime = (g.readTime as number | undefined) ?? 7;
  const createdAt = (g.createdAt as string | undefined) ?? guide.date;
  const faqItems = (g.faqs as GuideFaq[] | undefined) ?? [];
  const localFaqTitle = isTr
    ? ((g.faqTitle_tr as string | undefined) ?? "Sikca Sorulan Sorular")
    : isZh
      ? ((g.faqTitle_zh as string | undefined) ?? "常见问题")
      : ((g.faqTitle as string | undefined) ?? "Frequently Asked Questions");

  const faqSchemaJson = faqItems.length
    ? JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqItems.map((faq) => ({
          "@type": "Question",
          name: faq.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.a,
          },
        })),
      })
    : null;
  const midpoint = Math.max(2, Math.floor(blocks.length / 2));
  const firstHalf = blocks.slice(0, midpoint);
  const secondHalf = blocks.slice(midpoint);

  return (
    <main className="min-h-screen bg-white pt-28 sm:pt-32">
      {faqSchemaJson ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqSchemaJson }} />
      ) : null}
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <Link
          href={`/${locale}/guides`}
          className="inline-flex items-center gap-2 text-sm font-bold text-cyan-800 transition-colors hover:text-cyan-950"
        >
          <ArrowLeft className="h-4 w-4" />
          {tx("Back to guides", "Rehberlere dön", "返回指南")}
        </Link>

        <header className="mt-10 border-b border-slate-200 pb-10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-cyan-800">
              {localCategory}
            </span>
            <time className="text-sm font-medium text-slate-500" dateTime={guide.date}>
              {formatDate(guide.date)}
            </time>
            <span className="text-sm font-medium text-slate-500">{readTime} {tx("min read", "dk okuma", "分钟阅读")}</span>
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            {localTitle}
          </h1>
          <p className="mt-6 text-xl leading-8 text-slate-600">{localExcerpt}</p>
        </header>

        <div className="mt-10">
          {firstHalf.map((block) => (
            <ArticleBlock key={block} block={block} locale={locale} />
          ))}

          <InlineLeadCta />

          {secondHalf.map((block) => (
            <ArticleBlock key={block} block={block} locale={locale} />
          ))}

          <InlineLeadCta />

          {faqItems.length ? (
            <section className="mt-14 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h2 className="text-2xl font-bold tracking-tight text-slate-950">{localFaqTitle}</h2>
              <div className="mt-4 space-y-4">
                {faqItems.map((faq, index) => (
                  <div key={`${faq.q}-${index}`} className="rounded-xl bg-white p-4 border border-slate-200">
                    <h3 className="text-base font-semibold text-slate-900">{faq.q}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-700">{faq.a}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <p className="mt-8 text-sm text-slate-500">
            {tx("Created", "Olusturulma", "创建于")} {formatDate(createdAt)}
          </p>
        </div>
      </article>
    </main>
  );
}
