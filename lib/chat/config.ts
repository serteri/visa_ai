export const EMBEDDING_MODEL_ID = "text-embedding-3-small";
/** Free path model, and the model for the cheap keyword-expansion pre-call on both paths. */
export const CHAT_MODEL_ID = "gpt-4o-mini";
export const FREE_MESSAGE_LIMIT = 5;

/**
 * Premium model: any model id the OpenAI provider (@ai-sdk/openai, already in the stack) accepts. Default gpt-4.1:
 * markedly better than gpt-4o-mini at following a long guardrail prompt and at attaching per-claim source markers.
 */
export const DEFAULT_PREMIUM_CHAT_MODEL = "gpt-4.1";
export function getPremiumChatModelId(env: Record<string, string | undefined> = process.env): string {
  return env.PREMIUM_CHAT_MODEL?.trim() || DEFAULT_PREMIUM_CHAT_MODEL;
}

export const FREE_PRIMARY_CHUNK_COUNT = 8;
/** Premium retrieves more chunks, so more claims have a retrieved source to cite. */
export const PREMIUM_PRIMARY_CHUNK_COUNT = 12;
export const OCCUPATION_LIST_CHUNK_COUNT = 2;

/** One credit per premium message; credits never expire. */
export const CREDITS_PER_MESSAGE = 1;
