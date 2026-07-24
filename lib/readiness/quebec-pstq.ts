import { type Locale } from "@/lib/readiness/types";

export type PSTQStreamId =
  | "STREAM_1_SPECIALIZED"
  | "STREAM_2_INTERMEDIATE"
  | "STREAM_3_REGULATED"
  | "STREAM_4_EXCEPTIONAL";

export interface PSTQStream {
  id: PSTQStreamId;
  streamName: string;
  teerRange: number[]; // [0,1,2] or [3,4,5]
  frenchOralMin: number; // e.g., 7 or 5 (Échelle québécoise)
  frenchWrittenMin?: number; // e.g., 5 (only Stream 1/3/4)
  minWorkExperienceYears?: number;
  minQuebecWorkExperienceYears?: number;
  requiresProfessionalOrderRecognition?: boolean;
  notes: string;
}

export interface QuebecPSTQResult {
  streamId: PSTQStreamId;
  stream: PSTQStream;
  eligible: boolean;
  missingRequirements: string[];
  frenchLevelMet: boolean;
  workExperienceMet: boolean;
  recognitionStatus: "not_applicable" | "pending" | "recognized";
}

// Verified against official quebec.ca rules (Effective July 2026)
export const QUEBEC_PSTQ_STREAMS: PSTQStream[] = [
  {
    id: "STREAM_1_SPECIALIZED",
    streamName: "PSTQ Stream 1 — Highly Qualified and Specialized Skills",
    teerRange: [0, 1, 2],
    frenchOralMin: 7,
    frenchWrittenMin: 5,
    notes: "For highly skilled and specialized workers (TEER 0, 1, 2). Requires oral French level 7 and written French level 5 on the Quebec scale.",
  },
  {
    id: "STREAM_2_INTERMEDIATE",
    streamName: "PSTQ Stream 2 — Intermediate and Manual Skills",
    teerRange: [3, 4, 5],
    frenchOralMin: 5,
    minWorkExperienceYears: 2,
    minQuebecWorkExperienceYears: 1, // at least 1 year in Quebec out of 2 total years
    notes: "For intermediate and manual occupations (TEER 3, 4, 5). Requires oral French level 5, 2 years of work experience in the last 5 years, including at least 1 year in Quebec.",
  },
  {
    id: "STREAM_3_REGULATED",
    streamName: "PSTQ Stream 3 — Regulated Professions",
    teerRange: [0, 1, 2, 3, 4, 5],
    frenchOralMin: 7,
    frenchWrittenMin: 5,
    requiresProfessionalOrderRecognition: true,
    notes: "For professions regulated by a professional order in Quebec. Requires oral French level 7, written level 5, and professional order recognition or denklik.",
  },
  {
    id: "STREAM_4_EXCEPTIONAL",
    streamName: "PSTQ Stream 4 — Exceptional Talent",
    teerRange: [0, 1, 2, 3, 4, 5],
    frenchOralMin: 7,
    frenchWrittenMin: 5,
    minWorkExperienceYears: 3,
    notes: "For candidates with exceptional potential or talent. Requires oral French level 7, written level 5, and at least 3 years of work experience in the last 5 years. Note: CALQ arts/culture intake is currently closed.",
  },
];

/**
 * Returns localized intro explanation of Quebec's PSTQ selection system.
 */
export function quebecStreamsIntroText(locale: Locale): string {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";

  if (isTr) {
    return "Quebec PSTQ (Programme de sélection des travailleurs qualifiés) sistemi, 29 Kasım 2024 itibarıyla eski puanlama sisteminin (RSWP/QSWP) yerini almıştır. Arrima portalı üzerinden işleyen bu sistem, adayları 4 farklı stream üzerinden değerlendirir ve Fransızca dil yeterliliğini ana şart (hard gate) koşar. Quebec federal Express Entry'den tamamen bağımsız olup ayrı bir başvuru prosedürüne tabidir.";
  }
  if (isZh) {
    return "魁北克 PSTQ（技术工人选拔计划）已于 2024 年 11 月 29 日全面取代原有的 RSWP/QSWP 评分系统。该系统通过 Arrima 平台运行，将申请人划分为 4 个不同的类别通道，并将法语水平设定为核心准入要求。魁北克移民体系与联邦 Express Entry 完全独立，须遵循省内单独申请流程。";
  }
  return "The Quebec PSTQ (Programme de sélection des travailleurs qualifiés) replaced the former RSWP/QSWP system on November 29, 2024. Operating via the Arrima platform, it divides candidates into 4 separate streams and imposes hard French language requirements. Quebec immigration runs completely independently of the federal Express Entry system.";
}

/**
 * Lists NOC categories considered art/culture (subject to CALQ restrictions).
 */
export function isCalqArtsOccupation(nocCode?: string): boolean {
  if (!nocCode) return false;
  // Art/Culture NOC codes typically start with 5 (e.g., 51111, 52120, etc. under NOC 2021)
  return nocCode.startsWith("5");
}

/**
 * Resolves priority stream for a candidate. Regulated professions take priority and go to Stream 3.
 */
export function resolvePSTQStream(nocCode: string, isRegulatedProfession: boolean, teer: number): PSTQStreamId {
  if (isRegulatedProfession) {
    return "STREAM_3_REGULATED";
  }
  if (teer >= 3) {
    return "STREAM_2_INTERMEDIATE";
  }
  return "STREAM_1_SPECIALIZED";
}
