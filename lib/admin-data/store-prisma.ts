import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import type { Actor, AuditEntry, AuditRecord } from "./audit";
import type { StateProgramStore } from "./store";
import type { LocalizedField, OccupationListData, OccupationRow, ScoringInputs, StateCondition, StateExceptions, StateProgramData, SubclassData } from "./types";

/** The Prisma implementation of the store (tables: prisma/manual-migrations/2026-10-15-create-admin-state-data.sql). Program + audit entries are written in one transaction. */

type ProgramRow = Prisma.StateProgramGetPayload<{ include: { subclasses: true } }>;

const day = (d: Date | null): string | null => (d ? d.toISOString().slice(0, 10) : null);
const toDate = (s: string | null): Date | null => (s ? new Date(`${s}T00:00:00.000Z`) : null);
const num = (d: Prisma.Decimal | null): number | null => (d === null ? null : Number(d));

export function programFromRow(r: ProgramRow): StateProgramData {
  return {
    stateCode: r.stateCode,
    stateName: r.stateName,
    programYear: r.programYear,
    status: r.status,
    statusChangedAt: r.statusChangedAt?.toISOString() ?? null,
    openingDate: day(r.openingDate),
    closingDate: day(r.closingDate),
    officialUrl: r.officialUrl,
    extraUrls: r.extraUrls,
    exceptions: (r.exceptions as StateExceptions | null) ?? null,
    notes: r.notes as unknown as LocalizedField,
    aiSummary: r.aiSummary as unknown as LocalizedField,
    conditions: r.conditions as unknown as StateCondition[],
    scoring: r.scoring as unknown as ScoringInputs,
    subclasses: r.subclasses
      .map(
        (s): SubclassData => ({
          subclass: s.subclass as "190" | "491",
          availability: s.availability as SubclassData["availability"],
          allocation: s.allocation,
          allocationUsed: s.allocationUsed,
          feeExclGst: num(s.feeExclGst),
          feeInclGst: num(s.feeInclGst),
          gstBasis: s.gstBasis as SubclassData["gstBasis"],
          feeNote: (s.feeNote as LocalizedField | null) ?? null,
          effectiveFrom: day(s.effectiveFrom),
        }),
      )
      .sort((a, b) => a.subclass.localeCompare(b.subclass)),
    lastVerifiedAt: r.lastVerifiedAt.toISOString(),
    lastVerifiedBy: r.lastVerifiedBy,
    sourceText: r.sourceText,
    updatedAt: r.updatedAt.toISOString(),
    updatedBy: r.updatedBy,
  };
}

const json = (v: unknown): Prisma.InputJsonValue => (v === null || v === undefined ? ({} as Prisma.InputJsonValue) : (JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue));
const jsonOrNull = (v: unknown) => (v === null || v === undefined ? undefined : json(v));

function programData(p: StateProgramData, at: Date) {
  return {
    stateName: p.stateName,
    status: p.status,
    statusChangedAt: p.statusChangedAt ? new Date(p.statusChangedAt) : null,
    openingDate: toDate(p.openingDate),
    closingDate: toDate(p.closingDate),
    officialUrl: p.officialUrl,
    extraUrls: p.extraUrls,
    exceptions: p.exceptions ? json(p.exceptions) : undefined,
    notes: json(p.notes),
    aiSummary: json(p.aiSummary),
    conditions: json(p.conditions),
    scoring: json(p.scoring),
    sourceText: p.sourceText,
    lastVerifiedAt: new Date(p.lastVerifiedAt),
    lastVerifiedBy: p.lastVerifiedBy,
    updatedAt: at,
    updatedBy: p.updatedBy,
  };
}

function subclassData(s: SubclassData) {
  return {
    availability: s.availability,
    allocation: s.allocation,
    allocationUsed: s.allocationUsed,
    feeExclGst: s.feeExclGst,
    feeInclGst: s.feeInclGst,
    gstBasis: s.gstBasis,
    feeNote: jsonOrNull(s.feeNote),
    effectiveFrom: toDate(s.effectiveFrom),
  };
}

function auditRows(audits: AuditEntry[], actor: Actor, at: Date) {
  return audits.map((a) => ({
    at,
    actorId: actor.id,
    actorEmail: actor.email,
    actorLabel: actor.label,
    entityType: a.entityType,
    entityKey: a.entityKey,
    fieldPath: a.fieldPath,
    oldValue: a.oldValue === null || a.oldValue === undefined ? undefined : json(a.oldValue),
    newValue: a.newValue === null || a.newValue === undefined ? undefined : json(a.newValue),
    action: a.action,
    note: a.note ?? null,
  }));
}

const recordOf = (r: Prisma.AdminAuditLogGetPayload<object>): AuditRecord => ({
  id: r.id,
  at: r.at.toISOString(),
  actorId: r.actorId,
  actorEmail: r.actorEmail,
  actorLabel: r.actorLabel,
  entityType: r.entityType as AuditRecord["entityType"],
  entityKey: r.entityKey,
  fieldPath: r.fieldPath,
  oldValue: r.oldValue,
  newValue: r.newValue,
  action: r.action as AuditRecord["action"],
  note: r.note,
});

function occupationListFromRow(r: Prisma.StateOccupationListGetPayload<object>): OccupationListData {
  return { stateCode: r.stateCode, rows: r.rows as unknown as OccupationRow[], sourceUrl: r.sourceUrl, checkedOn: r.checkedOn, fileName: r.fileName, updatedAt: r.updatedAt.toISOString(), updatedBy: r.updatedBy };
}

export const prismaStateProgramStore: StateProgramStore = {
  async list() {
    const rows = await prisma.stateProgram.findMany({ where: { isCurrent: true }, include: { subclasses: true }, orderBy: { stateCode: "asc" } });
    return rows.map(programFromRow);
  },
  async get(code) {
    const row = await prisma.stateProgram.findFirst({ where: { stateCode: code, isCurrent: true }, include: { subclasses: true } });
    return row ? programFromRow(row) : null;
  },
  async save(program, audits, actor, at) {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.stateProgram.findFirst({ where: { stateCode: program.stateCode, isCurrent: true }, select: { id: true, programYear: true } });
      let id: string;
      if (existing && existing.programYear === program.programYear) {
        id = existing.id;
        await tx.stateProgram.update({ where: { id }, data: programData(program, at) });
      } else {
        // A new program year: the old one stays as history, the new one becomes the current one.
        if (existing) await tx.stateProgram.update({ where: { id: existing.id }, data: { isCurrent: false } });
        const created = await tx.stateProgram.upsert({
          where: { stateCode_programYear: { stateCode: program.stateCode, programYear: program.programYear } },
          create: { stateCode: program.stateCode, programYear: program.programYear, isCurrent: true, ...programData(program, at), createdAt: at },
          update: { isCurrent: true, ...programData(program, at) },
        });
        id = created.id;
      }
      for (const s of program.subclasses) {
        await tx.stateProgramSubclass.upsert({
          where: { stateProgramId_subclass: { stateProgramId: id, subclass: s.subclass } },
          create: { stateProgramId: id, subclass: s.subclass, ...subclassData(s) },
          update: subclassData(s),
        });
      }
      if (audits.length > 0) await tx.adminAuditLog.createMany({ data: auditRows(audits, actor, at) });
    });
  },
  async insertMissing(programs, audits, actor, at) {
    const inserted: string[] = [];
    await prisma.$transaction(async (tx) => {
      for (const p of programs) {
        const exists = await tx.stateProgram.findFirst({ where: { stateCode: p.stateCode }, select: { id: true } });
        if (exists) continue;
        const created = await tx.stateProgram.create({ data: { stateCode: p.stateCode, programYear: p.programYear, isCurrent: true, ...programData(p, at), createdAt: at } });
        for (const s of p.subclasses) await tx.stateProgramSubclass.create({ data: { stateProgramId: created.id, subclass: s.subclass, ...subclassData(s) } });
        inserted.push(p.stateCode);
      }
      const rows = auditRows(audits.filter((a) => inserted.includes(a.entityKey)), actor, at);
      if (rows.length > 0) await tx.adminAuditLog.createMany({ data: rows });
    });
    return inserted;
  },
  async history(code, limit) {
    const rows = await prisma.adminAuditLog.findMany({ where: { entityType: "state_program", entityKey: code }, orderBy: { at: "desc" }, take: limit });
    return rows.map(recordOf);
  },
  async auditEntry(id) {
    const r = await prisma.adminAuditLog.findUnique({ where: { id } });
    return r ? recordOf(r) : null;
  },
  async entries(entityType, key, limit) {
    const rows = await prisma.adminAuditLog.findMany({ where: { entityType, entityKey: key }, orderBy: { at: "desc" }, take: limit });
    return rows.map(recordOf);
  },
  async log(entry, actor, at) {
    const created = await prisma.adminAuditLog.create({ data: auditRows([entry], actor, at)[0] });
    return created.id;
  },
  async listOccupationLists() {
    return (await prisma.stateOccupationList.findMany()).map(occupationListFromRow);
  },
  async getOccupationList(code) {
    const r = await prisma.stateOccupationList.findUnique({ where: { stateCode: code } });
    return r ? occupationListFromRow(r) : null;
  },
  async saveOccupationList(list, audit, actor, at) {
    await prisma.$transaction(async (tx) => {
      const data = { rows: json(list.rows), sourceUrl: list.sourceUrl, checkedOn: list.checkedOn, fileName: list.fileName, updatedAt: at, updatedBy: list.updatedBy };
      await tx.stateOccupationList.upsert({ where: { stateCode: list.stateCode }, create: { stateCode: list.stateCode, ...data }, update: data });
      await tx.adminAuditLog.createMany({ data: auditRows([audit], actor, at) });
    });
  },
};
