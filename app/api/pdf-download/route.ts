import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { db } from "@/db";
import { pdfDownloads } from "@/db/schema";
import { eq, and, inArray, count } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Both the Turkish and Global English guides draw from a single shared free-download pool.
const FREE_LIMIT = 18;

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

    const { full_name, email, phone, slug: rawSlug } = body as {
      full_name?: string;
      email?: string;
      phone?: string;
      slug?: string;
    };
    const slug = resolveSlug(rawSlug ?? null);

    // Validate inputs
    if (!full_name?.trim() || !email?.trim() || !phone?.trim()) {
      return Response.json(
        { error: "Ad soyad, e-posta ve telefon zorunludur." },
        { status: 400 }
      );
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: "Geçerli bir e-posta girin." }, { status: 400 });
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
    await db.insert(pdfDownloads).values({
      full_name: full_name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      ip_address: ip,
      pdf_slug: slug,
      is_paid: false,
    });

    revalidateTag("public-guide-download-stats", "max");

    return Response.json({
      success: true,
      downloadUrl: `/${slug}.pdf`,
    });
  } catch (err) {
    console.error("[pdf-download POST]", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
