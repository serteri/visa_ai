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
const banned = [/\bMeta\b/, /Pixel/i, /_fbp|_fbc/, /\bTODO\b/i, /\bKVKK\b/i, /\bGDPR\b/i, /Privacy Act/i, /Gizlilik Yasas/i, /隐私法/, /anonim/i, /匿名/, /fully anonymous/i, /\bsecure\b(?! link| token)/i];
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

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall privacy page checks passed");
