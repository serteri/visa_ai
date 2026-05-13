import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import guides from "@/src/data/guides.json";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = new URL(BASE_URL);
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const tx = (en: string, tr: string, zh: string) => (isTr ? tr : isZh ? zh : en);

  const title = tx(
    "Visa Guides & PR Pathway Insights | LogiVisa Hub",
    "Vize Rehberleri ve PR Yol Haritası İçgörüleri | LogiVisa Hub",
    "签证指南与PR路径洞察 | LogiVisa Hub"
  );
  const description = tx(
    "Read practical Australian visa guides, PR points strategies, state nomination explainers, and skilled migration pathway insights.",
    "Pratik Avustralya vize rehberlerini, PR puan stratejilerini, eyalet adaylık açıklamalarını ve nitelikli göç yol haritası içgörülerini okuyun.",
    "阅读实用的澳洲签证指南、PR加分策略、州担保解读和技术移民路径洞察。"
  );

  return {
    metadataBase: siteUrl,
    title,
    description,
    alternates: {
      canonical: `/${locale}/guides`,
      languages: {
        en: "/en/guides",
        tr: "/tr/guides",
        "zh-Hans": "/zh-Hans/guides",
      },
    },
    openGraph: {
      title,
      description: tx(
        "Expert insights, visa strategies, and PR pathways for Australian skilled migration planning.",
        "Avustralya nitelikli göç planlaması için uzman içgörüleri, vize stratejileri ve PR yolları.",
        "为澳洲技术移民规划提供专家洞察、签证策略和PR路径。"
      ),
      type: "website",
      url: `/${locale}/guides`,
      images: [{ url: "/og/default-og.png", width: 1200, height: 630 }],
    },
  };
}

export default async function GuidesIndexPage({ params }: PageProps) {
  const { locale } = await params;
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const tx = (en: string, tr: string, zh: string) => (isTr ? tr : isZh ? zh : en);

  return (
    <main className="min-h-screen bg-slate-50 pt-28 sm:pt-32">
      <section className="relative overflow-hidden border-b border-slate-200 bg-slate-950">
        <div className="absolute inset-x-0 top-0 h-1 bg-cyan-500" />
        <div className="mx-auto flex min-h-[360px] max-w-6xl flex-col justify-center px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100">
              <BookOpen className="h-4 w-4" />
              {tx("LogiVisa Hub", "LogiVisa Merkezi", "LogiVisa 知识中心")}
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              {tx(
                "Expert insights, visa strategies, and PR pathways.",
                "Uzman içgörüleri, vize stratejileri ve PR yolları.",
                "专家洞察、签证策略与PR路径。"
              )}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              {tx(
                "Practical guides for skilled migration applicants researching Australian PR points, state nomination, occupation fit, and pathway strategy.",
                "Avustralya PR puanları, eyalet adaylığı, meslek uyumu ve yol stratejisini araştıran nitelikli göç adayları için pratik rehberler.",
                "面向研究澳洲PR分数、州担保、职业匹配和路径策略的技术移民申请人的实用指南。"
              )}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2">
          {guides.map((guide) => (
            <Link key={guide.slug} href={`/${locale}/guides/${guide.slug}`} className="group">
              <Card className="h-full overflow-hidden rounded-2xl border-slate-200 bg-white transition-all duration-200 hover:-translate-y-1 hover:border-cyan-200 hover:shadow-[0_28px_80px_-50px_rgba(8,145,178,0.6)]">
                <CardContent className="flex h-full flex-col p-6">
                  <div className="flex items-center justify-between gap-4">
                    <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-cyan-800">
                      {locale === "tr" ? (guide as Record<string, string>).category_tr ?? guide.category : locale === "zh-Hans" ? (guide as Record<string, string>).category_zh ?? guide.category : guide.category}
                    </span>
                    <time className="text-sm font-medium text-slate-500" dateTime={guide.date}>
                      {new Date(guide.date).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </time>
                  </div>

                  <h2 className="mt-6 text-2xl font-bold leading-8 tracking-tight text-slate-950">
                    {locale === "tr" ? (guide as Record<string, string>).title_tr ?? guide.title : locale === "zh-Hans" ? (guide as Record<string, string>).title_zh ?? guide.title : guide.title}
                  </h2>
                  <p className="mt-4 flex-1 text-base leading-7 text-slate-600">{locale === "tr" ? (guide as Record<string, string>).excerpt_tr ?? guide.excerpt : locale === "zh-Hans" ? (guide as Record<string, string>).excerpt_zh ?? guide.excerpt : guide.excerpt}</p>

                  <div className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-cyan-800">
                    {tx("Read guide", "Rehberi oku", "阅读指南")}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
