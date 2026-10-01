import { NextRequest, NextResponse } from "next/server";

import { realRestoreDeps } from "@/lib/chat/restore-deps";
import { confirmRestore } from "@/lib/chat/restore";
import { getVisitorContext } from "@/lib/visitor-tracking";

export const dynamic = "force-dynamic";

/**
 * "Restore my credits", step 2 (POST, not GET, so a mail scanner prefetching the link cannot spend it): attaches the
 * credits to the visitor making this request. Invalid, expired and already-used links all return the same 400.
 */
export async function POST(req: NextRequest) {
  const body = ((await req.json().catch(() => ({}))) ?? {}) as { token?: unknown };
  try {
    const visitor = await getVisitorContext(req);
    const result = await confirmRestore(realRestoreDeps(), { token: body.token, visitorId: visitor.id });
    return result.ok
      ? NextResponse.json({ ok: true, credits: result.credits })
      : NextResponse.json({ ok: false, error: "invalid_or_expired" }, { status: 400 });
  } catch (err) {
    console.error("[chat/restore/confirm] failed", err);
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });
  }
}
