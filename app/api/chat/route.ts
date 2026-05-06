import { NextResponse } from "next/server";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatRequestBody = {
  messages?: ChatMessage[];
  reportData?: Record<string, unknown>;
  locale?: string;
};

const SYSTEM_PROMPT =
  "Sen Logi AI'sın. Avustralya göçmenlik stratejistisin. Asla yasal tavsiye verme, MARA acentesine yönlendir. Kullanıcının sorduğu soruları YALNIZCA sana iletilen reportData içeriğine göre net ve profesyonelce cevapla.";

const MARA_REMINDER =
  "Please consult a registered MARA agent for official lodgements and personalized legal migration advice.";

function buildReportContext(reportData?: Record<string, unknown>): string {
  if (!reportData) return "No report data provided.";

  const ranked = Array.isArray(reportData.rankedPathways)
    ? (reportData.rankedPathways as Array<Record<string, unknown>>).map((item) => ({
        subclass: item.subclass,
        matchPercentage: item.matchPercentage,
        recommendationTag: item.recommendationTag,
        pointsSignal: item.pointsSignal,
      }))
    : [];

  const pathways = Array.isArray(reportData.pathwayComparison)
    ? (reportData.pathwayComparison as Array<Record<string, unknown>>)
        .slice(0, 6)
        .map((item) => ({
          subclass: item.subclass,
          visaName: item.visaName,
          confidenceLevel: item.confidenceLevel,
          reason: item.reason,
        }))
    : [];

  const compactContext = {
    user: reportData.user,
    targetVisa: reportData.targetVisa,
    pointsEstimate: reportData.pointsEstimate,
    primaryLimitingFactor: reportData.primaryLimitingFactor,
    rankedPathways: ranked,
    stateNominationTracker: reportData.stateNominationTracker,
    pathwayComparison: pathways,
    executiveSummary: reportData.executiveSummary,
    suggestedNextSteps: reportData.suggestedNextSteps,
    riskIndicators: reportData.riskIndicators,
  };

  return JSON.stringify(compactContext);
}

function createFallbackStream(question: string, reportContext: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const safeQuestion = question.trim() || "the user's request";

  const responseText = [
    "Based on your Visa Readiness Report context, here is a focused interpretation:",
    `Question: ${safeQuestion}`,
    "",
    "I can explain your ranked pathways, points-related gaps, and practical next steps using only your report data.",
    "If you want, ask me to break down one pathway line-by-line (for example 189 vs 190 vs 491) and I will map each score driver.",
    "",
    MARA_REMINDER,
    "",
    `Report context snapshot: ${reportContext}`,
  ].join("\n");

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const chunks = responseText.split(/(\s+)/);
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
        await new Promise((resolve) => setTimeout(resolve, 12));
      }
      controller.close();
    },
  });
}

function streamFromOpenAI(args: {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  reportContext: string;
}): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder();

  return new Promise(async (resolve, reject) => {
    try {
      const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${args.apiKey}`,
        },
        body: JSON.stringify({
          model: args.model,
          stream: true,
          temperature: 0.2,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "system",
              content: `Use only this report context as your factual basis:\n${args.reportContext}`,
            },
            ...args.messages,
          ],
        }),
      });

      if (!openAiResponse.ok || !openAiResponse.body) {
        reject(new Error(`OpenAI request failed with status ${openAiResponse.status}`));
        return;
      }

      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const reader = openAiResponse.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          try {
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith("data:")) continue;
                const payload = trimmed.slice(5).trim();
                if (payload === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(payload) as {
                    choices?: Array<{ delta?: { content?: string } }>;
                  };
                  const delta = parsed.choices?.[0]?.delta?.content;
                  if (delta) {
                    controller.enqueue(encoder.encode(delta));
                  }
                } catch {
                  // Ignore malformed SSE JSON lines.
                }
              }
            }

            controller.enqueue(encoder.encode(`\n\n${MARA_REMINDER}`));
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });

      resolve(stream);
    } catch (error) {
      reject(error);
    }
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequestBody;
    const rawMessages = Array.isArray(body.messages) ? body.messages : [];
    const messages = rawMessages
      .filter((message) =>
        message &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.trim().length > 0
      )
      .slice(-16);

    if (messages.length === 0) {
      return NextResponse.json({ error: "No chat messages provided." }, { status: 400 });
    }

    const reportContext = buildReportContext(body.reportData);
    const question = messages.filter((m) => m.role === "user").at(-1)?.content ?? "";
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const stream = apiKey
      ? await streamFromOpenAI({
          apiKey,
          model,
          messages,
          reportContext,
        }).catch(() => createFallbackStream(question, reportContext))
      : createFallbackStream(question, reportContext);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to process chat request." }, { status: 500 });
  }
}
