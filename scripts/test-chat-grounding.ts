/**
 * AI assistant grounding (lib/chat/*): the chat answers from the same engine and data as the report.
 *
 *   1. Superseded documents: only the latest version of a document is retrieved (dated file names, _archive copies,
 *      an April 2026 491 version still in the index); the committed manifest lists every superseded file on disk.
 *   2. Engine-vs-answer conflicts: fee, gate, state-availability and repeated-disclaimer statements are flagged
 *      (en / tr / zh); a correct answer is not. Both prompts carry the engine facts.
 *   3. Quick profile card: submit -> intake validation -> report engine -> stored -> the premium prompt carries the
 *      engine's points breakdown, gate results, available states and benchmark gaps.
 *   4. Citation display: readable source names ("Home Affairs – Subclass 491, p. 1"), never file names.
 *   5. A subclass 500 visitor: the prompt requires the Australian-study points factors and the 485 gates.
 *   6. Uncertainty wording: at most one short statement per answer.
 *
 * Real chat / engine / prompt code; in-memory stores, no model call, no network, no database.
 *
 *   npx tsx scripts/test-chat-grounding.ts
 */
import "./lib/stub-request-context";

process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/d?sslmode=disable"; // never connects

import { findEngineConflicts } from "../lib/chat/answer-check";
import { buildSourceCatalog, catalogRefs, renderCitations } from "../lib/chat/citations";
import { KNOWLEDGE_VERSIONS, dropSupersededChunks, isSupersededSource, parseDocumentVersion } from "../lib/chat/document-versions";
import { buildEngineFacts, engineFeeTable } from "../lib/chat/engine-facts";
import { handleChat, type ChatDeps, type StreamRequest } from "../lib/chat/handler";
import { GUARDRAILS_TEXT } from "../lib/chat/prompts";
import type { QuickProfileStore } from "../lib/chat/quick-profile";
import { getQuickProfile, saveQuickProfile, type QuickProfileDeps } from "../lib/chat/quick-profile-api";
import { humanSourceName } from "../lib/chat/source-names";
import type { RetrievedChunk } from "../lib/chat/types";
import type { ReadinessInput, ReadinessReport } from "../lib/readiness/types";
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
const chunk = (source: string, content: string, extra: Record<string, unknown> = {}): RetrievedChunk => ({ content, metadata: { source, ...extra } });

const OLD_491 = "Subclass 491 Skilled Work Regional (Provisional) visa - Main applicant_26April2026.pdf";
const NEW_491 = "Subclass 491 Skilled Work Regional (Provisional) visa - Main applicant_23September2026.pdf";

async function main() {
  section("1. superseded document versions");
  {
    t("dated file names parse to one document key and an effective date", JSON.stringify(parseDocumentVersion(OLD_491)) === JSON.stringify({ key: "subclass 491 skilled work regional (provisional) visa - main applicant", date: "2026-04-26" }) && parseDocumentVersion("Skilled Independent visa (subclass 189) Points-tested stream_23_09_2026.pdf").date === "2026-09-23" && parseDocumentVersion("The Institution of Engineers Australia (1).pdf").key === "the institution of engineers australia", JSON.stringify(parseDocumentVersion(OLD_491)));
    const pairs = (KNOWLEDGE_VERSIONS as unknown as { pairs?: Array<{ superseded: string }> }).pairs ?? [];
    const expected = ["Subclass 820 Partner visa (temporary)_01July2026.pdf", "Subclass 820 Partner visa (temporary)_26April2026.pdf", "Skills in Demand Visa (subclass 482) Core Skills stream_25April2026.pdf", "The Institution of Engineers Australia.pdf"];
    t("the manifest lists every superseded file on disk (820 x2, 482 Core Skills, archived Engineers Australia)", expected.every((f) => KNOWLEDGE_VERSIONS.superseded.includes(f)) && pairs.length === expected.length, JSON.stringify(KNOWLEDGE_VERSIONS.superseded));
    t("an April 2026 491 version still in the index is superseded by the 23 September 2026 document", isSupersededSource(OLD_491) && !isSupersededSource(NEW_491));
    const retrieved = [
      chunk(OLD_491, "The 491 fee is AUD 4,910. The 191 has a minimum income requirement.", { category: "Subclass 491 Skilled Work Regional (Provisional) visa - Main applicant", page: 1 }),
      chunk(NEW_491, "Visa application charge AUD 6,140.", { page: 1 }),
      chunk("Subclass 820 Partner visa (temporary)_26April2026.pdf", "old 820"),
      chunk("Subclass 820 Partner visa (temporary)_23September2026.pdf", "new 820"),
      chunk("The Institution of Engineers Australia.pdf", "archived EA", { category: "_archive" }),
      chunk("Skilled Occupation List.md", "Row: 261313 Software Engineer"),
      // A later version indexed after the manifest was generated: the batch rule keeps only the newest.
      chunk("Some new guide_01March2026.pdf", "older"),
      chunk("Some new guide_01October2026.pdf", "newer"),
    ];
    const kept = dropSupersededChunks(retrieved).map((c) => (c.metadata as { source: string }).source);
    t("retrieval keeps only the latest version of each document", JSON.stringify(kept) === JSON.stringify([NEW_491, "Subclass 820 Partner visa (temporary)_23September2026.pdf", "Skilled Occupation List.md", "Some new guide_01October2026.pdf"]), JSON.stringify(kept));
    const { selectLatestChunks } = await import("../lib/chat/deps");
    const sel = selectLatestChunks(retrieved, [chunk("Skilled occupation list.xlsx", "row")], { primary: 2, occupation: 1 });
    t("the usual number of chunks is still returned after dropping old versions (over-fetch, then trim)", sel.length === 3 && !sel.some((c) => /April2026/.test((c.metadata as { source: string }).source)));
  }

  section("2. engine-vs-answer conflicts (fees, gates, states, disclaimers)");
  {
    const fees = engineFeeTable();
    t("engine fee table = the report's figures (491 main applicant AUD 6,140)", fees["491"]?.includes(6140) && !fees["491"]?.includes(4910));
    const tr =
      "491 vizesi için başvuru ücreti 4.910 AUD'dir. 491 için uygun bir beceri değerlendirmesi olmadan da başvurabilirsiniz. 191 vizesine geçişte asgari gelir şartı vardır. Yazılım Mühendisi çoğu eyalette aranan bir meslektir. Bu bilgi sistemimde yok, genel bilgilerimle yanıtlıyorum. Bu kısım sistemimdeki referanslarda yer almıyor. Genel bilgi olarak şunu söyleyebilirim. Sistemimde bu konuda güncel veri yok.";
    const c = findEngineConflicts(tr);
    const kinds = (k: string) => c.filter((x) => x.kind === k).length;
    t("tr: the superseded fee (491, AUD 4,910) is flagged", kinds("fee") === 1, JSON.stringify(c.map((x) => x.detail)));
    t("tr: '491 without a suitable skills assessment' and '191 minimum income' are flagged as gate conflicts", kinds("gate") === 2);
    t("tr: 'in demand in most states' without a profile is flagged", kinds("state_availability") === 1);
    t("tr: four 'not in my system / general knowledge' statements are flagged", kinds("repeated_disclaimer") === 1);
    const good = "491 vizesinin başvuru ücreti 6,140 AUD'dir [S1]. 491 için olumlu bir beceri değerlendirmesi gerekir. 191 için asgari gelir şartı yoktur; 3 gelir yılı için ATO bildirimleri gerekir. Bu kısım kaynaklarımda yer almıyor; genel bilgidir.";
    t("tr: a correct answer (engine fee, gate, no minimum income, one short disclaimer) has no conflict", findEngineConflicts(good).length === 0, JSON.stringify(findEngineConflicts(good)));
    const en = findEngineConflicts("The subclass 491 application charge is AUD 4,910. You can apply for the 491 without a skills assessment. The 191 has a minimum income requirement.");
    t("en: fee and both gate conflicts are flagged", en.filter((x) => x.kind === "fee").length === 1 && en.filter((x) => x.kind === "gate").length === 2, JSON.stringify(en));
    const zh = findEngineConflicts("491签证申请费为 4,910 澳元。191签证有最低收入要求。软件工程师在大多数州都很紧缺。");
    t("zh: fee, gate and state conflicts are flagged", zh.filter((x) => x.kind === "fee").length === 1 && zh.filter((x) => x.kind === "gate").length === 1 && zh.filter((x) => x.kind === "state_availability").length === 1, JSON.stringify(zh));
    t("en: 'no minimum income requirement' for 191 is not a conflict", findEngineConflicts("Subclass 191 has no minimum income requirement.").length === 0);
    const facts = buildEngineFacts();
    t("the engine facts carry the fees, the gate matrix, the points table, state status and the 191 rule", facts.includes("Subclass 491: main applicant AUD 6,140") && facts.includes("Subclass 491: must meet A suitable (positive) skills assessment") && facts.includes("Australian study requirement") && facts.includes("Western Australia (WA)") && facts.includes("There is NO minimum income requirement"));
  }

  section("3. quick profile card -> engine -> prompt; 5. subclass 500 guidance");
  {
    const store = new Map<string, { inputJson: unknown; reportJson: unknown; updatedAt: Date }>();
    const quickStore: QuickProfileStore = {
      get: async (id) => store.get(id) ?? null,
      save: async (id, input, report) => void store.set(id, { inputJson: JSON.parse(JSON.stringify(input)), reportJson: JSON.parse(JSON.stringify(report)), updatedAt: new Date("2026-10-02") }),
    };
    const visitor = { id: "v-500", messageCount: 9, premiumCredits: 3 };
    const qpDeps: QuickProfileDeps = {
      getVisitor: async () => visitor,
      profiles: { verifiedEmailsForVisitor: async () => [], latestReportForEmail: async () => null },
      quickProfiles: quickStore,
      liveState: async () => ({}),
      runEngine: (input: ReadinessInput) => runReadinessEngine(input) as ReadinessReport,
    };
    const post = (fields: Record<string, unknown>, locale = "tr") => saveQuickProfile(new Request("https://x.test/api/chat/profile", { method: "POST", body: JSON.stringify({ locale, fields }) }), qpDeps);
    const STUDENT = { age: "27", occupation: "261313", englishLevel: "competent", qualificationLevel: "Master's Degree (Research)", qualificationAwardedInAustralia: "yes", offshoreExperienceYears: "2", onshoreExperienceYears: "", skillsAssessment: "no", currentCountry: "AU", residenceState: "VIC", currentVisa: "500" };

    const missing = await post({ ...STUDENT, residenceState: "" });
    const missingBody = (await missing.json()) as { errors?: Record<string, string> };
    t("intake rule reused: residence state is required when in Australia (tr message)", missing.status === 400 && missingBody.errors?.residenceState === "Bu alan zorunludur.", JSON.stringify(missingBody));
    const bad = await post({ ...STUDENT, englishLevel: "fluent", offshoreExperienceYears: "-1" }, "en");
    const badBody = (await bad.json()) as { errors?: Record<string, string> };
    t("intake options and experience-years rule reused", bad.status === 400 && Boolean(badBody.errors?.englishLevel) && Boolean(badBody.errors?.offshoreExperienceYears));
    const freeVisitor = { ...qpDeps, getVisitor: async () => ({ id: "free", messageCount: 1, premiumCredits: 0 }) };
    const freeSave = await saveQuickProfile(new Request("https://x.test", { method: "POST", body: JSON.stringify({ fields: STUDENT }) }), freeVisitor);
    t("a free visitor can save a quick profile too (engine only, no model call)", freeSave.status === 200);
    store.delete("free");

    const ok = await post(STUDENT);
    const okBody = (await ok.json()) as { ok?: boolean; points?: number; gates?: Record<string, string> };
    const stored = store.get("v-500");
    const report = stored?.reportJson as ReadinessReport | undefined;
    t("submit runs the report engine and stores input + result against the visitor", ok.status === 200 && okBody.ok === true && typeof okBody.points === "number" && Boolean(report?.visaGates?.["189"]) && (stored?.inputJson as ReadinessInput).currentVisaSubclass === "500", JSON.stringify(okBody));
    const getRes = (await (await getQuickProfile(new Request("https://x.test"), qpDeps)).json()) as { premium: boolean; hasReport: boolean; profile: { currentVisa?: string; residenceState?: string } | null };
    t("GET returns the stored fields for editing", getRes.premium && !getRes.hasReport && getRes.profile?.currentVisa === "500" && getRes.profile?.residenceState === "VIC");

    // The chat: premium path with the quick profile.
    const captured: StreamRequest[] = [];
    const chatDeps: ChatDeps = {
      getVisitor: async () => visitor,
      credits: { reserve: async () => true, refund: async () => {}, recordFreeMessage: async () => {} },
      profiles: qpDeps.profiles,
      quickProfiles: quickStore,
      liveState: async () => ({}),
      premiumModelId: "gpt-4.1",
      expandQuery: async () => "",
      retrieve: async () => [chunk(NEW_491, "Visa application charge AUD 6,140.", { page: 1 })],
      stream: async (opts) => {
        captured.push(opts);
        return new Response("ok");
      },
      reportConflicts: () => {},
    };
    const question = "500 vizesindeyim, Yazılım Mühendisiyim. 491 için neler yapmalıyım?";
    await handleChat(new Request("https://x.test", { method: "POST", body: JSON.stringify({ messages: [{ id: "m1", role: "user", parts: [{ type: "text", text: question }] }] }) }), chatDeps);
    const sys = captured[0]?.system ?? "";
    const pe = report?.pointsEstimate;
    t("the prompt carries the engine's points breakdown", Boolean(pe) && sys.includes(`Points: ${pe!.estimatedPoints}`) && sys.includes("/30"), sys.slice(sys.indexOf("block-2:"), sys.indexOf("block-2:") + 600));
    t("... the gate result per visa", Object.entries(report?.visaGates ?? {}).every(([v, g]) => sys.includes(`${v}: ${pathwayStatusLabel(g, "en")}`)));
    const avail = report?.stateNominationTracker?.nominationAvailability;
    t("... the available states", Boolean(avail) && sys.includes("States open for this occupation: 190 ->"));
    t("... the current visa, and the profile is marked as the engine run on the quick profile card", sys.includes("Current visa: subclass 500") && sys.includes("quick profile card") && captured[0]?.profileSource === "quick");
    t("5. subclass 500: the prompt requires the Australian-study points factors", sys.includes("block-4 (internal") && /Australian study requirement: \+5/.test(sys) && /Study in regional Australia: \+5/.test(sys) && /Professional Year: \+5/.test(sys) && /Specialist education: \+10/.test(sys));
    t("5. ... and the 485 gates from the gate matrix, evaluated for this profile", sys.includes("35 or under when applying") && sys.includes("An eligible degree (Bachelor or above) awarded in the last 6 months") && sys.includes("Study with a CRICOS-registered Australian provider") && sys.includes("An English test result from the last 12 months") && /In Australia when applying: met/.test(sys));
    t("the engine facts are in the premium prompt too", sys.includes("block-1 --") && sys.includes("Subclass 491: main applicant AUD 6,140"));

    // Free path: a 500 question still gets the study guidance and the engine facts (no profile).
    const freeCaptured: StreamRequest[] = [];
    await handleChat(new Request("https://x.test", { method: "POST", body: JSON.stringify({ messages: [{ id: "m1", role: "user", parts: [{ type: "text", text: "I'm on a student visa 500, what are my options?" }] }] }) }), {
      ...chatDeps,
      getVisitor: async () => ({ id: "f", messageCount: 0, premiumCredits: 0 }),
      stream: async (o) => {
        freeCaptured.push(o);
        return new Response("ok");
      },
    });
    const fsys = freeCaptured[0]?.system ?? "";
    t("free path: engine facts and the 500 guidance (general 485 gates, no profile)", fsys.includes("block-1 --") && fsys.includes("block-4 (internal") && fsys.includes("- 35 or under when applying") && !fsys.includes("block-2:"));
  }

  section("4. citation display");
  {
    t("readable names for Home Affairs, state and authority documents", humanSourceName(NEW_491) === "Home Affairs – Subclass 491" && humanSourceName(OLD_491) === "Home Affairs – Subclass 491" && humanSourceName("Skills in Demand Visa (subclass 482) Core Skills stream_01July2026.pdf") === "Home Affairs – Subclass 482, Core Skills stream" && humanSourceName("Skilled visa options (Queensland).pdf") === "Queensland – Skilled visa options" && humanSourceName("Australian Computer Society Incorporated.pdf") === "Australian Computer Society Incorporated – skills assessment guide" && humanSourceName("Student visa_class_500_23September2026.pdf") === "Home Affairs – Subclass 500");
    const chunks = [chunk(NEW_491, "Visa application charge AUD 6,140.", { page: 1 }), chunk("Migration Tasmania-Skilled Migration.pdf", "TAS", { page: 4 })];
    const refs = catalogRefs(buildSourceCatalog(chunks));
    const rendered = renderCitations("The charge is AUD 6,140 [S1]. Tasmania [S2].", refs);
    t("rendered: 'Home Affairs – Subclass 491, p. 1'; no file name or extension", rendered.includes("[Home Affairs – Subclass 491, p. 1]") && rendered.includes("[Tasmania – Migration Tasmania-Skilled Migration, p. 4]") && !/\.(pdf|xlsx|md|csv)\b/i.test(rendered) && !rendered.includes("_23September2026"), rendered);
  }

  section("6. uncertainty wording");
  {
    t("guardrails: the 'not in my sources' statement at most once per answer, never repeated", GUARDRAILS_TEXT.includes("EN FAZLA BİR KEZ") && GUARDRAILS_TEXT.includes("ASLA tekrarlama") && !GUARDRAILS_TEXT.includes("Sistemimdeki güncel referanslarda bu vizenin/eyaletin tüm spesifik detayları"));
    t("a single short disclaimer is fine; two are flagged", findEngineConflicts("Bu kısım kaynaklarımda yer almıyor; genel bilgidir.").length === 0 && findEngineConflicts("Bu genel bilgidir. Ayrıca bu da sistemimde yok.").some((c) => c.kind === "repeated_disclaimer"));
  }

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
