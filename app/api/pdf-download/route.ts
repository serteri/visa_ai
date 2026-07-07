import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { Resend } from "resend";
import { z } from "zod";
import { db } from "@/db";
import { pdfDownloads } from "@/db/schema";
import { eq, and, inArray, count } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Both the Turkish and Global English guides draw from a single shared free-download pool.
export const FREE_LIMIT = 18;

export const PDF_SLUGS = {
  turkish: "avustralya-pr-rehberi-2026",
  global: "australia-guide-2026",
} as const;

export type PdfProduct = keyof typeof PDF_SLUGS;

const ALL_SLUGS = Object.values(PDF_SLUGS);

function resolveSlug(value: string | null): string {
  if (value === PDF_SLUGS.global) return PDF_SLUGS.global;
  return PDF_SLUGS.turkish;
}

const pdfDownloadSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required."),
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
  phone: z.string().trim().optional().default(""),
  slug: z.string().optional(),
  termsAcceptedAt: z.string().min(1, "Terms acceptance timestamp is required."),
});

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

// GET: check current status (shared free slots remaining, already downloaded THIS slug from this IP)
export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const slug = resolveSlug(req.nextUrl.searchParams.get("slug"));

    // Shared pool: count downloads across BOTH guides against the combined free limit.
    const [totalRow] = await db
      .select({ value: count() })
      .from(pdfDownloads)
      .where(inArray(pdfDownloads.pdf_slug, ALL_SLUGS));

    const totalDownloads = Number(totalRow?.value ?? 0);
    const freeRemaining = Math.max(0, FREE_LIMIT - totalDownloads);
    const isFree = totalDownloads < FREE_LIMIT;

    // Per-slug dedup: a visitor can grab each guide once, not just one guide ever.
    const [ipRow] = await db
      .select({ value: count() })
      .from(pdfDownloads)
      .where(
        and(eq(pdfDownloads.ip_address, ip), eq(pdfDownloads.pdf_slug, slug))
      );

    const alreadyDownloaded = Number(ipRow?.value ?? 0) > 0;

    return Response.json({
      isFree,
      freeRemaining,
      totalDownloads,
      alreadyDownloaded,
      slug,
    });
  } catch (err) {
    console.error("[pdf-download GET]", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

// POST: register download + return PDF URL
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const body = await req.json();

    // Zod validation (Level 1 backend enforcement — never trust the client's
    // own inline validation alone).
    const parsed = pdfDownloadSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        {
          error: "Ad soyad ve geçerli bir e-posta adresi zorunludur.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { full_name, email, phone, slug: rawSlug, termsAcceptedAt } = parsed.data;
    const slug = resolveSlug(rawSlug ?? null);

    // Server-side enforcement of the Terms gate -- the client already blocks
    // submission without consent, but the API must not trust that alone.
    const termsDate = new Date(termsAcceptedAt);
    if (Number.isNaN(termsDate.getTime())) {
      return Response.json(
        { error: "Yasal koşulların kabul edildiği doğrulanamadı." },
        { status: 400 }
      );
    }

    // Block duplicate IPs — scoped per guide, so a visitor can claim each guide once.
    const [ipRow] = await db
      .select({ value: count() })
      .from(pdfDownloads)
      .where(
        and(eq(pdfDownloads.ip_address, ip), eq(pdfDownloads.pdf_slug, slug))
      );

    if (Number(ipRow?.value ?? 0) > 0) {
      return Response.json(
        { error: "Bu IP adresinden daha önce indirildi.", alreadyDownloaded: true },
        { status: 409 }
      );
    }

    // Check free limit — shared pool across both guides.
    const [totalRow] = await db
      .select({ value: count() })
      .from(pdfDownloads)
      .where(inArray(pdfDownloads.pdf_slug, ALL_SLUGS));

    const totalDownloads = Number(totalRow?.value ?? 0);
    const isFree = totalDownloads < FREE_LIMIT;

    if (!isFree) {
      return Response.json(
        { error: "Ücretsiz indirme kotası doldu.", paymentRequired: true },
        { status: 402 }
      );
    }

    // Save record
    const normalizedEmail = email.trim().toLowerCase();
    await db.insert(pdfDownloads).values({
      full_name: full_name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      ip_address: ip,
      pdf_slug: slug,
      is_paid: false,
      terms_accepted_at: termsDate,
    });

    revalidateTag("public-guide-download-stats", "max");

    // Delivery Trap: the guide is emailed to the user instead of being
    // returned as a direct browser download. Fired concurrently with the
    // admin notification (rather than awaited sequentially) and not awaited
    // before the response, so email delivery never blocks the UI's success
    // transition. Failures are caught individually and logged — the lead is
    // already recorded and can be re-sent manually either way.
    Promise.all([
      sendPdfDeliveryEmail({ fullName: full_name.trim(), email: normalizedEmail, slug }).catch((err) =>
        console.error("[pdf-download] Delivery email failed (non-blocking):", err)
      ),
      sendPdfLeadAdminEmail({
        fullName: full_name.trim(),
        email: normalizedEmail,
        phone: phone.trim(),
        slug,
      }).catch((err) => console.error("[pdf-download] Admin notification failed (non-blocking):", err)),
    ]);

    return Response.json({ success: true });
  } catch (err) {
    console.error("[pdf-download POST]", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildDeliveryEmailHtml(params: { fullName: string; pdfUrl: string }): string {
  const safeName = escapeHtml(params.fullName);
  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #18181b;">
      <p style="font-size: 24px; margin: 0 0 16px;">👋 Hi ${safeName},</p>
      <p style="font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Thanks for requesting the <strong>Australia PR Guide 2026</strong>! We're excited to help you on
        your migration journey. Your guide is ready and waiting below.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a
          href="${params.pdfUrl}"
          style="display: inline-block; background: linear-gradient(90deg, #6366f1, #9333ea); color: #ffffff; text-decoration: none; font-weight: 700; padding: 14px 28px; border-radius: 10px; font-size: 16px;"
        >
          📘 Download Your Australia PR Guide 2026
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

async function sendPdfDeliveryEmail(params: { fullName: string; email: string; slug: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const appBaseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://logivisa.com").replace(/\/$/, "");
  const pdfUrl = `${appBaseUrl}/${params.slug}.pdf`;

  if (!apiKey) {
    // TODO: Integrate Resend/SendGrid to email the PDF to user.email — RESEND_API_KEY is not configured.
    console.warn("[pdf-download] RESEND_API_KEY missing; skipping delivery email for", params.email);
    return;
  }

  try {
    const resend = new Resend(apiKey);
    // Verified sending domain — override via FROM_EMAIL once a domain is
    // verified in the Resend dashboard; falls back to the project's own
    // domain rather than Resend's shared sandbox sender.
    const fromEmail = process.env.FROM_EMAIL || "LogiVisa <noreply@logivisa.com>";

    await resend.emails.send({
      from: fromEmail,
      to: [params.email],
      subject: "Your Australia PR Guide 2026 is ready 🎉",
      html: buildDeliveryEmailHtml({ fullName: params.fullName, pdfUrl }),
      text: [
        `Hi ${params.fullName},`,
        "",
        "Thanks for requesting the Australia PR Guide 2026! You can download it here:",
        pdfUrl,
        "",
        "If the link doesn't work, just reply to this email and we'll resend it.",
        "",
        "- The LogiVisa Team",
      ].join("\n"),
    });
  } catch (error) {
    console.error("[pdf-download] Failed to send delivery email", error);
  }
}

async function sendPdfLeadAdminEmail(params: {
  fullName: string;
  email: string;
  phone: string;
  slug: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const notificationEmail = process.env.PDF_LEAD_NOTIFICATION_EMAIL || "serter@logivisa.com";

  if (!apiKey) {
    console.warn("[pdf-download] RESEND_API_KEY missing; skipping admin notification for", params.email);
    return;
  }

  const resend = new Resend(apiKey);
  const fromEmail = process.env.FROM_EMAIL || "LogiVisa <noreply@logivisa.com>";

  await resend.emails.send({
    from: fromEmail,
    to: [notificationEmail],
    subject: "🚀 New Lead: PDF Guide Download",
    text: [
      "A new PDF guide lead has been captured.",
      "",
      `Name: ${params.fullName}`,
      `Email: ${params.email}`,
      `Phone: ${params.phone || "-"}`,
      `Guide: ${params.slug}`,
    ].join("\n"),
  });
}
