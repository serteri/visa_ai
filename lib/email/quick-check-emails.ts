/**
 * The quick-check emails: the customer "your report is ready" email and the internal Hot/Warm lead notice. They live here (not in the
 * "use server" actions file, where every export would become a callable server action) so each can be tested on its own. Both go through
 * sendChecked: a provider rejection throws, an accepted message logs its id.
 */
import { Resend } from "resend";

import { sendChecked } from "@/lib/email/provider";
import type { FullCheckQuickPreview } from "@/app/[locale]/(main)/full-check/actions";

type SupportedLocale = "en" | "tr" | "zh-Hans";

// Internal-only lead-scoring notification (Hot/Warm tiers, never Cold — see
// computeInternalLeadTier). Distinct from sendFullCheckAdminEmail above:
// this one is deliberately framed as an unverified self-reported signal for
// an agent to re-verify, not a confirmed qualification claim, since none of
// this data has document/test evidence attached at the free-tier stage.
export async function sendInternalLeadTierEmail(payload: {
  tier: "Hot" | "Warm";
  fullName: string;
  email: string;
  phone?: string;
  occupationDisplay: string;
  country: string;
  preferredPathway: string;
  estimatedPoints?: number;
  englishLevel: string;
  reportLink: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const notificationEmail = process.env.INTERNAL_LEAD_NOTIFICATION_EMAIL || "hello@logivisa.com";

  if (!apiKey) {
    console.warn("[email] full_check_internal_lead_notice not sent: RESEND_API_KEY is not configured");
    return false;
  }

  const resend = new Resend(apiKey);
  const fromEmail = process.env.FROM_EMAIL || "LogiVisa <noreply@logivisa.com>";

  // hasRealEnglishEvidence() takes a full ReadinessInput, which this
  // notification payload isn't -- inline the same englishLevel-only
  // predicate rather than fabricating a fake ReadinessInput.
  const englishLevelNormalized = payload.englishLevel.trim().toLowerCase();
  const englishEvidenceProvided = englishLevelNormalized !== "" && englishLevelNormalized !== "none";
  const englishWarningLine = !englishEvidenceProvided
    ? `⚠️ No English test evidence on file — self-reported "${payload.englishLevel || "unspecified"}" band is unverified; a lower actual result could drop this profile below threshold.`
    : null;

  const bodyLines = [
    "Self-reported potential match — not verified. Confirm occupation, English test evidence, and employment history directly with the candidate before proceeding.",
    "",
    `Tier: ${payload.tier}`,
    "",
    `Name: ${payload.fullName || "-"}`,
    `Email: ${payload.email}`,
    `Phone: ${payload.phone && payload.phone.trim() ? payload.phone : "Not yet provided"}`,
    `Occupation: ${payload.occupationDisplay || "-"}`,
    `Country / pathway: ${payload.country} — ${payload.preferredPathway || "-"}`,
    `Self-reported points estimate: ${payload.estimatedPoints ?? "-"}`,
    `English level (self-reported): ${payload.englishLevel || "-"}`,
    "",
    ...(englishWarningLine ? [englishWarningLine, ""] : []),
    `Full report: ${payload.reportLink}`,
  ];

  await sendChecked("full_check_internal_lead_notice", resend, {
    from: fromEmail,
    to: [notificationEmail],
    subject: `${payload.tier === "Hot" ? "🔥" : "🌤️"} ${payload.tier} lead: ${payload.fullName || "Unknown"} (self-reported, unverified)`,
    text: bodyLines.join("\n"),
  });

  return true;
}

export async function sendReportReadyEmail(payload: {
  email: string;
  fullName: string;
  reportLink: string;
  locale: SupportedLocale;
  preview: FullCheckQuickPreview;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] report_ready_free_check not sent: RESEND_API_KEY is not configured");
    return;
  }

  const resend = new Resend(apiKey);
  // Must be a verified sending domain -- Resend's onboarding@resend.dev
  // sandbox sender only reliably delivers to the Resend account owner's own
  // inbox, returning 200 while silently not delivering to this function's
  // actual recipient (payload.email, a customer).
  const fromEmail = process.env.FROM_EMAIL || "LogiVisa <noreply@logivisa.com>";
  const isTr = payload.locale === "tr";
  const isZh = payload.locale === "zh-Hans";

  const greeting = payload.fullName
    ? `${isTr ? "Merhaba" : isZh ? "您好" : "Hi"} ${payload.fullName},`
    : isTr ? "Merhaba," : isZh ? "您好，" : "Hi,";

  const subject = isTr
    ? "LogiVisa AI Hazırlık Raporunuz Hazır 🇦🇺"
    : isZh
      ? "您的 LogiVisa AI 准备度报告已生成 🇦🇺"
      : "Your LogiVisa AI Readiness Report is Ready 🇦🇺";

  const headline = isTr
    ? "Hazırlık Raporunuz<br>Hazır 🇦🇺"
    : isZh
      ? "您的准备度报告<br>已生成 🇦🇺"
      : "Your Readiness Report<br>is Ready 🇦🇺";

  const intro = isTr
    ? "Avustralya PR yol haritası analiziniz tamamlandı. Profilinizi nitelikli göç yolları, puan uygunluğu ve temel risk faktörleri açısından değerlendirdik."
    : isZh
      ? "您的澳大利亚PR路径分析已完成。我们已从技术移民路径、积分资格和关键风险因素等方面评估了您的档案。"
      : "Your AI-generated Australian PR pathway analysis is complete. We've assessed your profile across skilled migration pathways, points eligibility, and key risk factors.";

  // Actual numbers from this submission's Quick Pathway Check, not generic
  // bullet labels -- payload.preview is the same object persisted to
  // UserReport.previewData and shown on the locked result page, so this
  // email and that page never disagree about what was calculated.
  const includesLabel = isTr ? "Hızlı Sonuçlarınız" : isZh ? "您的快速结果" : "Your Quick Results";
  const pointsLine = isTr
    ? `Tahmini puan: ${payload.preview.estimatedPoints ?? "-"}`
    : isZh
      ? `预估积分：${payload.preview.estimatedPoints ?? "-"}`
      : `Estimated points: ${payload.preview.estimatedPoints ?? "-"}`;
  const items = [
    pointsLine,
    ...payload.preview.pathways.slice(0, 3).map(
      (p) => `${p.visaName} (${p.subclass})`
    ),
  ];

  const ctaLabel = isTr ? "Tam Raporumu Görüntüle →" : isZh ? "查看完整报告 →" : "View My Full Report →";
  const orCopy = isTr ? "Veya bu bağlantıyı kopyalayın:" : isZh ? "或复制此链接：" : "Or copy this link:";
  const footerText = isTr
    ? "LogiVisa otomatik bir analiz aracıdır ve göçmenlik tavsiyesi sağlamaz. Hukuki danışmanlık için kayıtlı bir MARA acentesiyle görüşün. Bu rapor yalnızca genel bilgi amaçlıdır."
    : isZh
      ? "LogiVisa是一款自动分析工具，不提供移民建议。如需法律建议，请咨询注册MARA顾问。本报告仅供一般信息参考。"
      : "LogiVisa is an automated analysis tool and does not provide migration advice. For legal advice, consult a registered MARA agent. This report is for general information purposes only.";

  const html = `<!DOCTYPE html>
<html lang="${payload.locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#020617;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#020617;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#0f172a;border-radius:16px;overflow:hidden;border:1px solid #1e293b;">

          <!-- Accent bar -->
          <tr><td style="height:4px;background:linear-gradient(90deg,#06b6d4,#0284c7);"></td></tr>

          <!-- Brand header -->
          <tr>
            <td style="padding:36px 40px 20px;">
              <p style="margin:0;font-size:22px;font-weight:800;color:#06b6d4;letter-spacing:-0.5px;">LogiVisa</p>
              <p style="margin:3px 0 0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2.5px;color:#475569;">AI-Powered Australian Migration Intelligence</p>
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td style="padding:0 40px 36px;">
              <h1 style="margin:0 0 20px;font-size:30px;font-weight:800;color:#f1f5f9;line-height:1.25;">${headline}</h1>
              <p style="margin:0 0 12px;font-size:16px;color:#94a3b8;line-height:1.3;">${greeting}</p>
              <p style="margin:0;font-size:15px;color:#94a3b8;line-height:1.7;">${intro}</p>

              <!-- Report contents card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 0;background-color:#1e293b;border-radius:12px;border:1px solid #334155;">
                <tr>
                  <td style="padding:24px 28px;">
                    <p style="margin:0 0 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#06b6d4;">${includesLabel}</p>
                    ${items.map((item) => `<p style="margin:0 0 10px;font-size:14px;color:#cbd5e1;line-height:1.5;">✓ &nbsp;${item}</p>`).join("")}
                  </td>
                </tr>
              </table>

              <!-- CTA button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0 0;">
                <tr>
                  <td align="center">
                    <a href="${payload.reportLink}" style="display:inline-block;background:linear-gradient(135deg,#06b6d4,#0284c7);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 44px;border-radius:12px;letter-spacing:0.2px;">${ctaLabel}</a>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <p style="margin:20px 0 0;font-size:12px;color:#475569;text-align:center;">${orCopy}<br><a href="${payload.reportLink}" style="color:#06b6d4;word-break:break-all;">${payload.reportLink}</a></p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background-color:#020617;border-top:1px solid #1e293b;">
              <p style="margin:0;font-size:11px;color:#475569;line-height:1.7;text-align:center;">${footerText}</p>
              <p style="margin:12px 0 0;font-size:11px;color:#334155;text-align:center;">© 2026 LogiVisa &nbsp;·&nbsp; <a href="https://logivisa.com" style="color:#475569;text-decoration:none;">logivisa.com</a></p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await sendChecked("report_ready_free_check", resend, {
    from: fromEmail,
    to: [payload.email],
    subject,
    html,
  });
}

