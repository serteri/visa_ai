"use server";

import { prisma } from "@/lib/prisma";

export type AlertResult = { success: true; message: string } | { success: false; error: string };

export async function savePointsAlert(
  email: string,
  targetPoints: number,
  visaSubclass: string
): Promise<AlertResult> {
  const trimmedEmail = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return { success: false, error: "Please enter a valid email address." };
  }
  if (!targetPoints || targetPoints < 50 || targetPoints > 130) {
    return { success: false, error: "Target points must be between 50 and 130." };
  }
  if (!["189", "190", "491"].includes(visaSubclass)) {
    return { success: false, error: "Please select a valid visa subclass." };
  }

  const existing = await prisma.pointsAlert.findFirst({
    where: { email: trimmedEmail, visaSubclass },
  });

  if (existing) {
    await prisma.pointsAlert.update({
      where: { id: existing.id },
      data: { targetPoints, isActive: true },
    });
  } else {
    await prisma.pointsAlert.create({
      data: { email: trimmedEmail, targetPoints, visaSubclass },
    });
  }

  return {
    success: true,
    message: `We'll email you when the cutoff drops to ${targetPoints} points or below for subclass ${visaSubclass}.`,
  };
}
