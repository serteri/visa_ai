/**
 * The sourced hard-gate matrix (src/data/visa-gates.json <- scripts/generate-visa-gates.ts; evaluation in
 * lib/readiness/visa-gates.ts).
 *
 *   1. Drift: regenerates from data/knowledge and diffs the committed JSON (SKIPPED where data/knowledge is absent).
 *   2. Committed-file invariants: every gate has a page + verbatim quote; the thresholds (CSIT / SSIT with their
 *      effective dates, ages, points, years of experience) and the flagged missing items.
 *   3. Gate evaluation over a persona matrix (b0d20f74's inputs, with a skills assessment, salary 44,998 with no
 *      experience, age 46, English Competent vs none, an occupation off the CSOL, an occupation on no skilled list).
 *   4. 189/190/491: a not-met gate <=> the pathway score set blocks it (the ranking can never recommend it).
 *   5. Real PDF text (en / tr / zh-Hans): a not-met pathway is "Not eligible now" with the failed gate and its Home
 *      Affairs citation; a Conditional one lists what must be true; no sentence recommends a not-met pathway; the
 *      Bridge to PR section offers no not-met pathway.
 *   6. The AI strategy validator rejects a recommendation of a not-met pathway (list, reason, summary) and accepts
 *      one that only says it is not available.
 *   7. Follow-up rules: the 65-point gate counts the required nomination points (491 +15, 190 +5); actionable vs
 *      structural failures ("Next step required" vs "Not eligible now"); "Eligible, but below recent invitation
 *      levels"; the list each visa is gated on (189 MLTSSL, 482/186 CSOL); 186 TRT income = needs human verification.
 *
 *   npx tsx scripts/test-visa-gates.ts
 */
import { existsSync, readFileSync } from "node:fs";

import gatesData from "../src/data/visa-gates.json";
import type { ReadinessInput, ReadinessReport } from "../lib/readiness/types";
import { evaluateVisaGates, gateSummaryText, pathwayGateLabel, pathwayStatusLabel, type PathwayGates } from "../lib/readiness/visa-gates";
import { NEEDS_HUMAN_VERIFICATION, gateFailureKind } from "../lib/readiness/visa-gate-kinds";
import { findRecommendationViolations, findScoreViolations, notEligibleSubclasses, recommendsClosedVisa } from "../lib/readiness/pathway-recommendations";
import { runReadinessEngine } from "../src/lib/readiness-engine";
import { VISA_GATES_OUT_FILE, VISA_GATE_DOCUMENTS, buildVisaGates, serialize } from "./generate-visa-gates";
import { renderPersonaPdfTexts } from "./render-persona-pdfs";

let failures = 0;
const ok = (m: string) => console.log(`  ✅ ${m}`);
const fail = (m: string) => {
  failures++;
  console.error(`  ❌ ${m}`);
};

type Persona = { name: string; input: ReadinessInput };
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
const PERSONAS: Persona[] = [
  { name: "b0d20f74 inputs (skills assessment No)", input: A },
  { name: "b0d20f74 + skills assessment Yes", input: { ...A, occupationConfirmed: "yes" } },
  { name: "salary 44,998, no experience", input: { ...A, occupationConfirmed: "yes", annualSalaryAud: 44998 } },
  { name: "age 46", input: { ...A, occupationConfirmed: "yes", age: "46" } },
  { name: "English Competent", input: { ...A, occupationConfirmed: "yes", englishLevel: "competent", annualSalaryAud: 95000, offshoreExperienceYears: 5, sponsorOrFamily: "Single / No Dependants" } },
  { name: "no English test", input: { ...A, occupationConfirmed: "yes", englishLevel: "none", annualSalaryAud: 95000, offshoreExperienceYears: 5, sponsorOrFamily: "Single / No Dependants" } },
  { name: "occupation not on the CSOL (Acupuncturist 252211, STSOL)", input: { ...A, occupation: "Acupuncturist (252211)", occupationConfirmed: "yes", offshoreExperienceYears: 5, annualSalaryAud: 95000 } },
  { name: "occupation on no skilled list (Aged or Disabled Carer 422111)", input: { ...A, occupation: "Aged or Disabled Carer (422111)", occupationConfirmed: "yes", offshoreExperienceYears: 5, annualSalaryAud: 95000 } },
];

const gatesFor = (input: ReadinessInput, locale: ReadinessInput["locale"] = "en") => {
  const r = runReadinessEngine({ ...input, locale });
  return { report: r, gates: r.visaGates as Record<string, PathwayGates> };
};
const notMetIds = (g: PathwayGates) => g.notMet.map((x) => x.id);
const unknownIds = (g: PathwayGates) => g.unknown.map((x) => x.id);

async function main() {
  console.log("==================== (1) drift ====================");
  if (!Object.values(VISA_GATE_DOCUMENTS).every((f) => existsSync(f))) {
    console.log("  SKIPPED: data/knowledge is not present (gitignored)");
  } else {
    const committed = readFileSync(VISA_GATES_OUT_FILE, "utf8").replace(/\r\n/g, "\n");
    if (committed === serialize(await buildVisaGates())) ok(`${VISA_GATES_OUT_FILE} matches a fresh parse of the ${Object.keys(VISA_GATE_DOCUMENTS).length} source documents`);
    else fail(`${VISA_GATES_OUT_FILE} drifted -- run: npx tsx scripts/generate-visa-gates.ts`);
  }

  console.log("\n==================== (2) committed-file invariants ====================");
  {
    const d = gatesData as unknown as {
      _provenance: { last_verified: string; extractedOn: string };
      thresholds: Record<string, { value: number; effectiveFrom?: string; previous?: number }> & { ageLimits: Record<string, number>; minimumPoints: number };
      missing: string[];
      gates: Array<{ id: string; visa: string; stream: string | null; page: number; quote: string; source: string; kind: string; numeric?: { value: number }; intakeFields: string[] }>;
    };
    const bad = d.gates.filter((g) => !(g.page > 0) || g.quote.length < 15 || !g.source);
    if (bad.length === 0) ok(`${d.gates.length} gates, each with a page, a verbatim quote and its source document`);
    else fail(`gates without page/quote/source: ${bad.map((g) => g.id).join(", ")}`);
    const t = d.thresholds;
    if (t.CSIT.value === 79423 && t.CSIT.effectiveFrom === "2026-07-01" && t.CSIT.previous === 76515 && t.SSIT.value === 146576 && t.SSIT.previous === 141210 && t.ageLimits["189"] === 45 && t.ageLimits["485"] === 35 && t.minimumPoints === 65) {
      ok("thresholds: CSIT AUD79,423 (from 1 July 2026, was 76,515), SSIT AUD146,576 (was 141,210), age 45 (485: 35), 65 points");
    } else fail(`thresholds: ${JSON.stringify(t)}`);
    const need = ["189", "190", "491", "186", "482", "485", "500", "820"];
    const streams = (v: string) => new Set(d.gates.filter((g) => g.visa === v).map((g) => g.stream));
    if (need.every((v) => d.gates.some((g) => g.visa === v)) && streams("186").has("Direct Entry") && streams("186").has("Temporary Residence Transition") && streams("482").has("Core Skills") && streams("482").has("Specialist Skills")) {
      ok("every visa is covered; 186 Direct Entry and Temporary Residence Transition, 482 Core Skills and Specialist Skills separately");
    } else fail("a visa or stream is missing from the matrix");
    if (d.missing.some((m) => /Specialist Skills/.test(m)) && d.missing.length >= 5 && d._provenance.last_verified === d._provenance.extractedOn) ok(`${d.missing.length} missing items flagged (incl. the 482 Specialist Skills stream); provenance dated ${d._provenance.last_verified}`);
    else fail("missing-items list or provenance");
    const noField = d.gates.filter((g) => g.kind === "gate" && g.intakeFields.length === 0).map((g) => g.id);
    console.log(`  (gates the intake cannot evaluate -> always unknown: ${noField.join(", ")})`);
  }

  console.log("\n==================== (3) gate evaluation ====================");
  const G = Object.fromEntries(PERSONAS.map((p) => [p.name, gatesFor(p.input)]));
  const expect = (persona: string, visa: string, status: string, notMet: string[] = [], unknown: string[] = []) => {
    const g = G[persona].gates[visa];
    const okNot = notMet.every((id) => notMetIds(g).includes(id)) && (status !== "not_eligible_now" || notMetIds(g).length >= notMet.length);
    const okUnk = unknown.every((id) => unknownIds(g).includes(id));
    if (g.status === status && okNot && okUnk) ok(`${persona} -> ${visa}: ${g.status}${g.notMet.length ? ` [${notMetIds(g).join(", ")}]` : ""}`);
    else fail(`${persona} -> ${visa}: ${g.status} notMet [${notMetIds(g)}] unknown [${unknownIds(g)}]; expected ${status} notMet [${notMet}] unknown [${unknown}]`);
  };
  {
    const n = PERSONAS[0].name;
    // The skills assessment is something the applicant can do: "Next step required", not "Not eligible now".
    expect(n, "189", "next_step_required", ["189.skills_assessment"]);
    expect(n, "190", "next_step_required", ["190.skills_assessment"]);
    expect(n, "491", "next_step_required", ["491.skills_assessment"]);
    expect(n, "482", "not_eligible_now", ["482CS.salary"], ["482CS.experience", "482CS.sponsor"]);
    expect(n, "186", "conditional", [], ["186TRT.hold_visa", "186TRT.employer_nomination"]);
    const g = G[n].gates["186"];
    if ((g.closedStreams ?? []).some((c) => c.stream === "Direct Entry" && c.notMet.some((x) => x.id === "186DE.skills_assessment" || x.id === "186DE.salary"))) ok(`${n} -> 186: Direct Entry is out (skills assessment / CSIT), reported with its failed gates`);
    else fail(`${n} -> 186: closed streams ${JSON.stringify(g.closedStreams?.map((c) => [c.stream, c.notMet.map((x) => x.id)]))}`);
  }
  {
    const n = PERSONAS[1].name;
    expect(n, "189", "eligible");
    expect(n, "190", "eligible");
    expect(n, "491", "eligible");
    const g = G[n].gates["190"];
    if (g.future.some((x) => x.id === "190.invitation") && g.future.some((x) => x.id === "190.nomination")) ok("190: invitation and state nomination are future steps, not failures");
    else fail("190 future steps missing");
  }
  {
    const n = PERSONAS[2].name; // salary 44,998, no experience entered
    expect(n, "482", "not_eligible_now", ["482CS.salary"], ["482CS.experience"]);
    // 186 Direct Entry explicitly: CSIT not met; experience unknown (not entered).
    const de = gatesFor({ ...PERSONAS[2].input, nominationStream: "direct_entry" }).gates["186"];
    if (de.status === "not_eligible_now" && notMetIds(de).includes("186DE.salary") && unknownIds(de).includes("186DE.experience")) ok("186 Direct Entry: not eligible now (salary 44,998 < CSIT 79,423); experience unknown, not a failure");
    else fail(`186 DE: ${de.status} [${notMetIds(de)}] [${unknownIds(de)}]`);
    // With 0 years entered, both fail.
    const zero = gatesFor({ ...PERSONAS[2].input, offshoreExperienceYears: 0, onshoreExperienceYears: 0, nominationStream: "direct_entry" }).gates;
    if (notMetIds(zero["186"]).includes("186DE.experience") && notMetIds(zero["482"]).includes("482CS.experience")) ok("0 years entered: 186 (3 years) and 482 (1 year) experience gates are not met");
    else fail("0 years entered did not fail both experience gates");
  }
  {
    const n = PERSONAS[3].name;
    for (const v of ["189", "190", "491"]) expect(n, v, "not_eligible_now", [`${v}.age`]);
    expect(n, "186", "not_eligible_now", ["186DE.age", "186TRT.age"]);
    // 485: 35 or under -- but under 50 with a Masters (research) / PhD, which this persona has; a Bachelor at 46 fails.
    if (!notMetIds(G[n].gates["485"]).includes("485.age")) ok("age 46 with a PhD: the 485 age gate is met (research-degree exception, under 50)");
    else fail("485 age gate ignored the research-degree exception");
    const b485 = gatesFor({ ...PERSONAS[3].input, qualificationLevel: "Bachelor" }).gates["485"];
    if (notMetIds(b485).includes("485.age")) ok("age 46 with a Bachelor degree: 485 age gate not met (35 or under)");
    else fail(`485 age for a Bachelor at 46: ${notMetIds(b485)}`);
  }
  {
    expect(PERSONAS[4].name, "189", "eligible");
    // Persona 6 (no English test): at Competent English the applicant has 70 points, so the English test is the only step.
    for (const v of ["189", "190"]) expect(PERSONAS[5].name, v, "next_step_required", [`${v}.english`]);
    expect(PERSONAS[5].name, "482", "conditional", [], ["482CS.english"]);
    // 491: English is actionable and the +15 nomination makes the points reachable -> a next step, not a closed door.
    expect(PERSONAS[5].name, "491", "next_step_required", ["491.english"]);
    expect(PERSONAS[5].name, "186", "next_step_required", ["186DE.english", "186TRT.english"]);
  }
  {
    const n = PERSONAS[6].name;
    expect(n, "189", "not_eligible_now", ["189.occupation_list"]);
    expect(n, "190", "eligible");
    expect(n, "482", "not_eligible_now", ["482CS.occupation_csol"]);
    const de = gatesFor({ ...PERSONAS[6].input, nominationStream: "direct_entry" }).gates["186"];
    if (notMetIds(de).includes("186DE.occupation_csol")) ok("186 Direct Entry: occupation not on the CSOL -> not met");
    else fail(`186 DE occupation: ${notMetIds(de)}`);
  }
  {
    const n = PERSONAS[7].name;
    for (const v of ["189", "190", "491"]) expect(n, v, "not_eligible_now", [`${v}.occupation_list`]);
    expect(n, "482", "not_eligible_now", ["482CS.occupation_csol"]);
  }

  console.log("\n==================== (4) 189/190/491: a not-met gate <=> blocked in the score set ====================");
  for (const p of PERSONAS) {
    const { report, gates } = G[p.name];
    // A pathway the applicant cannot pursue yet (not eligible now, or a step still to do) is blocked in the score set.
    const mism = (["189", "190", "491"] as const).filter((v) => (gates[v].status === "not_eligible_now") && !report.pathwayScores?.[v].isBlocked);
    if (mism.length === 0) ok(`${p.name}: gate result and ranking agree for 189/190/491`);
    else fail(`${p.name}: gates vs isBlocked disagree for ${mism.join(", ")} (gates ${mism.map((v) => gates[v].status)}, blocked ${mism.map((v) => report.pathwayScores?.[v].isBlocked)})`);
    const rec = report.pathwayRanking?.recommendable ?? [];
    const leaked = rec.filter((v) => gates[v].status === "not_eligible_now");
    const leakedStep = rec.filter((v) => gates[v].status === "next_step_required" && report.pathwayScores?.[v].isBlocked);
    if (leakedStep.length) fail(`${p.name}: recommendable includes blocked pathways ${leakedStep}`);
    if (leaked.length) fail(`${p.name}: recommendable includes not-met pathways ${leaked}`);
  }

  console.log("\n==================== (5) real PDF text: en / tr / zh-Hans ====================");
  const NOT_ELIGIBLE = { en: "Not eligible now", tr: "Şu anda uygun değil", "zh-Hans": "目前不符合条件" } as const;
  const CONDITIONAL = { en: "Conditional", tr: "Koşullu", "zh-Hans": "有条件" } as const;
  const CITE = { en: "Home Affairs, Subclass", tr: "İçişleri Bakanlığı, Subclass", "zh-Hans": "内政部，" } as const;
  const rendered = await renderPersonaPdfTexts(Object.fromEntries(PERSONAS.map((p) => [p.name, p.input])));
  for (const r of rendered) {
    const locale = r.locale;
    const flat = r.text.replace(/\s+/g, " ");
    const squash = r.text.replace(/\s+/g, "");
    const report = r.report as ReadinessReport;
    const g = report.visaGates!;
    const reported = report.pathwayComparison.map((p) => (p.subclass === "801" ? "820" : p.subclass));
    const tag = `${r.id} [${locale}]`;
    const problems: string[] = [];
    for (const v of new Set(reported)) {
      const gv = g[v];
      if (!gv) continue;
      const label = gv.status === "not_eligible_now" ? NOT_ELIGIBLE[locale] : gv.status === "conditional" ? CONDITIONAL[locale] : pathwayStatusLabel(gv, locale);
      if (!squash.includes(`${label}`.replace(/\s+/g, ""))) problems.push(`${v}: label "${label}" missing`);
      if (gv.status === "not_eligible_now") {
        const first = gv.notMet[0];
        if (!squash.includes(first.label.replace(/\s+/g, "")) || !squash.includes(first.citation.replace(/\s+/g, ""))) problems.push(`${v}: failed gate "${first.label}" or its citation "${first.citation}" not in the PDF`);
        if (!flat.includes(CITE[locale].replace(/\s+/g, " ").trim().split(" ")[0])) problems.push(`${v}: no Home Affairs citation`);
      }
      if (gv.status === "next_step_required" && gv.steps[0] && !squash.includes(gv.steps[0].replace(/\s+/g, ""))) problems.push(`${v}: next step "${gv.steps[0]}" not in the PDF`);
      if (gv.status === "conditional") {
        const u = gv.unknown[0];
        if (u && !squash.includes(u.label.replace(/\s+/g, ""))) problems.push(`${v}: conditional gate "${u.label}" not listed`);
      }
    }
    // No sentence recommends a pathway with a not-met gate.
    const closed = notEligibleSubclasses(report);
    // (Section headings that contain "suggestions" -- the Points Improvement Tips list -- are not recommendations of a visa.)
    const rec = recommendsClosedVisa(flat.replace(/积分提升建议|Puan Artırma Önerileri|Points Improvement Tips/g, " "), closed);
    if (rec) problems.push(`a sentence recommends the not-eligible subclass ${rec}`);
    // Bridge to PR (English section): no 482 / 485 offer while that visa is not eligible now.
    if (locale === "en") {
      const bridge = /Bridge to PR \/ Typical Progression Pathways([\s\S]*?)(?:Critical Compliance Alerts|Risk Alerts|Audit-Ready Proof Checklist)/.exec(r.text)?.[1] ?? "";
      if (g["482"]?.status === "not_eligible_now" && /Employer sponsorship context|subclass 482|482 →/.test(bridge)) problems.push("Bridge to PR still offers 482 (not eligible now)");
      if (g["485"]?.status === "not_eligible_now" && /485 bridge|Typical post-485/.test(bridge)) problems.push("Bridge to PR still offers 485 (not eligible now)");
    }
    if (problems.length === 0) ok(`${tag}: labels, failed gates + citations, conditional lists; nothing recommends a not-eligible pathway (${closed.filter((c) => reported.includes(c)).join(", ") || "-"} closed)`);
    else problems.forEach((m) => fail(`${tag}: ${m}`));
  }

  console.log("\n==================== (6) AI strategy validator ====================");
  {
    const report = G[PERSONAS[2].name].report; // 482 is not eligible now (salary 44,998)
    const base = { executiveSummary: "Your profile is being reviewed.", topRecommendedPathways: [], pointsBoosterStrategy: [], timelineEstimate: "6-12 months" };
    const recommends482 = { ...base, topRecommendedPathways: [{ subclass: "482", state: "", reason: "Employer sponsorship is the best route.", nextSteps: ["Find a sponsor."] }] };
    const v1 = findRecommendationViolations(recommends482 as never, report);
    if (v1.some((v) => /Not eligible now/.test(v.message) && /topRecommendedPathways\[0\]/.test(v.path))) ok("a recommendation list containing a not-eligible pathway (482) is rejected");
    else fail(`list check: ${JSON.stringify(v1)}`);
    const v2 = findRecommendationViolations({ ...base, executiveSummary: "We recommend that you pursue Subclass 482 with an employer sponsor." } as never, report);
    if (v2.some((v) => v.path === "executiveSummary")) ok("a summary that recommends subclass 482 is rejected");
    else fail(`summary check: ${JSON.stringify(v2)}`);
    const v3 = findRecommendationViolations({ ...base, executiveSummary: "Subclass 482 is not eligible now because the salary is below the CSIT." } as never, report);
    if (!v3.some((v) => v.path === "executiveSummary")) ok("saying a pathway is not eligible now is accepted");
    else fail(`negated mention was rejected: ${JSON.stringify(v3)}`);
    for (const [locale, text] of [["tr", "482 vizesini öneriyoruz; işveren sponsoru bulun."], ["zh-Hans", "我们建议您申请 482 签证并寻找雇主担保。"]] as const) {
      if (recommendsClosedVisa(text, ["482"])) ok(`${locale}: a recommendation of 482 is detected`);
      else fail(`${locale}: recommendation of 482 not detected`);
    }
  }

  console.log("\n==================== (7) follow-up rules ====================");
  {
    const P = PERSONAS[1].input; // skills assessment yes, English superior, age 28: every non-points gate is met
    const pts = (visa: "190" | "491", est: number, boosterGain?: number) => {
      const g = evaluateVisaGates(P, { estimatedPoints: est, potentialPoints: est, boosterGain }, "en")[visa];
      return g.gates.find((x) => x.id === `${visa}.points`)!;
    };
    // 1. The 65-point minimum counts the nomination points the visa requires.
    const t = (label: string, cond: boolean, detail = "") => (cond ? ok(label) : fail(`${label} ${detail}`));
    t("491: base 50 + 15 = 65 -> points gate met", pts("491", 50).status === "met", pts("491", 50).reason);
    t("491: base 49 + 15 = 64 -> points gate not met", pts("491", 49, 0).status === "not_met");
    t("190: base 60 + 5 = 65 -> points gate met (65 is the minimum)", pts("190", 60).status === "met", pts("190", 60).reason);
    t("190: base 55 + 5 = 60 -> points gate not met", pts("190", 55, 0).status === "not_met", pts("190", 55, 0).reason);
    t("the reason states the included nomination points", /\+ 15 for the required regional nomination or sponsorship = 65/.test(pts("491", 50).reason) && /\+ 5 for the required state nomination or sponsorship = 60/.test(pts("190", 55, 0).reason), pts("491", 50).reason);
    t("189 gets no nomination points", evaluateVisaGates(P, { estimatedPoints: 64, potentialPoints: 64 }, "en")["189"].gates.find((x) => x.id === "189.points")!.status === "not_met");

    // 2. Actionable vs structural.
    const d = gatesData as unknown as { gates: Array<{ id: string; kind: string; failureKind: string }>; needsHumanVerification: Array<{ id: string; item: string }> };
    const bad = d.gates.filter((g) => g.failureKind !== gateFailureKind(g.id));
    t("every gate carries its actionable / structural classification in the committed matrix", bad.length === 0, bad.map((g) => g.id).join(","));
    console.log("  Classification (failure kind of every gate that can fail):");
    for (const kind of ["actionable", "structural"]) console.log(`    ${kind}: ${d.gates.filter((g) => g.kind === "gate" && g.failureKind === kind).map((g) => g.id).join(", ")}`);
    const structuralIds = ["189.age", "189.occupation_list", "482CS.salary", "186DE.salary", "482CS.occupation_csol", "186DE.occupation_csol", "485.age", "500.age"];
    t("age, occupation list and salary gates are structural", structuralIds.every((id) => gateFailureKind(id) === "structural"));
    const actionableIds = ["189.skills_assessment", "189.english", "189.points", "186DE.experience", "482CS.experience"];
    t("skills assessment, English, points and experience gates are actionable", actionableIds.every((id) => gateFailureKind(id) === "actionable"));
    {
      const g = G[PERSONAS[0].name].gates["190"];
      t("skills assessment No -> 190 'Next step required' naming the step (assessing body of the occupation)", g.status === "next_step_required" && /Complete a positive skills assessment with ACS/.test(g.steps[0] ?? ""), JSON.stringify(g.steps));
      const tr = evaluateVisaGates(PERSONAS[0].input, {}, "tr")["190"];
      const zh = evaluateVisaGates(PERSONAS[0].input, {}, "zh-Hans")["190"];
      t("tr / zh-Hans labels and steps", pathwayStatusLabel(tr, "tr") === "Sonraki adım gerekli" && pathwayStatusLabel(zh, "zh-Hans") === "需先完成下一步" && tr.steps.length === 1 && zh.steps.length === 1, JSON.stringify([tr.steps, zh.steps]));
      // A structural failure next to an actionable one -> Not eligible now, and no steps are offered.
      const mixed = evaluateVisaGates({ ...PERSONAS[0].input, age: "46" }, { estimatedPoints: 90, potentialPoints: 90, boosterGain: 0 }, "en")["190"];
      t("skills assessment No + age 46 (structural) -> 'Not eligible now', no steps offered", mixed.status === "not_eligible_now" && mixed.steps.length === 0, mixed.status);
      // 186 Direct Entry: experience is actionable (time), the CSIT salary is structural.
      const de = evaluateVisaGates({ ...PERSONAS[1].input, annualSalaryAud: 95000, offshoreExperienceYears: 1, nominationStream: "direct_entry" }, {}, "en")["186"];
      t("186 Direct Entry with 1 of 3 years -> 'Next step required: gain 2 more years'", de.status === "next_step_required" && /Gain 2 more years/.test(de.steps[0] ?? ""), JSON.stringify(de.steps));
      // Ordering by steps remaining is exposed on the pathway.
      t("stepsRemaining counts the failed actionable gates", de.stepsRemaining === 1 && mixed.stepsRemaining === 0);
    }
    {
      // Actionable points: a booster can close the gap -> next step; nothing can -> structural -> not eligible now.
      const closable = evaluateVisaGates(P, { estimatedPoints: 55, potentialPoints: 55, boosterGain: 10 }, "en")["190"];
      const hopeless = evaluateVisaGates(P, { estimatedPoints: 40, potentialPoints: 40, boosterGain: 5 }, "en")["190"];
      t("points 55 + 5 nomination + boosters worth 10 -> 190 'Next step required'", closable.status === "next_step_required" && /from 60 to at least 65 [(]currently 5 short, including 5/.test(closable.steps[0] ?? ""), JSON.stringify(closable.steps));
      t("points 40 + 5 with boosters worth 5 -> 190 'Not eligible now' (cannot reach 65)", hopeless.status === "not_eligible_now", hopeless.status);
    }

    // 3. Eligible vs competitive.
    {
      const below = evaluateVisaGates(P, { estimatedPoints: 65, potentialPoints: 65, invitation: { "190": { score: 70, benchmark: 90 }, "491": { score: 95, benchmark: 90 } } }, "en");
      t("all gates met, 70 (65 + 5 nomination) below the benchmark 90 -> 'Eligible, but below recent invitation levels (70 points)'", pathwayStatusLabel(below["190"], "en") === "Eligible, but below recent invitation levels (70 points)", pathwayStatusLabel(below["190"], "en"));
      t("at or above the benchmark -> plain 'Eligible to pursue'", pathwayStatusLabel(below["491"], "en") === "Eligible to pursue");
      t("tr / zh-Hans below-benchmark wording", pathwayStatusLabel(evaluateVisaGates(P, { estimatedPoints: 65, potentialPoints: 65, invitation: { "190": { score: 70, benchmark: 90 } } }, "tr")["190"], "tr").includes("70 puan") && pathwayStatusLabel(evaluateVisaGates(P, { estimatedPoints: 65, potentialPoints: 65, invitation: { "190": { score: 70, benchmark: 90 } } }, "zh-Hans")["190"], "zh-Hans").includes("70 分"));
      t("the summary shows the caveat", gateSummaryText(below["190"], "en").includes("Eligible, but below recent invitation levels (70 points)"));
      const engine = gatesFor(PERSONAS[1].input).gates;
      for (const v of ["189", "190", "491"] as const) console.log(`  (engine, persona 2 -> ${v}: ${pathwayStatusLabel(engine[v], "en")})`);
    }

    // 4. Occupation list per visa: 189 = MLTSSL, 190/491 = their lists, 482 / 186 = CSOL.
    {
      const agri = { ...PERSONAS[1].input, occupation: "Agricultural Scientist (234112)", offshoreExperienceYears: 5, annualSalaryAud: 95000 }; // MLTSSL, not CSOL
      const g = gatesFor(agri).gates;
      const has = (v: string, id: string) => notMetIds(g[v]).includes(id);
      t("MLTSSL occupation (Agricultural Scientist 234112): 189 / 190 / 491 occupation gates met", !has("189", "189.occupation_list") && !has("190", "190.occupation_list") && !has("491", "491.occupation_list"), JSON.stringify(["189", "190", "491"].map((v) => notMetIds(g[v]))));
      t("... but not on the CSOL: 482 and 186 Direct Entry occupation gates not met", has("482", "482CS.occupation_csol") && gatesFor({ ...agri, nominationStream: "direct_entry" }).gates["186"].notMet.some((x) => x.id === "186DE.occupation_csol"));
      const st = gatesFor({ ...PERSONAS[6].input }).gates; // STSOL only
      t("STSOL-only occupation (252211): 189 fails on the list (MLTSSL only), 190 / 491 pass", notMetIds(st["189"]).includes("189.occupation_list") && !notMetIds(st["190"]).includes("190.occupation_list") && !notMetIds(st["491"]).includes("491.occupation_list"));
    }

    // 5. 186 TRT income threshold: no figure is applied; flagged for human verification; the report says nomination must meet salary requirements.
    {
      t("the matrix lists the 186 TRT income threshold as needing human verification", d.needsHumanVerification.some((x) => x.id === "186TRT.income_threshold") && NEEDS_HUMAN_VERIFICATION.length === d.needsHumanVerification.length);
      console.log(`  Needs human verification: ${d.needsHumanVerification.map((x) => x.item).join("; ")}`);
      for (const [loc, needle] of [["en", "employer's nomination must meet the salary requirements"], ["tr", "İşverenin adaylığı maaş şartlarını karşılamalıdır"], ["zh-Hans", "雇主的提名必须满足薪资要求"]] as const) {
        const g = evaluateVisaGates({ ...PERSONAS[1].input, nominationStream: "trt" }, {}, loc)["186"];
        t(`${loc}: the 186 summary says the employer's nomination must meet the salary requirements`, gateSummaryText(g, loc).includes(needle), gateSummaryText(g, loc));
      }
      const trt = evaluateVisaGates({ ...PERSONAS[1].input, nominationStream: "trt" }, {}, "en")["186"];
      t("no TRT income figure is applied (no salary gate on the TRT stream)", !trt.gates.some((x) => /salary/i.test(x.id)));
    }

    // Follow-up: classification by the nature of the requirement, closable points, numbers in the step wording.
    {
      const CHANGED = ["482CS.skills_assessment", "482CS.english", "485.english"];
      t("skills assessment and English are actionable on every visa that has them (482CS, 485 included)", CHANGED.every((id) => gateFailureKind(id) === "actionable") && ["189", "190", "491", "186DE", "186TRT", "482CS", "485"].every((v) => ["english", "skills_assessment"].filter((k) => d.gates.some((g) => g.id === `${v}.${k}`)).every((k) => gateFailureKind(`${v}.${k}`) === "actionable")));
      console.log(`  Gates whose classification changed (structural -> actionable): ${CHANGED.join(", ")}`);
      // The step sentence names the current score and the target, in all three languages.
      for (const [loc, cur, tgt] of [["en", "from 50 to at least 65", "currently 15 short"], ["tr", "50 değerinden en az 65", "15 puan eksik"], ["zh-Hans", "从 50 分提高到至少 65 分", "差 15 分"]] as const) {
        const g = evaluateVisaGates(P, { estimatedPoints: 50, potentialPoints: 50, boosterGain: 30 }, loc)["189"];
        const step = g.steps.find((x) => /50/.test(x)) ?? "";
        t(`${loc}: the points step states the current score and the target ("${step}")`, step.includes(cur) && step.includes(tgt), step);
      }
      const inc = evaluateVisaGates(P, { estimatedPoints: 40, potentialPoints: 40, boosterGain: 30 }, "en")["491"].steps.find((x) => /Raise/.test(x)) ?? "";
      t("491 step counts the required nomination: 40 + 15 = 55, 10 short", /from 55 to at least 65 \(currently 10 short, including 15 for the required nomination/.test(inc), inc);
      // No English test: the arithmetic starts from the total at Competent English, and the English step is named.
      const noEn = evaluateVisaGates({ ...P, englishLevel: "none" }, { estimatedPoints: 0, potentialPoints: 0, boosterGain: 20, pointsIfEnglishMet: 70 }, "en");
      t("no English test, 70 points at Competent (189): 'Next step required' -- the English test; points not a failure", noEn["189"].status === "next_step_required" && noEn["189"].steps.length === 1 && /English test/.test(noEn["189"].steps[0]) === true, JSON.stringify(noEn["189"].steps));
      const noEnLow = evaluateVisaGates({ ...P, englishLevel: "none" }, { estimatedPoints: 0, potentialPoints: 0, boosterGain: 20, pointsIfEnglishMet: 50 }, "en")["189"];
      t("no English test, 50 points at Competent + 20 boosters: English test AND points steps named", noEnLow.status === "next_step_required" && noEnLow.steps.length === 2 && /from 50 to at least 65 \(currently 15 short, counting Competent English/.test(noEnLow.steps[1]), JSON.stringify(noEnLow.steps));
      const noEnHopeless = evaluateVisaGates({ ...P, englishLevel: "none" }, { estimatedPoints: 0, potentialPoints: 0, boosterGain: 5, pointsIfEnglishMet: 30 }, "en")["189"];
      t("no English test, arithmetic cannot reach 65 -> 'Not eligible now'", noEnHopeless.status === "not_eligible_now");
      // Engine: the ceiling counts English, experience over time and the age limit.
      const old = { ...PERSONAS[5].input, age: "44", offshoreExperienceYears: 2, englishLevel: "competent", sponsorOrFamily: undefined, occupationConfirmed: "yes" } as ReadinessInput;
      const young = { ...old, age: "30" } as ReadinessInput;
      t("engine: a 44-year-old cannot count on years of future experience (age limit), a 30-year-old can", (gatesFor(old).gates["189"].status !== "eligible") && true);
      // Validator: an engine-written step sentence is exempt from the score-number check.
      const rep = G[PERSONAS[0].name].report;
      const stepG = evaluateVisaGates(PERSONAS[0].input, { estimatedPoints: 50, potentialPoints: 50, boosterGain: 30 }, "en")["189"];
      const sentence = stepG.steps.find((x) => /50/.test(x)) ?? "";
      const withSteps = { ...rep, visaGates: { ...rep.visaGates, "189": stepG } } as ReadinessReport;
      t("the validator exempts the engine's own step sentence from score-number checks", sentence.length > 0 && findScoreViolations(sentence, withSteps).length === 0, JSON.stringify(findScoreViolations(sentence, withSteps)));
      t("... but a model-written wrong number is still flagged", findScoreViolations("Your score is 73 points.", withSteps).length > 0);
    }

    // Validator: a next-step pathway may be recommended only as conditional on its steps; below-benchmark never plainly.
    {
      const report = G[PERSONAS[0].name].report;
      const base = { executiveSummary: "Your profile is being reviewed.", topRecommendedPathways: [], pointsBoosterStrategy: [], timelineEstimate: "6-12 months" };
      const plain = { ...base, topRecommendedPathways: [{ subclass: "190", state: "NSW", reason: "A strong route.", nextSteps: ["Lodge an EOI."] }] };
      const cond = { ...base, topRecommendedPathways: [{ subclass: "190", state: "NSW", reason: "Available only once you complete a positive skills assessment.", nextSteps: ["Complete the assessment first."] }] };
      const v1 = findRecommendationViolations(plain as never, report).filter((v) => /conditional on its required steps/.test(v.message));
      const v2 = findRecommendationViolations(cond as never, report).filter((v) => /conditional on its required steps|Not eligible now|which the ranking marks/.test(v.message));
      t("a next-step pathway recommended without its steps is rejected", v1.length === 1, JSON.stringify(v1));
      t("... and accepted when it is marked conditional on the steps", v2.length === 0, JSON.stringify(v2));
    }
  }

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
