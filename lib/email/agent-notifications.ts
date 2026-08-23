import { Resend } from "resend";
import { AgentAssignedEmail } from "@/emails/AgentAssigned";

function resolveLeadUrl(leadId: string, locale: string): string {
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://logivisa.com").replace(/\/$/, "");
  const prefix = locale === "en" ? "" : `/${locale}`;
  return `${baseUrl}${prefix}/agent/lead/${leadId}`;
}

/**
 * Fires the "lead assigned to you" notification -- called after a Claim (self
 * -assign from the pool) or an admin Assign. Never throws: a missing API key
 * or a send failure is logged and swallowed so the DB write that already
 * succeeded is never rolled back or surfaced as a user-facing error over an
 * email that can be resent manually.
 */
export async function sendAgentAssignedEmail(params: {
  agentEmail: string;
  agentName?: string | null;
  leadName: string;
  status: string;
  leadId: string;
  locale?: string;
}): Promise<void> {
  if (!params.agentEmail) return;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[agent-notifications] RESEND_API_KEY missing; skipping assignment email for", params.agentEmail);
    return;
  }

  try {
    const resend = new Resend(apiKey);
    // Hardcoded, not read from FROM_EMAIL -- this sender must never fall
    // back to Resend's default onboarding@resend.dev under any circumstance,
    // including a misconfigured/unset FROM_EMAIL env var.
    const fromEmail = "LogiVisa <noreply@logivisa.com>";

    await resend.emails.send({
      from: fromEmail,
      to: [params.agentEmail],
      subject: `🎯 New Lead Assigned: ${params.leadName} - LogiVisa CRM`,
      react: AgentAssignedEmail({
        agentName: params.agentName,
        leadName: params.leadName,
        status: params.status,
        leadUrl: resolveLeadUrl(params.leadId, params.locale || "en"),
      }),
    });
  } catch (error) {
    console.error("[agent-notifications] Failed to send assignment email (non-blocking):", error);
  }
}
