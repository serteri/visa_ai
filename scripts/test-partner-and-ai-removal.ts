/**
 * Item 2: the partner report does not score or comment on the genuineness of a relationship and does not tell the
 * visitor to prepare statutory declarations / other evidence; the AI strategy layer is gone from the report.
 *
 *   npx tsx scripts/test-partner-and-ai-removal.ts      (real engine + real PDF route; no database, no network)
 */
import "./lib/stub-request-context";

import { readFileSync } from "node:fs";

process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/d?sslmode=disable"; // never connects

import type { Locale, ReadinessInput } from "../lib/readiness/types";
import { runReadinessEngine } from "../src/lib/readiness-engine";
import { renderPersonaPdfTexts } from "./render-persona-pdfs";

let failures = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  if (cond) console.log(`  ✅ ${msg}`);
  else {
    failures++;
    console.error(`  ❌ ${msg}${detail ? ` -- ${detail}` : ""}`);
  }
};
const LOCALES: Locale[] = ["en", "tr", "zh-Hans"];

const partner: ReadinessInput = {
  locale: "en", country: "AU", currentCountry: "AU", passportCountry: "TR", age: "31", occupation: "Software Engineer 261313",
  englishLevel: "superior", qualificationLevel: "Bachelor's Degree", preferredPathway: "820_801",
  sponsorOrFamily: "Relation: married | Duration: 12_to_24_months | Sponsor: citizen | Prev Sponsor: yes_within_5_years | Evidence: marriage_cert, joint_bank",
};

const FORBIDDEN = /signal strength|genuine relationship|genuineness|statutory declaration|Form 888|Evidence Strength|kanıt gücü|kanıt sinyali|gerçekliğini|beyan(?:ları)?\s*\(Form|关系证明信号|真实关系|关系声明书|证明强度|Start collecting|toplamaya başlayın|收集共同账单|Recommended Next Steps|Önerilen Sonraki Adımlar|推荐执行步骤|Premium AI|AI Strategy|Yapay Zek.{0,12}Strateji|AI 策略/i;

async function main() {
  console.log("1. engine output (partner AU, previous sponsorship entered)");
  for (const locale of LOCALES) {
    const r = runReadinessEngine({ ...partner, locale });
    const a = r.partnerSponsorshipAssessment as Record<string, unknown>;
    check(!("relationshipSignalStrength" in a) && !("recommendedNextSteps" in a), `${locale}: no relationship score and no recommended steps on the assessment`);
    const blob = JSON.stringify(r);
    check(!FORBIDDEN.test(blob), `${locale}: report JSON has no genuineness / declaration / next-step wording`, (blob.match(FORBIDDEN) ?? [""])[0]);
    check(r.suggestedNextSteps.length === 0 && r.premiumSections.strategicGanttChart.steps.length === 0, `${locale}: no next steps, no dated plan`);
    check(r.aiStrategy === undefined, `${locale}: no AI strategy on the report`);
  }

  console.log("\n2. real PDFs");
  const out = await renderPersonaPdfTexts({ partnerAU: partner }, LOCALES, undefined, undefined, (id, locale, bytes) => {
    if (process.env.PDF_DIR) require("node:fs").writeFileSync(`${process.env.PDF_DIR}/${id}-${locale}.pdf`, bytes);
  });
  for (const o of out) {
    check(!FORBIDDEN.test(o.text), `${o.locale}: partner PDF has none of the removed wording`, (o.text.match(FORBIDDEN) ?? [""])[0]);
    check(/820/.test(o.text), `${o.locale}: partner PDF still renders (820/801)`);
  }

  console.log("\n3. AI strategy is not generated, rendered or carried");
  const actions = readFileSync("app/[locale]/(main)/full-check/actions.ts", "utf8");
  const pdf = readFileSync("lib/readiness/generate-pdf.ts", "utf8");
  const refresh = readFileSync("lib/reports/refresh-report.ts", "utf8");
  check(!/generatePremiumStrategy|retrieveVisaContext|retrieveStateContext|\.aiStrategy\s*=/.test(actions), "intake action does not call the AI strategy / RAG");
  check(!/renderAiStrategySection|report\.aiStrategy/.test(pdf), "PDF generator has no AI strategy section");
  check(!/aiStrategy:\s*stored\.aiStrategy/.test(refresh), "refresh does not carry a stored AI strategy forward");

  if (failures) {
    console.error(`\n❌ ${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\n✅ ALL CHECKS PASSED");
}
main().catch((e) => { console.error(e); process.exit(1); });
