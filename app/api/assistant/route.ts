import { NextResponse } from "next/server";

import {
  analyzeUserMessage,
  buildSafeAssistantReply,
  mapAnalysisToPathways,
  type AssistantPathway,
} from "@/lib/ai/assistant";

type Body = {
  message?: string;
  locale?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const message = String(body.message ?? "").trim();
    const locale = body.locale === "tr" ? "tr" : "en";

    if (!message) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 }
      );
    }

    const analysis = await analyzeUserMessage(message);
    const pathways = mapAnalysisToPathways(analysis);
    const reply = buildSafeAssistantReply(analysis, message, locale);

    return NextResponse.json({ analysis, pathways, reply });
  } catch (error) {
    console.error("Assistant route error", error);
    return NextResponse.json(
      {
        analysis: { intent: "unknown" },
        pathways: [],
        reply:
          "I can help you explore general pathways based on public information. Please consider speaking with a registered migration agent.",
      },
      { status: 200 }
    );
  }
}
