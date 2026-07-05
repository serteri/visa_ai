import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, CircleDashed, ListChecks, WalletCards } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VisaPdfDownloadCard } from "@/components/visa-pdf-download-card";
import quebecData from "@/src/data/countries/ca/quebec-selected-skilled-workers.json";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

type PageProps = {
  params: Promise<{ locale: string }>;
};

type QuebecFederalData = {
  pathwayCovered?: string;
  pathwayCovered_tr?: string;
  pathwayCovered_zh?: string;
  lastVerified?: string;
  sourcePdfBlobUrl?: string;
  CRITICAL_STRUCTURAL_WARNING?: string;
  CRITICAL_STRUCTURAL_WARNING_tr?: string;
  CRITICAL_STRUCTURAL_WARNING_zh?: string;
  twoStageProcess?: {
    stage1_quebec?: {
      name?: string;
      authority?: string;
      status?: string;
      knownFacts?: string[];
    };
    stage2_federal_this_document?: {
      name?: string;
      authority?: string;
      prerequisite?: string;
      processingTime?: string;
      fee?: { currency?: string; from?: number; lastIncreaseDate?: string };
    };
  };
  twoStageProcess_tr?: {
    stage1_quebec?: {
      name?: string;
      authority?: string;
      status?: string;
      knownFacts?: string[];
    };
    stage2_federal_this_document?: {
      name?: string;
      authority?: string;
      prerequisite?: string;
      processingTime?: string;
      fee?: { currency?: string; from?: number; lastIncreaseDate?: string };
    };
  };
  twoStageProcess_zh?: {
    stage1_quebec?: {
      name?: string;
      authority?: string;
      status?: string;
      knownFacts?: string[];
    };
    stage2_federal_this_document?: {
      name?: string;
      authority?: string;
      prerequisite?: string;
      processingTime?: string;
      fee?: { currency?: string; from?: number; lastIncreaseDate?: string };
    };
  };
  eligibility?: string[];
  eligibility_tr?: string[];
  eligibility_zh?: string[];
  applicationProcess?: {
    mandatoryOnlineSince?: string;
    alternateFormatAvailable?: string[];
    portal?: string;
    instructionGuide?: string;
    quebecContactNote?: string;
  };
  documentsRequired?: {
    fillInPortal?: Array<{ form: string; name: string }>;
    downloadAndUpload_noSignatureNeeded?: Array<{ form: string; name: string; note?: string }>;
    conditionalForms_handSigned?: Array<{ form: string; name: string; condition?: string }>;
    representativeForms?: Array<{ form: string; name: string }>;
    photos?: string;
  };
  representativeRules?: {
    canDo?: string[];
    cannotDo?: string[];
    legalSignatureRule?: string;
  };
  fees?: {
    currency?: string;
    processingFeeFrom?: number;
    lastIncreaseDate?: string;
    components?: string[];
    note?: string;
  };
  afterApply?: {
    biometrics?: { ageRange?: string; deadline?: string; note?: string };
    medicalExam?: { appliesTo?: string; disqualifiers?: string[] };
    policeCertificates?: { rule?: string; differenceFromOtherPathways?: string };
    decisionCriteria?: string[];
    misrepresentationConsequence?: string;
    approvalOutcome?: string[];
    coprCannotBeExtended?: boolean;
  };
  missingDataFlags?: string[];
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title =
    locale === "tr"
      ? "Quebec secilmis nitelikli isciler (yalnizca federal asama) | LogiVisa"
      : locale === "zh-Hans"
        ? "魁北克技术工人（仅联邦阶段）| LogiVisa"
        : "Quebec-selected skilled workers (Federal stage only) | LogiVisa";
  const description =
    locale === "tr"
      ? "Bu sayfa sadece CSQ sonrasindaki federal IRCC asamasini kapsar. Quebec'in kendi secim sureci ayri yurur ve burada tam detayli degildir."
      : locale === "zh-Hans"
        ? "本页仅覆盖拿到 CSQ 之后的联邦 IRCC 阶段。魁北克本地筛选流程独立进行，本文未完整展开。"
        : "Federal IRCC stage only after CSQ for Quebec-selected skilled workers. Quebec CSQ selection stage is separate and not fully documented in this page.";
  return {
    metadataBase: new URL(BASE_URL),
    title,
    description,
    alternates: {
      canonical: `/${locale}/visas/canada-quebec-skilled-workers`,
      languages: {
        en: "/en/visas/canada-quebec-skilled-workers",
        tr: "/tr/visas/canada-quebec-skilled-workers",
        "zh-Hans": "/zh-Hans/visas/canada-quebec-skilled-workers",
      },
    },
  };
}

export default async function CanadaQuebecSkilledWorkersPage({ params }: PageProps) {
  const { locale } = await params;
  const localeSuffix = locale === "tr" ? "_tr" : locale === "zh-Hans" ? "_zh" : "";
  const localeKind = locale === "tr" ? "tr" : locale === "zh-Hans" ? "zh" : "en";
  const data = quebecData as QuebecFederalData;
  const trMap: Record<string, string> = {
    "Quebec-selected skilled workers - FEDERAL (IRCC) stage only": "Quebec seçilmiş nitelikli işçiler - yalnızca FEDERAL (IRCC) aşaması",
    "Quebec-selected skilled workers - Federal stage": "Quebec seçilmiş nitelikli işçiler - yalnızca FEDERAL (IRCC) aşaması",
    "What is missing (not documented yet)": "Eksik olanlar (henüz dokümante değil)",
    "Eligibility and Application": "Uygunluk ve Başvuru",
    Eligibility: "Uygunluk",
    "Application process": "Başvuru süreci",
    "Online mandatory since": "Zorunlu online başvuru tarihi",
    "Alternate formats": "Alternatif formatlar",
    Portal: "Portal",
    "Instruction guide": "Talimat rehberi",
    "Fees and After Apply": "Ücretler ve Başvuru Sonrası",
    "Federal fee from": "Federal ücret (en düşük)",
    "Last increase date": "Son artış tarihi",
    "Fee components": "Ücret bileşenleri",
    Biometrics: "Biyometri",
    "Medical exam applies to": "Sağlık muayenesi şunlara uygulanır",
    "Medical disqualifiers": "Sağlık nedeniyle uygunsuzluk sebepleri",
    "Decision criteria": "Karar kriterleri",
    "Approval outcome": "Onay sonucu",
    "COPR cannot be extended": "COPR uzatılamaz",
    Yes: "Evet",
    No: "Hayır",
    "Documents Required": "Gerekli Belgeler",
    "Fill in portal": "Portalde doldur",
    "Download and upload (no signature)": "İndir ve yükle (imza gerekmez)",
    "Conditional and Representative Forms": "Koşullu ve Temsilci Formları",
    "Conditional forms (hand-signed)": "Koşullu formlar (ıslak imza)",
    "Representative forms": "Temsilci formları",
    "Representatives can do": "Temsilciler şunları yapabilir",
    "Representatives cannot do": "Temsilciler şunları yapamaz",
    "As of 2018, MIFI no longer renews CSQs": "2018'den beri MIFI CSQ yenilemiyor",
    "A CSQ remains valid for federal application purposes until IRCC makes a decision, even if it has technically expired": "CSQ teknik olarak süresi dolmuş olsa bile IRCC karar verene kadar federal başvuru amacıyla geçerli kalır",
    "Quebec's own CSQ selection criteria / points grid (QSWP or its 2025 successor PSTQ)": "Quebec'in kendi CSQ seçim kriterleri / puan tablosu (QSWP veya 2025 halefi PSTQ)",
    "Arrima expression-of-interest portal process": "Arrima ilgi beyanı (EOI) portal süreci",
    "Quebec-side fees for CSQ application": "CSQ başvurusu için Quebec tarafı ücretleri",
    "Quebec-side processing time for CSQ": "CSQ için Quebec tarafı işlem süresi",
    "French-language requirement specifics for Quebec selection itself (distinct from any federal language test)": "Quebec'in kendi seçimi için Fransızca gereklilik detayları (federal dil testinden ayrı)",
    "To apply to Quebec for a CSQ, contact the MIFI office that processes applications from the applicant's country - this contact/process is NOT detailed in this document.": "CSQ için Quebec'e başvuruda, başvuru sahibinin ülkesinden sorumlu MIFI ofisiyle iletişime geçilmelidir - bu iletişim/süreç bu belgede detaylandırılmamıştır.",
    "These are FEDERAL fees only - does not include whatever Quebec charges for CSQ processing (not documented here).": "Bunlar SADECE FEDERAL ücretlerdir - Quebec'in CSQ işlemi için aldığı ücretleri içermez (burada dokümante edilmemiştir).",
    "Required for every PR application, even if previously given and still valid": "Daha önce verilmiş ve hâlâ geçerli olsa bile her PR başvurusu için gereklidir",
    "applicant + all family members, even non-accompanying": "başvuru sahibi + eş/partner + tüm aile bireyleri (eşlik etmeyenler dahil)",
    "danger to public health/safety": "kamu sağlığı/güvenliği açısından risk",
    "excessive demand on health/social services": "sağlık/sosyal hizmetlerde aşırı yük",
    "Must provide ADDITIONAL police certificates IF ASKED during processing": "İşlem sırasında TALEP EDİLİRSE ek polis sertifikaları sunulmalıdır",
    "Phrased conditionally ('if asked') rather than the upfront blanket rule seen in PNP/RCIP/FCIP - worth re-verifying directly with IRCC source if this is a genuine procedural difference or just a phrasing variation.": "Bu ifade koşulludur ('talep edilirse'); PNP/RCIP/FCIP'teki baştan zorunlu kuraldan farklıdır - bunun gerçek prosedür farkı mı yoksa yalnızca ifade farkı mı olduğunu IRCC kaynağından yeniden doğrulamak gerekir.",
    "program eligibility": "program uygunluğu",
    "proof of funds": "maddi yeterlilik kanıtı",
    "medical exam results": "sağlık muayenesi sonuçları",
    "police certificate information": "polis sertifikası bilgileri",
    "Refusal, inadmissibility finding, and/or 5-year bar from applying to come to Canada for any reason": "Ret, ülkeye kabul edilemezlik tespiti ve/veya Kanada'ya herhangi bir nedenle başvurmaya 5 yıl yasak",
    "Confirmation of Permanent Residence (COPR)": "Daimi Oturum Onayı (COPR)",
    "permanent resident visa (if applicant's country requires one)": "daimi oturum vizesi (başvuru sahibinin ülkesi gerektiriyorsa)",
    "One photo per person on the application, both sides scanned per portal instructions": "Başvurudaki kişi başına bir fotoğraf; portal talimatına göre ön/arka taranmış olmalı",
    "Generic Application Form for Canada": "Kanada Genel Başvuru Formu",
    "Schedule A - Background/Declaration": "Ek A - Geçmiş/Beyan",
    "Additional Family Information": "Ek Aile Bilgileri",
    "Supplementary Information - Your travels": "Ek Bilgi - Seyahatleriniz",
    "Document Checklist": "Belge Kontrol Listesi",
    "Economic Classes - Declaration of Intent to Reside in Quebec": "Ekonomik Sınıflar - Quebec'te Yaşama Niyeti Beyanı",
    "Distinguishing form for this pathway - explicit declaration of intent to live in Quebec specifically": "Bu yol için ayırt edici form - özellikle Quebec'te yaşama niyetinin açık beyanı",
    "Separation Declaration for Minors Travelling to Canada": "Kanada'ya Seyahat Eden Küçükler için Ayrılık Beyanı",
    "Statutory Declaration of Common-law Union": "Ortak Yaşam İlişkisi Yasal Beyanı",
    "Use of a Representative": "Temsilci Kullanımı",
    "Authority to Release Personal Information to a Designated Individual": "Belirlenmiş Bir Kişiye Kişisel Bilgi Açıklama Yetkisi",
    "If applicable": "Uygunsa",
    "give advice and help with application for a fee": "ücret karşılığında danışmanlık ve başvuru desteği verebilir",
    "prepare forms/documents": "form ve belgeleri hazırlayabilir",
    "answer questions about forms": "formlarla ilgili soruları yanıtlayabilir",
    "communicate with IRCC via their own account": "kendi hesapları üzerinden IRCC ile iletişim kurabilir",
    "open a portal account on applicant's behalf": "başvuru sahibi adına portal hesabı açamaz",
    "electronically sign the application": "başvuruyu elektronik olarak imzalayamaz",
    "log in using applicant's credentials": "başvuru sahibinin giriş bilgileriyle sisteme giremez",
    "Applicant must personally type their own name (exactly as shown on passport) after reading the declaration - legal definition of 'signed' under Canadian immigration law.": "Başvuru sahibi beyanı okuduktan sonra kendi adını bizzat yazmalıdır (pasaporttakiyle birebir). Kanada göç hukuku kapsamında bu, yasal 'imza' tanımıdır."
    ,"paper": "kağıt"
    ,"braille": "braille"
    ,"large print": "büyük puntolu baskı"
    ,"Permanent residence online application portal (PR Portal)": "Daimi oturum online başvuru portalı (PR Portal)"
    ,"processing_fee": "islem_ucreti"
    ,"right_of_permanent_residence_fee (RPRF)": "daimi_oturum_hakki_ucreti (RPRF)"
    ,"biometrics_fee": "biyometri_ucreti"
    ,"third_party_fees (medical exam, police certificates, ECA)": "ucuncu_taraf_ucretleri (saglik muayenesi, polis sertifikasi, ECA)"
    ,"14-79": "14-79"
    ,"30 days from instruction letter": "talimat mektubundan itibaren 30 gun"
  };
  const zhMap: Record<string, string> = {
    "Quebec-selected skilled workers - FEDERAL (IRCC) stage only": "魁北克技术工人——仅联邦（IRCC）阶段",
    "Quebec-selected skilled workers - Federal stage": "魁北克技术工人——仅联邦（IRCC）阶段",
    "What is missing (not documented yet)": "尚缺内容（尚未文档化）",
    "Eligibility and Application": "资格与申请",
    Eligibility: "资格",
    "Application process": "申请流程",
    "Online mandatory since": "强制线上申请起始时间",
    "Alternate formats": "可替代格式",
    Portal: "门户",
    "Instruction guide": "指导文件",
    "Fees and After Apply": "费用与提交后流程",
    "Federal fee from": "联邦费用起",
    "Last increase date": "最近涨价日期",
    "Fee components": "费用构成",
    Biometrics: "生物识别",
    "Medical exam applies to": "体检适用于",
    "Medical disqualifiers": "体检不通过原因",
    "Decision criteria": "审理标准",
    "Approval outcome": "获批结果",
    "COPR cannot be extended": "COPR 不可延期",
    Yes: "是",
    No: "否",
    "Documents Required": "所需文件",
    "Fill in portal": "在门户填写",
    "Download and upload (no signature)": "下载并上传（无需签字）",
    "Conditional and Representative Forms": "条件表格与代理表格",
    "Conditional forms (hand-signed)": "条件表格（手写签字）",
    "Representative forms": "代理表格",
    "Representatives can do": "代理可以",
    "Representatives cannot do": "代理不能",
    "As of 2018, MIFI no longer renews CSQs": "自 2018 年起，MIFI 不再续发 CSQ",
    "A CSQ remains valid for federal application purposes until IRCC makes a decision, even if it has technically expired": "即使 CSQ 技术上过期，在 IRCC 作出决定前，联邦申请用途上仍然有效",
    "Quebec's own CSQ selection criteria / points grid (QSWP or its 2025 successor PSTQ)": "魁北克本地 CSQ 甄选标准 / 积分表（QSWP 或其 2025 继任项目 PSTQ）",
    "Arrima expression-of-interest portal process": "Arrima 意向表达（EOI）门户流程",
    "Quebec-side fees for CSQ application": "CSQ 申请的魁北克端费用",
    "Quebec-side processing time for CSQ": "CSQ 的魁北克端处理时长",
    "French-language requirement specifics for Quebec selection itself (distinct from any federal language test)": "魁北克本地筛选的法语要求细节（不同于联邦语言考试）",
    "To apply to Quebec for a CSQ, contact the MIFI office that processes applications from the applicant's country - this contact/process is NOT detailed in this document.": "如需向魁北克申请 CSQ，请联系负责申请人所在国家案件的 MIFI 办公室 - 本文件不包含该联系/流程细节。",
    "These are FEDERAL fees only - does not include whatever Quebec charges for CSQ processing (not documented here).": "以上仅为联邦费用 - 不包含魁北克对 CSQ 处理收取的任何费用（此处未文档化）。",
    "Required for every PR application, even if previously given and still valid": "即使此前已采集且仍有效，每次 PR 申请仍需满足该要求",
    "applicant + all family members, even non-accompanying": "申请人 + 全部家庭成员（包括不随行成员）",
    "danger to public health/safety": "对公共健康/安全构成风险",
    "excessive demand on health/social services": "对医疗/社会服务造成过度负担",
    "Must provide ADDITIONAL police certificates IF ASKED during processing": "如在审理中被要求，必须补交额外无犯罪证明",
    "Phrased conditionally ('if asked') rather than the upfront blanket rule seen in PNP/RCIP/FCIP - worth re-verifying directly with IRCC source if this is a genuine procedural difference or just a phrasing variation.": "此处为条件表述（'如被要求'），不同于 PNP/RCIP/FCIP 中前置统一要求 - 建议直接对照 IRCC 原文，确认是流程差异还是措辞差异。",
    "program eligibility": "项目资格",
    "proof of funds": "资金证明",
    "medical exam results": "体检结果",
    "police certificate information": "无犯罪证明信息",
    "Refusal, inadmissibility finding, and/or 5-year bar from applying to come to Canada for any reason": "可能导致拒签、不可入境认定和/或 5 年内不得以任何理由申请赴加",
    "Confirmation of Permanent Residence (COPR)": "永久居留确认函（COPR）",
    "permanent resident visa (if applicant's country requires one)": "永久居民签证（如申请人所在国家需要）",
    "One photo per person on the application, both sides scanned per portal instructions": "申请中每人 1 张照片，按门户说明扫描正反面",
    "Generic Application Form for Canada": "加拿大通用申请表",
    "Schedule A - Background/Declaration": "附表 A - 背景/声明",
    "Additional Family Information": "补充家庭信息",
    "Supplementary Information - Your travels": "补充信息 - 您的旅行记录",
    "Document Checklist": "文件清单",
    "Economic Classes - Declaration of Intent to Reside in Quebec": "经济类 - 魁北克居住意向声明",
    "Distinguishing form for this pathway - explicit declaration of intent to live in Quebec specifically": "该路径区分性表格 - 明确声明将在魁北克居住",
    "Separation Declaration for Minors Travelling to Canada": "未成年人赴加分离声明",
    "Statutory Declaration of Common-law Union": "事实同居关系法定声明",
    "Use of a Representative": "使用代理人",
    "Authority to Release Personal Information to a Designated Individual": "向指定个人披露个人信息授权",
    "If applicable": "如适用",
    "give advice and help with application for a fee": "可收费提供咨询并协助申请",
    "prepare forms/documents": "可准备表格/文件",
    "answer questions about forms": "可回答表格相关问题",
    "communicate with IRCC via their own account": "可通过其自有账户与 IRCC 沟通",
    "open a portal account on applicant's behalf": "不得代申请人开设门户账户",
    "electronically sign the application": "不得代为电子签名",
    "log in using applicant's credentials": "不得使用申请人凭据登录",
    "Applicant must personally type their own name (exactly as shown on passport) after reading the declaration - legal definition of 'signed' under Canadian immigration law.": "申请人阅读声明后必须亲自输入姓名（与护照完全一致） - 这是加拿大移民法中“已签署”的法律定义。"
    ,"paper": "纸质"
    ,"braille": "盲文"
    ,"large print": "大字版"
    ,"Permanent residence online application portal (PR Portal)": "永久居留在线申请门户（PR Portal）"
    ,"processing_fee": "处理费"
    ,"right_of_permanent_residence_fee (RPRF)": "永久居留权利费（RPRF）"
    ,"biometrics_fee": "生物识别费"
    ,"third_party_fees (medical exam, police certificates, ECA)": "第三方费用（体检、无犯罪证明、ECA）"
    ,"14-79": "14-79"
    ,"30 days from instruction letter": "自通知信起 30 天"
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
    badgeStage2Federal: locale === "tr" ? "2/2 Asama - Yalnizca Federal" : locale === "zh-Hans" ? "第 2/2 阶段 - 仅联邦" : "Stage 2 of 2 - Federal only",
    criticalScope: locale === "tr" ? "Kritik kapsam uyarisi" : locale === "zh-Hans" ? "关键范围提醒" : "Critical scope warning",
    twoStageMap: locale === "tr" ? "Iki asamali surec haritasi" : locale === "zh-Hans" ? "两阶段流程图" : "Two-stage process map",
    stage1Quebec: locale === "tr" ? "Asama 1 (Quebec)" : locale === "zh-Hans" ? "第 1 阶段（魁北克）" : "Stage 1 (Quebec)",
    stage2Federal: locale === "tr" ? "Asama 2 (Federal IRCC)" : locale === "zh-Hans" ? "第 2 阶段（联邦 IRCC）" : "Stage 2 (Federal IRCC)",
    separateNotDetailed: locale === "tr" ? "Ayrı süreç, burada detaylandırılmaz." : locale === "zh-Hans" ? "独立流程，此页不展开。" : "Separate process, not detailed here.",
    detailedOnPage: locale === "tr" ? "Bu sayfada ayrintili aciklanir." : locale === "zh-Hans" ? "本页详细说明。" : "Detailed on this page.",
    federalProcessingTime: locale === "tr" ? "Federal islem suresi" : locale === "zh-Hans" ? "联邦处理时间" : "Federal processing time",
    federalFeeFrom: locale === "tr" ? "Federal ucret (en dusuk)" : locale === "zh-Hans" ? "联邦费用起" : "Federal fee from",
    lastVerified: locale === "tr" ? "Son dogrulama" : locale === "zh-Hans" ? "最近核验" : "Last verified",
    whatsMissing: locale === "tr" ? "Eksik olanlar (henüz dokümante değil)" : locale === "zh-Hans" ? "尚缺内容（尚未文档化）" : "What is missing (not documented yet)",
    pdfTitle: locale === "tr" ? "Quebec secilmis nitelikli isciler (yalnizca federal asama) - Resmi PDF" : locale === "zh-Hans" ? "魁北克技术工人（仅联邦阶段）- 官方 PDF" : "Quebec-selected skilled workers (Federal stage only) - Official PDF",
    pdfDescription: locale === "tr" ? "Bu PDF, CSQ sonrasi federal IRCC asamasini yansitir; Quebec'in kendi secim asamasi detaylarini icermez." : locale === "zh-Hans" ? "该 PDF 反映 CSQ 之后的联邦 IRCC 阶段，不包含魁北克本地筛选阶段细节。" : "This PDF reflects the federal IRCC stage after CSQ and does not include Quebec's own selection stage details.",
    eligibilityAndApplication: locale === "tr" ? "Uygunluk ve Başvuru" : locale === "zh-Hans" ? "资格与申请" : "Eligibility and Application",
    eligibility: locale === "tr" ? "Uygunluk" : locale === "zh-Hans" ? "资格" : "Eligibility",
    applicationProcess: locale === "tr" ? "Başvuru süreci" : locale === "zh-Hans" ? "申请流程" : "Application process",
    onlineMandatorySince: locale === "tr" ? "Zorunlu online başvuru tarihi" : locale === "zh-Hans" ? "强制线上申请起始时间" : "Online mandatory since",
    alternateFormats: locale === "tr" ? "Alternatif formatlar" : locale === "zh-Hans" ? "可替代格式" : "Alternate formats",
    portal: locale === "tr" ? "Portal" : locale === "zh-Hans" ? "门户" : "Portal",
    instructionGuide: locale === "tr" ? "Talimat rehberi" : locale === "zh-Hans" ? "指导文件" : "Instruction guide",
    feesAndAfterApply: locale === "tr" ? "Ücretler ve Başvuru Sonrası" : locale === "zh-Hans" ? "费用与提交后流程" : "Fees and After Apply",
    federalFeeLabel: locale === "tr" ? "Federal ücret (en düşük)" : locale === "zh-Hans" ? "联邦费用起" : "Federal fee from",
    lastIncreaseDate: locale === "tr" ? "Son artış tarihi" : locale === "zh-Hans" ? "最近涨价日期" : "Last increase date",
    feeComponents: locale === "tr" ? "Ücret bileşenleri" : locale === "zh-Hans" ? "费用构成" : "Fee components",
    biometrics: locale === "tr" ? "Biyometri" : locale === "zh-Hans" ? "生物识别" : "Biometrics",
    medicalAppliesTo: locale === "tr" ? "Sağlık muayenesi şunlara uygulanır" : locale === "zh-Hans" ? "体检适用于" : "Medical exam applies to",
    medicalDisqualifiers: locale === "tr" ? "Sağlık nedeniyle uygunsuzluk sebepleri" : locale === "zh-Hans" ? "体检不通过原因" : "Medical disqualifiers",
    decisionCriteria: locale === "tr" ? "Karar kriterleri" : locale === "zh-Hans" ? "审理标准" : "Decision criteria",
    approvalOutcome: locale === "tr" ? "Onay sonucu" : locale === "zh-Hans" ? "获批结果" : "Approval outcome",
    coprCannotBeExtended: locale === "tr" ? "COPR uzatılamaz" : locale === "zh-Hans" ? "COPR 不可延期" : "COPR cannot be extended",
    documentsRequired: locale === "tr" ? "Gerekli Belgeler" : locale === "zh-Hans" ? "所需文件" : "Documents Required",
    fillInPortal: locale === "tr" ? "Portalde doldur" : locale === "zh-Hans" ? "在门户填写" : "Fill in portal",
    downloadUploadNoSign: locale === "tr" ? "İndir ve yükle (imza gerekmez)" : locale === "zh-Hans" ? "下载并上传（无需签字）" : "Download and upload (no signature)",
    conditionalAndRepresentativeForms: locale === "tr" ? "Koşullu ve Temsilci Formları" : locale === "zh-Hans" ? "条件表格与代理表格" : "Conditional and Representative Forms",
    conditionalForms: locale === "tr" ? "Koşullu formlar (ıslak imza)" : locale === "zh-Hans" ? "条件表格（手写签字）" : "Conditional forms (hand-signed)",
    representativeForms: locale === "tr" ? "Temsilci formları" : locale === "zh-Hans" ? "代理表格" : "Representative forms",
    representativesCanDo: locale === "tr" ? "Temsilciler şunları yapabilir" : locale === "zh-Hans" ? "代理可以" : "Representatives can do",
    representativesCannotDo: locale === "tr" ? "Temsilciler şunları yapamaz" : locale === "zh-Hans" ? "代理不能" : "Representatives cannot do",
  };
  const localizedField = (base: string, fallback?: string) => {
    if (!localeSuffix) {
      return fallback ?? ((data as Record<string, unknown>)[base] as string | undefined) ?? "";
    }
    const source = data as Record<string, unknown>;
    const key = `${base}${localeSuffix}`;
    const value = (source[key] as string | undefined) ?? fallback ?? (source[base] as string | undefined);
    return value ?? fallback ?? "";
  };
  const t = {
    criticalWarningBody: localeKind === "tr"
      ? "Bu dosya Kanada'nın diğer pathway dosyalarından (Express Entry, PNP, AIP, RCIP/FCIP) köklü biçimde farklı bir uyarı taşır: BU SADECE İKİ AŞAMALI SÜRECİN İKİNCİ (federal/IRCC) AŞAMASIDIR. Quebec'in kendi seçim süreci (Certificat de selection du Quebec - CSQ alma; kendi puan tablosu - CRS değil; kendi portalı - Arrima; muhtemelen kendi ücretleri ve işlem süresi) BU DOSYADA YOK ve henüz araştırılmadı/JSON'a dökülmedi. Bu sayfayı 'Quebec'e göç etmenin tam süreci' gibi sunmak YANLIŞ olur; kullanıcı önce Quebec'ten CSQ almak zorunda, bu federal 11 ay/$1,590 aşaması ise CSQ alındıktan SONRA başlıyor. Quebec'in kendi tarafı (QSWP/PSTQ, Arrima) tamamen ayrı ve ayrıca ele alınması gereken bir araştırma/entegrasyon işidir."
      : localeKind === "zh"
        ? "此文件与加拿大其他路径文件（Express Entry、PNP、AIP、RCIP/FCIP）有根本不同的警告：这只是两阶段流程中的第二阶段（联邦阶段/IRCC）。魁北克自己的筛选流程（获取 Certificat de selection du Quebec - CSQ；自己的积分体系——不是 CRS；自己的门户——Arrima；以及可能不同的费用与处理时间）不在本文件中，且尚未研究/结构化入 JSON。把本页当作“移民魁北克的完整流程”是错误的：用户必须先获得魁北克 CSQ，之后才进入这里的联邦 11 个月/$1,590 阶段。魁北克端（QSWP/PSTQ、Arrima）是完全独立、尚待单独集成的工作。"
        : "This page covers the federal processing stage only, after you already hold a Quebec Selection Certificate (CSQ). Quebec's own selection process (Arrima, Quebec points logic, Quebec-side fees/timelines) is not covered in detail here yet.",
    pathwayCovered: localeKind === "tr"
      ? "Quebec seçilmiş nitelikli işçiler - yalnızca FEDERAL (IRCC) aşaması"
      : localeKind === "zh"
        ? "魁北克技术工人——仅联邦（IRCC）阶段"
        : "Quebec-selected skilled workers - Federal stage",
    stage1Name: localeKind === "tr"
      ? "Quebec Seçimi (Certificat de selection du Quebec - CSQ)"
      : localeKind === "zh"
        ? "魁北克筛选阶段（Certificat de selection du Quebec - CSQ）"
        : "Quebec Selection (Certificat de selection du Quebec - CSQ)",
    stage2Name: localeKind === "tr"
      ? "Federal Daimi Oturum Başvurusu (IRCC)"
      : localeKind === "zh"
        ? "联邦永久居留申请阶段（IRCC）"
        : "Federal Permanent Residence Application (IRCC)",
  };
  const localizedTwoStage = locale === "tr"
    ? data.twoStageProcess_tr
    : locale === "zh-Hans"
      ? data.twoStageProcess_zh
      : data.twoStageProcess;
  const localizedEligibility = locale === "tr"
    ? (data.eligibility_tr ?? data.eligibility ?? [])
    : locale === "zh-Hans"
      ? (data.eligibility_zh ?? data.eligibility ?? [])
      : (data.eligibility ?? []);

  const feeText = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: data.fees?.currency ?? "CAD",
    maximumFractionDigits: 0,
  }).format(data.fees?.processingFeeFrom ?? 1590);

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
          <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-100">{ui.badgeStage2Federal}</Badge>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900 dark:border-amber-600/30 dark:bg-amber-950/20 dark:text-amber-100">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">{ui.criticalScope}</p>
              <p className="mt-1 text-sm leading-6">
                {localizedField(
                  "CRITICAL_STRUCTURAL_WARNING",
                  t.criticalWarningBody
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="space-y-6 p-6 sm:p-8">
              <div className="space-y-3">
                <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                  {localizedField("pathwayCovered", t.pathwayCovered)}
                </h1>
                <p className="max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
                  {localizedField("pathwayCovered", t.pathwayCovered)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">{ui.twoStageMap}</p>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                  <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{ui.stage1Quebec}</p>
                    <p className="mt-1 font-semibold text-slate-900 dark:text-white">{localizedTwoStage?.stage1_quebec?.name ?? t.stage1Name}</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{ui.separateNotDetailed}</p>
                  </div>
                  <div className="flex justify-center text-slate-400">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-600/30 dark:bg-emerald-950/20">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-200">{ui.stage2Federal}</p>
                    <p className="mt-1 font-semibold text-emerald-900 dark:text-emerald-100">{localizedTwoStage?.stage2_federal_this_document?.name ?? t.stage2Name}</p>
                    <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">{ui.detailedOnPage}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{ui.federalProcessingTime}</p>
                  <p className="mt-2 text-xl font-bold text-slate-950 dark:text-white">{localizedTwoStage?.stage2_federal_this_document?.processingTime}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{ui.federalFeeFrom}</p>
                  <p className="mt-2 text-xl font-bold text-slate-950 dark:text-white">{feeText}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{ui.lastVerified}</p>
                  <p className="mt-2 text-xl font-bold text-slate-950 dark:text-white">{data.lastVerified}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href={`/${locale}/full-check`}>
                  <Button className="bg-emerald-600 text-white hover:bg-emerald-700">
                    <span>{ui.check}</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-xl">{ui.whatsMissing}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
              {(data.missingDataFlags ?? []).map((flag) => (
                <p key={flag} className="flex gap-2">
                  <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <span>{l(flag)}</span>
                </p>
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
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ListChecks className="h-5 w-5 text-emerald-600" />
                {ui.eligibilityAndApplication}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{ui.eligibility}</p>
                <ul className="mt-2 space-y-1">
                  {localizedEligibility.map((item) => (
                    <li key={item} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{ui.applicationProcess}</p>
                <p className="mt-1">{ui.onlineMandatorySince}: {data.applicationProcess?.mandatoryOnlineSince}</p>
                <p>{ui.alternateFormats}: {(data.applicationProcess?.alternateFormatAvailable ?? []).map((item) => l(item)).join(", ")}</p>
                <p>{ui.portal}: {l(data.applicationProcess?.portal)}</p>
                <p>{ui.instructionGuide}: {data.applicationProcess?.instructionGuide}</p>
                <p className="mt-1 text-amber-800 dark:text-amber-300">{l(data.applicationProcess?.quebecContactNote)}</p>
              </div>
              {localizedTwoStage?.stage1_quebec?.knownFacts?.length ? (
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{ui.stage1Quebec}</p>
                  <ul className="mt-2 space-y-1">
                    {localizedTwoStage.stage1_quebec.knownFacts.map((item) => (
                      <li key={item} className="flex gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{l(item)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <WalletCards className="h-5 w-5 text-emerald-600" />
                {ui.feesAndAfterApply}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <p>{ui.federalFeeLabel}: <span className="font-semibold">{feeText}</span></p>
              <p>{ui.lastIncreaseDate}: <span className="font-semibold">{data.fees?.lastIncreaseDate}</span></p>
              <p>{ui.feeComponents}: {(data.fees?.components ?? []).map((item) => l(item)).join(", ")}</p>
              <p className="text-amber-800 dark:text-amber-300">{l(data.fees?.note)}</p>
              <p>{ui.biometrics}: {data.afterApply?.biometrics?.ageRange}, {l(data.afterApply?.biometrics?.deadline)}</p>
              <p>{l(data.afterApply?.biometrics?.note)}</p>
              <p>{ui.medicalAppliesTo}: {l(data.afterApply?.medicalExam?.appliesTo)}</p>
              <p>{ui.medicalDisqualifiers}: {(data.afterApply?.medicalExam?.disqualifiers ?? []).map((item) => l(item)).join("; ")}</p>
              <p>{l(data.afterApply?.policeCertificates?.rule)}</p>
              <p>{l(data.afterApply?.policeCertificates?.differenceFromOtherPathways)}</p>
              <p>{ui.decisionCriteria}: {(data.afterApply?.decisionCriteria ?? []).map((item) => l(item)).join(", ")}</p>
              <p>{l(data.afterApply?.misrepresentationConsequence)}</p>
              <p>{ui.approvalOutcome}: {(data.afterApply?.approvalOutcome ?? []).map((item) => l(item)).join(", ")}</p>
              <p>{ui.coprCannotBeExtended}: {data.afterApply?.coprCannotBeExtended ? l("Yes") : l("No")}</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle>{ui.documentsRequired}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{ui.fillInPortal}</p>
                <ul className="mt-1 space-y-1">
                  {(data.documentsRequired?.fillInPortal ?? []).map((item) => (
                    <li key={item.form}>{item.form} - {l(item.name)}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{ui.downloadUploadNoSign}</p>
                <ul className="mt-1 space-y-1">
                  {(data.documentsRequired?.downloadAndUpload_noSignatureNeeded ?? []).map((item) => (
                    <li key={item.form}>{item.form} - {l(item.name)}{item.note ? ` (${l(item.note)})` : ""}</li>
                  ))}
                </ul>
              </div>
              <p>{l(data.documentsRequired?.photos)}</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle>{ui.conditionalAndRepresentativeForms}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{ui.conditionalForms}</p>
                <ul className="mt-1 space-y-1">
                  {(data.documentsRequired?.conditionalForms_handSigned ?? []).map((item) => (
                    <li key={item.form}>{item.form} - {l(item.name)}{item.condition ? ` (${l(item.condition)})` : ""}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{ui.representativeForms}</p>
                <ul className="mt-1 space-y-1">
                  {(data.documentsRequired?.representativeForms ?? []).map((item) => (
                    <li key={item.form}>{item.form} - {l(item.name)}</li>
                  ))}
                </ul>
              </div>
              <p className="font-semibold text-slate-900 dark:text-white">{ui.representativesCanDo}</p>
              <ul className="space-y-1">
                {(data.representativeRules?.canDo ?? []).map((item) => (
                  <li key={item}>{l(item)}</li>
                ))}
              </ul>
              <p className="font-semibold text-slate-900 dark:text-white">{ui.representativesCannotDo}</p>
              <ul className="space-y-1">
                {(data.representativeRules?.cannotDo ?? []).map((item) => (
                  <li key={item}>{l(item)}</li>
                ))}
              </ul>
              <p className="text-amber-800 dark:text-amber-300">{l(data.representativeRules?.legalSignatureRule)}</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
