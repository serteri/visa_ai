"use client";
import Link from "next/link";
import { useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight } from "lucide-react";
import { publicPath } from "@/lib/seo/urls";
import { researchText } from "@/lib/marketing/research-journey";

export function Hero({
  locale,
}: {
  locale: string;
  onScrollToPdfSection?: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const text = (en: string, tr: string, zh: string) =>
    researchText(locale, en, tr, zh);
  return (
    <section className="case-file relative bg-transparent pb-16 pt-14 sm:pb-24 sm:pt-24">
      <div className="section-shell mx-auto flex max-w-4xl flex-col items-center text-center">
        <p className="cf-mono text-xs uppercase tracking-wider text-[var(--cf-accent)]">
          {text(
            "Australian migration information",
            "Avustralya göçmenlik bilgileri",
            "澳大利亚移民信息",
          )}
        </p>
        <h1 className="cf-serif mt-5 max-w-[22ch] text-4xl font-medium leading-[1.12] tracking-tight text-[var(--cf-fg)] sm:text-5xl lg:text-6xl">
          {text(
            "Australian visa and occupation research",
            "Avustralya vize ve meslek araştırması",
            "澳大利亚签证与职业研究",
          )}
        </h1>
        <p className="mt-6 max-w-[55ch] text-lg leading-relaxed text-[var(--cf-muted)]">
          {text(
            "Explore occupations, skills assessments and published visa requirements. Use research tools, compare sources and see where information comes from.",
            "Meslekleri, beceri değerlendirmelerini ve yayımlanmış vize şartlarını araştırın. Araçları kullanın ve bilgilerin kaynağını görün.",
            "探索职业、技能评估与已公布的签证要求。使用研究工具，对比来源并了解信息出处。",
          )}
        </p>
        <form
          className="mt-8 w-full max-w-2xl"
          action={publicPath(locale, "/tools/anzsco-finder")}
          onSubmit={(event) => {
            event.preventDefault();
            router.push(
              publicPath(
                locale,
                `/tools/anzsco-finder${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`,
              ),
            );
          }}
        >
          <label htmlFor="home-occupation" className="sr-only">
            {text(
              "Occupation name or ANZSCO code",
              "Meslek adı veya ANZSCO kodu",
              "职业名称或 ANZSCO 代码",
            )}
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search
                aria-hidden
                className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--cf-accent)]"
              />
              <input
                id="home-occupation"
                name="q"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={text(
                  "Occupation or ANZSCO code",
                  "Meslek veya ANZSCO kodu",
                  "职业或 ANZSCO 代码",
                )}
                className="h-14 w-full rounded-xl border border-[var(--cf-line)] bg-white pl-12 pr-4 text-base text-slate-900 outline-none focus:ring-2 focus:ring-[var(--cf-accent)]"
              />
            </div>
            <button
              type="submit"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[var(--cf-accent)] px-6 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              {text("Search occupations", "Meslek ara", "搜索职业")}
              <ArrowRight aria-hidden className="h-4 w-4" />
            </button>
          </div>
        </form>
        <div className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm">
          <Link
            className="rounded-lg border border-[var(--cf-line)] px-5 py-3 font-semibold text-[var(--cf-fg)] hover:bg-white"
            href={publicPath(locale, "/tools/points-calculator/australia")}
          >
            {text("Calculate points", "Puan hesapla", "计算积分")}
          </Link>
          <Link
            className="self-center py-3 text-[var(--cf-accent)] underline underline-offset-4"
            href={publicPath(locale, "/tools/visa-comparison")}
          >
            {text("Compare visas", "Vizeleri karşılaştır", "对比签证")}
          </Link>
          <Link
            className="self-center py-3 text-[var(--cf-accent)] underline underline-offset-4"
            href={publicPath(locale, "/occupations")}
          >
            {text("Australian skilled occupation list", "Avustralya kalifiye meslek listesi", "澳大利亚技术职业清单")}
          </Link>
        </div>
        <div className="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-3 text-sm text-[var(--cf-muted)]">
          {[
            ["331212-carpenter", "Carpenter", "Marangoz", "木工"],
            ["351311-chef", "Chef", "Şef", "厨师"],
            [
              "261313-software-engineer",
              "Software Engineer",
              "Yazılım Mühendisi",
              "软件工程师",
            ],
          ].map(([slug, en, tr, zh]) => (
            <Link
              key={slug}
              className="underline underline-offset-4"
              href={publicPath(locale, `/occupations/${slug}`)}
            >
              {text(en, tr, zh)}
            </Link>
          ))}
        </div>
        <p className="mt-5 text-sm text-[var(--cf-muted)]">
          {text("Prefer a structured review?", "Yapılandırılmış bir inceleme mi tercih edersiniz?", "更喜欢结构化的梳理？")}{" "}
          <Link className="font-medium text-[var(--cf-accent)] underline underline-offset-4" href={publicPath(locale, "/full-check")}>
            {text("Start the LogiVisa Assessment →", "LogiVisa Değerlendirmesini başlatın →", "开始 LogiVisa 评估 →")}
          </Link>
        </p>
        <p className="mt-7 max-w-xl text-xs leading-relaxed text-[var(--cf-muted)]">
          {text(
            "Information and research tools, not personalised immigration advice. Independent of government and assessing authorities.",
            "Bilgi ve araştırma araçları sunar; kişisel göçmenlik danışmanlığı değildir. Hükümetten ve değerlendirme kurumlarından bağımsızdır.",
            "提供信息与研究工具，不提供个性化移民咨询。独立于政府及评估机构。",
          )}
        </p>
      </div>
    </section>
  );
}
