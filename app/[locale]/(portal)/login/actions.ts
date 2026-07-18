"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { homePathForRole, type Role } from "@/lib/auth/rbac";

export type LoginState = { error?: string };

/**
 * Credentials login for the CRM portal. On success we look up the account's
 * role and send the user to the right home (admin dashboard vs agent
 * dashboard vs consumer dashboard). redirect() must stay outside the try/catch
 * because it signals via a thrown NEXT_REDIRECT.
 */
export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const locale = String(formData.get("locale") ?? "en");
  const callbackUrl = String(formData.get("callbackUrl") ?? "").trim();

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw error;
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { role: true } });
  const role = (user?.role as Role) ?? "USER";

  // Honour an explicit callback only when it matches the signed-in role's area;
  // otherwise fall back to the role's home to avoid a redirect bounce.
  if (callbackUrl && callbackUrl.startsWith("/")) {
    const allowed =
      (role === "AGENT" && /\/agent(\/|$)/.test(callbackUrl)) ||
      (role === "ADMIN" && /\/admin\/crm(\/|$)/.test(callbackUrl));
    if (allowed) redirect(callbackUrl);
  }

  redirect(homePathForRole(role, locale));
}
