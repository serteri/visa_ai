import Link from "next/link";
import { researchText, researchLinks } from "@/lib/marketing/research-journey";
import { publicPath } from "@/lib/seo/urls";
export function HowItWorks({ locale }: { locale: string }) {
  const text = (en: string, tr: string, zh: string) =>
    researchText(locale, en, tr, zh);
  const steps = [
    {
      title: text("Explore an occupation", "Mesleği araştır", "探索职业"),
      description: text(
        "Review ANZSCO duties, assessing authority references and occupation-list context.",
        "ANZSCO görevlerini, değerlendirme kurumu kaynaklarını ve meslek listesi bağlamını okuyun.",
        "查看 ANZSCO 职责、评估机构参考及职业清单背景。",
      ),
      path: "/tools/anzsco-finder",
    },
    {
      title: text("Research requirements", "Şartları araştır", "研究要求"),
      description: text(
        "Read assessment information and its source dates. Missing coverage is clearly separated from published facts.",
        "Değerlendirme bilgilerini ve kaynak tarihlerini okuyun. Eksik kapsam, yayımlanmış bilgilerden ayrı gösterilir.",
        "阅读评估信息与来源日期。数据缺口与公开事实明确区分。",
      ),
      path: "/tools/skills-assessment",
    },
    {
      title: text(
        "Compare published visa features",
        "Yayımlanmış vize özelliklerini karşılaştır",
        "对比已公布的签证特点",
      ),
      description: text(
        "Compare the stated features of 189, 190 and 491, then follow the relevant official references.",
        "189, 190 ve 491 özelliklerini karşılaştırın ve ilgili resmî kaynaklara geçin.",
        "对比 189、190 和 491 的公开特点，并查阅相关官方来源。",
      ),
      path: "/tools/visa-comparison",
    },
  ];
  return (
    <section className="case-file py-16 sm:py-24">
      <div className="section-shell">
        <h2 className="cf-serif text-3xl text-[var(--cf-fg)] sm:text-4xl">
          {text(
            "A clearer next research step",
            "Araştırmada sonraki adım",
            "更清晰的下一步研究",
          )}
        </h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={step.path}
              className="flex flex-col rounded-2xl border border-[var(--cf-line)] bg-white p-6 sm:p-8"
            >
              <span className="cf-mono text-sm text-[var(--cf-accent)]">
                0{index + 1}
              </span>
              <h3 className="cf-serif mt-4 text-xl text-slate-900">
                {step.title}
              </h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">
                {step.description}
              </p>
              <Link
                className="mt-5 py-2 text-sm font-semibold text-[var(--cf-accent)] underline underline-offset-4"
                href={publicPath(locale, step.path)}
              >
                {text("Explore", "Araştır", "探索")} →
              </Link>
            </div>
          ))}
        </div>
        <div className="mt-7 flex flex-wrap gap-5 text-sm">
          {researchLinks(locale)
            .filter((link) => link.destination === "points_calculator")
            .map((link) => (
              <Link
                key={link.path}
                className="text-[var(--cf-accent)] underline"
                href={publicPath(locale, link.path)}
              >
                {link.label} →
              </Link>
            ))}
        </div>
      </div>
    </section>
  );
}
