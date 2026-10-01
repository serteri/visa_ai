import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { safeEqual } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

interface VipUnlockPayload {
  visitorId?: string;
  vipToken?: string;
}

/**
 * Lets someone who knows the server-only VIP_UNLOCK_SECRET grant a credit
 * balance (VIP_UNLOCK_CREDITS) to their current anonymous ChatVisitor without going through
 * Stripe. Previously gated by a hardcoded founder email
 * (VIP_BYPASS_EMAIL = "serteri@gmail.com") compared against a client-supplied
 * email field -- that email was public (readable in the repo/bundle), so
 * anyone could self-grant VIP by simply typing it in. Auth is now a real
 * shared secret, accepted via the `x-vip-token` header or a `vipToken` body
 * field, compared with a timing-safe equality check (see components/
 * KnowledgeChatUI.tsx's "Have a VIP access code?" flow for the client side).
 */
export async function POST(req: NextRequest) {
  const configuredSecret = process.env.VIP_UNLOCK_SECRET?.trim();
  if (!configuredSecret) {
    return NextResponse.json({ error: "VIP unlock is not configured." }, { status: 500 });
  }

  const body = (await req.json()) as VipUnlockPayload;
  const { visitorId } = body;
  const providedToken = (req.headers.get("x-vip-token") ?? body.vipToken ?? "").trim();

  if (!visitorId) {
    return NextResponse.json({ error: "visitorId is required." }, { status: 400 });
  }
  if (!providedToken || !safeEqual(providedToken, configuredSecret)) {
    return NextResponse.json({ error: "Not authorized for VIP unlock." }, { status: 403 });
  }

  const visitor = await prisma.chatVisitor.findUnique({ where: { id: visitorId } });
  if (!visitor) {
    return NextResponse.json({ error: "Visitor not found." }, { status: 404 });
  }

  // isPremium no longer bypasses the credit decrement (lib/chat/handler.ts), so the VIP code grants a credit
  // balance instead of an unlimited flag. Amount: VIP_UNLOCK_CREDITS (default 100).
  const grant = Number.parseInt(process.env.VIP_UNLOCK_CREDITS ?? "", 10);
  await prisma.chatVisitor.update({
    where: { id: visitorId },
    data: { premiumCredits: { increment: Number.isFinite(grant) && grant > 0 ? grant : 100 } },
  });

  return NextResponse.json({ success: true });
}
