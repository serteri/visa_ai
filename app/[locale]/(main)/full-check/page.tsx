import { isCanadaReportEnabled } from "@/lib/readiness/report-mode";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FullCheckInteractiveSection } from "./full-check-interactive-section";
import { ShareLogivisaCard } from "@/components/share-logivisa-card";
import { getFreePromoStatus } from "@/lib/services/free-promo";
import { isSupportedCountry } from "@/lib/countries";
import { PREMIUM_PRICE_DISPLAY } from "@/lib/pricing";
import { isPaidReportCheckoutEnabled } from "@/lib/readiness/paid-checkout";

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
      ? "Vize Bilgi Raporunuzu oluşturun"
      : locale === "zh-Hans"
        ? "生成签证信息报告"
        : "Generate your Visa Information Report";

  const description =
    locale === "tr"
      ? "Yayımlanmış kaynaklara dayalı, her vize ve eyalet için yapılandırılmış Vize Bilgi Raporu oluşturun."
      : locale === "zh-Hans"
        ? "生成基于公开来源的结构化签证信息报告，涵盖每种签证和各州项目。"
        : "Generate a structured Visa Information Report: published facts for every Australian visa and state program, with sources and dates.";

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
    targetCountry: isSupportedCountry(query.country?.toUpperCase()) && (query.country!.toUpperCase() !== "CA" || isCanadaReportEnabled()) ? query.country!.toUpperCase() : "",
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

  // Paid unless the server-side flag is explicitly "false" (lib/readiness/paid-checkout.ts): with it off, no price is shown.
  const paidCheckoutEnabled = isPaidReportCheckoutEnabled();
  const canadaReportEnabled = isCanadaReportEnabled();

  return (
    <main className="flex-1 pb-12">
      <section className="section-shell space-y-6">
        <FullCheckInteractiveSection
          locale={locale}
          initialValues={initialValues}
          isFreeActive={isFreeActive}
          remainingSpots={remainingSpots}
          paidCheckoutEnabled={paidCheckoutEnabled}
          canadaReportEnabled={canadaReportEnabled}
          formHeader={
            <>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
                <p className="text-lg font-medium text-slate-600">
                  {tx("Visa Information Report", "Vize Bilgi Raporu", "签证信息报告")}
                </p>
                <p className="whitespace-nowrap">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {paidCheckoutEnabled
                      ? tx(PREMIUM_PRICE_DISPLAY.en, PREMIUM_PRICE_DISPLAY.tr, PREMIUM_PRICE_DISPLAY["zh-Hans"])
                      : tx("No payment", "Ödeme yok", "无需付款")}
                  </span>
                </p>
              </div>

              <div className="mb-6 space-y-3">
                <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
                  {tx("Generate your Visa Information Report", "Vize Bilgi Raporunuzu oluşturun", "生成您的签证信息报告")}
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
