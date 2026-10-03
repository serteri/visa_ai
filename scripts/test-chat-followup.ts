/**
 * Chat follow-up (lib/chat/*): visible corrections, knowledge-index audit, quick profile for free visitors, the
 * credit-balance header. Real chat / engine / prompt code; in-memory stores, no model call, no network, no database.
 *
 *   1. Corrections: a fee / gate / state-availability conflict found after streaming -> a correction block with the
 *      engine's fact and source (en/tr/zh), appended to the SAME message in the stream; conflicts still logged.
 *   2. Index audit: current / superseded / orphaned classification and what the cleaner would delete.
 *   3. Quick profile card for free visitors: saved with no model call, compact engine result, free answers use it.
 *   4. Balance: remaining premium / free messages, updated after every message, refunds, the low-balance notice.
 */
import "./lib/stub-request-context";

process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/d?sslmode=disable"; // never connects

import { readUIMessageStream, type UIMessage, type UIMessageChunk } from "ai";

import { findEngineConflicts } from "../lib/chat/answer-check";
import { describeBalance, getBalance } from "../lib/chat/balance";
import { correctedUIStreamResponse } from "../lib/chat/corrected-stream";
import { buildEngineFacts } from "../lib/chat/engine-facts";
import { buildCorrections, detectAnswerLocale } from "../lib/chat/corrections";
import { handleChat, type ChatDeps, type StreamRequest } from "../lib/chat/handler";
import { classifyIndex, rowsToDelete, summarizeAudit } from "../lib/chat/index-audit";
import { buildSystemPrompt } from "../lib/chat/prompts";
import type { QuickProfileStore } from "../lib/chat/quick-profile";
import { getQuickProfile, saveQuickProfile, type QuickProfileDeps } from "../lib/chat/quick-profile-api";
import type { ReadinessInput, ReadinessReport } from "../lib/readiness/types";
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

async function* chunksOf(text: string): AsyncGenerator<UIMessageChunk> {
  yield { type: "start" };
  yield { type: "text-start", id: "t1" };
  for (const piece of text.match(/[\s\S]{1,12}/g) ?? []) yield { type: "text-delta", id: "t1", delta: piece };
  yield { type: "text-end", id: "t1" };
}

/** Reads a UI message stream response back into the finished message, as the client does. */
async function readMessage(res: Response): Promise<{ message: UIMessage; raw: string }> {
  const [a, b] = res.body!.tee();
  const raw = await new Response(b).text();
  const events = a
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(
      new TransformStream<string, UIMessageChunk>({
        transform(chunk, controller) {
          for (const line of chunk.split("\n")) if (line.startsWith("data: ") && line !== "data: [DONE]") controller.enqueue(JSON.parse(line.slice(6)));
        },
      }),
    );
  let message: UIMessage | undefined;
  for await (const m of readUIMessageStream({ stream: events })) message = m;
  return { message: message!, raw };
}

const BAD_EN = "The subclass 491 application charge is AUD 4,910. You can apply for the 491 without a skills assessment. The 191 has a minimum income requirement. Software engineers are in demand in most states.";
const textOf = (m: UIMessage) => m.parts.filter((p) => p.type === "text").map((p) => (p as { text: string }).text).join("");
const correctionsOf = (m: UIMessage) => m.parts.filter((p) => p.type === "data-correction").map((p) => (p as unknown as { data: { kind: string; text: string } }).data);

async function main() {
  section("1. visible corrections");
  {
    const en = buildCorrections(findEngineConflicts(BAD_EN), "en").map((c) => c.text);
    t("fee: the engine's charge for subclass 491 with its source", en.some((x) => x.startsWith("Correction: the subclass 491 visa application charge is AUD 6,140 for the main applicant") && x.includes("LogiVisa fee table")), JSON.stringify(en));
    t("gate: 'Correction: subclass 491 requires a positive skills assessment (Home Affairs, Subclass 491 page, p.25).'", en.includes("Correction: subclass 491 requires a positive skills assessment (Home Affairs, Subclass 491 page, p.25)."), JSON.stringify(en));
    t("gate: subclass 191 has no minimum income requirement, ATO notices, with its source", en.some((x) => x.startsWith("Correction: subclass 191 has no minimum income requirement") && x.includes("Home Affairs – Permanent Residence (Skilled Regional) visa (subclass 191)")));
    t("state availability: only the tracker for the visitor's own profile can say it", en.some((x) => x.includes("State Nomination Tracker") && x.startsWith("Correction: which states")));
    t("one correction per fact (no duplicates), four here", en.length === 4, String(en.length));

    const tr = buildCorrections(findEngineConflicts("491 vizesi için başvuru ücreti 4.910 AUD'dir. 491 için beceri değerlendirmesi olmadan da başvurabilirsiniz."), "tr").map((c) => c.text);
    t("tr: fee and gate corrections with sources", tr.some((x) => x.startsWith("Düzeltme: 491 alt sınıfı vize başvuru ücreti ana başvuran için AUD 6,140")) && tr.some((x) => x === "Düzeltme: 491 alt sınıfı için olumlu bir beceri değerlendirmesi gerekir (İçişleri Bakanlığı, Subclass 491 sayfası, s.25)."), JSON.stringify(tr));
    const zh = buildCorrections(findEngineConflicts("491签证申请费为 4,910 澳元。491签证无需技能评估。软件工程师在大多数州都很紧缺。"), "zh-Hans").map((c) => c.text);
    t("zh-Hans: fee, gate and state corrections with sources", zh.some((x) => x.startsWith("更正：子类 491 的签证申请费为主申请人 AUD 6,140")) && zh.some((x) => x === "更正：子类 491 需要正面的技能评估（内政部，Subclass 491 页面，第 25 页）。") && zh.some((x) => x.includes("LogiVisa 州提名追踪器")), JSON.stringify(zh));
    t("answer language detection (zh, tr, en)", detectAnswerLocale("491签证") === "zh-Hans" && detectAnswerLocale("Başvuru için gerekir") === "tr" && detectAnswerLocale("The charge is high") === "en");
    t("a repeated disclaimer is logged but gets no correction block", buildCorrections(findEngineConflicts("Bu genel bilgidir. Ayrıca bu da sistemimde yok."), "tr").length === 0);
    t("a correct answer has no correction", buildCorrections(findEngineConflicts("The subclass 491 application charge is AUD 6,140. Subclass 491 requires a positive skills assessment."), "en").length === 0);

    // Through the stream: the correction rides in the same message, after the answer.
    const seen: string[] = [];
    const res = correctedUIStreamResponse(chunksOf(BAD_EN), (answer) => {
      seen.push(answer);
      return buildCorrections(findEngineConflicts(answer), "en");
    });
    const { message, raw } = await readMessage(res);
    t("the answer text streams unchanged and the stream's finish comes after the corrections", textOf(message) === BAD_EN && seen[0] === BAD_EN && raw.lastIndexOf('"type":"data-correction"') < raw.lastIndexOf('"type":"finish"'));
    const stored = correctionsOf(message);
    t("the corrections are parts of the SAME message (stored with it): fee, gate x2, state", stored.length === 4 && stored.every((c) => c.text.startsWith("Correction:")) && stored.map((c) => c.kind).sort().join() === "fee,gate,gate,state_availability", JSON.stringify(stored));
    const clean = await readMessage(correctedUIStreamResponse(chunksOf("Subclass 491 requires a positive skills assessment."), (a) => buildCorrections(findEngineConflicts(a), "en")));
    t("a clean answer streams with no correction part", correctionsOf(clean.message).length === 0 && textOf(clean.message) === "Subclass 491 requires a positive skills assessment.");

    // Through the handler: logging is kept and the same corrections are produced for both paths.
    for (const premium of [false, true]) {
      const logged: string[] = [];
      let streamReq: StreamRequest | undefined;
      const deps: ChatDeps = {
        getVisitor: async () => ({ id: "v", messageCount: 0, premiumCredits: premium ? 5 : 0 }),
        credits: { reserve: async () => true, refund: async () => {}, recordFreeMessage: async () => {} },
        profiles: { verifiedEmailsForVisitor: async () => [], latestReportForEmail: async () => null },
        premiumModelId: "gpt-4.1",
        expandQuery: async () => "",
        retrieve: async () => [],
        stream: async (o) => {
          streamReq = o;
          return new Response("ok");
        },
        reportConflicts: (conflicts, ctx) => void logged.push(`${ctx.premium}:${conflicts.map((c) => c.kind).join(",")}`),
      };
      await handleChat(new Request("https://x.test", { method: "POST", body: JSON.stringify({ locale: "tr", messages: [{ id: "m", role: "user", parts: [{ type: "text", text: "491 ücreti?" }] }] }) }), deps);
      const out = streamReq!.correct!(BAD_EN);
      t(`${premium ? "premium" : "free"} path: corrections returned (client language tr wins), conflicts still logged`, out.length === 4 && out[0].text.startsWith("Düzeltme:") && logged.length === 1 && logged[0] === `${premium}:fee,gate,gate,state_availability`, JSON.stringify({ logged, n: out.length }));
    }
  }

  section("2. knowledge-index audit");
  {
    const disk = [
      { name: "Subclass 491 main_23September2026.pdf", category: "Visa" },
      { name: "Subclass 491 main_26April2026.pdf", category: "Visa" },
      { name: "Skilled list.md", category: "Lists" },
      { name: "Engineers.pdf", category: "_archive" },
      { name: "Same.pdf", category: "Visa" },
      { name: "Same.pdf", category: "_archive" },
    ];
    const indexed = [
      { source: "Subclass 491 main_23September2026.pdf", category: "Visa", chunks: 40 },
      { source: "Subclass 491 main_26April2026.pdf", category: "Visa", chunks: 38 },
      { source: "Subclass 491 main_01January2026.pdf", category: "Visa", chunks: 30 },
      { source: "Skilled list.md", category: "Lists", chunks: 900 },
      { source: "Engineers.pdf", category: "_archive", chunks: 12 },
      { source: "Deleted guide.pdf", category: "Visa", chunks: 7 },
      { source: "Same.pdf", category: "Visa", chunks: 3 },
      { source: "Same.pdf", category: "_archive", chunks: 2 },
    ];
    const rows = classifyIndex(indexed, disk);
    const status = (s: string, c: string) => rows.find((r) => r.source === s && r.category === c)?.status;
    t("current: on disk and the latest version (also an undated file, and the current copy of a duplicated name)", status("Subclass 491 main_23September2026.pdf", "Visa") === "current" && status("Skilled list.md", "Lists") === "current" && status("Same.pdf", "Visa") === "current");
    t("superseded: an older dated version on disk, and a copy in an _archive folder", status("Subclass 491 main_26April2026.pdf", "Visa") === "superseded" && status("Engineers.pdf", "_archive") === "superseded" && status("Same.pdf", "_archive") === "superseded");
    t("orphaned: no file with that name on disk (even an older version of a document that has a newer one)", status("Deleted guide.pdf", "Visa") === "orphaned" && status("Subclass 491 main_01January2026.pdf", "Visa") === "orphaned");
    const sum = summarizeAudit(rows);
    t("the summary counts documents and chunks per status", sum.current.chunks === 943 && sum.superseded.chunks === 52 && sum.orphaned.chunks === 37 && sum.orphaned.documents === 2, JSON.stringify(sum));
    const del = rowsToDelete(rows);
    t("the cleaner deletes exactly the superseded + orphaned (source, category) pairs, never a current one", del.length === 5 && del.every((r) => r.status !== "current") && !del.some((r) => r.source === "Skilled list.md"));
  }

  section("3. quick profile card for free visitors");
  {
    const store = new Map<string, { inputJson: unknown; reportJson: unknown; updatedAt: Date }>();
    const quickStore: QuickProfileStore = {
      get: async (id) => store.get(id) ?? null,
      save: async (id, input, report) => void store.set(id, { inputJson: JSON.parse(JSON.stringify(input)), reportJson: JSON.parse(JSON.stringify(report)), updatedAt: new Date("2026-10-02") }),
    };
    let engineRuns = 0;
    const free = { id: "free-1", messageCount: 2, premiumCredits: 0 };
    const qpDeps: QuickProfileDeps = {
      getVisitor: async () => free,
      profiles: { verifiedEmailsForVisitor: async () => [], latestReportForEmail: async () => null },
      quickProfiles: quickStore,
      liveState: async () => ({}),
      runEngine: (input: ReadinessInput) => (engineRuns++, runReadinessEngine(input) as ReadinessReport),
    };
    const FIELDS = { age: "30", occupation: "261313", englishLevel: "competent", qualificationLevel: "Bachelor's Degree", qualificationAwardedInAustralia: "no", offshoreExperienceYears: "5", onshoreExperienceYears: "", skillsAssessment: "no", currentCountry: "AU", residenceState: "VIC", currentVisa: "500" };

    const before = (await (await getQuickProfile(new Request("https://x.test"), qpDeps)).json()) as { premium: boolean; hasReport: boolean; available: boolean; profile: unknown; result: unknown };
    t("a free visitor without a report gets the card (premium false, no report, available, no profile yet)", before.premium === false && before.hasReport === false && before.available && before.profile === null && before.result === null);
    const res = await saveQuickProfile(new Request("https://x.test", { method: "POST", body: JSON.stringify({ locale: "en", fields: FIELDS }) }), qpDeps);
    const body = (await res.json()) as { ok?: boolean; points: number | null; gates: Record<string, string>; states: { "190": string[]; "491": string[] } | null };
    const saved = store.get("free-1")?.reportJson as ReadinessReport | undefined;
    t("saving as a free visitor runs the report engine once (no model call is possible here: no model dependency exists)", res.status === 200 && body.ok === true && engineRuns === 1);
    t("the compact result: points", typeof body.points === "number" && body.points === saved?.pointsEstimate?.estimatedPoints, JSON.stringify(body));
    t("... gate status per visa (189 / 190 / 491 / 482 / 485 ...)", ["189", "190", "491"].every((v) => typeof body.gates[v] === "string") && Object.entries(body.gates).every(([v, s]) => saved?.visaGates?.[v]?.status === s));
    t("... available states for 190 and 491", body.states !== null && Array.isArray(body.states["190"]) && Array.isArray(body.states["491"]) && JSON.stringify(body.states["190"]) === JSON.stringify(saved?.stateNominationTracker?.nominationAvailability?.["190"] ?? []));
    const after = (await (await getQuickProfile(new Request("https://x.test"), qpDeps)).json()) as { result: { points: number | null; gates: Record<string, string> } | null; profile: unknown };
    t("GET returns the same compact result for the panel on reload, and the fields for editing", after.result?.points === body.points && JSON.stringify(after.result?.gates) === JSON.stringify(body.gates) && after.profile !== null);

    // Free chat answers use the same engine facts; without a profile the free prompt is unchanged.
    const captured: StreamRequest[] = [];
    const mkDeps = (visitor: typeof free): ChatDeps => ({
      getVisitor: async () => visitor,
      credits: { reserve: async () => true, refund: async () => {}, recordFreeMessage: async () => {} },
      profiles: qpDeps.profiles,
      quickProfiles: quickStore,
      liveState: async () => ({}),
      premiumModelId: "gpt-4.1",
      expandQuery: async () => "",
      retrieve: async () => [{ content: "Visa application charge AUD 6,140.", metadata: { source: "x.pdf" } }],
      stream: async (o) => (captured.push(o), new Response("ok")),
      reportConflicts: () => {},
    });
    const ask = (d: ChatDeps) => handleChat(new Request("https://x.test", { method: "POST", body: JSON.stringify({ messages: [{ id: "m", role: "user", parts: [{ type: "text", text: "Can I get a 189?" }] }] }) }), d);
    await ask(mkDeps(free));
    const withProfile = captured[0];
    t("free path: model stays gpt-4o-mini, no citation catalogue, no credit spent", withProfile.modelId === "gpt-4o-mini" && withProfile.sources === undefined);
    t("free path with a quick profile: the prompt carries the engine's points, gates and states", withProfile.system.includes("block-2:") && withProfile.system.includes(`Points: ${saved?.pointsEstimate?.estimatedPoints}`) && withProfile.system.includes("Status by visa (LogiVisa labels):") && withProfile.system.includes("States open for this occupation:") && !withProfile.system.includes("PREMIUM KAYNAK"));
    await ask(mkDeps({ id: "free-2", messageCount: 0, premiumCredits: 0 }));
    const without = captured[1];
    const refs = [{ content: "Visa application charge AUD 6,140.", metadata: { source: "x.pdf" } }];
    t("free path without a profile: unchanged (exactly the engine-facts prompt, no profile block)", !without.system.includes("block-2:") && without.system === buildSystemPrompt(refs, { engineFacts: buildEngineFacts({}) }));
    // Another visitor never sees this visitor's profile.
    t("another visitor's prompt does not contain this visitor's result", !without.system.includes("Status by visa"));
  }

  section("4. credit balance in the chat header");
  {
    t("paying visitor: '42 premium messages left'", JSON.stringify(describeBalance({ premiumCredits: 42, messageCount: 99 })) === JSON.stringify({ mode: "premium", count: 42, freeLimit: 5, notice: false }));
    t("free visitor: '3 of 5 free messages left'", JSON.stringify(describeBalance({ premiumCredits: 0, messageCount: 2 })) === JSON.stringify({ mode: "free", count: 3, freeLimit: 5, notice: false }));
    t("a paying visitor who has used few free messages still sees the credit balance", describeBalance({ premiumCredits: 7, messageCount: 0 }).mode === "premium");
    t("low-balance notice at 5 credits or fewer (5, 1), not at 6", describeBalance({ premiumCredits: 6, messageCount: 9 }).notice === false && describeBalance({ premiumCredits: 5, messageCount: 9 }).notice === true && describeBalance({ premiumCredits: 1, messageCount: 9 }).notice === true);
    t("free visitors get the notice at 2 or fewer free messages", describeBalance({ premiumCredits: 0, messageCount: 3 }).notice === true && describeBalance({ premiumCredits: 0, messageCount: 2 }).notice === false);
    t("at zero: mode none, no notice -- the existing limit_reached flow applies", JSON.stringify(describeBalance({ premiumCredits: 0, messageCount: 5 })) === JSON.stringify({ mode: "none", count: 0, freeLimit: 5, notice: false }));

    // The server read after every message, including a refund when a message fails.
    const v = { id: "p", messageCount: 9, premiumCredits: 3 };
    const read = async () => (await (await getBalance(new Request("https://x.test"), { getVisitor: async () => ({ ...v }) })).json()) as ReturnType<typeof describeBalance>;
    t("GET /api/chat/balance reads the balance from the server", (await read()).count === 3);
    const credits = {
      reserve: async () => (v.premiumCredits > 0 ? ((v.premiumCredits -= 1), (v.messageCount += 1), true) : false),
      refund: async () => ((v.premiumCredits += 1), void (v.messageCount -= 1)),
      recordFreeMessage: async () => void (v.messageCount += 1),
    };
    let streamReq: StreamRequest | undefined;
    const deps: ChatDeps = {
      getVisitor: async () => ({ ...v }),
      credits,
      profiles: { verifiedEmailsForVisitor: async () => [], latestReportForEmail: async () => null },
      premiumModelId: "gpt-4.1",
      expandQuery: async () => "",
      retrieve: async () => [],
      stream: async (o) => ((streamReq = o), new Response("ok")),
      reportConflicts: () => {},
    };
    const send = () => handleChat(new Request("https://x.test", { method: "POST", body: JSON.stringify({ messages: [{ id: "m", role: "user", parts: [{ type: "text", text: "hi" }] }] }) }), deps);
    await send();
    t("after a message the balance has dropped by one (3 -> 2)", (await read()).count === 2);
    await streamReq!.onFailure();
    t("after a failed message the refund shows (2 -> 3)", (await read()).count === 3);
    await send();
    await send();
    await send();
    const last = await read();
    t("at zero credits (free allowance used) the balance reads 'none'", last.mode === "none" && last.count === 0);
    const blocked = await send();
    t("... and the existing limit_reached 403 applies", blocked.status === 403 && ((await blocked.json()) as { error: string }).error === "limit_reached");
  }

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
