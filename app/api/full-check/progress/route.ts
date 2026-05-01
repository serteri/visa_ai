import { NextResponse } from "next/server";

import { getFullCheckProgress } from "@/lib/full-check-progress";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const snapshot = await getFullCheckProgress(id);
  if (!snapshot) {
    return NextResponse.json({ status: "pending" }, { headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(
    {
      status: "ok",
      milestone: snapshot.milestone,
      message: snapshot.message,
      updatedAt: snapshot.updatedAt,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
