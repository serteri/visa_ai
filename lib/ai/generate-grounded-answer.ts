import { analyzeVisaMessage } from "@/lib/ai/visa-assistant";
import type { RetrievedVisaContext } from "@/lib/ai/retrieve-visa-context";

export type GroundedAction = {
  label: string;
  href: string;
};

export type GroundedSource = {
  label: string;
  href: string;
};

export type GroundedAnswerResult = {
  safeResponse: string;
  nextActions: GroundedAction[];
  visaDetailLinks: GroundedSource[];
  pdfSnapshotLinks: GroundedSource[];
  sourceLinks: GroundedSource[];
};

const SAFETY_PROMPT =
  "You are a controlled Australian visa information assistant. You are not a migration agent and do not provide migration advice or legal advice. You must answer only using the supplied database context. Do not use outside knowledge. Do not guess. If the answer is not in the context, say that the stored information does not contain enough detail and suggest speaking with a registered migration agent or Australian legal practitioner. Never say the user is eligible, qualifies, should apply, or will be approved. Use wording such as may be relevant, could be worth exploring, general information only.";

const HARD_SAFETY_REPLY =
  "I can't determine eligibility or tell you what to apply for. I can summarise the stored pathway information and suggest what you may want to review with a registered migration agent.";

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

function isHardSafetyQuestion(message: string): boolean {
  const lower = normalize(message);
  return [
    "am i eligible",
    "will i get approved",
    "will i be approved",
    "should i apply",
    "can i get a visa",
    "what visa should i apply for",
  ].some((keyword) => lower.includes(keyword));
}

function appendGeneralInfo(text: string): string {
  if (/this is general information only\./i.test(text)) {
    return text;
  }
  return `${text.trim()} This is general information only.`;
}

function hasUnsafePhrases(text: string): boolean {
  const lower = normalize(text);
  return ["you are eligible", "you qualify", "you should apply", "you will be approved"].some((phrase) =>
    lower.includes(phrase)
  );
}

function uniqueActions(actions: GroundedAction[]): GroundedAction[] {
  const seen = new Set<string>();
  const result: GroundedAction[] = [];

  for (const action of actions) {
    const key = `${action.label}|${action.href}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(action);
  }

  return result;
}

function uniqueSources(sources: GroundedSource[]): GroundedSource[] {
  const seen = new Set<string>();
  const result: GroundedSource[] = [];

  for (const source of sources) {
    if (seen.has(source.href)) continue;
    seen.add(source.href);
    result.push(source);
  }

  return result;
}

function buildSourcePayload(locale: "en" | "tr", context: RetrievedVisaContext) {
  const visaDetailLinks = uniqueSources(context.records.map((record) => ({
    label: `Subclass ${record.subclass} - ${record.visaName}`,
    href: `/${locale}/visas/${record.subclass}`,
  })));

  const pdfSnapshotLinks = uniqueSources(context.records.flatMap((record) =>
    record.pdfSnapshotUrls.map((href, index) => ({
      label: `Subclass ${record.subclass} PDF ${index + 1}`,
      href,
    }))
  ));

  const sourceLinks = uniqueSources(context.records.flatMap((record) =>
    record.sourceUrls.map((href, index) => ({
      label: `Subclass ${record.subclass} Source ${index + 1}`,
      href,
    }))
  ));

  return { visaDetailLinks, pdfSnapshotLinks, sourceLinks };
}

function buildDefaultActions(locale: "en" | "tr", context: RetrievedVisaContext): GroundedAction[] {
  const actions: GroundedAction[] = [
    {
      label: "Speak with a registered migration agent",
      href: `/${locale}/agent-referral`,
    },
  ];

  for (const record of context.records) {
    actions.push({
      label: `View visa details (${record.subclass})`,
      href: `/${locale}/visas/${record.subclass}`,
    });
  }

  const hasPrPathway = context.records.some((record) => record.subclass === "189" || record.subclass === "190");
  if (hasPrPathway) {
    actions.push({ label: "Points calculator", href: `/${locale}/points-calculator` });
    actions.push({ label: "Occupation checker", href: `/${locale}/occupation-checker` });
  }

  if (context.records.some((record) => record.subclass === "482")) {
    actions.push({ label: "Occupation checker", href: `/${locale}/occupation-checker` });
  }

  return uniqueActions(actions);
}

function summarizeDeterministically(message: string, locale: "en" | "tr", context: RetrievedVisaContext): string {
  const lower = normalize(message);

  if (context.records.length === 0) {
    return locale === "tr"
      ? "Saklanan bilgiler bu soru icin yeterli ayrinti icermiyor. Kayitli bir goc danismani veya Avustralya hukuk uygulayicisi ile gorusmeyi degerlendirin."
      : "The stored information does not contain enough detail for this question. Consider speaking with a registered migration agent or Australian legal practitioner.";
  }

  const asksEnglish = ["english", "ielts", "pte", "toefl"].some((token) => lower.includes(token));
  const asksDocuments = ["document", "documents", "paper", "papers", "required"].some((token) => lower.includes(token));
  const asksPoints = ["point", "points", "score"].some((token) => lower.includes(token));

  const lines: string[] = [];

  for (const record of context.records) {
    if (asksEnglish) {
      if (record.englishRequirementsSummary) {
        lines.push(`Subclass ${record.subclass}: ${record.englishRequirementsSummary}`);
      }
      continue;
    }

    if (asksDocuments) {
      if (record.documentsRequired.length > 0) {
        lines.push(`Subclass ${record.subclass} documents in stored data: ${record.documentsRequired.join(", ")}.`);
      }
      continue;
    }

    if (asksPoints) {
      if (record.pointsTestRules && typeof record.pointsTestRules === "object") {
        const pointsObj = record.pointsTestRules as Record<string, unknown>;
        const minPoints =
          (typeof pointsObj.minimum_points_required === "number" && pointsObj.minimum_points_required) ||
          (typeof pointsObj.minimum_points === "number" && pointsObj.minimum_points);

        if (minPoints) {
          lines.push(`Subclass ${record.subclass} minimum points in stored data: ${minPoints}.`);
        } else {
          lines.push(`Subclass ${record.subclass} has points test rules in stored data.`);
        }
      }
      continue;
    }

    const summaryParts = [
      record.purpose ? `purpose: ${record.purpose}` : null,
      record.stayPeriod ? `stay period: ${record.stayPeriod}` : null,
      record.cost ? `cost: ${record.cost}` : null,
      record.workRights ? `work rights: ${record.workRights}` : null,
    ].filter((part): part is string => Boolean(part));

    if (summaryParts.length > 0) {
      lines.push(`Subclass ${record.subclass} (${record.visaName}) ${summaryParts.join("; ")}.`);
    }
  }

  if (lines.length === 0) {
    return locale === "tr"
      ? "Saklanan bilgiler bu soru icin yeterli ayrinti icermiyor. Kayitli bir goc danismani veya Avustralya hukuk uygulayicisi ile gorusmeyi degerlendirin."
      : "The stored information does not contain enough detail for this question. Consider speaking with a registered migration agent or Australian legal practitioner.";
  }

  return lines.join(" ");
}

async function tryOpenAiAnswer(input: {
  message: string;
  locale: "en" | "tr";
  context: RetrievedVisaContext;
}): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const contextPayload = JSON.stringify(input.context.records, null, 2);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        { role: "system", content: SAFETY_PROMPT },
        {
          role: "user",
          content: [
            `Locale: ${input.locale}`,
            `User question: ${input.message}`,
            "Stored database context:",
            contextPayload,
            "Provide a concise answer. Include the sentence: This is general information only.",
          ].join("\n\n"),
        },
      ],
    }),
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) return null;
  if (hasUnsafePhrases(content)) return null;

  return appendGeneralInfo(content);
}

export async function generateGroundedVisaAnswer(input: {
  message: string;
  locale: "en" | "tr";
  context: RetrievedVisaContext;
}): Promise<GroundedAnswerResult> {
  const { visaDetailLinks, pdfSnapshotLinks, sourceLinks } = buildSourcePayload(input.locale, input.context);

  const fallbackRuleResult = analyzeVisaMessage(input.message);
  const fallbackActions = fallbackRuleResult.nextActions.map((action) => ({
    label: action.label,
    href: action.href.replace("{locale}", input.locale),
  }));

  const nextActions = uniqueActions([
    ...buildDefaultActions(input.locale, input.context),
    ...fallbackActions,
  ]);

  if (isHardSafetyQuestion(input.message)) {
    return {
      safeResponse: `${HARD_SAFETY_REPLY} This is general information only.`,
      nextActions,
      visaDetailLinks,
      pdfSnapshotLinks,
      sourceLinks,
    };
  }

  const hasOpenAi = Boolean(process.env.OPENAI_API_KEY);

  if (!hasOpenAi) {
    const deterministic = summarizeDeterministically(input.message, input.locale, input.context);
    const merged =
      input.context.records.length === 0
        ? `${fallbackRuleResult.safeResponse} ${deterministic}`
        : deterministic;

    return {
      safeResponse: appendGeneralInfo(merged),
      nextActions,
      visaDetailLinks,
      pdfSnapshotLinks,
      sourceLinks,
    };
  }

  let safeResponse: string | null = null;

  if (input.context.records.length > 0) {
    try {
      safeResponse = await tryOpenAiAnswer(input);
    } catch {
      safeResponse = null;
    }
  }

  if (!safeResponse) {
    const deterministic = summarizeDeterministically(input.message, input.locale, input.context);
    safeResponse = appendGeneralInfo(deterministic);
  }

  return {
    safeResponse,
    nextActions,
    visaDetailLinks,
    pdfSnapshotLinks,
    sourceLinks,
  };
}
