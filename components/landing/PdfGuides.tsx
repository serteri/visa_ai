import { StripeCheckoutButton } from "@/components/stripe-checkout-button";

interface PdfGuidesProps {
  locale: string;
}

/** Dual PDF product grid (Turkish edition / Global English edition). Both
 *  guides are a flat $9.99 — no free-slot logic. */
export function PdfGuides({ locale }: PdfGuidesProps) {
  return (
    <section id="pdf-download-section" className="case-file scroll-mt-24 bg-[var(--cf-bg)] py-24 sm:py-32">
      <div className="section-shell">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Turkish Edition */}
          <div className="flex flex-col gap-5 rounded-2xl bg-[var(--cf-case-bg)] p-8 sm:p-10">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🇹🇷</span>
              <span className="cf-mono rounded-sm bg-[var(--cf-flag-brass-bg)] px-2.5 py-1 text-[0.65rem] uppercase tracking-wide text-[var(--cf-flag-brass-fg)]">
                {locale === "tr" ? "Türkçe Baskı · 2026" : locale === "zh-Hans" ? "土耳其语版 · 2026" : "Turkish Edition · 2026"}
              </span>
            </div>
            <h3 className="cf-serif text-2xl font-semibold text-[var(--cf-case-fg)]">
              {locale === "tr" ? "Avustralya PR Başvuru Rehberi" : locale === "zh-Hans" ? "澳大利亚PR申请指南" : "Australia PR Application Guide"}
            </h3>
            <p className="text-sm leading-relaxed text-[var(--cf-case-muted)]">
              {locale === "tr"
                ? "Avustralya nitelikli göçmenlik sürecini Türk profesyoneller için A'dan Z'ye anlatan 80+ sayfalık başucu rehberi. İçinde neler var: Subclass 189/190/491 vizeleri için adım adım stratejiler, 2026 güncel puan hesaplama taktikleri, Türk vatandaşlarına özel evrak hazırlık listeleri, mesleki denklik (Skills Assessment) kurumlarının inceleme süreçleri ve NAATI/PTE tüyoları."
                : locale === "zh-Hans"
                  ? "一本80多页的权威指南，专为土耳其专业人士从头到尾讲解澳大利亚技术移民流程。内容包括：189/190/491类别签证的分步策略、2026年最新积分计算技巧、专为土耳其公民定制的材料准备清单、职业评估（Skills Assessment）机构的审核流程，以及NAATI/PTE应试技巧。"
                  : "An 80+ page A-to-Z handbook covering Australia's Skilled Migration process for Turkish professionals. Inside: step-by-step strategies for the Subclass 189/190/491 visas, up-to-date 2026 points calculation tactics, document preparation checklists tailored to Turkish citizens, how Skills Assessment authorities review applications, and NAATI/PTE tips."}
            </p>
            <ul className="space-y-3 text-sm leading-relaxed text-[var(--cf-case-muted)]">
              {[
                locale === "tr"
                  ? "80+ sayfa, 13 bölüm, 2026 güncel verileri"
                  : locale === "zh-Hans"
                    ? "80+ 页，13 章，2026 最新数据"
                    : "80+ pages across 13 chapters, 2026 data",
                locale === "tr"
                  ? "189 / 190 / 491 puan testi ve ANZSCO kod rehberi"
                  : locale === "zh-Hans"
                    ? "189 / 190 / 491 打分测试与 ANZSCO 职业代码指南"
                    : "189 / 190 / 491 points test and ANZSCO code guide",
                locale === "tr"
                  ? "Türk başvurucular için özelleştirilmiş belge rehberi"
                  : locale === "zh-Hans"
                    ? "为土耳其申请人定制的材料清单"
                    : "Document checklist tailored to Turkish applicants",
              ].map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="shrink-0 text-[var(--cf-accent)]">✓</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-2">
              <StripeCheckoutButton
                productType="pdf_book"
                locale={locale}
                className="h-14 w-full px-8 py-4 text-base bg-[var(--cf-accent)] font-semibold text-white hover:opacity-90"
                label={locale === "tr" ? "💳 Şimdi Satın Al — $9.99" : locale === "zh-Hans" ? "💳 立即购买 — $9.99" : "💳 Buy Now — $9.99"}
              />
            </div>
          </div>

          {/* Global English Edition */}
          <div className="flex flex-col gap-5 rounded-2xl bg-[var(--cf-case-bg)] p-8 sm:p-10">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🌏</span>
              <span className="cf-mono rounded-sm bg-[var(--cf-flag-sage-bg)] px-2.5 py-1 text-[0.65rem] uppercase tracking-wide text-[var(--cf-flag-sage-fg)]">
                {locale === "tr" ? "Global İngilizce Baskı · 2026" : locale === "zh-Hans" ? "全球英文版 · 2026" : "Global English Edition · 2026"}
              </span>
            </div>
            <h3 className="cf-serif text-2xl font-semibold text-[var(--cf-case-fg)]">
              {locale === "tr" ? "Nihai Avustralya Göç ve Yaşam Rehberi" : locale === "zh-Hans" ? "终极澳大利亚移民与生活蓝图" : "The Ultimate Australia Migration & Living Blueprint"}
            </h3>
            <p className="text-sm leading-relaxed text-[var(--cf-case-muted)]">
              {locale === "tr"
                ? "Tüm Skilled Migration yolunu kapsayan kapsamlı bir yol haritası. Rehberin içinde: Subclass 189/190/491 için adım adım stratejiler, eyalet sponsorluğunun gizli şartları, Öğrenci Vizesinden (Subclass 500) PR'a geçiş stratejisi, büyük şehirler için 2026 güncel yaşam maliyeti dökümleri ve puanınızı etkili şekilde nasıl maksimize edeceğiniz."
                : locale === "zh-Hans"
                  ? "一份涵盖整个技术移民路径的全面蓝图。指南内容包括：189/190/491类别签证的分步策略、州担保的隐藏要求、学生签证（500类别）过渡到PR的策略、主要城市2026年最新生活成本明细，以及如何有效地最大化您的积分。"
                  : "A comprehensive blueprint covering the entire Skilled Migration pathway. Inside the guide: Step-by-step strategies for Subclass 189/190/491, state sponsorship hidden requirements, the Student Visa (Subclass 500) to PR transition strategy, actual 2026 cost of living breakdowns for major cities, and how to maximize your points effectively."}
            </p>
            <ul className="space-y-3 text-sm leading-relaxed text-[var(--cf-case-muted)]">
              {[
                locale === "tr"
                  ? "Skilled Migration (189/190/491) — puan testi ve strateji"
                  : locale === "zh-Hans"
                    ? "技术移民（189/190/491）— 打分测试与策略"
                    : "Skilled Migration (189/190/491) — points test & strategy",
                locale === "tr"
                  ? "Öğrenci Vizesi (Subclass 500) → PR köprü stratejisi"
                  : locale === "zh-Hans"
                    ? "学生签证（500 类别）→ PR 过渡策略"
                    : "Student Visa (Subclass 500) → PR bridge strategy",
                locale === "tr"
                  ? "Sydney, Melbourne, Brisbane, Adelaide için 2026 yaşam maliyeti"
                  : locale === "zh-Hans"
                    ? "悉尼、墨尔本、布里斯班、阿德莱德 2026 年生活成本"
                    : "2026 cost of living for Sydney, Melbourne, Brisbane, Adelaide",
              ].map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="shrink-0 text-[var(--cf-accent)]">✓</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-2">
              <StripeCheckoutButton
                productType="pdf_book_global"
                locale={locale}
                className="h-14 w-full px-8 py-4 text-base bg-[var(--cf-accent)] font-semibold text-white hover:opacity-90"
                label={locale === "tr" ? "💳 Şimdi Satın Al — $9.99" : locale === "zh-Hans" ? "💳 立即购买 — $9.99" : "💳 Buy Now — $9.99"}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
