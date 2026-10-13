import { NextResponse } from "next/server";

import type { AssistantReportData } from "@/lib/readiness/types";
import { INFORMATION_ONLY_RULES, logRewrites, sanitizeAnswer } from "@/lib/chat/information-only";
import { CURRENT_CSIT, BASE_VAC_AUD, SECOND_INSTALMENT_AUD } from "@/lib/readiness/constants";

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
    "You are Logi AI, an information-only Australian immigration assistant operating with rule validity anchored to 1 July 2026.",
    "You must not provide legal or migration advice. Advice on the user's own situation must come from a registered migration agent (MARA) or an Australian legal practitioner.",
    "Use only the supplied reportData context plus the fixed July 2026 rule constants below.",
    "Mandatory July 2026 AU rules:",
    `- Core Skills Income Threshold (CSIT) is exactly ${CURRENT_CSIT.label}.`,
    `- The published Core Skills Income Threshold for Subclass 482 and 186 is ${CURRENT_CSIT.label}; a declared salary can be shown next to it as a figure, without saying whether the user is eligible.`,
    "- Subclass 485 maximum age is 35, except where the applicant has a Masters by Research, a PhD, or a Hong Kong/BNO passport (these exceptions can use age 50).",
    `- Cost/risk warnings: Subclass 482 base charge is AUD ${BASE_VAC_AUD["482"].toLocaleString("en-AU")}; Subclass 189 base charge is AUD ${BASE_VAC_AUD["189"].toLocaleString("en-AU")}; Subclass 190/491 base charge is about AUD ${BASE_VAC_AUD["491"].toLocaleString("en-AU")}; and a second instalment risk of about AUD ${SECOND_INSTALMENT_AUD["189"].toLocaleString("en-AU")} (189/190) or AUD ${SECOND_INSTALMENT_AUD["491"].toLocaleString("en-AU")} (491) can apply for each dependant aged 18+ without functional English.`,
    "If the user asks outside available context, say details are insufficient rather than guessing.",
  ].join(" "),
  CA: [
    "You are Logi AI, an information-only Canadian immigration assistant operating with rule validity anchored to 1 July 2026.",
    "You must not provide legal or immigration advice. Advice on the user's own situation must come from a regulated Canadian immigration consultant (RCIC) or a Canadian legal practitioner.",
    "Use only the supplied reportData context.",
    "Never generate Australian visa rules, subclasses, or MARA-specific guidance in Canada mode.",
    "If the user asks outside available context, say details are insufficient rather than guessing.",
  ].join(" "),
};

const COMPLIANCE_REMINDERS: Record<"AU" | "CA", string> = {
  AU: "Please consult a registered MARA agent for official lodgements and personalized legal migration advice.",
  CA: "Please consult a Regulated Canadian Immigration Consultant (RCIC) for official lodgements and personalized legal migration advice.",
};

/** The information-only rules for this assistant: the context is the report data, and Canada mode names the RCIC, not MARA. */
function assistantRules(country: "AU" | "CA"): string {
  const rules = INFORMATION_ONLY_RULES.replace(/block-1 and the retrieved sources|block-1/g, "the report context");
  return country === "CA" ? rules.replace("a registered migration agent (MARA) or an Australian legal practitioner", "a regulated Canadian immigration consultant (RCIC) or a Canadian legal practitioner") : rules;
}

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

  // Information only: the user's own entered figures. No ranking, match percentage, recommendation tag, confidence, next steps,
  // risk indicators or state availability go to the model.
  const compactContext = {
    country: reportData.country ?? "AU",
    user: reportData.user,
    targetVisa: reportData.targetVisa,
    pointsEstimate: reportData.pointsEstimate,
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
        "Rapor bağlamınıza dayalı bilgi:",
        `Soru: ${safeQuestion}`,
        "",
        country === "CA"
          ? "Yalnızca rapor verinize dayanarak CRS puanınızı ve yayımlanmış CRS ölçütlerini açıklayabilirim."
          : "Yalnızca rapor verinize dayanarak girdiğiniz rakamları ve yayımlanmış vize şartlarını yan yana açıklayabilirim.",
        country === "CA"
          ? "İsterseniz tek bir yolun yayımlanmış şartlarını satır satır açabilirim (ör. CEC, FSW veya PNP)."
          : "İsterseniz tek bir vizenin yayımlanmış şartlarını satır satır açabilirim (ör. 189, 190 veya 491).",
        "",
        COMPLIANCE_REMINDERS[country],
        "",
        `Rapor bağlam özeti: ${reportContext}`,
      ].join("\n");
    }

    if (locale === "zh-Hans") {
      return [
        "基于你的报告内容的信息：",
        `问题：${safeQuestion}`,
        "",
        country === "CA"
          ? "我可以仅基于你的报告数据，解释你的 CRS 分数和已公布的 CRS 标准。"
          : "我可以仅基于你的报告数据，把你填写的数字与已公布的签证要求并列说明。",
        country === "CA"
          ? "如果你愿意，我可以逐条说明某一类别已公布的要求（例如 CEC、FSW 或 PNP）。"
          : "如果你愿意，我可以逐条说明某一个签证已公布的要求（例如 189、190 或 491）。",
        "",
        COMPLIANCE_REMINDERS[country],
        "",
        `报告上下文快照：${reportContext}`,
      ].join("\n");
    }

    return [
      "Information based on your report context:",
      `Question: ${safeQuestion}`,
      "",
      country === "CA"
        ? "Using only your report data, I can explain your CRS score and the published CRS criteria."
        : "Using only your report data, I can set your entered figures next to the published visa requirements.",
      country === "CA"
        ? "Ask about one pathway's published criteria (for example CEC, FSW or PNP) and I will list them line by line."
        : "Ask about one visa's published requirements (for example 189, 190 or 491) and I will list them line by line.",
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
            { role: "system", content: assistantRules(args.country) },
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

      // The answer is held until the model has finished, rewritten to be information-only, then streamed out.
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const reader = openAiResponse.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let full = "";

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
                  if (delta) full += delta;
                } catch {
                  // Ignore malformed SSE JSON lines.
                }
              }
            }

            const lastUser = [...args.messages].reverse().find((m) => m.role === "user")?.content ?? "";
            const result = sanitizeAnswer(full, { locale: args.locale, userText: lastUser, country: args.country });
            logRewrites(result.rewrites, { path: "assistant", locale: args.locale });
            controller.enqueue(encoder.encode(`${result.text}\n\n${COMPLIANCE_REMINDERS[args.country]}`));
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
