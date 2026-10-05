/**
 * The customer-facing report as DATA: the eight-part structure shared by the PDF (lib/readiness/pdf-report-v2.ts) and
 * the result page (app/[locale]/(main)/full-check/result), so the two cannot drift apart. A presentation layer only:
 * every figure, label and sentence comes from the report the engine already produced (gate statuses and citations,
 * pathway scores and benchmarks, the points action plan and simulator, the state tracker, the financial roadmap, the
 * month-by-month guide timeline). Nothing here scores, gates, prices or ranks anything.
 *
 *   1 cover      name, date, occupation, one-line verdict
 *   2 verdict    best pathway now and why, how far you are (one table), the fastest way to close the gap, next three
 *                actions, total estimated cost, realistic timeline
 *   3 points     the points table, the ways to add points (one table), at most three combined scenarios
 *   4 visas      one compact block per evaluated visa
 *   5 states     the states open to this applicant (reason, conditions); the others in one short table
 *   6 plan       the month-by-month timeline with the cost of each step
 *   7 costs      one table (item, amount, included in total, source); the total is stated once, on the verdict
 *   8 appendix   documents, pitfalls (short), official resources, sources, disclaimer
 */
import { getPersonalizedApplicationGuide } from "@/lib/readiness/pdf-content/personalized-guide";
import { benchmarkGapSentence, comparisonScoreFor } from "@/lib/readiness/pdf-content/benchmark-gap";
import { getCommonPitfalls } from "@/lib/readiness/pdf-content/common-pitfalls";
import { getResourcesSection } from "@/lib/readiness/pdf-content/resources";
import { computeEstimatedTotalAud, computePartnerTotalAud, formatEstimatedTotalLine, formatPartnerTotalLine, formatSecondInstalmentLine } from "@/lib/readiness/financial-roadmap-totals";
import { comparisonOf, nominationAvailabilitySentence, type PathwayScore, type PathwaySubclass } from "@/lib/readiness/pathway-scores";
import { conditionalGateLines, failedGateLines, pathwayStatusLabel, reportedGateVisas, visaGateLabel, type PathwayGates } from "@/lib/readiness/visa-gate-text";
import { getStateRule } from "@/lib/state-nomination/state-rules-config";
import { resolveAssessingAuthority } from "@/lib/skills-assessment/resolve-authority";
import { eoiUpdateNote, getLodgementSection, type LodgementSection } from "@/lib/readiness/pdf-content/lodgement";
import { resolveOccupationDisplayName } from "@/lib/readiness/occupation-eligibility";
import type { FinancialRoadmapItem, Locale, PointsAction, ReadinessInput, ReadinessReport, StateNominationState } from "@/lib/readiness/types";

const T = (l: Locale, en: string, tr: string, zh: string) => (l === "tr" ? tr : l === "zh-Hans" ? zh : en);

/** The profile fields the view reads -- the PDF's userInputSummary and the result page's input carry the same ones. */
export type ReportViewProfile = {
  name?: string;
  occupation?: string;
  /** The occupation as entered (with its ANZSCO code); the assessing authority is resolved from it. */
  occupationRaw?: string;
  englishLevel?: string;
  mainGoal?: string;
  age?: string;
  currentCountry?: string;
  migrationGoals?: string[];
  isAustralianQualification?: boolean | null;
};

/** Title-cases a proper-noun field ("steve" -> "Steve", "USA" stays), as the PDF does for the name on the cover. */
function toDisplayCase(value: string): string {
  return value
    .trim()
    .split(/(\s+|[-/])/)
    .map((token) => {
      if (/^\s+$/.test(token) || token === "-" || token === "/") return token;
      if (token.length <= 3 && /[A-Z]/.test(token) && token === token.toUpperCase()) return token;
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    })
    .join("");
}

/**
 * The profile the view reads, built from a stored report's input exactly as the PDF route builds its summary
 * (lib/services/report-service.ts) and the PDF normalises it: the result page and the PDF pass the same values.
 */
export function reportViewProfile(input: Partial<ReadinessInput>, fullName: string | null | undefined, locale: Locale): ReportViewProfile {
  return {
    name: fullName ? toDisplayCase(fullName) : undefined,
    occupation: input.occupation ? resolveOccupationDisplayName(input.occupation, locale) : input.occupation,
    occupationRaw: input.occupation,
    englishLevel: input.englishLevel,
    mainGoal: input.mainGoal,
    age: input.age,
    currentCountry: input.currentCountry ? toDisplayCase(input.currentCountry) : input.currentCountry,
    migrationGoals: input.migrationGoals,
    isAustralianQualification: input.qualificationAwardedInAustralia,
  };
}

export type ReportViewArgs = {
  report: ReadinessReport;
  locale: Locale;
  profile: ReportViewProfile;
  /** The date shown on the cover and the result page ("Last updated <date>" / the generation date). */
  dateText: string;
};

export type VerdictRow = { visa: string; score: string; vsMinimum: string; vsRecent: string; withAssessment: string };
export type WayRow = { action: string; points: string; difficulty: string; note: string };
export type VisaBlock = {
  subclass: string;
  title: string;
  statusLabel: string;
  status: PathwayGates["status"];
  missingLabel: string;
  missing: string[];
  nextStep: string;
  /** What follows this visa (491: the pathway to 191 after three years in a designated regional area), from the report's progression pathways. */
  after: string;
  source: string;
};
export type AvailableState = { code: string; name: string; subclasses: string[]; reason: string; conditions: string[] };
export type UnavailableState = { code: string; name: string; reason: string };
export type PlanStep = { when: string; what: string; cost: string };
export type CostRow = { item: string; amount: string; included: boolean; source: string };

export type ReportView = {
  locale: Locale;
  titles: {
    verdict: string;
    points: string;
    visas: string;
    states: string;
    plan: string;
    costs: string;
    appendix: string;
  };
  cover: { name: string; dateText: string; occupation: string; verdictLine: string; subtitle: string };
  verdict: {
    best: { subclass: string; label: string; statusLabel: string } | null;
    /** Labels for the verdict's status and reason rows. */
    labels: { status: string; why: string };
    why: string;
    distanceHeaders: string[];
    distance: VerdictRow[];
    /** True when a missing skills assessment holds points back: the table then has a "with a positive assessment" column. */
    distanceHasPotential: boolean;
    benchmarkSentence: string;
    fastestWay: { title: string; text: string } | null;
    costTimeTitle: string;
    nextActionsTitle: string;
    nextActions: string[];
    costLine: { title: string; text: string } | null;
    /** The partner / dependants total and the possible second-instalment charge, when the report has them (title, text). */
    extraCostLines: Array<{ title: string; text: string }>;
    timelineLine: { title: string; text: string } | null;
  };
  points: {
    total: number | null;
    totalLine: string;
    /** Application-stage note (invited: boosters are secondary; EOI submitted: update the EOI). */
    stageNote: string;
    headers: [string, string, string, string];
    rows: string[][];
    benchmarkSentence: string;
    waysTitle: string;
    waysHeaders: [string, string, string, string];
    ways: WayRow[];
    enablingSteps: string[];
    scenariosTitle: string;
    scenariosHeaders: [string, string, string];
    scenarios: Array<[string, string, string]>;
  };
  visas: { items: VisaBlock[]; labels: { status: string; next: string; after: string; source: string; none: string } };
  states: {
    intro: string;
    availableTitle: string;
    available: AvailableState[];
    /** One plain sentence per points-tested nomination visa (190 / 491) saying how many states are open and what that means. */
    availabilityNotes: string[];
    noneAvailable: string;
    unavailableTitle: string;
    unavailableHeaders: [string, string];
    unavailable: UnavailableState[];
    labels: { reason: string; conditions: string };
  };
  plan: {
    headers: [string, string, string];
    steps: PlanStep[];
    skillsDoneNote: string;
    /** "Invited or nominated" (AU intake): lodgement comes first. Wording only, never eligibility. */
    lodgement: LodgementSection | null;
  };
  costs: {
    headers: [string, string, string, string];
    rows: CostRow[];
    yes: string;
    no: string;
    note: string;
    skillsDoneNote: string;
    /** The authority's own fee explanation (pathway, processing time, GST rule, registration steps) for the skills-assessment row. */
    notes: string[];
    livingLine: string;
  };
  appendix: {
    documentsTitle: string;
    documents: Array<{ category: string; items: string }>;
    /** What the report still asks of a profile before lodging that is specific to it (a completed assessment: keep its outcome letter valid). */
    beforeLodgingTitle: string;
    beforeLodging: Array<{ title: string; detail: string }>;
    pitfallsTitle: string;
    pitfalls: Array<{ title: string; body: string }>;
    resourcesTitle: string;
    resources: Array<{ heading: string; links: Array<{ label: string; url: string }> }>;
    sourcesTitle: string;
    sources: string[];
    disclaimerTitle: string;
    disclaimer: string;
  };
};

// ── small formatters ───────────────────────────────────────────────────────────────────────────────

const money = (n: number) => n.toLocaleString("en-AU", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });

const DIFFICULTY_RANK: Record<string, number> = { Low: 0, Medium: 1, High: 2 };
const difficultyLabel = (level: string, l: Locale) =>
  level === "Low" ? T(l, "Low", "Düşük", "低") : level === "Medium" ? T(l, "Medium", "Orta", "中") : T(l, "High", "Yüksek", "高");

const STATUS_RANK: Record<PathwayGates["status"], number> = { eligible: 0, conditional: 1, next_step_required: 2, not_eligible_now: 3 };

/** AU: the recent invitation benchmark of each evaluated points-tested subclass that has one. */
function benchmarksOf(report: ReadinessReport): Array<{ subclass: string; points: number }> | undefined {
  if (report.country === "CA" || !report.pathwayScores) return undefined;
  const evaluated = new Set(report.detectedSubclasses ?? ["189", "190", "491"]);
  const known = Object.values(report.pathwayScores)
    .filter((p) => typeof p.benchmark === "number" && evaluated.has(p.subclass))
    .map((p) => ({ subclass: p.subclass, points: p.benchmark as number }));
  return known.length ? known : undefined;
}

/** A short form of a sentence: whole when short, else cut at the last comma / semicolon before max (closed with a full stop), else at a word. */
function shorten(text: string, max: number): string {
  if (text.length <= max) return text;
  const head = text.slice(0, max);
  const clause = Math.max(head.lastIndexOf(","), head.lastIndexOf(";"), head.lastIndexOf("，"), head.lastIndexOf("；"));
  if (clause > max * 0.5) return `${head.slice(0, clause)}${/[一-鿿]/.test(head) ? "。" : "."}`;
  return `${head.replace(/\s+\S*$/, "")}…`;
}

/** Engine sentences that point at content the restructured report no longer has ("see occupation-specific matrix below"). */
const DANGLING = /(?:occupation-specific matrix|mesleğe özel matris|职业特定矩阵|aşağıdaki[^.。]*matris|下方职业)/i;
function withoutDanglingReferences(text: string): string {
  return text
    .split(/(?<=[.。!?])\s+/)
    .filter((sentence) => !DANGLING.test(sentence))
    .join(" ")
    .replace(/\s+—\s*$/, "")
    .trim();
}

const stripSubclass = (name: string) => name.replace(/\s*\(subclass\s+\d+\)\s*$/i, "").replace(/\s*\(\d+\)\s*$/, "");

// ── best pathway ───────────────────────────────────────────────────────────────────────────────────

function chooseBest(report: ReadinessReport, gateVisas: string[]): string | null {
  const gates = report.visaGates ?? {};
  const ranking = report.pathwayRanking;
  if (ranking) {
    const pick = ranking.recommendable?.[0] ?? [...ranking.entries].sort((a, b) => a.position - b.position)[0]?.subclass;
    if (pick && gates[pick]) return pick;
  }
  const candidates = gateVisas.filter((v) => gates[v]);
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => STATUS_RANK[gates[a].status] - STATUS_RANK[gates[b].status])[0];
}

function openStatesFor(report: ReadinessReport, subclass: string): { open: string[]; blocked: Array<{ code: string; reason: string }> } {
  const tracker = report.stateNominationTracker;
  if (subclass !== "190" && subclass !== "491") return { open: [], blocked: [] };
  return {
    open: tracker?.nominationAvailability?.[subclass] ?? [],
    blocked: (tracker?.conditionBlocked?.[subclass] ?? []).map((b) => ({ code: b.code, reason: b.reason })),
  };
}

// ── verdict ────────────────────────────────────────────────────────────────────────────────────────

function distanceRows(report: ReadinessReport, locale: Locale): { rows: VerdictRow[]; potential: boolean } {
  const scores = report.pathwayScores;
  if (!scores) return { rows: [], potential: false };
  const evaluated = new Set(report.detectedSubclasses ?? ["189", "190", "491"]);
  const rows: VerdictRow[] = [];
  let potential = false;
  for (const sc of ["189", "190", "491"] as PathwaySubclass[]) {
    const s: PathwayScore | undefined = scores[sc];
    if (!s || !evaluated.has(sc)) continue;
    // The score now, with the nomination the visa requires (190 +5, 491 +15): the same basis as the benchmark sentence.
    const now = s.baseScore + s.nominationBonus;
    const gapNow = s.benchmark === null ? null : s.benchmark - now;
    const vsMin = now - 65;
    const vsMinimum = vsMin >= 0 ? T(locale, `${vsMin === 0 ? "meets it" : `${vsMin} above`}`, `${vsMin === 0 ? "karşılıyor" : `${vsMin} üstünde`}`, `${vsMin === 0 ? "刚好达到" : `高出 ${vsMin} 分`}`) : T(locale, `${-vsMin} short`, `${-vsMin} eksik`, `差 ${-vsMin} 分`);
    const vsRecent =
      s.benchmark === null || gapNow === null
        ? T(locale, "no recent level available", "yakın dönem seviyesi yok", "暂无近期参考分")
        : gapNow > 0
          ? T(locale, `${s.benchmark} (${gapNow} short)`, `${s.benchmark} (${gapNow} eksik)`, `${s.benchmark}（差 ${gapNow} 分）`)
          : T(locale, `${s.benchmark} (${gapNow === 0 ? "met" : `${-gapNow} above`})`, `${s.benchmark} (${gapNow === 0 ? "karşılanıyor" : `${-gapNow} üstünde`})`, `${s.benchmark}（${gapNow === 0 ? "已达到" : `高出 ${-gapNow} 分`}）`);
    const withNom = s.nominationBonus > 0 ? T(locale, " (incl. nomination)", " (adaylık dahil)", "（含提名）") : "";
    const { comparisonScore } = comparisonOf(s);
    const withAssessment = comparisonScore !== now ? String(comparisonScore) : "";
    if (withAssessment) potential = true;
    rows.push({ visa: sc, score: `${now}${withNom}`, vsMinimum, vsRecent, withAssessment });
  }
  return { rows, potential };
}

function pickFastestWay(report: ReadinessReport, best: string | null, locale: Locale): { title: string; text: string } | null {
  const plan = report.pointsEstimate?.actionPlan;
  const title = T(locale, "The fastest way to close the gap", "Açığı kapatmanın en hızlı yolu", "缩小差距的最快方式");
  const enabling = plan?.enablingSteps?.[0];
  if (enabling) return { title, text: `${enabling.label}. ${enabling.reason}`.trim() };
  const actions = (plan?.actions ?? []).filter((a) => !a.onlyForSubclass || a.onlyForSubclass === best);
  if (actions.length === 0) return null;
  const sorted = [...actions].sort((a, b) => (DIFFICULTY_RANK[a.difficulty] ?? 3) - (DIFFICULTY_RANK[b.difficulty] ?? 3) || b.gain - a.gain);
  const a = sorted[0];
  const score = best && report.pathwayScores ? report.pathwayScores[best as PathwaySubclass] : undefined;
  const comparison = score ? comparisonOf(score) : undefined;
  const gap = comparison?.comparisonGap ?? null;
  const left = gap !== null && gap > 0 ? Math.max(0, gap - a.gain) : null;
  const tail =
    left === null
      ? ""
      : left === 0
        ? T(locale, " This closes the remaining gap.", " Bu, kalan açığı kapatır.", " 这可以补上剩余差距。")
        : T(locale, ` ${left} point${left === 1 ? "" : "s"} would still be missing afterwards.`, ` Sonrasında ${left} puan daha eksik kalır.`, ` 完成后仍差 ${left} 分。`);
  return { title, text: (locale === "zh-Hans" ? `${a.label}（+${a.gain}；${difficultyLabel(a.difficulty, locale)}）。${a.difficultyNote}${tail}` : `${a.label} (+${a.gain}; ${difficultyLabel(a.difficulty, locale)}). ${a.difficultyNote}${tail}`).replace(/\s+/g, " ").trim() };
}

// ── guide timeline / costs ─────────────────────────────────────────────────────────────────────────

const SKILLS_STEP = /Skills assessment application|Beceri değerlendirmesi başvurusu|提交技能评估申请/i;
const ENGLISH_STEP = /and language test|ve dil testi|和语言考试/i;
const DOCS_STEP = /gather documents|belge toplama|准备申请材料/i;
const LODGE_STEP = /Lodge application|Başvuru sunma|提交申请(?!.*EOI)/i;

function amountOf(items: readonly FinancialRoadmapItem[], kind: FinancialRoadmapItem["kind"]): string | undefined {
  return items.find((i) => i.kind === kind)?.amountLabel;
}

function planSteps(args: ReportViewArgs, skillsDone: boolean, items: readonly FinancialRoadmapItem[]): { steps: PlanStep[]; estimate: string } {
  const { report, locale, profile } = args;
  const statesTitle = T(locale, "States you can use", "Kullanabileceğiniz eyaletler", "您可以使用的州");
  const guide = getPersonalizedApplicationGuide(
    locale,
    report.country === "CA" ? "CA" : "AU",
    profile,
    skillsDone,
    report.pointsEstimate?.estimatedPoints,
    undefined,
    undefined,
    report.assessmentState.isEoiEligible,
    report.financialRoadmap,
    report.pointsEstimate?.actionPlan,
  );
  const dash = "—";
  const steps = guide.detailedTimeline.map((line): PlanStep => {
    const m = line.match(/^([^:：]+)[:：]\s*(.*)$/);
    const when = (m?.[1] ?? "").trim();
    const what = (m?.[2] ?? line)
      .trim()
      .replace(/\(see the State Nomination Tracker\)/i, `(${T(locale, "see", "bkz.", "见")} "${statesTitle}")`)
      .replace(/\(Eyalet Adaylığı Takipçisi'ne bakın\)/i, `(bkz. "${statesTitle}")`)
      .replace(/（见州提名追踪器）/, `（见“${statesTitle}”）`);
    const costs: string[] = [];
    if (SKILLS_STEP.test(line) && !skillsDone) {
      const a = amountOf(items, "skills_assessment");
      if (a) costs.push(a);
    }
    if (ENGLISH_STEP.test(line)) {
      const a = amountOf(items, "english_test");
      if (a) costs.push(a);
    }
    if (DOCS_STEP.test(line)) {
      for (const k of ["medical", "police"] as const) {
        const a = amountOf(items, k);
        if (a) costs.push(a);
      }
    }
    if (LODGE_STEP.test(line)) {
      const a = amountOf(items, "vac");
      if (a) costs.push(a);
    }
    return { when, what, cost: costs.length ? costs.join("; ") : dash };
  });
  return { steps, estimate: guide.timelineEstimate };
}

function sourceOfItem(item: FinancialRoadmapItem, locale: Locale): string {
  const kindLabel =
    item.estimateType === "official_fee"
      ? T(locale, "official fee", "resmi ücret", "官方费用")
      : item.estimateType === "variable"
        ? T(locale, "varies by case", "duruma göre değişir", "因个案而异")
        : T(locale, "indicative estimate", "tahmini", "参考估算");
  let who = "";
  if (item.kind === "vac" || item.kind === "vac_additional") who = T(locale, "Department of Home Affairs", "İçişleri Bakanlığı (Department of Home Affairs)", "内政部 (Department of Home Affairs)");
  else if (item.kind === "skills_assessment") who = item.category.replace(/^[^—-]*[—-]\s*/, "").trim();
  else if (item.kind === "english_test") who = T(locale, "test provider", "sınav kuruluşu", "考试机构");
  else if (item.kind === "medical") who = T(locale, "eMedical panel provider", "eMedical panel sağlayıcısı", "eMedical 指定机构");
  else if (item.kind === "police") who = T(locale, "issuing authorities", "ilgili makamlar", "签发机构");
  return who ? `${who}; ${kindLabel}` : kindLabel;
}

// ── states ─────────────────────────────────────────────────────────────────────────────────────────

const closedStatus = (s: StateNominationState) => /closed|suspended/i.test(s.status);

/** The first clause of an engine sentence: before the first ";", " (you live...", ", so it is not counted..." (en / tr / zh). */
const firstClause = (t: string) => t.split(/;|；| \((?:you|siz)\b|（您|, so |, bu nedenle|，因此/)[0].replace(/[.。]\s*$/, "").trim();

function unavailableReason(s: StateNominationState, locale: Locale): string {
  const residence = s.requirements.find((r) => /you live in|yaşıyorsunuz|您居住在/i.test(r));
  const parts: string[] = [];
  if (closedStatus(s)) parts.push(T(locale, "nomination program closed", "adaylık programı kapalı", "提名项目已关闭"));
  if (residence) parts.push(firstClause(residence));
  if (parts.length === 0 && s.occupationListStatus === "not_listed") parts.push(T(locale, "your occupation is not on its list", "mesleğiniz listesinde yok", "您的职业不在其清单上"));
  if (parts.length === 0 && s.occupationListStatus === "unconfirmed") parts.push(T(locale, "occupation list not confirmed", "meslek listesi teyit edilmedi", "职业清单未确认"));
  if (parts.length === 0) parts.push(T(locale, "not open to your situation", "durumunuza açık değil", "目前不对您的情况开放"));
  return parts.join("; ");
}

function stateViews(report: ReadinessReport, locale: Locale): { available: AvailableState[]; unavailable: UnavailableState[] } {
  const tracker = report.stateNominationTracker;
  if (!tracker || tracker.eligibilityBlocked) return { available: [], unavailable: [] };
  const available: AvailableState[] = [];
  const unavailable: UnavailableState[] = [];
  for (const s of tracker.states) {
    const subs = (["190", "491"] as const).filter((sub) => s.isOpen && (s.listedFor ?? []).includes(sub) && !s.unavailableFor?.[sub]);
    if (subs.length > 0) {
      const conditions: string[] = [];
      for (const sub of ["190", "491"] as const) {
        const b = s.unavailableFor?.[sub];
        if (b) conditions.push(T(locale, `Subclass ${sub}: not available -- ${b.reason}.`, `Subclass ${sub}: uygun değil -- ${b.reason}.`, `Subclass ${sub}：不适用——${b.reason}。`));
      }
      // The state's own stream conditions (sourced), in full: they say what each stream requires.
      for (const note of s.streamNotes ?? []) conditions.push(note);
      available.push({
        code: s.code,
        name: s.name,
        subclasses: [...subs],
        // The engine's sourced occupation-list line for this state, then that its program is open to the applicant's location.
        reason: s.occupationMatchNote
          ? `${s.occupationMatchNote} ${T(locale, "Its program is open to your location.", "Programı bulunduğunuz yere açık.", "其项目对您所在地开放。")}`
          : T(
              locale,
              `${s.name} lists your occupation for ${subs.join(" and ")} and its program is open to your location.`,
              `${s.name}, mesleğinizi ${subs.join(" ve ")} için listeliyor ve programı bulunduğunuz yere açık.`,
              `${s.name}在其 ${subs.join(" 和 ")} 清单中列有您的职业，且项目对您所在地开放。`,
            ),
        conditions,
      });
    } else {
      unavailable.push({ code: s.code, name: s.name, reason: unavailableReason(s, locale) });
    }
  }
  return { available, unavailable };
}

// ── visa blocks ────────────────────────────────────────────────────────────────────────────────────

function visaBlock(g: PathwayGates, locale: Locale, report: ReadinessReport): VisaBlock {
  const none = T(locale, "Nothing missing now.", "Şu anda eksik yok.", "目前没有缺失项。");
  let missing: string[] = [];
  let nextStep = "";
  if (g.status === "not_eligible_now") {
    missing = failedGateLines(g).map((l) => l.replace(/\s*\([^()]*\)\s*$/, ""));
    nextStep = g.steps[0] ?? T(locale, "Not available on your current answers.", "Mevcut yanıtlarınıza göre uygun değil.", "按您目前的答案无法申请。");
  } else if (g.status === "next_step_required") {
    missing = g.notMet.map((n) => n.label);
    nextStep = g.steps.join("; ");
  } else if (g.status === "conditional") {
    missing = conditionalGateLines(g).map((l) => l.replace(/\s*\([^()]*\)\s*$/, ""));
    nextStep = T(locale, "Confirm the points above, then proceed.", "Yukarıdaki şartları teyit edin, sonra ilerleyin.", "先确认上述条件，再继续。");
  } else {
    missing = g.future.map((f) => f.label);
    nextStep = "";
  }
  const missingLabel =
    g.status === "not_eligible_now"
      ? T(locale, "Not met", "Karşılanmayan", "未满足")
      : g.status === "next_step_required"
        ? T(locale, "Missing", "Eksik", "缺少")
        : g.status === "conditional"
          ? T(locale, "Must be true", "Doğru olması gerekenler", "须满足")
          : T(locale, "Later steps", "Sonraki adımlar", "后续步骤");
  const cite = g.notMet[0]?.citation ?? g.unknown[0]?.citation ?? g.gates.find((x) => x.citation)?.citation ?? "";
  return { subclass: g.visa, title: visaGateLabel(g.visa, locale), statusLabel: pathwayStatusLabel(g, locale), status: g.status, missingLabel, missing: missing.length ? missing : [none], nextStep, after: report.progressionPathways?.find((p) => p.from === g.visa && /191/.test(p.to))?.explanation ?? "", source: cite };
}

// ── main ───────────────────────────────────────────────────────────────────────────────────────────

export function buildReportView(args: ReportViewArgs): ReportView {
  const { report, locale, profile, dateText } = args;
  const isCA = report.country === "CA";
  const skillsDone = report.assessmentState?.fieldsPresent?.skillsAssessment === true;
  const gates = report.visaGates ?? {};
  const gateVisas = reportedGateVisas(report.pathwayComparison ?? []);
  const bestSub = chooseBest(report, gateVisas);
  const bestGate = bestSub ? gates[bestSub] : undefined;
  const bestName = bestSub
    ? stripSubclass(report.pathwayComparison?.find((p) => p.subclass === bestSub)?.visaName ?? "")
    : "";
  const bestLabel = bestSub ? (bestName ? `${visaGateLabel(bestSub, locale)} (${bestName})` : visaGateLabel(bestSub, locale)) : "";
  const statusLabel = bestGate ? pathwayStatusLabel(bestGate, locale) : "";
  const estimatedPoints = report.pointsEstimate?.estimatedPoints;
  const benchmarks = benchmarksOf(report);
  const benchmarkSentence = estimatedPoints !== undefined ? benchmarkGapSentence(locale, estimatedPoints, benchmarks) : "";

  const dist = distanceRows(report, locale);

  // Why this pathway: its status in the engine's words, then the plain nomination statement for 190 / 491.
  const whyParts: string[] = [];
  if (bestGate) {
    if (bestGate.status === "next_step_required" && bestGate.steps.length) whyParts.push(`${T(locale, "Next", "Sonraki adım", "下一步")}${locale === "zh-Hans" ? "：" : ": "}${bestGate.steps[0]}${locale === "zh-Hans" ? "。" : "."}`);
    const score = bestSub && report.pathwayScores ? report.pathwayScores[bestSub as PathwaySubclass] : undefined;
    if (score && (bestSub === "190" || bestSub === "491")) {
      const st = openStatesFor(report, bestSub);
      // While a missing skills assessment holds points back, the engine's "points are not your barrier" sentence would
      // contradict the score shown now: say only where nomination is open.
      const holdsBack = score.potentialScore !== undefined && score.potentialScore !== score.baseScore;
      whyParts.push(
        holdsBack && st.open.length > 0
          ? T(locale, `Nomination is currently open for your occupation and location in: ${st.open.join(", ")}.`, `Mesleğiniz ve bulunduğunuz yer için adaylık şu anda şu eyaletlerde açık: ${st.open.join(", ")}.`, `目前对您的职业和所在地开放提名的州：${st.open.join("、")}。`)
          : nominationAvailabilitySentence(score, st.open, locale, st.blocked),
      );
    }
  }

  const items = report.financialRoadmap ?? [];
  const total = computeEstimatedTotalAud(items);
  const completed = new Set(total?.completedKinds ?? []);
  const skillsFeeCompleted = skillsDone || completed.has("skills_assessment");
  const plan = planSteps(args, skillsDone, items);

  // Next three actions: the best pathway's own steps, the fastest points action, the open states, then the guide steps.
  const fastest = pickFastestWay(report, bestSub, locale);
  const nextActions: string[] = [];
  const addAction = (s: string | undefined) => {
    const v = (s ?? "").replace(/\s+/g, " ").trim();
    if (v && !nextActions.some((a) => a.toLowerCase() === v.toLowerCase())) nextActions.push(v);
  };
  // The best pathway's own steps; the enabling step only when the pathway has none; the timeline's first step only
  // when neither exists (a profile that is ready to lodge starts with its EOI).
  (bestGate?.steps ?? []).forEach(addAction);
  if (nextActions.length === 0) (report.pointsEstimate?.actionPlan?.enablingSteps ?? []).forEach((e) => addAction(e.label));
  if (nextActions.length === 0 && plan.steps[0]) addAction(plan.steps[0].what.replace(/\s*[（(].*$/, ""));
  if (bestSub === "190" || bestSub === "491") {
    const open = openStatesFor(report, bestSub).open;
    if (open.length) addAction(T(locale, `Apply for ${bestSub} nomination in the state${open.length === 1 ? "" : "s"} open to you: ${open.join(", ")}`, `Size açık ${open.length === 1 ? "eyalette" : "eyaletlerde"} ${bestSub} adaylığına başvurun: ${open.join(", ")}`, `向对您开放的州申请 ${bestSub} 提名：${open.join("、")}`));
  }
  if (fastest && nextActions.length < 3) addAction(fastest.text.split(/(?<=[.。])\s/)[0].replace(/[.。]$/, ""));
  guideSteps(args, skillsDone).forEach((s) => nextActions.length < 3 && addAction(s));

  // The one total line (range, estimate qualifier, what it leaves out). A completed skills assessment is mentioned once,
  // in the costs section, not here.
  const totalLine = total ? formatEstimatedTotalLine({ ...total, completedKinds: [] }, locale) : "";
  // "Estimated total (primary applicant): AUD 6,862-7,425 (note)" -> title "Estimated total (primary applicant)", text the range.
  const totalParts = totalLine.match(/^([^:：]*)[:：]\s*(.*)$/);
  const costLine = totalParts ? { title: totalParts[1].trim(), text: totalParts[2].trim() } : null;
  const extraCostLines: Array<{ title: string; text: string }> = [];
  const partner = computePartnerTotalAud(items);
  if (partner && total) {
    for (const line of [formatPartnerTotalLine(partner, locale), formatSecondInstalmentLine(partner, locale)]) {
      const m = line?.match(/^([^:：]*)[:：]\s*(.*)$/);
      if (m) extraCostLines.push({ title: m[1].trim(), text: m[2].trim() });
    }
  }
  const timelineLine = plan.estimate ? { title: T(locale, "Realistic timeline", "Gerçekçi zaman çizelgesi", "合理的时间线"), text: plan.estimate.replace(/^[^:：]*[:：]\s*/, "") } : null;

  // Points.
  const pe = report.pointsEstimate;
  const breakdownRows = (pe?.breakdown ?? []).map((b) => [b.label, String(b.points), b.max !== undefined ? String(b.max) : "", b.max !== undefined && b.points >= b.max ? "—" : (b.note || "—")]);
  const actions: PointsAction[] = pe?.actionPlan?.actions ?? [];
  const ways: WayRow[] = actions.map((a) => ({
    action: a.onlyForSubclass && !a.label.includes(a.onlyForSubclass) ? `${a.label} (${T(locale, "subclass", "subclass", "子类")} ${a.onlyForSubclass})` : a.label,
    points: `+${a.gain}`,
    difficulty: difficultyLabel(a.difficulty, locale),
    note: a.difficultyNote,
  }));
  const enablingSteps = (pe?.actionPlan?.enablingSteps ?? []).map((e) => `${e.label}. ${e.reason}`.trim());
  const scenarios = (report.pointsBoosterSimulator?.scenarios ?? [])
    .filter((s) => / \+ /.test(s.label) && Number.isFinite(s.resultingEstimate))
    .slice(0, 3)
    .map((s): [string, string, string] => [
      s.onlyForSubclass && !s.label.includes(s.onlyForSubclass) ? `${s.label} (${T(locale, "subclass", "subclass", "子类")} ${s.onlyForSubclass})` : s.label,
      `+${s.estimatedChange}`,
      String(s.resultingEstimate),
    ]);

  // States.
  const sv = stateViews(report, locale);
  const availabilityNotes: string[] = [];
  if (!report.stateNominationTracker?.eligibilityBlocked && report.stateNominationTracker) {
    for (const sub of ["190", "491"] as const) {
      if (!(report.detectedSubclasses ?? ["190", "491"]).includes(sub)) continue;
      const open = report.stateNominationTracker.nominationAvailability?.[sub] ?? [];
      const list = open.join(", ");
      availabilityNotes.push(
        open.length === 0
          ? T(locale, `No state is open to you for ${sub}, so nomination is the main hurdle.`, `${sub} için size açık bir eyalet yok; bu yüzden asıl engel adaylık.`, `目前没有任何州对您开放 ${sub}，因此主要障碍是获得提名。`)
          : open.length === 1
            ? T(locale, `Only one state is open to you for ${sub} (${list}), so nomination is the main hurdle.`, `${sub} için size yalnızca bir eyalet açık (${list}); bu yüzden asıl engel adaylık.`, `目前仅有一个州对您开放 ${sub}（${list}），因此主要障碍是获得提名。`)
            : open.length === 2
              ? T(locale, `Only two states are open to you for ${sub} (${list}).`, `${sub} için size yalnızca iki eyalet açık (${list}).`, `目前仅有两个州对您开放 ${sub}（${list}）。`)
              : T(locale, `${open.length} states are open to you for ${sub}: ${list}.`, `${sub} için size ${open.length} eyalet açık: ${list}.`, `目前有 ${open.length} 个州对您开放 ${sub}：${list}。`),
      );
    }
  }

  // Costs: one table; a completed skills assessment is not a cost item at all.
  const includedKinds = new Set(total?.includedKinds ?? []);
  const costRows: CostRow[] = items
    .filter((i) => !(i.kind === "skills_assessment" && skillsFeeCompleted))
    .map((i) => ({
      item: i.category,
      amount: i.amountLabel,
      included: i.kind !== undefined && includedKinds.has(i.kind),
      source: sourceOfItem(i, locale),
    }));
  // The authority's own explanation (pathway, processing time, GST rule, registration steps): the skills-assessment row,
  // and the unpriced registration line that follows it for doctors and nurses.
  const notes: string[] = [];
  items.forEach((i, idx) => {
    const isSkills = i.kind === "skills_assessment" && !skillsFeeCompleted;
    const follows = i.kind === undefined && i.estimateType === "variable" && items[idx - 1]?.kind === "skills_assessment" && !skillsFeeCompleted;
    if ((isSkills || follows) && i.explanation) notes.push(`${i.category}: ${withoutDanglingReferences(i.explanation)}`);
  });
  const city = report.premiumSections?.livingCostProjection;
  const livingKnown = !isCA && city && /[(（]/.test(city.city);
  const livingLine = livingKnown
    ? T(
        locale,
        `Living cost, ${city!.city}: about ${city!.currency} ${city!.monthly.total.toLocaleString("en-AU")} per month (${city!.familyProfile}).`,
        `Yaşam maliyeti, ${city!.city}: ayda yaklaşık ${city!.currency} ${city!.monthly.total.toLocaleString("en-AU")} (${city!.familyProfile}).`,
        `生活成本，${city!.city}：每月约 ${city!.currency} ${city!.monthly.total.toLocaleString("en-AU")}（${city!.familyProfile}）。`,
      )
    : "";

  // Appendix.
  const pitfalls = getCommonPitfalls(locale, isCA ? "CA" : "AU").pitfalls.map((p) => ({
    title: `${p.category}: ${p.title}`,
    body: shorten(p.body.split(/(?<=[.。!?])\s+/)[0] ?? p.body, 150),
  }));
  const resourcesSrc = getResourcesSection(locale, isCA ? "CA" : "AU");
  const sources = collectSources(report, locale, sv, costRows.length > 0, profile.occupationRaw ?? profile.occupation);

  // Application stage (AU intake; wording only, never eligibility).
  const stage = report.country === "CA" ? undefined : report.applicationStage;
  const stageNote = stage === "invited" ? getLodgementSection(locale).boosterNote : stage === "eoi_submitted" ? eoiUpdateNote(locale) : "";

  return {
    locale,
    titles: {
      verdict: T(locale, "Your verdict", "Değerlendirmeniz", "您的结论"),
      points: T(locale, "Your points", "Puanlarınız", "您的积分"),
      visas: T(locale, "Visa by visa", "Vize vize", "逐个签证分析"),
      states: T(locale, "States you can use", "Kullanabileceğiniz eyaletler", "您可以使用的州"),
      plan: T(locale, "Action plan", "Eylem planı", "行动计划"),
      costs: T(locale, "Costs", "Maliyetler", "费用"),
      appendix: T(locale, "Appendix", "Ekler", "附录"),
    },
    cover: {
      name: profile.name ?? "",
      dateText,
      occupation: profile.occupation ?? "",
      verdictLine: bestSub ? `${bestLabel} — ${statusLabel}` : "",
      subtitle: T(
        locale,
        "A personalised visa readiness assessment based on official sources",
        "Resmi kaynaklara dayalı kişiselleştirilmiş vize hazırlık değerlendirmesi",
        "基于官方来源的个性化签证准备度评估",
      ),
    },
    verdict: {
      best: bestSub ? { subclass: bestSub, label: bestLabel, statusLabel } : null,
      labels: { status: T(locale, "Status", "Durum", "状态"), why: T(locale, "Why", "Neden", "原因") },
      why: whyParts.join(" "),
      distanceHeaders: [
        T(locale, "Visa", "Vize", "签证"),
        T(locale, "Your score now", "Şu anki puanınız", "您当前的分数"),
        ...(dist.potential ? [T(locale, "With a positive skills assessment", "Olumlu beceri değerlendirmesiyle", "获得正面技能评估后")] : []),
        T(locale, "vs 65 minimum", "65 asgari puana göre", "对比 65 分最低要求"),
        T(locale, "vs recent invitations", "son davetlere göre", "对比近期邀请分"),
      ],
      distance: dist.rows,
      distanceHasPotential: dist.potential,
      benchmarkSentence,
      fastestWay: fastest,
      costTimeTitle: T(locale, "Cost and time", "Maliyet ve süre", "费用与时间"),
      nextActionsTitle: T(locale, "Your next 3 actions", "Sonraki 3 adımınız", "您的下一步（三项）"),
      nextActions: nextActions.slice(0, 3),
      costLine,
      extraCostLines,
      timelineLine,
    },
    points: {
      total: estimatedPoints ?? null,
      totalLine: estimatedPoints !== undefined ? T(locale, `Total: ${estimatedPoints} points (minimum ${65})`, `Toplam: ${estimatedPoints} puan (asgari ${65})`, `总计：${estimatedPoints} 分（最低 ${65} 分）`) : "",
      headers: [T(locale, "Category", "Kategori", "类别"), T(locale, "Points", "Puan", "分数"), T(locale, "Max", "En çok", "上限"), T(locale, "Note", "Not", "说明")],
      stageNote,
      rows: breakdownRows,
      benchmarkSentence,
      waysTitle: T(locale, "Ways to add points", "Puan ekleme yolları", "增加积分的方式"),
      waysHeaders: [T(locale, "Action", "Eylem", "行动"), T(locale, "Points", "Puan", "积分"), T(locale, "Difficulty", "Zorluk", "难度"), T(locale, "Time and effort", "Süre ve çaba", "时间与投入")],
      ways,
      enablingSteps,
      scenariosTitle: T(locale, "Combined scenarios", "Birleşik senaryolar", "组合方案"),
      scenariosHeaders: [T(locale, "Scenario", "Senaryo", "方案"), T(locale, "Points added", "Eklenen puan", "增加的积分"), T(locale, "New total", "Yeni toplam", "新总分")],
      scenarios,
    },
    visas: {
      items: gateVisas.filter((v) => gates[v]).map((v) => visaBlock(gates[v], locale, report)),
      labels: {
        status: T(locale, "Status", "Durum", "状态"),
        next: T(locale, "Next step", "Sonraki adım", "下一步"),
        after: T(locale, "Then", "Sonra", "之后"),
        source: T(locale, "Source", "Kaynak", "来源"),
        none: T(locale, "Nothing missing now.", "Şu anda eksik yok.", "目前没有缺失项。"),
      },
    },
    states: {
      intro: T(locale, "Only states that are open to your situation are listed as usable.", "Yalnızca durumunuza açık eyaletler kullanılabilir olarak listelenir.", "仅列出对您的情况开放、可使用的州。"),
      availableTitle: T(locale, "Available to you", "Size açık olanlar", "对您开放"),
      available: sv.available,
      availabilityNotes,
      noneAvailable: T(locale, "No state is open to you for nomination right now, so a nomination is the main hurdle for 190 and 491.", "Şu anda adaylık için size açık bir eyalet yok; bu yüzden 190 ve 491 için asıl engel adaylık.", "目前没有任何州对您开放提名，因此 190 和 491 的主要障碍是获得提名。"),
      unavailableTitle: T(locale, "Not available to you", "Size açık olmayanlar", "对您不开放"),
      unavailableHeaders: [T(locale, "State", "Eyalet", "州"), T(locale, "Reason", "Neden", "原因")],
      unavailable: sv.unavailable,
      labels: { reason: T(locale, "Why", "Neden", "原因"), conditions: T(locale, "Conditions", "Koşullar", "条件") },
    },
    plan: {
      headers: [T(locale, "When", "Ne zaman", "时间"), T(locale, "Step", "Adım", "步骤"), T(locale, "Cost", "Maliyet", "费用")],
      steps: plan.steps,
      skillsDoneNote: "",
      lodgement: stage === "invited" ? getLodgementSection(locale) : null,
    },
    costs: {
      headers: [T(locale, "Item", "Kalem", "项目"), T(locale, "Amount", "Tutar", "金额"), T(locale, "In total", "Toplamda", "计入总额"), T(locale, "Source", "Kaynak", "来源")],
      rows: costRows,
      yes: T(locale, "Yes", "Evet", "是"),
      no: T(locale, "No", "Hayır", "否"),
      note: totalLine ? T(locale, "The estimated total on your verdict page is the sum of the items marked Yes.", "Değerlendirme sayfanızdaki tahmini toplam, Evet işaretli kalemlerin toplamıdır.", "结论页上的预计总额等于标记为“是”的项目之和。") : "",
      skillsDoneNote: skillsFeeCompleted ? T(locale, "Your skills assessment is already done; its fee is not a cost item.", "Beceri değerlendirmeniz zaten tamamlandı; ücreti bir maliyet kalemi değildir.", "您的技能评估已完成；其费用不再是成本项目。") : "",
      notes,
      livingLine,
    },
    appendix: {
      beforeLodgingTitle: T(locale, "Before you lodge", "Başvurudan önce", "递交前"),
      beforeLodging: skillsDone
        ? (report.lodgementReadyChecklist?.items ?? []).filter((i) => i.id === "skills-assessment").map((i) => ({ title: i.title, detail: i.detail }))
        : [],
      documentsTitle: T(locale, "Documents checklist", "Belge kontrol listesi", "文件清单"),
      documents: (report.documentChecklist ?? []).map((d) => ({ category: d.category, items: d.items.join("; ") })),
      pitfallsTitle: T(locale, "Common pitfalls", "Sık yapılan hatalar", "常见错误"),
      pitfalls,
      resourcesTitle: T(locale, "Official resources", "Resmi kaynaklar", "官方资源"),
      resources: resourcesSrc.sections.map((s) => ({ heading: s.heading, links: s.links.map((l) => ({ label: l.label, url: l.url })) })),
      sourcesTitle: T(locale, "Sources", "Kaynaklar", "资料来源"),
      sources,
      disclaimerTitle: T(locale, "Disclaimer", "Yasal uyarı", "免责声明"),
      disclaimer: report.disclaimer ?? "",
    },
  };
}

function guideSteps(args: ReportViewArgs, skillsDone: boolean): string[] {
  const { report, locale, profile } = args;
  const guide = getPersonalizedApplicationGuide(locale, report.country === "CA" ? "CA" : "AU", profile, skillsDone, report.pointsEstimate?.estimatedPoints, undefined, undefined, report.assessmentState.isEoiEligible, report.financialRoadmap, report.pointsEstimate?.actionPlan);
  return guide.nextSteps.filter((s) => s.priority !== "low").map((s) => s.title);
}

function collectSources(report: ReadinessReport, locale: Locale, sv: { available: AvailableState[]; unavailable: UnavailableState[] }, hasCosts: boolean, occupation?: string): string[] {
  const out: string[] = [];
  const add = (s: string | undefined) => {
    const v = (s ?? "").trim();
    if (v && !out.includes(v)) out.push(v);
  };
  for (const v of reportedGateVisas(report.pathwayComparison ?? [])) {
    const g = report.visaGates?.[v];
    g?.gates.forEach((x) => add(x.citation));
  }
  const asOf = report.premiumSections?.historicalInvitationTrends?.dataAsOf;
  if (asOf) add(T(locale, `Recent invitation levels: SkillSelect invitation rounds, data as of ${asOf}`, `Yakın dönem davet seviyeleri: SkillSelect davet turları, veri tarihi ${asOf}`, `近期邀请分：SkillSelect 邀请轮次，数据截至 ${asOf}`));
  for (const s of [...sv.available, ...sv.unavailable]) {
    const doc = getStateRule(s.code)?.sourceDocument;
    if (doc) add(`${s.name}: ${doc.split("/").pop()?.replace(/\.pdf$/i, "") ?? doc}`);
  }
  if (hasCosts && occupation) {
    const auth = resolveAssessingAuthority(occupation).authority;
    if (auth?.sourceDocument) add(`${auth.authorityName}: ${auth.sourceDocument}`);
  }
  return groupSourcePages(out);
}

/** "X, p.7" / "X, p.15" -> "X, pp.7, 15" (en) / "X, s.7, 15" (tr) / "X，第 7、15 页" (zh); other entries unchanged. */
function groupSourcePages(list: string[]): string[] {
  const groups = new Map<string, { head: string; kind: "en" | "tr" | "zh"; pages: number[] }>();
  const out: string[] = [];
  for (const entry of list) {
    const m = entry.match(/^(.*?)[,，]\s*(p\.|s\.|第\s*)(\d+)(\s*页)?$/);
    if (!m) {
      out.push(entry);
      continue;
    }
    const kind = m[2].startsWith("p") ? "en" : m[2].startsWith("s") ? "tr" : "zh";
    const key = `${m[1]}|${kind}`;
    const g = groups.get(key);
    if (g) g.pages.push(Number(m[3]));
    else {
      groups.set(key, { head: m[1], kind, pages: [Number(m[3])] });
      out.push(`\u0000${key}`);
    }
  }
  return out.map((e) => {
    if (!e.startsWith("\u0000")) return e;
    const g = groups.get(e.slice(1))!;
    const pages = [...new Set(g.pages)].sort((a, b) => a - b);
    if (g.kind === "zh") return `${g.head}，第 ${pages.join("、")} 页`;
    return `${g.head}, ${g.kind === "en" ? (pages.length > 1 ? "pp." : "p.") : "s."}${pages.join(", ")}`;
  });
}
