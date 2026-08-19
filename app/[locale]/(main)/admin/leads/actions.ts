"use server";

import { redirect } from "next/navigation";

import {
  clearAdminSession,
  getAdminPassword,
  isValidAdminPassword,
  setAdminSession,
} from "@/lib/admin-auth";

// Only accept a same-origin, locale-admin-scoped relative path (set as a
// hidden "destination" field by the access page, itself derived from
// proxy.ts's callbackUrl) -- never redirect to an arbitrary URL. Defaults to
// /admin/states, not /admin/leads: the leads page queries a Drizzle table
// that doesn't exist in the live database yet (see CLAUDE.md), so it used
// to 500 immediately after every successful login.
function resolveDestination(locale: string, raw: FormDataEntryValue | null): string {
  const value = typeof raw === "string" ? raw : "";
  if (/^\/(?:en|tr|zh-Hans)?\/?admin\//.test(value)) return value;
  return `/${locale}/admin/states`;
}

export async function loginAdmin(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en").trim() || "en";
  const password = String(formData.get("password") ?? "");
  const destination = resolveDestination(locale, formData.get("destination"));

  if (!getAdminPassword()) {
    redirect(`/${locale}/admin/leads/access?auth=setup`);
  }

  if (!isValidAdminPassword(password)) {
    redirect(`/${locale}/admin/leads/access?auth=invalid`);
  }

  await setAdminSession();
  redirect(destination);
}

export async function logoutAdmin(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en").trim() || "en";
  await clearAdminSession();
  redirect(`/${locale}/admin/leads/access?auth=signed-out`);
}