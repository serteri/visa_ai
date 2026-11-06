/**
 * Retention clean-up: the periods stated in the privacy policy (lib/privacy/content.ts). Run by the cron route app/api/cron/retention/route.ts.
 *
 *   transactions                                  5 years
 *   contact messages                              12 months
 *   guide downloads (guide_downloads, pdf_downloads) and report entries (user_reports)   24 months
 *   chat (visitors without credits, their profiles, restore tokens and requests)   90 days
 *
 * DRY RUN BY DEFAULT: unless RETENTION_DRY_RUN is exactly "false" the run only counts the rows each rule would delete. Nothing is deleted in production until
 * the founder sets RETENTION_DRY_RUN=false in the Vercel environment.
 *
 * NOT cleaned up: `leads` and `full_check_waitlist`. Neither the code (db/schema.ts) nor the live tables have any column that says whether someone subscribed, opted
 * in or unsubscribed (checked 7 November 2026), so a 24-month rule could not tell an active subscriber from an old one. Their rows stay until a person asks for
 * deletion (scripts/delete-user-data.ts). Add a subscription column and a rule here before cleaning them.
 *
 * Chat visitors that hold a credit balance (premium_credits > 0) or are linked to an email (chat_credit_links) are never deleted: the pricing page says credits
 * never expire. Payment records (transactions) are deleted only after 5 years; deleting an old report leaves its transaction row (the link is set to NULL).
 */
import { prisma } from "@/lib/prisma";

export type RetentionRule = { id: string; table: string; where: string; description: string };

export const RETENTION_RULES: RetentionRule[] = [
  { id: "transactions", table: "transactions", where: "created_at < now() - interval '5 years'", description: "payment records older than 5 years" },
  { id: "contact_messages", table: "contact_messages", where: "created_at < now() - interval '12 months'", description: "contact messages older than 12 months" },
  { id: "guide_downloads", table: "guide_downloads", where: "created_at < now() - interval '24 months'", description: "guide downloads older than 24 months" },
  { id: "pdf_downloads", table: "pdf_downloads", where: "created_at < now() - interval '24 months'", description: "PDF downloads older than 24 months" },
  { id: "user_reports", table: "user_reports", where: "created_at < now() - interval '24 months'", description: "report entries older than 24 months" },
  { id: "chat_restore_requests", table: "chat_restore_requests", where: "created_at < now() - interval '90 days'", description: "credit-restore requests older than 90 days" },
  { id: "chat_restore_tokens", table: "chat_restore_tokens", where: "created_at < now() - interval '90 days'", description: "credit-restore tokens older than 90 days" },
  {
    id: "chat_visitor_profiles",
    table: "chat_visitor_profiles",
    where: "updated_at < now() - interval '90 days' AND visitor_id NOT IN (SELECT visitor_id FROM chat_credit_links) AND visitor_id NOT IN (SELECT id FROM chat_visitors WHERE premium_credits > 0)",
    description: "chat profile cards not updated for 90 days, for visitors with no credits and no linked email",
  },
  {
    id: "chat_visitors",
    table: "chat_visitors",
    where: "updated_at < now() - interval '90 days' AND premium_credits = 0 AND id NOT IN (SELECT visitor_id FROM chat_credit_links)",
    description: "chat visitors (with their sessions and messages) idle for 90 days, with no credits and no linked email",
  },
];

/** True unless RETENTION_DRY_RUN is exactly "false". */
export const isDryRun = (env: Record<string, string | undefined> = process.env): boolean => env.RETENTION_DRY_RUN !== "false";

export type RetentionResult = { dryRun: boolean; ranAt: string; rules: Record<string, { description: string; rows: number | "table does not exist" }> };

export async function runRetention(dryRun: boolean = isDryRun()): Promise<RetentionResult> {
  const rules: RetentionResult["rules"] = {};
  for (const rule of RETENTION_RULES) {
    const exists = (await prisma.$queryRawUnsafe<{ r: string | null }[]>(`SELECT to_regclass('public.${rule.table}')::text AS r`))[0]?.r;
    if (!exists) {
      rules[rule.id] = { description: rule.description, rows: "table does not exist" };
      continue;
    }
    if (dryRun) {
      const rows = await prisma.$queryRawUnsafe<{ n: bigint }[]>(`SELECT count(*) AS n FROM ${rule.table} WHERE ${rule.where}`);
      rules[rule.id] = { description: rule.description, rows: Number(rows[0]?.n ?? 0) };
    } else {
      rules[rule.id] = { description: rule.description, rows: Number(await prisma.$executeRawUnsafe(`DELETE FROM ${rule.table} WHERE ${rule.where}`)) };
    }
  }
  return { dryRun, ranAt: new Date().toISOString(), rules };
}
