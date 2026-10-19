import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { IndexNav, OccupationList } from "@/components/occupations/occupation-index-list";
import { activeLocales, isValidLocale } from "@/lib/i18n/config";
import { researchText } from "@/lib/marketing/research-journey";
import { entriesByLetter, groupCounts, letterCounts, LETTERS } from "@/lib/occupations/index-data";
import { pageAlternates, publicUrl } from "@/lib/seo/urls";

type PageProps = { params: Promise<{ locale: string; letter: string }> };

// Letters that have at least one indexable occupation (the same list in every locale: the A-Z order is by English title).
const lettersWithEntries = () => LETTERS.filter((l) => letterCounts("en")[l]);

export function generateStaticParams() {
  return activeLocales.flatMap((locale) => lettersWithEntries().map((letter) => ({ locale, letter })));
}

const heading = (locale: string, letter: string) =>
  researchText(locale, `Occupations starting with ${letter.toUpperCase()}`, `${letter.toUpperCase()} ile başlayan meslekler (İngilizce unvan)`, `英文职业名以 ${letter.toUpperCase()} 开头的职业`);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, letter } = await params;
  if (!isValidLocale(locale) || !lettersWithEntries().includes(letter)) return { robots: { index: false, follow: false } };
  const title = heading(locale, letter);
  const description = researchText(locale, `ANZSCO occupations whose English title starts with ${letter.toUpperCase()}, with source-dated information. Information only.`, `İngilizce unvanı ${letter.toUpperCase()} ile başlayan ANZSCO meslekleri; kaynak tarihli bilgiler. Yalnızca bilgi amaçlıdır.`, `英文职业名以 ${letter.toUpperCase()} 开头的 ANZSCO 职业，附有来源日期的信息。仅供参考。`);
  return { title, description, alternates: pageAlternates(locale, `/occupations/letter/${letter}`), openGraph: { title, description, type: "website", url: publicUrl(locale, `/occupations/letter/${letter}`) } };
}

export default async function OccupationLetterPage({ params }: PageProps) {
  const { locale, letter } = await params;
  if (!isValidLocale(locale) || !lettersWithEntries().includes(letter)) notFound();
  const t = (en: string, tr: string, zh: string) => researchText(locale, en, tr, zh);
  const entries = entriesByLetter(locale, letter);
  const crumbs = [
    { label: t("Home", "Ana sayfa", "首页"), path: "/" },
    { label: t("Occupations", "Meslekler", "职业"), path: "/occupations" },
    { label: letter.toUpperCase(), path: `/occupations/letter/${letter}` },
  ];
  return (
    <main className="flex-1 py-12 sm:py-16">
      <section className="mx-auto w-full max-w-4xl space-y-8 px-4 sm:px-6 lg:px-8">
        <Breadcrumbs locale={locale} crumbs={crumbs} />
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{heading(locale, letter)}</h1>
        <OccupationList locale={locale} entries={entries} />
        <IndexNav locale={locale} groupCounts={groupCounts(locale)} letterCounts={letterCounts(locale)} />
      </section>
    </main>
  );
}
