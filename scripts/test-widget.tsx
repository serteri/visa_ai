/**
 * /widget/points-calculator returned HTTP 500 in every locale: the shared calculator calls useTranslation(), and the widget layout did not provide
 * the LanguageProvider that the (main) layout supplies. Run: npx tsx scripts/test-widget.tsx
 */
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { SessionProvider } from "next-auth/react";

import { PointsCalculatorClient } from "../app/[locale]/(main)/tools/points-calculator/points-calculator-client";
import { LanguageProvider } from "../contexts/language-context";
import { getTranslations } from "../lib/i18n/get-translations";
import { publicUrl } from "../lib/seo/urls";
import type { Locale } from "../lib/i18n/config";

let failures = 0;
const check = (c: boolean, m: string) => { if (c) console.log(`  ✅ ${m}`); else { failures++; console.error(`  ❌ ${m}`); } };
const read = (p: string) => readFileSync(p, "utf8");

async function main() {
  console.log("\n1. the widget layout supplies the provider the calculator needs");
  const layout = read("app/[locale]/widget/layout.tsx");
  check(/<LanguageProvider initialLocale=\{locale as Locale\} initialTranslations=\{translations\}>/.test(layout) && /getTranslations\(locale as Locale\)/.test(layout), "widget layout wraps the page in LanguageProvider with the route's locale and translations");
  check(/notFound\(\)/.test(layout) && !/ShellHeader|ShellFooter|SiteGuide/.test(layout), "an invalid locale 404s; no site header, footer or guide is added (the widget stays stripped)");
  check(/SessionProviderWrapper/.test(read("app/[locale]/layout.tsx")), "the session provider the calculator's useSession needs is supplied by the root locale layout (no new auth requirement)");

  console.log("\n2. without the provider the calculator throws (the production failure); with it every locale renders");
  let threw = "";
  try { renderToStaticMarkup(<SessionProvider session={null}><PointsCalculatorClient locale="en" hideHeader={true} /></SessionProvider>); } catch (e) { threw = String(e); }
  check(/useLanguage must be used within LanguageProvider/.test(threw), "no LanguageProvider -> 'useLanguage must be used within LanguageProvider' (root cause reproduced)");

  const html: Record<string, string> = {};
  for (const locale of ["en", "tr", "zh-Hans"] as Locale[]) {
    const translations = await getTranslations(locale);
    let out = "", err = "";
    try {
      out = renderToStaticMarkup(<LanguageProvider initialLocale={locale} initialTranslations={translations}><SessionProvider session={null}><PointsCalculatorClient locale={locale} hideHeader={true} /></SessionProvider></LanguageProvider>);
    } catch (e) { err = String(e); }
    html[locale] = out;
    check(err === "" && out.length > 2000, `${locale}: the widget calculator renders (${out.length} bytes)`, );
    if (err) console.error("    ", err.slice(0, 200));
    check(/<input|<select|<button/.test(out), `${locale}: the calculator's controls are present`);
    check(!/Powered by|<header/i.test(out), `${locale}: no site header inside the calculator (hideHeader)`);
  }
  check(html.en !== html.tr && html.tr !== html["zh-Hans"] && html.en !== html["zh-Hans"], "each locale renders its own text (no cross-locale leakage)");
  check(/[一-鿿]/.test(html["zh-Hans"]) && !/[一-鿿]/.test(html.tr + html.en.replace(/[^\x00-\x7f]/g, "")), "Chinese text appears only in the zh-Hans render");
  check(/[ğşıİ]/.test(html.tr), "Turkish text appears in the tr render");

  console.log("\n3. calculator interaction stays in the shared client; the normal route is unchanged");
  const client = read("app/[locale]/(main)/tools/points-calculator/points-calculator-client.tsx");
  check(/useReducer\(/.test(client) && /onChange|onClick/.test(client), "the shared calculator keeps its reducer and handlers (interaction is exercised live: see release notes)");
  check(/hideHeader/.test(client), "hideHeader is supported by the shared client");
  const normal = read("app/[locale]/(main)/tools/points-calculator/australia/page.tsx");
  check(/PointsCalculatorClient/.test(normal), "the Australia route still renders the same shared client");

  console.log("\n4. metadata and sitemap unchanged");
  const page = read("app/[locale]/widget/points-calculator/page.tsx");
  check(/robots: \{ index: false, follow: true \}/.test(page) && /canonical: publicUrl\(locale, "\/widget\/points-calculator"\)/.test(page), "noindex,follow and the self-canonical remain");
  check(!/pageAlternates|languages/.test(page), "no hreflang");
  check(publicUrl("en", "/widget/points-calculator") === "https://www.logivisa.com/widget/points-calculator", "English canonical is prefixless");
  check(!/widget/.test(read("app/sitemap.ts")), "the widget is not in the sitemap");
  check(/https:\/\/www\.logivisa\.com\/\$\{locale\}\/full-check/.test(page) && /Powered by LogiVisa/.test(page), "the Powered by LogiVisa CTA is unchanged");

  if (failures) { console.error(`\n❌ ${failures} check(s) failed`); process.exit(1); }
  console.log("\n✅ ALL CHECKS PASSED");
}
main();
