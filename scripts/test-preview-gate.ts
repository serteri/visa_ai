/**
 * The result page shows NO report content, for any user (updated parity test: the PDF is the source of truth). en / tr / zh-Hans.
 *
 *   1. locked (visitor, owner, admin): the header (title, name, date, target visa) and the purchase button only;
 *   2. unlocked (paid, free beta, admin): the header, "Your Visa Information Report is ready", "Download PDF" and "We also emailed you a link" only;
 *   3. the report, the full view and any preview are never passed to the client component (page source / RSC payload / server-action responses);
 *   4. none of "Western Australia", "AUD 6,135", "ACS", "Published requirement" (and no other report string) is in the page, though they ARE in
 *      the report (the PDF carries them: the PDF route answers for an unlocked report);
 *   5. the email carries the header only; the paid gate keeps its price and wording; the PDF route stays closed while locked.
 *
 *   npx tsx scripts/test-preview-gate.ts
 */
import { cookieJar, setNextAuthSession, signOutAll } from "./lib/stub-request-context";

process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://u:p@localhost:5432/d?sslmode=disable"; // never connects
process.env.RESEND_API_KEY = "re_test_key_not_real";

import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";

import type { ReadinessInput } from "../lib/readiness/types";
import { sectionStrings } from "../lib/reports/report-blocks";
import { buildReportView } from "../lib/reports/report-view";
import { reportDisclaimer } from "../lib/reports/report-disclaimer";
import { runReadinessEngine } from "../src/lib/readiness-engine";
import { REVIEW_PERSONAS } from "./render-persona-pdfs";

void cookieJar;

let failures = 0;
const t = (label: string, cond: boolean, detail = "") => {
  if (cond) console.log(`  ✅ ${label}`);
  else {
    failures++;
    console.error(`  ❌ ${label}${detail ? ` -- ${detail}` : ""}`);
  }
};
const LOCALES = ["en", "tr", "zh-Hans"] as const;

type Row = Record<string, unknown>;
const rows = new Map<string, Row>();
function installStub() {
  const empty = { findUnique: async () => null, findFirst: async () => null, findMany: async () => [] };
  (globalThis as { prisma?: unknown }).prisma = {
    $queryRawUnsafe: async (_sql: string, id: string) => (rows.has(id) ? [rows.get(id)] : []),
    $executeRawUnsafe: async () => 0,
    $disconnect: async () => undefined,
    stateAllocation: empty,
    occupation: empty,
    roundCutoff: empty,
    stateNominationConfig: empty,
    stateIntelligence: empty,
  };
}

const base = REVIEW_PERSONAS["ref-xyz-qld"];
const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const FORBIDDEN = ["Western Australia", "AUD 6,135", "ACS", "Published requirement"];
const LOCAL_REQUIREMENT_HEADER = { en: "Published requirement", tr: "Yayımlanmış gereklilik", "zh-Hans": "已公布的要求" } as const;

async function page(reportId: string, locale: string, token?: string | null) {
  const { default: Page } = await import("../app/[locale]/(main)/full-check/result/page");
  return (await Page({ params: Promise.resolve({ locale }), searchParams: Promise.resolve({ reportId, t: token ?? undefined }) })) as { type: unknown; props: Record<string, unknown> };
}

async function main() {
  installStub();
  const { reportAccessToken } = await import("../lib/reports/report-access");
  const { buildReportHeader, downloadLabel, emailedLine } = await import("../lib/reports/report-header");

  for (const L of LOCALES) {
    console.log(`\n==================== [${L}] ====================`);
    const input = { ...base, locale: L, targetVisa: "491", preferredPathway: "491" } as ReadinessInput;
    const report = JSON.parse(JSON.stringify(runReadinessEngine(input)));
    const view = buildReportView({ report, locale: L, profile: { name: "Test Persona", occupation: input.occupation, occupationRaw: input.occupation, englishLevel: input.englishLevel }, dateText: "" });
    const header = buildReportHeader({ report, locale: L, fullName: "test persona", createdAt: "2026-10-01T00:00:00Z" });
    const headerText = [header.title, header.name, header.dateText, header.targetLine, header.readyLine].join("\n");
    const everything = [...new Set(view.sections.flatMap(sectionStrings).filter((x) => x.length >= 28 && !headerText.includes(x)))];
    const viewText = JSON.stringify(view.sections);
    const present = FORBIDDEN.filter((f) => viewText.includes(f));
    t("the report itself (the PDF's source) does contain the forbidden strings (all four in English; the requirement header in its own language)", (L === "en" ? present.length === 4 : present.length >= 2) && viewText.includes(LOCAL_REQUIREMENT_HEADER[L]), present.join(", "));

    const lockedId = `locked-${L}`;
    const unlockedId = `unlocked-${L}`;
    const row = { email: "owner@example.com", locale: L, report_json: report, input_json: input, agent_id: null, full_name: "Test Persona", preview_data: { estimatedPoints: 1, pathways: [{ subclass: "189", visaName: "STALE OLD PREVIEW SHAPE", reason: "STALE OLD REASON" }] }, created_at: "2026-10-01T00:00:00Z" };
    rows.set(lockedId, { id: lockedId, is_unlocked: false, ...row });
    rows.set(unlockedId, { id: unlockedId, is_unlocked: true, ...row });

    const noContent = (label: string, el: { props: Record<string, unknown> }, html: string) => {
      const propsJson = JSON.stringify(el.props);
      t(`${label}: no report, view or preview is passed to the client`, !("report" in el.props) && !("view" in el.props) && !("preview" in el.props) && !/"sections"|pathwayComparison|visaGates|"blocks"/.test(propsJson));
      const banned = [...FORBIDDEN, LOCAL_REQUIREMENT_HEADER[L]];
      t(`${label}: none of ${banned.map((f) => `"${f}"`).join(", ")} is in the props or the page`, banned.every((f) => !propsJson.includes(f) && !html.includes(f)), banned.filter((f) => propsJson.includes(f) || html.includes(f)).join(", "));
      const leaked = everything.filter((x) => propsJson.includes(JSON.stringify(x).slice(1, -1)) || html.includes(x));
      t(`${label}: none of ${everything.length} report strings is in the props or the page`, leaked.length === 0, leaked.slice(0, 2).join(" | "));
      t(`${label}: no section titles, no points total, no stale stored preview`, view.sections.every((sec) => !html.includes(sec.title) || headerText.includes(sec.title) || sec.title.length < 12) && !html.includes("STALE OLD") && !/data-preview-(sections|points|details)/.test(html));
    };

    // 1. locked, visitor with the report's token
    signOutAll();
    const lockedToken = reportAccessToken(lockedId);
    const el = await page(lockedId, L, lockedToken);
    const html = decode(renderToStaticMarkup(el as never));
    t("locked: not unlocked, no PDF link", el.props.isUnlocked === false && el.props.downloadHref === null);
    t("locked: the header (title, name, date, target visa) is shown", [header.title, header.name, header.dateText, header.targetLine].every((x) => html.includes(x)), header.name);
    noContent("locked", el, html);
    t("locked: no 'Free beta' wording", !/Free beta|Ücretsiz beta|免费测试版/i.test(html));

    process.env.READINESS_REPORT_PAID_CHECKOUT_ENABLED = "true";
    const paidHtml = decode(renderToStaticMarkup((await page(lockedId, L, lockedToken)) as never));
    t("flag on: the purchase button and the price are shown", /data-report-price/.test(paidHtml) && /Unlock|aç|解锁/.test(paidHtml));
    delete process.env.READINESS_REPORT_PAID_CHECKOUT_ENABLED;

    // 2. unlocked (paid or free beta)
    const full = await page(unlockedId, L, reportAccessToken(unlockedId));
    const fullHtml = decode(renderToStaticMarkup(full as never));
    t("unlocked: the PDF link (with the access token) is the only route to the content", full.props.isUnlocked === true && String(full.props.downloadHref).includes(`/api/reports/${unlockedId}/pdf`));
    t("unlocked: header, 'ready' line, Download PDF, 'We also emailed you a link'", [header.title, header.name, header.dateText, header.targetLine, header.readyLine, downloadLabel(L), emailedLine(L)].every((x) => fullHtml.includes(x)) && /data-testid="download-pdf"/.test(fullHtml));
    noContent("unlocked", full, fullHtml);
    t("unlocked: the page is small (header only)", fullHtml.length < 6000, String(fullHtml.length));

    // 2b. the signed-in owner, no token
    setNextAuthSession({ user: { id: "o1", email: "OWNER@example.com", role: "USER" } });
    const asOwner = await page(unlockedId, L, null);
    noContent("owner (signed in)", asOwner, decode(renderToStaticMarkup(asOwner as never)));
    signOutAll();

    // 3. admin: a locked report is NOT shown in full any more
    setNextAuthSession({ user: { id: "a1", email: "admin@example.com", role: "ADMIN" } });
    const adminEl = await page(lockedId, L, null);
    const adminHtml = decode(renderToStaticMarkup(adminEl as never));
    t("admin session, locked report: header + purchase gate + an admin PDF link, no content", adminEl.props.isAdminBypass === true && adminHtml.includes(header.title) && /data-testid="admin-pdf-link"/.test(adminHtml));
    noContent("admin (locked)", adminEl, adminHtml);
    const adminUnlocked = await page(unlockedId, L, null);
    noContent("admin (unlocked)", adminUnlocked, decode(renderToStaticMarkup(adminUnlocked as never)));
    signOutAll();

    // wrong token
    const wrong = await page(lockedId, L, "not-the-token");
    const wrongJson = JSON.stringify(wrong.props);
    t("wrong token: nothing about the report", !wrongJson.includes(header.name) && !("header" in wrong.props));
  }

  console.log("\n4. responses and the email");
  const actions = readFileSync(path.join(process.cwd(), "app/[locale]/(main)/full-check/actions.ts"), "utf8");
  t("the form's answer carries the header, not a preview; the unlock answer carries a flag, not the report", /header\?: ReportHeader/.test(actions) && !/FullCheckQuickPreview|buildReportPreview|buildBasicPreview|buildQuickPreview/.test(actions) && /unlocked\?: boolean/.test(actions) && !/\breport\??: ReadinessReport/.test(actions.slice(actions.indexOf("export type PremiumUnlockState"), actions.indexOf("export type AdminResetState"))));
  const resultSrc = readFileSync(path.join(process.cwd(), "app/[locale]/(main)/full-check/result/page.tsx"), "utf8") + readFileSync(path.join(process.cwd(), "app/[locale]/(main)/full-check/result/result-view.tsx"), "utf8");
  t("the result page neither builds the report view nor reads the report into the page", !/buildReportView|report-view-model|visa-gate-text|pathwayComparison|boosterRows|stateRows/.test(resultSrc));
  {
    const realFetch = globalThis.fetch;
    let sent = "";
    globalThis.fetch = (async (_u: RequestInfo | URL, init?: RequestInit) => {
      sent = String(init?.body ?? "");
      return new Response(JSON.stringify({ id: "msg_1" }), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch;
    const { sendReportReadyEmail } = await import("../lib/email/quick-check-emails");
    const input = { ...base, locale: "en", targetVisa: "491" } as ReadinessInput;
    const rep = runReadinessEngine(input);
    const view = buildReportView({ report: rep, locale: "en", profile: { occupation: input.occupation, occupationRaw: input.occupation }, dateText: "" });
    await sendReportReadyEmail({ email: "c@example.org", fullName: "Jane", reportLink: "https://logivisa.com/x", locale: "en", header: buildReportHeader({ report: rep, locale: "en", fullName: "Jane" }) });
    globalThis.fetch = realFetch;
    const body = JSON.parse(sent) as { html?: string; subject?: string };
    const emailHeader = buildReportHeader({ report: rep, locale: "en", fullName: "Jane" });
    const reportOnly = view.sections.flatMap(sectionStrings).filter((x) => x.length >= 28 && ![emailHeader.title, emailHeader.targetLine, emailHeader.dateText].join("\n").includes(x));
    t("the email carries the header and no report content (no points, no section titles)", !reportOnly.some((x) => (body.html ?? "").includes(x)) && FORBIDDEN.every((f) => !(body.html ?? "").includes(f)) && !view.sections.slice(2).some((sec) => (body.html ?? "").includes(sec.title)));
    t("the email names the Visa Information Report, no 'AI Readiness', no 'AI-Powered', one disclaimer", /Visa Information Report/.test(body.subject ?? "") && !/AI Readiness|AI-Powered|Migration Intelligence|MARA/i.test(body.html ?? "") && (body.html ?? "").includes(reportDisclaimer("en")));
  }

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
