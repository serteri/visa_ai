"use server";

import bcrypt from "bcryptjs";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";

export type RegisterResult =
  | { success: true }
  | { success: false; error: string };

export async function registerUser(formData: FormData): Promise<RegisterResult> {
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (!name || !email || !password) {
    return { success: false, error: "All fields are required." };
  }
  if (password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { success: false, error: "Passwords do not match." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { success: false, error: "An account with that email already exists." };
  }

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { name, email, password: hashed },
  });

  await signIn("credentials", { email, password, redirect: false });
  return { success: true };
}
