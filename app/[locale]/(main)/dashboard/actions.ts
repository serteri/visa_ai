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
  country?: "AU" | "CA";
  configVersion?: string;
  visaSubclass?: string;
  totalPoints: number;
  breakdown: Record<string, unknown>;
};

export async function saveCalculation(data: CalculationData): Promise<{ id: string }> {
  const userId = await requireUserId();
  const row = await prisma.savedCalculation.create({
    data: {
      userId,
      country: data.country ?? "AU",
      configVersion: data.configVersion ?? null,
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

// ─── Visa journey (Timeline/Stepper) ───────────────────────────────────────────

import { getVisaStages, isVisaStage, isVisaType, nextVisaStage, progressForStage } from "@/lib/constants/visa-stages";
import { isMissingColumnError } from "@/lib/db/missing-relation";

/** Creates a new journey for the signed-in user, starting at the first stage
 *  of whichever stage sequence applies to this visaType (see
 *  getVisaStages). visaType must be one of VALID_VISA_TYPES -- the
 *  StartJourneyForm dropdown (components/dashboard/journey-timeline.tsx) is
 *  the only caller, and free-text visa types are no longer accepted so that
 *  the per-subclass stage list (e.g. 189 skipping STATE_SPONSORSHIP) can be
 *  resolved reliably from this value alone. */
export async function startVisaJourney(visaType: string): Promise<{ id: string }> {
  const userId = await requireUserId();
  const trimmed = visaType.trim();
  if (!isVisaType(trimmed)) throw new Error("Select a valid visa type.");

  const stages = getVisaStages(trimmed);
  const firstStage = stages[0];
  const row = await prisma.visaJourney.create({
    data: {
      userId,
      visaType: trimmed,
      currentStage: firstStage,
      progressPercentage: progressForStage(firstStage, stages),
    },
  });
  revalidatePath("/dashboard");
  return { id: row.id };
}

/**
 * Advances a journey to the next stage (per that journey's own visaType --
 * see getVisaStages in lib/constants/visa-stages.ts) and recomputes
 * progressPercentage to match. Also stamps stageTimestamps[currentStage]
 * with the moment it was marked complete, since stageStatus() only derives
 * PENDING/IN_PROGRESS/COMPLETED from position and has nowhere else to keep
 * a "completed on" date. Scoped by userId in the `where` clause --
 * updateMany + a 0-row result (rather than update()'s throw-on-not-found)
 * is how this stays silent-safe against a stale client trying to advance a
 * journey it no longer owns, matching the ownership-check pattern already
 * used by updateVisaTracking/deleteVisaTracking above.
 */
export async function updateJourneyStage(journeyId: string): Promise<void> {
  const userId = await requireUserId();

  const journey = await prisma.visaJourney.findFirst({
    where: { id: journeyId, userId },
    select: { currentStage: true, visaType: true },
  });
  if (!journey) throw new Error("Journey not found");
  if (!isVisaStage(journey.currentStage)) {
    throw new Error(`Unrecognized stage "${journey.currentStage}" -- cannot advance`);
  }

  const stages = getVisaStages(journey.visaType);
  const next = nextVisaStage(journey.currentStage, stages);
  const baseData = next
    ? { currentStage: next, progressPercentage: progressForStage(next, stages) }
    : {}; // already at the last stage -- nothing to advance to, but still stamp its completion below

  // Best-effort stage-completion timestamp -- degrades to advancing the
  // stage without one if the live DB hasn't been migrated for the
  // stageTimestamps column yet (see CLAUDE.md: `prisma db push` is never run
  // against production without reviewing its output first).
  try {
    const current = await prisma.visaJourney.findFirst({
      where: { id: journeyId, userId },
      select: { stageTimestamps: true },
    });
    const existing =
      current?.stageTimestamps &&
      typeof current.stageTimestamps === "object" &&
      !Array.isArray(current.stageTimestamps)
        ? (current.stageTimestamps as Record<string, string>)
        : {};
    const stageTimestamps = { ...existing, [journey.currentStage]: new Date().toISOString() };

    await prisma.visaJourney.updateMany({
      where: { id: journeyId, userId },
      data: { ...baseData, stageTimestamps },
    });
  } catch (error) {
    if (!isMissingColumnError(error, "stage_timestamps")) throw error;
    console.warn("[updateJourneyStage] stage_timestamps column missing; advancing stage without a timestamp.");
    await prisma.visaJourney.updateMany({
      where: { id: journeyId, userId },
      data: baseData,
    });
  }

  revalidatePath("/dashboard");
}

/** Alias for updateJourneyStage -- there's no separate per-stage status
 *  column to update (see stageStatus() in lib/constants/visa-stages.ts:
 *  status is derived from position relative to currentStage, not stored),
 *  so "advance the stage" and "mark the current stage's status as
 *  COMPLETED and move on" are the same operation. Exported under both names
 *  since journey-timeline.tsx's "Mark as Completed" button is conceptually
 *  a status change even though it's implemented as an advance. */
export const updateJourneyStageStatus = updateJourneyStage;

/** Deletes a visa journey and all of its documents (VisaDocument.journeyId
 *  has onDelete: Cascade -- see prisma/schema.prisma), after confirmation in
 *  the UI (journey-timeline.tsx's delete AlertDialog). Ownership-scoped the
 *  same way as updateJourneyStage above -- deleteMany + a 0-row result
 *  rather than delete()'s throw-on-not-found, so a stale client can't probe
 *  for another user's journey id via the error response. */
export async function deleteVisaJourney(journeyId: string): Promise<void> {
  const userId = await requireUserId();
  await prisma.visaJourney.deleteMany({ where: { id: journeyId, userId } });
  revalidatePath("/dashboard");
}

// ─── Visa journey documents (Document Vault upload) ────────────────────────────

import { randomUUID } from "crypto";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getS3BucketName, getS3Client } from "@/lib/aws/s3";
import { isVisaDocumentType } from "@/lib/constants/visa-documents";

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024; // 10MB, matching /api/document-analyze's limit
const ALLOWED_DOCUMENT_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const PRESIGNED_URL_TTL_SECONDS = 15 * 60; // 15 minutes

export type UploadVisaDocumentResult = { error?: string; document?: { id: string; status: string } };

/**
 * Uploads one document for a journey stage to a private S3 bucket and
 * upserts the matching VisaDocument row (one row per journey+stage+
 * documentType -- a re-upload replaces the previous object rather than
 * creating a duplicate row, since JourneyTimeline renders at most one row
 * per expected document type). Ownership is enforced by re-checking the
 * journey belongs to the signed-in user before touching S3 or the DB --
 * never trust journeyId alone. Never returns a browsable URL: the bucket is
 * private, so viewing goes through getSecureDocumentUrlAction below.
 */
export async function uploadVisaDocument(
  journeyId: string,
  stage: string,
  documentType: string,
  file: File
): Promise<UploadVisaDocumentResult> {
  const userId = await requireUserId();

  if (!isVisaStage(stage) || !isVisaDocumentType(documentType)) {
    return { error: "Invalid stage or document type." };
  }

  const journey = await prisma.visaJourney.findFirst({ where: { id: journeyId, userId }, select: { id: true } });
  if (!journey) return { error: "Journey not found." };

  if (!file || file.size === 0) return { error: "No file selected." };
  if (file.size > MAX_DOCUMENT_BYTES) return { error: "File is too large (max 10MB)." };
  if (!ALLOWED_DOCUMENT_TYPES.has(file.type)) {
    return { error: "Unsupported file type. Upload a PDF, JPG, PNG, or WEBP." };
  }

  const extension = file.name.split(".").pop() || "bin";
  const objectKey = `journeys/${journeyId}/${stage}/${randomUUID()}-${documentType}.${extension}`;

  let bucket: string;
  try {
    bucket = getS3BucketName();
    const buffer = Buffer.from(await file.arrayBuffer());
    await getS3Client().send(
      new PutObjectCommand({ Bucket: bucket, Key: objectKey, Body: buffer, ContentType: file.type })
    );
  } catch (error) {
    console.error("[uploadVisaDocument] S3 upload failed:", error);
    return { error: "Upload failed. Please try again." };
  }

  const existing = await prisma.visaDocument.findFirst({
    where: { journeyId, stage, documentType },
    select: { id: true, fileKey: true },
  });

  const document = existing
    ? await prisma.visaDocument.update({
        where: { id: existing.id },
        data: { fileKey: objectKey, status: "PENDING", aiFeedback: null },
        select: { id: true, status: true },
      })
    : await prisma.visaDocument.create({
        data: { journeyId, stage, documentType, fileKey: objectKey, status: "PENDING" },
        select: { id: true, status: true },
      });

  // Best-effort cleanup of the replaced object -- never fails the upload
  // that already succeeded above (the new DB row/status is what matters).
  if (existing?.fileKey && existing.fileKey !== objectKey) {
    try {
      await getS3Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: existing.fileKey }));
    } catch (error) {
      console.error("[uploadVisaDocument] Failed to delete replaced S3 object (non-blocking):", error);
    }
  }

  revalidatePath("/dashboard");
  return { document };
}

export type SecureDocumentUrlResult = { error?: string; url?: string };

/**
 * Resolves a VisaDocument to a short-lived (15 minute) pre-signed GetObject
 * URL -- the only way to view a Document Vault file, since the S3 bucket is
 * private. Authorization: currently only the journey's own owner (the
 * signed-in consumer) can view their documents -- VisaJourney has no
 * agent/report linkage yet, so there is no legitimate AGENT/ADMIN access
 * path to check against today. If/when a journey is linked to a CRM lead
 * (UserReport) or an assigned agent, extend the `where` clause below rather
 * than trusting a role claim alone -- re-verify ownership/assignment against
 * the DB on every call, exactly as done here.
 */
export async function getSecureDocumentUrlAction(documentId: string): Promise<SecureDocumentUrlResult> {
  const userId = await requireUserId();

  const document = await prisma.visaDocument.findFirst({
    where: { id: documentId, journey: { userId } },
    select: { fileKey: true },
  });
  if (!document) return { error: "Document not found." };
  if (!document.fileKey) return { error: "No file has been uploaded for this document yet." };

  try {
    const command = new GetObjectCommand({ Bucket: getS3BucketName(), Key: document.fileKey });
    const url = await getSignedUrl(getS3Client(), command, { expiresIn: PRESIGNED_URL_TTL_SECONDS });
    return { url };
  } catch (error) {
    console.error("[getSecureDocumentUrlAction] Failed to generate pre-signed URL:", error);
    return { error: "Could not generate a secure link. Please try again." };
  }
}
