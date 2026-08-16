"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useParams } from "next/navigation";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export default function CheckoutSuccessPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) ?? "en";
  const product = searchParams.get("product");

  useEffect(() => {
    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      // Pricing diverges by product: the readiness report ("premium") is $49,
      // while the PDF guides (pdf_book, pdf_book_global) remain $9.99.
      const value = product === "premium" ? 49 : 9.99;
      window.fbq("track", "Purchase", {
        value,
        currency: "USD",
        content_type: "product",
        content_name: product ?? "premium",
      });
    }
  }, [product]);

  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const t = (en: string, tr: string, zh: string) => (isTr ? tr : isZh ? zh : en);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 pb-24 dark:bg-zinc-950">
      <div className="mx-auto max-w-md rounded-2xl border border-emerald-200 bg-white p-10 text-center shadow-xl dark:border-emerald-800/40 dark:bg-zinc-900">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-4xl dark:bg-emerald-900/30">
          ✅
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {t("Payment confirmed!", "Ödeme onaylandı!", "付款已确认！")}
        </h1>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          {t(
            "Your purchase is complete. Check your email for next steps.",
            "Satın alma işleminiz tamamlandı. Sonraki adımlar için e-postanızı kontrol edin.",
            "您的购买已完成。请查收邮件了解后续步骤。"
          )}
        </p>
        {/* No "Go to Dashboard" link here on purpose: most people landing on
            this page are guest checkouts with no LogiVisa account, so a
            dashboard link just routes them into next-auth's sign-in wall
            instead of anything useful. The report itself is delivered by
            email (see lib/services/report-service.ts), not this page. */}
        <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-900 dark:border-emerald-800/40 dark:bg-emerald-900/20 dark:text-emerald-200">
          {t(
            "Your report has been sent to your email address. Please check your inbox (and Spam folder).",
            "Raporunuz e-posta adresinize gönderildi. Lütfen gelen kutunuzu (ve Spam klasörünü) kontrol edin.",
            "您的报告已发送至您的邮箱。请查收收件箱（以及垃圾邮件文件夹）。"
          )}
        </div>
      </div>
    </main>
  );
}
