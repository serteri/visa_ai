/**
 * Five fixes in the information report (en / tr / zh-Hans), each tested where it shows:
 *
 *   1. one disclaimer: the new sentence on the cover and in the footer of every page of the PDF and at the end of the result page; the old
 *      "automated data analysis ... strategic planning and visa applications ... MARA" text is nowhere (engine, PDF, view);
 *   2. no "High -" (or any severity) label on a cost item, e.g. the second-instalment charge;
 *   3. target "Not sure": no 189-only "Estimated total" lines (nor the partner / second-instalment lines); the per-subclass sums table stays;
 *   4. "At least 65 points": the calculated total from the entries ("70 from your entries; ... not assessed"), status Provided;
 *   5. subclass 485 "eligible degree awarded in the last 6 months": the form does not collect the award date: status Cannot determine.
 *
 *   npx tsx scripts/test-report-fixes.ts
 */
import "./lib/stub-request-context";

process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://u:p@localhost:5432/d?sslmode=disable"; // never connects

import { PDFParse } from "pdf-parse";

import type { ReadinessInput, ReadinessReport } from "../lib/readiness/types";
import { REPORT_DISCLAIMER, reportDisclaimer } from "../lib/reports/report-disclaimer";
import { buildReportView, type ReportView } from "../lib/reports/report-view";
import { sectionStrings } from "../lib/reports/report-blocks";
import { runReadinessEngine } from "../src/lib/readiness-engine";
import { REVIEW_PERSONAS, renderPersonaPdfTexts } from "./render-persona-pdfs";

let failures = 0;
const t = (label: string, cond: boolean, detail = "") => {
  if (cond) console.log(`  ✅ ${label}`);
  else {
    failures++;
    console.error(`  ❌ ${label}${detail ? ` -- ${detail}` : ""}`);
  }
};
const squash = (s: string) => s.replace(/\s+/g, "");
const LOCALES = ["en", "tr", "zh-Hans"] as const;
const OLD_DISCLAIMER = /automated data analysis|otomatik bir veri analizidir|自动化数据分析|strategic planning|签证策略规划/i;
const SEVERITY = /^\s*(?:High|Medium|Low|Yüksek|Orta|Düşük|高|中|低)\s*[-–—]\s/;

const view = (input: ReadinessInput, locale: (typeof LOCALES)[number], target: string): { v: ReportView; report: ReadinessReport } => {
  const full = { ...input, locale, targetVisa: target, preferredPathway: target === "not_sure" ? undefined : target } as ReadinessInput;
  const report = runReadinessEngine(full);
  return { v: buildReportView({ report, locale, profile: { name: "Test Persona", occupation: full.occupation, occupationRaw: full.occupation, englishLevel: full.englishLevel }, dateText: "" }), report };
};
const blocks = (v: ReportView, id: string) => v.sections.find((s) => s.id === id)?.blocks ?? [];
const reqRows = (v: ReportView, titleNeedle: string) => {
  const vb = blocks(v, "visas");
  const i = vb.findIndex((b) => b.kind === "heading" && b.text.includes(titleNeedle));
  const tbl = vb[i + 2];
  return tbl?.kind === "table" ? tbl.rows : [];
};

async function main() {
  console.log("1. one disclaimer");
  const base = REVIEW_PERSONAS["ref-xyz-qld"];
  const pages = new Map<string, string[]>();
  const rendered = await renderPersonaPdfTexts({ d: { ...base, targetVisa: "491", preferredPathway: "491" } as ReadinessInput }, LOCALES, undefined, undefined, (_id, loc, bytes) => {
    pages.set(loc, [bytes as unknown as string] as unknown as string[]);
    (pages as unknown as Map<string, Uint8Array>).set(loc, bytes);
  });
  for (const r of rendered) {
    const L = r.locale;
    const bytes = (pages as unknown as Map<string, Uint8Array>).get(L)!;
    const parser = new PDFParse({ data: bytes.slice() });
    const perPage = (await parser.getText()).pages.map((p: { text: string }) => squash(p.text));
    await parser.destroy();
    const sentence = squash(reportDisclaimer(L));
    t(`[${L}] the cover and every following page carry the disclaimer`, perPage.length >= 14 && perPage.every((p, i) => p.includes(sentence) || (i === 0 && p.includes(sentence.slice(0, 40)))), `${perPage.filter((p) => !p.includes(sentence)).length} page(s) without it of ${perPage.length}`);
    t(`[${L}] the old footer text is gone`, !OLD_DISCLAIMER.test(r.text));
    const rep = r.report as ReadinessReport;
    t(`[${L}] the engine's own disclaimer is the new sentence`, rep.disclaimer === reportDisclaimer(L));
    const v = buildReportView({ report: rep, locale: L, profile: { name: "T", occupation: base.occupation, occupationRaw: base.occupation }, dateText: "" });
    t(`[${L}] the view: cover notice = disclaimer = the new sentence; the old text is in no section`, v.cover.notice === REPORT_DISCLAIMER[L] && v.disclaimer === REPORT_DISCLAIMER[L] && !v.sections.flatMap(sectionStrings).some((s) => OLD_DISCLAIMER.test(s)));
  }

  console.log("\n2-5. cost items, Not sure, points requirement, 485 award date");
  let sawSeverityItem = 0;
  let sawNotAssessed = 0;
  for (const [pid, persona] of Object.entries(REVIEW_PERSONAS)) {
    for (const L of LOCALES) {
      // 2. no severity label (a partnered profile has the second-instalment item)
      const { v, report } = view(persona, L, "189");
      if (report.financialRoadmap.some((i) => SEVERITY.test(i.category))) sawSeverityItem++;
      const costStrings = v.sections.find((s) => s.id === "costs")!.blocks.flatMap((b) => (b.kind === "table" ? b.rows.map((r) => r[0]) : b.kind === "text" ? [b.text] : []));
      t(`[${pid} ${L}] no severity prefix on any cost item`, !costStrings.some((s) => SEVERITY.test(s)), costStrings.find((s) => SEVERITY.test(s)) ?? "");

      // 3. totals lines
      const totalText = /Estimated total|Tahmini toplam|预计总计|Possible additional charge|Olası ek ücret|可能产生的额外费用/;
      const costTexts = (x: ReportView) => x.sections.find((s) => s.id === "costs")!.blocks.flatMap((b) => (b.kind === "text" ? [b.text] : []));
      const ns = view(persona, L, "not_sure").v;
      const sumsRows = ns.sections.find((s) => s.id === "costs")!.blocks.filter((b) => b.kind === "table").at(-1);
      t(`[${pid} ${L}] Not sure: no estimated-total / second-instalment lines, the per-subclass sums stay`, !costTexts(ns).some((s) => totalText.test(s)) && sumsRows?.kind === "table" && sumsRows.rows.length === 9);
      if (report.financialRoadmap.length > 0) t(`[${pid} ${L}] a selected visa keeps its estimated total line`, costTexts(v).some((s) => totalText.test(s)));

      // 4. points requirement
      const pe = report.pointsEstimate;
      for (const sub of ["189", "190", "491"]) {
        const row = reqRows(view(persona, L, sub).v, `(subclass ${sub})`).concat(reqRows(view(persona, L, sub).v, `${sub} 子类`)).find((r) => /65/.test(r[0]) || /puan|points|积分|分/i.test(r[0]));
        if (!pe || typeof pe.estimatedPoints !== "number" || !row) continue;
        const notAssessed = (pe.breakdown ?? []).filter((b) => b.status === "not_assessed");
        if (notAssessed.length) sawNotAssessed++;
        const from = L === "tr" ? "girdiklerinizden" : L === "zh-Hans" ? "根据您的填写" : "from your entries";
        t(`[${pid} ${L}] ${sub}: the points requirement shows "${pe.estimatedPoints} ${from}${notAssessed.length ? "; ... not assessed" : ""}" with status Provided`, row[1].startsWith(`${pe.estimatedPoints} ${from}`) && (notAssessed.length === 0 || row[1].includes(notAssessed[0].label)) && row[3] === { en: "Provided", tr: "Girildi", "zh-Hans": "已提供" }[L], row.join(" | "));
      }

      // 5. 485 award date
      const r485 = reqRows(view(persona, L, "485").v, "(subclass 485)").concat(reqRows(view(persona, L, "485").v, "485 子类")).find((r) => /6 months|6 ay|6 个月/.test(r[0]) || /eligible degree|uygun.*derece|合资格学历/i.test(r[0]));
      t(`[${pid} ${L}] 485 eligible degree (award date): status Cannot determine, the missing date is stated`, !!r485 && r485[3] === { en: "Cannot determine", tr: "Belirlenemiyor", "zh-Hans": "无法判断" }[L] && /not collected|toplanmıyor|未收集/.test(r485[1]), r485?.join(" | ") ?? "row not found");
    }
  }
  t("the profiles exercised an item with a severity prefix (partnered, second instalment)", sawSeverityItem > 0, String(sawSeverityItem));
  t("the profiles exercised a not-assessed factor in the points total", sawNotAssessed > 0, String(sawNotAssessed));

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
