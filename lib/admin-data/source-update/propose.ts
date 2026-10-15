import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

import { CURRENT_STATE_STATUSES } from "../statuses";
import type { ConditionKind, ResidenceRule, StateProgramData } from "../types";
import { extractValues } from "../value-normalise";

/**
 * "Update from official source": the model reads the pasted / uploaded text next to the state's current row and proposes changes. The model is
 * only a proposer: the server keeps a proposal only when its quote is found, verbatim, in the source text AND every figure, date or program year
 * in the proposed value is in that quote (or, for a free-text note, in the source). A value the text does not state never reaches the review.
 */

export type ProposalField = "status" | "programYear" | "openingDate" | "closingDate" | "allocation" | "feeExclGst" | "feeInclGst" | "effectiveFrom" | "exceptions" | "note" | "summary" | "condition_add" | "condition_edit";

export type ExceptionValue = { text: string; subclass: "190" | "491" | null; appliesTo: "onshore" | "offshore" | "all" | null; deadline: string | null };
export type ConditionValue = { text: string; kind: ConditionKind; residenceRule: ResidenceRule | null; subclasses: Array<"190" | "491"> };

export type Proposal = {
  id: string;
  field: ProposalField;
  /** What the review row says ("Allocation, subclass 190"). */
  label: string;
  subclass?: "190" | "491";
  conditionId?: string;
  /** The current value and the proposed one as text, for the diff. */
  current: string | null;
  proposed: string;
  /** The typed value: string | number | ExceptionValue | ConditionValue. */
  value: string | number | ExceptionValue | ConditionValue;
  /** The sentence in the source that states it, verbatim. */
  quote: string;
};

export type Rejection = { field: string; reason: string; quote?: string; value?: string };

const FIELDS = ["status", "programYear", "openingDate", "closingDate", "allocation", "feeExclGst", "feeInclGst", "effectiveFrom", "exceptions", "note", "summary", "condition_add", "condition_edit"] as const;

export const rawProposalSchema = z.object({
  field: z.enum(FIELDS),
  subclass: z.enum(["190", "491"]).nullable(),
  conditionId: z.string().nullable(),
  /** Scalar fields: the value (status text, YYYY-MM-DD, number, program year, English note / summary / condition text). */
  value: z.string().nullable(),
  exceptionSubclass: z.enum(["190", "491"]).nullable(),
  exceptionAppliesTo: z.enum(["onshore", "offshore", "all"]).nullable(),
  exceptionDeadline: z.string().nullable(),
  conditionKind: z.enum(["residence", "employment", "study", "english", "points", "fee", "process", "other"]).nullable(),
  conditionResidenceRule: z.enum(["required", "not_required", "not_stated"]).nullable(),
  conditionSubclasses: z.array(z.enum(["190", "491"])).nullable(),
  quote: z.string(),
});
export type RawProposal = z.infer<typeof rawProposalSchema>;
export const rawProposalListSchema = z.object({ proposals: z.array(rawProposalSchema) });

export type Proposer = (input: { system: string; prompt: string }) => Promise<RawProposal[]>;

export const extractionModelId = (env: Record<string, string | undefined> = process.env) => env.ADMIN_EXTRACTION_MODEL?.trim() || "gpt-4.1";

export const openAiProposer: Proposer = async ({ system, prompt }) => {
  const { object } = await generateObject({ model: openai.chat(extractionModelId()), schema: rawProposalListSchema, system, prompt, temperature: 0 });
  return object.proposals;
};

export const EXTRACTION_SYSTEM = `You maintain the data of one Australian state / territory skilled-migration nomination program. You are given the state's current record and text taken from the state's official page(s) or a document. Propose changes to the record that the text states.
Rules:
- Propose a field only when the text states a value for it that differs from the current record. Do not propose unchanged values.
- Never infer, compute, guess or carry over a value the text does not state. If the text does not state a field, leave it out.
- Every proposal must carry "quote": one sentence or fragment copied character for character from the text (no paraphrase, no ellipsis, at most 300 characters) that states the proposed value.
- Dates as YYYY-MM-DD; numbers without currency or thousands separators; program year like 2026-27; status exactly one of: ${CURRENT_STATE_STATUSES.join(" | ")}.
- Fields: status, programYear, openingDate, closingDate, allocation (per subclass 190 / 491), feeExclGst and feeInclGst (per subclass; AUD; only the figure the text states for that GST basis), effectiveFrom (per subclass fee date), exceptions (text in English, subclass, appliesTo onshore/offshore/all, deadline), note (a short English summary of the status, using only facts and figures in the text), summary (an English paragraph for the chat, same rule), condition_add (a new published condition: text, conditionKind, conditionResidenceRule only when the sentence states whether living in the state is required, conditionSubclasses) and condition_edit (conditionId of an existing condition whose wording the text changes).
- Use null for fields that do not apply. Output an empty list when the text changes nothing.`;

// ---------------------------------------------------------------------------------------------------------------------------------------------

/** Lower-case, one space between words, typographic quotes / dashes / non-breaking spaces made plain: a quote is matched on its words, not its layout. */
export function normaliseForQuote(s: string): string {
  return s
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/[  -​ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function quoteInSource(quote: string, sourceText: string): boolean {
  const q = normaliseForQuote(quote);
  return q.replace(/[^\p{L}\p{N}]/gu, "").length >= 8 && normaliseForQuote(sourceText).includes(q);
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const realDate = (v: string) => ISO.test(v) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;

/** Every figure, amount, date and program year of a text, as normalised strings ("n:190", "d:2026-08-17", "fy:2026-27"). */
function valueKeys(text: string): Set<string> {
  const keys = new Set<string>();
  for (const v of extractValues(text)) {
    if (v.kind === "date") keys.add(`d:${v.value}`);
    else if (v.kind === "fy") keys.add(`fy:${v.value}`);
    else if (v.kind === "month") keys.add(`m:${v.value}`);
    else if (v.kind === "monthday") keys.add(`md:${v.value}`);
    else keys.add(`n:${v.value}`); // amounts and plain numbers: the figure
  }
  return keys;
}

/** The values of `proposed` that are not in `evidence`. */
function unsupportedValues(proposed: string, evidence: string): string[] {
  const have = valueKeys(evidence);
  const out: string[] = [];
  for (const v of extractValues(proposed)) {
    const key = v.kind === "date" ? `d:${v.value}` : v.kind === "fy" ? `fy:${v.value}` : v.kind === "month" ? `m:${v.value}` : v.kind === "monthday" ? `md:${v.value}` : `n:${v.value}`;
    if (!have.has(key)) out.push(v.raw);
  }
  return out;
}

const STATUS_WORDS: Array<[RegExp, RegExp]> = [
  [/^Open \(/, /\bopen(?:ed|s|ing)?\b|accepting|resum/i],
  [/^(Suspended \/ Closed|Closed with exceptions)$/, /clos|suspend|paus|not accepting|no longer accept|full(?:y)? (?:allocated|subscribed)|sufficient applications|filled/i],
  [/^Not yet published$/, /not (?:yet )?(?:been )?(?:published|announced|released|available|confirmed)|to be (?:advised|announced|confirmed)|will be (?:published|announced|released)|yet to/i],
  [/^Check official page$/, /./],
];

const gstBasisOk = (p: StateProgramData, sub: "190" | "491") => p.subclasses.some((s) => s.subclass === sub);

function currentText(p: StateProgramData, field: ProposalField, sub?: "190" | "491", conditionId?: string): string | null {
  const s = sub ? p.subclasses.find((x) => x.subclass === sub) : undefined;
  switch (field) {
    case "status":
      return p.status;
    case "programYear":
      return p.programYear;
    case "openingDate":
      return p.openingDate;
    case "closingDate":
      return p.closingDate;
    case "allocation":
      return s?.allocation === null || s?.allocation === undefined ? null : String(s.allocation);
    case "feeExclGst":
      return s?.feeExclGst === null || s?.feeExclGst === undefined ? null : String(s.feeExclGst);
    case "feeInclGst":
      return s?.feeInclGst === null || s?.feeInclGst === undefined ? null : String(s.feeInclGst);
    case "effectiveFrom":
      return s?.effectiveFrom ?? null;
    case "exceptions":
      return p.exceptions ? `${p.exceptions.text.en}${p.exceptions.deadline ? ` (deadline ${p.exceptions.deadline})` : ""}` : null;
    case "note":
      return p.notes.en;
    case "summary":
      return p.aiSummary.en;
    case "condition_edit":
      return p.conditions.find((c) => c.id === conditionId)?.text.en ?? null;
    default:
      return null;
  }
}

export { currentText as proposalCurrentText };

const LABELS: Record<ProposalField, string> = {
  status: "Status",
  programYear: "Program year",
  openingDate: "Opening date",
  closingDate: "Closing date",
  allocation: "Allocation",
  feeExclGst: "Fee excl. GST",
  feeInclGst: "Fee incl. GST",
  effectiveFrom: "Fee effective from",
  exceptions: "Exceptions",
  note: "Note",
  summary: "Chat summary",
  condition_add: "New condition",
  condition_edit: "Condition wording",
};

/**
 * Keeps the raw proposals that pass every server check. Nothing here trusts the model: the quote must be in the text, the proposed value must be
 * stated by the quote (figures, dates, program year, status wording), the target must exist, and the value must differ from the current one.
 */
export function verifyProposals(raw: RawProposal[], program: StateProgramData, sourceText: string): { accepted: Proposal[]; rejected: Rejection[] } {
  const accepted: Proposal[] = [];
  const rejected: Rejection[] = [];
  const seen = new Set<string>();

  raw.forEach((r, index) => {
    const reject = (reason: string) => rejected.push({ field: r.field + (r.subclass ? ` ${r.subclass}` : "") + (r.conditionId ? ` ${r.conditionId}` : ""), reason, quote: r.quote, value: r.value ?? undefined });
    if (!quoteInSource(r.quote, sourceText)) return reject("the quote is not in the source text");
    const quote = r.quote.trim();
    const sub = r.subclass ?? undefined;
    const perSubclass = r.field === "allocation" || r.field === "feeExclGst" || r.field === "feeInclGst" || r.field === "effectiveFrom";
    if (perSubclass && (!sub || !gstBasisOk(program, sub))) return reject("a subclass (190 or 491) is needed");
    if (r.field === "condition_edit" && !program.conditions.some((c) => c.id === r.conditionId)) return reject("there is no such condition to edit");

    let value: Proposal["value"];
    let proposed: string;
    const v = (r.value ?? "").trim();

    switch (r.field) {
      case "status": {
        if (!(CURRENT_STATE_STATUSES as readonly string[]).includes(v)) return reject("not one of the statuses");
        if (!STATUS_WORDS.some(([name, words]) => name.test(v) && words.test(quote))) return reject("the quote does not say that the program is " + v.toLowerCase());
        value = proposed = v;
        break;
      }
      case "programYear": {
        if (!/^\d{4}-\d{2}$/.test(v)) return reject("not a program year like 2026-27");
        if (!valueKeys(quote).has(`fy:${v}`)) return reject(`the year ${v} is not in the quote`);
        value = proposed = v;
        break;
      }
      case "openingDate":
      case "closingDate":
      case "effectiveFrom": {
        if (!realDate(v)) return reject("not a real date (YYYY-MM-DD)");
        if (!valueKeys(quote).has(`d:${v}`)) return reject(`the date ${v} is not stated in the quote`);
        value = proposed = v;
        break;
      }
      case "allocation":
      case "feeExclGst":
      case "feeInclGst": {
        const n = Number(v.replace(/[, ]/g, ""));
        if (!Number.isFinite(n) || n < 0) return reject("not a number");
        if (r.field === "allocation" && !Number.isInteger(n)) return reject("an allocation is a whole number");
        if (!valueKeys(quote).has(`n:${String(Math.round(n * 1e6) / 1e6)}`)) return reject(`the figure ${v} is not stated in the quote`);
        value = n;
        proposed = String(n);
        break;
      }
      case "exceptions": {
        if (!v) return reject("the exception text is empty");
        const missing = unsupportedValues(v, quote);
        if (missing.length) return reject(`the figures / dates ${missing.join(", ")} are not in the quote`);
        if (r.exceptionDeadline && (!realDate(r.exceptionDeadline) || !valueKeys(quote).has(`d:${r.exceptionDeadline}`))) return reject(`the deadline ${r.exceptionDeadline} is not stated in the quote`);
        if (r.exceptionSubclass && !new RegExp(`\\b${r.exceptionSubclass}\\b`).test(quote)) return reject(`subclass ${r.exceptionSubclass} is not in the quote`);
        if (r.exceptionAppliesTo && r.exceptionAppliesTo !== "all" && !new RegExp(r.exceptionAppliesTo, "i").test(quote)) return reject(`"${r.exceptionAppliesTo}" is not in the quote`);
        value = { text: v, subclass: r.exceptionSubclass, appliesTo: r.exceptionAppliesTo, deadline: r.exceptionDeadline };
        proposed = `${v}${r.exceptionDeadline ? ` (deadline ${r.exceptionDeadline})` : ""}`;
        break;
      }
      case "note":
      case "summary": {
        if (!v) return reject("the text is empty");
        const missing = unsupportedValues(v, sourceText);
        if (missing.length) return reject(`the figures / dates ${missing.join(", ")} are not in the source text`);
        value = proposed = v;
        break;
      }
      case "condition_add":
      case "condition_edit": {
        if (!v) return reject("the text is empty");
        const missing = unsupportedValues(v, quote);
        if (missing.length) return reject(`the figures / dates ${missing.join(", ")} are not in the quote`);
        const kind = r.conditionKind ?? "other";
        const rule = r.conditionResidenceRule ?? null;
        if (rule && rule !== "not_stated" && kind !== "residence") return reject("a residence rule belongs to a condition of category residence");
        if (rule && rule !== "not_stated" && !/resid|\bliv(?:e|ing)\b|\bbased in\b/i.test(quote)) return reject("the quote does not state a residence requirement");
        value = { text: v, kind, residenceRule: kind === "residence" ? rule : null, subclasses: r.conditionSubclasses ?? [] };
        proposed = v;
        break;
      }
      default:
        return reject("unknown field");
    }

    const key = `${r.field}|${sub ?? ""}|${r.conditionId ?? ""}|${r.field === "condition_add" ? index : ""}`;
    if (seen.has(key)) return reject("the same field is proposed twice; the first one is kept");
    const current = currentText(program, r.field, sub, r.conditionId ?? undefined);
    if (r.field !== "condition_add" && r.field !== "exceptions" && current !== null && normaliseForQuote(current) === normaliseForQuote(proposed)) return; // no change: not a proposal
    if (r.field === "condition_edit" && typeof value === "object" && current !== null) {
      const c = program.conditions.find((x) => x.id === r.conditionId)!;
      const vv = value as ConditionValue;
      if (normaliseForQuote(c.text.en) === normaliseForQuote(vv.text) && c.kind === vv.kind && (c.residenceRule ?? null) === (vv.residenceRule ?? null)) return;
    }
    seen.add(key);
    accepted.push({
      id: `p${accepted.length + 1}`,
      field: r.field,
      label: `${LABELS[r.field]}${sub ? `, subclass ${sub}` : ""}${r.conditionId ? ` (${r.conditionId})` : ""}`,
      ...(sub ? { subclass: sub } : {}),
      ...(r.conditionId ? { conditionId: r.conditionId } : {}),
      current,
      proposed,
      value,
      quote,
    });
  });
  return { accepted, rejected };
}

/** What the model is given: the current record in brief, then the text. */
export function buildExtractionPrompt(program: StateProgramData, sourceText: string, meta: { sourceUrl: string | null; checkedOn: string }): string {
  const brief = {
    state: `${program.stateName} (${program.stateCode})`,
    programYear: program.programYear,
    status: program.status,
    openingDate: program.openingDate,
    closingDate: program.closingDate,
    exceptions: program.exceptions ? { text: program.exceptions.text.en, subclass: program.exceptions.subclass, appliesTo: program.exceptions.appliesTo, deadline: program.exceptions.deadline } : null,
    subclasses: program.subclasses.map((s) => ({ subclass: s.subclass, allocation: s.allocation, feeExclGst: s.feeExclGst, feeInclGst: s.feeInclGst, effectiveFrom: s.effectiveFrom })),
    note: program.notes.en,
    conditions: program.conditions.map((c) => ({ id: c.id, kind: c.kind, residenceRule: c.residenceRule ?? null, subclasses: c.subclasses, text: c.text.en })),
  };
  return `CURRENT RECORD (JSON):\n${JSON.stringify(brief)}\n\nSOURCE: ${meta.sourceUrl ?? "(pasted / uploaded text)"}, checked ${meta.checkedOn}\n\nTEXT:\n"""\n${sourceText}\n"""`;
}

export async function proposeFromSource(program: StateProgramData, sourceText: string, meta: { sourceUrl: string | null; checkedOn: string }, proposer: Proposer = openAiProposer): Promise<{ accepted: Proposal[]; rejected: Rejection[] }> {
  const raw = await proposer({ system: EXTRACTION_SYSTEM, prompt: buildExtractionPrompt(program, sourceText, meta) });
  return verifyProposals(raw, program, sourceText);
}
