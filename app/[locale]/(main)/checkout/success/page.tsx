"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
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
        <Link
          href={`/${locale}/dashboard`}
          className="mt-8 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:from-indigo-600 hover:to-purple-700"
        >
          {t("Go to Dashboard →", "Dashboard'a Git →", "前往控制台 →")}
        </Link>
      </div>
    </main>
  );
}
