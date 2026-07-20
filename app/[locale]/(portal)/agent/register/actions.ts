"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";

export type RegisterState = { error?: string };

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Public self-registration for agent candidates (proxy.ts excludes this
 * route from the AGENT auth gate -- candidates aren't in the system yet).
 * Creates a role=AGENT account with approvalStatus="PENDING" -- it can sign
 * in immediately, but /agent/pool and /agent/dashboard show a pending
 * notice instead of real content (metrics, referral link) until an admin
 * approves it from /admin/crm/agent/[id].
 */
export async function registerAgentAction(
  locale: string,
  _prev: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const phone = String(formData.get("phone") ?? "").trim();
  const companyName = String(formData.get("companyName") ?? "").trim();

  if (!name) return { error: "Full name is required." };
  if (!email || !EMAIL_REGEX.test(email)) return { error: "Enter a valid email address." };
  if (!password || password.length < 8) return { error: "Password must be at least 8 characters." };

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return { error: "An account with this email already exists. Try signing in instead." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      name,
      email,
      password: passwordHash,
      phone: phone || null,
      companyName: companyName || null,
      role: "AGENT",
      market: "GLOBAL",
      approvalStatus: "PENDING",
    },
  });

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      // Account was created successfully; sign-in failing right after is
      // unexpected but not fatal -- send them to the login page instead of
      // erroring out on a registration that actually succeeded.
      redirect(`${locale === "en" ? "" : `/${locale}`}/login`);
    }
    throw error;
  }

  const prefix = locale === "en" ? "" : `/${locale}`;
  redirect(`${prefix}/agent/pool`);
}
