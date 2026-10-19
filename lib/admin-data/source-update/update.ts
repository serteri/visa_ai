import type { Actor } from "../audit";
import { markStateVerifiedOn, saveStateProgram } from "../service";
import type { StateProgramStore } from "../store";
import type { OccupationRow } from "../types";
import { applyProposals, auditFieldOf } from "./apply";
import { classifyCandidates, docKey, isOccupationListDoc, type KnowledgeCandidate, type KnowledgeDoc, type KnowledgeIndex } from "./knowledge";
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
  /** `candidates`: the state's documents the review lists; nothing is removed unless ticked. (`remove`: records made before this change.) */
  knowledge: { candidates?: KnowledgeCandidate[]; remove?: KnowledgeDoc[]; error?: string };
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

  let candidates: KnowledgeCandidate[] = [];
  let knowledgeError: string | undefined;
  try {
    candidates = classifyCandidates(await deps.knowledge.preview(input.stateCode), { sourceUrl: input.sourceUrl, fileName: input.fileName });
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
    knowledge: { candidates, ...(knowledgeError ? { error: knowledgeError } : {}) },
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

/** The candidates of a record (older records stored a plain removal list: none of those was from a known source, so none is preselected). */
export function candidatesOf(rec: SourceUpdateRecord): KnowledgeCandidate[] {
  return rec.knowledge.candidates ?? (rec.knowledge.remove ?? []).map((d) => ({ ...d, sameSource: false, occupationList: isOccupationListDoc(d), preselected: false }));
}

/** The documents to remove: exactly the ticked ones (default: the preselected ones, i.e. the same source). A key that is not a listed candidate is refused. */
function resolveRemoval(rec: SourceUpdateRecord, keys: string[] | undefined): { docs: KnowledgeDoc[] } | { error: string } {
  const all = candidatesOf(rec);
  const wanted = keys ?? all.filter((c) => c.preselected).map(docKey);
  const docs: KnowledgeDoc[] = [];
  for (const k of new Set(wanted)) {
    const c = all.find((x) => docKey(x) === k);
    if (!c) return { error: `"${k}" is not one of the documents listed for removal.` };
    docs.push(c);
  }
  return { docs };
}

async function indexSource(deps: Deps, rec: SourceUpdateRecord, stateName: string, remove: KnowledgeDoc[]): Promise<KnowledgeOutcome> {
  try {
    const r = await deps.knowledge.replace({ stateCode: rec.stateCode, stateName, sourceUrl: rec.sourceUrl, fileName: rec.fileName, checkedOn: rec.checkedOn, text: rec.text, remove });
    return { ok: true, ...r };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message.slice(0, 200) : "indexing failed" };
  }
}

export type ApproveInput = {
  updateId: string;
  proposalIds: string[];
  occupationIds?: string[];
  /** docKey()s of the chat documents to remove; omitted = only the document from the same source. */
  removeDocs?: string[];
};
export type ApproveResult =
  | { ok: true; changed: string[]; occupationChanged: number; droppedTranslations: string[]; knowledge: KnowledgeOutcome }
  | { ok: false; issues: string[] };

type KnowledgeOutcome = { ok: true; removedChunks: number; addedChunks: number; docName: string } | { ok: false; error: string };

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
  const removal = resolveRemoval(rec, input.removeDocs);
  if ("error" in removal) return { ok: false, issues: [removal.error] };

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

  const knowledge = await indexSource(deps, rec, program.stateName, removal.docs);

  await deps.store.log({ entityType: "state_source_update", entityKey: rec.stateCode, fieldPath: input.updateId, oldValue: null, newValue: { approved: input.proposalIds, occupation: [...occIds].length, changed, knowledge }, action: "source_update", note: `approved by ${actor.label}` }, actor, at);
  return { ok: true, changed, occupationChanged, droppedTranslations: dropped, knowledge };
}

/**
 * "Update chat knowledge for this page only": indexes the pasted page and removes only the ticked documents (default: the same source). No row field is
 * touched and the update stays open, so fields can still be approved or the row marked verified afterwards.
 */
export async function updateKnowledgeOnly(deps: Deps, actor: Actor, input: { updateId: string; removeDocs?: string[] }, at: Date = new Date()): Promise<{ ok: true; knowledge: KnowledgeOutcome } | { ok: false; issues: string[] }> {
  const loaded = await loadRecord(deps.store, input.updateId);
  if ("error" in loaded) return { ok: false, issues: [loaded.error] };
  const { rec } = loaded;
  const program = await deps.store.get(rec.stateCode);
  if (!program) return { ok: false, issues: [`There is no row for ${rec.stateCode}.`] };
  const removal = resolveRemoval(rec, input.removeDocs);
  if ("error" in removal) return { ok: false, issues: [removal.error] };
  const knowledge = await indexSource(deps, rec, program.stateName, removal.docs);
  await deps.store.log({ entityType: "state_source_update", entityKey: rec.stateCode, fieldPath: input.updateId, oldValue: null, newValue: { knowledge, removed: removal.docs.map(docKey) }, action: "source_update_knowledge", note: `chat knowledge updated for ${rec.sourceUrl ?? rec.fileName ?? "pasted text"} by ${actor.label}` }, actor, at);
  return { ok: true, knowledge };
}

/** "Mark verified": the source was read and states no change, so only the verification date moves to the date entered. No field and no chat document is touched. */
export async function markVerifiedFromUpdate(deps: Pick<Deps, "store">, actor: Actor, updateId: string, at: Date = new Date()): Promise<{ ok: true } | { ok: false; error: string }> {
  const loaded = await loadRecord(deps.store, updateId);
  if ("error" in loaded) return { ok: false, error: loaded.error };
  const { rec } = loaded;
  const r = await markStateVerifiedOn(deps.store, actor, rec.stateCode, rec.checkedOn, `Source ${rec.sourceUrl ?? rec.fileName ?? "pasted text"}, checked ${rec.checkedOn} (update ${updateId}): no change to the row`, at);
  if (!r.ok) return { ok: false, error: r.issues.map((i) => i.message).join(" ") };
  await deps.store.log({ entityType: "state_source_update", entityKey: rec.stateCode, fieldPath: updateId, oldValue: null, newValue: { verifiedOn: rec.checkedOn }, action: "source_update_verified", note: `marked verified by ${actor.label}` }, actor, at);
  return { ok: true };
}

export async function discardSourceUpdate(deps: Pick<Deps, "store">, actor: Actor, updateId: string, at: Date = new Date()): Promise<{ ok: boolean; error?: string }> {
  const loaded = await loadRecord(deps.store, updateId);
  if ("error" in loaded) return { ok: false, error: loaded.error };
  await deps.store.log({ entityType: "state_source_update", entityKey: loaded.rec.stateCode, fieldPath: updateId, oldValue: null, newValue: { discarded: true }, action: "source_update", note: `discarded by ${actor.label}` }, actor, at);
  return { ok: true };
}
