import { researchText } from "@/lib/marketing/research-journey";
import { occupationRichness, type RichnessTier } from "./richness";
import { buildOccupationSlug, findAnzscoListEntry, getUniqueOccupations, localizedTitle, type OccupationRecord } from "./seo";

/**
 * Data for the crawlable occupation index (/occupations, /occupations/group/<1-8>, /occupations/letter/<a-z>).
 * Only occupations that are indexable (tier medium or rich; the thin tier is noindex and not in the sitemap) are listed, so the index never links
 * a crawler to a page that tells it not to index.
 *
 * Group names are the eight ANZSCO major groups (ABS, ANZSCO 2013 v1.3 structure). The tr / zh-Hans names are machine-translated drafts, listed in
 * docs/compliance-review-pack.md until a native speaker has reviewed them; the facts (codes, English titles) are identical in every locale.
 */
export const MAJOR_GROUP_IDS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;
export type MajorGroupId = (typeof MAJOR_GROUP_IDS)[number];

const GROUP_NAMES: Record<MajorGroupId, [string, string, string]> = {
  "1": ["Managers", "Yöneticiler", "经理"],
  "2": ["Professionals", "Profesyoneller", "专业人员"],
  "3": ["Technicians and Trades Workers", "Teknisyenler ve Zanaat Çalışanları", "技术员和技工"],
  "4": ["Community and Personal Service Workers", "Toplum ve Kişisel Hizmet Çalışanları", "社区和个人服务人员"],
  "5": ["Clerical and Administrative Workers", "Büro ve İdari Çalışanlar", "文职和行政人员"],
  "6": ["Sales Workers", "Satış Çalışanları", "销售人员"],
  "7": ["Machinery Operators and Drivers", "Makine Operatörleri ve Sürücüler", "机械操作员和司机"],
  "8": ["Labourers", "İşçiler", "劳动者"],
};

export const isMajorGroup = (v: string): v is MajorGroupId => (MAJOR_GROUP_IDS as readonly string[]).includes(v);
export const majorGroupName = (id: MajorGroupId, locale: string) => researchText(locale, ...GROUP_NAMES[id]);
export const majorGroupOf = (code: string): MajorGroupId | null => (isMajorGroup(code[0]) ? (code[0] as MajorGroupId) : null);

export const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");

export type IndexEntry = { code: string; slug: string; englishName: string; name: string; group: MajorGroupId | null; letter: string; tier: RichnessTier };

function entryFor(record: OccupationRecord, locale: string): IndexEntry {
  const slug = buildOccupationSlug(record);
  const listEntry = findAnzscoListEntry(slug);
  const first = record.occupation_name.trim().charAt(0).toLowerCase();
  return {
    code: record.anzsco_code,
    slug,
    englishName: record.occupation_name,
    name: listEntry ? localizedTitle(listEntry, locale) : record.occupation_name,
    group: majorGroupOf(record.anzsco_code),
    letter: /[a-z]/.test(first) ? first : "#",
    tier: occupationRichness(record).tier,
  };
}

/** The indexable occupations (medium and rich tier), sorted by English name (the A-Z order is the same in every locale). */
export function indexableEntries(locale: string): IndexEntry[] {
  return getUniqueOccupations()
    .map((r) => entryFor(r, locale))
    .filter((e) => e.tier !== "thin")
    .sort((a, b) => a.englishName.localeCompare(b.englishName, "en"));
}

export function entriesByGroup(locale: string, group: MajorGroupId): IndexEntry[] {
  return indexableEntries(locale).filter((e) => e.group === group);
}

export function entriesByLetter(locale: string, letter: string): IndexEntry[] {
  return indexableEntries(locale).filter((e) => e.letter === letter);
}

export function groupCounts(locale: string): Record<MajorGroupId, number> {
  const out = Object.fromEntries(MAJOR_GROUP_IDS.map((g) => [g, 0])) as Record<MajorGroupId, number>;
  for (const e of indexableEntries(locale)) if (e.group) out[e.group]++;
  return out;
}

export function letterCounts(locale: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of indexableEntries(locale)) out[e.letter] = (out[e.letter] ?? 0) + 1;
  return out;
}

/** Rich-tier occupations for hub-page links: highest score first, then name; a fixed, data-driven list (no editorial pick). */
export function richEntries(locale: string, limit: number): IndexEntry[] {
  const scored = getUniqueOccupations()
    .map((r) => ({ r, s: occupationRichness(r) }))
    .filter((x) => x.s.tier === "rich")
    .sort((a, b) => b.s.score - a.s.score || a.r.occupation_name.localeCompare(b.r.occupation_name, "en"));
  return scored.slice(0, limit).map((x) => entryFor(x.r, locale));
}
