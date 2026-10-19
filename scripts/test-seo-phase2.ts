/**
 * SEO Phase 2 (docs/seo-occupation-audit.md section 8), source-level checks, one section per step. Database-free.
 * Run: npx tsx scripts/test-seo-phase2.ts
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import robots from "../app/robots";
import { activeLocales } from "../lib/i18n/config";
import { languageAlternates, pageAlternates, publicUrl } from "../lib/seo/urls";

let failures = 0;
function t(name: string, ok: boolean, detail?: string) {
  if (!ok) failures++;
  console.log(`${ok ? "  ✅" : "  ❌"} ${name}${!ok && detail ? ` -- ${detail}` : ""}`);
}
const section = (s: string) => console.log(`\n${s}`);

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

section("Step 1. <html lang> per locale, hub canonical / hreflang, no crawlDelay");
const layout = readFileSync("app/[locale]/layout.tsx", "utf8");
t("the root layout lives in app/[locale] and takes the locale param", /params: Promise<\{ locale: string \}>/.test(layout) && /await params/.test(layout));
t("<html lang> is the route locale, not a literal", /lang=\{lang\}/.test(layout) && !/lang="en"/.test(layout) && /isValidLocale\(locale\) \? locale : "en"/.test(layout));
t("there is no second root layout or root page above [locale]", (() => { try { readFileSync("app/layout.tsx"); return false; } catch { return true; } })() && (() => { try { readFileSync("app/page.tsx"); return false; } catch { return true; } })());
const rules = robots().rules;
t("robots.txt has no crawlDelay", JSON.stringify(rules).indexOf("crawlDelay") === -1);
t("robots.txt still disallows /api/ and references the sitemap", JSON.stringify(rules).includes("/api/") && robots().sitemap === "https://www.logivisa.com/sitemap.xml");

const pages = walk("app").filter((p) => /page\.tsx$/.test(p));
const badCanon = pages.filter((p) => /canonical:\s*`\/\$\{locale\}\//.test(readFileSync(p, "utf8")));
t("no page declares a `/${locale}/...` canonical (the English one would be a redirecting /en/ URL)", badCanon.length === 0, badCanon.join(", "));
const badLang = pages.filter((p) => /languages:\s*\{[^}]*["'`]\/en\//.test(readFileSync(p, "utf8")));
t("no page lists an `/en/...` hreflang URL", badLang.length === 0, badLang.join(", "));
const badOg = pages.filter((p) => /url:\s*`\/\$\{locale\}\//.test(readFileSync(p, "utf8")));
t("no page uses a relative `/${locale}/...` OpenGraph url", badOg.length === 0, badOg.join(", "));

const envBase = pages.filter((p) => !p.includes("admin") && /BASE_URL\s*=\s*process\.env\.NEXT_PUBLIC_BASE_URL/.test(readFileSync(p, "utf8")));
t("public pages take metadataBase from the production origin, not NEXT_PUBLIC_BASE_URL", envBase.length === 0, envBase.join(", "));

for (const path of ["/guides", "/journey", "/visas", "/visas/australia", "/reports", "/pr-readiness-quiz"]) {
  for (const locale of activeLocales) {
    const a = pageAlternates(locale, path);
    const self = publicUrl(locale, path);
    t(`${locale} ${path}: canonical is itself, hreflang has ${activeLocales.length} locales + x-default, none via /en/`, a.canonical === self && Object.keys(a.languages).length === activeLocales.length + 1 && a.languages["x-default"] === publicUrl("en", path) && !Object.values(a.languages).some((u) => u.includes("/en/")) && JSON.stringify(a.languages) === JSON.stringify(languageAlternates(path)));
  }
}

console.log(failures === 0 ? "\n✅ ALL CHECKS PASSED" : `\n❌ ${failures} CHECK(S) FAILED`);
process.exitCode = failures === 0 ? 0 : 1;
