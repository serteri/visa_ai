import Link from "next/link";

import { Breadcrumbs, jsonLd } from "@/components/seo/breadcrumbs";
import { researchText } from "@/lib/marketing/research-journey";
import { publicPath, publicUrl } from "@/lib/seo/urls";
import { PAIRS, pairContent, type PairSlug } from "@/lib/visas/pair-comparison";

/** One pair page: a neutral two-column table, each column linked to its official page and dated. */
export function PairComparisonView({ slug, locale }: { slug: PairSlug; locale: string }) {
  const c = pairContent(slug, locale);
  const t = (en: string, tr: string, zh: string) => researchText(locale, en, tr, zh);
  const path = `/tools/visa-comparison/${slug}`;
  const crumbs = [
    { label: t("Home", "Ana sayfa", "首页"), path: "/" },
    { label: t("Visa comparison", "Vize karşılaştırma", "签证对比"), path: "/tools/visa-comparison" },
    { label: c.title, path },
  ];
  const verified = c.columns.map((x) => x.verified).sort().at(-1)!;
  const schema = { "@context": "https://schema.org", "@type": "WebPage", name: c.title, description: c.description, url: publicUrl(locale, path), inLanguage: locale, dateModified: verified };
  return (
    <main className="min-h-screen bg-background pb-16 pt-6">
      <section className="mx-auto max-w-5xl space-y-6 px-4 sm:px-6">
        <Breadcrumbs locale={locale} crumbs={crumbs} />
        <div className="rounded-2xl border border-slate-200 bg-card p-6 shadow-sm sm:p-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{c.title}</h1>
          <p className="mt-3 text-base text-slate-600">{c.subtitle}</p>
          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm" data-pair-table={slug}>
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">{c.feature}</th>
                  {c.columns.map((col) => (
                    <th key={col.subclass} className="px-4 py-3 text-left font-semibold">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="align-top">
                {c.rows.map((row) => (
                  <tr key={row.label} className="border-t border-slate-200">
                    <th scope="row" className="px-4 py-3 text-left font-medium text-slate-900">
                      {row.label}
                    </th>
                    {row.values.map((v, i) => (
                      <td key={i} className="px-4 py-3 text-slate-600">
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t border-slate-200 bg-slate-50/60" data-pair-sources>
                  <th scope="row" className="px-4 py-3 text-left font-medium text-slate-900">
                    {t("Source and data verified", "Kaynak ve veri doğrulama tarihi", "来源与数据核对日期")}
                  </th>
                  {c.columns.map((col) => (
                    <td key={col.subclass} className="px-4 py-3 text-slate-600">
                      <a href={col.sourceUrl} target="_blank" rel="noopener noreferrer" data-official-source className="font-medium text-cyan-800 underline">
                        {col.sourceName}
                      </a>{" "}
                      · <time dateTime={col.verified}>{col.verified}</time>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          {c.notes.map((n) => (
            <p key={n} className="mt-3 text-xs text-slate-500">
              {n}
            </p>
          ))}
          <p className="mt-3 text-sm">
            <a href={c.processingGuide.url} target="_blank" rel="noopener noreferrer" data-official-source className="font-medium text-cyan-800 underline">
              {c.processingGuide.label}
            </a>
          </p>
        </div>
        <nav aria-label={t("Related comparisons", "İlgili karşılaştırmalar", "相关对比")} className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900">{t("Other comparisons", "Diğer karşılaştırmalar", "其他对比")}</h2>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {PAIRS.filter((p) => p.slug !== slug).map((p) => (
              <li key={p.slug}>
                <Link className="font-medium text-cyan-800 underline" href={publicPath(locale, `/tools/visa-comparison/${p.slug}`)}>
                  {p.a} vs {p.b}
                </Link>
              </li>
            ))}
            <li>
              <Link className="font-medium text-cyan-800 underline" href={publicPath(locale, "/tools/visa-comparison")}>
                {t("189 vs 190 vs 491", "189 / 190 / 491", "189 / 190 / 491")}
              </Link>
            </li>
            <li>
              <Link className="font-medium text-cyan-800 underline" href={publicPath(locale, "/tools/cost-calculator")}>
                {t("Visa application charges", "Vize başvuru ücretleri", "签证申请费")}
              </Link>
            </li>
            {c.columns.map((col) => (
              <li key={`info-${col.subclass}`}>
                <Link className="font-medium text-cyan-800 underline" href={publicPath(locale, `/visas/${col.subclass}`)}>
                  {t(`Subclass ${col.subclass} information`, `Alt sınıf ${col.subclass} bilgileri`, `${col.subclass} 子类信息`)}
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
