/**
 * Privacy Policy page (/privacy, /tr/privacy, /zh-Hans/privacy): the three locales say the same thing, nothing unverifiable slipped in, and the page is wired
 * into the footer, the Legal page, the sitemap and the forms. Database-free.
 *
 *   npx tsx scripts/test-privacy-page.ts
 */
import "./lib/stub-request-context";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildSitemap } from "../app/sitemap";
import { createSeenSet, ipFingerprint } from "../lib/privacy/ip";
import { isDryRun, RETENTION_RULES } from "../lib/retention/run";
import { PRIVACY_CONTACT_EMAIL, PRIVACY_COPY, PRIVACY_EFFECTIVE_DATE, type PrivacyBlock, type PrivacyCopy, type PrivacyLocale } from "../lib/privacy/content";

let failures = 0;
const t = (label: string, cond: boolean, detail = "") => {
  if (cond) console.log(`  ✅ ${label}`);
  else {
    failures++;
    console.error(`  ❌ ${label}${detail ? ` -- ${detail}` : ""}`);
  }
};

const root = join(__dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const locales: PrivacyLocale[] = ["en", "tr", "zh-Hans"];

const blockText = (b: PrivacyBlock): string => ("p" in b ? b.p : b.ul.join("\n"));
const sectionText = (c: PrivacyCopy, id: string) => (c.sections.find((s) => s.id === id)?.blocks ?? []).map(blockText).join("\n");
const allText = (c: PrivacyCopy) => [c.title, c.metaTitle, c.metaDescription, c.updatedLabel, ...c.sections.flatMap((s) => [s.title, ...s.blocks.map(blockText)])].join("\n");
const numbers = (s: string) => (s.match(/\d+/g) ?? []).sort().join(",");

console.log("structure: the same sections, in the same order, in all three languages");
const enIds = PRIVACY_COPY.en.sections.map((s) => s.id);
for (const l of ["tr", "zh-Hans"] as const) {
  const ids = PRIVACY_COPY[l].sections.map((s) => s.id).filter((id) => id !== "turkey");
  t(`${l}: same section ids as English (the Turkey section is Turkish-only)`, JSON.stringify(ids) === JSON.stringify(enIds), `${ids.join(",")} vs ${enIds.join(",")}`);
}
t("only Turkish has the Turkey section", PRIVACY_COPY.tr.sections.some((s) => s.id === "turkey") && !PRIVACY_COPY.en.sections.some((s) => s.id === "turkey") && !PRIVACY_COPY["zh-Hans"].sections.some((s) => s.id === "turkey"));
const required = ["who", "collect", "use", "share", "overseas", "agent", "cookies", "retention", "security", "rights", "complaints", "children", "changes"];
t("every required heading is present", required.every((id) => enIds.includes(id)));

console.log("the protected facts (contact address, providers, numbers, dates) are identical in every language");
for (const l of locales) {
  const c = PRIVACY_COPY[l];
  t(`${l}: contact address ${PRIVACY_CONTACT_EMAIL} appears in the contact and rights sections`, sectionText(c, "who").includes(PRIVACY_CONTACT_EMAIL) && sectionText(c, "rights").includes(PRIVACY_CONTACT_EMAIL));
  for (const name of ["Stripe", "Resend", "OpenAI", "Google", "Vercel", "Neon", "Cloudflare"]) t(`${l}: provider ${name} is named in "share"`, sectionText(c, "share").includes(name));
  t(`${l}: names the OAIC`, sectionText(c, "complaints").includes("OAIC") && sectionText(c, "complaints").includes("oaic.gov.au"));
  t(`${l}: names the Neon region`, sectionText(c, "overseas").includes("ap-southeast-2"));
  const datesOk = [c.updatedLabel, sectionText(c, "changes")].every((x) => x.includes("2026") && x.includes("6"));
  t(`${l}: the dates name the effective day (${PRIVACY_EFFECTIVE_DATE})`, datesOk, c.updatedLabel);
}
for (const id of required.filter((id) => id !== "changes")) {
  const base = numbers(sectionText(PRIVACY_COPY.en, id));
  for (const l of ["tr", "zh-Hans"] as const) t(`${l}/${id}: same numbers as English (${base || "none"})`, numbers(sectionText(PRIVACY_COPY[l], id)) === base, numbers(sectionText(PRIVACY_COPY[l], id)));
}
for (const word of ["lv_consent", "lv_report_session", "logivisa_ref", "_ga", "_gid", "_gat", "httpOnly"]) t(`cookie name ${word} is the same in all languages`, locales.every((l) => sectionText(PRIVACY_COPY[l], "cookies").includes(word)));

console.log("no unverifiable promises, no compliance claims, no placeholders");
const banned = [/\bMeta\b/, /Pixel/i, /_fbp|_fbc/, /\bTODO\b/i, /\bKVKK\b/i, /\bGDPR\b/i, /Privacy Act/i, /Gizlilik Yasas/i, /隐私法/, /tamamen anonim|tümüyle anonim/i, /完全匿名|彻底匿名/, /fully anonymous|completely anonymous/i, /\bsecure\b(?! link| token)/i];
for (const l of locales) {
  const text = allText(PRIVACY_COPY[l]);
  for (const re of banned) t(`${l}: does not contain ${re}`, !re.test(text), (text.match(re) ?? [""])[0]);
  t(`${l}: no legal-advice disclaimer sentence`, !/hukuki tavsiye değildir|not legal advice|不构成法律建议/i.test(text));
  t(`${l}: keeps the information-only sentence (no migration or legal advice)`, /(migration or legal advice|göç veya hukuki tavsiye|移民或法律建议)/i.test(sectionText(PRIVACY_COPY[l], "who")));
}

console.log("Turkish: every diacritic is written");
const tr = allText(PRIVACY_COPY.tr);
t("Turkish text uses ç ğ ı ö ş ü", ["ç", "ğ", "ı", "ö", "ş", "ü"].every((ch) => tr.includes(ch)));
t("no ASCII-stripped Turkish words", !/\b(icin|kullanici|disina|Politikasi|guvenlik|Guvenlik|sikayet|Sikayet|bilgilerinizi|tarayici|gonder\w*)\b/.test(tr.replace(/bilgilerinizi/g, "")), (tr.match(/\b(icin|kullanici|disina|Politikasi|guvenlik|sikayet|tarayici|gonder\w*)\b/i) ?? [""])[0]);

console.log("inline links resolve");
const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
for (const l of locales) {
  const links = [...allText(PRIVACY_COPY[l]).matchAll(linkRe)].map((m) => m[2]);
  t(`${l}: links are {legal} and the OAIC site only`, links.length === 2 && links.includes("{legal}") && links.includes("https://www.oaic.gov.au"), links.join(" "));
}

console.log("wiring");
const footer = read("components/landing/footer.tsx");
t("footer: the Privacy link goes to /privacy and Legal still goes to /legal", /label: isTr \? "Gizlilik" : isZh \? "隐私" : "Privacy",\s*href: publicPath\(locale, `\/privacy`\)/.test(footer) && /href: publicPath\(locale, `\/legal`\)/.test(footer));
t("legal page: links to the Privacy Policy and keeps the referral section", read("app/[locale]/(main)/legal/page.tsx").includes('"/privacy"') && read("app/[locale]/(main)/legal/page.tsx").includes("privacy-referral"));
const sitemap = buildSitemap().map((e) => e.url);
for (const url of ["https://www.logivisa.com/privacy", "https://www.logivisa.com/tr/privacy", "https://www.logivisa.com/zh-Hans/privacy"]) t(`sitemap lists ${url}`, sitemap.includes(url));
const entry = buildSitemap().find((e) => e.url === "https://www.logivisa.com/privacy");
t("sitemap entry has the hreflang set with x-default", Boolean(entry?.alternates?.languages && Object.keys(entry.alternates.languages).sort().join(",") === "en,tr,x-default,zh-Hans"));
const pageSource = read("app/[locale]/(main)/privacy/page.tsx");
t("page sets its own openGraph title and url", /openGraph:\s*{[\s\S]*title:[\s\S]*url: publicUrl\(locale, PRIVACY_PATH\)/.test(pageSource));
t("page sets canonical and hreflang through pageAlternates", pageSource.includes("pageAlternates(locale, PRIVACY_PATH)"));
for (const f of ["app/[locale]/(main)/full-check/full-check-waitlist-form.tsx", "app/[locale]/(main)/rehber/DownloadForm.tsx", "components/LeadMagnetForm.tsx", "components/stripe-checkout-button.tsx", "components/premium-feature-gate.tsx", "app/[locale]/pricing/pricing-plans.tsx"]) {
  t(`${f}: shows the privacy note`, read(f).includes("<PrivacyNotice"));
}
const notice = read("components/privacy-notice.tsx");
t("the note is a link in a new tab, not a checkbox", notice.includes('target="_blank"') && !/type="checkbox"|<input/.test(notice));
t("the footer shown on every non-home page links to /privacy", read("components/global-disclaimer-footer.tsx").includes('publicPath(language, "/privacy")'));
t("the consent banner links to /privacy", read("components/analytics/consent-banner.tsx").includes('publicPath(locale, "/privacy")'));

console.log("raw IP addresses are not stored; the stand-ins behave")
const fp = ipFingerprint("203.0.113.9", "secret-a");
t("fingerprint: 32 hex characters, stable, keyed, and never the address", /^[0-9a-f]{32}$/.test(fp) && fp === ipFingerprint("203.0.113.9", "secret-a") && fp !== ipFingerprint("203.0.113.9", "secret-b") && fp !== ipFingerprint("203.0.113.10", "secret-a") && !fp.includes("203"));
t('fingerprint: an unknown address stays "unknown"', ipFingerprint("unknown", "x") === "unknown" && ipFingerprint("", "x") === "unknown");
let clock = 1000;
const seen = createSeenSet(100, 3, () => clock);
seen.add("a", "id-a");
t("seen set: remembers a key inside its time limit", seen.has("a"));
seen.removeById("id-a");
t("seen set: a released download frees its slot", !seen.has("a"));
seen.add("b");
clock += 101;
t("seen set: forgets after the time limit", !seen.has("b"));
for (const k of ["c", "d", "e", "f"]) seen.add(k);
t("seen set: keeps at most its size cap", ["c", "d", "e", "f"].filter((k) => seen.has(k)).length === 3);
const src = (f: string) => read(f);
t("full-check no longer stores the address on the report", !/ipAddress:\s*clientIp/.test(src("app/[locale]/(main)/full-check/actions.ts")));
t("guide form stores null for the address and has no database lookup by address", /ipAddress: null/.test(src("app/[locale]/(main)/rehber/actions.ts")) && !/where: \{ ipAddress/.test(src("app/[locale]/(main)/rehber/actions.ts")) && !/ipAddress: ipAddress/.test(src("app/[locale]/(main)/rehber/actions.ts")));
const pdfRoute = src("app/api/pdf-download/route.ts");
t("pdf download writes an empty string (NOT NULL column) and no address to user_reports; no lookup by stored address", /ip_address: ""/.test(pdfRoute) && !/ipAddress: t\.ip/.test(pdfRoute) && !/eq\(pdfDownloads\.ip_address/.test(pdfRoute));
t("chat visitors are keyed by fingerprint and browser, and a legacy row is adopted", /where: \{ fingerprint, userAgent \}/.test(src("lib/visitor-tracking.ts")) && /data: \{ fingerprint, userAgent \}/.test(src("lib/visitor-tracking.ts")) && /ipAddress: null/.test(src("lib/visitor-tracking.ts")));

console.log("retention, deletion and the one-off script: dry run by default");
t("RETENTION_DRY_RUN: dry run unless exactly 'false'", isDryRun({}) && isDryRun({ RETENTION_DRY_RUN: "true" }) && isDryRun({ RETENTION_DRY_RUN: "" }) && isDryRun({ RETENTION_DRY_RUN: "False" }) && !isDryRun({ RETENTION_DRY_RUN: "false" }));
const rule = (id: string) => RETENTION_RULES.find((r) => r.id === id)?.where ?? "";
t("retention periods: transactions 5 years, contact 12 months, downloads and reports 24 months, chat 90 days", /5 years/.test(rule("transactions")) && /12 months/.test(rule("contact_messages")) && ["guide_downloads", "pdf_downloads", "user_reports"].every((id) => /24 months/.test(rule(id))) && ["chat_restore_requests", "chat_restore_tokens", "chat_visitor_profiles", "chat_visitors"].every((id) => /90 days/.test(rule(id))));
t("retention never deletes a chat visitor that holds credits or is linked to an email", /premium_credits = 0/.test(rule("chat_visitors")) && /chat_credit_links/.test(rule("chat_visitors")) && /chat_credit_links/.test(rule("chat_visitor_profiles")));
t("the policy states the same periods", ["5", "12", "24", "90"].every((n) => numbers(sectionText(PRIVACY_COPY.en, "retention")).split(",").includes(n)));
t("the cron route is registered and needs the bearer secret", JSON.parse(read("vercel.json")).crons.some((c: { path: string }) => c.path === "/api/cron/retention") && /CRON_SECRET/.test(read("app/api/cron/retention/route.ts")) && /safeEqual\(providedToken, secret\)/.test(read("app/api/cron/retention/route.ts")));
for (const f of ["scripts/null-raw-ip.ts", "scripts/delete-user-data.ts"]) t(`${f}: writes only with --confirm, and the dry run is a READ ONLY transaction`, /includes\("--confirm"\)/.test(src(f)) && /SET TRANSACTION READ ONLY/.test(src(f)) && /if \(!CONFIRM\)/.test(src(f)));
t("delete-user-data: logs every run without the email itself", /logs/.test(src("scripts/delete-user-data.ts")) && /emailSha256/.test(src("scripts/delete-user-data.ts")) && /appendFileSync/.test(src("scripts/delete-user-data.ts")));

console.log("agent sharing is not active: /legal and /privacy say so and make no consent-log promise")
for (const l of locales) {
  const legal = JSON.parse(read(`public/locales/${l}.json`)) as Record<string, string>;
  const legalText = [1, 2, 3].map((i) => legal[`legal.privacyReferralText${i}`]).join(" ");
  t(`${l}: /legal has no append-only or consent-log promise and no "tick the box" sharing`, !/append-only|never edited|yalnızca ekleme|silinmeyen|只增不改|永不删除|unless you tick|işaretlemediğiniz sürece|除非您勾选/i.test(legalText), legalText.slice(0, 60));
  t(`${l}: /legal says sharing is not active and the box is hidden`, /not active|etkin değildir|未启用/.test(legalText) && /hidden|gizlidir|隐藏/.test(legalText));
  t(`${l}: /legal says the agent sees a reference and purchase status, not the details`, /purchase status|satın alma durumunu|购买状态/.test(legalText));
  const policy = [sectionText(PRIVACY_COPY[l], "agent"), sectionText(PRIVACY_COPY[l], "share"), sectionText(PRIVACY_COPY[l], "rights")].join(" ");
  t(`${l}: /privacy agent, share and rights text make no consent-log or withdrawal promise`, !/append-only|yalnızca eklemeli|只能追加|withdraw agent consent|ajan onayını geri|撤回代理同意|tick the optional consent|işaretlemeden|不勾选/i.test(policy));
  t(`${l}: /privacy says sharing with agents is not active`, /not active|etkin değildir|未启用/.test(sectionText(PRIVACY_COPY[l], "agent")));
}
const prompt = read("app/api/referral-consent/prompt/route.ts");
t("the consent box is offered only when the consent table exists (consentTableReady), so no choice is shown that cannot be stored", /consentTableReady\(\)\)\) return NextResponse\.json\(\{ show: false \}/.test(prompt));
t("a failed read or write of the consent record means no consent, never a failed purchase", /Fails closed/.test(read("lib/consent/referral-consent.ts")) && /Never throws: a failed write means no consent/.test(read("lib/consent/referral-consent.ts")));

console.log("leads and full_check_waitlist are not cleaned up: no subscription field exists")
t("retention rules do not touch leads or full_check_waitlist", !RETENTION_RULES.some((r) => r.table === "leads" || r.table === "full_check_waitlist"));
t("the retention file explains why (no subscription column) and that deletion is by request", /NOT cleaned up: `leads` and `full_check_waitlist`/.test(read("lib/retention/run.ts")) && /subscri/.test(read("lib/retention/run.ts")));
const dbSchema = read("db/schema.ts");
const leadsAndWaitlist = dbSchema.slice(dbSchema.indexOf("export const fullCheckWaitlist"), dbSchema.indexOf("export const fullCheckUsage"));
t("db/schema.ts: neither table has a subscription, consent, opt-in or unsubscribe column (if one is added, add a retention exemption first)", !/subscri|consent|opt_?in|unsub|newsletter|marketing/i.test(leadsAndWaitlist));
t("RETENTION_DRY_RUN default is unchanged (dry run unless exactly 'false')", isDryRun({}) && !isDryRun({ RETENTION_DRY_RUN: "false" }));
for (const l of locales) t(`${l}: the policy says the two lists are not deleted automatically`, /not deleted automatically|otomatik silinmez|不会自动删除/.test(sectionText(PRIVACY_COPY[l], "retention")));

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall privacy page checks passed");
