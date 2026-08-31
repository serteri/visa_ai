"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useParams } from "next/navigation";
import Link from "next/link";

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
  const reportId = searchParams.get("reportId");

  useEffect(() => {
    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      // Pricing diverges by product: the readiness report ("premium") is
      // $19.99 + GST, while the PDF guides (pdf_book, pdf_book_global)
      // remain $9.99.
      const value = product === "premium" ? 19.99 : 9.99;
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
            "Your report is ready. Download it below now, or keep the copy sent to your inbox.",
            "Raporunuz hazır. Aşağıdaki butondan hemen indirebilir veya e-posta kutunuza gönderilen kopyasını saklayabilirsiniz.",
            "您的报告已准备就绪。您可以立即在下方下载，或保留发送到您邮箱的副本。"
          )}
        </p>

        {/* No "Go to Dashboard" link here on purpose: most people landing on
            this page are guest checkouts with no LogiVisa account, so a
            dashboard link just routes them into next-auth's sign-in wall
            instead of anything useful. */}
        <div className="mt-8 flex flex-col gap-3">
          {reportId && (
            <a
              href={`/api/reports/${reportId}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:from-indigo-600 hover:to-purple-700"
            >
              {t("Download Report →", "Raporu İndir →", "下载报告 →")}
            </a>
          )}
          <Link
            href={`/${locale}`}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-slate-200 dark:hover:bg-zinc-800"
          >
            {t("Back to Home", "Ana Sayfaya Dön", "返回首页")}
          </Link>
        </div>
      </div>
    </main>
  );
}
