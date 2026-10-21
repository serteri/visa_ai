/**
 * The verified Canadian data the Canada report reads, in one place. Nothing here is computed or estimated: every value is held in
 * src/data/countries/ca/*.json, src/data/visa-details.json or lib/readiness/pnp-provinces.ts (dates are the files' own "last verified" dates).
 * The Australian report never imports this module and this module never imports anything Australian.
 */
import expressEntry from "@/src/data/countries/ca/express-entry.json";
import pnpProcess from "@/src/data/countries/ca/pnp-non-express-process.json";
import quebecFederal from "@/src/data/countries/ca/quebec-selected-skilled-workers.json";
import nocList from "@/src/data/countries/ca/noc-list.json";
import visaDetails from "@/src/data/visa-details.json";
import { ALBERTA_AAIP_STREAMS, BC_PNP_STREAMS, ONTARIO_ANNOUNCED_UNPUBLISHED_STREAMS, ONTARIO_WORKFORCE_PRIORITY_STREAMS, type ProvinceStream } from "@/lib/readiness/pnp-provinces";

/** The program identifiers of the Assessment's Canada list (lib/countries.ts countryVisaPathways.CA). */
export type CaProgramKey = "cec" | "fsw" | "fstp" | "pnp" | "aip" | "family";

export const CA_PROGRAM_ORDER: readonly CaProgramKey[] = ["cec", "fsw", "fstp", "pnp", "aip", "family"];

export const CA_PROGRAM_SLUG: Record<CaProgramKey, string> = {
  cec: "canada-express-entry-cec",
  fsw: "canada-express-entry-fsw",
  fstp: "canada-express-entry-fstp",
  pnp: "canada-pnp-non-express-entry",
  aip: "atlantic-immigration-program",
  family: "canada-family-sponsorship",
};

/** The programs named by a stored preferredPathway ("canada-express-entry-fsw,canada-express-entry-cec"); none when it names none. */
export function selectedCaPrograms(preferredPathway: string | undefined | null): CaProgramKey[] {
  const slugs = String(preferredPathway ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return CA_PROGRAM_ORDER.filter((k) => slugs.includes(CA_PROGRAM_SLUG[k]));
}

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export const EE = expressEntry as unknown as Json;
export const PNP = pnpProcess as unknown as Json;
export const QC_FEDERAL = quebecFederal as unknown as Json;

const DETAILS = visaDetails as unknown as Json[];
export const caVisaDetail = (id: "canada-atlantic-immigration-program" | "canada-family-sponsorship" | "canada-express-entry"): Json | undefined =>
  DETAILS.find((d) => d.id === id || d.subclass === id);

type NocEntry = { code: string; title: string; teer: number };
/** The NOC 2021 code in an occupation string ("Software developers and programmers (21232)") and its TEER category from the NOC list. */
export function nocFromOccupation(occupation: string | undefined | null): { code: string; teer: number; title?: string } | undefined {
  const m = /\b(\d{5})\b/.exec(String(occupation ?? ""));
  if (!m) return undefined;
  const entry = (nocList as NocEntry[]).find((n) => n.code === m[1]);
  return { code: m[1], teer: entry ? entry.teer : Number(m[1][1]), title: entry?.title };
}

/** The first number in a language level ("CLB 9" -> 9, "NCLC 7" -> 7). */
export const clbOf = (level: string | undefined | null): number | undefined => {
  const m = /(\d{1,2})/.exec(String(level ?? ""));
  return m ? Number(m[1]) : undefined;
};

/** One neutral paragraph per province, from the facts recorded with its streams (lib/readiness/pnp-provinces.ts); none describes an eligibility result. */
export const PROVINCE_NOTES: Record<"ON" | "BC" | "AB", string> = {
  ON: "Ontario replaced its previous eight OINP streams with a single Ontario Workforce Priority Stream (TEER 0-3, TEER 4-5 and Self-Employed Physicians pathways) under a regulation change that took effect on 26 June 2026. Its expression of interest intake was recorded as closed on the date checked, with a reopening expected later in summer 2026 and no confirmed date. Three further streams have been announced without published eligibility detail (Priority healthcare, Entrepreneur and Exceptional talent); none of them is described here. The OINP's official updates give the current position.",
  BC: "British Columbia's Skills Immigration and Express Entry BC pathways almost exclusively require a full-time, indeterminate job offer in BC. The Entry Level and Semi-Skilled stream was permanently closed in December 2024. The Skills Immigration application fee increased to CAD 1,750 on 22 January 2026. Targeted invitations in construction trades require SkilledTradesBC certification or apprenticeship; those targeted streams are not covered here.",
  AB: "The Alberta Advantage Immigration Program lists four worker streams here. The Alberta Opportunity Stream requires a valid work permit, active employment in Alberta and a job offer. The Alberta Express Entry Stream requires no job offer but, as recorded, a minimum CRS score of 300. The Family Connection and Occupation in Demand pathways were permanently closed on 17 March 2025. A worker expression of interest fee of CAD 135 (from 7 April 2026) and an application fee of CAD 1,500 are recorded. Alberta's draws are unscheduled and occur at irregular intervals.",
};

export type ProvinceBlock = {
  code: "ON" | "BC" | "AB";
  name: { en: string; tr: string; zh: string };
  streams: ProvinceStream[];
  /** The official pages the streams were verified against (headers of lib/readiness/pnp-provinces.ts). */
  urls: string[];
  /** The date those headers record. */
  verified: string;
  unpublished?: readonly string[];
};

export const PROVINCES: ProvinceBlock[] = [
  {
    code: "ON",
    name: { en: "Ontario", tr: "Ontario", zh: "安大略省" },
    streams: ONTARIO_WORKFORCE_PRIORITY_STREAMS,
    urls: ["https://www.ontario.ca/page/ontario-workforce-priority-stream", "https://www.ontario.ca/page/2026-ontario-immigrant-nominee-program-updates"],
    verified: "2026-07-25",
    unpublished: ONTARIO_ANNOUNCED_UNPUBLISHED_STREAMS,
  },
  {
    code: "BC",
    name: { en: "British Columbia", tr: "British Columbia", zh: "不列颠哥伦比亚省" },
    streams: BC_PNP_STREAMS,
    urls: ["https://www.welcomebc.ca/Immigrate-to-B-C/About-The-BC-PNP"],
    verified: "2026-07-25",
  },
  {
    code: "AB",
    name: { en: "Alberta", tr: "Alberta", zh: "阿尔伯塔省" },
    streams: ALBERTA_AAIP_STREAMS,
    urls: ["https://www.alberta.ca/alberta-advantage-immigration-program"],
    verified: "2026-07-25",
  },
];

/** Provincial fees recorded with the same verification (headers of lib/readiness/pnp-provinces.ts). */
export const PROVINCIAL_FEES: Array<{ province: "BC" | "AB"; en: string; tr: string; zh: string; amount: string; verified: string }> = [
  { province: "BC", en: "BC PNP Skills Immigration application fee (increase effective 22 January 2026)", tr: "BC PNP Skills Immigration başvuru ücreti (22 Ocak 2026'dan geçerli artış)", zh: "BC PNP 技术移民申请费（自 2026 年 1 月 22 日起上调）", amount: "CAD 1,750", verified: "2026-07-25" },
  { province: "AB", en: "AAIP worker expression of interest fee (from 7 April 2026)", tr: "AAIP ilgi beyanı ücreti (7 Nisan 2026'dan itibaren)", zh: "AAIP 意向登记费（自 2026 年 4 月 7 日起）", amount: "CAD 135", verified: "2026-07-25" },
  { province: "AB", en: "AAIP application fee (from 7 April 2026)", tr: "AAIP başvuru ücreti (7 Nisan 2026'dan itibaren)", zh: "AAIP 申请费（自 2026 年 4 月 7 日起）", amount: "CAD 1,500", verified: "2026-07-25" },
];
