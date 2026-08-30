import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Clock3,
  DollarSign,
  ExternalLink,
  FileWarning,
  ListChecks,
  Scale,
  Sparkles,
  Users,
} from "lucide-react";

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

type FormEntry = { code: string; name: string };

type FamilySponsorshipData = {
  id?: string;
  program_name?: string;
  status?: string;
  fees?: string;
  processing_time?: string;
  pdfSnapshotUrls?: string[];
  overview?: string;
  sponsorship_undertaking?: {
    definition?: string;
    durations_outside_quebec?: Array<{ person: string; length: string }>;
    quebec_rule?: string;
  };
  sponsor_eligibility?: {
    positive_criteria?: string[];
    income_requirement?: string;
    negative_criteria?: string[];
  };
  sponsored_person_types?: {
    spouse?: { definition?: string };
    common_law_partner?: { definition?: string };
    conjugal_partner?: { definition?: string };
    dependent_child?: { definition?: string; custody_and_declaration_rules?: string[] };
  };
  how_to_apply_steps?: string[];
  required_forms?: {
    portal_digital_forms?: FormEntry[];
    portal_upload_forms?: FormEntry[];
  };
  open_work_permit_policy?: {
    eligibility_criteria?: string[];
    ineligibility?: string[];
    visitor_visa_acceleration?: string;
  };
  after_apply_and_decisions?: {
    processing_mechanisms?: string[];
    approval_and_refusal_outcomes?: string[];
    withdrawal_and_refunds?: string[];
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

function getData(): FamilySponsorshipData {
  const data = (visaDetails as FamilySponsorshipData[]).find(
    (item) => item.id === "canada-family-sponsorship"
  );
  if (!data) {
    throw new Error("canada-family-sponsorship entry missing from visa-details.json");
  }
  return data;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const data = getData();
  const title = `${data.program_name ?? "Canada Family Sponsorship"} | LogiVisa`;

  return {
    metadataBase: new URL(BASE_URL),
    title,
    description: data.overview ?? "Sponsor your spouse, partner or child for Canadian permanent residence.",
    alternates: {
      canonical: `/${locale}/visas/canada-family-sponsorship`,
      languages: {
        en: `/en/visas/canada-family-sponsorship`,
        tr: `/tr/visas/canada-family-sponsorship`,
        "zh-Hans": `/zh-Hans/visas/canada-family-sponsorship`,
      },
    },
  };
}

export default async function CanadaFamilySponsorshipPage({ params }: PageProps) {
  const { locale } = await params;
  const translations = await getTranslations(locale as Locale);
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const data = getData();

  const title = isTr
    ? "Kanada Aile Sponsorluğu (Eş, Partner veya Çocuk)"
    : isZh
      ? "加拿大家庭担保（配偶、伴侣或子女）"
      : "Canada Family Sponsorship (Spouse, Partner or Child)";
  const subtitle = isTr
    ? "Sponsorluk yükümlülüğü, uygunluk kuralları, gerekli formlar ve açık çalışma izni yolunu tek bir detay sayfasında görün."
    : isZh
      ? "在一个详情页中查看担保承诺、资格规则、所需表格以及开放式工作许可路径。"
      : "See the sponsorship undertaking, eligibility rules, required forms, and open work permit pathway in one detailed page.";

  const checkEligibilityLabel = t(translations, "visas.checkEligibility", "Check your eligibility");
  const visitOfficialWebsiteLabel = t(translations, "visas.visitOfficialWebsite", "Visit official website");
  const backToVisasLabel = t(translations, "visas.backToVisas", "Back to visas");
  const officialInfoLabel = t(translations, "visas.officialInfo", "Official Information");

  const undertaking = data.sponsorship_undertaking ?? {};
  const sponsorEligibility = data.sponsor_eligibility ?? {};
  const personTypes = data.sponsored_person_types ?? {};
  const howToApplySteps = data.how_to_apply_steps ?? [];
  const requiredForms = data.required_forms ?? {};
  const owpPolicy = data.open_work_permit_policy ?? {};
  const afterApply = data.after_apply_and_decisions ?? {};
  const pdfUrls = data.pdfSnapshotUrls ?? [];
  const trMap: Record<string, string> = {
    "Family Sponsorship": "Aile Sponsorlugu",
    Open: "Acik",
    "Sponsor a spouse or partner: from $1,260 (Increased April 30, 2026) | Sponsor a child: from $180 (Increased April 30, 2026)": "Es veya partner sponsorluğu: $1,260'dan baslar (30 Nisan 2026 artisi) | Cocuk sponsorluğu: $180'dan baslar (30 Nisan 2026 artisi)",
    "Varies by complexity (Check tracker after receiving AOR)": "Dosya karmasikligina gore degisir (AOR sonrasi takip edin)",
    "A comprehensive program to sponsor your spouse, common-law partner, conjugal partner or dependent child to become a permanent resident of Canada. Sponsors must commit to financially supporting the sponsored individuals so they do not require social assistance from the government.": "Esinizi, fiili partnerinizi, birliktelik partnerinizi veya bagimli cocugunuzu Kanada'da daimi oturum sahibi yapmak icin kapsamli sponsorluk programi. Sponsor, destekledigi kisilerin devletten sosyal yardim almamasi icin mali destek taahhudu verir.",
    "A binding contract where the sponsor commits to financially support the sponsored people starting when they become permanent residents. If they receive social assistance, the sponsor must repay the government in full before sponsoring anyone else. Undertaking CANNOT be cancelled or shortened even if citizenship is gained, financial problems arise, or the relationship ends.": "Sponsorun, destekledigi kisiler daimi oturum aldigi andan itibaren mali destek vermeyi taahhut ettigi baglayici sozlesme. Sosyal yardim alinirsa sponsor yeni birine sponsor olmadan once devlete tam geri odeme yapar. Taahhut; vatandaslik kazanilsa, mali sorun ciksada veya iliski bitse de iptal edilemez ya da kisaltilamaz.",
    "Spouse, common-law partner or conjugal partner": "Es, fiili partner veya birliktelik partneri",
    "Dependent child 22 years of age and older": "22 yas ve uzeri bagimli cocuk",
    "Dependent child under 22 years of age": "22 yas alti bagimli cocuk",
    "10 years or until the child becomes 25 years of age, whichever comes first (age measured on date they become PR)": "10 yil veya cocuk 25 yasina ulasana kadar (hangisi onceyse; yas PR tarihi esas alinir)",
    "3 years": "3 yil",
    "Sponsors living in Quebec must sign a separate undertaking with the Government of Quebec. Do not submit the application to Quebec until instructed by IRCC, otherwise it will not be processed.": "Quebec'te yasayan sponsorlar Quebec Hukumeti ile ayri bir taahhut imzalamalidir. IRCC yonlendirmeden Quebec'e basvuru gondermeyin; aksi halde isleme alinmaz.",
    "In most cases, there is no income requirement to sponsor a spouse, partner, or child. Income proof via Financial Evaluation Form (IMM 1283) is ONLY required if: 1) You are sponsoring a dependent child who has 1 or more dependent children of their own, OR 2) You are sponsoring a spouse/partner who has a dependent child, and that child has 1 or more dependent children of their own.": "Cogu durumda es/partner/cocuk sponsorlugunda gelir sarti yoktur. Gelir kaniti (IMM 1283) yalnizca su durumlarda gerekir: 1) Kendi bagimli cocugu olan bir bagimli cocugu sponsor ediyorsaniz, VEYA 2) Bagimli cocugu olan bir es/partneri sponsor ediyor ve o cocugun da bir veya daha fazla bagimli cocugu varsa.",
    "Create an account or sign in to the online Permanent Residence (PR) Portal.": "Online Daimi Oturum (PR) Portalinda hesap olusturun veya giris yapin.",
    "Get country-specific forms and instructions based on where the sponsored person lives, along with the Document Checklist.": "Sponsor edilen kisinin yasadigi ulkeye gore formlari, talimatlari ve Belge Kontrol Listesini alin.",
    "Generic Application Form for Canada": "Kanada Genel Basvuru Formu",
    "Schedule A – Background/Declaration": "Ek A - Gecmis/Beyan",
    "Additional Family Information": "Ek Aile Bilgileri",
    "Supplementary Information - Your travels": "Ek Bilgi - Seyahatleriniz",
    "Document Checklist tailored to applicant's region": "Basvuru sahibinin bolgesine gore uyarlanmis Belge Kontrol Listesi",
    "Use of a Representative (Required if using a paid/unpaid representative. Paid must be authorized. Representatives cannot sign or open portals for the applicant; applicant must type their own name for legal signature)": "Temsilci Kullanimi (Ucretli/ucretsiz temsilci varsa zorunlu. Ucretli temsilci yetkili olmalidir. Temsilci basvuru sahibi adina imzalayamaz veya portal acamaz; yasal imza icin adini basvuru sahibi bizzat yazar)",
    "Authority to Release Personal Information to a Designated Individual (Required if releasing info to a non-representative)": "Belirlenmis Kisiye Kisisel Bilgi Aciklama Yetkisi (Bilgi temsilci olmayan kisiye aciklanacaksa zorunlu)",
    "Statutory Declaration of Common-law Union (Required for common-law couples, must be hand-signed with 1-year joint proof like bank statements, leases, utility bills)": "Fiili Birliktelik Yasal Beyani (Fiili birliktelik ciftleri icin zorunlu; banka dokumu, kira sozlesmesi, fatura gibi 1 yillik ortak kanitla el yazisi imza gerekir)",
    "Separation Declaration for Minors Travelling to Canada (Required if a minor child travels without both parents; must be hand-signed by non-accompanying parent before a notary public. Exempt if sole custody court order or death certificate is provided)": "Kanada'ya Seyahat Eden Kucukler Icin Ayrilik Beyani (Kucuk cocuk iki ebeveyn olmadan seyahat ediyorsa zorunlu; eslik etmeyen ebeveyn noterde imzalamalidir. Tek velayet karari veya olum belgesi varsa muaf)",
    "Sponsor Your Spouse, Partner or Child - Official Guide (PDF)": "Esinizi, Partnerinizi veya Cocugunuzu Sponsor Edin - Resmi Rehber (PDF)",
    "This guide is stored on Vercel Blob and mirrors the official Canada.ca process snapshot used by the app.": "Bu rehber Vercel Blob'da saklanir ve uygulamanin kullandigi resmi Canada.ca surec anlik goruntusunu yansitir.",
    "Must be at least 18 years old.": "En az 18 yasinda olmalidir.",
    "Must be a Canadian citizen, a permanent resident of Canada, or a person registered under the Canadian Indian Act.": "Kanada vatandasi, Kanada daimi oturumu sahibi veya Canadian Indian Act kapsaminda kayitli kisi olmalidir.",
    "Must live in Canada (Canadian citizens living outside Canada must show plans to live in Canada when the sponsored person becomes PR; Permanent residents living outside Canada CANNOT sponsor).": "Kanada'da yasamalidir (Kanada disinda yasayan vatandaslar, sponsor edilen kisi PR oldugunda Kanada'da yasama planini gostermelidir; Kanada disinda yasayan daimi oturum sahipleri sponsor olamaz).",
    "Must commit to supporting the people by signing the undertaking and sponsorship agreement.": "Taahhut ve sponsorluk sozlesmesini imzalayarak destek saglamayi kabul etmelidir.",
    "Were sponsored by a spouse/partner and became a PR less than 5 years ago.": "Es/partner sponsorlugu ile PR olduysaniz ve bunun uzerinden 5 yil gecmediyse.",
    "Sponsored a previous spouse/partner and less than 3 years have passed since they became a PR.": "Onceki es/partner sponsorlugu yaptiysaniz ve onun PR olmasinin uzerinden 3 yil gecmediyse.",
    "Have an active, undecided sponsorship application for the same person.": "Ayni kisi icin henuz sonuclanmamis aktif sponsorluk basvurunuz varsa.",
    "Are in jail, prison, or a penitentiary.": "Cezaevi, hapishane veya infaz kurumundaysaniz.",
    "Are behind on payments for an immigration loan, a performance bond, or court-ordered family support payments like alimony or child support (Quebec exceptions apply).": "Gocmenlik kredisi, teminat bedeli veya nafaka/cocuk destegi gibi mahkeme karari odemelerde gecikmeniz varsa (Quebec istisnalari uygulanir).",
    "Failed to give agreed financial support for a previous sponsorship in the past (Quebec exceptions apply).": "Gecmiste onceki sponsorlukta taahhut edilen mali destegi saglamadiysaniz (Quebec istisnalari uygulanir).",
    "Declared bankruptcy and are not discharged yet (Quebec exceptions apply).": "Iflas aciklandiysa ve iflas kapatilip beraat edilmediyse (Quebec istisnalari uygulanir).",
    "Are receiving social assistance for a reason other than a disability.": "Engellilik disi bir nedenle sosyal yardim aliyorsaniz.",
    "Were convicted of a violent criminal offence, an offence against a relative causing bodily harm, or a sexual offence inside or outside Canada.": "Kanada icinde veya disinda siddet sucu, bir akrabaya karsi bedensel zarar sucu ya da cinsel suctan mahkumiyetiniz varsa.",
    "Are under a removal order and cannot legally stay in Canada.": "Sinir disi karari altindaysaniz ve Kanada'da yasal olarak kalamiyorsaniz.",
    "Legally married to the sponsor, at least 18 years old, can be any gender, must be in a genuine relationship not solely for permanent residence, must not be inadmissible.": "Sponsorla yasal evli olmalidir; en az 18 yasinda olabilir, cinsiyet fark etmez; iliski sadece daimi oturum amacli olmamali ve kabul edilemezlik durumu olmamalidir.",
    "Not legally married, at least 18 years old, can be any gender, in a genuine relationship, must have lived together continuously for at least 12 consecutive months without long periods apart (short family or business trips allowed). Relationship is legally over if either party chooses to end it.": "Yasal evli degilse; en az 18 yasinda olabilir, cinsiyet fark etmez; gercek bir iliski icinde olmali ve uzun ayriliklar olmadan en az 12 ay araliksiz birlikte yasamis olmalidir (kisa aile/is seyahatleri kabul edilir). Taraflardan biri bitirmeyi secerse iliski hukuken sona erer.",
    "Not legally married or common-law, at least 18 years old, can be any gender, in an exclusive and mutually interdependent relationship for at least 1 year (sharing life physically, emotionally, financially, socially). Must live OUTSIDE Canada and be unable to live together or marry due to legal/social/cultural/religious barriers (e.g., divorce banned, same-sex marriage illegal, or religious persecution).": "Yasal evli veya common-law degilse; en az 18 yasinda olabilir, cinsiyet fark etmez; en az 1 yil sureyle ozel ve karsilikli bagimli bir iliskide olmalidir (fiziksel, duygusal, mali ve sosyal hayat paylasimi). Kanada DISINDA yasamali ve hukuki/sosyal/kulturel/dini engeller nedeniyle birlikte yasayamiyor veya evlenemiyor olmalidir (ornegin bosanma yasagi, ayni cins evliligin yasadisi olmasi, dini baski).",
    "Biological or adopted child of the sponsor or spouse/partner. Must be under 22 years old and have no spouse or common-law partner. If 22 or older, they qualify ONLY if unable to financially support themselves due to a mental or physical condition AND have depended on parents for support since before age 22. Must meet these rules until processing completes.": "Sponsorun veya es/partnerin biyolojik ya da evlat edinilmis cocugu olmalidir. 22 yasindan kucuk olmali ve es/common-law partneri olmamalidir. 22 yas ve ustundeyse YALNIZCA zihinsel/fiziksel bir durum nedeniyle kendini mali olarak destekleyemiyorsa VE 22 yasindan once ebeveyn destegine bagimliysa uygun sayilir. Bu kurallar islem tamamlanana kadar saglanmalidir.",
    "If sponsoring a child alone without a spouse, the child is the principal applicant. Must provide proof that the other parent/guardian agrees to the immigration.": "Es olmadan tek basina cocuk sponsor ediliyorsa cocuk ana basvuru sahibidir. Diger ebeveyn/vasinin gocmenlige onay verdigini gosteren kanit sunulmalidir.",
    "If a child has a child of their own (grandchild), the grandchild MUST be declared as a dependant, whether coming to Canada or not.": "Bir cocugun kendi cocugu varsa (torun), torun Kanada'ya gelsin ya da gelmesin mutlaka bagimli olarak beyan edilmelidir.",
    "Sponsors must declare ALL children in existence, even those in the sole custody of an ex-spouse where no custody or responsibility remains. They must pass medical and background checks. Failure to declare any family member risks total loss of PR status.": "Sponsorlar, eski esin tek velayetindeki ve sorumlulugu kalmayanlar dahil tum cocuklari beyan etmelidir. Bu kisiler tibbi ve guvenlik kontrollerinden gecmelidir. Herhangi bir aile uyesini beyan etmemek PR statusunun tamamen kaybina yol acabilir.",
    "Canadian citizens born abroad cannot be sponsored for PR if they are already citizens by descent; check citizenship status first.": "Yurt disinda dogan Kanada vatandaslari, soy yoluyla zaten vatandassa PR icin sponsor edilemez; once vatandaslik durumunu kontrol edin.",
    "Understand that there are 2 concurrent applications: the Sponsorship Application (by the sponsor) and the Permanent Residence Application (by the principal applicant). Both must be submitted together online by the principal applicant.": "Eszamanli 2 basvuru oldugunu unutmayin: Sponsorluk Basvurusu (sponsor tarafindan) ve Daimi Oturum Basvurusu (ana basvuru sahibi tarafindan). Ikisi de ana basvuru sahibi tarafindan birlikte online sunulmalidir.",
    "Scan and upload both sides of 1 photo for the principal applicant and each family member, adhering strictly to online specifications (not older than 12 months).": "Ana basvuru sahibi ve her aile uyesi icin 1 fotografin iki yuzunu de tarayip yukleyin; online teknik kosullara tam uyun (12 aydan eski olmamali).",
    "Pay all application fees online (Sponsor fee, principal applicant processing fee, Right of Permanent Residence Fee, and Biometrics fee) and upload the receipt. Optional third-party fees apply for medicals and police checks.": "Tum basvuru ucretlerini online odeyin (sponsor ucreti, ana basvuru sahibi islem ucreti, Daimi Oturum Hakki ucreti ve biyometri ucreti) ve makbuzu yukleyin. Saglik muayenesi ve polis kaydi icin istege bagli ucuncu taraf ucretleri uygulanir.",
    "Review all digital forms for complete and truthful answers. The principal applicant must electronically sign the application by typing their full name exactly as shown in the passport.": "Tum dijital formlari eksiksiz ve dogru yanitlarla gozden gecirin. Ana basvuru sahibi pasaporttaki adini-soyadini aynen yazarak elektronik imza atmalidir.",
    "Submit the completed application. If incomplete or missing fees, the application will be rejected and returned for resubmission.": "Tamamlanan basvuruyu gonderin. Eksik bilgi veya ucret varsa basvuru reddedilir ve yeniden gonderim icin iade edilir.",
    "Sponsorship Agreement and Undertaking form specifying everyday and health needs (Not signed by children under 22)": "Gunluk yasam ve saglik ihtiyaclarini belirten Sponsorluk Sozlesmesi ve Taahhut formu (22 yas altindaki cocuklar imzalamaz)",
    "Must be a spouse, common-law partner, or conjugal partner living in Canada who is being sponsored for permanent residence, OR an accompanying dependent child.": "Kanada'da yasayan ve daimi oturum icin sponsor edilen es, common-law partner veya conjugal partner olmalidir YA DA eslik eden bagimli cocuk olmalidir.",
    "Must be living in Canada with the sponsor in a genuine relationship.": "Sponsorla birlikte Kanada'da gercek bir iliski icinde yasiyor olmalidir.",
    "Must have received an official Acknowledgement of Receipt (AOR) letter from IRCC confirming the PR application is currently in progress.": "PR basvurusunun islemde oldugunu dogrulayan resmi IRCC AOR (alinma teyidi) mektubu alinmis olmalidir.",
    "Must hold valid temporary resident status (valid visitor record, work permit, study permit, temporary resident permit, or have maintained status/applied for restoration).": "Gecerli gecici oturum statusu bulunmalidir (gecerli ziyaretci kaydi, calisma izni, ogrenim izni, gecici oturum izni veya statusu korumus/yeniden tesise basvurmus olmak).",
    "Cannot apply if the PR application has been refused, withdrawn, or returned.": "PR basvurusu reddedildiyse, geri cekildiyse veya iade edildiyse basvurulamaz.",
    "Cannot apply for this specific open work permit at a port of entry (must apply online).": "Bu ozel acik calisma iznine sinir kapisindan basvurulamaz (online basvuru zorunlu).",
    "Spouses or partners outside Canada can apply for a visitor visa while waiting. If they have the PR AOR letter, their visitor visa application is eligible for faster automated/electronic processing to help them join their sponsor in Canada early.": "Kanada disindaki es veya partnerler beklerken ziyaretci vizesine basvurabilir. PR AOR mektubu varsa, ziyaretci vizesi basvurulari Kanada'daki sponsora daha erken katilim icin daha hizli otomatik/elektronik isleme uygun olur.",
    "IRCC may use electronic methods, automated systems, and computer analytics to help process applications, manage risk, and evaluate compliance using personal data.": "IRCC, basvurulari islemek, riski yonetmek ve uyumu degerlendirmek icin kisisel verilerle elektronik yontemler, otomatik sistemler ve bilgisayar analizleri kullanabilir.",
    "Upon complete review, IRCC sends the application number and AOR, and triggers mandatory biometrics instructions (30 days deadline to visit an in-person collection site) and medical exams.": "Tam inceleme sonrasinda IRCC basvuru numarasi ve AOR gonderir; zorunlu biyometri talimatlarini (yuz yuze merkez icin 30 gun sure) ve saglik muayenesini baslatir.",
    "If living in Quebec, the PR application remains in inventory until the MIFI undertaking is secured; PR cannot be finalized without it.": "Quebec'te yasaniyorsa MIFI taahhudu alinana kadar PR basvurusu beklemede kalir; bu olmadan PR sonuclandirilamaz.",
    "If the sponsor is approved, IRCC moves to evaluate the applicant. If the sponsor is refused, the application proceeds or withdraws based on the initial check-box choice (Withdrawal refunds PR fees but forfeits the sponsorship fee; Continuing gives no refunds and zero approval guarantees).": "Sponsor onaylanirsa IRCC basvuru sahibini degerlendirmeye gecer. Sponsor reddedilirse basvuru, ilk kutucuk secimine gore devam eder veya geri cekilir (Geri cekmede PR ucretleri iade edilir ama sponsorluk ucreti yanar; Devam secenegi iade saglamaz ve onay garantisi vermez).",
    "Upon final PR approval for outside-Canada applicants: Confirmation of Permanent Residence (COPR) and a PR visa stamp are issued. Must enter Canada before the document expiry date shown.": "Kanada disindan basvuranlar icin nihai PR onayinda Daimi Oturum Onayi (COPR) ve PR vize pulu verilir. Belgede yazan son kullanma tarihinden once Kanada'ya giris yapilmalidir.",
    "Upon final PR approval for inside-Canada applicants: Status is confirmed online via the PR Portal, or an in-person interview is scheduled.": "Kanada icinden basvuranlar icin nihai PR onayinda durum PR Portali uzerinden online teyit edilir veya yuz yuze gorusme planlanir.",
    "Refusal of inside-Canada class applications (spouse or common-law partner in Canada class) CANNOT be appealed.": "Kanada ici sinif basvurularinin reddi (Kanada ici es veya common-law partner sinifi) icin itiraz hakki YOKTUR.",
    "Sponsorship can be withdrawn at any time before the applicant officially becomes a PR via the IRCC web form (requires full name, DOB, country of birth, application number, UCI, and signed withdrawal request letter).": "Basvuru sahibi resmi olarak PR olmadan once sponsorluk IRCC web formu uzerinden her zaman geri cekilebilir (ad-soyad, dogum tarihi, dogum ulkesi, basvuru numarasi, UCI ve imzali geri cekme dilekcesi gerekir).",
    "Right of Permanent Residence Fee is refundable if withdrawn or refused (requires declining right of appeal first; processes in 2-8 weeks).": "Daimi Oturum Hakki ucreti geri cekme veya red durumunda iade edilir (once itiraz hakkindan feragat gerekir; islem 2-8 hafta surer)."
  };
  const zhMap: Record<string, string> = {
    "Family Sponsorship": "家庭担保",
    Open: "开放",
    "Sponsor a spouse or partner: from $1,260 (Increased April 30, 2026) | Sponsor a child: from $180 (Increased April 30, 2026)": "担保配偶/伴侣：$1,260 起（2026-04-30 上调）| 担保子女：$180 起（2026-04-30 上调）",
    "Varies by complexity (Check tracker after receiving AOR)": "视个案复杂度而定（收到 AOR 后查看进度）",
    "A comprehensive program to sponsor your spouse, common-law partner, conjugal partner or dependent child to become a permanent resident of Canada. Sponsors must commit to financially supporting the sponsored individuals so they do not require social assistance from the government.": "用于担保配偶、事实伴侣、婚姻伴侣或受抚养子女成为加拿大永久居民的综合项目。担保人必须承诺提供经济支持，确保被担保人不依赖政府社会救助。",
    "A binding contract where the sponsor commits to financially support the sponsored people starting when they become permanent residents. If they receive social assistance, the sponsor must repay the government in full before sponsoring anyone else. Undertaking CANNOT be cancelled or shortened even if citizenship is gained, financial problems arise, or the relationship ends.": "具有法律约束力的承诺：自被担保人成为永久居民起，担保人需承担其经济支持义务。若被担保人领取社会救助，担保人在再次担保他人前须全额偿还政府。该承诺即使取得国籍、发生财务问题或关系结束也不能取消或缩短。",
    "Spouse, common-law partner or conjugal partner": "配偶、事实伴侣或婚姻伴侣",
    "Dependent child 22 years of age and older": "22 岁及以上受抚养子女",
    "Dependent child under 22 years of age": "22 岁以下受抚养子女",
    "10 years or until the child becomes 25 years of age, whichever comes first (age measured on date they become PR)": "10 年或至子女满 25 岁（以先到者为准；年龄以成为 PR 当日计算）",
    "3 years": "3 年",
    "Sponsors living in Quebec must sign a separate undertaking with the Government of Quebec. Do not submit the application to Quebec until instructed by IRCC, otherwise it will not be processed.": "居住在魁北克的担保人必须与魁北克政府签署单独承诺。未收到 IRCC 指示前不要向魁北克提交申请，否则不会受理。",
    "In most cases, there is no income requirement to sponsor a spouse, partner, or child. Income proof via Financial Evaluation Form (IMM 1283) is ONLY required if: 1) You are sponsoring a dependent child who has 1 or more dependent children of their own, OR 2) You are sponsoring a spouse/partner who has a dependent child, and that child has 1 or more dependent children of their own.": "多数情况下担保配偶/伴侣/子女无收入门槛。仅在以下情况需要通过 IMM 1283 提供收入证明：1）你担保的受抚养子女其本人还有 1 名或以上受抚养子女；或 2）你担保的配偶/伴侣有受抚养子女，且该子女还有 1 名或以上受抚养子女。",
    "Create an account or sign in to the online Permanent Residence (PR) Portal.": "在永久居留（PR）在线门户创建账户或登录。",
    "Get country-specific forms and instructions based on where the sponsored person lives, along with the Document Checklist.": "根据被担保人居住国家获取对应表格、指引及文件清单。",
    "Generic Application Form for Canada": "加拿大通用申请表",
    "Schedule A – Background/Declaration": "附表 A - 背景/声明",
    "Additional Family Information": "补充家庭信息",
    "Supplementary Information - Your travels": "补充信息 - 您的旅行记录",
    "Document Checklist tailored to applicant's region": "按申请人地区定制的文件清单",
    "Use of a Representative (Required if using a paid/unpaid representative. Paid must be authorized. Representatives cannot sign or open portals for the applicant; applicant must type their own name for legal signature)": "使用代理人（如使用收费/不收费代理人则必填。收费代理人必须具备授权。代理人不能代签或代开门户；申请人必须亲自输入姓名完成法律签署）",
    "Authority to Release Personal Information to a Designated Individual (Required if releasing info to a non-representative)": "向指定个人披露个人信息授权（向非代理人披露信息时必填）",
    "Statutory Declaration of Common-law Union (Required for common-law couples, must be hand-signed with 1-year joint proof like bank statements, leases, utility bills)": "事实同居关系法定声明（事实同居伴侣必填，须手写签字并附 1 年联名证明，如银行流水、租约、水电账单）",
    "Separation Declaration for Minors Travelling to Canada (Required if a minor child travels without both parents; must be hand-signed by non-accompanying parent before a notary public. Exempt if sole custody court order or death certificate is provided)": "未成年人赴加分离声明（如未成年人非由双亲同行则必填；不随行父母须在公证人面前手签。若已提供单独监护法院令或死亡证明可豁免）",
    "Sponsor Your Spouse, Partner or Child - Official Guide (PDF)": "担保您的配偶、伴侣或子女 - 官方指南（PDF）",
    "This guide is stored on Vercel Blob and mirrors the official Canada.ca process snapshot used by the app.": "本指南存储在 Vercel Blob，并映射应用使用的官方 Canada.ca 流程快照。",
    "Must be at least 18 years old.": "必须年满 18 岁。",
    "Must be a Canadian citizen, a permanent resident of Canada, or a person registered under the Canadian Indian Act.": "必须是加拿大公民、加拿大永久居民，或依据《加拿大印第安人法》登记的人士。",
    "Must live in Canada (Canadian citizens living outside Canada must show plans to live in Canada when the sponsored person becomes PR; Permanent residents living outside Canada CANNOT sponsor).": "必须居住在加拿大（居住在境外的加拿大公民须证明被担保人成为 PR 后将回加拿大居住；居住在境外的永久居民不能担保）。",
    "Must commit to supporting the people by signing the undertaking and sponsorship agreement.": "必须签署担保承诺与担保协议，承诺提供生活支持。",
    "Were sponsored by a spouse/partner and became a PR less than 5 years ago.": "曾通过配偶/伴侣担保获得 PR 且未满 5 年。",
    "Sponsored a previous spouse/partner and less than 3 years have passed since they became a PR.": "曾担保前配偶/伴侣且其成为 PR 未满 3 年。",
    "Have an active, undecided sponsorship application for the same person.": "对同一人有尚未结案的在审担保申请。",
    "Are in jail, prison, or a penitentiary.": "目前处于监狱、看守所或刑罚执行机构中。",
    "Are behind on payments for an immigration loan, a performance bond, or court-ordered family support payments like alimony or child support (Quebec exceptions apply).": "拖欠移民贷款、履约保证金或法院判令的家庭抚养费（如赡养费/子女抚养费）（魁北克有例外）。",
    "Failed to give agreed financial support for a previous sponsorship in the past (Quebec exceptions apply).": "过去未履行先前担保中约定的经济支持义务（魁北克有例外）。",
    "Declared bankruptcy and are not discharged yet (Quebec exceptions apply).": "已申请破产且尚未解除（魁北克有例外）。",
    "Are receiving social assistance for a reason other than a disability.": "因非残障原因正在领取社会救助。",
    "Were convicted of a violent criminal offence, an offence against a relative causing bodily harm, or a sexual offence inside or outside Canada.": "在加拿大境内或境外曾被判犯有暴力犯罪、对亲属造成身体伤害的犯罪或性犯罪。",
    "Are under a removal order and cannot legally stay in Canada.": "处于遣返令之下，无法在加拿大合法居留。",
    "Legally married to the sponsor, at least 18 years old, can be any gender, must be in a genuine relationship not solely for permanent residence, must not be inadmissible.": "与担保人合法结婚，年满 18 岁，性别不限；关系必须真实且不以获取永久居民身份为唯一目的，并且不得属于不可入境。",
    "Not legally married, at least 18 years old, can be any gender, in a genuine relationship, must have lived together continuously for at least 12 consecutive months without long periods apart (short family or business trips allowed). Relationship is legally over if either party chooses to end it.": "未合法结婚，年满 18 岁，性别不限，关系真实；须连续同居至少 12 个月且无长期分离（允许短期探亲/出差）。任一方决定结束关系即构成法律意义上的终止。",
    "Not legally married or common-law, at least 18 years old, can be any gender, in an exclusive and mutually interdependent relationship for at least 1 year (sharing life physically, emotionally, financially, socially). Must live OUTSIDE Canada and be unable to live together or marry due to legal/social/cultural/religious barriers (e.g., divorce banned, same-sex marriage illegal, or religious persecution).": "既非合法婚姻也非事实同居，年满 18 岁，性别不限；须处于至少 1 年的排他且相互依赖关系（在身体、情感、经济、社会层面共同生活）。必须居住在加拿大境外，且因法律/社会/文化/宗教障碍无法同居或结婚（如禁止离婚、同性婚姻违法或宗教迫害）。",
    "Biological or adopted child of the sponsor or spouse/partner. Must be under 22 years old and have no spouse or common-law partner. If 22 or older, they qualify ONLY if unable to financially support themselves due to a mental or physical condition AND have depended on parents for support since before age 22. Must meet these rules until processing completes.": "担保人或其配偶/伴侣的亲生或收养子女。须未满 22 岁且无配偶或事实伴侣。若已满 22 岁，仅在因身心状况无法经济独立且自 22 岁前即依赖父母支持的情况下才符合。上述条件须持续满足至审理完成。",
    "If sponsoring a child alone without a spouse, the child is the principal applicant. Must provide proof that the other parent/guardian agrees to the immigration.": "若在无配偶情况下单独担保子女，子女为主申请人。须提供另一位父母/监护人同意移民的证明。",
    "If a child has a child of their own (grandchild), the grandchild MUST be declared as a dependant, whether coming to Canada or not.": "若该子女本身有子女（即孙辈），无论是否随行加拿大，都必须申报为受抚养人。",
    "Sponsors must declare ALL children in existence, even those in the sole custody of an ex-spouse where no custody or responsibility remains. They must pass medical and background checks. Failure to declare any family member risks total loss of PR status.": "担保人必须申报所有在世子女，包括由前配偶单独监护且本人已无监护/责任者。相关人员须通过体检和背景审查。未申报任何家庭成员都可能导致 PR 资格完全丧失。",
    "Canadian citizens born abroad cannot be sponsored for PR if they are already citizens by descent; check citizenship status first.": "在海外出生的加拿大公民若已通过血统取得国籍，则不能再被担保申请 PR；请先确认国籍状态。",
    "Understand that there are 2 concurrent applications: the Sponsorship Application (by the sponsor) and the Permanent Residence Application (by the principal applicant). Both must be submitted together online by the principal applicant.": "请注意有 2 份并行申请：担保申请（由担保人提交）和永久居民申请（由主申请人提交）。两者必须由主申请人在线一并提交。",
    "Scan and upload both sides of 1 photo for the principal applicant and each family member, adhering strictly to online specifications (not older than 12 months).": "为主申请人及每位家庭成员扫描并上传 1 张照片的正反面，严格符合在线规格（照片不得超过 12 个月）。",
    "Pay all application fees online (Sponsor fee, principal applicant processing fee, Right of Permanent Residence Fee, and Biometrics fee) and upload the receipt. Optional third-party fees apply for medicals and police checks.": "在线支付全部申请费用（担保费、主申请人处理费、永久居民权利费、生物信息费）并上传收据。体检和无犯罪证明可能产生第三方费用。",
    "Review all digital forms for complete and truthful answers. The principal applicant must electronically sign the application by typing their full name exactly as shown in the passport.": "检查所有电子表格，确保信息完整且真实。主申请人须按护照显示的全名准确输入以完成电子签名。",
    "Submit the completed application. If incomplete or missing fees, the application will be rejected and returned for resubmission.": "提交完整申请。如信息不全或缺少费用，申请将被拒收并退回重提。",
    "Sponsorship Agreement and Undertaking form specifying everyday and health needs (Not signed by children under 22)": "说明日常与健康需求的担保协议及担保承诺表（22 岁以下子女无需签字）",
    "Must be a spouse, common-law partner, or conjugal partner living in Canada who is being sponsored for permanent residence, OR an accompanying dependent child.": "必须是居住在加拿大、正在申请永久居民担保的配偶/事实伴侣/婚姻伴侣，或随行受抚养子女。",
    "Must be living in Canada with the sponsor in a genuine relationship.": "必须与担保人在加拿大共同居住且关系真实。",
    "Must have received an official Acknowledgement of Receipt (AOR) letter from IRCC confirming the PR application is currently in progress.": "必须已收到 IRCC 官方 AOR（收件确认）函，证明 PR 申请正在处理中。",
    "Must hold valid temporary resident status (valid visitor record, work permit, study permit, temporary resident permit, or have maintained status/applied for restoration).": "必须持有有效临时居民身份（有效访客记录、工签、学签、临时居民许可，或已维持身份/申请恢复身份）。",
    "Cannot apply if the PR application has been refused, withdrawn, or returned.": "若 PR 申请已被拒、已撤回或已退回，则不能申请。",
    "Cannot apply for this specific open work permit at a port of entry (must apply online).": "此类开放式工签不能在入境口岸申请（必须在线申请）。",
    "Spouses or partners outside Canada can apply for a visitor visa while waiting. If they have the PR AOR letter, their visitor visa application is eligible for faster automated/electronic processing to help them join their sponsor in Canada early.": "在加拿大境外的配偶/伴侣可在等待期间申请访客签证。若已持有 PR AOR，其访客签证可适用更快的自动化/电子审理，以便尽早赴加与担保人团聚。",
    "IRCC may use electronic methods, automated systems, and computer analytics to help process applications, manage risk, and evaluate compliance using personal data.": "IRCC 可能使用电子方式、自动化系统和计算机分析，结合个人数据处理申请、管理风险并评估合规性。",
    "Upon complete review, IRCC sends the application number and AOR, and triggers mandatory biometrics instructions (30 days deadline to visit an in-person collection site) and medical exams.": "完成完整审查后，IRCC 将发送申请号和 AOR，并启动强制生物信息采集指引（30 天内前往现场采集点）及体检流程。",
    "If living in Quebec, the PR application remains in inventory until the MIFI undertaking is secured; PR cannot be finalized without it.": "若居住在魁北克，在取得 MIFI 承诺前 PR 申请将保持待处理；无此承诺无法最终获批 PR。",
    "If the sponsor is approved, IRCC moves to evaluate the applicant. If the sponsor is refused, the application proceeds or withdraws based on the initial check-box choice (Withdrawal refunds PR fees but forfeits the sponsorship fee; Continuing gives no refunds and zero approval guarantees).": "若担保人获批，IRCC 将继续评估申请人。若担保人被拒，申请将按最初勾选选择继续或撤回（撤回可退 PR 费用但不退担保费；继续不退款且不保证获批）。",
    "Upon final PR approval for outside-Canada applicants: Confirmation of Permanent Residence (COPR) and a PR visa stamp are issued. Must enter Canada before the document expiry date shown.": "境外申请人最终获批 PR 后：将签发永久居民确认书（COPR）和 PR 签证贴纸。必须在文件显示的到期日前入境加拿大。",
    "Upon final PR approval for inside-Canada applicants: Status is confirmed online via the PR Portal, or an in-person interview is scheduled.": "境内申请人最终获批 PR 后：可通过 PR 门户在线确认身份，或安排线下面谈。",
    "Refusal of inside-Canada class applications (spouse or common-law partner in Canada class) CANNOT be appealed.": "加拿大境内类别申请被拒（境内配偶/事实伴侣类别）不可上诉。",
    "Sponsorship can be withdrawn at any time before the applicant officially becomes a PR via the IRCC web form (requires full name, DOB, country of birth, application number, UCI, and signed withdrawal request letter).": "在申请人正式成为 PR 前，可随时通过 IRCC 网页表单撤回担保（需提供姓名全称、出生日期、出生国家、申请号、UCI 及签字撤回申请信）。",
    "Right of Permanent Residence Fee is refundable if withdrawn or refused (requires declining right of appeal first; processes in 2-8 weeks).": "若撤回或被拒，永久居民权利费可退（需先放弃上诉权；处理约 2-8 周）。"
  };
  const l = (value?: string) => {
    if (!value) return "";
    if (isTr) return trMap[value] ?? value;
    if (isZh) return zhMap[value] ?? value;
    return value;
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-20 dark:from-slate-950 dark:to-slate-900">
      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link
            href={`/${locale}/visas/canada`}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {backToVisasLabel}
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
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
                  <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-100">
                    {l("Family Sponsorship")}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                    {title}
                  </h1>
                  <p className="max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
                    {subtitle}
                  </p>
                </div>
              </div>

              {/* Overview & Core Metrics */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    <DollarSign className="h-4 w-4 text-rose-600" />
                    {isTr ? "Ücret" : isZh ? "费用" : "Fee"}
                  </div>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-950 dark:text-white">{l(data.fees)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    <Clock3 className="h-4 w-4 text-rose-600" />
                    {isTr ? "İşlem süresi" : isZh ? "处理时间" : "Processing time"}
                  </div>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-950 dark:text-white">{l(data.processing_time)}</p>
                </div>
              </div>

              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{l(data.overview)}</p>

              {/* Binding undertaking durations */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-500/20 dark:bg-amber-500/10">
                <div className="flex items-center gap-2 text-sm font-bold text-amber-900 dark:text-amber-100">
                  <Scale className="h-4 w-4" />
                  {isTr ? "Bağlayıcı Sponsorluk Yükümlülüğü" : isZh ? "具有约束力的担保承诺" : "Binding Sponsorship Undertaking"}
                </div>
                <p className="mt-2 text-sm leading-6 text-amber-900 dark:text-amber-100">{l(undertaking.definition)}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {(undertaking.durations_outside_quebec ?? []).map((row) => (
                    <div
                      key={row.person}
                      className="rounded-xl border border-amber-200 bg-white p-3 dark:border-amber-500/20 dark:bg-slate-950/40"
                    >
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">{l(row.person)}</p>
                      <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">{l(row.length)}</p>
                    </div>
                  ))}
                </div>
                {undertaking.quebec_rule ? (
                  <p className="mt-3 text-xs leading-5 text-amber-800 dark:text-amber-200">{l(undertaking.quebec_rule)}</p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href={`/${locale}/full-check?country=CA`}>
                  <Button className="bg-rose-600 text-white hover:bg-rose-700">
                    <span>{checkEligibilityLabel}</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-xl">{officialInfoLabel}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {isTr ? "Ücret" : isZh ? "费用" : "Fee"}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{l(data.fees)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {isTr ? "İşlem süresi" : isZh ? "处理时间" : "Processing time"}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{l(data.processing_time)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {isTr ? "Durum" : isZh ? "状态" : "Status"}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{l(data.status)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* PDF Download Card */}
      <section className="mx-auto max-w-6xl px-4 pb-6 sm:px-6 lg:px-8">
        <VisaPdfDownloadCard
          pdfUrls={pdfUrls}
          description={l("This guide is stored on Vercel Blob and mirrors the official Canada.ca process snapshot used by the app.")}
          title={l("Sponsor Your Spouse, Partner or Child - Official Guide (PDF)")}
          primaryLabel={isTr ? "PDF'yi Aç" : isZh ? "打开 PDF" : "Open PDF"}
          sourceLabel={visitOfficialWebsiteLabel}
        />
      </section>

      {/* Sponsor & Candidate Rules */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <BadgeCheck className="h-5 w-5 text-rose-600" />
                {isTr ? "Sponsor Uygunluğu" : isZh ? "担保人资格" : "Sponsor Eligibility"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
                  {isTr ? "Gerekli kriterler" : isZh ? "必须满足的条件" : "Must meet"}
                </p>
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  {(sponsorEligibility.positive_criteria ?? []).map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                      <span>{l(item)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-500/20 dark:bg-sky-500/10">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
                  {isTr ? "Gelir şartı (çoğu durumda yok)" : isZh ? "收入要求（多数情况下无需）" : "Income requirement (not required in most cases)"}
                </p>
                <p className="mt-2 text-sm leading-6 text-sky-900 dark:text-sky-100">{l(sponsorEligibility.income_requirement)}</p>
              </div>

              <div>
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  {isTr ? "Sponsor olmayı engelleyen durumlar" : isZh ? "不得担保的情形" : "Disqualifying conditions (jail, bankruptcy, debt)"}
                </p>
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  {(sponsorEligibility.negative_criteria ?? []).map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                      <span>{l(item)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Users className="h-5 w-5 text-rose-600" />
                {isTr ? "Sponsor Edilebilecek Kişi Türleri" : isZh ? "可担保的人员类别" : "Sponsored Person Types"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{isTr ? "Eş" : isZh ? "配偶" : "Spouse"}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{l(personTypes.spouse?.definition)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {isTr ? "Fiili Birliktelik (Common-law)" : isZh ? "事实伴侣" : "Common-law Partner"}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{l(personTypes.common_law_partner?.definition)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {isTr ? "Birliktelik Partneri (Conjugal)" : isZh ? "婚姻伴侣（Conjugal）" : "Conjugal Partner"}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{l(personTypes.conjugal_partner?.definition)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {isTr ? "Bağımlı Çocuk" : isZh ? "受抚养子女" : "Dependent Child"}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{l(personTypes.dependent_child?.definition)}</p>
                <ul className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  {(personTypes.dependent_child?.custody_and_declaration_rules ?? []).map((item) => (
                    <li key={item} className="flex gap-2">
                      <FileWarning className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
                      <span>{l(item)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Forms & Notary Checklists */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ListChecks className="h-5 w-5 text-rose-600" />
                {isTr ? "Başvuru Adımları" : isZh ? "申请步骤" : "How to Apply"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {howToApplySteps.map((step, index) => (
                  <li key={step} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 text-xs font-bold text-rose-800 dark:bg-rose-500/15 dark:text-rose-100">
                      {index + 1}
                    </span>
                    <span>{l(step)}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ListChecks className="h-5 w-5 text-rose-600" />
                {isTr ? "Formlar ve Noter Kontrol Listesi" : isZh ? "表格与公证清单" : "Forms & Notary Checklist"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
                  {isTr ? "Portalde doldurulacak dijital formlar" : isZh ? "在系统内填写的电子表格" : "Digital forms filled in the portal"}
                </p>
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  {(requiredForms.portal_digital_forms ?? []).map((item) => (
                    <li key={item.code} className="flex gap-2">
                      <span className="text-rose-600">•</span>
                      <span>
                        <span className="font-semibold">{item.code}</span> — {l(item.name)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
                  {isTr ? "Yüklenecek formlar / el ile imzalananlar" : isZh ? "需上传/手签的表格" : "Upload / hand-signed forms"}
                </p>
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  {(requiredForms.portal_upload_forms ?? []).map((item) => (
                    <li key={item.code} className="flex gap-2">
                      <span className="text-rose-600">•</span>
                      <span>
                        <span className="font-semibold">{item.code}</span> — {l(item.name)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Open Work Permit Option */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm dark:border-emerald-500/20 dark:bg-emerald-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-emerald-900 dark:text-emerald-100">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              {isTr ? "Açık Çalışma İzni (OWP) Seçeneği" : isZh ? "开放式工作许可（OWP）选项" : "Open Work Permit (OWP) Option"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
                {isTr ? "Uygunluk kriterleri" : isZh ? "资格条件" : "Eligibility criteria"}
              </p>
              <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                {(owpPolicy.eligibility_criteria ?? []).map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    <span>{l(item)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
                {isTr ? "Uygunsuzluk durumları" : isZh ? "不符合资格的情形" : "Ineligibility"}
              </p>
              <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                {(owpPolicy.ineligibility ?? []).map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                    <span>{l(item)}</span>
                  </li>
                ))}
              </ul>
              {owpPolicy.visitor_visa_acceleration ? (
                <p className="mt-4 rounded-xl border border-emerald-200 bg-white p-3 text-xs leading-5 text-emerald-900 dark:border-emerald-500/20 dark:bg-slate-950/40 dark:text-emerald-100">
                  {l(owpPolicy.visitor_visa_acceleration)}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* After You Apply */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ListChecks className="h-5 w-5 text-rose-600" />
                {isTr ? "Başvuru Sonrası" : isZh ? "申请之后" : "After You Apply"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                {(afterApply.processing_mechanisms ?? []).map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                    <span>{l(item)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Scale className="h-5 w-5 text-rose-600" />
                {isTr ? "Onay, Ret ve Geri Çekme" : isZh ? "批准、拒绝与撤回" : "Decisions, Refusals & Withdrawal"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                {(afterApply.approval_and_refusal_outcomes ?? []).map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                    <span>{l(item)}</span>
                  </li>
                ))}
              </ul>
              <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                {(afterApply.withdrawal_and_refunds ?? []).map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-400" />
                    <span>{l(item)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-4 sm:px-6 lg:px-8">
        <a
          href="https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/sponsor-spouse-partner-child/eligibility.html"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
        >
          {visitOfficialWebsiteLabel}
          <ExternalLink className="h-4 w-4" />
        </a>
      </section>
    </main>
  );
}
