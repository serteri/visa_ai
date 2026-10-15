import { buildSeedPrograms } from "../seed";
import { availabilityFor, isClosedStatus } from "../statuses";
import type { ConditionKind, StateCondition, StateProgramData, SubclassData } from "../types";
import type { ConditionValue, ExceptionValue, Proposal } from "./propose";

/**
 * Applies the approved proposals to a copy of the current row (nothing is saved here). An English text that changes loses its translations: they
 * describe the old wording, so customers see English until the admin has re-translated and reviewed (D5). The scoring inputs follow a new status.
 */

export type ApplyResult = { program: StateProgramData; issues: string[]; droppedTranslations: string[] };

/** The audit field a proposal changes (the audit log is per top-level field). */
export function auditFieldOf(p: Proposal): string {
  switch (p.field) {
    case "allocation":
    case "feeExclGst":
    case "feeInclGst":
    case "effectiveFrom":
      return `subclasses.${p.subclass}`;
    case "note":
      return "notes";
    case "summary":
      return "aiSummary";
    case "condition_add":
    case "condition_edit":
      return "conditions";
    default:
      return p.field;
  }
}

const withEnglish = (en: string) => ({ en });

export function applyProposals(current: StateProgramData, selected: Proposal[]): ApplyResult {
  const program = structuredClone(current);
  const issues: string[] = [];
  const dropped: string[] = [];
  const sub = (n: "190" | "491" | undefined): SubclassData | undefined => program.subclasses.find((s) => s.subclass === n);
  const feeTouched = new Map<string, { excl?: number; incl?: number }>();

  for (const p of selected) {
    switch (p.field) {
      case "status": {
        const status = p.value as string;
        program.status = status;
        const a = availabilityFor(status);
        if (a) {
          program.scoring.onshoreAvailability = a.onshore;
          program.scoring.offshoreAvailability = a.offshore;
          if (isClosedStatus(status) && status !== "Not yet published") program.scoring.offshoreQuotaPressure = program.scoring.ruleQuotaPressure = "closed";
          else if (program.scoring.offshoreQuotaPressure === "closed") program.scoring.offshoreQuotaPressure = program.scoring.ruleQuotaPressure = buildSeedPrograms()[program.stateCode]?.scoring.ruleQuotaPressure ?? "medium";
        }
        break;
      }
      case "programYear":
        program.programYear = p.value as string;
        break;
      case "openingDate":
        program.openingDate = p.value as string;
        break;
      case "closingDate":
        program.closingDate = p.value as string;
        break;
      case "allocation": {
        const s = sub(p.subclass);
        if (s) s.allocation = p.value as number;
        break;
      }
      case "effectiveFrom": {
        const s = sub(p.subclass);
        if (s) s.effectiveFrom = p.value as string;
        break;
      }
      case "feeExclGst":
      case "feeInclGst": {
        const t = feeTouched.get(p.subclass!) ?? {};
        if (p.field === "feeExclGst") t.excl = p.value as number;
        else t.incl = p.value as number;
        feeTouched.set(p.subclass!, t);
        break;
      }
      case "exceptions": {
        const v = p.value as ExceptionValue;
        if (program.exceptions?.text.en !== v.text) dropped.push("exceptions");
        program.exceptions = { text: withEnglish(v.text), subclass: v.subclass, appliesTo: v.appliesTo, deadline: v.deadline };
        break;
      }
      case "note":
        if (program.notes.en !== p.value) dropped.push("note");
        program.notes = withEnglish(p.value as string);
        break;
      case "summary":
        if (program.aiSummary.en !== p.value) dropped.push("chat summary");
        program.aiSummary = withEnglish(p.value as string);
        break;
      case "condition_add": {
        const v = p.value as ConditionValue;
        const next = program.conditions.reduce((m, c) => Math.max(m, Number(c.id.replace(/\D/g, "")) || 0), 0) + 1;
        const c: StateCondition = {
          id: `c${String(next).padStart(2, "0")}`,
          kind: v.kind as ConditionKind,
          subclasses: v.subclasses,
          stream: null,
          text: withEnglish(v.text),
          ...(v.kind === "residence" && v.residenceRule ? { residenceRule: v.residenceRule } : {}),
          quote: p.quote,
          source: null,
        };
        program.conditions.push(c);
        break;
      }
      case "condition_edit": {
        const c = program.conditions.find((x) => x.id === p.conditionId);
        const v = p.value as ConditionValue;
        if (!c) {
          issues.push(`condition ${p.conditionId} no longer exists`);
          break;
        }
        if (c.text.en !== v.text) dropped.push(`condition ${c.id}`);
        c.text = withEnglish(v.text);
        c.kind = v.kind as ConditionKind;
        if (v.kind === "residence" && v.residenceRule) c.residenceRule = v.residenceRule;
        else delete c.residenceRule;
        if (v.subclasses.length > 0) c.subclasses = v.subclasses;
        c.quote = p.quote;
        break;
      }
    }
  }

  for (const [n, t] of feeTouched) {
    const s = sub(n as "190" | "491");
    if (!s) continue;
    if (t.excl !== undefined && t.incl !== undefined) {
      s.feeExclGst = t.excl;
      s.feeInclGst = t.incl;
      s.gstBasis = t.excl === t.incl ? "no_gst" : "stated_by_state";
    } else if (s.gstBasis === "computed_10pct") {
      if (t.excl !== undefined) {
        s.feeExclGst = t.excl;
        s.feeInclGst = null;
      } else {
        s.feeInclGst = t.incl!;
        s.feeExclGst = null;
      }
    } else if (s.gstBasis === "no_gst") {
      s.feeExclGst = s.feeInclGst = (t.excl ?? t.incl)!;
    } else issues.push(`Subclass ${n}: approve the fee excl. GST and incl. GST together (the other figure would be out of date).`);
  }

  return { program, issues, droppedTranslations: [...new Set(dropped)] };
}
