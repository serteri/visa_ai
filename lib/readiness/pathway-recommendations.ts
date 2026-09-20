import type { PremiumStrategyResult } from "@/lib/ai/strategy-schema";
import { describePathwayScore, PATHWAY_SUBCLASSES, type PathwaySubclass } from "./pathway-scores";
import { rankPosition } from "./pathway-ranking";
import type { Locale, ReadinessReport, StateNominationState } from "./types";

/**
 * The Top Recommended Pathways contract (AU): the model may only recommend
 *  - pathways the single ranking marks recommendable (pathway-ranking.ts), in ranking order;
 *  - for 190/491, states whose nomination program is open to this applicant
 *    (stateNominationTracker.states[].isOpen);
 *  - with any score or gap number equal to the single PathwayScoreSet, and a
 *    nomination-bonus score never presented as the applicant's current score.
 * Anything else is replaced by deterministicRecommendations().
 * Pure (no server imports): also re-run when the PDF is rendered from stored data.
 */

export type RecommendationViolation = { path: string; message: string };

type Recommendation = PremiumStrategyResult["topRecommendedPathways"][number];

const norm = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** The open tracker state a model-written `state` string refers to (by code or full name), if any. */
export function findOpenState(report: ReadinessReport, stateText: string): StateNominationState | undefined {
  const tracker = report.stateNominationTracker;
  if (!tracker || tracker.eligibilityBlocked) return undefined;
  const wanted = norm(stateText);
  return tracker.states.find((s) => s.isOpen === true && (norm(s.code) === wanted || norm(s.name) === wanted));
}

const CONDITIONAL_WORDS = /\b(?:if|only|would|nominat\w*|sponsor\w*|secured)\b|adaylık|yalnızca|alınırsa|提名|担保|如果|仅/i;

/** Every number the report's own PathwayScoreSet contains. */
function scoreNumbers(report: ReadinessReport): Set<number> {
  const out = new Set<number>();
  const scores = report.pathwayScores;
  if (!scores) return out;
  for (const s of PATHWAY_SUBCLASSES) {
    const p = scores[s];
    for (const n of [p.baseScore, p.scoreIfNominated, p.benchmark, p.gapBase, p.gapIfNominated, p.nominationBonus]) {
      if (typeof n === "number") {
        out.add(n);
        out.add(Math.abs(n));
      }
    }
  }
  return out;
}

/** Score/gap numbers and bonus-as-current claims in one free-text string. */
export function findScoreViolations(text: string, report: ReadinessReport): string[] {
  const scores = report.pathwayScores;
  if (!scores) return [];
  const out: string[] = [];
  const allowed = scoreNumbers(report);
  for (const n of report.pointsEstimate?.actionPlan?.actions.map((a) => a.gain) ?? []) allowed.add(n);
  allowed.add(65);
  for (const item of report.pointsEstimate?.breakdown ?? []) {
    allowed.add(item.points);
    if (typeof item.max === "number") allowed.add(item.max);
  }

  // "score 92", "92 points", "15-point gap", "15 points below": a score or a gap must be one of the function's numbers.
  const patterns = [/(?:score|puan\w*|分数|积分)\s*(?:of|is|:|：)?\s*(\d+)/gi, /(\d+)[\s-]?(?:points?\b|pts?\b|puan\w*|分)/gi];
  const seen = new Set<string>();
  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      const n = Number(m[1]);
      const key = `${m.index}:${n}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!allowed.has(n)) out.push(`number ${n} is not a score, gap or gain from the engine`);
    }
  }

  // A bonus score (85 for 491, 75 for 190) may only appear in a conditional sentence.
  for (const s of ["190", "491"] as const) {
    const p = scores[s];
    if (p.nominationBonus <= 0 || p.scoreIfNominated === p.baseScore) continue;
    const re = new RegExp(`(?<![\\d.])${p.scoreIfNominated}(?![\\d])`, "g");
    for (const m of text.matchAll(re)) {
      const around = text.slice(Math.max(0, (m.index ?? 0) - 90), (m.index ?? 0) + 90);
      if (!CONDITIONAL_WORDS.test(around)) {
        out.push(`${p.scoreIfNominated} (the ${s} score if nominated) is presented as the current score`);
      }
    }
  }
  return out;
}

export function findRecommendationViolations(result: PremiumStrategyResult, report: ReadinessReport): RecommendationViolation[] {
  const ranking = report.pathwayRanking;
  if (!ranking || !report.pathwayScores) return [];
  const violations: RecommendationViolation[] = [];

  let lastPosition = 0;
  result.topRecommendedPathways.forEach((rec, i) => {
    const path = `topRecommendedPathways[${i}]`;
    const sub = rec.subclass as PathwaySubclass;
    if (!ranking.recommendable.includes(sub)) {
      const entry = ranking.entries.find((e) => e.subclass === sub);
      violations.push({
        path,
        message: entry
          ? `recommends subclass ${sub}, which the ranking marks ${entry.fit === "blocked" ? `blocked (${entry.blockReason})` : entry.fit}`
          : `recommends subclass ${rec.subclass}, which is not ranked`,
      });
      return;
    }
    const position = rankPosition(ranking, sub) ?? 0;
    if (position < lastPosition) violations.push({ path, message: `subclass ${sub} is out of ranking order` });
    lastPosition = Math.max(lastPosition, position);

    if (sub === "190" || sub === "491") {
      if (!findOpenState(report, rec.state)) {
        violations.push({ path, message: `state "${rec.state}" is not an open nomination state for this applicant` });
      }
    }
  });

  // Score / gap numbers everywhere the model writes prose about pathways.
  const prose: Array<[string, string]> = [
    ["executiveSummary", result.executiveSummary],
    ...result.topRecommendedPathways.map((r, i): [string, string] => [`topRecommendedPathways[${i}].reason`, r.reason]),
    ...result.topRecommendedPathways.flatMap((r, i) => r.nextSteps.map((s, j): [string, string] => [`topRecommendedPathways[${i}].nextSteps[${j}]`, s])),
  ];
  for (const [path, text] of prose) {
    for (const message of findScoreViolations(text, report)) violations.push({ path, message: `${message}: "${text.slice(0, 120)}"` });
  }
  return violations;
}

const T = (locale: Locale, en: string, tr: string, zh: string) => (locale === "tr" ? tr : locale === "zh-Hans" ? zh : en);

/** The recommendations straight from the ranking + open-state data, with the engine's own score sentence. */
export function deterministicRecommendations(report: ReadinessReport, locale: Locale): Recommendation[] {
  const ranking = report.pathwayRanking;
  if (!ranking) return [];
  const openStates = [...(report.stateNominationTracker?.states ?? [])].filter((s) => s.isOpen === true).sort((a, b) => b.score - a.score);
  const steps = [
    T(
      locale,
      "Check the current nomination criteria and program status on the official source before acting.",
      "Harekete geçmeden önce güncel aday gösterme kriterlerini ve program durumunu resmi kaynaktan kontrol edin.",
      "行动前，请在官方来源核对最新的提名标准和项目状态。"
    ),
    T(
      locale,
      "Prepare the evidence listed in the Lodgement-Ready Checklist.",
      "Başvuruya Hazır Kontrol Listesi'nde yer alan belgeleri hazırlayın.",
      "准备“递交就绪清单”中列出的材料。"
    ),
  ];
  const out: Recommendation[] = [];
  for (const sub of ranking.recommendable) {
    const score = ranking.entries.find((e) => e.subclass === sub)!.score;
    if (sub === "189") {
      out.push({ state: T(locale, "Federal (no nomination)", "Federal (adaylık yok)", "联邦（无需提名）"), subclass: sub, reason: describePathwayScore(score, locale), nextSteps: [steps[1]] });
      continue;
    }
    const state = openStates[0];
    if (!state) continue; // a nominated pathway cannot be recommended without an open state
    out.push({ state: state.name, subclass: sub, reason: describePathwayScore(score, locale), nextSteps: steps });
  }
  return out;
}
