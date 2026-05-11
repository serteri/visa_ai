"use server";

import { auth } from "@/auth";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import {
  savedCalculations,
  savedQuizResults,
  savedReports,
  visaTracking,
  userProfiles,
} from "@/db/schema";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

// ─── User profile ──────────────────────────────────────────────────────────────

export async function upsertUserProfile(data: {
  email: string;
  name?: string;
}): Promise<void> {
  const userId = await requireUserId();
  await db
    .insert(userProfiles)
    .values({
      user_id: userId,
      email: data.email,
      name: data.name ?? null,
      updated_at: new Date(),
    })
    .onConflictDoUpdate({
      target: userProfiles.user_id,
      set: {
        email: data.email,
        name: data.name ?? null,
        updated_at: new Date(),
      },
    });
}

// ─── Saved calculations ────────────────────────────────────────────────────────

export type CalculationData = {
  visaSubclass?: string;
  totalPoints: number;
  breakdown: Record<string, unknown>;
};

export async function saveCalculation(data: CalculationData): Promise<{ id: string }> {
  const userId = await requireUserId();
  const [row] = await db
    .insert(savedCalculations)
    .values({
      user_id: userId,
      visa_subclass: data.visaSubclass ?? null,
      total_points: data.totalPoints,
      breakdown: data.breakdown,
    })
    .returning({ id: savedCalculations.id });
  revalidatePath("/dashboard/points");
  return { id: row.id };
}

export async function deleteCalculation(id: string): Promise<void> {
  const userId = await requireUserId();
  await db
    .delete(savedCalculations)
    .where(
      and(
        eq(savedCalculations.id, id),
        eq(savedCalculations.user_id, userId)
      )
    );
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
  const [row] = await db
    .insert(savedQuizResults)
    .values({
      user_id: userId,
      score: data.score,
      readiness_level: data.readinessLevel,
      answers: data.answers,
      recommendations: data.recommendations,
    })
    .returning({ id: savedQuizResults.id });
  revalidatePath("/dashboard/quiz");
  return { id: row.id };
}

export async function deleteQuizResult(id: string): Promise<void> {
  const userId = await requireUserId();
  await db
    .delete(savedQuizResults)
    .where(
      and(
        eq(savedQuizResults.id, id),
        eq(savedQuizResults.user_id, userId)
      )
    );
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
  const [row] = await db
    .insert(savedReports)
    .values({
      user_id: userId,
      report_type: data.reportType ?? "full_check",
      report_url: data.reportUrl ?? null,
      report_data: data.reportData ?? null,
      language: data.language ?? "en",
    })
    .returning({ id: savedReports.id });
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
  await db.insert(visaTracking).values({
    user_id: userId,
    visa_subclass: data.visaSubclass,
    status: data.status ?? "planning",
    notes: data.notes ?? null,
    target_date: data.targetDate ?? null,
  });
  revalidatePath("/dashboard/visa-tracker");
}

export async function updateVisaTracking(
  id: string,
  data: Partial<VisaTrackingData>
): Promise<void> {
  const userId = await requireUserId();
  await db
    .update(visaTracking)
    .set({
      ...(data.status !== undefined && { status: data.status }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.targetDate !== undefined && { target_date: data.targetDate }),
      updated_at: new Date(),
    })
    .where(
      and(
        eq(visaTracking.id, id),
        eq(visaTracking.user_id, userId)
      )
    );
  revalidatePath("/dashboard/visa-tracker");
}

export async function deleteVisaTracking(id: string): Promise<void> {
  const userId = await requireUserId();
  await db
    .delete(visaTracking)
    .where(
      and(
        eq(visaTracking.id, id),
        eq(visaTracking.user_id, userId)
      )
    );
  revalidatePath("/dashboard/visa-tracker");
}
