import { NextResponse } from "next/server";

type AnzscoMatchResult = {
  matchPercentage: number;
  matchedDuties: string[];
  missingDuties: string[];
  recommendedKeywords: string[];
};

const SYSTEM_PROMPT_TEMPLATE =
  "You are an expert Australian Migration Assessor. Compare the provided candidate CV text against the official ANZSCO requirements for the role of '{targetOccupation}'. Return a strict JSON response containing: 1. matchPercentage (number 0-100), 2. matchedDuties (array of strings), 3. missingDuties (array of strings, crucial for assessment), 4. recommendedKeywords (array of keywords to add to the CV for better alignment).";

export const runtime = "nodejs";

function safeJsonParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function ensureStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter((item) => item.length > 0).slice(0, 25);
}

function sanitizeResult(input: Partial<AnzscoMatchResult>): AnzscoMatchResult {
  const rawMatch = typeof input.matchPercentage === "number" ? input.matchPercentage : Number(input.matchPercentage ?? 0);
  const boundedMatch = Number.isFinite(rawMatch) ? Math.max(0, Math.min(100, Math.round(rawMatch))) : 0;

  return {
    matchPercentage: boundedMatch,
    matchedDuties: ensureStringArray(input.matchedDuties),
    missingDuties: ensureStringArray(input.missingDuties),
    recommendedKeywords: ensureStringArray(input.recommendedKeywords),
  };
}

function parseAssistantJson(raw: string): AnzscoMatchResult | null {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const parsed = safeJsonParse<Partial<AnzscoMatchResult> | null>(cleaned, null);
  if (!parsed || typeof parsed !== "object") return null;
  return sanitizeResult(parsed);
}

async function callOpenAi(args: {
  targetOccupation: string;
  cvText: string;
}): Promise<AnzscoMatchResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const systemPrompt = SYSTEM_PROMPT_TEMPLATE.replace("{targetOccupation}", args.targetOccupation);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: [
            `Target occupation: ${args.targetOccupation}`,
            "Candidate CV content starts below:",
            args.cvText.slice(0, 20000),
          ].join("\n\n"),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`AI provider error: ${response.status}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const output = json.choices?.[0]?.message?.content;
  if (!output) {
    throw new Error("No analysis content received from AI provider.");
  }

  const parsed = parseAssistantJson(output);
  if (!parsed) {
    throw new Error("AI response did not match required ANZSCO schema.");
  }

  return parsed;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      cvText?: string;
      targetOccupation?: string;
    };

    const targetOccupation = String(body?.targetOccupation ?? "").trim();
    if (!targetOccupation) {
      return NextResponse.json({ error: "targetOccupation is required." }, { status: 400 });
    }

    const cvText = String(body?.cvText ?? "").trim();
    if (!cvText) {
      return NextResponse.json({ error: "cvText is required." }, { status: 400 });
    }

    const result = await callOpenAi({
      targetOccupation,
      cvText,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to analyze CV against ANZSCO duties.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
