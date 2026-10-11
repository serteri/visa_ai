"use server";

import { revalidatePath } from "next/cache";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { STATE_CODES } from "@/lib/state-monitor/pages";
import { runStateMonitor } from "@/lib/state-monitor/run";
import { prismaMonitorStore } from "@/lib/state-monitor/store";

/** Runs the state-page monitor now (admin only). The result shows in the run log on the page. */
export async function runMonitorNowAction(): Promise<void> {
  if (!(await isAdminAuthenticated())) throw new Error("Unauthorized");
  await runStateMonitor({ trigger: "manual" });
  revalidatePath("/", "layout");
}

/** Marks a state's detected change as applied (admin only), after the source file and the state's rule were updated. Report data is not touched. */
export async function markStateAppliedAction(formData: FormData): Promise<void> {
  if (!(await isAdminAuthenticated())) throw new Error("Unauthorized");
  const state = String(formData.get("state") ?? "");
  if (!(STATE_CODES as readonly string[]).includes(state)) throw new Error("Unknown state");
  await prismaMonitorStore.markApplied(state, new Date());
  revalidatePath("/", "layout");
}
