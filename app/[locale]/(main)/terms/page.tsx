import type { Metadata } from "next";

import { TermsEn, TermsTr, TermsZh } from "./terms-content";

type TermsPageProps = {
  params: Promise<{ locale: string }>;
};

function getMetadataFor(locale: string): Metadata {
  if (locale === "tr") {
    return {
      title: "Kullanım Koşulları ve İade Politikası",
      description:
        "LogiVisa Kullanım Koşulları, dijital ürün iade politikası ve göç danışmanlığı uyarısı.",
    };
  }
  if (locale === "zh-Hans") {
    return {
      title: "服务条款与退款政策",
      description: "LogiVisa 服务条款、数字产品退款政策及移民建议免责声明。",
    };
  }
  return {
    title: "Terms of Service & Refund Policy",
    description:
      "LogiVisa's Terms of Service, digital product refund policy, and immigration advice disclaimer.",
  };
}

// generateMetadata (not a static export) because the title/description
// must match the active locale -- the locale layout's "%s | LogiVisa"
// template still applies automatically on top of this.
export async function generateMetadata({ params }: TermsPageProps): Promise<Metadata> {
  const { locale } = await params;
  return getMetadataFor(locale);
}

export default async function TermsPage({ params }: TermsPageProps) {
  const { locale } = await params;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 text-indigo-100 prose prose-invert">
      {locale === "tr" ? <TermsTr /> : locale === "zh-Hans" ? <TermsZh /> : <TermsEn />}
    </div>
  );
}
