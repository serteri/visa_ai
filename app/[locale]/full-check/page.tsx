import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FullCheckWaitlistForm } from "./full-check-waitlist-form";

type ComparisonRow = { label: string; quick: string; full: string };
type PreviewCard = { title: string; description: string };

function getComparisonRows(isTr: boolean): ComparisonRow[] {
  if (isTr) {
    return [
      { label: "Olası vize yolları", quick: "Yalnızca olası yollar", full: "Ön izlemede dahil" },
      { label: "Risk göstergeleri", quick: "Dahil değil", full: "Temel göstergeler (ön izleme)" },
      { label: "Belge kontrol listesi", quick: "Dahil değil", full: "Temel liste (ön izleme)" },
      { label: "Puan tahmini", quick: "Rapor yok", full: "Temel tahmin (ön izleme)" },
      { label: "Meslek incelemesi", quick: "Rapor yok", full: "Temel genel bakış (ön izleme)" },
      { label: "Danışmana hazır özet", quick: "Rapor yok", full: "Geliştiriliyor" },
      { label: "İndirilebilir rapor", quick: "Rapor yok", full: "Geliştiriliyor" },
    ];
  }
  return [
    { label: "Possible pathways", quick: "Possible pathways only", full: "Included in preview" },
    { label: "Risk indicators", quick: "Not included", full: "Basic indicators (preview)" },
    { label: "Document checklist", quick: "Not included", full: "Basic checklist (preview)" },
    { label: "Points estimate", quick: "No report", full: "Basic estimate (preview)" },
    { label: "Occupation review", quick: "No report", full: "Basic overview (preview)" },
    { label: "Agent-ready summary", quick: "No report", full: "In development" },
    { label: "Downloadable report", quick: "No report", full: "In development" },
  ];
}

function getPreviewCards(isTr: boolean): PreviewCard[] {
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
          "Bir sonraki adıma geçmeden önce daha yakından incelenmesi gerekebilecek faktörler vurgulanır.",
      },
      {
        title: "Belge hazırlığı",
        description:
          "Her yol için hazırlanması faydalı olabilecek belge ve kanıt türleri gösterilir.",
      },
      {
        title: "Önerilen sonraki adımlar",
        description:
          "Kayıtlı göç danışmanı görüşmesinden önce sıklıkla değerlendirilen hazırlık adımlarının ön izlemesi.",
      },
      {
        title: "Danışmana hazır özet",
        description:
          "Kayıtlı göç danışmanı görüşmesine hazırlanmayı kolaylaştırmak için tasarlanmış yapılandırılmış özet format.",
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
      description:
        "Highlight factors that may need closer review before you prepare the next step.",
    },
    {
      title: "Document readiness",
      description:
        "See the kinds of documents and evidence that may be useful to prepare for each pathway.",
    },
    {
      title: "Suggested next steps",
      description:
        "Preview suggested preparation steps that are often considered before registered migration agent input.",
    },
    {
      title: "Agent-ready summary",
      description:
        "A concise summary format designed to help prepare for a registered migration agent conversation.",
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
  const cameFromReadinessPreview = query.source === "readiness-preview";
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
  const previewCards = getPreviewCards(isTr);

  return (
    <main className="ambient-bg flex-1 py-12">
      <section className="section-shell space-y-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr] lg:items-start">
          <div className="space-y-4">
            <Badge variant="secondary">{isTr ? "Ön İzleme" : "Preview"}</Badge>
            <h1 className="text-3xl font-bold sm:text-4xl">
              {isTr ? "Tam Vize Hazırlık Raporu" : "Full Visa Readiness Report"}
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
              {isTr
                ? "Bilgilerinizi göndererek olası vize yolları, risk göstergeleri, belge kontrol listesi ve önerilen sonraki adımları içeren yapılandırılmış bir ön rapor oluşturun."
                : "Submit your details to generate a structured preview report with pathway comparison, risk indicators, document checklist, and suggested next steps."}
            </p>
            <p className="max-w-3xl rounded-md border border-primary/20 bg-card px-4 py-3 text-sm text-muted-foreground">
              {isTr
                ? "Bu, tam hazırlık raporunun ön izleme sürümüdür. Bu sürüm daha ayrıntılı analiz özellikleri geliştirilirken basitleştirilmiş bir genel bakış sunar."
                : "This is a preview version of the full readiness report. This version provides a simplified overview while we continue improving deeper analysis features."}
            </p>
          </div>

          <Card className="border-primary/40 bg-primary/5">
            <CardHeader>
              <CardTitle>
                {isTr ? "Tam hazirlik raporu olustur" : "Generate full readiness report"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(cameFromReadinessPreview || cameFromResults) && (
                <p className="rounded-md border border-primary/20 bg-background/80 px-3 py-2 text-sm text-muted-foreground">
                  {isTr
                    ? `${cameFromResults ? "Hızlı kontrol sonuçlarından" : "Hazırlık ön incelemesinden"} gelen bilgiler mümkün olan alanlara eklendi. Göndermeden önce alanları düzenleyebilirsiniz.`
                    : `Details from the ${cameFromResults ? "quick check results" : "readiness preview"} were added where possible. Fields can be edited before submitting.`}
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
              {isTr ? "Rapor ön izlemesi" : "Report preview"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isTr
                ? "Hızlı kontrolün aksine, bu rapor ayrı bölümler halinde pratik bir inceleme olarak düzenlenmiştir."
                : "Unlike the quick check, this report is organized as a practical review with separate sections."}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {previewCards.map((card) => (
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
