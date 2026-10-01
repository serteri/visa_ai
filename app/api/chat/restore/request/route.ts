import { NextRequest, NextResponse } from "next/server";

import { realRestoreDeps } from "@/lib/chat/restore-deps";
import { requestRestore } from "@/lib/chat/restore";

export const dynamic = "force-dynamic";

/** "Restore my credits", step 1: always the same answer for a valid email, whether or not it has credits. */
export async function POST(req: NextRequest) {
  const body = ((await req.json().catch(() => ({}))) ?? {}) as { email?: unknown; locale?: unknown };
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
  try {
    const result = await requestRestore(realRestoreDeps(), {
      email: body.email,
      ip,
      locale: typeof body.locale === "string" ? body.locale : undefined,
    });
    return NextResponse.json(result.body, { status: result.status });
  } catch (err) {
    console.error("[chat/restore/request] failed", err);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
