import anzscoListRaw from "@/src/data/anzsco-list.json";
import { findOccupationRecord, getSkilledListMembership } from "@/lib/readiness/occupation-eligibility";

/**
 * The ANZSCO occupation picker's search, shared by the full intake form (full-check) and the in-chat quick profile
 * card, so both resolve and list occupations identically. Moved verbatim from full-check-waitlist-form.tsx.
 */
export type AnzscoEntry = { code: string; title: string; title_tr?: string; title_zh?: string; keywords?: string[]; isOnSkilledList?: boolean };

const ANZSCO_INDEX = (anzscoListRaw as Array<Record<string, unknown>>).map((row) => ({
  code: row.code as string,
  title: (row.title_en as string) || (row.title as string) || "",
  title_tr: row.title_tr as string | undefined,
  title_zh: row.title_zh as string | undefined,
  keywords: (row.keywords as string[]) || [],
})) as AnzscoEntry[];
const ANZSCO_SEARCH_ALIAS_MAP: Record<string, string[]> = { doktor: ["pratisyen hekim", "uzman hekim"], doctor: ["general practitioner", "medical practitioners"], hekim: ["pratisyen hekim", "uzman hekim"] };

export function foldLookupValue(v?: string): string {
  return (v ?? "").trim().toLowerCase().replace(/[ıİ]/g, "i").replace(/[şŞ]/g, "s").replace(/[ğĞ]/g, "g").replace(/[çÇ]/g, "c").replace(/[öÖ]/g, "o").replace(/[üÜ]/g, "u").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function getLocalizedAnzscoTitle(entry: AnzscoEntry, locale: string): string {
  if (locale === "tr") return entry.title_tr ?? entry.title;
  if (locale === "zh-Hans") return entry.title_zh ?? entry.title;
  return entry.title;
}

export function resolveAnzscoEntry(value?: string): AnzscoEntry | undefined {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return undefined;
  const explicitCode = trimmed.match(/(\d{6})/)?.[1];
  if (explicitCode) { const m = ANZSCO_INDEX.find((e) => e.code === explicitCode); if (m) return m; }
  const folded = foldLookupValue(trimmed);
  if (!folded) return undefined;
  return ANZSCO_INDEX.find((e) => [e.title, e.title_tr, e.title_zh, `${e.title} (${e.code})`, `${e.title_tr ?? ""} (${e.code})`, `${e.title_zh ?? ""} (${e.code})`].some((c) => foldLookupValue(c) === folded));
}

export function searchAnzsco(query: string, locale: string): AnzscoEntry[] {
  const fq = foldLookupValue(query);
  if (fq.length < 2) return [];
  const aliasTerms = ANZSCO_SEARCH_ALIAS_MAP[fq] ?? [];
  const searchTerms = [fq, ...aliasTerms.map((t) => foldLookupValue(t)).filter(Boolean)];
  const maxResults = locale === "tr" || locale === "zh-Hans" ? 80 : 14;
  return ANZSCO_INDEX.map((entry) => {
    const lt = getLocalizedAnzscoTitle(entry, locale);
    const flt = foldLookupValue(lt), fe = foldLookupValue(entry.title), fc = foldLookupValue(entry.code);
    let best = Infinity;
    for (const term of searchTerms) {
      if (!term) continue;
      if (fc === term) best = Math.min(best, 0);
      if (flt === term) best = Math.min(best, 1);
      if (fe === term) best = Math.min(best, 2);
      if (flt.startsWith(term)) best = Math.min(best, 3);
      if (fe.startsWith(term)) best = Math.min(best, 4);
      if (flt.includes(term)) best = Math.min(best, 5);
      if (fe.includes(term)) best = Math.min(best, 6);
      if (entry.keywords?.some((kw) => foldLookupValue(kw).includes(term))) best = Math.min(best, 7);
    }
    return { entry, score: best };
  }).filter(({ score }) => Number.isFinite(score)).sort((a, b) => a.score - b.score).slice(0, maxResults).map(({ entry }) => {
    const record = findOccupationRecord(entry.code);
    return { ...entry, isOnSkilledList: record ? getSkilledListMembership(record.anzsco_code).length > 0 : false };
  });
}
