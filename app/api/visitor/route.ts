import { NextRequest, NextResponse } from "next/server";

import { getVisitorContext } from "@/lib/visitor-tracking";

export const dynamic = "force-dynamic";

/**
 * Exposes the caller's own anonymous ChatVisitor id (resolved server-side
 * from IP+User-Agent, see getVisitorContext) so the client can reference it
 * -- e.g. KnowledgeChatUI's paywall needs it to call
 * /api/stripe/vip-unlock. Nothing else about the visitor row is returned.
 */
export async function GET(req: NextRequest) {
  const visitor = await getVisitorContext(req);
  return NextResponse.json({ visitorId: visitor.id });
}
