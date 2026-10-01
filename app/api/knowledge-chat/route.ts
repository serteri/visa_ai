import type { NextRequest } from "next/server";

import { realChatDeps } from "@/lib/chat/deps";
import { handleChat } from "@/lib/chat/handler";

export const runtime = "nodejs";

/**
 * RAG chatbot endpoint (logic in lib/chat/handler.ts). Fully anonymous -- no session/auth check. Access is gated on
 * the ChatVisitor row resolved from IP+User-Agent (see getVisitorContext): 5 free messages, then a positive
 * premiumCredits balance (paid packages, see app/[locale]/pricing) is required, or this route returns 403
 * limit_reached instead of calling the model. While the balance is positive every message is a premium message and
 * costs one credit. isPremium does not grant access.
 */
export async function POST(req: NextRequest) {
  return handleChat(req, realChatDeps());
}
