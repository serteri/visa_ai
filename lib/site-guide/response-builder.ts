/**
 * Builds what the guide shows: page-context suggestions, quick actions and the answer to a typed question. Every sentence is a fixed template; the
 * guide never concludes anything about the person (no eligibility, recommendation, ranking or prediction) and only links to existing pages.
 */
import { isBoundaryQuestion, matchIntent, normalise, scoreDestination } from "./intent-map";
import { matchShortAnswers, type ShortAnswer } from "./short-answers";
import { AI_ASSISTANT_PATH, COMPARISON_PAIRS, destinationById, destinationsFor } from "./route-registry";
import type { Destination, GuideCountry, GuideLink, GuideLocale, GuideResponse, L3, PageContext } from "./types";

const loc = (l: string): GuideLocale => (l === "tr" ? "tr" : l === "zh-Hans" ? "zh-Hans" : "en");
const pick = (v: L3, l: GuideLocale) => v[l];

/** A locale-prefixed path; the English-only guides are always linked without a prefix. */
export function guidePath(locale: string, path: string, englishOnly = false): string {
  if (englishOnly || locale === "en") return path === "/" ? "/" : path;
  return `/${locale}${path === "/" ? "" : path}`;
}

type LinkOptions = { query?: string; path?: string; titleOverride?: string; descriptionOverride?: string };

export function toLink(d: Destination, locale: string, opts: LinkOptions = {}): GuideLink {
  const l = loc(locale);
  const base = opts.path ?? d.path;
  return {
    id: d.id,
    href: guidePath(locale, `${base}${opts.query ?? ""}`, Boolean(d.englishOnly)),
    title: opts.titleOverride ?? pick(d.title, l),
    description: opts.descriptionOverride ?? pick(d.description, l),
    category: d.category,
    country: d.country,
    englishOnly: Boolean(d.englishOnly),
  };
}

function linkById(id: string, locale: string, opts: LinkOptions = {}): GuideLink {
  const d = destinationById(id);
  if (!d) throw new Error(`site guide: unknown destination ${id}`);
  return toLink(d, locale, opts);
}

/** The Assessment link, opened on the destination country when it is known. */
export function assessmentLink(locale: string, country: GuideCountry | null): GuideLink {
  return linkById("assessment", locale, { query: country ? `?country=${country}` : "" });
}

export function aiAssistantHref(locale: string): string {
  return guidePath(locale, AI_ASSISTANT_PATH);
}

const T = {
  intro: { en: "Here are the most relevant research areas:", tr: "En ilgili araştırma alanları:", "zh-Hans": "以下是最相关的研究页面：" } as L3,
  introOccupation: {
    en: "Here are the most relevant research areas for that occupation term:",
    tr: "Bu meslek terimi için en ilgili araştırma alanları:",
    "zh-Hans": "以下是与该职业词相关的研究页面：",
  } as L3,
  introComparison: { en: "LogiVisa has a comparison page for these subclasses:", tr: "LogiVisa'nın bu alt sınıflar için bir karşılaştırma sayfası var:", "zh-Hans": "LogiVisa 有针对这些子类的对比页面：" } as L3,
  introComparisonHub: { en: "LogiVisa has neutral comparison pages for published visa information:", tr: "LogiVisa'nın yayımlanmış vize bilgileri için tarafsız karşılaştırma sayfaları var:", "zh-Hans": "LogiVisa 有针对已公布签证信息的中立对比页面：" } as L3,
  boundary: {
    en: "I can show you the published requirements and research tools, but I can’t determine which visa is suitable for you here.",
    tr: "Yayımlanmış gereklilikleri ve araştırma araçlarını gösterebilirim, ancak burada sizin için hangi vizenin uygun olduğunu belirleyemem.",
    "zh-Hans": "我可以为您展示已公布的要求和研究工具，但无法在此判断哪种签证适合您。",
  } as L3,
  fallback: {
    en: "I couldn’t confidently match that to a LogiVisa research topic.",
    tr: "Bunu bir LogiVisa araştırma konusuyla güvenle eşleştiremedim.",
    "zh-Hans": "我无法确定这与哪个 LogiVisa 研究主题相关。",
  } as L3,
  chooseCountry: {
    en: "Are you researching Australia or Canada?",
    tr: "Avustralya mı, Kanada mı araştırıyorsunuz?",
    "zh-Hans": "您在研究澳大利亚还是加拿大？",
  } as L3,
  viewRequirements: { en: "View published requirements", tr: "Yayımlanmış gereklilikleri görüntüle", "zh-Hans": "查看已公布的要求" } as L3,
  browseTopics: { en: "Browse topics", tr: "Konulara göz at", "zh-Hans": "浏览主题" } as L3,
  browseAu: { en: "Browse Australia topics", tr: "Avustralya konularına göz at", "zh-Hans": "浏览澳大利亚主题" } as L3,
  browseCa: { en: "Browse Canada topics", tr: "Kanada konularına göz at", "zh-Hans": "浏览加拿大主题" } as L3,
  assessmentPrompt: {
    en: "Want a structured report based on the information you enter?",
    tr: "Girdiğiniz bilgilere dayalı yapılandırılmış bir rapor ister misiniz?",
    "zh-Hans": "想要基于您所填信息的结构化报告吗？",
  } as L3,
};

export function assessmentPromptText(locale: string): string {
  return pick(T.assessmentPrompt, loc(locale));
}
export function chooseCountryText(locale: string): string {
  return pick(T.chooseCountry, loc(locale));
}
export function fallbackText(locale: string): string {
  return pick(T.fallback, loc(locale));
}

/** The first-panel quick actions for a country scope (existing routes only). Country-neutral scope shows only the country choice (rendered by the panel). */
const QUICK_IDS: Record<GuideCountry, string[]> = {
  AU: ["au-anzsco-finder", "au-visa-comparison", "au-points-calculator", "au-skills-assessment", "au-state-nomination", "au-guides-hub", "au-visas-hub"],
  CA: ["ca-visas-hub", "ca-points-calculator", "ca-pnp", "ca-aip", "ca-family"],
};

const QUICK_LABEL: Record<string, L3> = {
  "au-anzsco-finder": { en: "Find my occupation", tr: "Mesleğimi bul", "zh-Hans": "查找我的职业" },
  "au-visa-comparison": { en: "Compare visas", tr: "Vizeleri karşılaştır", "zh-Hans": "对比签证" },
  "au-points-calculator": { en: "Check points", tr: "Puanları kontrol et", "zh-Hans": "查看积分" },
  "au-skills-assessment": { en: "Skills assessment information", tr: "Beceri değerlendirmesi bilgileri", "zh-Hans": "技能评估信息" },
  "au-state-nomination": { en: "State nomination research", tr: "Eyalet adaylığı araştırması", "zh-Hans": "州担保研究" },
  "au-guides-hub": { en: "Browse research guides", tr: "Araştırma rehberlerine göz at", "zh-Hans": "浏览研究指南" },
  "au-visas-hub": { en: "Australia research", tr: "Avustralya araştırması", "zh-Hans": "澳大利亚研究" },
  "ca-visas-hub": { en: "Canada research", tr: "Kanada araştırması", "zh-Hans": "加拿大研究" },
  "ca-points-calculator": { en: "Check CRS points", tr: "CRS puanlarını kontrol et", "zh-Hans": "查看 CRS 积分" },
  "ca-pnp": { en: "Provincial Nominee Program", tr: "Provincial Nominee Program", "zh-Hans": "省提名计划" },
  "ca-aip": { en: "Atlantic Immigration Program", tr: "Atlantic Immigration Program", "zh-Hans": "大西洋移民计划" },
  "ca-family": { en: "Family Sponsorship", tr: "Aile sponsorluğu", "zh-Hans": "家庭团聚担保" },
};

export function quickActions(country: GuideCountry, locale: string): GuideLink[] {
  const l = loc(locale);
  return QUICK_IDS[country].map((id) => linkById(id, locale, { titleOverride: pick(QUICK_LABEL[id], l) }));
}

/** Suggestions for the page the visitor is on; every link belongs to the page's own country. */
export function contextSuggestions(ctx: PageContext, locale: string): GuideLink[] {
  const out: GuideLink[] = [];
  const code = ctx.occupationCode;
  if (ctx.country === "CA") {
    out.push(linkById("ca-points-calculator", locale), linkById("ca-visas-hub", locale));
    out.push(assessmentLink(locale, "CA"));
    return dedupe(out);
  }
  if (ctx.country === "AU") {
    const q = code ? `?q=${code}` : "";
    if (ctx.pageType === "occupation") {
      out.push(linkById("au-skills-assessment", locale, { query: q }), linkById("au-anzsco-finder", locale, { query: q }));
      out.push(linkById("au-points-calculator", locale, { query: code ? `?occupation=${code}` : "" }), linkById("au-guides-hub", locale), linkById("au-visas-hub", locale));
    } else if (ctx.pageType === "visa" || ctx.pageType === "comparison") {
      const sub = (ctx.visaSlug ?? "").match(/^(\d{3})/)?.[1];
      const pair = sub ? COMPARISON_PAIRS.find((p) => p.a === sub || p.b === sub) : undefined;
      out.push(pair ? linkById("au-visa-comparison", locale, { path: `/tools/visa-comparison/${pair.slug}`, titleOverride: pick({ en: `Compare ${pair.a} and ${pair.b}`, tr: `${pair.a} ve ${pair.b} karşılaştırması`, "zh-Hans": `对比 ${pair.a} 与 ${pair.b}` }, loc(locale)) }) : linkById("au-visa-comparison", locale));
      if (!sub || ["189", "190", "491"].includes(sub)) out.push(linkById("au-points-calculator", locale));
      out.push(linkById("au-anzsco-finder", locale), linkById("au-state-nomination", locale));
    } else if (ctx.pageType === "guide") {
      out.push(linkById("au-anzsco-finder", locale), linkById("au-skills-assessment", locale), linkById("au-visa-comparison", locale), linkById("au-state-nomination", locale));
    } else {
      out.push(linkById("au-anzsco-finder", locale), linkById("au-skills-assessment", locale), linkById("au-points-calculator", locale));
    }
    out.push(assessmentLink(locale, "AU"));
    return dedupe(out).slice(0, 6);
  }
  return [];
}

function dedupe(links: GuideLink[]): GuideLink[] {
  const seen = new Set<string>();
  return links.filter((x) => (seen.has(x.href) ? false : (seen.add(x.href), true)));
}

const OCC_LABEL: Record<"anzsco" | "skills", L3> = {
  anzsco: { en: "Search the occupation in the ANZSCO finder", tr: "Mesleği ANZSCO bulucuda arayın", "zh-Hans": "在 ANZSCO 查询中搜索该职业" },
  skills: { en: "See the skills-assessment authority information for it", tr: "Bunun için beceri değerlendirme kurumu bilgilerine bakın", "zh-Hans": "查看其技能评估机构信息" },
};

/** Related guides for an occupation term (keyword match on the guides only). */
function guidesFor(term: string, locale: string): GuideLink[] {
  const words = term.split(/[\s-]+/);
  return destinationsFor("AU")
    .filter((d) => d.category === "guide" && d.id !== "au-guides-hub")
    .filter((d) => d.keywords.some((k) => (k.includes(" ") ? term.includes(k) : words.includes(k))))
    .slice(0, 2)
    .map((d) => toLink(d, locale));
}

/** A short, fixed answer for keyword-style input; null when the input is not one of the known short phrases (or belongs to the other country). */
function shortResponse(text: string, scope: GuideCountry | null, lock: boolean, locale: string): GuideResponse | null {
  const hits: ShortAnswer[] = matchShortAnswers(normalise(text));
  if (hits.length === 0) return null;
  const l = loc(locale);
  let entry: ShortAnswer | undefined;
  if (scope) {
    entry = hits.find((h) => h.country === scope) ?? hits.find((h) => h.country === "ANY");
    if (!entry && !lock) entry = hits[0];
  } else {
    entry = hits.find((h) => h.country === "ANY");
    if (!entry) {
      if (new Set(hits.map((h) => h.country)).size > 1) return { kind: "choose-country", message: pick(T.chooseCountry, l), links: [], assessment: false, handoff: false, country: null };
      entry = hits[0];
    }
  }
  if (!entry) return null;
  const links = entry.links.map((s) => linkById(s.id, locale, { path: s.path, query: s.query, titleOverride: s.title ? pick(s.title, l) : undefined }));
  return { kind: "routes", message: pick(entry.message, l), links: dedupe(links), assessment: false, handoff: true, country: entry.country === "ANY" ? null : entry.country };
}

/** Likely partial matches for an unmatched phrase: destinations with a keyword that starts with (or is started by) a typed word of four or more letters. */
function partialMatches(text: string, scope: GuideCountry | null, locale: string): GuideLink[] {
  const tokens = normalise(text).split(/[^a-z0-9]+/).filter((w) => w.length >= 4);
  if (tokens.length === 0) return [];
  const pool = scope ? destinationsFor(scope) : [...destinationsFor("AU"), ...destinationsFor("CA")];
  return pool
    .filter((d) => d.category !== "assessment" && d.category !== "guide" && d.keywords.some((k) => /^[a-z0-9 \-]{4,}$/.test(k) && tokens.some((w) => k.startsWith(w) || w.startsWith(k))))
    .slice(0, 2)
    .map((d) => toLink(d, locale));
}

function unknownResponse(text: string, scope: GuideCountry | null, locale: string): GuideResponse {
  const l = loc(locale);
  const browse = (id: string, label: L3) => linkById(id, locale, { titleOverride: pick(label, l) });
  const browseLinks = scope === "CA" ? [browse("ca-visas-hub", T.browseTopics)] : scope === "AU" ? [browse("au-guides-hub", T.browseTopics)] : [browse("au-guides-hub", T.browseAu), browse("ca-visas-hub", T.browseCa)];
  return { kind: "fallback", message: pick(T.fallback, l), links: dedupe([...partialMatches(text, scope, locale), ...browseLinks]), assessment: false, handoff: true, country: scope };
}

/** Answers a typed question. `scope` is the country the visitor is in (page context or the chosen one), or null when unknown. */
export function buildResponse(text: string, scope: GuideCountry | null, locale: string, lock = false): GuideResponse {
  const l = loc(locale);
  const short = isBoundaryQuestion(text) ? null : shortResponse(text, scope, lock, locale);
  if (short) return short;
  const intent = matchIntent(text, scope, lock);
  const handoffOnly = (kind: GuideResponse["kind"], message: string, links: GuideLink[], country: GuideCountry | null, assessment = false): GuideResponse => ({
    kind, message, links, assessment, handoff: kind === "fallback", country,
  });

  switch (intent.kind) {
    case "boundary": {
      const c = scope;
      const req = (id: string) => linkById(id, locale, { titleOverride: pick(T.viewRequirements, l) });
      const links = c === "CA" ? [req("ca-visas-hub"), linkById("ca-points-calculator", locale)] : c === "AU" ? [req("au-visas-hub"), linkById("au-points-calculator", locale)] : [req("au-visas-hub"), linkById("ca-visas-hub", locale)];
      return handoffOnly("boundary", pick(T.boundary, l), links, c, true);
    }
    case "comparison": {
      const pair = intent.pairSlug ? COMPARISON_PAIRS.find((p) => p.slug === intent.pairSlug) : undefined;
      const link = pair
        ? linkById("au-visa-comparison", locale, { path: `/tools/visa-comparison/${pair.slug}`, titleOverride: pick({ en: `Compare ${pair.a} and ${pair.b}`, tr: `${pair.a} ve ${pair.b} karşılaştırması`, "zh-Hans": `对比 ${pair.a} 与 ${pair.b}` }, l) })
        : linkById("au-visa-comparison", locale);
      return handoffOnly("routes", pick(pair ? T.introComparison : T.introComparisonHub, l), [link], "AU");
    }
    case "occupation": {
      const q = `?q=${encodeURIComponent(intent.term)}`;
      const links = [
        ...guidesFor(intent.term, locale),
        linkById("au-anzsco-finder", locale, { query: q, titleOverride: pick(OCC_LABEL.anzsco, l) }),
        linkById("au-skills-assessment", locale, { query: q, titleOverride: pick(OCC_LABEL.skills, l) }),
      ];
      return { kind: "routes", message: pick(T.introOccupation, l), links: dedupe(links), assessment: true, handoff: false, country: "AU" };
    }
    case "destinations": {
      const links = intent.ids.map((id) => linkById(id, locale));
      return { kind: "routes", message: pick(T.intro, l), links, assessment: false, handoff: false, country: intent.country };
    }
    default: {
      if (intent.country === null) {
        // A keyword both countries have asks once; text that matches nothing anywhere is an unknown input.
        const q = normalise(text);
        const anyHit = q !== "" && [...destinationsFor("AU"), ...destinationsFor("CA")].some((d) => d.category !== "assessment" && scoreDestination(q, d) > 0);
        return anyHit ? handoffOnly("choose-country", pick(T.chooseCountry, l), [], null) : unknownResponse(text, null, locale);
      }
      return unknownResponse(text, intent.country, locale);
    }
  }
}
