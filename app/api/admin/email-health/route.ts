import { NextResponse } from "next/server";

import { emailHealthSnapshot, sendTestEmail } from "@/lib/email/health";
import { isAdminSession } from "@/lib/reports/report-access-server";
import { STRICT_EMAIL_REGEX } from "@/lib/lead-magnet-validation";

export const dynamic = "force-dynamic";

const NOT_FOUND = () => new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "private, no-store" } });

/**
 * Admin-only email diagnostics (a verified admin session; anything else answers 404).
 *   GET  /api/admin/email-health[?address=a@b.c]   the sending switches (no secrets), the From domain's state in Resend, the last events
 *   POST /api/admin/email-health  { "to": "a@b.c" }   one real test email; the response is the provider's own answer (message id or error)
 */
export async function GET(req: Request) {
  if (!(await isAdminSession())) return NOT_FOUND();
  const address = new URL(req.url).searchParams.get("address") ?? undefined;
  return NextResponse.json(await emailHealthSnapshot(address), { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(req: Request) {
  if (!(await isAdminSession())) return NOT_FOUND();
  const body = (await req.json().catch(() => ({}))) as { to?: string };
  const to = String(body.to ?? "").trim();
  if (!STRICT_EMAIL_REGEX.test(to)) return NextResponse.json({ ok: false, message: "Send { \"to\": \"address\" }" }, { status: 400 });
  return NextResponse.json(await sendTestEmail(to), { headers: { "Cache-Control": "private, no-store" } });
}
