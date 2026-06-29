import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ExternalLink, Languages, ListChecks, MapPinned, WalletCards } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VisaPdfDownloadCard } from "@/components/visa-pdf-download-card";
import pilotData from "@/src/data/countries/ca/rural-francophone-pilots.json";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

type PageProps = {
  params: Promise<{ locale: string }>;
};

type SharedData = {
  sourcePdfBlobUrl?: string;
  pathwayGroup?: string;
  pathwayGroup_tr?: string;
  pathwayGroup_zh?: string;
  structuralNote?: string;
  structuralNote_tr?: string;
  structuralNote_zh?: string;
  lastVerified?: string;
  sharedEligibilityCore?: string[];
  sharedEligibilityCore_tr?: string[];
  sharedEligibilityCore_zh?: string[];
  sharedProcessSteps?: Array<{ step: number; name: string; description?: string }>;
  sharedProcessSteps_tr?: Array<{ step: number; name: string; description?: string }>;
  sharedProcessSteps_zh?: Array<{ step: number; name: string; description?: string }>;
  sharedFees?: {
    currency?: string;
    processingFeeFrom?: number;
    lastIncreaseDate?: string;
    otherFeeCategories?: string[];
  };
  sharedDocuments?: {
    fillInPortal?: Array<{ form: string; name: string }>;
    conditionalForms?: Array<{ form: string; name: string; condition?: string }>;
    supportingDocuments?: string[];
    translationRule?: string;
  };
  pilots?: Array<{
    id: string;
    name: string;
    name_tr?: string;
    name_zh?: string;
    purpose?: string;
    purpose_tr?: string;
    purpose_zh?: string;
    numberOfCommunities?: number;
    communities?: string[];
    pilotSpecificForms?: Array<{ form: string; name: string }>;
    languageRequirement?: string;
    languageRequirement_tr?: string;
    languageRequirement_zh?: string;
    optionalWorkPermit?: boolean;
    note?: string;
    note_tr?: string;
    note_zh?: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = locale === "tr"
    ? "Kanada Frankofon Topluluk Goc Pilotu (FCIP) | LogiVisa"
    : locale === "zh-Hans"
      ? "加拿大法语社区移民试点（FCIP）| LogiVisa"
      : "Canada Francophone Community Immigration Pilot (FCIP) | LogiVisa";
  const description = locale === "tr"
    ? "Frankofon Topluluk Goc Pilotu detaylari: Fransizca dil kosulu, topluluklar, surec adimlari, belgeler ve ucretler."
    : locale === "zh-Hans"
      ? "法语社区移民试点详情：法语要求、社区名单、流程步骤、材料与费用。"
      : "Francophone Community Immigration Pilot details: French language requirement, communities, process steps, documents, and fees.";
  return {
    metadataBase: new URL(BASE_URL),
    title,
    description,
    alternates: {
      canonical: `/${locale}/visas/canada-francophone-pilot`,
      languages: {
        en: "/en/visas/canada-francophone-pilot",
        tr: "/tr/visas/canada-francophone-pilot",
        "zh-Hans": "/zh-Hans/visas/canada-francophone-pilot",
      },
    },
  };
}

export default async function CanadaFrancophonePilotPage({ params }: PageProps) {
  const { locale } = await params;
  const localeSuffix = locale === "tr" ? "_tr" : locale === "zh-Hans" ? "_zh" : "";
  const localeKind = locale === "tr" ? "tr" : locale === "zh-Hans" ? "zh" : "en";

  const data = pilotData as SharedData;
  const fcip = (data.pilots ?? []).find((pilot) => pilot.id === "francophone_community_immigration_pilot");
  const overlapCommunities = ["Sudbury, ON", "Timmins, ON"];
  const trMap: Record<string, string> = {
    "right_of_permanent_residence_fee": "daimi oturum hakkı ücreti",
    "biometrics_fee": "biyometri ücreti",
    "medical_exam": "sağlık muayenesi",
    "police_certificate": "polis sertifikası",
    "language_test": "dil testi",
    "educational_credential_assessment": "eğitim denklik değerlendirmesi",
    "Document Checklist - Francophone Community Immigration Pilot": "Belge Kontrol Listesi - Frankofon Topluluk Göç Pilot Programı",
    "Offer of Employment to a Foreign National - FCIP": "Yabancı Uyrukluya İş Teklifi - FCIP",
    "Schedule 1 - Francophone Community Immigration Pilot": "Ek-1 - Frankofon Topluluk Göç Pilot Programı",
    "Recommendation from the Designated Economic Development Organization - FCIP": "Belirlenmiş Ekonomik Kalkınma Kuruluşundan Tavsiye - FCIP",
    "Generic Application Form for Canada": "Kanada için Genel Başvuru Formu",
    "Schedule A - Background/Declaration": "Ek A - Geçmiş/Beyan",
    "Additional Family Information": "Ek Aile Bilgileri",
    "Supplementary Information - Your travels": "Ek Bilgi - Seyahatleriniz",
    "Statutory Declaration of Common-law Union": "Fiili Birliktelik Yasal Beyanı",
    "If applicant has a common-law partner, plus 12+ months cohabitation proof": "Başvuru sahibinin fiili partneri varsa ve 12+ ay birlikte yaşama kanıtı",
    "Separation Declaration for Minors Travelling to Canada": "Kanada'ya Seyahat Eden Küçükler için Ayrılık Beyanı",
    "If applicable": "Uygunsa",
    "Use of a Representative": "Temsilci Kullanımı",
    "If using paid or unpaid representative": "Ücretli veya ücretsiz temsilci kullanılıyorsa",
    "Authority to Release Personal Information to a Designated Individual": "Belirlenmiş Kişiye Kişisel Bilgi Açıklama Yetkisi",
    "If releasing application info to a non-representative third party": "Başvuru bilgisi temsilci olmayan üçüncü tarafla paylaşılacaksa",
    "Proof of language proficiency": "Dil yeterliliği kanıtı",
    "Proof of education": "Eğitim kanıtı",
    "Proof of settlement funds": "Yerleşim fonu kanıtı",
    "Proof of relevant work experience": "İlgili iş deneyimi kanıtı",
    "Valid regular passport (NOT diplomatic/official/service/public-affairs) + visa copy if residing outside passport country": "Geçerli normal pasaport (diplomatik/resmi/hizmet/kamu işleri değil) + pasaport ülkesinin dışında yaşıyorsa vize kopyası",
    "Birth certificates (applicant + spouse/partner)": "Doğum belgeleri (başvuru sahibi + eş/partner)",
    "Marriage/divorce/annulment certificates (all marriages if more than once)": "Evlilik/boşanma/iptal belgeleri (birden fazla evlilik varsa tümü)",
    "Death certificate for former spouse(s) if applicable": "Eski eş(ler) için ölüm belgesi (uygunsa)",
    "National ID / family registry book if applicable": "Ulusal kimlik / aile kayıt defteri (uygunsa)",
    "Police certificate per country lived in 6+ months since age 18 (valid ~1 year from issue)": "18 yaşından sonra 6+ ay yaşanan her ülke için polis sertifikası (düzenlenmeden itibaren ~1 yıl geçerli)",
    "Photo(s) for applicant + all family members (even non-accompanying), not older than 6 months": "Başvuru sahibi + tüm aile bireyleri (eşlik etmeyenler dahil) için 6 aydan eski olmayan fotoğraf(lar)",
    "Fee payment receipt": "Ücret ödeme dekontu"
  };
  const zhMap: Record<string, string> = {
    "right_of_permanent_residence_fee": "永久居留权利费",
    "biometrics_fee": "生物识别费",
    "medical_exam": "体检",
    "police_certificate": "无犯罪证明",
    "language_test": "语言测试",
    "educational_credential_assessment": "学历认证评估",
    "Document Checklist - Francophone Community Immigration Pilot": "文件清单 - 法语社区移民试点",
    "Offer of Employment to a Foreign National - FCIP": "向外国公民提供就业邀约 - FCIP",
    "Schedule 1 - Francophone Community Immigration Pilot": "附表 1 - 法语社区移民试点",
    "Recommendation from the Designated Economic Development Organization - FCIP": "指定经济发展机构推荐信 - FCIP",
    "Generic Application Form for Canada": "加拿大通用申请表",
    "Schedule A - Background/Declaration": "附表 A - 背景/声明",
    "Additional Family Information": "补充家庭信息",
    "Supplementary Information - Your travels": "补充信息 - 您的旅行记录",
    "Statutory Declaration of Common-law Union": "事实同居关系法定声明",
    "If applicant has a common-law partner, plus 12+ months cohabitation proof": "如申请人有事实伴侣，需附 12 个月以上同居证明",
    "Separation Declaration for Minors Travelling to Canada": "未成年人赴加分离声明",
    "If applicable": "如适用",
    "Use of a Representative": "使用代理人",
    "If using paid or unpaid representative": "如使用收费或不收费代理人",
    "Authority to Release Personal Information to a Designated Individual": "向指定个人披露个人信息授权",
    "If releasing application info to a non-representative third party": "如向非代理的第三方披露申请信息",
    "Proof of language proficiency": "语言能力证明",
    "Proof of education": "学历证明",
    "Proof of settlement funds": "安家资金证明",
    "Proof of relevant work experience": "相关工作经验证明",
    "Valid regular passport (NOT diplomatic/official/service/public-affairs) + visa copy if residing outside passport country": "有效普通护照（不接受外交/公务/服务/公共事务护照）+ 如居住在护照签发国以外需提供签证复印件",
    "Birth certificates (applicant + spouse/partner)": "出生证明（申请人 + 配偶/伴侣）",
    "Marriage/divorce/annulment certificates (all marriages if more than once)": "结婚/离婚/婚姻撤销证明（如有多次婚姻需全部提供）",
    "Death certificate for former spouse(s) if applicable": "前配偶死亡证明（如适用）",
    "National ID / family registry book if applicable": "身份证/户籍簿（如适用）",
    "Police certificate per country lived in 6+ months since age 18 (valid ~1 year from issue)": "18 岁后每个连续居住 6 个月以上国家的无犯罪证明（签发后约 1 年有效）",
    "Photo(s) for applicant + all family members (even non-accompanying), not older than 6 months": "申请人及全部家庭成员照片（含不随行），拍摄时间不超过 6 个月",
    "Fee payment receipt": "费用缴纳凭证"
  };
  const l = (value?: string) => {
    if (!value) return "";
    if (localeKind === "tr") return trMap[value] ?? value;
    if (localeKind === "zh") return zhMap[value] ?? value;
    return value;
  };
  const ui = {
    back: locale === "tr" ? "Kanada vizelerine don" : locale === "zh-Hans" ? "返回加拿大签证" : "Back to Canada visas",
    check: locale === "tr" ? "Uygunlugunu kontrol et" : locale === "zh-Hans" ? "检查你的资格" : "Check your eligibility",
    openPdf: locale === "tr" ? "PDF Ac" : locale === "zh-Hans" ? "打开 PDF" : "Open PDF",
    pilotBadge: locale === "tr" ? "Frankofon Topluluk Goc Pilotu" : locale === "zh-Hans" ? "法语社区移民试点" : "Francophone Community Immigration Pilot",
    fee: locale === "tr" ? "Ucret" : locale === "zh-Hans" ? "费用" : "Fee",
    communities: locale === "tr" ? "Topluluk" : locale === "zh-Hans" ? "社区" : "Communities",
    language: locale === "tr" ? "Dil" : locale === "zh-Hans" ? "语言" : "Language",
    frenchRequired: locale === "tr" ? "Fransizca gerekli" : locale === "zh-Hans" ? "需具备法语能力" : "French required",
    viewRcip: locale === "tr" ? "RCIP sayfasini gor" : locale === "zh-Hans" ? "查看 RCIP 页面" : "View RCIP page",
    quickFacts: locale === "tr" ? "Hizli Bilgiler" : locale === "zh-Hans" ? "快速信息" : "Quick Facts",
    pathwayGroup: locale === "tr" ? "Pathway grubu" : locale === "zh-Hans" ? "路径组" : "Pathway group",
    lastVerified: locale === "tr" ? "Son dogrulama" : locale === "zh-Hans" ? "最近核验" : "Last verified",
    languageRequirement: locale === "tr" ? "Dil gereksinimi" : locale === "zh-Hans" ? "语言要求" : "Language requirement",
    optionalWorkPermit: locale === "tr" ? "Opsiyonel calisma izni" : locale === "zh-Hans" ? "可选工作许可" : "Optional work permit",
    yes: locale === "tr" ? "Evet" : locale === "zh-Hans" ? "是" : "Yes",
    no: locale === "tr" ? "Hayir" : locale === "zh-Hans" ? "否" : "No",
    pdfTitle: locale === "tr" ? "Kirsal ve Frankofon topluluk goc pilotlari (Resmi PDF)" : locale === "zh-Hans" ? "农村与法语社区移民试点（官方 PDF）" : "Rural and Francophone Community Immigration pilots (Official PDF)",
    pdfDesc: locale === "tr" ? "Bu vize sayfasinda kullanilan resmi pilot referans PDF anlik goruntusu." : locale === "zh-Hans" ? "本签证页使用的官方试点参考 PDF 快照。" : "Official pilot reference PDF snapshot used by this visa page.",
    eligibilityAndProcess: locale === "tr" ? "Uygunluk ve Surec" : locale === "zh-Hans" ? "资格与流程" : "Eligibility and Process",
    coreEligibility: locale === "tr" ? "Temel uygunluk" : locale === "zh-Hans" ? "核心资格" : "Core eligibility",
    applicationSteps: locale === "tr" ? "Basvuru adimlari" : locale === "zh-Hans" ? "申请步骤" : "Application steps",
    communitiesOverlap: locale === "tr" ? "Topluluklar ve Kesisim" : locale === "zh-Hans" ? "社区与重叠" : "Communities and Overlap",
    overlapAlert: locale === "tr" ? "Kesisim uyarisi" : locale === "zh-Hans" ? "重叠提醒" : "Overlap alert",
    overlapBody: locale === "tr" ? `${overlapCommunities.join(" ve ")} hem FCIP hem RCIP icinde yer alir. Bu sehirleri sececek kullanicilar her iki pilota da bakmalidir.` : locale === "zh-Hans" ? `${overlapCommunities.join(" 和 ")} 同时出现在 FCIP 与 RCIP 中。选择这些城市的用户应同时查看两个试点。` : `${overlapCommunities.join(" and ")} are in both FCIP and RCIP. Users selecting these cities should review both pilots.`,
    feesAndForms: locale === "tr" ? "Ucretler ve Formlar" : locale === "zh-Hans" ? "费用与表格" : "Fees and Forms",
    processingFeeFrom: locale === "tr" ? "Baslangic islem ucreti" : locale === "zh-Hans" ? "处理费起" : "Processing fee from",
    lastFeeIncreaseDate: locale === "tr" ? "Son ucret artisi tarihi" : locale === "zh-Hans" ? "最近涨价日期" : "Last fee increase date",
    otherFeeCategories: locale === "tr" ? "Diger ucret kalemleri" : locale === "zh-Hans" ? "其他费用类别" : "Other fee categories",
    pilotSpecificForms: locale === "tr" ? "Pilota ozel formlar" : locale === "zh-Hans" ? "试点专用表格" : "Pilot-specific forms",
    portalForms: locale === "tr" ? "Portal formlari" : locale === "zh-Hans" ? "门户表格" : "Portal forms",
    supportingDocs: locale === "tr" ? "Destekleyici Belgeler" : locale === "zh-Hans" ? "支持文件" : "Supporting Documents",
    conditionalForms: locale === "tr" ? "Kosullu formlar" : locale === "zh-Hans" ? "条件表格" : "Conditional forms",
    supportingDocuments: locale === "tr" ? "Destekleyici belgeler" : locale === "zh-Hans" ? "支持文件" : "Supporting documents",
  };
  const localizedField = <T extends Record<string, unknown>>(obj: T | undefined, base: string, fallback?: string) => {
    if (!obj) return fallback ?? "";
    const key = `${base}${localeSuffix}`;
    const value = (obj[key] as string | undefined) ?? fallback ?? (obj[base] as string | undefined);
    return value ?? fallback ?? "";
  };
  const localizedArray = <T,>(base: T[] | undefined, tr: T[] | undefined, zh: T[] | undefined) => {
    if (locale === "tr") return tr ?? base ?? [];
    if (locale === "zh-Hans") return zh ?? base ?? [];
    return base ?? [];
  };
  const pathwayGroupText = localizedField(data as unknown as Record<string, unknown>, "pathwayGroup");
  const structuralNoteText = localizedField(
    data as unknown as Record<string, unknown>,
    "structuralNote",
    "Two distinct pilots with highly overlapping process structure: RCIP (general, 14 communities) and FCIP (French-speaking, 6 Francophone-minority communities). They share the same process/document/fee framework; community list and language requirement differ."
  );
  const eligibilityItems = localizedArray(data.sharedEligibilityCore, data.sharedEligibilityCore_tr, data.sharedEligibilityCore_zh);
  const processSteps = localizedArray(data.sharedProcessSteps, data.sharedProcessSteps_tr, data.sharedProcessSteps_zh);
  const translationRule = localizedField(data.sharedDocuments as unknown as Record<string, unknown>, "translationRule", data.sharedDocuments?.translationRule);

  const feeText = new Intl.NumberFormat(locale === "zh-Hans" ? "zh-CN" : locale === "tr" ? "tr-TR" : "en-CA", {
    style: "currency",
    currency: data.sharedFees?.currency ?? "CAD",
    maximumFractionDigits: 0,
  }).format(data.sharedFees?.processingFeeFrom ?? 1590);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-28 sm:pt-32 dark:from-slate-950 dark:to-slate-900">
      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link
            href={`/${locale}/visas/canada`}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {ui.back}
          </Link>
          <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-100">FCIP</Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="space-y-6 p-6 sm:p-8">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100">Canada</Badge>
                  <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-100">{ui.pilotBadge}</Badge>
                </div>
                <div className="space-y-3">
                  <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                    {localizedField(
                      fcip as unknown as Record<string, unknown>,
                      "name",
                      locale === "tr"
                        ? "Frankofon Topluluk Goc Pilotu (FCIP)"
                        : locale === "zh-Hans"
                          ? "法语社区移民试点（FCIP）"
                          : "Francophone Community Immigration Pilot (FCIP)"
                    )}
                  </h1>
                  <p className="max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
                    {localizedField(fcip as unknown as Record<string, unknown>, "purpose")}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{structuralNoteText}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{ui.fee}</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{feeText}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{ui.communities}</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{fcip?.numberOfCommunities ?? 6}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{ui.language}</p>
                  <p className="mt-2 text-lg font-bold text-slate-950 dark:text-white">{ui.frenchRequired}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href={`/${locale}/full-check`}>
                  <Button className="bg-indigo-600 text-white hover:bg-indigo-700">
                    <span>{ui.check}</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link
                  href={`/${locale}/visas/canada-rural-pilot`}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                >
                  {ui.viewRcip}
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-xl">{ui.quickFacts}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{ui.pathwayGroup}</p>
                <p className="mt-1 font-medium text-slate-900 dark:text-white">{pathwayGroupText}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{ui.lastVerified}</p>
                <p className="mt-1 font-medium text-slate-900 dark:text-white">{data.lastVerified}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{ui.languageRequirement}</p>
                <p className="mt-1 font-medium text-slate-900 dark:text-white">{localizedField(fcip as unknown as Record<string, unknown>, "languageRequirement")}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{ui.optionalWorkPermit}</p>
                <p className="mt-1 font-medium text-slate-900 dark:text-white">{fcip?.optionalWorkPermit ? ui.yes : ui.no}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-6 sm:px-6 lg:px-8">
        <VisaPdfDownloadCard
          pdfUrls={data.sourcePdfBlobUrl ? [data.sourcePdfBlobUrl] : []}
          title={ui.pdfTitle}
          description={ui.pdfDesc}
          primaryLabel={ui.openPdf}
        />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ListChecks className="h-5 w-5 text-indigo-600" />
                {ui.eligibilityAndProcess}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">{ui.coreEligibility}</p>
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  {eligibilityItems.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-indigo-600">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">{ui.applicationSteps}</p>
                <ol className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  {processSteps.map((step) => (
                    <li key={step.step} className="flex gap-2">
                      <span className="font-semibold text-indigo-700">{step.step}.</span>
                      <span>
                        <span className="font-medium">{step.name}</span>
                        {step.description ? ` - ${step.description}` : ""}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <MapPinned className="h-5 w-5 text-indigo-600" />
                {ui.communitiesOverlap}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="grid gap-2 text-sm text-slate-700 dark:text-slate-300 sm:grid-cols-2">
                {(fcip?.communities ?? []).map((community) => (
                  <li key={community} className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
                    {community}
                  </li>
                ))}
              </ul>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-600/30 dark:bg-amber-950/20 dark:text-amber-100">
                <p className="font-semibold">{ui.overlapAlert}</p>
                <p className="mt-1">{ui.overlapBody}</p>
              </div>
              {fcip?.note ? (
                <div className="rounded-lg border border-slate-200 p-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
                  {localizedField(fcip as unknown as Record<string, unknown>, "note")}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <WalletCards className="h-5 w-5 text-indigo-600" />
                {ui.feesAndForms}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <p>{ui.processingFeeFrom}: <span className="font-semibold">{feeText}</span></p>
              <p>{ui.lastFeeIncreaseDate}: <span className="font-semibold">{data.sharedFees?.lastIncreaseDate}</span></p>
              <p>{ui.otherFeeCategories}: {(data.sharedFees?.otherFeeCategories ?? []).map((item) => l(item)).join(", ")}</p>
              <div>
                <p className="mb-2 font-semibold text-slate-900 dark:text-white">{ui.pilotSpecificForms}</p>
                <ul className="space-y-1">
                  {(fcip?.pilotSpecificForms ?? []).map((form) => (
                    <li key={form.form}>{form.form} - {l(form.name)}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 font-semibold text-slate-900 dark:text-white">{ui.portalForms}</p>
                <ul className="space-y-1">
                  {(data.sharedDocuments?.fillInPortal ?? []).map((form) => (
                    <li key={form.form}>{form.form} - {l(form.name)}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Languages className="h-5 w-5 text-indigo-600" />
                {ui.supportingDocs}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 text-sm text-slate-700 dark:text-slate-300">
              <div>
                <p className="mb-2 font-semibold text-slate-900 dark:text-white">{ui.conditionalForms}</p>
                <ul className="space-y-1">
                  {(data.sharedDocuments?.conditionalForms ?? []).map((form) => (
                    <li key={form.form}>{form.form} - {l(form.name)}{form.condition ? ` (${l(form.condition)})` : ""}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 font-semibold text-slate-900 dark:text-white">{ui.supportingDocuments}</p>
                <ul className="space-y-1">
                  {(data.sharedDocuments?.supportingDocuments ?? []).map((doc) => (
                    <li key={doc}>{l(doc)}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-800">
                {translationRule}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
