import { prisma } from "@/lib/prisma";
import type { Locale, ReadinessInput, ReadinessReport } from "@/lib/readiness/types";

export type CreateUserReportInput = {
  fullName?: string;
  email: string;
  preferredPath?: string;
  source: string;
  locale: Locale;
  leadScore?: number;
  leadTier?: string;
  /** Points-based internal lead tier ("Hot" | "Warm" | "Cold") — distinct from leadTier above. */
  pointsTier?: string;
  report: ReadinessReport;
  input: ReadinessInput;
  ipAddress?: string;
  /** Affiliate/referral auto-assignment -- set when the visitor arrived via
   *  an agent's ?ref=<agentId> link (see full-check/actions.ts). */
  agentId?: string;
  assignedViaRef?: boolean;
};

export type UnlockMethod = "payment" | "lead_capture" | "beta_free";

function paymentStatusForMethod(method: UnlockMethod): string {
  if (method === "payment") return "paid";
  if (method === "beta_free") return "beta_free";
  return "lead_captured";
}

export async function createUserReport(input: CreateUserReportInput): Promise<{ id: string }> {
  const reportId = crypto.randomUUID();

  const row = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `
      INSERT INTO user_reports (
        id,
        full_name,
        email,
        preferred_path,
        source,
        locale,
        lead_score,
        lead_tier,
        points_tier,
        payment_status,
        report_json,
        input_json,
        ip_address,
        agent_id,
        assigned_via_ref
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',$10::jsonb,$11::jsonb,$12,$13,$14)
      RETURNING id
    `,
    reportId,
    input.fullName ?? null,
    input.email,
    input.preferredPath ?? null,
    input.source,
    input.locale,
    input.leadScore ?? null,
    input.leadTier ?? null,
    input.pointsTier ?? null,
    JSON.stringify(input.report),
    JSON.stringify(input.input),
    input.ipAddress ?? null,
    input.agentId ?? null,
    input.assignedViaRef ?? false
  );

  return { id: row[0].id };
}

export async function markInternalLeadEmailSent(reportId: string): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE user_reports SET internal_lead_email_sent = TRUE WHERE id::text = $1::text`,
    reportId
  );
}

export async function getUserReportById(reportId: string): Promise<{
  id: string;
  email: string;
  locale: string;
  report: ReadinessReport;
  input: ReadinessInput;
  agentId: string | null;
  isUnlocked: boolean;
  fullName: string | null;
} | null> {
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      email: string;
      locale: string;
      report_json: ReadinessReport;
      input_json: ReadinessInput;
      agent_id: string | null;
      is_unlocked: boolean;
      full_name: string | null;
    }>
  >(
    `SELECT id, email, locale, report_json, input_json, agent_id, is_unlocked, full_name FROM user_reports WHERE id::text = $1::text LIMIT 1`,
    reportId
  );

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    locale: row.locale,
    report: row.report_json,
    input: row.input_json,
    agentId: row.agent_id,
    isUnlocked: row.is_unlocked,
    fullName: row.full_name,
  };
}

/**
 * Marks pdf_sent without touching unlock_method/payment_status/is_unlocked --
 * for callers (checkout free-promo grant, Stripe webhook) that already set
 * those themselves via their own atomic UPDATE and just need to record that
 * the PDF/email step (see lib/services/report-service.ts) also succeeded.
 */
export async function markReportPdfSent(reportId: string): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE user_reports SET pdf_sent = TRUE WHERE id::text = $1::text`,
    reportId
  );
}

export async function markUserReportUnlocked(input: {
  reportId: string;
  email: string;
  phone?: string;
  unlockMethod: UnlockMethod;
  pdfSent: boolean;
}): Promise<void> {
  await prisma.$executeRawUnsafe(
    `
      UPDATE user_reports
      SET
        email = $1,
        phone = $2,
        unlock_method = $3,
        payment_status = $4,
        is_unlocked = TRUE,
        pdf_sent = $5,
        unlocked_at = NOW()
      WHERE id::text = $6::text
    `,
    input.email,
    input.phone ?? null,
    input.unlockMethod,
    paymentStatusForMethod(input.unlockMethod),
    input.pdfSent,
    input.reportId
  );
}
