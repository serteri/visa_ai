import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { OccupationToolClickTracker } from "@/components/analytics/occupation-tool-click-tracker";
import { OccupationViewTracker } from "@/components/analytics/occupation-view-tracker";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Breadcrumbs, jsonLd } from "@/components/seo/breadcrumbs";
import { FactTables } from "@/components/occupations/fact-tables";
import { getAdminStateData } from "@/lib/admin-data/loader";
import { buildFactRows, ABS_ANZSCO_URL } from "@/lib/occupations/facts";
import { majorGroupName, majorGroupOf } from "@/lib/occupations/index-data";
import { OccupationResearch } from "@/components/occupations/occupation-research";
import { OccupationDistinction } from "@/components/occupations/occupation-distinction";
import { TraSkillsAssessment } from "@/components/occupations/tra-skills-assessment";
import { ResearchLinks, ProfessionalHelp } from "@/components/research-links";
import {
  researchText,
} from "@/lib/marketing/research-journey";
import { resolveAssessingAuthority } from "@/lib/skills-assessment/resolve-authority";
import assessingBodies from "@/src/data/assessing-bodies.json";
import { activeLocales, isValidLocale, type Locale } from "@/lib/i18n/config";
import { occupationPageContent } from "@/lib/occupations/page-content";
import { occupationRedirectFor } from "@/lib/occupations/redirects";
import {
  buildOccupationSlug,
  findOccupationById,
  getUniqueOccupations,
} from "@/lib/occupations/seo";
import {
  pageAlternates,
  publicPath,
  publicUrl,
  SITE_ORIGIN,
} from "@/lib/seo/urls";

// SSG: every {locale} x {listed occupation} page is pre-rendered at build time. getUniqueOccupations() is the same set
// findOccupationById() resolves, so no generated slug 404s.
export function generateStaticParams() {
  const occupations = getUniqueOccupations();
  return activeLocales.flatMap((locale) =>
    occupations.map((occupation) => ({
      locale,
      id: buildOccupationSlug(occupation),
    })),
  );
}

// Static pages that re-render hourly (and when the admin saves, through the cache tag): the state rows come from the admin state data.
export const revalidate = 3600;

type PageProps = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, id } = await params;
  const occupation = findOccupationById(id);
  if (!occupation || !isValidLocale(locale))
    return { robots: { index: false, follow: false } };

  const content = occupationPageContent(occupation, locale);
  const path = `/occupations/${content.slug}`;
  return {
    metadataBase: new URL(SITE_ORIGIN),
    title: content.title,
    description: content.description,
    alternates: pageAlternates(locale, path),
    // Thin pages (little or no unique data -- lib/occupations/richness.ts) stay out of the index until they carry some.
    robots:
      content.richness.tier === "thin"
        ? { index: false, follow: true }
        : { index: true, follow: true },
    openGraph: {
      title: content.title,
      description: content.description,
      type: "article",
      url: publicUrl(locale, path),
      images: [
        {
          url: "/og/default-og.png",
          width: 1200,
          height: 630,
          alt: `${content.displayName} ${content.code}`,
        },
      ],
    },
  };
}

export default async function OccupationDetailsPage({ params }: PageProps) {
  const { locale, id } = await params;
  if (!isValidLocale(locale)) notFound();

  const occupation = findOccupationById(id);
  if (!occupation) {
    // A code that was published once (no page now) goes to the occupation index; only a code that never existed is a 404.
    // proxy.ts answers this with a 301 before rendering; this is the same answer if the proxy was bypassed.
    const moved = occupationRedirectFor(
      publicPath(locale, `/occupations/${id}`),
    );
    if (moved) permanentRedirect(moved.to);
    notFound();
  }

  const c = occupationPageContent(occupation, locale as Locale);
  const text = (en: string, tr: string, zh: string) =>
    researchText(locale, en, tr, zh);
  const snapshot = await getAdminStateData();
  const facts = buildFactRows(occupation, c, snapshot);
  const dataVerified = facts.map((f) => f.verified).sort().at(-1) ?? c.lastModified;
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Occupation", "@id": `${publicUrl(locale, `/occupations/${c.slug}`)}#occupation`, name: c.displayName, occupationalCategory: c.code, description: c.research ? c.intro : c.duties[0] ?? c.intro },
      { "@type": "WebPage", url: publicUrl(locale, `/occupations/${c.slug}`), name: c.title, inLanguage: locale, dateModified: dataVerified, about: { "@id": `${publicUrl(locale, `/occupations/${c.slug}`)}#occupation` } },
      ...(c.research ? [{ "@type": "FAQPage", "@id": `${publicUrl(locale, `/occupations/${c.slug}`)}#faq`, inLanguage: locale, mainEntity: c.research.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }] : []),
    ],
  };
  const resolved = resolveAssessingAuthority(c.code);
  const authority = c.richness.authority ? resolved.authority : undefined;
  const authorityKey =
    (
      { EA: "Engineers Australia", CPA: "CPAA", "CA-ANZ": "ICAA" } as Record<
        string,
        string
      >
    )[resolved.authorityId] ?? resolved.authorityId;
  const authorityWebsite = (
    assessingBodies.assessingBodies as Record<string, { website: string }>
  )[authorityKey]?.website;
  const programs =
    authority?.pathways.map((p) =>
      typeof p.name === "string" ? p.name : p.name[locale as Locale],
    ) ?? [];
  const relatedOccupations = getUniqueOccupations()
    .filter(
      (record) =>
        record.anzsco_code !== c.code &&
        record.anzsco_code.slice(0, 4) === c.code.slice(0, 4),
    )
    .slice(0, 4);
  // One URL per occupation: a slug with the right code but different words resolves to the canonical slug.
  if (id !== c.slug)
    permanentRedirect(publicPath(locale, `/occupations/${c.slug}`));

  const group = majorGroupOf(c.code);
  const crumbs = [
    { label: text("Home", "Ana sayfa", "首页"), path: "/" },
    { label: text("Occupations", "Meslekler", "职业"), path: "/occupations" },
    ...(group ? [{ label: majorGroupName(group, locale), path: `/occupations/group/${group}` }] : []),
    { label: c.displayName, path: `/occupations/${c.slug}` },
  ];

  const row =
    "flex flex-col gap-1 border-b border-slate-100 py-3 sm:flex-row sm:gap-6";
  const rowLabel =
    "w-full shrink-0 text-sm font-semibold text-slate-700 sm:w-64";
  const rowValue = "text-sm text-slate-600";

  return (
    <main className="ambient-bg relative flex-1 overflow-hidden py-12 sm:py-16">
      <OccupationViewTracker occupationCode={c.code} locale={locale} />
      <OccupationToolClickTracker occupationCode={c.code} locale={locale} />
      <section className="relative mx-auto w-full max-w-4xl space-y-8 px-4 sm:px-6 lg:px-8">
        <Breadcrumbs locale={locale} crumbs={crumbs} />

        <header className="rounded-3xl border border-slate-200/80 bg-white/95 p-8 shadow-xl shadow-slate-900/5 sm:p-10">
          <Badge
            variant="outline"
            className="border-cyan-200 bg-cyan-50 text-cyan-900"
          >
            ANZSCO {c.code}
          </Badge>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {c.h1}
          </h1>
          <p className="mt-4 text-base text-slate-600">
            {c.research ? c.intro : c.duties[0] ?? c.intro}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            {text(
              "ANZSCO classification reference. List and visa sources may use different classification editions; this page does not classify an individual's work.",
              "ANZSCO sınıflandırma referansı. Liste ve vize kaynakları farklı sürümler kullanabilir; bu sayfa kişinin işini sınıflandırmaz.",
              "ANZSCO 分类参考。清单与签证来源可能使用不同分类版本；本页不对个人工作进行分类。",
            )}
          </p>
        </header>

        <OccupationResearch c={c} locale={locale} part="main" />

        {c.research ? null : c.tra ? <TraSkillsAssessment block={c.tra} locale={locale} /> : (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-slate-900">
              {text(
                "Skills assessment references",
                "Beceri değerlendirme kaynakları",
                "技能评估参考",
              )}
            </h2>
            <p className="mt-3 font-medium text-slate-800">
              {c.details.authority ?? c.labels.authorityNone}
            </p>
            {programs.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
                {programs.map((program) => (
                  <li key={program}>{program}</li>
                ))}
              </ul>
            )}
            {authority && (
              <p className="mt-3 break-words text-xs leading-relaxed text-slate-500">
                {authority.sourceDocument} ·{" "}
                {text("Last reviewed", "Son kontrol", "最近核对")}:{" "}
                {authority.lastVerified}
              </p>
            )}
            <p className="mt-3 text-sm text-slate-600">
              {text(
                "Published assessment programs are reference information, not a decision about which program applies to an individual.",
                "Yayımlanmış değerlendirme programları kaynak bilgisidir; kişiye hangi programın uygulanacağını belirlemez.",
                "已公布的评估类别仅供参考，不确定个人适用的评估类别。",
              )}
            </p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3 text-sm font-medium text-cyan-900">
              <Link
                data-tool-destination="skills_assessment"
                href={publicPath(
                  locale,
                  `/tools/skills-assessment?q=${c.code}`,
                )}
                className="underline"
              >
                {text(
                  "Explore skills assessment",
                  "Beceri değerlendirmesi",
                  "探索技能评估",
                )}
              </Link>
              {authorityWebsite && (
                <a
                  data-official-source
                  href={authorityWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {text(
                    "Official authority source",
                    "Resmî kurum kaynağı",
                    "评估机构官方来源",
                  )}
                </a>
              )}
            </div>
          </section>
        )}

        <OccupationDistinction code={c.code} locale={locale} />

        <FactTables locale={locale} facts={facts} stateNote={`${c.stateNote} ${text("State information is read from LogiVisa's admin state data (the same data the reports use); the date in each row is when that state's data was last verified.", "Eyalet bilgileri LogiVisa'nın yönetim paneli eyalet verisinden okunur (raporların kullandığı aynı veri); her satırdaki tarih, o eyalet verisinin son doğrulandığı tarihtir.", "州信息读取自 LogiVisa 管理后台的州数据（与报告使用的数据相同）；每行日期为该州数据最近一次核对的日期。")}`} />

        <OccupationResearch c={c} locale={locale} part="faq" />

        {c.research ? null : <ResearchLinks locale={locale} code={c.code} />}

        {c.duties.length > 0 && !c.research && (
          <Card className="border-slate-200/80 bg-white/95 shadow-lg shadow-slate-900/5">
            <CardHeader>
              <h2 className="text-lg font-semibold leading-none tracking-tight">
                {c.headings.duties}
              </h2>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
                {c.duties.map((duty) => (
                  <li key={duty}>{duty}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Card className="border-slate-200/80 bg-white/95 shadow-lg shadow-slate-900/5">
          <CardHeader>
            <h2 className="text-lg font-semibold leading-none tracking-tight">
              {c.headings.sources}
            </h2>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            {c.sourceLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
            <p>
              <a
                href={c.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-official-source
                className="font-medium text-cyan-800 underline"
              >
                {c.officialLabel}
              </a>
            </p>
          </CardContent>
        </Card>

        <nav
          aria-label={c.headings.related}
          className="rounded-2xl border border-slate-200/80 bg-white/95 p-6"
        >
          <h2 className="text-base font-semibold text-slate-900">
            {c.headings.related}
          </h2>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {c.related.map((link) => (
              <li key={link.path}>
                <Link
                  href={publicPath(locale, link.path)}
                  data-tool-destination={link.destination}
                  className="font-medium text-cyan-800 underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {relatedOccupations.length > 0 && (
          <nav
            className="rounded-2xl border border-slate-200 bg-white p-6"
            aria-label={text(
              "Related occupations",
              "İlgili meslekler",
              "相关职业",
            )}
          >
            <h2 className="font-semibold text-slate-900">
              {text(
                "Related occupations in this unit group",
                "Bu birim grubundaki ilgili meslekler",
                "同一单元组的相关职业",
              )}
            </h2>
            <ul className="mt-3 space-y-3 text-sm">
              {relatedOccupations.map((record) => (
                <li key={record.anzsco_code}>
                  <Link
                    className="text-cyan-900 underline"
                    href={publicPath(
                      locale,
                      `/occupations/${buildOccupationSlug(record)}`,
                    )}
                  >
                    {record.occupation_name} · {record.anzsco_code}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <p className="text-xs text-slate-500" data-abs-attribution>
          {text("Occupation titles and task descriptions are based on the Australian Bureau of Statistics (ABS) ANZSCO, 2013, Version 1.3.", "Meslek adları ve görev tanımları, Avustralya İstatistik Bürosu (ABS) ANZSCO, 2013, Sürüm 1.3'e dayanır.", "职业名称和任务描述依据澳大利亚统计局（ABS）ANZSCO 2013 第 1.3 版。")}{" "}
          <a data-official-source href={ABS_ANZSCO_URL} target="_blank" rel="noopener noreferrer" className="underline">ABS ANZSCO</a>
        </p>

        <ProfessionalHelp locale={locale} />

        <p className="text-xs text-slate-500">{c.notice}</p>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      </section>
    </main>
  );
}
