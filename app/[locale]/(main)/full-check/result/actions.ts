"use server";

import { sendReportAccessLink } from "@/lib/services/report-service";

export type ReportLinkRequestState = { status: "idle" | "done" };

/**
 * "Email me a secure link": sends the tokenized result link to the address stored on the report (never one the
 * visitor types), for owners arriving from an older link without an access token. The answer is the same whether or
 * not anything was sent, so it reveals nothing about the report.
 */
export async function requestReportLink(_prev: ReportLinkRequestState, formData: FormData): Promise<ReportLinkRequestState> {
  const reportId = String(formData.get("reportId") ?? "").trim();
  if (reportId) await sendReportAccessLink(reportId);
  return { status: "done" };
}
