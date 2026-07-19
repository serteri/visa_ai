import { Resend } from "resend";
import { AgentAssignedEmail } from "@/emails/AgentAssigned";

function resolveLoginUrl(): string {
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://logivisa.com").replace(/\/$/, "");
  return `${baseUrl}/login`;
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
}): Promise<void> {
  if (!params.agentEmail) return;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[agent-notifications] RESEND_API_KEY missing; skipping assignment email for", params.agentEmail);
    return;
  }

  try {
    const resend = new Resend(apiKey);
    const fromEmail = process.env.FROM_EMAIL || "LogiVisa <noreply@logivisa.com>";

    await resend.emails.send({
      from: fromEmail,
      to: [params.agentEmail],
      subject: `New lead assigned: ${params.leadName}`,
      react: AgentAssignedEmail({
        agentName: params.agentName,
        leadName: params.leadName,
        status: params.status,
        loginUrl: resolveLoginUrl(),
      }),
    });
  } catch (error) {
    console.error("[agent-notifications] Failed to send assignment email (non-blocking):", error);
  }
}
