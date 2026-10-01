import { FREE_MESSAGE_LIMIT } from "./config";
import type { ChatVisitorLike } from "./handler";

/**
 * What the chat header shows. A visitor with credits is "premium" (N messages left, one credit each); otherwise the
 * free allowance (FREE_MESSAGE_LIMIT minus the messages used); at zero the existing limit_reached flow applies.
 * `notice`: a short "running low" prompt with buy / restore links -- credits at 5 or fewer, or free messages at 2 or fewer.
 */
export type BalanceView = { mode: "premium" | "free" | "none"; count: number; freeLimit: number; notice: boolean };

export const LOW_CREDITS_NOTICE_AT = 5;
export const LOW_FREE_NOTICE_AT = 2;

export function describeBalance(v: Pick<ChatVisitorLike, "premiumCredits" | "messageCount">): BalanceView {
  if (v.premiumCredits > 0) {
    return { mode: "premium", count: v.premiumCredits, freeLimit: FREE_MESSAGE_LIMIT, notice: v.premiumCredits <= LOW_CREDITS_NOTICE_AT };
  }
  const remaining = Math.max(0, FREE_MESSAGE_LIMIT - v.messageCount);
  return remaining > 0
    ? { mode: "free", count: remaining, freeLimit: FREE_MESSAGE_LIMIT, notice: remaining <= LOW_FREE_NOTICE_AT }
    : { mode: "none", count: 0, freeLimit: FREE_MESSAGE_LIMIT, notice: false };
}

export async function getBalance(req: Request, deps: { getVisitor(req: Request): Promise<ChatVisitorLike> }): Promise<Response> {
  const visitor = await deps.getVisitor(req);
  return Response.json(describeBalance(visitor), { headers: { "Cache-Control": "no-store" } });
}
