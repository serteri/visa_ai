"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";

import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";

export type RegisterState = { error?: string };

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// confirmPassword only ever exists to prove the two fields match -- it's
// validated here and then discarded; nothing downstream (the User.create
// below) ever sees or persists it.
// Mirrored client-side in register-form.tsx's PASSWORD_RULES for the live
// checklist -- keep both in sync if a rule changes.
const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Full name is required."),
    email: z.string().trim().toLowerCase().regex(EMAIL_REGEX, "Enter a valid email address."),
    password: z
      .string()
      .min(10, "Password must be at least 10 characters.")
      .regex(/[A-Z]/, "Password must contain at least 1 uppercase letter.")
      .regex(/[a-z]/, "Password must contain at least 1 lowercase letter.")
      .regex(/[0-9]/, "Password must contain at least 1 number.")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least 1 special character."),
    confirmPassword: z.string(),
    phone: z.string().trim().optional().default(""),
    companyName: z.string().trim().optional().default(""),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

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
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    phone: formData.get("phone"),
    companyName: formData.get("companyName"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please fix the highlighted fields." };
  }

  const { name, email, password, phone, companyName } = parsed.data;

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
