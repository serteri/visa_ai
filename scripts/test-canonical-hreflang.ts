/**
 * Canonical / hreflang hygiene for pages that used to inherit the layouts' site-wide alternates (hreflang -> locale homepages; canonical -> "/"
 * or "/en/..."). Run: npx tsx scripts/test-canonical-hreflang.ts
 */
import { readFileSync } from "node:fs";
import { languageAlternates, pageAlternates, publicUrl } from "../lib/seo/urls";

let failures = 0;
const check = (c: boolean, m: string) => { if (c) console.log(`  ✅ ${m}`); else { failures++; console.error(`  ❌ ${m}`); } };
const read = (p: string) => readFileSync(p, "utf8");
const M = "app/[locale]/(main)/";

console.log("\n1. layouts no longer emit hreflang or a homepage canonical for every page");
const mainLayout = read(M + "layout.tsx"), rootLayout = read("app/[locale]/layout.tsx");
check(!/languages\s*:/.test(mainLayout), "the (main) layout declares no hreflang `languages`");
check(!/languages\s*:/.test(rootLayout) && !/canonical:\s*BASE_URL/.test(rootLayout), "the root layout declares no hreflang and no homepage canonical");
check(/canonical: "\.\/"/.test(mainLayout), "the (main) layout's relative self-canonical fallback is unchanged");

console.log("\n2. contact, legal, terms, rounds declare their real equivalents");
const decl: Array<[string, string, string]> = [
  ["contact", M + "contact/page.tsx", "/contact"],
  ["legal", M + "legal/layout.tsx", "/legal"],
  ["terms", M + "terms/page.tsx", "/terms"],
  ["rounds", M + "rounds/page.tsx", "/rounds"],
  ["home", M + "page.tsx", "/"],
];
for (const [name, file, path] of decl) check(read(file).includes(`pageAlternates(locale, "${path}")`), `${name}: alternates = pageAlternates(locale, "${path}")`);
for (const path of ["/contact", "/legal", "/terms", "/rounds"]) {
  const en = pageAlternates("en", path), tr = pageAlternates("tr", path), zh = pageAlternates("zh-Hans", path);
  check(en.canonical === `https://www.logivisa.com${path}` && tr.canonical === `https://www.logivisa.com/tr${path}` && zh.canonical === `https://www.logivisa.com/zh-Hans${path}`, `${path}: self-canonicals are prefixless EN, /tr, /zh-Hans`);
  const l = en.languages;
  check(l.en === en.canonical && l.tr === tr.canonical && l["zh-Hans"] === zh.canonical && l["x-default"] === en.canonical, `${path}: hreflang en/tr/zh-Hans/x-default name the equivalent pages (reciprocal on every locale)`);
  check(JSON.stringify(tr.languages) === JSON.stringify(l) && JSON.stringify(zh.languages) === JSON.stringify(l), `${path}: the same set is emitted from every locale (reciprocal)`);
  check(!Object.values(l).some((u) => ["https://www.logivisa.com", "https://www.logivisa.com/tr", "https://www.logivisa.com/zh-Hans"].includes(u)), `${path}: no hreflang points to a locale homepage`);
  check(!Object.values(l).concat(en.canonical).some((u) => /\/en(\/|$)/.test(u)), `${path}: no /en/ URL`);
}
check(JSON.stringify(languageAlternates("/")) === JSON.stringify({ en: "https://www.logivisa.com", tr: "https://www.logivisa.com/tr", "zh-Hans": "https://www.logivisa.com/zh-Hans", "x-default": "https://www.logivisa.com" }), "the homepage keeps the same hreflang set (now declared by the page)");

console.log("\n3. sample-report and ai-assistant");
const sample = read(M + "sample-report/page.tsx");
check(/publicUrl\(locale, "\/sample-report"\)/.test(sample) && /robots: \{ index: false, follow: true \}/.test(sample) && !/\/en\/sample-report/.test(sample), "sample-report: stays noindex,follow; canonical is its own public URL, never /en/sample-report");
check(publicUrl("en", "/sample-report") === "https://www.logivisa.com/sample-report" && publicUrl("tr", "/sample-report") === "https://www.logivisa.com/tr/sample-report", "sample-report public URLs: EN prefixless, TR prefixed");
check(!/languages\s*:|pageAlternates/.test(sample), "sample-report emits no hreflang (non-indexable page)");
const ai = read("app/[locale]/ai-assistant/page.tsx");
check(/robots: \{ index: false, follow: true \}/.test(ai) && /canonical: publicUrl\(locale, "\/ai-assistant"\)/.test(ai), "ai-assistant: noindex,follow with a self-canonical");
check(publicUrl("en", "/ai-assistant") === "https://www.logivisa.com/ai-assistant" && publicUrl("zh-Hans", "/ai-assistant") === "https://www.logivisa.com/zh-Hans/ai-assistant", "ai-assistant self-canonical URLs are not the homepage and not /en/");
const sitemap = read("app/sitemap.ts");
check(!/ai-assistant|sample-report|contact|"\/legal"|"\/terms"|"\/rounds"/.test(sitemap), "none of these routes is added to the sitemap (unchanged)");

console.log("\n4. unchanged areas");
const occ = read(M + "occupations/[id]/page.tsx");
check(/pageAlternates|languageAlternates|alternates/.test(occ), "occupation pages still declare their own alternates (file untouched by this change)");
check(/\/tr\/guide|\/zh-Hans\/guide/.test(read("next.config.ts")), "/tr/guide and /zh-Hans/guide redirects still configured");

if (failures) { console.error(`\n❌ ${failures} check(s) failed`); process.exit(1); }
console.log("\n✅ ALL CHECKS PASSED");
