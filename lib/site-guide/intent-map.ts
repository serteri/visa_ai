/**
 * Deterministic matching of a short typed question to destinations in the registry. No model call: words and phrases are matched against the
 * registry's keywords, subclass numbers against the comparison pairs, and a "I'm a ..." statement against the occupation tools. Nothing is
 * inferred about the person, and nothing typed is stored or sent anywhere.
 */
import { COMPARISON_PAIRS, destinationsFor } from "./route-registry";
import type { Destination, GuideCountry } from "./types";

export type Intent =
  | { kind: "boundary" }
  | { kind: "comparison"; pairSlug: string | null; country: "AU" }
  | { kind: "occupation"; term: string; country: GuideCountry | null }
  | { kind: "destinations"; ids: string[]; country: GuideCountry | null }
  | { kind: "none"; country: GuideCountry | null };

const MAX_INPUT = 160;

export function normalise(text: string): string {
  return text.slice(0, MAX_INPUT).toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
}

/** A question asking the guide for a verdict, a recommendation or a prediction: answered with the boundary message, never with an answer. */
const BOUNDARY = [
  /\b(do|can|will|would) i (qualify|get|be eligible|be invited|receive|pass)\b/,
  /\bam i (eligible|qualified|likely|able to (get|apply))\b/,
  /\bshould i (apply|choose|pick|go|take|get)\b/,
  /\bwhich (visa|pathway|route|program|programme|option) (is|would be|should)\b/,
  /\b(best|better|easiest|fastest|cheapest|safest|strongest) (visa|pathway|route|program|option|choice)\b/,
  /\bwhat (are|is) my (chances?|odds|probability)\b/,
  /\bwhich (visa|pathway|route|program|programme)\b/,
  /\b(best|right) .{0,16}for me\b/,
  /\bfor me\b.*\b(visa|pathway|route)\b/,
  /\b(my )?chances?\b/,
  /\bprobability\b/,
  /\bwill (i|they) (get|be) (invited|approved|accepted|granted)\b/,
  /\bpredict\b/,
  /\brecommend\b/,
  /\bbetter (for me|than)\b/,
  /\bhow likely\b/,
  /\bgood enough\b/,
  /uygun muyum|hangi vize en iyi|şansım|başvurmalı mıyım|önerir misin|tavsiye/,
  /我.{0,6}(符合|有资格|能不能|会不会)|哪个签证.{0,4}(最好|更好|适合)|成功率|概率|推荐|应该申请/,
];

export function isBoundaryQuestion(text: string): boolean {
  const q = normalise(text);
  return BOUNDARY.some((re) => re.test(q));
}

const CANADA_WORDS = /\b(canada|canadian|express entry|crs|ircc|noc|pnp|provincial nominee|fsw|cec|fstp|atlantic immigration)\b|kanada|加拿大|快速通道/;
const AUSTRALIA_WORDS = /\b(australia|australian|anzsco|subclass|skillselect|home affairs|acs|vetassess|tra|osap|msa|skills assessment|assessing authority|state nomination|189|190|491|482|485|500|820|801|186)\b|avustralya|澳大利亚|澳洲/;

export function detectCountry(text: string): GuideCountry | null {
  const q = normalise(text);
  const ca = CANADA_WORDS.test(q);
  const au = AUSTRALIA_WORDS.test(q);
  if (ca && !au) return "CA";
  if (au && !ca) return "AU";
  return null;
}

const SUBCLASSES = new Set(["189", "190", "491", "482", "485", "500", "186", "820", "801"]);

function pairFor(a: string, b: string): string | null {
  const hit = COMPARISON_PAIRS.find((p) => (p.a === a && p.b === b) || (p.a === b && p.b === a));
  return hit ? hit.slug : null;
}

/** "I'm a chef" / "I work as a civil engineer": the occupation words only, lower-case letters, at most 40 characters. */
export function extractOccupation(text: string): string | null {
  const q = normalise(text).replace(/[.!?,;:]+$/g, "");
  const m = q.match(/^(?:i am|i'm|im|i work as|i'm working as|working as|my (?:occupation|job|profession) is|my occupation:|occupation:|i am working as)\s+(?:an?\s+|the\s+)?([a-z][a-z \-]{1,38})$/);
  if (!m) return null;
  const term = m[1].trim().replace(/\s+(in|at|from|for|and|who|looking|researching|interested|planning|trying)\b.*$/, "").trim();
  if (!/^[a-z][a-z \-]{1,38}$/.test(term)) return null;
  // First-person statements that are not occupations ("I'm researching Canada", "I'm new here") are not routed as occupations.
  if (/^(researching|looking|interested|planning|trying|new|just|not|from|in|currently|student|studying|applying|thinking|wondering|curious)\b/.test(term)) return null;
  return term;
}

export function scoreDestination(q: string, d: Destination): number {
  let score = 0;
  for (const k of d.keywords) {
    const kw = k.toLowerCase();
    if (!kw) continue;
    const asciiWord = /^[a-z0-9 \-]+$/.test(kw);
    const hit = asciiWord ? new RegExp(`(^|[^a-z0-9])${kw.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}([^a-z0-9]|$)`).test(q) : q.includes(kw);
    if (hit) score += kw.includes(" ") ? 3 : 2;
  }
  return score;
}

/** Resolves a typed question inside a country scope (null = the visitor has not chosen one and the text does not say). */
/** `lock`: the page itself is about `scope` (an Australia or Canada page), so a typed mention of the other country never switches the results. */
export function matchIntent(text: string, scope: GuideCountry | null, lock = false): Intent {
  const q = normalise(text);
  if (!q) return { kind: "none", country: scope };
  if (isBoundaryQuestion(q)) return { kind: "boundary" };

  const textCountry = lock ? null : detectCountry(q);
  const country = textCountry ?? scope;

  // Comparison of two subclasses, e.g. "compare 189 and 190": the exact pair page, or the comparison hub.
  const nums = q.match(/\b\d{3}\b/g)?.filter((n) => SUBCLASSES.has(n)) ?? [];
  if (country === "AU" && nums.length >= 2 && /(compar|vs|versus|difference|between|and|or|karşılaştır|对比|比较|区别|和)/.test(q)) {
    return { kind: "comparison", pairSlug: pairFor(nums[0], nums[1]), country: "AU" };
  }
  if (country === "AU" && /(compar|difference between|karşılaştır|对比|比较)/.test(q)) return { kind: "comparison", pairSlug: null, country: "AU" };

  const occupation = extractOccupation(q);
  if (occupation && country === "AU") return { kind: "occupation", term: occupation, country: "AU" };
  // Canada has no occupation finder: an occupation statement there goes to the Canadian research pages, without echoing the term.
  if (occupation && country === "CA") return { kind: "destinations", ids: ["ca-visas-hub", "ca-points-calculator"], country: "CA" };

  const pool = country ? destinationsFor(country) : [];
  if (!country) return { kind: "none", country: null };
  const ranked = pool
    .map((d) => ({ d, s: scoreDestination(q, d) }))
    .filter((x) => x.s > 0 && x.d.category !== "assessment")
    .sort((a, b) => b.s - a.s);
  if (ranked.length === 0) return { kind: "none", country };
  return { kind: "destinations", ids: ranked.slice(0, 4).map((x) => x.d.id), country };
}
