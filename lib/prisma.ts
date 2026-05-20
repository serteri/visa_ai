import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var prismaCleanupRegistered: boolean | undefined;
}

const rawDatabaseUrl = process.env.DATABASE_URL;

function getPrismaDatasourceUrl(): string | undefined {
  if (!rawDatabaseUrl) return undefined;

  try {
    const parsed = new URL(rawDatabaseUrl);
    const usesPoolerHost = parsed.hostname.includes("-pooler.");
    const hasPgBouncerFlag = parsed.searchParams.get("pgbouncer") === "true";

    if (!hasPgBouncerFlag) {
      parsed.searchParams.set("pgbouncer", "true");
    }

    if (process.env.NODE_ENV !== "production" && !usesPoolerHost) {
      console.warn(
        "[Prisma] DATABASE_URL does not appear to use a pooled host. Consider Neon pooler URL to reduce compute wake-ups.",
      );
    }

    return parsed.toString();
  } catch {
    return rawDatabaseUrl;
  }
}

const datasourceUrl = getPrismaDatasourceUrl();

export const prisma =
  global.prisma ??
  new PrismaClient({
    ...(datasourceUrl ? { datasourceUrl } : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

if (!global.prismaCleanupRegistered) {
  process.once("beforeExit", async () => {
    await prisma.$disconnect();
  });
  process.once("SIGINT", async () => {
    await prisma.$disconnect();
  });
  process.once("SIGTERM", async () => {
    await prisma.$disconnect();
  });
  global.prismaCleanupRegistered = true;
}
