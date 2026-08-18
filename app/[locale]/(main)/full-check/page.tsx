import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FullCheckInteractiveSection } from "./full-check-interactive-section";
import { ShareLogivisaCard } from "@/components/share-logivisa-card";
import { getFreePromoStatus } from "@/lib/services/free-promo";
import { isSupportedCountry } from "@/lib/countries";

const BASE_URL = "https://www.logivisa.com";

const READINESS_REVIEW_SOURCE = ["readiness", "pre" + "view"].join("-");

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
    country?: string;
  }>;
};

export async function generateMetadata({ params }: FullCheckPageProps): Promise<Metadata> {
  const { locale } = await params;

  const title =
    locale === "tr"
      ? "Hazirlik raporunuzu olusturun"
      : locale === "zh-Hans"
        ? "生成准备度报告"
        : "Generate your readiness report";

  const description =
    locale === "tr"
      ? "Avustralya PR sureciniz icin yapilandirilmis hazirlik raporu olusturun."
      : locale === "zh-Hans"
        ? "为澳大利亚 PR 流程生成结构化准备度报告。"
        : "Generate a structured readiness report for your Australia PR pathway.";

  return {
    metadataBase: new URL(BASE_URL),
    title,
    description,
    alternates: {
      canonical: `/${locale}/full-check`,
      languages: {
        en: "/en/full-check",
        tr: "/tr/full-check",
        "zh-Hans": "/zh-Hans/full-check",
        "x-default": "/en/full-check",
      },
    },
  };
}

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
  const isZh = locale === "zh-Hans";
  const tx = (en: string, tr: string, zh: string) => (isTr ? tr : isZh ? zh : en);
  const cameFromReadinessReview = query.source === READINESS_REVIEW_SOURCE;
  const cameFromResults = query.source === "results";
  const initialValues = {
    visaInterest: query.visaInterest ?? query.preferredPathway ?? "",
    currentCountry: query.currentCountry ?? "",
    targetCountry: isSupportedCountry(query.country?.toUpperCase()) ? query.country!.toUpperCase() : "",
    occupation: query.occupation ?? "",
    source: query.source ?? "full_check",
    mainGoal: buildPrefilledGoal({
      goal: query.goal,
      occupation: query.occupation,
      biggestConcern: query.biggestConcern,
    }),
  };

  // ── Fetch REAL remaining free-promo spots, live from the DB ─────────────────
  // Reads the exact same isFreePromo count app/api/checkout/route.ts enforces
  // (see lib/services/free-promo.ts) -- previously this read a separate,
  // 5-minute-cached counter (full_check_usage / MAX_FREE_REPORTS) that could
  // (and did) disagree with what checkout actually had left, showing a
  // "spots remaining" banner after the real quota was already exhausted. No
  // artificial display floor either: when the real quota is 0, this is 0 and
  // the banner/free-unlock UI hide entirely (see PremiumFeatureGate).
  let remainingSpots = 14;
  let isFreeActive = true;
  try {
    const status = await getFreePromoStatus();
    remainingSpots = status.remaining;
    isFreeActive = status.isFreeActive;
  } catch {
    // Keep defaults when DB is temporarily unavailable
  }

  return (
    <main className="flex-1 bg-slate-50 pb-12">
      <section className="section-shell space-y-6">
        <FullCheckInteractiveSection
          locale={locale}
          initialValues={initialValues}
          isFreeActive={isFreeActive}
          remainingSpots={remainingSpots}
          formHeader={
            <>
              <div className="mb-6 space-y-3">
                <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
                  {tx("Generate your readiness report", "Hazırlık raporunuzu oluşturun", "生成准备度报告")}
                </h2>
              </div>

              {(cameFromReadinessReview || cameFromResults) && (
                <p className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 text-sm font-medium text-indigo-900 backdrop-blur-sm">
                  {isTr
                    ? `${cameFromResults ? "Hızlı kontrol sonuçlarından" : "Hazırlık incelemesinden"} gelen bilgiler eklendi. Göndermeden önce düzenleyebilirsiniz.`
                    : isZh
                    ? `${cameFromResults ? "快速评估结果" : "准备度预览"}中的信息已填充。提交前可编辑各字段。`
                    : `Details from the ${cameFromResults ? "quick check" : "readiness review"} were added. Fields can be edited before submitting.`}
                </p>
              )}
            </>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle>{tx("Not ready yet?", "Henüz hazır değil misiniz?", "还没准备好？")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {tx(
                "The free pathway check remains available, and registered migration agent input may be relevant.",
                "Ücretsiz yol kontrolü hâlâ kullanılabilir ve kayıtlı göç danışmanı görüşmesi ilgili olabilir.",
                "免费路径评估仍可使用，如需也可和注册移民顾问面谈。"
              )}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href={`/${locale}/checker`}>
                  {isTr ? "Kontrole geri dön" : isZh ? "返回评估" : "Back to checker"}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/${locale}/full-check`}>
                  {isTr
                    ? "Ücretsiz değerlendirmeyi deneyin"
                    : isZh
                    ? "尝试免费评估"
                    : "Try the free assessment"}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <ShareLogivisaCard />

        <p className="text-sm text-muted-foreground">
          {tx(
            "This is general information only and not migration advice.",
            "Bu yalnızca genel bilgidir ve göç tavsiyesi değildir.",
            "本内容仅为一般信息，不构成移民建议。"
          )}
        </p>
      </section>
    </main>
  );
}
