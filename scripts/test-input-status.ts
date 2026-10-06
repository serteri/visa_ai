/**
 * Data defects (item 1): what the visitor did not tell us is never turned into an answer, a zero or a status.
 *
 *   1. Skills assessment: no default selection in the form; an unanswered question is stored as unknown ("") -- never "no".
 *   2. Missing employment: "Employment points not assessed", never "0 years" / "Claimed Experience: 0 Years"; an explicit
 *      0 is still a calculated 0. The points ARITHMETIC is unchanged (same totals as before).
 *   3. Partner: "no Functional English" (a stated answer) is separate from "unknown" (not provided).
 *   4. Evidence: a form field is "Information entered", never "Provided"; the note says no documents were reviewed.
 *   5. Real generated PDFs in en / tr / zh-Hans carry the same distinctions.
 *
 * Real engine, form source and PDF route; no database, no network.   npx tsx scripts/test-input-status.ts
 */
import "./lib/stub-request-context";

import { readFileSync } from "node:fs";

process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/d?sslmode=disable"; // never connects

import { resolveSkillsAssessmentAnswer } from "../lib/intake/fields";
import { buildInputStatus, partnerAnswerOf, skillsAssessmentAnswerOf } from "../lib/readiness/input-status";
import type { Locale, ReadinessInput } from "../lib/readiness/types";
import { evidenceStatusLabel, noDocumentsReviewedNote } from "../src/lib/readiness/localization";
import { runReadinessEngine } from "../src/lib/readiness-engine";
import { REVIEW_PERSONAS, renderPersonaPdfTexts } from "./render-persona-pdfs";

let failures = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  if (cond) console.log(`  ✅ ${msg}`);
  else {
    failures++;
    console.error(`  ❌ ${msg}${detail ? ` -- ${detail}` : ""}`);
  }
};
const LOCALES: Locale[] = ["en", "tr", "zh-Hans"];
const NOT_ASSESSED: Record<Locale, RegExp> = { en: /not assessed/i, tr: /değerlendirilmedi/i, "zh-Hans": /未评估/ };

const base: ReadinessInput = { locale: "en", country: "AU", currentCountry: "AU", passportCountry: "TR", age: "30", occupation: "Software Engineer 261313", englishLevel: "superior", qualificationLevel: "Bachelor's Degree", residenceState: "WA", preferredPathway: "491" };

async function main() {
  console.log("1. skills assessment: no default, unknown is not \"no\"");
  check(resolveSkillsAssessmentAnswer(undefined, undefined) === "" && resolveSkillsAssessmentAnswer("", "") === "" && resolveSkillsAssessmentAnswer(null, "maybe") === "", "unanswered (radio blank, select blank or junk) -> \"\" (unknown)");
  check(resolveSkillsAssessmentAnswer("yes", "no") === "yes" && resolveSkillsAssessmentAnswer("no", "yes") === "no", "an explicit radio answer wins");
  check(resolveSkillsAssessmentAnswer("", "yes") === "yes" && resolveSkillsAssessmentAnswer("", "no") === "no", "the older select is used only when the radio is unanswered");
  check(skillsAssessmentAnswerOf({}) === "unknown" && skillsAssessmentAnswerOf({ occupationConfirmed: "" }) === "unknown" && skillsAssessmentAnswerOf({ occupationConfirmed: "no" }) === "no" && skillsAssessmentAnswerOf({ occupationConfirmed: "YES" }) === "yes", "the engine's answer: yes / no / unknown");
  const form = readFileSync("app/[locale]/(main)/full-check/full-check-waitlist-form.tsx", "utf8");
  const step2 = readFileSync("app/[locale]/(main)/full-check/step-2-career.tsx", "utf8");
  check(/useState\(""\);\s*\n\s*const \[occupationConfirmedSel/.test(form) && !/useState\("no"\)/.test(form.slice(form.indexOf("const [skillsAssessment"), form.indexOf("const [skillsAssessment") + 200)), "the form's skills-assessment state starts empty (no default selection)");
  check(/value="no" checked=\{props\.skillsAssessment === "no"\}/.test(step2) && /value="yes" checked=\{props\.skillsAssessment === "yes"\}/.test(step2) && !/type="hidden" name="skillsAssessment"/.test(step2), "each radio is checked only by its own explicit answer; no hidden \"no\" is posted");
  const actions = readFileSync("app/[locale]/(main)/full-check/actions.ts", "utf8");
  check(/resolveSkillsAssessmentAnswer\(formData\.get\("skillsAssessment"\), formData\.get\("occupationConfirmed"\)\)/.test(actions) && !/occupationConfirmedRaw = skillsAssessmentDone \? "yes" : "no"/.test(actions), "the server stores only an explicit answer");

  console.log("\n2. employment: not assessed, never 0 years; arithmetic unchanged");
  for (const locale of LOCALES) {
    const unknown = runReadinessEngine({ ...base, locale });
    const row = (r: typeof unknown, kind: "Overseas" | "Australian" | "Yurt" | "Avustralya" | "海外" | "澳大利亚") => r.pointsEstimate!.breakdown.find((b) => b.label.includes(kind));
    const off = row(unknown, locale === "en" ? "Overseas" : locale === "tr" ? "Yurt" : "海外")!;
    const on = row(unknown, locale === "en" ? "Australian" : locale === "tr" ? "Avustralya" : "澳大利亚")!;
    check(off.status === "not_assessed" && on.status === "not_assessed" && NOT_ASSESSED[locale].test(off.note ?? "") && NOT_ASSESSED[locale].test(on.note ?? ""), `${locale}: both employment rows are "not assessed" with the localised note`, `${off.note} | ${on.note}`);
    check(!/0 yrs|0 yıl|0年|Claimed Experience|Beyan Edilen|申报经验/.test(`${off.label} ${off.note} ${on.label} ${on.note}`), `${locale}: no "0 years" claim`);
    check(NOT_ASSESSED[locale].test(unknown.pointsEstimate!.note), `${locale}: the points note says not-assessed factors are not in the total`);
    const explicitZero = runReadinessEngine({ ...base, locale, offshoreExperienceYears: 0, onshoreExperienceYears: 0 });
    const zeroRow = row(explicitZero, locale === "en" ? "Overseas" : locale === "tr" ? "Yurt" : "海外")!;
    check(zeroRow.status === "calculated" && !NOT_ASSESSED[locale].test(zeroRow.note ?? ""), `${locale}: an explicit 0 is still a calculated 0`);
    check(unknown.pointsEstimate!.estimatedPoints === explicitZero.pointsEstimate!.estimatedPoints && unknown.pointsEstimate!.potentialPoints === explicitZero.pointsEstimate!.potentialPoints, `${locale}: the points arithmetic is unchanged (${unknown.pointsEstimate!.estimatedPoints} / ${unknown.pointsEstimate!.potentialPoints})`);
  }
  // The repository's reference persona totalled 50 points (70 with a positive skills assessment) before this change.
  const refPersona = REVIEW_PERSONAS["reference-se-au"];
  const ref = runReadinessEngine(refPersona);
  check(ref.pointsEstimate!.estimatedPoints === 50 && ref.pointsEstimate!.potentialPoints === 70, "the reference persona still totals 50 points (70 potential)", `${ref.pointsEstimate!.estimatedPoints} / ${ref.pointsEstimate!.potentialPoints}`);

  console.log("\n3. partner: no Functional English vs unknown");
  check(partnerAnswerOf("Partner / Dependants WITHOUT Functional English") === "no_functional_english" && partnerAnswerOf("") === "unknown" && partnerAnswerOf(undefined) === "unknown" && partnerAnswerOf("Not provided") === "unknown" && partnerAnswerOf("Single / No Dependants") === "single", "partner answers are distinct");
  for (const locale of LOCALES) {
    const no = runReadinessEngine({ ...base, locale, sponsorOrFamily: "Partner / Dependants WITHOUT Functional English" });
    const unk = runReadinessEngine({ ...base, locale });
    const prow = (r: typeof no) => r.pointsEstimate!.breakdown.find((b) => /Partner|伴侣/.test(b.label))!;
    check(prow(no).status === "calculated" && prow(unk).status === "not_assessed" && prow(no).note !== prow(unk).note, `${locale}: "no Functional English" is a calculated 0, "unknown" is not assessed (different wording)`, `${prow(no).note} | ${prow(unk).note}`);
    check(locale !== "en" || /user reported no Functional English/.test(prow(no).note ?? ""), `${locale}: the stated answer is attributed to the user`);
    check(no.assessmentState.inputStatus?.partner === "no_functional_english" && unk.assessmentState.inputStatus?.partner === "unknown", `${locale}: assessmentState.inputStatus carries it`);
    check(prow(no).points === prow(unk).points, `${locale}: same partner points either way (arithmetic unchanged)`);
  }

  console.log("\n4. evidence: information entered, no documents reviewed");
  for (const locale of LOCALES) {
    const provided = evidenceStatusLabel(locale, "provided");
    check(!/^(Provided|Sağlandı|已提供)$/.test(provided) && (locale === "en" ? /entered/i : locale === "tr" ? /girildi/i : /已填写/).test(provided), `${locale}: "provided" is shown as "${provided}"`);
    check((locale === "en" ? /No documents/ : locale === "tr" ? /belge/ : /文件/).test(noDocumentsReviewedNote(locale)), `${locale}: the no-documents-reviewed note exists`);
  }
  const unknownStatus = buildInputStatus(base);
  check(unknownStatus.skillsAssessment === "unknown" && unknownStatus.overseasEmployment === "not_entered" && unknownStatus.partner === "unknown" && unknownStatus.english === "entered", "buildInputStatus reflects only what was entered");

  console.log("\n5. real PDFs (en / tr / zh-Hans)");
  const personas: Record<string, ReadinessInput> = {
    "unknown-all": { ...base },
    "answered-zero": { ...base, occupationConfirmed: "no", offshoreExperienceYears: 0, onshoreExperienceYears: 0, sponsorOrFamily: "Single / No Dependants" },
    "no-func-eng": { ...base, occupationConfirmed: "no", sponsorOrFamily: "Partner / Dependants WITHOUT Functional English" },
  };
  const out = await renderPersonaPdfTexts(personas, LOCALES);
  for (const locale of LOCALES) {
    const t = (id: string) => out.find((o) => o.id === id && o.locale === locale)!.text.replace(/\s+/g, " ");
    check(NOT_ASSESSED[locale].test(t("unknown-all")) && !/\b0 yrs\b|\b0 yıl|(?<![\d.])0\s?年|Claimed Experience|Beyan Edilen|申报经验|assumes zero|Not Done|Yapılmadı/.test(t("unknown-all")), `${locale} PDF: unknown profile says "not assessed", no 0 years / "Not Done"`);
    check(locale === "en" ? /0 yrs/.test(t("answered-zero")) : locale === "tr" ? /0 yıl/.test(t("answered-zero")) : /(?<![\d.])0\s?年/.test(t("answered-zero")), `${locale} PDF: an explicit 0 is shown as 0 years`);
    check(locale === "en" ? /user reported no Functional English/.test(t("no-func-eng")) : locale === "tr" ? /Functional English olmadığını bildirdi/.test(t("no-func-eng")) : /用户报告伴侣没有 Functional English/.test(t("no-func-eng")), `${locale} PDF: the partner answer is attributed to the user`);
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nAll checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
