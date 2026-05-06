import "server-only";

import { createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const ADMIN_SESSION_COOKIE = "logivisa_admin_session";

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function getAdminPassword(): string {
  return process.env.ADMIN_DASHBOARD_PASSWORD?.trim() ?? "";
}

function getAdminSessionToken(): string {
  const password = getAdminPassword();
  const secret = process.env.ADMIN_DASHBOARD_SECRET?.trim() || "logivisa-admin";
  return hashValue(`${password}:${secret}`);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const password = getAdminPassword();
  if (!password) return false;

  const cookieStore = await cookies();
  const currentToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!currentToken) return false;

  return safeEqual(currentToken, getAdminSessionToken());
}

export async function setAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, getAdminSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export async function logoutAdmin(): Promise<never> {
  await clearAdminSession();
  redirect("/");
}

export function isValidAdminPassword(candidate: string): boolean {
  const password = getAdminPassword();
  if (!password) return false;
  return safeEqual(candidate, password);
}