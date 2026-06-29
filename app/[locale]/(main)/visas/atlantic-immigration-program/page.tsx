import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Building2, Clock3, DollarSign, ExternalLink, FileText, Globe2, GraduationCap, ListChecks, MapPinned, ShieldCheck, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VisaPdfDownloadCard } from "@/components/visa-pdf-download-card";
import { getTranslations } from "@/lib/i18n/get-translations";
import type { Locale } from "@/lib/i18n/config";
import visaDetails from "@/src/data/visa-details.json";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

type PageProps = {
  params: Promise<{ locale: string }>;
};

type AipProvider = {
  organization: string;
  contact: string;
  province: string;
  areas_served: string;
};

type AipData = {
  subclass: string;
  id: string;
  country: string;
  program_name: string;
  status: string;
  fees: string;
  processing_time: string;
  pdfSnapshotUrls: string[];
  overview: string;
  target_provinces: string[];
  candidate_eligibility: {
    core_requirements: string[];
    teer_matrix: Array<{ job_offer_teer: string; required_work_experience_teer: string }>;
    exemptions: {
      international_graduates: string;
      healthcare_sector: string;
    };
  };
  job_offer_criteria: string[];
  required_forms: {
    portal_digital_forms: Array<{ code: string; name: string }>;
    portal_upload_pdfs: Array<{ code: string; name: string }>;
  };
  legal_and_translations: {
    rules: string[];
    alternate_format_request: {
      email: string;
      subject_line: string;
      instructions: string;
    };
  };
  employer_requirements: {
    designation_criteria: string[];
    mandatory_training: {
      onboarding: string;
      intercultural_competency: string;
    };
    english_service_providers: AipProvider[];
    french_service_providers: AipProvider[];
    provincial_websites: Record<string, string>;
  };
  process_steps: {
    endorsement_phase: string[];
    immigration_phase: string[];
  };
};

function resolveNestedTranslation(translations: Record<string, unknown>, key: string) {
  return key.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    return (current as Record<string, unknown>)[segment];
  }, translations);
}

function t(translations: Record<string, unknown>, key: string, defaultValue?: string) {
  const value = resolveNestedTranslation(translations, key);
  return typeof value === "string" ? value : defaultValue || key;
}

const rawAipData = (visaDetails as AipData[]).find((item) => item.subclass === "atlantic-immigration-program") as AipData;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;

  return {
    metadataBase: new URL(BASE_URL),
    title: "Atlantic Immigration Program (AIP) | LogiVisa",
    description: rawAipData.overview,
    alternates: {
      canonical: `/${locale}/visas/atlantic-immigration-program`,
      languages: {
        en: `/en/visas/atlantic-immigration-program`,
        tr: `/tr/visas/atlantic-immigration-program`,
        "zh-Hans": `/zh-Hans/visas/atlantic-immigration-program`,
      },
    },
  };
}

function ProviderTable({
  providers,
  orgLabel,
  provinceLabel,
  areasLabel,
  contactLabel,
}: {
  providers: AipProvider[];
  orgLabel: string;
  provinceLabel: string;
  areasLabel: string;
  contactLabel: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-950/60">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">{orgLabel}</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">{provinceLabel}</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">{areasLabel}</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">{contactLabel}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {providers.map((provider) => (
              <tr key={`${provider.organization}-${provider.province}`} className="bg-white dark:bg-slate-900">
                <td className="px-4 py-3 align-top font-medium text-slate-900 dark:text-white">{provider.organization}</td>
                <td className="px-4 py-3 align-top text-slate-600 dark:text-slate-300">{provider.province}</td>
                <td className="px-4 py-3 align-top text-slate-600 dark:text-slate-300">{provider.areas_served}</td>
                <td className="px-4 py-3 align-top text-slate-600 dark:text-slate-300">{provider.contact}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function AtlanticImmigrationProgramPage({ params }: PageProps) {
  const { locale } = await params;
  const translations = await getTranslations(locale as Locale);
  const aipData = rawAipData;
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";

  const backToVisasLabel = t(translations, "visas.backToVisas", "Back to visas");
  const checkEligibilityLabel = t(translations, "visas.checkEligibility", "Check your eligibility");
  const officialInfoLabel = t(translations, "visas.officialInfo", "Official Information");
  const visitOfficialWebsiteLabel = t(translations, "visas.visitOfficialWebsite", "Visit official website");
  const trMap: Record<string, string> = {
    Open: "Acik",
    "Atlantic Immigration Program (AIP)": "Atlantik Goc Programi (AIP)",
    "From $1,590 (Increased April 30, 2026)": "$1,590'dan baslar (30 Nisan 2026 artisi)",
    "About 26 months (Does not include biometrics)": "Yaklasik 26 ay (biyometri dahil degildir)",
    "A pathway to permanent residence for skilled foreign workers and international graduates from a Canadian institution who want to work and live in 1 of Canada's 4 Atlantic provinces: New Brunswick, Nova Scotia, Prince Edward Island, or Newfoundland and Labrador. The program helps employers hire qualified candidates for jobs they haven't been able to fill locally.": "Kanada'nin 4 Atlantik eyaletinden birinde (New Brunswick, Nova Scotia, Prince Edward Island, Newfoundland and Labrador) calisip yasamak isteyen nitelikli yabanci calisanlar ve Kanada kurumlarindan mezun uluslararasi ogrenciler icin daimi oturum yoludur. Program, isverenlerin yerelde dolduramadigi pozisyonlar icin nitelikli adaylari ise almasina yardim eder.",
    "This public visa page exposes the full official AIP PDF snapshot stored on Vercel Blob.": "Bu kamuya acik vize sayfasi, Vercel Blob'da saklanan resmi AIP PDF anlik goruntusunu sunar.",
    "Atlantic Immigration Program Official Guide (PDF)": "Atlantik Goc Programi Resmi Rehberi (PDF)",
    "Must receive a valid job offer from a designated employer in Atlantic Canada.": "Atlantik Kanada'da yetkilendirilmis bir isverenden gecerli is teklifi almalidir.",
    "Must be either a recent graduate of a recognized post-secondary institution in Atlantic Canada OR a skilled worker.": "Atlantik Kanada'da taninan bir lise sonrasi kurumdan yeni mezun OLMALI veya nitelikli isci olmalidir.",
    "Can be living abroad or in Canada as a temporary resident.": "Yurt disinda veya Kanada'da gecici oturum sahibi olarak yasiyor olabilir.",
    "Must have the right level of education for the job offered.": "Teklif edilen is icin uygun egitim duzeyine sahip olmalidir.",
    "Must prove language abilities by taking an approved test.": "Onayli bir sinavla dil yeterliligini kanitlamalidir.",
    "Must show proof of funds to support self and family (Exempt if already living and working in Canada with a valid work permit).": "Kendini ve ailesini destekleyecek maddi kanit gostermelidir (Kanada'da gecerli calisma izniyle zaten yasiyor ve calisiyorsa muaf).",
    "Must get a personalized settlement plan from a service provider organization.": "Bir hizmet saglayici kurulusundan kisisellestirilmis yerlesim plani almalidir.",
    "Do not need qualifying work experience if they are an international student who graduated from a recognized post-secondary institution in Atlantic Canada and lived in an Atlantic province for at least 16 of the 24 months before receiving the credential.": "Atlantik Kanada'da taninan bir lise sonrasi kurumdan mezun olan uluslararasi ogrenci, belgeyi almadan onceki 24 ayin en az 16 ayinda bir Atlantik eyaletinde yasadiysa uygun is deneyimi gerekmez.",
    "Work experience in NOC 31201 (licensed practical nurses) and NOC 31301 (registered nurses) can be used for a job offer in NOC 33102 (TEER 3 - Nurse aides, orderlies) and NOC 44101 (TEER 4 - Home support workers, caregivers).": "NOC 31201 (lisansli pratik hemsire) ve NOC 31301 (kayitli hemsire) deneyimi, NOC 33102 (TEER 3 - hemsire yardimcilari, duzenleyiciler) ve NOC 44101 (TEER 4 - ev destek calisanlari, bakicilar) is teklifleri icin kullanilabilir.",
    "Must be full-time (at least 30 hours a week).": "Tam zamanli olmalidir (haftada en az 30 saat).",
    "Must be non-seasonal (consistent and paid all year).": "Mevsimsel olmamalidir (yil boyu duzenli ve ucretli).",
    "Must be for at least 1 year from becoming a permanent resident for TEER 0, 1, 2, 3 offers.": "TEER 0, 1, 2, 3 teklifleri icin daimi oturum alindiktan sonra en az 1 yil sureli olmalidir.",
    "Must be for permanent employment with no set end date for TEER 4 offers.": "TEER 4 teklifleri icin bitis tarihi olmayan kalici istihdam olmalidir.",
    "Must be at the same or higher skill level as the qualifying work experience (unless exempt as a graduate).": "Uygun is deneyimiyle ayni veya daha yuksek beceri duzeyinde olmalidir (mezuniyet muafiyeti yoksa).",
    "The job offer cannot come from a company in which the applicant, spouse, or common-law partner are a majority owner.": "Is teklifi, basvuranin, esinin veya fiili partnerinin cogunluk hissedari oldugu bir sirketten gelemez.",
    "Generic Application Form for Canada": "Kanada Genel Basvuru Formu",
    "Schedule A - Background/Declaration": "Ek A - Gecmis/Beyan",
    "Additional Family Information": "Ek Aile Bilgileri",
    "Supplementary Information - Your travels": "Ek Bilgi - Seyahatleriniz",
    "Document Checklist": "Belge Kontrol Listesi",
    "Economic Classes – Atlantic Immigration Program": "Ekonomik Siniflar - Atlantik Goc Programi",
    "Offer of Employment to a Foreign National under the Atlantic Immigration Program (Must enter 'Permanent' in box 22 for TEER 4)": "Atlantik Goc Programi kapsaminda yabanci uyrukluya is teklifi (TEER 4 icin 22. kutuya 'Permanent' yazilmalidir)",
    "Statutory Declaration of Common-law Union (Requires hand-signatures and consecutive 1-year joint proof like bank statements, leases, utility bills)": "Fiili Birliktelik Yasal Beyani (el yazisi imza ve banka dokumu, kira, fatura gibi kesintisiz 1 yillik ortak kanit gerekir)",
    "Separation Declaration for Minors Travelling to Canada (Must be signed by hand in front of a notary public if minor travels without both parents)": "Kanada'ya Seyahat Eden Kucukler Icin Ayrilik Beyani (kucuk iki ebeveyn olmadan seyahat ederse noter onunde el ile imzalanmalidir)",
    "Every document not in English or French must include a certified translation with the translator's membership number, seal, or stamp.": "Ingilizce veya Fransizca olmayan her belge, cevirmenin uyelik numarasi, muhru veya kagasiyla onayli ceviri icermelidir.",
    "If a certified translator is unavailable, an affidavit sworn in front of an authorized person is required.": "Onayli cevirmen yoksa yetkili kisi onunde yeminli beyan gerekir.",
    "Authorized persons to witness affidavits/certify inside Canada: Notary Public, Commissioner of Oaths, Commissioner of taking affidavits.": "Kanada icinde beyan/onay icin yetkililer: Noter, Yemin Komiseri, Beyan Alma Komiseri.",
    "Family members and immigration representatives/consultants are strictly FORBIDDEN from translating documents or witnessing affidavits/certifying copies.": "Aile uyeleri ve gocmenlik temsilcileri/danismanlari belge cevirisi yapamaz veya beyan/kopya onayinda tanik olamaz.",
    "[Format Needed: Braille / Large Print / Paper] - [Application Package Name]": "[Gerekli Format: Braille / Buyuk Punto / Kagit] - [Basvuru Paketi Adi]",
    "Send a plain email with Requested Format, Application Package, Preferred Language, Delivery Method, Full Name, Email, and Mailing Address. Do not add extra information. Technical issues form dummy data: UCI enter 1111111111, Application number enter 0000000.": "Talep Edilen Format, Basvuru Paketi, Tercih Edilen Dil, Teslim Yontemi, Ad Soyad, E-posta ve Posta Adresi ile duz bir e-posta gonderin. Ek bilgi eklemeyin. Teknik sorun formu dummy veri: UCI 1111111111, Basvuru numarasi 0000000.",
    "Must not be in violation of the Immigration and Refugee Protection Act or Regulations.": "Immigration and Refugee Protection Act veya yonetmeliklerine aykiri olmamalidir.",
    "Must be in good standing with employment standards and occupational health and safety legislation.": "Istihdam standartlari ve is sagligi-guvenligi mevzuatina uygun durumda olmalidir.",
    "Cannot recruit workers to establish a pool to be later transferred or contracted out.": "Daha sonra devretmek veya dis kaynak yapmak icin havuz olusturmak amaciyla isci toplayamaz.",
    "Must have been in continuous, active operation under the same management for at least 2 years in 1 of the Atlantic provinces (or show operation in another location with provincial confirmation).": "Atlantik eyaletlerinden birinde ayni yonetim altinda en az 2 yil kesintisiz aktif faaliyet gostermelidir (veya eyalet onayiyla baska lokasyonda faaliyet kaniti sunmalidir).",
    "Must work with a settlement service provider organization to help candidates.": "Adaylara destek icin bir yerlesim hizmet saglayicisi kurulusla calismalidir.",
    "Must complete free mandatory onboarding training and free intercultural competency training.": "Ucretsiz zorunlu onboarding egitimi ve ucretsiz kulturlerarasi yetkinlik egitimini tamamlamalidir.",
    "Watch a sent training video covering Canada's immigration system, AIP background, roles, PR/Work permit applications, and integration. Sign up by emailing business legal/operating name, address, and name of individual completing training to the Dedicated Service Channel.": "Kanada'nin goc sistemi, AIP arka plani, roller, PR/calisma izni basvurulari ve uyumu kapsayan egitim videosunu izleyin. Isletmenin resmi/faaliyet adi, adresi ve egitimi tamamlayacak kisinin adini Dedicated Service Channel'a e-posta ile gondererek kaydolun.",
    "Takes half a day, offered in person or via live webinar. Covers creating welcoming workplaces, newcomer experiences, and cultural awareness. Targets hiring managers.": "Yarim gun surer; yuz yuze veya canli webinar olarak sunulur. Kapsayici is ortami olusturma, yeni gelen deneyimi ve kulturel farkindalik konularini kapsar. Ise alim yoneticilerini hedefler.",
    "A designated AIP employer offers you a valid full-time, non-seasonal job.": "Yetkili bir AIP isvereni size gecerli tam zamanli, mevsimsel olmayan bir is teklif eder.",
    "The candidate connects with an authorized settlement service provider to get a customized Settlement Plan.": "Aday, ozellestirilmis Yerlesim Plani almak icin yetkili bir yerlesim hizmet saglayicisiyla iletisime gecer.",
    "Candidate sends the finalized settlement plan back to the designated employer.": "Aday nihai yerlesim planini yetkili isverene geri gonderir.",
    "The employer submits a formal endorsement application to the respective provincial department (No LMIA required).": "Isveren ilgili eyalet birimine resmi endorsement basvurusu sunar (LMIA gerekmez).",
    "The candidate receives a official Provincial Endorsement Certificate and a temporary work permit support letter (if required).": "Aday resmi Eyalet Endorsement Sertifikasi ve (gerekirse) gecici calisma izni destek mektubu alir.",
    "Submit the official Permanent Residence (PR) application along with the Endorsement Certificate, IMM 0155 checklist, and supporting docs via the online PR Portal.": "Resmi Daimi Oturum (PR) basvurusunu Endorsement Sertifikasi, IMM 0155 kontrol listesi ve destekleyici belgelerle online PR Portal uzerinden gonderin.",
    "IRCC reviews, performs background/security checks, and processes the PR application.": "IRCC inceleme yapar, guvenlik/arka plan kontrollerini uygular ve PR basvurusunu isler.",
    "Optional: Apply online for a 2-year employer-specific temporary work permit using the provincial referral letter while PR is processing to begin working early.": "Istege bagli: PR islenirken erken baslamak icin eyalet yonlendirme mektubuyla 2 yillik isverene ozel gecici calisma iznine online basvurun.",
    "Complete biometrics within 30 days of receiving the IRCC instruction letter, and book the mandatory medical exam.": "IRCC talimat mektubunu aldiktan sonra 30 gun icinde biyometriyi tamamlayin ve zorunlu saglik muayenesi randevusu alin.",
    "Upon final approval, travel to Atlantic Canada to live and work with ongoing support from the employer and settlement provider.": "Nihai onaydan sonra isveren ve yerlesim saglayicisinin surekli destegiyle Atlantik Kanada'ya gidip yasamaya ve calismaya baslayin.",
    "New Brunswick": "New Brunswick",
    "Newfoundland and Labrador": "Newfoundland and Labrador",
    "Nova Scotia": "Nova Scotia",
    "Prince Edward Island": "Prince Edward Island"
  };
  const zhMap: Record<string, string> = {
    Open: "开放",
    "Atlantic Immigration Program (AIP)": "大西洋移民计划（AIP）",
    "From $1,590 (Increased April 30, 2026)": "$1,590 起（2026-04-30 上调）",
    "About 26 months (Does not include biometrics)": "约 26 个月（不含生物信息）",
    "A pathway to permanent residence for skilled foreign workers and international graduates from a Canadian institution who want to work and live in 1 of Canada's 4 Atlantic provinces: New Brunswick, Nova Scotia, Prince Edward Island, or Newfoundland and Labrador. The program helps employers hire qualified candidates for jobs they haven't been able to fill locally.": "面向希望在加拿大 4 个大西洋省份之一（新不伦瑞克、新斯科舍、爱德华王子岛、纽芬兰与拉布拉多）工作和生活的技术外籍工人与加拿大院校国际毕业生的永久居留路径。该项目帮助雇主填补本地难以招满的岗位。",
    "This public visa page exposes the full official AIP PDF snapshot stored on Vercel Blob.": "本公共签证页面展示了存储在 Vercel Blob 上的官方 AIP PDF 完整快照。",
    "Atlantic Immigration Program Official Guide (PDF)": "大西洋移民计划官方指南（PDF）",
    "Must receive a valid job offer from a designated employer in Atlantic Canada.": "必须获得加拿大大西洋地区指定雇主的有效工作邀约。",
    "Must be either a recent graduate of a recognized post-secondary institution in Atlantic Canada OR a skilled worker.": "必须是大西洋地区认可高等院校的应届毕业生，或技术工人。",
    "Can be living abroad or in Canada as a temporary resident.": "可居住在境外，或以加拿大临时居民身份在境内。",
    "Must have the right level of education for the job offered.": "必须具备与岗位匹配的教育水平。",
    "Must prove language abilities by taking an approved test.": "必须通过认可考试证明语言能力。",
    "Must show proof of funds to support self and family (Exempt if already living and working in Canada with a valid work permit).": "必须提供本人及家庭资金证明（如已持有效工签在加拿大生活并工作，可豁免）。",
    "Must get a personalized settlement plan from a service provider organization.": "必须从服务机构获得个性化安置计划。",
    "Do not need qualifying work experience if they are an international student who graduated from a recognized post-secondary institution in Atlantic Canada and lived in an Atlantic province for at least 16 of the 24 months before receiving the credential.": "若申请人为大西洋地区认可高等院校国际毕业生，且在取得学历前 24 个月内至少有 16 个月居住于大西洋省份，则可免除合格工作经验要求。",
    "Work experience in NOC 31201 (licensed practical nurses) and NOC 31301 (registered nurses) can be used for a job offer in NOC 33102 (TEER 3 - Nurse aides, orderlies) and NOC 44101 (TEER 4 - Home support workers, caregivers).": "NOC 31201（执业护士）与 NOC 31301（注册护士）的工作经验，可用于 NOC 33102（TEER 3 - 护士助理/护理员）及 NOC 44101（TEER 4 - 居家支持/护理人员）岗位邀约。",
    "Must be full-time (at least 30 hours a week).": "必须为全职（每周至少 30 小时）。",
    "Must be non-seasonal (consistent and paid all year).": "必须为非季节性（全年持续且有薪）。",
    "Must be for at least 1 year from becoming a permanent resident for TEER 0, 1, 2, 3 offers.": "TEER 0/1/2/3 的岗位邀约，须在成为永久居民后至少持续 1 年。",
    "Must be for permanent employment with no set end date for TEER 4 offers.": "TEER 4 的岗位邀约必须为无固定结束日期的永久雇佣。",
    "Must be at the same or higher skill level as the qualifying work experience (unless exempt as a graduate).": "技能等级须与合格工作经验相同或更高（毕业生豁免除外）。",
    "The job offer cannot come from a company in which the applicant, spouse, or common-law partner are a majority owner.": "工作邀约不得来自申请人、其配偶或事实伴侣为控股股东的公司。",
    "Generic Application Form for Canada": "加拿大通用申请表",
    "Schedule A - Background/Declaration": "附表 A - 背景/声明",
    "Additional Family Information": "补充家庭信息",
    "Supplementary Information - Your travels": "补充信息 - 您的旅行记录",
    "Document Checklist": "文件清单",
    "Economic Classes – Atlantic Immigration Program": "经济类 - 大西洋移民计划",
    "Offer of Employment to a Foreign National under the Atlantic Immigration Program (Must enter 'Permanent' in box 22 for TEER 4)": "大西洋移民计划下向外国公民提供就业邀约（TEER 4 须在第 22 栏填写 'Permanent'）",
    "Statutory Declaration of Common-law Union (Requires hand-signatures and consecutive 1-year joint proof like bank statements, leases, utility bills)": "事实同居关系法定声明（需手写签名，并提供连续 1 年联名证明，如银行流水、租约、水电账单）",
    "Separation Declaration for Minors Travelling to Canada (Must be signed by hand in front of a notary public if minor travels without both parents)": "未成年人赴加分离声明（若未成年人非双亲同行，须在公证人面前手写签字）",
    "Every document not in English or French must include a certified translation with the translator's membership number, seal, or stamp.": "凡非英文或法文文件，均须附带认证翻译件，并包含译者会员编号、印章或戳记。",
    "If a certified translator is unavailable, an affidavit sworn in front of an authorized person is required.": "若无法获得认证译员，需在授权人员面前宣誓并出具宣誓书。",
    "Authorized persons to witness affidavits/certify inside Canada: Notary Public, Commissioner of Oaths, Commissioner of taking affidavits.": "加拿大境内可见证宣誓/认证的授权人员：公证人、宣誓专员、宣誓书专员。",
    "Family members and immigration representatives/consultants are strictly FORBIDDEN from translating documents or witnessing affidavits/certifying copies.": "家庭成员及移民代表/顾问严禁翻译文件，或见证宣誓/认证副本。",
    "[Format Needed: Braille / Large Print / Paper] - [Application Package Name]": "[所需格式：盲文 / 大字版 / 纸质] - [申请包名称]",
    "Send a plain email with Requested Format, Application Package, Preferred Language, Delivery Method, Full Name, Email, and Mailing Address. Do not add extra information. Technical issues form dummy data: UCI enter 1111111111, Application number enter 0000000.": "请发送纯文本邮件，包含所需格式、申请包、首选语言、送达方式、姓名、邮箱与邮寄地址。不要添加额外信息。技术问题表单占位数据：UCI 填 1111111111，申请号填 0000000。",
    "Must not be in violation of the Immigration and Refugee Protection Act or Regulations.": "不得违反《移民与难民保护法》或相关法规。",
    "Must be in good standing with employment standards and occupational health and safety legislation.": "必须符合劳动标准及职业健康与安全法规要求。",
    "Cannot recruit workers to establish a pool to be later transferred or contracted out.": "不得以建立后续转派/外包劳动力池为目的进行招聘。",
    "Must have been in continuous, active operation under the same management for at least 2 years in 1 of the Atlantic provinces (or show operation in another location with provincial confirmation).": "必须在大西洋某省于同一管理下连续、活跃运营至少 2 年（或经省级确认在其他地点运营）。",
    "Must work with a settlement service provider organization to help candidates.": "必须与安置服务机构合作，为候选人提供支持。",
    "Must complete free mandatory onboarding training and free intercultural competency training.": "必须完成免费的强制入职培训与跨文化能力培训。",
    "Watch a sent training video covering Canada's immigration system, AIP background, roles, PR/Work permit applications, and integration. Sign up by emailing business legal/operating name, address, and name of individual completing training to the Dedicated Service Channel.": "观看已发送的培训视频，内容涵盖加拿大移民体系、AIP 背景、角色分工、PR/工签申请与融入。通过向 Dedicated Service Channel 邮件提交企业法定/经营名称、地址及参训人员姓名完成报名。",
    "Takes half a day, offered in person or via live webinar. Covers creating welcoming workplaces, newcomer experiences, and cultural awareness. Targets hiring managers.": "培训时长半天，提供线下或直播网络研讨会。内容涵盖包容型职场建设、新移民体验与文化意识，主要面向招聘管理者。",
    "A designated AIP employer offers you a valid full-time, non-seasonal job.": "指定 AIP 雇主向您提供有效的全职、非季节性工作。",
    "The candidate connects with an authorized settlement service provider to get a customized Settlement Plan.": "候选人与授权安置服务机构对接，获取定制化安置计划。",
    "Candidate sends the finalized settlement plan back to the designated employer.": "候选人将最终版安置计划回传给指定雇主。",
    "The employer submits a formal endorsement application to the respective provincial department (No LMIA required).": "雇主向相应省级部门提交正式背书申请（无需 LMIA）。",
    "The candidate receives a official Provincial Endorsement Certificate and a temporary work permit support letter (if required).": "候选人收到正式省级背书证书及临时工签支持信（如需）。",
    "Submit the official Permanent Residence (PR) application along with the Endorsement Certificate, IMM 0155 checklist, and supporting docs via the online PR Portal.": "通过在线 PR 门户提交正式永久居留申请，并附背书证书、IMM 0155 清单及支持文件。",
    "IRCC reviews, performs background/security checks, and processes the PR application.": "IRCC 进行审查、背景/安全核查并处理 PR 申请。",
    "Optional: Apply online for a 2-year employer-specific temporary work permit using the provincial referral letter while PR is processing to begin working early.": "可选：在 PR 审理期间，凭省级推荐信在线申请 2 年期雇主限定临时工签，以便提前入职。",
    "Complete biometrics within 30 days of receiving the IRCC instruction letter, and book the mandatory medical exam.": "收到 IRCC 指示信后 30 天内完成生物信息采集，并预约强制体检。",
    "Upon final approval, travel to Atlantic Canada to live and work with ongoing support from the employer and settlement provider.": "最终获批后，前往加拿大大西洋地区居住和工作，并持续获得雇主及安置机构支持。",
    "New Brunswick": "新不伦瑞克",
    "Newfoundland and Labrador": "纽芬兰与拉布拉多",
    "Nova Scotia": "新斯科舍",
    "Prince Edward Island": "爱德华王子岛"
  };
  const l = (value?: string) => {
    if (!value) return "";
    if (isTr) return trMap[value] ?? value;
    if (isZh) return zhMap[value] ?? value;
    return value;
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-28 sm:pt-32 dark:from-slate-950 dark:to-slate-900">
      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link
            href={`/${locale}/visas/canada`}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {backToVisasLabel}
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100">
            <Sparkles className="h-4 w-4" />
            {officialInfoLabel}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="space-y-6 p-6 sm:p-8">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100">Canada</Badge>
                  <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-100">{l(aipData.status)}</Badge>
                </div>

                <div className="space-y-3">
                  <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                    {l(aipData.program_name)}
                  </h1>
                  <p className="max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
                    {l(aipData.overview)}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    <DollarSign className="h-4 w-4 text-sky-600" />
                    {isTr ? "Ucret" : isZh ? "费用" : "Fee"}
                  </div>
                  <p className="mt-2 text-xl font-bold text-slate-950 dark:text-white">{l(aipData.fees)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    <Clock3 className="h-4 w-4 text-sky-600" />
                    {isTr ? "Islem suresi" : isZh ? "处理时间" : "Processing time"}
                  </div>
                  <p className="mt-2 text-xl font-bold text-slate-950 dark:text-white">{l(aipData.processing_time)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    <MapPinned className="h-4 w-4 text-sky-600" />
                    {isTr ? "Hedef eyaletler" : isZh ? "目标省份" : "Target provinces"}
                  </div>
                  <p className="mt-2 text-xl font-bold text-slate-950 dark:text-white">{aipData.target_provinces.length}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href={`/${locale}/full-check`}>
                  <Button className="bg-sky-600 text-white hover:bg-sky-700">
                    <span>{checkEligibilityLabel}</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <a
                  href="https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                >
                  {visitOfficialWebsiteLabel}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-xl">{officialInfoLabel}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">ID</p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{aipData.id}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{isTr ? "Ulke" : isZh ? "国家" : "Country"}</p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{l(aipData.country)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{isTr ? "Durum" : isZh ? "状态" : "Status"}</p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{l(aipData.status)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{isTr ? "Hedef eyaletler" : isZh ? "目标省份" : "Target provinces"}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {aipData.target_provinces.map((province) => (
                    <span key={province} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {l(province)}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-6 sm:px-6 lg:px-8">
        <VisaPdfDownloadCard
          pdfUrls={aipData.pdfSnapshotUrls}
          sourceUrl="https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration.html"
          title={l("Atlantic Immigration Program Official Guide (PDF)")}
          description={l("This public visa page exposes the full official AIP PDF snapshot stored on Vercel Blob.")}
          primaryLabel={isTr ? "PDF'yi Ac" : isZh ? "打开 PDF" : "Open PDF"}
          sourceLabel={visitOfficialWebsiteLabel}
        />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <BadgeCheck className="h-5 w-5 text-sky-600" />
                {isTr ? "Aday Uygunlugu" : isZh ? "候选人资格" : "Candidate Eligibility"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                {aipData.candidate_eligibility.core_requirements.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sky-500" />
                    <span>{l(item)}</span>
                  </li>
                ))}
              </ul>

              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-950/60">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">{isTr ? "Is teklifi TEER" : isZh ? "职位邀约 TEER" : "Job offer TEER"}</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">{isTr ? "Gerekli is deneyimi TEER" : isZh ? "所需工作经验 TEER" : "Required work experience TEER"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {aipData.candidate_eligibility.teer_matrix.map((row) => (
                        <tr key={row.job_offer_teer} className="bg-white dark:bg-slate-900">
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{row.job_offer_teer}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.required_work_experience_teer}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-500/20 dark:bg-sky-500/10">
                <div className="flex items-center gap-2 text-sm font-semibold text-sky-900 dark:text-sky-100">
                  <GraduationCap className="h-4 w-4" />
                  {isTr ? "Uluslararasi mezun muafiyeti" : isZh ? "国际毕业生豁免" : "International graduate exemption"}
                </div>
                <p className="text-sm text-sky-900 dark:text-sky-100">{l(aipData.candidate_eligibility.exemptions.international_graduates)}</p>
              </div>

              <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                  <ShieldCheck className="h-4 w-4" />
                  {isTr ? "Saglik sektoru kurali" : isZh ? "医疗行业规则" : "Healthcare sector rule"}
                </div>
                <p className="text-sm text-emerald-900 dark:text-emerald-100">{l(aipData.candidate_eligibility.exemptions.healthcare_sector)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ListChecks className="h-5 w-5 text-sky-600" />
                {isTr ? "Is Teklifi Kriterleri" : isZh ? "职位邀约标准" : "Job Offer Criteria"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                {aipData.job_offer_criteria.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sky-500" />
                    <span>{l(item)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileText className="h-5 w-5 text-sky-600" />
                {isTr ? "Portalda doldurulan dijital formlar" : isZh ? "门户电子表格" : "Digital portal forms"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                {aipData.required_forms.portal_digital_forms.map((form) => (
                  <li key={form.code} className="flex gap-3">
                    <span className="min-w-[80px] rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {form.code}
                    </span>
                    <span>{l(form.name)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileText className="h-5 w-5 text-sky-600" />
                {isTr ? "Yuklenecek PDF ve imzali beyanlar" : isZh ? "需上传的 PDF 与签字声明" : "Upload PDFs and signed declarations"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                {aipData.required_forms.portal_upload_pdfs.map((form) => (
                  <li key={form.code} className="flex gap-3">
                    <span className="min-w-[80px] rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {form.code}
                    </span>
                    <span>{l(form.name)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Globe2 className="h-5 w-5 text-sky-600" />
                {isTr ? "Hukuk ve ceviri" : isZh ? "法律与翻译" : "Legal and translations"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                {aipData.legal_and_translations.rules.map((rule) => (
                  <li key={rule} className="flex gap-3">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sky-500" />
                    <span>{l(rule)}</span>
                  </li>
                ))}
              </ul>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{isTr ? "Alternatif format e-posta talebi" : isZh ? "替代格式申请邮箱" : "Alternate format request email"}</p>
                <p className="mt-2 break-all text-sm text-slate-600 dark:text-slate-300">{aipData.legal_and_translations.alternate_format_request.email}</p>
                <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">{isTr ? "Konu satiri" : isZh ? "主题行" : "Subject line"}</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{l(aipData.legal_and_translations.alternate_format_request.subject_line)}</p>
                <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">{isTr ? "Talimatlar" : isZh ? "说明" : "Instructions"}</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{l(aipData.legal_and_translations.alternate_format_request.instructions)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Building2 className="h-5 w-5 text-sky-600" />
                {isTr ? "Isveren yetkilendirme gereklilikleri" : isZh ? "雇主指定要求" : "Employer designation requirements"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                {aipData.employer_requirements.designation_criteria.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sky-500" />
                    <span>{l(item)}</span>
                  </li>
                ))}
              </ul>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{isTr ? "Zorunlu onboarding" : isZh ? "强制入职培训" : "Mandatory onboarding"}</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{l(aipData.employer_requirements.mandatory_training.onboarding)}</p>
                <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">{isTr ? "Kulturlerarasi yetkinlik" : isZh ? "跨文化能力" : "Intercultural competency"}</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{l(aipData.employer_requirements.mandatory_training.intercultural_competency)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-xl">{isTr ? "Ingilizce kulturlerarasi egitim saglayicilari" : isZh ? "英语跨文化培训机构" : "English intercultural training providers"}</CardTitle>
            </CardHeader>
            <CardContent>
              <ProviderTable
                providers={aipData.employer_requirements.english_service_providers}
                orgLabel={isTr ? "Kurum" : isZh ? "机构" : "Organization"}
                provinceLabel={isTr ? "Eyalet" : isZh ? "省份" : "Province"}
                areasLabel={isTr ? "Hizmet alanlari" : isZh ? "服务区域" : "Areas served"}
                contactLabel={isTr ? "Iletisim" : isZh ? "联系方式" : "Contact"}
              />
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-xl">{isTr ? "Fransizca kulturlerarasi egitim saglayicilari" : isZh ? "法语跨文化培训机构" : "French intercultural training providers"}</CardTitle>
            </CardHeader>
            <CardContent>
              <ProviderTable
                providers={aipData.employer_requirements.french_service_providers}
                orgLabel={isTr ? "Kurum" : isZh ? "机构" : "Organization"}
                provinceLabel={isTr ? "Eyalet" : isZh ? "省份" : "Province"}
                areasLabel={isTr ? "Hizmet alanlari" : isZh ? "服务区域" : "Areas served"}
                contactLabel={isTr ? "Iletisim" : isZh ? "联系方式" : "Contact"}
              />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ListChecks className="h-5 w-5 text-sky-600" />
                {isTr ? "Endorsement asamasi" : isZh ? "背书阶段" : "Endorsement phase"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                {aipData.process_steps.endorsement_phase.map((item, index) => (
                  <li key={item} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-800 dark:bg-sky-500/15 dark:text-sky-100">
                      {index + 1}
                    </span>
                    <span>{l(item)}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ListChecks className="h-5 w-5 text-sky-600" />
                {isTr ? "Gocmenlik asamasi" : isZh ? "移民阶段" : "Immigration phase"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                {aipData.process_steps.immigration_phase.map((item, index) => (
                  <li key={item} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-800 dark:bg-sky-500/15 dark:text-sky-100">
                      {index + 1}
                    </span>
                    <span>{l(item)}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}