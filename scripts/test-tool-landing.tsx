/**
 * Organic Traffic Growth Sprint 1: the ANZSCO Finder and the Skills Assessment Finder.
 * Metadata is localized and matches the search wording; the explanatory content and the FAQ are in the server HTML (they were collapsed and absent); both pages
 * link their official sources; the visa comparison page links both tools; analytics, canonical, hreflang, sitemap and static generation are unchanged.
 *
 *   npx tsx scripts/test-tool-landing.tsx
 */
import "./lib/stub-request-context";

import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { SessionProvider } from "next-auth/react";

import { LanguageProvider } from "../contexts/language-context";
import { getTranslations } from "../lib/i18n/get-translations";
import type { Locale } from "../lib/i18n/config";

let failures = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  if (cond) console.log(`  ✅ ${msg}`);
  else { failures++; console.error(`  ❌ ${msg}${detail ? ` -- ${detail}` : ""}`); }
};
const text = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, " ").trim();
const ALT = (path: string) => ({ en: `https://www.logivisa.com${path}`, tr: `https://www.logivisa.com/tr${path}`, "zh-Hans": `https://www.logivisa.com/zh-Hans${path}`, "x-default": `https://www.logivisa.com${path}` });
const read = (f: string) => readFileSync(f, "utf8");
/** Display width: a CJK character counts as two. */
const width = (v: string) => [...v].reduce((n, c) => n + (/[⺀-鿿＀-￯]/.test(c) ? 2 : 1), 0);

type Meta = { title: string; description: string; alternates: { canonical: string; languages: Record<string, string> }; openGraph: { title: string; description: string }; robots?: unknown };

async function main() {
  const anz = await import("../app/[locale]/(main)/tools/anzsco-finder/page");
  const sk = await import("../app/[locale]/(main)/tools/skills-assessment/page");
  const props = (locale: string) => ({ params: Promise.resolve({ locale }), searchParams: Promise.resolve({}) });
  const meta = async (m: { generateMetadata: (a: ReturnType<typeof props>) => Promise<unknown> }, locale: string) => (await m.generateMetadata(props(locale))) as Meta;
  const render = async (m: { default: (a: ReturnType<typeof props>) => Promise<React.ReactElement> }, locale: string) => {
    const translations = await getTranslations(locale as Locale);
    return renderToStaticMarkup(<LanguageProvider initialLocale={locale as Locale} initialTranslations={translations}><SessionProvider session={null}>{await m.default(props(locale))}</SessionProvider></LanguageProvider>);
  };

  const pages = [
    { name: "ANZSCO Finder", mod: anz, path: "/tools/anzsco-finder", en: "ANZSCO Code Finder: Search Australian Occupations", term: /ANZSCO/, official: [/abs\.gov\.au/, /immi\.homeaffairs\.gov\.au/], tracker: 'tool="anzsco_finder"' },
    { name: "Skills Assessment Finder", mod: sk, path: "/tools/skills-assessment", en: "Skills Assessing Authority Finder for Australia", term: /Skills Assessing Authority|Beceri Değerlendirme Kurumu|技能评估机构/, official: [/dewr\.gov\.au/, /immi\.homeaffairs\.gov\.au/], tracker: 'tool="skills_assessment_finder"' },
  ];

  console.log("\n1. metadata: localized, intent-aligned, canonical and hreflang unchanged");
  for (const p of pages) {
    const titles: string[] = [];
    for (const [loc, prefix] of [["en", ""], ["tr", "/tr"], ["zh-Hans", "/zh-Hans"]] as const) {
      const m = await meta(p.mod, loc);
      titles.push(m.title);
      check(m.alternates.canonical === `https://www.logivisa.com${prefix}${p.path}` && JSON.stringify(m.alternates.languages) === JSON.stringify(ALT(p.path)), `${p.name} ${loc}: self-canonical with the unchanged hreflang set`);
      check(m.robots === undefined && m.openGraph.title === m.title && m.openGraph.description === m.description, `${p.name} ${loc}: indexable, Open Graph matches the title and description`);
      check(width(m.title) + 11 <= 70 && width(m.description) >= 100 && width(m.description) <= 200, `${p.name} ${loc}: title and description lengths are search-friendly`, `${width(m.title)} / ${width(m.description)}`);
      check(!/eligib|guarantee|you (can|will)|best visa|qualify/i.test(`${m.title} ${m.description}`), `${p.name} ${loc}: no eligibility verdict or outcome wording`);
      if (loc === "en") check(m.title === p.en, `${p.name} en: title '${p.en}'`, m.title);
      if (loc === "tr") check(/[ıİşŞğĞçÇöÖüÜ]/.test(m.title + m.description) && !/\bSearch\b|\bFinder\b/.test(`${m.title} ${m.description}`), `${p.name} tr: title and description are Turkish`);
      if (loc === "zh-Hans") check(/[一-鿿]/.test(m.title) && /[一-鿿]/.test(m.description) && !/\bSearch\b|\bFinder\b/.test(`${m.title} ${m.description}`), `${p.name} zh-Hans: title and description are Chinese`);
      check(p.term.test(m.title), `${p.name} ${loc}: the title carries the search wording`, m.title);
    }
    check(new Set(titles).size === 3, `${p.name}: three distinct titles (EN, TR, zh-Hans)`);
  }

  console.log("\n2. content and FAQ are in the server HTML; official sources are linked; analytics wiring is unchanged");
  for (const p of pages) {
    for (const loc of ["en", "tr", "zh-Hans"]) {
      const html = await render(p.mod, loc);
      const t = text(html);
      const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((x) => x[1]).join("\n");
      const questions = [...ld.matchAll(/"@type":"Question","name":"((?:[^"\\]|\\.)*)"/g)].map((x) => JSON.parse(`"${x[1]}"`) as string);
      const answers = [...ld.matchAll(/"acceptedAnswer":\{"@type":"Answer","text":"((?:[^"\\]|\\.)*)"/g)].map((x) => JSON.parse(`"${x[1]}"`) as string);
      check(questions.length >= 2 && questions.length === answers.length && questions.every((q) => t.includes(q)) && answers.every((a) => t.includes(a)), `${p.name} ${loc}: every FAQPage question and answer is in the visible server HTML (${questions.length})`);
      check(/<h2[^>]*>[^<]{4,}<\/h2>/.test(html.slice(html.indexOf("border-t border-slate-200 bg-slate-50"))), `${p.name} ${loc}: the explanatory sections render as headings in the server HTML`);
      const links = [...html.matchAll(/<a data-official-source="true" href="([^"]+)"/g)].map((x) => x[1]);
      check(p.official.every((re) => links.some((l) => re.test(l))), `${p.name} ${loc}: official source links present`, links.join(", "));
      check(/class="mt-6 space-y-8"/.test(html) && /hidden=""/.test(html), `${p.name} ${loc}: the section is expanded and the FAQ answers sit in the DOM (collapsed visually)`);
    }
    const src = read(`app/[locale]/(main)/${p.path.slice(1)}/page.tsx`);
    check(src.includes(`<ToolUseTracker ${p.tracker} locale={locale} />`), `${p.name}: the existing tool_use tracker is still mounted with its fixed tool name`);
    check(!/revalidate|unstable_cache|trackEvent|gtag|fbq|dataLayer/.test(src), `${p.name}: no ISR, caching or analytics code added to the page`);
  }
  const section = read("components/SeoContentSection.tsx");
  check(!/trackEvent|gtag|fbq|dataLayer|localStorage|document\.cookie/.test(section), "the shared SeoContentSection holds no analytics or storage code");
  const users = ["tools/invitation-rounds/page.tsx", "tools/state-nomination/page.tsx"].map((f) => read(`app/[locale]/(main)/${f}`));
  check(users.every((u) => !/defaultOpen/.test(u)), "the other SeoContentSection pages keep their collapsed default");

  console.log("\n3. visa comparison links both tools (descriptive, crawlable, locale-prefixed)");
  const vc = await import("../app/[locale]/(main)/tools/visa-comparison/VisaComparisonClient");
  for (const [loc, prefix] of [["en", ""], ["tr", "/tr"], ["zh-Hans", "/zh-Hans"]] as const) {
    const h = renderToStaticMarkup(vc.VisaComparisonClient({ locale: loc }));
    const a = [...h.matchAll(/<a [^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/g)].map((x) => ({ href: x[1], label: x[2].trim() }));
    const s = a.find((x) => x.href === `${prefix}/tools/skills-assessment`);
    const f = a.find((x) => x.href === `${prefix}/tools/anzsco-finder`);
    check(!!s && width(s.label) > 8 && !!f && width(f.label) > 8, `${loc}: links to the Skills Assessing Authority Finder and the ANZSCO Code Finder with descriptive anchors`, JSON.stringify([s, f]));
  }

  console.log("\n4. sitemap, mappings and static behaviour are untouched");
  const { buildSitemap } = await import("../app/sitemap");
  const urls = buildSitemap().map((e) => e.url);
  check(["/tools/anzsco-finder", "/tools/skills-assessment"].every((p) => ["", "/tr", "/zh-Hans"].every((pre) => urls.includes(`https://www.logivisa.com${pre}${p}`))), "both tools are in the sitemap for all three locales");
  const content = read("lib/seo/skills-assessment-content.ts");
  check(/supportedToolMappings\(assessingData\.occupationMapping\)/.test(content), "the finder's coverage statement is still derived from the supported mappings (no mapping was added)");

  if (failures) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
  console.log("\nAll checks passed");
}
main().catch((e) => { console.error(e); process.exit(1); });
