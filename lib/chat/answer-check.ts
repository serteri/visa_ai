import { AGE_LIMIT, DIRECT_ENTRY_EXPERIENCE_YEARS, TRT_EMPLOYMENT, VISA_NAMES, employmentPointsFor, engineFeeTable } from "./engine-facts";
import { findInternalLabels } from "./internal-labels";

/**
 * Flags statements in an AI assistant answer that contradict the engine data the report uses (lib/chat/
 * engine-facts.ts), in English, Turkish and Chinese:
 *   fee                a visa-charge amount for a subclass that is not one of that subclass's engine fee figures
 *                      (e.g. "491 ... AUD 4,910" from a superseded document);
 *   gate               a mandatory requirement said not to apply (189 / 190 / 491 without a skills assessment), or a
 *                      requirement the gate matrix does not have (a minimum income for 191);
 *   state_availability an occupation said to be in demand in "most / all states" -- availability per state comes
 *                      only from the engine's tracker for the visitor's profile;
 *   repeated_disclaimer more than one "not in my sources / general knowledge" statement in one answer;
 *   internal_label     internal prompt vocabulary in the answer ("engine facts", "gates", bracketed section names).
 * repeated_disclaimer and internal_label are LOG_ONLY_KINDS: reported, never corrected on screen.
 * Used on every finished answer (logged, see lib/chat/handler.ts) and by the tests.
 */

export type EngineConflictKind =
  | "fee"
  | "gate"
  | "state_availability"
  | "repeated_disclaimer"
  | "internal_label"
  | "visa_name"
  | "trt_period"
  | "experience_points"
  | "age_limit"
  | "status_wording"
  | "max_potential"
  | "benchmark_sufficiency"
  | "state_condition";

/** Conflicts that are only logged: no visible correction block (not a factual error in what the visitor was told). */
export const LOG_ONLY_KINDS: ReadonlySet<EngineConflictKind> = new Set<EngineConflictKind>(["repeated_disclaimer", "internal_label"]);

export type EngineConflict = {
  kind: EngineConflictKind;
  sentence: string;
  detail: string;
  /** The subclasses the flagged sentence names (fee / gate conflicts): what the correction block is about. */
  subclasses?: string[];
  /** gate: which requirement was contradicted. */
  topic?: "skills_assessment" | "income_191";
  /** experience_points: what the answer claimed about which employment, years and points. */
  experience?: { location: "overseas" | "australian"; years: number; correct: number };
};

export type CheckOptions = {
  hasProfile?: boolean;
  /** The visitor's status per visa (engine keys: "next_step_required", "not_eligible_now", ...), when a profile exists. */
  gateStatus?: Record<string, string>;
  /** The engine's highest score the visitor's own actions can reach (before nomination), when known. */
  ceiling?: number;
  /** 189 / 190 / 491: the visitor's score (nomination included) and the recent invitation benchmark, from the engine. */
  benchmarks?: Partial<Record<"189" | "190" | "491", { total: number; benchmark: number | null; asOf?: string }>>;
};

const SENTENCE_SPLIT = /(?<=[.!?。！？])\s+|\n+/;
const SUBCLASS = /(?:subclass|alt sınıf|vize|visa|子类)?\s*\b(189|190|191|482|485|491|500|186|820|801)\b/gi;
const FEE_WORDS = /\b(fee|fees|charge|charges|cost|costs|vac|application charge)\b|ücret|harç|maliyet|başvuru bedeli|费用|申请费|签证费/i;
// AUD 4,910 / A$4,910 / $4,910 / 4.910 AUD / 4,910 AUD / 4910 澳元
const AMOUNT = /(?:AUD|A\$|\$)\s?(\d{1,3}(?:[.,]\d{3})+|\d{3,6})|(\d{1,3}(?:[.,]\d{3})+|\d{3,6})\s?(?:AUD|avustralya doları|澳元)/gi;

function amounts(sentence: string): number[] {
  return Array.from(sentence.matchAll(AMOUNT), (m) => Number((m[1] ?? m[2]).replace(/[.,]/g, ""))).filter((n) => n >= 100);
}
function subclasses(sentence: string): string[] {
  return [...new Set(Array.from(sentence.matchAll(SUBCLASS), (m) => m[1]))];
}

const NO_SKILLS_ASSESSMENT =
  /without (?:a |an )?(?:suitable |positive |valid )?skills? assessment|no skills? assessment (?:is )?(?:needed|required)|(?:may|can) (?:proceed|apply|be lodged)[^.]{0,40}without[^.]{0,30}assessment|beceri değerlendirme\S*(?:\s+\S+){0,3}\s+olmadan|beceri değerlendirme\S* (?:gerekmez|şart değil|gerekmeden)|değerlendirme(?:si)? olmadan (?:da )?(?:başvur|ilerle|devam)|无需技能评估|不需要技能评估|没有技能评估也/i;
const MIN_INCOME = /minimum income|income threshold|income requirement|asgari gelir|minimum gelir|gelir şartı|gelir eşiği|最低收入|收入门槛|收入要求/i;
const NEGATED_INCOME = /\b(no|not|without|none)\b[^.]{0,30}(minimum income|income (?:threshold|requirement))|(asgari|minimum) gelir (şartı )?(yok|bulunmuyor|aranmaz)|gelir şartı (yok|bulunmuyor|aranmaz)|没有最低收入|无最低收入|不设最低收入|无收入要求/i;
const MOST_STATES = /\b(most|all|many|every) (?:australian )?(?:states|state and territor)|çoğu eyalet|tüm eyalet|birçok eyalet|bütün eyalet|大多数州|所有州|多数州|大部分州/i;
const DISCLAIMER =
  /not (?:in|covered by) (?:my|the) (?:system|sources|references|knowledge base)|general knowledge|genel bilgi(?:ler)?(?:im)?(?:le)?|sistemimde(?:ki)?|kaynaklarımda|referanslarda (?:yer )?al(?:mıyor|madığı)|resmi kaynaktan doğrulanmadı|一般知识|系统中没有|资料中没有|未经官方来源核实/i;

const WRONG_VISA_NAME: Record<string, RegExp> = {
  "482": /temporary skill shortage|\bTSS\b|geçici (?:beceri|nitelikli iş gücü) açığı|temporary skills? shortage|临时技能短缺|临时技术短缺/i,
};
const TRT_CONTEXT = /\b482\b|\bTRT\b|temporary residence transition|geçici oturum geçiş|sponsored|sponsorlu|临时居留过渡|担保雇佣/i;
const THREE_YEARS = /\b(?:3|three)[\s-]*years?\b|\b3 yıl|\büç yıl|3\s*年|三年/i;
const LAST_THREE_YEARS = /(?:last|past|previous|within|in the)\s+(?:3|three)\s*years?|son\s+3\s*yıl|过去\s*3\s*年|最近\s*3\s*年|3\s*年内/i;
const MIN_AGE_45 = new RegExp(`(?:minimum|min\\.?|lowest|at least)\\s+age[^.]{0,30}\\b${AGE_LIMIT}\\b|\\b${AGE_LIMIT}\\b[^.]{0,30}(?:minimum|lowest) age|(?:asgari|en az|minimum)\\s+yaş[^.]{0,25}\\b${AGE_LIMIT}\\b|\\b${AGE_LIMIT}\\b[^.]{0,25}(?:asgari|minimum)\\s+yaş|最低年龄[^。]{0,10}${AGE_LIMIT}|${AGE_LIMIT}[^。]{0,10}最低年龄`, "i");
const NOT_ELIGIBLE = /\bnot eligible\b|\bineligible\b|\bnot qualify|uygun değil|uygun olmayan|şartları karşılamıyor|hak kazanamaz|不符合|没有资格|不合格/i;
// The only figure that may be called a maximum / ceiling is the engine's closable ceiling (en / tr / zh).
const MAX_POTENTIAL = new RegExp(
  [
    "maximum potential|potential maximum|maximum possible|maximum achievable|maximum (?:attainable )?(?:score|points?|total)|max(?:imum)? score|highest (?:possible|potential|achievable) (?:score|points?)|score ceiling|points? ceiling|upper limit of (?:your )?points",
    "maksimum potansiyel|potansiyel maksimum|en yüksek potansiyel|(?:maksimum|azami|tavan) (?:olası |mümkün |potansiyel )?(?:puan|skor)|en yüksek (?:olası |mümkün )?(?:puan|skor)|ulaşabileceğiniz (?:maksimum|en yüksek)",
    "最大潜力|最高潜力|潜在最高|潜在最大|最高可能|(?:最高|最多)(?:可达|能达到|可以达到|可得)|(?:最高|最大)(?:可达|可能|潜在)?(?:积分|分数|得分|分)|(?:积分|分数)(?:上限|天花板)|最多(?:可达|能达到|可以达到)\s*\d+\s*分",
  ].join("|"),
  "i",
);
// "55 is enough", "sufficient", "meets the requirements" ... for a points-tested visa (en / tr / zh).
const ENOUGH = new RegExp(
  [
    "\\b(?:enough|sufficient|adequate|competitive|strong enough|good enough)\\b|meets? (?:all )?(?:the )?(?:requirements?|criteria|threshold|bar)\\b|(?:above|over|exceeds?) (?:the )?(?:65|minimum|threshold)",
    "yeterli(?:dir|siniz)?\\b|yeterince|rekabetçi|şartları karşılıyor|koşulları karşılıyor|gereklilikleri karşılıyor|65(?:'i| puanı)? (?:aşıyor|geçiyor)|barajı (?:aşıyor|geçiyor|karşılıyor)",
    "足够|够了|满足(?:所有)?(?:要求|条件)|达标|具有竞争力|有竞争力|超过\\s*65|已(?:经)?达到(?:要求|门槛)",
  ].join("|"),
  "i",
);
const NOT_ENOUGH = /\b(?:not|isn't|aren't|n't|never|no longer|less than|short of|below|insufficient)\b|yeterli değil|yetersiz|yeterli olmay|altında|eksik|不够|不足|不达标|低于|还差|差\s*\d/i;
const BENCH_WORDS = /\b(?:benchmark|invitation level|invitation|recent|invited|competitive cut|cut-?off)\b|davet|son dönem|referans|邀请|基准|参考分|近期|分数线/i;
// Advice to "move to / live in WA" as the way to meet WA's 190 (the contract is what the stream requires).
const WA_WORDS = /\bWA\b|western australia|batı avustralya|西澳/i;
const MOVE_WORDS = /\b(?:move|moving|relocat\w*|live|living|reside|residing|settle|settling|shift)\b|taşın\w*|yerleş\w*|yaşa\w*|ikamet|搬(?:到|去|家)?|迁(?:往|到)|移居|居住|定居/i;
const JOB_WORDS = /\b(?:job|employment|employer|contract|work(?:ing)? (?:offer|contract)|sponsor\w*)\b|\biş\b|iş (?:teklifi|sözleşme\w*)|sözleşme|işveren|工作|雇佣|合同|雇主|录用|聘用/i;
const EXPERIENCE_WORDS = /experience|employment|work|deneyim|çalışma|工作|经验|经历/i;
const AUSTRALIAN_WORDS = /australian|in australia|avustralya'?da|avustralya deneyim|澳大利亚(?:境内|本地)?/i;
const OVERSEAS_WORDS = /overseas|offshore|outside australia|abroad|yurt ?dışı|avustralya dışı|海外|境外/i;
const YEAR_RANGE = /\d\s*[-–—]\s*\d\s*(?:years?|yıl|年)|\d\s*(?:to|ila)\s*\d\s*years/i;
const YEARS_N = /\b(\d{1,2})\s*(?:\+\s*)?(?:years?|yıl|yıllık)|\b(\d{1,2})\s*年/i;
// "+5", "5 points", "5 puan", "5 分"
const POINTS_CLAIM = /\+\s*(\d{1,2})\b|\b(\d{1,2})\s*(?:points?|puan)\b|\b(\d{1,2})\s*分/gi;

export function findEngineConflicts(answer: string, opts: CheckOptions = {}): EngineConflict[] {
  const fees = engineFeeTable();
  const out: EngineConflict[] = [];
  const sentences = answer.split(SENTENCE_SPLIT).map((s) => s.trim()).filter(Boolean);
  let disclaimers = 0;

  for (const s of sentences) {
    const subs = subclasses(s);

    // Fees: an amount in a fee sentence must be one of the engine's figures for a subclass the sentence names.
    if (FEE_WORDS.test(s) && subs.length > 0) {
      const allowed = new Set(subs.flatMap((sc) => fees[sc] ?? []));
      if (allowed.size > 0) {
        for (const a of amounts(s)) {
          if (!allowed.has(a)) out.push({ kind: "fee", sentence: s, detail: `AUD ${a.toLocaleString("en-AU")} is not an engine fee for subclass ${subs.join("/")} (engine: ${[...allowed].map((n) => n.toLocaleString("en-AU")).join(", ")})`, subclasses: subs.filter((sc) => (fees[sc] ?? []).length > 0) });
        }
      }
    }

    // Gates.
    if (subs.some((sc) => ["189", "190", "491"].includes(sc)) && NO_SKILLS_ASSESSMENT.test(s)) {
      out.push({ kind: "gate", sentence: s, detail: "189 / 190 / 491 require a suitable (positive) skills assessment (gate matrix)", subclasses: subs.filter((sc) => ["189", "190", "491"].includes(sc)), topic: "skills_assessment" });
    }
    if (subs.includes("191") && MIN_INCOME.test(s) && !NEGATED_INCOME.test(s)) {
      out.push({ kind: "gate", sentence: s, detail: "subclass 191 has no minimum income requirement (ATO notices for 3 income years only)", subclasses: ["191"], topic: "income_191" });
    }

    // State availability without the engine's per-state result.
    if (!opts.hasProfile && MOST_STATES.test(s)) {
      out.push({ kind: "state_availability", sentence: s, detail: "occupation demand per state comes only from the engine's State Nomination Tracker for the visitor's profile" });
    }

    // Visa names.
    for (const sc of subs) {
      if (VISA_NAMES[sc] && WRONG_VISA_NAME[sc]?.test(s)) out.push({ kind: "visa_name", sentence: s, detail: `subclass ${sc} is the ${VISA_NAMES[sc]} visa, not the name used here`, subclasses: [sc] });
    }

    // 186 Temporary Residence Transition: sponsored employment period (engine: ${TRT_EMPLOYMENT.years} years within the last ${TRT_EMPLOYMENT.withinYears}).
    if (subs.includes("186") && TRT_CONTEXT.test(s) && THREE_YEARS.test(s) && !LAST_THREE_YEARS.test(s) && !/direct entry|doğrudan giriş|直接入境/i.test(s)) {
      out.push({ kind: "trt_period", sentence: s, detail: `the 186 Temporary Residence Transition stream needs ${TRT_EMPLOYMENT.years} years of sponsored employment (in the last ${TRT_EMPLOYMENT.withinYears}), not 3 years (Direct Entry's ${DIRECT_ENTRY_EXPERIENCE_YEARS} years of experience is a different stream)`, subclasses: ["186"] });
    }

    // Points for years of skilled employment (the report's points table): the figures stated right after the years.
    if (EXPERIENCE_WORDS.test(s) && !YEAR_RANGE.test(s)) {
      const yearsMatch = s.match(YEARS_N);
      const years = yearsMatch ? Number(yearsMatch[1] ?? yearsMatch[2]) : NaN;
      const location = AUSTRALIAN_WORDS.test(s) && !OVERSEAS_WORDS.test(s) ? "australian" : OVERSEAS_WORDS.test(s) && !AUSTRALIAN_WORDS.test(s) ? "overseas" : undefined;
      if (Number.isFinite(years) && location && yearsMatch && yearsMatch.index !== undefined) {
        const tail = s.slice(yearsMatch.index + yearsMatch[0].length).split(/;|；|\band\b|\bve\b|\bwhile\b|\bwhereas\b/i)[0];
        const claims = [...new Set(Array.from(tail.matchAll(POINTS_CLAIM), (m) => Number(m[1] ?? m[2] ?? m[3])).filter((c) => c <= 20))];
        const correct = employmentPointsFor(location, years);
        if (correct !== undefined && claims.length > 0 && !(claims.length === 1 && claims[0] === correct)) {
          out.push({ kind: "experience_points", sentence: s, detail: `${years} years of ${location === "australian" ? "Australian" : "overseas"} skilled employment = ${correct} points in the points table (answer says ${claims.join(" / ")})`, experience: { location, years, correct } });
        }
      }
    }

    // Age: 45 is an upper limit.
    if (MIN_AGE_45.test(s)) out.push({ kind: "age_limit", sentence: s, detail: `${AGE_LIMIT} is an upper limit (under ${AGE_LIMIT} when invited / applying), not a minimum age` });

    // "Not eligible" where the engine's status is "Next step required".
    if (opts.gateStatus && NOT_ELIGIBLE.test(s)) {
      const wrong = subs.filter((sc) => opts.gateStatus?.[sc] === "next_step_required");
      if (wrong.length > 0) out.push({ kind: "status_wording", sentence: s, detail: `subclass ${wrong.join("/")} is "Next step required" in the engine, not "not eligible"`, subclasses: wrong });
    }

    // Only the engine's closable ceiling may be called a maximum: the figure stated with the phrase must be that ceiling.
    const mp = s.match(MAX_POTENTIAL);
    if (mp && mp.index !== undefined) {
      // Totals only (a single category's maximum -- English 20, age 30 -- is not the visitor's ceiling).
      const figures = (text: string) => Array.from(text.matchAll(/(?<!\d|\d[.,])(\d{2,3})(?!\d|[.,]\d|\s*(?:%|years?|yıl|年|AUD))/g), (m) => Number(m[1])).filter((n) => n >= 40);
      const after = figures(s.slice(mp.index + mp[0].length));
      const stated = after.length > 0 ? after[0] : figures(s)[0];
      const categoryOnly = /\b(?:english|age|employment|education|qualification|partner|naati|community language|professional year)\b|yaş|i̇ngilizce|ingilizce|eğitim|deneyim|ortak|英语|年龄|学历|经验|伴侣/i.test(s) && stated === undefined;
      const wrong = categoryOnly ? false : opts.ceiling === undefined ? true : stated !== undefined && stated !== opts.ceiling;
      if (wrong) out.push({ kind: "max_potential", sentence: s, detail: opts.ceiling === undefined ? '"maximum potential" is not an engine figure' : `only the engine's ceiling, ${opts.ceiling}, may be called a maximum${stated !== undefined ? ` (the answer says ${stated})` : ""}` });
    }

    // A score said to be enough / sufficient while it is below the recent invitation benchmark.
    if (opts.benchmarks && ENOUGH.test(s) && !NOT_ENOUGH.test(s) && !BENCH_WORDS.test(s)) {
      const below = subs.filter((sc) => {
        const b = opts.benchmarks?.[sc as "189" | "190" | "491"];
        return b && b.benchmark !== null && b.total < b.benchmark;
      });
      if (below.length > 0) {
        out.push({ kind: "benchmark_sufficiency", sentence: s, detail: `subclass ${below.join("/")}: the score is below the recent invitation benchmark (${below.map((sc) => { const b = opts.benchmarks![sc as "189" | "190" | "491"]!; return `${b.total} vs ${b.benchmark}`; }).join(", ")}), so it is not "enough"`, subclasses: below });
      }
    }

    // WA 190: moving to WA is not what meets the stream -- a six-month WA employment contract is.
    if (WA_WORDS.test(s) && MOVE_WORDS.test(s) && !JOB_WORDS.test(s) && (subs.includes("190") || /\b190\b/.test(answer))) {
      out.push({ kind: "state_condition", sentence: s, detail: "WA's General stream for subclass 190 requires a full-time WA employment contract of at least six months; moving to WA does not meet it", subclasses: ["190"] });
    }

    if (DISCLAIMER.test(s)) disclaimers++;
  }
  const labels = findInternalLabels(answer);
  if (labels.length > 0) out.push({ kind: "internal_label", sentence: "", detail: `internal prompt labels in the answer: ${[...new Set(labels.map((l) => l.match))].join(", ")}` });
  if (disclaimers > 1) {
    out.push({ kind: "repeated_disclaimer", sentence: "", detail: `${disclaimers} "not in my sources / general knowledge" statements (at most one per answer)` });
  }
  return out;
}
