import { Resend } from "resend";
import { sendChecked } from "@/lib/email/provider";
import { AgentAssignedEmail } from "@/emails/AgentAssigned";

function resolveLeadUrl(leadId: string, locale: string): string {
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://logivisa.com").replace(/\/$/, "");
  const prefix = locale === "en" ? "" : `/${locale}`;
  return `${baseUrl}${prefix}/agent/lead/${leadId}`;
}

/**
 * NEVER carries a client's name, email, phone or any entered detail (no consent to share exists yet): only that a lead was assigned and a link
 * to the portal. Fires the "lead assigned to you" notification -- called after a Claim (self
 * -assign from the pool) or an admin Assign. Never throws: a missing API key
 * or a send failure is logged and swallowed so the DB write that already
 * succeeded is never rolled back or surfaced as a user-facing error over an
 * email that can be resent manually.
 */
export async function sendAgentAssignedEmail(params: {
  agentEmail: string;
  agentName?: string | null;
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

    await sendChecked("agent_assignment", resend, {
      from: fromEmail,
      to: [params.agentEmail],
      subject: "A lead has been assigned to you - LogiVisa CRM",
      react: AgentAssignedEmail({
        agentName: params.agentName,
        leadUrl: resolveLeadUrl(params.leadId, params.locale || "en"),
      }),
    });
  } catch (error) {
    console.error("[agent-notifications] Failed to send assignment email (non-blocking):", error);
  }
}

/**
 * After a referred client has PAID: tells the approved agent that a referred client bought a report and where to see the commission. Carries NO client
 * details (no name, email, phone, reference of the person): the portal shows the sale by reference only, until the client's consent exists.
 * Never throws; never called before payment.
 */
export async function sendAgentReferralPurchaseEmail(params: { agentEmail: string; agentName?: string | null; locale?: string }): Promise<void> {
  if (!params.agentEmail) return;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[agent-notifications] referral purchase email NOT sent: reason=resend_api_key_missing");
    return;
  }
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://logivisa.com").replace(/\/$/, "");
  const prefix = !params.locale || params.locale === "en" ? "" : `/${params.locale}`;
  try {
    await sendChecked("agent_referral_purchase", new Resend(apiKey), {
      from: "LogiVisa <noreply@logivisa.com>",
      to: [params.agentEmail],
      subject: "A client you referred has purchased a report - LogiVisa",
      text: [
        `Hi ${params.agentName?.trim() || "there"},`,
        "",
        "A client who came through your referral link has purchased a Visa Information Report.",
        "Your commission is recorded in the agent portal. Client details are not shown to agents until the client has agreed to share them.",
        "",
        `${baseUrl}${prefix}/agent/earnings`,
      ].join("\n"),
    });
  } catch (error) {
    console.error("[agent-notifications] referral purchase email NOT sent: reason=provider_error", error);
  }
}
