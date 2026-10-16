import Link from "next/link";
import { publicPath } from "@/lib/seo/urls";
import { researchText } from "@/lib/marketing/research-journey";
export function PreFooterCta({ locale }: { locale: string }) {
  return (
    <section className="section-shell py-10 text-center">
      <h2 className="text-2xl font-semibold text-[var(--cf-fg)]">
        {researchText(
          locale,
          "Explore published visa information",
          "Yayımlanmış vize bilgilerini araştırın",
          "探索已公布的签证信息",
        )}
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--cf-muted)]">
        {researchText(
          locale,
          "Use occupation details, points tools and official references to continue your research.",
          "Meslek bilgileri, puan araçları ve resmî kaynaklarla araştırmaya devam edin.",
          "通过职业详情、积分工具与官方来源继续研究。",
        )}
      </p>
      <Link
        href={publicPath(locale, "/tools/anzsco-finder")}
        className="mt-5 inline-block rounded-xl bg-[var(--cf-accent)] px-6 py-3 font-semibold text-white"
      >
        {researchText(locale, "Search occupations", "Meslek ara", "搜索职业")}
      </Link>
    </section>
  );
}
