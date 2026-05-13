import type { Metadata } from "next";

import { VisaComparisonClient } from "./VisaComparisonClient";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

type PageProps = {
  params: Promise<{ locale: string }>;
};

function getMeta(locale: string) {
  if (locale === "tr") {
    return {
      title: "189 vs 190 vs 491 Vize Karsilastirmasi | LogiVisa",
      description:
        "189, 190 ve 491 vizelerini yan yana karsilastirin. Hangi yolun sizin icin daha uygun oldugunu quiz ile gorun.",
    };
  }

  if (locale === "zh-Hans") {
    return {
      title: "189 vs 190 vs 491 签证对比 | LogiVisa",
      description:
        "并排比较189、190和491签证，通过3题小测快速判断更适合你的路径。",
    };
  }

  return {
    title: "189 vs 190 vs 491 Visa Comparison | LogiVisa",
    description:
      "Compare subclass 189, 190, and 491 side by side and use a quick 3-question quiz to find your best pathway.",
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = new URL(BASE_URL);
  const meta = getMeta(locale);

  return {
    metadataBase: siteUrl,
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `/${locale}/tools/visa-comparison`,
      languages: {
        en: `/en/tools/visa-comparison`,
        tr: `/tr/tools/visa-comparison`,
        "zh-Hans": `/zh-Hans/tools/visa-comparison`,
      },
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      type: "website",
      url: `/${locale}/tools/visa-comparison`,
      images: [{ url: "/og/default-og.png", width: 1200, height: 630 }],
    },
  };
}

export default async function VisaComparisonPage({ params }: PageProps) {
  const { locale } = await params;
  return <VisaComparisonClient locale={locale} />;
}
