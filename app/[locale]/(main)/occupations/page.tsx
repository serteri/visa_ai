import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs, jsonLd } from "@/components/seo/breadcrumbs";
import { IndexNav, OccupationList } from "@/components/occupations/occupation-index-list";
import { activeLocales, isValidLocale } from "@/lib/i18n/config";
import { researchText } from "@/lib/marketing/research-journey";
import { groupCounts, indexableEntries, letterCounts, richEntries } from "@/lib/occupations/index-data";
import { pageAlternates, publicUrl } from "@/lib/seo/urls";

type PageProps = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return activeLocales.map((locale) => ({ locale }));
}

const copy = (locale: string) => ({
  title: researchText(locale, "Australian occupations (ANZSCO) A–Z and by group", "Avustralya meslekleri (ANZSCO) A–Z ve gruba göre", "澳大利亚职业（ANZSCO）A–Z 与分组索引"),
  description: researchText(
    locale,
    "Index of ANZSCO occupations with source-dated information: assessing authority, national list placement and published state or territory list entries. Information only.",
    "Kaynak tarihli bilgilerle ANZSCO meslekleri dizini: değerlendirme kurumu, ulusal liste yeri ve yayımlanmış eyalet/bölge listesi kayıtları. Yalnızca bilgi amaçlıdır.",
    "ANZSCO 职业索引，附带有来源日期的信息：评估机构、国家清单位置以及已公布的州/领地清单收录情况。仅供参考。",
  ),
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isValidLocale(locale)) return { robots: { index: false, follow: false } };
  const c = copy(locale);
  return { title: c.title, description: c.description, alternates: pageAlternates(locale, "/occupations"), openGraph: { title: c.title, description: c.description, type: "website", url: publicUrl(locale, "/occupations") } };
}

export default async function OccupationIndexPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const t = (en: string, tr: string, zh: string) => researchText(locale, en, tr, zh);
  const c = copy(locale);
  const total = indexableEntries(locale).length;
  const featured = richEntries(locale, 24);
  const crumbs = [
    { label: t("Home", "Ana sayfa", "首页"), path: "/" },
    { label: t("Occupations", "Meslekler", "职业"), path: "/occupations" },
  ];
  const schema = { "@context": "https://schema.org", "@type": "CollectionPage", name: c.title, description: c.description, url: publicUrl(locale, "/occupations"), inLanguage: locale };
  return (
    <main className="flex-1 py-12 sm:py-16">
      <section className="mx-auto w-full max-w-4xl space-y-8 px-4 sm:px-6 lg:px-8">
        <Breadcrumbs locale={locale} crumbs={crumbs} />
        <header className="space-y-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{c.title}</h1>
          <p className="text-sm text-slate-600">
            {t(
              `${total} occupations with source-dated information. Each page names its sources and the date they were checked; none states whether an individual qualifies.`,
              `Kaynak tarihli bilgi içeren ${total} meslek. Her sayfa kaynaklarını ve kontrol tarihini belirtir; hiçbiri bir kişinin uygunluğunu belirtmez.`,
              `共 ${total} 个职业，信息均注明来源与核对日期；页面不对任何个人是否符合条件作出说明。`,
            )}
          </p>
        </header>
        <IndexNav locale={locale} groupCounts={groupCounts(locale)} letterCounts={letterCounts(locale)} />
        <section>
          <h2 className="text-lg font-semibold text-slate-900">{t("Occupations with the most published detail", "En fazla yayımlanmış ayrıntıya sahip meslekler", "已公布信息最丰富的职业")}</h2>
          <p className="mb-3 text-xs text-slate-500">{t("Chosen by data completeness (authority, fee, list and state entries, invitation data), not by popularity.", "Veri bütünlüğüne göre seçilmiştir (kurum, ücret, liste ve eyalet kayıtları, davet verisi); popülerliğe göre değil.", "按数据完整度选取（机构、费用、清单与州收录、邀请数据），而非受欢迎程度。")}</p>
          <OccupationList locale={locale} entries={featured} />
        </section>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
    </main>
  );
}
