export type AssistantIntent = "study" | "work" | "pr" | "unknown";

export type AssistantAnalysis = {
  intent: AssistantIntent;
  hasSponsor?: boolean;
  occupation?: string;
  country?: string;
  language?: string;
};

export type AssistantPathway = "500" | "482" | "189" | "190";

const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o-mini";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function cleanupOptional(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function detectLanguage(message: string): string | undefined {
  const lower = normalize(message);
  const languages = ["english", "turkish", "hindi", "mandarin", "arabic"];
  return languages.find((language) => lower.includes(language));
}

function extractOccupation(message: string): string | undefined {
  const patterns = [
    /occupation\s*(?:is|:)?\s*([a-z\s\-/]{3,60})/i,
    /i\s+am\s+(?:a|an)\s+([a-z\s\-/]{3,60})/i,
    /work\s+as\s+(?:a|an)?\s*([a-z\s\-/]{3,60})/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) {
      return cleanupOptional(match[1]);
    }
  }

  return undefined;
}

function extractCountry(message: string): string | undefined {
  const patterns = [/from\s+([a-z\s]{2,50})/i, /in\s+([a-z\s]{2,50})/i];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) {
      return cleanupOptional(match[1]);
    }
  }

  return undefined;
}

function heuristicIntent(message: string): AssistantIntent {
  const lower = normalize(message);

  if (
    lower.includes("pr") ||
    lower.includes("permanent") ||
    lower.includes("189") ||
    lower.includes("190") ||
    lower.includes("skilled migration")
  ) {
    return "pr";
  }

  if (
    lower.includes("study") ||
    lower.includes("student") ||
    lower.includes("university") ||
    lower.includes("college") ||
    lower.includes("500")
  ) {
    return "study";
  }

  if (
    lower.includes("work") ||
    lower.includes("job") ||
    lower.includes("sponsor") ||
    lower.includes("employer") ||
    lower.includes("482")
  ) {
    return "work";
  }

  return "unknown";
}

function heuristicAnalyze(message: string): AssistantAnalysis {
  const lower = normalize(message);
  const hasSponsor =
    lower.includes("sponsor") ||
    lower.includes("sponsored") ||
    lower.includes("employer") ||
    lower.includes("nominated");

  return {
    intent: heuristicIntent(message),
    hasSponsor,
    occupation: extractOccupation(message),
    country: extractCountry(message),
    language: detectLanguage(message),
  };
}

function parseOpenAiJson(raw: string): AssistantAnalysis | null {
  try {
    const parsed = JSON.parse(raw) as AssistantAnalysis;
    const intent = parsed.intent;

    if (!intent || !["study", "work", "pr", "unknown"].includes(intent)) {
      return null;
    }

    return {
      intent,
      hasSponsor: typeof parsed.hasSponsor === "boolean" ? parsed.hasSponsor : undefined,
      occupation: cleanupOptional(parsed.occupation),
      country: cleanupOptional(parsed.country),
      language: cleanupOptional(parsed.language),
    };
  } catch {
    return null;
  }
}

async function openAiAnalyze(message: string): Promise<AssistantAnalysis | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const systemPrompt = [
    "You classify user intent for an Australian visa pathway assistant.",
    "Return JSON only, no markdown.",
    "JSON schema:",
    '{"intent":"study|work|pr|unknown","hasSponsor":boolean,"occupation":string,"country":string,"language":string}',
    "Use empty strings for unknown optional fields.",
  ].join("\n");

  const response = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
    }),
  });

  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = json.choices?.[0]?.message?.content;
  if (!content) return null;

  return parseOpenAiJson(content);
}

export async function analyzeUserMessage(message: string): Promise<AssistantAnalysis> {
  const cleaned = message.trim();
  if (!cleaned) {
    return { intent: "unknown" };
  }

  try {
    const fromModel = await openAiAnalyze(cleaned);
    if (fromModel) {
      return fromModel;
    }
  } catch {
    // Fall back to deterministic local rules if provider is unavailable.
  }

  return heuristicAnalyze(cleaned);
}

export function isEligibilityQuestion(message: string): boolean {
  const lower = normalize(message);
  return [
    /can\s+i\s+get\s+(a\s+)?visa/,
    /am\s+i\s+eligible/,
    /will\s+i\s+be\s+approved/,
    /do\s+i\s+qualify/,
    /can\s+i\s+qualify/,
  ].some((pattern) => pattern.test(lower));
}

export function mapAnalysisToPathways(analysis: AssistantAnalysis): AssistantPathway[] {
  if (analysis.intent === "study") {
    return ["500"];
  }

  if (analysis.intent === "work") {
    return analysis.hasSponsor ? ["482"] : ["482"];
  }

  if (analysis.intent === "pr") {
    return ["189", "190"];
  }

  return [];
}

export function buildSafeAssistantReply(
  analysis: AssistantAnalysis,
  message: string,
  locale: "en" | "tr"
): string {
  if (isEligibilityQuestion(message)) {
    return locale === "tr"
      ? "Uygunluk belirleyemem. Halka acik bilgiler temelinde genel yollari kesfetmenize yardimci olabilirim. Lutfen kayitli bir goc danismani ile gorusmeyi degerlendirin."
      : "I can't determine eligibility. I can help you explore general pathways based on publicly available information. Please consider speaking with a registered migration agent.";
  }

  if (analysis.intent === "study") {
    return locale === "tr"
      ? "Paylastiklariniza dayanarak subclass 500 ogrenci vizesi yolu arastirmak icin ilgili olabilir. Bu yol, based on general information cercevesinde degerlendirilmeli ve bireysel kosullara gore degisebilir. Bu platform hukuki veya goc tavsiyesi vermez; consider speaking with a registered migration agent."
      : "Based on what you shared, subclass 500 may be relevant to explore for study plans. This is based on general information and can vary by individual circumstances. This platform does not provide legal or migration advice; consider speaking with a registered migration agent.";
  }

  if (analysis.intent === "work") {
    if (analysis.hasSponsor) {
      return locale === "tr"
        ? "Paylastiklariniza dayanarak sponsorlu calisma yolu olarak subclass 482 ilgili olabilir. Bu degerlendirme based on general information niteligindedir ve resmi kriterlere gore degisebilir. Kesin sonuc veya garanti veremem; consider speaking with a registered migration agent."
        : "Based on what you shared, an employer-sponsored pathway such as subclass 482 may be relevant to explore. This is based on general information and outcomes depend on official criteria. I cannot provide guarantees; consider speaking with a registered migration agent.";
    }

    return locale === "tr"
      ? "Calisma hedefiniz icin sponsorlu secenekler (orn. subclass 482) ilgili olabilir. Bu yanit based on general information kapsamina girer ve sponsor durumu onemlidir. Bu platform hukuki tavsiye vermez; consider speaking with a registered migration agent."
      : "For work goals, sponsored pathways (for example subclass 482) may be relevant to explore. This is based on general information, and sponsor context is important. This platform does not provide legal advice; consider speaking with a registered migration agent.";
  }

  if (analysis.intent === "pr") {
    return locale === "tr"
      ? "Paylastiklariniza dayanarak subclass 189 veya subclass 190 gibi nitelikli goc yollari ilgili olabilir. Bu yollar puan testine, meslek ve davet faktorlerine baglidir ve bu aciklama based on general information niteligindedir. Bu platform hukuki veya goc tavsiyesi vermez; consider speaking with a registered migration agent."
      : "Based on what you shared, a skilled migration pathway such as subclass 189 or subclass 190 may be relevant to explore. These pathways are points-tested and can depend on occupation, English level, and invitation factors. This is based on general information only; consider speaking with a registered migration agent.";
  }

  return locale === "tr"
    ? "Bu soruya kesin sonuc veremem. Yalnizca based on general information kapsaminda olasi yollari gosterebilirim. Lutfen resmi kaynaklari inceleyin ve consider speaking with a registered migration agent."
    : "I cannot provide a definitive outcome for that question. I can help outline pathways that may be relevant, based on general information. Please review official sources and consider speaking with a registered migration agent.";
}
