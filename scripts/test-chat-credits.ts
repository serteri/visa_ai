/**
 * Paid chat: credits, restore-by-email, and the premium path (lib/chat/*). Real handler / restore / citation /
 * profile code; only the edges are in-memory fakes (database stores, model, retrieval, email) -- no network, no DB.
 *
 *   1. decrement and zero-credit behaviour (isPremium never bypasses; failures refund; no double spend)
 *   2. free path unchanged (prompt byte-identical to the pre-change prompt, model, retrieval depth, counting)
 *   3. premium vs free (model, retrieval depth, profile context, citation metadata)
 *   4. validator: citations <-> retrieved chunk metadata; profile <-> requesting visitor
 *   5. restore flow: valid, expired, reused, rate limit, unknown email = same response, device chain
 */
import { createHash } from "node:crypto";

import { buildSourceCatalog, catalogRefs, renderCitations, validateCitations } from "../lib/chat/citations";
import { DEFAULT_PREMIUM_CHAT_MODEL, CHAT_MODEL_ID, getPremiumChatModelId } from "../lib/chat/config";
import type { CreditStore } from "../lib/chat/credits";
import { handleChat, type ChatDeps, type ChatVisitorLike, type StreamRequest } from "../lib/chat/handler";
import { buildProfileSummary, loadVisitorProfile, type ProfileStore } from "../lib/chat/profile";
import { buildEngineFacts } from "../lib/chat/engine-facts";
import { GUARDRAILS_TEXT, buildSystemPrompt } from "../lib/chat/prompts";
import {
  RESTORE_MAX_PER_EMAIL,
  RESTORE_MAX_PER_IP,
  RESTORE_TOKEN_TTL_MS,
  confirmRestore,
  hashToken,
  requestRestore,
  type RestoreDeps,
  type RestoreStore,
} from "../lib/chat/restore";
import type { RetrievedChunk } from "../lib/chat/types";

let failures = 0;
function check(cond: boolean, msg: string) {
  if (cond) console.log(`  ✅ ${msg}`);
  else {
    failures++;
    console.error(`  ❌ ${msg}`);
  }
}
const section = (s: string) => console.log(`\n${s}`);

// ── in-memory world ─────────────────────────────────────────────────────────
type VisitorRow = ChatVisitorLike & { isPremium: boolean };
type Link = { email: string; visitorId: string; verified: boolean };
type ReportRow = { email: string; reportJson: unknown; inputJson: unknown; createdAt: Date };

class World {
  visitors = new Map<string, VisitorRow>();
  links: Link[] = [];
  reports: ReportRow[] = [];
  tokens = new Map<string, { email: string; expiresAt: Date; usedAt: Date | null }>();
  requests: Array<{ email: string; ip: string | null; at: Date }> = [];
  emails: Array<{ to: string; link: string }> = [];
  deferred: Array<() => Promise<void>> = [];
  clock = new Date("2026-10-01T00:00:00Z");

  visitor(id: string, v: Partial<VisitorRow> = {}) {
    this.visitors.set(id, { id, messageCount: 0, premiumCredits: 0, isPremium: false, ...v });
    return this.visitors.get(id)!;
  }

  credits: CreditStore = {
    reserve: async (id) => {
      const v = this.visitors.get(id)!;
      if (v.premiumCredits <= 0) return false;
      v.premiumCredits -= 1;
      v.messageCount += 1;
      return true;
    },
    refund: async (id) => {
      const v = this.visitors.get(id)!;
      v.premiumCredits += 1;
      v.messageCount -= 1;
    },
    recordFreeMessage: async (id) => {
      this.visitors.get(id)!.messageCount += 1;
    },
  };

  profiles: ProfileStore = {
    verifiedEmailsForVisitor: async (id) => this.links.filter((l) => l.visitorId === id && l.verified).map((l) => l.email),
    latestReportForEmail: async (email) =>
      this.reports.filter((r) => r.email.toLowerCase() === email.toLowerCase()).sort((a, b) => +b.createdAt - +a.createdAt)[0] ?? null,
  };

  store: RestoreStore = {
    countRequests: async (f, since) => this.requests.filter((r) => r.at >= since && (!f.email || r.email === f.email) && (!f.ip || r.ip === f.ip)).length,
    logRequest: async (email, ip, at) => void this.requests.push({ email, ip, at }),
    hasCredits: async (email) => this.links.some((l) => l.email === email && (this.visitors.get(l.visitorId)?.premiumCredits ?? 0) > 0),
    createToken: async (hash, email, expiresAt) => void this.tokens.set(hash, { email, expiresAt, usedAt: null }),
    consumeToken: async (hash, now) => {
      const t = this.tokens.get(hash);
      if (!t || t.usedAt || t.expiresAt <= now) return null;
      t.usedAt = now;
      return t.email;
    },
    transferCredits: async (email, visitorId) => {
      let moved = 0;
      for (const l of this.links.filter((x) => x.email === email && x.visitorId !== visitorId)) {
        const v = this.visitors.get(l.visitorId)!;
        moved += v.premiumCredits;
        v.premiumCredits = 0;
      }
      const target = this.visitors.get(visitorId)!;
      target.premiumCredits += moved;
      const existing = this.links.find((l) => l.email === email && l.visitorId === visitorId);
      if (existing) existing.verified = true;
      else this.links.push({ email, visitorId, verified: true });
      return target.premiumCredits;
    },
  };

  restoreDeps(): RestoreDeps {
    return {
      store: this.store,
      sendEmail: async ({ to, link }) => void this.emails.push({ to, link }),
      defer: (task) => void this.deferred.push(task),
      now: () => this.clock,
      baseUrl: "https://example.test",
    };
  }
  async flush() {
    while (this.deferred.length) await this.deferred.shift()!();
  }
}

type Captured = StreamRequest & { retrieval: { primary: number; occupation: number } };

function chatDeps(world: World, opts: { chunks?: RetrievedChunk[]; failStream?: boolean } = {}) {
  const captured: Captured[] = [];
  const chunks = opts.chunks ?? CHUNKS;
  let lastRetrieval = { primary: 0, occupation: 0 };
  let currentVisitor = "v1";
  const deps: ChatDeps = {
    getVisitor: async () => ({ ...world.visitors.get(currentVisitor)! }),
    credits: world.credits,
    profiles: world.profiles,
    premiumModelId: getPremiumChatModelId({}),
    expandQuery: async () => "subclass 189 requirements",
    retrieve: async (_s, counts) => {
      lastRetrieval = counts;
      return chunks;
    },
    stream: async (req) => {
      captured.push({ ...req, retrieval: lastRetrieval });
      if (opts.failStream) throw new Error("model down");
      return new Response("stream");
    },
  };
  return { deps, captured, as: (id: string) => void (currentVisitor = id) };
}

const CHUNKS: RetrievedChunk[] = [
  { content: "The visa application charge is AUD 4,640.", metadata: { source: "Subclass 189.pdf", category: "visa", page: 7 } },
  { content: "Applicants must be under 45.", metadata: { source: "Points test.pdf", page: 2 } },
  { content: "Row: 261313 Software Engineer", metadata: { source: "Skilled occupation list.xlsx", sheet: "ROL" } },
  { content: "A chunk with no usable metadata", metadata: null },
];

const userMsg = (text: string, id = "m1") => ({ id, role: "user" as const, parts: [{ type: "text" as const, text }] });
const asstMsg = (text: string) => ({ id: "a1", role: "assistant" as const, parts: [{ type: "text" as const, text }] });
const req = (messages: unknown[]) => new Request("https://example.test/api/knowledge-chat", { method: "POST", body: JSON.stringify({ messages }) });

const REPORT_A = {
  pointsEstimate: {
    estimatedPoints: 75,
    potentialPoints: 85,
    breakdown: [
      { label: "Age", points: 25, max: 30 },
      { label: "English", points: 10, max: 20 },
    ],
  },
  visaGates: {
    "189": { visa: "189", status: "not_eligible_now", notMet: [{ label: "Positive skills assessment" }], gates: [], unknown: [], future: [], steps: [], stepsRemaining: 0 },
    "190": { visa: "190", status: "conditional", notMet: [], gates: [], unknown: [], future: [], steps: [], stepsRemaining: 0, belowBenchmark: { score: 70, benchmark: 85 } },
  },
  stateNominationTracker: { states: [], topRecommendedStates: [], nominationAvailability: { "190": ["VIC", "SA"], "491": ["TAS"] }, note: "", eligibilityBlocked: false },
  premiumSections: { historicalInvitationTrends: { occupationCode: "261313" } },
  twoTierStatus: { comparisons: ["190: potential 85 vs benchmark 90 (gap 5)"] },
};
const INPUT_A = { occupation: "UNIQUE-OCC-A" };
const REPORT_B = { ...REPORT_A, premiumSections: { historicalInvitationTrends: { occupationCode: "999999" } } };
const INPUT_B = { occupation: "OTHER-USERS-SECRET-OCCUPATION" };

async function main() {
  // ── 1. decrement and zero-credit ─────────────────────────────────────────
  section("1. Credits: decrement and zero-credit behaviour");
  {
    const w = new World();
    w.visitor("v1", { premiumCredits: 3, messageCount: 0 }); // paying visitor still inside the free allowance
    const { deps } = chatDeps(w);
    for (let i = 1; i <= 3; i++) {
      const res = await handleChat(req([userMsg("hi")]), deps);
      check(res.status === 200 && w.visitors.get("v1")!.premiumCredits === 3 - i, `message ${i} by a paying visitor costs 1 credit (balance ${w.visitors.get("v1")!.premiumCredits})`);
    }
    const free = await handleChat(req([userMsg("hi")]), deps);
    check(free.status === 200 && w.visitors.get("v1")!.premiumCredits === 0, "with 0 credits left and free messages left (3 of 5 used), the free path answers and no credit moves");
    w.visitor("v1", { premiumCredits: 0, messageCount: 5 });
    const res = await handleChat(req([userMsg("hi")]), deps);
    const body = (await res.json()) as { error: string };
    check(res.status === 403 && body.error === "limit_reached", "at 0 credits with the free limit used, the existing limit_reached 403 is returned");
  }
  {
    const w = new World();
    w.visitor("v1", { isPremium: true, premiumCredits: 0, messageCount: 50 });
    const { deps, captured } = chatDeps(w);
    const res = await handleChat(req([userMsg("hi")]), deps);
    check(res.status === 403 && captured.length === 0, "isPremium = true with 0 credits and the free limit used does not bypass: limit_reached, model not called");
    w.visitor("v1", { isPremium: true, premiumCredits: 2, messageCount: 50 });
    await handleChat(req([userMsg("hi")]), deps);
    check(w.visitors.get("v1")!.premiumCredits === 1, "isPremium = true with credits still decrements 1 per message");
  }
  {
    const w = new World();
    w.visitor("v1", { premiumCredits: 1, messageCount: 99 });
    const { deps } = chatDeps(w);
    const results = await Promise.all([handleChat(req([userMsg("a")]), deps), handleChat(req([userMsg("b")]), deps)]);
    const ok = results.filter((r) => r.status === 200).length;
    check(ok === 1 && w.visitors.get("v1")!.premiumCredits === 0, "two concurrent messages with 1 credit: exactly one is answered, balance never negative");
  }
  {
    const w = new World();
    w.visitor("v1", { premiumCredits: 2, messageCount: 99 });
    const { deps } = chatDeps(w, { failStream: true });
    let threw = false;
    try {
      await handleChat(req([userMsg("hi")]), deps);
    } catch {
      threw = true;
    }
    check(threw && w.visitors.get("v1")!.premiumCredits === 2 && w.visitors.get("v1")!.messageCount === 99, "a model failure before any reply refunds the credit and the message count");

    const ok = chatDeps(w);
    await handleChat(req([userMsg("hi")]), ok.deps);
    await ok.captured[0].onFailure();
    await ok.captured[0].onFailure();
    check(w.visitors.get("v1")!.premiumCredits === 2, "stream failure/abort refunds exactly once (double callback does not refund twice)");
  }
  {
    const w = new World();
    w.visitor("v1", { premiumCredits: 5, messageCount: 99 });
    const { deps, captured } = chatDeps(w);
    const res = await handleChat(req([userMsg("   ")]), deps);
    check(res.status === 400 && w.visitors.get("v1")!.premiumCredits === 5 && captured.length === 0, "an empty message is rejected (400) without spending a credit");
  }

  // ── 2. free path unchanged ───────────────────────────────────────────────
  section("2. Free path unchanged");
  {
    // The free prompt now also carries the report engine's facts (one source of truth, lib/chat/engine-facts.ts):
    // guardrails, then the figures block, then the references -- no profile, no citation rules.
    const sample = [{ content: "Fee is AUD 4,640.", metadata: {} }, { content: "Age limit 44.", metadata: {} }];
    const facts = buildEngineFacts();
    const p = buildSystemPrompt(sample, { engineFacts: facts });
    check(p.startsWith(GUARDRAILS_TEXT) && p.includes(facts) && p.indexOf(facts) < p.lastIndexOf("block-3:") && p.includes("[1] Fee is AUD 4,640.") && p.includes("[2] Age limit 44."), "free system prompt: guardrails, engine facts, then the numbered references");
    check(buildSystemPrompt([], { engineFacts: facts }).includes("No matching reference material was found for this question."), "free system prompt with no references says so");
    void createHash;

    const w = new World();
    w.visitor("v1", { messageCount: 2, premiumCredits: 0 });
    const { deps, captured } = chatDeps(w);
    const res = await handleChat(req([userMsg("hi")]), deps);
    const c = captured[0];
    check(res.status === 200 && c.modelId === "gpt-4o-mini", "free message uses gpt-4o-mini");
    check(c.retrieval.primary === 8 && c.retrieval.occupation === 2, "free retrieval depth stays 8 + 2");
    check(c.sources === undefined && !c.system.includes("block-2:") && !c.system.includes("PREMIUM KAYNAK"), "free path: no sources metadata, no profile, no citation rules");
    check(c.system === buildSystemPrompt(CHUNKS, { engineFacts: buildEngineFacts() }), "free path sends exactly buildSystemPrompt(chunks, engine facts)");
    await c.onFinish("");
    check(w.visitors.get("v1")!.messageCount === 3 && w.visitors.get("v1")!.premiumCredits === 0, "free message counts once, after the reply");
    w.visitor("v1", { messageCount: 5 });
    const blocked = await handleChat(req([userMsg("hi")]), deps);
    check(blocked.status === 403, "6th free message is blocked as before");
  }

  // ── 3. premium vs free ───────────────────────────────────────────────────
  section("3. Premium path differs from free: model, retrieval, profile, citations");
  {
    check(getPremiumChatModelId({}) === DEFAULT_PREMIUM_CHAT_MODEL && (DEFAULT_PREMIUM_CHAT_MODEL as string) !== (CHAT_MODEL_ID as string), "PREMIUM_CHAT_MODEL defaults to a model other than the free one");
    check(getPremiumChatModelId({ PREMIUM_CHAT_MODEL: " gpt-4o " }) === "gpt-4o", "PREMIUM_CHAT_MODEL overrides the default");

    const w = new World();
    w.visitor("v1", { premiumCredits: 4, messageCount: 99 });
    w.links.push({ email: "a@example.test", visitorId: "v1", verified: true });
    w.reports.push({ email: "A@Example.test", reportJson: REPORT_A, inputJson: INPUT_A, createdAt: new Date("2026-09-01") });
    const { deps, captured } = chatDeps(w);
    await handleChat(req([userMsg("Can I get a 189?")]), deps);
    const c = captured[0];
    check(c.modelId === DEFAULT_PREMIUM_CHAT_MODEL, "premium message uses the premium model");
    check(c.retrieval.primary === 12 && c.retrieval.occupation === 2, "premium retrieval depth is 12 + 2");
    check(c.system.includes("UNIQUE-OCC-A") && c.system.includes("261313"), "profile: occupation and code");
    check(c.system.includes("Age 25/30") && c.system.includes("English 10/20") && c.system.includes("Points: 75"), "profile: points breakdown");
    check(c.system.includes("189: Not eligible now") && c.system.includes("Positive skills assessment") && c.system.includes("190: Conditional"), "profile: gate result per visa");
    check(c.system.includes("VIC, SA") && c.system.includes("TAS"), "profile: available states");
    check(c.system.includes("benchmark 85") && c.system.includes("gap 5"), "profile: benchmark gaps");
    check(!c.system.includes("answers are general") && !c.system.includes("yanıtların genel olduğunu"), "matched profile: no 'general answers' note");
    check(c.sources?.length === 3 && c.sources[0].id === "S1" && c.sources[0].source === "Subclass 189.pdf" && c.sources[0].page === 7, "premium sends the citation catalogue from the retrieved chunk metadata");
    // Readable source names (lib/chat/source-names.ts), never file names.
    check(c.system.includes("[S1] (Home Affairs – Subclass 189, p. 7)") && c.system.includes("[S3] (Home Affairs – Skilled occupation list)") && c.system.includes("(not citable)") && !/\[S\d+\] \([^)]*\.(pdf|xlsx)/i.test(c.system), "premium references carry id + readable document name/page, and unciteable chunks are marked");
    check(c.system.includes("PREMIUM KAYNAK KURALLARI"), "premium prompt has the citation rules");
  }
  {
    const w = new World();
    w.visitor("v1", { premiumCredits: 4, messageCount: 99 });
    const { deps, captured } = chatDeps(w);
    await handleChat(req([userMsg("hello")]), deps);
    await handleChat(req([userMsg("hello"), asstMsg("answer"), userMsg("again", "m2")]), deps);
    const [first, second] = captured;
    check(first.system.includes("yanıtların genel olduğunu") || first.system.includes("İLK yanıtında"), "no report: the first answer is told to say once that answers are general and suggest a report");
    check(!second.system.includes("İLK yanıtında") && second.system.includes("tekrarlama"), "no report: later answers are told not to repeat it");
    check(!first.system.includes("block-2:\nSource:"), "no report: no profile block");
  }
  {
    // an unverified purchase email must not unlock a stored report
    const w = new World();
    w.visitor("v1", { premiumCredits: 4, messageCount: 99 });
    w.links.push({ email: "a@example.test", visitorId: "v1", verified: false });
    w.reports.push({ email: "a@example.test", reportJson: REPORT_A, inputJson: INPUT_A, createdAt: new Date() });
    const { deps, captured } = chatDeps(w);
    await handleChat(req([userMsg("hi")]), deps);
    check(!captured[0].system.includes("UNIQUE-OCC-A"), "an email that was only typed at checkout (unverified) does not pull in a stored report");
  }
  {
    const w = new World();
    w.visitor("v1", { premiumCredits: 4, messageCount: 99 });
    w.profiles = { verifiedEmailsForVisitor: async () => { throw new Error("tables missing"); }, latestReportForEmail: async () => null };
    const { deps, captured } = chatDeps(w);
    const realError = console.error;
    console.error = () => {}; // the handler logs the lookup failure on purpose
    const res = await handleChat(req([userMsg("hi")]), deps);
    console.error = realError;
    check(res.status === 200 && captured.length === 1 && w.visitors.get("v1")!.premiumCredits === 3, "a profile-lookup failure still answers (generally) and charges one credit");
  }

  // ── 4. validator ─────────────────────────────────────────────────────────
  section("4. Validator: citations <-> retrieved chunk metadata; profile <-> requesting visitor");
  {
    const catalog = buildSourceCatalog(CHUNKS);
    const refs = catalogRefs(catalog);
    check(refs.length === 3 && catalog[3] === null, "a chunk with no usable metadata gets no citation id");
    const chunkMeta = CHUNKS.map((c) => c.metadata as { source?: string; page?: number } | null);
    check(
      refs.every((r) => chunkMeta.some((m) => m?.source === r.source && (r.page === undefined ? m.page === undefined : m.page === r.page))),
      "every catalogue entry's document and page equal a retrieved chunk's metadata",
    );
    check(!refs.some((r) => r.page !== undefined && !chunkMeta.some((m) => m?.page === r.page)), "no page appears that was not retrieved");

    const answer = "The charge is AUD 4,640 [S1]. You must be under 45 [S2]. Processing is 8 months [S9]. Roles: [S3].";
    const v = validateCitations(answer, refs);
    check(v.valid.join() === "S1,S2,S3" && v.invalid.join() === "S9", "validator flags a marker that is not in the retrieved set (S9) and accepts the rest");
    const rendered = renderCitations(answer, refs);
    check(rendered.includes("[Home Affairs – Subclass 189, p. 7]") && rendered.includes("[Points test, p. 2]") && rendered.includes("[Home Affairs – Skilled occupation list]") && !/\.(pdf|xlsx)\b/i.test(rendered), "rendered citations show the readable document name and page (no file names)");
    check(!rendered.includes("S9") && !/\[S\d+\]/.test(rendered), "an invented marker is dropped, never shown as a source");
    check(!/\[S\d+\]/.test(renderCitations("Fee [S1]", [])), "with no retrieved sources every marker is dropped");
    // a page the model might type itself is never trusted: only ids are resolved
    check(renderCitations("see Subclass 189.pdf p.99", refs) === "see Subclass 189.pdf p.99", "text the model writes itself is not turned into a citation");
  }
  {
    const w = new World();
    w.visitor("v1", { premiumCredits: 4, messageCount: 99 });
    w.visitor("v2", { premiumCredits: 4, messageCount: 99 });
    w.links.push({ email: "a@example.test", visitorId: "v1", verified: true }, { email: "b@example.test", visitorId: "v2", verified: true });
    w.reports.push(
      { email: "a@example.test", reportJson: REPORT_A, inputJson: INPUT_A, createdAt: new Date("2026-09-01") },
      { email: "b@example.test", reportJson: REPORT_B, inputJson: INPUT_B, createdAt: new Date("2026-09-02") },
    );
    const p1 = await loadVisitorProfile(w.profiles, "v1");
    const p2 = await loadVisitorProfile(w.profiles, "v2");
    check(!!p1 && p1.includes("UNIQUE-OCC-A") && p1.includes("261313") && !p1.includes("OTHER-USERS-SECRET") && !p1.includes("999999"), "visitor 1's profile contains only visitor 1's report");
    check(!!p2 && p2.includes("OTHER-USERS-SECRET") && !p2.includes("UNIQUE-OCC-A"), "visitor 2's profile contains only visitor 2's report");
    check((await loadVisitorProfile(w.profiles, "v3")) === null, "a visitor with no verified email gets no profile");
    const both = chatDeps(w);
    both.as("v1");
    await handleChat(req([userMsg("hi")]), both.deps);
    both.as("v2");
    await handleChat(req([userMsg("hi")]), both.deps);
    check(!both.captured[0].system.includes("OTHER-USERS-SECRET") && both.captured[1].system.includes("OTHER-USERS-SECRET") && !both.captured[1].system.includes("UNIQUE-OCC-A"), "through the handler: each request's prompt holds only the requesting visitor's report");
    check(buildProfileSummary({}, {}) === null && buildProfileSummary(null, null) === null, "an empty/invalid report yields no profile (never an invented one)");
  }

  // ── 5. restore flow ──────────────────────────────────────────────────────
  section("5. Restore flow");
  const setupRestore = () => {
    const w = new World();
    w.visitor("old", { premiumCredits: 7 });
    w.visitor("new", { premiumCredits: 0 });
    w.links.push({ email: "buyer@example.test", visitorId: "old", verified: false });
    return w;
  };
  const tokenFrom = (w: World) => decodeURIComponent(new URL(w.emails.at(-1)!.link).searchParams.get("restore")!);
  {
    const w = setupRestore();
    const r = await requestRestore(w.restoreDeps(), { email: " Buyer@Example.test ", ip: "1.1.1.1" });
    await w.flush();
    check(r.status === 200 && w.emails.length === 1 && w.emails[0].to === "buyer@example.test", "valid email with credits: link emailed to the normalised address");
    const link = w.emails[0].link;
    check(link.startsWith("https://example.test/ai-assistant?restore=") && !link.includes(hashToken(tokenFrom(w))), "link carries the raw token; only its hash is stored");
    check(![...w.tokens.keys()].includes(tokenFrom(w)) && w.tokens.has(hashToken(tokenFrom(w))), "the database holds the hash, not the token");
    const c = await confirmRestore(w.restoreDeps(), { token: tokenFrom(w), visitorId: "new" });
    check(c.ok && c.credits === 7 && w.visitors.get("new")!.premiumCredits === 7 && w.visitors.get("old")!.premiumCredits === 0, "confirm moves the credits to the visitor that opened the link");
    check(w.links.some((l) => l.visitorId === "new" && l.email === "buyer@example.test" && l.verified), "the restoring visitor is linked as verified (this is what unlocks the profile)");
    const reused = await confirmRestore(w.restoreDeps(), { token: tokenFrom(w), visitorId: "third" });
    check(!reused.ok, "a used link cannot be used again");
  }
  {
    const w = setupRestore();
    await requestRestore(w.restoreDeps(), { email: "buyer@example.test", ip: "1.1.1.1" });
    await w.flush();
    w.clock = new Date(w.clock.getTime() + RESTORE_TOKEN_TTL_MS + 1000);
    const c = await confirmRestore(w.restoreDeps(), { token: tokenFrom(w), visitorId: "new" });
    check(!c.ok && w.visitors.get("new")!.premiumCredits === 0 && w.visitors.get("old")!.premiumCredits === 7, "an expired link restores nothing");
    check(!(await confirmRestore(w.restoreDeps(), { token: "x".repeat(43), visitorId: "new" })).ok, "an unknown token fails the same way");
    check(JSON.stringify(await confirmRestore(w.restoreDeps(), { token: "x".repeat(43), visitorId: "new" })) === JSON.stringify(c), "expired, reused and unknown links are indistinguishable");
  }
  {
    const w = setupRestore();
    const known = await requestRestore(w.restoreDeps(), { email: "buyer@example.test", ip: "2.2.2.2" });
    const unknown = await requestRestore(w.restoreDeps(), { email: "nobody@example.test", ip: "3.3.3.3" });
    w.visitor("empty", { premiumCredits: 0 });
    w.links.push({ email: "spent@example.test", visitorId: "empty", verified: false });
    const spent = await requestRestore(w.restoreDeps(), { email: "spent@example.test", ip: "4.4.4.4" });
    check(JSON.stringify(known) === JSON.stringify(unknown) && JSON.stringify(unknown) === JSON.stringify(spent), "known email, unknown email and an email with 0 credits get the identical response");
    await w.flush();
    check(w.emails.length === 1 && w.emails[0].to === "buyer@example.test", "an email is sent only to the address that has credits");
    check(w.tokens.size === 1, "no token is created for unknown or empty emails");
    const bad = await requestRestore(w.restoreDeps(), { email: "not-an-email", ip: "5.5.5.5" });
    check(bad.status === 400, "a malformed email is rejected (400) regardless of credits");
  }
  {
    const w = setupRestore();
    const statuses: number[] = [];
    for (let i = 0; i < RESTORE_MAX_PER_EMAIL + 2; i++) statuses.push((await requestRestore(w.restoreDeps(), { email: "buyer@example.test", ip: `9.9.9.${i}` })).status);
    check(statuses.slice(0, RESTORE_MAX_PER_EMAIL).every((s) => s === 200) && statuses.slice(RESTORE_MAX_PER_EMAIL).every((s) => s === 429), `per-email limit: ${RESTORE_MAX_PER_EMAIL} requests/hour, then 429`);
    const w2 = setupRestore();
    const s2: number[] = [];
    for (let i = 0; i < RESTORE_MAX_PER_IP + 1; i++) s2.push((await requestRestore(w2.restoreDeps(), { email: `user${i}@example.test`, ip: "7.7.7.7" })).status);
    check(s2.slice(0, RESTORE_MAX_PER_IP).every((s) => s === 200) && s2.at(-1) === 429, `per-IP limit: ${RESTORE_MAX_PER_IP} requests/hour across emails, then 429`);
    const limitedKnown = await requestRestore(w.restoreDeps(), { email: "buyer@example.test", ip: "8.8.8.8" });
    const w3 = setupRestore();
    for (let i = 0; i < RESTORE_MAX_PER_EMAIL; i++) await requestRestore(w3.restoreDeps(), { email: "nobody@example.test", ip: `6.6.6.${i}` });
    const limitedUnknown = await requestRestore(w3.restoreDeps(), { email: "nobody@example.test", ip: "8.8.8.8" });
    check(JSON.stringify(limitedKnown) === JSON.stringify(limitedUnknown), "the rate-limit response is the same for an email with credits and one without");
    w.clock = new Date(w.clock.getTime() + 61 * 60 * 1000);
    check((await requestRestore(w.restoreDeps(), { email: "buyer@example.test", ip: "8.8.8.8" })).status === 200, "the limit lifts after the hour");
  }
  {
    const w = setupRestore();
    for (const target of ["new", "third"]) {
      w.visitor(target, { premiumCredits: 0 });
      await requestRestore(w.restoreDeps(), { email: "buyer@example.test", ip: `10.0.0.${target.length}` });
      await w.flush();
      await confirmRestore(w.restoreDeps(), { token: tokenFrom(w), visitorId: target });
    }
    check(w.visitors.get("third")!.premiumCredits === 7 && w.visitors.get("new")!.premiumCredits === 0 && w.visitors.get("old")!.premiumCredits === 0, "restoring again on a third device moves the credits from wherever they are now (no duplication)");
  }
  {
    // end to end: after restore the visitor is premium and gets their own profile
    const w = setupRestore();
    w.reports.push({ email: "buyer@example.test", reportJson: REPORT_A, inputJson: INPUT_A, createdAt: new Date() });
    await requestRestore(w.restoreDeps(), { email: "buyer@example.test", ip: "1.2.3.4" });
    await w.flush();
    await confirmRestore(w.restoreDeps(), { token: tokenFrom(w), visitorId: "new" });
    w.visitors.get("new")!.messageCount = 99;
    const { deps, captured } = chatDeps(w);
    deps.getVisitor = async () => ({ ...w.visitors.get("new")! });
    const res = await handleChat(req([userMsg("hi")]), deps);
    check(res.status === 200 && captured[0].system.includes("UNIQUE-OCC-A") && w.visitors.get("new")!.premiumCredits === 6, "after restoring, the new device chats as a paying visitor with its own profile");
  }

  console.log(failures === 0 ? "\nAll chat-credit checks passed." : `\n${failures} chat-credit check(s) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
