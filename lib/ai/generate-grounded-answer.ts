import type { RetrievedVisaContext } from "@/lib/ai/retrieve-visa-context";

export type GroundedSourceItem = {
  subclass: string;
  visaName: string;
  detailUrl: string;
  sourceUrl: string | null;
  pdfUrls: string[];
};

export type GroundedNextAction = {
  label: string;
  href: string;
};

export type GroundedAssistantResult = {
  answer: string;
  sources: GroundedSourceItem[];
  nextActions: GroundedNextAction[];
};

const SYSTEM_PROMPT =
  "You are a controlled Australian visa information assistant. You are not a migration agent and do not provide migration advice or legal advice. You must answer only using the supplied database context. Do not use outside knowledge. Do not guess. If the answer is not in the context, say that the stored information does not contain enough detail and that personalised advice is handled by a registered migration agent or Australian legal practitioner. Never say the user is eligible, qualifies, should apply, or will be approved. Use wording such as may be relevant, is commonly required, is often considered, may affect outcomes, general information only.";

const PERSONALIZED_INTENT_REPLY =
  "I can provide general information about visa pathways. For a structured assessment based on your situation, you can generate a readiness report.";

const PERSONALISED_ADVICE_FALLBACK =
  "General information about visa pathways can be provided, but personalised advice is handled by a registered migration agent.";

function normalize(message: string): string {
  return message.trim().toLowerCase();
}

function includesAny(text: string, tokens: string[]): boolean {
  return tokens.some((token) => text.includes(token));
}

function isPersonalizedIntentQuestion(message: string): boolean {
  const lower = normalize(message);
  return (
    /\bam i eligible\b/.test(lower) ||
    /\bcan i get\b/.test(lower) ||
    /\bwhat should i do\b/.test(lower) ||
    /\bwhich visa should i choose\b/.test(lower)
  );
}

function addGeneralInfoSentence(answer: string): string {
  const base = answer.trim();
  if (/this is general information only\.?$/i.test(base)) {
    return base;
  }
  return `${base} This is general information only.`;
}

function responseHasRiskOrDecisionLanguage(answer: string): boolean {
  return /\b(risk|risks|decision|decide|apply|application to make|outcome|approved|approval|refusal|refused)\b/i.test(
    answer
  );
}

function appendPersonalisedAdviceFallback(answer: string): string {
  const base = answer.trim();
  if (base.includes(PERSONALISED_ADVICE_FALLBACK)) {
    return base;
  }
  return `${base} ${PERSONALISED_ADVICE_FALLBACK}`;
}

function applyAssistantSafetyFooter(input: {
  answer: string;
  message: string;
  appendFallback?: boolean;
}) {
  const withGeneralInfo = addGeneralInfoSentence(input.answer);
  const shouldAppendFallback =
    input.appendFallback ||
    isPersonalizedIntentQuestion(input.message) ||
    responseHasRiskOrDecisionLanguage(withGeneralInfo);

  if (!shouldAppendFallback) return withGeneralInfo;
  return appendPersonalisedAdviceFallback(withGeneralInfo);
}

function sanitizeModelOutput(text: string): string {
  const lower = text.toLowerCase();
  const banned = [
    "you are eligible",
    "you qualify",
    "you should apply",
    "you will be approved",
    "you will get",
    "guaranteed",
    "you should",
    "you need to",
    "you may want to",
  ];
  if (banned.some((term) => lower.includes(term))) {
    return "The stored information does not contain enough detail for this question. Registered migration agent or Australian legal practitioner input may be relevant.";
  }
  return text.trim();
}

function neutralizeDeterministicLanguage(answer: string): string {
  return answer
    .replace(/\byou are eligible\b/gi, "this may be relevant")
    .replace(/\byou qualify\b/gi, "this may be relevant")
    .replace(/\byou should apply\b/gi, "this pathway may be relevant")
    .replace(/\byou should\b/gi, "it is often considered")
    .replace(/\byou need to\b/gi, "it is commonly required to")
    .replace(/\byou may want to\b/gi, "it may be relevant to")
    .replace(/\byou will be approved\b/gi, "an outcome cannot be predicted")
    .replace(/\byou will get\b/gi, "it may be relevant to explore")
    .replace(/\bguaranteed\b/gi, "not assured");
}

function buildLocaleFallback(locale: string): string {
  if (locale === "tr") {
    return "Saklanan bilgiler bu soru için yeterli ayrıntı içermiyor. Kayıtlı bir göç danışmanı veya Avustralya hukuk uygulayıcısı desteği ilgili olabilir.";
  }

  return "The stored information does not contain enough detail for this question. Registered migration agent or Australian legal practitioner input may be relevant.";
}

function extractMinPoints(pointsRules: unknown): string | null {
  if (!pointsRules || typeof pointsRules !== "object") return null;
  const obj = pointsRules as Record<string, unknown>;

  const value =
    (typeof obj.minimum_points_required === "number" && obj.minimum_points_required) ||
    (typeof obj.minimum_points === "number" && obj.minimum_points) ||
    (typeof obj.minimum_points_required === "string" && obj.minimum_points_required) ||
    (typeof obj.minimum_points === "string" && obj.minimum_points);

  if (!value) return null;
  return String(value);
}

function deterministicAnswer(message: string, locale: string, context: RetrievedVisaContext): string {
  if (context.length === 0) return buildLocaleFallback(locale);

  const lower = normalize(message);
  const asksEnglish = includesAny(lower, ["english", "ielts", "pte", "toefl"]);
  const asksDocuments = includesAny(lower, ["document", "documents", "paper", "required"]);
  const asksPoints = includesAny(lower, ["points", "point", "score"]);

  const lines: string[] = [];

  for (const record of context) {
    if (asksEnglish) {
      if (record.english_requirements) {
        lines.push(`Subclass ${record.subclass} english requirements in stored data: ${JSON.stringify(record.english_requirements)}.`);
      }
      continue;
    }

    if (asksDocuments) {
      if (record.documents_required.length > 0) {
        lines.push(`Subclass ${record.subclass} documents in stored data: ${record.documents_required.join(", ")}.`);
      }
      continue;
    }

    if (asksPoints) {
      const minPoints = extractMinPoints(record.points_test_rules);
      if (minPoints) {
        lines.push(`Subclass ${record.subclass} minimum points in stored data: ${minPoints}.`);
      } else if (record.points_test_rules) {
        lines.push(`Subclass ${record.subclass} has points test rules in stored data: ${JSON.stringify(record.points_test_rules)}.`);
      }
      continue;
    }

    const parts = [
      record.purpose ? `purpose: ${record.purpose}` : null,
      record.stay_period ? `stay period: ${record.stay_period}` : null,
      record.cost ? `cost: ${record.cost}` : null,
      record.work_rights ? `work rights: ${record.work_rights}` : null,
    ].filter((part): part is string => Boolean(part));

    if (parts.length > 0) {
      lines.push(`Subclass ${record.subclass} (${record.visa_name}) ${parts.join("; ")}.`);
    }
  }

  if (lines.length === 0) return buildLocaleFallback(locale);
  return lines.join(" ");
}

function uniqueActions(actions: GroundedNextAction[]): GroundedNextAction[] {
  const seen = new Set<string>();
  const result: GroundedNextAction[] = [];

  for (const action of actions) {
    const key = `${action.label}|${action.href}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(action);
  }

  return result;
}

function buildActions(locale: "en" | "tr", context: RetrievedVisaContext): GroundedNextAction[] {
  const actions: GroundedNextAction[] = [
    { label: "Speak with registered migration agent", href: `/${locale}/agent-referral` },
  ];

  for (const item of context) {
    if (item.subclass === "820_801") {
      actions.push({
        label: "View Partner visa details",
        href: `/${locale}/visas/${item.subclass}`,
      });
      continue;
    }

    actions.push({
      label: `View subclass ${item.subclass} details`,
      href: `/${locale}/visas/${item.subclass}`,
    });
  }

  const hasSkilled = context.some(
    (item) => item.subclass === "189" || item.subclass === "190" || item.subclass === "491"
  );
  const hasOcc = context.some(
    (item) =>
      item.subclass === "189" ||
      item.subclass === "190" ||
      item.subclass === "491" ||
      item.subclass === "482"
  );

  if (hasSkilled) {
    actions.push({ label: "Points calculator", href: `/${locale}/points-calculator` });
  }

  if (hasOcc) {
    actions.push({ label: "Occupation checker", href: `/${locale}/occupation-checker` });
  }

  return uniqueActions(actions);
}

function buildSources(locale: "en" | "tr", context: RetrievedVisaContext): GroundedSourceItem[] {
  return context.map((item) => ({
    subclass: item.subclass,
    visaName: item.visa_name,
    detailUrl: `/${locale}/visas/${item.subclass}`,
    sourceUrl: item.source_url,
    pdfUrls: item.pdf_snapshot_urls,
  }));
}

function withSourceSubclassFooter(answer: string, context: RetrievedVisaContext): string {
  if (context.length === 0) return answer;
  const subclasses = Array.from(new Set(context.map((item) => item.subclass))).join(", ");
  return `${answer.trim()} Source subclasses used: ${subclasses}.`;
}

async function generateWithOpenAi(input: {
  message: string;
  locale: string;
  context: RetrievedVisaContext;
}): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY) return null;

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const payload = JSON.stringify(input.context, null, 2);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              `Locale: ${input.locale}`,
              `User message: ${input.message}`,
              "Database context JSON:",
              payload,
              "Answer only from this context. If missing, state stored information does not contain enough detail.",
            ].join("\n\n"),
          },
        ],
      }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return null;
    return sanitizeModelOutput(text);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateGroundedAnswer(input: {
  message: string;
  locale: string;
  context: RetrievedVisaContext;
}): Promise<GroundedAssistantResult> {
  const locale = input.locale === "tr" ? "tr" : "en";
  const sources = buildSources(locale, input.context);
  const nextActions = buildActions(locale, input.context);

  if (isPersonalizedIntentQuestion(input.message)) {
    const safeAnswer = applyAssistantSafetyFooter({
      answer: neutralizeDeterministicLanguage(
        withSourceSubclassFooter(PERSONALIZED_INTENT_REPLY, input.context)
      ),
      message: input.message,
      appendFallback: false,
    });
    return {
      answer: safeAnswer,
      sources,
      nextActions,
    };
  }

  if (input.context.length === 0) {
    const fallback = applyAssistantSafetyFooter({
      answer: buildLocaleFallback(locale),
      message: input.message,
    });
    return {
      answer: fallback,
      sources,
      nextActions,
    };
  }

  let answer = await generateWithOpenAi(input);
  if (!answer) {
    answer = deterministicAnswer(input.message, locale, input.context);
  }

  const finalAnswer = applyAssistantSafetyFooter({
    answer: neutralizeDeterministicLanguage(withSourceSubclassFooter(answer, input.context)),
    message: input.message,
  });

  return {
    answer: finalAnswer,
    sources,
    nextActions,
  };
}
