import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isValidLocale } from "@/lib/i18n/config";
import { deriveSubclasses, findOccupationById } from "@/lib/occupations/seo";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

const tx = (locale: string, zh: string, tr: string, en: string) =>
  locale === "tr" ? tr : locale === "zh-Hans" ? zh : en;

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, id } = await params;
  const siteUrl = new URL(BASE_URL);
  const occupation = findOccupationById(id);

  if (!occupation) {
    return {
      metadataBase: siteUrl,
      title: "Occupation Visa Options | Logivisa",
      description: "Occupation-specific visa options and points guidance.",
    };
  }

  const subclasses = deriveSubclasses(occupation).join(", ") || "189, 190, 491";
  const title = tx(
    locale,
    `${occupation.occupation_name} (${occupation.anzsco_code}) 签证路径与分数评估`,
    `${occupation.occupation_name} (${occupation.anzsco_code}) Vize Yollari ve Puan Kontrolu`,
    `${occupation.occupation_name} (${occupation.anzsco_code}) Visa Options & Points Check`
  );

  const description = tx(
    locale,
    `${occupation.occupation_name}（${occupation.anzsco_code}）的评估机构、相关签证子类（${subclasses}）与准备度行动建议。`,
    `${occupation.occupation_name} (${occupation.anzsco_code}) icin degerlendirme kurumu, uygun alt siniflar (${subclasses}) ve hazirlik aksiyonlari.`,
    `Assessing authority, relevant subclasses (${subclasses}), and readiness actions for ${occupation.occupation_name} (${occupation.anzsco_code}).`
  );

  return {
    metadataBase: siteUrl,
    title,
    description,
    alternates: {
      canonical: `/${locale}/occupations/${id}`,
      languages: {
        en: `/en/occupations/${id}`,
        tr: `/tr/occupations/${id}`,
        "zh-Hans": `/zh-Hans/occupations/${id}`,
      },
    },
    openGraph: {
      title,
      description,
      type: "article",
      url: `/${locale}/occupations/${id}`,
      images: [
        {
          url: "/og/default-og.png",
          width: 1200,
          height: 630,
          alt: `${occupation.occupation_name} ${occupation.anzsco_code}`,
        },
      ],
    },
  };
}

export default async function OccupationDetailsPage({ params }: PageProps) {
  const { locale, id } = await params;

  if (!isValidLocale(locale)) notFound();

  const occupation = findOccupationById(id);
  if (!occupation) notFound();

  const subclasses = deriveSubclasses(occupation);

  return (
    <main className="ambient-bg flex-1 py-12 sm:py-16">
      <section className="mx-auto w-full max-w-5xl space-y-8 px-4 sm:px-6 lg:px-8">
        <header className="space-y-4">
          <Badge variant="outline">ANZSCO {occupation.anzsco_code}</Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {occupation.occupation_name} ({occupation.anzsco_code}) {tx(locale, "签证路径与分数评估", "Vize Yollari ve Puan Kontrolu", "Visa Options & Points Check")}
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
            {tx(
              locale,
              "本页提供该职业的评估机构与常见签证子类，帮助你快速定位下一步。",
              "Bu sayfa mesleginiz icin degerlendirme kurumunu ve yaygin vize alt siniflarini ozetler.",
              "This page summarizes the assessing authority and common subclass options for this occupation."
            )}
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>
                {tx(locale, "评估机构", "Degerlendirme Kurumu", "Assessing Authority")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{occupation.authority}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {tx(locale, "常见签证子类", "Uygun Vize Alt Siniflari", "Relevant Subclasses")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subclasses.length > 0 ? (
                <ul className="space-y-2">
                  {subclasses.map((subclass) => (
                    <li key={subclass} className="text-sm text-muted-foreground">
                      Subclass {subclass}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {tx(locale, "暂无明确子类。", "Net alt sinif bulunamadi.", "No clear subclass mapping found.")}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-primary/50 bg-primary/5 shadow-xl">
          <CardContent className="space-y-4 p-8 text-center sm:p-10">
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              {tx(
                locale,
                "检查你的职业专属准备度并计算分数",
                "Bu Meslek Icin Hazirliginizi Kontrol Edin ve Puaninizi Hesaplayin",
                "Check your specific readiness and calculate points for this occupation"
              )}
            </h2>
            <Button asChild size="lg" className="h-12 px-8 text-base font-semibold">
              <Link href={`/${locale}/full-check`}>
                {tx(locale, "进入 Full Check", "Full Check'e Gec", "Go to Full Check")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
