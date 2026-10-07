/**
 * Follow-up to 093b656 and the three new intake fields.
 *
 *   A1. The body's "below points threshold" uses the gate arithmetic: persona 6 (no English test) is "Next step
 *       required" everywhere -- no section says "below the threshold" for a pathway the gate says has a next step
 *       (engine + real PDF text, en / tr / zh-Hans).
 *   A2. Points steps say how the gap closes and roughly how long it takes, naming only factors of the closable
 *       ceiling, and say when the plan relies on multi-year actions (en / tr / zh-Hans).
 *   B1. Employer sponsorship: none / job offer / on a 482 with 2 years -> the 482 and 186 gates; "no sponsor" is a
 *       next step ("find an employer willing to sponsor you"), never structural.
 *   B2. Residence: an onshore Software Engineer living in QLD vs TAS -> state availability and the per-state notes
 *       (sourced rule, or "residence requirement not confirmed").
 *   B3. Application stage: Planning vs Invited -> the lodgement section above the Points Booster in real PDF text
 *       (en / tr / zh-Hans), the first next step; EOI submitted -> the EOI-update note. Eligibility never changes.
 *   B4. Older reports (b0d20f74's inputs, no new fields): the refreshed report's gate results and state availability
 *       are exactly those of 093b656.
 *   B5. The form: residence only when in Australia; sponsor years only when on a 482 / 457.
 *
 *   npx tsx scripts/test-intake-situation.tsx
 */
import { renderToStaticMarkup } from "react-dom/server";

import type { ReadinessInput, ReadinessReport } from "../lib/readiness/types";
import { runReadinessEngine } from "../src/lib/readiness-engine";
import { gateFailureKind } from "../lib/readiness/visa-gate-kinds";
import { stateResidenceRule } from "../lib/state-nomination/residence-rules";
import { REVIEW_PERSONAS, renderPersonaPdfTexts } from "./render-persona-pdfs";
import { SituationFields, situationFieldVisibility } from "../app/[locale]/(main)/full-check/situation-fields";

let failures = 0;
const t = (label: string, cond: boolean, detail = "") => {
  if (cond) console.log(`  ✅ ${label}`);
  else {
    failures++;
    console.error(`  ❌ ${label}${detail ? ` -- ${detail}` : ""}`);
  }
};
const squash = (s: string) => s.replace(/\s+/g, "");

const A: ReadinessInput = {
  locale: "en",
  country: "AU",
  mainGoal: "",
  currentCountry: "AU",
  passportCountry: "TR",
  age: "28",
  occupation: "Software Engineer (261313)",
  occupationConfirmed: "no",
  englishLevel: "superior",
  qualificationLevel: "PhD",
  qualificationAwardedInAustralia: false,
  annualSalaryAud: 45000,
  sponsorOrFamily: "Partner / Dependants WITHOUT Functional English",
  migrationGoals: ["direct_pr", "employer_sponsorship"],
  preferredPathway: "189,190,491,482,186",
};
const PERSONA6: ReadinessInput = { ...A, occupationConfirmed: "yes", englishLevel: "none", annualSalaryAud: 95000, offshoreExperienceYears: 5, sponsorOrFamily: "Single / No Dependants" };
/** Onshore Software Engineer with a skills assessment, above the CSIT, 5 years' experience. */
const ONSHORE_SE: ReadinessInput = { ...A, occupationConfirmed: "yes", annualSalaryAud: 95000, offshoreExperienceYears: 5 };

const BELOW = {
  en: ["Below Points Threshold", "Below points threshold", "below the 65-point minimum"],
  tr: ["Puan Eşiğinin Altında", "PUAN EŞİĞİNİN ALTINDA", "Puan barajının altında", "65 puan asgari şartının altında"],
  "zh-Hans": ["未达到分数门槛", "低于65分最低要求"],
} as const;

/** 093b656's gate results for b0d20f74's stored inputs (no sponsor / residence / stage fields). */
const B0D_BASELINE: Record<string, { status: string; notMet: string[]; unknown: string[] }> = {
  "186": { status: "conditional", notMet: [], unknown: ["186TRT.hold_visa", "186TRT.sponsored_employment", "186TRT.employer_nomination"] },
  "189": { status: "next_step_required", notMet: ["189.skills_assessment"], unknown: [] },
  "190": { status: "next_step_required", notMet: ["190.skills_assessment"], unknown: [] },
  "482": { status: "not_eligible_now", notMet: ["482CS.salary"], unknown: ["482CS.experience", "482CS.skills_assessment", "482CS.sponsor"] },
  "485": { status: "not_eligible_now", notMet: ["485.australian_provider"], unknown: ["485.english"] },
  "491": { status: "next_step_required", notMet: ["491.skills_assessment"], unknown: [] },
  "500": { status: "conditional", notMet: [], unknown: ["500.enrolment", "500.oshc"] },
  "820": { status: "conditional", notMet: [], unknown: ["820.relationship", "820.sponsor"] },
};
// 190 without WA: report b0d20f74 records no WA job offer, and WA's 190 General stream needs a six-month WA employment contract.
const B0D_AVAILABILITY = { "190": ["TAS", "ACT"], "491": ["WA", "TAS", "ACT"] };

const gateSnapshot = (r: ReadinessReport) =>
  Object.fromEntries(Object.entries(r.visaGates ?? {}).map(([v, g]) => [v, { status: g.status, notMet: g.notMet.map((x) => x.id), unknown: g.unknown.map((x) => x.id) }]));

async function main() {
  // Real PDF text first: this also installs the stubbed database client every later engine / refresh call reads.
  const rendered = await renderPersonaPdfTexts({
    persona6: PERSONA6,
    invited: { ...ONSHORE_SE, employerSponsorship: "none", residenceState: "QLD", applicationStage: "invited", targetVisa: "491", preferredPathway: "491" },
    planning: { ...ONSHORE_SE, employerSponsorship: "none", residenceState: "QLD", applicationStage: "planning", targetVisa: "491", preferredPathway: "491" },
    eoi: { ...ONSHORE_SE, employerSponsorship: "none", residenceState: "QLD", applicationStage: "eoi_submitted", targetVisa: "491", preferredPathway: "491" },
  });
  const pdf = (id: string, locale: string) => rendered.find((r) => r.id === id && r.locale === locale)!;

  console.log("==================== A1. below threshold = gate arithmetic (persona 6) ====================");
  for (const locale of ["en", "tr", "zh-Hans"] as const) {
    const r = runReadinessEngine({ ...PERSONA6, locale });
    const bad = (["189", "190", "491"] as const).filter((v) => {
      const p = r.pathwayComparison.find((x) => x.subclass === v);
      return r.visaGates?.[v].status === "next_step_required" && p && (p.ineligiblePointsLine !== undefined || p.relevance === "ineligible");
    });
    t(`${locale}: 189/190/491 are "Next step required" (English test) in the gates and the body; none flagged below the threshold`, (["189", "190"] as const).every((v) => r.visaGates?.[v].status === "next_step_required" && /English|İngilizce|英语/.test(r.visaGates?.[v].steps[0] ?? "")) && bad.length === 0, bad.join(","));
    t(`${locale}: no friction / strength / ranking entry is a points-threshold-only block`, !r.pathwayFriction.some((f) => f.isPointsThresholdOnly) && !r.pathwayStrengthComparison.some((s) => s.isPointsThresholdOnly) && !(r.rankedPathways ?? []).some((p) => p.isPointsThresholdOnly));
    const text = pdf("persona6", locale).text;
    const said = BELOW[locale].filter((phrase) => text.includes(phrase));
    t(`${locale}: the PDF never says "below the threshold" while 189/190 say "Next step required"`, said.length === 0, said.join(" | "));
  }
  {
    // The rule is general: a structural points gap (nothing closes it) is still below the threshold.
    const r = runReadinessEngine({ ...A, occupationConfirmed: "yes", age: "46" });
    t("age 46 (structural): still ineligible, not a next step", r.visaGates?.["189"].status === "not_eligible_now");
  }

  console.log("\n==================== A2. how the points gap closes and how long it takes ====================");
  {
    // Registered Nurse, 40, Superior English, overseas diploma, 2 years' experience, single: 45 points, 20 short for
    // 189. Superior English leaves nothing to gain on English; the quickest plan needs time.
    const nurse: ReadinessInput = { locale: "en", country: "AU", mainGoal: "", currentCountry: "IN", passportCountry: "IN", age: "40", occupation: "Registered Nurse (Medical) (254418)", occupationConfirmed: "yes", englishLevel: "superior", qualificationLevel: "Diploma", qualificationAwardedInAustralia: false, isQualificationRecognized: true, offshoreExperienceYears: 2, sponsorOrFamily: "Single / No Dependants", migrationGoals: ["direct_pr"] };
    const want = {
      en: ["from 45 to at least 65", "currently 20 short", "1 more year of skilled experience (+5)", "about 2 years", "relies on multi-year actions (skilled experience accrual"],
      tr: ["45 değerinden en az 65", "20 puan eksik", "1 yıl daha nitelikli iş deneyimi (+5)", "yaklaşık 2 yıl", "çok yıllık adımlara dayanır (nitelikli iş deneyimi birikimi"],
      "zh-Hans": ["从 45 分提高到至少 65 分", "差 20 分", "再积累 1 年技术工作经验 (+5)", "约 2 年", "依赖多年期行动（技术工作经验积累"],
    } as const;
    for (const locale of ["en", "tr", "zh-Hans"] as const) {
      const r = runReadinessEngine({ ...nurse, locale });
      const step = r.visaGates?.["189"].steps.find((s) => s.includes("45")) ?? "";
      const miss = want[locale].filter((w) => !step.includes(w));
      t(`${locale}: the step states the gap, how it closes, roughly how long and that it relies on multi-year actions`, miss.length === 0, `missing ${miss.join(" | ")} in "${step}"`);
    }
    // Only factors the closable ceiling uses: the plan's factors are the action plan's non-nomination boosters,
    // English or experience -- never a nomination.
    const r = runReadinessEngine(nurse);
    const allowed = new Set([...(r.pointsEstimate?.actionPlan?.actions ?? []).filter((a) => !a.onlyForSubclass && a.exclusiveGroup !== "nomination" && !a.conditional).map((a) => a.id as string), "english_proficient", "english_superior", "experience"]);
    const step = r.visaGates?.["189"].steps[0] ?? "";
    t("the plan names no nomination and no factor outside the ceiling", !/nomination|adaylık|提名/.test(step.split("closes with")[1] ?? "") && allowed.has("community_language") && allowed.has("australian_study"), step);
    // No waiting needed: an English upgrade closes the gap.
    const quick = runReadinessEngine({ ...A, occupation: "Software Engineer 261313", qualificationLevel: "PhD/Doctorate", migrationGoals: ["direct_pr"], preferredPathway: undefined, annualSalaryAud: undefined, occupationConfirmed: "yes", englishLevel: "competent" });
    const q = quick.visaGates?.["189"].steps[0] ?? "";
    t(`GP (50 points, Competent): "closes with Superior English (+20), no waiting time needed"`, /from 50 to at least 65 \(currently 15 short; closes with Superior English \(\+20\), no waiting time needed/.test(q), q);
  }

  console.log("\n==================== B1. employer sponsorship ====================");
  {
    const g = (sp?: ReadinessInput["employerSponsorship"], years?: number) =>
      runReadinessEngine({ ...ONSHORE_SE, employerSponsorship: sp, yearsWithCurrentSponsor: years }).visaGates!;
    const ids = (x: { id: string }[]) => x.map((y) => y.id);
    const none = g("none");
    t(`none: 482 "Next step required: Find an employer willing to sponsor you" (482CS.sponsor actionable)`, none["482"].status === "next_step_required" && none["482"].steps.includes("Find an employer willing to sponsor you") && ids(none["482"].notMet).includes("482CS.sponsor"), JSON.stringify(none["482"].steps));
    t("none: 186 next step (Direct Entry employer nomination); TRT closed on the visa held", none["186"].status === "next_step_required" && none["186"].steps.includes("Find an employer willing to sponsor you") && (none["186"].closedStreams ?? []).some((c) => c.stream === "Temporary Residence Transition" && ids(c.notMet).includes("186TRT.hold_visa")), JSON.stringify(none["186"]));
    t("lack of a sponsor is never structural", ["482CS.sponsor", "186DE.employer_nomination", "186TRT.employer_nomination"].every((id) => gateFailureKind(id) === "actionable"));
    const r482 = runReadinessEngine({ ...ONSHORE_SE, employerSponsorship: "none" }).pathwayComparison.find((p) => p.subclass === "482")!;
    t("the 482 body reason names the step", r482.reason.startsWith("Next step required: Find an employer willing to sponsor you"), r482.reason);
    for (const [loc, step] of [["tr", "Sizi sponsor etmeye istekli bir işveren bulun"], ["zh-Hans", "找到愿意担保您的雇主"]] as const) {
      const x = runReadinessEngine({ ...ONSHORE_SE, locale: loc, employerSponsorship: "none" }).visaGates!["482"];
      t(`${loc}: the sponsor step`, x.steps.includes(step), JSON.stringify(x.steps));
    }
    const offer = g("job_offer");
    t("job offer: 482 sponsor met; 186 Direct Entry nomination unknown (not collected); TRT closed (no 482 held)", !ids(offer["482"].notMet).includes("482CS.sponsor") && !ids(offer["482"].unknown).includes("482CS.sponsor") && ids(offer["186"].unknown).includes("186DE.employer_nomination") && offer["186"].status === "conditional", JSON.stringify([offer["482"].status, offer["186"].status]));
    const on482 = g("sponsored_482", 2);
    const trtGates = on482["186"].gates.filter((x) => x.id.startsWith("186TRT"));
    const st = (id: string) => trtGates.find((x) => x.id === id)?.status;
    t("on a 482 with 2 years: 482 sponsor met; TRT hold visa and 2 years of sponsored employment met; nomination unknown", !ids(on482["482"].notMet).includes("482CS.sponsor") && st("186TRT.hold_visa") === "met" && st("186TRT.sponsored_employment") === "met" && st("186TRT.employer_nomination") === "unknown", JSON.stringify(trtGates.map((x) => [x.id, x.status])));
    const on482one = g("sponsored_482", 1);
    t("on a 482 with 1 year with the current sponsor: sponsored employment unknown (earlier sponsors also count), not failed", on482one["186"].gates.find((x) => x.id === "186TRT.sponsored_employment")?.status === "unknown");
  }

  console.log("\n==================== B2. residence (onshore Software Engineer, QLD vs TAS) ====================");
  {
    for (const code of ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"]) {
      const rule = stateResidenceRule(code);
      console.log(`  ${code}: ${rule.requirement}${rule.subclasses ? ` (subclass ${rule.subclasses.join("/")} only)` : ""}${rule.fact ? ` -- "${rule.fact.slice(0, 90)}..."` : ""}${rule.source ? ` [${rule.source.split(";")[0]}]` : ""}`);
    }
    t("every classified rule rests on a sourced fact; ACT and NT are not confirmed", ["NSW", "VIC", "QLD", "SA", "WA", "TAS"].every((c) => Boolean(stateResidenceRule(c).fact)) && stateResidenceRule("ACT").requirement === "not_confirmed" && stateResidenceRule("NT").requirement === "not_confirmed");
    const run = (rs: ReadinessInput["residenceState"], locale: ReadinessInput["locale"] = "en") => runReadinessEngine({ ...ONSHORE_SE, locale, residenceState: rs }).stateNominationTracker!;
    const qld = run("QLD");
    const tas = run("TAS");
    const tasRow = qld.states.find((s) => s.code === "TAS")!;
    t("QLD resident: Tasmania is not available, with the reason", !qld.nominationAvailability!["190"].includes("TAS") && tasRow.isOpen === false && tasRow.residenceBlock === "required" && tasRow.requirements.includes("Tasmania's onshore pathways require you to live in Tasmania; you live in Queensland."), JSON.stringify(tasRow.requirements.slice(0, 2)));
    t("TAS resident: Tasmania is available", tas.nominationAvailability!["190"].includes("TAS") && tas.nominationAvailability!["491"].includes("TAS"), JSON.stringify(tas.nominationAvailability));
    t("QLD resident: WA (sourced: interstate candidates eligible) is not residence-blocked and stays available for 491; for 190 its General stream needs a WA job (no WA job recorded), a separate condition", !qld.states.find((s) => s.code === "WA")!.residenceBlock && qld.nominationAvailability!["491"].includes("WA") && !qld.nominationAvailability!["190"].includes("WA"));
    const act = qld.states.find((s) => s.code === "ACT")!;
    t("QLD resident: ACT is 'residence requirement not confirmed' and not counted as available", act.residenceBlock === "not_confirmed" && !qld.nominationAvailability!["190"].includes("ACT") && act.requirements.some((x) => x.includes("residence requirement not confirmed")), JSON.stringify(act.requirements.slice(0, 2)));
    t("no top-recommended state is blocked by residence", !qld.topRecommendedStates.some((s) => s.residenceBlock));
    for (const [loc, needle] of [["tr", "Tazmanya Avustralya içi yolları Tazmanya eyaletinde yaşamanızı gerektirir; siz Queensland eyaletinde yaşıyorsunuz."], ["zh-Hans", "塔斯马尼亚州境内途径要求您在塔斯马尼亚州居住；您居住在昆士兰州。"]] as const) {
      const row = run("QLD", loc).states.find((s) => s.code === "TAS")!;
      t(`${loc}: the Tasmania note`, row.requirements.includes(needle), JSON.stringify(row.requirements[0]));
    }
    const offshore = runReadinessEngine({ ...ONSHORE_SE, currentCountry: "IN", residenceState: "QLD" }).stateNominationTracker!;
    t("an offshore applicant is not affected by a residence answer", !offshore.states.some((s) => s.residenceBlock));
  }

  console.log("\n==================== B3. application stage (real PDF text) ====================");
  {
    // The report does not tell anyone what to do next: the stage only adds an information line to the points section, and the
    // typical process (published timeframes) carries the 60-day window and the police / health lead times for the target.
    const DEADLINE = { en: "within 60 days of the invitation", tr: "60 gün içinde", "zh-Hans": "60 天内" } as const;
    const LEAD = { en: "15 business days", tr: "15 iş günü", "zh-Hans": "15 个工作日" } as const;
    const OVERSEAS = { en: "4-12 weeks", tr: "4-12 hafta", "zh-Hans": "4-12 周" } as const;
    const HEALTH = { en: "Bupa Medical Visa Services", tr: "Bupa Medical Visa Services", "zh-Hans": "Bupa Medical Visa Services" } as const;
    const INVITED_NOTE = { en: "You told us you have been invited or nominated", tr: "Davet aldığınızı veya aday gösterildiğinizi belirttiniz", "zh-Hans": "您表示已获邀请或提名" } as const;
    const EOI_NOTE = { en: "You told us an EOI is submitted", tr: "Bir EOI sunduğunuzu belirttiniz", "zh-Hans": "您表示已提交 EOI" } as const;
    const DIRECTIVE = { en: /Lodgement Preparation|Your next step is lodging|update your EOI in SkillSelect/i, tr: /Başvuru Hazırlığı|bir sonraki adımınız|güncelleyin/i, "zh-Hans": /签证申请递交准备|您的下一步是递交|更新您的 EOI/ } as const;
    for (const locale of ["en", "tr", "zh-Hans"] as const) {
      const inv = squash(pdf("invited", locale).text);
      const plan = squash(pdf("planning", locale).text);
      const eoi = squash(pdf("eoi", locale).text);
      t(`${locale}: Invited -> an information line in the points section, no lodgement instructions`, inv.includes(squash(INVITED_NOTE[locale])) && !DIRECTIVE[locale].test(pdf("invited", locale).text));
      const miss = [DEADLINE, LEAD, OVERSEAS, HEALTH].map((m) => m[locale]).filter((m) => !inv.includes(squash(m)));
      t(`${locale}: ... and the typical process states the 60-day window, police and health lead times`, miss.length === 0, miss.join(" | "));
      t(`${locale}: Planning -> no stage line`, !plan.includes(squash(INVITED_NOTE[locale])) && !plan.includes(squash(EOI_NOTE[locale])));
      t(`${locale}: EOI submitted -> its own information line, no instruction`, eoi.includes(squash(EOI_NOTE[locale])) && !DIRECTIVE[locale].test(pdf("eoi", locale).text));
    }
    const stages = ["planning", "skills_assessment_in_progress", "eoi_submitted", "invited"] as const;
    const snaps = stages.map((s) => JSON.stringify(gateSnapshot(runReadinessEngine({ ...ONSHORE_SE, applicationStage: s }))));
    t("the stage never changes any gate result", snaps.every((x) => x === snaps[0]));
  }

  console.log("\n==================== B4. older reports (b0d20f74's inputs, no new fields) ====================");
  {
    const { refreshStoredReport } = await import("../lib/reports/refresh-report");
    const input = REVIEW_PERSONAS["real-b0d20f74-inputs"];
    const stored = runReadinessEngine(input);
    const refreshed = await refreshStoredReport(stored, input);
    const snap = gateSnapshot(refreshed.report);
    const diff = Object.keys(B0D_BASELINE).filter((v) => JSON.stringify(snap[v]) !== JSON.stringify(B0D_BASELINE[v]));
    t("the refreshed report's gate results equal 093b656's (sponsor gates unknown, as before)", diff.length === 0, diff.map((v) => `${v}: ${JSON.stringify(snap[v])}`).join("; "));
    t("state availability: no residence answer -> no residence check (WA is out for 190 only because no WA job is recorded)", JSON.stringify(refreshed.report.stateNominationTracker?.nominationAvailability) === JSON.stringify(B0D_AVAILABILITY) && !refreshed.report.stateNominationTracker?.states.some((s) => s.residenceBlock), JSON.stringify(refreshed.report.stateNominationTracker?.nominationAvailability));
    t("no stage: no lodgement next step, no applicationStage on the report", refreshed.report.applicationStage === undefined && !/60/.test(refreshed.report.suggestedNextSteps[0] ?? ""));
  }

  console.log("\n==================== B5. form: conditional display ====================");
  {
    const html = (currentCountry: string, sp = "", locale = "en") => renderToStaticMarkup(<SituationFields locale={locale} currentCountry={currentCountry} selectClassName="" initialEmployerSponsorship={sp} />);
    t("residence shows only when the current country is Australia", html("AU").includes('id="waitlist-residence-state"') && !html("IN").includes('id="waitlist-residence-state"'));
    t("sponsor years show only when sponsored on a 482 / 457", html("AU", "sponsored_482").includes('id="waitlist-years-current-sponsor"') && !html("AU", "none").includes("waitlist-years-current-sponsor") && !html("AU", "job_offer").includes("waitlist-years-current-sponsor") && !html("AU").includes("waitlist-years-current-sponsor"));
    t("the years select offers 0-10+", (html("AU", "sponsored_482").match(/<option[^>]*value="\d+"/g) ?? []).length === 11 && html("AU", "sponsored_482").includes(">10+<"));
    t("employer sponsorship is required; the stage is optional and defaults to Planning", /id="waitlist-employer-sponsorship"[^>]*required/.test(html("AU")) && /<option value="planning" selected=""/.test(html("AU").replace(/ class="[^"]*"/g, "")));
    t("the three options, en / tr / zh-Hans", html("AU").includes("Job offer from an Australian employer willing to sponsor") && html("AU", "", "tr").includes("Şu anda 482 veya 457 vizesiyle sponsorlu") && html("AU", "", "zh-Hans").includes("没有雇主担保或工作邀约"));
    t("visibility helper", JSON.stringify(situationFieldVisibility("AU", "sponsored_482")) === JSON.stringify({ residence: true, sponsorYears: true }) && JSON.stringify(situationFieldVisibility("TR", "none")) === JSON.stringify({ residence: false, sponsorYears: false }));
  }

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
