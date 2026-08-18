import { Resend } from "resend";

import { prisma } from "@/lib/prisma";
import { generateReadinessPDF } from "@/lib/readiness/generate-pdf";
import { getUserReportById, markReportPdfSent } from "@/src/lib/user-reports";

function isEmailDeliveryEnabled(): boolean {
  if (process.env.ENABLE_TRANSACTIONAL_EMAILS === "true") return true;
  if (process.env.ENABLE_TRANSACTIONAL_EMAILS === "false") return false;
  return Boolean(process.env.RESEND_API_KEY);
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL?.trim() || "https://logivisa.com";
}

/**
 * Premium-unlocked confirmation email. Deliberately link-only, NEVER a PDF
 * attachment: attaching a PDF to every unlock email is a real spam/deliverability
 * risk at volume (attachments push messages into bulk-mail filtering more
 * aggressively than a plain link), and the PDF is already available on demand,
 * gated by the same is_unlocked check, via /api/reports/[reportId]/pdf --
 * duplicating those bytes into an email is unnecessary exposure, not a feature.
 */
async function sendPremiumReportReadyEmail(payload: {
  email: string;
  fullName: string;
  locale: "en" | "tr" | "zh-Hans";
  reportLink: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");

  const resend = new Resend(apiKey);
  // Must match a verified sending domain, NOT Resend's onboarding@resend.dev
  // sandbox address -- that sandbox sender can only deliver to the Resend
  // account owner's own inbox (serter@logivisa.com), and returns a normal
  // 200 while doing it, so every other recipient (i.e. every real customer)
  // silently never received their report.
  const fromEmail = process.env.FROM_EMAIL || "LogiVisa <noreply@logivisa.com>";
  const isTr = payload.locale === "tr";
  const isZh = payload.locale === "zh-Hans";
  const greeting = payload.fullName
    ? `${isTr ? "Merhaba" : isZh ? "您好" : "Hi"} ${payload.fullName},`
    : isTr
      ? "Merhaba,"
      : isZh
        ? "您好，"
        : "Hi,";

  const subject = isTr
    ? "Premium Raporunuz Hazır 🎉"
    : isZh
      ? "您的高级报告已就绪 🎉"
      : "Your Premium Report is Ready 🎉";

  const intro = isTr
    ? "Ödemeniz onaylandı ve tam vize hazırlık raporunuz kilidi açıldı."
    : isZh
      ? "您的付款已确认，完整签证准备度报告已解锁。"
      : "Your payment has been confirmed and your full visa readiness report is now unlocked.";

  const ctaLabel = isTr
    ? "Raporumu Görüntüle ve İndir →"
    : isZh
      ? "查看并下载我的报告 →"
      : "View & Download My Report →";

  const orCopy = isTr ? "Veya bu bağlantıyı kopyalayın:" : isZh ? "或复制此链接：" : "Or copy this link:";

  const footerText = isTr
    ? "Bu yalnızca genel bilgidir ve göç tavsiyesi değildir."
    : isZh
      ? "本内容仅为一般信息，不构成移民建议。"
      : "This is general information only and not migration advice.";

  const html = `<!DOCTYPE html>
<html lang="${payload.locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${subject}</title></head>
<body style="margin:0;padding:0;background-color:#020617;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#020617;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#0f172a;border-radius:16px;overflow:hidden;border:1px solid #1e293b;">
        <tr><td style="height:4px;background:linear-gradient(90deg,#16a34a,#059669);"></td></tr>
        <tr><td style="padding:36px 40px 20px;">
          <p style="margin:0;font-size:22px;font-weight:800;color:#16a34a;letter-spacing:-0.5px;">LogiVisa</p>
        </td></tr>
        <tr><td style="padding:0 40px 36px;">
          <h1 style="margin:0 0 20px;font-size:26px;font-weight:800;color:#f1f5f9;">${subject}</h1>
          <p style="margin:0 0 12px;font-size:16px;color:#94a3b8;">${greeting}</p>
          <p style="margin:0;font-size:15px;color:#94a3b8;line-height:1.7;">${intro}</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0 0;">
            <tr><td align="center">
              <a href="${payload.reportLink}" style="display:inline-block;background:linear-gradient(135deg,#16a34a,#059669);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 44px;border-radius:12px;">${ctaLabel}</a>
            </td></tr>
          </table>
          <p style="margin:20px 0 0;font-size:12px;color:#475569;text-align:center;">${orCopy}<br><a href="${payload.reportLink}" style="color:#16a34a;word-break:break-all;">${payload.reportLink}</a></p>
        </td></tr>
        <tr><td style="padding:24px 40px;background-color:#020617;border-top:1px solid #1e293b;">
          <p style="margin:0;font-size:11px;color:#475569;line-height:1.7;text-align:center;">${footerText}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await resend.emails.send({
    from: fromEmail,
    to: [payload.email],
    subject,
    html,
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

type UserReportRecord = NonNullable<Awaited<ReturnType<typeof getUserReportById>>>;

/**
 * Regenerates the premium PDF's bytes from a report's stored report_json/
 * input_json. Shared by generateAndSendReport (email attachment) and the
 * guest-facing download route (app/api/reports/[reportId]/pdf/route.ts) so
 * the PDF a customer downloads from the success page is byte-for-byte the
 * same generation path as the one emailed to them.
 */
async function buildReportPdf(record: UserReportRecord, fullName?: string): Promise<Uint8Array> {
  const locale = record.locale === "tr" ? "tr" : record.locale === "zh-Hans" ? "zh-Hans" : "en";

  const calculatedPoints = record.report.pointsEstimate?.estimatedPoints ?? 0;
  const migrationGoals = record.input.migrationGoals ?? [];
  const viabilityData = await lookupViabilityData({
    occupation: record.input.occupation,
    calculatedPoints,
    preferredState: record.input.preferredState,
    targetedStateNomination: migrationGoals.some((g) => g === "direct_pr" || g === "regional"),
    regionalGoal: migrationGoals.includes("regional"),
  });

  return generateReadinessPDF({
    report: record.report,
    locale,
    saveToFile: false,
    userInputSummary: {
      name: fullName || record.fullName || undefined,
      email: record.email,
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
}

/**
 * Regenerates the PDF for an already-unlocked report, for the guest-facing
 * "Download Report" button on the checkout success page. Returns null if the
 * report doesn't exist or isn't unlocked yet -- callers must not serve a PDF
 * for a report nobody has paid for (or been granted the free promo on) just
 * because its (unguessable, UUID) reportId leaked into a URL.
 */
export async function getReportPdfForDownload(
  reportId: string
): Promise<{ pdfBytes: Uint8Array; fileName: string } | null> {
  const record = await getUserReportById(reportId);
  if (!record || !record.isUnlocked) return null;

  const pdfBytes = await buildReportPdf(record);
  return { pdfBytes, fileName: `visa-readiness-report-${reportId}.pdf` };
}

/**
 * Sends the "your premium report is ready" email -- a secure link to
 * result?reportId=... (gated by is_unlocked, see app/api/reports/
 * [reportId]/pdf/route.ts and the result page), never a PDF attachment.
 * Marks pdf_sent on the UserReport row (repurposed here to mean "the
 * unlock confirmation email was sent", not literally that a PDF went out
 * as an attachment -- kept the same column/name to avoid a migration).
 * Shared by all three unlock paths: app/api/checkout/route.ts's
 * free-promo grant, the Stripe webhook's checkout.session.completed
 * handler, and unlockPremiumReportInternal's admin fast path.
 *
 * Never throws -- an email failure here must not take down the checkout
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

    const recipientEmail = email || record.email;

    if (process.env.SIMULATE_EMAIL_DELIVERY === "true") {
      console.log(
        `[report-service] Müşteri e-postası atlandı (SIMULATE_EMAIL_DELIVERY=true) -- report ${reportId} → ${recipientEmail}`
      );
      await markReportPdfSent(reportId);
      return { pdfSent: true };
    }

    if (!isEmailDeliveryEnabled()) {
      console.warn(
        `[report-service] Müşteri e-postası atlandı (RESEND_API_KEY yok / ENABLE_TRANSACTIONAL_EMAILS=false) -- report ${reportId} → ${recipientEmail}`
      );
      return { pdfSent: false };
    }

    const locale = record.locale === "tr" ? "tr" : record.locale === "zh-Hans" ? "zh-Hans" : "en";
    const reportLink = `${getBaseUrl()}/${locale}/full-check/result?reportId=${reportId}`;

    try {
      console.log(`[report-service] Müşteriye onay e-postası gönderiliyor -- report ${reportId} → ${recipientEmail}`);
      await sendPremiumReportReadyEmail({
        email: recipientEmail,
        fullName: fullName ?? record.fullName ?? "",
        locale,
        reportLink,
      });
    } catch (emailErr) {
      console.error(`[report-service] Müşteri e-postası GÖNDERİLEMEDİ -- report ${reportId} → ${recipientEmail}:`, emailErr);
      return { pdfSent: false };
    }

    await markReportPdfSent(reportId);
    console.log(`[report-service] Müşteri e-postası gönderildi -- report ${reportId} → ${recipientEmail}`);

    return { pdfSent: true };
  } catch (err) {
    console.error(`[report-service] generateAndSendReport failed for report ${reportId}:`, err);
    return { pdfSent: false };
  }
}
