import { convertToModelMessages, embed, generateText, streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getVisitorContext } from "@/lib/visitor-tracking";

import { CHAT_MODEL_ID, EMBEDDING_MODEL_ID, getPremiumChatModelId } from "./config";
import { correctedUIStreamResponse } from "./corrected-stream";
import { prismaCreditStore } from "./credits";
import { dropSupersededChunks } from "./document-versions";
import { getStateIntelligenceMap, getStateNominationConfigMap } from "@/lib/state-intelligence";

import type { LiveStateData } from "./engine-facts";
import type { ChatDeps } from "./handler";
import type { ProfileStore } from "./profile";
import type { QuickProfileStore } from "./quick-profile";
import type { RetrievedChunk } from "./types";

// These 4 files are occupation-code lookup tables (ANZSCO/ROL/STSOL rows), not visa-detail content -- each row
// repeats visa names like "186 - Employer Nomination Scheme visa" across ~1,300 near-duplicate chunks (28% of the
// whole knowledge base). Left unfiltered, they dominate cosine-similarity search for any "explain visa X" question
// and crowd out the actual PDF chunks that contain fees/eligibility/processing-time details -- e.g. a Subclass 186
// overview query put 5 of the top 6 results in this bucket and pushed the chunk with the AUD6,140 application cost
// down to rank 10. Querying them separately with a small dedicated slot keeps them useful for genuine
// occupation-eligibility questions without starving every other question of real visa content.
export const OCCUPATION_LIST_SOURCES = [
  "Skilled Occupation List.md",
  "Skilled list.md",
  "Skilled occupation list.xlsx",
  "skilled-occupation-list.json",
];

/**
 * The knowledge base is embedded from English-language PDFs, but visitors often ask in Turkish -- a raw Turkish
 * query embeds far from the English chunk vectors, so cosine similarity retrieval misses relevant content. This
 * does a quick gpt-4o-mini pre-call to pull out the English visa terminology (subclass numbers, official visa
 * names, keywords) so the embedded search string carries both the original intent and the English terms the
 * knowledge base actually uses.
 */
async function expandQueryKeywords(currentMessageContent: string): Promise<string> {
  const { text } = await generateText({
    model: openai.chat(CHAT_MODEL_ID),
    prompt: `Kullanıcının aşağıdaki vize sorusunu analiz et. Avustralya göçmenlik sistemindeki doğru İngilizce vize adını, Subclass numarasını (örn: 500, 482, 189) ve kritik İngilizce anahtar kelimeleri (requirements, eligibility vb.) çıkar. Sadece bu İngilizce anahtar kelimeleri ve numaraları boşlukla ayırarak dön. Asla tam cümle kurma.
Kullanıcı Sorusu: ${currentMessageContent}`,
  });
  return text.trim();
}

async function retrieve(searchString: string, counts: { primary: number; occupation: number }): Promise<RetrievedChunk[]> {
  const { embedding } = await embed({
    model: openai.textEmbeddingModel(EMBEDDING_MODEL_ID),
    value: searchString,
  });
  const vectorLiteral = `[${embedding.join(",")}]`;

  // $queryRaw (tagged template, not $queryRawUnsafe) so the vector literal and source list are bound as parameters
  // rather than interpolated into the SQL string. Two separate queries (see OCCUPATION_LIST_SOURCES above) so the
  // occupation-list noise can never fill more than its reserved slots.
  // Superseded document versions (lib/chat/document-versions.ts) are never retrieved: extra candidates are fetched
  // and the older versions dropped before taking the usual number, so the answer only sees the latest document.
  const over = (n: number) => n * SUPERSEDED_OVERFETCH;
  const [primaryChunks, occupationListChunks] = await Promise.all([
    prisma.$queryRaw<RetrievedChunk[]>`
      SELECT content, metadata
      FROM document_chunks
      WHERE metadata->>'source' NOT IN (${Prisma.join(OCCUPATION_LIST_SOURCES)})
      ORDER BY embedding <=> ${vectorLiteral}::vector
      LIMIT ${over(counts.primary)}
    `,
    prisma.$queryRaw<RetrievedChunk[]>`
      SELECT content, metadata
      FROM document_chunks
      WHERE metadata->>'source' IN (${Prisma.join(OCCUPATION_LIST_SOURCES)})
      ORDER BY embedding <=> ${vectorLiteral}::vector
      LIMIT ${over(counts.occupation)}
    `,
  ]);
  return selectLatestChunks(primaryChunks, occupationListChunks, counts);
}

/** How many candidates are fetched per kept chunk, so dropping superseded versions still leaves enough. */
const SUPERSEDED_OVERFETCH = 3;

/** Drops superseded document versions, then keeps the usual number of each kind, in similarity order. */
export function selectLatestChunks(
  primary: RetrievedChunk[],
  occupation: RetrievedChunk[],
  counts: { primary: number; occupation: number },
): RetrievedChunk[] {
  return [...dropSupersededChunks(primary).slice(0, counts.primary), ...dropSupersededChunks(occupation).slice(0, counts.occupation)];
}

export const prismaProfileStore: ProfileStore = {
  async verifiedEmailsForVisitor(visitorId) {
    const rows = await prisma.chatCreditLink.findMany({ where: { visitorId, verified: true }, select: { email: true } });
    return rows.map((r) => r.email);
  },
  async latestReportForEmail(email) {
    return prisma.userReport.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
      select: { reportJson: true, inputJson: true, createdAt: true },
    });
  },
};

export const prismaQuickProfileStore: QuickProfileStore = {
  async get(visitorId) {
    return prisma.chatVisitorProfile.findUnique({ where: { visitorId }, select: { inputJson: true, reportJson: true, updatedAt: true } });
  },
  async save(visitorId, input, report) {
    const data = { inputJson: JSON.parse(JSON.stringify(input)), reportJson: JSON.parse(JSON.stringify(report)) };
    await prisma.chatVisitorProfile.upsert({ where: { visitorId }, create: { visitorId, ...data }, update: data });
  },
};

/** The live admin / scraper state status, read the same way the report's intake action reads it. */
export async function liveStateData(): Promise<LiveStateData> {
  const [stateIntelligence, stateNominationConfig] = await Promise.all([getStateIntelligenceMap(), getStateNominationConfigMap()]);
  return { stateIntelligence, stateNominationConfig } as LiveStateData;
}

export function realChatDeps(): ChatDeps {
  return {
    getVisitor: (req) => getVisitorContext(req),
    credits: prismaCreditStore(prisma),
    profiles: prismaProfileStore,
    quickProfiles: prismaQuickProfileStore,
    liveState: liveStateData,
    premiumModelId: getPremiumChatModelId(),
    expandQuery: expandQueryKeywords,
    retrieve,
    stream: async (opts) => {
      const result = streamText({
        model: openai.chat(opts.modelId),
        system: opts.system,
        messages: await convertToModelMessages(opts.messages),
        onFinish: ({ text }) => opts.onFinish(text),
        onError: () => opts.onFailure(),
        onAbort: () => opts.onFailure(),
      });
      const metadata = opts.sources || opts.profileSource !== undefined ? { sources: opts.sources, profileSource: opts.profileSource ?? null } : undefined;
      const uiStream = result.toUIMessageStream({
        sendFinish: false,
        ...(metadata ? { messageMetadata: ({ part }) => (part.type === "start" ? metadata : undefined) } : {}),
      });
      return correctedUIStreamResponse(uiStream, opts.correct, opts.lead, opts.leadFingerprint);
    },
  };
}
