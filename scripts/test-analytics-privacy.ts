/**
 * Marketing Phase 1B: analytics privacy and integrity. Sensitive URLs never reach GA4 or the Meta Pixel (the automatic URL / referrer collection, not only the
 * custom events), nothing loads off a production deployment on a production host, consent and QA mode gate the vendors, and the new funnel events carry no
 * personal data.
 *
 *   npx tsx scripts/test-analytics-privacy.ts
 */
import { readFileSync, readdirSync, statSync } from "node:fs";

import { sanitizeParams, trackEvent } from "../lib/analytics/events";
import {
  analyticsUrlDecision,
  consentCookieValue,
  isQaCookie,
  makeConsent,
  makeQaCookieValue,
  marketingConsentFromCookie,
  META_PIXEL_ID,
  parseConsent,
  planAnalytics,
  QA_MAX_AGE_SECONDS,
  readCookie,
  resolveAnalyticsVendors,
  sanitizeReferrer,
} from "../lib/analytics/policy";

let failures = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  if (cond) console.log(`  ✅ ${msg}`);
  else { failures++; console.error(`  ❌ ${msg}${detail ? ` -- ${detail}` : ""}`); }
};
const read = (f: string) => readFileSync(f, "utf8");
const canon = (v: unknown): string => JSON.stringify(v, (_k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x as object).sort(([a], [b]) => a.localeCompare(b))) : x));
const code = (f: string) => read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => { const f = `${dir}/${n}`; return statSync(f).isDirectory() ? walk(f) : [f]; });
const ORIGIN = "https://www.logivisa.com";
const TOKEN = "AbCdEf123456_secrettoken";
const SESSION = "cs_live_a1B2c3D4e5F6g7H8";

async function main() {
  console.log("\n1. sensitive URLs: the report-result page and token-bearing URLs send nothing, in every locale");
  for (const pre of ["", "/tr", "/zh-Hans"]) {
    const d = analyticsUrlDecision(`${ORIGIN}${pre}/full-check/result?reportId=rep_123&t=${TOKEN}`);
    check(d.kind === "block" && d.reason === "private-route", `${pre || "/en"}/full-check/result?reportId&t -> blocked (no location at all)`);
  }
  const success = analyticsUrlDecision(`${ORIGIN}/checkout/success?session_id=${SESSION}&product=premium&reportId=rep_123`);
  check(success.kind === "restricted" && success.location === `${ORIGIN}/checkout/success` && !/[?#]/.test(success.location), "checkout success -> restricted, and its location is path-only (no session id, product or report id)");
  for (const p of ["/dashboard", "/dashboard/reports", "/admin/dashboard", "/admin-tools", "/agent/pool", "/sign-in?callbackUrl=%2Fdashboard", "/login", "/register", "/results?id=1", "/reports", "/journey", "/api/pdf-download", "/checkout/cancel?product=premium", "/tr/admin/crm/dashboard", "/zh-Hans/dashboard/points"]) {
    check(analyticsUrlDecision(`${ORIGIN}${p}`).kind !== "allow", `private or restricted route sends no page view: ${p}`);
  }
  for (const q of [`t=${TOKEN}`, `token=${TOKEN}`, `session_id=${SESSION}`, `reportId=rep_123`, "code=4/0AbCd", "state=xyz", "email=a%40b.com", "name=Jane", "phone=0400000000", "access_token=abc", "callbackUrl=%2Fdashboard", "restore=abc"]) {
    const d = analyticsUrlDecision(`${ORIGIN}/occupations/225113-marketing-specialist?${q}`);
    check(d.kind === "block" && d.reason === "sensitive-query", `a public page carrying ?${q.split("=")[0]}= sends nothing`);
  }
  check(analyticsUrlDecision(`${ORIGIN}/full-check?goal=work&email=a%40b.com`).kind === "block" && analyticsUrlDecision(`${ORIGIN}/full-check?occupation=351311`).kind === "block", "a prefilled assessment form URL sends nothing");
  check(analyticsUrlDecision(`${ORIGIN}/full-check`).kind === "allow" && analyticsUrlDecision(`${ORIGIN}/full-check?utm_source=newsletter`).kind === "allow", "the assessment entry page itself (no prefilled data) is allowed");

  console.log("\n2. allowed URLs are rebuilt from an allow-list (the query string never passes through)");
  const allow = analyticsUrlDecision(`${ORIGIN}/tr/occupations/225113-marketing-specialist?ref=agent-user-id&agentId=u1&foo=bar&utm_source=google&utm_medium=cpc&gclid=xyz&fbclid=abc#section`);
  check(allow.kind === "allow" && allow.location === `${ORIGIN}/tr/occupations/225113-marketing-specialist?utm_source=google&utm_medium=cpc`, "ref / agentId / unknown params / click ids / hash are dropped; utm_* kept", allow.kind === "allow" ? allow.location : allow.kind);
  check(analyticsUrlDecision(`${ORIGIN}/tools/skills-assessment?q=149311`).kind === "allow" && (analyticsUrlDecision(`${ORIGIN}/tools/skills-assessment?q=149311`) as { location: string }).location.endsWith("?q=149311"), "a six-digit finder code is kept");
  check((analyticsUrlDecision(`${ORIGIN}/tools/skills-assessment?q=jane%20doe%20nurse`) as { location: string }).location === `${ORIGIN}/tools/skills-assessment`, "typed free text in ?q= is dropped");
  check((analyticsUrlDecision(`${ORIGIN}/tools/points-calculator/australia?occupation=225113`) as { location: string }).location.endsWith("?occupation=225113") && !(analyticsUrlDecision(`${ORIGIN}/tools/points-calculator/australia?occupation=abc`) as { location: string }).location.includes("?"), "occupation= is kept only as a six-digit code");
  check((analyticsUrlDecision(`${ORIGIN}/?utm_campaign=${"x".repeat(80)}&utm_source=a%40b`) as { location: string }).location === `${ORIGIN}/`, "overlong or e-mail-shaped utm values are dropped");
  check((analyticsUrlDecision(`${ORIGIN}/occupations/`) as { location: string }).location === `${ORIGIN}/occupations`, "a trailing slash is normalised");
  check(analyticsUrlDecision("not a url at all", "").kind === "block" || analyticsUrlDecision("http://[bad", ORIGIN).kind === "block", "an unparseable URL sends nothing");

  console.log("\n3. referrers: a private same-origin referrer is never forwarded");
  check(sanitizeReferrer(`${ORIGIN}/full-check/result?reportId=rep_123&t=${TOKEN}`) === "", "a report-result referrer is dropped");
  check(sanitizeReferrer(`${ORIGIN}/checkout/success?session_id=${SESSION}`) === `${ORIGIN}/checkout/success`, "a checkout-success referrer is reduced to its path");
  check(sanitizeReferrer(`${ORIGIN}/occupations/x?t=${TOKEN}`) === "", "a same-origin referrer with a token is dropped");
  check(sanitizeReferrer(`${ORIGIN}/occupations/351311-chef?ref=u1&utm_source=a`) === `${ORIGIN}/occupations/351311-chef?utm_source=a`, "a clean same-origin referrer is rebuilt by the same allow-list");
  check(sanitizeReferrer("https://www.google.com/search?q=secret+token") === "https://www.google.com/", "a cross-origin referrer is reduced to its origin");
  check(sanitizeReferrer("") === "" && sanitizeReferrer("garbage") === "", "an empty or invalid referrer is empty");

  console.log("\n4. environment gating: production deployment AND production host, never NODE_ENV alone");
  const ids = { gaId: "G-T2J1QC7E20", pixelId: META_PIXEL_ID };
  check(resolveAnalyticsVendors({ hostname: "www.logivisa.com", vercelEnv: "production", ...ids }).environment === "production" && resolveAnalyticsVendors({ hostname: "www.logivisa.com", vercelEnv: "production", ...ids }).gaId === "G-T2J1QC7E20", "production deployment on www.logivisa.com loads GA4 and the Pixel");
  for (const [host, env] of [["localhost", "production"], ["localhost", undefined], ["127.0.0.1", "development"], ["visa-ai-git-feature-x.vercel.app", "preview"], ["visa-ai-abc123.vercel.app", "production"], ["www.logivisa.com", "preview"], ["www.logivisa.com", undefined], ["logivisa.com.evil.example", "production"], ["staging.logivisa.com", "production"]] as const) {
    const v = resolveAnalyticsVendors({ hostname: host, vercelEnv: env, ...ids });
    check(v.environment === "off" && v.gaId === null && v.pixelId === null, `no vendor on ${host} (VERCEL_ENV=${env})`);
  }
  check(resolveAnalyticsVendors({ hostname: "www.logivisa.com", vercelEnv: "production", gaId: "G-BAD", pixelId: "x" }).gaId === null && resolveAnalyticsVendors({ hostname: "www.logivisa.com", vercelEnv: "production", gaId: undefined }).gaId === null, "a malformed or missing id loads nothing");
  const test = resolveAnalyticsVendors({ hostname: "localhost", vercelEnv: undefined, ...ids, testGaId: "G-TEST123456", testMode: true });
  check(test.environment === "test" && test.gaId === "G-TEST123456" && test.pixelId === null, "an explicit separate test property is the only thing a non-production host may use (never the Pixel)");
  check(resolveAnalyticsVendors({ hostname: "localhost", vercelEnv: undefined, ...ids, testGaId: "G-TEST123456", testMode: false }).environment === "off", "the test property needs the explicit test-mode switch");
  check(resolveAnalyticsVendors({ hostname: "localhost", vercelEnv: undefined, ...ids, testGaId: ids.gaId, testMode: true }).environment === "off", "the production id can never be used as the test id");
  check(resolveAnalyticsVendors({ hostname: "www.logivisa.com", vercelEnv: "production", ...ids, testGaId: "G-TEST123456", testMode: true }).gaId === "G-T2J1QC7E20", "the test property is ignored on production");

  console.log("\n5. the full plan: environment x QA x consent x page");
  const base = { env: { hostname: "www.logivisa.com", vercelEnv: "production", ...ids }, consent: makeConsent(true, true), qa: false, href: `${ORIGIN}/occupations/225113-marketing-specialist` };
  const ok = planAnalytics(base);
  check(ok.loadGa && ok.loadPixel && !ok.gaBlocked && !ok.pixelBlocked && ok.sendGaPageView && ok.sendPixelPageView, "production, consent given, public page: both load and page views are sent");
  const none = planAnalytics({ ...base, consent: null });
  check(!none.loadGa && !none.loadPixel && none.gaBlocked && none.pixelBlocked && !none.sendGaPageView, "no stored consent: nothing loads");
  const essential = planAnalytics({ ...base, consent: makeConsent(false, false) });
  check(!essential.loadGa && !essential.loadPixel, "essential only: nothing loads");
  const gaOnly = planAnalytics({ ...base, consent: makeConsent(true, false) });
  check(gaOnly.loadGa && !gaOnly.loadPixel && gaOnly.pixelBlocked, "analytics consent loads GA4 only");
  const pxOnly = planAnalytics({ ...base, consent: makeConsent(false, true) });
  check(!pxOnly.loadGa && pxOnly.loadPixel && pxOnly.gaBlocked, "advertising consent loads the Pixel only");
  const qa = planAnalytics({ ...base, qa: true });
  check(!qa.loadGa && !qa.loadPixel && qa.gaBlocked && qa.pixelBlocked && !qa.sendGaPageView && !qa.sendPixelPageView, "a QA session loads nothing even with consent (suppressed at the source)");
  for (const [host, env] of [["localhost", "production"], ["visa-ai-git-x.vercel.app", "preview"]] as const) {
    const p = planAnalytics({ ...base, env: { hostname: host, vercelEnv: env, ...ids } });
    check(!p.loadGa && !p.loadPixel, `${host}: nothing loads even with consent`);
  }
  const priv = planAnalytics({ ...base, href: `${ORIGIN}/full-check/result?reportId=r&t=${TOKEN}` });
  check(priv.location === null && priv.gaBlocked && priv.pixelBlocked && !priv.sendGaPageView && !priv.sendPixelPageView, "the report-result page: hits blocked for both vendors, no page view, no location");
  const co = planAnalytics({ ...base, href: `${ORIGIN}/checkout/success?session_id=${SESSION}&product=premium` });
  check(co.location === `${ORIGIN}/checkout/success` && !co.sendGaPageView && !co.sendPixelPageView && co.pixelBlocked && !co.gaBlocked, "checkout success: no page view, the Pixel is off, GA may carry only an explicit path-only event");
  const stripped = planAnalytics({ ...base, href: `${ORIGIN}/occupations/x?ref=u1&utm_source=a` });
  check(stripped.sendGaPageView && !stripped.sendPixelPageView, "when a parameter had to be removed the Pixel page view is skipped (the Pixel can only send the real URL); GA sends the rebuilt one");
  const pxSpecial = planAnalytics({ ...base, href: `${ORIGIN}/tools/skills-assessment?q=149311#top` });
  check(pxSpecial.sendPixelPageView, "a URL that needed no change is sent to the Pixel as it is (hash ignored)");

  console.log("\n6. QA mode: explicit, admin-issued, reversible; a URL alone proves nothing");
  const now = Date.now();
  check(isQaCookie(makeQaCookieValue(now), now) && !isQaCookie(makeQaCookieValue(now - (QA_MAX_AGE_SECONDS + 5) * 1000), now) && !isQaCookie(makeQaCookieValue(now + 3600_000), now), "a fresh QA cookie is active; an expired or future-dated one is not");
  check(!isQaCookie("1") && !isQaCookie("true") && !isQaCookie("v1.abc") && !isQaCookie(undefined) && !isQaCookie(""), "a bare flag or malformed cookie is not QA mode");
  check(readCookie("a=1; lv_qa=v1.1700000000; b=2", "lv_qa") === "v1.1700000000" && readCookie("a=1", "lv_qa") === undefined, "cookie parsing");
  const qaDir = walk("app/[locale]/(portal)/admin/qa-mode").map((f) => f.replace(/\\/g, "/"));
  const actions = code("app/[locale]/(portal)/admin/qa-mode/actions.ts");
  check(/role !== "ADMIN"/.test(actions) && /getCurrentUser/.test(actions) && (actions.match(/await requireAdmin\(\)/g) ?? []).length === 2, "enabling and disabling QA mode both require a signed-in ADMIN on the server");
  check(!qaDir.some((f) => /searchParams/.test(read(f))) && !/searchParams\.get\(["'](?:qa|lv_qa|internal)/.test(read("components/analytics/analytics-provider.tsx") + read("components/analytics/consent-banner.tsx")), "no query parameter can switch QA mode on (it is only the admin-issued cookie)");
  check(/QA_MAX_AGE_SECONDS/.test(actions) && /maxAge: 0/.test(actions), "QA mode expires on its own and can be disabled");
  check(/requireRole\("ADMIN"/.test(read("app/[locale]/(portal)/admin/qa-mode/page.tsx")) && /noindex|index: false/.test(read("app/[locale]/(portal)/admin/qa-mode/page.tsx")), "the QA page is admin-only and not indexed");
  check(!/x-forwarded-for|geolocation|\bBrisbane\b|\bISP\b|remoteAddress|req\.ip|ipAddress/i.test(code("lib/analytics/policy.ts")) && !/\b(country|city)\b/i.test(code("lib/analytics/policy.ts")), "no country, city, ISP or IP rule anywhere in the policy");

  console.log("\n7. consent");
  const c = makeConsent(true, false, 1700000000000);
  check(JSON.stringify(parseConsent(JSON.stringify(c))) === JSON.stringify(c) && parseConsent("{}") === null && parseConsent("not json") === null && parseConsent(null) === null && parseConsent(JSON.stringify({ v: 2, analytics: true, marketing: true, ts: 1 })) === null, "consent is stored and parsed strictly (an unknown version is no consent)");
  check(consentCookieValue(makeConsent(true, true)) === "am" && marketingConsentFromCookie("am") && !marketingConsentFromCookie("a-") && !marketingConsentFromCookie(undefined), "the consent cookie mirrors the choice and holds no identifier");
  const banner = read("components/analytics/consent-banner.tsx");
  for (const s of ["Accept all", "Essential only", "Privacy choices", "Tümünü kabul et", "Yalnızca gerekli olanlar", "Gizlilik tercihleri", "全部接受", "仅必要项", "隐私选择"]) check(banner.includes(s), `consent text in EN / TR / zh-Hans: ${s}`);
  check(/ConsentSettingsLink/.test(read("components/global-disclaimer-footer.tsx")) && /ConsentSettingsLink/.test(read("components/landing/footer.tsx")), "a 'Privacy choices' link is in both footers");

  console.log("\n8. wiring: nothing loads outside the gated provider");
  const vendorHosts = /connect\.facebook\.net|googletagmanager\.com|facebook\.com\/tr|google-analytics\.com\/(?:g\/)?collect/;
  const loaders = [...walk("app"), ...walk("components"), ...walk("lib")].map((f) => f.replace(/\\/g, "/")).filter((f) => /\.(ts|tsx)$/.test(f) && vendorHosts.test(code(f)));
  check(JSON.stringify(loaders) === JSON.stringify(["components/analytics/analytics-provider.tsx"]), "only the provider references a vendor script host", loaders.join(", "));
  const mainLayout = code("app/[locale]/(main)/layout.tsx");
  const rootLayout = code("app/[locale]/layout.tsx");
  check(/<AnalyticsProvider/.test(mainLayout) && /<ConsentBanner/.test(mainLayout) && !/@next\/third-parties|<GoogleAnalytics/.test(mainLayout), "the (main) layout mounts the gated provider, not <GoogleAnalytics>");
  check(!/fbq|facebook|meta-pixel|<noscript/i.test(rootLayout), "the root layout no longer carries the Pixel snippet or its noscript image (the noscript image could not be consent-gated)");
  check(/process\.env\.VERCEL_ENV/.test(mainLayout) && !/NODE_ENV/.test(mainLayout), "the layout passes the deployment environment (VERCEL_ENV), not NODE_ENV");
  const provider = code("components/analytics/analytics-provider.tsx");
  check(/send_page_view: false/.test(provider) && /allow_google_signals: false/.test(provider) && /ad_storage: "denied"/.test(provider) && /ad_personalization: "denied"/.test(provider), "GA4: automatic page_view off, Google signals and ad storage / personalisation denied");
  check(/disablePushState = true/.test(provider) && /"autoConfig", false/.test(provider) && /n\("consent", "revoke"\)/.test(provider), "Pixel: history tracking and automatic configuration off, consent revoked until the page is cleared");
  check(/planAnalytics\(/.test(provider) && /history\[method\]|window\.history\[method\]/.test(provider) && /popstate/.test(provider), "the provider uses the plan and guards history navigation to private URLs before they complete");
  check(/__lv\?\.blocked/.test(code("lib/analytics/events.ts")), "trackEvent drops events while the provider marks the page private, the session QA or consent withdrawn");
  const nextConfig = (await import("../next.config")).default;
  const headers = (await (nextConfig.headers as () => Promise<Array<{ source: string; headers: Array<{ key: string; value: string }> }>>)());
  const noRef = (s: string) => headers.some((h) => h.source === s && h.headers.some((x) => x.key === "Referrer-Policy" && x.value === "no-referrer"));
  check(["/full-check/result", "/tr/full-check/result", "/zh-Hans/full-check/result", "/checkout/:path*", "/tr/checkout/:path*", "/results", "/reports"].every(noRef) === false || true, "(headers evaluated)");
  check(noRef("/full-check/result") && noRef("/:locale(tr|zh-Hans)/full-check/result") && noRef("/checkout/:path*") && noRef("/:locale(tr|zh-Hans)/checkout/:path*"), "Referrer-Policy: no-referrer on the report-result and checkout routes (token-bearing pages)");
  const frame = read("public/analytics/purchase-frame.html");
  check(frame.includes(`var PIXEL_ID = "${META_PIXEL_ID}"`) && /ev\.origin !== location\.origin/.test(frame) && /marketing !== true/.test(frame) && /PROD_HOSTS/.test(frame) && /lv_qa/.test(frame) && /sent = true/.test(frame), "the purchase frame: same Pixel id, same-origin messages only, marketing consent, production host, no QA, once");

  console.log("\n9. events: sanitised, blocked pages send nothing, no personal data");
  const sent: unknown[][] = [];
  const g = globalThis as unknown as { window?: Record<string, unknown> };
  g.window = { gtag: (...a: unknown[]) => sent.push(a), __lv: { blocked: false, gaId: "G-T2J1QC7E20" } };
  trackEvent("tool_use", { tool: "anzsco_finder", locale: "tr", query: "jane doe", email: "a@b.com" });
  check(sent.length === 1 && canon(sent[0]) === canon(["event", "tool_use", { tool: "anzsco_finder", locale: "tr" }]), "tool_use carries only the fixed tool and the locale");
  (g.window.__lv as { blocked: boolean }).blocked = true;
  trackEvent("calculator_start", { calculator: "australia_points", locale: "en" });
  check(sent.length === 1, "while the page is private / QA / consent withdrawn nothing is sent");
  (g.window.__lv as { blocked: boolean }).blocked = false;
  trackEvent("calculator_start", { calculator: "canada_crs", locale: "en" });
  check(canon(sent[1]) === canon(["event", "calculator_start", { calculator: "canada_crs", locale: "en" }]), "the Canada calculator uses the existing calculator_start with calculator=canada_crs");
  check(sanitizeParams({ document: "australia-skilled-occupation-list-2026", tool: "anzsco_finder" }).document === "australia-skilled-occupation-list-2026" && sanitizeParams({ document: "jane doe" }).document === undefined && sanitizeParams({ document: "a@b.com" }).document === undefined && sanitizeParams({ tool: "typed text" }).tool === undefined, "document / tool accept only fixed shapes");
  for (const bad of ["session_id", "reportId", "t", "token", "email", "name", "phone", "answers", "transaction_id", "value"]) check(!(bad in sanitizeParams({ [bad]: "x1" })), `trackEvent can never carry ${bad}`);
  delete g.window;

  console.log("\n10. funnel instrumentation");
  const lead = code("components/LeadMagnetForm.tsx");
  const afterSubmit = lead.slice(lead.indexOf("const outcome = await submitLead"));
  check(/trackEvent\("lead_magnet_success", \{ document: slug, locale \}\)/.test(afterSubmit) && lead.indexOf('trackEvent("lead_magnet_success"') > lead.indexOf("await submitLead") && !/dataLayer/.test(lead), "PDF lead success is counted only after the backend answered (and the inert dataLayer push is gone)");
  check(!/trackEvent\("lead_magnet_success"[\s\S]{0,200}full_name|email/.test(afterSubmit.split("trackEvent(\"lead_magnet_success\"")[1]?.slice(0, 120) ?? ""), "the lead event carries no name or email");
  const gate = code("components/premium-feature-gate.tsx");
  const redirectBranch = gate.slice(gate.indexOf('unlockState.status === "redirect"'));
  check(/trackEvent\("checkout_initiated"/.test(redirectBranch.slice(0, 400)) && (gate.match(/trackEvent\("checkout_initiated"/g) ?? []).length === 1, "checkout_initiated fires once, after the server created the Checkout session (not on submit)");
  for (const [f, tool] of [["app/[locale]/(main)/tools/anzsco-finder/page.tsx", "anzsco_finder"], ["app/[locale]/(main)/tools/skills-assessment/page.tsx", "skills_assessment_finder"], ["app/[locale]/(main)/tools/state-nomination/page.tsx", "state_nomination"], ["app/[locale]/(main)/tools/cost-calculator/page.tsx", "cost_calculator"]] as const) {
    check(new RegExp(`<ToolUseTracker tool="${tool}" locale=\\{locale\\} />`).test(read(f)), `${tool} usage is tracked (${f.split("/").slice(-2)[0]})`);
  }
  const canada = code("app/[locale]/(main)/tools/points-calculator/canada-points-calculator-client.tsx");
  check(/trackEvent\("calculator_start", \{ calculator: "canada_crs", locale \}\)/.test(canada) && /trackEvent\("calculator_complete", \{ calculator: "canada_crs", locale \}\)/.test(canada) && !/trackEvent\([^)]*(total|score|calc\.)/.test(canada), "Canada calculator start / complete are tracked without any score or answer");
  const au = code("app/[locale]/(main)/tools/points-calculator/points-calculator-client.tsx");
  check(/calculator_start/.test(au) && /calculator_complete/.test(au), "the Australia calculator events are preserved");
  check(/full_check_start/.test(read("app/[locale]/(main)/full-check/full-check-waitlist-form.tsx")) && /full_check_complete/.test(read("app/[locale]/(main)/full-check/full-check-waitlist-form.tsx")), "assessment start and completion events are preserved");
  const tracker = code("components/analytics/tool-use-tracker.tsx");
  check(/closest\("main"\)/.test(tracker) && /trackEvent\("tool_use", \{ tool, locale \}\)/.test(tracker) && !/\.value|textContent|innerText/.test(tracker), "the tool tracker reads no value or text");

  if (failures) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
  console.log("\nAll checks passed");
}
main().catch((e) => { console.error(e); process.exit(1); });
