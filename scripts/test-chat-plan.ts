/**
 * Chat plan and wording (lib/chat/*), with the subclass 500 Software Engineer at 40 points (the real answer that
 * cited internal section names, said "gates", "not eligible" for a "Next step required" visa, "maximum potential" 55,
 * "Temporary Skill Shortage", a 3-year 482 -> 186 transition, "+5/+10" for 2 years in Australia and a "minimum age" 45).
 *
 *   1. Internal labels: never in the prompt's section names, flagged and stripped when they leak (en / tr / zh-Hans).
 *   2. The engine's opening summary: points, status per visa in the engine's labels, nomination-inclusive scores, the
 *      gap plan and the ceiling -- shown at the top of the answer itself, the model's text is what gets checked.
 *   3. Facts from the engine (visa names, 186 TRT period, experience points, age limit): injected, and each listed
 *      error is flagged by the answer check and corrected with its source.
 *   4. Length rules reach both paths.
 *   5. When the opening summary is shown: the first answer, a changed saved profile, or a question about the visitor's
 *      position -- never repeated otherwise (the model may refer back to it briefly).
 *   Corrections are for factual conflicts only; internal-term leaks are logged, bracketed labels are stripped on screen.
 * Real chat / engine code; in-memory stores, no model call, no network, no database.
 */
import "./lib/stub-request-context";

process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/d?sslmode=disable"; // never connects

import { convertToModelMessages, readUIMessageStream, type UIMessage, type UIMessageChunk } from "ai";

import { findEngineConflicts } from "../lib/chat/answer-check";
import { buildSourceCatalog, catalogRefs, renderCitations } from "../lib/chat/citations";
import { correctedUIStreamResponse } from "../lib/chat/corrected-stream";
import { buildCorrections } from "../lib/chat/corrections";
import { buildEngineFacts } from "../lib/chat/engine-facts";
import { handleChat, type ChatDeps, type StreamRequest } from "../lib/chat/handler";
import { findInternalLabels, stripInternalLabels } from "../lib/chat/internal-labels";
import { asksAboutPosition, buildPlanSummary, lastShownLeadFingerprint, profileFingerprint } from "../lib/chat/plan-summary";
import { buildPremiumSystemPrompt, buildSystemPrompt } from "../lib/chat/prompts";
import { quickProfileToInput, type QuickProfileStore } from "../lib/chat/quick-profile";
import { pointsClosureOf } from "../lib/readiness/engine";
import type { Locale, ReadinessInput, ReadinessReport } from "../lib/readiness/types";
import { pathwayStatusLabel } from "../lib/readiness/visa-gates";
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

// The persona: on a Student visa (500), Software Engineer, age 35, overseas Bachelor's, positive skills assessment.
const PERSONA = { age: "35", occupation: "261313", englishLevel: "competent", qualificationLevel: "Bachelor's Degree", qualificationAwardedInAustralia: "no", skillsAssessment: "yes", currentCountry: "AU", residenceState: "VIC", currentVisa: "500" };
const personaFor = (locale: Locale) => {
  const input = quickProfileToInput(PERSONA as never, locale);
  const report = JSON.parse(JSON.stringify(runReadinessEngine(input))) as ReadinessReport;
  return { input: JSON.parse(JSON.stringify(input)) as ReadinessInput, report };
};

async function* chunksOf(text: string): AsyncGenerator<UIMessageChunk> {
  yield { type: "start" };
  yield { type: "text-start", id: "t1" };
  for (const piece of text.match(/[\s\S]{1,16}/g) ?? []) yield { type: "text-delta", id: "t1", delta: piece };
  yield { type: "text-end", id: "t1" };
}
async function readMessage(res: Response): Promise<UIMessage> {
  const events = res
    .body!.pipeThrough(new TextDecoderStream())
    .pipeThrough(new TransformStream<string, UIMessageChunk>({ transform(chunk, c) { for (const line of chunk.split("\n")) if (line.startsWith("data: ") && line !== "data: [DONE]") c.enqueue(JSON.parse(line.slice(6))); } }));
  let message: UIMessage | undefined;
  for await (const m of readUIMessageStream({ stream: events })) message = m;
  return message!;
}
const textOf = (m: UIMessage) => m.parts.filter((p) => p.type === "text").map((p) => (p as { text: string }).text).join("");
const kinds = (text: string, opts: Parameters<typeof findEngineConflicts>[1] = {}) => findEngineConflicts(text, opts).map((c) => c.kind);

async function main() {
  const en = personaFor("en");
  t("the persona is 40 points, on a 500 visa, Next step required for 189 / 190 / 491", en.report.pointsEstimate?.estimatedPoints === 40 && en.input.currentVisaSubclass === "500" && ["189", "190", "491"].every((v) => en.report.visaGates?.[v]?.status === "next_step_required"));

  section("1. internal labels");
  {
    const real = "Ücretleri [ENGINE FACTS] içinden kontrol edin. Kaynak: [Kullanıcı Profili], [REFERANS BİLGİLERİ] ve [STUDENT VISA GUIDANCE] [S1]. Bu vizenin kapıları (gates) şunlardır.";
    const found = findInternalLabels(real).map((l) => l.match);
    t("every bracketed internal label from the real answer is found", ["[ENGINE FACTS]", "[Kullanıcı Profili]", "[REFERANS BİLGİLERİ]", "[STUDENT VISA GUIDANCE]"].every((x) => found.includes(x)), JSON.stringify(found));
    const stripped = stripInternalLabels(real);
    t("stripped: no bracketed internal label left, the [S1] citation marker survives", !/\[(ENGINE|Kullan|REFERANS|STUDENT)/i.test(stripped) && stripped.includes("[S1]"), stripped);
    t("a rendered citation is not touched", stripInternalLabels("Fee AUD 6,140 [Home Affairs – Subclass 491, p. 1].").includes("[Home Affairs – Subclass 491, p. 1]"));

    const samples: Record<Locale, string> = {
      en: "Check the fees from [ENGINE FACTS]; see [User Profile] and the reference data. These gates must be met.",
      tr: "Ücretleri [ENGINE FACTS] içinden kontrol edin ve [Kullanıcı Profili] verilerine bakın. Vize kapıları şunlardır.",
      "zh-Hans": "请从[引擎事实]中核对费用，并参考【参考数据】。这些关卡必须满足。",
    };
    for (const l of LOCALES) {
      const conflicts = findEngineConflicts(samples[l]);
      t(`${l}: flagged (brackets and the word "gates"/"kapılar"/"关卡") for the log, but NO correction block`, conflicts.some((c) => c.kind === "internal_label") && buildCorrections(conflicts, l).length === 0, JSON.stringify(conflicts.map((c) => c.detail)));
      t(`${l}: stripped text has no bracketed label`, findInternalLabels(stripInternalLabels(samples[l])).every((x) => x.kind === "term"));
    }
    {
      // Internal terms without any bracketed label: logged only, no block, nothing to strip.
      const terms: Record<Locale, string> = { en: "These gates and the engine facts decide it.", tr: "Vize kapıları ve referans verileri bunu belirler.", "zh-Hans": "关卡和参考数据决定了这一点。" };
      for (const l of LOCALES) {
        const found = findInternalLabels(terms[l]);
        const conflicts = findEngineConflicts(terms[l]);
        t(`${l}: an internal term without brackets is found and logged, never corrected, and the text is left as it is`, found.length > 0 && found.every((x) => x.kind === "term") && conflicts.some((c) => c.kind === "internal_label") && buildCorrections(conflicts, l).length === 0 && stripInternalLabels(terms[l]) === terms[l]);
      }
      const dis = findEngineConflicts("This is general knowledge. It is also not in my sources.");
      t("a repeated disclaimer is logged, never corrected", dis.some((c) => c.kind === "repeated_disclaimer") && buildCorrections(dis, "en").length === 0);
      const mixed = findEngineConflicts("Check [ENGINE FACTS]: subclass 491 visa fee is AUD 4,910.");
      const fixes = buildCorrections(mixed, "en");
      t("a factual conflict in the same answer still gets its block, and only that one", fixes.length === 1 && fixes[0].kind === "fee", JSON.stringify(fixes.map((f) => f.kind)));
    }
    t("normal wording is not flagged (your profile, requirements, the engine of a car is not the issue)", kinds("Your profile shows 40 points and the requirements for subclass 491 are listed in Home Affairs, p. 25.").length === 0);

    // The prompt itself: section names are neutral and carry the never-mention rule.
    const facts = buildEngineFacts();
    const freeP = buildSystemPrompt([{ content: "x", metadata: { source: "a.pdf" } }], { engineFacts: facts, profile: { summary: "Points: 40", source: "quick", lead: "LEAD TEXT" } });
    const catalog = buildSourceCatalog([{ content: "x", metadata: { source: "Subclass 491_23September2026.pdf", page: 3 } }, { content: "y", metadata: null }]);
    const premP = buildPremiumSystemPrompt({ references: "refs", profile: "Points: 40", profileSource: "quick", isFirstAnswer: true, lead: "LEAD TEXT", extras: { engineFacts: facts } });
    for (const [name, p] of [["free", freeP], ["premium", premP]] as const) {
      t(`${name} prompt: no citation-like section names ([ENGINE FACTS], [KULLANICI PROFİLİ], [REFERANS BİLGİLERİ], [STUDENT VISA GUIDANCE])`, !/\[(ENGINE FACTS|KULLANICI PROF|REFERANS B|STUDENT VISA|no citable)/i.test(p) && findInternalLabels(p).every((l) => l.kind !== "bracketed"), p.match(/\[[A-ZİÇĞÖŞÜ ]{4,}\]/)?.[0]);
      t(`${name} prompt: tells the model never to name sections, internal terms or "gates", and to cite only external sources with page`, p.includes('ASLA "block-1"') && p.includes("Department of Home Affairs") && p.includes("belge adı ile sayfasını"));
    }
    t("premium references: only [S#] markers are bracketed, an uncitable chunk is '(not citable)'", !/\[no citable/i.test(premP) && renderCitations("[S1]", catalogRefs(catalog)).includes("Subclass 491"));
  }

  section("2. the engine's opening summary");
  for (const l of LOCALES) {
    const { input, report } = personaFor(l);
    const plan = buildPlanSummary(report, input, l)!;
    const lead = plan.lead;
    t(`${l}: current points (40)`, lead.includes("40") && plan.facts.points === 40);
    t(`${l}: the status per visa in the engine's own labels (189 / 190 / 491)`, ["189", "190", "491"].every((v) => lead.includes(`${v} – ${pathwayStatusLabel(report.visaGates![v], l)}`)), lead);
    t(`${l}: 490/191-style: 190 and 491 scores include the required nomination ("40 + 15 = 55", "40 + 5 = 45") and the gap to 65`, lead.includes("40 + 15 = 55") && lead.includes("40 + 5 = 45") && /10/.test(lead.slice(lead.indexOf("40 + 15 = 55"))) && lead.includes("65"), lead);
    const closure = pointsClosureOf(report.pointsEstimate, input, l)!;
    t(`${l}: the engine's gap plan (what closes it, how long) and its own ceiling (${closure.baseTotal + closure.gain}), nothing else`, lead.includes("Proficient") && (l === "en" ? lead.includes("no waiting time needed") : true) && lead.includes(String(closure.baseTotal + closure.gain)) && plan.facts.ceiling === closure.baseTotal + closure.gain, lead);
    t(`${l}: short lines (points, one per visa, the gap plan), in the visitor's language, no internal label`, lead.split("\n").length === 6 && /^\d{3} – /.test(lead.split("\n")[1]) && !/^\d{3} – /.test(lead.split("\n")[0]) && findInternalLabels(lead).length === 0, lead);
  }
  {
    const { input, report } = personaFor("en");
    const store = new Map<string, { inputJson: unknown; reportJson: unknown; updatedAt: Date }>([["v", { inputJson: input, reportJson: report, updatedAt: new Date() }]]);
    const quickStore: QuickProfileStore = { get: async (id) => store.get(id) ?? null, save: async () => {} };
    for (const premium of [false, true]) {
      let captured: StreamRequest | undefined;
      const deps: ChatDeps = {
        getVisitor: async () => ({ id: "v", messageCount: 0, premiumCredits: premium ? 5 : 0 }),
        credits: { reserve: async () => true, refund: async () => {}, recordFreeMessage: async () => {} },
        profiles: { verifiedEmailsForVisitor: async () => [], latestReportForEmail: async () => null },
        quickProfiles: quickStore,
        premiumModelId: "gpt-4.1",
        expandQuery: async () => "",
        retrieve: async () => [{ content: "Visa application charge AUD 6,140.", metadata: { source: "Subclass 491_23September2026.pdf", page: 1 } }],
        stream: async (o) => ((captured = o), new Response("ok")),
        reportConflicts: () => {},
      };
      await handleChat(new Request("https://x.test", { method: "POST", body: JSON.stringify({ locale: "en", messages: [{ id: "m", role: "user", parts: [{ type: "text", text: "What are my options for a 491?" }] }] }) }), deps);
      const lead = captured?.lead ?? "";
      t(`${premium ? "premium" : "free"} path: the handler hands the stream the engine's lead, and the prompt carries it with the 'do not repeat or contradict' rule`, lead.includes("40 + 15 = 55") && (captured?.system ?? "").includes(lead) && (captured?.system ?? "").includes("yerine geçme") && (captured?.system ?? "").includes("EN FAZLA bir kısa bölüm"));
      const msg = await readMessage(correctedUIStreamResponse(chunksOf("Subclass 491 needs a nomination."), captured?.correct, captured?.lead));
      t(`${premium ? "premium" : "free"} path: the shown answer OPENS with the engine summary, then the model's text`, textOf(msg).startsWith(lead) && textOf(msg).endsWith("Subclass 491 needs a nomination."), textOf(msg).slice(0, 120));
    }
    // No profile: no lead, nothing prepended.
    let noProfile: StreamRequest | undefined;
    await handleChat(new Request("https://x.test", { method: "POST", body: JSON.stringify({ messages: [{ id: "m", role: "user", parts: [{ type: "text", text: "hi" }] }] }) }), {
      getVisitor: async () => ({ id: "other", messageCount: 0, premiumCredits: 0 }),
      credits: { reserve: async () => true, refund: async () => {}, recordFreeMessage: async () => {} },
      profiles: { verifiedEmailsForVisitor: async () => [], latestReportForEmail: async () => null },
      quickProfiles: quickStore,
      premiumModelId: "gpt-4.1",
      expandQuery: async () => "",
      retrieve: async () => [],
      stream: async (o) => ((noProfile = o), new Response("ok")),
      reportConflicts: () => {},
    });
    t("no profile: no opening summary", noProfile?.lead === undefined);
    // The answer check sees the model's text, not the engine's lead.
    const seen: string[] = [];
    await readMessage(correctedUIStreamResponse(chunksOf("Model text only."), (a) => (seen.push(a), []), "ENGINE LEAD."));
    t("the answer check receives only the model's text", seen[0] === "Model text only.");
  }
  {
    // "maximum potential" is only the engine's ceiling; the real answer called 55 the maximum.
    const { input, report } = personaFor("en");
    const plan = buildPlanSummary(report, input, "en")!;
    const ceiling = plan.facts.ceiling!;
    const claimed = findEngineConflicts("Your maximum potential is 55 points.", { ceiling });
    const fix = buildCorrections(claimed, "en", { plan: plan.facts });
    t(`"maximum potential 55" is flagged and corrected to the engine's ceiling (${ceiling})`, claimed.some((c) => c.kind === "max_potential") && fix.some((c) => c.text.includes(`is ${ceiling}`)), JSON.stringify(fix));
    t("the engine's own ceiling figure is not flagged", !kinds(`The maximum potential is ${ceiling}.`, { ceiling }).includes("max_potential"));
    t("tr / zh: 'maksimum potansiyel' and '最大潜力' are flagged too", kinds("Maksimum potansiyel puanınız 55.", { ceiling }).includes("max_potential") && kinds("您的最大潜力是 55 分。", { ceiling }).includes("max_potential"));
  }

  section("3. facts from the engine, each listed error flagged");
  {
    const facts = buildEngineFacts();
    t("injected: 482 = Skills in Demand (not TSS)", facts.includes("Subclass 482 = Skills in Demand visa") && facts.includes("NOT called Temporary Skill Shortage"));
    t("injected: 186 TRT = 2 years of sponsored employment in the 3 years before applying (gate matrix), Direct Entry 3 years of experience", facts.includes("2 years of full-time eligible sponsored employment in the 3 years") && facts.includes("at least 3 years of relevant work experience"));
    t("injected: experience points bands from the points table (2 years in Australia = +5, never +5/+10)", facts.includes("2 years of skilled employment in Australia = +5") && facts.includes("1-2: 5") && facts.includes("3-4: 10"));
    t("injected: age limit = under 45, an upper limit, never a minimum age", facts.includes("UNDER 45") && facts.includes("never a minimum age"));

    const status = { "189": "next_step_required", "190": "next_step_required", "491": "next_step_required", "485": "not_eligible_now" };
    const { input, report } = personaFor("en");
    const planFacts = buildPlanSummary(report, input, "en")!.facts;
    const errors: Array<{ kind: string; text: Record<Locale, string>; expect: Record<Locale, RegExp> }> = [
      { kind: "status_wording", text: { en: "You are not eligible for subclass 491.", tr: "491 alt sınıfı için uygun değilsiniz.", "zh-Hans": "您不符合子类 491 的条件。" }, expect: { en: /Correction: your status for subclass 491 is "Next step required", not "not eligible"/, tr: /Düzeltme: 491 alt sınıfı için durumunuz "Sonraki adım gerekli"/, "zh-Hans": /更正：您在子类 491 的状态是“需先完成下一步”/ } },
      { kind: "visa_name", text: { en: "Subclass 482 (Temporary Skill Shortage) needs an employer sponsor.", tr: "482 alt sınıfı (Temporary Skill Shortage) işveren sponsorluğu gerektirir.", "zh-Hans": "子类 482 是临时技能短缺签证。" }, expect: { en: /Correction: subclass 482 is the Skills in Demand visa \(Home Affairs, Subclass 482 page, p\.\d+\)/, tr: /Düzeltme: 482 alt sınıfı Skills in Demand vizesidir/, "zh-Hans": /更正：子类 482 是 Skills in Demand 签证/ } },
      { kind: "trt_period", text: { en: "Moving from 482 to 186 through the TRT stream takes 3 years of sponsored employment.", tr: "482'den 186'ya geçiş (TRT) için 3 yıl sponsorlu çalışma gerekir.", "zh-Hans": "从 482 转到 186（TRT）需要 3 年担保雇佣。" }, expect: { en: /Correction: the subclass 186 Temporary Residence Transition stream needs 2 years of full-time eligible sponsored employment in the 3 years before you apply \(Home Affairs, Subclass 186 page, p\.53\)/, tr: /Düzeltme: 186 alt sınıfı Temporary Residence Transition akışı, başvurudan önceki 3 yıl içinde 2 yıl/, "zh-Hans": /更正：子类 186 临时居留过渡类别要求在申请前的 3 年内有 2 年/ } },
      { kind: "experience_points", text: { en: "2 years of Australian experience = +5/+10 points.", tr: "Avustralya'da 2 yıl deneyim +5/+10 puan sağlar.", "zh-Hans": "在澳大利亚工作 2 年可得 +5/+10 分。" }, expect: { en: /Correction: 2 years of skilled employment in Australia earns 5 points \(LogiVisa points table/, tr: /Düzeltme: 2 yıl Avustralya'da nitelikli iş deneyimi 5 puan kazandırır/, "zh-Hans": /更正：2 年澳大利亚境内技术工作经验可得 5 分/ } },
      { kind: "age_limit", text: { en: "The minimum age is 45.", tr: "45 asgari yaş sınırıdır.", "zh-Hans": "45 岁是最低年龄。" }, expect: { en: /Correction: 45 is an upper limit, not a minimum age: you must be under 45 when you are invited \(189 \/ 190 \/ 491\) or when you apply \(186\) \(Home Affairs, Subclass 189 page, p\.\d+\)/, tr: /Düzeltme: 45 bir üst sınırdır, asgari yaş değildir/, "zh-Hans": /更正：45 岁是上限而不是最低年龄/ } },
      { kind: "max_potential", text: { en: "Your maximum potential is 55 points.", tr: "Maksimum potansiyel puanınız 55.", "zh-Hans": "您的最大潜力是 55 分。" }, expect: { en: /Correction: the highest score your own actions can reach before any nomination is \d+/, tr: /Düzeltme: kendi adımlarınızla adaylık öncesinde ulaşabileceğiniz en yüksek puan \d+/, "zh-Hans": /更正：仅靠您自己的行动（不含提名）能达到的最高分是 \d+/ } },
    ];
    for (const e of errors) {
      for (const l of LOCALES) {
        const conflicts = findEngineConflicts(e.text[l], { hasProfile: true, gateStatus: status, ceiling: planFacts.ceiling });
        const lp = buildPlanSummary(personaFor(l).report, personaFor(l).input, l)!.facts;
        const fixes = buildCorrections(conflicts, l, { plan: lp });
        t(`${e.kind} (${l}): flagged and corrected with its source`, conflicts.some((c) => c.kind === e.kind) && fixes.some((f) => f.kind === e.kind && e.expect[l].test(f.text)), JSON.stringify({ kinds: conflicts.map((c) => c.kind), fixes: fixes.map((f) => f.text) }));
      }
    }
    // Correct statements are not flagged.
    const ok = [
      "Subclass 482 is the Skills in Demand visa.",
      "The 186 Temporary Residence Transition stream needs 2 years of sponsored employment in the last 3 years.",
      "Direct Entry (subclass 186) needs at least 3 years of relevant work experience.",
      "2 years of Australian experience earns 5 points.",
      "3 years of work in Australia earns 10 points.",
      "You must be under 45 when invited.",
      "Subclass 491 is at the Next step required stage: you need a positive skills assessment.",
      "Subclass 485 is not eligible now because the degree is older than 6 months.",
    ];
    for (const s of ok) t(`correct statement not flagged: "${s.slice(0, 60)}"`, kinds(s, { hasProfile: true, gateStatus: status, ceiling: planFacts.ceiling }).length === 0, JSON.stringify(kinds(s, { hasProfile: true, gateStatus: status })));
  }

  section("4. length");
  {
    const p = buildPremiumSystemPrompt({ references: "r", profile: "Points: 40", profileSource: "quick", isFirstAnswer: false, lead: "LEAD", extras: { engineFacts: buildEngineFacts() } });
    t("with a profile the prompt asks for: the summary, at most one short section per visa, then the action plan, no restated requirement", p.includes("EN FAZLA bir kısa bölüm") && p.includes("eylem planı") && p.includes("tekrar anlatma"));
  }

  section("5. when the opening summary is shown");
  {
    const base = personaFor("en");
    const store = new Map<string, { inputJson: unknown; reportJson: unknown; updatedAt: Date }>([["v", { inputJson: base.input, reportJson: base.report, updatedAt: new Date("2026-10-03") }]]);
    const quickStore: QuickProfileStore = { get: async (id) => store.get(id) ?? null, save: async () => {} };
    let n = 0;
    const user = (text: string): UIMessage => ({ id: `u${++n}`, role: "user", parts: [{ type: "text", text }] });
    const run = async (premium: boolean, messages: UIMessage[], locale: string = "en") => {
      let captured: StreamRequest | undefined;
      const deps: ChatDeps = {
        getVisitor: async () => ({ id: "v", messageCount: 0, premiumCredits: premium ? 5 : 0 }),
        credits: { reserve: async () => true, refund: async () => {}, recordFreeMessage: async () => {} },
        profiles: { verifiedEmailsForVisitor: async () => [], latestReportForEmail: async () => null },
        quickProfiles: quickStore,
        premiumModelId: "gpt-4.1",
        expandQuery: async () => "",
        retrieve: async () => [{ content: "Visa application charge AUD 6,140.", metadata: { source: "Subclass 491_23September2026.pdf", page: 1 } }],
        stream: async (o) => ((captured = o), new Response("ok")),
        reportConflicts: () => {},
      };
      await handleChat(new Request("https://x.test", { method: "POST", body: JSON.stringify({ locale, messages }) }), deps);
      return captured!;
    };
    const answer = async (cap: StreamRequest, text: string) => readMessage(correctedUIStreamResponse(chunksOf(text), cap.correct, cap.lead, cap.leadFingerprint));
    const markerOf = (m: UIMessage) => m.parts.filter((p) => p.type === "data-lead").map((p) => (p as unknown as { data: { fp: string } }).data.fp);
    const SHOWN = "EN ÜSTÜNDE zaten gösterilen";
    const EARLIER = "daha önce gösterildi";

    for (const premium of [false, true]) {
      const path = premium ? "premium" : "free";
      const q1 = user("What are my options for a 491?");
      const cap1 = await run(premium, [q1]);
      const a1 = await answer(cap1, "Subclass 491 needs a nomination.");
      t(`${path}: first answer shows the summary, marked with the profile's fingerprint, and the prompt says it is shown at the top`, Boolean(cap1.lead) && textOf(a1).startsWith(cap1.lead!) && markerOf(a1).length === 1 && markerOf(a1)[0] === cap1.leadFingerprint && cap1.system.includes(SHOWN) && !cap1.system.includes(EARLIER));

      const cap2 = await run(premium, [q1, a1, user("What is the 491 visa fee?")]);
      const a2 = await answer(cap2, "The charge is AUD 6,140.");
      t(`${path}: the next answer does not repeat it (no lead, no marker, the shown text is the model's own)`, cap2.lead === undefined && cap2.leadFingerprint === undefined && textOf(a2) === "The charge is AUD 6,140." && markerOf(a2).length === 0);
      t(`${path}: the prompt still holds the facts, tells the model it was shown earlier, to refer back briefly and not repeat it`, cap2.system.includes(EARLIER) && cap2.system.includes("TEKRAR ETME") && cap2.system.includes("kısaca atıf") && !cap2.system.includes(SHOWN) && cap2.system.includes("40 + 15 = 55"));
      t(`${path}: the answer check still has the engine's statuses when the summary is not shown`, cap2.correct?.("You are not eligible for subclass 491.")?.some((c) => c.kind === "status_wording") === true);

      const cap3 = await run(premium, [q1, a1, user("What is the 491 visa fee?"), a2, user("And the 190?")]);
      t(`${path}: still not repeated on a third answer (the marker is read from the last answer that showed it)`, cap3.lead === undefined);

      for (const [ask, loc] of [["Where do I stand?", "en"], ["Durumum nedir?", "tr"], ["我的情况怎么样？", "zh-Hans"]] as const) {
        const cap = await run(premium, [q1, a1, user(ask)], loc);
        t(`${path}: "${ask}" shows it again (${loc})`, Boolean(cap.lead) && cap.leadFingerprint === cap1.leadFingerprint);
      }

      // The saved profile changes (28 instead of 35 years old: different points) -> shown again, new fingerprint.
      const changed = quickProfileToInput({ ...PERSONA, age: "28" } as never, "en");
      const changedReport = JSON.parse(JSON.stringify(runReadinessEngine(changed))) as ReadinessReport;
      store.set("v", { inputJson: JSON.parse(JSON.stringify(changed)), reportJson: changedReport, updatedAt: new Date("2026-10-03") });
      const cap4 = await run(premium, [q1, a1, user("What is the 491 visa fee?")]);
      t(`${path}: a changed saved profile shows the summary again, with the new fingerprint (${cap4.leadFingerprint} vs ${cap1.leadFingerprint})`, Boolean(cap4.lead) && cap4.lead !== cap1.lead && cap4.leadFingerprint !== cap1.leadFingerprint && cap4.system.includes(SHOWN));
      const a4 = await answer(cap4, "Same fee.");
      const cap5 = await run(premium, [q1, a1, user("What is the 491 visa fee?"), a4, user("And the 190?")]);
      t(`${path}: after the change it is shown once, then not again`, cap5.lead === undefined && lastShownLeadFingerprint([q1, a1, a4]) === cap4.leadFingerprint);
      store.set("v", { inputJson: base.input, reportJson: base.report, updatedAt: new Date("2026-10-03") });

      // A conversation from before the marker existed (an answer without it): the summary is shown once more.
      const legacy: UIMessage = { id: "old", role: "assistant", parts: [{ type: "text", text: `${cap1.lead}\n\nOld answer.` }] };
      const cap6 = await run(premium, [q1, legacy, user("What is the 491 visa fee?")]);
      t(`${path}: an earlier answer without the marker counts as 'not shown yet'`, Boolean(cap6.lead));
      await convertToModelMessages([q1, a1, user("next")]).then(() => t(`${path}: the marker part passes through the model-message conversion`, true), (e) => t(`${path}: the marker part passes through the model-message conversion`, false, String(e)));
    }

    t("fingerprint: same profile, same value; another profile, another value", profileFingerprint({ summary: "Points: 40", source: "quick" }) === profileFingerprint({ summary: "Points: 40", source: "quick" }) && profileFingerprint({ summary: "Points: 45", source: "quick" }) !== profileFingerprint({ summary: "Points: 40", source: "quick" }));
    t("position questions (en / tr / zh) are recognised, other questions are not", ["Where do I stand?", "What is my score?", "Am I eligible for 491?", "Durumum nedir?", "Puanım kaç?", "我的分数是多少？"].every(asksAboutPosition) && !["What is the 491 visa fee?", "491 vizesi ücreti nedir?", "491 签证费是多少？", "How long does a skills assessment take?"].some(asksAboutPosition));
  }

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
