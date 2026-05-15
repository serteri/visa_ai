import { NextRequest } from "next/server";
import { db } from "@/db";
import { pdfDownloads } from "@/db/schema";
import { eq, count } from "drizzle-orm";

export const dynamic = "force-dynamic";

const FREE_LIMIT = 20;
const PDF_SLUG = "avustralya-pr-rehberi-2026";

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

// GET: check current status (free slots remaining, already downloaded from this IP)
export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    const [totalRow] = await db
      .select({ value: count() })
      .from(pdfDownloads)
      .where(eq(pdfDownloads.pdf_slug, PDF_SLUG));

    const totalDownloads = Number(totalRow?.value ?? 0);
    const freeRemaining = Math.max(0, FREE_LIMIT - totalDownloads);
    const isFree = totalDownloads < FREE_LIMIT;

    const [ipRow] = await db
      .select({ value: count() })
      .from(pdfDownloads)
      .where(eq(pdfDownloads.ip_address, ip));

    const alreadyDownloaded = Number(ipRow?.value ?? 0) > 0;

    return Response.json({
      isFree,
      freeRemaining,
      totalDownloads,
      alreadyDownloaded,
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

    const { full_name, email, phone } = body as {
      full_name?: string;
      email?: string;
      phone?: string;
    };

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

    // Block duplicate IPs
    const [ipRow] = await db
      .select({ value: count() })
      .from(pdfDownloads)
      .where(eq(pdfDownloads.ip_address, ip));

    if (Number(ipRow?.value ?? 0) > 0) {
      return Response.json(
        { error: "Bu IP adresinden daha önce indirildi.", alreadyDownloaded: true },
        { status: 409 }
      );
    }

    // Check free limit
    const [totalRow] = await db
      .select({ value: count() })
      .from(pdfDownloads)
      .where(eq(pdfDownloads.pdf_slug, PDF_SLUG));

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
      pdf_slug: PDF_SLUG,
      is_paid: false,
    });

    return Response.json({
      success: true,
      downloadUrl: `/${PDF_SLUG}.pdf`,
    });
  } catch (err) {
    console.error("[pdf-download POST]", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
