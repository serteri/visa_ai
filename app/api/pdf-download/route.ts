import { NextRequest, after } from "next/server";
import { revalidateTag } from "next/cache";
import { Resend } from "resend";
import { z } from "zod";
import { db } from "@/db";
import { pdfDownloads } from "@/db/schema";
import { eq, and, inArray, notInArray, count } from "drizzle-orm";
import { PDF_SLUGS, PDF_LEAD_CATEGORY, type PdfProduct, sendPdfDeliveryEmail } from "@/lib/email/pdf-delivery";
import { prisma } from "@/lib/prisma";
import { PDF_LEAD_SOURCE, marketForSlug } from "@/lib/crm/pdf-lead-sources";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Both the Turkish and Global English guides draw from a single shared free-download pool.
export const FREE_LIMIT = 18;

// Re-exported for existing importers (e.g. lib/cache/public-read-models.ts) —
// the canonical definition now lives in lib/email/pdf-delivery.ts so the free
// and paid (Stripe webhook) paths share one slug source of truth.
export { PDF_SLUGS, type PdfProduct };

// Admin/test emails are excluded from the public free-slot counter, mirroring
// the same exclusion already applied to the full-check usage counter (see
// app/[locale]/(main)/full-check/actions.ts and lib/cache/public-read-models.ts).
//
// Strips surrounding quote characters in addition to whitespace: env vars are
// often authored locally as ADMIN_EMAILS="a@b.com,c@d.com" (quotes are shell/
// dotenv syntax, stripped automatically by dotenv) but if that same string is
// pasted verbatim into a dashboard UI (e.g. Vercel's env var field), the
// quotes become part of the literal value — trim() alone won't remove them,
// silently breaking every email in the list.
function parseEmailList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((item) => item.trim().replace(/^["']+|["']+$/g, "").trim().toLowerCase())
    .filter(Boolean);
}

function getExcludedEmailSet(): Set<string> {
  const adminEmails = parseEmailList(process.env.ADMIN_EMAILS);
  const knownTestEmails = parseEmailList(process.env.KNOWN_TEST_EMAILS);
  return new Set([...adminEmails, ...knownTestEmails]);
}

function isExcludedEmail(email: string): boolean {
  return getExcludedEmailSet().has(email.trim().toLowerCase());
}

const ALL_SLUGS = Object.values(PDF_SLUGS);

function resolveSlug(value: string | null): string {
  if (value === PDF_SLUGS.global) return PDF_SLUGS.global;
  if (value === PDF_SLUGS.occupation) return PDF_SLUGS.occupation;
  return PDF_SLUGS.turkish;
}

const pdfDownloadSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required."),
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
  phone: z.string().trim().optional().default(""),
  slug: z.string().optional(),
  category: z.string().optional(),
  termsAcceptedAt: z.string().min(1, "Terms acceptance timestamp is required."),
});

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

// Counts real (non-admin/test) downloads across both guides. The public
// "free slots left" counter must never be depleted by internal testing.
async function countRealTotalDownloads(): Promise<number> {
  const excluded = Array.from(getExcludedEmailSet());
  const where =
    excluded.length > 0
      ? and(inArray(pdfDownloads.pdf_slug, ALL_SLUGS), notInArray(pdfDownloads.email, excluded))
      : inArray(pdfDownloads.pdf_slug, ALL_SLUGS);

  const [totalRow] = await db.select({ value: count() }).from(pdfDownloads).where(where);
  return Number(totalRow?.value ?? 0);
}

// GET: check current status (shared free slots remaining, already downloaded THIS slug from this IP)
export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const slug = resolveSlug(req.nextUrl.searchParams.get("slug"));

    // Shared pool: count downloads across BOTH guides against the combined free
    // limit, excluding admin/known-test emails so internal testing never
    // depletes the public-facing counter.
    const totalDownloads = await countRealTotalDownloads();
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

    const { full_name, email, phone, slug: rawSlug, category: rawCategory, termsAcceptedAt } = parsed.data;
    const slug = resolveSlug(rawSlug ?? null);
    // The CRM lead-source bucket is derived from the slug (source of truth)
    // rather than trusted from the client; the client-sent `category` is only
    // used as a display fallback if the slug is somehow unrecognized.
    const category = PDF_LEAD_CATEGORY[slug] ?? rawCategory ?? "Unknown";
    const isExcluded = isExcludedEmail(email);

    // Server-side enforcement of the Terms gate -- the client already blocks
    // submission without consent, but the API must not trust that alone.
    const termsDate = new Date(termsAcceptedAt);
    if (Number.isNaN(termsDate.getTime())) {
      return Response.json(
        { error: "Yasal koşulların kabul edildiği doğrulanamadı." },
        { status: 400 }
      );
    }

    // Block duplicate IPs — scoped per guide, so a visitor can claim each guide
    // once. Admin/test emails bypass this so the same tester can re-download
    // repeatedly, mirroring the isAdmin bypass in full-check/actions.ts.
    if (!isExcluded) {
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
    }

    // Check free limit — shared pool across both guides, excluding admin/test
    // downloads from the count. Admin/test emails also bypass the gate itself
    // and do not consume a real free slot.
    if (!isExcluded) {
      const totalDownloads = await countRealTotalDownloads();
      const isFree = totalDownloads < FREE_LIMIT;

      if (!isFree) {
        return Response.json(
          { error: "Ücretsiz indirme kotası doldu.", paymentRequired: true },
          { status: 402 }
        );
      }
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

    // Drop this lead into the Agent CRM pool (unassigned; agents claim it from
    // /agent/pool) and send PDF delivery + admin notification emails asynchronously.
    // Wrap in after() so Next.js executes this post-response background work
    // after the response is sent to the user, preventing Vercel function timeout.
    after(async () => {
      const startTime = performance.now();
      try {
        await Promise.all([
          prisma.userReport
            .create({
              data: {
                fullName: full_name.trim(),
                email: normalizedEmail,
                phone: phone.trim(),
                source: PDF_LEAD_SOURCE[slug] ?? "pdf_global_guide",
                market: marketForSlug(slug),
                paymentStatus: "n/a",
                isUnlocked: true,
                reportJson: {},
                inputJson: {},
                ipAddress: ip,
              },
            })
            .catch((err) => console.error("[pdf-download] CRM lead creation failed (non-blocking):", err)),
          sendPdfDeliveryEmail({ fullName: full_name.trim(), email: normalizedEmail, slug }).catch((err) => {
            console.error("[pdf-download] Delivery email failed (non-blocking):", err);
            throw err;
          }),
          sendPdfLeadAdminEmail({
            fullName: full_name.trim(),
            email: normalizedEmail,
            phone: phone.trim(),
            slug,
            category,
          }).catch((err) => console.error("[pdf-download] Admin notification failed (non-blocking):", err)),
        ]);
        const duration = ((performance.now() - startTime) / 1000).toFixed(2);
        console.info(`[LogiVisa Profiler] Background PDF & Email process completed in ${duration} seconds.`);
      } catch (err) {
        const duration = ((performance.now() - startTime) / 1000).toFixed(2);
        console.error(`[LogiVisa Profiler] Background PDF & Email process failed after ${duration} seconds. Error:`, err);
      }
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error("[pdf-download POST]", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

async function sendPdfLeadAdminEmail(params: {
  fullName: string;
  email: string;
  phone: string;
  slug: string;
  category: string;
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
    subject: `🚀 New Lead: PDF Guide Download [${params.category}]`,
    text: [
      "A new PDF guide lead has been captured.",
      "",
      `Category: ${params.category}`,
      `Name: ${params.fullName}`,
      `Email: ${params.email}`,
      `Phone: ${params.phone || "-"}`,
      `Guide: ${params.slug}`,
    ].join("\n"),
  });
}
