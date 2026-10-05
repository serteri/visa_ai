/**
 * Subject and intro of the "your report is ready" email (lib/services/report-service.ts). During the free beta
 * (lib/readiness/paid-checkout.ts) no payment exists, so the email must never say one was confirmed.
 */
export type ReportEmailLocale = "en" | "tr" | "zh-Hans";

export function reportReadyEmailCopy(locale: ReportEmailLocale, freeBeta: boolean): { subject: string; intro: string } {
  const pick = (en: string, tr: string, zh: string) => (locale === "tr" ? tr : locale === "zh-Hans" ? zh : en);
  if (freeBeta) {
    return {
      subject: pick("Your Readiness Report is Ready (free beta) 🎉", "Hazırlık Raporunuz Hazır (ücretsiz beta) 🎉", "您的准备度报告已就绪（免费测试版）🎉"),
      intro: pick(
        "Your full visa readiness report is available as part of the free beta.",
        "Tam vize hazırlık raporunuz ücretsiz beta kapsamında kullanıma açıldı.",
        "您的完整签证准备度报告已在免费测试版中开放。",
      ),
    };
  }
  return {
    subject: pick("Your Premium Report is Ready 🎉", "Premium Raporunuz Hazır 🎉", "您的高级报告已就绪 🎉"),
    intro: pick(
      "Your payment has been confirmed and your full visa readiness report is now unlocked.",
      "Ödemeniz onaylandı ve tam vize hazırlık raporunuz kilidi açıldı.",
      "您的付款已确认，完整签证准备度报告已解锁。",
    ),
  };
}
