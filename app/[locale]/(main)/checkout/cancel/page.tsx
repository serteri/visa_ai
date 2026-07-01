import Link from "next/link";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function CheckoutCancelPage({ params }: Props) {
  const { locale } = await params;
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const t = (en: string, tr: string, zh: string) => (isTr ? tr : isZh ? zh : en);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 pb-24 pt-32 dark:bg-zinc-950">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-4xl dark:bg-zinc-800">
          ↩️
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {t("Payment cancelled", "Ödeme iptal edildi", "付款已取消")}
        </h1>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          {t(
            "No charge was made. You can try again whenever you're ready.",
            "Herhangi bir ücret alınmadı. Hazır olduğunuzda tekrar deneyebilirsiniz.",
            "未进行任何收费。您可以随时重新尝试。"
          )}
        </p>
        <Link
          href={`/${locale}/full-check`}
          className="mt-8 inline-flex items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 px-6 py-3 text-sm font-bold text-indigo-700 transition-all hover:bg-indigo-100 dark:border-indigo-800/40 dark:bg-indigo-950/20 dark:text-indigo-300"
        >
          {t("← Back to report", "← Rapora dön", "← 返回报告")}
        </Link>
      </div>
    </main>
  );
}
