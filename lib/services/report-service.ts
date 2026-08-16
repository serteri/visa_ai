import { Resend } from "resend";

import { prisma } from "@/lib/prisma";
import { generateReadinessPDF } from "@/lib/readiness/generate-pdf";
import { getUserReportById, markReportPdfSent } from "@/src/lib/user-reports";

function isEmailDeliveryEnabled(): boolean {
  if (process.env.ENABLE_TRANSACTIONAL_EMAILS === "true") return true;
  if (process.env.ENABLE_TRANSACTIONAL_EMAILS === "false") return false;
  return Boolean(process.env.RESEND_API_KEY);
}

async function sendFullCheckConfirmationEmail(payload: {
  email: string;
  fullName: string;
  locale: "en" | "tr" | "zh-Hans";
  pdfAttachment?: Uint8Array;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");

  const resend = new Resend(apiKey);
  const fromEmail = process.env.FROM_EMAIL || "Logivisa <onboarding@resend.dev>";
  const isTr = payload.locale === "tr";
  const isZh = payload.locale === "zh-Hans";
  const greeting = payload.fullName
    ? `${isTr ? "Merhaba" : isZh ? "您好" : "Hi"} ${payload.fullName},`
    : isTr
      ? "Merhaba,"
      : isZh
        ? "您好，"
        : "Hi,";

  await resend.emails.send({
    from: fromEmail,
    to: [payload.email],
    subject: isTr
      ? "Tam vize hazirlik raporu talebiniz"
      : isZh
        ? "你的完整签证准备度报告"
        : "Your full visa readiness report request",
    text: isTr
      ? [
          greeting,
          "",
          "Tam vize hazirlik raporu talebiniz alindi.",
          "Yapilandirilmis rapor ekranda olusturuldu. Bu genel bilgi niteligindedir ve goc tavsiyesi degildir.",
        ].join("\n")
      : isZh
        ? [
            greeting,
            "",
            "我们已收到你的完整签证准备度报告请求。",
            "你的高级 PDF 报告已作为附件发送。",
            "本内容仅供一般信息参考，不构成移民建议。",
          ].join("\n")
        : [
            greeting,
            "",
            "Your full visa readiness report request has been received.",
            "Your premium PDF report is attached.",
            "This is general information only and not migration advice.",
          ].join("\n"),
    attachments: payload.pdfAttachment
      ? [
          {
            filename: "visa-readiness-report.pdf",
            content: Buffer.from(payload.pdfAttachment),
          },
        ]
      : undefined,
  });
}

type ViabilityData = {
  cutoffScore: number;
  roundDate: string;
  totalInvited: number;
  occupationTitle: string;
  gap: number;
  viability: "strong" | "viable" | "borderline" | "below_threshold";
  stateAllocation?: {
    state: string;
    visaSubclass: string;
    allocation: number;
    nominationsUsed?: number | null;
  } | null;
};

async function lookupViabilityData(input: {
  occupation?: string;
  calculatedPoints: number;
  preferredState?: string;
  targetedStateNomination: boolean;
  regionalGoal: boolean;
}): Promise<ViabilityData | null> {
  try {
    if (input.preferredState && input.targetedStateNomination) {
      const subclass = input.regionalGoal ? "491" : "190";
      const stateAlloc = await prisma.stateAllocation.findUnique({
        where: {
          programYear_state_visaSubclass: {
            programYear: "2025-26",
            state: input.preferredState,
            visaSubclass: subclass,
          },
        },
      });
      if (stateAlloc) {
        return {
          cutoffScore: 0,
          roundDate: "2026-06",
          totalInvited: 0,
          occupationTitle: input.occupation ?? "your occupation",
          gap: 0,
          viability: "viable",
          stateAllocation: {
            state: stateAlloc.state,
            visaSubclass: stateAlloc.visaSubclass,
            allocation: stateAlloc.allocation,
            nominationsUsed: stateAlloc.nominationsUsed,
          },
        };
      }
    }

    if (input.occupation) {
      const occRecord = await prisma.occupation.findFirst({
        where: {
          OR: [
            { anzscoCode: input.occupation },
            { title: { contains: input.occupation, mode: "insensitive" } },
          ],
        },
      });

      if (occRecord) {
        const cutoff = await prisma.roundCutoff.findFirst({
          where: {
            occupationId: occRecord.id,
            round: { visaSubclass: "189" },
          },
          include: { round: true },
          orderBy: { round: { date: "desc" } },
        });

        if (cutoff) {
          const gap = input.calculatedPoints - cutoff.minimumScore;
          return {
            cutoffScore: cutoff.minimumScore,
            roundDate: cutoff.round.date.toISOString().split("T")[0],
            totalInvited: cutoff.round.totalInvited,
            occupationTitle: occRecord.title,
            gap,
            viability:
              gap >= 10 ? "strong"
                : gap >= 0 ? "viable"
                : gap >= -5 ? "borderline"
                : "below_threshold",
          };
        }
      }
    }

    return null;
  } catch (err) {
    console.warn("[report-service] Viability lookup failed (non-fatal):", err);
    return null;
  }
}

/**
 * Generates the premium PDF and emails it to the report's owner, then marks
 * pdf_sent on the UserReport row. Shared by both unlock paths that grant
 * access to a report: app/api/checkout/route.ts's free-promo grant, and the
 * Stripe webhook's checkout.session.completed handler (see
 * app/api/stripe/webhook/route.ts) -- previously this only ran inline inside
 * the full-check Server Action, which the free-promo/Stripe redirect flow
 * never reaches.
 *
 * Never throws -- a PDF/email failure here must not take down the checkout
 * response that already told the user (and, for Stripe, already charged
 * them) that their report is unlocked. Callers should still wrap their own
 * call in try/catch as defense in depth, but this function's contract is to
 * always resolve.
 */
export async function generateAndSendReport(
  reportId: string,
  email: string,
  fullName?: string
): Promise<{ pdfSent: boolean }> {
  try {
    const record = await getUserReportById(reportId);
    if (!record) {
      console.error(`[report-service] generateAndSendReport: report ${reportId} not found`);
      return { pdfSent: false };
    }

    if (process.env.SIMULATE_EMAIL_DELIVERY === "true") {
      console.log(`[report-service] [simulate] PDF email delivery for report ${reportId} → ${email}`);
      await markReportPdfSent(reportId);
      return { pdfSent: true };
    }

    if (!isEmailDeliveryEnabled()) {
      console.warn(
        `[report-service] Email delivery disabled (no RESEND_API_KEY / ENABLE_TRANSACTIONAL_EMAILS=false); skipping PDF/email for report ${reportId}`
      );
      return { pdfSent: false };
    }

    const locale = record.locale === "tr" ? "tr" : record.locale === "zh-Hans" ? "zh-Hans" : "en";
    const recipientEmail = email || record.email;

    const calculatedPoints = record.report.pointsEstimate?.estimatedPoints ?? 0;
    const migrationGoals = record.input.migrationGoals ?? [];
    const viabilityData = await lookupViabilityData({
      occupation: record.input.occupation,
      calculatedPoints,
      preferredState: record.input.preferredState,
      targetedStateNomination: migrationGoals.some((g) => g === "direct_pr" || g === "regional"),
      regionalGoal: migrationGoals.includes("regional"),
    });

    const pdfBytes = await generateReadinessPDF({
      report: record.report,
      locale,
      saveToFile: false,
      userInputSummary: {
        name: fullName || undefined,
        email: recipientEmail,
        mainGoal: record.input.mainGoal,
        currentCountry: record.input.currentCountry,
        passportCountry: record.input.passportCountry,
        age: record.input.age,
        occupation: record.input.occupation,
        englishLevel: record.input.englishLevel,
        sponsorOrFamily: record.input.sponsorOrFamily,
        biggestConcern: record.input.biggestConcern,
        annualSalaryAud: record.input.annualSalaryAud != null ? String(record.input.annualSalaryAud) : null,
        migrationGoals: record.input.migrationGoals,
        preferredState: record.input.preferredState,
        isAustralianQualification: record.input.qualificationAwardedInAustralia,
        isQualificationRecognized: record.input.isQualificationRecognized,
        viability: viabilityData,
      },
    });

    await sendFullCheckConfirmationEmail({
      email: recipientEmail,
      fullName: fullName ?? "",
      locale,
      pdfAttachment: pdfBytes,
    });

    await markReportPdfSent(reportId);

    return { pdfSent: true };
  } catch (err) {
    console.error(`[report-service] generateAndSendReport failed for report ${reportId}:`, err);
    return { pdfSent: false };
  }
}
