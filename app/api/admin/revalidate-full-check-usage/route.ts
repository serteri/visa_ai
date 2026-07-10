import { revalidateTag } from "next/cache";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }

  const fallbackHeader = request.headers.get("x-admin-secret");
  if (fallbackHeader && fallbackHeader.trim().length > 0) {
    return fallbackHeader.trim();
  }

  const fromQuery = request.nextUrl.searchParams.get("secret");
  return fromQuery?.trim() || null;
}

export async function POST(request: NextRequest) {
  const configuredSecret = process.env.ADMIN_SECRET ?? process.env.CRON_SECRET;

  if (!configuredSecret) {
    return Response.json(
      { ok: false, error: "Missing ADMIN_SECRET/CRON_SECRET in runtime" },
      { status: 500 },
    );
  }

  const providedSecret = getAuthToken(request);
  if (!providedSecret || providedSecret !== configuredSecret) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  revalidateTag("public-full-check-usage", "max");

  return Response.json({
    ok: true,
    tag: "public-full-check-usage",
    revalidatedAt: new Date().toISOString(),
  });
}
