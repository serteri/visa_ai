import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  ExternalLink,
  Globe2,
  HeartPulse,
  ListChecks,
  Sparkles,
  Stethoscope,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VisaPdfDownloadCard } from "@/components/visa-pdf-download-card";
import physicianData from "@/src/data/countries/ca/occupation-overlays/physician.json";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

type PageProps = {
  params: Promise<{ locale: string }>;
};

type PhysicianData = {
  sourceUrl?: string;
  sourcePdfBlobUrl?: string;
  lastVerified?: string;
  occupationOverlay?: string;
  occupationOverlay_tr?: string;
  occupationOverlay_zh?: string;
  structuralNote?: string;
  structuralNote_tr?: string;
  structuralNote_zh?: string;
  newFor2026?: string[];
  sectorStatistics?: {
    internationallyTrainedFamilyPhysiciansPercent2024?: number;
    immigrantHealthcareWorkersRatio?: string;
    healthcareWorkersArrived2024ViaEconomicPrograms?: string;
  };
  applicantTracks?: {
    hasCanadianMDExperience?: { description?: string; availablePathways?: string[] };
    noCanadianMDExperienceYet?: { description?: string; availablePathways?: string[]; prerequisite?: string };
  };
  immigrationPathways?: Array<{
    id: string;
    name: string;
    eligibility?: string[];
    processSteps?: string[];
    reservedSpaces?: number;
    expeditedWorkPermitDays?: number;
  }>;
  medicalLicensingPathway?: {
    note?: string;
    note_tr?: string;
    note_zh?: string;
    framework?: { name?: string; components?: Record<string, string> };
    centralPortal?: { name?: string; services?: string[]; specialNote?: string };
    exams?: {
      MCCQE?: { fullName?: string; format?: string; deliveredIn?: string; attemptLimit?: { max?: number; rule?: string } };
      NAC?: { fullName?: string; purpose?: string; orderFlexibility?: string };
    };
    postLicensureSteps?: string[];
    languageRequirements?: {
      generalRule?: string;
      englishTests?: Record<string, string>;
      frenchTestQuebec?: string;
      validityWindow?: string;
      possibleExemption?: string;
    };
    keyDeadlineExample?: { context?: string; deadline?: string; requirement?: string };
    regulatoryAuthorities?: string[];
  };
  foreignCredentialRecognition?: {
    process?: string;
    tool?: string;
    supportServices?: string[];
    otherNewcomerServices?: string[];
  };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = locale === "tr"
    ? "Kanada'da doktor olarak yasa ve calis | LogiVisa"
    : locale === "zh-Hans"
      ? "在加拿大以医生身份生活和工作 | LogiVisa"
      : "Live and work as a medical doctor in Canada | LogiVisa";
  const description = locale === "tr"
    ? "Doktor odakli Kanada yolu: 2026 Express Entry physician category, PNP kontenjanlari ve MCC ile eyalet duzenleyicilerinden ayri tibbi lisanslama adimlari."
    : locale === "zh-Hans"
      ? "医生专属加拿大路径：2026 年医生专项快速通道、PNP 保留名额，以及通过 MCC 与各省监管机构完成的独立执照流程。"
      : "Physician-focused Canada pathway: 2026 Express Entry physician category, PNP reserved spaces, and separate medical licensing steps through MCC and provincial regulators.";

  return {
    metadataBase: new URL(BASE_URL),
    title,
    description,
    alternates: {
      canonical: `/${locale}/visas/canada-medical-doctor`,
      languages: {
        en: "/en/visas/canada-medical-doctor",
        tr: "/tr/visas/canada-medical-doctor",
        "zh-Hans": "/zh-Hans/visas/canada-medical-doctor",
      },
    },
  };
}

function pathLabel(pathwayId: string) {
  return pathwayId
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function CanadaMedicalDoctorPage({ params }: PageProps) {
  const { locale } = await params;
  const localeSuffix = locale === "tr" ? "_tr" : locale === "zh-Hans" ? "_zh" : "";

  const data = physicianData as PhysicianData;
  const ui = {
    back: locale === "tr" ? "Kanada vizelerine dön" : locale === "zh-Hans" ? "返回加拿大签证" : "Back to Canada visas",
    overlay: locale === "tr" ? "Meslek Overlay" : locale === "zh-Hans" ? "职业 Overlay" : "Occupation Overlay",
    check: locale === "tr" ? "Uygunlugunu kontrol et" : locale === "zh-Hans" ? "检查你的资格" : "Check your eligibility",
    openSource: locale === "tr" ? "Resmi kaynagi ac" : locale === "zh-Hans" ? "打开官方来源" : "Open official source",
    quickSummary: locale === "tr" ? "Hizli Ozet" : locale === "zh-Hans" ? "快速摘要" : "Quick Summary",
    openPdf: locale === "tr" ? "PDF Ac" : locale === "zh-Hans" ? "打开 PDF" : "Open PDF",
    officialPage: locale === "tr" ? "Resmi site" : locale === "zh-Hans" ? "官方页面" : "Official page",
    immigrationPathways: locale === "tr" ? "Gocmenlik Pathway'leri" : locale === "zh-Hans" ? "移民路径" : "Immigration Pathways",
    processSteps: locale === "tr" ? "Süreç adımı" : locale === "zh-Hans" ? "流程步骤" : "Process steps",
    licensing: locale === "tr" ? "Tibbi Lisanslama" : locale === "zh-Hans" ? "医疗执照路径" : "Medical Licensing Pathway",
    badgeTitle: locale === "tr" ? "Doktor / Hekim" : locale === "zh-Hans" ? "医生 / 医师" : "Medical Doctor / Physician",
    pageTitle: locale === "tr" ? "Kanada'da doktor olarak yasa ve calis" : locale === "zh-Hans" ? "在加拿大以医生身份生活和工作" : "Live and work as a medical doctor in Canada",
    lastVerified: locale === "tr" ? "Son dogrulama" : locale === "zh-Hans" ? "最近核验" : "Last verified",
    intlTrainedPhysicians: locale === "tr" ? "Uluslararasi egitimli aile hekimleri (2024)" : locale === "zh-Hans" ? "国际培训家庭医生（2024）" : "Internationally trained family physicians (2024)",
    immigrantHealthcareRatio: locale === "tr" ? "Gocmen saglik calisani orani" : locale === "zh-Hans" ? "移民医疗工作者占比" : "Immigrant healthcare workers ratio",
    arrivalsViaEconomic: locale === "tr" ? "Ekonomik programlarla gelen saglik calisanlari (2024)" : locale === "zh-Hans" ? "通过经济项目到达的医疗工作者（2024）" : "Healthcare workers arrived via economic programs (2024)",
    pdfTitle: locale === "tr" ? "Kanada'da doktor olarak yasa ve calis (Resmi PDF)" : locale === "zh-Hans" ? "在加拿大以医生身份生活和工作（官方 PDF）" : "Live and work as a medical doctor in Canada (Official PDF)",
    pdfDesc: locale === "tr" ? "IRCC doktor rehberinin Vercel Blob uzerindeki resmi anlik goruntusu." : locale === "zh-Hans" ? "IRCC 医生指南在 Vercel Blob 上的官方快照。" : "Official IRCC physician guide snapshot stored on Vercel Blob for public access.",
    examsDeadlines: locale === "tr" ? "Sinavlar ve Son Tarihler" : locale === "zh-Hans" ? "考试与截止日期" : "Exams and Deadlines",
    languageRegistration: locale === "tr" ? "Dil ve Kayit" : locale === "zh-Hans" ? "语言与注册" : "Language and Registration",
    englishTests: locale === "tr" ? "Ingilizce sinavlari" : locale === "zh-Hans" ? "英语考试" : "English tests",
    postLicensureSteps: locale === "tr" ? "Lisans sonrasi adimlar" : locale === "zh-Hans" ? "执照后步骤" : "Post-licensure steps",
    applicantTracks: locale === "tr" ? "Basvuru Sahibi Izlekleri" : locale === "zh-Hans" ? "申请人路径" : "Applicant Tracks",
    withCanadianMdExp: locale === "tr" ? "Kanada MD deneyimi olan" : locale === "zh-Hans" ? "有加拿大 MD 经验" : "With Canadian MD experience",
    noCanadianMdExp: locale === "tr" ? "Henuz Kanada MD deneyimi olmayan" : locale === "zh-Hans" ? "暂无加拿大 MD 经验" : "No Canadian MD experience yet",
    credentialSupport: locale === "tr" ? "Denklik ve Destek" : locale === "zh-Hans" ? "资历认证与支持" : "Credential Recognition and Support",
    supportServices: locale === "tr" ? "Destek hizmetleri" : locale === "zh-Hans" ? "支持服务" : "Support services",
    newcomerServices: locale === "tr" ? "Yeni gelen hizmetleri" : locale === "zh-Hans" ? "新移民服务" : "Newcomer services",
    maxAttempts: locale === "tr" ? "Maks deneme" : locale === "zh-Hans" ? "最多尝试次数" : "Max attempts",
  };
  const trMap: Record<string, string> = {
    "Express Entry - Physician Category (New 2026)": "Express Entry - Doktor Kategorisi (Yeni 2026)",
    "Eligible for 1 of the 3 Express Entry programs (CEC/FSW/FSTP)": "3 Express Entry programindan birine uygun olmali (CEC/FSW/FSTP)",
    "At least 1 year full-time Canadian MD work experience in the last 3 years": "Son 3 yil icinde en az 1 yil tam zamanli Kanada doktorluk is deneyimi",
    "Provincial Nominee Program (physician-reserved spaces)": "Eyalet Aday Programi (doktorlara ayrilan kontenjan)",
    "Has a job, job offer, or letter of support to work as MD in a province/territory": "Bir eyalet/bolgede doktor olarak calismak icin is, is teklifi veya destek mektubuna sahip",
    "Atlantic Immigration Program (AIP)": "Atlantik Goc Programi (AIP)",
    "Work experience OR post-secondary education completed in Atlantic Canada": "Atlantik Kanada'da is deneyimi VEYA lise sonrasi egitimi tamamlama",
    "Job offer from a designated employer": "Yetkili bir isverenden is teklifi",
    "Interested in living in Atlantic Canada": "Atlantik Kanada'da yasamaya istekli",
    "Rural Community Immigration Pilot (RCIP)": "Kirsal Topluluk Goc Pilotu (RCIP)",
    "1+ year MD work experience in last 3 years, OR graduated from an eligible post-secondary school": "Son 3 yilda 1+ yil doktorluk deneyimi VEYA uygun bir lise sonrasi okuldan mezuniyet",
    "Interested in living in a smaller, rural community": "Daha kucuk, kirsal bir toplulukta yasamaya istekli",
    "Francophone Community Immigration Pilot (FCIP)": "Frankofon Topluluk Goc Pilotu (FCIP)",
    "Able to communicate in French": "Fransizca iletisim kurabilme",
    "Interested in living in a Francophone community outside Quebec": "Quebec disinda bir Frankofon toplulukta yasamaya istekli",
    "Immigration - valid status (work permit/PR/citizenship) required for CaRMS and some PRA routes": "Gocmenlik - CaRMS ve bazi PRA yollari icin gecerli statu (calisma izni/PR/vatandaslik) gerekir",
    "Medical licensing - physiciansapply.ca account, MCCQE, NAC Exam, provincial/territorial pathway": "Tibbi lisanslama - physiciansapply.ca hesabi, MCCQE, NAC Sinavi, eyalet/bolge yolu",
    "Gap or currency of practice - prolonged interruption makes eligibility harder; full-time med school/accredited residency/accredited internship/clinical fellowship with patient care generally NOT considered a gap; clinical research without active license, volunteer roles, medical assistant roles ARE considered gaps": "Uygulama boslugu veya guncellik - uzun ara vermek uygunlugu zorlastirir; tam zamanli tip fakultesi/akredite asistanlik/akredite staj/hasta bakimi iceren klinik fellowship genelde bosluk sayilmaz; aktif lisans olmadan klinik arastirma, gonullu roller ve tibbi asistan rolleri bosluk sayilir",
    "Language requirements - see languageRequirements below": "Dil gereklilikleri - asagidaki languageRequirements bolumune bakin",
    "Source verification of medical credentials": "Tibbi yeterlilik belgelerinin kaynak dogrulamasi",
    "Apply for MCCQE and NAC Examination": "MCCQE ve NAC Sinavi icin basvuru",
    "View/share documents and exam results (File Transfer Service for non-registered orgs)": "Belgeleri ve sinav sonuclarini goruntule/paylas (kayitli olmayan kurumlar icin File Transfer Service)",
    "Request ECA report (needed for e.g. Federal Skilled Worker Program)": "ECA raporu talep et (ornegin Federal Skilled Worker Program icin gerekir)",
    "Apply for LMCC": "LMCC icin basvur",
    "Apply for medical registration with MRAs": "MRA'lar uzerinden tibbi kayit basvurusu yap",
    "Medical Council of Canada Qualifying Examination": "Kanada Tip Konseyi Yeterlilik Sinavi",
    "One-day, computer-based, 230 MCQs in 2 sections of 115 items, up to 2h40m per section": "Tek gunluk, bilgisayar tabanli; 2 bolumde (115'er soru) toplam 230 coktan secmeli soru, bolum basi en fazla 2s40dk",
    "Canada + 70+ countries, 4 sessions/year, Prometric test centres, first-come-first-served": "Kanada + 70+ ulkede, yilda 4 oturum, Prometric sinav merkezleri, ilk gelen alir",
    "National Assessment Collaboration Examination": "Ulusal Degerlendirme Is Birligi Sinavi",
    "Assesses IMG readiness to enter supervised training in Canada; required for CaRMS entry and as screening tool for some provincial PRA programs": "IMG adayinin Kanada'da denetimli egitime hazirligini degerlendirir; CaRMS girisi icin gereklidir ve bazi eyalet PRA programlarinda eleme araci olarak kullanilir",
    "Can be taken before or after MCCQE, candidate's choice (for 2027 CaRMS R-1 applicants)": "MCCQE'den once veya sonra alinabilir, aday secer (2027 CaRMS R-1 basvuranlari icin)",
    "2027 CaRMS R-1 Main Residency Match": "2027 CaRMS R-1 Ana Asistanlik Eslestirmesi",
    "Submit MCCQE application + required documents by this date to obtain Identity Validity Period (IVP) before file review opens 2026-11-26": "Dosya incelemesi 2026-11-26'da acilmadan once Identity Validity Period (IVP) almak icin bu tarihe kadar MCCQE basvurusu ve gerekli belgeleri gonderin",
    "English required in most provinces; New Brunswick accepts English OR French; Quebec requires French": "Cogu eyalette Ingilizce gerekir; New Brunswick Ingilizce VEYA Fransizca kabul eder; Quebec Fransizca ister",
    "Pass result on OQLF (Office quebecois de la langue francaise) examination": "OQLF (Office quebecois de la langue francaise) sinavinda basarili sonuc",
    "Test result must be within 24 months of application to provincial/territorial program": "Sinav sonucu, eyalet/bolge programina basvurudan onceki 24 ay icinde olmalidir",
    "If undergraduate/postgraduate training completed in an English- or French-speaking country, or majority of education/patient care was in English/French - exemption decided per program": "Lisans/lisansustu egitim Ingilizce veya Fransizca konusulan bir ulkede tamamlaniyorsa ya da egitim/hasta bakiminin cogunlugu Ingilizce/Fransizca ise muafiyet program bazinda belirlenir",
    "Apply for LMCC (Licentiate of the Medical Council of Canada) - part of the Canadian Standard": "LMCC (Kanada Tip Konseyi Lisansi) icin basvurun - Kanada standardinin bir parcasi",
    "Apply for specialty certificate with RCPSC, CFPC, or CMQ": "RCPSC, CFPC veya CMQ ile uzmanlik sertifikasi icin basvurun",
    "Apply for medical registration with the MRA of the province/territory of intended practice (via physiciansapply.ca for most MRAs)": "Hedeflenen eyalet/bolgenin MRA kurumuna tibbi kayit icin basvurun (cogu MRA icin physiciansapply.ca uzerinden)",
    "At least 1 year full-time MD work experience in Canada within the last 3 years": "Son 3 yil icinde Kanada'da en az 1 yil tam zamanli doktorluk deneyimi",
    "Internationally-trained, no Canadian clinical MD experience yet (or Canadian experience is older than 3 years)": "Uluslararasi egitimli, henuz Kanada klinik doktorluk deneyimi yok (veya Kanada deneyimi 3 yildan eski)",
    "Must still get foreign credentials assessed and licensed by a provincial/territorial regulatory authority": "Yabanci yeterlilikler yine de bir eyalet/bolge duzenleyici kurumu tarafindan degerlendirilmeli ve lisanslanmalidir",
    "Verifies foreign education/training/experience equivalence to Canadian standards for the profession/trade in the province/territory of intended practice; varies by occupation and jurisdiction.": "Yabanci egitim/egitim deneyimi/mesleki deneyimin, hedef eyalet/bolgede ilgili meslek/uzmanlik icin Kanada standartlarina esdegerligini dogrular; meslek ve bolgeye gore degisir.",
    "Foreign Credential Recognition Tool - checks if an occupation is regulated/compulsory in a given province/territory and finds the relevant regulatory authority.": "Foreign Credential Recognition Tool - bir meslegin belirli bir eyalet/bolgede duzenlenmis/zorunlu olup olmadigini kontrol eder ve ilgili duzenleyici kurumu bulur.",
    "career counseling and planning": "kariyer danismanligi ve planlama",
    mentorship: "mentorluk",
    "job readiness workshops": "ise hazirlik atolyeleri",
    "job search assistance": "is arama destegi",
    "Pre-arrival services (for approved PR applicants still outside Canada)": "Varis oncesi hizmetler (Kanada disinda olan onayli PR basvuranlari icin)",
    "Newcomer/settlement services (post-arrival)": "Yeni gelen/yerlesim hizmetleri (varis sonrasi)",
    "Job Bank (free government job-search resource)": "Job Bank (ucretsiz devlet is arama kaynagi)",
    "Express Entry Physician Category": "Express Entry Doktor Kategorisi",
    Pnp: "PNP",
    "Express Entry General": "Express Entry Genel",
    "Atlantic Immigration Program": "Atlantik Goc Programi",
    "Rural Community Immigration Pilot": "Kirsal Topluluk Goc Pilotu",
    "Francophone Community Immigration Pilot": "Frankofon Topluluk Goc Pilotu"
  };
  const zhMap: Record<string, string> = {
    "Express Entry - Physician Category (New 2026)": "快速通道 - 医生类别（2026 新增）",
    "Eligible for 1 of the 3 Express Entry programs (CEC/FSW/FSTP)": "符合 3 个快速通道项目之一资格（CEC/FSW/FSTP）",
    "At least 1 year full-time Canadian MD work experience in the last 3 years": "近 3 年内至少 1 年加拿大全职医生工作经验",
    "Provincial Nominee Program (physician-reserved spaces)": "省提名计划（医生预留名额）",
    "Has a job, job offer, or letter of support to work as MD in a province/territory": "在某省/地区从事医生工作，已具备在职岗位、工作邀约或支持信",
    "Atlantic Immigration Program (AIP)": "大西洋移民计划（AIP）",
    "Work experience OR post-secondary education completed in Atlantic Canada": "具备工作经验，或在加拿大大西洋地区完成高等教育",
    "Job offer from a designated employer": "来自指定雇主的工作邀约",
    "Interested in living in Atlantic Canada": "有意在加拿大大西洋地区居住",
    "Rural Community Immigration Pilot (RCIP)": "农村社区移民试点（RCIP）",
    "1+ year MD work experience in last 3 years, OR graduated from an eligible post-secondary school": "近 3 年内有 1 年以上医生工作经验，或毕业于符合条件的高等院校",
    "Interested in living in a smaller, rural community": "有意在较小的农村社区居住",
    "Francophone Community Immigration Pilot (FCIP)": "法语社区移民试点（FCIP）",
    "Able to communicate in French": "具备法语沟通能力",
    "Interested in living in a Francophone community outside Quebec": "有意在魁北克以外的法语社区居住",
    "Immigration - valid status (work permit/PR/citizenship) required for CaRMS and some PRA routes": "移民 - CaRMS 及部分 PRA 路径要求有效身份（工签/PR/公民身份）",
    "Medical licensing - physiciansapply.ca account, MCCQE, NAC Exam, provincial/territorial pathway": "医疗执照 - physiciansapply.ca 账户、MCCQE、NAC 考试、省/地区路径",
    "Gap or currency of practice - prolonged interruption makes eligibility harder; full-time med school/accredited residency/accredited internship/clinical fellowship with patient care generally NOT considered a gap; clinical research without active license, volunteer roles, medical assistant roles ARE considered gaps": "执业间断或时效 - 长期中断会降低资格；全日制医学院/认证住院医培训/认证实习/含患者照护的临床进修通常不视为间断；无有效执照的临床研究、志愿岗位、医疗助理岗位则视为间断",
    "Language requirements - see languageRequirements below": "语言要求 - 见下方 languageRequirements",
    "Source verification of medical credentials": "医学资历原始验证",
    "Apply for MCCQE and NAC Examination": "申请 MCCQE 与 NAC 考试",
    "View/share documents and exam results (File Transfer Service for non-registered orgs)": "查看/共享文件与考试结果（面向未注册机构的文件传输服务）",
    "Request ECA report (needed for e.g. Federal Skilled Worker Program)": "申请 ECA 报告（如联邦技术工人项目所需）",
    "Apply for LMCC": "申请 LMCC",
    "Apply for medical registration with MRAs": "向 MRA 申请医疗注册",
    "Medical Council of Canada Qualifying Examination": "加拿大医学委员会资格考试",
    "One-day, computer-based, 230 MCQs in 2 sections of 115 items, up to 2h40m per section": "单日机考，2 个分段各 115 题，共 230 道选择题，每段最多 2 小时 40 分",
    "Canada + 70+ countries, 4 sessions/year, Prometric test centres, first-come-first-served": "加拿大及 70+ 国家，全年 4 场，Prometric 考点，先到先得",
    "National Assessment Collaboration Examination": "国家评估协作考试",
    "Assesses IMG readiness to enter supervised training in Canada; required for CaRMS entry and as screening tool for some provincial PRA programs": "评估 IMG 进入加拿大受监督培训的准备度；CaRMS 入场必需，并用于部分省 PRA 项目的筛选",
    "Can be taken before or after MCCQE, candidate's choice (for 2027 CaRMS R-1 applicants)": "可在 MCCQE 前后参加，由考生自行选择（适用于 2027 CaRMS R-1 申请人）",
    "2027 CaRMS R-1 Main Residency Match": "2027 CaRMS R-1 住院医主匹配",
    "Submit MCCQE application + required documents by this date to obtain Identity Validity Period (IVP) before file review opens 2026-11-26": "须在此日期前提交 MCCQE 申请及所需材料，以在 2026-11-26 文件审查开启前取得身份有效期（IVP）",
    "English required in most provinces; New Brunswick accepts English OR French; Quebec requires French": "多数省份要求英语；新不伦瑞克接受英语或法语；魁北克要求法语",
    "Pass result on OQLF (Office quebecois de la langue francaise) examination": "通过 OQLF（魁北克法语办公室）考试",
    "Test result must be within 24 months of application to provincial/territorial program": "考试结果须在申请省/地区项目前 24 个月内",
    "If undergraduate/postgraduate training completed in an English- or French-speaking country, or majority of education/patient care was in English/French - exemption decided per program": "若本科/研究生培训在英语或法语国家完成，或教育/患者照护主要使用英语/法语，是否豁免由各项目决定",
    "Apply for LMCC (Licentiate of the Medical Council of Canada) - part of the Canadian Standard": "申请 LMCC（加拿大医学委员会执照）- 加拿大标准的一部分",
    "Apply for specialty certificate with RCPSC, CFPC, or CMQ": "向 RCPSC、CFPC 或 CMQ 申请专科证书",
    "Apply for medical registration with the MRA of the province/territory of intended practice (via physiciansapply.ca for most MRAs)": "向拟执业省/地区的 MRA 申请医疗注册（多数 MRA 通过 physiciansapply.ca）",
    "At least 1 year full-time MD work experience in Canada within the last 3 years": "近 3 年内在加拿大有至少 1 年全职医生工作经验",
    "Internationally-trained, no Canadian clinical MD experience yet (or Canadian experience is older than 3 years)": "国际培养背景，尚无加拿大临床医生经验（或加拿大经验已超过 3 年）",
    "Must still get foreign credentials assessed and licensed by a provincial/territorial regulatory authority": "仍须由省/地区监管机构完成境外资历评估并取得执照",
    "Verifies foreign education/training/experience equivalence to Canadian standards for the profession/trade in the province/territory of intended practice; varies by occupation and jurisdiction.": "核验境外教育/培训/经验是否等同于拟执业省/地区该职业的加拿大标准；具体因职业与辖区而异。",
    "Foreign Credential Recognition Tool - checks if an occupation is regulated/compulsory in a given province/territory and finds the relevant regulatory authority.": "外部资历认证工具 - 检查某职业在指定省/地区是否受监管/属强制执业，并定位对应监管机构。",
    "career counseling and planning": "职业咨询与规划",
    mentorship: "导师指导",
    "job readiness workshops": "就业准备工作坊",
    "job search assistance": "求职协助",
    "Pre-arrival services (for approved PR applicants still outside Canada)": "抵达前服务（适用于仍在加拿大境外的已获批 PR 申请人）",
    "Newcomer/settlement services (post-arrival)": "新移民/安置服务（抵达后）",
    "Job Bank (free government job-search resource)": "Job Bank（政府免费求职资源）",
    "Express Entry Physician Category": "快速通道医生类别",
    Pnp: "省提名",
    "Express Entry General": "快速通道常规类别",
    "Atlantic Immigration Program": "大西洋移民计划",
    "Rural Community Immigration Pilot": "农村社区移民试点",
    "Francophone Community Immigration Pilot": "法语社区移民试点"
  };
  const l = (value?: string) => {
    if (!value) return "";
    if (locale === "tr") return trMap[value] ?? value;
    if (locale === "zh-Hans") return zhMap[value] ?? value;
    return value;
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
  const newFor2026 = data.newFor2026 ?? [];
  const immigrationPathways = data.immigrationPathways ?? [];
  const pnpPathway = immigrationPathways.find((item) => item.id === "pnp");
  const licensing = data.medicalLicensingPathway;
  const englishTests = Object.entries(licensing?.languageRequirements?.englishTests ?? {});
  const structuralNoteText = localizedField(
    "structuralNote",
    "This is not a single visa stream. It combines physician-specific immigration options and a separate medical licensing process. To practise in Canada, both tracks must be completed."
  );
  const licensingNote = locale === "tr"
    ? (licensing?.note_tr ?? "Bu surec IRCC/gocmenlikten ayridir; Medical Council of Canada (MCC) ve eyalet/bolge Medical Regulatory Authority'leri (MRA) tarafindan yonetilir. Gocmenlik statusunden bagimsiz tamamlanmalidir.")
    : locale === "zh-Hans"
      ? (licensing?.note_zh ?? "该流程独立于 IRCC 移民流程，由加拿大医学委员会（MCC）及各省/地区医学监管机构（MRA）管理，必须独立于移民身份单独完成。")
      : (licensing?.note ?? "This process is separate from IRCC immigration and managed by the Medical Council of Canada (MCC) and provincial/territorial Medical Regulatory Authorities (MRA). It must be completed independently from immigration status.");

  const stats = [
    {
      label: locale === "tr" ? "Yeni 2026 güncellemesi" : locale === "zh-Hans" ? "2026 新增更新" : "New in 2026",
      value: `${newFor2026.length}`,
    },
    {
      label: locale === "tr" ? "PNP rezerve kontenjan" : locale === "zh-Hans" ? "PNP 保留名额" : "PNP reserved spaces",
      value: `${pnpPathway?.reservedSpaces ?? 5000}`,
    },
    {
      label: locale === "tr" ? "Hızlandırılmış izin" : locale === "zh-Hans" ? "加速工签处理" : "Expedited permit",
      value: `${pnpPathway?.expeditedWorkPermitDays ?? 14} days`,
    },
  ];

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
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
            <Sparkles className="h-4 w-4" />
            {ui.overlay}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="space-y-6 p-6 sm:p-8">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100">Canada</Badge>
                  <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-100">
                    {ui.badgeTitle}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                    {ui.pageTitle}
                  </h1>
                  <p className="max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
                    {structuralNoteText}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {stats.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{item.label}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href={`/${locale}/full-check`}>
                  <Button className="bg-rose-600 text-white hover:bg-rose-700">
                    <span>{ui.check}</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <a
                  href={data.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                >
                  {ui.openSource}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-xl">{ui.quickSummary}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{ui.lastVerified}</p>
                <p className="mt-1 font-medium text-slate-900 dark:text-white">{data.lastVerified ?? "2026-06-27"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{ui.intlTrainedPhysicians}</p>
                <p className="mt-1 font-medium text-slate-900 dark:text-white">
                  {data.sectorStatistics?.internationallyTrainedFamilyPhysiciansPercent2024 ?? 31}%
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{ui.immigrantHealthcareRatio}</p>
                <p className="mt-1 font-medium text-slate-900 dark:text-white">
                  {data.sectorStatistics?.immigrantHealthcareWorkersRatio ?? "1 in 4"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{ui.arrivalsViaEconomic}</p>
                <p className="mt-1 font-medium text-slate-900 dark:text-white">
                  {data.sectorStatistics?.healthcareWorkersArrived2024ViaEconomicPrograms ?? "11,000+"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-6 sm:px-6 lg:px-8">
        <VisaPdfDownloadCard
          pdfUrls={data.sourcePdfBlobUrl ? [data.sourcePdfBlobUrl] : []}
          sourceUrl={data.sourceUrl}
          title={ui.pdfTitle}
          description={ui.pdfDesc}
          primaryLabel={ui.openPdf}
          sourceLabel={ui.officialPage}
        />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Stethoscope className="h-5 w-5 text-rose-600" />
                {ui.immigrationPathways}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {immigrationPathways.map((pathway) => (
                <div key={pathway.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{l(pathway.name)}</p>
                  <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                    {(pathway.eligibility ?? []).map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="text-rose-500">•</span>
                        <span>{l(item)}</span>
                      </li>
                    ))}
                  </ul>
                  {pathway.processSteps && pathway.processSteps.length > 0 ? (
                    <p className="mt-2 text-xs font-medium text-slate-600">
                      {ui.processSteps}: {pathway.processSteps.length}
                    </p>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <HeartPulse className="h-5 w-5 text-rose-600" />
                {ui.licensing}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <p>{licensingNote}</p>
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-white">{licensing?.framework?.name ?? "IMG-L Framework"}</p>
                <ul className="mt-2 space-y-1">
                  {Object.entries(licensing?.framework?.components ?? {}).map(([key, value]) => (
                    <li key={key} className="flex gap-2">
                      <span className="font-semibold text-rose-600">{key}</span>
                      <span>{l(value)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-white">{licensing?.centralPortal?.name}</p>
                <ul className="mt-2 space-y-1">
                  {(licensing?.centralPortal?.services ?? []).map((service) => (
                    <li key={service} className="flex gap-2">
                      <span className="text-rose-500">•</span>
                      <span>{l(service)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ListChecks className="h-5 w-5 text-rose-600" />
                {ui.examsDeadlines}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-white">{l(licensing?.exams?.MCCQE?.fullName)}</p>
                <p className="mt-1">{l(licensing?.exams?.MCCQE?.format)}</p>
                <p className="mt-1">{l(licensing?.exams?.MCCQE?.deliveredIn)}</p>
                <p className="mt-1">
                  {ui.maxAttempts}: {licensing?.exams?.MCCQE?.attemptLimit?.max ?? 4}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-white">{l(licensing?.exams?.NAC?.fullName)}</p>
                <p className="mt-1">{l(licensing?.exams?.NAC?.purpose)}</p>
                <p className="mt-1">{l(licensing?.exams?.NAC?.orderFlexibility)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-white">{l(licensing?.keyDeadlineExample?.context)}</p>
                <p className="mt-1 flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-rose-600" />
                  {licensing?.keyDeadlineExample?.deadline}
                </p>
                <p className="mt-1">{l(licensing?.keyDeadlineExample?.requirement)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <BadgeCheck className="h-5 w-5 text-rose-600" />
                {ui.languageRegistration}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <p>{l(licensing?.languageRequirements?.generalRule)}</p>
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-white">{ui.englishTests}</p>
                <ul className="mt-2 space-y-1">
                  {englishTests.map(([testName, scoreRule]) => (
                    <li key={testName} className="flex gap-2">
                      <span className="text-rose-500">•</span>
                      <span>{testName}: {l(scoreRule)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p>{l(licensing?.languageRequirements?.frenchTestQuebec)}</p>
              <p>{l(licensing?.languageRequirements?.validityWindow)}</p>
              <p>{l(licensing?.languageRequirements?.possibleExemption)}</p>
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-white">{ui.postLicensureSteps}</p>
                <ul className="mt-2 space-y-1">
                  {(licensing?.postLicensureSteps ?? []).map((step) => (
                    <li key={step} className="flex gap-2">
                      <span className="text-rose-500">•</span>
                      <span>{l(step)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Globe2 className="h-5 w-5 text-rose-600" />
                {ui.applicantTracks}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{ui.withCanadianMdExp}</p>
                <p className="mt-1">{l(data.applicantTracks?.hasCanadianMDExperience?.description)}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {(data.applicantTracks?.hasCanadianMDExperience?.availablePathways ?? []).map(pathLabel).map(l).join(" • ")}
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{ui.noCanadianMdExp}</p>
                <p className="mt-1">{l(data.applicantTracks?.noCanadianMDExperienceYet?.description)}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {(data.applicantTracks?.noCanadianMDExperienceYet?.availablePathways ?? []).map(pathLabel).map(l).join(" • ")}
                </p>
                <p className="mt-1">{l(data.applicantTracks?.noCanadianMDExperienceYet?.prerequisite)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-xl">{ui.credentialSupport}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <p>{l(data.foreignCredentialRecognition?.process)}</p>
              <p>{l(data.foreignCredentialRecognition?.tool)}</p>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{ui.supportServices}</p>
                <ul className="mt-2 space-y-1">
                  {(data.foreignCredentialRecognition?.supportServices ?? []).map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-rose-500">•</span>
                      <span>{l(item)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{ui.newcomerServices}</p>
                <ul className="mt-2 space-y-1">
                  {(data.foreignCredentialRecognition?.otherNewcomerServices ?? []).map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-rose-500">•</span>
                      <span>{l(item)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
