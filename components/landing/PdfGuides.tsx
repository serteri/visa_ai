import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { StripeCheckoutButton } from "@/components/stripe-checkout-button";
import type { PdfProduct } from "@/components/PdfDownloadModal";

interface PdfGuidesProps {
  locale: string;
  hasFreeSlots: boolean;
  freeDownloadsLeft: number;
  setActivePdfModal: Dispatch<SetStateAction<PdfProduct | null>>;
}

/** Dual PDF product grid (Turkish edition / Global English edition). Copy,
 *  Stripe checkout wiring, and free-slot logic are unchanged — only the
 *  card chrome is restyled to the case-file surfaces. */
export function PdfGuides({ locale, hasFreeSlots, freeDownloadsLeft, setActivePdfModal }: PdfGuidesProps) {
  const priceNote = hasFreeSlots ? (
    locale === "tr" ? (
      <>
        Normal fiyatı <strong className="text-[var(--cf-case-fg)]">$9.99</strong> — ücretsiz kota bitince bu
        fiyata geçer
      </>
    ) : locale === "zh-Hans" ? (
      <>
        原价 <strong className="text-[var(--cf-case-fg)]">$9.99</strong> — 免费名额用完后恢复该价格
      </>
    ) : (
      <>
        Normally <strong className="text-[var(--cf-case-fg)]">$9.99</strong> — reverts to this price once free
        slots run out
      </>
    )
  ) : locale === "tr" ? (
    "Ücretsiz kota doldu — anında indirme bağlantısı e-postanıza gönderilir"
  ) : locale === "zh-Hans" ? (
    "免费名额已满 — 下载链接将立即发送到您的邮箱"
  ) : (
    "Free quota reached — instant download link sent to your email"
  );

  return (
    <section id="pdf-download-section" className="case-file scroll-mt-24 bg-[var(--cf-bg)] py-20">
      <div className="section-shell">
        <div
          className={`cf-mono mb-8 rounded-sm border px-4 py-3 text-center text-sm ${
            hasFreeSlots
              ? "border-[var(--cf-accent-dim)] text-[var(--cf-accent)]"
              : "border-[var(--cf-flag-rust-fg)]/40 text-[var(--cf-flag-rust-fg)]"
          }`}
        >
          {hasFreeSlots ? (
            <span>
              📚{" "}
              {locale === "tr" ? (
                <>
                  Her iki PDF rehber için geçerli — sadece <strong>{freeDownloadsLeft}</strong> ücretsiz indirme
                  hakkı kaldı!
                </>
              ) : locale === "zh-Hans" ? (
                <>
                  两本 PDF 指南通用 — 仅剩 <strong>{freeDownloadsLeft}</strong> 个免费下载名额！
                </>
              ) : (
                <>
                  Shared across both PDF guides — only <strong>{freeDownloadsLeft}</strong> free download slots
                  left!
                </>
              )}
            </span>
          ) : (
            <span>
              💳{" "}
              {locale === "tr"
                ? "Ücretsiz kota doldu — her iki rehber de artık $9.99."
                : locale === "zh-Hans"
                  ? "免费名额已满 — 两本指南现价 $9.99。"
                  : "Free quota is full — both guides are now $9.99."}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-px border border-[var(--cf-line)] bg-[var(--cf-line)] md:grid-cols-2">
          {/* Turkish Edition */}
          <div className="flex flex-col gap-4 bg-[var(--cf-case-bg)] p-6 sm:p-8">
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
              {locale === "tr" ? (
                <>
                  Türk profesyoneller için hazırlanmış, yetenekli göç (skilled migration) süreçlerini adım adım
                  anlatan <strong className="text-[var(--cf-case-fg)]">80+ sayfalık</strong> kapsamlı Türkçe rehber.
                </>
              ) : locale === "zh-Hans" ? (
                <>
                  专为土耳其专业人士打造，逐步讲解技术移民流程的
                  <strong className="text-[var(--cf-case-fg)]">80+ 页</strong>土耳其语综合指南。
                </>
              ) : (
                <>
                  A comprehensive <strong className="text-[var(--cf-case-fg)]">80+ page</strong> Turkish-language
                  guide walking skilled migration candidates through the entire pathway, built specifically for
                  Turkish professionals.
                </>
              )}
            </p>
            <ul className="space-y-2 text-sm text-[var(--cf-case-muted)]">
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
              {hasFreeSlots ? (
                <Button
                  size="lg"
                  onClick={() => setActivePdfModal("turkish")}
                  className="w-full bg-[var(--cf-accent)] font-semibold text-[var(--cf-bg-deep)] hover:opacity-90"
                >
                  {locale === "tr" ? "📥 Ücretsiz İndir" : locale === "zh-Hans" ? "📥 免费下载" : "📥 Free Download"}
                </Button>
              ) : (
                <StripeCheckoutButton
                  productType="pdf_book"
                  locale={locale}
                  className="w-full bg-[var(--cf-accent)] font-semibold text-[var(--cf-bg-deep)] hover:opacity-90"
                  label={locale === "tr" ? "💳 Şimdi Satın Al — $9.99" : locale === "zh-Hans" ? "💳 立即购买 — $9.99" : "💳 Buy Now — $9.99"}
                />
              )}
              <p className="mt-2 text-center text-xs text-[var(--cf-case-muted)]">{priceNote}</p>
            </div>
          </div>

          {/* Global English Edition */}
          <div className="flex flex-col gap-4 bg-[var(--cf-case-bg)] p-6 sm:p-8">
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
              {locale === "tr" ? (
                <>
                  Uluslararası profesyoneller için: Skilled Migration yol haritası, Öğrenci Vizesi (Subclass 500)
                  köprüsü ve <strong className="text-[var(--cf-case-fg)]">2026 yaşam maliyeti</strong> verileri tek
                  rehberde.
                </>
              ) : locale === "zh-Hans" ? (
                <>
                  面向国际专业人士：技术移民路径、学生签证（500 类别）过渡方案，以及
                  <strong className="text-[var(--cf-case-fg)]">2026 年生活成本</strong>数据，全部收录于一册。
                </>
              ) : (
                <>
                  Built for an international audience: the full Skilled Migration pathway, the Student Visa
                  (Subclass 500) bridge to PR, and{" "}
                  <strong className="text-[var(--cf-case-fg)]">2026 cost of living</strong> data in one guide.
                </>
              )}
            </p>
            <ul className="space-y-2 text-sm text-[var(--cf-case-muted)]">
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
              {hasFreeSlots ? (
                <Button
                  size="lg"
                  onClick={() => setActivePdfModal("global")}
                  className="w-full bg-[var(--cf-accent)] font-semibold text-[var(--cf-bg-deep)] hover:opacity-90"
                >
                  {locale === "tr" ? "📥 Ücretsiz İndir" : locale === "zh-Hans" ? "📥 免费下载" : "📥 Free Download"}
                </Button>
              ) : (
                <StripeCheckoutButton
                  productType="pdf_book_global"
                  locale={locale}
                  className="w-full bg-[var(--cf-accent)] font-semibold text-[var(--cf-bg-deep)] hover:opacity-90"
                  label={locale === "tr" ? "💳 Şimdi Satın Al — $9.99" : locale === "zh-Hans" ? "💳 立即购买 — $9.99" : "💳 Buy Now — $9.99"}
                />
              )}
              <p className="mt-2 text-center text-xs text-[var(--cf-case-muted)]">{priceNote}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
