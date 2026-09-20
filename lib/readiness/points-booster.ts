import type { PointsAction, PointsActionId, PointsActionPlan, PointsEstimate } from "./types";

/**
 * The Points Booster Roadmap contract (AU): the ENGINE decides which actions
 * exist, their order, their points and their difficulty (points-actions.ts);
 * the LLM may only rewrite the two wording fields of an action. This module
 * is pure (no server imports) so the same validation runs when the strategy
 * is generated AND again when the PDF is rendered from stored data.
 */

/** What the LLM returns per booster row (the schema in lib/ai/strategy-schema.ts). */
export type LlmBoosterItem = {
  actionId?: string | null;
  action?: string | null;
  pointsGained?: number | null;
  difficulty?: string | null;
  reason?: string | null;
  difficultyExplanation?: string | null;
};

/** A validated roadmap row: everything except the two wording fields comes from the engine. */
export type BoosterRow = {
  actionId: PointsActionId;
  action: string;
  pointsGained: number;
  difficulty: PointsAction["difficulty"];
  reason: string;
  difficultyExplanation: string;
};

// ── Factor vocabulary (en / tr / zh-Hans) ──────────────────────────────────
// A factor may only be mentioned in the LLM's wording when the engine lists an
// action for it. Patterns are deliberately about the FACTOR, not about verbs,
// so "your English is already strong" is caught too when English is at the max.

const FACTOR_PATTERNS: Array<{ factor: string; ids: PointsActionId[]; pattern: RegExp }> = [
  {
    factor: "English",
    ids: ["english_upgrade"],
    pattern: /\benglish\b|\bIELTS\b|\bPTE\b|\bTOEFL\b|\bOET\b|İngilizce|ingilizce|dil (?:testi|puan|seviye)|英语|英文|雅思|语言(?:考试|成绩|分数|水平)/i,
  },
  {
    factor: "education",
    ids: ["education"],
    pattern: /\bmaster'?s?\b|\bphd\b|\bdoctorate\b|\bdoctoral\b|\bbachelor'?s?\b|\bdegree\b|yüksek lisans|doktora|lisans derece|硕士|博士|学位|学历/i,
  },
  {
    factor: "partner",
    ids: ["partner_skills"],
    pattern: /\bpartner\b|\bspouse\b|\bde facto\b|\bwife\b|\bhusband\b|(?<![a-zçğıöşü])eş(?![a-zçğıöşü])|eşiniz|配偶|伴侣|妻子|丈夫/i,
  },
  {
    factor: "skilled employment",
    ids: ["overseas_employment", "australian_employment"],
    pattern: /\b(?:work|skilled) experience\b|\bemployment\b|iş deneyimi|istihdam|工作经验|工作经历/i,
  },
  {
    factor: "Australian study",
    ids: ["australian_study"],
    pattern: /\baustralian (?:study|qualification|degree)\b|\bstudy in australia\b|澳大利亚学习/i,
  },
  {
    factor: "specialist education",
    ids: ["specialist_education"],
    pattern: /\bspecialist education\b|\bSTEM\b/i,
  },
  {
    factor: "community language",
    ids: ["community_language"],
    pattern: /\bNAATI\b|\bcommunity language|\bCCL\b|toplum dili|社区语言/i,
  },
  {
    factor: "Professional Year",
    ids: ["professional_year"],
    pattern: /\bprofessional year\b|mesleki yıl|职业年/i,
  },
  {
    factor: "regional study",
    ids: ["regional_study"],
    pattern: /\bregional (?:study|campus)\b|bölgesel (?:eğitim|kampüs)|偏远地区(?:学习|校区)/i,
  },
  {
    factor: "state nomination",
    ids: ["state_nomination_190", "regional_nomination_491"],
    pattern: /\bstate (?:or territory )?nomination\b|\bstate sponsorship\b|eyalet adaylığı|州提名|州担保/i,
  },
  {
    factor: "regional nomination",
    ids: ["regional_nomination_491"],
    pattern: /\bregional (?:nomination|sponsorship)\b|bölgesel adaylık|偏远地区提名|偏远地区担保/i,
  },
];

type PointsToken = { value: number; signed: boolean; index: number };

/** "+20" (signed) and "20 points" / "20 pts" / "20 puan" / "20分" (unsigned) -- a points value, as opposed to years, dates or subclass numbers. */
function extractPointsTokens(text: string): PointsToken[] {
  const out: PointsToken[] = [];
  for (const m of text.matchAll(/\+\s?(\d+)/g)) out.push({ value: Number(m[1]), signed: true, index: m.index ?? 0 });
  for (const m of text.matchAll(/(?<!\+\s?)(\d+)\s?(?:points?\b|pts?\b|puan(?:ı|lık|a)?\b|分)/gi)) {
    out.push({ value: Number(m[1]), signed: false, index: m.index ?? 0 });
  }
  return out;
}

function allowedFactorIds(plan: PointsActionPlan): Set<PointsActionId> {
  return new Set(plan.actions.map((a) => a.id));
}

export type ClaimScope = {
  /** Roadmap row mode: the ONLY points value this text may state is this row's own gain. */
  onlyGain?: number;
  /** Also flag mentions of a scoring factor that has no available action. */
  checkFactors: boolean;
  /** The report's estimate: lets narrative quote the current total, the threshold and the gap. */
  estimate?: PointsEstimate;
};

/**
 * Violations in one free-text string:
 *  - a "+N" gain must be an engine action gain (never a per-factor maximum or total);
 *  - an unsigned "N points" must be an engine gain, the current total, the threshold or the gap;
 *  - a points value written next to a scoring factor must be THAT factor's engine gain
 *    ("English +15" is wrong when English is worth +20, even though 15 is a real gain elsewhere);
 *  - a "+N" written next to a factor with no action is wrong outright;
 *  - (checkFactors) a factor with no available action may not be mentioned at all.
 */
export function findPointsClaimViolations(text: string, plan: PointsActionPlan, scope: ClaimScope): string[] {
  const out: string[] = [];
  const gains = new Set(plan.actions.map((a) => a.gain));
  const plain = new Set<number>(gains);
  const total = scope.estimate?.estimatedPoints;
  if (total !== undefined) {
    plain.add(total);
    plain.add(65);
    if (total < 65) plain.add(65 - total);
  } else {
    plain.add(65);
  }
  const allowedIds = allowedFactorIds(plan);

  for (const tok of extractPointsTokens(text)) {
    const allowed = scope.onlyGain !== undefined ? new Set([scope.onlyGain]) : tok.signed ? gains : plain;
    if (!allowed.has(tok.value)) out.push(`points value ${tok.signed ? "+" : ""}${tok.value} is not an engine value`);

    const window = text.slice(Math.max(0, tok.index - 70), tok.index + 70);
    for (const { factor, ids, pattern } of FACTOR_PATTERNS) {
      if (!pattern.test(window)) continue;
      const factorGains = plan.actions.filter((a) => ids.includes(a.id)).map((a) => a.gain);
      if (factorGains.length > 0 && scope.onlyGain === undefined && !factorGains.includes(tok.value)) {
        out.push(`${tok.value} points written next to ${factor}, whose engine value is ${factorGains.join("/")}`);
      } else if (factorGains.length === 0 && tok.signed) {
        out.push(`+${tok.value} points written next to ${factor}, which has no available points action`);
      }
    }
  }

  if (scope.checkFactors) {
    for (const { factor, ids, pattern } of FACTOR_PATTERNS) {
      if (pattern.test(text) && !ids.some((id) => allowedIds.has(id))) {
        out.push(`mentions ${factor}, which has no available points action for this applicant`);
      }
    }
  }
  return out;
}

export type BoosterAssembly = {
  rows: BoosterRow[];
  /** Human-readable reasons the LLM output was not usable as-is (empty = accepted). */
  violations: string[];
};

/**
 * Builds the roadmap rows from the engine plan, taking ONLY the two wording
 * fields from the LLM items that pass validation. `useLlm: false` returns the
 * fully deterministic rows (the fallback after two failed attempts).
 */
export function assembleBoosterRows(
  plan: PointsActionPlan,
  llmItems: readonly LlmBoosterItem[] | undefined,
  opts: { useLlm: boolean } = { useLlm: true }
): BoosterAssembly {
  const violations: string[] = [];
  const byId = new Map<PointsActionId, LlmBoosterItem>();

  if (opts.useLlm) {
    const known = new Map(plan.actions.map((a) => [a.id, a] as const));
    (llmItems ?? []).forEach((item, i) => {
      const id = item.actionId as PointsActionId | null | undefined;
      const action = id ? known.get(id) : undefined;
      if (!action) {
        violations.push(`pointsBoosterStrategy[${i}]: "${item.action ?? ""}" does not map to an engine action id (${item.actionId ?? "none"})`);
        return;
      }
      if (item.pointsGained !== action.gain) {
        violations.push(`pointsBoosterStrategy[${i}]: ${action.id} claims +${item.pointsGained} but the engine value is +${action.gain}`);
        return;
      }
      const textViolations = [item.reason, item.difficultyExplanation]
        .filter((t): t is string => typeof t === "string" && t.trim() !== "")
        .flatMap((t) => findPointsClaimViolations(t, plan, { onlyGain: action.gain, checkFactors: true }));
      if (textViolations.length > 0) {
        violations.push(`pointsBoosterStrategy[${i}] (${action.id}): ${textViolations.join("; ")}`);
        return;
      }
      if (!byId.has(action.id)) byId.set(action.id, item);
    });
  }

  const rows: BoosterRow[] = plan.actions.map((action) => {
    const llm = opts.useLlm && violations.length === 0 ? byId.get(action.id) : undefined;
    return {
      actionId: action.id,
      action: action.label,
      pointsGained: action.gain,
      difficulty: action.difficulty,
      reason: llm?.reason?.trim() || action.reason,
      difficultyExplanation: llm?.difficultyExplanation?.trim() || action.difficultyNote,
    };
  });
  return { rows, violations };
}
