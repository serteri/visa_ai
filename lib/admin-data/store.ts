import type { Actor, AuditEntry, AuditRecord } from "./audit";
import type { StateProgramData } from "./types";

/**
 * Where the state programs live. The service (service.ts) works against this interface: the real one is Prisma (store-prisma.ts); the tests and the
 * dry run use the in-memory one. Writing a program and its audit entries is ONE operation (a transaction in Prisma), so a change is never saved
 * without its history.
 */
export interface StateProgramStore {
  /** The current program of every state that has a row. */
  list(): Promise<StateProgramData[]>;
  get(stateCode: string): Promise<StateProgramData | null>;
  /** Insert or replace the state's current program and append the audit entries, atomically. */
  save(program: StateProgramData, audits: AuditEntry[], actor: Actor, at: Date): Promise<void>;
  /** The seed: insert only the states that have no row yet (never overwrites), with their audit entries. Returns the codes inserted. */
  insertMissing(programs: StateProgramData[], audits: AuditEntry[], actor: Actor, at: Date): Promise<string[]>;
  history(stateCode: string, limit: number): Promise<AuditRecord[]>;
  auditEntry(id: string): Promise<AuditRecord | null>;
  /** An audit entry with no program change (for example a translation draft). */
  log(entry: AuditEntry, actor: Actor, at: Date): Promise<void>;
}

export function memoryStore(initial: StateProgramData[] = []): StateProgramStore & { audits: AuditRecord[] } {
  const programs = new Map(initial.map((p) => [p.stateCode, structuredClone(p)]));
  const audits: AuditRecord[] = [];
  let n = 0;
  const record = (e: AuditEntry, actor: Actor, at: Date): AuditRecord => ({ ...structuredClone(e), id: `a${++n}`, at: at.toISOString(), actorId: actor.id, actorEmail: actor.email, actorLabel: actor.label });
  return {
    audits,
    async list() {
      return [...programs.values()].map((p) => structuredClone(p));
    },
    async get(code) {
      const p = programs.get(code);
      return p ? structuredClone(p) : null;
    },
    async save(program, entries, actor, at) {
      programs.set(program.stateCode, structuredClone(program));
      for (const e of entries) audits.push(record(e, actor, at));
    },
    async insertMissing(list, entries, actor, at) {
      const inserted: string[] = [];
      for (const p of list) {
        if (programs.has(p.stateCode)) continue;
        programs.set(p.stateCode, structuredClone(p));
        inserted.push(p.stateCode);
      }
      for (const e of entries) if (inserted.includes(e.entityKey)) audits.push(record(e, actor, at));
      return inserted;
    },
    async history(code, limit) {
      return audits.filter((a) => a.entityKey === code).slice().reverse().slice(0, limit);
    },
    async auditEntry(id) {
      return audits.find((a) => a.id === id) ?? null;
    },
    async log(entry, actor, at) {
      audits.push(record(entry, actor, at));
    },
  };
}
