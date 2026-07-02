import { NextResponse } from "next/server";

import anzscoList from "@/src/data/anzsco-list.json";

type Occupation = {
  code: string;
  title: string;
  skillLevel: string;
  duties: string[];
};

const OCCUPATIONS = anzscoList as Occupation[];
const VALID_CODES = new Set(OCCUPATIONS.map((o) => o.code));
const CODE_TO_TITLE = new Map(OCCUPATIONS.map((o) => [o.code, o.title]));

type ClassifyResult = {
  match_found: boolean;
  anzsco_code: string | null;
  occupation_title: string | null;
  confidence_score: number;
  reasoning: string;
};

const NO_MATCH_RESULT: ClassifyResult = {
  match_found: false,
  anzsco_code: null,
  occupation_title: null,
  confidence_score: 0,
  reasoning: "The submitted CV text did not contain sufficient information to identify a matching ANZSCO occupation.",
};

// This is the caller-supplied strict-compliance spec: single source of truth
// for the rules, extended with the candidate-list grounding constraint that
// makes rule 3 (NO HALLUCINATION) actually enforceable rather than just
// asserted. The candidate list itself is injected per-request in the user
// message, not here, so this stays static and cacheable.
const SYSTEM_PROMPT = `# ROLE
You are an expert Australian Immigration Data Processor. Your only task is to analyze CV text and match it to an official 6-digit ANZSCO occupation code.

# RULES (STRICT COMPLIANCE)
1. ANALYSIS: Compare the provided CV duties against the official ANZSCO occupation list provided in the user message.
2. STRICT MATCHING: Only return a match if the core professional duties in the CV align with the official ANZSCO definition.
3. NO HALLUCINATION: You may ONLY select an anzsco_code that appears verbatim in the candidate list provided in the user message. If the CV duties do not clearly match any occupation in that list, or if the data is insufficient, you MUST return match_found: false with anzsco_code and occupation_title set to null. Do not guess or invent a code that is not in the provided list.
4. OUTPUT FORMAT: Respond ONLY with a valid JSON object. Do not add any conversational text, introductions, or markdown explanations.

# JSON OUTPUT STRUCTURE
{
  "match_found": boolean,
  "anzsco_code": string | null,
  "occupation_title": string | null,
  "confidence_score": number,
  "reasoning": string
}

# CONSTRAINTS
- confidence_score must be between 0.0 and 1.0.
- If match_found is false, anzsco_code and occupation_title must be null.
- Ensure the reasoning is concise (max 2 sentences) explaining why the match is successful or why it failed.`;

export const runtime = "nodejs";

function safeJsonParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function sanitizeResult(input: Partial<ClassifyResult>): ClassifyResult {
  const rawScore = typeof input.confidence_score === "number" ? input.confidence_score : Number(input.confidence_score ?? 0);
  // Models sometimes return a 0-100 scale despite instructions to use 0.0-1.0
  // (observed directly: gpt-4o-mini returning 95 instead of 0.95). Detect and
  // rescale rather than silently clamping 95 down to 1.
  const normalizedScore = Number.isFinite(rawScore) && rawScore > 1 ? rawScore / 100 : rawScore;
  const boundedScore = Number.isFinite(normalizedScore) ? Math.max(0, Math.min(1, normalizedScore)) : 0;
  const reasoning = typeof input.reasoning === "string" && input.reasoning.trim().length > 0
    ? input.reasoning.trim()
    : "No reasoning provided.";

  const claimedCode = typeof input.anzsco_code === "string" ? input.anzsco_code.trim() : null;
  const matchFound = input.match_found === true && !!claimedCode;

  // Defense against hallucination: never trust the model's claimed code on
  // its word alone. If it's not a real code from our own list, the match is
  // void, regardless of what the model asserted.
  if (!matchFound || !claimedCode || !VALID_CODES.has(claimedCode)) {
    return {
      match_found: false,
      anzsco_code: null,
      occupation_title: null,
      confidence_score: 0,
      reasoning: matchFound && claimedCode && !VALID_CODES.has(claimedCode)
        ? `Model returned an invalid ANZSCO code (${claimedCode}) not present in the reference list; treated as no match.`
        : reasoning,
    };
  }

  return {
    match_found: true,
    anzsco_code: claimedCode,
    // Always resolve the title from our own data, not the model's echo of it.
    occupation_title: CODE_TO_TITLE.get(claimedCode) ?? null,
    confidence_score: Math.round(boundedScore * 100) / 100,
    reasoning,
  };
}

function parseAssistantJson(raw: string): ClassifyResult | null {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const parsed = safeJsonParse<Partial<ClassifyResult> | null>(cleaned, null);
  if (!parsed || typeof parsed !== "object") return null;
  return sanitizeResult(parsed);
}

const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "have", "has", "had",
  "are", "was", "were", "will", "into", "onto", "using", "used", "use",
  "years", "year", "experience", "including", "such", "also", "over", "role",
  "roles", "work", "worked", "working", "responsible", "responsibilities",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

// Sending all 707 occupations (~80k tokens) in one prompt causes the model
// to unreliably locate the right candidate and default to "no match" under
// the strict anti-hallucination instructions -- verified directly: a clear
// Software Engineer CV against the full list returned match_found:false,
// but the identical call against a 3-entry list correctly matched at 95%
// confidence. Pre-filtering to a small, relevant candidate set before the
// LLM call fixes this (a standard retrieval-before-generation pattern) and
// cuts token cost by roughly 95%.
function getCandidates(cvText: string, limit = 25): Occupation[] {
  const cvTokens = new Set(tokenize(cvText));
  if (cvTokens.size === 0) return [];

  const scored = OCCUPATIONS.map((occupation) => {
    const titleTokens = tokenize(occupation.title);
    const dutyTokens = tokenize(occupation.duties.join(" "));
    let score = 0;
    for (const token of titleTokens) {
      if (cvTokens.has(token)) score += 3; // title matches weighted higher
    }
    for (const token of dutyTokens) {
      if (cvTokens.has(token)) score += 1;
    }
    return { occupation, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.occupation);
}

function buildCandidateList(candidates: Occupation[]): string {
  return candidates
    .map((o) => `${o.code}: ${o.title}\n  - ${o.duties.join("\n  - ")}`)
    .join("\n");
}

async function callOpenAi(cvText: string, candidates: Occupation[]): Promise<ClassifyResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            "CANDIDATE ANZSCO OCCUPATIONS (you may ONLY select a code from this list):",
            buildCandidateList(candidates),
            "",
            "CV TEXT TO ANALYZE:",
            cvText.slice(0, 20000),
          ].join("\n"),
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
    throw new Error("AI response did not match the required ANZSCO classification schema.");
  }

  return parsed;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { cvText?: string };
    const cvText = String(body?.cvText ?? "").trim();

    if (!cvText || cvText.length < 20) {
      // Insufficient data to analyze at all -- per rule 3, this is a
      // guaranteed no-match, not something worth spending an LLM call on.
      return NextResponse.json(NO_MATCH_RESULT);
    }

    const candidates = getCandidates(cvText);
    if (candidates.length === 0) {
      // Zero keyword overlap with any of the 707 occupations -- no point
      // asking the model to search a list none of it plausibly relates to.
      return NextResponse.json(NO_MATCH_RESULT);
    }

    const result = await callOpenAi(cvText, candidates);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to classify CV against ANZSCO codes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
