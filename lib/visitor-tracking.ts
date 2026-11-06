import { prisma } from "@/lib/prisma";
import { ipFingerprint, UNKNOWN_IP } from "@/lib/privacy/ip";
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
  const ip = getClientIp(req);
  const userAgent = getUserAgent(req);
  // The address itself is not stored: a keyed hash of it (lib/privacy/ip.ts) stands in, next to the browser details.
  const fingerprint = ipFingerprint(ip);

  const existing = await prisma.chatVisitor.findFirst({
    where: { fingerprint, userAgent },
  });

  if (existing) return existing;

  // A visitor row made before this change carries the raw address and no fingerprint: adopt it (keeps the credit balance) and drop the address.
  if (ip !== UNKNOWN_IP) {
    const legacy = await prisma.chatVisitor.findFirst({
      where: { ipAddress: ip, userAgent, fingerprint: null },
    });
    if (legacy) {
      return prisma.chatVisitor.update({ where: { id: legacy.id }, data: { fingerprint, ipAddress: null } });
    }
  }

  return prisma.chatVisitor.create({
    data: { fingerprint, userAgent },
  });
}
