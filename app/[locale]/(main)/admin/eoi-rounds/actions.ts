"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export type AddEoiRoundInput = {
  roundDate: string;
  visaSubclass: string;
  lowestPoints: number;
  invitations: number;
  poolSize?: number | null;
  notes?: string | null;
  isEstimated: boolean;
};

export type AddEoiRoundResult =
  | { success: true; message: string }
  | { success: false; error: string };

export async function addEoiRound(input: AddEoiRoundInput): Promise<AddEoiRoundResult> {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    redirect("/");
  }

  try {
    const roundDate = new Date(input.roundDate);
    if (Number.isNaN(roundDate.getTime())) {
      return { success: false, error: "Invalid date format" };
    }

    if (!["189", "190", "491"].includes(input.visaSubclass)) {
      return { success: false, error: "Invalid visa subclass" };
    }

    if (input.lowestPoints < 50 || input.lowestPoints > 130) {
      return { success: false, error: "Points must be between 50 and 130" };
    }

    if (input.invitations < 1) {
      return { success: false, error: "Invitations must be at least 1" };
    }

    const visaNames: Record<string, string> = {
      "189": "Skilled Independent",
      "190": "Skilled Nominated",
      "491": "Skilled Work Regional",
    };

    // Check for duplicate
    const existing = await prisma.eoiRound.findUnique({
      where: {
        roundDate_visaSubclass: {
          roundDate,
          visaSubclass: input.visaSubclass,
        },
      },
    });

    if (existing) {
      return { success: false, error: "This round already exists for this subclass" };
    }

    await prisma.eoiRound.create({
      data: {
        roundDate,
        visaSubclass: input.visaSubclass,
        visaName: visaNames[input.visaSubclass],
        lowestPoints: input.lowestPoints,
        invitations: input.invitations,
        poolSize: input.poolSize ?? null,
        notes: input.notes ?? null,
        isEstimated: input.isEstimated,
        source: "manual",
      },
    });

    revalidatePath("/(main)/admin/eoi-rounds");
    revalidatePath("/(main)/tools/invitation-rounds");

    return {
      success: true,
      message: `Added round for subclass ${input.visaSubclass} on ${roundDate.toLocaleDateString()}`,
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
