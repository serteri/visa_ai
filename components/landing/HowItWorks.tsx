import Link from "next/link";
import { researchText } from "@/lib/marketing/research-journey";
import { publicPath } from "@/lib/seo/urls";

export function HowItWorks({ locale }: { locale: string }) {
  const text = (en: string, tr: string, zh: string) => researchText(locale, en, tr, zh);
  const steps = [
    {
      title: text("Research your occupation", "Mesleğinizi araştırın", "研究您的职业"),
      description: text("Search Australian occupations and review ANZSCO information, assessing authorities and official sources.", "Avustralya mesleklerini arayın; ANZSCO bilgilerini, değerlendirme kurumlarını ve resmî kaynakları inceleyin.", "搜索澳大利亚职业，查看 ANZSCO 信息、评估机构和官方来源。"),
      cta: text("Search occupations", "Meslek ara", "搜索职业"),
      path: "/tools/anzsco-finder",
    },
    {
      title: text("Check the published requirements", "Yayımlanmış şartları inceleyin", "查看已公布的要求"),
      description: text("Use LogiVisa tools to explore skills assessments, points, state nomination information and visa comparisons.", "LogiVisa araçlarıyla beceri değerlendirmelerini, puanları, eyalet adaylığı bilgilerini ve vize karşılaştırmalarını keşfedin.", "使用 LogiVisa 工具了解技能评估、积分、州担保信息和签证对比。"),
      cta: text("Explore research tools", "Araştırma araçlarını keşfedin", "探索研究工具"),
      path: "/tools/skills-assessment",
    },
    {
      title: text("Run the LogiVisa Assessment", "LogiVisa Değerlendirmesini yapın", "进行 LogiVisa 评估"),
      description: text("Answer structured questions and receive a research report based on the information you provide and published sources.", "Yapılandırılmış soruları yanıtlayın ve verdiğiniz bilgilere ve yayımlanmış kaynaklara dayalı bir araştırma raporu alın.", "回答结构化问题，获得基于您提供的信息和公开来源的研究报告。"),
      cta: text("Start Assessment", "Değerlendirme Başlat", "开始评估"),
      path: "/full-check",
      source: "homepage_how_it_works",
    },
    {
      title: text("Continue your research", "Araştırmanıza devam edin", "继续您的研究"),
      description: text("Use your report to continue into relevant occupation, visa and official-source research, or verify questions with a registered migration professional.", "Raporunuzu ilgili meslek, vize ve resmî kaynak araştırmalarına devam etmek veya soruları kayıtlı bir göçmenlik uzmanıyla doğrulamak için kullanın.", "利用报告继续进行相关职业、签证和官方来源研究，或向注册移民专业人士核实问题。"),
      cta: text("Explore visa research", "Vize araştırmasını keşfedin", "探索签证研究"),
      path: "/visas/australia",
    },
  ];
  return (
    <section data-how-it-works className="case-file border-t border-[var(--cf-line)] py-12 sm:py-20">
      <div className="section-shell">
        <h2 className="cf-serif text-3xl text-[var(--cf-fg)] sm:text-4xl">{text("How LogiVisa Works", "LogiVisa Nasıl Çalışır", "LogiVisa 如何运作")}</h2>
        <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step.path} className="flex flex-col rounded-2xl border border-[var(--cf-line)] bg-white p-6">
              <span className="cf-mono text-sm text-[var(--cf-accent)]">0{index + 1}</span>
              <h3 className="cf-serif mt-3 text-xl text-slate-900">{step.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">{step.description}</p>
              <Link className="mt-5 py-2 text-sm font-semibold text-[var(--cf-accent)] underline underline-offset-4" href={publicPath(locale, step.path)} {...(step.source ? { "data-assessment-entry": step.source } : {})}>
                {step.cta} →
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
