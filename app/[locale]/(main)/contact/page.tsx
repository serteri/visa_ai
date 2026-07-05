import type { Metadata } from "next";

import { ContactPageClient } from "./ContactPageClient";

type ContactPageProps = {
  params: Promise<{ locale: string }>;
};

function getMetadataFor(locale: string): Metadata {
  if (locale === "tr") {
    return {
      title: "Bize Ulaşın",
      description:
        "Sorularınız için LogiVisa ekibiyle iletişime geçin. Genel sorular ve teknik destek için bize ulaşın.",
    };
  }
  if (locale === "zh-Hans") {
    return {
      title: "联系我们",
      description: "如有任何问题，请联系 LogiVisa 团队。一般咨询与技术支持均可与我们联系。",
    };
  }
  return {
    title: "Contact Us",
    description:
      "Get in touch with the LogiVisa team. Reach us for general inquiries or technical support.",
  };
}

export async function generateMetadata({ params }: ContactPageProps): Promise<Metadata> {
  const { locale } = await params;
  return getMetadataFor(locale);
}

export default async function ContactPage({ params }: ContactPageProps) {
  const { locale } = await params;

  return <ContactPageClient locale={locale} />;
}
