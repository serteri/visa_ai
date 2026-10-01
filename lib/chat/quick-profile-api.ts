import type { Locale, ReadinessInput, ReadinessReport } from "@/lib/readiness/types";

import type { LiveStateData } from "./engine-facts";
import type { ChatVisitorLike } from "./handler";
import { loadLinkedReport, type ProfileStore } from "./profile";
import { inputToQuickProfile, isMissingTableError, quickProfileToInput, validateQuickProfile, type QuickProfileStore } from "./quick-profile";

/**
 * GET  /api/chat/profile  -> whether to show the card: { premium, hasReport, profile (fields for editing) | null }
 * POST /api/chat/profile  -> validate the card (intake rules), run the REPORT engine, store input + result against
 *                            the visitor, answer with the engine's headline results.
 * Only a paying visitor (credits > 0) can save a profile; the chat uses it only on the premium path.
 */

export interface QuickProfileDeps {
  getVisitor(req: Request): Promise<ChatVisitorLike>;
  profiles: ProfileStore;
  quickProfiles: QuickProfileStore;
  liveState(): Promise<LiveStateData>;
  /** runReadinessEngine (src/lib/readiness-engine.ts), the same engine the report uses. */
  runEngine(input: ReadinessInput): ReadinessReport;
}

const asLocale = (v: unknown): Locale => (v === "tr" ? "tr" : v === "zh-Hans" || v === "zh" ? "zh-Hans" : "en");

export async function getQuickProfile(req: Request, deps: QuickProfileDeps): Promise<Response> {
  const visitor = await deps.getVisitor(req);
  const linked = await loadLinkedReport(deps.profiles, visitor.id).catch(() => null);
  let stored: Awaited<ReturnType<QuickProfileStore["get"]>> = null;
  let available = true;
  try {
    stored = await deps.quickProfiles.get(visitor.id);
  } catch (err) {
    if (!isMissingTableError(err)) throw err;
    available = false;
  }
  return Response.json({
    premium: visitor.premiumCredits > 0,
    hasReport: Boolean(linked),
    available,
    profile: stored ? inputToQuickProfile((stored.inputJson ?? {}) as Partial<ReadinessInput>) : null,
  });
}

export async function saveQuickProfile(req: Request, deps: QuickProfileDeps): Promise<Response> {
  const visitor = await deps.getVisitor(req);
  const body = (await req.json().catch(() => ({}))) as { locale?: string; fields?: Record<string, unknown> };
  const locale = asLocale(body.locale);
  if (visitor.premiumCredits <= 0) return Response.json({ error: "premium_required" }, { status: 403 });

  const v = validateQuickProfile(body.fields ?? {}, locale);
  if (!v.ok) return Response.json({ error: "invalid", errors: v.errors }, { status: 400 });

  const input = quickProfileToInput(v.fields, locale);
  const live = await deps.liveState().catch(() => ({}));
  const report = deps.runEngine({ ...input, ...(live as Partial<ReadinessInput>) });
  try {
    // Stored without the live state maps (re-read on every report run, like the intake action's stored input).
    await deps.quickProfiles.save(visitor.id, input, report);
  } catch (err) {
    if (isMissingTableError(err)) return Response.json({ error: "profile_unavailable" }, { status: 503 });
    throw err;
  }
  return Response.json({
    ok: true,
    points: report.pointsEstimate?.estimatedPoints ?? null,
    gates: Object.fromEntries(Object.entries(report.visaGates ?? {}).map(([visa, g]) => [visa, g.status])),
  });
}
