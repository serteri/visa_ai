/**
 * How a source is shown to the customer. Internally the data carries snapshot names such as
 * "NSW Skilled Nominated visa (subclass 190) (fetched 2026-10-13).md" and notes about how a fact was confirmed; the report prints
 * organisation, page / document title, official URL and a checked date, never a repository filename or an implementation detail.
 */
import type { Locale } from "@/lib/readiness/types";
import { STATE_RESEARCH_SOURCES } from "@/lib/marketing/research-journey";
import { T } from "./report-text";

const ORG: Record<string, { en: string; tr: string; zh: string }> = {
  ACT: { en: "ACT Government", tr: "ACT Hükümeti", zh: "ACT 政府" },
  NSW: { en: "NSW Government", tr: "NSW Hükümeti", zh: "新州政府" },
  NT: { en: "NT Government", tr: "NT Hükümeti", zh: "北领地政府" },
  QLD: { en: "Queensland Government", tr: "Queensland Hükümeti", zh: "昆士兰州政府" },
  SA: { en: "South Australian Government", tr: "Güney Avustralya Hükümeti", zh: "南澳州政府" },
  TAS: { en: "Tasmanian Government (Migration Tasmania)", tr: "Tazmanya Hükümeti (Migration Tasmania)", zh: "塔州政府（Migration Tasmania）" },
  VIC: { en: "Victorian Government", tr: "Victoria Hükümeti", zh: "维州政府" },
  WA: { en: "Government of Western Australia", tr: "Batı Avustralya Hükümeti", zh: "西澳州政府" },
};

export const stateOrganisation = (code: string, l: Locale): string => {
  const o = ORG[code];
  return o ? T(l, o.en, o.tr, o.zh) : code;
};

export const stateOfficialUrl = (code: string): string => STATE_RESEARCH_SOURCES.find((s) => s.code === code)?.url ?? "";

const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2026-10-13" -> "13 October 2026" (en); other languages use the locale's long date. Anything else is returned unchanged. */
export function longDate(iso: string, l: Locale): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (l === "en") return `${d} ${MONTHS_EN[mo - 1]} ${y}`;
  return new Intl.DateTimeFormat(l === "tr" ? "tr-TR" : "zh-CN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, mo - 1, d)));
}

/** The page / document title of one internal source name: no extension, no "(fetched ...)" / "(checked ...)" stamp, no state-code prefix, no "user-confirmed" wording. */
export function publicDocumentTitle(doc: string, code?: string): string {
  let t = (doc.split("/").pop() ?? doc).trim();
  t = t.replace(/\.(md|pdf|png|xlsx|csv|json|txt)$/i, "");
  t = t.replace(/\s*\((?:fetched|checked)\s+\d{4}-\d{2}-\d{2}\)\s*/gi, " ");
  if (code) t = t.replace(new RegExp(`^${code}\\s+`), "");
  t = t.replace(/\buser-confirmed (status|program settings)\b/i, (_m, what: string) => (what.toLowerCase() === "status" ? "Program status" : "Program settings"));
  return t.replace(/\s{2,}/g, " ").replace(/\s+--\s+/g, " – ").trim();
}

/** The titles of a state's source documents, de-duplicated, in order. */
export function publicStateSourceTitles(sourceDocument: string | undefined, code: string): string[] {
  const titles = (sourceDocument ?? "")
    .split(";")
    .map((d) => publicDocumentTitle(d.trim(), code))
    .filter(Boolean);
  return [...new Set(titles)];
}

/** One line for a state's source: "<organisation> — <titles>". The official URL is a separate field. */
export function publicStateSource(code: string, titles: string[], l: Locale): string {
  return titles.length ? `${stateOrganisation(code, l)} — ${titles.join("; ")}` : stateOrganisation(code, l);
}

/**
 * A published-condition sentence with the internal wording of how it was confirmed replaced by neutral wording
 * ("Confirmed by the project owner on 13 October 2026" -> "Confirmed against the official page on 13 October 2026";
 * "(the site could not be fetched automatically)" is dropped).
 */
export function publicConditionText(text: string): string {
  return text
    .replace(/Confirmed by the project owner on the official ([^.]*?) pages on/gi, "Confirmed against the official $1 pages on")
    .replace(/Confirmed by the project owner on/gi, "Confirmed against the official page on")
    .replace(/\s*\((?:the )?(?:site|page|pages) could not be fetched automatically\)/gi, "")
    .replace(/the earlier ([A-Za-z ]+?) document/gi, "the earlier $1 page")
    // Time-sensitive wording is the source's statement on the date checked, not a statement about the report date.
    .replace(/\bhas not yet been confirmed\b/gi, "had not yet been confirmed")
    .replace(/\bis scheduled for\b/gi, "was recorded as scheduled for")
    .replace(/: not yet confirmed by\b/gi, ": was not yet confirmed by")
    .replace(/\s{2,}/g, " ")
    .trim();
}
