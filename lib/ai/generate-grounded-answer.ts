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
  "You are a controlled Australian visa information assistant. You are not a migration agent and do not provide migration advice or legal advice. Answer only using the supplied database context. Do not use outside knowledge. Do not guess. If the answer is not in the context, say that the stored information does not contain enough detail and that personalised advice is handled by a registered migration agent or Australian legal practitioner. Do not state personal outcomes or deterministic conclusions. Use wording such as may be relevant, depends on circumstances, typically, can be considered, and general information only.";

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
    /\beligible\b/.test(lower) ||
    /\bqualif(?:y|ies|ied)\b/.test(lower) ||
    /\bapproved\b/.test(lower) ||
    /\bapproval\b/.test(lower) ||
    /\bcan i get\b/.test(lower) ||
    /\bshould i\b/.test(lower) ||
    /\bwhat should i do\b/.test(lower) ||
    /\bwhich visa should i choose\b/.test(lower)
  );
}

function generalInfoSentence(locale?: string): string {
  if (locale === "zh-Hans") return "本回答仅为一般信息。";
  if (locale === "tr") return "Bu yalnızca genel bilgidir.";
  return "This is general information only.";
}

function personalisedAdviceFallback(locale?: string): string {
  if (locale === "zh-Hans") return "个性化建议应由注册移民代理处理。";
  if (locale === "tr") return "Kişiselleştirilmiş tavsiye kayıtlı bir göç danışmanı tarafından ele alınır.";
  return PERSONALISED_ADVICE_FALLBACK;
}

function addGeneralInfoSentence(answer: string, locale?: string): string {
  const base = answer.trim();
  const sentence = generalInfoSentence(locale);
  if (base.endsWith(sentence) || /this is general information only\.?$/i.test(base)) {
    return base;
  }
  return `${base} ${sentence}`;
}

function responseHasRiskOrDecisionLanguage(answer: string): boolean {
  return /\b(you are|you can get|you will|get approved|approved|approval guaranteed|guaranteed|best option|you should|you need to|you must|qualify|eligible)\b/i.test(
    answer
  );
}

function appendPersonalisedAdviceFallback(answer: string, locale?: string): string {
  const base = answer.trim();
  const fallback = personalisedAdviceFallback(locale);
  if (base.includes(PERSONALISED_ADVICE_FALLBACK) || base.includes(fallback)) {
    return base;
  }
  return `${base} ${fallback}`;
}

function applyAssistantSafetyFooter(input: {
  answer: string;
  message: string;
  appendFallback?: boolean;
  locale?: string;
}) {
  const withGeneralInfo = addGeneralInfoSentence(input.answer, input.locale);
  const shouldAppendFallback =
    input.appendFallback ||
    isPersonalizedIntentQuestion(input.message) ||
    responseHasRiskOrDecisionLanguage(withGeneralInfo);

  if (!shouldAppendFallback) return withGeneralInfo;
  return appendPersonalisedAdviceFallback(withGeneralInfo, input.locale);
}

function sanitizeModelOutput(text: string): string {
  const lower = text.toLowerCase();
  const banned = [
    /you\s+are\s+eligible/i,
    /you\s+qualif(?:y|ies|ied)/i,
    /you\s+should\s+apply/i,
    /you\s+will\s+be\s+approved/i,
    /you\s+will\s+get/i,
    "guaranteed",
    /you\s+should/i,
    /you\s+must/i,
    /you\s+need\s+to/i,
    /you\s+may\s+want\s+to/i,
    /rec(?:ommended)/i,
  ];
  if (banned.some((term) => (typeof term === "string" ? lower.includes(term) : term.test(lower)))) {
    return "The stored information does not contain enough detail for this question. Registered migration agent or Australian legal practitioner input may be relevant.";
  }
  return text.trim();
}

function neutralizeDeterministicLanguage(answer: string): string {
  return answer
    .replace(/\byou\s+are\s+eligible\b/gi, "this may be relevant")
    .replace(/\ban\s+eligible\s+Australian\s+qualification\b/gi, "a relevant Australian qualification")
    .replace(/\beligible\s+recent\s+graduates\b/gi, "certain recent graduates")
    .replace(/\bEligible\s+family\s+members\b/g, "Certain family members")
    .replace(/\beligible\s+family\s+members\b/gi, "certain family members")
    .replace(/\bif\s+eligible\b/gi, "if relevant criteria are met")
    .replace(/\beligibility\b/gi, "relevant criteria")
    .replace(/\beligible\b/gi, "relevant under the criteria")
    .replace(/\byou\s+qualif(?:y|ies|ied)\b/gi, "this may be relevant")
    .replace(/\bqualif(?:y|ies|ied)\b/gi, "may be relevant under the criteria")
    .replace(/\byou\s+should\s+apply\b/gi, "this pathway may be relevant")
    .replace(/\byou\s+should\b/gi, "it can be considered")
    .replace(/\byou\s+must\b/gi, "it depends on circumstances")
    .replace(/\byou\s+need\s+to\b/gi, "it is typically required to")
    .replace(/\byou\s+may\s+want\s+to\b/gi, "it may be relevant to")
    .replace(/\brec(?:ommended)\b/gi, "can be considered")
    .replace(/\byou\s+will\s+be\s+approved\b/gi, "an outcome depends on circumstances")
    .replace(/\byou\s+will\s+get\b/gi, "it may be relevant to explore")
    .replace(/\bguaranteed\b/gi, "not assured");
}

function buildLocaleFallback(locale: string): string {
  if (locale === "zh-Hans") {
    return "存储的信息不足以回答这个问题。可考虑咨询注册移民代理或澳大利亚法律执业者。";
  }

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
        lines.push(
          locale === "zh-Hans"
            ? `${record.subclass} 签证在存储数据中的英语要求：${JSON.stringify(record.english_requirements)}。`
            : `Subclass ${record.subclass} english requirements in stored data: ${JSON.stringify(record.english_requirements)}.`
        );
      }
      continue;
    }

    if (asksDocuments) {
      if (record.documents_required.length > 0) {
        lines.push(
          locale === "zh-Hans"
            ? `${record.subclass} 签证在存储数据中的文件要求：${record.documents_required.join(", ")}。`
            : `Subclass ${record.subclass} documents in stored data: ${record.documents_required.join(", ")}.`
        );
      }
      continue;
    }

    if (asksPoints) {
      const minPoints = extractMinPoints(record.points_test_rules);
      if (minPoints) {
        lines.push(
          locale === "zh-Hans"
            ? `${record.subclass} 签证在存储数据中的最低分数：${minPoints}。`
            : `Subclass ${record.subclass} minimum points in stored data: ${minPoints}.`
        );
      } else if (record.points_test_rules) {
        lines.push(
          locale === "zh-Hans"
            ? `${record.subclass} 签证在存储数据中包含打分规则：${JSON.stringify(record.points_test_rules)}。`
            : `Subclass ${record.subclass} has points test rules in stored data: ${JSON.stringify(record.points_test_rules)}.`
        );
      }
      continue;
    }

    const parts = [
      record.purpose ? `${locale === "zh-Hans" ? "用途" : "purpose"}: ${record.purpose}` : null,
      record.stay_period ? `${locale === "zh-Hans" ? "停留期限" : "stay period"}: ${record.stay_period}` : null,
      record.cost ? `${locale === "zh-Hans" ? "费用" : "cost"}: ${record.cost}` : null,
      record.work_rights ? `${locale === "zh-Hans" ? "工作权利" : "work rights"}: ${record.work_rights}` : null,
    ].filter((part): part is string => Boolean(part));

    if (parts.length > 0) {
      lines.push(
        locale === "zh-Hans"
          ? `${record.subclass} 签证（${record.visa_name}）${parts.join("；")}。`
          : `Subclass ${record.subclass} (${record.visa_name}) ${parts.join("; ")}.`
      );
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

function buildActions(locale: "en" | "tr" | "zh-Hans", context: RetrievedVisaContext): GroundedNextAction[] {
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

function buildSources(locale: "en" | "tr" | "zh-Hans", context: RetrievedVisaContext): GroundedSourceItem[] {
  return context.map((item) => ({
    subclass: item.subclass,
    visaName: item.visa_name,
    detailUrl: `/${locale}/visas/${item.subclass}`,
    sourceUrl: item.source_url,
    pdfUrls: item.pdf_snapshot_urls,
  }));
}

function withSourceSubclassFooter(answer: string, context: RetrievedVisaContext, locale?: string): string {
  if (context.length === 0) return answer;
  const subclasses = Array.from(new Set(context.map((item) => item.subclass))).join(", ");
  if (locale === "zh-Hans") return `${answer.trim()} 使用的来源签证类别：${subclasses}。`;
  if (locale === "tr") return `${answer.trim()} Kullanılan kaynak subclass'lar: ${subclasses}.`;
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
  const locale = input.locale === "tr" ? "tr" : input.locale === "zh-Hans" ? "zh-Hans" : "en";
  const sources = buildSources(locale, input.context);
  const nextActions = buildActions(locale, input.context);

  if (isPersonalizedIntentQuestion(input.message)) {
    const safeAnswer = applyAssistantSafetyFooter({
      answer: neutralizeDeterministicLanguage(
        withSourceSubclassFooter(
          locale === "zh-Hans"
            ? "我可以提供有关签证路径的一般信息。如需基于个人情况的结构化评估，可以生成准备度报告。"
            : PERSONALIZED_INTENT_REPLY,
          input.context,
          locale
        )
      ),
      message: input.message,
      appendFallback: false,
      locale,
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
      locale,
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
    answer: neutralizeDeterministicLanguage(withSourceSubclassFooter(answer, input.context, locale)),
    message: input.message,
    locale,
  });

  return {
    answer: finalAnswer,
    sources,
    nextActions,
  };
}
