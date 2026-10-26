/**
 * Runtime ISR guard. The occupation pages (~2,000 URLs in three locales) were prerendered with a 60-second revalidate: the page said 3600, but the
 * admin-state-data cache entry (revalidate: 60) the page read lowered it, so each page could regenerate every minute on traffic (one Vercel ISR write
 * each). The visa and guide pages were generated on the first request because their static params had no locale. Admin actions called
 * revalidatePath("/", "layout"), which invalidates every cached page. This test keeps all three out, without banning caching APIs globally.
 *
 *   npx tsx scripts/test-isr-config.ts
 */
import "./lib/stub-request-context";

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";

let failures = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  if (cond) console.log(`  ✅ ${msg}`);
  else { failures++; console.error(`  ❌ ${msg}${detail ? ` -- ${detail}` : ""}`); }
};
const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => { const f = `${dir}/${n}`; return statSync(f).isDirectory() ? walk(f) : [f]; });
const read = (f: string) => readFileSync(f, "utf8");
const code = (f: string) => read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const OCC = "app/[locale]/(main)/occupations/[id]/page.tsx";
const VISA = "app/[locale]/(main)/visas/[subclass]/page.tsx";
const GUIDE = "app/[locale]/(main)/guides/[slug]/page.tsx";

async function main() {
  const sources = [...walk("app"), ...walk("lib"), ...walk("components")].filter((f) => /\.(ts|tsx)$/.test(f)).map((f) => f.replace(/\\/g, "/"));

  console.log("\n1. no timed revalidation drives a public page");
  const timed = sources.filter((f) => /export const revalidate\s*=\s*(?!false\b)[0-9]/.test(code(f)));
  check(timed.length === 0, "no route exports a positive `revalidate` (no timer-based page regeneration)", timed.join(", "));
  const fetchTimed = sources.filter((f) => /next:\s*\{[^}]*revalidate/.test(code(f)));
  check(fetchTimed.length === 0, "no fetch() uses next.revalidate", fetchTimed.join(", "));
  const cacheUsers = sources.filter((f) => /\bunstable_cache\(|"use cache"|\bcacheLife\(/.test(code(f))).sort();
  check(JSON.stringify(cacheUsers) === JSON.stringify(["lib/admin-data/loader.ts", "lib/cache/public-read-models.ts"]), "the data cache (unstable_cache) is used only by the two reviewed read models", cacheUsers.join(", "));

  console.log("\n2. occupation and visa pages are built at deployment and never regenerated at runtime");
  for (const f of [OCC, VISA]) {
    const c = code(f);
    check(/export const revalidate = false;/.test(c), `${f}: revalidate = false`);
    check(/getAdminStateDataForStaticPages\(\)/.test(c) && !/\bgetAdminStateData\(\)/.test(c) && !/public-read-models|unstable_cache/.test(c), `${f}: reads the state data through the build snapshot, not a timed or tagged cache entry`);
    check(!/force-dynamic|noStore|cookies\(\)|headers\(\)/.test(c), `${f}: not made dynamic`);
  }
  check(/export const dynamic = "force-static"/.test(code(VISA)), "the visa pages stay force-static");
  const loader = code("lib/admin-data/loader.ts");
  check(/getAdminStateDataForStaticPages[\s\S]*staticPagesSnapshot \?\?= loadFromDb\(\)/.test(loader) && !/unstable_cache[^;]*staticPagesSnapshot/.test(loader), "the build snapshot is read once per process directly from the database (no cache entry, no tag)");

  console.log("\n3. EN / TR / zh-Hans static generation is intact (locale in every static param)");
  const occ = await import("../app/[locale]/(main)/occupations/[id]/page");
  const visa = await import("../app/[locale]/(main)/visas/[subclass]/page");
  const guide = await import("../app/[locale]/(main)/guides/[slug]/page");
  const { getUniqueOccupations } = await import("../lib/occupations/seo");
  const n = getUniqueOccupations().length;
  const op = occ.generateStaticParams() as Array<{ locale: string; id: string }>;
  check(op.length === n * 3 && ["en", "tr", "zh-Hans"].every((l) => op.filter((p) => p.locale === l).length === n), `occupation pages: ${n} per locale x 3 = ${op.length} static params`, String(op.length));
  const vp = visa.generateStaticParams() as Array<{ locale: string; subclass: string }>;
  check(vp.length === 12 * 3 && ["en", "tr", "zh-Hans"].every((l) => vp.filter((p) => p.locale === l).length === 12), "visa pages: 12 subclasses x 3 locales are prerendered (not generated on the first request)", String(vp.length));
  const gp = (await guide.generateStaticParams()) as Array<{ locale: string; slug: string }>;
  const slugs = new Set(gp.map((p) => p.slug));
  check(gp.length === slugs.size * 3 && ["en", "tr", "zh-Hans"].every((l) => gp.filter((p) => p.locale === l).length === slugs.size), `guide pages: ${slugs.size} guides x 3 locales are prerendered`, String(gp.length));
  for (const f of ["app/[locale]/(main)/occupations/page.tsx", "app/[locale]/(main)/occupations/group/[major]/page.tsx", "app/[locale]/(main)/occupations/letter/[letter]/page.tsx"]) check(/generateStaticParams/.test(code(f)) && /activeLocales/.test(code(f)), `${f}: still prerendered per locale`);

  console.log("\n4. no admin or agent action invalidates the whole site");
  const sitewide = sources.filter((f) => /revalidatePath\(\s*["'`]\/["'`]/.test(code(f)));
  check(sitewide.length === 0, 'no revalidatePath("/") or revalidatePath("/", "layout") (it regenerates every static page on its next visit)', sitewide.join(", "));
  const badPath: string[] = [];
  for (const f of sources) for (const m of code(f).matchAll(/revalidatePath\(\s*(`[^`]*`|"[^"]*"|'[^']*'|[^,)]+)/g)) if (!/admin|agent|dashboard|rounds|data-sync/.test(m[1])) badPath.push(`${f}: ${m[1]}`);
  check(badPath.length === 0, "every revalidatePath targets an admin, agent, dashboard or rounds route (no public static page)", badPath.join("; "));
  const tags = new Set<string>();
  for (const f of sources) for (const m of code(f).matchAll(/revalidateTag\(\s*["']([^"']+)["']/g)) tags.add(m[1]);
  check([...tags].every((t) => ["public-invitation-rounds", "public-guide-download-stats"].includes(t)), "revalidateTag is used only for the invitation-round and guide-download data cache entries", [...tags].join(", "));
  const helper = code("lib/cache/revalidate-admin.ts");
  check(/revalidatePath\("\/\[locale\]\/admin", "layout"\)/.test(helper) && /revalidatePath\("\/\[locale\]\/agent", "layout"\)/.test(helper), "the admin helper invalidates only the admin and agent route trees");

  console.log("\n5. behaviour that must not change");
  const occSrc = code(OCC);
  check(/richness\.tier === "thin"/.test(occSrc) && /index: false/.test(occSrc), "thin pages stay noindex");
  check(/occupationRedirectFor/.test(occSrc) && /permanentRedirect/.test(occSrc) && /notFound\(\)/.test(occSrc), "retired codes redirect and unknown slugs 404");
  check(/pageAlternates\(locale, path\)/.test(occSrc), "canonical and hreflang still come from pageAlternates");
  const m = (await occ.generateMetadata({ params: Promise.resolve({ locale: "tr", id: "225113-marketing-specialist" }) })) as { alternates: { canonical: string; languages: Record<string, string> } };
  check(m.alternates.canonical === "https://www.logivisa.com/tr/occupations/225113-marketing-specialist" && Object.keys(m.alternates.languages).join() === "en,tr,zh-Hans,x-default", "an occupation page keeps its locale canonical and EN / TR / zh-Hans / x-default alternates");
  const { buildSitemap } = await import("../app/sitemap");
  const urls = buildSitemap().map((e) => e.url);
  check(urls.filter((u) => /\/occupations\/\d{6}/.test(u)).length === 1755 && urls.includes("https://www.logivisa.com/tr/occupations/225113-marketing-specialist"), "the sitemap still lists the indexable occupation pages (585 x 3)");
  check(!sources.some((f) => /app\/\[locale\]\/\(main\)\/(occupations|visas|guides)\//.test(f) && /export const dynamic = "force-dynamic"/.test(code(f))), "the occupation, visa and guide pages are not forced dynamic");
  check(!/export const dynamic = "force-dynamic"/.test(code("app/[locale]/layout.tsx")) && !/export const revalidate/.test(code("app/[locale]/layout.tsx")), "the root locale layout is not made dynamic");

  console.log("\n6. the last production build (when present) has no timed route");
  if (existsSync(".next/prerender-manifest.json")) {
    const manifest = JSON.parse(read(".next/prerender-manifest.json")) as { routes: Record<string, { initialRevalidateSeconds: number | false }> };
    const withTimer = Object.entries(manifest.routes).filter(([, v]) => typeof v.initialRevalidateSeconds === "number");
    check(withTimer.length === 0, "no prerendered route has a revalidate interval", `${withTimer.length} (e.g. ${withTimer[0]?.[0]})`);
  } else console.log("  (skipped: no .next build in this checkout)");

  if (failures) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
  console.log("\nAll checks passed");
}
main().catch((e) => { console.error(e); process.exit(1); });
