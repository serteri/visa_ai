"use server";

import { redirect } from "next/navigation";

import {
  clearAdminSession,
  getAdminPassword,
  isValidAdminPassword,
  setAdminSession,
} from "@/lib/admin-auth";

export async function loginAdmin(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en").trim() || "en";
  const password = String(formData.get("password") ?? "");

  if (!getAdminPassword()) {
    redirect(`/${locale}/admin/leads?auth=setup`);
  }

  if (!isValidAdminPassword(password)) {
    redirect(`/${locale}/admin/leads?auth=invalid`);
  }

  await setAdminSession();
  redirect(`/${locale}/admin/leads`);
}

export async function logoutAdmin(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en").trim() || "en";
  await clearAdminSession();
  redirect(`/${locale}/admin/leads?auth=signed-out`);
}