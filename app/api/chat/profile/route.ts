import { NextRequest } from "next/server";

import { liveStateData, prismaProfileStore, prismaQuickProfileStore } from "@/lib/chat/deps";
import { getQuickProfile, saveQuickProfile, type QuickProfileDeps } from "@/lib/chat/quick-profile-api";
import { getVisitorContext } from "@/lib/visitor-tracking";
import { runReadinessEngine } from "@/src/lib/readiness-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const deps: QuickProfileDeps = {
  getVisitor: (req) => getVisitorContext(req),
  profiles: prismaProfileStore,
  quickProfiles: prismaQuickProfileStore,
  liveState: liveStateData,
  runEngine: (input) => runReadinessEngine(input),
};

/** The in-chat quick profile card: whether to show it, and the stored fields for editing. */
export async function GET(req: NextRequest) {
  return getQuickProfile(req, deps);
}

/** Save the card: intake validation, the report engine, stored against the visitor. */
export async function POST(req: NextRequest) {
  return saveQuickProfile(req, deps);
}
