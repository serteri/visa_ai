import { adminNotificationRecipients } from "@/lib/email/admin-recipient";
/**
 * The quick-check emails: the customer "your report is ready" email and the internal Hot/Warm lead notice. They live here (not in the
 * "use server" actions file, where every export would become a callable server action) so each can be tested on its own. Both go through
 * sendChecked: a provider rejection throws, an accepted message logs its id.
 */
import { Resend } from "resend";

import { sendChecked } from "@/lib/email/provider";
import { reportDisclaimer } from "@/lib/reports/report-disclaimer";
import type { ReportHeader } from "@/lib/reports/report-header";

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
  const notificationEmail = adminNotificationRecipients({ env: ["INTERNAL_LEAD_NOTIFICATION_EMAIL"], fallback: "hello@logivisa.com" });

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
    to: notificationEmail,
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
  /** Title, name, date and target visa only: report content is in the PDF alone. */
  header: ReportHeader;
  /** Present only when the client agreed to share their details with a referring agent: the email says so and links to the withdrawal page. */
  sharing?: { agentName: string; withdrawalUrl: string };
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
    ? "Vize Bilgi Raporunuz hazır 🇦🇺"
    : isZh
      ? "您的签证信息报告已生成 🇦🇺"
      : "Your Visa Information Report is ready 🇦🇺";

  const headline = isTr
    ? "Vize Bilgi Raporunuz<br>hazır 🇦🇺"
    : isZh
      ? "您的签证信息报告<br>已生成 🇦🇺"
      : "Your Visa Information Report<br>is ready 🇦🇺";

  const intro = isTr
    ? "Raporunuz, girdiğiniz bilgilerden ve yayımlanmış kaynaklardan oluşturuldu. Rapor içeriği PDF'tedir; aşağıdaki bağlantı rapor sayfanızı açar."
    : isZh
      ? "您的报告根据您填写的信息和公开来源生成。报告内容仅在 PDF 中；下方链接将打开您的报告页面。"
      : "Your report was built from the details you entered and published sources. The report content is in the PDF; the link below opens your report page.";

  const includesLabel = payload.header.title;
  const items = [payload.header.name, payload.header.dateText, payload.header.targetLine].filter((v) => v).map((v) => v.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`));

  const ctaLabel = isTr ? "Raporumu Aç →" : isZh ? "打开我的报告 →" : "Open My Report →";
  const orCopy = isTr ? "Veya bu bağlantıyı kopyalayın:" : isZh ? "或复制此链接：" : "Or copy this link:";
  const footerText = reportDisclaimer(payload.locale);
  // The agent's name is self-entered at registration: escape it before it goes into HTML.
  const agentLabel = payload.sharing ? payload.sharing.agentName.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`) : "";
  const sharingNote = payload.sharing
    ? isTr
      ? `Ayrıntılarınızı sizi yönlendiren göç danışmanı ${agentLabel} ile paylaşmayı kabul ettiniz. <a href="${payload.sharing.withdrawalUrl}" style="color:#06b6d4;">Bu onayı geri çekmek için tıklayın.</a>`
      : isZh
        ? `您已同意将您的信息提供给推荐您的移民代理 ${agentLabel}。<a href="${payload.sharing.withdrawalUrl}" style="color:#06b6d4;">点击此处撤回该同意。</a>`
        : `You agreed to share your details with ${agentLabel}, the migration agent who referred you. <a href="${payload.sharing.withdrawalUrl}" style="color:#06b6d4;">Withdraw that agreement.</a>`
    : "";

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
              <p style="margin:3px 0 0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2.5px;color:#475569;">Australian visa information from published sources</p>
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
              ${sharingNote ? `<p style="margin:12px 0 0;font-size:11px;color:#94a3b8;line-height:1.7;text-align:center;">${sharingNote}</p>` : ""}
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

