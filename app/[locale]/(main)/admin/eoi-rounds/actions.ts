"use server";

import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";

const STATE_CODES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;

const tierBreakdownSchema = z
  .object({
    gold: z.number().int().nonnegative().optional(),
    green: z.number().int().nonnegative().optional(),
    orangePlus: z.number().int().nonnegative().optional(),
    orange: z.number().int().nonnegative().optional(),
  })
  .partial();

const addEoiRoundSchema = z
  .object({
    roundDate: z.string(),
    visaSubclass: z.enum(["189", "190", "491"]),
    lowestPoints: z.number().int().min(50).max(130),
    invitations: z.number().int().min(1),
    poolSize: z.number().int().nonnegative().nullable().optional(),
    notes: z.string().nullable().optional(),
    isEstimated: z.boolean(),
    issuingAuthority: z.enum(["FEDERAL", "STATE"]).default("FEDERAL"),
    state: z.enum(STATE_CODES).nullable().optional(),
    pathway: z.string().nullable().optional(),
    tierBreakdown: tierBreakdownSchema.nullable().optional(),
  })
  .refine((data) => data.issuingAuthority !== "STATE" || Boolean(data.state), {
    message: "State is required when issuing authority is STATE",
    path: ["state"],
  });

export type AddEoiRoundInput = z.input<typeof addEoiRoundSchema>;

export type AddEoiRoundResult =
  | { success: true; message: string }
  | { success: false; error: string };

export async function addEoiRound(input: AddEoiRoundInput): Promise<AddEoiRoundResult> {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    redirect("/");
  }

  const parsed = addEoiRoundSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  try {
    const roundDate = new Date(data.roundDate);
    if (Number.isNaN(roundDate.getTime())) {
      return { success: false, error: "Invalid date format" };
    }

    const visaNames: Record<string, string> = {
      "189": "Skilled Independent",
      "190": "Skilled Nominated",
      "491": "Skilled Work Regional",
    };

    const state = data.issuingAuthority === "STATE" ? data.state ?? null : null;

    // Check for duplicate. The DB's own unique constraint only covers
    // (roundDate, visaSubclass) -- state isn't part of it (a nullable
    // column in a composite unique index would let multiple FEDERAL rows
    // with state=null silently bypass dedup, which is worse than this
    // explicit app-level check). This additionally distinguishes a
    // FEDERAL round from a STATE round on the same date/subclass, which
    // the DB constraint alone would incorrectly treat as one slot.
    const existing = await prisma.eoiRound.findFirst({
      where: {
        roundDate,
        visaSubclass: data.visaSubclass,
        issuingAuthority: data.issuingAuthority,
        state,
      },
    });

    if (existing) {
      return { success: false, error: "This round already exists for this subclass/authority/state" };
    }

    await prisma.eoiRound.create({
      data: {
        roundDate,
        visaSubclass: data.visaSubclass,
        visaName: visaNames[data.visaSubclass],
        lowestPoints: data.lowestPoints,
        invitations: data.invitations,
        poolSize: data.poolSize ?? null,
        notes: data.notes ?? null,
        isEstimated: data.isEstimated,
        source: "manual",
        issuingAuthority: data.issuingAuthority,
        state,
        pathway: data.pathway ?? null,
        tierBreakdown: data.tierBreakdown ?? undefined,
      },
    });

    revalidatePath("/(main)/admin/eoi-rounds");
    revalidatePath("/(main)/tools/invitation-rounds");
    revalidateTag("public-invitation-rounds", "max");

    return {
      success: true,
      message: `Added round for subclass ${data.visaSubclass} on ${roundDate.toLocaleDateString()}`,
    };
  } catch (error) {
    console.error("[EOI Admin] Add round failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add round",
    };
  }
}

export type DeleteEoiRoundResult =
  | { success: true; message: string }
  | { success: false; error: string };

export async function deleteEoiRound(id: string): Promise<DeleteEoiRoundResult> {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    redirect("/");
  }

  try {
    const round = await prisma.eoiRound.findUnique({
      where: { id },
      select: { id: true, visaSubclass: true, roundDate: true },
    });

    if (!round) {
      return { success: false, error: "Round not found" };
    }

    await prisma.eoiRound.delete({
      where: { id },
    });

    revalidatePath("/(main)/admin/eoi-rounds");
    revalidatePath("/(main)/tools/invitation-rounds");
    revalidateTag("public-invitation-rounds", "max");

    return {
      success: true,
      message: `Deleted round for subclass ${round.visaSubclass}`,
    };
  } catch (error) {
    console.error("[EOI Admin] Delete round failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete round",
    };
  }
}
