/**
 * The chat is information-only, like the report (lib/chat/information-only.ts, docs/chat-audit.md).
 *   1. The system prompts (free and premium) carry the information-only rules, last, in front of the language rule; the old plan /
 *      recommendation / status-label instructions are gone.
 *   2. 36 realistic prompts (en / tr / zh-Hans) run through handleChat with a stubbed model that returns DELIBERATELY NON-COMPLIANT answers
 *      (best visa, recommend, chances, "you should", next step, "you are (not) eligible", "you can use WA", imperatives): the text the
 *      visitor sees (opening summary + answer + correction blocks) has no banned pattern and still carries the factual sentences; a question
 *      about the visitor's own situation gets the referral to a registered migration agent / legal practitioner; every rewrite is logged.
 *   3. The opening summary is a neutral recap: entered details, points per subclass next to the published figures, links to the published
 *      requirements; no status label, no gap plan, no best-pathway line.
 *   4. The quick result card carries points and totals only (no status per visa, no list of states); the profile summary given to the model
 *      has no status-by-visa, no "states open" line.
 *   5. The assistant page (generateGroundedAnswer) and the report assistant route share the same rewrite.
 *
 *   npx tsx scripts/test-chat-information-only.ts
 */
import "./lib/stub-request-context";

process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/d?sslmode=disable"; // never connects

import { readFileSync } from "node:fs";

import { correctedUIStreamResponse } from "../lib/chat/corrected-stream";
import { handleChat, type ChatDeps, type StreamRequest } from "../lib/chat/handler";
import { ADVICE_NOTE, INFORMATION_ONLY_RULES, findBannedPatterns, sanitizeAnswer, type BannedId } from "../lib/chat/information-only";
import type { QuickProfileStore } from "../lib/chat/quick-profile";
import { saveQuickProfile, summarizeEngineResult, type QuickProfileDeps } from "../lib/chat/quick-profile-api";
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

const FACT: Record<Locale, { min: string; wa: string; age: string }> = {
  en: { min: "The published minimum is 65 points.", wa: "Western Australia's 190 General stream requires a full-time WA employment contract of at least six months.", age: "Applicants must be under 45 when invited." },
  tr: { min: "Yayımlanmış asgari puan 65'tir.", wa: "WA 190 General stream için en az altı ay süreli tam zamanlı bir WA iş sözleşmesi gerekir.", age: "Davet anında 45 yaşından küçük olunmalıdır." },
  "zh-Hans": { min: "公布的最低分为65分。", wa: "西澳190类General stream要求至少六个月的全职西澳雇佣合同。", age: "受邀时年龄须在45岁以下。" },
};

type Case = { locale: Locale; q: string; bad: string[]; keep: Array<keyof (typeof FACT)["en"]>; personal: boolean };
const C = (locale: Locale, q: string, bad: string[], keep: Case["keep"], personal = true): Case => ({ locale, q, bad, keep, personal });

const CASES: Case[] = [
  // ---- English
  C("en", "which visa is best for me?", ["The 190 is the best visa for you.", "You should apply for subclass 190 first."], ["min", "age"]),
  C("en", "can I get 190 in WA?", ["You can use WA for subclass 190.", "WA is open to you and your chances are good."], ["wa", "min"]),
  C("en", "what should I do next?", ["Your next step is to submit an EOI.", "Apply for a skills assessment now."], ["min"]),
  C("en", "what are my chances?", ["Your chances of an invitation are high.", "You will probably be invited soon."], ["min", "age"]),
  C("en", "Am I eligible for the 491?", ["You are eligible for the 491.", "I recommend lodging an EOI."], ["min", "age"]),
  C("en", "Which state should I choose for nomination?", ["The most realistic state for you is WA.", "Target Victoria as a fallback."], ["wa"]),
  C("en", "Is subclass 189 better than 190 for my profile?", ["The 189 is the better option for your profile.", "You do not qualify for the 190 yet."], ["min", "age"]),
  C("en", "What is the fastest way to PR?", ["The fastest pathway is the 491 route.", "You need to get a positive skills assessment first.", "Submit your EOI immediately."], ["min"]),
  C("en", "Will I get invited with 70 points?", ["You are likely to be invited with 70 points.", "Ideally you should improve your English to Superior."], ["min"]),
  C("en", "Should I move to WA to get nominated?", ["You should move to WA and start the job search.", "It is a strong option for you."], ["wa"]),
  C("en", "Do I meet the requirements for the 485?", ["You meet all the requirements for the 485.", "Lodge your application before you turn 36."], ["age"]),
  C("en", "What does the 190 General stream in WA require?", ["Make sure you have a WA job contract before applying."], ["wa"], false),
  // ---- Turkish
  C("tr", "Bana en uygun vize hangisi?", ["Size en uygun vize 190'dır.", "Hemen 190 için başvurun."], ["min", "age"]),
  C("tr", "WA'dan 190 alabilir miyim?", ["WA'yı kullanabilirsiniz.", "Şansınız yüksek."], ["wa", "min"]),
  C("tr", "Şimdi ne yapmalıyım?", ["Bir sonraki adım EOI göndermektir.", "Beceri değerlendirmesine başvurmalısınız."], ["min"]),
  C("tr", "Şansım nedir?", ["Davet alma olasılığınız yüksektir.", "Büyük ihtimalle davet alırsınız."], ["min", "age"]),
  C("tr", "491 için uygun muyum?", ["491 için uygunsunuz.", "EOI göndermenizi öneririm."], ["min", "age"]),
  C("tr", "Hangi eyaleti seçmeliyim?", ["En gerçekçi eyalet WA'dır.", "Victoria'yı da hedefleyin."], ["wa"]),
  C("tr", "189 mu 190 mı daha iyi?", ["189 sizin için daha iyi bir seçenektir.", "190 için hak kazanamazsınız."], ["min", "age"]),
  C("tr", "PR'ye en hızlı yol hangisi?", ["En hızlı yol 491'dir.", "Önce olumlu beceri değerlendirmesi almanız gerekiyor.", "EOI'nizi hemen gönderin."], ["min"], true),
  C("tr", "70 puanla davet alır mıyım?", ["70 puanla muhtemelen davet alırsınız.", "İngilizce seviyenizi artırmalısınız."], ["min"]),
  C("tr", "WA'ya taşınmalı mıyım?", ["WA'ya taşınmalısınız.", "Sizin için güçlü bir seçenek."], ["wa"]),
  C("tr", "485 şartlarını karşılıyor muyum?", ["485 şartlarını karşılıyorsunuz.", "36 yaşına girmeden başvurun."], ["age"]),
  C("tr", "WA 190 General stream ne istiyor?", ["WA'da iş sözleşmesi olduğundan emin olun."], ["wa"], false),
  // ---- Chinese
  C("zh-Hans", "哪个签证最适合我？", ["最适合您的是190签证。", "您应该先提交EOI。"], ["min", "age"]),
  C("zh-Hans", "我能在西澳拿到190吗？", ["您可以使用西澳申请190。", "您的机会很大。"], ["wa", "min"]),
  C("zh-Hans", "我下一步该做什么？", ["下一步是提交EOI。", "请先申请技能评估。"], ["min"]),
  C("zh-Hans", "我的机会有多大？", ["您被邀请的几率很高。", "您很可能很快获得邀请。"], ["min", "age"]),
  C("zh-Hans", "我符合491的条件吗？", ["您符合491的条件。", "我建议您提交EOI。"], ["min", "age"]),
  C("zh-Hans", "我应该选哪个州提名？", ["对您最现实的是西澳。", "把维多利亚作为备选目标。"], ["wa"]),
  C("zh-Hans", "189比190更适合我吗？", ["189是更适合您的选择。", "您没有资格申请190。"], ["min", "age"]),
  C("zh-Hans", "拿永居最快的方式是什么？", ["最快的途径是491。", "您需要先取得正面技能评估。", "请立即提交EOI。"], ["min"]),
  C("zh-Hans", "70分会被邀请吗？", ["70分您很可能会被邀请。", "您应该把英语提高到Superior。"], ["min"]),
  C("zh-Hans", "我应该搬到西澳吗？", ["您应该搬到西澳并开始找工作。", "这对您是很强的选择。"], ["wa"]),
  C("zh-Hans", "我满足485的要求吗？", ["您满足485的全部要求。", "请在36岁之前提交申请。"], ["age"]),
  C("zh-Hans", "西澳190 General stream有什么要求？", ["务必在申请前取得西澳的工作合同。"], ["wa"], false),
];

const PERSONA = { age: "28", occupation: "261313", englishLevel: "proficient", qualificationLevel: "Bachelor's Degree", qualificationAwardedInAustralia: "no", skillsAssessment: "no", currentCountry: "AU", residenceState: "VIC", currentVisa: "500" };

async function chunksOf(text: string): Promise<AsyncIterable<never>> {
  async function* gen() {
    yield { type: "start" } as never;
    yield { type: "text-start", id: "t1" } as never;
    // split mid-sentence so the hold-until-finished behaviour is exercised
    const mid = Math.floor(text.length / 2);
    yield { type: "text-delta", id: "t1", delta: text.slice(0, mid) } as never;
    yield { type: "text-delta", id: "t1", delta: text.slice(mid) } as never;
    yield { type: "text-end", id: "t1" } as never;
  }
  return gen();
}

async function visibleOf(res: Response): Promise<{ text: string; corrections: string[] }> {
  const body = await res.text();
  const parts = body.split("\n").filter((l) => l.startsWith("data: ") && l !== "data: [DONE]").map((l) => JSON.parse(l.slice(6)) as { type: string; delta?: string; data?: { text?: string } });
  return {
    text: parts.filter((p) => p.type === "text-delta").map((p) => p.delta).join(""),
    corrections: parts.filter((p) => p.type === "data-correction").map((p) => p.data?.text ?? ""),
  };
}

async function main() {
  const store = new Map<string, { inputJson: unknown; reportJson: unknown; updatedAt: Date }>();
  const quickStore: QuickProfileStore = {
    get: async (id) => store.get(id) ?? null,
    save: async (id, input, report) => void store.set(id, { inputJson: JSON.parse(JSON.stringify(input)), reportJson: JSON.parse(JSON.stringify(report)), updatedAt: new Date("2026-10-02") }),
  };
  const profiles = { verifiedEmailsForVisitor: async () => [] as string[], latestReportForEmail: async () => null };
  const qpDeps = (id: string): QuickProfileDeps => ({
    getVisitor: async () => ({ id, messageCount: 0, premiumCredits: 3 }),
    profiles,
    quickProfiles: quickStore,
    liveState: async () => ({}),
    runEngine: (input: ReadinessInput) => runReadinessEngine(input) as ReadinessReport,
  });
  const saved = await saveQuickProfile(new Request("https://x.test", { method: "POST", body: JSON.stringify({ locale: "en", fields: PERSONA }) }), qpDeps("v-prem"));
  const savedFree = await saveQuickProfile(new Request("https://x.test", { method: "POST", body: JSON.stringify({ locale: "en", fields: PERSONA }) }), qpDeps("v-free"));
  const savedBody = (await saved.json()) as Record<string, unknown>;

  const warnings: string[] = [];
  const realWarn = console.warn;
  console.warn = (...args: unknown[]) => void warnings.push(args.map(String).join(" "));

  const captured: StreamRequest[] = [];
  let stub = "";
  const deps = (visitorId: string, credits: number): ChatDeps => ({
    getVisitor: async () => ({ id: visitorId, messageCount: 0, premiumCredits: credits }),
    credits: { reserve: async () => true, refund: async () => {}, recordFreeMessage: async () => {} },
    profiles,
    quickProfiles: quickStore,
    liveState: async () => ({}),
    premiumModelId: "stub",
    expandQuery: async () => "",
    retrieve: async () => [],
    // The real stream wiring (corrected-stream) around a model that returns the non-compliant answer in `stub`.
    stream: async (opts) => {
      captured.push(opts);
      return correctedUIStreamResponse((await chunksOf(stub)) as never, opts.correct, opts.lead, opts.leadFingerprint, opts.sanitize);
    },
  });
  const ask = async (visitorId: string, credits: number, q: string, locale: Locale, answer: string) => {
    stub = answer;
    const res = await handleChat(new Request("https://x.test", { method: "POST", body: JSON.stringify({ locale, messages: [{ id: "m1", role: "user", parts: [{ type: "text", text: q }] }] }) }), deps(visitorId, credits));
    return { ...(await visibleOf(res)), system: captured[captured.length - 1]?.system ?? "" };
  };

  section("1. system prompts");
  {
    const prem = await ask("v-prem", 3, "what are the 190 requirements?", "en", FACT.en.min);
    const free = await ask("v-free", 0, "what are the 190 requirements?", "en", FACT.en.min);
    for (const [name, sys] of [["premium", prem.system], ["free", free.system]] as const) {
      t(`${name}: carries the information-only rules`, sys.includes(INFORMATION_ONLY_RULES.trim().slice(0, 80)));
      t(`${name}: the rules come after the guardrails and before the language rule`, sys.lastIndexOf("INFORMATION-ONLY RULES") > sys.indexOf("KESİN KURALLAR") && sys.lastIndexOf("YANIT DİLİ (en son kural") > sys.lastIndexOf("INFORMATION-ONLY RULES"));
      t(`${name}: no instruction to build an action plan / A-B plan / recommend / label a status`, !/eylem planı oluştur|A Planı, B Planı|önerme\b|Eligible, but below recent invitation|uygun olan ve olmayan rotaları/.test(sys.replace(INFORMATION_ONLY_RULES, "")));
    }
    t("the rules name the referral (registered migration agent / legal practitioner)", /registered migration agent \(MARA\) or an Australian legal practitioner/.test(INFORMATION_ONLY_RULES));
  }

  section("2. 36 non-compliant model answers, rewritten");
  const seenIds = new Set<BannedId>();
  {
    t(`${CASES.length} prompts (en / tr / zh-Hans)`, CASES.length >= 30 && ["en", "tr", "zh-Hans"].every((l) => CASES.filter((c) => c.locale === l).length >= 10));
    for (const c of CASES) {
      const facts = c.keep.map((k) => FACT[c.locale][k]);
      const modelAnswer = [c.bad[0], ...facts, ...c.bad.slice(1)].join(c.locale === "zh-Hans" ? "" : " ");
      const before = findBannedPatterns(modelAnswer, c.locale);
      const warnBefore = warnings.length;
      const out = await ask("v-prem", 3, c.q, c.locale, modelAnswer);
      const shown = [out.text, ...out.corrections].join("\n");
      const left = findBannedPatterns(shown, c.locale);
      const rewrites = warnings.slice(warnBefore).filter((w) => w.includes("chat_information_only_rewrite"));
      for (const w of rewrites) for (const m of w.matchAll(/"id":"([a-z_]+)"/g)) seenIds.add(m[1] as BannedId);
      t(`[${c.locale}] "${c.q}": the stub answer is non-compliant`, before.length > 0, JSON.stringify(c.bad));
      t(`[${c.locale}] "${c.q}": no banned pattern in what the visitor sees`, left.length === 0, left.map((x) => `${x.id}: ${x.sentence}`).join(" | "));
      t(`[${c.locale}] "${c.q}": the factual sentences are still there`, facts.every((f) => shown.includes(f.replace(/[.。]$/, ""))), shown.slice(0, 300));
      t(`[${c.locale}] "${c.q}": every rewrite is logged`, rewrites.length > 0 && rewrites.some((w) => before.some((b) => w.includes(b.id))));
      if (c.personal) t(`[${c.locale}] "${c.q}": a question about the visitor's own situation carries the referral`, out.text.includes(ADVICE_NOTE[c.locale]));
    }
    t("every banned pattern family was exercised (best / recommend / chance / should / next step / eligibility / permission / imperative)", ["best_pick", "recommend", "chance", "should", "next_step", "eligibility_verdict", "permission", "imperative"].every((id) => seenIds.has(id as BannedId)), [...seenIds].join(", "));
  }

  section("2b. correction blocks carry no banned pattern");
  {
    const { buildCorrections } = await import("../lib/chat/corrections");
    const { buildPlanSummary } = await import("../lib/chat/plan-summary");
    const stored = store.get("v-prem")!;
    const kinds = ["fee", "gate", "state_availability", "visa_name", "trt_period", "experience_points", "age_limit", "status_wording", "max_potential", "gap_figure", "benchmark_sufficiency", "state_condition", "authority_fee", "residence", "closing_language"] as const;
    for (const l of ["en", "tr", "zh-Hans"] as Locale[]) {
      const plan = buildPlanSummary(stored.reportJson, stored.inputJson, l)!;
      const texts = kinds.flatMap((kind) =>
        buildCorrections([{ kind, sentence: "x", detail: "x", subclasses: ["190"], topic: "skills_assessment", experience: { location: "overseas", years: 3, correct: 5 }, authority: "ACS", state: "NSW" }], l, { plan: plan.facts, input: stored.inputJson as never }).map((c) => c.text),
      );
      const bad = texts.flatMap((x) => findBannedPatterns(x, l).map((h) => `${h.id}: ${h.sentence}`));
      t(`[${l}] ${texts.length} correction texts built; no banned pattern`, texts.length >= 5 && bad.length === 0, bad.join(" | "));
    }
  }

  section("3. a compliant answer is untouched; the rewrite is idempotent");
  {
    for (const l of ["en", "tr", "zh-Hans"] as Locale[]) {
      const clean = `${FACT[l].min} ${FACT[l].age}`;
      const once = sanitizeAnswer(clean, { locale: l });
      t(`[${l}] a compliant answer comes back unchanged, no rewrite, no note`, once.text === clean && once.rewrites.length === 0 && !once.noteAdded, once.text);
      const dirty = sanitizeAnswer(`${l === "en" ? "You should apply now." : l === "tr" ? "Hemen başvurun." : "请立即提交EOI。"} ${clean}`, { locale: l });
      const twice = sanitizeAnswer(dirty.text, { locale: l });
      t(`[${l}] a rewritten answer is stable (second pass changes nothing)`, twice.text === dirty.text && twice.rewrites.length === 0, twice.text);
    }
    const kept = sanitizeAnswer("You should apply for subclass 190, which costs AUD 4,640.", { locale: "en" });
    t("a flagged sentence keeps its figure, tied to the subclass", /Subclass 190: costs AUD 4,640/.test(kept.text), kept.text);
    const dec = sanitizeAnswer("Fees are 1,000 and 2,000 AUD. Points are 4.5 per year.", { locale: "en" });
    t("a decimal or a thousands separator does not split a sentence", dec.text.includes("4.5 per year") && dec.rewrites.length === 0);
  }

  section("4. the opening summary is a neutral recap");
  {
    const leads: Record<string, string> = {};
    for (const l of ["en", "tr", "zh-Hans"] as Locale[]) {
      const out = await ask("v-prem", 3, l === "en" ? "what are my points?" : l === "tr" ? "puanım kaç?" : "我的分数是多少？", l, FACT[l].min);
      leads[l] = out.text;
      t(`[${l}] the summary shows entered details, points per subclass next to the published figures, and the published requirement links`, /190/.test(out.text) && /immi\.homeaffairs\.gov\.au\/visas\/getting-a-visa\/visa-listing\/skilled-nominated-190/.test(out.text) && /\b65\b/.test(out.text), out.text.slice(0, 400));
      t(`[${l}] ... no banned pattern, no status label, no gap plan, no best-pathway line`, findBannedPatterns(out.text, l).length === 0 && !/Eligible to pursue|Not eligible now|Next step required|Closing the gap|Açığı kapatma|补足差距|highest score your own actions/i.test(out.text));
    }
    t("the points in the summary are the engine's points from the saved entries", new RegExp(`\\b${String(savedBody.points)}\\b`).test(leads.en), String(savedBody.points));
  }

  section("5. quick result card and profile summary");
  {
    t("the saved-profile response carries points and per-subclass totals, no status per visa and no list of states", savedBody.points !== undefined && typeof savedBody.totals === "object" && savedBody.gates === undefined && savedBody.states === undefined, JSON.stringify(savedBody));
    t("free save works too", savedFree.status === 200);
    const sum = summarizeEngineResult(store.get("v-prem")?.reportJson as ReadinessReport);
    t("totals add the nomination points (190 +5, 491 +15) and the published minimum is 65", sum.totals?.["190"] === (sum.points ?? 0) + 5 && sum.totals?.["491"] === (sum.points ?? 0) + 15 && sum.minimum === 65);
    const out = await ask("v-prem", 3, "what are the 491 requirements?", "en", FACT.en.min);
    t("the profile block the model gets has no status-by-visa, no states-open line, no unmet-condition list", !/Status by visa|States open for this occupation|Not available on the visitor's answers/.test(out.system));
    for (const l of ["en", "tr", "zh-Hans"]) {
      const d = JSON.parse(readFileSync(`public/locales/${l}.json`, "utf8")) as Record<string, string>;
      const card = Object.entries(d).filter(([k]) => k.startsWith("chat.result.") && !/ctaLink|edit$/.test(k)).map(([, v]) => v).join(" "); // button labels are not answers
      t(`[${l}] the card strings carry no status labels, no states-open heading and no verdict wording`, !/status\./.test(Object.keys(d).filter((k) => k.startsWith("chat.result.")).join(" ")) && findBannedPatterns(card, l as Locale).length === 0 && !/Eligible to pursue|Not eligible now|States open|açık eyaletler|对您的职业开放的州/.test(card), card.slice(0, 200));
    }
  }

  section("6. the assistant page and the report assistant route");
  {
    const { generateGroundedAnswer } = await import("../lib/ai/generate-grounded-answer");
    for (const [l, q] of [["en", "am I eligible for the 190?"], ["tr", "uygun muyum, hangi vize should i choose"], ["en", "which visa should I choose"]] as const) {
      const r = await generateGroundedAnswer({ message: q, locale: l, context: [], stateContext: [] });
      t(`[${l}] assistant page "${q}": no banned pattern, carries the referral`, findBannedPatterns(r.answer, l).length === 0 && /migration agent|MARA|göç/.test(r.answer), r.answer);
    }
    const route = readFileSync("app/api/chat/route.ts", "utf8");
    t("the report assistant route no longer sends rankings, match percentages, recommendation tags, next steps or risk indicators to the model", !/rankedPathways|matchPercentage|recommendationTag|suggestedNextSteps|riskIndicators|pathwayComparison/.test(route.replace(/\/\/.*$/gm, "")));
    t("... and holds the model's answer, rewrites it (sanitizeAnswer) and logs the rewrite", /sanitizeAnswer\(full/.test(route) && /logRewrites/.test(route) && /INFORMATION_ONLY_RULES|assistantRules/.test(route));
    const sys = readFileSync("lib/ai/generate-grounded-answer.ts", "utf8");
    t("the assistant page prompt no longer instructs 'You are ineligible for this pathway because'", !/You are ineligible for this pathway because/.test(sys.slice(sys.indexOf("const SYSTEM_PROMPT"), sys.indexOf("].join", sys.indexOf("const SYSTEM_PROMPT")))));
  }

  console.warn = realWarn;
  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
