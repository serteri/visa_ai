/**
 * Subject and intro of the "your report is ready" email (lib/services/report-service.ts). Paid: the payment was confirmed. Unpaid (the sale
 * switched off, or an admin unlock): no payment exists, so the email must never say one was confirmed. The product is the
 * Visa Information Report.
 */
export type ReportEmailLocale = "en" | "tr" | "zh-Hans";

export function reportReadyEmailCopy(locale: ReportEmailLocale, withoutPayment: boolean): { subject: string; intro: string } {
  const pick = (en: string, tr: string, zh: string) => (locale === "tr" ? tr : locale === "zh-Hans" ? zh : en);
  if (withoutPayment) {
    return {
      subject: pick("Your Visa Information Report is ready 🎉", "Vize Bilgi Raporunuz hazır 🎉", "您的签证信息报告已就绪 🎉"),
      intro: pick(
        "Your full Visa Information Report is available.",
        "Tam Vize Bilgi Raporunuz kullanıma açıldı.",
        "您的完整签证信息报告已开放。",
      ),
    };
  }
  return {
    subject: pick("Your Visa Information Report is ready 🎉", "Vize Bilgi Raporunuz hazır 🎉", "您的签证信息报告已就绪 🎉"),
    intro: pick(
      "Your payment has been confirmed and your full Visa Information Report is now unlocked.",
      "Ödemeniz onaylandı ve tam Vize Bilgi Raporunuzun kilidi açıldı.",
      "您的付款已确认，完整的签证信息报告已解锁。",
    ),
  };
}
