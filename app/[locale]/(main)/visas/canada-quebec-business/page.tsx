import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, BriefcaseBusiness, Building2, ListChecks, UserRoundSearch } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VisaPdfDownloadCard } from "@/components/visa-pdf-download-card";
import businessData from "@/src/data/countries/ca/quebec-investors-entrepreneurs-self-employed.json";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

type PageProps = {
  params: Promise<{ locale: string }>;
};

type BusinessData = {
  pathwayCovered?: string;
  pathwayCovered_tr?: string;
  pathwayCovered_zh?: string;
  lastVerified?: string;
  sourcePdfBlobUrl?: string;
  relationToOtherQuebecFile?: string;
  relationToOtherQuebecFile_tr?: string;
  relationToOtherQuebecFile_zh?: string;
  twoStageProcess?: {
    stage1_quebec?: { authority?: string; outcome?: string; note?: string; note_tr?: string; note_zh?: string };
    stage2_federal?: { authority?: string; prerequisite?: string; prerequisite_tr?: string; prerequisite_zh?: string; fee?: { currency?: string; from?: number; note?: string; note_tr?: string; note_zh?: string } };
  };
  twoStageProcess_tr?: {
    stage1_quebec?: { authority?: string; outcome?: string; note?: string };
    stage2_federal?: { authority?: string; prerequisite?: string; fee?: { currency?: string; from?: number; note?: string } };
  };
  twoStageProcess_zh?: {
    stage1_quebec?: { authority?: string; outcome?: string; note?: string };
    stage2_federal?: { authority?: string; prerequisite?: string; fee?: { currency?: string; from?: number; note?: string } };
  };
  ineligibleSectorsGeneral?: string[];
  subStreams?: {
    investor?: {
      conditions?: {
        managementExperience?: { minimumYears?: number; window?: string };
        netWorth?: { minimumCAD?: number };
        frenchLanguage?: { minimumLevel?: string; acceptedTests?: string[]; acceptedTestProviders?: string[] };
        investmentAndContribution?: { investmentCAD?: number; financialContributionCAD?: number; investmentTerm?: string };
        quebecStayRequirement?: { totalMonths?: number; windowYears?: number; minimumPersonalMonths?: number };
      };
    };
    entrepreneur?: {
      subStreamsNamedOnly_notDetailedInSource?: Array<{ id: string; name: string; description?: string }>;
      note?: string;
    };
    selfEmployedPerson?: {
      conditions?: {
        workExperience?: { minimumYears?: number; window?: string };
        netWorth?: { minimumCAD?: number };
        startUpDeposit?: { outsideCMM_CAD?: number; withinCMM_CAD?: number; CMM_meaning?: string };
        regulatedProfessionRequirement?: { processSteps?: string[] };
      };
    };
  };
  federalApplicationStage?: {
    documentChecklists?: { investorsAndEntrepreneurs?: string; selfEmployedPersons?: string };
    fillInPortal?: Array<{ form: string; name: string }>;
    uploadOnly_noSignature?: Array<{ form: string; name: string; appliesTo?: string[] }>;
    conditionalForms_handSigned?: Array<{ form: string; name: string; condition?: string; note?: string }>;
    supportingDocuments?: string[];
  };
  afterApply?: {
    biometrics?: { ageRange?: string; deadline?: string };
    medicalExam?: { required?: boolean; appliesTo?: string };
    decisionOutcomes?: { approved?: string; refused?: string; withdrawal?: string };
  };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    metadataBase: new URL(BASE_URL),
    title: "Quebec investors, entrepreneurs and self-employed persons | LogiVisa",
    description:
      "Quebec business pathways with investor, entrepreneur, and self-employed sections, plus federal PR stage requirements.",
    alternates: {
      canonical: `/${locale}/visas/canada-quebec-business`,
      languages: {
        en: "/en/visas/canada-quebec-business",
        tr: "/tr/visas/canada-quebec-business",
        "zh-Hans": "/zh-Hans/visas/canada-quebec-business",
      },
    },
  };
}

export default async function CanadaQuebecBusinessPage({ params }: PageProps) {
  const { locale } = await params;
  const localeSuffix = locale === "tr" ? "_tr" : locale === "zh-Hans" ? "_zh" : "";
  const data = businessData as BusinessData;
  const ui = {
    back: locale === "tr" ? "Kanada vizelerine don" : locale === "zh-Hans" ? "返回加拿大签证" : "Back to Canada visas",
    check: locale === "tr" ? "Uygunlugunu kontrol et" : locale === "zh-Hans" ? "检查你的资格" : "Check your eligibility",
    openPdf: locale === "tr" ? "PDF Ac" : locale === "zh-Hans" ? "打开 PDF" : "Open PDF",
    badge: locale === "tr" ? "Quebec Is Akislari" : locale === "zh-Hans" ? "魁北克商业通道" : "Quebec Business Streams",
    twoStageProcess: locale === "tr" ? "Iki asamali surec" : locale === "zh-Hans" ? "两阶段流程" : "Two-stage process",
    stage1: locale === "tr" ? "Asama 1 (Quebec)" : locale === "zh-Hans" ? "第 1 阶段（魁北克）" : "Stage 1 (Quebec)",
    stage2: locale === "tr" ? "Asama 2 (Federal)" : locale === "zh-Hans" ? "第 2 阶段（联邦）" : "Stage 2 (Federal)",
    outcome: locale === "tr" ? "Cikti" : locale === "zh-Hans" ? "结果" : "Outcome",
    prerequisite: locale === "tr" ? "On kosul" : locale === "zh-Hans" ? "前提条件" : "Prerequisite",
    federalFeeFrom: locale === "tr" ? "Federal ucret (en dusuk)" : locale === "zh-Hans" ? "联邦费用起" : "Federal fee from",
    subStreams: locale === "tr" ? "Alt akislar" : locale === "zh-Hans" ? "子通道" : "Sub-streams",
    lastVerified: locale === "tr" ? "Son dogrulama" : locale === "zh-Hans" ? "最近核验" : "Last verified",
    generalIneligibleSectors: locale === "tr" ? "Genel uygun olmayan sektorler" : locale === "zh-Hans" ? "一般不适用行业" : "General ineligible sectors",
    pdfTitle: locale === "tr" ? "Quebec yatirimci, girisimci ve serbest meslek (Resmi PDF)" : locale === "zh-Hans" ? "魁北克投资者、企业家与自雇人士（官方 PDF）" : "Quebec investors, entrepreneurs and self-employed persons (Official PDF)",
    pdfDescription: locale === "tr" ? "Quebec is gocu yollari ve ilgili federal asama gereklilikleri icin resmi anlik goruntu." : locale === "zh-Hans" ? "魁北克商业移民路径及联邦阶段要求的官方快照。" : "Official snapshot for Quebec business immigration pathways and related federal-stage requirements.",
    investor: locale === "tr" ? "Yatirimci" : locale === "zh-Hans" ? "投资者" : "Investor",
    entrepreneur: locale === "tr" ? "Girisimci" : locale === "zh-Hans" ? "企业家" : "Entrepreneur",
    selfEmployed: locale === "tr" ? "Serbest meslek sahibi" : locale === "zh-Hans" ? "自雇人士" : "Self-employed person",
    entrepreneurDetailsSoon: locale === "tr" ? "Girisimci alt-akislari icin ayrintili kriterler yakinda eklenecek." : locale === "zh-Hans" ? "企业家子通道的详细标准即将补充。" : "Detailed criteria for entrepreneur sub-streams are coming soon.",
    workExperience: locale === "tr" ? "Is deneyimi" : locale === "zh-Hans" ? "工作经验" : "Work experience",
    netWorthMinimum: locale === "tr" ? "Minimum net varlik" : locale === "zh-Hans" ? "最低净资产" : "Net worth minimum",
    frenchMinimum: locale === "tr" ? "Minimum Fransizca" : locale === "zh-Hans" ? "法语最低要求" : "French minimum",
    investment: locale === "tr" ? "Yatirim" : locale === "zh-Hans" ? "投资" : "Investment",
    financialContribution: locale === "tr" ? "Finansal katki" : locale === "zh-Hans" ? "财务贡献" : "Financial contribution",
    quebecStayRequirement: locale === "tr" ? "Quebec'te kalis kosulu" : locale === "zh-Hans" ? "魁北克居住要求" : "Quebec stay requirement",
    startupDepositOutside: locale === "tr" ? "CMM disi baslangic depozitosu" : locale === "zh-Hans" ? "CMM 外启动存款" : "Startup deposit outside CMM",
    startupDepositWithin: locale === "tr" ? "CMM ici baslangic depozitosu" : locale === "zh-Hans" ? "CMM 内启动存款" : "Startup deposit within CMM",
    regulatedProfessionProcess: locale === "tr" ? "Düzenlenmiş meslek süreci" : locale === "zh-Hans" ? "受监管职业流程" : "Regulated profession process",
    federalApplicationStageForms: locale === "tr" ? "Federal basvuru asamasi formlari" : locale === "zh-Hans" ? "联邦申请阶段表格" : "Federal application stage forms",
    supportingDocsAfterApply: locale === "tr" ? "Destekleyici belgeler ve basvuru sonrasi" : locale === "zh-Hans" ? "支持文件与递交后步骤" : "Supporting docs and after apply",
    checklistInvestors: locale === "tr" ? "Kontrol listesi (yatirimci/girisimci)" : locale === "zh-Hans" ? "清单（投资者/企业家）" : "Checklist (investors/entrepreneurs)",
    checklistSelfEmployed: locale === "tr" ? "Kontrol listesi (serbest meslek)" : locale === "zh-Hans" ? "清单（自雇）" : "Checklist (self-employed)",
    fillInPortal: locale === "tr" ? "Portalda doldur" : locale === "zh-Hans" ? "在门户填写" : "Fill in portal",
    uploadOnlyNoSignature: locale === "tr" ? "Sadece yukle (imzasiz)" : locale === "zh-Hans" ? "仅上传（无需签名）" : "Upload only (no signature)",
    conditionalFormsHandSigned: locale === "tr" ? "Kosullu formlar (islak imza)" : locale === "zh-Hans" ? "条件表格（手写签名）" : "Conditional forms (hand-signed)",
    supportingDocuments: locale === "tr" ? "Destekleyici belgeler" : locale === "zh-Hans" ? "支持文件" : "Supporting documents",
    biometrics: locale === "tr" ? "Biyometri" : locale === "zh-Hans" ? "生物识别" : "Biometrics",
    medicalExamRequired: locale === "tr" ? "Saglik muayenesi gerekli" : locale === "zh-Hans" ? "是否需要体检" : "Medical exam required",
    approved: locale === "tr" ? "Onay" : locale === "zh-Hans" ? "获批" : "Approved",
    refused: locale === "tr" ? "Red" : locale === "zh-Hans" ? "拒签" : "Refused",
    withdrawal: locale === "tr" ? "Geri cekme" : locale === "zh-Hans" ? "撤回" : "Withdrawal",
    yes: locale === "tr" ? "Evet" : locale === "zh-Hans" ? "是" : "Yes",
    no: locale === "tr" ? "Hayir" : locale === "zh-Hans" ? "否" : "No",
  };
  const localizedField = <T extends Record<string, unknown>>(obj: T | undefined, base: string, fallback?: string) => {
    if (!obj) return fallback ?? "";
    const key = `${base}${localeSuffix}`;
    const value = (obj[key] as string | undefined) ?? fallback ?? (obj[base] as string | undefined);
    return value ?? fallback ?? "";
  };
  const titleText = localizedField(
    data as unknown as Record<string, unknown>,
    "pathwayCovered",
    locale === "tr"
      ? "Quebec yatirimci, girisimci ve serbest meslek sahipleri"
      : locale === "zh-Hans"
        ? "魁北克投资者、企业家与自雇人士"
        : "Quebec investors, entrepreneurs and self-employed persons"
  );
  const relationText = localizedField(
    data as unknown as Record<string, unknown>,
    "relationToOtherQuebecFile",
    locale === "tr"
      ? "Bu sayfa, canada-quebec-selected-skilled-workers.json dosyasindaki eksik bolumlerin bir kismini yalnizca is sinifi (yatirimci/girisimci/serbest meslek) icin tamamlar. Genel skilled-worker akisi (QSWP/PSTQ, Arrima) ayri bir surectir ve burada tam belgelenmemistir."
      : locale === "zh-Hans"
        ? "本页仅补充 canada-quebec-selected-skilled-workers.json 中与投资者/企业家/自雇商业类别相关的缺失部分。一般技术工人路径（QSWP/PSTQ、Arrima）仍是独立流程，尚未在此完整记录。"
        : "This fills part of missingDataFlags from canada-quebec-selected-skilled-workers.json, but only for the investor/entrepreneur/self-employed business class. The general skilled-worker flow (QSWP/PSTQ, Arrima portal) remains separate and not fully documented here."
  );
  const localizedTwoStage = locale === "tr"
    ? data.twoStageProcess_tr
    : locale === "zh-Hans"
      ? data.twoStageProcess_zh
      : data.twoStageProcess;

  const federalFeeText = new Intl.NumberFormat(locale === "zh-Hans" ? "zh-CN" : locale === "tr" ? "tr-TR" : "en-CA", {
    style: "currency",
    currency: data.twoStageProcess?.stage2_federal?.fee?.currency ?? "CAD",
    maximumFractionDigits: 0,
  }).format(data.twoStageProcess?.stage2_federal?.fee?.from ?? 2495);

  const investor = data.subStreams?.investor?.conditions;
  const entrepreneur = data.subStreams?.entrepreneur;
  const selfEmployed = data.subStreams?.selfEmployedPerson?.conditions;
  const trMap: Record<string, string> = {
    "Payday loans, cheque cashing, or pledge loans": "Maas-gunu kredileri, cek bozma veya rehin temelli kredi faaliyetleri",
    "Production, distribution, or sale of pornographic/sexually-explicit products or sex-industry services (nude/erotic dancing, escort services, erotic massage)": "Pornografik/acik cinsel urunlerin veya seks-endustrisi hizmetlerinin (ciplak/erotik dans, eskort hizmeti, erotik masaj) uretimi, dagitimi veya satisi",
    "Innovative business": "Yenilikci isletme",
    "Start up an innovative business or carry out an innovative project with support of an accompanying organization": "Bir destek kurulusunun esliginde yenilikci bir isletme kurmak veya yenilikci bir proje yurütmek",
    "Business startup": "Isletme kurulumu",
    "Start a business or operate a business already started": "Yeni bir isletme kurmak veya daha once kurulmus bir isletmeyi isletmek",
    "Takeover": "Devralma",
    "Take over or operate an acquired business with assistance of a support organization": "Bir destek kurulusunun yardimiyla devralinan bir isletmeyi devralmak veya isletmek",
    "Find NOC code via Qualifications Quebec website (French only)": "Qualifications Quebec sitesi uzerinden NOC kodunu bulun (yalnizca Fransizca)",
    "Check if profession is on the Liste des professions reglementees (Ministere's regulated professions list, PDF)": "Meslegin Liste des professions reglementees (Bakanligin duzenlenmis meslekler listesi, PDF) icinde olup olmadigini kontrol edin",
    "If regulated: find practice conditions via Qualifications Quebec site or the profession's Quebec regulatory body directly": "Meslek duzenlenmisse: uygulama kosullarini Qualifications Quebec sitesi veya meslegin Quebec duzenleyici kurumu uzerinden ogrenin",
    "Obtain authorization or recognition document from the relevant regulatory authority": "Ilgili duzenleyici kurumdan yetkilendirme veya denklik/tanima belgesi alin",
    "Generic Application Form for Canada": "Kanada Genel Basvuru Formu",
    "Schedule A - Background/Declaration": "Schedule A - Gecmis/Beyan",
    "Additional Family Information": "Ek Aile Bilgileri",
    "Supplementary Information - Your travels": "Ek Bilgi - Seyahatleriniz",
    "Declaration of Intent to Reside in Quebec - Economic Classes": "Quebec'te Ikamet Niyeti Beyani - Ekonomik Siniflar",
    "Business Immigrants - Investors and entrepreneurs": "Is Gocmeni - Yatirimcilar ve Girisimciler",
    "Business Immigrants - Self-employed persons": "Is Gocmeni - Serbest Meslek Sahipleri",
    "Document Checklist - Investors and entrepreneurs": "Belge Kontrol Listesi - Yatirimcilar ve Girisimciler",
    "Document Checklist - Self-employed persons": "Belge Kontrol Listesi - Serbest Meslek Sahipleri",
    "Statutory Declaration of Common-law Union": "Fiili Birliktelik Yasal Beyani",
    "Separation Declaration for Minors Travelling to Canada": "Kanada'ya Seyahat Eden Kucukler Icin Ayrilik Beyani",
    "If common-law partner, plus 12+ months cohabitation proof": "Fiili birliktelik varsa, ek olarak 12+ ay birlikte yasam kaniti",
    "If minor immigrating without both parents/guardians": "Kucuk, her iki ebeveyn/vasi olmadan goc ediyorsa",
    "Non-accompanying parent/guardian must sign in front of a notary public - stricter than the standard hand-signature requirement seen elsewhere": "Eslik etmeyen ebeveyn/vasi noterde imzalamalidir - diger sayfalardaki standart islak imza kosulundan daha siktir",
    "Travel documents/passport (regular passport only, NOT diplomatic/official/service/public-affairs) for applicant + spouse + dependent children": "Basvuru sahibi + es/partner + bagimli cocuklar icin seyahat belgesi/pasaport (yalnizca normal pasaport; diplomatik/resmi/hizmet/kamu iliskileri pasaportlari gecersiz)",
    "Visa copy if living outside passport-issuing country": "Pasaportu veren ulke disinda yasaniyorsa vize kopyasi",
    "Identity/civil status docs: birth certificates, name/DOB change documents, marriage/divorce/annulment certificates (all marriages if multiple), death certificate for former spouse if applicable, national ID/family registry": "Kimlik/medeni durum belgeleri: dogum belgeleri, ad/dogum tarihi degisiklik belgeleri, evlilik/bosanma/iptal belgeleri (birden fazla evlilik varsa tumu), eski es icin olum belgesi (varsa), ulusal kimlik/aile kayit defteri",
    "Police certificate per country lived in 6+ months since age 18 (valid ~1 year from issue)": "18 yasindan sonra 6+ ay yasanan her ulke icin adli sicil belgesi (duzenleme tarihinden itibaren yaklasik 1 yil gecerli)",
    "Photo(s) for applicant + all family members, not older than 6 months": "Basvuru sahibi + tum aile uyeleri icin fotograf(lar), 6 aydan eski olmamali",
    "Certificat de selection du Quebec (CSQ) - issued by MIFI; remains valid for federal purposes until IRCC decision even if technically expired; MIFI stopped renewing CSQs as of 2018": "Certificat de selection du Quebec (CSQ) - MIFI tarafindan verilir; teknik olarak suresi dolsa bile IRCC kararina kadar federal asamada gecerli kalir; MIFI 2018'den beri CSQ yenilememektedir",
    "Must pay Right of Permanent Residence Fee if not already paid before finalization": "Nihai karardan once odenmediyse Right of Permanent Residence Fee odenmelidir",
    "Letter explaining reason; reconsideration requires new application + meeting eligibility + admissibility": "Gerekceyi aciklayan ret mektubu gonderilir; yeniden degerlendirme icin yeni basvuru + uygunluk + kabul edilebilirlik kosullarinin saglanmasi gerekir",
    "Possible via webform; partial fee refund depending on processing stage": "Webform uzerinden mumkundur; iade tutari basvurunun asamasina gore degisir"
    ,"within 5 years preceding application submission": "basvuru tarihinden onceki 5 yil icinde"
    ,"5 years": "5 yil"
    ,"Level 7 on the Echelle quebecoise des niveaux de competence en francais": "Quebec Fransizca yeterlilik olceginde Seviye 7"
    ,"Communaute metropolitaine de Montreal (Montreal Metropolitan Community)": "Communaute metropolitaine de Montreal (Montreal Buyuksehir Toplulugu)"
    ,"30 days from Biometric Instruction Letter (BIL)": "Biyometri Talimat Mektubu'ndan (BIL) itibaren 30 gun"
    ,"applicant + partner + children": "basvuru sahibi + partner/es + cocuklar"
    ,"Unlike the previous skilled-worker file, this file includes Quebec-side selection criteria in detail; see the subStreams section below.": "Onceki skilled-worker dosyasindan farkli olarak bu dosya Quebec tarafindaki secim kriterlerini ayrintili verir; asagidaki alt-akislar bolumune bakin."
    ,"Bu uc alt-akimin 'Show more' detaylari bu kaynakta acilmamis/kapsanmamis - ayri bir kaynaktan arastirilmasi gerekiyor.": "Bu uc alt-akisin ayrintili 'Daha fazla goster' verileri bu kaynakta acilmamis; ayri bir kaynaktan tamamlanmasi gerekir."
  };
  const zhMap: Record<string, string> = {
    "Payday loans, cheque cashing, or pledge loans": "发薪日贷款、支票兑现或质押贷款业务",
    "Production, distribution, or sale of pornographic/sexually-explicit products or sex-industry services (nude/erotic dancing, escort services, erotic massage)": "色情/露骨性内容产品或性产业服务（裸体/情色舞蹈、陪同服务、情色按摩）的生产、分发或销售",
    "Innovative business": "创新型企业",
    "Start up an innovative business or carry out an innovative project with support of an accompanying organization": "在支持机构协助下创建创新型企业或开展创新项目",
    "Business startup": "企业创办",
    "Start a business or operate a business already started": "创办新企业或运营已成立企业",
    "Takeover": "企业接管",
    "Take over or operate an acquired business with assistance of a support organization": "在支持机构协助下接管或运营已收购企业",
    "Find NOC code via Qualifications Quebec website (French only)": "通过 Qualifications Quebec 网站查找 NOC 代码（仅法语）",
    "Check if profession is on the Liste des professions reglementees (Ministere's regulated professions list, PDF)": "检查该职业是否在 Liste des professions reglementees（部委受监管职业名单，PDF）中",
    "If regulated: find practice conditions via Qualifications Quebec site or the profession's Quebec regulatory body directly": "若为受监管职业：通过 Qualifications Quebec 网站或该职业在魁北克的监管机构查询执业条件",
    "Obtain authorization or recognition document from the relevant regulatory authority": "从相关监管机构取得执业授权或资格认可文件",
    "Generic Application Form for Canada": "加拿大通用申请表",
    "Schedule A - Background/Declaration": "附表A - 背景/声明",
    "Additional Family Information": "补充家庭信息",
    "Supplementary Information - Your travels": "补充信息 - 您的旅行记录",
    "Declaration of Intent to Reside in Quebec - Economic Classes": "魁北克居住意向声明 - 经济类",
    "Business Immigrants - Investors and entrepreneurs": "商业移民 - 投资者与企业家",
    "Business Immigrants - Self-employed persons": "商业移民 - 自雇人士",
    "Document Checklist - Investors and entrepreneurs": "材料清单 - 投资者与企业家",
    "Document Checklist - Self-employed persons": "材料清单 - 自雇人士",
    "Statutory Declaration of Common-law Union": "事实同居法定声明",
    "Separation Declaration for Minors Travelling to Canada": "未成年人赴加拿大分离声明",
    "If common-law partner, plus 12+ months cohabitation proof": "如为事实伴侣，需额外提供 12 个月以上同居证明",
    "If minor immigrating without both parents/guardians": "若未成年人并非由双亲/监护人同时随行移民",
    "Non-accompanying parent/guardian must sign in front of a notary public - stricter than the standard hand-signature requirement seen elsewhere": "未随行父母/监护人须在公证人面前签字 - 比其他页面常见的手签要求更严格",
    "Travel documents/passport (regular passport only, NOT diplomatic/official/service/public-affairs) for applicant + spouse + dependent children": "主申请人 + 配偶/伴侣 + 受抚养子女的旅行证件/护照（仅普通护照；外交/公务/服务/公共事务护照无效）",
    "Visa copy if living outside passport-issuing country": "如居住在护照签发国之外，需提供签证复印件",
    "Identity/civil status docs: birth certificates, name/DOB change documents, marriage/divorce/annulment certificates (all marriages if multiple), death certificate for former spouse if applicable, national ID/family registry": "身份/民事状态文件：出生证明、姓名/出生日期变更文件、结婚/离婚/婚姻撤销证明（如有多次婚姻需全部提供）、前配偶死亡证明（如适用）、国民身份证/户籍登记",
    "Police certificate per country lived in 6+ months since age 18 (valid ~1 year from issue)": "18 岁后每个连续居住 6 个月以上国家的无犯罪证明（签发后约 1 年有效）",
    "Photo(s) for applicant + all family members, not older than 6 months": "主申请人及全部家庭成员照片，拍摄时间不得超过 6 个月",
    "Certificat de selection du Quebec (CSQ) - issued by MIFI; remains valid for federal purposes until IRCC decision even if technically expired; MIFI stopped renewing CSQs as of 2018": "魁北克甄选证书（CSQ）由 MIFI 签发；即使技术上过期，在 IRCC 作出决定前联邦阶段仍可使用；MIFI 自 2018 年起不再续签 CSQ",
    "Must pay Right of Permanent Residence Fee if not already paid before finalization": "若在最终审理前尚未支付，必须补缴永久居民权利费",
    "Letter explaining reason; reconsideration requires new application + meeting eligibility + admissibility": "会收到说明原因的拒签信；重新审理需提交新申请并满足资格与可入境要求",
    "Possible via webform; partial fee refund depending on processing stage": "可通过 webform 撤回；是否部分退费取决于处理阶段"
    ,"within 5 years preceding application submission": "在提交申请前 5 年内"
    ,"5 years": "5 年"
    ,"Level 7 on the Echelle quebecoise des niveaux de competence en francais": "魁北克法语能力等级量表 7 级"
    ,"Communaute metropolitaine de Montreal (Montreal Metropolitan Community)": "蒙特利尔都会区共同体（CMM）"
    ,"30 days from Biometric Instruction Letter (BIL)": "自收到生物识别通知信（BIL）起 30 天内"
    ,"applicant + partner + children": "申请人 + 伴侣/配偶 + 子女"
    ,"Unlike the previous skilled-worker file, this file includes Quebec-side selection criteria in detail; see the subStreams section below.": "与前一个 skilled-worker 文件不同，本文件详细覆盖了魁北克侧筛选标准；请见下方子通道部分。"
    ,"Bu uc alt-akimin 'Show more' detaylari bu kaynakta acilmamis/kapsanmamis - ayri bir kaynaktan arastirilmasi gerekiyor.": "该来源未展开这三个子通道的“更多详情”，需要从其他来源补充研究。"
  };
  const l = (value?: string) => {
    if (!value) return "";
    if (locale === "tr") return trMap[value] ?? value;
    if (locale === "zh-Hans") return zhMap[value] ?? value;
    return value;
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link
            href={`/${locale}/visas/canada`}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {ui.back}
          </Link>
          <Badge className="bg-violet-100 text-violet-900 dark:bg-violet-500/15 dark:text-violet-100">{ui.badge}</Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="space-y-6 p-6 sm:p-8">
              <div className="space-y-3">
                <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                  {titleText}
                </h1>
                <p className="max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
                  {titleText}
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-300">{relationText}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">{ui.twoStageProcess}</p>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                  <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{ui.stage1}</p>
                    <p className="mt-1 font-semibold text-slate-900 dark:text-white">{localizedTwoStage?.stage1_quebec?.authority}</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{ui.outcome}: {localizedTwoStage?.stage1_quebec?.outcome}</p>
                    <p className="mt-1 text-xs text-slate-400">{l(localizedTwoStage?.stage1_quebec?.note ?? "Unlike the previous skilled-worker file, this file includes Quebec-side selection criteria in detail; see the subStreams section below.")}</p>
                  </div>
                  <div className="flex justify-center text-slate-400">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                  <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 dark:border-violet-600/30 dark:bg-violet-950/20">
                    <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-200">{ui.stage2}</p>
                    <p className="mt-1 font-semibold text-violet-900 dark:text-violet-100">{localizedTwoStage?.stage2_federal?.authority}</p>
                    <p className="mt-1 text-sm text-violet-800 dark:text-violet-200">{ui.prerequisite}: {localizedTwoStage?.stage2_federal?.prerequisite}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{ui.federalFeeFrom}</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{federalFeeText}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{ui.subStreams}</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">3</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{ui.lastVerified}</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{data.lastVerified}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href={`/${locale}/full-check`}>
                  <Button className="bg-violet-600 text-white hover:bg-violet-700">
                    <span>{ui.check}</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-xl">{ui.generalIneligibleSectors}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
              {(data.ineligibleSectorsGeneral ?? []).map((item) => (
                <p key={item}>- {l(item)}</p>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-6 sm:px-6 lg:px-8">
        <VisaPdfDownloadCard
          pdfUrls={data.sourcePdfBlobUrl ? [data.sourcePdfBlobUrl] : []}
          title={ui.pdfTitle}
          description={ui.pdfDescription}
          primaryLabel={ui.openPdf}
        />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Building2 className="h-5 w-5 text-violet-600" />
                {ui.investor}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
              <p>{ui.workExperience}: {investor?.managementExperience?.minimumYears} {locale === "tr" ? "yil" : locale === "zh-Hans" ? "年" : "years"} ({l(investor?.managementExperience?.window)})</p>
              <p>{ui.netWorthMinimum}: CAD {investor?.netWorth?.minimumCAD?.toLocaleString("en-CA")}</p>
              <p>{ui.frenchMinimum}: {l(investor?.frenchLanguage?.minimumLevel)}</p>
              <p>{ui.investment}: CAD {investor?.investmentAndContribution?.investmentCAD?.toLocaleString("en-CA")} {locale === "tr" ? "-" : locale === "zh-Hans" ? "，期限" : "for"} {l(investor?.investmentAndContribution?.investmentTerm)}</p>
              <p>{ui.financialContribution}: CAD {investor?.investmentAndContribution?.financialContributionCAD?.toLocaleString("en-CA")}</p>
              <p>{ui.quebecStayRequirement}: {investor?.quebecStayRequirement?.totalMonths} {locale === "tr" ? "ay" : locale === "zh-Hans" ? "个月" : "months"} {locale === "tr" ? "icinde" : locale === "zh-Hans" ? "需在" : "within"} {investor?.quebecStayRequirement?.windowYears} {locale === "tr" ? "yil" : locale === "zh-Hans" ? "年" : "years"} ({investor?.quebecStayRequirement?.minimumPersonalMonths} {locale === "tr" ? "ayi basvuru sahibinin bizzat tamamlamasi gerekir" : locale === "zh-Hans" ? "个月需由申请人本人完成" : "months personally"})</p>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50 shadow-sm dark:border-amber-700/30 dark:bg-amber-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-amber-900 dark:text-amber-100">
                <AlertTriangle className="h-5 w-5" />
                {ui.entrepreneur}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-amber-900 dark:text-amber-100">
              <p className="font-semibold">{ui.entrepreneurDetailsSoon}</p>
              <p>{l(entrepreneur?.note)}</p>
              <ul className="space-y-2">
                {(entrepreneur?.subStreamsNamedOnly_notDetailedInSource ?? []).map((stream) => (
                  <li key={stream.id}>
                    <p className="font-semibold">{l(stream.name)}</p>
                    <p>{l(stream.description)}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <UserRoundSearch className="h-5 w-5 text-violet-600" />
                {ui.selfEmployed}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
              <p>{ui.workExperience}: {selfEmployed?.workExperience?.minimumYears} {locale === "tr" ? "yil" : locale === "zh-Hans" ? "年" : "years"} ({l(selfEmployed?.workExperience?.window)})</p>
              <p>{ui.netWorthMinimum}: CAD {selfEmployed?.netWorth?.minimumCAD?.toLocaleString("en-CA")}</p>
              <p>{ui.startupDepositOutside}: CAD {selfEmployed?.startUpDeposit?.outsideCMM_CAD?.toLocaleString("en-CA")}</p>
              <p>{ui.startupDepositWithin}: CAD {selfEmployed?.startUpDeposit?.withinCMM_CAD?.toLocaleString("en-CA")}</p>
              <p className="text-xs">{l(selfEmployed?.startUpDeposit?.CMM_meaning)}</p>
              <p className="font-semibold">{ui.regulatedProfessionProcess}:</p>
              <ul className="space-y-1">
                {(selfEmployed?.regulatedProfessionRequirement?.processSteps ?? []).map((step) => (
                  <li key={step}>- {l(step)}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ListChecks className="h-5 w-5 text-violet-600" />
                {ui.federalApplicationStageForms}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <p>{ui.checklistInvestors}: {data.federalApplicationStage?.documentChecklists?.investorsAndEntrepreneurs}</p>
              <p>{ui.checklistSelfEmployed}: {data.federalApplicationStage?.documentChecklists?.selfEmployedPersons}</p>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{ui.fillInPortal}</p>
                <ul className="mt-1 space-y-1">
                  {(data.federalApplicationStage?.fillInPortal ?? []).map((item) => (
                    <li key={item.form}>{item.form} - {l(item.name)}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{ui.uploadOnlyNoSignature}</p>
                <ul className="mt-1 space-y-1">
                  {(data.federalApplicationStage?.uploadOnly_noSignature ?? []).map((item) => (
                    <li key={item.form}>{item.form} - {l(item.name)}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <BriefcaseBusiness className="h-5 w-5 text-violet-600" />
                {ui.supportingDocsAfterApply}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{ui.conditionalFormsHandSigned}</p>
                <ul className="mt-1 space-y-1">
                  {(data.federalApplicationStage?.conditionalForms_handSigned ?? []).map((item) => (
                    <li key={item.form}>{item.form} - {l(item.name)}{item.condition ? ` (${l(item.condition)})` : ""}{item.note ? ` - ${l(item.note)}` : ""}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{ui.supportingDocuments}</p>
                <ul className="mt-1 space-y-1">
                  {(data.federalApplicationStage?.supportingDocuments ?? []).map((item) => (
                    <li key={item}>- {l(item)}</li>
                  ))}
                </ul>
              </div>
              <p>{ui.biometrics}: {l(data.afterApply?.biometrics?.ageRange)}, {l(data.afterApply?.biometrics?.deadline)}</p>
              <p>{ui.medicalExamRequired}: {data.afterApply?.medicalExam?.required ? ui.yes : ui.no} ({l(data.afterApply?.medicalExam?.appliesTo)})</p>
              <p>{ui.approved}: {l(data.afterApply?.decisionOutcomes?.approved)}</p>
              <p>{ui.refused}: {l(data.afterApply?.decisionOutcomes?.refused)}</p>
              <p>{ui.withdrawal}: {l(data.afterApply?.decisionOutcomes?.withdrawal)}</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
