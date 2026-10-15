import type { LocalizedField, StateProgramData } from "./types";

/**
 * The audit trail of the admin pages (docs/admin-data-design.md A.3): one entry per changed field, with the old and new value, the signed-in
 * user and the time. Fields are the top-level parts of a program, so "restore" can put one back as a whole.
 */

export type Actor = { id: string | null; email: string | null; /** What the history shows: the e-mail, else the name or id. */ label: string };

export type AuditAction = "edit" | "seed" | "mark_verified" | "restore" | "translate_draft" | "translate_review" | "source_update_proposed" | "source_update" | "occupation_list_update";

export type AuditEntry = {
  /** "state_program": the history of a state; "state_source_update": a pasted/uploaded source and its proposals; "state_occupation_list": a state occupation list. */
  entityType: "state_program" | "state_source_update" | "state_occupation_list";
  /** "NT" (the current program) -- the program year is in the values. */
  entityKey: string;
  fieldPath: string;
  oldValue: unknown;
  newValue: unknown;
  action: AuditAction;
  note?: string | null;
};

export type AuditRecord = AuditEntry & { id: string; at: string; actorId: string | null; actorEmail: string | null; actorLabel: string };

/** The parts of a program that are edited and logged (the server-set verification and update stamps are logged on their own). */
export const AUDITED_FIELDS = [
  "programYear",
  "status",
  "openingDate",
  "closingDate",
  "officialUrl",
  "extraUrls",
  "exceptions",
  "notes",
  "aiSummary",
  "conditions",
  "scoring",
  "subclasses.190",
  "subclasses.491",
  "sourceText",
] as const;

export function fieldValue(p: StateProgramData, path: string): unknown {
  if (path.startsWith("subclasses.")) return p.subclasses.find((s) => s.subclass === path.slice("subclasses.".length)) ?? null;
  return (p as unknown as Record<string, unknown>)[path] ?? null;
}

/** Stable JSON (sorted keys): two values are equal when this is equal. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

/** The audit entries for an edit: one per changed field. */
export function diffPrograms(before: StateProgramData | null, after: StateProgramData, action: AuditAction, note?: string | null): AuditEntry[] {
  const out: AuditEntry[] = [];
  for (const path of AUDITED_FIELDS) {
    const a = before ? fieldValue(before, path) : null;
    const b = fieldValue(after, path);
    if (canonical(a) !== canonical(b)) out.push({ entityType: "state_program", entityKey: after.stateCode, fieldPath: path, oldValue: a, newValue: b, action, ...(note ? { note } : {}) });
  }
  return out;
}

/** Every localized text of a program with its path, so the server can stamp who reviewed a translation. */
export function forEachLocalized(p: StateProgramData, fn: (f: LocalizedField, path: string) => void): void {
  fn(p.notes, "notes");
  fn(p.aiSummary, "aiSummary");
  if (p.exceptions) fn(p.exceptions.text, "exceptions.text");
  p.conditions.forEach((c) => fn(c.text, `conditions.${c.id}.text`));
  p.scoring.specialConditions.forEach((f, i) => fn(f, `scoring.specialConditions.${i}`));
  p.subclasses.forEach((s) => s.feeNote && fn(s.feeNote, `subclasses.${s.subclass}.feeNote`));
}
