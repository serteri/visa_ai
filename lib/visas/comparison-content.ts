/**
 * The 189 / 190 / 491 comparison table, as data. Every figure is either read from the repository's fee data
 * (src/data/visa-fees.json, the Department of Home Affairs "from" charge for the main applicant) or is a statement the
 * Department's own visa pages make. Nothing is estimated:
 *
 *   - fee         visa-fees.json (checked against the Home Affairs visa pages on FEES_CHECKED_ON)
 *   - processing  not a figure: the Department publishes a processing time guide, so the cell points to it
 *   - minimum     "Be able to score 65 points or more" -- on all three visa pages
 *   - type, sponsor / nomination, regional condition, 191 pathway: the visa pages
 * Removed because no source was found: the "extra points" row and the "competitive score" row.
 */
import visaFees from "@/src/data/visa-fees.json";

export type ComparisonLocale = "en" | "tr" | "zh-Hans";
export type ComparisonSubclass = "189" | "190" | "491";

export const COMPARISON_SUBCLASSES: ComparisonSubclass[] = ["189", "190", "491"];
export const FEES_CHECKED_ON = "2026-10-10";

const HA = "https://immi.homeaffairs.gov.au/visas/getting-a-visa";
export const OFFICIAL_PAGES: Record<ComparisonSubclass, string> = {
  "189": `${HA}/visa-listing/skilled-independent-189/points-tested`,
  "190": `${HA}/visa-listing/skilled-nominated-190`,
  "491": `${HA}/visa-listing/skilled-work-regional-provisional-491`,
};
export const PROCESSING_GUIDE_URL = `${HA}/visa-processing-times/global-visa-processing-times`;

export function formatAud(amount: number): string {
  return `AUD ${String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

export function mainApplicantCharge(subclass: ComparisonSubclass): number {
  const main = (visaFees as unknown as { visas: Record<string, { vac: { main: number } }> }).visas[subclass]?.vac.main;
  if (typeof main !== "number") throw new Error(`no main-applicant charge for subclass ${subclass} in visa-fees.json`);
  return main;
}

type Copy = {
  badge: string;
  title: string;
  subtitle: string;
  feature: string;
  visaType: string;
  sponsorRequired: string;
  workAnywhere: string;
  pathToPr: string;
  minPoints: string;
  fee: string;
  processing: string;
  permanent: string;
  provisional: string;
  no: string;
  stateGovt: string;
  stateFamily: string;
  yes: string;
  regionalOnly: string;
  direct: string;
  via191: string;
  processingValue: string;
  feeNote: string;
  checked: string;
  sourcesTitle: string;
  guideLabel: string;
  pageLabel: (subclass: string) => string;
  ctaTitle: string;
  ctaText: string;
  ctaButton: string;
};

const COPY: Record<ComparisonLocale, Copy> = {
  en: {
    badge: "Visa comparison",
    title: "189 vs 190 vs 491 Visa Comparison",
    subtitle: "Key published differences between subclasses 189, 190 and 491, side by side.",
    feature: "Feature",
    visaType: "Visa type",
    sponsorRequired: "Nomination / sponsor",
    workAnywhere: "Where you can live and work",
    pathToPr: "Permanent residence",
    minPoints: "Minimum points",
    fee: "Visa application charge (main applicant)",
    processing: "Processing time",
    permanent: "Permanent",
    provisional: "Provisional",
    no: "None",
    stateGovt: "State or territory nomination",
    stateFamily: "State or territory nomination, or relative sponsorship",
    yes: "Anywhere in Australia",
    regionalOnly: "Designated regional area",
    direct: "Permanent on grant",
    via191: "Permanent Residence (Skilled Regional) visa (subclass 191), after 3 years",
    processingValue: "Varies; see the official processing time guide",
    feeNote:
      "Charges are the \"from\" amounts the Department of Home Affairs publishes for the main applicant. Concessions apply in limited circumstances. Additional applicants and the second instalment (for applicants without functional English) are not included. Processing times are not fixed: the Department publishes a guide based on recently decided applications.",
    checked: "Charges checked against the Department of Home Affairs visa pages on 10 October 2026.",
    sourcesTitle: "Official sources",
    guideLabel: "Visa processing time guide",
    pageLabel: (s) => `Subclass ${s} (Department of Home Affairs)`,
    ctaTitle: "Calculate points",
    ctaText: "Enter your details in the points calculator to calculate a points total under the published points test.",
    ctaButton: "Open Points Calculator",
  },
  tr: {
    badge: "Vize karsilastirmasi",
    title: "189 vs 190 vs 491 Vize Karsilastirmasi",
    subtitle: "189, 190 ve 491 alt siniflari arasindaki yayimlanmis temel farklar, yan yana.",
    feature: "Ozellik",
    visaType: "Vize tipi",
    sponsorRequired: "Adaylik / sponsor",
    workAnywhere: "Yasanabilecek ve calisilabilecek yer",
    pathToPr: "Kalici oturum",
    minPoints: "Minimum puan",
    fee: "Vize basvuru ucreti (ana basvuran)",
    processing: "Islem suresi",
    permanent: "Kalici",
    provisional: "Gecici",
    no: "Yok",
    stateGovt: "Eyalet veya bolge adayligi",
    stateFamily: "Eyalet veya bolge adayligi ya da akraba sponsorlugu",
    yes: "Avustralya'nin her yeri",
    regionalOnly: "Belirlenmis bolgesel alan",
    direct: "Verilince kalici",
    via191: "3 yil sonra Permanent Residence (Skilled Regional) vizesi (alt sinif 191)",
    processingValue: "Degisir; resmi islem suresi rehberine bakin",
    feeNote:
      "Ucretler, Icisleri Bakanliginin (Department of Home Affairs) ana basvuran icin yayimladigi \"baslangic\" tutarlaridir. Indirimler sinirli durumlarda gecerlidir. Ek basvuranlar ve ikinci taksit (islevsel Ingilizcesi olmayan basvuranlar icin) dahil degildir. Islem sureleri sabit degildir: Bakanlik, yakin zamanda sonuclanan basvurulara dayanan bir rehber yayimlar.",
    checked: "Ucretler 10 Ekim 2026 tarihinde Icisleri Bakanligi vize sayfalariyla karsilastirildi.",
    sourcesTitle: "Resmi kaynaklar",
    guideLabel: "Vize islem suresi rehberi",
    pageLabel: (s) => `Alt sinif ${s} (Department of Home Affairs)`,
    ctaTitle: "Puan hesaplama",
    ctaText: "Girdiginiz bilgilerle yayimlanmis puan testine gore puan toplami hesaplamak icin puan hesaplayiciyi kullanin.",
    ctaButton: "Puan Hesaplayiciyi Ac",
  },
  "zh-Hans": {
    badge: "签证对比",
    title: "189 vs 190 vs 491 签证对比",
    subtitle: "189、190 和 491 子类之间已公布的主要差异，并排列出。",
    feature: "对比项",
    visaType: "签证类型",
    sponsorRequired: "提名 / 担保",
    workAnywhere: "可居住和工作的地区",
    pathToPr: "永久居留",
    minPoints: "最低分",
    fee: "签证申请费（主申请人）",
    processing: "处理周期",
    permanent: "永久",
    provisional: "临时",
    no: "无",
    stateGovt: "州或领地提名",
    stateFamily: "州或领地提名，或亲属担保",
    yes: "澳大利亚全境",
    regionalOnly: "指定偏远地区",
    direct: "获批即为永久",
    via191: "3 年后可申请永久居留（技术移民偏远地区）签证（191 子类）",
    processingValue: "不固定；请查看官方处理时间指南",
    feeNote:
      "费用为澳大利亚内政部（Department of Home Affairs）公布的主申请人“起”价。特定情形可享减免。附加申请人以及第二期费用（针对没有功能性英语的申请人）不包括在内。处理周期并不固定：内政部根据近期已决定的申请发布参考指南。",
    checked: "费用已于 2026 年 10 月 10 日对照澳大利亚内政部签证页面核对。",
    sourcesTitle: "官方来源",
    guideLabel: "签证处理时间指南",
    pageLabel: (s) => `${s} 子类（澳大利亚内政部）`,
    ctaTitle: "计算分数",
    ctaText: "在算分器中输入你的信息，按已公布的积分测试计算分数总和。",
    ctaButton: "打开算分器",
  },
};

export type ComparisonContent = {
  copy: Copy;
  rows: Array<{ label: string; values: [string, string, string] }>;
  officialPages: Array<{ subclass: ComparisonSubclass; label: string; url: string }>;
  processingGuide: { label: string; url: string };
};

export function comparisonContent(locale: string): ComparisonContent {
  const lang: ComparisonLocale = locale === "tr" || locale === "zh-Hans" ? locale : "en";
  const c = COPY[lang];
  return {
    copy: c,
    rows: [
      { label: c.visaType, values: [c.permanent, c.permanent, c.provisional] },
      { label: c.sponsorRequired, values: [c.no, c.stateGovt, c.stateFamily] },
      { label: c.workAnywhere, values: [c.yes, c.yes, c.regionalOnly] },
      { label: c.pathToPr, values: [c.direct, c.direct, c.via191] },
      { label: c.minPoints, values: ["65", "65", "65"] },
      { label: c.fee, values: COMPARISON_SUBCLASSES.map((s) => formatAud(mainApplicantCharge(s))) as [string, string, string] },
      { label: c.processing, values: [c.processingValue, c.processingValue, c.processingValue] },
    ],
    officialPages: COMPARISON_SUBCLASSES.map((s) => ({ subclass: s, label: c.pageLabel(s), url: OFFICIAL_PAGES[s] })),
    processingGuide: { label: c.guideLabel, url: PROCESSING_GUIDE_URL },
  };
}

/** Every string a visitor reads on the comparison table (for the wording scan and tests). */
export function comparisonText(locale: string): string {
  const x = comparisonContent(locale);
  const c = x.copy;
  return [c.badge, c.title, c.subtitle, c.feature, ...x.rows.flatMap((r) => [r.label, ...r.values]), c.feeNote, c.checked, c.sourcesTitle, ...x.officialPages.map((p) => p.label), x.processingGuide.label, c.ctaTitle, c.ctaText, c.ctaButton].join("\n");
}
