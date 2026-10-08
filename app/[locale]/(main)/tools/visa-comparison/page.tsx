import type { Metadata } from "next";

import { PageViewTracker } from "@/components/analytics/page-view-tracker";

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
        "189, 190 ve 491 alt siniflarinin yayimlanmis temel ozelliklerini yan yana karsilastirin: vize tipi, ek puan, sponsor, islem suresi ve ucret.",
    };
  }

  if (locale === "zh-Hans") {
    return {
      title: "189 vs 190 vs 491 签证对比 | LogiVisa",
      description:
        "并排比较 189、190 和 491 子类已公布的主要特点：签证类型、额外加分、担保、处理周期和费用。",
    };
  }

  return {
    title: "189 vs 190 vs 491 Visa Comparison | LogiVisa",
    description:
      "Compare the published features of subclasses 189, 190 and 491 side by side: visa type, extra points, sponsorship, processing time and fees.",
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
  return (
    <>
      <PageViewTracker event="comparison_page_view" params={{ locale, page_type: "visa_comparison" }} />
      <VisaComparisonClient locale={locale} />
    </>
  );
}
