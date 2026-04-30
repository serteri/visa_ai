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
  report: ReadinessReport;
  input: ReadinessInput;
};

export async function ensureUserReportsTable(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS user_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name TEXT,
      email TEXT NOT NULL,
      phone TEXT,
      preferred_path TEXT,
      source TEXT NOT NULL DEFAULT 'full_check',
      locale TEXT NOT NULL DEFAULT 'en',
      lead_score INT,
      lead_tier TEXT,
      payment_status TEXT NOT NULL DEFAULT 'pending',
      unlock_method TEXT,
      is_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
      pdf_sent BOOLEAN NOT NULL DEFAULT FALSE,
      report_json JSONB NOT NULL,
      input_json JSONB NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      unlocked_at TIMESTAMP
    )
  `);
}

export async function createUserReport(input: CreateUserReportInput): Promise<{ id: string }> {
  const row = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `
      INSERT INTO user_reports (
        full_name,
        email,
        preferred_path,
        source,
        locale,
        lead_score,
        lead_tier,
        payment_status,
        report_json,
        input_json
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8::jsonb,$9::jsonb)
      RETURNING id
    `,
    input.fullName ?? null,
    input.email,
    input.preferredPath ?? null,
    input.source,
    input.locale,
    input.leadScore ?? null,
    input.leadTier ?? null,
    JSON.stringify(input.report),
    JSON.stringify(input.input)
  );

  return { id: row[0].id };
}

export async function getUserReportById(reportId: string): Promise<{
  id: string;
  email: string;
  locale: string;
  report: ReadinessReport;
  input: ReadinessInput;
} | null> {
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      email: string;
      locale: string;
      report_json: ReadinessReport;
      input_json: ReadinessInput;
    }>
  >(
    `SELECT id, email, locale, report_json, input_json FROM user_reports WHERE id = $1::uuid LIMIT 1`,
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
  };
}

export async function markUserReportUnlocked(input: {
  reportId: string;
  email: string;
  phone?: string;
  unlockMethod: "payment" | "lead_capture";
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
      WHERE id = $6::uuid
    `,
    input.email,
    input.phone ?? null,
    input.unlockMethod,
    input.unlockMethod === "payment" ? "paid" : "lead_captured",
    input.pdfSent,
    input.reportId
  );
}
