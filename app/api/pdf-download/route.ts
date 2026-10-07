import { NextRequest, after } from "next/server";
import { revalidateTag } from "next/cache";
import { Resend } from "resend";
import { db } from "@/db";
import { pdfDownloads } from "@/db/schema";
import { eq, and, inArray, notInArray, count } from "drizzle-orm";
import { PDF_SLUGS, PDF_LEAD_CATEGORY, type PdfProduct, sendPdfDeliveryEmail } from "@/lib/email/pdf-delivery";
import { shouldSuppressReportEmails } from "@/lib/email/suppression";
import { prisma } from "@/lib/prisma";
import { PDF_LEAD_SOURCE, marketForSlug } from "@/lib/crm/pdf-lead-sources";
import { FREE_LIMIT as HANDLER_FREE_LIMIT, handlePdfDownload } from "@/lib/pdf-download/handle";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Both the Turkish and Global English guides draw from a single shared free-download pool.
export const FREE_LIMIT = HANDLER_FREE_LIMIT;

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

// POST: the decision logic is in lib/pdf-download/handle.ts (testable without a database or a network); this wires the real side effects.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const ip = getClientIp(req);
    const result = await handlePdfDownload(
      { body, ip },
      {
        isExcludedEmail,
        countByIpAndSlug: async (ipAddress, slug) => {
          const [row] = await db.select({ value: count() }).from(pdfDownloads).where(and(eq(pdfDownloads.ip_address, ipAddress), eq(pdfDownloads.pdf_slug, slug)));
          return Number(row?.value ?? 0);
        },
        countRealTotal: countRealTotalDownloads,
        insertLedgerRow: async (row) => {
          const [saved] = await db
            .insert(pdfDownloads)
            .values({ full_name: row.full_name, email: row.email, phone: row.phone, ip_address: row.ip, pdf_slug: row.slug, is_paid: false, terms_accepted_at: row.termsAt })
            .returning({ id: pdfDownloads.id });
          revalidateTag("public-guide-download-stats", "max");
          return saved?.id;
        },
        deleteLedgerRow: async (id) => {
          await db.delete(pdfDownloads).where(eq(pdfDownloads.id, id)).catch((err) => console.error("[pdf-download] could not release the ledger row:", err));
          revalidateTag("public-guide-download-stats", "max");
        },
        isSuppressed: (email, sender) => shouldSuppressReportEmails({ email }, sender),
        sendDelivery: sendPdfDeliveryEmail,
        afterResponse: (t) =>
          after(async () => {
            await Promise.all([
              prisma.userReport
                .create({
                  data: {
                    fullName: t.fullName,
                    email: t.email,
                    phone: t.phone,
                    source: PDF_LEAD_SOURCE[t.slug] ?? "pdf_global_guide",
                    market: marketForSlug(t.slug),
                    paymentStatus: "n/a",
                    isUnlocked: true,
                    reportJson: {},
                    inputJson: {},
                    ipAddress: t.ip,
                  },
                })
                .catch((err) => console.error("[pdf-download] CRM lead creation failed (non-blocking):", err)),
              shouldSuppressReportEmails({ email: t.email }, "pdf_download_admin_notification")
                ? Promise.resolve()
                : sendPdfLeadAdminEmail({ fullName: t.fullName, email: t.email, phone: t.phone, slug: t.slug, category: PDF_LEAD_CATEGORY[t.slug] ?? "Unknown", delivered: t.delivered }).catch((err) =>
                    console.error("[pdf-download] Admin notification failed (non-blocking):", err)
                  ),
            ]);
          }),
      }
    );
    return Response.json(result.json, { status: result.status });
  } catch (err) {
    console.error("[pdf-download POST]", err);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

async function sendPdfLeadAdminEmail(params: {
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
    console.warn("[pdf-download] RESEND_API_KEY missing; skipping admin notification for", params.email);
    return;
  }

  const resend = new Resend(apiKey);
  const fromEmail = process.env.FROM_EMAIL || "LogiVisa <noreply@logivisa.com>";

  const { error } = await resend.emails.send({
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
      `Delivery email accepted by the provider: ${params.delivered ? "yes" : "NO (the visitor was shown the download link)"}`,
    ].join("\n"),
  });
  if (error) console.error("[pdf-download] admin notification rejected by the provider:", error.message);
}
