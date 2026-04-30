import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FullCheckWaitlistForm } from "./full-check-waitlist-form";

type ComparisonRow = {
  label: string;
  quick: { included: boolean; text: string };
  full: { included: boolean; text: string };
};
type ReportCard = { title: string; description: string };
const READINESS_REVIEW_SOURCE = ["readiness", "pre" + "view"].join("-");

function getComparisonRows(isTr: boolean): ComparisonRow[] {
  if (isTr) {
    return [
      {
        label: "Olasi vize yollari",
        quick: { included: true, text: "Yalnizca olasi yol alanlari" },
        full: { included: true, text: "Yapilandirilmis yol karsilastirmasi" },
      },
      { label: "Sinyal ozeti", quick: { included: false, text: "Dahil degil" }, full: { included: true, text: "Dahil" } },
      { label: "Birincil sinirlayici faktor", quick: { included: false, text: "Dahil degil" }, full: { included: true, text: "Dahil" } },
      { label: "Durumunuzu degistirebilecek faktorler", quick: { included: false, text: "Dahil degil" }, full: { included: true, text: "Dahil" } },
      { label: "Vize yolu guc karsilastirmasi", quick: { included: false, text: "Dahil degil" }, full: { included: true, text: "Dahil" } },
      { label: "Risk gostergeleri", quick: { included: false, text: "Dahil degil" }, full: { included: true, text: "Dahil" } },
      { label: "Kanit/Bilgi hazirlik ozeti", quick: { included: false, text: "Dahil degil" }, full: { included: true, text: "Dahil" } },
      { label: "Puan senaryo simulatoru", quick: { included: false, text: "Dahil degil" }, full: { included: true, text: "Ilgili oldugunda dahil" } },
      { label: "Tahmini maliyet yol haritasi", quick: { included: false, text: "Dahil degil" }, full: { included: true, text: "Dahil" } },
      { label: "Tipik gecis yollari", quick: { included: false, text: "Dahil degil" }, full: { included: true, text: "Ilgili oldugunda dahil" } },
      { label: "Vize yolu gerceklik kontrolu", quick: { included: false, text: "Dahil degil" }, full: { included: true, text: "Dahil" } },
      { label: "Degerlendirilebilecek sonraki adimlar", quick: { included: false, text: "Dahil degil" }, full: { included: true, text: "Dahil" } },
      { label: "Indirilebilir PDF", quick: { included: false, text: "Dahil degil" }, full: { included: true, text: "Dahil" } },
      {
        label: "Skill Mapping & Authority",
        quick: { included: false, text: "Dahil degil" },
        full: { included: true, text: "Authority bazli kurallar ve post-qualification experience logic" },
      },
      {
        label: "Historical Invitation Trends",
        quick: { included: false, text: "Dahil degil" },
        full: { included: true, text: "Guncel invitation point trendleri ve tahmini bekleme sureleri" },
      },
      {
        label: "Regional Advantage Analysis",
        quick: { included: false, text: "Dahil degil" },
        full: { included: true, text: "Eyalet bazli regional postcode ve bonus puan eslestirmesi" },
      },
      {
        label: "Document-Level Specificity",
        quick: { included: false, text: "Dahil degil" },
        full: { included: true, text: "Audit-ready checklist (pasaport gecerliligi, NAATI vb.)" },
      },
      {
        label: "Living Cost Projection",
        quick: { included: false, text: "Dahil degil" },
        full: { included: true, text: "Aile kompozisyonuna gore buyuk AU sehirleri icin yasam maliyeti tahmini" },
      },
      {
        label: "Strategic Gantt Chart",
        quick: { included: false, text: "Dahil degil" },
        full: { included: true, text: "Gorsel adim adim yol haritasi zaman cizelgesi" },
      },
    ];
  }

  return [
    {
      label: "Possible pathways",
      quick: { included: true, text: "Possible pathway areas only" },
      full: { included: true, text: "Structured pathway comparison" },
    },
    { label: "Signal snapshot", quick: { included: false, text: "Not included" }, full: { included: true, text: "Included" } },
    { label: "Primary limiting factor", quick: { included: false, text: "Not included" }, full: { included: true, text: "Included" } },
    { label: "What may change your position", quick: { included: false, text: "Not included" }, full: { included: true, text: "Included" } },
    { label: "Pathway strength comparison", quick: { included: false, text: "Not included" }, full: { included: true, text: "Included" } },
    { label: "Risk indicators", quick: { included: false, text: "Not included" }, full: { included: true, text: "Included" } },
    { label: "Evidence readiness snapshot", quick: { included: false, text: "Not included" }, full: { included: true, text: "Included" } },
    { label: "Points booster simulator", quick: { included: false, text: "Not included" }, full: { included: true, text: "Included where relevant" } },
    { label: "Financial roadmap", quick: { included: false, text: "Not included" }, full: { included: true, text: "Included" } },
    { label: "Bridge to PR / progression pathways", quick: { included: false, text: "Not included" }, full: { included: true, text: "Included where relevant" } },
    { label: "Pathway friction / reality check", quick: { included: false, text: "Not included" }, full: { included: true, text: "Included" } },
    { label: "Next steps that can be considered", quick: { included: false, text: "Not included" }, full: { included: true, text: "Included" } },
    { label: "Downloadable PDF", quick: { included: false, text: "Not included" }, full: { included: true, text: "Included" } },
    {
      label: "Skill Mapping & Authority",
      quick: { included: false, text: "Not included" },
      full: { included: true, text: "Authority-specific rules and post-qualification experience logic" },
    },
    {
      label: "Historical Invitation Trends",
      quick: { included: false, text: "Not included" },
      full: { included: true, text: "Recent invitation point trends and estimated waiting times" },
    },
    {
      label: "Regional Advantage Analysis",
      quick: { included: false, text: "Not included" },
      full: { included: true, text: "State-specific regional postcode and bonus point mapping" },
    },
    {
      label: "Document-Level Specificity",
      quick: { included: false, text: "Not included" },
      full: { included: true, text: "Audit-ready checklist (passport validity, NAATI, etc.)" },
    },
    {
      label: "Living Cost Projection",
      quick: { included: false, text: "Not included" },
      full: { included: true, text: "Family-based cost-of-living estimates for major Australian cities" },
    },
    {
      label: "Strategic Gantt Chart",
      quick: { included: false, text: "Not included" },
      full: { included: true, text: "Visual step-by-step roadmap timeline" },
    },
  ];
}
function getReportCards(isTr: boolean): ReportCard[] {
  if (isTr) {
    return [
      {
        title: "Premium Feature: Skill Mapping & Authority",
        description:
          "ANZSCO kodu, degerlendirme otoritesi ve post-qualification deneyim kurallari veri-temelli olarak eslestirilir. Bu bolum tavsiye degil, yapilandirilmis uyum analizi sunar.",
      },
      {
        title: "Premium Feature: Historical Invitation Trends",
        description:
          "Son invitation round verileri, puan bandi hareketleri ve tahmini bekleme pencereleri analitik olarak ozetlenir. Cikti, karar destegi icin bilgi gorunumu saglar.",
      },
      {
        title: "Premium Feature: Regional Advantage Analysis",
        description:
          "Eyalet bazli regional postcode kapsam haritasi ve 190/491 bonus puan etkileri birlikte modellenir. Analiz, olasi avantaj alanlarini veri ile gosterir.",
      },
      {
        title: "Premium Feature: Document-Level Specificity",
        description:
          "Pasaport gecerliligi, NAATI/PY durumu, police ve saglik kayitlari gibi alanlar denetime hazir checklist formatinda raporlanir.",
      },
      {
        title: "Premium Feature: Living Cost Projection",
        description:
          "Aile kompozisyonuna gore Sidney, Melbourne ve Brisbane gibi sehirler icin yasam maliyeti projeksiyonu sunulur; bu bir finansal tavsiye degil, veri tahmin modelidir.",
      },
      {
        title: "Premium Feature: Strategic Gantt Chart",
        description:
          "Adim-adim surec plani zaman cizelgesi ile gorsellestirilir: belge hazirlik, test, assessment ve lodgement oncesi kilometre taslari tek bakista gorulur.",
      },
    ];
  }

  return [
    {
      title: "Premium Feature: Skill Mapping & Authority",
      description:
        "ANZSCO role mapping is cross-checked against authority-specific criteria and post-qualification experience logic. This section is data analysis, not migration advice.",
    },
    {
      title: "Premium Feature: Historical Invitation Trends",
      description:
        "Recent invitation rounds, point-band movement, and indicative waiting windows are summarized for evidence-led planning context.",
    },
    {
      title: "Premium Feature: Regional Advantage Analysis",
      description:
        "State-level regional postcode eligibility and nomination bonus mapping are modeled to surface potential regional advantage scenarios.",
    },
    {
      title: "Premium Feature: Document-Level Specificity",
      description:
        "An audit-ready checklist tracks passport validity windows, NAATI/PY status, health and character evidence, and submission dependencies.",
    },
    {
      title: "Premium Feature: Living Cost Projection",
      description:
        "Family-based living cost projections for major Australian cities are presented as analytical estimates for budgeting context.",
    },
    {
      title: "Premium Feature: Strategic Gantt Chart",
      description:
        "A visual step-by-step timeline maps key milestones from preparation through assessment and pre-lodgement readiness.",
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
            <p className="max-w-3xl rounded-md border border-primary/20 bg-card px-4 py-3 text-sm text-muted-foreground">
              {isTr
                ? "Erken erişim · Erken erişimde ödeme gerekmez."
                : "Early access · No payment required during early access."}
            </p>
          </div>

          <Card className="border-primary/40 bg-primary/5">
            <CardHeader>
              <CardTitle>
                {isTr ? "Hazırlık raporunuzu oluşturun" : "Generate your readiness report"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border border-primary/20 bg-background/80 px-3 py-2 text-sm text-muted-foreground">
                {isTr
                  ? "Erken erişim · Ödeme gerekmez."
                  : "Early access · No payment required."}
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">
                  {isTr ? "Bu rapor neler içerir?" : "What this report covers"}
                </p>
                <ul className="space-y-1 pl-3">
                  {(isTr
                    ? [
                        "Premium Feature - Skill Mapping & Authority: authority-specific rules ve post-qualification deneyim mantigi veri analizi olarak modellenir",
                        "Premium Feature - Historical Invitation Trends: son invitation trendleri ve tahmini bekleme pencereleri analitik olarak sunulur",
                        "Premium Feature - Regional Advantage Analysis: eyalet bazli regional postcode ve bonus puan eslesmesi gosterilir",
                        "Premium Feature - Document-Level Specificity: passport validity, NAATI, police ve health gibi kalemler denetime hazir checklist ile izlenir",
                        "Premium Feature - Living Cost Projection: aile bazli buyuk AU sehirleri yasam maliyeti projeksiyonu sunulur",
                        "Premium Feature - Strategic Gantt Chart: adim adim gorsel zaman cizelgesi ile surec kilometre taslari gosterilir",
                        "İndirilebilir PDF",
                      ]
                    : [
                        "Premium Feature - Skill Mapping & Authority: authority-specific rules and post-qualification logic are modeled as structured data analysis",
                        "Premium Feature - Historical Invitation Trends: recent invitation point movement and indicative waiting windows are summarized",
                        "Premium Feature - Regional Advantage Analysis: state-level regional postcode and nomination bonus mapping",
                        "Premium Feature - Document-Level Specificity: audit-ready checklist including passport validity, NAATI, police and health evidence",
                        "Premium Feature - Living Cost Projection: family-based cost-of-living estimates for major Australian cities",
                        "Premium Feature - Strategic Gantt Chart: visual milestone timeline from preparation to pre-lodgement readiness",
                        "Downloadable PDF",
                      ]
                  ).map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-primary shrink-0">–</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
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
            <div className="grid gap-3 md:hidden">
              {comparisonRows.map((row) => (
                <div key={row.label} className="rounded-xl border border-border bg-gradient-to-br from-card to-card/70 p-4 shadow-sm">
                  <p className="text-sm font-semibold text-foreground">{row.label}</p>
                  <div className="mt-3 grid gap-2">
                    <div className="flex items-start gap-2 rounded-md border border-border/70 bg-background/70 px-3 py-2">
                      {row.quick.included ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      ) : (
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                      )}
                      <p className="text-xs text-muted-foreground">
                        <span className="mr-1 font-medium text-foreground">{isTr ? "Hizli" : "Quick"}:</span>
                        {row.quick.text}
                      </p>
                    </div>
                    <div className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
                      {row.full.included ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      ) : (
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                      )}
                      <p className="text-xs text-muted-foreground">
                        <span className="mr-1 font-medium text-primary">{isTr ? "Full" : "Full"}:</span>
                        {row.full.text}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left bg-muted/40">
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
                    <tr key={row.label} className="border-b border-border/70 align-top transition-colors hover:bg-muted/30 last:border-0">
                      <td className="py-3 pr-4 font-medium">{row.label}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <div className="flex items-start gap-2">
                          {row.quick.included ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          ) : (
                            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                          )}
                          <span>{row.quick.text}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-start gap-2">
                          {row.full.included ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          ) : (
                            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                          )}
                          <span>{row.full.text}</span>
                        </div>
                      </td>
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
                ? "Bu bolumler, MARA uyumlu cercevede tavsiye uretmeden yapilandirilmis veri analizi sunmak icin tasarlanmistir."
                : "These sections are designed to present MARA-aligned structured data analysis, not migration advice."}
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
