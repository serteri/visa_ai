/**
 * Everything an occupation page says, built from data only -- one pure module so the page, its metadata, the sitemap and
 * the tests (unique titles, banned wording in every locale) read the same strings. Information only: no verdicts, no
 * recommendations, no instructions.
 */
import occupationsData from "@/src/data/occupations.json";
import type { Locale } from "@/lib/i18n/config";
import { authorityDisplayName, resolveAssessingAuthority } from "@/lib/skills-assessment/resolve-authority";
import { occupationRichness, stateListRows, latestVerifiedDate, type OccupationRichness, type StateListRow } from "./richness";
import { buildOccupationSlug, deriveSubclasses, findAnzscoListEntry, localizedDuties, localizedTitle, type OccupationRecord } from "./seo";

export const OCCUPATION_DATASET_DATE = (occupationsData as { generated_on: string }).generated_on;

export const HOME_AFFAIRS_SOL_URL = "https://immi.homeaffairs.gov.au/visas/working-in-australia/skill-occupation-list";

const LIST_NAMES: Record<string, string> = {
  CSOL: "Core Skills Occupation List (CSOL)",
  MLTSSL: "Medium and Long-term Strategic Skills List (MLTSSL)",
  STSOL: "Short-term Skilled Occupation List (STSOL)",
  ROL: "Regional Occupation List (ROL)",
};

type Strings = {
  titleSuffix: (name: string, code: string) => string;
  descParts: {
    head: (name: string, code: string) => string;
    authority: (a: string) => string;
    lists: (l: string) => string;
    states: (n: number, names: string) => string;
    tail: (dateKind: "verified" | "dataset", date: string) => string;
  };
  intro: (name: string, code: string) => string;
  h2: { details: string; states: string; duties: string; sources: string; related: string };
  labels: { code: string; authority: string; authorityNone: string; lists: string; listsNone: string; subclasses: string; stateColumn: string; stateSubclasses: string; stateLevel: string; checked: string };
  stateLevel: { occupation: string; "unit-group": string };
  stateNote: string;
  stateNoData: string;
  sources: { dataset: (d: string) => string; authority: (d: string) => string; states: (d: string) => string; official: string };
  related: { calculator: string; finder: string; visa: (s: string) => string };
  notice: string;
};

const STRINGS: Record<Locale, Strings> = {
  en: {
    titleSuffix: (name, code) => `${name} (${code}): Australian visa occupation information`,
    descParts: {
      head: (name, code) => `ANZSCO ${code} ${name}.`,
      authority: (a) => ` Assessing authority: ${a}.`,
      lists: (l) => ` National list placement: ${l}.`,
      states: (n, names) => ` Entries on ${n} state/territory ${n === 1 ? "list" : "lists"} (${names}).`,
      tail: (kind, d) => (kind === "verified" ? ` Information only; sources verified ${d}.` : ` Information only; dataset dated ${d}.`),
    },
    intro: (name, code) => `This page sets out what our data holds for ${name} (ANZSCO ${code}): the assessing authority, national skilled occupation list placement and state or territory list entries, each with its source date.`,
    h2: { details: "Occupation details", states: "State and territory list entries", duties: "ANZSCO duties", sources: "Sources and dates", related: "Related information" },
    labels: { code: "ANZSCO code", authority: "Assessing authority", authorityNone: "Not stated in our data", lists: "National list placement", listsNone: "Not stated in our data", subclasses: "Visa subclasses mapped to those lists in our data", stateColumn: "State / territory", stateSubclasses: "Subclasses", stateLevel: "List level", checked: "Checked" },
    stateLevel: { occupation: "Occupation", "unit-group": "Unit group (4-digit)" },
    stateNote: "A state or territory list entry is published information. It is not a nomination and does not show that any state will nominate.",
    stateNoData: "No entry for this occupation on the lists we hold for ACT, NSW, NT, QLD or WA. SA, TAS and VIC publish no occupation-level list in our data.",
    sources: {
      dataset: (d) => `Occupation list placement: dataset dated ${d}.`,
      authority: (d) => `Assessing authority details last verified ${d}.`,
      states: (d) => `State and territory lists last verified ${d}.`,
      official: "Official list: Department of Home Affairs, Skilled Occupation List",
    },
    related: { calculator: "Points calculator", finder: "ANZSCO finder", visa: (s) => `Subclass ${s} information` },
    notice: "General information compiled from published sources. It is not migration advice and is not reviewed by a migration agent.",
  },
  tr: {
    titleSuffix: (name, code) => `${name} (${code}): Avustralya vize meslek bilgileri`,
    descParts: {
      head: (name, code) => `ANZSCO ${code} ${name}.`,
      authority: (a) => ` Değerlendirme kurumu: ${a}.`,
      lists: (l) => ` Ulusal liste: ${l}.`,
      states: (n, names) => ` ${n} eyalet/bölge listesinde kayıt (${names}).`,
      tail: (kind, d) => (kind === "verified" ? ` Yalnızca bilgi; kaynaklar ${d} tarihinde doğrulandı.` : ` Yalnızca bilgi; veri seti tarihi ${d}.`),
    },
    intro: (name, code) => `Bu sayfa, ${name} (ANZSCO ${code}) için verilerimizde bulunanları gösterir: değerlendirme kurumu, ulusal nitelikli meslek listesi ve eyalet veya bölge listesi kayıtları; her birinin kaynak tarihiyle.`,
    h2: { details: "Meslek bilgileri", states: "Eyalet ve bölge listesi kayıtları", duties: "ANZSCO görev tanımı", sources: "Kaynaklar ve tarihler", related: "İlgili bilgiler" },
    labels: { code: "ANZSCO kodu", authority: "Değerlendirme kurumu", authorityNone: "Verilerimizde belirtilmemiş", lists: "Ulusal liste", listsNone: "Verilerimizde belirtilmemiş", subclasses: "Verilerimizde bu listelerle eşleşen vize alt sınıfları", stateColumn: "Eyalet / bölge", stateSubclasses: "Alt sınıflar", stateLevel: "Liste düzeyi", checked: "Kontrol tarihi" },
    stateLevel: { occupation: "Meslek", "unit-group": "Birim grubu (4 haneli)" },
    stateNote: "Eyalet veya bölge listesindeki bir kayıt yayımlanmış bilgidir. Bir adaylık (nomination) değildir ve herhangi bir eyaletin aday göstereceğini göstermez.",
    stateNoData: "ACT, NSW, NT, QLD ve WA için elimizdeki listelerde bu mesleğe ait kayıt yok. SA, TAS ve VIC için verilerimizde meslek düzeyinde liste bulunmuyor.",
    sources: {
      dataset: (d) => `Meslek listesi kaydı: ${d} tarihli veri seti.`,
      authority: (d) => `Değerlendirme kurumu bilgileri en son ${d} tarihinde doğrulandı.`,
      states: (d) => `Eyalet ve bölge listeleri en son ${d} tarihinde doğrulandı.`,
      official: "Resmî liste: İçişleri Bakanlığı (Department of Home Affairs), Skilled Occupation List",
    },
    related: { calculator: "Puan hesaplayıcı", finder: "ANZSCO bulucu", visa: (s) => `Subclass ${s} bilgileri` },
    notice: "Yayımlanmış kaynaklardan derlenen genel bilgidir. Göçmenlik danışmanlığı değildir ve bir göçmenlik danışmanı tarafından incelenmemiştir.",
  },
  "zh-Hans": {
    titleSuffix: (name, code) => `${name}（${code}）：澳大利亚签证职业信息`,
    descParts: {
      head: (name, code) => `ANZSCO ${code} ${name}。`,
      authority: (a) => `评估机构：${a}。`,
      lists: (l) => `国家职业清单：${l}。`,
      states: (n, names) => `列入 ${n} 个州/领地清单（${names}）。`,
      tail: (kind, d) => (kind === "verified" ? `仅供参考；来源核对于 ${d}。` : `仅供参考；数据集日期 ${d}。`),
    },
    intro: (name, code) => `本页列出我们数据中关于 ${name}（ANZSCO ${code}）的内容：评估机构、国家技术职业清单及各州或领地清单的收录情况，并注明各项来源日期。`,
    h2: { details: "职业信息", states: "各州和领地清单收录情况", duties: "ANZSCO 职责说明", sources: "来源与日期", related: "相关信息" },
    labels: { code: "ANZSCO 代码", authority: "评估机构", authorityNone: "我们的数据中未注明", lists: "国家职业清单", listsNone: "我们的数据中未注明", subclasses: "我们的数据中与这些清单对应的签证子类", stateColumn: "州 / 领地", stateSubclasses: "子类", stateLevel: "清单层级", checked: "核对日期" },
    stateLevel: { occupation: "职业", "unit-group": "单元组（4 位）" },
    stateNote: "州或领地清单中的收录是已公布的信息，并非提名，也不表示任何州会提名。",
    stateNoData: "我们掌握的 ACT、NSW、NT、QLD、WA 清单中没有该职业的收录。SA、TAS、VIC 在我们的数据中没有职业级别的清单。",
    sources: {
      dataset: (d) => `职业清单归属：数据集日期 ${d}。`,
      authority: (d) => `评估机构信息最近核对于 ${d}。`,
      states: (d) => `州和领地清单最近核对于 ${d}。`,
      official: "官方清单：澳大利亚内政部（Department of Home Affairs）技术职业清单",
    },
    related: { calculator: "积分计算器", finder: "ANZSCO 职业查找", visa: (s) => `${s} 子类信息` },
    notice: "本页为根据公开来源整理的一般信息，不属于移民咨询意见，也未经移民代理审阅。",
  },
};

export type OccupationPageContent = {
  locale: Locale;
  slug: string;
  code: string;
  displayName: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  headings: Strings["h2"];
  labels: Strings["labels"];
  details: { authority?: string; lists?: string; listTokens: string[]; subclasses: string[] };
  stateRows: Array<StateListRow & { levelLabel: string }>;
  stateNote: string;
  stateNoData: string;
  duties: string[];
  sourceLines: string[];
  officialLabel: string;
  officialUrl: string;
  related: Array<{ label: string; path: string }>;
  notice: string;
  richness: OccupationRichness;
  /** ISO date the page's most recent source was verified, else the dataset date. */
  lastModified: string;
};

export function occupationPageContent(record: OccupationRecord, locale: Locale): OccupationPageContent {
  const s = STRINGS[locale];
  const slug = buildOccupationSlug(record);
  const code = record.anzsco_code;
  const entry = findAnzscoListEntry(slug);
  const displayName = entry ? localizedTitle(entry, locale) : record.occupation_name;
  const richness = occupationRichness(record);
  const resolved = resolveAssessingAuthority(code);
  const authority = richness.authority ? authorityDisplayName(resolved) : undefined;
  const listTokens = record.visa_lists ?? [];
  const lists = listTokens.length ? listTokens.map((t) => LIST_NAMES[t] ?? t).join("; ") : undefined;
  const states = stateListRows(record);
  const verified = latestVerifiedDate(richness);

  const verifiedKind = verified ? "verified" : "dataset";
  const verifiedDate = verified ?? OCCUPATION_DATASET_DATE;
  const stateNames = states.map((r) => r.state).join(", ");
  // Longest first to drop: the list tokens, then the state names. Search results show ~160 characters; keep under 300.
  const build = (withLists: boolean, withStates: boolean) =>
    s.descParts.head(displayName, code) +
    (authority ? s.descParts.authority(authority) : "") +
    (withLists && lists ? s.descParts.lists(listTokens.join(", ")) : "") +
    (withStates && states.length ? s.descParts.states(states.length, stateNames) : "") +
    s.descParts.tail(verifiedKind, verifiedDate);
  let description = build(true, true);
  if (description.length > 300) description = build(false, true);
  if (description.length > 300) description = build(false, false);

  const authorityDates = richness.authority ? (resolved.authority?.lastVerified ? [resolved.authority.lastVerified] : []) : [];
  const stateDates = [...new Set(states.map((r) => r.checked))].sort();
  const sourceLines = [
    s.sources.dataset(OCCUPATION_DATASET_DATE),
    ...(authorityDates.length ? [s.sources.authority(authorityDates[0])] : []),
    ...(stateDates.length ? [s.sources.states(stateDates[stateDates.length - 1])] : []),
  ];
  const title = s.titleSuffix(displayName, code);
  return {
    locale,
    slug,
    code,
    displayName,
    title,
    description,
    h1: title,
    intro: s.intro(displayName, code),
    headings: s.h2,
    labels: s.labels,
    details: { authority, lists, listTokens, subclasses: deriveSubclasses(record) },
    stateRows: states.map((r) => ({ ...r, levelLabel: s.stateLevel[r.level] })),
    stateNote: s.stateNote,
    stateNoData: s.stateNoData,
    duties: entry ? localizedDuties(entry, locale) : [],
    sourceLines,
    officialLabel: s.sources.official,
    officialUrl: HOME_AFFAIRS_SOL_URL,
    related: [
      { label: s.related.calculator, path: "/tools/points-calculator/australia" },
      { label: s.related.finder, path: "/tools/anzsco-finder" },
      ...["189", "190", "491"].map((v) => ({ label: s.related.visa(v), path: `/visas/${v}` })),
    ],
    notice: s.notice,
    richness,
    lastModified: verified ?? OCCUPATION_DATASET_DATE,
  };
}

/** Every string a visitor can read on the page (for the banned-wording scan). */
export function occupationPageText(c: OccupationPageContent): string {
  return [
    c.title, c.description, c.h1, c.intro, ...Object.values(c.headings), ...Object.values(c.labels),
    c.details.authority, c.details.lists, ...c.stateRows.map((r) => `${r.state} ${r.levelLabel}`), c.stateNote, c.stateNoData,
    ...c.duties, ...c.sourceLines, c.officialLabel, ...c.related.map((r) => r.label), c.notice,
  ].filter(Boolean).join("\n");
}
