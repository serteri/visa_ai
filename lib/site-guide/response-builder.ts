/**
 * Builds what the guide shows: page-context suggestions, quick actions and the answer to a typed question. Every sentence is a fixed template; the
 * guide never concludes anything about the person (no eligibility, recommendation, ranking or prediction) and only links to existing pages.
 */
import { matchIntent } from "./intent-map";
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
    en: "LogiVisa does not decide eligibility, recommend a visa, rank options or predict outcomes. These pages show published information you can research:",
    tr: "LogiVisa uygunluk kararı vermez, vize önermez, seçenekleri sıralamaz ve sonuç tahmin etmez. Araştırabileceğiniz yayımlanmış bilgiler:",
    "zh-Hans": "LogiVisa 不判断资格、不推荐签证、不对选项排序，也不预测结果。以下页面提供可供研究的已公布信息：",
  } as L3,
  fallback: {
    en: "I can help you find a LogiVisa research page, or you can open the full AI Assistant for a more detailed question.",
    tr: "Size bir LogiVisa araştırma sayfası bulmada yardımcı olabilirim veya daha ayrıntılı bir soru için tam AI Asistanı'nı açabilirsiniz.",
    "zh-Hans": "我可以帮您找到合适的 LogiVisa 研究页面，也可以打开完整的 AI 助手来回答更详细的问题。",
  } as L3,
  chooseCountry: {
    en: "Which country are you researching: Australia or Canada?",
    tr: "Hangi ülkeyi araştırıyorsunuz: Avustralya mı, Kanada mı?",
    "zh-Hans": "您在研究哪个国家：澳大利亚还是加拿大？",
  } as L3,
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

/** Answers a typed question. `scope` is the country the visitor is in (page context or the chosen one), or null when unknown. */
export function buildResponse(text: string, scope: GuideCountry | null, locale: string, lock = false): GuideResponse {
  const l = loc(locale);
  const intent = matchIntent(text, scope, lock);
  const handoffOnly = (kind: GuideResponse["kind"], message: string, links: GuideLink[], country: GuideCountry | null, assessment = false): GuideResponse => ({
    kind, message, links, assessment, handoff: kind === "fallback", country,
  });

  switch (intent.kind) {
    case "boundary": {
      const c = scope;
      const links = c === "CA" ? [linkById("ca-visas-hub", locale), linkById("ca-points-calculator", locale)] : c === "AU" ? [linkById("au-visa-comparison", locale), linkById("au-points-calculator", locale)] : [];
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
      if (intent.country === null) return handoffOnly("choose-country", pick(T.chooseCountry, l), [], null);
      return handoffOnly("fallback", pick(T.fallback, l), [], intent.country);
    }
  }
}
