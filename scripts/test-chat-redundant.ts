/**
 * Final chat fix:
 *   1. a correction whose key figures the answer already states for the same subclass (prose, bullets, table, any
 *      language) is not shown, only logged as redundant;
 *   2. a statement about subclass 191 cites the 191 document, never a state document.
 */
import "./lib/stub-request-context";

process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/d?sslmode=disable"; // never connects

import { alignCitationsToSubclass, renderCitations } from "../lib/chat/citations";
import { buildCorrections, dropRedundant, numbersIn, sectionAbout } from "../lib/chat/corrections";
import { findEngineConflicts } from "../lib/chat/answer-check";
import { buildPlanSummary } from "../lib/chat/plan-summary";
import { quickProfileToInput } from "../lib/chat/quick-profile";
import type { Locale, ReadinessReport } from "../lib/readiness/types";
import type { SourceRef } from "../lib/chat/types";
import { runReadinessEngine } from "../src/lib/readiness-engine";
import type { EngineConflict } from "../lib/chat/answer-check";

let failures = 0;
const t = (label: string, cond: boolean, detail = "") => {
  if (cond) console.log(`  ✅ ${label}`);
  else {
    failures++;
    console.error(`  ❌ ${label}${detail ? ` -- ${detail}` : ""}`);
  }
};
const section = (s: string) => console.log(`\n==================== ${s} ====================`);

const PERSONA = { age: "28", occupation: "261313", englishLevel: "proficient", qualificationLevel: "Bachelor's Degree", qualificationAwardedInAustralia: "no", skillsAssessment: "no", currentCountry: "AU", residenceState: "VIC", currentVisa: "500" };
const plan = (l: Locale) => {
  const input = quickProfileToInput(PERSONA as never, l);
  const report = JSON.parse(JSON.stringify(runReadinessEngine(input))) as ReadinessReport;
  return buildPlanSummary(report, JSON.parse(JSON.stringify(input)), l)!.facts;
};
const conflict = (kind: EngineConflict["kind"], subclasses: string[]): EngineConflict => ({ kind, sentence: "", detail: "", subclasses });

async function main() {
  section("1. redundant corrections");
  const facts = plan("zh-Hans");
  t("the engine: 190 is 60 with the nomination, 5 short of 65, 25 below the recent level of 85", facts.benchmarks?.["190"]?.total === 60 && facts.benchmarks?.["190"]?.benchmark === 85);

  const zhBullets = "**190（州担保）**\n- 目前分数：55分\n- 州政府提名分数加成：+5（达到60分）\n- 与最低递交分数差距：5分\n- 与近期邀请分数差距：25分\n\n需要先完成技能评估。";
  for (const kind of ["gap_figure", "benchmark_sufficiency"] as const) {
    const corr = buildCorrections([conflict(kind, ["190"])], "zh-Hans", { plan: facts });
    const { kept, redundant } = dropRedundant(corr, zhBullets);
    t(`zh bullet list: a ${kind} correction for 190 is redundant (60, 5, 25 all stated)`, corr.length === 1 && kept.length === 0 && redundant.length === 1, JSON.stringify(corr[0]?.figures));
  }
  t("the gap correction's key figures are 60, 5 and 25", JSON.stringify(buildCorrections([conflict("gap_figure", ["190"])], "zh-Hans", { plan: facts })[0].figures) === "[60,5,25]");

  const prose: Record<Locale, string> = {
    en: "Subclass 190: your score with the nomination is 60, which is 5 short of the 65 minimum and 25 below the recent invitation level of 85.",
    tr: "190 alt sınıfı: adaylık dahil puanınız 60; 65 asgari puanın 5 altında, son davet seviyesi 85'in 25 puan altında.",
    "zh-Hans": "190：含提名共60分，距65分差5分，比近期邀请分数（85分）低25分。",
  };
  for (const l of ["en", "tr", "zh-Hans"] as Locale[]) {
    const corr = buildCorrections([conflict("gap_figure", ["190"])], l, { plan: plan(l) });
    t(`${l}: prose with the same figures is redundant`, dropRedundant(corr, prose[l]).redundant.length === 1);
  }
  const table = "| Subclass | Score | Short of 65 | Below recent level |\n|---|---|---|---|\n| 190 | 60 | 5 | 25 |\n| 491 | 70 | 0 | 5 |";
  t("a table row for the subclass counts", dropRedundant(buildCorrections([conflict("gap_figure", ["190"])], "en", { plan: plan("en") }), table).redundant.length === 1);

  const missing = "**190（州担保）**\n- 目前分数：55分\n- 与最低递交分数差距：5分\n\n**189**\n- 与近期邀请分数差距：25分，目前60分";
  t("a figure missing from the 190 section keeps the correction (25 and 60 appear only under 189)", dropRedundant(buildCorrections([conflict("gap_figure", ["190"])], "zh-Hans", { plan: facts }), missing).kept.length === 1);
  t("the same figures under ANOTHER subclass do not count", dropRedundant(buildCorrections([conflict("gap_figure", ["190"])], "en", { plan: plan("en") }), "Subclass 189: 60, 5 short, 25 below.\nSubclass 190 needs a nomination.").kept.length === 1);

  const fee = buildCorrections([conflict("fee", ["491"])], "en", {});
  t("a fee correction: the charge written as 6,140 / 6.140 / 6140 / AUD 6 140 in any layout is stated", fee.length === 1 && ["Subclass 491 costs AUD 6,140.", "491 vizesi ücreti: 6.140 AUD", "| 491 | 6140 |", "491签证费用：6140澳元"].every((a) => dropRedundant(fee, a).redundant.length === 1), JSON.stringify(fee[0]?.figures));
  t("a different fee keeps the correction", dropRedundant(fee, "Subclass 491 costs AUD 4,000.").kept.length === 1);
  t("a correction without key figures (state condition, residence...) is never redundant", dropRedundant(buildCorrections([{ kind: "state_condition", sentence: "", detail: "", subclasses: ["190"] }], "en", {}), "190 WA six months contract").kept.length === 1);
  t("numbersIn reads any format", [...numbersIn("+5（达到60分）, AUD 6,140, 6.140, 25 puan")].sort((a, b) => a - b).join() === "5,25,60,6140");
  t("sectionAbout: the heading line and its bullets, until another subclass is named", sectionAbout(zhBullets, "190").includes("25分") && !sectionAbout("189:\n- 99分\n190:\n- 60分", "190").includes("99"));

  // End to end: the answer carries a real "enough" claim; its figures are all stated, so no correction block is appended.
  const answer = `${zhBullets}\n\n190的分数足够了。`;
  const opts = { hasProfile: true, benchmarks: facts.benchmarks, currentTotals: facts.currentTotals, ceiling: facts.ceiling };
  const conflicts = findEngineConflicts(answer, opts);
  const built = buildCorrections(conflicts, "zh-Hans", { plan: facts });
  t("the conflict exists (an 'enough' claim for 190) but its correction is redundant", conflicts.some((c) => c.kind === "benchmark_sufficiency") && built.length > 0 && dropRedundant(built, answer).kept.length === 0, JSON.stringify(conflicts.map((c) => c.kind)));

  section("2. 191 cites the 191 document, never a state document");
  const refs: SourceRef[] = [
    { id: "S1", source: "Permanent Residence (Skilled Regional) visa (subclass 191).pdf", page: 3, title: "Home Affairs – Permanent Residence (Skilled Regional) visa (Subclass 191)" },
    { id: "S2", source: "Queensland Skilled visa options.pdf", page: 4, title: "Queensland – Skilled visa options" },
    { id: "S3", source: "Subclass 491 Skilled Work Regional (Provisional) visa - Main applicant.pdf", page: 10 },
    { id: "S4", source: "Western Australia WASMOL Schedule 1.pdf", page: 2, title: "Western Australia – WASMOL" },
  ];
  const state = "Subclass 191 needs 3 years in a designated regional area [S2].";
  t("a 191 statement tagged with a state document is moved to the 191 document", alignCitationsToSubclass(state, refs) === "Subclass 191 needs 3 years in a designated regional area [S1].");
  t("rendered, the citation names the 191 document and no state document", /\[Home Affairs – Permanent Residence \(Skilled Regional\) visa \(Subclass 191\), p\. 3\]/.test(renderCitations(state, refs)) && !renderCitations(state, refs).includes("Queensland"));
  t("without a retrieved 191 document the state citation is dropped", alignCitationsToSubclass(state, [refs[1], refs[2]]) === "Subclass 191 needs 3 years in a designated regional area .");
  t("Turkish and Chinese 191 statements follow the same rule", alignCitationsToSubclass("191 için 3 yıl bölgesel ikamet gerekir [S4].", refs) === "191 için 3 yıl bölgesel ikamet gerekir [S1]." && alignCitationsToSubclass("191 需要在指定地区居住3年 [S2]。", refs) === "191 需要在指定地区居住3年 [S1]。");
  t("a marker after the full stop and a bulleted 191 line are covered", alignCitationsToSubclass("Subclass 191 needs 3 years. [S2]", refs) === "Subclass 191 needs 3 years. [S1]" && alignCitationsToSubclass("- Subclass 191: ATO notices for 3 years [S4]", refs) === "- Subclass 191: ATO notices for 3 years [S1]");
  t("a statement about a state (no 191) may still cite the state document", alignCitationsToSubclass("Queensland lists this occupation [S2].", refs) === "Queensland lists this occupation [S2].");
  t("a sentence about 191 and 491 may cite the 491 document", alignCitationsToSubclass("The 191 follows a 491 after 3 years [S3].", refs) === "The 191 follows a 491 after 3 years [S3].");
  t("the 191 document itself stays", alignCitationsToSubclass(state.replace("S2", "S1"), refs) === state.replace("S2", "S1"));

  if (failures) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nAll redundancy / 191 citation checks passed");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
