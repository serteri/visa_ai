"use server";

import { revalidatePath, updateTag } from "next/cache";

import { ADMIN_STATE_DATA_TAG } from "@/lib/admin-data/loader";
import { markStateVerified, restoreAuditField, saveStateProgram } from "@/lib/admin-data/service";
import { prismaStateProgramStore } from "@/lib/admin-data/store-prisma";
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
export async function draftTranslationAction(stateCode: string, fieldPath: string, text: string, to: "tr" | "zh-Hans"): Promise<DraftResult> {
  const actor = await requireAdminActor();
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
