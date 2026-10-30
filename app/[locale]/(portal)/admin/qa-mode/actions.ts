"use server";

import { cookies } from "next/headers";

import { getCurrentUser } from "@/lib/auth/rbac";
import { makeQaCookieValue, QA_COOKIE, QA_MAX_AGE_SECONDS } from "@/lib/analytics/policy";

/**
 * QA mode: a signed-in ADMIN switches analytics off for THIS browser only, so a tester's visits to the production site are not counted. A server action
 * is a public endpoint, so the role is checked here (never trusted from the page); a query parameter can never turn it on. The cookie it sets
 * (`lv_qa`) is readable by the page scripts, which only ever use it to load nothing; it grants no access and changes no checkout, payment or auth behaviour.
 * It expires after QA_MAX_AGE_SECONDS and can be cleared at any time with disableQaModeAction.
 */
async function requireAdmin(): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("Forbidden");
}

export async function enableQaModeAction(): Promise<{ ok: true; expiresAt: number }> {
  await requireAdmin();
  const store = await cookies();
  store.set({ name: QA_COOKIE, value: makeQaCookieValue(), httpOnly: false, secure: true, sameSite: "lax", path: "/", maxAge: QA_MAX_AGE_SECONDS });
  return { ok: true, expiresAt: Date.now() + QA_MAX_AGE_SECONDS * 1000 };
}

export async function disableQaModeAction(): Promise<{ ok: true }> {
  await requireAdmin();
  const store = await cookies();
  store.set({ name: QA_COOKIE, value: "", httpOnly: false, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
  return { ok: true };
}
