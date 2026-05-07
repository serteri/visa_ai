import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BadgeCheck, ShieldCheck, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MiniCvTeaser } from "@/components/MiniCvTeaser";
import { StateDemandRadar } from "@/components/StateDemandRadar";
import { isValidLocale } from "@/lib/i18n/config";
import { deriveSubclasses, findOccupationById, parseOccupationCodeFromId } from "@/lib/occupations/seo";

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
  const fallbackCode = parseOccupationCodeFromId(id);

  if (!occupation) {
    const fallbackHref = fallbackCode
      ? `/en/full-check?occupation=${encodeURIComponent(fallbackCode)}`
      : "/en/full-check";

    return (
      <main className="ambient-bg relative flex-1 overflow-hidden py-12 sm:py-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),transparent_55%)]" />
        <section className="relative mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
          <Card className="border-slate-200/80 bg-white/95 shadow-2xl shadow-slate-900/10 backdrop-blur">
            <CardHeader className="space-y-4 pb-3 text-center">
              <Badge variant="outline" className="mx-auto w-fit border-amber-300 bg-amber-50 text-amber-800">
                Occupation Lookup
              </Badge>
              <CardTitle className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Occupation Not Found
              </CardTitle>
              <p className="mx-auto max-w-2xl text-sm text-slate-600 sm:text-base">
                We could not match this occupation slug to our ANZSCO dataset. You can still run a full readiness check
                and enter your occupation manually.
              </p>
            </CardHeader>
            <CardContent className="pb-8">
              <div className="mx-auto flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:justify-center">
                <Button asChild size="lg" className="h-14 rounded-xl px-8 text-base font-bold shadow-lg shadow-cyan-500/30">
                  <Link href={fallbackHref}>
                    Check Your PR Eligibility Now (Free)
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-14 rounded-xl px-8 text-base font-semibold">
                  <Link href="/en/tools/points-calculator">Open Points Calculator</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    );
  }

  const subclasses = deriveSubclasses(occupation);
  const fullCheckHref = `/en/full-check?occupation=${encodeURIComponent(occupation.anzsco_code)}`;

  return (
    <main className="ambient-bg relative flex-1 overflow-hidden py-12 sm:py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),transparent_55%)]" />

      <section className="relative mx-auto w-full max-w-6xl space-y-8 px-4 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 p-8 shadow-2xl shadow-slate-900/10 backdrop-blur sm:p-12">
          <div className="flex flex-wrap items-center justify-center gap-3 text-center">
            <Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-cyan-900">
              ANZSCO {occupation.anzsco_code}
            </Badge>
            <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
              <Sparkles className="mr-1 size-3.5" /> AI-Powered Strategy Landing
            </Badge>
          </div>

          <h1 className="mx-auto mt-6 max-w-4xl text-center text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Visa Options for {occupation.occupation_name} ({occupation.anzsco_code}) in Australia
          </h1>

          <p className="mx-auto mt-5 max-w-4xl text-center text-base text-slate-600 sm:text-lg">
            {tx(
              locale,
              `作为 ${occupation.occupation_name}，快速了解你是否适合 189、190 和 491 签证。使用我们的 AI 工具进行分数估算，并将你的 CV 职责与官方 ANZSCO 标准进行匹配。`,
              `${occupation.occupation_name} olarak 189, 190 ve 491 icin uygunluk gorunumunuzu hizlica inceleyin. AI destekli aracimiz puan tahmini yapar ve CV gorevlerinizi resmi ANZSCO standartlariyla eslestirir.`,
              `Find out your eligibility for 189, 190, and 491 visas as a ${occupation.occupation_name}. Use our AI-powered tool to calculate your points and match your CV duties with official ANZSCO standards.`
            )}
          </p>

          <div className="mt-8 flex justify-center">
            <Button
              asChild
              size="lg"
              className="h-16 rounded-2xl bg-cyan-600 px-10 text-base font-extrabold shadow-2xl shadow-cyan-600/30 transition hover:bg-cyan-500 sm:px-14 sm:text-lg"
            >
              <Link href={fullCheckHref}>
                Check Your PR Eligibility Now (Free)
                <ArrowRight className="ml-2 size-5" />
              </Link>
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600 sm:text-sm">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-emerald-600" />
              ANZSCO-aligned checks
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BadgeCheck className="size-4 text-cyan-600" />
              Occupation-specific score signals
            </span>
          </div>
        </header>

        <Card className="border-cyan-300/90 bg-gradient-to-br from-white via-cyan-50/70 to-emerald-50/70 shadow-2xl shadow-cyan-900/10">
          <CardHeader>
            <CardTitle className="text-xl font-extrabold text-slate-900">
              AI Duty Match Teaser
            </CardTitle>
            <p className="text-sm text-slate-600">
              Try a fast preview and unlock your full duty analysis with occupation-specific PR readiness context.
            </p>
          </CardHeader>
          <CardContent>
            <MiniCvTeaser occupationId={id} />
          </CardContent>
        </Card>

        <StateDemandRadar
          locale={locale}
          occupationName={occupation.occupation_name}
          occupationId={id}
        />

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-slate-200/80 bg-white/95 shadow-lg shadow-slate-900/5">
            <CardHeader>
              <CardTitle>
                {tx(locale, "评估机构", "Degerlendirme Kurumu", "Assessing Authority")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{occupation.authority}</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/95 shadow-lg shadow-slate-900/5">
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

        <Card className="border-cyan-200/80 bg-gradient-to-r from-cyan-50 via-white to-emerald-50 shadow-xl shadow-cyan-900/10">
          <CardContent className="space-y-4 p-8 text-center sm:p-10">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              {tx(
                locale,
                "检查你的职业专属准备度并计算分数",
                "Bu Meslek Icin Hazirliginizi Kontrol Edin ve Puaninizi Hesaplayin",
                "Check your specific readiness and calculate points for this occupation"
              )}
            </h2>
            <Button asChild size="lg" className="h-14 rounded-xl bg-cyan-600 px-10 text-base font-bold hover:bg-cyan-500">
              <Link href={fullCheckHref}>
                Check Your PR Eligibility Now (Free)
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
