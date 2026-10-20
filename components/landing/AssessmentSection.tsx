import Link from "next/link";
import { publicPath } from "@/lib/seo/urls";
import { researchText } from "@/lib/marketing/research-journey";
import { PREMIUM_PRICE_AUD_CENTS } from "@/lib/pricing";

/** Headline price, derived from the same constant the checkout line item charges (lib/stripe/line-items.ts). */
export const ASSESSMENT_PRICE_LABEL = `A$${(PREMIUM_PRICE_AUD_CENTS / 100).toFixed(2)}`;

const SOURCE = "homepage_assessment_section";

export function AssessmentSection({ locale }: { locale: string }) {
  const text = (en: string, tr: string, zh: string) => researchText(locale, en, tr, zh);
  const href = publicPath(locale, "/full-check");
  const benefits: [string, string][] = [
    [text("Structured assessment", "Yapılandırılmış değerlendirme", "结构化评估"), text("Answer guided questions about your background, work, qualifications and migration research.", "Geçmişiniz, işiniz, nitelikleriniz ve göç araştırmanız hakkında yönlendirmeli soruları yanıtlayın.", "回答有关背景、工作、学历及移民研究的引导式问题。")],
    [text("Personal research report", "Kişisel araştırma raporu", "个人研究报告"), text("Receive a structured report based on the information you provide and published visa information.", "Verdiğiniz bilgilere ve yayımlanmış vize bilgilerine dayalı yapılandırılmış bir rapor alın.", "获得基于您提供的信息和已公布签证信息的结构化报告。")],
    [text("Gaps to verify", "Doğrulanacak boşluklar", "待核实的缺口"), text("See where information may need further checking against official sources or with a registered migration professional.", "Resmi kaynaklara veya kayıtlı bir göçmenlik uzmanına karşı ek doğrulama gerektirebilecek bilgileri görün.", "了解哪些信息可能需要对照官方来源或向注册移民专业人士进一步核实。")],
    [text("Research next steps", "Sonraki araştırma adımları", "后续研究步骤"), text("Continue into relevant LogiVisa occupation, points, skills-assessment and visa research tools.", "İlgili LogiVisa meslek, puan, beceri değerlendirmesi ve vize araştırma araçlarına devam edin.", "继续使用相关的 LogiVisa 职业、积分、技能评估和签证研究工具。")],
  ];
  return (
    <section data-home-assessment className="case-file border-y border-[var(--cf-line)] py-12 sm:py-20">
      <div className="section-shell grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-start lg:gap-14">
        <div>
          <p className="cf-mono text-xs font-semibold uppercase tracking-wider text-[var(--cf-accent)]">{text("LogiVisa Assessment", "LogiVisa Değerlendirmesi", "LogiVisa 评估")}</p>
          <h2 className="cf-serif mt-4 text-3xl text-[var(--cf-fg)] sm:text-4xl">{text("Get a structured Australian visa research assessment", "Yapılandırılmış bir Avustralya vize araştırma değerlendirmesi alın", "获取结构化的澳大利亚签证研究评估")}</h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--cf-muted)]">{text("Answer a structured set of questions about your circumstances and receive a personalised research report that organises the information you supplied against published Australian visa requirements.", "Durumunuz hakkında yapılandırılmış sorular yanıtlayın ve verdiğiniz bilgileri yayımlanmış Avustralya vize şartlarına göre düzenleyen kişiselleştirilmiş bir araştırma raporu alın.", "回答有关您情况的结构化问题，获得一份个性化研究报告，将您提供的信息对照已公布的澳大利亚签证要求进行整理。")}</p>
          <ul className="mt-7 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {benefits.map(([title, body]) => (
              <li key={title}>
                <h3 className="text-sm font-semibold text-[var(--cf-fg)]">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[var(--cf-muted)]">{body}</p>
              </li>
            ))}
          </ul>
        </div>
        <div data-assessment-card className="rounded-2xl border border-[var(--cf-line)] bg-white p-6 shadow-sm sm:p-8">
          <p className="cf-mono text-xs font-semibold uppercase tracking-wider text-[var(--cf-muted)]">{text("Personal research report", "Kişisel araştırma raporu", "个人研究报告")}</p>
          <p className="mt-3 flex items-baseline gap-2">
            <span data-assessment-price className="cf-serif text-5xl font-medium text-[var(--cf-fg)]">{ASSESSMENT_PRICE_LABEL}</span>
            <span className="text-sm text-[var(--cf-muted)]">{text("including GST", "GST dahil", "含 GST")}</span>
          </p>
          <ul className="mt-5 space-y-2 text-sm leading-relaxed text-[var(--cf-muted)]">
            <li>{text("Guided questions about your circumstances", "Durumunuza dair yönlendirmeli sorular", "有关您情况的引导式问题")}</li>
            <li>{text("Structured report with published sources and dates (PDF)", "Yayımlanmış kaynaklar ve tarihlerle yapılandırılmış rapor (PDF)", "含公开来源和日期的结构化报告（PDF）")}</li>
            <li>{text("Gaps to verify and research next steps", "Doğrulanacak boşluklar ve sonraki araştırma adımları", "待核实缺口与后续研究步骤")}</li>
          </ul>
          <Link href={href} data-assessment-entry={SOURCE} className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--cf-accent)] px-6 py-3 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4">
            {text("Start Assessment", "Değerlendirme Başlat", "开始评估")} <span aria-hidden className="ml-3">→</span>
          </Link>
          <p className="mt-3 text-center text-sm">
            <Link href={href} data-assessment-entry={SOURCE} className="text-[var(--cf-accent)] underline underline-offset-4">{text("See how the assessment works", "Değerlendirmenin nasıl çalıştığını görün", "了解评估如何运作")}</Link>
          </p>
          <p className="mt-5 border-t border-[var(--cf-line)] pt-4 text-xs leading-relaxed text-[var(--cf-muted)]">{text("Information and research support only. LogiVisa does not provide migration advice or determine visa eligibility.", "Yalnızca bilgi ve araştırma desteği. LogiVisa göçmenlik danışmanlığı sunmaz ve vize uygunluğunu belirlemez.", "仅提供信息与研究支持。LogiVisa 不提供移民建议，也不判定签证资格。")}</p>
        </div>
      </div>
    </section>
  );
}
