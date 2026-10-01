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
import type { CreditStore } from "./credits";
import { loadVisitorProfile, type ProfileStore } from "./profile";
import type { RetrievedChunk, SourceRef } from "./types";

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
  onFinish: () => Promise<void>;
  /** The model call failed or the client went away before a reply: nothing was delivered. */
  onFailure: () => Promise<void>;
}

export interface ChatDeps {
  getVisitor(req: Request): Promise<ChatVisitorLike>;
  credits: CreditStore;
  profiles: ProfileStore;
  premiumModelId: string;
  expandQuery(text: string): Promise<string>;
  retrieve(searchString: string, counts: { primary: number; occupation: number }): Promise<RetrievedChunk[]>;
  stream(opts: StreamRequest): Promise<Response>;
}

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

  try {
    const expanded = await deps.expandQuery(lastUserText);
    const searchString = `${lastUserText} ${expanded}`;

    if (!premium) {
      const chunks = await deps.retrieve(searchString, { primary: FREE_PRIMARY_CHUNK_COUNT, occupation: OCCUPATION_LIST_CHUNK_COUNT });
      return await deps.stream({
        modelId: CHAT_MODEL_ID,
        system: buildSystemPrompt(chunks),
        messages,
        onFinish: () => deps.credits.recordFreeMessage(visitor.id),
        onFailure: async () => {},
      });
    }

    const [chunks, profile] = await Promise.all([
      deps.retrieve(searchString, { primary: PREMIUM_PRIMARY_CHUNK_COUNT, occupation: OCCUPATION_LIST_CHUNK_COUNT }),
      // A profile lookup problem (e.g. tables not created yet) must never cost the visitor their paid answer.
      loadVisitorProfile(deps.profiles, visitor.id).catch((err) => {
        console.error("[knowledge-chat] profile lookup failed; answering without a profile", err);
        return null;
      }),
    ]);
    const catalog = buildSourceCatalog(chunks);
    return await deps.stream({
      modelId: deps.premiumModelId,
      system: buildPremiumSystemPrompt({
        references: formatPremiumReferences(chunks, catalog),
        profile,
        isFirstAnswer: !messages.some((m) => m.role === "assistant"),
      }),
      messages,
      sources: catalogRefs(catalog),
      onFinish: async () => {},
      onFailure: refundOnce,
    });
  } catch (err) {
    await refundOnce();
    throw err;
  }
}
