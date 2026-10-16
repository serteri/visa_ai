import Link from "next/link";
import { publicPath } from "@/lib/seo/urls";
import { researchText } from "@/lib/marketing/research-journey";
export function StatsBar({ locale }: { locale: string }) {
  const text = (en: string, tr: string, zh: string) =>
    researchText(locale, en, tr, zh);
  const items = [
    {
      title: text("Published sources", "Yayımlanmış kaynaklar", "公开来源"),
      body: text(
        "Occupation pages link to Home Affairs and relevant assessing authorities.",
        "Meslek sayfalarında İçişleri Bakanlığı ve değerlendirme kurumu bağlantıları bulunur.",
        "职业页面链接至内政部及相关评估机构。",
      ),
      href: "https://immi.homeaffairs.gov.au/visas/working-in-australia/skill-occupation-list",
    },
    {
      title: text("Dates and context", "Tarihler ve bağlam", "日期与背景"),
      body: text(
        "Source and review dates are shown where available. Published information does not promise current availability.",
        "Mevcut kaynak ve kontrol tarihleri gösterilir. Yayımlanmış bilgi, güncel durumun garantisi değildir.",
        "在数据可用时显示来源与核对日期。已公布信息并非当前开放状态的保证。",
      ),
      href: publicPath(locale, "/tools/anzsco-finder"),
    },
    {
      title: text("Corrections welcome", "Düzeltme bildirimi", "反馈更正"),
      body: text(
        "Report an outdated reference or an error through our contact page.",
        "Güncel olmayan kaynakları veya hataları iletişim sayfasından bildirin.",
        "通过联系页面反馈过时来源或错误。",
      ),
      href: publicPath(locale, "/contact"),
    },
  ];
  return (
    <section className="case-file border-y border-[var(--cf-line)] py-12">
      <div className="section-shell grid gap-8 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.title}>
            <h2 className="cf-serif text-xl text-[var(--cf-fg)]">
              <Link href={item.href} className="underline underline-offset-4">
                {item.title}
              </Link>
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--cf-muted)]">
              {item.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
