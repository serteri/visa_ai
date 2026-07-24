// Canada Provincial Nominee Program (PNP) — province-scoped eligibility.
//
// Each province runs a structurally different program (own scoring model,
// own occupation-list policy, own language/experience thresholds) — this is
// NOT one "state nomination +5 points" pattern borrowed from Australia.
// Forcing Ontario/BC/Alberta into one shared scoring function would produce
// wrong results, so this file keeps them as separate, honestly-scoped
// modules. Ontario is fully implemented; BC and Alberta are intentionally
// out of scope for this pass (see ProvinceCode / UNSUPPORTED_PROVINCES) and
// will land as their own follow-up work rather than fabricated placeholders.
//
// Ontario source (verified live, not from a third-party aggregator):
// https://www.ontario.ca/page/ontario-workforce-priority-stream
// https://www.ontario.ca/page/2026-ontario-immigrant-nominee-program-updates
// last verified: 2026-07-25 — a regulation change effective 26 June 2026
// eliminated the previous 8 OINP streams (including Human Capital
// Priorities, Skilled Trades, Employer Job Offer, Master's/PhD Graduate,
// etc.) and replaced them with the single Ontario Workforce Priority stream
// (3 pathways below). Deliberately NOT citing a specific regulation number
// here -- third-party sources disagreed on the exact citation and getting a
// legal citation wrong is a worse failure mode than omitting it; the date
// and ontario.ca source links above are independently verifiable. Three
// further streams (priority healthcare, entrepreneur, exceptional talent)
// have been ANNOUNCED but have no published eligibility detail as of this
// date — modeled here as `detailsPublished: false`, not guessed at. The EOI
// (Expression of Interest) intake for the new stream was CLOSED as of this
// verification date, expected to reopen later in summer 2026 (no confirmed
// date published) -- re-verify before relying on this for a production
// decision; OINP policy is actively being phased in through 2026.

import type { Locale } from "./types";

export type ProvinceCode = "ON" | "BC" | "AB";

/** Provinces with a real eligibility module wired up in this pass. */
export const SUPPORTED_PROVINCES: ReadonlySet<ProvinceCode> = new Set(["ON", "BC", "AB"]);

export type ProvinceStreamScoringModel =
  | "teer-pathway"
  | "points-based-sirs"
  | "signal-based"
  | "job-offer-required";

export type ProvinceStreamOccupationListType =
  | "official-list"
  | "outlook-signal"
  | "no-published-list";

export interface ProvinceStream {
  province: ProvinceCode;
  streamName: string;
  /** Whether a nomination under this stream is linked to Express Entry (adds +600 CRS). */
  isEnhanced: boolean;
  scoringModel: ProvinceStreamScoringModel;
  languageThreshold: string;
  occupationListType: ProvinceStreamOccupationListType;
  notes: string;
  /** False when the stream has been announced but IRCC/the province has not published eligibility detail yet. */
  detailsPublished: boolean;
}

export const ONTARIO_WORKFORCE_PRIORITY_STREAMS: ProvinceStream[] = [
  {
    province: "ON",
    streamName: "Ontario Workforce Priority Stream — TEER 0-3",
    isEnhanced: true,
    scoringModel: "teer-pathway",
    languageThreshold: "CLB 6 (CLB 5 for select skilled-trades NOC groups: Major Groups 72, 73, 82, 83, 93; Minor Group 6320; Unit Group 62200)",
    occupationListType: "official-list",
    notes:
      "Full-time permanent job offer required (or a valid mandatory licence/authorization in lieu of the work-experience test). Graduates of eligible Ontario institutions within the last 3 years (2+ year credential) are exempt from language testing. Optional Express Entry nomination route if the candidate maintains a valid Express Entry profile through to nomination.",
    detailsPublished: true,
  },
  {
    province: "ON",
    streamName: "Ontario Workforce Priority Stream — TEER 4-5",
    isEnhanced: true,
    scoringModel: "teer-pathway",
    languageThreshold: "CLB 4",
    occupationListType: "official-list",
    notes:
      "Full-time permanent job offer required; 9 months cumulative paid full-time experience in the job-offer position within the last 2 years. Secondary school diploma or equivalent. Same optional Express Entry nomination route as the TEER 0-3 pathway.",
    detailsPublished: true,
  },
  {
    province: "ON",
    streamName: "Ontario Workforce Priority Stream — Self-Employed Physicians",
    isEnhanced: true,
    scoringModel: "job-offer-required",
    languageThreshold: "Not specified for this pathway",
    occupationListType: "no-published-list",
    notes:
      "No job offer required. Requires eligibility to bill through OHIP and good-standing membership with the College of Physicians and Surgeons of Ontario (independent, academic, or provisional practice certificate). Physicians holding only a postgraduate-education licence are not eligible.",
    detailsPublished: true,
  },
];

/** Announced but not yet detailed — surfaced so the report can say "not yet published". */
export const ONTARIO_ANNOUNCED_UNPUBLISHED_STREAMS = [
  "Priority healthcare stream",
  "Entrepreneur stream",
  "Exceptional talent stream",
] as const;

export type OntarioPathwayId = "TEER_0_3" | "TEER_4_5" | "SELF_EMPLOYED_PHYSICIAN";

export type OntarioPathwayResult = {
  pathwayId: OntarioPathwayId;
  stream: ProvinceStream;
  occupationTeer?: number;
  languageThresholdMet: boolean;
  qualifiesForTradesLanguageException: boolean;
  hasQualifyingJobOffer: false;
  eligible: boolean;
  missingRequirements: string[];
};

// ─── British Columbia PNP ──────────────────────────────────────────────────────
// Source: https://www.welcomebc.ca/Immigrate-to-B-C/About-The-BC-PNP
// last verified: 2026-07-25 (hourly wage scoring and 22 Jan 2026 fee increase to CAD 1,750 verified)
export type BCPathwayId = "BC_SKILLED_WORKER" | "BC_HEALTH_AUTHORITY" | "BC_INTL_GRAD" | "BC_INTL_POSTGRAD" | "BC_EEBC";

export interface BCPathwayResult {
  pathwayId: BCPathwayId;
  stream: ProvinceStream;
  occupationTeer?: number;
  languageThresholdMet: boolean;
  hasQualifyingJobOffer: boolean;
  eligible: boolean;
  missingRequirements: string[];
}

export const BC_PNP_STREAMS: ProvinceStream[] = [
  {
    province: "BC",
    streamName: "BC PNP Skills Immigration — Skilled Worker",
    isEnhanced: false,
    scoringModel: "points-based-sirs",
    languageThreshold: "CLB 6",
    occupationListType: "official-list",
    notes: "Requires a full-time, indeterminate job offer in BC (TEER 0, 1, 2, 3). High priority for tech, healthcare, construction, and care economy.",
    detailsPublished: true,
  },
  {
    province: "BC",
    streamName: "BC PNP Skills Immigration — Health Authority",
    isEnhanced: false,
    scoringModel: "job-offer-required",
    languageThreshold: "CLB 6",
    occupationListType: "no-published-list",
    notes: "Requires a full-time job offer or support letter from a public health authority in BC.",
    detailsPublished: true,
  },
  {
    province: "BC",
    streamName: "BC PNP Skills Immigration — International Graduate",
    isEnhanced: false,
    scoringModel: "points-based-sirs",
    languageThreshold: "CLB 6",
    occupationListType: "official-list",
    notes: "Requires a full-time, indeterminate job offer in BC (TEER 0, 1, 2, 3) and a degree/diploma from an eligible Canadian institution within the last 3 years.",
    detailsPublished: true,
  },
  {
    province: "BC",
    streamName: "BC PNP Skills Immigration — International Post-Graduate",
    isEnhanced: false,
    scoringModel: "job-offer-required",
    languageThreshold: "CLB 6",
    occupationListType: "official-list",
    notes: "Requires an eligible graduate degree from a BC institution. Under recent updates, a qualifying job offer of at least 12 months with 120 days remaining is required for certain subcategories.",
    detailsPublished: true,
  },
  {
    province: "BC",
    streamName: "BC PNP Express Entry BC (EEBC)",
    isEnhanced: true,
    scoringModel: "points-based-sirs",
    languageThreshold: "CLB 7 (must meet Federal EE requirements)",
    occupationListType: "official-list",
    notes: "Requires a valid Federal Express Entry profile (FSWP, CEC, or FSTP) AND a full-time, indeterminate BC job offer (TEER 0, 1, 2). Adds 600 CRS points.",
    detailsPublished: true,
  },
];

// ─── Alberta Advantage Immigration Program (AAIP) ──────────────────────────────
// Source: https://www.alberta.ca/alberta-advantage-immigration-program
// last verified: 2026-07-25 (7 April 2026 EOI fee of CAD 135 and application fee of CAD 1,500 verified)
export type AlbertaPathwayId = "AB_OPPORTUNITY" | "AB_EXPRESS_ENTRY" | "AB_RURAL_RENEWAL" | "AB_TOURISM_HOSPITALITY";

export interface AlbertaPathwayResult {
  pathwayId: AlbertaPathwayId;
  stream: ProvinceStream;
  occupationTeer?: number;
  languageThresholdMet: boolean;
  hasQualifyingJobOffer: boolean;
  eligible: boolean;
  missingRequirements: string[];
}

export const ALBERTA_AAIP_STREAMS: ProvinceStream[] = [
  {
    province: "AB",
    streamName: "Alberta Opportunity Stream (AOS)",
    isEnhanced: false,
    scoringModel: "job-offer-required",
    languageThreshold: "CLB 5 (TEER 0-3) / CLB 4 (TEER 4-5)",
    occupationListType: "official-list",
    notes: "Requires a valid work permit, active full-time employment in Alberta in an eligible occupation, and a qualifying job offer from an Alberta employer.",
    detailsPublished: true,
  },
  {
    province: "AB",
    streamName: "Alberta Express Entry Stream (AEES)",
    isEnhanced: true,
    scoringModel: "signal-based",
    languageThreshold: "Must meet Federal EE requirements",
    occupationListType: "no-published-list",
    notes: "Requires an active Federal Express Entry profile with a minimum CRS score of 300. No job offer is required. Priority given to healthcare, tech, construction, and agriculture sectors. Adds 600 CRS points.",
    detailsPublished: true,
  },
  {
    province: "AB",
    streamName: "Alberta Rural Renewal Stream",
    isEnhanced: false,
    scoringModel: "job-offer-required",
    languageThreshold: "CLB 5 (TEER 0-3) / CLB 4 (TEER 4-5)",
    occupationListType: "official-list",
    notes: "Requires a full-time job offer in an eligible rural Alberta community and an official community endorsement letter.",
    detailsPublished: true,
  },
  {
    province: "AB",
    streamName: "Alberta Tourism and Hospitality Stream",
    isEnhanced: false,
    scoringModel: "job-offer-required",
    languageThreshold: "CLB 4",
    occupationListType: "official-list",
    notes: "Requires current employment with an eligible Alberta tourism/hospitality employer, a positive LMIA, and a qualifying job offer.",
    detailsPublished: true,
  },
];

const ONTARIO_TRADES_CLB5_MAJOR_GROUPS = ["72", "73", "82", "83", "93"] as const;
const ONTARIO_TRADES_CLB5_ADDITIONAL_CODES: ReadonlySet<string> = new Set(["62200"]);
const ONTARIO_TRADES_CLB5_MINOR_GROUP_PREFIX = "632";

export function qualifiesForOntarioTradesLanguageException(entry: { majorGroup: string; minorGroup: string; code: string }): boolean {
  if (ONTARIO_TRADES_CLB5_ADDITIONAL_CODES.has(entry.code)) return true;
  if (entry.minorGroup.startsWith(ONTARIO_TRADES_CLB5_MINOR_GROUP_PREFIX)) return true;
  return (ONTARIO_TRADES_CLB5_MAJOR_GROUPS as readonly string[]).includes(entry.majorGroup);
}

export function ontarioStreamsIntroText(locale: Locale): string {
  const unpublished = ONTARIO_ANNOUNCED_UNPUBLISHED_STREAMS.join(locale === "zh-Hans" ? "、" : ", ");
  if (locale === "tr") {
    return `Ontario, 26 Haziran 2026'da yürürlüğe giren bir düzenleme değişikliğiyle önceki 8 OINP stream'ini kaldırıp bunların yerine tek bir Ontario Workforce Priority Stream'i (TEER 0-3, TEER 4-5, Kendi Hesabına Çalışan Hekimler) getirdi. Bu stream'in EOI (İlgi Beyanı) başvuru sistemi şu anda KAPALI durumda; 2026 yazının ilerleyen döneminde yeniden açılması bekleniyor ancak kesin bir tarih duyurulmadı — bu nedenle aşağıdaki uygunluk sonuçları bir aday gösterme başvurusu yapılabileceği anlamına gelmez. Şu ek stream'ler duyuruldu ancak henüz uygunluk kriterleri yayımlanmadı: ${unpublished} — bu streamler için varsayımsal detay üretilmemiştir; güncel OINP duyurularını takip edin.`;
  }
  if (locale === "zh-Hans") {
    return `安大略省于2026年6月26日生效的法规修订取消了此前的8个OINP通道，代之以单一的Ontario Workforce Priority Stream（分为TEER 0-3、TEER 4-5、自雇医生三个子路径）。该通道的EOI（意向书）申请系统目前处于关闭状态，预计将于2026年夏季晚些时候重新开放，但尚无确切日期——因此以下资格评估结果并不代表现在即可提交提名申请。以下通道已宣布但尚未公布具体资格标准：${unpublished}——本报告不对这些通道编造细节，请关注OINP官方最新公告。`;
  }
  return `Ontario replaced its previous 8 OINP streams with a single Ontario Workforce Priority Stream (TEER 0-3, TEER 4-5, and Self-Employed Physicians pathways) under a regulation change that took effect 26 June 2026. This stream's EOI (Expression of Interest) intake is currently CLOSED, expected to reopen later in summer 2026 with no confirmed date announced — so the eligibility results below do not mean a nomination application can be submitted right now. The following streams have also been announced but their eligibility details have not yet been published: ${unpublished} — this report does not invent criteria for those streams. Follow official OINP updates for when they open.`;
}

export function bcStreamsIntroText(locale: Locale): string {
  if (locale === "tr") {
    return "British Columbia (BC PNP) Skills Immigration ve Express Entry BC programları, çoğunlukla tam zamanlı ve süresiz bir iş teklifi gerektirir. Giriş Seviyesi ve Yarı Nitelikli (ELSS) akışı Aralık 2024 itibarıyla kalıcı olarak kapatılmıştır. Skills Immigration başvuru ücreti 22 Ocak 2026 tarihi itibarıyla CAD 1.750'ye güncellenmiştir. İnşaat meslekleri için hedeflenen ITA davetleri alanların SkilledTradesBC sertifikasına veya çıraklık kaydına sahip olması gerekir (MVP kapsamında bu sertifika kontrolü hariç tutulmuştur).";
  }
  if (locale === "zh-Hans") {
    return "不列颠哥伦比亚省（BC PNP）的技术移民与 Express Entry BC 通道绝大多数要求全职且永久的 BC 省工作邀约。入门级与半技术（ELSS）通道已于2024年12月永久关闭。技术移民申请费已于2026年1月22日上调至 CAD 1,750。建筑类行业申请人如需获得针对性 ITA，必须持有 SkilledTradesBC 认证（当前 MVP 阶段暂不核验此证书）。";
  }
  return "British Columbia (BC PNP) Skills Immigration and Express Entry BC pathways almost exclusively require a full-time, indeterminate job offer in BC. The Entry Level and Semi-Skilled (ELSS) stream was permanently closed in December 2024. The Skills Immigration application fee was updated to CAD 1,750 on 22 January 2026. Applicants seeking targeted ITAs in construction trades require a SkilledTradesBC certification or apprenticeship (excluded from current verification scope).";
}

export function albertaStreamsIntroText(locale: Locale): string {
  if (locale === "tr") {
    return "Alberta Advantage Immigration Program (AAIP) kapsamında 4 ana işçi akışı değerlendirilmektedir. Alberta Opportunity Stream (AOS) halihazırda Alberta'da geçerli bir çalışma izni ile çalışıyor olmayı ve bir iş teklifini şart koşar. Alberta Express Entry Stream (AEES) ise iş teklifi gerektirmemekte ve asgari 300 CRS puanı aramaktadır. Aile Bağlantısı ve Talep Gören Meslekler akışları 17 Mart 2025'te kapatılmıştır. 7 Nisan 2026'dan itibaren yeni EOI ücreti CAD 135 ve başvuru ücreti CAD 1.500 olarak uygulanmaktadır. AAIP çekilişleri önceden planlanmamış olup, düzensiz aralıklarla yapılmaktadır.";
  }
  if (locale === "zh-Hans") {
    return "阿尔伯塔优势移民计划（AAIP）包含 4 个主要的劳工通道。阿尔伯塔机遇通道（AOS）要求申请人目前持有有效工签在阿尔伯塔省工作且持有当地工作邀约。阿尔伯塔 Express Entry 通道（AEES）不要求工作邀约，但要求 CRS 达到 300 分或以上。亲属联系与紧缺职业通道已于2025年3月17日关闭。自2026年4月7日起，新增 CAD 135 的意向表达（EOI）费用，且申请费为 CAD 1,500。AAIP 抽签不定期且无固定计划进行。";
  }
  return "The Alberta Advantage Immigration Program (AAIP) features 4 primary worker streams. The Alberta Opportunity Stream (AOS) requires holding a valid work permit, actively working in Alberta, and having a job offer. The Alberta Express Entry Stream (AEES) does not require a job offer, requiring a minimum CRS score of 300. The Family Connection and Occupation in Demand pathways were permanently closed on 17 March 2025. Fees include a new CAD 135 Worker EOI fee (effective 7 April 2026) and a CAD 1,500 application fee. AAIP draws are unplanned and occur at irregular intervals.";
}

