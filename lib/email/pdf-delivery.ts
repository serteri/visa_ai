import { Resend } from "resend";

// Single source of truth for the two guide slugs. Both the free lead-capture
// path (app/api/pdf-download/route.ts) and the paid Stripe fulfillment path
// (app/api/webhooks/stripe/route.ts) resolve the correct PDF through here so
// they can never drift on which file maps to which product/language.
export const PDF_SLUGS = {
  turkish: "avustralya-pr-rehberi-2026",
  global: "australia-guide-2026",
  occupation: "australia-skilled-occupation-list-2026",
} as const;

// CRM lead-source bucket for each guide slug -- the three categories the
// business classifies every PDF-download lead into.
export const PDF_LEAD_CATEGORY: Record<string, string> = {
  [PDF_SLUGS.turkish]: "Turkish Guide",
  [PDF_SLUGS.global]: "Global Guide",
  [PDF_SLUGS.occupation]: "2026 Official Occupation List",
};

// Human-readable guide name per slug, used in the delivery email copy.
const PDF_DISPLAY_NAME: Record<string, string> = {
  [PDF_SLUGS.turkish]: "Australia PR Guide 2026",
  [PDF_SLUGS.global]: "Australia Migration Blueprint",
  [PDF_SLUGS.occupation]: "2026 Official Skilled Occupation List",
};

function displayNameForSlug(slug: string): string {
  return PDF_DISPLAY_NAME[slug] ?? "Australia PR Guide 2026";
}

export type PdfProduct = keyof typeof PDF_SLUGS;

export type PdfDeliveryEmail = {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
  /** The public URL the customer is emailed — points at /{slug}.pdf. */
  pdfUrl: string;
};

export type PdfDeliveryResult = {
  sent: boolean;
  pdfUrl: string;
  /** Set when sent is false, explaining why (missing key or send failure). */
  skippedReason?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Absolute URL of the delivered guide, e.g. https://logivisa.com/australia-guide-2026.pdf */
export function resolvePdfUrl(slug: string): string {
  const appBaseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://logivisa.com").replace(/\/$/, "");
  return `${appBaseUrl}/${slug}.pdf`;
}

function buildDeliveryEmailHtml(params: { fullName: string; pdfUrl: string; displayName: string }): string {
  const safeName = escapeHtml(params.fullName);
  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #18181b;">
      <p style="font-size: 24px; margin: 0 0 16px;">👋 Hi ${safeName},</p>
      <p style="font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Thanks for requesting the <strong>${params.displayName}</strong>! We're excited to help you on
        your migration journey. Your guide is ready and waiting below.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a
          href="${params.pdfUrl}"
          style="display: inline-block; background: linear-gradient(90deg, #6366f1, #9333ea); color: #ffffff; text-decoration: none; font-weight: 700; padding: 14px 28px; border-radius: 10px; font-size: 16px;"
        >
          📘 Download Your ${params.displayName}
        </a>
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #52525b; margin: 0 0 8px;">
        If the button above doesn't work, copy and paste this link into your browser:
      </p>
      <p style="font-size: 14px; word-break: break-all; margin: 0 0 24px;">
        <a href="${params.pdfUrl}" style="color: #6366f1;">${params.pdfUrl}</a>
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #52525b; margin: 0;">
        Wishing you the best with your visa journey,<br />
        The LogiVisa Team
      </p>
    </div>
  `.trim();
}

/**
 * Pure builder for the delivery email payload — no side effects, no network.
 * Split out from sendPdfDeliveryEmail so the exact recipient/subject/PDF link
 * can be asserted in tests without actually sending.
 */
export function buildPdfDeliveryEmail(params: { fullName: string; email: string; slug: string }): PdfDeliveryEmail {
  const pdfUrl = resolvePdfUrl(params.slug);
  const displayName = displayNameForSlug(params.slug);
  // Verified sending domain — override via FROM_EMAIL once a domain is
  // verified in the Resend dashboard; falls back to the project's own
  // domain rather than Resend's shared sandbox sender.
  const fromEmail = process.env.FROM_EMAIL || "LogiVisa <noreply@logivisa.com>";

  return {
    from: fromEmail,
    to: [params.email],
    subject: `Your ${displayName} is ready 🎉`,
    html: buildDeliveryEmailHtml({ fullName: params.fullName, pdfUrl, displayName }),
    text: [
      `Hi ${params.fullName},`,
      "",
      `Thanks for requesting the ${displayName}! You can download it here:`,
      pdfUrl,
      "",
      "If the link doesn't work, just reply to this email and we'll resend it.",
      "",
      "- The LogiVisa Team",
    ].join("\n"),
    pdfUrl,
  };
}

/**
 * Emails the guide download link. Shared by the free lead-capture path and the
 * paid Stripe webhook fulfillment path. Never throws — a delivery failure is
 * logged and reported via the return value, since the caller (webhook / lead
 * capture) must still return success for the payment/lead that already landed.
 */
export async function sendPdfDeliveryEmail(params: {
  fullName: string;
  email: string;
  slug: string;
}): Promise<PdfDeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const built = buildPdfDeliveryEmail(params);

  if (!apiKey) {
    console.warn(
      "[pdf-delivery] RESEND_API_KEY missing; skipping delivery email for",
      params.email,
      "->",
      built.pdfUrl
    );
    return { sent: false, pdfUrl: built.pdfUrl, skippedReason: "RESEND_API_KEY missing" };
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: built.from,
      to: built.to,
      subject: built.subject,
      html: built.html,
      text: built.text,
    });
    return { sent: true, pdfUrl: built.pdfUrl };
  } catch (error) {
    console.error("[pdf-delivery] Failed to send delivery email", error);
    return { sent: false, pdfUrl: built.pdfUrl, skippedReason: "send error" };
  }
}
