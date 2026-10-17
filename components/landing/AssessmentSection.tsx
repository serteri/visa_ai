import Link from "next/link";
import { publicPath } from "@/lib/seo/urls";
import { researchText } from "@/lib/marketing/research-journey";

export function AssessmentSection({ locale }: { locale: string }) {
  const text = (en: string, tr: string, zh: string) => researchText(locale, en, tr, zh);
  return (
    <section data-home-assessment className="case-file border-y border-[var(--cf-line)] py-16 sm:py-24">
      <div className="section-shell grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div>
          <p className="cf-mono text-xs font-semibold uppercase tracking-wider text-[var(--cf-accent)]">{text("LogiVisa Assessment", "LogiVisa Değerlendirmesi", "LogiVisa 评估")}</p>
          <h2 className="cf-serif mt-4 text-3xl text-[var(--cf-fg)] sm:text-4xl">{text("Organise your migration research", "Göç araştırmanızı düzenleyin", "整理您的移民研究")}</h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--cf-muted)]">{text("Answer structured questions about your work, study, English and current circumstances to prepare a Visa Information Report. Use it to keep your research together and prepare questions for a professional.", "İşiniz, eğitiminiz, İngilizceniz ve mevcut durumunuz hakkında yapılandırılmış soruları yanıtlayarak Vize Bilgi Raporu oluşturun. Araştırmanızı bir arada tutmak ve bir uzmana soracağınız soruları hazırlamak için kullanın.", "回答有关工作、学习、英语及当前情况的结构化问题，生成签证信息报告。将研究资料集中整理，并为咨询专业人士准备问题。")}</p>
          <Link href={publicPath(locale, "/full-check")} data-assessment-entry="homepage" className="mt-7 inline-flex min-h-12 items-center rounded-full bg-[var(--cf-accent)] px-6 py-3 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4">
            {text("Start Assessment", "Değerlendirme Başlat", "开始评估")} <span aria-hidden className="ml-3">→</span>
          </Link>
          <p className="mt-3 text-xs leading-relaxed text-[var(--cf-muted)]">{text("Report access and the current price are explained before the questions.", "Rapor erişimi ve güncel ücret sorulardan önce açıklanır.", "问题开始前会说明报告访问方式及当前价格。")}</p>
        </div>
        <div className="border-l-2 border-[var(--cf-accent)] pl-6 sm:pl-8">
          <h3 className="cf-serif text-2xl text-[var(--cf-fg)]">{text("Your output: a Visa Information Report", "Çıktınız: Vize Bilgi Raporu", "您的成果：签证信息报告")}</h3>
          <ul className="mt-5 space-y-4 text-sm leading-relaxed text-[var(--cf-muted)]">
            <li>{text("Your entries, separated from general published information.", "Girdileriniz, genel yayımlanmış bilgilerden ayrı olarak.", "您的填写内容与一般公开信息分开呈现。")}</li>
            <li>{text("Visa information, a points table where relevant, source references and dates in a downloadable PDF, once report access is opened.", "Rapor erişimi açıldığında indirilebilir PDF içinde vize bilgileri, ilgili olduğunda puan tablosu, kaynaklar ve tarihler.", "报告访问开通后，可下载包含签证信息、适用积分表、来源和日期的 PDF。")}</li>
          </ul>
          <p className="mt-6 border-t border-[var(--cf-line)] pt-5 text-sm leading-relaxed text-[var(--cf-muted)]">{text("This is the broader LogiVisa research/report experience. The Skills Assessment Finder is a separate tool for looking up an occupation’s assessing-authority references.", "Bu, LogiVisa'nın kapsamlı araştırma/rapor deneyimidir. Beceri Değerlendirme Bulucu, bir mesleğin değerlendirme kurumu kaynaklarını bulmak için ayrı bir araçtır.", "这是 LogiVisa 的综合研究与报告流程。技能评估查询工具是独立工具，用于查找职业对应的评估机构参考资料。")}</p>
        </div>
        <p className="text-sm leading-relaxed text-[var(--cf-muted)] lg:col-span-2">{text("LogiVisa provides information and research support. It does not determine visa eligibility, recommend a best visa, predict invitations or replace advice from an authorised migration professional.", "LogiVisa bilgi ve araştırma desteği sunar. Vize uygunluğunu belirlemez, en iyi vizeyi önermez, davetleri tahmin etmez veya yetkili bir göçmenlik uzmanının danışmanlığının yerini almaz.", "LogiVisa 提供信息与研究支持，不判定签证资格、不推荐最佳签证、不预测邀请，也不能替代获授权移民专业人士的建议。")}</p>
      </div>
    </section>
  );
}
