import { traAustraliaAuthority } from "./authorities/tra-australia";

/**
 * Which TRA program applies: the standard Migration Skills Assessment (MSA, AUD 795) or the Offshore Skills
 * Assessment Program (OSAP). Source: Trades Recognition Australia -- Migration Skills Assessment Program Guidelines
 * (July 2026), data/knowledge/Skill Assessments/Trades Recognition Australia:
 *   - p.1-2: MSA is not open to the licensed occupations (Air conditioning and Refrigeration Mechanic, Electrician
 *     (General), Electrician (Special Class), Plumber (General)) nor to applicants whose passport country and
 *     occupation require OSAP.
 *   - p.3: OSAP is for an occupation on the OSAP occupation list held with a passport from a country listed for it;
 *     on the list but from another country, you "may still choose" OSAP.
 *   - p.4: OSAP is compulsory for permanent migration in the four licensed occupations; Pathway 1 without a relevant
 *     Australian VET qualification, Pathway 2 with one or with a current Australian occupation licence.
 *   - p.5: fees (the registry's OSAP pathway). p.7-10: the occupation list with each occupation's countries
 *     ("ALL": "Applicants from all countries in this occupation are required to have an OSAP assessment").
 */
export const TRA_OSAP_OCCUPATIONS: Record<string, { title: string; page: number; countries: "ALL" | string[] }> = {
  "342111": { title: "Airconditioning and Refrigeration Mechanic", page: 7, countries: "ALL" },
  "321111": { title: "Automotive Electrician", page: 7, countries: ["Fiji", "Hong Kong SAR", "India", "Macau SAR", "Philippines", "South Africa", "Thailand", "Vietnam", "Zimbabwe"] },
  "351111": { title: "Baker", page: 7, countries: ["China", "Fiji", "Hong Kong SAR", "India", "Ireland", "Macau SAR", "Papua New Guinea", "Philippines", "Republic of Korea", "South Africa", "Sri Lanka", "Thailand", "United Kingdom", "Vietnam", "Zimbabwe"] },
  "331111": { title: "Bricklayer", page: 7, countries: ["Brazil", "Fiji", "Hong Kong SAR", "India", "Macau SAR", "Philippines", "South Africa", "Thailand", "Vietnam", "Zimbabwe"] },
  "394111": { title: "Cabinetmaker", page: 7, countries: ["Brazil", "Fiji", "Hong Kong SAR", "India", "Macau SAR", "Philippines", "South Africa", "Thailand", "Vietnam", "Zimbabwe"] },
  "331212": { title: "Carpenter", page: 7, countries: ["Brazil", "Fiji", "Hong Kong SAR", "India", "Macau SAR", "Papua New Guinea", "Philippines", "South Africa", "Thailand", "Vietnam", "Zimbabwe"] },
  "331211": { title: "Carpenter and Joiner", page: 7, countries: ["Brazil", "Fiji", "Hong Kong SAR", "India", "Macau SAR", "Philippines", "South Africa", "Thailand", "Vietnam", "Zimbabwe"] },
  "351311": { title: "Chef", page: 7, countries: ["Bangladesh", "Brazil", "China", "Fiji", "Hong Kong SAR", "India", "Iran", "Ireland", "Macau SAR", "Nepal", "Pakistan", "Papua New Guinea", "Philippines", "Republic of Korea", "South Africa", "Sri Lanka", "Thailand", "United Arab Emirates", "United Kingdom", "Vietnam", "Zimbabwe"] },
  "351411": { title: "Cook", page: 8, countries: ["Bangladesh", "Brazil", "China", "Fiji", "Hong Kong SAR", "India", "Iran", "Ireland", "Macau SAR", "Nepal", "Pakistan", "Papua New Guinea", "Philippines", "Republic of Korea", "South Africa", "Sri Lanka", "Thailand", "United Arab Emirates", "United Kingdom", "Vietnam", "Zimbabwe"] },
  "321212": { title: "Diesel Motor Mechanic", page: 8, countries: ["Fiji", "Hong Kong SAR", "India", "Macau SAR", "Philippines", "South Africa", "Thailand", "Vietnam", "Zimbabwe"] },
  "341111": { title: "Electrician (General)", page: 8, countries: "ALL" },
  "341112": { title: "Electrician (Special Class)", page: 8, countries: "ALL" },
  "342313": { title: "Electronic Equipment Trades Worker", page: 8, countries: ["China", "Fiji", "Hong Kong SAR", "India", "Ireland", "Macau SAR", "Philippines", "South Africa", "Sri Lanka", "Thailand", "United Kingdom", "Vietnam", "Zimbabwe"] },
  "323211": { title: "Fitter (General)", page: 8, countries: ["Brazil", "China", "Fiji", "Hong Kong SAR", "India", "Iran", "Ireland", "Macau SAR", "Philippines", "Republic of Korea", "South Africa", "Sri Lanka", "Thailand", "United Arab Emirates", "United Kingdom", "Vietnam", "Zimbabwe"] },
  "323212": { title: "Fitter and Turner", page: 9, countries: ["Brazil", "China", "Fiji", "Hong Kong SAR", "India", "Iran", "Ireland", "Macau SAR", "Philippines", "Republic of Korea", "South Africa", "Thailand", "United Arab Emirates", "United Kingdom", "Vietnam", "Zimbabwe"] },
  "323213": { title: "Fitter – Welder", page: 9, countries: ["Brazil", "China", "Fiji", "Hong Kong SAR", "India", "Iran", "Ireland", "Macau SAR", "Philippines", "Republic of Korea", "South Africa", "Thailand", "United Arab Emirates", "United Kingdom", "Vietnam", "Zimbabwe"] },
  "391111": { title: "Hairdresser", page: 9, countries: ["Brazil", "China", "Fiji", "Hong Kong SAR", "India", "Iran", "Ireland", "Macau SAR", "Philippines", "Republic of Korea", "South Africa", "Sri Lanka", "Thailand", "United Arab Emirates", "United Kingdom", "Vietnam", "Zimbabwe"] },
  "331213": { title: "Joiner", page: 9, countries: ["Brazil", "Fiji", "Hong Kong SAR", "India", "Macau SAR", "Philippines", "South Africa", "Thailand", "Vietnam", "Zimbabwe"] },
  "322311": { title: "Metal Fabricator", page: 9, countries: ["Brazil", "China", "Fiji", "Hong Kong SAR", "India", "Iran", "Ireland", "Macau SAR", "Philippines", "Republic of Korea", "South Africa", "Sri Lanka", "Thailand", "United Arab Emirates", "United Kingdom", "Vietnam", "Zimbabwe"] },
  "323214": { title: "Metal Machinist (First Class)", page: 9, countries: ["Brazil", "China", "Fiji", "Hong Kong SAR", "India", "Iran", "Ireland", "Macau SAR", "Philippines", "Republic of Korea", "South Africa", "Sri Lanka", "Thailand", "United Arab Emirates", "United Kingdom", "Vietnam", "Zimbabwe"] },
  "323299": { title: "Metal Fitters and Machinists (not elsewhere classified)", page: 9, countries: ["Brazil", "China", "Fiji", "Hong Kong SAR", "India", "Iran", "Ireland", "Macau SAR", "Philippines", "Republic of Korea", "South Africa", "Thailand", "United Arab Emirates", "United Kingdom", "Vietnam", "Zimbabwe"] },
  "321211": { title: "Motor Mechanic (General)", page: 9, countries: ["Fiji", "Hong Kong SAR", "India", "Macau SAR", "Philippines", "South Africa", "Thailand", "Vietnam", "Zimbabwe"] },
  "324111": { title: "Panelbeater", page: 9, countries: ["China", "Fiji", "Hong Kong SAR", "India", "Macau SAR", "Philippines", "South Africa", "Thailand", "Vietnam", "Zimbabwe"] },
  "351112": { title: "Pastrycook", page: 10, countries: ["Brazil", "China", "Fiji", "Hong Kong SAR", "India", "Iran", "Ireland", "Macau SAR", "Papua New Guinea", "Philippines", "Republic of Korea", "South Africa", "Sri Lanka", "Thailand", "United Arab Emirates", "United Kingdom", "Vietnam", "Zimbabwe"] },
  "334111": { title: "Plumber (General)", page: 10, countries: "ALL" },
  "322312": { title: "Pressure Welder", page: 10, countries: ["Brazil", "China", "Fiji", "Hong Kong SAR", "India", "Iran", "Ireland", "Macau SAR", "Philippines", "Republic of Korea", "South Africa", "Thailand", "United Arab Emirates", "United Kingdom", "Vietnam", "Zimbabwe"] },
  "322211": { title: "Sheetmetal Trades Worker", page: 10, countries: ["Brazil", "China", "Fiji", "Hong Kong SAR", "India", "Iran", "Ireland", "Macau SAR", "Philippines", "Republic of Korea", "South Africa", "Sri Lanka", "Thailand", "United Arab Emirates", "United Kingdom", "Vietnam", "Zimbabwe"] },
  "323412": { title: "Toolmaker", page: 10, countries: ["Brazil", "China", "Fiji", "Hong Kong SAR", "India", "Iran", "Ireland", "Macau SAR", "Philippines", "Republic of Korea", "South Africa", "Thailand", "United Arab Emirates", "United Kingdom", "Vietnam", "Zimbabwe"] },
  "322313": { title: "Welder (First Class)", page: 10, countries: ["Brazil", "China", "Fiji", "Hong Kong SAR", "India", "Macau SAR", "Philippines", "South Africa", "Thailand", "Vietnam", "Zimbabwe"] },};

/** Intake passport values (ISO codes, or names) -> the country names the OSAP list uses. */
const PASSPORT_NAMES: Record<string, string> = {
  bd: "Bangladesh", br: "Brazil", cn: "China", fj: "Fiji", hk: "Hong Kong SAR", in: "India", ir: "Iran", ie: "Ireland",
  mo: "Macau SAR", np: "Nepal", pk: "Pakistan", pg: "Papua New Guinea", ph: "Philippines", kr: "Republic of Korea",
  za: "South Africa", lk: "Sri Lanka", th: "Thailand", ae: "United Arab Emirates", gb: "United Kingdom", uk: "United Kingdom",
  vn: "Vietnam", zw: "Zimbabwe", "hong kong": "Hong Kong SAR", macau: "Macau SAR", "south korea": "Republic of Korea",
  korea: "Republic of Korea", uae: "United Arab Emirates",
};

function passportName(passportCountry: string | undefined): string | undefined {
  const p = (passportCountry ?? "").trim();
  if (!p) return undefined;
  return PASSPORT_NAMES[p.toLowerCase()] ?? p;
}

export type TraProgram = {
  program: "MSA" | "OSAP";
  /** licensed: OSAP for every country; passport: OSAP for this passport; not_listed: MSA only; passport_other / passport_unknown: MSA, OSAP if the passport is one of `osapCountries`. */
  reason: "licensed" | "passport" | "not_listed" | "passport_other" | "passport_unknown";
  /** Page of the OSAP occupation list entry (absent when the occupation is not on it). */
  page?: number;
  osapCountries?: string[];
  /** OSAP only: 1 without a relevant Australian VET qualification, 2 with one; undefined when not known. */
  osapPathway?: 1 | 2;
  amountMin: number;
  amountMax: number;
};

const feeByLabel = (pathwayId: string, label: string) => {
  const fee = traAustraliaAuthority.pathways.find((p) => p.pathwayId === pathwayId)?.fees.find((f) => typeof f.label !== "string" && f.label.en === label)?.amountAUD;
  if (fee === undefined) throw new Error(`tra-australia.ts: no "${label}" fee in pathway ${pathwayId}`);
  return fee;
};

/** OSAP fees from the registry (TRA guidelines p.5): Pathway 1 documentary + interview, practical if required. */
export const OSAP_FEES = {
  pathway1Min: feeByLabel("OSAP", "Pathway 1: Documentary Evidence") + feeByLabel("OSAP", "Pathway 1: Technical Interview"),
  pathway1Practical: feeByLabel("OSAP", "Pathway 1: Practical Assessment (if required)"),
  pathway1Max: feeByLabel("OSAP", "Pathway 1 Total Max"),
  pathway2: feeByLabel("OSAP", "Pathway 2 Total Max"),
};
const MSA_FEE = feeByLabel("MSA", "Migration Skills Assessment");

export function resolveTraProgram(input: {
  anzscoCode: string | undefined;
  passportCountry?: string;
  qualificationAwardedInAustralia?: boolean;
}): TraProgram {
  const entry = input.anzscoCode ? TRA_OSAP_OCCUPATIONS[input.anzscoCode] : undefined;
  const msa = (reason: TraProgram["reason"]): TraProgram => ({
    program: "MSA", reason, page: entry?.page, osapCountries: Array.isArray(entry?.countries) ? entry.countries : undefined, amountMin: MSA_FEE, amountMax: MSA_FEE,
  });
  if (!entry) return msa("not_listed");
  let reason: TraProgram["reason"] = "licensed";
  if (entry.countries !== "ALL") {
    const passport = passportName(input.passportCountry);
    if (!passport) return msa("passport_unknown");
    if (!entry.countries.some((c) => c.toLowerCase() === passport.toLowerCase())) return msa("passport_other");
    reason = "passport";
  }
  const osapPathway = input.qualificationAwardedInAustralia === true ? 2 : input.qualificationAwardedInAustralia === false ? 1 : undefined;
  return {
    program: "OSAP",
    reason,
    page: entry.page,
    osapCountries: Array.isArray(entry.countries) ? entry.countries : undefined,
    osapPathway,
    amountMin: osapPathway === 1 ? OSAP_FEES.pathway1Min : OSAP_FEES.pathway2,
    amountMax: osapPathway === 2 ? OSAP_FEES.pathway2 : OSAP_FEES.pathway1Max,
  };
}
