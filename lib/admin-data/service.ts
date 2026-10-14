import { diffPrograms, forEachLocalized, type Actor, type AuditEntry } from "./audit";
import { buildSeedPrograms } from "./seed";
import type { StateProgramStore } from "./store";
import type { StateProgramData, TranslationEntry } from "./types";
import { validateProgram, type ValidationIssue } from "./validate";

/**
 * The admin operations on a state program. Pure over a store and a clock, so the rules (the admin row always wins, last verified is set
 * on save, every change is logged with the signed-in user) are tested without a database.
 */

export type SaveResult = { ok: true; program: StateProgramData; changed: string[] } | { ok: false; issues: ValidationIssue[] };

/** A translation newly marked reviewed gets who and when from the server; an unreviewed one carries no stamp. */
function stampReviews(next: StateProgramData, prev: StateProgramData | null, actor: Actor, at: Date): void {
  const before = new Map<string, Record<string, TranslationEntry | undefined>>();
  if (prev) forEachLocalized(prev, (f, path) => before.set(path, { tr: f.tr, "zh-Hans": f["zh-Hans"] }));
  forEachLocalized(next, (f, path) => {
    for (const l of ["tr", "zh-Hans"] as const) {
      const e = f[l];
      if (!e) continue;
      const old = before.get(path)?.[l];
      if (e.reviewed && !(old?.reviewed && old.text === e.text)) {
        e.reviewedBy = actor.label;
        e.reviewedAt = at.toISOString();
      }
      if (!e.reviewed) {
        delete e.reviewedBy;
        delete e.reviewedAt;
      }
    }
  });
}

/** Save an edit. Last verified is set here (never typed); nothing is written, and nothing is marked verified, when nothing changed. */
export async function saveStateProgram(store: StateProgramStore, actor: Actor, input: unknown, at: Date = new Date()): Promise<SaveResult> {
  const code = (input as { stateCode?: unknown } | null)?.stateCode;
  if (typeof code !== "string") return { ok: false, issues: [{ path: "stateCode", message: "is required" }] };
  const previous = await store.get(code);
  if (!previous) return { ok: false, issues: [{ path: "stateCode", message: `no program for ${code}; seed the states first` }] };

  const checked = validateProgram(input, previous);
  if (!checked.ok) return checked;
  const next: StateProgramData = structuredClone(checked.value);
  stampReviews(next, previous, actor, at);

  const entries = diffPrograms(previous, next, "edit");
  if (entries.length === 0) return { ok: true, program: previous, changed: [] };

  const stamp = at.toISOString();
  next.lastVerifiedAt = stamp;
  next.lastVerifiedBy = actor.label;
  next.updatedAt = stamp;
  next.updatedBy = actor.label;
  if (next.status !== previous.status) next.statusChangedAt = stamp;
  const audits: AuditEntry[] = [
    ...entries,
    { entityType: "state_program", entityKey: code, fieldPath: "lastVerified", oldValue: previous.lastVerifiedAt, newValue: stamp, action: "edit", note: "set on save" },
  ];
  await store.save(next, audits, actor, at);
  return { ok: true, program: next, changed: entries.map((e) => e.fieldPath) };
}

/** "Checked the official page, nothing changed": only the verification stamp moves. */
export async function markStateVerified(store: StateProgramStore, actor: Actor, stateCode: string, at: Date = new Date()): Promise<SaveResult> {
  const previous = await store.get(stateCode);
  if (!previous) return { ok: false, issues: [{ path: "stateCode", message: `no program for ${stateCode}` }] };
  const stamp = at.toISOString();
  const next = { ...structuredClone(previous), lastVerifiedAt: stamp, lastVerifiedBy: actor.label, updatedAt: stamp, updatedBy: actor.label };
  await store.save(next, [{ entityType: "state_program", entityKey: stateCode, fieldPath: "lastVerified", oldValue: previous.lastVerifiedAt, newValue: stamp, action: "mark_verified" }], actor, at);
  return { ok: true, program: next, changed: ["lastVerified"] };
}

/** Put one logged field back to the value it had before that entry (as a new, logged edit). */
export async function restoreAuditField(store: StateProgramStore, actor: Actor, auditId: string, at: Date = new Date()): Promise<SaveResult> {
  const entry = await store.auditEntry(auditId);
  if (!entry || entry.entityType !== "state_program") return { ok: false, issues: [{ path: "auditId", message: "history entry not found" }] };
  if (entry.fieldPath === "lastVerified") return { ok: false, issues: [{ path: "auditId", message: "the verification date cannot be restored; use Mark verified" }] };
  const current = await store.get(entry.entityKey);
  if (!current) return { ok: false, issues: [{ path: "stateCode", message: "no program" }] };
  const draft = structuredClone(current) as unknown as Record<string, unknown>;
  if (entry.fieldPath.startsWith("subclasses.")) {
    const sub = entry.fieldPath.slice("subclasses.".length);
    const list = (draft.subclasses as Array<{ subclass: string }>).filter((s) => s.subclass !== sub);
    if (entry.oldValue) list.push(entry.oldValue as { subclass: string });
    draft.subclasses = list.sort((a, b) => a.subclass.localeCompare(b.subclass));
  } else draft[entry.fieldPath] = entry.oldValue;
  const result = await saveStateProgram(store, actor, draft, at);
  if (result.ok && result.changed.length > 0) {
    await store.log({ entityType: "state_program", entityKey: entry.entityKey, fieldPath: entry.fieldPath, oldValue: entry.newValue, newValue: entry.oldValue, action: "restore", note: `restored from history entry ${auditId}` }, actor, at);
  }
  return result;
}

/** Seed the missing states (never overwrites a row). The entries are marked as the seed. */
export async function seedStatePrograms(store: StateProgramStore, actor: Actor, at: Date = new Date()): Promise<{ inserted: string[]; skipped: string[] }> {
  const stamp = at.toISOString();
  const programs = Object.values(buildSeedPrograms()).map((p) => ({ ...p, updatedAt: stamp, updatedBy: actor.label }));
  const audits = programs.flatMap((p) => diffPrograms(null, p, "seed", "initial rows from lib/state-nomination/state-rules-config.ts and src/data/state-nomination-status.json"));
  const inserted = await store.insertMissing(programs, audits, actor, at);
  return { inserted, skipped: programs.map((p) => p.stateCode).filter((c) => !inserted.includes(c)) };
}
