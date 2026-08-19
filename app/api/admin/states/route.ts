import { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { isMissingRelationError } from "@/lib/db/missing-relation";
import stateNominationData from "@/src/data/state-nomination-status.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KNOWN_STATUSES = ["Open for Offshore", "High Demand", "Closed", "Onshore Only"] as const;
type KnownStatus = (typeof KNOWN_STATUSES)[number];

const KNOWN_STATE_CODES = new Set(
  (stateNominationData as { states: Array<{ code: string }> }).states.map((s) => s.code)
);

function isKnownStatus(value: unknown): value is KnownStatus {
  return typeof value === "string" && (KNOWN_STATUSES as readonly string[]).includes(value);
}

/**
 * Admin-only CRUD for StateNominationConfig -- the top-priority state
 * status/fee/note override consumed by both the PDF State Nomination
 * Matrix (lib/readiness/state-nomination.ts) and the AI Assistant
 * (lib/ai/retrieve-state-context.ts). See prisma/schema.prisma's comment
 * on the model for the full priority chain.
 *
 * Auth: same cookie-based admin session as the rest of the legacy ops
 * admin (lib/admin-auth.ts) -- the browser sends the session cookie
 * automatically on same-origin fetch calls from the admin UI, so no
 * separate token handling is needed here.
 */
export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await prisma.stateNominationConfig.findMany({ orderBy: { stateCode: "asc" } });
    return Response.json({ ok: true, states: rows });
  } catch (err) {
    if (isMissingRelationError(err, "state_nomination_configs")) {
      return Response.json({
        ok: true,
        states: [],
        warning:
          "state_nomination_configs table does not exist yet -- run `npx prisma db push` (see prisma/schema.prisma) to create it.",
      });
    }
    console.error("[admin/states] GET failed:", err);
    return Response.json({ ok: false, error: "Failed to load state configs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { stateCode, status, supportedVisas, feeAud, customAiNote } = (body ?? {}) as Record<string, unknown>;

  if (typeof stateCode !== "string" || !KNOWN_STATE_CODES.has(stateCode)) {
    return Response.json(
      { ok: false, error: `stateCode must be one of: ${Array.from(KNOWN_STATE_CODES).join(", ")}` },
      { status: 400 }
    );
  }

  if (!isKnownStatus(status)) {
    return Response.json(
      { ok: false, error: `status must be one of: ${KNOWN_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const visasArray =
    Array.isArray(supportedVisas) && supportedVisas.every((v) => typeof v === "string")
      ? (supportedVisas as string[]).filter((v) => v === "190" || v === "491")
      : [];

  let fee: number | null = null;
  if (feeAud !== null && feeAud !== undefined && feeAud !== "") {
    const parsed = Number(feeAud);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return Response.json({ ok: false, error: "feeAud must be a non-negative number" }, { status: 400 });
    }
    fee = parsed;
  }

  const note = typeof customAiNote === "string" && customAiNote.trim() ? customAiNote.trim() : null;

  try {
    const saved = await prisma.stateNominationConfig.upsert({
      where: { stateCode },
      create: {
        stateCode,
        status,
        supportedVisas: visasArray,
        feeAud: fee,
        customAiNote: note,
      },
      update: {
        status,
        supportedVisas: visasArray,
        feeAud: fee,
        customAiNote: note,
      },
    });

    return Response.json({ ok: true, state: saved });
  } catch (err) {
    if (isMissingRelationError(err, "state_nomination_configs")) {
      return Response.json(
        {
          ok: false,
          error:
            "state_nomination_configs table does not exist yet -- run `npx prisma db push` (see prisma/schema.prisma) to create it.",
        },
        { status: 503 }
      );
    }
    console.error("[admin/states] POST failed:", err);
    return Response.json({ ok: false, error: "Failed to save state config" }, { status: 500 });
  }
}
