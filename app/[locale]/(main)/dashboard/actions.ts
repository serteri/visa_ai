"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

// ─── Saved calculations ────────────────────────────────────────────────────────

export type CalculationData = {
  visaSubclass?: string;
  totalPoints: number;
  breakdown: Record<string, unknown>;
};

export async function saveCalculation(data: CalculationData): Promise<{ id: string }> {
  const userId = await requireUserId();
  const row = await prisma.savedCalculation.create({
    data: {
      userId,
      visaSubclass: data.visaSubclass ?? null,
      totalPoints: data.totalPoints,
      breakdown: data.breakdown as object,
    },
  });
  revalidatePath("/dashboard/points");
  return { id: row.id };
}

export async function deleteCalculation(id: string): Promise<void> {
  const userId = await requireUserId();
  await prisma.savedCalculation.deleteMany({
    where: { id, userId },
  });
  revalidatePath("/dashboard/points");
}

// ─── Saved quiz results ────────────────────────────────────────────────────────

export type QuizResultData = {
  score: number;
  readinessLevel: string;
  answers: string[];
  recommendations: string[];
};

export async function saveQuizResult(data: QuizResultData): Promise<{ id: string }> {
  const userId = await requireUserId();
  const row = await prisma.savedQuizResult.create({
    data: {
      userId,
      score: data.score,
      readinessLevel: data.readinessLevel,
      answers: data.answers,
      recommendations: data.recommendations,
    },
  });
  revalidatePath("/dashboard/quiz");
  return { id: row.id };
}

export async function deleteQuizResult(id: string): Promise<void> {
  const userId = await requireUserId();
  await prisma.savedQuizResult.deleteMany({
    where: { id, userId },
  });
  revalidatePath("/dashboard/quiz");
}

// ─── Saved reports ─────────────────────────────────────────────────────────────

export type ReportData = {
  reportType?: string;
  reportUrl?: string;
  reportData?: Record<string, unknown>;
  language?: string;
};

export async function saveReport(data: ReportData): Promise<{ id: string }> {
  const userId = await requireUserId();
  const row = await prisma.savedReport.create({
    data: {
      userId,
      reportType: data.reportType ?? "full_check",
      reportUrl: data.reportUrl ?? null,
      reportData: (data.reportData ?? Prisma.JsonNull) as Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue,
      language: data.language ?? "en",
    },
  });
  revalidatePath("/dashboard/reports");
  return { id: row.id };
}

// ─── Visa tracking ─────────────────────────────────────────────────────────────

import type { VisaTrackingStatus } from "./types";

export type VisaTrackingData = {
  visaSubclass: string;
  status?: VisaTrackingStatus;
  notes?: string;
  targetDate?: string;
};

export async function addVisaTracking(data: VisaTrackingData): Promise<void> {
  const userId = await requireUserId();
  await prisma.visaTracking.create({
    data: {
      userId,
      visaSubclass: data.visaSubclass,
      status: data.status ?? "planning",
      notes: data.notes ?? null,
      targetDate: data.targetDate ? new Date(data.targetDate) : null,
    },
  });
  revalidatePath("/dashboard/visa-tracker");
}

export async function updateVisaTracking(
  id: string,
  data: Partial<VisaTrackingData>
): Promise<void> {
  const userId = await requireUserId();
  await prisma.visaTracking.updateMany({
    where: { id, userId },
    data: {
      ...(data.status !== undefined && { status: data.status }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.targetDate !== undefined && {
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
      }),
    },
  });
  revalidatePath("/dashboard/visa-tracker");
}

export async function deleteVisaTracking(id: string): Promise<void> {
  const userId = await requireUserId();
  await prisma.visaTracking.deleteMany({
    where: { id, userId },
  });
  revalidatePath("/dashboard/visa-tracker");
}
