import { NextRequest } from "next/server";
import { streamText, generateText, embed, convertToModelMessages, type UIMessage } from "ai";
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

/**
 * The knowledge base is embedded from English-language PDFs, but visitors
 * often ask in Turkish -- a raw Turkish query embeds far from the English
 * chunk vectors, so cosine similarity retrieval misses relevant content.
 * This does a quick gpt-4o-mini pre-call to pull out the English visa
 * terminology (subclass numbers, official visa names, keywords) so the
 * embedded search string carries both the original intent and the English
 * terms the knowledge base actually uses.
 */
async function expandQueryKeywords(currentMessageContent: string): Promise<string> {
  const { text } = await generateText({
    model: openai.chat(CHAT_MODEL_ID),
    prompt: `Kullanıcının aşağıdaki vize sorusunu analiz et. Avustralya göçmenlik sistemindeki doğru İngilizce vize adını, Subclass numarasını (örn: 500, 482, 189) ve kritik İngilizce anahtar kelimeleri (requirements, eligibility vb.) çıkar. Sadece bu İngilizce anahtar kelimeleri ve numaraları boşlukla ayırarak dön. Asla tam cümle kurma.
Kullanıcı Sorusu: ${currentMessageContent}`,
  });
  return text.trim();
}

function buildSystemPrompt(chunks: RetrievedChunk[]): string {
  const chunkContents =
    chunks.length > 0
      ? chunks.map((chunk, i) => `[${i + 1}] ${chunk.content}`).join("\n\n")
      : "No matching reference material was found for this question.";

  return `Sen LogiVisa'nın yetkin, analitik ve stratejik Avustralya Vize Asistanısın. Görevin, sana sağlanan [REFERANS BİLGİLERİ] kullanarak kullanıcılara vize seçenekleri, başvuru süreçleri ve potansiyel göçmenlik planlamaları hakkında detaylı ve yapılandırılmış rehberlik sunmaktır.

KESİN KURALLAR (GUARDRAILS):
1. Yasal Sınırlar ve Garanti: ASLA vize onayı veya Kalıcı Oturum (PR) için kesin garanti verme ("Kesin PR alırsın", "Vizen %100 onaylanır" gibi ifadeler YASAKTIR). Dilini her zaman olasılıklar üzerine kur ("... şartlarını sağlarsanız bu uygun bir yol olabilir", "Bu rota genellikle şu adımları içerir...").
2. MARA Yönlendirmesi: Sen bir yapay zekasın, lisanslı bir MARA ajanı değilsin. Ancak bunu her cümlenin sonuna ekleyip kullanıcıyı sıkma. Sadece çok kritik, yasal olarak riskli veya tamamen sana verilen verilerin dışına çıkan karmaşık vakalarda profesyonel destek almalarını öner.
3. Planlama ve Strateji: Kullanıcı spesifik bir durum verdiğinde (örn: yaş, meslek, deneyim) sadece kural okuma. Sağlanan referansları kullanarak adım adım bir eylem planı veya alternatif senaryolar (A Planı, B Planı) oluştur.
4. Eksik Veri Yönetimi (Kritik): Eğer kullanıcının sorduğu vize türü (Örn: 485 veya 482) sağlanan [REFERANS BİLGİLERİ] içinde eksikse veya hiç yoksa, KESİNLİKLE doğrudan "Bu konuda bilgi yok" deyip kestirip atma. Kendi genel ön eğitimini kullanarak o vize hakkında yapılandırılmış genel bir özet ver, ancak şeffaf ol: "Sistemimdeki LogiVisa güncel referanslarında bu vizenin tüm spesifik alt detayları şu an tam yer almıyor, ancak genel Avustralya göçmenlik kurallarına göre 482 vizesi şudur..." şeklinde yanıt ver ve ardından kullanıcıdan daha spesifik detaylar isteyerek aramayı derinleştir.

[REFERANS BİLGİLERİ]:
${chunkContents}
`;
}

/**
 * RAG chatbot endpoint: expands the visitor's latest message into English
 * visa terminology (see expandQueryKeywords), embeds the combined
 * original+expanded string, retrieves the closest DocumentChunk rows via
 * pgvector cosine distance, and streams a gpt-4o-mini answer grounded in
 * that context. Anonymous visitors (tracked by IP+User-Agent, see
 * getVisitorContext) get 5 free messages before this route starts
 * returning 403 limit_reached instead of calling the model.
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

  const expandedKeywords = await expandQueryKeywords(lastUserText);
  const searchString = `${lastUserText} ${expandedKeywords}`;

  const { embedding } = await embed({
    model: openai.textEmbeddingModel(EMBEDDING_MODEL_ID),
    value: searchString,
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
