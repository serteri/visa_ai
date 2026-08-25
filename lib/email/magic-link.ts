import { Resend } from "resend";
import { MagicLinkEmail } from "@/emails/MagicLink";

/**
 * NextAuth EmailProvider's sendVerificationRequest hook -- called with the
 * already-generated, single-use callback URL (token embedded, verified
 * against the VerificationToken table by the PrismaAdapter). This function
 * only has to deliver that URL; it never generates or validates the token
 * itself. Throws on failure (unlike lib/email/agent-notifications.ts's
 * fire-and-forget pattern) since a magic-link email that silently fails to
 * send would leave the user stuck on "check your email" with nothing
 * coming -- NextAuth surfaces a thrown error here as a sign-in error page.
 */
export async function sendVerificationRequest(params: {
  identifier: string;
  url: string;
}): Promise<void> {
  const { identifier: email, url } = params;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured -- cannot send magic link email.");
  }

  const resend = new Resend(apiKey);
  // Hardcoded, not read from FROM_EMAIL -- same reasoning as
  // agent-notifications.ts: this sender must never fall back to Resend's
  // default onboarding@resend.dev.
  const fromEmail = "LogiVisa <noreply@logivisa.com>";

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: [email],
    subject: "Your secure sign-in link for LogiVisa",
    react: MagicLinkEmail({ url }),
  });

  if (error) {
    throw new Error(`Failed to send magic link email: ${error.message}`);
  }
}
