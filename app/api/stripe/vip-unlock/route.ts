import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Founder account -- the only email allowed to self-unlock via this route.
// Not read from env since it's a single fixed identity, not per-environment
// config.
const VIP_BYPASS_EMAIL = "serteri@gmail.com";

interface VipUnlockPayload {
  email?: string;
  visitorId?: string;
}

/**
 * Lets the founder's fixed email unlock unlimited chat access for their
 * current anonymous ChatVisitor without going through Stripe -- entered via
 * the email field on the paywall overlay (see KnowledgeChatUI). Any other
 * email is rejected here; the frontend sends those to /pricing instead of
 * calling this route.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as VipUnlockPayload;
  const { email, visitorId } = body;

  if (!email || !visitorId) {
    return NextResponse.json({ error: "email and visitorId are required." }, { status: 400 });
  }

  if (email !== VIP_BYPASS_EMAIL) {
    return NextResponse.json({ error: "Not authorized for VIP unlock." }, { status: 403 });
  }

  const visitor = await prisma.chatVisitor.findUnique({ where: { id: visitorId } });
  if (!visitor) {
    return NextResponse.json({ error: "Visitor not found." }, { status: 404 });
  }

  await prisma.chatVisitor.update({
    where: { id: visitorId },
    data: { isPremium: true },
  });

  return NextResponse.json({ success: true });
}
