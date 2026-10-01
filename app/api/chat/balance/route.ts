import { NextRequest } from "next/server";

import { getBalance } from "@/lib/chat/balance";
import { getVisitorContext } from "@/lib/visitor-tracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The visitor's remaining messages for the chat header: premium credits, or the free allowance. */
export async function GET(req: NextRequest) {
  return getBalance(req, { getVisitor: (r) => getVisitorContext(r) });
}
