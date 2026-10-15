import { diffPrograms, forEachLocalized, type Actor, type AuditEntry } from "./audit";
import { ADMIN_TRANSLATION_LOCALES } from "./locales";
import { buildSeedPrograms } from "./seed";
import { availabilityFor, isClosedStatus } from "./statuses";
import type { StateProgramStore } from "./store";
import { translationOf, type StateProgramData, type TranslationEntry } from "./types";
import { validateProgram, type ValidationIssue } from "./validate";

/**
 * The admin operations on a state program. Pure over a store and a clock, so the rules (the admin row always wins, last verified is set
 * on save, every change is logged with the signed-in user) are tested without a database.
 */

export type SaveResult = { ok: true; program: StateProgramData; changed: string[] } | { ok: false; issues: ValidationIssue[] };

/** A translation newly marked reviewed gets who and when from the server; an unreviewed one carries no stamp. */
function stampReviews(next: StateProgramData, prev: StateProgramData | null, actor: Actor, at: Date): void {
  const before = new Map<string, Record<string, TranslationEntry | undefined>>();
  if (prev) forEachLocalized(prev, (f, path) => before.set(path, Object.fromEntries(ADMIN_TRANSLATION_LOCALES.map((l) => [l, translationOf(f, l)]))));
  forEachLocalized(next, (f, path) => {
    for (const l of ADMIN_TRANSLATION_LOCALES) {
      const e = translationOf(f, l);
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
export type SaveOptions = {
  /** The day the admin checked the source ("Update from official source"): last verified is set to it instead of the save time. */
  verifiedOn?: string;
  /** A note for the audit entry of a field (the source URL, date and quotes). */
  noteFor?: (fieldPath: string) => string | undefined;
  action?: "edit" | "source_update";
};

export async function saveStateProgram(store: StateProgramStore, actor: Actor, input: unknown, at: Date = new Date(), opts: SaveOptions = {}): Promise<SaveResult> {
  const code = (input as { stateCode?: unknown } | null)?.stateCode;
  if (typeof code !== "string") return { ok: false, issues: [{ path: "stateCode", message: "is required" }] };
  const previous = await store.get(code);
  if (!previous) return { ok: false, issues: [{ path: "stateCode", message: `no program for ${code}; seed the states first` }] };

  const checked = validateProgram(input, previous);
  if (!checked.ok) return checked;
  const next: StateProgramData = structuredClone(checked.value);
  stampReviews(next, previous, actor, at);

  const entries = diffPrograms(previous, next, opts.action ?? "edit").map((e) => ({ ...e, note: opts.noteFor?.(e.fieldPath) ?? e.note }));
  if (entries.length === 0) return { ok: true, program: previous, changed: [] };

  const stamp = at.toISOString();
  next.lastVerifiedAt = opts.verifiedOn ? `${opts.verifiedOn}T00:00:00.000Z` : stamp;
  next.lastVerifiedBy = actor.label;
  next.updatedAt = stamp;
  next.updatedBy = actor.label;
  if (next.status !== previous.status) next.statusChangedAt = stamp;
  const audits: AuditEntry[] = [
    ...entries,
    { entityType: "state_program", entityKey: code, fieldPath: "lastVerified", oldValue: previous.lastVerifiedAt, newValue: next.lastVerifiedAt, action: opts.action ?? "edit", note: opts.verifiedOn ? (opts.noteFor?.("lastVerified") ?? "set to the date the source was checked") : "set on save" },
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
  if (entry.fieldPath === "status" && typeof entry.oldValue === "string") {
    // The scoring inputs follow the status, so restoring a status restores what it implies (an open status gets the seed's quota pressure back if the row was closed).
    const derived = availabilityFor(entry.oldValue);
    const scoring = draft.scoring as StateProgramData["scoring"];
    if (derived) {
      scoring.onshoreAvailability = derived.onshore;
      scoring.offshoreAvailability = derived.offshore;
      if (isClosedStatus(entry.oldValue) && entry.oldValue !== "Not yet published") scoring.offshoreQuotaPressure = scoring.ruleQuotaPressure = "closed";
      else if (scoring.offshoreQuotaPressure === "closed") scoring.offshoreQuotaPressure = scoring.ruleQuotaPressure = buildSeedPrograms()[entry.entityKey]?.scoring.ruleQuotaPressure ?? "medium";
    }
  }
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
