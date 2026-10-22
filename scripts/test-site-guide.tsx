/**
 * The LogiVisa Guide (lib/site-guide, components/site-guide): launcher, delayed prompt, 7-day dismissal cap, route gating, page-aware suggestions,
 * Australia / Canada separation, exact routes, AI Assistant fallback, compliance wording and analytics privacy.
 *
 *   npx tsx scripts/test-site-guide.tsx
 */
import { existsSync, readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { guideEventParams } from "../lib/site-guide/analytics";
import { matchIntent, isBoundaryQuestion } from "../lib/site-guide/intent-map";
import { isHiddenPath, resolvePageContext, stripLocale } from "../lib/site-guide/page-context";
import { AI_ASSISTANT_PATH, COMPARISON_PAIRS, DESTINATIONS, destinationsFor } from "../lib/site-guide/route-registry";
import { SHORT_ANSWERS } from "../lib/site-guide/short-answers";
import { aiAssistantHref, assessmentLink, buildResponse, contextSuggestions, fallbackText, quickActions } from "../lib/site-guide/response-builder";
import { DISMISS_DAYS, NUDGE_DELAY_MS, NUDGE_SCROLL_RATIO, dismissUntil, nudgeSuppressed, shouldNudge } from "../lib/site-guide/timing";
import { GuideLauncherView, GuideScopeRow } from "../components/site-guide/site-guide-views";
import { sanitizeParams } from "../lib/analytics/events";
import { RESEARCH_GUIDE_SLUGS } from "../lib/guides/slugs";
import { PAIRS } from "../lib/visas/pair-comparison";
import type { GuideCountry, GuideLink } from "../lib/site-guide/types";

let failures = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  if (cond) console.log(`  ✅ ${msg}`);
  else { failures++; console.error(`  ❌ ${msg}${detail ? ` -- ${detail}` : ""}`); }
};

const LOCALES = ["en", "tr", "zh-Hans"] as const;
const MAIN = "app/[locale]/(main)";
const VISA_SLUGS = (readFileSync(`${MAIN}/visas/[subclass]/page.tsx`, "utf8").match(/const VISA_SUBCLASSES = \[([^\]]+)\]/)?.[1] ?? "").match(/"([^"]+)"/g)?.map((s) => s.replace(/"/g, "")) ?? [];

function pageExists(path: string): boolean {
  if (path === "/ai-assistant") return existsSync("app/[locale]/ai-assistant/page.tsx");
  const g = path.match(/^\/guides\/(.+)$/);
  if (g) return RESEARCH_GUIDE_SLUGS.includes(g[1]);
  const v = path.match(/^\/visas\/([^/]+)$/);
  if (v && !existsSync(`${MAIN}${path}/page.tsx`)) return VISA_SLUGS.includes(v[1]);
  const c = path.match(/^\/tools\/visa-comparison\/(.+)$/);
  if (c) return PAIRS.some((p) => p.slug === c[1]);
  return existsSync(`${MAIN}${path}/page.tsx`);
}

const linksText = (links: GuideLink[]) => links.map((l) => `${l.title} ${l.description} ${l.href}`).join(" ");
const AU_ONLY = /subclass|anzsco|skillselect|home affairs|\/visas\/\d|\/visas\/australia|skills-assessment|state-nomination|anzsco-finder|points-calculator\/australia|visa-comparison|\/guides|\/occupations|australia/i;
const CA_ONLY = /canad|express entry|ircc|\bcrs\b|\bnoc\b|atlantic|provincial/i;

async function main() {
  console.log("\n1. every destination is an existing live route");
  for (const d of DESTINATIONS) check(pageExists(d.path), `${d.id}: ${d.path} exists`);
  check(pageExists(AI_ASSISTANT_PATH), "the full AI Assistant route exists");
  check(JSON.stringify(COMPARISON_PAIRS) === JSON.stringify(PAIRS.map((p) => ({ slug: p.slug, a: p.a, b: p.b }))), "the comparison pairs match the published pair pages");
  check(new Set(DESTINATIONS.map((d) => d.id)).size === DESTINATIONS.length, "destination ids are unique");

  console.log("\n2. the launcher renders; the prompt is separate and non-blocking");
  const base = { locale: "en", open: false, showNudge: false, onOpen: () => {}, onDismissNudge: () => {}, panelId: "site-guide-test" };
  const plain = renderToStaticMarkup(createElement(GuideLauncherView, base));
  check(/data-site-guide-button/.test(plain) && /LogiVisa Guide/.test(plain) && /aria-label="Open the LogiVisa Guide"/.test(plain), "the launcher renders with its label and aria-label");
  check(!/AI Assistant/i.test(plain), "it is not called an AI Assistant");
  check(/fixed right-4/.test(plain) && /safe-area-inset-bottom/.test(plain) && /sm:right-6/.test(plain), "it sits bottom right and respects the mobile safe area");
  check(!/data-site-guide-nudge/.test(plain), "no prompt is shown at first");
  const nudged = renderToStaticMarkup(createElement(GuideLauncherView, { ...base, showNudge: true }));
  check(/data-site-guide-nudge/.test(nudged) && /Need help finding the right research tool\?/.test(nudged) && /role="status"/.test(nudged), "the prompt reads 'Need help finding the right research tool?' and is a non-modal status");
  check(/aria-label="Dismiss this prompt"/.test(nudged), "the prompt can be dismissed");
  check(!/role="dialog"|aria-modal="true"/.test(nudged), "the prompt is not a modal");
  for (const loc of ["tr", "zh-Hans"] as const) {
    const m = renderToStaticMarkup(createElement(GuideLauncherView, { ...base, locale: loc, showNudge: true }));
    check(!/Need help finding/.test(m) && !/LogiVisa Guide/.test(m), `${loc}: launcher and prompt are in the page language`);
  }

  console.log("\n3. delayed prompt (13 s or 35% scroll, whichever first) and the 7-day dismissal cap");
  const idle = { hidden: false, suppressed: false, elapsedMs: 0, scrollRatio: 0, panelOpen: false, alreadyShown: false };
  check(NUDGE_DELAY_MS >= 12_000 && NUDGE_DELAY_MS <= 15_000 && NUDGE_SCROLL_RATIO === 0.35, "the thresholds are about 13 seconds and 35% scroll");
  check(!shouldNudge({ ...idle, elapsedMs: 5000, scrollRatio: 0.1 }), "no prompt before the delay");
  check(shouldNudge({ ...idle, elapsedMs: NUDGE_DELAY_MS }), "the prompt shows after the delay");
  check(shouldNudge({ ...idle, elapsedMs: 3000, scrollRatio: 0.36 }), "the prompt shows at 35% scroll, whichever comes first");
  check(!shouldNudge({ ...idle, elapsedMs: 99_000, alreadyShown: true }), "once per page");
  check(!shouldNudge({ ...idle, elapsedMs: 99_000, panelOpen: true }), "never while the panel is open");
  const now = Date.UTC(2026, 9, 21);
  check(dismissUntil(now) - now === DISMISS_DAYS * 86_400_000 && DISMISS_DAYS === 7, "a dismissal lasts 7 days");
  check(nudgeSuppressed(dismissUntil(now), now + 6 * 86_400_000), "within 7 days of a dismissal the prompt is suppressed");
  check(!nudgeSuppressed(dismissUntil(now), now + 8 * 86_400_000), "after 7 days it can show again");
  check(!nudgeSuppressed(null, now) && !nudgeSuppressed("garbage", now), "with nothing (or junk) stored it is not suppressed");
  check(!shouldNudge({ ...idle, elapsedMs: 99_000, suppressed: nudgeSuppressed(dismissUntil(now), now + 1000) }), "a dismissed visitor is not nudged on the next page");

  console.log("\n4. no launcher or prompt on transactional, private or account routes");
  for (const p of ["/checkout", "/checkout/success", "/full-check", "/full-check/result", "/en/full-check/result", "/tr/full-check", "/reports/abc", "/zh-Hans/reports/abc/pdf", "/dashboard", "/admin", "/admin-tools/x", "/sign-in", "/register", "/ai-assistant", "/assistant", "/journey", "/pricing"]) {
    check(isHiddenPath(p) && resolvePageContext(p).hidden, `${p} is hidden`);
  }
  check(!shouldNudge({ ...idle, hidden: true, elapsedMs: 99_000, scrollRatio: 1 }), "a hidden route is never nudged");
  for (const p of ["/", "/tr", "/occupations/261313-software-engineer", "/visas/189", "/tools/visa-comparison", "/guides/chef-vs-cook-australia", "/visas/canada"]) check(!resolvePageContext(p).hidden, `${p} shows the guide`);
  check(stripLocale("/zh-Hans/visas/190") === "/visas/190" && stripLocale("/tr") === "/", "locale prefixes are stripped");

  console.log("\n5. page-aware context");
  const occ = resolvePageContext("/occupations/261313-software-engineer");
  check(occ.pageType === "occupation" && occ.country === "AU" && occ.occupationCode === "261313", "an occupation page is Australian and carries its code");
  const occSug = contextSuggestions(occ, "en");
  check(occSug.some((s) => s.href === "/tools/skills-assessment?q=261313") && occSug.some((s) => s.href === "/tools/anzsco-finder?q=261313") && occSug.some((s) => s.id === "au-guides-hub") && occSug.some((s) => s.id === "assessment"), "an occupation page offers the Skills Assessment Finder and ANZSCO details for its code, guides, visa research and the Assessment");
  const v189 = contextSuggestions(resolvePageContext("/visas/189"), "en");
  check(v189.some((s) => s.href === "/tools/visa-comparison/189-vs-190") && v189.some((s) => s.id === "au-points-calculator") && v189.some((s) => s.id === "assessment"), "visa 189: its comparison page, the points calculator and the Assessment");
  const v482 = contextSuggestions(resolvePageContext("/visas/482"), "en");
  check(!v482.some((s) => s.id === "au-points-calculator") && v482.some((s) => s.href === "/tools/visa-comparison/482-vs-186"), "visa 482 (no points test): comparison yes, points calculator no");
  const gde = contextSuggestions(resolvePageContext("/guides/chef-vs-cook-australia"), "en");
  check(gde.some((s) => s.id === "au-anzsco-finder") && gde.some((s) => s.id === "au-skills-assessment"), "a guide offers the related occupation and tool links");
  check(contextSuggestions(resolvePageContext("/"), "en").length === 0 && resolvePageContext("/").country === null, "the home page is country-neutral: no suggestions until a country is chosen");

  console.log("\n6. Australia / Canada separation");
  const caPages = ["/visas/canada", "/visas/canada-pnp-non-express-entry", "/visas/atlantic-immigration-program", "/visas/canada-family-sponsorship", "/tools/points-calculator/canada", "/tr/visas/canada"];
  for (const p of caPages) check(resolvePageContext(p).country === "CA", `${p} is a Canada page`);
  for (const p of ["/visas/189", "/occupations/261313", "/tools/state-nomination", "/guides/tra-msa-vs-osap", "/visas/australia"]) check(resolvePageContext(p).country === "AU", `${p} is an Australia page`);
  const QUERIES = ["where do I check my points", "I want to compare 189 and 190", "how do I find the assessing authority", "I'm researching Canada Express Entry", "I'm a software engineer", "I'm a chef", "state nomination", "fees", "documents", "family sponsorship", "provincial nominee", "what is the weather", "skills assessment", "express entry points", "subclass 491"];
  for (const loc of LOCALES) {
    for (const country of ["AU", "CA"] as GuideCountry[]) {
      const lock = true;
      const all: GuideLink[] = [...quickActions(country, loc), ...contextSuggestions({ hidden: false, pageType: country === "CA" ? "canada" : "visa", country }, loc)];
      for (const q of QUERIES) all.push(...buildResponse(q, country, loc, lock).links);
      all.push(assessmentLink(loc, country));
      const wrong = all.filter((x) => x.country !== country && x.country !== "ANY");
      check(wrong.length === 0, `${loc} ${country}: every link belongs to ${country} or is country-neutral`, wrong.map((w) => w.id).join(","));
      const text = linksText(all.filter((x) => x.country !== "ANY"));
      check(country === "CA" ? !AU_ONLY.test(text) : !CA_ONLY.test(text), `${loc} ${country}: no ${country === "CA" ? "Australian" : "Canadian"} wording in titles, descriptions or paths`);
    }
  }
  check(destinationsFor("CA").every((d) => d.country !== "AU") && destinationsFor("AU").every((d) => d.country !== "CA"), "the registry never offers one country's pages in the other");
  const onCa = buildResponse("compare 189 and 190", "CA", "en", true);
  check(!onCa.links.some((x) => x.country === "AU") && onCa.kind === "fallback", "on a Canada page a typed Australian request does not switch to Australian pages");
  const onNeutral = buildResponse("compare 189 and 190", null, "en", false);
  check(onNeutral.links[0]?.href === "/tools/visa-comparison/189-vs-190", "on a neutral page an explicit Australian request is honoured");
  const neutral = buildResponse("where do I check my points", null, "en");
  check(neutral.kind === "choose-country" && neutral.links.length === 0, "a country-ambiguous question on a neutral page asks Australia or Canada first");

  console.log("\n7. exact routes for known intents");
  const ids = (q: string, c: GuideCountry | null, loc = "en") => buildResponse(q, c, loc, c !== null).links.map((x) => x.id);
  check(buildResponse("I want to compare 189 and 190", "AU", "en").links[0]?.href === "/tools/visa-comparison/189-vs-190", "'compare 189 and 190' -> the 189-vs-190 comparison page");
  check(buildResponse("490 vs 189", "AU", "en").links[0]?.href !== "/tools/visa-comparison/189-vs-190", "a pair that has no page does not get a wrong one");
  check(buildResponse("compare 482 and 189", "AU", "en").links[0]?.href === "/tools/visa-comparison", "a pair without its own page goes to the comparison hub");
  check(ids("Where do I check my points?", "AU")[0] === "au-points-calculator", "points (Australia) -> the Australia points calculator");
  check(ids("Where do I check my points?", "CA")[0] === "ca-points-calculator", "points (Canada) -> the Canada CRS calculator");
  check(ids("How do I find the assessing authority?", null)[0] === "au-skills-assessment", "assessing authority -> the Skills Assessment Finder");
  check(ids("I'm researching Canada Express Entry", null)[0] === "ca-visas-hub", "'I'm researching Canada Express Entry' -> Canada research");
  check(ids("state nomination", "AU")[0] === "au-state-nomination", "state nomination -> state nomination research");
  check(ids("tell me about subclass 491", "AU").includes("au-visa-491"), "a subclass number -> its visa page");
  check(buildResponse("compare 189 and 190", "AU", "tr").links[0]?.href === "/tr/tools/visa-comparison/189-vs-190", "the Turkish locale links the prefixed route");
  check(buildResponse("compare 189 and 190", "AU", "zh-Hans").links[0]?.href === "/zh-Hans/tools/visa-comparison/189-vs-190", "the Chinese locale links the prefixed route");
  const guideTr = buildResponse("I'm a chef", "AU", "tr").links.find((x) => x.id === "au-guide-chef-vs-cook");
  check(guideTr?.href === "/guides/chef-vs-cook-australia" && guideTr.englishOnly, "English-only guides are linked without a locale prefix");
  const chef = buildResponse("I'm a chef.", "AU", "en");
  check(chef.kind === "routes" && chef.links.some((x) => x.id === "au-guide-chef-vs-cook") && chef.links.some((x) => x.href === "/tools/anzsco-finder?q=chef") && chef.links.some((x) => x.href === "/tools/skills-assessment?q=chef") && chef.assessment, "'I'm a chef' -> the Chef vs Cook guide, the occupation finder, skills-assessment information and the Assessment");
  check(!/\b(correct|right|suitable|best|qualif|eligible)\b/i.test(chef.message), "it does not say whether Chef is the right occupation");
  const dev = buildResponse("I'm a software engineer", "AU", "en");
  check(dev.links.some((x) => x.id === "au-guide-developer-vs-software-engineer") && dev.links.some((x) => x.href === "/tools/anzsco-finder?q=software%20engineer"), "'I'm a software engineer' -> the Developer Programmer vs Software Engineer guide and the occupation finder");
  const asm = buildResponse("I'm a chef", "AU", "en").links;
  check(asm.filter((x) => x.id === "assessment").length === 0, "the Assessment CTA is shown as a separate prompt, not forced into every list");
  check(buildResponse("how do I compare visas", "AU", "en").assessment === false, "the Assessment is not forced into every response");
  check(assessmentLink("en", "CA").href === "/full-check?country=CA" && assessmentLink("tr", "AU").href === "/tr/full-check?country=AU" && assessmentLink("en", null).href === "/full-check", "the Assessment link carries the country");

  console.log("\n8. unknown requests fall back to the full AI Assistant");
  for (const q of ["what is the weather today", "tell me a joke", "xyzzy", "my cousin lives in Perth and likes surfing"]) {
    const r = buildResponse(q, "AU", "en", true);
    check(r.kind === "fallback" && r.handoff && r.links.length >= 1 && r.links.length <= 3 && r.message === fallbackText("en"), `'${q}' -> the unknown-input message, Browse topics and the AI Assistant handoff`);
  }
  check(fallbackText("en") === "I couldn’t confidently match that to a LogiVisa research topic.", "the unknown-input message uses the specified wording");
  check(aiAssistantHref("en") === "/ai-assistant" && aiAssistantHref("tr") === "/tr/ai-assistant", "the handoff links the full AI Assistant");
  check(matchIntent("", "AU").kind === "none", "an empty question routes nowhere");

  console.log("\n9. no eligibility verdict, recommendation, ranking or prediction");
  const BANNED = /you qualify|you are eligible|you may be eligible|better for you|best for you|you should (apply|choose|pick)|strong chance|good chance|likely (to be )?invited|best (visa|pathway|option|route)|better (visa|pathway|option)|we recommend|recommended (visa|pathway|option)|your chances|will (be )?invited|you will (get|receive|be granted)|target score|maximi[sz]e your points|improve your chances/i;
  const texts: string[] = [];
  for (const d of DESTINATIONS) texts.push(d.title.en, d.title.tr, d.title["zh-Hans"], d.description.en, d.description.tr, d.description["zh-Hans"]);
  for (const loc of LOCALES) for (const c of ["AU", "CA", null] as Array<GuideCountry | null>) for (const q of [...QUERIES, "do I qualify for 190", "which visa is best for me", "should I apply for 491", "what are my chances"]) { const r = buildResponse(q, c, loc); texts.push(r.message, linksText(r.links)); }
  const bad = texts.filter((x) => BANNED.test(x));
  check(bad.length === 0, "no verdict, recommendation, ranking or prediction wording in any registry text or response", bad.slice(0, 2).join(" | "));
  const panel = readFileSync("components/site-guide/site-guide-panel.tsx", "utf8") + readFileSync("components/site-guide/site-guide-views.tsx", "utf8");
  check(!BANNED.test(panel), "none in the panel or launcher text");
  for (const q of ["Do I qualify for 190?", "which visa is best for me", "should I apply for 491", "what are my chances of getting invited", "Is 491 better for me than 190", "am I eligible"]) {
    const r = buildResponse(q, "AU", "en");
    check(isBoundaryQuestion(q) && r.kind === "boundary" && /can’t determine which visa is suitable for you here/.test(r.message), `'${q}' -> the neutral boundary message`);
    check(!r.links.some((x) => x.category === "visa"), `'${q}' -> no individual visa page is pushed`);
  }
  check(!isBoundaryQuestion("I want to compare 189 and 190") && !isBoundaryQuestion("where do I check my points"), "ordinary navigation questions are not treated as verdict requests");
  check(/Navigation help only/.test(panel) && /not migration advice, an eligibility decision or a recommendation/.test(panel), "the panel states it is navigation help, not advice");

  console.log("\n10. analytics: a fixed vocabulary, never typed text");
  const p = guideEventParams({ sourcePageType: "occupation", destinationId: "au-skills-assessment", destinationType: "skills-assessment", country: "AU", interaction: "quick_action" });
  const sortedJson = (o: Record<string, string>) => JSON.stringify(Object.entries(o).sort());
  check(sortedJson(sanitizeParams(p) as Record<string, string>) === sortedJson({ source_page_type: "occupation", destination_slug: "au-skills-assessment", destination_type: "skills-assessment", country: "AU", interaction_type: "quick_action" }), "a route event carries exactly page type, destination slug and type, country and interaction");
  check(Object.keys(guideEventParams({ sourcePageType: "home" })).join() === "source_page_type", "an event with nothing else sends only the page type");
  const leak = sanitizeParams({ ...p, destination_slug: "my name is Jane Citizen", interaction_type: "I'm a chef", free_text: "I'm a chef", email: "a@b.co", country: "Australia" });
  check(!("destination_slug" in leak) && !("interaction_type" in leak) && !("free_text" in leak) && !("email" in leak) && !("country" in leak), "typed text, emails and unknown values are dropped by the allow-list");
  check(/trackGuideEvent\("site_guide_quick_action", undefined, "free_text"|interaction: "free_text"|"free_text"/.test(panel) || /free_text/.test(panel), "a typed question is counted as an interaction type only");
  const panelSrc = readFileSync("components/site-guide/site-guide-panel.tsx", "utf8");
  const trackCalls = panelSrc.match(/track\([^)]*\)/g) ?? [];
  check(trackCalls.length >= 5 && trackCalls.every((c) => !/\b(text|value|pending|input)\b/.test(c)), "no track call in the panel passes the typed text");
  check(!/localStorage|sessionStorage|document\.cookie|fetch\(|sendBeacon/.test(panelSrc), "the panel stores and sends nothing");
  const analyticsSrc = readFileSync("lib/site-guide/analytics.ts", "utf8");
  check(!/text|query|message/i.test(analyticsSrc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "").replace(/Typed text never reaches this module\./, "")), "the analytics module has no free-text field");
  for (const e of ["site_guide_impression", "site_guide_open", "site_guide_quick_action", "site_guide_route_click", "site_guide_ai_assistant_handoff", "site_guide_dismiss"]) {
    check(readFileSync("lib/analytics/events.ts", "utf8").includes(`"${e}"`), `${e} is a known event`);
  }

  console.log("\n11. accessibility, performance and privacy of the code");
  const launcher = readFileSync("components/site-guide/site-guide.tsx", "utf8");
  check(/dynamic\(\(\) => import\("\.\/site-guide-panel"\)/.test(launcher) && !/LogiAIAssistant|assistant-client/.test(launcher + panelSrc), "the panel is lazy-loaded and the full AI Assistant bundle is not imported");
  check(/requestIdleCallback/.test(launcher) && /addEventListener\("load"/.test(launcher), "the launcher mounts after load and idle");
  check(/key === "Escape"/.test(panelSrc) && /role="dialog"/.test(panelSrc) && /aria-modal="false"/.test(panelSrc) && /aria-labelledby/.test(panelSrc), "Escape closes the panel; it is a labelled, non-modal dialog (no keyboard trap)");
  check(/buttonRef\.current\?\.focus\(\)/.test(launcher), "closing returns focus to the launcher");
  check(/focus-visible:outline/.test(panelSrc) && /focus-visible:outline/.test(readFileSync("components/site-guide/site-guide-views.tsx", "utf8")), "visible focus states");
  check(/min-h-11/.test(panelSrc) && /size-11/.test(panelSrc), "tap targets are at least 44px");
  check(/motion-safe:/.test(readFileSync("components/site-guide/site-guide-views.tsx", "utf8")) && !/animate-(bounce|pulse|spin)/.test(panelSrc + readFileSync("components/site-guide/site-guide-views.tsx", "utf8")), "no animation outside motion-safe");
  check(/<SiteGuide locale=\{locale\} \/>/.test(readFileSync(`${MAIN}/layout.tsx`, "utf8")), "the guide is mounted in the site layout");
  check(!/name="(fullName|email|passport|dob)|type="email"|type="file"/.test(panelSrc), "the panel asks for no name, email, passport, date of birth or upload");
  check(/maxLength=\{120\}/.test(panelSrc), "the question box is short");
  check(readFileSync("components/LogiAIAssistant.tsx", "utf8").length > 0 && !/site-guide/.test(readFileSync("components/LogiAIAssistant.tsx", "utf8")), "the existing AI Assistant is not modified");

  console.log("\n12. 'engineer' alone does not route to Engineers Australia (ICT titles are not engineering-profession intents)");
  const ENG = "au-guide-engineers-australia";
  const has = (q: string) => buildResponse(q, "AU", "en", true).links.some((x) => x.id === ENG);
  for (const q of ["software engineer", "I'm a software engineer", "developer programmer", "I'm a developer programmer", "software developer", "I work as a software engineer", "ICT business analyst", "data engineer", "I'm an engineer"]) check(!has(q), `'${q}' does not return Engineers Australia`);
  check(buildResponse("I'm a software engineer", "AU", "en").links.some((x) => x.id === "au-guide-developer-vs-software-engineer") && buildResponse("developer programmer", "AU", "en").links.some((x) => x.id === "au-guide-developer-vs-software-engineer"), "software and developer / programmer intents return the ICT guide");
  const swLinks = buildResponse("I'm a software engineer", "AU", "en").links.map((x) => x.href);
  check(swLinks.includes("/tools/anzsco-finder?q=software%20engineer") && swLinks.includes("/tools/skills-assessment?q=software%20engineer"), "software engineer: the ANZSCO finder and the Skills Assessment Finder (where ACS information is held)");
  check(buildResponse("I'm a software engineer", "AU", "en").assessment, "software engineer: the Assessment is offered");
  for (const q of ["civil engineer", "I'm a civil engineer", "mechanical engineer", "I'm a mechanical engineer", "electrical engineer", "structural engineer", "Engineers Australia CDR", "what is a CDR"]) check(has(q), `'${q}' may return Engineers Australia`);
  check(!has("software engineering degree") && !has("engineering"), "the bare words 'engineering' and 'software engineering' do not either");
  const reg = DESTINATIONS.find((d) => d.id === ENG)!;
  check(!reg.keywords.some((k) => /^(engineer|engineers|engineering|mühendis|工程师)$/.test(k)), "the registry holds no bare 'engineer' keyword for it (specific professions only)");

  console.log("\n13. the active country is visible once established");
  const scopeAu = renderToStaticMarkup(createElement(GuideScopeRow, { locale: "en", country: "AU" }));
  check(/data-site-guide-scope="AU"/.test(scopeAu) && /Researching:/.test(scopeAu) && /Australia/.test(scopeAu) && !/Change/.test(scopeAu), "a page-defined country is shown without a Change control");
  const scopeCa = renderToStaticMarkup(createElement(GuideScopeRow, { locale: "en", country: "CA", onChange: () => {} }));
  check(/data-site-guide-scope="CA"/.test(scopeCa) && /Researching:/.test(scopeCa) && /Canada/.test(scopeCa) && />Change</.test(scopeCa) && /aria-label="Change the country"/.test(scopeCa), "a chosen country is shown as 'Researching: Canada · Change'");
  const trCa = renderToStaticMarkup(createElement(GuideScopeRow, { locale: "tr", country: "CA", onChange: () => {} }));
  const zhAu = renderToStaticMarkup(createElement(GuideScopeRow, { locale: "zh-Hans", country: "AU", onChange: () => {} }));
  check(/Araştırılan:/.test(trCa) && /Kanada/.test(trCa) && /Değiştir/.test(trCa) && !/Researching|Canada|Change/.test(trCa), "tr: localised label, country and Change");
  check(/正在研究：/.test(zhAu) && /澳大利亚/.test(zhAu) && /更改/.test(zhAu) && !/Researching|Australia|Change/.test(zhAu), "zh-Hans: localised label, country and Change");
  const panelSrc2 = readFileSync("components/site-guide/site-guide-panel.tsx", "utf8");
  check(/\{scope \? <GuideScopeRow/.test(panelSrc2), "the row is rendered only when a country is established");
  check(/onChange=\{context\.country === null \? changeCountry : undefined\}/.test(panelSrc2), "Change is offered only when the country was chosen in the panel, not when the page defines it");
  check(/const changeCountry = \(\) => \{\s*setScope\(null\);\s*setTurns\(\[\]\);/.test(panelSrc2), "Change clears the sticky country and the recent answers (back to the country choice)");
  check(/if \(r\.country && r\.country !== scope && r\.kind !== "boundary"\) setScope\(r\.country\);/.test(panelSrc2), "an explicit country mention still sets the sticky country (behaviour kept)");
  check(/useState<GuideCountry \| null>\(context\.country\)/.test(panelSrc2) && !/localStorage/.test(panelSrc2), "the panel's country starts from the page and is not stored: closing the panel resets it");

  console.log("\n14. short conversational answers (keyword-style input)");
  const words = (m: string) => m.trim().split(/\s+/).length;
  const short = (q: string, c: GuideCountry | null = null, loc = "en") => buildResponse(q, c, loc, false);
  const hrefs = (q: string, c: GuideCountry | null = null) => short(q, c).links.map((x) => x.href);
  const VERDICT = /you qualify|you are eligible|you may be eligible|best for you|you should|your chances|we recommend/i;
  const cases: Array<[string, GuideCountry | null, (r: ReturnType<typeof short>) => boolean, string]> = [
    ["190", null, (r) => /^Subclass 190 is a permanent skilled visa that requires nomination by an Australian state or territory\. It is points-tested and requires an invitation to apply\.$/.test(r.message) && r.links.map((x) => x.href).join() === "/visas/190,/tools/visa-comparison/189-vs-190,/tools/points-calculator/australia", "190 -> description, subclass 190, 189 vs 190, points"],
    ["subclass 190", null, (r) => r.message === short("190").message, "subclass 190 = 190"],
    ["skilled nominated", null, (r) => r.message === short("190").message, "skilled nominated = 190"],
    ["what is 190?", null, (r) => r.message === short("190").message, "'what is 190?' = 190"],
    ["visa", null, (r) => r.links.map((x) => x.href).join() === "/visas/australia,/visas/canada,/tools/visa-comparison", "visa -> Australia visas, Canada visas, Compare visas"],
    ["points", null, (r) => r.kind === "choose-country" && r.message === "Are you researching Australia or Canada?", "points (no country) -> one short country question"],
    ["points", "AU", (r) => r.links.length === 2 && r.links[0].href === "/tools/points-calculator/australia", "points (Australia) -> only Australia"],
    ["points", "CA", (r) => r.links.length === 1 && r.links[0].href === "/tools/points-calculator/canada", "points (Canada) -> only Canada"],
    ["software engineer", null, (r) => /ANZSCO 261313/.test(r.message) && r.links[0].href === "/occupations/261313-software-engineer" && r.links[1].href === "/tools/skills-assessment?q=261313", "software engineer -> ANZSCO 261313, occupation, Skills Assessment Finder"],
    ["261313", null, (r) => /ANZSCO 261313/.test(r.message), "261313 = software engineer"],
    ["software developer", null, (r) => /ANZSCO 261313/.test(r.message), "software developer = software engineer"],
    ["chef", null, (r) => r.message === "LogiVisa has occupation and skills-assessment research for Chef." && r.links.map((x) => x.id).join() === "au-occupations,au-skills-assessment,au-guide-chef-vs-cook", "chef -> occupation, Skills Assessment Finder, Chef vs Cook guide"],
    ["skills assessment", null, (r) => r.links[0].href === "/tools/skills-assessment" && r.country === "AU", "skills assessment -> the Skills Assessment Finder"],
    ["Canada", null, (r) => r.links.map((x) => x.href).join() === "/visas/canada,/tools/points-calculator/canada,/visas/canada-pnp-non-express-entry" && r.country === "CA", "Canada -> Canada research, CRS calculator, PNP"],
    ["Express Entry", null, (r) => r.links[0].href === "/visas/canada" && r.links[1].href === "/tools/points-calculator/canada", "Express Entry -> Canada research and the CRS calculator"],
    ["PNP", null, (r) => r.links[0].href === "/visas/canada-pnp-non-express-entry", "PNP -> PNP research"],
    ["189 vs 190", null, (r) => r.links[0].href === "/tools/visa-comparison/189-vs-190", "189 vs 190 -> the comparison page"],
  ];
  for (const [q, c, ok, label] of cases) {
    const r = short(q, c);
    check(ok(r), label);
    if (r.kind !== "choose-country") check(words(r.message) <= 40 && r.links.length >= 1 && r.links.length <= 4, `'${q}': answer is short (${words(r.message)} words) with ${r.links.length} route(s)`);
    check(!VERDICT.test(r.message), `'${q}': no eligibility verdict`);
  }
  check(short("190").handoff && short("Canada").handoff, "recognised answers allow the AI Assistant handoff");
  for (const q of ["do I qualify for 190", "what are my chances", "best visa for me", "which visa", "should I apply"]) {
    const r = short(q, "AU");
    check(r.kind === "boundary" && r.assessment && /can’t determine which visa is suitable for you here/.test(r.message) && r.links.length >= 1 && !r.links.some((x) => x.category === "visa"), `'${q}' -> the brief boundary answer, requirements link and Start Assessment`);
  }
  const noCountryBoundary = short("do I qualify for 190", null);
  check(noCountryBoundary.links.map((x) => x.href).join() === "/visas/australia,/visas/canada", "a boundary answer without a country offers both research hubs");
  const unknown = short("random unsupported input");
  check(unknown.kind === "fallback" && unknown.handoff && /couldn’t confidently match/.test(unknown.message) && unknown.links.length >= 1, "unsupported input -> never silent: unknown message, Browse topics, AI Assistant");
  check(short("xyzzy", "CA").links[0].href === "/visas/canada", "unknown input on a Canada page browses Canada only");
  check(buildResponse("190", "CA", "en", true).links.every((x) => x.country !== "AU"), "on a Canada page '190' does not switch to Australian pages");
  check(buildResponse("190", "AU", "tr", true).links[0].href === "/tr/visas/190" && buildResponse("190", "AU", "zh-Hans", true).links[0].href === "/zh-Hans/visas/190", "short answers keep the locale prefix");
  check(!VERDICT.test(Object.values(short("190", null, "tr")).join(" ")), "Turkish short answers carry no verdict wording");
  for (const e of SHORT_ANSWERS) for (const lc of LOCALES) {
    check(e.message[lc].length > 10 && e.message[lc].length < 260, `${e.aliases[0]} (${e.country}) ${lc}: message present and short`);
    for (const sp of e.links) check(DESTINATIONS.some((d) => d.id === sp.id) && (!sp.path || pageExists(sp.path) || /^\/occupations\/\d{6}-[a-z-]+$/.test(sp.path)), `${e.aliases[0]} -> ${sp.id}${sp.path ?? ""} resolves`);
  }
  const panelSrc3 = readFileSync("components/site-guide/site-guide-panel.tsx", "utf8");
  check(/Ask LogiVisa Guide/.test(panelSrc3) && /Try “190”, “software engineer”, “Canada”, “points”…/.test(panelSrc3) && /send: \{ en: "Ask"/.test(panelSrc3), "the input is labelled 'Ask LogiVisa Guide' with the example placeholder and an Ask button");
  check(/e\.preventDefault\(\);\s*const value = text\.trim\(\);\s*if \(!value\) return;/.test(panelSrc3) && /setTurns\(\(prev\) => \[\.\.\.prev, \{ ask: value, answer: r \}\]\.slice\(-MAX_TURNS\)\)/.test(panelSrc3), "every non-empty submission adds a visible answer; only the last few are kept");
  check(/!conversation \|\| showQuick/.test(panelSrc3), "the quick-actions list collapses after the first question");
  check(!/Please enter a complete question/i.test(panelSrc3 + readFileSync("lib/site-guide/response-builder.ts", "utf8")), "the guide never asks for a complete question");

  if (failures) { console.error(`\n❌ ${failures} check(s) failed`); process.exit(1); }
  console.log("\n✅ ALL CHECKS PASSED");
}
main().catch((e) => { console.error(e); process.exit(1); });
