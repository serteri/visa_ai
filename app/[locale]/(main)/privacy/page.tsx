import type { Metadata } from "next";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";

import { PRIVACY_PATH, privacyCopyFor, type PrivacyBlock } from "@/lib/privacy/content";
import { pageAlternates, publicPath, publicUrl } from "@/lib/seo/urls";

type PrivacyPageProps = {
  params: Promise<{ locale: string }>;
};

const OG_LOCALE: Record<string, string> = { en: "en_AU", tr: "tr_TR", "zh-Hans": "zh_CN" };

// The metadata sets its own openGraph object: the locale layout's openGraph (the site home page's title and URL) is replaced as a whole, not merged.
export async function generateMetadata({ params }: PrivacyPageProps): Promise<Metadata> {
  const { locale } = await params;
  const copy = privacyCopyFor(locale);
  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    alternates: pageAlternates(locale, PRIVACY_PATH),
    openGraph: {
      title: `${copy.metaTitle} | LogiVisa`,
      description: copy.metaDescription,
      type: "website",
      url: publicUrl(locale, PRIVACY_PATH),
      locale: OG_LOCALE[locale] ?? "en_AU",
      images: [{ url: "/og/default-og.png", width: 1200, height: 630 }],
    },
  };
}

const LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;

/** Renders [text](url) inline links; the url "{legal}" is the locale's Legal page. */
function renderInline(text: string, locale: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of text.matchAll(LINK_PATTERN)) {
    const index = match.index ?? 0;
    if (index > last) out.push(<Fragment key={key++}>{text.slice(last, index)}</Fragment>);
    const [, label, target] = match;
    if (target === "{legal}") {
      out.push(<Link key={key++} href={publicPath(locale, "/legal")}>{label}</Link>);
    } else {
      out.push(<a key={key++} href={target} rel="noopener noreferrer">{label}</a>);
    }
    last = index + match[0].length;
  }
  if (last < text.length) out.push(<Fragment key={key++}>{text.slice(last)}</Fragment>);
  return out;
}

function Block({ block, locale }: { block: PrivacyBlock; locale: string }) {
  if ("p" in block) return <p>{renderInline(block.p, locale)}</p>;
  return (
    <ul>
      {block.ul.map((item) => (
        <li key={item}>{renderInline(item, locale)}</li>
      ))}
    </ul>
  );
}

export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { locale } = await params;
  const copy = privacyCopyFor(locale);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 font-normal text-slate-700 prose" data-testid="privacy-policy">
      <h1>{copy.title}</h1>
      <p className="text-sm text-slate-700">{copy.updatedLabel}</p>
      {copy.sections.map((section, index) => (
        <section key={section.id} id={section.id}>
          <h2>
            {index + 1}. {section.title}
          </h2>
          {section.blocks.map((block, i) => (
            <Block key={i} block={block} locale={locale} />
          ))}
        </section>
      ))}
    </div>
  );
}
