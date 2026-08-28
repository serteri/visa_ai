import type { Metadata } from "next";

import { JourneyDashboard } from "./JourneyDashboard";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = new URL(BASE_URL);

  const meta = {
    en: {
      title: "My Visa Journey — Free PR Progress Tracker | LogiVisa",
      description:
        "Track every stage of your Australian PR journey for free — preparation, skills assessment, and post-invitation steps in one dashboard.",
    },
    tr: {
      title: "Vize Yolculuğum — Ücretsiz PR Takip Panosu | LogiVisa",
      description:
        "Avustralya PR yolculuğunuzun her aşamasını ücretsiz takip edin — hazırlık, mesleki denklik ve davet sonrası adımlar tek panoda.",
    },
    "zh-Hans": {
      title: "我的签证旅程 — 免费PR进度追踪 | LogiVisa",
      description: "免费追踪您澳大利亚PR旅程的每个阶段——准备、职业评估与获邀后步骤，一目了然。",
    },
  }[locale as "en" | "tr" | "zh-Hans"] || {
    title: "My Visa Journey — Free PR Progress Tracker | LogiVisa",
    description: "Track every stage of your Australian PR journey for free.",
  };

  return {
    metadataBase: siteUrl,
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `/${locale}/journey`,
      languages: {
        en: "/en/journey",
        tr: "/tr/journey",
        "zh-Hans": "/zh-Hans/journey",
      },
    },
  };
}

export default async function JourneyPage({ params }: PageProps) {
  const { locale } = await params;
  return <JourneyDashboard locale={locale} />;
}
