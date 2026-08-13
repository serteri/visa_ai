import { prisma } from "@/lib/prisma";
import type { ChatVisitor } from "@prisma/client";

function getClientIp(req: Request): string {
  const headers = req.headers;
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}

function getUserAgent(req: Request): string {
  return req.headers.get("user-agent") || "unknown";
}

/**
 * Resolves the anonymous ChatVisitor behind a request, creating one on first
 * contact. Identity is IP+User-Agent, not a cookie/session, since chat is
 * usable without signing up — this is what the free-message cap in Stage 2+
 * will be enforced against.
 */
export async function getVisitorContext(req: Request): Promise<ChatVisitor> {
  const ipAddress = getClientIp(req);
  const userAgent = getUserAgent(req);

  const existing = await prisma.chatVisitor.findFirst({
    where: { ipAddress, userAgent },
  });

  if (existing) return existing;

  return prisma.chatVisitor.create({
    data: { ipAddress, userAgent },
  });
}
