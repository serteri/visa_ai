import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;

  return {
    metadataBase: new URL(BASE_URL),
    title: "Visa pathways for Australia and Canada | LogiVisa",
    description: "Compare Australia and Canada visa pathways and select the right immigration route.",
    alternates: {
      canonical: `/${locale}/visas`,
      languages: {
        en: `/en/visas`,
        tr: `/tr/visas`,
        "zh-Hans": `/zh-Hans/visas`,
      },
    },
  };
}

export default async function VisasOverviewPage({ params }: PageProps) {
  const { locale } = await params;
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";

  const title = isTr ? "Vize Yolları" : isZh ? "签证通道" : "Visa Pathways";
  const subtitle = isTr
    ? "Avustralya ve Kanada için en güncel göçmenlik ve vize seçeneklerini keşfedin."
    : isZh
    ? "探索澳大利亚和加拿大的最新移民与签证通道。"
    : "Explore current Australia and Canada immigration and visa pathways.";

  const cards = [
    {
      label: isTr ? "Avustralya" : isZh ? "澳大利亚" : "Australia",
      description: isTr
        ? "Çalışma, eğitim ve sürekli oturum için Avustralya vizelerini keşfedin."
        : isZh
        ? "探索澳大利亚的学习、工作和永久居留签证。"
        : "Explore Australia visas for study, work, and permanent residency.",
      href: `/${locale}/visas/australia`,
      accent: "border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100",
    },
    {
      label: isTr ? "Kanada" : isZh ? "加拿大" : "Canada",
      description: isTr
        ? "Express Entry ile Kanada'ya kalıcı oturum için başvurularınızı yönetin."
        : isZh
        ? "通过快速通道了解加拿大永久居留申请流程。"
        : "Learn how Express Entry supports Canada permanent residency applications.",
      href: `/${locale}/visas/canada`,
      accent: "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 pb-20 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-widest text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            VISAS
          </p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">{title}</h1>
          <p className="mx-auto mt-3 max-w-2xl text-base text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {cards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className={`group flex flex-col justify-between overflow-hidden rounded-3xl border p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md ${card.accent} dark:border-zinc-800 dark:bg-zinc-900`}
            >
              <div>
                <div className="mb-4 flex items-center justify-between text-sm font-semibold uppercase tracking-wide">
                  <span>{card.label}</span>
                  <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-100">{isTr ? "Başla" : isZh ? "开始" : "Start"}</span>
                </div>
                <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">{card.description}</p>
              </div>
              <div className="mt-6 flex items-center justify-between text-sm font-semibold text-slate-900 dark:text-white">
                <span>{isTr ? "Detayları Gör" : isZh ? "查看详情" : "See details"}</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
