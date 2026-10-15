import type { Actor } from "../audit";
import { saveStateProgram } from "../service";
import type { StateProgramStore } from "../store";
import type { OccupationRow } from "../types";
import { applyProposals, auditFieldOf } from "./apply";
import type { KnowledgeDoc, KnowledgeIndex } from "./knowledge";
import { applyOccupationChanges, bundledOccupationList, diffOccupationLists, OCCUPATION_LIST_STATES, parseOccupationSheets, type OccupationDiff } from "./occupations";
import { proposalCurrentText, proposeFromSource, quoteInSource, type Proposal, type Proposer, type Rejection } from "./propose";
import type { SheetRows } from "./extract";

/**
 * The "Update from official source" workflow: create (extract + propose + preview, saved as an update record in the audit log), approve (only the
 * selected changes are saved, with the source in the audit log; the source is indexed for the chat and the state's old source chunks removed),
 * discard. The proposals the server approves are the ones it stored itself: the browser only sends which of them to apply.
 */

export type OccupationProposal = { rows: OccupationRow[]; subclassSource: string; sheets: string[]; warnings: string[]; diff: OccupationDiff; current: OccupationRow[] };

export type SourceUpdateRecord = {
  stateCode: string;
  sourceUrl: string | null;
  checkedOn: string;
  fileName: string | null;
  kind: "text" | "pdf" | "docx" | "xlsx" | "csv";
  /** The extracted text, kept with the record. */
  text: string;
  truncated: boolean;
  proposals: Proposal[];
  rejected: Rejection[];
  knowledge: { remove: KnowledgeDoc[]; error?: string };
  occupation: OccupationProposal | null;
};

export type SourceInput = {
  stateCode: string;
  sourceUrl: string | null;
  checkedOn: string;
  fileName: string | null;
  kind: SourceUpdateRecord["kind"];
  text: string;
  truncated: boolean;
  sheets?: SheetRows[];
  /** For an occupation list that does not say which subclass its rows are for. */
  occupationSubclasses?: Array<"190" | "491">;
};

export type Deps = { store: StateProgramStore; knowledge: KnowledgeIndex; proposer?: Proposer };

const isoDay = /^\d{4}-\d{2}-\d{2}$/;

export function validateSourceInput(i: SourceInput, now: Date): string | null {
  if (!isoDay.test(i.checkedOn) || new Date(`${i.checkedOn}T00:00:00Z`).toISOString().slice(0, 10) !== i.checkedOn) return "The date you checked the source must be a real date (YYYY-MM-DD).";
  if (i.checkedOn > new Date(now.getTime() + 86_400_000).toISOString().slice(0, 10)) return "The date you checked the source cannot be in the future.";
  if (i.sourceUrl && !/^https:\/\/\S+$/.test(i.sourceUrl)) return "The source URL must start with https://";
  if (i.text.trim().length < 40) return "Paste more text (or upload a file): there is too little to compare.";
  return null;
}

export type CreateResult =
  | { ok: true; id: string; record: Omit<SourceUpdateRecord, "text"> & { textChars: number } }
  | { ok: false; error: string };

export async function createSourceUpdate(deps: Deps, actor: Actor, input: SourceInput, at: Date = new Date()): Promise<CreateResult> {
  const bad = validateSourceInput(input, at);
  if (bad) return { ok: false, error: bad };
  const program = await deps.store.get(input.stateCode);
  if (!program) return { ok: false, error: `There is no row for ${input.stateCode}; seed the states first.` };

  let occupation: OccupationProposal | null = null;
  if ((input.sheets?.length ?? 0) > 0 && (OCCUPATION_LIST_STATES as readonly string[]).includes(input.stateCode)) {
    const parsed = parseOccupationSheets(input.sheets!, input.occupationSubclasses);
    if (parsed) {
      const current = (await deps.store.getOccupationList(input.stateCode))?.rows ?? bundledOccupationList(input.stateCode) ?? [];
      occupation = { ...parsed, diff: diffOccupationLists(current, parsed.rows), current };
    }
  }

  // An occupation list is thousands of rows of codes: it is compared by the occupation parser, not read by the model.
  let accepted: Proposal[] = [];
  let rejected: Rejection[] = [];
  if (!occupation) {
    try {
      ({ accepted, rejected } = await proposeFromSource(program, input.text, { sourceUrl: input.sourceUrl, checkedOn: input.checkedOn }, deps.proposer));
    } catch (e) {
      return { ok: false, error: `The extraction failed: ${e instanceof Error ? e.message.slice(0, 200) : "unknown error"}` };
    }
  }

  let remove: KnowledgeDoc[] = [];
  let knowledgeError: string | undefined;
  try {
    remove = await deps.knowledge.preview(input.stateCode);
  } catch (e) {
    knowledgeError = e instanceof Error ? e.message.slice(0, 160) : "the chat knowledge base could not be read";
  }

  const record: SourceUpdateRecord = {
    stateCode: input.stateCode,
    sourceUrl: input.sourceUrl,
    checkedOn: input.checkedOn,
    fileName: input.fileName,
    kind: input.kind,
    text: input.text,
    truncated: input.truncated,
    proposals: accepted,
    rejected,
    knowledge: { remove, ...(knowledgeError ? { error: knowledgeError } : {}) },
    occupation,
  };
  const id = await deps.store.log({ entityType: "state_source_update", entityKey: input.stateCode, fieldPath: "proposed", oldValue: null, newValue: record, action: "source_update_proposed", note: `${input.sourceUrl ?? input.fileName ?? "pasted text"}, checked ${input.checkedOn}: ${accepted.length} proposed, ${rejected.length} rejected` }, actor, at);
  const { text, ...rest } = record;
  return { ok: true, id, record: { ...rest, textChars: text.length } };
}

async function loadRecord(store: StateProgramStore, id: string): Promise<{ rec: SourceUpdateRecord } | { error: string }> {
  const entry = await store.auditEntry(id);
  if (!entry || entry.entityType !== "state_source_update" || entry.action !== "source_update_proposed") return { error: "That update was not found." };
  const decided = (await store.entries("state_source_update", entry.entityKey, 200)).find((e) => e.action === "source_update" && e.fieldPath === id);
  if (decided) return { error: "That update was already decided. Run a new one." };
  return { rec: entry.newValue as SourceUpdateRecord };
}

export type ApproveInput = { updateId: string; proposalIds: string[]; occupationIds?: string[] };
export type ApproveResult =
  | { ok: true; changed: string[]; occupationChanged: number; droppedTranslations: string[]; knowledge: { ok: true; removedChunks: number; addedChunks: number; docName: string } | { ok: false; error: string } | { ok: false; error: string; skipped: true } }
  | { ok: false; issues: string[] };

export async function approveSourceUpdate(deps: Deps, actor: Actor, input: ApproveInput, at: Date = new Date()): Promise<ApproveResult> {
  const loaded = await loadRecord(deps.store, input.updateId);
  if ("error" in loaded) return { ok: false, issues: [loaded.error] };
  const { rec } = loaded;
  const ids = new Set(input.proposalIds);
  const selected = rec.proposals.filter((p) => ids.has(p.id));
  const unknown = input.proposalIds.filter((id) => !rec.proposals.some((p) => p.id === id));
  if (unknown.length) return { ok: false, issues: [`Unknown change: ${unknown.join(", ")}`] };
  const occIds = new Set(input.occupationIds ?? []);
  if (selected.length === 0 && occIds.size === 0) return { ok: false, issues: ["Nothing is selected. Tick the changes to apply, or press Discard."] };

  const program = await deps.store.get(rec.stateCode);
  if (!program) return { ok: false, issues: [`There is no row for ${rec.stateCode}.`] };

  let changed: string[] = [];
  let dropped: string[] = [];
  if (selected.length > 0) {
    for (const p of selected) {
      if (!quoteInSource(p.quote, rec.text)) return { ok: false, issues: [`${p.label}: the quote is not in the stored source text.`] };
      const now = proposalCurrentText(program, p.field, p.subclass, p.conditionId);
      if (p.field !== "condition_add" && now !== p.current) return { ok: false, issues: [`${p.label} changed since the proposal was made (it is now ${now ?? "empty"}). Run the update again.`] };
    }
    const applied = applyProposals(program, selected);
    if (applied.issues.length) return { ok: false, issues: applied.issues };
    const source = rec.sourceUrl ?? rec.fileName ?? "pasted text";
    const notes = new Map<string, string[]>();
    for (const p of selected) {
      const f = auditFieldOf(p);
      notes.set(f, [...(notes.get(f) ?? []), `"${p.quote.length > 240 ? `${p.quote.slice(0, 237)}...` : p.quote}"`]);
    }
    const head = `Source ${source}, checked ${rec.checkedOn} (update ${input.updateId})`;
    const result = await saveStateProgram(deps.store, actor, applied.program, at, {
      verifiedOn: rec.checkedOn,
      action: "source_update",
      noteFor: (field) => (field === "lastVerified" ? `${head}: last verified set to the date the source was checked` : notes.has(field) ? `${head}: ${notes.get(field)!.join(" | ")}` : field === "scoring" ? `${head}: derived from the new status` : undefined),
    });
    if (!result.ok) return { ok: false, issues: result.issues.map((i) => `${i.path}: ${i.message}`) };
    changed = result.changed;
    dropped = applied.droppedTranslations;
  }

  let occupationChanged = 0;
  if (occIds.size > 0 && rec.occupation) {
    const o = rec.occupation;
    const list = applyOccupationChanges(o.current, o.rows, o.diff, occIds);
    occupationChanged = occIds.size;
    const existing = await deps.store.getOccupationList(rec.stateCode);
    await deps.store.saveOccupationList(
      { stateCode: rec.stateCode, rows: list, sourceUrl: rec.sourceUrl, checkedOn: rec.checkedOn, fileName: rec.fileName, updatedAt: at.toISOString(), updatedBy: actor.label },
      { entityType: "state_occupation_list", entityKey: rec.stateCode, fieldPath: "rows", oldValue: { occupations: existing?.rows.length ?? o.current.length }, newValue: { occupations: list.length, applied: [...occIds].slice(0, 500) }, action: "occupation_list_update", note: `Source ${rec.sourceUrl ?? rec.fileName ?? "uploaded file"}, checked ${rec.checkedOn} (update ${input.updateId}): ${occIds.size} change(s)` },
      actor,
      at,
    );
  }

  let knowledge: Extract<ApproveResult, { ok: true }>["knowledge"];
  try {
    const stateName = program.stateName;
    const r = await deps.knowledge.replace({ stateCode: rec.stateCode, stateName, sourceUrl: rec.sourceUrl, checkedOn: rec.checkedOn, text: rec.text, remove: rec.knowledge.remove });
    knowledge = { ok: true, ...r };
  } catch (e) {
    knowledge = { ok: false, error: e instanceof Error ? e.message.slice(0, 200) : "indexing failed" };
  }

  await deps.store.log({ entityType: "state_source_update", entityKey: rec.stateCode, fieldPath: input.updateId, oldValue: null, newValue: { approved: input.proposalIds, occupation: [...occIds].length, changed, knowledge }, action: "source_update", note: `approved by ${actor.label}` }, actor, at);
  return { ok: true, changed, occupationChanged, droppedTranslations: dropped, knowledge };
}

export async function discardSourceUpdate(deps: Pick<Deps, "store">, actor: Actor, updateId: string, at: Date = new Date()): Promise<{ ok: boolean; error?: string }> {
  const loaded = await loadRecord(deps.store, updateId);
  if ("error" in loaded) return { ok: false, error: loaded.error };
  await deps.store.log({ entityType: "state_source_update", entityKey: loaded.rec.stateCode, fieldPath: updateId, oldValue: null, newValue: { discarded: true }, action: "source_update", note: `discarded by ${actor.label}` }, actor, at);
  return { ok: true };
}
