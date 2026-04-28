import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FullCheckWaitlistForm } from "./full-check-waitlist-form";

type ComparisonRow = { label: string; quick: string; full: string };
type ReportCard = { title: string; description: string };
const READINESS_REVIEW_SOURCE = ["readiness", "pre" + "view"].join("-");

function getComparisonRows(isTr: boolean): ComparisonRow[] {
  if (isTr) {
    return [
      {
        label: "Olası vize yolları",
        quick: "Yalnızca olası yol alanları",
        full: "Yapılandırılmış yol karşılaştırması",
      },
      { label: "Risk göstergeleri", quick: "Dahil değil", full: "Dahil" },
      { label: "Belge kontrol listesi", quick: "Dahil değil", full: "Dahil" },
      { label: "Veri/Belge bilgi göstergeleri", quick: "Dahil değil", full: "Dahil" },
      { label: "Birincil boşluk", quick: "Dahil değil", full: "Dahil" },
      { label: "Veri tamamlanma düzeyi", quick: "Dahil değil", full: "Dahil" },
      { label: "Puan tahmini", quick: "Dahil değil", full: "İlgili olduğunda dahil" },
      { label: "Meslek göstergesi", quick: "Dahil değil", full: "İlgili olduğunda dahil" },
      { label: "Önerilen sonraki adımlar", quick: "Dahil değil", full: "Dahil" },
      { label: "İndirilebilir PDF", quick: "Dahil değil", full: "Dahil" },
    ];
  }

  return [
    {
      label: "Possible pathways",
      quick: "Possible pathway areas only",
      full: "Structured pathway comparison",
    },
    { label: "Risk indicators", quick: "Not included", full: "Included" },
    { label: "Document checklist", quick: "Not included", full: "Included" },
    { label: "Data/document information indicators", quick: "Not included", full: "Included" },
    { label: "Primary gap", quick: "Not included", full: "Included" },
    { label: "Data completeness", quick: "Not included", full: "Included" },
    { label: "Points estimate", quick: "Not included", full: "Included where relevant" },
    { label: "Occupation indication", quick: "Not included", full: "Included where relevant" },
    { label: "Suggested next steps", quick: "Not included", full: "Included" },
    { label: "Downloadable PDF", quick: "Not included", full: "Included" },
  ];
}

function getReportCards(isTr: boolean): ReportCard[] {
  if (isTr) {
    return [
      {
        title: "Yol karşılaştırması",
        description:
          "Desteklenen vize yolları yan yana karşılaştırılarak hangi seçeneklerin ilgili olabileceği gösterilir.",
      },
      {
        title: "Risk göstergeleri",
        description:
          "Daha yakından incelenmesi gerekebilecek faktörler ayrı bir bölümde gösterilir.",
      },
      {
        title: "Belge hazırlığı",
        description:
          "Her yol için hazırlıkta değerlendirilen belge ve kanıt türleri gösterilir.",
      },
      {
        title: "Bilgi göstergeleri",
        description:
          "Veri tamamlanma skoru, belge hazırlık göstergesi ve bilgi kapsam düzeyi birlikte sunulur.",
      },
      {
        title: "Önerilen sonraki adımlar",
        description:
          "Sağlanan ayrıntılara göre genel hazırlık adımları ayrı bir bölümde listelenir.",
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
      title: "Risk indicators",
      description: "Factors that may need closer review are shown in a separate section.",
    },
    {
      title: "Document readiness",
      description:
        "The report shows document and evidence categories commonly considered for each pathway.",
    },
    {
      title: "Information indicators",
      description:
        "The report shows data completeness score, document readiness indicator, and information coverage level.",
    },
    {
      title: "Suggested next steps",
      description: "General preparation steps are listed based on the details provided.",
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
                <p className="text-xs text-muted-foreground">
                  {isTr
                    ? "Erken erişim döneminde ödeme gerekmez."
                    : "No payment required during early access."}
                </p>
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
