"use server";

import { revalidatePath, updateTag } from "next/cache";

import { ADMIN_STATE_DATA_TAG } from "@/lib/admin-data/loader";
import { markStateVerified, restoreAuditField, saveStateProgram } from "@/lib/admin-data/service";
import { prismaStateProgramStore } from "@/lib/admin-data/store-prisma";
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // same as lib/admin-data/source-update/extract.ts, which is loaded only when a file arrives
import { prismaKnowledgeIndex } from "@/lib/admin-data/source-update/knowledge";
import { approveSourceUpdate, createSourceUpdate, discardSourceUpdate, type SourceInput } from "@/lib/admin-data/source-update/update";
import { isAdminTranslationLocale } from "@/lib/admin-data/locales";
import { draftTranslation, type DraftResult } from "@/lib/admin-data/translate";
import type { Actor } from "@/lib/admin-data/audit";
import type { ValidationIssue } from "@/lib/admin-data/validate";
import { getCurrentUser } from "@/lib/auth/rbac";
import { STATE_CODES } from "@/lib/state-monitor/pages";
import { runStateMonitor } from "@/lib/state-monitor/run";
import { prismaMonitorStore } from "@/lib/state-monitor/store";

/**
 * Server actions of the admin "State nomination" pages. A server action is a public endpoint, so every one checks the signed-in user itself:
 * ADMIN role only, and the audit log gets the real identity from the session (never from the request body).
 */

async function requireAdminActor(): Promise<Actor> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("Forbidden");
  return { id: user.id, email: user.email ?? null, label: user.email ?? user.name ?? user.id };
}

export type ActionResult = { ok: true; changed: string[] } | { ok: false; issues: ValidationIssue[] };

function refresh(locale?: string) {
  // The cached snapshot expires at once: the next report, answer or monitor run reads the saved data.
  updateTag(ADMIN_STATE_DATA_TAG);
  revalidatePath(`/${locale ?? "en"}/admin/crm/states`, "layout");
}

export async function saveStateAction(input: unknown, locale?: string): Promise<ActionResult> {
  const actor = await requireAdminActor();
  const result = await saveStateProgram(prismaStateProgramStore, actor, input);
  if (!result.ok) return result;
  if (result.changed.length > 0) refresh(locale);
  return { ok: true, changed: result.changed };
}

export async function markVerifiedAction(stateCode: string, locale?: string): Promise<ActionResult> {
  const actor = await requireAdminActor();
  const result = await markStateVerified(prismaStateProgramStore, actor, stateCode);
  if (!result.ok) return result;
  refresh(locale);
  return { ok: true, changed: result.changed };
}

export async function restoreAction(auditId: string, locale?: string): Promise<ActionResult> {
  const actor = await requireAdminActor();
  const result = await restoreAuditField(prismaStateProgramStore, actor, auditId);
  if (!result.ok) return result;
  if (result.changed.length > 0) refresh(locale);
  return { ok: true, changed: result.changed };
}

/** "Draft translation": returns the model's draft (not saved, not reviewed); the admin reads it, edits it and saves with the form. The request is logged. */
export async function draftTranslationAction(stateCode: string, fieldPath: string, text: string, to: string): Promise<DraftResult> {
  const actor = await requireAdminActor();
  if (!isAdminTranslationLocale(to)) return { ok: false, error: `${to} is not a supported language.` };
  const result = await draftTranslation(text, to);
  await prismaStateProgramStore.log(
    { entityType: "state_program", entityKey: stateCode, fieldPath: `${fieldPath}.${to}`, oldValue: null, newValue: result.ok ? { text: result.entry.text, reviewed: false } : null, action: "translate_draft", note: result.ok ? "machine draft requested (not applied until saved)" : result.error },
    actor,
    new Date(),
  );
  return result;
}

/** Runs the state-page monitor now (admin only). The result shows in the run log on the page. */
export async function runMonitorNowAction(): Promise<void> {
  await requireAdminActor();
  await runStateMonitor({ trigger: "manual" });
  revalidatePath("/", "layout");
}

/** Marks a state's detected change as applied (admin only), after the state's data was updated. Report data is not touched. */
export async function markStateAppliedAction(formData: FormData): Promise<void> {
  await requireAdminActor();
  const state = String(formData.get("state") ?? "");
  if (!(STATE_CODES as readonly string[]).includes(state)) throw new Error("Unknown state");
  await prismaMonitorStore.markApplied(state, new Date());
  revalidatePath("/", "layout");
}

// ---- Update from official source ---------------------------------------------------------------------------------------------------------------

export type ProposeResponse =
  | {
      ok: true;
      id: string;
      proposals: Array<{ id: string; label: string; current: string | null; proposed: string; quote: string }>;
      rejected: Array<{ field: string; reason: string; quote?: string; value?: string }>;
      knowledgeRemove: Array<{ source: string; category: string; chunks: number }>;
      knowledgeError?: string;
      truncated: boolean;
      textChars: number;
      occupation: null | {
        subclassSource: string;
        sheets: string[];
        warnings: string[];
        counts: { current190: number; current491: number; next190: number; next491: number };
        found: { "190": string[]; "491": string[] };
        added: Array<{ code: string; title: string; s190: boolean; s491: boolean }>;
        removed: Array<{ code: string; title: string; s190: boolean; s491: boolean }>;
        changed: Array<{ code: string; title: string; before: string; after: string }>;
      };
    }
  | { ok: false; error: string };

const sub = (b: boolean, c: boolean) => [b ? "190" : "", c ? "491" : ""].filter(Boolean).join("+") || "none";

/** Reads the pasted text and / or the uploaded file (in this request, nothing is stored), asks the model for changes and keeps only the verified ones. */
export async function proposeSourceUpdateAction(formData: FormData): Promise<ProposeResponse> {
  const actor = await requireAdminActor();
  const stateCode = String(formData.get("stateCode") ?? "").toUpperCase();
  if (!STATE_CODES.includes(stateCode as (typeof STATE_CODES)[number])) return { ok: false, error: "Unknown state." };
  const pasted = String(formData.get("pastedText") ?? "").trim();
  const file = formData.get("file");
  let text = pasted;
  let kind: SourceInput["kind"] = "text";
  let fileName: string | null = null;
  let sheets: SourceInput["sheets"];
  let truncated = false;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "The file is larger than 10 MB." };
    try {
      const { extractUpload } = await import("@/lib/admin-data/source-update/extract");
      const extracted = await extractUpload(file.name, new Uint8Array(await file.arrayBuffer()));
      fileName = file.name;
      kind = extracted.kind;
      sheets = extracted.sheets;
      truncated = extracted.truncated;
      text = pasted ? `${pasted}

${extracted.text}` : extracted.text;
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "The file could not be read." };
    }
  }
  const chosen = String(formData.get("occupationSubclasses") ?? "").split(",").filter((x): x is "190" | "491" => x === "190" || x === "491");
  const created = await createSourceUpdate(
    { store: prismaStateProgramStore, knowledge: prismaKnowledgeIndex },
    actor,
    { stateCode, sourceUrl: String(formData.get("sourceUrl") ?? "").trim() || null, checkedOn: String(formData.get("checkedOn") ?? "").trim(), fileName, kind, text, truncated, sheets, occupationSubclasses: chosen.length ? chosen : undefined },
  );
  if (!created.ok) return created;
  const r = created.record;
  const o = r.occupation;
  return {
    ok: true,
    id: created.id,
    proposals: r.proposals.map((p) => ({ id: p.id, label: p.label, current: p.current, proposed: p.proposed, quote: p.quote })),
    rejected: r.rejected,
    knowledgeRemove: r.knowledge.remove,
    knowledgeError: r.knowledge.error,
    truncated: r.truncated,
    textChars: r.textChars,
    occupation: o
      ? {
          subclassSource: o.subclassSource,
          sheets: o.sheets,
          warnings: o.warnings,
          counts: o.diff.counts,
          found: o.diff.found,
          added: o.diff.added.slice(0, 2000).map((x) => ({ code: x.anzscoCode, title: x.occupationTitle, s190: x.subclass190, s491: x.subclass491 })),
          removed: o.diff.removed.slice(0, 2000).map((x) => ({ code: x.anzscoCode, title: x.occupationTitle, s190: x.subclass190, s491: x.subclass491 })),
          changed: o.diff.changed.slice(0, 2000).map((x) => ({ code: x.anzscoCode, title: x.occupationTitle, before: `${sub(x.before.subclass190, x.before.subclass491)}${x.before.title !== x.after.title ? ` "${x.before.title}"` : ""}`, after: `${sub(x.after.subclass190, x.after.subclass491)}${x.before.title !== x.after.title ? ` "${x.after.title}"` : ""}` })),
        }
      : null,
  };
}

export async function approveSourceUpdateAction(updateId: string, proposalIds: string[], occupationIds: string[], locale?: string) {
  const actor = await requireAdminActor();
  const result = await approveSourceUpdate({ store: prismaStateProgramStore, knowledge: prismaKnowledgeIndex }, actor, { updateId, proposalIds, occupationIds });
  if (result.ok) refresh(locale);
  return result;
}

export async function discardSourceUpdateAction(updateId: string) {
  const actor = await requireAdminActor();
  return discardSourceUpdate({ store: prismaStateProgramStore }, actor, updateId);
}
