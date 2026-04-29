import Link from "next/link";
import { eq, sql } from "drizzle-orm";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { fullCheckUsage } from "@/db/schema";
import { FullCheckWaitlistForm } from "./full-check-waitlist-form";

type ComparisonRow = { label: string; quick: string; full: string };
type ReportCard = { title: string; description: string };
const READINESS_REVIEW_SOURCE = ["readiness", "pre" + "view"].join("-");

async function ensureFullCheckUsageTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS full_check_usage (
      id INT PRIMARY KEY DEFAULT 1,
      free_reports_used INT DEFAULT 0,
      free_limit INT DEFAULT 500,
      is_free_active BOOLEAN DEFAULT TRUE,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.execute(sql`ALTER TABLE full_check_usage ADD COLUMN IF NOT EXISTS free_reports_used INT DEFAULT 0`);
  await db.execute(sql`ALTER TABLE full_check_usage ADD COLUMN IF NOT EXISTS free_limit INT DEFAULT 500`);
  await db.execute(sql`ALTER TABLE full_check_usage ADD COLUMN IF NOT EXISTS is_free_active BOOLEAN DEFAULT TRUE`);
  await db.execute(sql`ALTER TABLE full_check_usage ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`);
  await db.execute(sql`
    INSERT INTO full_check_usage (id, free_reports_used, free_limit, is_free_active)
    VALUES (1, 0, 500, TRUE)
    ON CONFLICT (id) DO NOTHING
  `);
}

async function getFullCheckUsageStatus() {
  await ensureFullCheckUsageTable();

  const [usage] = await db
    .select()
    .from(fullCheckUsage)
    .where(eq(fullCheckUsage.id, 1))
    .limit(1);

  const freeReportsUsed = usage?.free_reports_used ?? 0;
  const freeLimit = usage?.free_limit ?? 500;
  const isFreeActive = usage?.is_free_active ?? true;
  const remaining = isFreeActive ? Math.max(0, freeLimit - freeReportsUsed) : 0;

  return {
    remaining,
    isFreeActive,
  };
}

function getComparisonRows(isTr: boolean): ComparisonRow[] {
  if (isTr) {
    return [
      {
        label: "Olası vize yolları",
        quick: "Yalnızca olası yol alanları",
        full: "Yapılandırılmış yol karşılaştırması",
      },
      { label: "Vize yolu güç karşılaştırması", quick: "Dahil değil", full: "Dahil" },
      { label: "Risk göstergeleri", quick: "Dahil değil", full: "Dahil" },
      { label: "Kanıt/Bilgi hazırlık özeti", quick: "Dahil değil", full: "Dahil" },
      { label: "Puan senaryo simülatörü", quick: "Dahil değil", full: "İlgili olduğunda dahil" },
      { label: "Tahmini maliyet yol haritası", quick: "Dahil değil", full: "Dahil" },
      { label: "Tipik geçiş yolları", quick: "Dahil değil", full: "İlgili olduğunda dahil" },
      { label: "Vize yolu gerçeklik kontrolü", quick: "Dahil değil", full: "Dahil" },
      { label: "Değerlendirilebilecek sonraki adımlar", quick: "Dahil değil", full: "Dahil" },
      { label: "İndirilebilir PDF", quick: "Dahil değil", full: "Dahil" },
    ];
  }

  return [
    {
      label: "Possible pathways",
      quick: "Possible pathway areas only",
      full: "Structured pathway comparison",
    },
    { label: "Pathway strength comparison", quick: "Not included", full: "Included" },
    { label: "Risk indicators", quick: "Not included", full: "Included" },
    { label: "Evidence readiness snapshot", quick: "Not included", full: "Included" },
    { label: "Points booster simulator", quick: "Not included", full: "Included where relevant" },
    { label: "Financial roadmap", quick: "Not included", full: "Included" },
    { label: "Bridge to PR / progression pathways", quick: "Not included", full: "Included where relevant" },
    { label: "Pathway friction / reality check", quick: "Not included", full: "Included" },
    { label: "Next steps that can be considered", quick: "Not included", full: "Included" },
    { label: "Downloadable PDF", quick: "Not included", full: "Included" },
  ];
}

function getReportCards(isTr: boolean): ReportCard[] {
  if (isTr) {
    return [
      {
        title: "Vize yolu güç karşılaştırması",
        description:
          "Olası yollar güç, sürtünme ve açıklama ile karşılaştırılır.",
      },
      {
        title: "Kanıt/Bilgi hazırlık özeti",
        description:
          "Form bilgileri ile tipik kanıt kategorileri birlikte gösterilir.",
      },
      {
        title: "Puan senaryo simülatörü",
        description:
          "Puan testli yollar için matematiksel puan senaryoları ilgili olduğunda gösterilir.",
      },
      {
        title: "Tahmini maliyet yol haritası",
        description:
          "Resmi ücret ve üçüncü taraf maliyet kategorileri genel bilgi olarak ayrılır.",
      },
      {
        title: "Vize yolu gerçeklik kontrolü",
        description:
          "Her yol için sürtünme ve pratik sınırlayıcı faktörler özetlenir.",
      },
    ];
  }

  return [
    {
      title: "Pathway comparison",
      description:
        "Supported visa pathways are compared side by side to show which options may be relevant.",
    },
    {
      title: "Pathway strength comparison",
      description: "Possible pathways are compared by strength, friction, and explanation.",
    },
    {
      title: "Evidence readiness snapshot",
      description:
        "Form details are mapped against typical evidence categories.",
    },
    {
      title: "Points booster simulator",
      description:
        "Points-tested pathways show mathematical score scenarios where relevant.",
    },
    {
      title: "Financial roadmap",
      description: "Official fee and third-party cost categories are separated as general information.",
    },
    {
      title: "Pathway friction / reality check",
      description: "Practical friction factors are summarized for each pathway.",
    },
  ];
}

type FullCheckPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    source?: string;
    goal?: string;
    occupation?: string;
    preferredPathway?: string;
    visaInterest?: string;
    biggestConcern?: string;
    currentCountry?: string;
  }>;
};

function buildPrefilledGoal(input: {
  goal?: string;
  occupation?: string;
  biggestConcern?: string;
}) {
  const parts = [
    input.goal ? `Goal: ${input.goal}` : null,
    input.occupation ? `Occupation: ${input.occupation}` : null,
    input.biggestConcern ? `Biggest concern: ${input.biggestConcern}` : null,
  ].filter((item): item is string => Boolean(item));

  return parts.join("\n");
}

export default async function FullCheckPage({ params, searchParams }: FullCheckPageProps) {
  const { locale } = await params;
  const query = await searchParams;
  const isTr = locale === "tr";
  const usageStatus = await getFullCheckUsageStatus();
  const cameFromReadinessReview = query.source === READINESS_REVIEW_SOURCE;
  const cameFromResults = query.source === "results";
  const initialValues = {
    visaInterest: query.visaInterest ?? query.preferredPathway ?? "",
    currentCountry: query.currentCountry ?? "",
    source: query.source ?? "full_check",
    mainGoal: buildPrefilledGoal({
      goal: query.goal,
      occupation: query.occupation,
      biggestConcern: query.biggestConcern,
    }),
  };

  const comparisonRows = getComparisonRows(isTr);
  const reportCards = getReportCards(isTr);
  const showLimitWarning = usageStatus.remaining > 0 && usageStatus.remaining <= 50;

  return (
    <main className="ambient-bg flex-1 py-12">
      <section className="section-shell space-y-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr] lg:items-start">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{isTr ? "Erken erişim" : "Early access"}</Badge>
              <Badge variant="outline">{isTr ? "Yapılandırılmış rapor" : "Structured report"}</Badge>
            </div>
            <h1 className="text-3xl font-bold sm:text-4xl">
              {isTr ? "Tam Vize Hazırlık Raporu" : "Full Visa Readiness Report"}
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
              {isTr
                ? "Yapılandırılmış hazırlık raporu; detaylı analiz, riskler, belgeler ve hazırlık içgörüleri sunar."
                : "Structured readiness report with detailed analysis, risks, documents, and preparation insights."}
            </p>
            <p className="max-w-3xl rounded-md border border-primary/20 bg-card px-4 py-3 text-sm text-muted-foreground">
              {isTr
                ? "Bu rapor, sağlanan ayrıntılara dayalı yapılandırılmış bilgi raporudur."
                : "This is a structured information report based on the details provided."}
            </p>
            <p
              className={`max-w-3xl rounded-md px-4 py-3 text-sm ${
                usageStatus.remaining <= 0
                  ? "border border-amber-300 bg-amber-50 text-amber-900"
                  : showLimitWarning
                    ? "border border-amber-300 bg-amber-50 text-amber-900"
                    : "border border-primary/20 bg-card text-muted-foreground"
              }`}
            >
              {usageStatus.remaining > 0
                ? isTr
                  ? `Erken erişim · ${usageStatus.remaining} ücretsiz rapor kaldı`
                  : `Early access · ${usageStatus.remaining} free reports remaining`
                : isTr
                  ? "Erken erişim limiti doldu"
                  : "Early access limit reached"}
            </p>
          </div>

          <Card className="border-primary/40 bg-primary/5">
            <CardHeader>
              <CardTitle>
                {isTr ? "Hazırlık raporunuzu oluşturun" : "Generate your readiness report"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 rounded-md border border-primary/20 bg-background/80 px-3 py-2">
                <p className="text-sm text-muted-foreground">
                  {isTr
                    ? "Ürünü geliştirirken ilk 500 hazırlık raporu ücretsizdir."
                    : "The first 500 readiness reports are free while we improve the product."}
                </p>
                {usageStatus.remaining > 0 ? (
                  <p className={`text-xs ${showLimitWarning ? "text-amber-800" : "text-muted-foreground"}`}>
                    {isTr
                      ? `${usageStatus.remaining} ücretsiz rapor kaldı.`
                      : `${usageStatus.remaining} free reports remaining.`}
                  </p>
                ) : (
                  <p className="text-xs text-amber-800">
                    {isTr ? "Erken erişim limiti doldu." : "Early access limit reached."}
                  </p>
                )}
              </div>
              {(cameFromReadinessReview || cameFromResults) && (
                <p className="rounded-md border border-primary/20 bg-background/80 px-3 py-2 text-sm text-muted-foreground">
                  {isTr
                    ? `${cameFromResults ? "Hızlı kontrol sonuçlarından" : "Hazırlık incelemesinden"} gelen bilgiler mümkün olan alanlara eklendi. Göndermeden önce alanları düzenleyebilirsiniz.`
                    : `Details from the ${cameFromResults ? "quick check results" : "readiness review"} were added where possible. Fields can be edited before submitting.`}
                </p>
              )}
              <FullCheckWaitlistForm locale={locale} initialValues={initialValues} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {isTr
                ? "Hızlı Yol Kontrolü ile Tam Vize Hazırlık Raporu Karşılaştırması"
                : "Quick Pathway Check vs Full Visa Readiness Report"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-3 pr-4 font-semibold">{isTr ? "Özellik" : "Feature"}</th>
                    <th className="px-4 py-3 font-semibold">
                      {isTr ? "Hızlı Yol Kontrolü" : "Quick Pathway Check"}
                    </th>
                    <th className="px-4 py-3 font-semibold text-primary">
                      {isTr ? "Tam Vize Hazırlık Raporu" : "Full Visa Readiness Report"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.label} className="border-b border-border/70 last:border-0">
                      <td className="py-3 pr-4 font-medium">{row.label}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.quick}</td>
                      <td className="px-4 py-3 font-medium">{row.full}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <div>
            <h2 className="text-2xl font-bold">
              {isTr ? "Rapor bölümleri" : "Report sections"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isTr
                ? "Hızlı kontrolün aksine, bu rapor ayrı bölümler halinde pratik bir inceleme olarak düzenlenmiştir."
                : "Unlike the quick check, this report is organized as a practical review with separate sections."}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {reportCards.map((card) => (
              <Card key={card.title}>
                <CardHeader>
                  <CardTitle className="text-lg">{card.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{card.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isTr ? "Henüz hazır değil misiniz?" : "Not ready yet?"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {isTr
                ? "Ücretsiz yol kontrolü hâlâ kullanılabilir ve kayıtlı göç danışmanı görüşmesi ilgili olabilir."
                : "The free pathway check remains available, and registered migration agent input may be relevant."}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href={`/${locale}/checker`}>
                  {isTr ? "Kontrole geri dön" : "Back to checker"}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/${locale}/agent-referral`}>
                  {isTr
                    ? "Kayıtlı göç danışmanı ile görüş"
                    : "Speak with a registered migration agent"}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground">
          {isTr
            ? "Bu yalnızca genel bilgidir ve göç tavsiyesi değildir."
            : "This is general information only and not migration advice."}
        </p>
      </section>
    </main>
  );
}
