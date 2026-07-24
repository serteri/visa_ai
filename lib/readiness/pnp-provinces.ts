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

/** Provinces with a real eligibility module wired up in this pass. BC/AB are recognized codes (for future PRs) but intentionally not implemented yet — see resolveTargetProvince. */
export const SUPPORTED_PROVINCES: ReadonlySet<ProvinceCode> = new Set(["ON"]);

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
  /** Whether a nomination under this stream is linked to Express Entry (adds +600 CRS). Ontario's Workforce Priority stream makes this an applicant CHOICE, not a fixed stream property — see isEnhanced on OntarioPathwayResult for the per-candidate answer. */
  isEnhanced: boolean;
  scoringModel: ProvinceStreamScoringModel;
  languageThreshold: string;
  occupationListType: ProvinceStreamOccupationListType;
  notes: string;
  /** False when the stream has been announced but IRCC/the province has not published eligibility detail yet — the report must say so instead of inventing requirements. */
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

/** Announced but not yet detailed — surfaced so the report can say "not yet published" instead of staying silent or inventing criteria. */
export const ONTARIO_ANNOUNCED_UNPUBLISHED_STREAMS = [
  "Priority healthcare stream",
  "Entrepreneur stream",
  "Exceptional talent stream",
] as const;

export type OntarioPathwayId = "TEER_0_3" | "TEER_4_5" | "SELF_EMPLOYED_PHYSICIAN";

export type OntarioPathwayResult = {
  pathwayId: OntarioPathwayId;
  stream: ProvinceStream;
  /** Code-based NOC/TEER check, not free-text keyword matching. Undefined when the occupation could not be resolved to a NOC code at all. */
  occupationTeer?: number;
  languageThresholdMet: boolean;
  /** True only for the TEER 0-3 pathway's skilled-trades CLB 5 exception NOC groups (Ontario's own list — NOT the same set as the FSTP eligibility groups, which additionally excludes 726/932 and includes Major Group 92). */
  qualifiesForTradesLanguageException: boolean;
  /**
   * The intake form does not currently collect a job offer, so this cannot
   * be confirmed true/false from user input — surfaced as unmet (not
   * silently assumed satisfied), same pattern as FSTP's job-offer gate.
   */
  hasQualifyingJobOffer: false;
  eligible: boolean;
  missingRequirements: string[];
};

const ONTARIO_TRADES_CLB5_MAJOR_GROUPS = ["72", "73", "82", "83", "93"] as const;
const ONTARIO_TRADES_CLB5_ADDITIONAL_CODES: ReadonlySet<string> = new Set(["62200"]);
/** Minor Group 632 (chefs/cooks) prefix, per Ontario's own published list — kept as its own constant since it is NOT identical to the FSTP additional-inclusion set (lib/readiness/noc-fstp-groups.ts), which uses different major-group scope (includes 92, excludes sub-major 726/932). */
const ONTARIO_TRADES_CLB5_MINOR_GROUP_PREFIX = "632";

/** Ontario's own skilled-trades CLB 5 exception list — deliberately separate from isFSTPEligibleOccupation (lib/readiness/noc-fstp-groups.ts), which is a different official list with different scope (see file header). */
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
