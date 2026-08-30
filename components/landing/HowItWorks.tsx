import Link from "next/link";
import { EyeOff, Lock, ShieldCheck } from "lucide-react";

interface HowItWorksProps {
  locale: string;
}

/** "How it works" — 3 numbered steps in the minimalist landing redesign.
 *  Each step links to the tool that fulfills it. */
export function HowItWorks({ locale }: HowItWorksProps) {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";

  const steps = [
    {
      title: isTr
        ? "Mesleğini ve vizeni seç"
        : isZh
          ? "选择您的职业与签证"
          : "Choose your occupation & visa",
      description: isTr
        ? "Mesleğinizi aratın veya seçin, hedef vizenizi belirleyin. Sistem ANZSCO kodunuzu ve sizi değerlendirecek resmi kurumu saniyeler içinde eşleştirir."
        : isZh
          ? "搜索或选择您的职业并确定目标签证。系统会在几秒内匹配您的 ANZSCO 职业代码和对应的官方评估机构。"
          : "Search or select your occupation and set your target visa. The system instantly matches your ANZSCO code and the official authority that assesses you.",
      href: `/${locale}/tools/anzsco-finder`,
      cta: isTr ? "Meslek ara" : isZh ? "搜索职业" : "Search occupations",
    },
    {
      title: isTr
        ? "Puanını hesapla veya durumunu gir"
        : isZh
          ? "计算您的分数或填写现状"
          : "Calculate your points or enter your status",
      description: isTr
        ? "Yaş, İngilizce, eğitim ve deneyim bilgilerinizi girin — tahmini puanınızı ve vize barajlarına ne kadar yakın olduğunuzu anında görün."
        : isZh
          ? "输入年龄、英语、学历和工作经验 — 立即查看预估分数以及您与签证分数线的差距。"
          : "Enter your age, English, education and experience — instantly see your estimated score and how close you are to visa thresholds.",
      href: `/${locale}/tools/points-calculator`,
      cta: isTr ? "Puan hesapla" : isZh ? "计算分数" : "Calculate points",
    },
    {
      title: isTr
        ? "Resmi kurum rehberini PDF olarak indir"
        : isZh
          ? "立即下载官方评估机构 PDF 指南"
          : "Download the official authority guide as PDF",
      description: isTr
        ? "Değerlendirme kurumunuzun ücretleri, süreçleri ve evrak gerekliliklerini içeren kapsamlı resmi rehberi tek tıkla anında indirin."
        : isZh
          ? "一键下载包含您的评估机构费用、流程和材料要求的完整官方指南。"
          : "Instantly download the complete official guide covering your authority's fees, process and document requirements in one click.",
      href: `/${locale}/tools/skills-assessment`,
      cta: isTr ? "Rehberi indir" : isZh ? "下载指南" : "Download guide",
    },
  ];

  return (
    <section className="case-file bg-[var(--cf-bg)] py-24 sm:py-32">
      <div className="section-shell">
        <div className="max-w-2xl">
          <p className="cf-mono mb-4 text-xs uppercase tracking-[0.14em] text-[var(--cf-accent)]">
            {isTr ? "Nasıl Çalışır" : isZh ? "使用流程" : "How It Works"}
          </p>
          <h2 className="cf-serif text-4xl font-extrabold tracking-tight text-[var(--cf-fg)] sm:text-5xl">
            {isTr ? "Üç adımda yolunuzu bulun." : isZh ? "三步找到您的路径。" : "Find your path in three steps."}
          </h2>
          <p className="mt-4 text-lg font-medium leading-relaxed text-slate-700">
            {isTr
              ? "Başvurunuz için binlerce dolar harcamadan önce, gerçek verilere dayalı net bir yol haritası edinin."
              : isZh
                ? "在花费数千澳元申请之前，获得一份基于真实数据的清晰路线图。"
                : "Get a clear, data-driven roadmap before spending thousands on applications."}
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-8 transition-colors hover:bg-slate-50 sm:p-10"
            >
              <div className="flex items-baseline justify-between">
                <span className="cf-serif text-5xl font-medium text-[var(--cf-fg)]/15 transition-colors group-hover:text-[var(--cf-accent)]">
                  0{index + 1}
                </span>
                <span className="cf-mono text-[0.65rem] uppercase tracking-[0.14em] text-slate-700">
                  {isTr ? "Adım" : isZh ? "步骤" : "Step"}
                </span>
              </div>

              <h3 className="cf-serif mt-6 text-xl font-medium text-slate-900">{step.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-700">
                {step.description}
              </p>

              <Link
                href={step.href}
                className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[var(--cf-accent)] transition-colors hover:text-[var(--cf-fg)]"
              >
                {step.cta}
                <span aria-hidden className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm font-medium text-slate-700">
          <span className="flex items-center gap-2">
            <EyeOff className="h-4 w-4" />
            {isTr ? "Anonim Değerlendirme" : isZh ? "匿名评估" : "Anonymous Assessment"}
          </span>
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            {isTr ? "Veri Paylaşımı Yok" : isZh ? "不共享数据" : "No Data Sharing"}
          </span>
          <span className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            {isTr ? "Banka Düzeyinde Şifreleme" : isZh ? "银行级加密" : "Bank-Level Encryption"}
          </span>
        </div>
      </div>
    </section>
  );
}
