import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs, jsonLd } from "@/components/seo/breadcrumbs";
import { CostCalculatorClient } from "@/components/tools/cost-calculator-client";
import { activeLocales, isValidLocale } from "@/lib/i18n/config";
import { CHARGE_SUBCLASSES, chargesFor, EXCLUDED_SUBCLASSES } from "@/lib/costs/visa-charges";
import { researchText } from "@/lib/marketing/research-journey";
import { pageAlternates, publicPath, publicUrl } from "@/lib/seo/urls";

type PageProps = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return activeLocales.map((locale) => ({ locale }));
}

const copy = (locale: string) => ({
  title: researchText(locale, "Visa application charge calculator (subclasses 189, 190, 491, 482)", "Vize başvuru ücreti hesaplayıcı (alt sınıf 189, 190, 491, 482)", "签证申请费计算器（189、190、491、482 子类）"),
  description: researchText(
    locale,
    "Adds the published visa application charges for the numbers you enter. Every figure shows its source and the date it was verified. Information only; other costs are not included.",
    "Girdiğiniz sayılar için yayımlanmış vize başvuru ücretlerini toplar. Her rakam kaynağını ve doğrulama tarihini gösterir. Yalnızca bilgi amaçlıdır; diğer maliyetler dahil değildir.",
    "按您输入的人数汇总已公布的签证申请费。每个金额均注明来源和核对日期。仅供参考，不含其他费用。",
  ),
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isValidLocale(locale)) return { robots: { index: false, follow: false } };
  const c = copy(locale);
  return { title: c.title, description: c.description, alternates: pageAlternates(locale, "/tools/cost-calculator"), openGraph: { title: c.title, description: c.description, type: "website", url: publicUrl(locale, "/tools/cost-calculator"), images: [{ url: "/og/default-og.png", width: 1200, height: 630 }] } };
}

export default async function CostCalculatorPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const t = (en: string, tr: string, zh: string) => researchText(locale, en, tr, zh);
  const c = copy(locale);
  const charges = CHARGE_SUBCLASSES.map(chargesFor);
  const verified = charges.flatMap((x) => [x.main, x.additionalAdult, x.child, ...(x.secondInstalment ? [x.secondInstalment] : [])].map((f) => f.source.verified)).sort().at(-1)!;
  const crumbs = [
    { label: t("Home", "Ana sayfa", "首页"), path: "/" },
    { label: t("Tools", "Araçlar", "工具"), path: "/tools/anzsco-finder" },
    { label: t("Visa application charges", "Vize başvuru ücretleri", "签证申请费"), path: "/tools/cost-calculator" },
  ];
  const schema = { "@context": "https://schema.org", "@type": "WebPage", name: c.title, description: c.description, url: publicUrl(locale, "/tools/cost-calculator"), inLanguage: locale, dateModified: verified };
  const excluded = Object.keys(EXCLUDED_SUBCLASSES).join(", ");
  return (
    <main className="min-h-screen bg-background pb-16 pt-6">
      <section className="mx-auto max-w-5xl space-y-6 px-4 sm:px-6">
        <Breadcrumbs locale={locale} crumbs={crumbs} />
        <div className="rounded-2xl border border-slate-200 bg-card p-6 shadow-sm sm:p-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{c.title}</h1>
          <p className="mt-3 text-base text-slate-600">{c.description}</p>
          <div className="mt-6">
            <CostCalculatorClient locale={locale} charges={charges} />
          </div>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-slate-500">
            <li>{t("Only the visa application charges published on the Department of Home Affairs visa pages are added. Reduced pricing for some citizenships and course types is not applied.", "Yalnızca İçişleri Bakanlığı vize sayfalarında yayımlanan vize başvuru ücretleri toplanır. Bazı vatandaşlıklar ve kurs türleri için indirimli fiyatlar uygulanmaz.", "仅汇总内政部签证页面公布的签证申请费。部分国籍和课程类型的优惠价格未计入。")}</li>
            <li>{t("Not included: health examinations, police certificates, skills assessment and English test fees, translations and any state nomination fee. Those have separate pages with their own sources.", "Dahil değildir: sağlık muayeneleri, sabıka belgeleri, beceri değerlendirmesi ve İngilizce sınav ücretleri, çeviriler ve eyalet aday gösterme ücretleri. Bunların kendi kaynaklı sayfaları vardır.", "不含：体检、无犯罪证明、技能评估和英语考试费用、翻译以及州提名费。这些费用在各自带来源的页面中列出。")}</li>
            <li>{t(`Subclasses ${excluded} are not offered: the charge has no verification record in the fee provenance yet.`, `${excluded} alt sınıfları sunulmaz: ücret için henüz ücret kaynak kaydında doğrulama kaydı yok.`, `不提供 ${excluded} 子类：其费用在费用来源记录中尚无核对记录。`)}</li>
            <li>{t("Charges change; the Department's visa page is the authority at lodgement.", "Ücretler değişir; başvuru anında esas kaynak Bakanlığın vize sayfasıdır.", "费用会调整；提交申请时以内政部签证页面为准。")}</li>
          </ul>
        </div>
        <nav aria-label={t("Related", "İlgili", "相关")} className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900">{t("Related research", "İlgili araştırma", "相关内容")}</h2>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {[
              ["/tools/visa-comparison", t("189 vs 190 vs 491", "189 / 190 / 491 karşılaştırma", "189 / 190 / 491 对比")],
              ["/tools/skills-assessment", t("Skills assessment finder", "Beceri değerlendirmesi bulucu", "技能评估查询")],
              ["/tools/state-nomination", t("State nomination data", "Eyalet adaylık verileri", "州提名数据")],
              ["/tools/points-calculator/australia", t("Points calculator", "Puan hesaplayıcı", "积分计算器")],
              ["/visas/189", t("Subclass 189 information", "Alt sınıf 189 bilgileri", "189 子类信息")],
              ["/visas/190", t("Subclass 190 information", "Alt sınıf 190 bilgileri", "190 子类信息")],
              ["/visas/491", t("Subclass 491 information", "Alt sınıf 491 bilgileri", "491 子类信息")],
            ].map(([path, label]) => (
              <li key={path}>
                <Link className="font-medium text-cyan-800 underline" href={publicPath(locale, path)}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
    </main>
  );
}
