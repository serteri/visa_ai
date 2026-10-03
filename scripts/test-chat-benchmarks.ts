/**
 * Chat opening summary and answer checks, round 3 (500-visa Software Engineer, 40 points now / 55 with a positive skills
 * assessment, no assessment yet; en / tr / zh-Hans):
 *   1. the summary is in the conversation language (what the visitor writes in), not the page language;
 *   2. every points-tested visa shows the sum, the 65 minimum AND the recent invitation level; "enough" claims below it are corrected;
 *   3. unambiguous points wording, and only the engine ceiling may be called a maximum (tr / zh phrasings, other engine numbers);
 *   4. the WA 190 stream condition is in the chat facts; "move to WA" without the contract is flagged;
 *   5. a 191 statement cites the 191 document; the 491 under-18 dependant fee agrees across the sources.
 */
import "./lib/stub-request-context";

process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/d?sslmode=disable"; // never connects

import { readFileSync } from "node:fs";

import { findEngineConflicts } from "../lib/chat/answer-check";
import { alignCitationsToSubclass, renderCitations, sourceSubclass } from "../lib/chat/citations";
import { buildCorrections, conversationLocale } from "../lib/chat/corrections";
import { buildEngineFacts, engineFeeTable } from "../lib/chat/engine-facts";
import { handleChat, type ChatDeps, type StreamRequest } from "../lib/chat/handler";
import { buildProfileSummary } from "../lib/chat/profile";
import { buildPlanSummary } from "../lib/chat/plan-summary";
import { quickProfileToInput, type QuickProfileStore } from "../lib/chat/quick-profile";
import type { SourceRef } from "../lib/chat/types";
import type { Locale, ReadinessInput, ReadinessReport } from "../lib/readiness/types";
import { REVIEW_PERSONAS } from "./render-persona-pdfs";
import { runReadinessEngine } from "../src/lib/readiness-engine";

let failures = 0;
const t = (label: string, cond: boolean, detail = "") => {
  if (cond) console.log(`  ✅ ${label}`);
  else {
    failures++;
    console.error(`  ❌ ${label}${detail ? ` -- ${detail}` : ""}`);
  }
};
const section = (s: string) => console.log(`\n==================== ${s} ====================`);
const LOCALES: Locale[] = ["en", "tr", "zh-Hans"];

// 500 visa, age 28, Proficient English, overseas Bachelor's, no skills assessment: 40 points now, 55 with the assessment.
const PERSONA = { age: "28", occupation: "261313", englishLevel: "proficient", qualificationLevel: "Bachelor's Degree", qualificationAwardedInAustralia: "no", skillsAssessment: "no", currentCountry: "AU", residenceState: "VIC", currentVisa: "500" };
const personaFor = (l: Locale) => {
  const input = quickProfileToInput(PERSONA as never, l);
  const report = JSON.parse(JSON.stringify(runReadinessEngine(input))) as ReadinessReport;
  return { input: JSON.parse(JSON.stringify(input)) as ReadinessInput, report };
};
const kinds = (text: string, opts: Parameters<typeof findEngineConflicts>[1] = {}) => findEngineConflicts(text, opts).map((c) => c.kind);

async function main() {
  const en = personaFor("en");
  t("the persona: 40 points now, 55 with a positive skills assessment, 490 benchmarks 95 / 85 / 75", en.report.pointsEstimate?.estimatedPoints === 40 && en.report.pointsEstimate?.potentialPoints === 55 && [en.report.pathwayScores?.["189"].benchmark, en.report.pathwayScores?.["190"].benchmark, en.report.pathwayScores?.["491"].benchmark].join() === "95,85,75");
  const plan = (l: Locale) => buildPlanSummary(personaFor(l).report, personaFor(l).input, l)!;

  section("1. summary language = conversation language");
  {
    const store = new Map([["v", { inputJson: en.input, reportJson: en.report, updatedAt: new Date() }]]);
    const quickStore: QuickProfileStore = { get: async (id) => store.get(id) ?? null, save: async () => {} };
    const lead = async (userText: string, locale?: string) => {
      let captured: StreamRequest | undefined;
      const deps: ChatDeps = {
        getVisitor: async () => ({ id: "v", messageCount: 0, premiumCredits: 0 }),
        credits: { reserve: async () => true, refund: async () => {}, recordFreeMessage: async () => {} },
        profiles: { verifiedEmailsForVisitor: async () => [], latestReportForEmail: async () => null },
        quickProfiles: quickStore,
        premiumModelId: "gpt-4.1",
        expandQuery: async () => "",
        retrieve: async () => [],
        stream: async (o) => ((captured = o), new Response("ok")),
        reportConflicts: () => {},
      };
      await handleChat(new Request("https://x.test", { method: "POST", body: JSON.stringify({ ...(locale ? { locale } : {}), messages: [{ id: "m", role: "user", parts: [{ type: "text", text: userText }] }] }) }), deps);
      return captured!;
    };
    const tr = await lead("500 vizesindeyim, 491 için ne yapmalıyım?", "en");
    t("a Turkish question on an English page (client language en): the summary is Turkish", (tr.lead ?? "").startsWith("Şu an 40 puanınız var") && !/Your estimate|You have 40/.test(tr.lead ?? ""), tr.lead);
    const zh = await lead("我现在持500签证，491怎么办？", "en");
    t("a Chinese question on an English page: the summary is Chinese", (zh.lead ?? "").startsWith("您目前有 40 分"), zh.lead);
    const enq = await lead("What can I do for the 491?", "tr");
    t("an English question on a Turkish page: the summary is English", (enq.lead ?? "").startsWith("You have 40 points now"), enq.lead);
    const none = await lead("491?", "tr");
    t("no language cue in the message: the client's language (tr)", (none.lead ?? "").startsWith("Şu an 40 puanınız var"), none.lead);
    t("the corrections follow the same language", buildCorrections(findEngineConflicts("Subclass 491 can be lodged without a skills assessment."), conversationLocale(["491 vizesi için ne yapmalıyım?"], "en"), {}).every((c) => /^Düzeltme:/.test(c.text)));
    t("conversationLocale: newest clearly-non-English message wins; falls back to the client, then en", conversationLocale(["What is 491?", "Peki ya 190 nasıl?"], "en") === "tr" && conversationLocale(["491?"], "zh-Hans") === "zh-Hans" && conversationLocale(["What is 491?"], "tr") === "en" && conversationLocale(["hi"], undefined) === "en");
    // The same summary exists in all three languages.
    t("the summary is built in en, tr and zh-Hans with the same figures", LOCALES.every((l) => plan(l).lead.includes("491: 55 + 15 = 70") && plan(l).facts.benchmarks?.["491"]?.benchmark === 75));
  }

  section("2. benchmarks in the summary; 'enough' claims below the benchmark are corrected");
  {
    const e = plan("en").lead;
    t("en: 491 — sum, the 65 minimum and the recent invitation level", e.includes("491: 55 + 15 = 70 — meets the 65 minimum, 5 below the recent invitation level of 75"), e);
    t("en: 190 and 189 likewise (nomination included for 190 only)", e.includes("190: 55 + 5 = 60 — 5 short of the 65 minimum, 25 below the recent invitation level of 85") && e.includes("189: 55 — 10 short of the 65 minimum, 40 below the recent invitation level of 95"), e);
    const tr = plan("tr").lead;
    const zh = plan("zh-Hans").lead;
    t("tr: 491 — sum, asgari 65 and the recent level", tr.includes("491: 55 + 15 = 70 — 65 asgari puanı karşılıyor, son davet seviyesi olan 75'in 5 puan altında"), tr);
    t("zh-Hans: 491 — sum, minimum and the recent level", zh.includes("491: 55 + 15 = 70 — 达到 65 分最低要求，比近期邀请水平 75 分低 5 分"), zh);
    const { input, report } = personaFor("en");
    t("the engine's status labels are used", e.includes("189 – Next step required") && e.includes("491 – Next step required"));
    // "Eligible, but below recent invitation levels": the reference profile with a completed assessment.
    const ref = REVIEW_PERSONAS["ref-xyz-wa-job"] as ReadinessInput;
    const refReport = JSON.parse(JSON.stringify(runReadinessEngine({ ...ref, locale: "en" }))) as ReadinessReport;
    const refLead = buildPlanSummary(refReport, ref, "en")!.lead;
    t("an eligible-but-below visa shows the engine's label and the figures (190: 70 + 5 = 75 vs 85)", refLead.includes("190 – Eligible, but below recent invitation levels (your 75 vs recent 85, 10 points short)") && refLead.includes("190: 70 + 5 = 75 — meets the 65 minimum, 10 below the recent invitation level of 85") && refLead.includes("491: 70 + 15 = 85 — meets the 65 minimum, above the recent invitation level of 75"), refLead);
    void input; void report;

    const facts = plan("en").facts;
    const opts = { hasProfile: true, benchmarks: facts.benchmarks };
    const claims: Record<Locale, string> = {
      en: "A score of 70 for subclass 491 is enough, it meets the requirements.",
      tr: "491 alt sınıfı için 70 puan yeterlidir.",
      "zh-Hans": "子类 491 的 70 分足够了，已经满足要求。",
    };
    for (const l of LOCALES) {
      const conflicts = findEngineConflicts(claims[l], opts);
      const fix = buildCorrections(conflicts, l, { plan: facts }).find((c) => c.kind === "benchmark_sufficiency");
      t(`${l}: "enough / sufficient / meets the requirements" for a 491 score below the recent level is flagged and corrected`, conflicts.some((c) => c.kind === "benchmark_sufficiency") && !!fix && fix.text.includes("70") && fix.text.includes("75") && fix.text.includes("5"), JSON.stringify(fix));
    }
    t("en: the correction names the figures and the source date", buildCorrections(findEngineConflicts(claims.en, opts), "en", { plan: facts })[0].text === "Correction: for subclass 491 your score including the nomination the visa requires is 70, 5 below the recent invitation level of 75 (recent invitation data in your LogiVisa report, as of 2026-04-30); meeting the minimum is not the same as being invited.", buildCorrections(findEngineConflicts(claims.en, opts), "en", { plan: facts })[0]?.text);
    const fine = [
      "Subclass 491 meets the 65 minimum but is 5 below the recent invitation level of 75.",
      "A score of 70 for subclass 491 is not enough to be invited yet.",
      "Subclass 491: 70 puan 65 asgari puanı karşılıyor ancak son davet seviyesinin altında.",
      "子类 491 的 70 分满足 65 分最低要求，但低于近期邀请水平。",
      "Your English is enough for the 65 minimum.",
    ];
    for (const s of fine) t(`not flagged: "${s.slice(0, 55)}"`, !kinds(s, opts).includes("benchmark_sufficiency"), JSON.stringify(kinds(s, opts)));
    t("a visa at or above its benchmark may be called enough", !kinds("Subclass 491 is enough at 85.", { benchmarks: { "491": { total: 85, benchmark: 75 } } }).includes("benchmark_sufficiency"));
  }

  section("3. unambiguous points wording; only the engine ceiling is a maximum");
  {
    const lead = { en: plan("en").lead, tr: plan("tr").lead, "zh-Hans": plan("zh-Hans").lead };
    t("en: '40 points now; 55 once a positive skills assessment lets you claim your qualification and experience points'", lead.en.startsWith("You have 40 points now; 55 once a positive skills assessment lets you claim your qualification and experience points;") && !lead.en.includes("(55 with"), lead.en);
    t("tr: 'Şu an 40 puanınız var; olumlu bir beceri değerlendirmesi nitelik ve deneyim puanlarınızı almanızı sağladığında 55'", lead.tr.startsWith("Şu an 40 puanınız var; olumlu bir beceri değerlendirmesi nitelik ve deneyim puanlarınızı almanızı sağladığında 55;"), lead.tr);
    t("zh-Hans: the 55 is tied to claiming the qualification and experience points", lead["zh-Hans"].startsWith("您目前有 40 分；获得正面技能评估、可以申报学历和工作经验加分后为 55 分；"), lead["zh-Hans"]);
    const ceiling = plan("en").facts.ceiling!;
    const opts = { hasProfile: true, ceiling };
    const bad = [
      "Your maximum potential is 55 points.",
      "Maksimum potansiyel puanınız 55.",
      "Potansiyel maksimum 55 puan.",
      "Ulaşabileceğiniz en yüksek puan 55.",
      "Azami puanınız 55 olabilir.",
      "您的最大潜力是 55 分。",
      "最高可能得分是 55 分。",
      "您最高可达 55 分。",
      "The potential maximum is 55.",
      "Your maximum score is 60.",
    ];
    for (const s of bad) t(`flagged (the figure is not the engine ceiling ${ceiling}): "${s}"`, kinds(s, opts).includes("max_potential"), JSON.stringify(kinds(s, opts)));
    const fix = buildCorrections(findEngineConflicts("Maksimum potansiyel puanınız 55.", opts), "tr", { plan: plan("tr").facts });
    t("tr correction states the engine ceiling", fix.some((c) => c.kind === "max_potential" && c.text.includes(`${ceiling}`)), JSON.stringify(fix));
    const ok = [
      `The highest score your own actions can reach before any nomination is ${ceiling}.`,
      `Kendi adımlarınızla ulaşabileceğiniz en yüksek puan ${ceiling}.`,
      `仅靠您自己的行动能达到的最高分是 ${ceiling}。`,
      "Superior English earns the maximum score for English.",
      "Age 25-32 earns the maximum points for age.",
    ];
    for (const s of ok) t(`not flagged: "${s.slice(0, 60)}"`, !kinds(s, opts).includes("max_potential"), JSON.stringify(kinds(s, opts)));
  }

  section("4. WA 190 stream condition in the chat facts");
  {
    const facts = buildEngineFacts();
    t("engine facts: WA 190 needs a six-month full-time WA employment contract (p.5, 9), not 491; moving to WA does not meet it", facts.includes("subclass 190, General stream") && facts.includes("at least six months") && facts.includes("pp. 5, 9") && facts.includes("NOT required for subclass 491") && facts.includes("Moving to WA, or living there, does not meet it"));
    const ref = REVIEW_PERSONAS["ref-xyz-qld"] as ReadinessInput;
    const refReport = runReadinessEngine({ ...ref, locale: "en" });
    const summary = buildProfileSummary(JSON.parse(JSON.stringify(refReport)), ref)!;
    t("the visitor's profile lists WA as 'Not available for 190 (Requires a WA job offer)' and still open for 491", summary.includes("Not available on the visitor's answers (state stream condition unmet): 190 -> WA (Requires a WA job offer)") && summary.includes("491 -> WA"), summary);
    const flagged: Record<Locale, string> = {
      en: "To qualify for subclass 190 in WA you should move to Western Australia.",
      tr: "WA'daki 190 için Batı Avustralya'ya taşınmalısınız.",
      "zh-Hans": "要满足西澳的 190，您需要搬到西澳。",
    };
    for (const l of LOCALES) {
      const c = findEngineConflicts(flagged[l], { hasProfile: true });
      const fix = buildCorrections(c, l).find((x) => x.kind === "state_condition");
      t(`${l}: "move to WA" as the way to meet WA 190 is flagged and corrected with the contract and its source`, c.some((x) => x.kind === "state_condition") && !!fix && /six months|altı ay|六个月/.test(fix.text) && /p\. 5, 9|s\. 5, 9|第 5、9 页/.test(fix.text), JSON.stringify(c.map((x) => x.kind)));
    }
    const fine = ["To qualify for subclass 190 in WA you need a WA job offer: a full-time employment contract of at least six months.", "Subclass 491 can be done by living in WA; no contract is needed.", "Moving to WA for work with an employer contract meets the 190 stream."];
    for (const s of fine) t(`not flagged: "${s.slice(0, 60)}"`, !kinds(s + " Subclass 190 is the state-nominated visa.", { hasProfile: true }).includes("state_condition"));
  }

  section("5. 191 citations; the 491 under-18 dependant fee");
  {
    const refs: SourceRef[] = [
      { id: "S1", source: "Skilled Independent visa (subclass 189) Points-tested stream_23_09_2026.pdf", page: 7 },
      { id: "S2", source: "Permanent Residence (Skilled Regional) visa (subclass 191).pdf", page: 3 },
      { id: "S3", source: "Subclass 491 Skilled Work Regional (Provisional) visa - Main applicant_23September2026.pdf", page: 4 },
    ];
    t("sourceSubclass reads the subclass from a document name", sourceSubclass(refs[0].source) === "189" && sourceSubclass(refs[1].source) === "191" && sourceSubclass(refs[2].source) === "491" && sourceSubclass("Skilled occupation list.xlsx") === undefined);
    const wrong = "Subclass 191 needs 3 years in a designated regional area [S1]. Subclass 491 charges AUD 6,140 [S3].";
    const out = renderCitations(wrong, refs);
    t("a 191 statement tagged with the 189 page is cited to the 191 document", out.includes("Subclass 191 needs 3 years in a designated regional area [Home Affairs – Permanent Residence (Skilled Regional) visa (subclass 191), p. 3]") || /191[^.]*\[[^\]]*191[^\]]*p\. 3\]/.test(out), out);
    t("... and no 189 citation remains on it; the 491 sentence keeps its 491 citation", !/191[^.]*Subclass 189/.test(out) && /491 charges AUD 6,140 \[[^\]]*491[^\]]*p\. 4\]/.test(out), out);
    t("without a retrieved 191 document the wrong marker is dropped, never left on the 189 page", !renderCitations("Subclass 191 needs 3 years [S1].", [refs[0], refs[2]]).includes("189") && alignCitationsToSubclass("Subclass 191 needs 3 years [S1].", [refs[0]]) === "Subclass 191 needs 3 years .");
    t("a sentence about two subclasses may cite either document; one about none is untouched", alignCitationsToSubclass("The 191 follows a 491 [S3].", refs) === "The 191 follows a 491 [S3]." && alignCitationsToSubclass("Fees change often [S1].", refs) === "Fees change often [S1].");
    t("the text is rebuilt exactly (line breaks and spacing kept)", alignCitationsToSubclass("Line one.\nSubclass 191 rule [S1]. Last.", refs) === "Line one.\nSubclass 191 rule [S2]. Last.");

    // 491 under-18 dependant fee: the report's fee data, the extraction from the 491 document (p.4 quote) and the provenance agree.
    const fees = JSON.parse(readFileSync("src/data/visa-fees.json", "utf8")).visas["491"].vac;
    const extract = JSON.parse(readFileSync("src/data/additional-applicant-vac.json", "utf8")).subclasses["491"];
    const prov = JSON.stringify(JSON.parse(readFileSync("src/data/fee-provenance.json", "utf8")));
    t("491 child under 18: report fee data = 491 document extraction (p.4, 'Additional Applicant Charge U18 | 1 | 1,535.00') = provenance = chat engine table: AUD 1,535", fees.child_under_18 === 1535 && extract.childUnder18.amountAud === 1535 && extract.childUnder18.page === 4 && extract.childUnder18.quote.includes("1,535.00") && prov.includes("vac_additional_child_491") && engineFeeTable()["491"].includes(1535), JSON.stringify({ fees: fees.child_under_18, extract: extract.childUnder18 }));
    const wrongFee = findEngineConflicts("The 491 additional applicant charge for each child under 18 is AUD 1,540.");
    const fix = buildCorrections(wrongFee, "en").find((c) => c.kind === "fee");
    t("the 189 figure (AUD 1,540) given for a 491 child is flagged and corrected to AUD 1,535", wrongFee.some((c) => c.kind === "fee") && !!fix && fix.text.includes("AUD 1,535 for each child under 18"), JSON.stringify(fix));
    t("the correct figure is not flagged", !kinds("The 491 additional applicant charge for each child under 18 is AUD 1,535.").includes("fee"));
  }

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
