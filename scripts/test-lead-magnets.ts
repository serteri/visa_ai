/**
 * The lead magnets (free PDF downloads): the form, the API's decision logic, the delivery email and the files.
 *
 *   1. registry: every modal sends its OWN file and shows its OWN name (no "PR Guide" message in the occupation-list modal); the files exist;
 *      no name or copy calls the occupation list "Official"; the occupation-list page makes no government claim;
 *   2. validation: name and email required, phone optional, the same function on the server (400 + localised field errors), en / tr / zh-Hans;
 *   3. API decision paths (injected side effects): accepted -> delivered; provider failure -> not delivered, link, ledger row released;
 *      suppressed test/admin address -> not delivered, no send; duplicate IP; quota; admin bypass;
 *   4. the provider's answer: the Resend SDK resolves with { error } instead of throwing -- a rejected send is NOT "sent";
 *   5. the browser outcome: "sent" only when the API says delivered; otherwise the download link;
 *   6. contrast: WCAG AA for every text/background pair of the modal, and no white or pale-grey text classes left;
 *   7. the "* Required field" legend (en / tr / zh-Hans) in every form with asterisks; phone has no asterisk in the modals;
 *   8. the PDF cover carries the source and the date and says it is not a government document.
 *
 *   npx tsx scripts/test-lead-magnets.ts
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { PDFParse } from "pdf-parse";

import { DOCUMENT_IDS, FORM_TEXT, LEAD_MAGNETS, PDF_SLUGS, leadMagnetBySlug, pick, sentMessage } from "../lib/lead-magnets";
import { validateLeadFields } from "../lib/lead-magnet-validation";
import { submitLead } from "../lib/lead-magnet-client";
import { buildPdfDeliveryEmail, sendPdfDeliveryEmail, type PdfDeliveryResult } from "../lib/email/pdf-delivery";
import { handlePdfDownload, FREE_LIMIT, type PdfDownloadDeps } from "../lib/pdf-download/handle";

let failures = 0;
const t = (label: string, cond: boolean, detail = "") => {
  if (cond) console.log(`  ✅ ${label}`);
  else {
    failures++;
    console.error(`  ❌ ${label}${detail ? ` -- ${detail}` : ""}`);
  }
};
const root = process.cwd();
const read = (rel: string) => readFileSync(path.join(root, rel), "utf8");
const LOCALES = ["en", "tr", "zh-Hans"] as const;
const OFFICIAL_CLAIM = /Official Occupation List|Official Skilled Occupation List|Resmi Meslek Listesi|官方职业清单|Official Government Document|Published directly by the Australian Department/i;

async function main() {
// ── 1. registry ────────────────────────────────────────────────────────────────
console.log("1. registry: each modal sends its own file with its own name");
const magnets = Object.values(LEAD_MAGNETS);
t("three lead magnets with distinct slugs", new Set(magnets.map((m) => m.slug)).size === 3);
for (const m of magnets) {
  t(`${m.product}: the file /${m.slug}.pdf exists in public/`, existsSync(path.join(root, "public", `${m.slug}.pdf`)));
  for (const L of LOCALES) {
    t(`${m.product} [${L}]: name, title, description and banner are filled`, [m.name, m.title, m.description, m.banner].every((v) => pick(v, L).length > 5));
    const msg = sentMessage(pick(m.name, L), "a@b.co", L);
    t(`${m.product} [${L}]: the success message names this file, not another one`, msg.includes(pick(m.name, L)) && !/PR Guide|PR Rehberi|PR 指南/.test(msg.replace(pick(m.name, L), "")) );
    t(`${m.product} [${L}]: no "Official ... List" claim in the copy`, !OFFICIAL_CLAIM.test([m.name, m.title, m.description, m.banner].map((v) => pick(v, L)).join(" | ")));
  }
}
t("the occupation-list name says it is compiled from official sources (en / tr / zh-Hans)", /compiled from official sources/.test(LEAD_MAGNETS.occupation.name.en) && /resmi kaynaklardan derlenmiştir/.test(LEAD_MAGNETS.occupation.name.tr) && /根据官方来源整理/.test(LEAD_MAGNETS.occupation.name.zh));
t("slug -> magnet resolves each file; an unknown slug falls back to the Turkish guide only", Object.values(PDF_SLUGS).every((s) => leadMagnetBySlug(s).slug === s) && leadMagnetBySlug("nope").slug === PDF_SLUGS.turkish);

console.log("\n   every modal and the file it sends");
const modalUses: Array<[string, RegExp, string]> = [
  ["components/global-disclaimer-footer.tsx", /product="occupation"/, PDF_SLUGS.occupation],
  ["app/[locale]/(main)/tools/anzsco-finder/AnzscoSearchTool.tsx", /product="occupation"/, PDF_SLUGS.occupation],
];
for (const [file, re, slug] of modalUses) t(`${file} -> ${slug}.pdf`, re.test(read(file)));
t("components/home-content.tsx opens the modal with the guide chosen on the card (turkish | global | occupation)", /product=\{activePdfModal \?\? "turkish"\}/.test(read("components/home-content.tsx")));
t("components/AnzscoClassifier.tsx passes modalProduct (occupation list or a guide) to the same modal", /product=\{modalProduct\}/.test(read("components/AnzscoClassifier.tsx")));
t("full-check occupation dialog -> csol-2026 -> occupation list", /documentId="csol-2026"/.test(read("app/[locale]/(main)/full-check/full-check-waitlist-form.tsx")) && DOCUMENT_IDS["csol-2026"] === "occupation");
t("/resources/occupation-list -> csol-2026 -> occupation list", /documentId="csol-2026"/.test(read("app/[locale]/(main)/resources/occupation-list/page.tsx")));
const article = read("app/[locale]/(main)/guides/the-end-of-hope-and-wait/page.tsx");
t("the end-of-hope article -> the Turkish guide (tr) / the global guide (other)", /guide-turkish-2026/.test(article) && /guide-global-2026/.test(article) && DOCUMENT_IDS["guide-turkish-2026"] === "turkish" && DOCUMENT_IDS["guide-global-2026"] === "global");
t("the shared modal no longer hard-codes 'PR Guide' in its success state", !/PR Guide has been sent|PR Rehberi <strong>/.test(read("components/PdfDownloadModal.tsx")));
t("the inline success text no longer says 'Visa Readiness Report'", !/Visa Readiness Report|Vize Hazırlık Raporunuz|签证准备度报告/.test(read("components/LeadMagnetForm.tsx")));

console.log("\n   the page and the wording");
const page = read("app/[locale]/(main)/resources/occupation-list/page.tsx");
t("the occupation-list page does not call the file an official / government document", !OFFICIAL_CLAIM.test(page) && !/Published directly/.test(page));
for (const file of ["public/locales/en.json", "public/locales/tr.json", "public/locales/zh-Hans.json"]) {
  const j = JSON.parse(read(file)) as Record<string, string>;
  t(`${file}: footer.officialListPdf and af.downloadOfficialPdf name it a compilation`, !OFFICIAL_CLAIM.test(`${j["footer.officialListPdf"]} ${j["af.downloadOfficialPdf"]}`) && /official|resmi|官方/i.test(`${j["footer.officialListPdf"]}`));
}
for (const file of ["app/[locale]/(main)/full-check/full-check-waitlist-form.tsx", "app/[locale]/(main)/full-check/step-2-career.tsx", "components/PdfDownloadModal.tsx", "components/LeadMagnetForm.tsx"]) {
  t(`${file}: no "Official Occupation List" wording`, !OFFICIAL_CLAIM.test(read(file)));
}

// ── 2. validation ──────────────────────────────────────────────────────────────
console.log("\n2. validation (the same function in the browser and on the server)");
for (const L of LOCALES) {
  const empty = validateLeadFields({}, L);
  t(`[${L}] empty form: name and email are required, the phone is not`, empty.full_name === pick(FORM_TEXT.nameRequired, L) && empty.email === pick(FORM_TEXT.emailRequired, L) && empty.phone === undefined);
  t(`[${L}] a phone left empty is accepted`, Object.keys(validateLeadFields({ full_name: "Jane", email: "jane@example.com", phone: "" }, L)).length === 0);
  t(`[${L}] a bad email and a short phone are rejected, in this language`, validateLeadFields({ full_name: "J", email: "a@b", phone: "123" }, L).email === pick(FORM_TEXT.emailInvalid, L) && validateLeadFields({ full_name: "J", email: "a@b.co", phone: "123" }, L).phone === pick(FORM_TEXT.phoneInvalid, L));
}

// ── 3. API decision paths ──────────────────────────────────────────────────────
console.log("\n3. API decision paths (injected side effects, no database, no network)");
type Calls = { sent: number; inserted: number; deleted: string[]; after: number; lastAfter?: { delivered: boolean } };
function deps(over: Partial<PdfDownloadDeps> & { send?: PdfDeliveryResult }): { d: PdfDownloadDeps; calls: Calls } {
  const calls: Calls = { sent: 0, inserted: 0, deleted: [], after: 0 };
  const d: PdfDownloadDeps = {
    isExcludedEmail: () => false,
    countByIpAndSlug: async () => 0,
    countRealTotal: async () => 0,
    insertLedgerRow: async () => {
      calls.inserted++;
      return "row-1";
    },
    deleteLedgerRow: async (id) => {
      calls.deleted.push(id);
    },
    isSuppressed: () => false,
    sendDelivery: async () => {
      calls.sent++;
      return over.send ?? { sent: true, pdfUrl: "x", messageId: "msg_1" };
    },
    afterResponse: (task) => {
      calls.after++;
      calls.lastAfter = task;
    },
    ...over,
  };
  return { d, calls };
}
const body = (extra: Record<string, unknown> = {}) => ({ full_name: "Jane Smith", email: "jane@example.com", phone: "", slug: PDF_SLUGS.occupation, termsAcceptedAt: new Date().toISOString(), locale: "en", ...extra });

for (const L of LOCALES) {
  const { d, calls } = deps({});
  const r = await handlePdfDownload({ body: body({ full_name: "", email: "", locale: L }), ip: "1.1.1.1" }, d);
  const fe = r.json.fieldErrors as Record<string, string>;
  t(`[${L}] server: missing name and email -> 400 with localised field errors, nothing stored or sent`, r.status === 400 && fe.full_name === pick(FORM_TEXT.nameRequired, L) && fe.email === pick(FORM_TEXT.emailRequired, L) && calls.inserted === 0 && calls.sent === 0);
}
{
  const { d, calls } = deps({});
  const r = await handlePdfDownload({ body: body({ phone: "+90 12" }), ip: "1.1.1.1" }, d);
  t("server: a phone that is given but too short -> 400", r.status === 400 && calls.inserted === 0);
  const r2 = await handlePdfDownload({ body: body({ phone: "+90 " }), ip: "1.1.1.2" }, d);
  t("server: a phone that is only a dial code counts as empty (accepted)", r2.status === 200);
  const r3 = await handlePdfDownload({ body: body({ termsAcceptedAt: "" }), ip: "1.1.1.3" }, deps({}).d);
  t("server: terms not accepted -> 400", r3.status === 400);
}
{
  const { d, calls } = deps({});
  const r = await handlePdfDownload({ body: body(), ip: "2.2.2.2" }, d);
  t("accepted by the provider -> delivered: true; the ledger row stays; the CRM lead task runs after the response", r.status === 200 && r.json.delivered === true && calls.sent === 1 && calls.deleted.length === 0 && calls.after === 1 && calls.lastAfter?.delivered === true);
  t("the answer carries the file's link", r.json.downloadUrl === `/${PDF_SLUGS.occupation}.pdf`);
}
{
  const { d, calls } = deps({ send: { sent: false, pdfUrl: "x", skippedReason: "provider_error", errorMessage: "domain is not verified" } });
  const r = await handlePdfDownload({ body: body(), ip: "3.3.3.3" }, d);
  t("provider rejects -> delivered: false with the download link; the visitor is not told it was sent", r.status === 200 && r.json.delivered === false && r.json.suppressed === false && r.json.downloadUrl === `/${PDF_SLUGS.occupation}.pdf`);
  t("provider rejects -> the ledger row is released (the visitor can try again) and the lead is still kept", calls.deleted.join() === "row-1" && calls.after === 1 && calls.lastAfter?.delivered === false);
}
{
  const { d, calls } = deps({ send: { sent: false, pdfUrl: "x", skippedReason: "not_configured" } });
  const r = await handlePdfDownload({ body: body(), ip: "3.3.3.4" }, d);
  t("no provider key configured -> delivered: false, link shown", r.json.delivered === false && calls.deleted.length === 1);
}
{
  const { d, calls } = deps({ isSuppressed: () => true });
  const r = await handlePdfDownload({ body: body({ email: "owner@example.com" }), ip: "4.4.4.4" }, d);
  t("a suppressed (admin/test) address: no email is sent, the answer says so and gives the link", r.json.delivered === false && r.json.suppressed === true && calls.sent === 0 && calls.deleted.length === 0);
}
{
  const r = await handlePdfDownload({ body: body({ locale: "tr" }), ip: "5.5.5.5" }, deps({ countByIpAndSlug: async () => 1 }).d);
  t("a second request from the same IP for the same file -> 409, localised", r.status === 409 && r.json.alreadyDownloaded === true && r.json.error === pick(FORM_TEXT.alreadyDownloaded, "tr"));
  const r2 = await handlePdfDownload({ body: body(), ip: "5.5.5.6" }, deps({ countRealTotal: async () => FREE_LIMIT }).d);
  t("the free quota is full -> 402 paymentRequired", r2.status === 402 && r2.json.paymentRequired === true);
  const r3 = await handlePdfDownload({ body: body(), ip: "5.5.5.7" }, deps({ isExcludedEmail: () => true, countByIpAndSlug: async () => 9, countRealTotal: async () => 99 }).d);
  t("an admin/test address bypasses the IP and quota limits", r3.status === 200);
}
for (const [product, m] of Object.entries(LEAD_MAGNETS)) {
  const r = await handlePdfDownload({ body: body({ slug: m.slug }), ip: `6.6.6.${product.length}` }, deps({}).d);
  t(`${product}: the answer points to /${m.slug}.pdf`, r.json.downloadUrl === `/${m.slug}.pdf`);
}

// ── 4. the provider's answer ───────────────────────────────────────────────────
console.log("\n4. the delivery email: the provider's answer decides");
const realFetch = globalThis.fetch;
function stubFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => handler(String(input), init)) as typeof fetch;
}
process.env.RESEND_API_KEY = "re_test_key_not_real";
process.env.FROM_EMAIL = "LogiVisa <noreply@logivisa.com>";
const json = (status: number, payload: unknown) => new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } });
{
  let sentBody: { to?: string[]; subject?: string; html?: string } = {};
  stubFetch((_u, init) => {
    sentBody = JSON.parse(String(init?.body ?? "{}"));
    return json(200, { id: "msg_accepted_1" });
  });
  const r = await sendPdfDeliveryEmail({ fullName: "Jane", email: "jane@example.com", slug: PDF_SLUGS.occupation, locale: "en" });
  t("accepted: sent true with the provider's message id", r.sent === true && r.messageId === "msg_accepted_1");
  t("the email goes to the visitor, carries this file's name in the subject and its link", sentBody.to?.[0] === "jane@example.com" && /Skilled Occupation List/.test(sentBody.subject ?? "") && (sentBody.html ?? "").includes(`/${PDF_SLUGS.occupation}.pdf`));
}
{
  stubFetch(() => json(403, { name: "validation_error", message: "The logivisa.com domain is not verified.", statusCode: 403 }));
  const r = await sendPdfDeliveryEmail({ fullName: "Jane", email: "jane@example.com", slug: PDF_SLUGS.occupation });
  t("REJECTED by the provider (the SDK resolves with { error }, it does not throw): sent is false", r.sent === false && r.skippedReason === "provider_error" && /not verified/.test(r.errorMessage ?? ""));
  stubFetch(() => json(200, {}));
  const r2 = await sendPdfDeliveryEmail({ fullName: "Jane", email: "jane@example.com", slug: PDF_SLUGS.global });
  t("an answer without a message id is not 'sent'", r2.sent === false);
  stubFetch(() => {
    throw new Error("network down");
  });
  const r3 = await sendPdfDeliveryEmail({ fullName: "Jane", email: "jane@example.com", slug: PDF_SLUGS.global });
  t("a network failure is reported, not thrown", r3.sent === false);
  delete process.env.RESEND_API_KEY;
  const r4 = await sendPdfDeliveryEmail({ fullName: "Jane", email: "jane@example.com", slug: PDF_SLUGS.global });
  t("no API key: sent false, reason not_configured", r4.sent === false && r4.skippedReason === "not_configured");
}
for (const m of magnets) {
  for (const L of LOCALES) {
    const mail = buildPdfDeliveryEmail({ fullName: "Jane", email: "jane@example.com", slug: m.slug, locale: L });
    t(`email ${m.product} [${L}]: its own file link, its own name in the subject, no other file`, mail.pdfUrl.endsWith(`/${m.slug}.pdf`) && mail.subject.includes(pick(m.name, L)) && magnets.filter((o) => o.slug !== m.slug).every((o) => !mail.html.includes(`/${o.slug}.pdf`)) && !OFFICIAL_CLAIM.test(`${mail.subject} ${mail.text}`));
  }
}

// ── 5. the browser outcome ─────────────────────────────────────────────────────
console.log("\n5. the browser outcome");
const sub = (over = {}) => ({ slug: PDF_SLUGS.occupation, category: "c", locale: "en", full_name: "Jane", email: "jane@example.com", phone: "", termsAcceptedAt: new Date().toISOString(), ...over });
{
  stubFetch(() => json(200, { success: true, delivered: true, downloadUrl: "/x.pdf" }));
  t("delivered: true -> 'sent'", (await submitLead(sub())).kind === "sent");
  stubFetch(() => json(200, { success: true, delivered: false, downloadUrl: "/x.pdf" }));
  const nd = await submitLead(sub());
  t("delivered: false -> not_delivered with the link (never 'sent')", nd.kind === "not_delivered" && nd.downloadUrl === "/x.pdf");
  stubFetch(() => json(200, { success: true }));
  t("an answer that does not say delivered is not 'sent'", (await submitLead(sub())).kind === "not_delivered");
  stubFetch(() => json(400, { error: "x", fieldErrors: { email: "Enter a valid email address." } }));
  const bad = await submitLead(sub());
  t("a 400 carries the server's field errors", bad.kind === "error" && bad.fieldErrors?.email === "Enter a valid email address.");
  stubFetch(() => json(402, { paymentRequired: true }));
  t("402 -> payment_required", (await submitLead(sub())).kind === "payment_required");
  stubFetch(() => {
    throw new Error("offline");
  });
  const off = await submitLead(sub({ locale: "zh-Hans" }));
  t("offline -> a localised connection error", off.kind === "error" && off.message === pick(FORM_TEXT.connection, "zh-Hans"));
}
globalThis.fetch = realFetch;

// ── 6. contrast ────────────────────────────────────────────────────────────────
console.log("\n6. contrast (WCAG AA: 4.5:1 for text)");
const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
// The app's light and dark themes share one pale page background (app/globals.css: --background #EEF5DB in :root and in the dark media query).
const PAGE = "#EEF5DB";
const pairs: Array<[string, string, string]> = [
  ["success text (emerald-950 on emerald-50)", "#022c22", "#ecfdf5"],
  ["success icon (emerald-800 on emerald-100)", "#065f46", "#d1fae5"],
  ["secondary text (slate-700 on the page)", "#334155", PAGE],
  ["warning text (amber-950 on amber-50)", "#451a03", "#fffbeb"],
  ["slot banner (emerald-900 on emerald-50)", "#064e3b", "#ecfdf5"],
  ["notice (amber-900 on amber-50)", "#78350f", "#fffbeb"],
  ["error box (red-800 on red-50)", "#991b1b", "#fef2f2"],
  ["field error (red-700 on the page)", "#b91c1c", PAGE],
  ["required asterisk (red-700 on the page)", "#b91c1c", PAGE],
  ["terms error (rose-700 on the page)", "#be123c", PAGE],
  ["download link (white on indigo-700)", "#ffffff", "#4338ca"],
  ["legend / helper text (slate-700 on the page)", "#334155", PAGE],
];
for (const [name, fg, bg] of pairs) {
  const r = ratio(fg, bg);
  t(`${name}: ${r.toFixed(1)}:1`, r >= 4.5);
}
const prevWhite = ratio("#ffffff", PAGE);
t(`(the defect: white on the page background was only ${prevWhite.toFixed(1)}:1)`, prevWhite < 4.5);
const modalFiles = ["components/PdfDownloadModal.tsx", "components/LeadMagnetForm.tsx", "components/lead-magnet-result.tsx", "components/terms-gate.tsx", "components/required-legend.tsx"];
for (const f of modalFiles) {
  const src = read(f);
  const bad = src.match(/\b(?:dark:)?text-(?:white|slate-400|slate-500|rose-400|red-500|red-600|emerald-400|emerald-600|emerald-700|amber-700)\b/g) ?? [];
  // text-white is allowed only on the filled buttons (a coloured background of its own).
  const offenders = bad.filter((c) => !(c === "text-white" && /bg-(?:gradient|indigo|primary)/.test(src)));
  t(`${f}: no white or pale text classes on the page background`, offenders.length === 0, offenders.join(" "));
}
t("the success paragraph sets its own background and dark text", /border-emerald-300 bg-emerald-50 px-4 py-3 text-base font-semibold text-emerald-950/.test(read("components/lead-magnet-result.tsx")));

// ── 7. legend ──────────────────────────────────────────────────────────────────
console.log("\n7. the '* Required field' legend");
t("legend text: en / tr / zh-Hans", FORM_TEXT.legend.en === "* Required field" && FORM_TEXT.legend.tr === "* Zorunlu alan" && FORM_TEXT.legend.zh === "* 必填项");
const asteriskForms = [
  "components/PdfDownloadModal.tsx",
  "components/LeadMagnetForm.tsx",
  "app/[locale]/(main)/full-check/full-check-waitlist-form.tsx",
  "app/[locale]/(main)/rehber/DownloadForm.tsx",
];
for (const f of asteriskForms) {
  const src = read(f);
  const hasLegend = /<RequiredLegend\b/.test(src) || /data-required-legend/.test(src);
  t(`${f}: asterisks and a legend`, /\*<\/span>|<RequiredMark/.test(src) && hasLegend);
}
const modalSrc = read("components/PdfDownloadModal.tsx");
t("the modal: Phone Number is optional (no asterisk, no required attribute), name and email are marked", !/Phone Number<\/span>|"Phone Number", "手机号"\)\}\s*<span/.test(modalSrc) && /Phone Number \(Optional\)/.test(modalSrc) && !/\n\s+required\n/.test(modalSrc.slice(modalSrc.indexOf('id="phone"'))) && (modalSrc.match(/aria-hidden="true">\*<\/span>/g) ?? []).length === 2);
const lmf = read("components/LeadMagnetForm.tsx");
t("LeadMagnetForm: phone optional, an empty phone is not sent as a bare dial code", /Phone Number \(Optional\)/.test(lmf) && /form\.phone\.trim\(\) \?/.test(lmf));

// ── 8. the PDF ─────────────────────────────────────────────────────────────────
console.log("\n8. the PDF cover");
{
  const parser = new PDFParse({ data: new Uint8Array(readFileSync(path.join(root, "public", `${PDF_SLUGS.occupation}.pdf`))) });
  const first = (await parser.getText({ partial: [1] })).pages[0]?.text ?? "";
  await parser.destroy();
  const flat = first.replace(/\s+/g, " ");
  t("the cover says it is compiled from official sources", /compiled from official sources/i.test(flat));
  t("the cover names the source (Department of Home Affairs) and the compile date", /Department of Home Affairs/.test(flat) && /Compiled by LogiVisa on \d{1,2} [A-Z][a-z]+ 20\d\d/.test(flat));
  t("the cover says it is not an official or government document", /not an official or government document/.test(flat));
  t("the cover does not call it the official list", !/Official Skilled Occupation List/.test(flat));
}


console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
