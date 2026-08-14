import { NextRequest } from "next/server";
import { streamText, embed, convertToModelMessages, type UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";

import { prisma } from "@/lib/prisma";
import { getVisitorContext } from "@/lib/visitor-tracking";

export const runtime = "nodejs";

const CHAT_MODEL_ID = "gpt-4o-mini";
const EMBEDDING_MODEL_ID = "text-embedding-3-small";
const FREE_MESSAGE_LIMIT = 5;
const RETRIEVED_CHUNK_COUNT = 6;

interface KnowledgeChatRequestBody {
  // useChat/DefaultChatTransport posts UIMessage[] (parts-based), not
  // {role, content} pairs.
  messages?: UIMessage[];
}

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

interface RetrievedChunk {
  content: string;
  metadata: unknown;
}

function buildSystemPrompt(chunks: RetrievedChunk[]): string {
  const referenceText =
    chunks.length > 0
      ? chunks.map((chunk, i) => `[${i + 1}] ${chunk.content}`).join("\n\n")
      : "No matching reference material was found for this question.";

  return [
    "You are LogiVisa's Australian immigration AI assistant.",
    "Answer strictly based on the reference material below. Do not invent visa rules, fees, subclasses, or eligibility criteria that aren't supported by it.",
    "If the references don't contain enough information to answer confidently, say so plainly and suggest the user consult a registered MARA migration agent instead of guessing.",
    "",
    "Reference material:",
    referenceText,
  ].join("\n");
}

/**
 * RAG chatbot endpoint: embeds the visitor's latest message, retrieves the
 * closest DocumentChunk rows via pgvector cosine distance, and streams a
 * gpt-4o-mini answer grounded in that context. Anonymous visitors (tracked
 * by IP+User-Agent, see getVisitorContext) get 5 free messages before this
 * route starts returning 403 limit_reached instead of calling the model.
 */
export async function POST(req: NextRequest) {
  const visitor = await getVisitorContext(req);

  if (visitor.messageCount >= FREE_MESSAGE_LIMIT && !visitor.isPremium) {
    return Response.json({ error: "limit_reached", message: "Free limit reached." }, { status: 403 });
  }

  const body = (await req.json()) as KnowledgeChatRequestBody;
  const messages = body.messages ?? [];
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  const lastUserText = lastUserMessage ? getMessageText(lastUserMessage).trim() : "";

  if (!lastUserText) {
    return Response.json(
      { error: "invalid_request", message: "A non-empty user message is required." },
      { status: 400 },
    );
  }

  const { embedding } = await embed({
    model: openai.textEmbeddingModel(EMBEDDING_MODEL_ID),
    value: lastUserText,
  });
  const vectorLiteral = `[${embedding.join(",")}]`;

  // $queryRaw (tagged template, not $queryRawUnsafe) so the vector literal
  // is bound as a parameter rather than interpolated into the SQL string.
  const retrievedChunks = await prisma.$queryRaw<RetrievedChunk[]>`
    SELECT content, metadata
    FROM document_chunks
    ORDER BY embedding <=> ${vectorLiteral}::vector
    LIMIT ${RETRIEVED_CHUNK_COUNT}
  `;

  const result = streamText({
    model: openai.chat(CHAT_MODEL_ID),
    system: buildSystemPrompt(retrievedChunks),
    messages: await convertToModelMessages(messages),
    onFinish: async () => {
      // Free-message counter only advances once the model actually
      // produced a reply -- a request that fails/aborts mid-stream
      // shouldn't cost the visitor part of their free quota.
      await prisma.chatVisitor.update({
        where: { id: visitor.id },
        data: { messageCount: { increment: 1 } },
      });
    },
  });

  // toUIMessageStreamResponse (not toTextStreamResponse) -- required for the
  // ai/@ai-sdk/react useChat + DefaultChatTransport pairing on the client,
  // which parses the UI Message Stream protocol, not a plain text stream.
  return result.toUIMessageStreamResponse();
}
