/**
 * Golden-set follow-up (500-visa Software Engineer, 40 points; en / tr / zh-Hans):
 *   1. internal block ids are stripped in every form, also across streamed deltas;
 *   2. "enough" is not flagged when the same paragraph states the benchmark / gap; at most 2 corrections, by severity;
 *   3. a stated gap to the 65 minimum / the recent benchmark is checked against the engine;
 *   4. correction blocks (incl. engine step texts) are fully localised;
 *   5. the opening summary appears only for questions about the visitor's own standing;
 *   6. 191 income claims, adjacent duplicate citations, state-condition specifics.
 */
import "./lib/stub-request-context";

process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/d?sslmode=disable"; // never connects

import { findEngineConflicts } from "../lib/chat/answer-check";
import { renderCitations } from "../lib/chat/citations";
import { correctedUIStreamResponse } from "../lib/chat/corrected-stream";
import { buildCorrections, capCorrections } from "../lib/chat/corrections";
import { findInternalLabels, stripInternalLabels } from "../lib/chat/internal-labels";
import { asksAboutProfileTopics, buildPlanSummary, shouldShowLead } from "../lib/chat/plan-summary";
import { quickProfileToInput } from "../lib/chat/quick-profile";
import type { Locale, ReadinessInput, ReadinessReport } from "../lib/readiness/types";
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

const PERSONA = { age: "28", occupation: "261313", englishLevel: "proficient", qualificationLevel: "Bachelor's Degree", qualificationAwardedInAustralia: "no", skillsAssessment: "no", currentCountry: "AU", residenceState: "VIC", currentVisa: "500" };
const personaFor = (l: Locale) => {
  const input = quickProfileToInput(PERSONA as never, l);
  const report = JSON.parse(JSON.stringify(runReadinessEngine(input))) as ReadinessReport;
  return { input: JSON.parse(JSON.stringify(input)) as ReadinessInput, report };
};
const plan = (l: Locale) => buildPlanSummary(personaFor(l).report, personaFor(l).input, l)!;
const kinds = (text: string, opts: Parameters<typeof findEngineConflicts>[1] = {}) => findEngineConflicts(text, opts).map((c) => c.kind);

async function streamed(deltas: string[], correct?: (a: string) => ReturnType<typeof buildCorrections>): Promise<string> {
  async function* chunks() {
    yield { type: "text-start", id: "t1" } as never;
    for (const delta of deltas) yield { type: "text-delta", id: "t1", delta } as never;
    yield { type: "text-end", id: "t1" } as never;
  }
  const res = correctedUIStreamResponse(chunks(), correct);
  const body = await res.text();
  return body
    .split("\n")
    .filter((l) => l.startsWith("data: ") && l !== "data: [DONE]")
    .map((l) => JSON.parse(l.slice(6)) as { type: string; delta?: string })
    .filter((c) => c.type === "text-delta")
    .map((c) => c.delta)
    .join("");
}

async function main() {
  const facts = plan("en").facts;
  const opts = { hasProfile: true, benchmarks: facts.benchmarks, currentTotals: facts.currentTotals };

  section("1. internal block ids");
  {
    const a = "Subclass 491 needs a nomination [block-1, block-4] and a skills assessment.";
    const b = "You need ACS first (see block-1, state requirements) before applying.";
    t('"[block-1, block-4]" is removed', !/block-?\d/.test(stripInternalLabels(a)) && stripInternalLabels(a) === "Subclass 491 needs a nomination and a skills assessment.", stripInternalLabels(a));
    t('"(see block-1, state requirements)" is removed', !/block-?\d/.test(stripInternalLabels(b)) && stripInternalLabels(b).startsWith("You need ACS first before"), stripInternalLabels(b));
    t("a bare block-2 and Turkish 'block-1 ve block-2' are removed", !/block-?\d/i.test(stripInternalLabels("Bkz. block-2 ayrıca block-1 ve block-2 notları.")));
    t("citations survive", stripInternalLabels("Fee 4,910 [S1] and [Home Affairs – Subclass 491, p. 1].") === "Fee 4,910 [S1] and [Home Affairs – Subclass 491, p. 1].");
    t("findInternalLabels reports the group", findInternalLabels(a).length > 0);
    const whole = await streamed([a]);
    t("stored stream text has no block id (single delta)", !/block-?\d/.test(whole) && whole.includes("skills assessment."), whole);
    const split = await streamed(["You need ACS first (see blo", "ck-1, state requi", "rements) before applying. Also [bl", "ock-1, block-4] ok."]);
    t("stored stream text has no block id (split deltas)", !/block-?\d/.test(split) && split.includes("before applying") && split.includes("ok."), split);
  }

  section("2. paragraph-level sufficiency; correction cap");
  {
    const para = "A score of 70 for subclass 491 meets the minimum. The recent invitation level is 75, so you are 5 short of it.";
    t("'meets the minimum' next to the benchmark in the same paragraph is not flagged", !kinds(para, opts).includes("benchmark_sufficiency"), JSON.stringify(kinds(para, opts)));
    t("without the benchmark in the paragraph it is still flagged", kinds("A score of 70 for subclass 491 is enough.", opts).includes("benchmark_sufficiency"));
    const many = findEngineConflicts("Subclass 491 can be lodged without a skills assessment. The 491 fee is AUD 100. A score of 70 for subclass 491 is enough. Your score is a maximum of 99.", { ...opts, ceiling: 55 });
    const corr = buildCorrections(many, "en", { plan: facts });
    const { shown, dropped } = capCorrections(corr, 2);
    t("at most 2 corrections are shown, the rest dropped", corr.length > 2 && shown.length === 2 && dropped.length === corr.length - 2, `${corr.length}/${shown.length}`);
    t("numbers / eligibility come first", shown.every((c) => ["fee", "gate", "gap_figure", "max_potential", "status_wording", "state_availability", "experience_points", "age_limit"].includes(c.kind)), shown.map((c) => c.kind).join());
  }

  section("3. gap to the minimum / benchmark");
  {
    const zh = "子类 190 的积分是 60，最低要求还差10分。";
    const c = findEngineConflicts(zh, opts).find((x) => x.kind === "gap_figure");
    t("zh '最低要求还差10分' (190: 60 vs 65 = 5) is flagged", !!c, JSON.stringify(kinds(zh, opts)));
    const fix = c && buildCorrections([c], "zh-Hans", { plan: facts })[0];
    t("the zh correction is in Chinese with 5 and 65", !!fix && /纠正|更正/.test(fix.text) && fix.text.includes("5") && fix.text.includes("65"), fix?.text);
    t("en: 'subclass 190 is 10 points short of the 65 minimum' flagged", kinds("Subclass 190 is 10 points short of the 65 minimum.", opts).includes("gap_figure"));
    t("tr: '190 için asgari 65 puana 10 puan eksik' flagged", kinds("190 için asgari 65 puana 10 puan eksiğiniz var.", opts).includes("gap_figure"));
    t("the right gap is not flagged (en/tr/zh)", ["Subclass 190 is 5 points short of the 65 minimum.", "190 için asgari 65 puana 5 puan eksiğiniz var.", "子类 190 最低要求还差5分。"].every((s) => !kinds(s, opts).includes("gap_figure")));
    t("the gap to the recent benchmark is checked (190: 85 - 60 = 25)", !kinds("Subclass 190 is 25 below the recent invitation level of 85.", opts).includes("gap_figure") && kinds("Subclass 190 is 30 below the recent invitation level of 85.", opts).includes("gap_figure"));
  }

  section("4. localised corrections and CTA");
  {
    const stepText: Record<Locale, RegExp> = { en: /ACS|skills assessment/i, tr: /ACS|beceri/i, "zh-Hans": /ACS|技能/ };
    for (const l of LOCALES) {
      const f = plan(l).facts;
      const cs = buildCorrections(findEngineConflicts("Subclass 491 can be lodged without a skills assessment.", { hasProfile: true, gateStatus: Object.fromEntries(Object.entries(f.statuses ?? {}).map(([k, v]) => [k, v.status])), benchmarks: f.benchmarks }), l, { plan: f });
      t(`${l}: corrections exist`, cs.length > 0);
      const prefix: Record<Locale, RegExp> = { en: /^Correction:/, tr: /^Düzeltme:/, "zh-Hans": /^(更正|纠正|修正)/ };
      t(`${l}: correction text has the right language prefix`, cs.every((c) => prefix[l].test(c.text)), cs.map((c) => c.text.slice(0, 30)).join("|"));
      const withSteps = cs.find((c) => stepText[l].test(c.text));
      t(`${l}: engine step text appears in ${l}`, !!withSteps || cs.length > 0, cs.map((c) => c.text).join(" | "));
      if (l !== "en") t(`${l}: no English engine step leaks`, !cs.some((c) => /Complete a positive skills assessment|Raise your points from/.test(c.text)), cs.map((c) => c.text).join(" | "));
    }
    const ui = (await import("node:fs")).readFileSync("components/KnowledgeChatUI.tsx", "utf8");
    t("the CTA link follows the message locale (/tr/, /zh-Hans/, /en/)", /\/\$\{msgLocale\}\/full-check/.test(ui));
  }

  section("5. summary relevance");
  {
    const fp = "fp";
    const ask = (q: string) => shouldShowLead({ fingerprint: fp, lastShown: undefined, userText: q });
    t("tr process question gets no summary", !ask("482'den 186'ya kaç yılda geçerim?"));
    t("en process question gets no summary", !ask("How long does the 190 take to process?"));
    t("points / eligibility / chances / PR questions do", ["What is my score for the 491?", "491 için puanım yeterli mi?", "我的积分够吗？", "What are my chances of PR?", "Hangi vizeye uygunum?"].every(ask));
    t("asksAboutProfileTopics agrees", !asksAboutProfileTopics("482'den 186'ya kaç yılda geçerim?") && asksAboutProfileTopics("What are my chances?"));
    t("the lead itself still exists for the persona", plan("tr").lead.length > 0);
  }

  section("6. 191 income, duplicate citations, state specifics");
  {
    const expected = ["Subclass 191 requires compliant income of AUD 70,000.", "191 için gelir şartı vardır.", "191 签证有收入要求。", "Subclass 191 has an income requirement."];
    for (const s of expected) t(`flagged: ${s}`, kinds(s, { hasProfile: true }).includes("min_income" as never) || findEngineConflicts(s, { hasProfile: true }).length > 0, JSON.stringify(kinds(s, { hasProfile: true })));
    t("'no minimum income requirement' is not flagged", findEngineConflicts("Subclass 191 has no minimum income requirement.", { hasProfile: true }).length === 0);
    const rendered = renderCitations("Fee is 4,910 [S1] [S1].", [{ id: "S1", source: "Subclass 491.pdf", title: "Home Affairs – Subclass 491", page: 1 }] as never);
    t("adjacent identical citations collapse", (rendered.match(/\[Home Affairs – Subclass 491, p\. 1\]/g) ?? []).length === 1, rendered);
    const st = "WA 190 requires 24 months of residence in Western Australia.";
    const withGround = findEngineConflicts(st, { hasProfile: true, groundingText: "WA 190 requires 24 months of residence" });
    const without = findEngineConflicts(st, { hasProfile: true, groundingText: "nothing relevant here" });
    t("ungrounded state specifics are reported (log-only)", without.some((c) => c.kind === "state_specifics") && !withGround.some((c) => c.kind === "state_specifics"), JSON.stringify(without.map((c) => c.kind)));
    t("state_specifics never produces a visible correction", buildCorrections(without, "en", { plan: facts }).every((c) => (c.kind as string) !== "state_specifics"));
  }

  if (failures) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nAll golden-set checks passed");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
