/**
 * The pre-payment preview gate, server side (en / tr / zh-Hans).
 *
 *   1. a LOCKED report's result page carries only the preview -- the visitor's details, the points total from their entries and the section
 *      titles. The report and the full view are not passed to the client component: no visa, state, fee, requirement or scenario text is in
 *      the props (the page source / RSC payload) or in the rendered HTML;
 *   2. once unlocked (paid, or a free-beta report) the owner sees the full report on screen with the PDF link, with the same sections as the PDF;
 *   3. a locked report is still full for an admin session; a locked report with the wrong token shows nothing;
 *   4. the preview in the quick-check answer and in the quick-check email has the same limits (no pathways, no content);
 *   5. the paid gate: price and "Unlock" wording with the flag on; no "Free beta" anywhere; the PDF route stays closed while locked.
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

async function page(reportId: string, locale: string, token?: string | null) {
  const { default: Page } = await import("../app/[locale]/(main)/full-check/result/page");
  return (await Page({ params: Promise.resolve({ locale }), searchParams: Promise.resolve({ reportId, t: token ?? undefined }) })) as { type: unknown; props: Record<string, unknown> };
}

async function main() {
  installStub();
  const { reportAccessToken } = await import("../lib/reports/report-access");

  for (const L of LOCALES) {
    console.log(`\n==================== [${L}] ====================`);
    const input = { ...base, locale: L, targetVisa: "491", preferredPathway: "491" } as ReadinessInput;
    const report = JSON.parse(JSON.stringify(runReadinessEngine(input)));
    const view = buildReportView({ report, locale: L, profile: { name: "Test Persona", occupation: input.occupation, occupationRaw: input.occupation, englishLevel: input.englishLevel }, dateText: "" });
    // Strings that exist only in the full report (every section except the details and the points table, and their titles are excluded).
    // What the preview may legitimately say: the details lines (the visitor's own entries, the target visa), the points total line and the titles.
    const detailBlocks = view.sections.find((x) => x.id === "details")!.blocks.flatMap((b) => (b.kind === "lines" ? b.lines : b.kind === "text" ? [b.text] : []));
    const pointsLine = (view.sections.find((x) => x.id === "points")!.blocks.find((b) => b.kind === "text") as { text: string }).text;
    const allowed = [...detailBlocks, pointsLine, ...view.sections.map((x) => x.title)].join("\n");
    const notAllowed = (x: string) => x.length >= 28 && !allowed.includes(x);
    const reportOnly = [...new Set(view.sections.filter((s) => !["details", "points"].includes(s.id)).flatMap(sectionStrings).filter(notAllowed))];
    const pointsOnly = [...new Set(view.sections.filter((s) => s.id === "points").flatMap(sectionStrings).filter(notAllowed))];

    const lockedId = `locked-${L}`;
    const unlockedId = `unlocked-${L}`;
    const base_row = { email: "owner@example.com", locale: L, report_json: report, input_json: input, agent_id: null, full_name: "Test Persona", preview_data: { estimatedPoints: 1, pathways: [{ subclass: "189", visaName: "STALE OLD PREVIEW SHAPE", confidenceLevel: "high", reason: "STALE OLD REASON" }] }, created_at: "2026-10-01T00:00:00Z" };
    rows.set(lockedId, { id: lockedId, is_unlocked: false, ...base_row });
    rows.set(unlockedId, { id: unlockedId, is_unlocked: true, ...base_row });

    // 1. locked, with the report's token
    signOutAll();
    const lockedToken = reportAccessToken(lockedId);
    const el = await page(lockedId, L, lockedToken);
    const propsJson = JSON.stringify(el.props);
    const html = decode(renderToStaticMarkup(el as never));
    const preview = el.props.preview as { details: string[]; pointsLine: string | null; sectionTitles: string[]; estimatedPoints: number | null };
    t("locked: the report and the full view are not passed to the client", el.props.report === null && el.props.view === null && el.props.downloadHref === null && el.props.isUnlocked === false);
    t("locked: the props carry only the preview (details, points total, section titles)", !!preview && preview.details.length > 5 && !!preview.pointsLine && preview.sectionTitles.length === view.sections.length && preview.sectionTitles.every((x, i) => x === view.sections[i].title));
    const leaked = reportOnly.filter((x) => propsJson.includes(JSON.stringify(x).slice(1, -1)) || html.includes(x));
    t(`locked: none of ${reportOnly.length} report-only strings (visas, states, fees, requirements, scenarios, sources) is in the props or the rendered page`, leaked.length === 0, leaked.slice(0, 2).join(" | "));
    const pointsLeak = pointsOnly.filter((x) => propsJson.includes(JSON.stringify(x).slice(1, -1)));
    t("locked: the points table rows and scenarios are not in the props (only the total)", pointsLeak.length === 0, pointsLeak.slice(0, 2).join(" | "));
    t("locked: the old stored preview shape (pathways, reasons) is not shown", !propsJson.includes("STALE OLD") && !html.includes("STALE OLD"));
    t("locked: the rendered page shows the details, the points total and every section title", preview.details.every((d) => html.includes(d)) && !!preview.pointsLine && html.includes(preview.pointsLine) && preview.sectionTitles.every((x) => html.includes(x)));
    t("locked: no 'Free beta', no pathway / confidence / friction / action-plan wording in the page", !/Free beta|Ücretsiz beta|免费测试版|Likely visa pathways|Pathway Friction|Immediate Action Plan|Strategic Gantt/i.test(html));

    // 5. gate wording
    process.env.READINESS_REPORT_PAID_CHECKOUT_ENABLED = "true";
    const paidHtml = decode(renderToStaticMarkup((await page(lockedId, L, lockedToken)) as never));
    t("flag on: the page offers 'Unlock ... Visa Information Report' and shows the price", /Visa Information Report|Vize Bilgi Raporu|签证信息报告/.test(paidHtml) && /data-report-price/.test(paidHtml) && /Unlock|aç|解锁/.test(paidHtml));
    delete process.env.READINESS_REPORT_PAID_CHECKOUT_ENABLED;

    // 2. unlocked: the owner sees the full report
    const full = await page(unlockedId, L, reportAccessToken(unlockedId));
    const fullHtml = decode(renderToStaticMarkup(full as never));
    const v = full.props.view as { sections: Array<{ id: string; title: string }> } | null;
    t("unlocked: the full view reaches the page, with the same sections as the PDF, and the PDF link", !!v && v.sections.length === view.sections.length && typeof full.props.downloadHref === "string" && String(full.props.downloadHref).includes(`/api/reports/${unlockedId}/pdf`));
    t("unlocked: the report text is on the page", reportOnly.slice(0, 5).every((x) => fullHtml.includes(x)) && fullHtml.includes(reportDisclaimer(L)));

    // 2b. a free-beta report stays viewable by its owner: by the access token, and by the signed-in owner
    setNextAuthSession({ user: { id: "o1", email: "OWNER@example.com", role: "USER" } });
    const asOwner = await page(unlockedId, L, null);
    t("a free-beta (already unlocked) report is viewable by its signed-in owner without the token", !!asOwner.props.view && asOwner.props.report !== null);
    signOutAll();

    // 3. admin sees a locked report in full; a wrong token shows nothing
    setNextAuthSession({ user: { id: "a1", email: "admin@example.com", role: "ADMIN" } });
    const adminEl = await page(lockedId, L, null);
    t("admin session: a locked report is shown in full (inspection)", adminEl.props.isAdminBypass === true && !!adminEl.props.view);
    signOutAll();
    const wrong = await page(lockedId, L, "not-the-token");
    const wrongJson = JSON.stringify(wrong.props);
    t("wrong token: no report content at all", !wrongJson.includes(reportOnly[0].slice(0, 20)) && !("view" in wrong.props) && !("preview" in wrong.props));
  }

  console.log("\n4. the quick-check answer and the quick-check email");
  const actions = readFileSync(path.join(process.cwd(), "app/[locale]/(main)/full-check/actions.ts"), "utf8");
  t("the quick-check answer's preview is the limited preview (no pathways, no confidence)", /export type FullCheckQuickPreview = ReportPreview/.test(actions) && !/pathways: report\.pathwayComparison/.test(actions) && /buildReportPreview\(view/.test(actions));
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
    const { buildReportPreview } = await import("../lib/reports/report-preview");
    await sendReportReadyEmail({ email: "c@example.org", fullName: "Jane", reportLink: "https://logivisa.com/x", locale: "en", preview: buildReportPreview(view, 70) });
    globalThis.fetch = realFetch;
    const body = JSON.parse(sent) as { html?: string; subject?: string };
    const allowedMail = [...(view.sections.find((x) => x.id === "details")!.blocks.flatMap((b) => (b.kind === "lines" ? b.lines : b.kind === "text" ? [b.text] : []))), ...view.sections.map((x) => x.title)].join("\n");
    const reportOnly = view.sections.filter((s) => !["details", "points"].includes(s.id)).flatMap(sectionStrings).filter((x) => x.length >= 28 && !allowedMail.includes(x));
    t("the email carries the preview (points total, section titles) and no report content", (body.html ?? "").includes(view.sections[2].title) && !reportOnly.some((x) => (body.html ?? "").includes(x)));
    t("the email names the Visa Information Report, no 'AI Readiness', no 'AI-Powered', one disclaimer", /Visa Information Report/.test(body.subject ?? "") && !/AI Readiness|AI-Powered|Migration Intelligence|MARA/i.test(body.html ?? "") && (body.html ?? "").includes(reportDisclaimer("en")));
  }

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
