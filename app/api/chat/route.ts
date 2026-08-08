import { NextResponse } from "next/server";

import type { AssistantReportData } from "@/lib/readiness/types";
import { CURRENT_CSIT } from "@/lib/readiness/constants";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatRequestBody = {
  messages?: ChatMessage[];
  reportData?: AssistantReportData;
  locale?: string;
};

type SupportedAssistantLocale = "en" | "tr" | "zh-Hans";

const SYSTEM_PROMPTS: Record<"AU" | "CA", string> = {
  AU: [
    "You are Logi AI, a strict and accurate Australian immigration assistant operating with rule validity anchored to 1 July 2026.",
    "You must not provide legal advice and must refer users to a registered MARA professional for formal strategy/lodgement advice.",
    "Use only the supplied reportData context plus the fixed July 2026 rule constants below.",
    "Mandatory July 2026 AU rules:",
    `- Core Skills Income Threshold (CSIT) is exactly ${CURRENT_CSIT.label}.`,
    `- If a declared salary offer is below ${CURRENT_CSIT.label}, employer-sponsored pathways such as Subclass 482 and 186 must be described as ineligible under this threshold.`,
    "- Subclass 485 maximum age is 35, except where the applicant has a Masters by Research, a PhD, or a Hong Kong/BNO passport (these exceptions can use age 50).",
    "- Cost/risk warnings: Subclass 482 base charge is AUD 4,015; Subclass 189/190 base charge is about AUD 6,140; and a second instalment risk of about AUD 4,890 can apply for each dependant aged 18+ without functional English.",
    "If the user asks outside available context, say details are insufficient rather than guessing.",
  ].join(" "),
  CA: [
    "You are Logi AI, a strict and accurate Canadian immigration assistant operating with rule validity anchored to 1 July 2026.",
    "You must not provide legal advice and must refer users to an RCIC professional for formal strategy/lodgement advice.",
    "Use only the supplied reportData context.",
    "Never generate Australian visa rules, subclasses, or MARA-specific guidance in Canada mode.",
    "If the user asks outside available context, say details are insufficient rather than guessing.",
  ].join(" "),
};

const COMPLIANCE_REMINDERS: Record<"AU" | "CA", string> = {
  AU: "Please consult a registered MARA agent for official lodgements and personalized legal migration advice.",
  CA: "Please consult a Regulated Canadian Immigration Consultant (RCIC) for official lodgements and personalized legal migration advice.",
};

function resolveReportCountry(reportData?: AssistantReportData): "AU" | "CA" {
  const rawCountry = (reportData as { country?: unknown } | undefined)?.country;
  if (rawCountry === "CA") return "CA";
  if (typeof rawCountry === "string") {
    const normalized = rawCountry.trim().toUpperCase();
    if (normalized === "CANADA") return "CA";
    if (normalized === "AUSTRALIA") return "AU";
  }
  return "AU";
}

function resolveAssistantLocale(locale?: string): SupportedAssistantLocale {
  if (locale === "tr") return "tr";
  if (locale === "zh" || locale === "zh-Hans") return "zh-Hans";
  return "en";
}

function getLanguageDirective(locale: SupportedAssistantLocale): string {
  if (locale === "tr") {
    return "You MUST write the entire response in Turkish (tr). Do not mix with English unless quoting user-provided terms.";
  }
  if (locale === "zh-Hans") {
    return "You MUST write the entire response in Simplified Chinese (zh-Hans). Do not mix with English unless quoting user-provided terms.";
  }
  return "You MUST write the entire response in English (en).";
}

function buildReportContext(reportData?: AssistantReportData): string {
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
    country: reportData.country ?? "AU",
    user: reportData.user,
    targetVisa: reportData.targetVisa,
    pointsEstimate: reportData.pointsEstimate,
    primaryLimitingFactor: reportData.primaryLimitingFactor,
    rankedPathways: ranked,
    stateNominationTracker: reportData.stateNominationTracker,
    lodgementReadyChecklist: reportData.lodgementReadyChecklist,
    pathwayComparison: pathways,
    executiveSummary: reportData.executiveSummary,
    suggestedNextSteps: reportData.suggestedNextSteps,
    riskIndicators: reportData.riskIndicators,
  };

  return JSON.stringify(compactContext);
}

function createFallbackStream(
  question: string,
  reportContext: string,
  country: "AU" | "CA",
  locale: SupportedAssistantLocale
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const safeQuestion = question.trim() || "the user's request";

  const responseText = (() => {
    if (locale === "tr") {
      return [
        "Vize Hazırlık Raporu bağlamınıza göre odaklı bir yorum:",
        `Soru: ${safeQuestion}`,
        "",
        country === "CA"
          ? "Yalnızca rapor verinize dayanarak CRS odaklı yolları, puan boşluklarını ve uygulanabilir sonraki adımları açıklayabilirim."
          : "Yalnızca rapor verinize dayanarak sıralı vize yollarınızı, puan boşluklarını ve uygulanabilir sonraki adımları açıklayabilirim.",
        country === "CA"
          ? "İsterseniz tek bir yolu satır satır açabilirim (ör. CEC vs FSW vs PNP)."
          : "İsterseniz tek bir yolu satır satır açabilirim (ör. 189 vs 190 vs 491).",
        "",
        COMPLIANCE_REMINDERS[country],
        "",
        `Rapor bağlam özeti: ${reportContext}`,
      ].join("\n");
    }

    if (locale === "zh-Hans") {
      return [
        "基于你的签证准备度报告，以下是聚焦解读：",
        `问题：${safeQuestion}`,
        "",
        country === "CA"
          ? "我可以仅基于你的报告数据，解释 CRS 相关路径、分数差距与可执行下一步。"
          : "我可以仅基于你的报告数据，解释路径排序、分数差距与可执行下一步。",
        country === "CA"
          ? "如果你愿意，我可以逐条拆解某一条路径（例如 CEC vs FSW vs PNP）。"
          : "如果你愿意，我可以逐条拆解某一条路径（例如 189 vs 190 vs 491）。",
        "",
        COMPLIANCE_REMINDERS[country],
        "",
        `报告上下文快照：${reportContext}`,
      ].join("\n");
    }

    return [
      "Based on your Visa Readiness Report context, here is a focused interpretation:",
      `Question: ${safeQuestion}`,
      "",
      country === "CA"
        ? "I can explain your CRS-related pathways, point gaps, and practical next steps using only your report data."
        : "I can explain your ranked pathways, points-related gaps, and practical next steps using only your report data.",
      country === "CA"
        ? "If you want, ask me to break down one pathway line-by-line (for example CEC vs FSW vs PNP) and I will map each score driver."
        : "If you want, ask me to break down one pathway line-by-line (for example 189 vs 190 vs 491) and I will map each score driver.",
      "",
      COMPLIANCE_REMINDERS[country],
      "",
      `Report context snapshot: ${reportContext}`,
    ].join("\n");
  })();

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
  country: "AU" | "CA";
  locale: SupportedAssistantLocale;
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
            { role: "system", content: SYSTEM_PROMPTS[args.country] },
            {
              role: "system",
              content:
                args.country === "CA"
                  ? "Country context is Canada only. Never mention Australian pathways or visas such as 189/190/491 or MARA/state nomination programs."
                  : "Country context is Australia only. Never mention Canadian pathways or concepts such as CRS, IRCC, NOC, CEC, FSW, FSTP, or PNP.",
            },
            {
              role: "system",
              content: getLanguageDirective(args.locale),
            },
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

            controller.enqueue(encoder.encode(`\n\n${COMPLIANCE_REMINDERS[args.country]}`));
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
    const country = resolveReportCountry(body.reportData);
    const locale = resolveAssistantLocale(body.locale);
    const question = messages.filter((m) => m.role === "user").at(-1)?.content ?? "";
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const stream = apiKey
      ? await streamFromOpenAI({
          apiKey,
          model,
          messages,
          reportContext,
          country,
          locale,
        }).catch(() => createFallbackStream(question, reportContext, country, locale))
      : createFallbackStream(question, reportContext, country, locale);

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
