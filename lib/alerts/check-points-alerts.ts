import { Resend } from "resend";

import { prisma } from "@/lib/prisma";

type AlertCheckResult = {
  checked: number;
  triggered: number;
  skipped: number;
};

function isCooldownComplete(lastTriggered: Date | null): boolean {
  if (!lastTriggered) return true;
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  return Date.now() - lastTriggered.getTime() >= THIRTY_DAYS_MS;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-AU", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export async function checkAndSendAlerts(): Promise<AlertCheckResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || "Logivisa <onboarding@resend.dev>";
  const appBaseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://logivisa.com").replace(/\/$/, "");

  const alerts = await prisma.pointsAlert.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  const latestBySubclassList = await prisma.eoiRound.findMany({
    where: { visaSubclass: { in: ["189", "190", "491"] } },
    orderBy: [{ visaSubclass: "asc" }, { roundDate: "desc" }],
  });

  const latestBySubclass = new Map<string, (typeof latestBySubclassList)[number]>();
  for (const round of latestBySubclassList) {
    if (!latestBySubclass.has(round.visaSubclass)) {
      latestBySubclass.set(round.visaSubclass, round);
    }
  }

  if (!apiKey) {
    console.error("[Points Alerts] RESEND_API_KEY is missing; email dispatch skipped.");
    return {
      checked: alerts.length,
      triggered: 0,
      skipped: alerts.length,
    };
  }

  const resend = new Resend(apiKey);

  let triggered = 0;
  let skipped = 0;

  for (const alert of alerts) {
    const latest = latestBySubclass.get(alert.visaSubclass);
    if (!latest || latest.lowestPoints === null) {
      skipped += 1;
      continue;
    }

    const shouldTrigger =
      latest.lowestPoints <= alert.targetPoints && isCooldownComplete(alert.lastTriggered ?? null);

    if (!shouldTrigger) {
      skipped += 1;
      continue;
    }

    const unsubscribeUrl = `${appBaseUrl}/api/alerts/unsubscribe?email=${encodeURIComponent(alert.email)}&id=${encodeURIComponent(alert.id)}`;

    const subject = `Points dropped to ${latest.lowestPoints} for subclass ${alert.visaSubclass} - LogiVisa Alert`;
    const body = [
      `Good news! The points cutoff for Subclass ${alert.visaSubclass} has dropped to ${latest.lowestPoints} points.`,
      `Latest round: ${formatDate(latest.roundDate)}`,
      `Your target: ${alert.targetPoints} points`,
      `Current cutoff: ${latest.lowestPoints} points`,
      "",
      `Check invitation rounds -> ${appBaseUrl}/en/tools/invitation-rounds`,
      "",
      "You're receiving this because you set an alert on LogiVisa.",
      `Unsubscribe: ${unsubscribeUrl}`,
    ].join("\n");

    try {
      await resend.emails.send({
        from: fromEmail,
        to: [alert.email],
        subject,
        text: body,
      });

      await prisma.pointsAlert.update({
        where: { id: alert.id },
        data: { lastTriggered: new Date() },
      });

      triggered += 1;
      console.log(
        `[Points Alerts] Sent alert to ${alert.email} for subclass ${alert.visaSubclass} at ${latest.lowestPoints} points.`
      );
    } catch (error) {
      skipped += 1;
      console.error("[Points Alerts] Failed to send alert", { id: alert.id, error });
    }
  }

  return {
    checked: alerts.length,
    triggered,
    skipped,
  };
}
