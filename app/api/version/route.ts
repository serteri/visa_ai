import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Which build answers: the Vercel git commit (VERCEL_GIT_COMMIT_SHA, set by the platform) and the report structure it renders.
 * No secret, no user data. `curl https://<host>/api/version` shows whether a deployment includes a given commit.
 */
export async function GET() {
  return NextResponse.json(
    {
      commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
      deployment: process.env.VERCEL_ENV ?? null,
      reportStructure: "information-first",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
