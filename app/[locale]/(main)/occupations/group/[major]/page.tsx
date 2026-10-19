import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { IndexNav, OccupationList } from "@/components/occupations/occupation-index-list";
import { activeLocales, isValidLocale } from "@/lib/i18n/config";
import { researchText } from "@/lib/marketing/research-journey";
import { entriesByGroup, groupCounts, isMajorGroup, letterCounts, majorGroupName, MAJOR_GROUP_IDS } from "@/lib/occupations/index-data";
import { pageAlternates, publicUrl } from "@/lib/seo/urls";

type PageProps = { params: Promise<{ locale: string; major: string }> };

export function generateStaticParams() {
  return activeLocales.flatMap((locale) => MAJOR_GROUP_IDS.map((major) => ({ locale, major })));
}

const heading = (locale: string, g: Parameters<typeof majorGroupName>[0]) =>
  researchText(locale, `${majorGroupName(g, locale)}: ANZSCO major group ${g}`, `${majorGroupName(g, locale)}: ANZSCO ana grup ${g}`, `${majorGroupName(g, locale)}：ANZSCO 大类 ${g}`);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, major } = await params;
  if (!isValidLocale(locale) || !isMajorGroup(major)) return { robots: { index: false, follow: false } };
  const title = heading(locale, major);
  const description = researchText(locale, `ANZSCO occupations in major group ${major} (${majorGroupName(major, "en")}) with source-dated information. Information only.`, `${major} numaralı ANZSCO ana grubundaki meslekler (${majorGroupName(major, locale)}); kaynak tarihli bilgiler. Yalnızca bilgi amaçlıdır.`, `ANZSCO 大类 ${major}（${majorGroupName(major, locale)}）下的职业，附有来源日期的信息。仅供参考。`);
  return { title, description, alternates: pageAlternates(locale, `/occupations/group/${major}`), openGraph: { title, description, type: "website", url: publicUrl(locale, `/occupations/group/${major}`) } };
}

export default async function OccupationGroupPage({ params }: PageProps) {
  const { locale, major } = await params;
  if (!isValidLocale(locale) || !isMajorGroup(major)) notFound();
  const t = (en: string, tr: string, zh: string) => researchText(locale, en, tr, zh);
  const entries = entriesByGroup(locale, major);
  const crumbs = [
    { label: t("Home", "Ana sayfa", "首页"), path: "/" },
    { label: t("Occupations", "Meslekler", "职业"), path: "/occupations" },
    { label: majorGroupName(major, locale), path: `/occupations/group/${major}` },
  ];
  return (
    <main className="flex-1 py-12 sm:py-16">
      <section className="mx-auto w-full max-w-4xl space-y-8 px-4 sm:px-6 lg:px-8">
        <Breadcrumbs locale={locale} crumbs={crumbs} />
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{heading(locale, major)}</h1>
        <p className="text-sm text-slate-600">{t(`${entries.length} occupations in this group have a published page.`, `Bu gruptaki ${entries.length} mesleğin yayımlanmış bir sayfası var.`, `本组共有 ${entries.length} 个职业设有页面。`)}</p>
        <OccupationList locale={locale} entries={entries} />
        <IndexNav locale={locale} groupCounts={groupCounts(locale)} letterCounts={letterCounts(locale)} />
      </section>
    </main>
  );
}
