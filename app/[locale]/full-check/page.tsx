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
    source: query.source ?? "full_check",
    mainGoal: buildPrefilledGoal({
      goal: query.goal,
      occupation: query.occupation,
      biggestConcern: query.biggestConcern,
    }),
  };

  const comparisonRows = getComparisonRows(locale);
  const reportCards = getReportCards(locale);

  return (
    <main className="ambient-bg flex-1 py-12">
      <section className="section-shell space-y-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr] lg:items-start">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{tx("Early access", "Erken erişim", "抢先体验")}</Badge>
              <Badge variant="outline">{tx("Structured report", "Yapılandırılmış rapor", "结构化报告")}</Badge>
            </div>
            <h1 className="text-3xl font-bold sm:text-4xl">
              {tx("Full Visa Readiness Report", "Tam Vize Hazırlık Raporu", "完整签证准备度报告")}
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
              {tx(
                "Structured readiness report with detailed analysis, risks, documents, and preparation insights.",
                "Yapılandırılmış hazırlık raporu; detaylı analiz, riskler, belgeler ve hazırlık içgörüleri sunar.",
                "包含详细分析、风险、文件及准备洞察的结构化准备度报告。"
              )}
            </p>
            <p className="max-w-3xl rounded-md border border-primary/20 bg-card px-4 py-3 text-sm text-muted-foreground">
              {tx(
                "This is a structured information report based on the details provided.",
                "Bu rapor, sağlanan ayrıntılara dayalı yapılandırılmış bilgi raporudur.",
                "本报告是基于您提供信息的结构化信息报告。"
              )}
            </p>
            <p className="max-w-3xl rounded-md border border-primary/20 bg-card px-4 py-3 text-sm text-muted-foreground">
              {tx(
                "Early access · No payment required during early access.",
                "Erken erişim · Erken erişimde ödeme gerekmez.",
                "抢先体验 · 抢先体验期间无需付费。"
              )}
            </p>
          </div>

          <Card className="border-primary/40 bg-primary/5">
            <CardHeader>
              <CardTitle>
                {tx("Generate your readiness report", "Hazırlık raporunuzu oluşturun", "生成准备度报告")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border border-primary/20 bg-background/80 px-3 py-2 text-sm text-muted-foreground">
                {tx(
                  "Early access · No payment required.",
                  "Erken erişim · Ödeme gerekmez.",
                  "抢先体验 · 无需付费。"
                )}
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">
                  {tx("What this report covers", "Bu rapor neler içerir?", "本报告涉及内容")}
                </p>
                <ul className="space-y-1 pl-3">
                  {(isZh
                    ? [
                        "高级功能 - 技能映射与评估机构：评估机构规则及资历后经验逻辑与 ANZSCO 评估模型交叉验证",
                        "高级功能 - 历史邀请趋势：近期邀请局分数变动及预计等待窗口汇总",
                        "高级功能 - 偶远地区优势分析：各州偏远地区邮编资格与提名加分映射",
                        "高级功能 - 文件级具体性：审计级清单，包含护照有效期、NAATI、警察记录及健康证明材料",
                        "高级功能 - 生活成本预测：基于家庭构成的澳大利亚主要城市生活成本估算",
                        "高级功能 - 战略甘特图：可视化分步时间轴，涵盖从准备到递交前准备的关键里程碑",
                        "可下载 PDF",
                      ]
                    : isTr
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
                    : isZh
                    ? `${cameFromResults ? "快速评估结果" : "准备度预览"}中的信息已尽可能填充。提交前可编辑各字段。`
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
              {tx(
                "Quick Pathway Check vs Full Visa Readiness Report",
                "Hızlı Yol Kontrolü ile Tam Vize Hazırlık Raporu Karşılaştırması",
                "快速路径评估与完整签证准备度报告对比"
              )}
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

            <div className="hidden overflow-x-auto md:block">
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
