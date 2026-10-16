import { pageAlternates, publicUrl, SITE_ORIGIN } from "@/lib/seo/urls";
import type { Metadata } from "next";

import { PageViewTracker } from "@/components/analytics/page-view-tracker";

import { VisaComparisonClient } from "./VisaComparisonClient";

const BASE_URL = SITE_ORIGIN;

type PageProps = {
  params: Promise<{ locale: string }>;
};

function getMeta(locale: string) {
  if (locale === "tr") {
    return {
      title: "189 vs 190 vs 491 Vize Karsilastirmasi",
      description:
        "189, 190 ve 491 alt siniflarinin yayimlanmis temel ozelliklerini yan yana karsilastirin: vize tipi, adaylik veya sponsor, minimum puan ve vize basvuru ucreti; resmi kaynak baglantilariyla.",
    };
  }

  if (locale === "zh-Hans") {
    return {
      title: "189 vs 190 vs 491 签证对比",
      description:
        "并排比较 189、190 和 491 子类已公布的主要特点：签证类型、提名或担保、最低分和签证申请费，并附官方来源链接。",
    };
  }

  return {
    title: "189 vs 190 vs 491 Visa Comparison",
    description:
      "Compare the published features of subclasses 189, 190 and 491 side by side: visa type, nomination or sponsorship, minimum points and the visa application charge, with links to the official sources.",
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
    alternates: pageAlternates(locale, `/tools/visa-comparison`),
    openGraph: {
      title: meta.title,
      description: meta.description,
      type: "website",
      url: publicUrl(locale, `/tools/visa-comparison`),
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
