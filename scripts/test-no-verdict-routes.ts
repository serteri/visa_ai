/**
 * No route can still produce the verdict structure ("Your verdict", "Your next 3 actions", "Submit your EOI now", "States you can use",
 * "Action plan", "Visa by visa", "Calculate your visa chances"). Every place a customer, an agent or an admin can get a report is run for real:
 *
 *   1. the PDF download route (the emailed link and the "Download" button both use it), with every READINESS_REPORT_MODE;
 *   2. the on-screen result page (the creating browser's session link and the emailed secure link render the same page);
 *   3. the agent / admin lead PDF route (agent label on top);
 *   4. a report stored before the Target visa existed (no targetVisa / suppliedFacts) and one with every target;
 *   5. source guards: one PDF generator, one drawer, one view model; no PDF is stored or attached to an email; no module outside
 *      the report view defines the old section titles; the form opens the result page after the unlock.
 *
 * en / tr / zh-Hans.   npx tsx scripts/test-no-verdict-routes.ts      (no database, no network)
 */
import { renderToStaticMarkup } from "react-dom/server";
import { PDFParse } from "pdf-parse";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { setNextAuthSession, signOutAll } from "./lib/stub-request-context";

process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/d?sslmode=disable"; // never connects

import { REVIEW_PERSONAS, renderPersonaPdfTexts } from "./render-persona-pdfs";

let failures = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  if (cond) console.log(`  ✅ ${msg}`);
  else {
    failures++;
    console.error(`  ❌ ${msg}${detail ? ` -- ${detail}` : ""}`);
  }
};
type L = "en" | "tr" | "zh-Hans";
const LOCALES: L[] = ["en", "tr", "zh-Hans"];

const OLD_STRUCTURE: Record<L, RegExp> = {
  en: /Your verdict|YOUR VERDICT|Your next 3 actions|Submit your EOI now|States you can use|Action plan|Visa by visa|fastest way to close the gap|Calculate your visa chances|Want to find your own PR points/i,
  tr: /Değerlendirmeniz\b|Sonraki 3 adımınız|EOI'nizi şimdi gönderin|Kullanabileceğiniz eyaletler|Eylem planı|Vize vize|en hızlı yolu/,
  "zh-Hans": /您的结论|您的下一步（三项）|立即提交 EOI|您可以使用的州|行动计划|逐个签证分析|最快方式/,
};
const NEW_TITLE: Record<L, string> = { en: "Your details", tr: "Bilgileriniz", "zh-Hans": "您的信息" };
const squash = (s: string) => s.replace(/\s+/g, "");
const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

async function textOf(bytes: Uint8Array) {
  const parser = new PDFParse({ data: bytes.slice() });
  const t = (await parser.getText()).pages.map((p: { text: string }) => p.text).join("\n");
  await parser.destroy();
  return t;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    if (f === "node_modules" || f === ".next" || f === ".git") continue;
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(f)) out.push(p);
  }
  return out;
}

async function main() {
  const base = REVIEW_PERSONAS["reference-se-au"];
  // Reports as they are stored: with a target, and from before the Target visa existed (the stale production report shape).
  const personas: Record<string, typeof base> = {
    t491: { ...base, targetVisa: "491", preferredPathway: "491" },
    t189: { ...base, targetVisa: "189", preferredPathway: "189" },
    tnot: { ...base, targetVisa: "not_sure", preferredPathway: undefined },
    old: { ...base, preferredPathway: "491" },
  };
  console.log("1. the PDF route (download button, emailed link)");
  const texts = new Map<string, string>();
  for (const r of await renderPersonaPdfTexts(personas, LOCALES)) texts.set(`${r.id}-${r.locale}`, r.text);
  for (const [key, text] of texts) {
    const locale = key.split("-").slice(1).join("-") as L;
    check(!OLD_STRUCTURE[locale].test(text) && squash(text).includes(squash(NEW_TITLE[locale])), `${key}: the information-first report, none of the old structure`, (OLD_STRUCTURE[locale].exec(text) ?? [""])[0]);
  }

  console.log("\n2. the result page (session link and emailed link render this page)");
  const { default: Page } = await import("../app/[locale]/(main)/full-check/result/page");
  const { reportAccessToken } = await import("../lib/reports/report-access");
  for (const id of Object.keys(personas)) {
    for (const locale of LOCALES) {
      const reportId = `${id}-${locale}`;
      const el = await Page({ params: Promise.resolve({ locale }), searchParams: Promise.resolve({ reportId, t: reportAccessToken(reportId) ?? undefined }) });
      const html = decode(renderToStaticMarkup(el).replace(/<[^>]*>/g, " ").replace(/\s+/g, " "));
      check(!OLD_STRUCTURE[locale].test(html) && html.includes(NEW_TITLE[locale]), `${reportId}: the page shows the information-first report`, (OLD_STRUCTURE[locale].exec(html) ?? [""])[0]);
    }
  }

  console.log("\n3. the agent / admin lead PDF route");
  const rowsDb = (globalThis as { prisma?: { $queryRawUnsafe: (sql: string, id: string) => Promise<Array<Record<string, unknown>>> } }).prisma!;
  Object.assign(rowsDb as unknown as Record<string, unknown>, {
    userReport: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        const [row] = await rowsDb.$queryRawUnsafe("", where.id);
        return row ? { id: row.id, fullName: row.full_name, email: row.email, locale: row.locale, reportJson: row.report_json, inputJson: row.input_json, createdAt: new Date(), agentId: "agent-1" } : null;
      },
      findFirst: async ({ where }: { where: { id: string } }) => {
        const [row] = await rowsDb.$queryRawUnsafe("", where.id);
        return row ? { id: row.id, fullName: row.full_name, email: row.email, locale: row.locale, reportJson: row.report_json, inputJson: row.input_json, createdAt: new Date(), agentId: "agent-1" } : null;
      },
    },
  });
  setNextAuthSession({ user: { id: "admin-1", email: "admin@example.test", role: "ADMIN" } });
  const { GET: leadPdf } = await import("../app/api/agent/lead/[id]/pdf/route");
  for (const id of ["t491", "tnot", "old"]) {
    for (const locale of LOCALES) {
      const leadId = `${id}-${locale}`;
      const res = await leadPdf(new Request(`http://localhost/api/agent/lead/${leadId}/pdf`), { params: Promise.resolve({ id: leadId }) });
      if (res.status !== 200) {
        check(false, `${leadId}: lead PDF HTTP ${res.status}`);
        continue;
      }
      const text = await textOf(new Uint8Array(await res.arrayBuffer()));
      check(!OLD_STRUCTURE[locale].test(text) && squash(text).includes(squash(NEW_TITLE[locale])), `${leadId}: the lead PDF is the information-first report (agent label on top)`, (OLD_STRUCTURE[locale].exec(text) ?? [""])[0]);
    }
  }
  signOutAll();

  console.log("\n4. source guards");
  const gen = readFileSync("lib/readiness/generate-pdf.ts", "utf8");
  check(/const useRestructuredReport = !report\.partnerSponsorshipAssessment && report\.country !== "CA";/.test(gen), "the drawer is chosen by the report only (not a mode or a flag): every AU skilled report uses the information-first drawer");
  check(!/READINESS_REPORT_MODE|readinessReportMode|CANADA_REPORT|_ENABLED/.test(gen) && !/READINESS_REPORT_MODE|readinessReportMode/.test(readFileSync("lib/reports/report-view.ts", "utf8") + readFileSync("lib/readiness/pdf-report-v2.ts", "utf8")), "no mode or flag can select another drawer or view");
  const callers = walk("app").concat(walk("lib"), walk("src")).filter((f) => /generateReadinessPDF\(/.test(readFileSync(f, "utf8")) && !f.endsWith("generate-pdf.ts"));
  check(callers.every((f) => /report-service\.ts$|agent[\\/]lead[\\/]\[id\][\\/]pdf[\\/]route\.ts$/.test(f)) && callers.length === 2, "only two callers build the PDF (the report service for customers, the agent lead route)", callers.join(", "));
  const service = readFileSync("lib/services/report-service.ts", "utf8");
  check(!/attachments\s*:/.test(service) && !/pdf_bytes|pdfBytes.*INSERT|UPDATE.*pdf_data|put\(|uploadPdf|blob/i.test(service.replace(/\/\/.*$/gm, "")), "no PDF is stored and none is attached to an email: every download is rendered by the current code");
  check(/refreshStoredReport/.test(service) && /refreshStoredReport/.test(readFileSync("app/api/agent/lead/[id]/pdf/route.ts", "utf8")), "every route refreshes a stored report with the current engine first");
  const oldTitle = /Your verdict|Your next 3 actions|States you can use|Visa by visa|The fastest way to close the gap|Your Verdict/;
  const offenders = walk("lib").concat(walk("app"), walk("components")).filter((f) => oldTitle.test(readFileSync(f, "utf8").replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "")));
  check(offenders.length === 0, "no module defines the old section titles", offenders.join(", "));
  check(/"X-Report-Structure": "information-first"/.test(readFileSync("app/api/reports/[reportId]/pdf/route.ts", "utf8")) && /reportStructure: "information-first"/.test(readFileSync("app/api/version/route.ts", "utf8")), "the PDF route and /api/version say which structure the build renders (live check)");
  const form = readFileSync("app/[locale]/(main)/full-check/full-check-waitlist-form.tsx", "utf8");
  check(/window\.location\.assign\(`\/\$\{locale\}\/full-check\/result\?reportId=/.test(form) && /view-report-on-screen/.test(form), "after the unlock the creating browser is taken to its report on screen (result page) and has a link to it");

  if (failures) { console.error(`\n❌ ${failures} check(s) failed`); process.exit(1); }
  console.log("\n✅ ALL CHECKS PASSED");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
