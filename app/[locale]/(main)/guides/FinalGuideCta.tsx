import Link from "next/link";

const copy = {
  en: {
    eyebrow: "Free AI Assessment",
    heading:
      "Wondering how the 2026 fee hikes and the new AUD 79,423 CSIT threshold affect your visa eligibility?",
    body: "Find out in 2 minutes with our data-driven AI Visa Pathway Matcher.",
    button: "⚡ Start Free AI Assessment →",
  },
  tr: {
    eyebrow: "Ücretsiz AI Değerlendirmesi",
    heading:
      "2026 ücret artışlarının ve yeni AUD 79.423 CSIT eşiğinin vize uygunluğunuzu nasıl etkilediğini merak mı ediyorsunuz?",
    body: "Veri odaklı AI Vize Yolu Eşleştiricimiz ile 2 dakikada öğrenin.",
    button: "⚡ Ücretsiz AI Değerlendirmesini Başlat →",
  },
  "zh-Hans": {
    eyebrow: "免费AI评估",
    heading: "想知道2026年费用上涨及新的79,423澳元CSIT门槛将如何影响您的签证资格吗？",
    body: "通过我们数据驱动的AI签证路径匹配器，2分钟内即可获知答案。",
    button: "⚡ 开始免费AI评估 →",
  },
} as const;

export function FinalGuideCta({ locale }: { locale: string }) {
  const t = copy[locale as keyof typeof copy] ?? copy.en;

  return (
    <aside className="relative mt-14 overflow-hidden rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8 text-center shadow-[0_24px_70px_-45px_rgba(79,70,229,0.5)] sm:p-12">
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[300px] w-[500px] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-[100px]" />
      <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-indigo-700">
        {t.eyebrow}
      </span>
      <p className="mx-auto mt-5 max-w-2xl text-2xl font-bold leading-9 text-slate-950">
        {t.heading}
      </p>
      <p className="mx-auto mt-3 max-w-xl text-lg text-slate-600">{t.body}</p>
      <Link
        href={`/${locale}/ai-visa-match`}
        className="group mt-8 inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-10 py-5 text-xl font-extrabold text-white shadow-2xl shadow-indigo-500/40 transition-all duration-300 hover:scale-105 hover:shadow-indigo-500/60 sm:px-12 sm:py-6 sm:text-2xl"
      >
        {t.button}
      </Link>
    </aside>
  );
}
