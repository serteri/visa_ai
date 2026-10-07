import { Resend } from "resend";
import { sendChecked } from "@/lib/email/provider";
import { LEAD_MAGNETS, PDF_SLUGS, leadMagnetBySlug, pick } from "@/lib/lead-magnets";

// The slugs and names live in lib/lead-magnets.ts (one registry for the modals, the API, this email and the tests); both the free
// lead-capture path (app/api/pdf-download/route.ts) and the paid Stripe fulfillment path (app/api/webhooks/stripe/route.ts) resolve the
// file through it, so they can never drift on which file maps to which product.
export { PDF_SLUGS };

// CRM lead-source bucket for each guide slug.
export const PDF_LEAD_CATEGORY: Record<string, string> = Object.fromEntries(Object.values(LEAD_MAGNETS).map((m) => [m.slug, m.category]));

function displayNameForSlug(slug: string, locale: string): string {
  return pick(leadMagnetBySlug(slug).name, locale);
}

export type { PdfProduct } from "@/lib/lead-magnets";

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
  /** True only when the provider ACCEPTED the message (it returned an id and no error). */
  sent: boolean;
  pdfUrl: string;
  /** The provider's message id when accepted. */
  messageId?: string;
  /** Set when sent is false: "not_configured" | "provider_error" | "exception". */
  skippedReason?: string;
  /** The provider's own error text (no address in it), for the server log. */
  errorMessage?: string;
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

type EmailCopy = { greeting: (n: string) => string; intro: (d: string) => string; button: (d: string) => string; fallback: string; sign: string; subject: (d: string) => string; reply: string };
const COPY: Record<"en" | "tr" | "zh", EmailCopy> = {
  en: {
    greeting: (n) => `Hi ${n},`,
    intro: (d) => `Thanks for requesting the ${d}. You can download it with the button below.`,
    button: (d) => `Download: ${d}`,
    fallback: "If the button does not work, copy and paste this link into your browser:",
    sign: "The LogiVisa Team",
    subject: (d) => `Your download: ${d}`,
    reply: "If the link does not work, reply to this email and we will resend it.",
  },
  tr: {
    greeting: (n) => `Merhaba ${n},`,
    intro: (d) => `${d} talebiniz için teşekkürler. Aşağıdaki düğmeyle indirebilirsiniz.`,
    button: (d) => `İndir: ${d}`,
    fallback: "Düğme çalışmazsa bu bağlantıyı tarayıcınıza yapıştırın:",
    sign: "LogiVisa Ekibi",
    subject: (d) => `İndirmeniz: ${d}`,
    reply: "Bağlantı çalışmazsa bu e-postayı yanıtlayın, yeniden gönderelim.",
  },
  zh: {
    greeting: (n) => `${n}，您好：`,
    intro: (d) => `感谢您申请《${d}》。您可以通过下方按钮下载。`,
    button: (d) => `下载：${d}`,
    fallback: "如果按钮无法使用，请将此链接复制到浏览器：",
    sign: "LogiVisa 团队",
    subject: (d) => `您的下载：${d}`,
    reply: "如果链接无法打开，请回复此邮件，我们会重新发送。",
  },
};
const copyFor = (locale: string) => (locale === "tr" ? COPY.tr : locale === "zh-Hans" ? COPY.zh : COPY.en);

function buildDeliveryEmailHtml(params: { fullName: string; pdfUrl: string; displayName: string; locale: string }): string {
  const c = copyFor(params.locale);
  const safeName = escapeHtml(params.fullName);
  const safeDisplay = escapeHtml(params.displayName);
  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #18181b;">
      <p style="font-size: 20px; margin: 0 0 16px;">${c.greeting(safeName)}</p>
      <p style="font-size: 16px; line-height: 1.6; margin: 0 0 24px;">${c.intro(`<strong>${safeDisplay}</strong>`)}</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${params.pdfUrl}" style="display: inline-block; background: #4338ca; color: #ffffff; text-decoration: none; font-weight: 700; padding: 14px 28px; border-radius: 10px; font-size: 16px;">${c.button(safeDisplay)}</a>
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #3f3f46; margin: 0 0 8px;">${c.fallback}</p>
      <p style="font-size: 14px; word-break: break-all; margin: 0 0 24px;"><a href="${params.pdfUrl}" style="color: #4338ca;">${params.pdfUrl}</a></p>
      <p style="font-size: 14px; line-height: 1.6; color: #3f3f46; margin: 0;">${c.sign}</p>
    </div>
  `.trim();
}

/**
 * Pure builder for the delivery email payload — no side effects, no network. The subject, the name and the link all come from the lead
 * magnet registry, so the email always carries the file the visitor asked for.
 */
export function buildPdfDeliveryEmail(params: { fullName: string; email: string; slug: string; locale?: string }): PdfDeliveryEmail {
  const locale = params.locale ?? "en";
  const pdfUrl = resolvePdfUrl(params.slug);
  const displayName = displayNameForSlug(params.slug, locale);
  const c = copyFor(locale);
  const fromEmail = process.env.FROM_EMAIL || "LogiVisa <noreply@logivisa.com>";

  return {
    from: fromEmail,
    to: [params.email],
    subject: c.subject(displayName),
    html: buildDeliveryEmailHtml({ fullName: params.fullName, pdfUrl, displayName, locale }),
    text: [c.greeting(params.fullName), "", c.intro(displayName), pdfUrl, "", c.reply, "", c.sign].join("\n"),
    pdfUrl,
  };
}

/**
 * Emails the file's download link and reports what the provider answered. Never throws.
 *
 * The Resend SDK (v6) does NOT throw on a rejected send: it resolves with `{ data, error }`. The previous implementation ignored `error`,
 * so a rejected message (unverified domain, invalid recipient, rate limit, suppressed recipient) was reported as sent. `sent` is true here
 * only when `error` is empty and a message id came back.
 */
export async function sendPdfDeliveryEmail(params: {
  fullName: string;
  email: string;
  slug: string;
  locale?: string;
}): Promise<PdfDeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const built = buildPdfDeliveryEmail(params);

  if (!apiKey) {
    console.warn("[pdf-delivery] RESEND_API_KEY missing; the delivery email was not sent", built.pdfUrl);
    return { sent: false, pdfUrl: built.pdfUrl, skippedReason: "not_configured" };
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: built.from,
      to: built.to,
      subject: built.subject,
      html: built.html,
      text: built.text,
    });
    if (error || !data?.id) {
      console.error("[pdf-delivery] provider rejected the delivery email", { slug: params.slug, name: error?.name, message: error?.message });
      return { sent: false, pdfUrl: built.pdfUrl, skippedReason: "provider_error", errorMessage: error?.message ?? "no message id returned" };
    }
    console.info("[pdf-delivery] delivery email accepted by the provider", { slug: params.slug, messageId: data.id });
    return { sent: true, pdfUrl: built.pdfUrl, messageId: data.id };
  } catch (error) {
    console.error("[pdf-delivery] delivery email threw", error);
    return { sent: false, pdfUrl: built.pdfUrl, skippedReason: "exception", errorMessage: error instanceof Error ? error.message : String(error) };
  }
}

/** The internal "new lead" notice for a lead-magnet request. Throws on a provider rejection (the caller treats it as non-blocking). */
export async function sendPdfLeadAdminEmail(params: {
  fullName: string;
  email: string;
  phone: string;
  slug: string;
  category: string;
  delivered: boolean;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const notificationEmail = process.env.PDF_LEAD_NOTIFICATION_EMAIL || "serter@logivisa.com";
  if (!apiKey) {
    console.warn("[email] pdf_lead_admin_notification not sent: RESEND_API_KEY is not configured");
    return;
  }
  await sendChecked("pdf_lead_admin_notification", new Resend(apiKey), {
    from: process.env.FROM_EMAIL || "LogiVisa <noreply@logivisa.com>",
    to: [notificationEmail],
    subject: `🚀 New Lead: PDF Guide Download [${params.category}]`,
    text: [
      "A new PDF guide lead has been captured.",
      "",
      `Category: ${params.category}`,
      `Name: ${params.fullName}`,
      `Email: ${params.email}`,
      `Phone: ${params.phone || "-"}`,
      `Guide: ${params.slug}`,
      `Delivery email accepted by the provider: ${params.delivered ? "yes" : "NO (the visitor was shown the download link)"}`,
    ].join("\n"),
  });
}
