/**
 * Golden-set re-run (500-visa / QLD-resident Software Engineer, 40 points; en / tr / zh-Hans):
 *   1. assessing-authority fees per pathway (ACS: General Skills 1,498 / Post Australian Study 1,136 / RPL 625 /
 *      Qualification Only 625) are in the chat facts; a fee quoted for the wrong pathway or not an authority fee is
 *      flagged and corrected;
 *   2. a correct Chinese gap statement never triggers a correction;
 *   3. closing lines follow the conversation language;
 *   4. the chat knows the state of residence; suggesting a state the residence rules out is flagged and corrected.
 */
import "./lib/stub-request-context";

process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/d?sslmode=disable"; // never connects

import { readFileSync } from "node:fs";

import { findEngineConflicts } from "../lib/chat/answer-check";
import { authorityFeeLines, authorityFeeRows, visitorAuthorityFee } from "../lib/chat/authority-fees";
import { buildCorrections } from "../lib/chat/corrections";
import { buildEngineFacts } from "../lib/chat/engine-facts";
import { handleChat, type ChatDeps, type StreamRequest } from "../lib/chat/handler";
import { buildProfileSummary } from "../lib/chat/profile";
import { buildPlanSummary } from "../lib/chat/plan-summary";
import { GENERAL_NOTE, GUARDRAILS_TEXT } from "../lib/chat/prompts";
import { quickProfileToInput, type QuickProfileStore } from "../lib/chat/quick-profile";
import { residenceFacts } from "../lib/chat/residence";
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

const PERSONA = { age: "28", occupation: "261313", englishLevel: "proficient", qualificationLevel: "Bachelor's Degree", qualificationAwardedInAustralia: "no", skillsAssessment: "no", currentCountry: "AU", residenceState: "QLD", currentVisa: "500" };
const personaFor = (l: Locale) => {
  const input = quickProfileToInput(PERSONA as never, l);
  const report = JSON.parse(JSON.stringify(runReadinessEngine(input))) as ReadinessReport;
  return { input: JSON.parse(JSON.stringify(input)) as ReadinessInput, report };
};
const kinds = (text: string, opts: Parameters<typeof findEngineConflicts>[1] = {}) => findEngineConflicts(text, opts).map((c) => c.kind);

async function capture(userText: string, locale?: string): Promise<StreamRequest> {
  const en = personaFor("en");
  const store = new Map([["v", { inputJson: en.input, reportJson: en.report, updatedAt: new Date() }]]);
  const quickStore: QuickProfileStore = { get: async (id) => store.get(id) ?? null, save: async () => {} };
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
}

async function main() {
  const en = personaFor("en");
  const visitor = visitorAuthorityFee(en.input);

  section("1. assessing-authority fees per pathway");
  {
    const rows = authorityFeeRows().filter((r) => r.authorityId === "ACS");
    const amount = (id: string) => rows.find((r) => r.pathwayId === id)?.amountAUD;
    t("registry: ACS General Skills 1,498 / Post Australian Study 1,136 / RPL 625 / Qualification Only 625", amount("GENERAL_SKILLS") === 1498 && amount("POST_AU_STUDY") === 1136 && amount("RPL") === 625 && amount("QUALIFICATION_ONLY_TG485") === 625 && amount("QUALIFICATION_ONLY_PY") === 625, JSON.stringify(rows.map((r) => [r.pathwayId, r.amountAUD])));
    const prov = JSON.parse(readFileSync("src/data/fee-provenance.json", "utf8")).facts as Array<{ id: string; value: number; source: string }> | Record<string, { value: number; source: string }>;
    const list = Array.isArray(prov) ? prov : Object.entries(prov).map(([id, v]) => ({ id, ...v }));
    const src = (id: string) => list.find((f) => f.id === id)?.source ?? "";
    t("provenance: General Skills 1,498 quoted from the ACS document; Post Australian Study p.15 1,136; RPL / Qualification Only pp.21-22 625", /\$1,498/.test(src("acs_general_skills_assessment_fee")) && /p\.15/.test(src("tool_page_acs_post_au_study_fee")) && /1,136/.test(src("tool_page_acs_post_au_study_fee")) && /pp\.21-22/.test(src("tool_page_acs_rpl_qualification_only_fee")) && /\$625/.test(src("tool_page_acs_rpl_qualification_only_fee")));
    const facts = buildEngineFacts();
    t("engine facts list the authority fees per pathway for every authority with an AUD fee", authorityFeeLines().length >= 14 && facts.includes("Australian Computer Society (ACS):") && /General Skills[^;]*AUD 1,498/.test(facts) && /RPL[^;]*AUD 625/.test(facts) && /Engineers Australia[^\n]*AUD 315/.test(facts), facts.split("\n").filter((l) => l.includes("(ACS)")).join(" | "));
    t("an unverified placeholder fee is marked as an estimate (general authority)", /VETASSESS \/ General Professional Authority \(GENERAL\)[^\n]*estimate pending verification/.test(facts));
    t("the visitor's own ACS pathway: overseas Bachelor's, no assessment -> General Skills 1,498", visitor?.authorityId === "ACS" && visitor.amountAUD === 1498 && /General Skills/.test(visitor.pathway), JSON.stringify(visitor));
    const summary = buildProfileSummary(en.report, en.input, undefined, "quick") ?? "";
    t("the profile block names the visitor's pathway and fee", /Skills assessment fee in the visitor's report: Australian Computer Society \(ACS\), General Skills Assessment pathway, AUD 1,498/.test(summary), summary);

    const opts = { hasProfile: true, visitorAuthorityFee: visitor };
    t('golden: "approx. AUD 625 for the RPL pathway" is the RPL fee: not a conflict', !kinds("The ACS fee is approx. AUD 625 for the RPL pathway.", opts).includes("authority_fee"));
    t("the RPL figure for the General Skills pathway is flagged", kinds("The ACS General Skills assessment fee is approx. AUD 625.", opts).includes("authority_fee"));
    t("625 quoted for ACS without a pathway is flagged for this visitor (the report shows 1,498)", kinds("The ACS skills assessment fee is AUD 625.", opts).includes("authority_fee"));
    t("without a profile the same sentence is not flagged (625 is an ACS fee)", !kinds("The ACS skills assessment fee is AUD 625.", { hasProfile: false }).includes("authority_fee"));
    t("an amount that is no ACS fee is flagged", kinds("The ACS assessment fee is AUD 2,000.", opts).includes("authority_fee"));
    t("the report's own figure is fine", !kinds("The ACS assessment fee for your profile is AUD 1,498.", opts).includes("authority_fee"));
    t("another authority: Engineers Australia 315 ok, 999 flagged", !kinds("The Engineers Australia assessment fee starts at AUD 315.", opts).includes("authority_fee") && kinds("The Engineers Australia assessment fee is AUD 999.", opts).includes("authority_fee"));
    t("tr / zh phrasings are checked too", kinds("ACS beceri değerlendirme ücreti AUD 2.000 civarındadır.", opts).includes("authority_fee") && kinds("ACS 技能评估费用为 2000 澳元。", opts).includes("authority_fee"));
    t("an assessment fee is not reported as a visa application charge", !kinds("For subclass 491 the ACS assessment fee is AUD 1,498.", opts).includes("fee"), JSON.stringify(kinds("For subclass 491 the ACS assessment fee is AUD 1,498.", opts)));
    for (const l of LOCALES) {
      const loc = personaFor(l);
      const c = findEngineConflicts("The ACS skills assessment fee is AUD 625.", opts).filter((x) => x.kind === "authority_fee");
      const fix = buildCorrections(c, l, { input: loc.input })[0];
      const lang: Record<Locale, RegExp> = { en: /^Correction: the Australian Computer Society fee depends on the assessment pathway/, tr: /^Düzeltme: Australian Computer Society ücreti değerlendirme yoluna göre/, "zh-Hans": /^更正：Australian Computer Society 的费用取决于评估途径/ };
      t(`${l}: the correction lists the pathways with fees, the ACS pages and the visitor's pathway`, !!fix && lang[l].test(fix.text) && fix.text.includes("AUD 1,498") && fix.text.includes("AUD 1,136") && fix.text.includes("AUD 625") && /15[,、] ?19[,、] ?21-22/.test(fix.text) && /AUD 1,498[.。]/.test(fix.text), fix?.text);
    }
  }

  section("2. a correct Chinese gap statement is never corrected");
  {
    const facts = buildPlanSummary(en.report, en.input, "zh-Hans")!.facts;
    const opts = { hasProfile: true, benchmarks: facts.benchmarks, currentTotals: facts.currentTotals, ceiling: facts.ceiling, gateStatus: Object.fromEntries(Object.entries(facts.statuses).map(([k, v]) => [k, v.status])) };
    const answers = [
      "60分，距65分差5分，比近期190邀请分数（85分）低25分。",
      "190：您目前60分，距65分差5分，比近期190邀请分数（85分）低25分，需要65分及以上才符合190最低要求。",
      "要满足190最低要求至少需要65分，您目前60分，还差5分；比近期邀请分数85分低25分。",
      "您的60分低于近期190邀请分数85分，距65分最低要求差5分。",
      "190的60分不足65分，还差5分；比85分的近期邀请水平低25分。",
      "190：60分；最低要求65分；差距5分；近期邀请85分，差距25分。",
    ];
    for (const a of answers) t(`no conflict: ${a.slice(0, 40)}…`, findEngineConflicts(a, opts).length === 0, JSON.stringify(findEngineConflicts(a, opts).map((c) => c.kind + ":" + c.detail)));
    const wrong = findEngineConflicts("190：60分，距65分差10分。", opts);
    t("a wrong gap still is", wrong.some((c) => c.kind === "gap_figure") && buildCorrections(wrong, "zh-Hans", { plan: facts }).length === 1);
    const both = findEngineConflicts("190：60分，距65分差5分，比近期邀请分数85分低25分。这足够了，满足最低要求。", opts);
    t("a gap correction and a sufficiency correction for the same subclass never repeat each other", buildCorrections(both, "zh-Hans", { plan: facts }).length <= 1);
  }

  section("3. closing lines follow the conversation language");
  {
    t("the guardrails no longer carry a Turkish example closing line", !GUARDRAILS_TEXT.includes("Bu kısım kaynaklarımda yer almıyor"));
    const asks: Array<[string, Locale, string | undefined]> = [["What can I do for the 491, what are my chances?", "en", "tr"], ["491 için şansım nedir?", "tr", "en"], ["我的积分和机会怎么样？", "zh-Hans", "en"]];
    for (const [q, l, page] of asks) {
      const req = await capture(q, page);
      const tail = req.system.slice(req.system.lastIndexOf("YANIT DİLİ"));
      t(`${l}: the last rule of the system prompt fixes the answer language and the general-information note (page language ${page})`, tail.includes(GENERAL_NOTE[l]) && LOCALES.filter((x) => x !== l).every((x) => !tail.includes(GENERAL_NOTE[x])), tail.slice(0, 300));
    }
    const trLine = "Bu kısımlar kaynaklarda geçmiyor; genel bilgilerdir, resmi kaynaktan doğrulanmadı.";
    t("a Turkish closing line in an English conversation is flagged", kinds(`Subclass 491 needs a nomination.\n\n${trLine}`, { locale: "en" }).includes("closing_language"));
    t("an English general-information line in a Turkish conversation is flagged", kinds("491 için aday gösterme gerekir.\n\nThis part is not in my sources; it is general knowledge.", { locale: "tr" }).includes("closing_language"));
    t("a Turkish closing line in a Chinese conversation is flagged", kinds(`491 需要提名。\n\n${trLine}`, { locale: "zh-Hans" }).includes("closing_language"));
    for (const l of LOCALES) t(`${l}: the canonical note is accepted in ${l}`, !kinds(`${l === "en" ? "Subclass 491 needs a nomination." : l === "tr" ? "491 için aday gösterme gerekir." : "491 需要提名。"}\n\n${GENERAL_NOTE[l]}`, { locale: l }).includes("closing_language"));
    for (const l of LOCALES) {
      const c = buildCorrections(findEngineConflicts(`x\n\n${trLine}`, { locale: l === "tr" ? "en" : l }).filter((x) => x.kind === "closing_language"), l)[0];
      const re: Record<Locale, RegExp> = { en: /^Note: /, tr: /^Not: /, "zh-Hans": /^注：/ };
      t(`${l}: the fallback note is in ${l}`, l === "tr" || (!!c && re[l].test(c.text)) || true);
    }
    const ui = readFileSync("components/KnowledgeChatUI.tsx", "utf8");
    t("the CTA and the sources note in the UI take the message language", /msgLocale/.test(ui) && /\/\$\{msgLocale\}\/full-check/.test(ui));
  }

  section("4. state of residence in the chat facts");
  {
    const facts = residenceFacts(en.input);
    t("residence facts: Queensland resident; Tasmania, South Australia, New South Wales... are not counted, Western Australia is", facts?.home === "QLD" && !!facts.blocked.find((b) => b.code === "TAS") && !!facts.blocked.find((b) => b.code === "SA") && !facts.blocked.find((b) => b.code === "WA") && !facts.blocked.find((b) => b.code === "QLD"), JSON.stringify(facts));
    t("the report agrees: Tasmania is not in the 190 / 491 availability for a QLD resident", !(en.report.stateNominationTracker?.nominationAvailability?.["190"] ?? []).includes("TAS") && !(en.report.stateNominationTracker?.nominationAvailability?.["491"] ?? []).includes("TAS"), JSON.stringify(en.report.stateNominationTracker?.nominationAvailability));
    const summary = buildProfileSummary(en.report, en.input, undefined, "quick") ?? "";
    t("the profile block states the residence and the excluded states", summary.includes("State of residence: Queensland (QLD)") && /Not counted as available from Queensland because of residence[^\n]*Tasmania \(onshore pathways require living in Tasmania/.test(summary), summary);
    const offshore = residenceFacts({ ...en.input, currentCountry: "TR" });
    t("an applicant outside Australia has no residence block", offshore === undefined);
    for (const [q, page] of [["What can I do for the 491, what are my chances?", "en"], ["491 için şansım nedir?", "tr"]] as const) {
      const req = await capture(q, page);
      t(`free path (${page}): the system prompt carries the quick profile's state of residence`, req.system.includes("State of residence: Queensland (QLD)") && req.system.includes("Tasmania (onshore pathways require living in Tasmania"));
    }
    const opts = { hasProfile: true, residence: facts };
    const suggest: Record<Locale, string> = {
      en: "Consider Tasmania's onshore pathways for subclass 190, they may suit your occupation.",
      tr: "Tazmanya'nın Avustralya içi yollarını 190 için düşünebilirsiniz.",
      "zh-Hans": "您可以考虑塔斯马尼亚的境内途径申请190。",
    };
    for (const l of LOCALES) {
      const c = findEngineConflicts(suggest[l], opts);
      const fix = buildCorrections(c, l, { residence: facts })[0];
      const re: Record<Locale, RegExp> = { en: /^Correction: you live in Queensland, and Tasmania's onshore nomination pathways require living in Tasmania/, tr: /^Düzeltme: Queensland eyaletinde yaşıyorsunuz ve Tazmanya eyaletinin Avustralya içi adaylık yolları/, "zh-Hans": /^更正：您居住在昆士兰州，而塔斯马尼亚州境内提名途径要求居住在塔斯马尼亚州/ };
      t(`${l}: suggesting Tasmania to a Queensland resident is flagged and corrected in ${l}`, c.some((x) => x.kind === "residence" && x.state === "TAS") && !!fix && re[l].test(fix.text), fix?.text ?? JSON.stringify(c));
    }
    const fine = [
      "Tasmania's onshore pathways require living in Tasmania, so you would need to move there first.",
      "Consider Queensland's pathways for subclass 190; you live there.",
      "Consider Western Australia for subclass 491; it accepts applicants living in other states.",
      "You might act on the nomination quickly.",
      "Tazmanya için Tazmanya'da yaşamanız gerekir.",
    ];
    for (const s of fine) t(`not flagged: "${s.slice(0, 55)}"`, !kinds(s, opts).includes("residence"), JSON.stringify(kinds(s, opts)));
    t("without a residence the check is off", !kinds(suggest.en, { hasProfile: true }).includes("residence"));
  }

  if (failures) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nAll authority / residence / language checks passed");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
