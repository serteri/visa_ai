import type { UIMessage } from "ai";

import { buildPremiumSystemPrompt, buildSystemPrompt } from "./prompts";
import { buildSourceCatalog, catalogRefs, formatPremiumReferences } from "./citations";
import {
  CHAT_MODEL_ID,
  FREE_MESSAGE_LIMIT,
  FREE_PRIMARY_CHUNK_COUNT,
  OCCUPATION_LIST_CHUNK_COUNT,
  PREMIUM_PRIMARY_CHUNK_COUNT,
} from "./config";
import { visitorAuthorityFee } from "./authority-fees";
import { residenceFacts } from "./residence";
import { findEngineConflicts, type EngineConflict } from "./answer-check";
import { buildCorrections, capCorrections, conversationLocale, type Correction } from "./corrections";
import { buildPlanSummary, lastShownLeadFingerprint, profileFingerprint, shouldShowLead, type PlanFacts } from "./plan-summary";
import type { CreditStore } from "./credits";
import { buildEngineFacts, type LiveStateData } from "./engine-facts";
import { loadChatProfile, type ProfileStore } from "./profile";
import type { QuickProfileStore } from "./quick-profile";
import { buildStudentVisaGuidance, isStudentVisaContext } from "./visa-guidance";
import type { RetrievedChunk, SourceRef } from "./types";
import type { Locale, ReadinessInput } from "@/lib/readiness/types";

/** Correction blocks shown under one answer. */
export const MAX_CORRECTIONS = 2;

export interface ChatVisitorLike {
  id: string;
  messageCount: number;
  premiumCredits: number;
}

export interface StreamRequest {
  modelId: string;
  system: string;
  messages: UIMessage[];
  /** Premium only: the catalogue sent to the client as message metadata. Undefined on the free path. */
  sources?: SourceRef[];
  /** The conversation language: the client shows the "full report" link and call to action in it. */
  locale?: Locale;
  /** Premium only: where the profile came from ("quick" -> the client shows the one-line full-report CTA once). */
  profileSource?: "report" | "quick" | null;
  /** The finished answer text. */
  onFinish: (text: string) => Promise<void>;
  /**
   * Called with the finished answer before the stream closes: the correction blocks (fee / gate / state-availability
   * conflicts, with the engine's fact and source) to append to the same message. Also logs the conflicts.
   */
  correct?: (text: string) => Correction[];
  /**
   * The engine's opening summary (points, status per visa, nomination-inclusive scores, gap plan), shown at the top of
   * the answer. Set only when it is due: the first answer, a changed profile, or the visitor asking about their position.
   */
  lead?: string;
  /** The saved profile's fingerprint; written with the summary so later requests know it was shown. */
  leadFingerprint?: string;
  /** The model call failed or the client went away before a reply: nothing was delivered. */
  onFailure: () => Promise<void>;
}

export interface ChatDeps {
  getVisitor(req: Request): Promise<ChatVisitorLike>;
  credits: CreditStore;
  profiles: ProfileStore;
  /** The in-chat quick profile card's store; optional so a deployment without the table still answers. */
  quickProfiles?: QuickProfileStore;
  /** Live admin / scraper state status, as the report reads it (for the engine facts). */
  liveState?(): Promise<LiveStateData>;
  premiumModelId: string;
  expandQuery(text: string): Promise<string>;
  retrieve(searchString: string, counts: { primary: number; occupation: number }): Promise<RetrievedChunk[]>;
  stream(opts: StreamRequest): Promise<Response>;
  /** Where engine conflicts in a finished answer are reported (default: console.warn). */
  reportConflicts?(conflicts: EngineConflict[], ctx: { premium: boolean }): void;
}

const groundingOf = (facts: string, chunks: RetrievedChunk[]) => `${facts}\n${chunks.map((c) => c.content).join("\n")}`;

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

const limitReached = () => Response.json({ error: "limit_reached", message: "Free limit reached." }, { status: 403 });

/**
 * Access rule: a visitor with premiumCredits > 0 is a paying visitor and every message costs one credit (the
 * premium path); otherwise the first FREE_MESSAGE_LIMIT messages are free (the unchanged free path); otherwise
 * limit_reached. isPremium is deliberately not consulted: it never bypasses the decrement.
 */
export async function handleChat(req: Request, deps: ChatDeps): Promise<Response> {
  const visitor = await deps.getVisitor(req);

  const canPay = visitor.premiumCredits > 0;
  const canUseFree = visitor.messageCount < FREE_MESSAGE_LIMIT;
  if (!canPay && !canUseFree) return limitReached();

  const body = (await req.json()) as { messages?: UIMessage[] };
  const messages = body.messages ?? [];
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  const lastUserText = lastUserMessage ? getMessageText(lastUserMessage).trim() : "";
  if (!lastUserText) {
    return Response.json({ error: "invalid_request", message: "A non-empty user message is required." }, { status: 400 });
  }

  // Spend the credit before any model call; the atomic update is what stops two concurrent messages sharing one
  // credit. A failed reservation (balance hit 0 in between) falls back to the free path if the visitor still has it.
  let premium = false;
  if (canPay) premium = await deps.credits.reserve(visitor.id);
  if (!premium && !canUseFree) return limitReached();

  let refunded = false;
  const refundOnce = async () => {
    if (!premium || refunded) return;
    refunded = true;
    await deps.credits.refund(visitor.id);
  };

  // Every finished answer is checked against the engine data (fees, gates, state claims, repeated disclaimers).
  const requestLocale = (body as { locale?: string }).locale;
  // The conversation language is what the visitor writes in (a Turkish question on an English page gets a Turkish
  // summary, corrections and answer); the client's language is the fallback.
  const userTexts = messages.filter((m) => m.role === "user").map((m) => getMessageText(m));
  const convLocale = conversationLocale(userTexts, requestLocale);
  const answerLocale = (text: string) => (void text, convLocale);
  const planFor = (profile: { report: unknown; input: object; summary: string; source: string } | null) => {
    if (!profile) return null;
    try {
      const plan = buildPlanSummary(profile.report, profile.input, answerLocale(lastUserText));
      if (!plan) return null;
      // The summary opens the first answer; later it is shown again only for a changed profile or a question about the visitor's position.
      const fingerprint = profileFingerprint(profile as { summary: string; source: string });
      const show = shouldShowLead({ fingerprint, lastShown: lastShownLeadFingerprint(messages), userText: lastUserText });
      const lastShown = lastShownLeadFingerprint(messages);
      const earlier = !show && lastShown === fingerprint;
      return { ...plan, fingerprint, show, earlier, withheld: !show && !earlier };
    } catch (err) {
      console.error("[knowledge-chat] plan summary failed; answering without the opening summary", err);
      return null;
    }
  };
  const check = (text: string, opts: { premium: boolean; hasProfile: boolean; plan?: PlanFacts; groundingText?: string; input?: object }): Correction[] => {
    const residence = residenceFacts(opts.input);
    const profileInput = opts.input as Partial<ReadinessInput> | undefined;
    const gateStatus = opts.plan ? Object.fromEntries(Object.entries(opts.plan.statuses).map(([v, s]) => [v, s.status])) : undefined;
    const conflicts = findEngineConflicts(text, {
      hasProfile: opts.hasProfile,
      gateStatus,
      ceiling: opts.plan?.ceiling,
      benchmarks: opts.plan?.benchmarks,
      currentTotals: opts.plan?.currentTotals,
      groundingText: opts.groundingText,
      residence,
      visitorAuthorityFee: profileInput ? visitorAuthorityFee(profileInput) : undefined,
      locale: answerLocale(text),
    });
    if (conflicts.length === 0) return [];
    if (deps.reportConflicts) deps.reportConflicts(conflicts, { premium: opts.premium });
    else console.warn("[chat_engine_conflict]", JSON.stringify({ premium: opts.premium, conflicts: conflicts.map((c) => ({ kind: c.kind, detail: c.detail })) }));
    const locale = answerLocale(text);
    // At most two correction blocks per answer, the most serious first; the rest are logged.
    const { shown, dropped } = capCorrections(buildCorrections(conflicts, locale, { plan: opts.plan, input: profileInput, residence }), MAX_CORRECTIONS);
    if (dropped.length > 0) console.warn("[chat_correction_dropped]", JSON.stringify(dropped.map((d) => ({ kind: d.kind, text: d.text }))));
    return shown;
  };

  try {
    const expanded = await deps.expandQuery(lastUserText);
    const searchString = `${lastUserText} ${expanded}`;
    // The report's own figures and rules (one source of truth); live state status as the report reads it.
    const live = deps.liveState ? await deps.liveState().catch(() => ({})) : {};
    const engineFacts = buildEngineFacts(live);

    if (!premium) {
      const [chunks, profile] = await Promise.all([
        deps.retrieve(searchString, { primary: FREE_PRIMARY_CHUNK_COUNT, occupation: OCCUPATION_LIST_CHUNK_COUNT }),
        // A free visitor's quick profile card (or linked report) gives the same engine facts the premium path uses.
        loadChatProfile(deps.profiles, deps.quickProfiles, visitor.id).catch(() => null),
      ]);
      const guidance = isStudentVisaContext(profile?.input.currentVisaSubclass, lastUserText)
        ? buildStudentVisaGuidance(profile?.input.currentVisaSubclass === "500" ? profile.input : undefined)
        : undefined;
      const plan = planFor(profile);
      return await deps.stream({
        modelId: CHAT_MODEL_ID,
        system: buildSystemPrompt(chunks, { engineFacts, guidance, locale: convLocale, ...(profile ? { profile: { summary: profile.summary, source: profile.source, lead: plan?.lead, leadShownEarlier: plan ? plan.earlier : undefined, leadWithheld: plan ? plan.withheld : undefined } } : {}) }),
        messages,
        locale: convLocale,
        ...(plan?.show ? { lead: plan.lead, leadFingerprint: plan.fingerprint } : {}),
        correct: (text) => check(text, { premium: false, hasProfile: Boolean(profile), plan: plan?.facts, groundingText: groundingOf(engineFacts, chunks), input: profile?.input }),
        onFinish: async () => {
          await deps.credits.recordFreeMessage(visitor.id);
        },
        onFailure: async () => {},
      });
    }

    const [chunks, profile] = await Promise.all([
      deps.retrieve(searchString, { primary: PREMIUM_PRIMARY_CHUNK_COUNT, occupation: OCCUPATION_LIST_CHUNK_COUNT }),
      // A profile lookup problem (e.g. tables not created yet) must never cost the visitor their paid answer.
      loadChatProfile(deps.profiles, deps.quickProfiles, visitor.id).catch((err) => {
        console.error("[knowledge-chat] profile lookup failed; answering without a profile", err);
        return null;
      }),
    ]);
    const catalog = buildSourceCatalog(chunks);
    const currentVisa = profile?.input.currentVisaSubclass;
    const guidance = isStudentVisaContext(currentVisa, lastUserText) ? buildStudentVisaGuidance(currentVisa === "500" ? profile?.input : undefined) : undefined;
    const plan = planFor(profile);
    return await deps.stream({
      modelId: deps.premiumModelId,
      system: buildPremiumSystemPrompt({
        references: formatPremiumReferences(chunks, catalog),
        profile: profile?.summary ?? null,
        profileSource: profile?.source,
        lead: plan?.lead,
        leadShownEarlier: plan ? plan.earlier : undefined,
        leadWithheld: plan ? plan.withheld : undefined,
        isFirstAnswer: !messages.some((m) => m.role === "assistant"),
        extras: { engineFacts, guidance, locale: convLocale },
      }),
      messages,
      locale: convLocale,
      sources: catalogRefs(catalog),
      profileSource: profile?.source ?? null,
      ...(plan?.show ? { lead: plan.lead, leadFingerprint: plan.fingerprint } : {}),
      correct: (text) => check(text, { premium: true, hasProfile: Boolean(profile), plan: plan?.facts, groundingText: groundingOf(engineFacts, chunks), input: profile?.input }),
      onFinish: async () => {},
      onFailure: refundOnce,
    });
  } catch (err) {
    await refundOnce();
    throw err;
  }
}
