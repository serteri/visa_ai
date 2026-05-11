import Link from "next/link";
import { eq } from "drizzle-orm";
import { CheckCircle2, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { fullCheckUsage } from "@/db/schema";
import { FullCheckWaitlistForm } from "./full-check-waitlist-form";
import { ShareLogivisaCard } from "@/components/share-logivisa-card";

type ComparisonRow = {
  label: string;
  quick: { included: boolean; text: string };
  full: { included: boolean; text: string };
};
type ReportCard = { title: string; description: string };
const READINESS_REVIEW_SOURCE = ["readiness", "pre" + "view"].join("-");

function getComparisonRows(locale: string): ComparisonRow[] {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const tx = (en: string, tr: string, zh: string) => (isTr ? tr : isZh ? zh : en);
  const yes = tx("Included", "Dahil", "已包含");
  const yesWhere = tx("Included where relevant", "Ilgili oldugunda dahil", "相关时已包含");
  const no = tx("Not included", "Dahil degil", "未包含");

  return [
    {
      label: tx("Possible pathways", "Olasi vize yollari", "可能路径"),
      quick: { included: true, text: tx("Possible pathway areas only", "Yalnizca olasi yol alanlari", "仅可能路径方向") },
      full: { included: true, text: tx("Structured pathway comparison", "Yapilandirilmis yol karsilastirmasi", "结构化路径对比") },
    },
    { label: tx("Signal snapshot", "Sinyal ozeti", "信号摘要"), quick: { included: false, text: no }, full: { included: true, text: yes } },
    { label: tx("Primary limiting factor", "Birincil sinirlayici faktor", "主要限制因素"), quick: { included: false, text: no }, full: { included: true, text: yes } },
    { label: tx("What may change your position", "Durumunuzu degistirebilecek faktorler", "可能影响位置的因素"), quick: { included: false, text: no }, full: { included: true, text: yes } },
    { label: tx("Pathway strength comparison", "Vize yolu guc karsilastirmasi", "路径强度对比"), quick: { included: false, text: no }, full: { included: true, text: yes } },
    { label: tx("Risk indicators", "Risk gostergeleri", "风险指标"), quick: { included: false, text: no }, full: { included: true, text: yes } },
    { label: tx("Evidence readiness snapshot", "Kanit/Bilgi hazirlik ozeti", "材料准备度摘要"), quick: { included: false, text: no }, full: { included: true, text: yes } },
    { label: tx("Points booster simulator", "Puan senaryo simulatoru", "加分场景模拟"), quick: { included: false, text: no }, full: { included: true, text: yesWhere } },
    { label: tx("Financial roadmap", "Tahmini maliyet yol haritasi", "费用路线图"), quick: { included: false, text: no }, full: { included: true, text: yes } },
    { label: tx("Bridge to PR / progression pathways", "Tipik gecis yollari", "通往永居路径"), quick: { included: false, text: no }, full: { included: true, text: yesWhere } },
    { label: tx("Pathway friction / reality check", "Vize yolu gerceklik kontrolu", "路径阻力检验"), quick: { included: false, text: no }, full: { included: true, text: yes } },
    { label: tx("Next steps that can be considered", "Degerlendirilebilecek sonraki adimlar", "可考虑的下一步"), quick: { included: false, text: no }, full: { included: true, text: yes } },
    { label: tx("Downloadable PDF", "Indirilebilir PDF", "可下载 PDF"), quick: { included: false, text: no }, full: { included: true, text: yes } },
    {
      label: tx("Skill Mapping & Authority", "Skill Mapping & Authority", "技能映射与评估机构"),
      quick: { included: false, text: no },
      full: { included: true, text: tx("Authority-specific rules and post-qualification experience logic", "Authority bazli kurallar ve post-qualification experience logic", "评估机构规则及资历后经验逻辑") },
    },
    {
      label: tx("Historical Invitation Trends", "Historical Invitation Trends", "历史邀请趋势"),
      quick: { included: false, text: no },
      full: { included: true, text: tx("Recent invitation point trends and estimated waiting times", "Guncel invitation point trendleri ve tahmini bekleme sureleri", "近期邀请分数趋势及预计等待时间") },
    },
    {
      label: tx("Regional Advantage Analysis", "Regional Advantage Analysis", "偏远地区优势分析"),
      quick: { included: false, text: no },
      full: { included: true, text: tx("State-specific regional postcode and bonus point mapping", "Eyalet bazli regional postcode ve bonus puan eslestirmesi", "州级偏远地区邮编及加分映射") },
    },
    {
      label: tx("Document-Level Specificity", "Document-Level Specificity", "文件级具体性"),
      quick: { included: false, text: no },
      full: { included: true, text: tx("Audit-ready checklist (passport validity, NAATI, etc.)", "Audit-ready checklist (pasaport gecerliligi, NAATI vb.)", "审计级清单（护照有效期、NAATI 等）") },
    },
    {
      label: tx("Living Cost Projection", "Living Cost Projection", "生活成本预测"),
      quick: { included: false, text: no },
      full: { included: true, text: tx("Family-based cost-of-living estimates for major Australian cities", "Aile kompozisyonuna gore buyuk AU sehirleri icin yasam maliyeti tahmini", "基于家庭构成的澳大利亚主要城市生活成本估算") },
    },
    {
      label: tx("Strategic Gantt Chart", "Strategic Gantt Chart", "战略甘特图"),
      quick: { included: false, text: no },
      full: { included: true, text: tx("Visual step-by-step roadmap timeline", "Gorsel adim adim yol haritasi zaman cizelgesi", "可视化分步路线图时间轴") },
    },
  ];
}
function getReportCards(locale: string): ReportCard[] {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const tx = (en: string, tr: string, zh: string) => (isTr ? tr : isZh ? zh : en);

  return [
    {
      title: tx("Premium Feature: Skill Mapping & Authority", "Premium Feature: Skill Mapping & Authority", "高级功能：技能映射与评估机构"),
      description: tx(
        "ANZSCO role mapping is cross-checked against authority-specific criteria and post-qualification experience logic. This section is data analysis, not migration advice.",
        "ANZSCO kodu, degerlendirme otoritesi ve post-qualification deneyim kurallari veri-temelli olarak eslestirilir. Bu bolum tavsiye degil, yapilandirilmis uyum analizi sunar.",
        "ANZSCO 职业代码与评估机构标准及资历后经验规则进行交叉验证，本节为数据分析，非移民建议。"
      ),
    },
    {
      title: tx("Premium Feature: Historical Invitation Trends", "Premium Feature: Historical Invitation Trends", "高级功能：历史邀请趋势"),
      description: tx(
        "Recent invitation rounds, point-band movement, and indicative waiting windows are summarized for evidence-led planning context.",
        "Son invitation round verileri, puan bandi hareketleri ve tahmini bekleme pencereleri analitik olarak ozetlenir. Cikti, karar destegi icin bilgi gorunumu saglar.",
        "近期邀请轮次、分数区间变动及预计等待窗口，以数据驱动方式汇总，用于规划参考。"
      ),
    },
    {
      title: tx("Premium Feature: Regional Advantage Analysis", "Premium Feature: Regional Advantage Analysis", "高级功能：偏远地区优势分析"),
      description: tx(
        "State-level regional postcode eligibility and nomination bonus mapping are modeled to surface potential regional advantage scenarios.",
        "Eyalet bazli regional postcode kapsam haritasi ve 190/491 bonus puan etkileri birlikte modellenir. Analiz, olasi avantaj alanlarini veri ile gosterir.",
        "各州偏远地区邮编资格与提名加分映射建模，揭示潜在的偏远地区优势场景。"
      ),
    },
    {
      title: tx("Premium Feature: Document-Level Specificity", "Premium Feature: Document-Level Specificity", "高级功能：文件级具体性"),
      description: tx(
        "An audit-ready checklist tracks passport validity windows, NAATI/PY status, health and character evidence, and submission dependencies.",
        "Pasaport gecerliligi, NAATI/PY durumu, police ve saglik kayitlari gibi alanlar denetime hazir checklist formatinda raporlanir.",
        "审计级清单追踪护照有效期窗口、NAATI/PY 状态、健康及品格证明材料及递交依赖项。"
      ),
    },
    {
      title: tx("Premium Feature: Living Cost Projection", "Premium Feature: Living Cost Projection", "高级功能：生活成本预测"),
      description: tx(
        "Family-based living cost projections for major Australian cities are presented as analytical estimates for budgeting context.",
        "Aile kompozisyonuna gore Sidney, Melbourne ve Brisbane gibi sehirler icin yasam maliyeti projeksiyonu sunulur; bu bir finansal tavsiye degil, veri tahmin modelidir.",
        "基于家庭构成，针对澳大利亚主要城市的生活成本预测作为分析估算提供，仅供预算参考。"
      ),
    },
    {
      title: tx("Premium Feature: Strategic Gantt Chart", "Premium Feature: Strategic Gantt Chart", "高级功能：战略甘特图"),
      description: tx(
        "A visual step-by-step timeline maps key milestones from preparation through assessment and pre-lodgement readiness.",
        "Adim-adim surec plani zaman cizelgesi ile gorsellestirilir: belge hazirlik, test, assessment ve lodgement oncesi kilometre taslari tek bakista gorulur.",
        "可视化分步时间轴，从准备阶段到评估及递交前准备的关键里程碑一目了然。"
      ),
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
  const isZh = locale === "zh-Hans";
  const tx = (en: string, tr: string, zh: string) => (isTr ? tr : isZh ? zh : en);
  const cameFromReadinessReview = query.source === READINESS_REVIEW_SOURCE;
  const cameFromResults = query.source === "results";
  const initialValues = {
    visaInterest: query.visaInterest ?? query.preferredPathway ?? "",
    currentCountry: query.currentCountry ?? "",
    occupation: query.occupation ?? "",
    source: query.source ?? "full_check",
    mainGoal: buildPrefilledGoal({
      goal: query.goal,
      occupation: query.occupation,
      biggestConcern: query.biggestConcern,
    }),
  };

  const comparisonRows = getComparisonRows(locale);
  const reportCards = getReportCards(locale);

  // ── Fetch remaining free spots from DB ─────────────────────────────────────
  let remainingSpots = 0;
  let isFreeActive = false;
  try {
    const usageRows = await db
      .select()
      .from(fullCheckUsage)
      .where(eq(fullCheckUsage.id, 1))
      .limit(1);
    const maxFree = parseInt(process.env.MAX_FREE_REPORTS ?? "50", 10);
    const used = usageRows[0]?.free_reports_used ?? 0;
    remainingSpots = Math.max(0, maxFree - used);
    isFreeActive = remainingSpots > 0;
  } catch {
    // Fail gracefully
  }

  return (
    <main className="flex-1 bg-slate-50 pt-32 pb-12">
      <section className="section-shell space-y-6">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 lg:grid-cols-12 items-start">
          {/* Form Container */}
          <div className="lg:col-span-7 bg-white/60 backdrop-blur-xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-6 sm:p-8">
            
            <div className="mb-6 space-y-3">
              <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
                {tx("Generate your readiness report", "Hazırlık raporunuzu oluşturun", "生成准备度报告")}
              </h2>
              <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${
                isFreeActive
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-primary/20 bg-background/80 text-foreground"
              }`}>
                {isFreeActive
                  ? tx(
                      `🔥 Limited Offer: FREE for the first 50 users. Only ${remainingSpots} spots left!`,
                      `🔥 Sınırlı Teklif: İlk 50 kullanıcıya ÜCRETSİZ. Yalnızca ${remainingSpots} kontenjan kaldı!`,
                      `🔥 限时优惠：前50名用户免费。仅剩 ${remainingSpots} 个名额！`
                    )
                  : tx(
                      "Premium Report — $29 per report.",
                      "Premium Rapor — Rapor başına $29.",
                      "高级报告 — 每份报告 $29。"
                    )
                }
              </div>
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
            
            <FullCheckWaitlistForm locale={locale} initialValues={initialValues} isFreeActive={isFreeActive} remainingSpots={remainingSpots} />
          </div>

          {/* Sidebar: What you'll get */}
          <div className="space-y-6 lg:col-span-5 lg:sticky lg:top-24">
            <div className="rounded-3xl border border-white/60 bg-white/60 p-6 shadow-xl backdrop-blur-md">
              <h3 className="text-lg font-bold text-foreground">
                {tx("What you'll get", "Ne alacaksınız?", "你将获得")}
              </h3>
              <ul className="mt-5 space-y-4">
                <li className="flex items-center gap-3 rounded-lg bg-white/50 p-3 shadow-sm ring-1 ring-black/5">
                  <span className="text-xl">✨</span>
                  <span className="text-sm font-medium text-foreground">{tx("Points Calculation", "Puan Hesaplaması", "积分计算")}</span>
                </li>
                <li className="flex items-center gap-3 rounded-lg bg-white/50 p-3 shadow-sm ring-1 ring-black/5">
                  <span className="text-xl">🗺️</span>
                  <span className="text-sm font-medium text-foreground">{tx("Actionable Roadmap", "Eylem Planı ve Yol Haritası", "可执行的路线图")}</span>
                </li>
                <li className="flex items-center gap-3 rounded-lg bg-white/50 p-3 shadow-sm ring-1 ring-black/5">
                  <span className="text-xl">🔍</span>
                  <span className="text-sm font-medium text-foreground">{tx("Hidden Risk Analysis", "Gizli Risk Analizi", "潜在风险分析")}</span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-border/50 bg-muted/20 p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {tx("Detailed Coverage", "Detaylı Kapsam", "详细内容")}
              </p>
              <ul className="space-y-2 text-xs text-muted-foreground">
                {(isZh
                  ? [
                      "高级功能 - 技能映射与评估机构",
                      "高级功能 - 历史邀请趋势",
                      "高级功能 - 偶远地区优势分析",
                      "高级功能 - 文件级具体性",
                      "高级功能 - 生活成本预测",
                      "高级功能 - 战略甘特图",
                      "可下载 PDF",
                    ]
                  : isTr
                  ? [
                      "Premium Feature - Skill Mapping & Authority",
                      "Premium Feature - Historical Invitation Trends",
                      "Premium Feature - Regional Advantage Analysis",
                      "Premium Feature - Document-Level Specificity",
                      "Premium Feature - Living Cost Projection",
                      "Premium Feature - Strategic Gantt Chart",
                      "İndirilebilir PDF",
                    ]
                  : [
                      "Premium Feature - Skill Mapping & Authority",
                      "Premium Feature - Historical Invitation Trends",
                      "Premium Feature - Regional Advantage Analysis",
                      "Premium Feature - Document-Level Specificity",
                      "Premium Feature - Living Cost Projection",
                      "Premium Feature - Strategic Gantt Chart",
                      "Downloadable PDF",
                    ]
                ).map((item) => (
                  <li key={item} className="flex gap-2 leading-relaxed">
                    <span className="shrink-0 text-violet-500">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {tx(
                "Quick Pathway Check vs Full Visa Readiness Report",
                "Hızlı Yol Kontrolü ile Tam Vize Hazırlık Raporu Karşılaştırması",
                "快速路径评估与完整签证准备度报告对比"
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 lg:hidden">
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
                        <span className="mr-1 font-medium text-foreground">{tx("Quick", "Hizli", "快速")}:</span>
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
                        <span className="mr-1 font-medium text-primary">{tx("Full", "Full", "完整")}:</span>
                        {row.full.text}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto rounded-xl border border-border/70 lg:block">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left bg-muted/40">
                    <th className="py-3 pr-4 font-semibold">{tx("Feature", "Özellik", "功能")}</th>
                    <th className="px-4 py-3 font-semibold">
                      {tx("Quick Pathway Check", "Hızlı Yol Kontrolü", "快速路径评估")}
                    </th>
                    <th className="px-4 py-3 font-semibold text-primary">
                      {tx("Full Visa Readiness Report", "Tam Vize Hazırlık Raporu", "完整签证准备度报告")}
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
              {tx("Report sections", "Rapor bölümleri", "报告章节")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {tx(
                "These sections are designed to present MARA-aligned structured data analysis, not migration advice.",
                "Bu bolumler, MARA uyumlu cercevede tavsiye uretmeden yapilandirilmis veri analizi sunmak icin tasarlanmistir.",
                "这些章节旨在提供符合 MARA 框架的结构化数据分析，而非移民建议。"
              )}
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
                <Link href={`/${locale}/agent-referral`}>
                  {isTr
                    ? "Kayıtlı göç danışmanı ile görüş"
                    : isZh
                    ? "和注册移民顾问交流"
                    : "Speak with a registered migration agent"}
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
