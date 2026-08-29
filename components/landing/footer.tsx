import Link from "next/link";

interface LandingFooterProps {
  locale: string;
}

/** Minimalist landing footer — brand, key links, legal disclaimers and
 *  copyright. Rendered only on the homepage (the global footer is suppressed
 *  there by ShellFooterGate in the (main) layout). */
export function LandingFooter({ locale }: LandingFooterProps) {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";

  const tagline = isTr
    ? "Avustralya göçmenlik yolunuzu gerçek verilerle, saniyeler içinde keşfedin."
    : isZh
      ? "基于真实数据，在几秒内发现您的澳大利亚移民路径。"
      : "Discover your Australia migration path in seconds, grounded in real data.";

  const columns: Array<{ heading: string; links: Array<{ label: string; href: string }> }> = [
    {
      heading: isTr ? "Araçlar" : isZh ? "工具" : "Tools",
      links: [
        {
          label: isTr ? "Meslek Ara (ANZSCO)" : isZh ? "职业搜索 (ANZSCO)" : "Occupation Search (ANZSCO)",
          href: `/${locale}/tools/anzsco-finder`,
        },
        {
          label: isTr ? "Puan Hesaplayıcı" : isZh ? "积分计算器" : "Points Calculator",
          href: `/${locale}/tools/points-calculator`,
        },
        {
          label: isTr ? "Beceri Değerlendirme" : isZh ? "技能评估" : "Skills Assessment",
          href: `/${locale}/tools/skills-assessment`,
        },
      ],
    },
    {
      heading: isTr ? "Kaynaklar" : isZh ? "资源" : "Resources",
      links: [
        {
          label: isTr ? "Rehberler" : isZh ? "指南" : "Guides",
          href: `/${locale}/guides`,
        },
        {
          label: isTr ? "Vizeler" : isZh ? "签证" : "Visas",
          href: `/${locale}/visas/australia`,
        },
        {
          label: isTr ? "İletişim" : isZh ? "联系我们" : "Contact",
          href: `/${locale}/contact`,
        },
      ],
    },
  ];

  const legalLinks = [
    {
      label: isTr ? "Kullanım Koşulları" : isZh ? "条款" : "Terms",
      href: `/${locale}/terms`,
    },
    {
      label: isTr ? "Yasal Uyarı" : isZh ? "法律声明" : "Legal",
      href: `/${locale}/legal`,
    },
    {
      label: isTr ? "Gizlilik" : isZh ? "隐私" : "Privacy",
      href: `/${locale}/legal`,
    },
  ];

  const disclaimer = isTr
    ? "LogiVisa bağımsız bir bilgi platformudur; göçmenlik tavsiyesi sunmaz. MARA kayıtlı bir danışman veya RCIC ile çalışmıyoruz. İçerik bilgilendirme amaçlıdır ve resmi kurumlardan bağımsızdır."
    : isZh
      ? "LogiVisa 是一个独立信息平台，不提供移民建议。我们并非 MARA 注册代理或 RCIC。所有内容仅供参考，与任何官方机构无关。"
      : "LogiVisa is an independent information platform and does not provide immigration advice. We are not a MARA-registered agent or an RCIC. Content is for information only and is independent of any official body.";

  return (
    <footer className="case-file border-t border-[var(--cf-line)] bg-[var(--cf-bg-deep)] text-[var(--cf-muted)]">
      <div className="section-shell py-20">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="text-lg font-extrabold tracking-tight text-[var(--cf-fg)]">
              Logi<span className="text-[var(--cf-accent)]">Visa</span>
            </p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed">{tagline}</p>
            <div className="cf-mono mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs uppercase tracking-wide">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--cf-accent)]" />
                {isTr ? "ANZSCO 2026" : isZh ? "ANZSCO 2026" : "ANZSCO 2026"}
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--cf-accent)]" />
                {isTr ? "NOC 2021" : isZh ? "NOC 2021" : "NOC 2021"}
              </span>
            </div>
          </div>

          {columns.map((column) => (
            <div key={column.heading}>
              <p className="cf-mono text-xs uppercase tracking-[0.14em] text-[var(--cf-muted)]">
                {column.heading}
              </p>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-[var(--cf-muted)] transition-colors hover:text-[var(--cf-accent)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 border-t border-[var(--cf-line)] pt-10">
          <p className="max-w-3xl text-xs leading-relaxed text-[var(--cf-muted)]/80">{disclaimer}</p>

          <div className="mt-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <p className="text-xs text-[var(--cf-muted)]/70">
              © {new Date().getFullYear()} LogiVisa. {isTr ? "Tüm hakları saklıdır." : isZh ? "保留所有权利。" : "All rights reserved."}
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {legalLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-xs text-[var(--cf-muted)]/80 underline underline-offset-2 transition-colors hover:text-[var(--cf-accent)]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
